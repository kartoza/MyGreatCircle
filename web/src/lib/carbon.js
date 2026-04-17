/**
 * Carbon footprint calculation utilities
 * Estimates CO2 emissions based on travel distance and transport mode
 */

import { haversineDistance } from './geo'

// CO2 emissions in kg per km by transport mode
export const EMISSIONS_PER_KM = {
  car: 0.170,     // kg CO2 per km (EU average)
  train: 0.100,   // blended train/car for medium distances
  flight: 0.255,  // average flight emissions
}

// kg of CO2 absorbed by one mature tree per year
export const CO2_PER_TREE_PER_YEAR = 21

/**
 * Detect likely transport mode based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {'car' | 'train' | 'flight'} - Estimated transport mode
 */
export function detectTransportMode(distanceKm) {
  if (distanceKm < 100) {
    return 'car'
  } else if (distanceKm <= 800) {
    return 'train'
  } else {
    return 'flight'
  }
}

/**
 * Calculate CO2 emissions for a single journey leg
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} CO2 emissions in kg
 */
export function calculateLegEmissions(distanceKm) {
  const mode = detectTransportMode(distanceKm)
  return distanceKm * EMISSIONS_PER_KM[mode]
}

/**
 * Calculate number of trees needed to offset CO2 emissions
 * @param {number} co2Kg - CO2 amount in kilograms
 * @returns {number} Number of mature trees needed for one year offset
 */
export function treesToOffset(co2Kg) {
  if (co2Kg <= 0) return 0
  return Math.ceil(co2Kg / CO2_PER_TREE_PER_YEAR)
}

/**
 * Calculate total emissions and tree offset for a multi-leg journey
 * @param {Array} places - Array of place objects with name and coordinates [lon, lat]
 * @returns {Object} Journey emissions report with legs, total CO2, and tree count
 */
export function calculateJourneyEmissions(places) {
  const validPlaces = places.filter(p => p && p.coordinates)

  if (validPlaces.length < 2) {
    return { totalCO2Kg: 0, treeCount: 0, legs: [] }
  }

  const legs = []
  let totalCO2Kg = 0

  for (let i = 1; i < validPlaces.length; i++) {
    const from = validPlaces[i - 1]
    const to = validPlaces[i]
    const distanceKm = haversineDistance(from.coordinates, to.coordinates)
    const mode = detectTransportMode(distanceKm)
    const co2Kg = calculateLegEmissions(distanceKm)

    legs.push({
      from: from.name,
      to: to.name,
      distanceKm: Math.round(distanceKm),
      mode,
      co2Kg: Math.round(co2Kg),
    })

    totalCO2Kg += co2Kg
  }

  return {
    totalCO2Kg: Math.round(totalCO2Kg),
    treeCount: treesToOffset(totalCO2Kg),
    legs,
  }
}
