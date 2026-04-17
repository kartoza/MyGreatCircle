/**
 * Generate a compact rectangular word cloud layout
 * Places are arranged in flowing lines within a defined box
 * @param {Array} places - Array of { name } objects
 * @param {Object} bounds - { x, y, width, height } of the word cloud area
 * @param {Object} options - { getTextWidth, fontSize, lineHeight }
 * @returns {Object} { positions: Array, skipped: Array }
 */
export function generateCompactWordCloud(places, bounds, options) {
  const { getTextWidth, fontSize, lineHeight = 1.4 } = options
  const positions = []
  const skipped = []

  const padding = 2 // Space between words
  const lineSpacing = fontSize * lineHeight

  let currentX = bounds.x
  let currentY = bounds.y + fontSize // Start at first line baseline

  for (const place of places) {
    const text = place.geocodedName || place.name
    const textWidth = getTextWidth(text)

    // Check if text fits on current line
    if (currentX + textWidth > bounds.x + bounds.width) {
      // Move to next line
      currentX = bounds.x
      currentY += lineSpacing

      // Check if we've exceeded the box height
      if (currentY > bounds.y + bounds.height) {
        skipped.push(text)
        continue
      }
    }

    positions.push({
      x: currentX,
      y: currentY,
      width: textWidth,
      height: fontSize,
      text,
    })

    currentX += textWidth + padding + getTextWidth(' · ') // Add separator width
  }

  return { positions, skipped }
}

/**
 * Render a compact word cloud as flowing text with separators, center-aligned
 * @param {Object} pdf - jsPDF instance
 * @param {Array} places - Array of place objects
 * @param {Object} bounds - { x, y, width, height }
 * @param {Object} options - { fontSize, textColor }
 */
export function renderCompactWordCloud(pdf, places, bounds, options = {}) {
  const { fontSize = 7, textColor = [153, 153, 153], maxPlaces = 50 } = options

  pdf.setFontSize(fontSize)
  pdf.setTextColor(...textColor)

  const lineHeight = fontSize * 0.85 // Very compact line spacing
  const separator = ' \u2022 ' // Solid bullet •
  const separatorWidth = pdf.getTextWidth(separator)

  // Get unique place names only
  // Strategy: Keep the first/specific part, remove city/country suffixes
  // e.g., "Retreat, Cape Town" -> "Retreat"
  // e.g., "Cape Town, South Africa" -> "Cape Town"
  const seenNames = new Set()
  const displayPlaces = []

  for (const place of places) {
    let name = place.name

    // Extract first part (suburb/specific location) from "Suburb, City" format
    const parts = name.split(',').map(p => p.trim())
    const displayName = parts[0] // Keep first part: "Retreat" from "Retreat, Cape Town"

    // Normalize for deduplication
    const normalized = displayName
      .toLowerCase()
      .replace(/[.,]/g, '')
      .trim()

    if (seenNames.has(normalized)) {
      continue
    }
    seenNames.add(normalized)
    displayPlaces.push({ ...place, displayName })
  }

  // First pass: build lines to calculate for center alignment
  const lines = []
  let currentLine = []
  let currentLineWidth = 0
  let placesRendered = 0
  const skipped = []

  for (const place of displayPlaces) {
    if (placesRendered >= maxPlaces) {
      skipped.push(place.displayName)
      continue
    }

    const text = place.displayName
    const textWidth = pdf.getTextWidth(text)
    const addWidth = currentLine.length > 0 ? separatorWidth : 0

    if (currentLineWidth + addWidth + textWidth > bounds.width && currentLine.length > 0) {
      // Save current line and start new one
      lines.push({ texts: currentLine, width: currentLineWidth })
      currentLine = []
      currentLineWidth = 0
    }

    if (currentLine.length > 0) {
      currentLineWidth += separatorWidth
    }
    currentLine.push(text)
    currentLineWidth += textWidth
    placesRendered++
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push({ texts: currentLine, width: currentLineWidth })
  }

  // Second pass: render lines centered
  let currentY = bounds.y + fontSize

  for (const line of lines) {
    if (currentY > bounds.y + bounds.height) {
      skipped.push(...line.texts)
      continue
    }

    // Center the line
    const startX = bounds.x + (bounds.width - line.width) / 2
    let currentX = startX

    for (let i = 0; i < line.texts.length; i++) {
      const text = line.texts[i]

      // Add separator before (except first item)
      if (i > 0) {
        pdf.setTextColor(100, 100, 100)
        pdf.text(separator, currentX, currentY)
        currentX += separatorWidth
      }

      pdf.setTextColor(...textColor)
      pdf.text(text, currentX, currentY)
      currentX += pdf.getTextWidth(text)
    }

    currentY += lineHeight
  }

  // Show overflow message centered
  if (skipped.length > 0 && currentY <= bounds.y + bounds.height + lineHeight) {
    pdf.setFontSize(fontSize - 1)
    pdf.setTextColor(120, 120, 120)
    const overflowText = `... and ${skipped.length} more places`
    const overflowWidth = pdf.getTextWidth(overflowText)
    pdf.text(overflowText, bounds.x + (bounds.width - overflowWidth) / 2, currentY)
  }

  return { rendered: placesRendered, skipped }
}

// Keep old functions for backwards compatibility but mark as deprecated
/**
 * @deprecated Use generateCompactWordCloud instead
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
      height: pageSize.height - (mapBounds.y + mapBounds.height) - 20,
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
 * @deprecated Use generateCompactWordCloud instead
 */
export function generateWordCloudPositions(places, mapBounds, pageSize, options) {
  // Redirect to compact word cloud for better results
  const bounds = {
    x: 10,
    y: mapBounds.y + mapBounds.height + 10,
    width: pageSize.width - 20,
    height: pageSize.height - (mapBounds.y + mapBounds.height) - 40,
  }
  return generateCompactWordCloud(places, bounds, options)
}
