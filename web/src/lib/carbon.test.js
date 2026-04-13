import { describe, it, expect } from 'vitest'
import { detectTransportMode, calculateLegEmissions, treesToOffset, calculateJourneyEmissions } from './carbon'

describe('detectTransportMode', () => {
  it('returns car for distances under 100km', () => {
    expect(detectTransportMode(50)).toBe('car')
    expect(detectTransportMode(99)).toBe('car')
  })

  it('returns train for distances 100-800km', () => {
    expect(detectTransportMode(100)).toBe('train')
    expect(detectTransportMode(500)).toBe('train')
    expect(detectTransportMode(800)).toBe('train')
  })

  it('returns flight for distances over 800km', () => {
    expect(detectTransportMode(801)).toBe('flight')
    expect(detectTransportMode(5000)).toBe('flight')
  })
})

describe('calculateLegEmissions', () => {
  it('calculates car emissions for short distance', () => {
    expect(calculateLegEmissions(50)).toBeCloseTo(8.5, 1)
  })

  it('calculates train emissions for medium distance', () => {
    expect(calculateLegEmissions(300)).toBeCloseTo(30, 1)
  })

  it('calculates flight emissions for long distance', () => {
    expect(calculateLegEmissions(5000)).toBeCloseTo(1275, 1)
  })
})

describe('treesToOffset', () => {
  it('calculates 1 tree for 21kg CO2', () => {
    expect(treesToOffset(21)).toBe(1)
  })

  it('calculates 10 trees for 210kg CO2', () => {
    expect(treesToOffset(210)).toBe(10)
  })

  it('rounds up partial trees', () => {
    expect(treesToOffset(22)).toBe(2)
    expect(treesToOffset(1)).toBe(1)
  })

  it('returns 0 for 0 CO2', () => {
    expect(treesToOffset(0)).toBe(0)
  })
})

describe('calculateJourneyEmissions', () => {
  it('calculates emissions for a multi-leg journey', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074] },
      { name: 'Paris', coordinates: [2.3522, 48.8566] },
      { name: 'Sydney', coordinates: [151.2093, -33.8688] },
    ]
    const result = calculateJourneyEmissions(places)
    expect(result.totalCO2Kg).toBeGreaterThan(4000)
    expect(result.treeCount).toBeGreaterThan(190)
    expect(result.legs).toHaveLength(2)
    expect(result.legs[0].from).toBe('London')
    expect(result.legs[0].to).toBe('Paris')
  })

  it('returns zeros for empty places array', () => {
    const result = calculateJourneyEmissions([])
    expect(result.totalCO2Kg).toBe(0)
    expect(result.treeCount).toBe(0)
    expect(result.legs).toHaveLength(0)
  })

  it('returns zeros for single place', () => {
    const result = calculateJourneyEmissions([{ name: 'London', coordinates: [-0.1276, 51.5074] }])
    expect(result.totalCO2Kg).toBe(0)
  })

  it('handles places without coordinates', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074] },
      { name: 'Unknown', coordinates: null },
      { name: 'Paris', coordinates: [2.3522, 48.8566] },
    ]
    const result = calculateJourneyEmissions(places)
    expect(result.legs.length).toBeGreaterThanOrEqual(1)
  })
})
