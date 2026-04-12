import { geoInterpolate } from 'd3-geo'

const EARTH_RADIUS_KM = 6371

/**
 * Calculate distance between two points using Haversine formula
 * @param {Array} point1 - [longitude, latitude]
 * @param {Array} point2 - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(point1, point2) {
  const [lon1, lat1] = point1
  const [lon2, lat2] = point2

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * Generate points along a great circle arc
 * @param {Array} start - [longitude, latitude]
 * @param {Array} end - [longitude, latitude]
 * @param {number} numPoints - Number of points to generate
 * @returns {Array} Array of [longitude, latitude] points
 */
export function generateGreatCirclePoints(start, end, numPoints = 50) {
  const interpolate = geoInterpolate(start, end)
  const points = []

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    points.push(interpolate(t))
  }

  return points
}

/**
 * Extract country from geocoded name
 * @param {string} geocodedName - Full geocoded name (e.g., "London, UK")
 * @returns {string} Country name or last component
 */
export function extractCountry(geocodedName) {
  if (!geocodedName) return 'Unknown'
  const parts = geocodedName.split(',').map(s => s.trim())
  return parts[parts.length - 1] || 'Unknown'
}

/**
 * Compute journey statistics from geocoded places
 * @param {Array} places - Array of geocoded place objects
 * @returns {Object} Journey statistics
 */
export function computeJourneyStats(places) {
  const validPlaces = places.filter(p => p.coordinates)

  if (validPlaces.length === 0) {
    return {
      totalPlaces: 0,
      countries: [],
      totalDistanceKm: 0,
      longestLegKm: 0,
      longestLegFrom: null,
      longestLegTo: null,
    }
  }

  // Extract unique countries
  const countries = [...new Set(
    validPlaces
      .map(p => extractCountry(p.geocodedName))
      .filter(c => c !== 'Unknown')
  )]

  // Calculate distances between consecutive places
  let totalDistanceKm = 0
  let longestLegKm = 0
  let longestLegFrom = null
  let longestLegTo = null

  for (let i = 1; i < validPlaces.length; i++) {
    const from = validPlaces[i - 1]
    const to = validPlaces[i]
    const distance = haversineDistance(from.coordinates, to.coordinates)

    totalDistanceKm += distance

    if (distance > longestLegKm) {
      longestLegKm = distance
      longestLegFrom = from.name
      longestLegTo = to.name
    }
  }

  // Calculate years spanned if dates are available
  let yearsSpanned = null
  const placesWithYears = validPlaces.filter(p => p.yearStart)
  if (placesWithYears.length >= 2) {
    const years = placesWithYears.map(p => p.yearStart)
    yearsSpanned = Math.max(...years) - Math.min(...years)
  }

  // Find longest stay
  let longestStay = null
  for (const place of validPlaces) {
    if (place.yearStart && place.yearEnd) {
      const duration = place.yearEnd - place.yearStart
      if (!longestStay || duration > longestStay.years) {
        longestStay = { place: place.name, years: duration }
      }
    }
  }

  return {
    totalPlaces: validPlaces.length,
    countries,
    totalDistanceKm: Math.round(totalDistanceKm),
    longestLegKm: Math.round(longestLegKm),
    longestLegFrom,
    longestLegTo,
    yearsSpanned,
    longestStay,
  }
}
