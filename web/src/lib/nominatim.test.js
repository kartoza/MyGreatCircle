import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeQuery, createRateLimiter } from './nominatim'

describe('nominatim', () => {
  describe('normalizeQuery', () => {
    it('lowercases and trims query', () => {
      expect(normalizeQuery('  Cape Town  ')).toBe('cape town')
      expect(normalizeQuery('JOHANNESBURG')).toBe('johannesburg')
    })
  })

  describe('createRateLimiter', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('enforces minimum interval between calls', async () => {
      const rateLimiter = createRateLimiter(1000)
      const fn = vi.fn().mockResolvedValue('result')

      // First call - immediate
      const p1 = rateLimiter(fn)
      await vi.runAllTimersAsync()
      expect(fn).toHaveBeenCalledTimes(1)

      // Second call - should wait
      const p2 = rateLimiter(fn)
      expect(fn).toHaveBeenCalledTimes(1) // Still 1

      // Advance time
      await vi.advanceTimersByTimeAsync(1000)
      await p2

      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
})
