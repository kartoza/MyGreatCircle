import { useState, useCallback } from 'react'

const GEOCODE_CACHE_KEY = 'mygreatcircle-geocode-cache'
const CACHE_VERSION = 1

/**
 * Load geocoding cache from localStorage
 */
function loadCache() {
  try {
    const stored = localStorage.getItem(GEOCODE_CACHE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.version === CACHE_VERSION) {
        return data.cache
      }
    }
  } catch (e) {
    console.warn('Failed to load geocode cache:', e)
  }
  return {}
}

/**
 * Save geocoding cache to localStorage
 */
function saveCache(cache) {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      cache,
      updatedAt: new Date().toISOString(),
    }))
  } catch (e) {
    console.warn('Failed to save geocode cache:', e)
  }
}

/**
 * Normalize query for cache key (lowercase, trimmed)
 */
function normalizeQuery(query) {
  return query.toLowerCase().trim()
}

/**
 * Hook for geocoding places via the backend API
 * Uses persistent localStorage cache to avoid repeated lookups
 * @returns {Object} { geocodePlace, geocodePlaces, isLoading, error, cacheStats }
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Geocode a single place, using cache when available
   * Includes automatic retry with backoff for rate limiting
   * @param {string} query - Place name to geocode
   * @param {number} retryCount - Internal retry counter
   * @returns {Promise<Object>} Geocoding results
   */
  const geocodePlace = useCallback(async (query, retryCount = 0) => {
    const MAX_RETRIES = 3
    const normalizedQuery = normalizeQuery(query)
    const cache = loadCache()

    // Check cache first
    if (cache[normalizedQuery]) {
      console.log(`Geocode cache hit: "${query}"`)
      return { ...cache[normalizedQuery], fromLocalCache: true }
    }

    // Not in cache, fetch from API
    console.log(`Geocode cache miss: "${query}" - fetching from API`)
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    // Handle rate limiting with retry
    if (response.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`)
      }

      const result = await response.json()
      const retryAfter = result.retryAfter || 2000
      console.log(`Rate limited for "${query}", retrying in ${retryAfter}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)

      await new Promise(resolve => setTimeout(resolve, retryAfter))
      return geocodePlace(query, retryCount + 1)
    }

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    const result = await response.json()

    // Store in cache if we got results
    if (result.results && result.results.length > 0) {
      cache[normalizedQuery] = {
        results: result.results,
        cachedAt: new Date().toISOString(),
      }
      saveCache(cache)
    }

    return result
  }, [])

  /**
   * Geocode an array of places, with progressive updates
   * @param {Array} places - Array of parsed place objects
   * @param {Function} onProgress - Called after each place is geocoded with (geocodedPlaces, progress)
   * @returns {Promise<Array>} Places with coordinates filled in
   */
  const geocodePlaces = useCallback(async (places, onProgress) => {
    setIsLoading(true)
    setError(null)

    const geocodedPlaces = []

    try {
      for (let i = 0; i < places.length; i++) {
        const place = places[i]
        let geocodedPlace

        try {
          const result = await geocodePlace(place.name)

          if (result.results && result.results.length > 0) {
            const best = result.results[0]
            geocodedPlace = {
              ...place,
              coordinates: [best.lng, best.lat],
              confidence: best.confidence,
              alternatives: result.results.slice(1),
              geocodedName: best.name,
            }
          } else {
            geocodedPlace = {
              ...place,
              confidence: 'failed',
              alternatives: [],
            }
          }
        } catch (err) {
          console.error(`Failed to geocode "${place.name}":`, err)
          geocodedPlace = {
            ...place,
            confidence: 'failed',
            alternatives: [],
          }
        }

        geocodedPlaces.push(geocodedPlace)

        // Report progress after each place
        if (onProgress) {
          const progress = (i + 1) / places.length
          onProgress([...geocodedPlaces], progress, i + 1, places.length)
        }
      }

      setIsLoading(false)
      return geocodedPlaces
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      throw err
    }
  }, [geocodePlace])

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const cache = loadCache()
    const entries = Object.keys(cache).length
    return {
      entries,
      places: Object.keys(cache),
    }
  }, [])

  /**
   * Clear the geocoding cache
   */
  const clearCache = useCallback(() => {
    localStorage.removeItem(GEOCODE_CACHE_KEY)
    console.log('Geocode cache cleared')
  }, [])

  return {
    geocodePlace,
    geocodePlaces,
    isLoading,
    error,
    getCacheStats,
    clearCache,
  }
}
