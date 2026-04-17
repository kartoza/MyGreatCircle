const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'MyGreatCircle/1.0 (https://github.com/kartoza/MyGreatCircle)'

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
 * Geocode a place using Nominatim API (rate-limited)
 * @param {string} query - Place name to geocode
 * @returns {Promise<Array>} Array of results from Nominatim
 */
export async function geocodeWithNominatim(query) {
  return rateLimiter(async () => {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5'
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT
      }
    })

    if (response.status === 429) {
      throw new Error('Rate limited by Nominatim')
    }

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
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
