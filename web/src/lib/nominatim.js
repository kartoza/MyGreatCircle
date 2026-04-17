const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'MyGreatCircle/1.0 (https://github.com/kartoza/MyGreatCircle)'

// Error types for geocoding failures
export const GeocodingErrorType = {
  NO_MATCH: 'no_match',
  RATE_LIMITED: 'rate_limited',
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network_error',
}

/**
 * Custom error class for geocoding failures
 */
export class GeocodingError extends Error {
  constructor(type, message) {
    super(message)
    this.name = 'GeocodingError'
    this.type = type
  }
}

/**
 * Normalize a query string for cache keys
 * @param {string} query - The query to normalize
 * @returns {string} Lowercased, trimmed query
 */
export function normalizeQuery(query) {
  return query.toLowerCase().trim()
}

/**
 * Create a rate limiter that enforces minimum interval between calls
 * @param {number} minInterval - Minimum milliseconds between calls
 * @returns {Function} Rate-limited function wrapper
 */
export function createRateLimiter(minInterval) {
  let lastCall = 0
  let queue = Promise.resolve()

  return async (fn) => {
    queue = queue.then(async () => {
      const now = Date.now()
      const elapsed = now - lastCall
      if (elapsed < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - elapsed))
      }
      lastCall = Date.now()
      return fn()
    })
    return queue
  }
}

// Singleton rate limiter (1.1 second interval)
const rateLimiter = createRateLimiter(1100)

/**
 * Geocode a place using Nominatim API (rate-limited with retry)
 * @param {string} query - Place name to geocode
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Array>} Array of results from Nominatim
 * @throws {GeocodingError} On rate limit, timeout, or network errors
 */
export async function geocodeWithNominatim(query, retries = 3) {
  return rateLimiter(async () => {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5'
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response
    try {
      response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': USER_AGENT
        },
        signal: controller.signal
      })
    } catch (e) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') {
        throw new GeocodingError(GeocodingErrorType.TIMEOUT, 'Request timed out')
      }
      throw new GeocodingError(GeocodingErrorType.NETWORK_ERROR, `Network error: ${e.message}`)
    } finally {
      clearTimeout(timeoutId)
    }

    if (response.status === 429) {
      if (retries > 0) {
        // Wait longer and retry (exponential backoff)
        const delay = (4 - retries) * 2000
        console.log(`Rate limited, waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return geocodeWithNominatim(query, retries - 1)
      }
      throw new GeocodingError(GeocodingErrorType.RATE_LIMITED, 'Rate limited - please wait and try again')
    }

    if (!response.ok) {
      throw new GeocodingError(GeocodingErrorType.NETWORK_ERROR, `Nominatim error: ${response.status}`)
    }

    const results = await response.json()

    // Transform to our format
    return results.map(r => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      importance: r.importance,
      confidence: r.importance > 0.5 ? 'high' : 'low'
    }))
  })
}
