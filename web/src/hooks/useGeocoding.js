import { useState, useCallback } from 'react'

/**
 * Hook for geocoding places via the backend API
 * @returns {Object} { geocodePlace, geocodePlaces, isLoading, error }
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Geocode a single place
   * @param {string} query - Place name to geocode
   * @returns {Promise<Object>} Geocoding results
   */
  const geocodePlace = useCallback(async (query) => {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    return response.json()
  }, [])

  /**
   * Geocode an array of places, updating each with coordinates
   * @param {Array} places - Array of parsed place objects
   * @returns {Promise<Array>} Places with coordinates filled in
   */
  const geocodePlaces = useCallback(async (places) => {
    setIsLoading(true)
    setError(null)

    try {
      const geocodedPlaces = await Promise.all(
        places.map(async (place) => {
          try {
            const result = await geocodePlace(place.name)

            if (result.results && result.results.length > 0) {
              const best = result.results[0]
              return {
                ...place,
                coordinates: [best.lng, best.lat],
                confidence: best.confidence,
                alternatives: result.results.slice(1),
                geocodedName: best.name,
              }
            }

            return {
              ...place,
              confidence: 'failed',
              alternatives: [],
            }
          } catch (err) {
            console.error(`Failed to geocode "${place.name}":`, err)
            return {
              ...place,
              confidence: 'failed',
              alternatives: [],
            }
          }
        })
      )

      setIsLoading(false)
      return geocodedPlaces
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      throw err
    }
  }, [geocodePlace])

  return {
    geocodePlace,
    geocodePlaces,
    isLoading,
    error,
  }
}
