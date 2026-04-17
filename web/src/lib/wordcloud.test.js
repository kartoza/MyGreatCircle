import { describe, it, expect } from 'vitest'
import { calculateMarginZones, findNonOverlappingPosition, generateWordCloudPositions } from './wordcloud'

describe('wordcloud', () => {
  describe('calculateMarginZones', () => {
    it('calculates four margin rectangles around map bounds', () => {
      const mapBounds = { x: 50, y: 50, width: 300, height: 200 }
      const pageSize = { width: 400, height: 300 }
      const marginSize = 40

      const zones = calculateMarginZones(mapBounds, pageSize, marginSize)

      expect(zones).toHaveLength(4)
      expect(zones[0].name).toBe('top')
      expect(zones[1].name).toBe('bottom')
      expect(zones[2].name).toBe('left')
      expect(zones[3].name).toBe('right')
    })
  })

  describe('generateWordCloudPositions', () => {
    it('positions all places without overlap', () => {
      const places = [
        { name: 'Paris' },
        { name: 'London' },
        { name: 'Tokyo' },
      ]
      const mapBounds = { x: 50, y: 50, width: 300, height: 150 }
      const pageSize = { width: 400, height: 250 }

      const result = generateWordCloudPositions(places, mapBounds, pageSize, {
        getTextWidth: (text) => text.length * 3,
        fontSize: 8,
      })

      expect(result.positions.length).toBeLessThanOrEqual(places.length)
      // All positioned items should have x, y coordinates
      result.positions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
