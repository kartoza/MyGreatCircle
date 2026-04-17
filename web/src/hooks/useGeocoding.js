import { useState, useCallback } from 'react'
import { normalizeQuery, geocodeWithNominatim, GeocodingError, GeocodingErrorType } from '../lib/nominatim'

// Re-export error types for consumers
export { GeocodingErrorType } from '../lib/nominatim'

const GEOCODE_CACHE_KEY = 'mygreatcircle-geocode-cache'
const CACHE_VERSION = 2 // Bumped to invalidate old format

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
 * Lookup places from server cache (fuzzy matching)
 */
async function lookupFromServer(queries) {
  const response = await fetch('/api/places/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  })

  if (!response.ok) {
    throw new Error(`Server lookup failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Submit resolved places to server cache
 */
async function submitToServer(places) {
  try {
    await fetch('/api/places/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places }),
    })
  } catch (e) {
    console.warn('Failed to submit places to server:', e)
  }
}

/**
 * Hook for geocoding places via 3-tier caching
 * Tier 1: localStorage (exact match)
 * Tier 2: Server cache (fuzzy match)
 * Tier 3: Nominatim API (rate-limited)
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Geocode a single place through all cache tiers
   */
  const geocodePlace = useCallback(async (query) => {
    const normalized = normalizeQuery(query)
    const cache = loadCache()

    // Tier 1: localStorage exact match
    if (cache[normalized]) {
      console.log(`[Tier 1] localStorage hit: "${query}"`)
      return { ...cache[normalized], fromLocalCache: true }
    }

    // Tier 2: Server fuzzy match
    console.log(`[Tier 2] Checking server cache: "${query}"`)
    try {
      const serverResult = await lookupFromServer([query])
      if (serverResult.resolved && serverResult.resolved[normalized]) {
        const place = serverResult.resolved[normalized]
        // Cache locally for next time
        cache[normalized] = {
          results: [{
            name: place.displayName,
            lat: place.lat,
            lng: place.lng,
            confidence: 'high'
          }],
          cachedAt: new Date().toISOString(),
        }
        saveCache(cache)
        console.log(`[Tier 2] Server cache hit: "${query}"`)
        return { results: cache[normalized].results, fromServerCache: true }
      }
    } catch (e) {
      console.warn('Server lookup failed, falling back to Nominatim:', e)
    }

    // Tier 3: Nominatim API
    console.log(`[Tier 3] Querying Nominatim: "${query}"`)
    const nominatimResults = await geocodeWithNominatim(query)

    if (nominatimResults.length > 0) {
      // Transform and cache
      const results = nominatimResults.map(r => ({
        name: r.displayName,
        lat: r.lat,
        lng: r.lng,
        confidence: r.confidence,
      }))

      cache[normalized] = {
        results,
        cachedAt: new Date().toISOString(),
      }
      saveCache(cache)

      // Submit to server for shared caching
      submitToServer([{
        query: normalized,
        displayName: results[0].name,
        lat: results[0].lat,
        lng: results[0].lng,
        importance: nominatimResults[0].importance || 0.5,
      }])

      return { results, fromNominatim: true }
    }

    return { results: [] }
  }, [])

  /**
   * Geocode an array of places with progressive updates
   */
  const geocodePlaces = useCallback(async (places, onProgress) => {
    setIsLoading(true)
    setError(null)

    const cache = loadCache()
    const geocodedPlaces = []

    // Separate into cached vs uncached
    const uncachedQueries = []
    const queryToPlaceIndex = {}

    places.forEach((place, index) => {
      const normalized = normalizeQuery(place.name)
      if (cache[normalized]) {
        // Already in localStorage
        const cached = cache[normalized]
        if (cached.results && cached.results.length > 0) {
          const best = cached.results[0]
          geocodedPlaces[index] = {
            ...place,
            coordinates: [best.lng, best.lat],
            confidence: best.confidence || 'high',
            alternatives: cached.results.slice(1),
            geocodedName: best.name,
          }
        } else {
          geocodedPlaces[index] = { ...place, confidence: 'failed', alternatives: [] }
        }
      } else {
        uncachedQueries.push(place.name)
        queryToPlaceIndex[normalizeQuery(place.name)] = index
      }
    })

    // Report progress for cached places
    if (onProgress) {
      const cachedCount = places.length - uncachedQueries.length
      if (cachedCount > 0) {
        onProgress([...geocodedPlaces.filter(Boolean)], cachedCount / places.length, cachedCount, places.length)
      }
    }

    // Tier 2: Batch lookup from server
    if (uncachedQueries.length > 0) {
      try {
        const serverResult = await lookupFromServer(uncachedQueries)

        // Process resolved
        for (const [normalizedQuery, place] of Object.entries(serverResult.resolved || {})) {
          const index = queryToPlaceIndex[normalizedQuery]
          if (index !== undefined) {
            geocodedPlaces[index] = {
              ...places[index],
              coordinates: [place.lng, place.lat],
              confidence: 'high',
              alternatives: [],
              geocodedName: place.displayName,
            }
            // Cache locally
            cache[normalizedQuery] = {
              results: [{ name: place.displayName, lat: place.lat, lng: place.lng, confidence: 'high' }],
              cachedAt: new Date().toISOString(),
            }
            delete queryToPlaceIndex[normalizedQuery]
          }
        }
        saveCache(cache)

        // Update progress
        if (onProgress) {
          const resolvedCount = places.length - Object.keys(queryToPlaceIndex).length
          onProgress([...geocodedPlaces.filter(Boolean)], resolvedCount / places.length, resolvedCount, places.length)
        }
      } catch (e) {
        console.warn('Server batch lookup failed:', e)
      }
    }

    // Tier 3: Nominatim for remaining (sequential with rate limiting)
    const remainingQueries = Object.keys(queryToPlaceIndex)
    for (let i = 0; i < remainingQueries.length; i++) {
      const normalizedQuery = remainingQueries[i]
      const index = queryToPlaceIndex[normalizedQuery]
      const place = places[index]

      try {
        const result = await geocodePlace(place.name)
        if (result.results && result.results.length > 0) {
          const best = result.results[0]
          geocodedPlaces[index] = {
            ...place,
            coordinates: [best.lng, best.lat],
            confidence: best.confidence || 'high',
            alternatives: result.results.slice(1),
            geocodedName: best.name,
          }
        } else {
          // No results found - this is a "no match" error
          geocodedPlaces[index] = {
            ...place,
            confidence: 'failed',
            errorType: GeocodingErrorType.NO_MATCH,
            errorMessage: 'No matching location found',
            alternatives: []
          }
        }
      } catch (e) {
        console.error(`Failed to geocode "${place.name}":`, e)
        // Determine error type
        const errorType = e instanceof GeocodingError ? e.type : GeocodingErrorType.NETWORK_ERROR
        const errorMessage = e.message || 'Unknown error'
        geocodedPlaces[index] = {
          ...place,
          confidence: 'failed',
          errorType,
          errorMessage,
          alternatives: []
        }
      }

      // Report progress
      if (onProgress) {
        const completed = places.length - remainingQueries.length + i + 1
        onProgress([...geocodedPlaces.filter(Boolean)], completed / places.length, completed, places.length)
      }
    }

    setIsLoading(false)
    // Filter out any null/undefined entries (sparse array gaps)
    return geocodedPlaces.filter(p => p != null)
  }, [geocodePlace])

  /**
   * Retry geocoding for a single failed place
   * @param {Object} place - The place object to retry
   * @returns {Object} Updated place with geocoding result
   */
  const retryPlace = useCallback(async (place) => {
    try {
      const result = await geocodePlace(place.name)
      if (result.results && result.results.length > 0) {
        const best = result.results[0]
        return {
          ...place,
          coordinates: [best.lng, best.lat],
          confidence: best.confidence || 'high',
          alternatives: result.results.slice(1),
          geocodedName: best.name,
          errorType: undefined,
          errorMessage: undefined,
        }
      } else {
        return {
          ...place,
          confidence: 'failed',
          errorType: GeocodingErrorType.NO_MATCH,
          errorMessage: 'No matching location found',
          alternatives: []
        }
      }
    } catch (e) {
      console.error(`Retry failed for "${place.name}":`, e)
      const errorType = e instanceof GeocodingError ? e.type : GeocodingErrorType.NETWORK_ERROR
      return {
        ...place,
        confidence: 'failed',
        errorType,
        errorMessage: e.message || 'Unknown error',
        alternatives: []
      }
    }
  }, [geocodePlace])

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const cache = loadCache()
    return {
      entries: Object.keys(cache).length,
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
    retryPlace,
    isLoading,
    error,
    getCacheStats,
    clearCache,
  }
}
