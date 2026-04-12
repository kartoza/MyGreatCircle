import { describe, it, expect } from 'vitest'
import { parsePlaceInput, parseSingleLine } from './parser'

describe('parseSingleLine', () => {
  it('parses place name only', () => {
    const result = parseSingleLine('London, UK')
    expect(result.name).toBe('London, UK')
    expect(result.yearStart).toBeUndefined()
    expect(result.yearEnd).toBeUndefined()
  })

  it('parses place with single year', () => {
    const result = parseSingleLine('Cape Town 1990')
    expect(result.name).toBe('Cape Town')
    expect(result.yearStart).toBe(1990)
    expect(result.yearEnd).toBeUndefined()
  })

  it('parses place with year range', () => {
    const result = parseSingleLine('Sydney, Australia 1985-1990')
    expect(result.name).toBe('Sydney, Australia')
    expect(result.yearStart).toBe(1985)
    expect(result.yearEnd).toBe(1990)
  })

  it('parses place with year range in parentheses', () => {
    const result = parseSingleLine('Paris (2000-2005)')
    expect(result.name).toBe('Paris')
    expect(result.yearStart).toBe(2000)
    expect(result.yearEnd).toBe(2005)
  })

  it('handles empty input', () => {
    const result = parseSingleLine('')
    expect(result).toBeNull()
  })

  it('handles whitespace-only input', () => {
    const result = parseSingleLine('   ')
    expect(result).toBeNull()
  })
})

describe('parsePlaceInput', () => {
  it('parses multiple lines', () => {
    const input = `London, UK
Cape Town 1990-1995
Sydney`
    const results = parsePlaceInput(input)
    expect(results).toHaveLength(3)
    expect(results[0].name).toBe('London, UK')
    expect(results[1].name).toBe('Cape Town')
    expect(results[1].yearStart).toBe(1990)
    expect(results[2].name).toBe('Sydney')
  })

  it('filters empty lines', () => {
    const input = `London

Cape Town

`
    const results = parsePlaceInput(input)
    expect(results).toHaveLength(2)
  })
})
