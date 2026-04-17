/**
 * Calculate margin zones around the map bounds
 * @param {Object} mapBounds - { x, y, width, height } of the map
 * @param {Object} pageSize - { width, height } of the page
 * @param {number} marginSize - Size of margin zones
 * @returns {Array} Array of zone objects with { name, x, y, width, height }
 */
export function calculateMarginZones(mapBounds, pageSize, marginSize = 40) {
  return [
    {
      name: 'top',
      x: 0,
      y: 0,
      width: pageSize.width,
      height: mapBounds.y - 5,
    },
    {
      name: 'bottom',
      x: 0,
      y: mapBounds.y + mapBounds.height + 5,
      width: pageSize.width,
      height: pageSize.height - (mapBounds.y + mapBounds.height) - 20, // Leave room for footer
    },
    {
      name: 'left',
      x: 0,
      y: mapBounds.y,
      width: mapBounds.x - 5,
      height: mapBounds.height,
    },
    {
      name: 'right',
      x: mapBounds.x + mapBounds.width + 5,
      y: mapBounds.y,
      width: pageSize.width - (mapBounds.x + mapBounds.width) - 5,
      height: mapBounds.height,
    },
  ]
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(r1, r2, padding = 2) {
  return !(
    r1.x + r1.width + padding < r2.x ||
    r2.x + r2.width + padding < r1.x ||
    r1.y + r1.height + padding < r2.y ||
    r2.y + r2.height + padding < r1.y
  )
}

/**
 * Find a non-overlapping position for text within margin zones
 * @param {string} text - The text to position
 * @param {Array} zones - Available margin zones
 * @param {Array} existingPositions - Already placed text boxes
 * @param {Object} options - { getTextWidth, fontSize }
 * @returns {Object|null} Position { x, y, width, height, text } or null if cannot fit
 */
export function findNonOverlappingPosition(text, zones, existingPositions, options) {
  const { getTextWidth, fontSize } = options
  const textWidth = getTextWidth(text)
  const textHeight = fontSize * 1.2

  const maxAttempts = 50

  // Try each zone in round-robin fashion
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const zone = zones[attempt % zones.length]

    // Skip if zone is too small
    if (zone.width < textWidth + 4 || zone.height < textHeight + 4) {
      continue
    }

    // Random position within zone
    const x = zone.x + Math.random() * (zone.width - textWidth)
    const y = zone.y + textHeight + Math.random() * (zone.height - textHeight - 4)

    const newRect = { x, y, width: textWidth, height: textHeight }

    // Check for overlaps
    const hasOverlap = existingPositions.some(pos =>
      rectsOverlap(newRect, pos)
    )

    if (!hasOverlap) {
      return { ...newRect, text }
    }
  }

  return null
}

/**
 * Generate word cloud positions for all places
 * @param {Array} places - Array of { name } objects
 * @param {Object} mapBounds - { x, y, width, height }
 * @param {Object} pageSize - { width, height }
 * @param {Object} options - { getTextWidth, fontSize }
 * @returns {Object} { positions: Array, skipped: Array }
 */
export function generateWordCloudPositions(places, mapBounds, pageSize, options) {
  const zones = calculateMarginZones(mapBounds, pageSize)
  const positions = []
  const skipped = []

  // Shuffle places for random distribution
  const shuffled = [...places].sort(() => Math.random() - 0.5)

  for (const place of shuffled) {
    const position = findNonOverlappingPosition(place.name, zones, positions, options)
    if (position) {
      positions.push(position)
    } else {
      skipped.push(place.name)
    }
  }

  return { positions, skipped }
}
