import { describe, it, expect } from 'vitest'
import { haversineDistance, generateGreatCirclePoints, computeJourneyStats } from './geo'

describe('haversineDistance', () => {
  it('calculates distance between London and Cape Town', () => {
    const london = [-0.1276, 51.5074]
    const capeTown = [18.4241, -33.9249]
    const distance = haversineDistance(london, capeTown)
    // Approximately 9,600 km
    expect(distance).toBeGreaterThan(9500)
    expect(distance).toBeLessThan(9700)
  })

  it('returns 0 for same point', () => {
    const point = [0, 0]
    expect(haversineDistance(point, point)).toBe(0)
  })
})

describe('generateGreatCirclePoints', () => {
  it('generates points along great circle arc', () => {
    const start = [-0.1276, 51.5074] // London
    const end = [18.4241, -33.9249]  // Cape Town
    const points = generateGreatCirclePoints(start, end, 10)

    expect(points).toHaveLength(10)
    expect(points[0][0]).toBeCloseTo(start[0], 1)
    expect(points[0][1]).toBeCloseTo(start[1], 1)
    expect(points[points.length - 1][0]).toBeCloseTo(end[0], 1)
    expect(points[points.length - 1][1]).toBeCloseTo(end[1], 1)
  })
})

describe('computeJourneyStats', () => {
  it('computes stats for a journey', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074], geocodedName: 'London, UK' },
      { name: 'Cape Town', coordinates: [18.4241, -33.9249], geocodedName: 'Cape Town, South Africa' },
      { name: 'Sydney', coordinates: [151.2093, -33.8688], geocodedName: 'Sydney, Australia' },
    ]

    const stats = computeJourneyStats(places)

    expect(stats.totalPlaces).toBe(3)
    expect(stats.totalDistanceKm).toBeGreaterThan(20000)
    expect(stats.countries.length).toBeGreaterThanOrEqual(1)
    expect(stats.longestLegFrom).toBeDefined()
    expect(stats.longestLegTo).toBeDefined()
  })

  it('handles single place', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074], geocodedName: 'London, UK' },
    ]

    const stats = computeJourneyStats(places)

    expect(stats.totalPlaces).toBe(1)
    expect(stats.totalDistanceKm).toBe(0)
  })
})
