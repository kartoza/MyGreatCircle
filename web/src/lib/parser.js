import { v4 as uuidv4 } from 'uuid'

export function parseSingleLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return null

  const yearRangeRegex = /\s*\(?(\d{4})\s*[-–]\s*(\d{4})\)?$/
  const singleYearRegex = /\s*\(?(\d{4})\)?$/

  let name = trimmed
  let yearStart
  let yearEnd

  const rangeMatch = trimmed.match(yearRangeRegex)
  if (rangeMatch) {
    yearStart = parseInt(rangeMatch[1], 10)
    yearEnd = parseInt(rangeMatch[2], 10)
    name = trimmed.slice(0, rangeMatch.index).trim()
  } else {
    const singleMatch = trimmed.match(singleYearRegex)
    if (singleMatch) {
      const potentialYear = parseInt(singleMatch[1], 10)
      if (potentialYear >= 1800 && potentialYear <= 2100) {
        yearStart = potentialYear
        name = trimmed.slice(0, singleMatch.index).trim()
      }
    }
  }

  name = name.replace(/[,;:]+$/, '').trim()

  return {
    id: uuidv4(),
    rawInput: line,
    name,
    yearStart,
    yearEnd,
    coordinates: null,
    confidence: null,
    alternatives: null,
  }
}

export function parsePlaceInput(input) {
  return input
    .split('\n')
    .map(parseSingleLine)
    .filter(place => place !== null)
}
