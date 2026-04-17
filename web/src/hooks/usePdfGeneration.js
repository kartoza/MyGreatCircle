import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import { geoEqualEarth } from 'd3-geo'
import { getThemeBackgroundColor, getTheme } from '../lib/themes'
import { renderCompactWordCloud } from '../lib/wordcloud'
import { generateGreatCirclePoints } from '../lib/geo'

/**
 * Convert hex color to RGB array for jsPDF
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : [255, 255, 255]
}

/**
 * Format CO2 for PDF display
 */
function formatCO2ForPdf(kg) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return `${kg}kg`
}

/**
 * Draw a heart shape using PDF graphics
 */
function drawHeart(pdf, x, y, size, color) {
  pdf.setFillColor(...color)
  // Simple heart using bezier curves
  const s = size / 10
  pdf.circle(x - s * 2.5, y - s, s * 2.5, 'F')
  pdf.circle(x + s * 2.5, y - s, s * 2.5, 'F')
  pdf.triangle(
    x - s * 5, y,
    x + s * 5, y,
    x, y + s * 6,
    'F'
  )
}

/**
 * Render "Made with [heart] by Kartoza" branding
 */
function renderKartozaBranding(pdf, x, y, options = {}) {
  const { fontSize = 9, tealColor = [20, 184, 166], redColor = [239, 68, 68] } = options

  pdf.setFontSize(fontSize)
  pdf.setFont('helvetica', 'normal')

  // "Made with"
  pdf.setTextColor(...tealColor)
  pdf.text('Made with', x, y)
  const madeWithWidth = pdf.getTextWidth('Made with')

  // Balanced spacing around heart
  const spacing = 2.5 // Equal space on both sides of heart
  const heartSize = 3
  const heartWidth = heartSize * 1.3 // Approximate heart width

  // Draw a simple heart using lines instead of relying on font support
  const heartX = x + madeWithWidth + spacing + (heartWidth / 2)
  const heartY = y - 2

  pdf.setFillColor(...redColor)
  pdf.setDrawColor(...redColor)

  // Draw heart shape using small circles and triangle
  pdf.circle(heartX - heartSize * 0.3, heartY - heartSize * 0.2, heartSize * 0.4, 'F')
  pdf.circle(heartX + heartSize * 0.3, heartY - heartSize * 0.2, heartSize * 0.4, 'F')
  pdf.triangle(
    heartX - heartSize * 0.65, heartY,
    heartX + heartSize * 0.65, heartY,
    heartX, heartY + heartSize * 0.7,
    'F'
  )

  // "by Kartoza" - positioned with same spacing after heart
  pdf.setTextColor(...tealColor)
  const byKartozaX = x + madeWithWidth + spacing + heartWidth + spacing
  pdf.text('by Kartoza', byKartozaX, y)
}

/**
 * Render attribution for geocoding and map data (centered within bounds)
 */
function renderAttribution(pdf, bounds, y, mutedColor) {
  pdf.setFontSize(7)
  pdf.setTextColor(...mutedColor)
  const text = 'Equal Earth projection · Geocoding by Nominatim · Map data © Natural Earth'
  const textWidth = pdf.getTextWidth(text)
  // Center within the provided bounds
  pdf.text(text, bounds.x + (bounds.width - textWidth) / 2, y)
}

/**
 * Create a projection function for PDF rendering using d3-geo's Equal Earth
 * This ensures exact match with the web map's projection
 * @param {Object} bounds - { x, y, width, height } of the map area in PDF
 * @returns {Function} Projection function that takes [lon, lat] and returns [x, y]
 */
function createPdfProjection(bounds) {
  // Create Equal Earth projection matching the web map setup exactly
  // Web map uses: .scale(width / 5.5).translate([width / 2, height / 2])
  const projection = geoEqualEarth()
    .scale(bounds.width / 5.5)
    .translate([bounds.x + bounds.width / 2, bounds.y + bounds.height / 2])

  return (coords) => {
    const result = projection(coords)
    return result || [0, 0]  // Handle null for invalid coords
  }
}

/**
 * Parse rgba color string to RGB array and opacity
 */
function parseRgbaColor(colorStr) {
  if (!colorStr) return { rgb: [255, 255, 255], opacity: 1 }

  // Handle rgba(r, g, b, a) format
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return {
      rgb: [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])],
      opacity: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    }
  }

  // Handle hex format
  if (colorStr.startsWith('#')) {
    return { rgb: hexToRgb(colorStr), opacity: 1 }
  }

  // Default to white
  return { rgb: [255, 255, 255], opacity: 0.6 }
}

/**
 * Interpolate between colors in a gradient
 * @param {Array} colors - Array of hex color strings
 * @param {number} t - Position in gradient (0-1)
 * @returns {Array} RGB color array
 */
function interpolateGradient(colors, t) {
  if (!colors || colors.length === 0) return [255, 255, 255]
  if (colors.length === 1) return hexToRgb(colors[0])

  // Clamp t to 0-1
  t = Math.max(0, Math.min(1, t))

  // Find which segment of the gradient we're in
  const segments = colors.length - 1
  const segment = Math.min(Math.floor(t * segments), segments - 1)
  const localT = (t * segments) - segment

  const color1 = hexToRgb(colors[segment])
  const color2 = hexToRgb(colors[segment + 1])

  // Linear interpolation
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * localT),
    Math.round(color1[1] + (color2[1] - color1[1]) * localT),
    Math.round(color1[2] + (color2[2] - color1[2]) * localT),
  ]
}

/**
 * Draw journey arcs directly on PDF
 * @param {Object} pdf - jsPDF instance
 * @param {Array} places - Array of places with coordinates
 * @param {Object} mapBounds - { x, y, width, height }
 * @param {Function} project - Projection function
 * @param {Object} options - { strokeColor, strokeWidth, gradientColors, dashArray }
 */
function drawJourneyArcs(pdf, places, mapBounds, project, options = {}) {
  const { strokeColor, strokeWidth = 0.8, gradientColors, dashArray } = options

  const validPlaces = places.filter(p => p && p.coordinates)
  if (validPlaces.length < 2) return

  const bgColor = 30 // approximate dark background for blending
  const useGradient = gradientColors && gradientColors.length > 1

  // Count total segments for gradient positioning
  let totalSegments = 0
  const arcSegments = []

  for (let i = 1; i < validPlaces.length; i++) {
    const from = validPlaces[i - 1].coordinates
    const to = validPlaces[i].coordinates
    const arcPoints = generateGreatCirclePoints(from, to, 50)
    const projectedPoints = arcPoints.map(p => project(p))
    arcSegments.push(projectedPoints)
    totalSegments += projectedPoints.length - 1
  }

  pdf.setLineWidth(strokeWidth)

  // Set dash pattern if specified (e.g., '6,4' -> [6, 4])
  if (dashArray) {
    const dashPattern = dashArray.split(',').map(n => parseFloat(n.trim()) * 0.26) // Convert px to mm
    pdf.setLineDashPattern(dashPattern, 0)
  }

  let segmentIndex = 0

  for (const projectedPoints of arcSegments) {
    for (let j = 1; j < projectedPoints.length; j++) {
      const [x1, y1] = projectedPoints[j - 1]
      const [x2, y2] = projectedPoints[j]

      // Skip segments that wrap around the world (crossing date line)
      if (Math.abs(x2 - x1) >= mapBounds.width / 2) {
        segmentIndex++
        continue
      }

      // Get color for this segment
      let segmentColor
      if (useGradient) {
        const t = segmentIndex / totalSegments
        segmentColor = interpolateGradient(gradientColors, t)
      } else {
        // Parse single color
        let rgb, opacity
        if (typeof strokeColor === 'string') {
          const parsed = parseRgbaColor(strokeColor)
          rgb = parsed.rgb
          opacity = parsed.opacity
        } else if (Array.isArray(strokeColor)) {
          rgb = strokeColor
          opacity = 0.6
        } else {
          rgb = [255, 255, 255]
          opacity = 0.6
        }
        segmentColor = rgb.map(c => Math.round(bgColor + (c - bgColor) * opacity))
      }

      pdf.setDrawColor(...segmentColor)
      pdf.line(x1, y1, x2, y2)
      segmentIndex++
    }
  }
}

/**
 * Draw place markers directly on PDF
 * @param {Object} pdf - jsPDF instance
 * @param {Array} places - Array of places with coordinates
 * @param {Function} project - Projection function
 * @param {Object} options - { fillColor, strokeColor, strokeWidth, radius }
 */
function drawPlaceMarkers(pdf, places, project, options = {}) {
  const { fillColor, strokeColor, strokeWidth = 0.4, radius = 1.5 } = options

  const validPlaces = places.filter(p => p && p.coordinates)

  for (const place of validPlaces) {
    const [x, y] = project(place.coordinates)

    if (strokeColor && !fillColor) {
      // Stroke only (e.g., blueprint theme)
      pdf.setDrawColor(...strokeColor)
      pdf.setLineWidth(strokeWidth)
      pdf.circle(x, y, radius, 'S')
    } else if (fillColor && strokeColor) {
      // Both fill and stroke
      pdf.setFillColor(...fillColor)
      pdf.setDrawColor(...strokeColor)
      pdf.setLineWidth(strokeWidth)
      pdf.circle(x, y, radius, 'FD')
    } else if (fillColor) {
      // Fill only
      pdf.setFillColor(...fillColor)
      pdf.circle(x, y, radius, 'F')
    }
  }
}

/**
 * Hook for generating PDFs from the map visualization
 */
export function usePdfGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)

  /**
   * Generate fact sheet PDF (A4 portrait)
   */
  const generateFactSheet = useCallback(async (svgElement, places, stats, theme, ecoMode = false, ecoStats = null) => {
    setIsGenerating(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = 210
      const pageHeight = 297

      // Full bleed background
      const bgColor = getThemeBackgroundColor(theme)
      const [r, g, b] = hexToRgb(bgColor)
      pdf.setFillColor(r, g, b)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')

      // Determine text color based on background brightness
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      const textColor = brightness > 128 ? [30, 30, 30] : [255, 255, 255]
      const mutedColor = brightness > 128 ? [100, 100, 100] : [160, 160, 160]

      const margin = 15

      // Title
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...textColor)
      pdf.text('MyGreatCircle', pageWidth / 2, 25, { align: 'center' })

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...mutedColor)
      pdf.text('Your Life in Places', pageWidth / 2, 33, { align: 'center' })

      // Map visualization
      const mapBounds = { x: margin, y: 45, width: pageWidth - (margin * 2), height: 100 }

      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        // Remove arcs and points from SVG - we'll draw them directly on PDF for reliability
        svgClone.querySelectorAll('.arcs').forEach(g => g.remove())
        svgClone.querySelectorAll('.points').forEach(g => g.remove())

        await pdf.svg(svgClone, {
          x: mapBounds.x,
          y: mapBounds.y,
          width: mapBounds.width,
          height: mapBounds.height,
        })
      }

      // Create projection matching the SVG map
      const project = createPdfProjection(mapBounds)

      // Draw journey arcs directly on PDF (more reliable than SVG conversion)
      // Use theme's arc color or gradient
      const themeConfig = getTheme(theme)
      drawJourneyArcs(pdf, places, mapBounds, project, {
        strokeColor: themeConfig.arc.stroke,
        strokeWidth: themeConfig.arc.strokeWidth * 0.26, // Convert px to mm
        gradientColors: themeConfig.arcGradient?.colors,
        dashArray: themeConfig.arc.dashArray,
      })

      // Draw place markers directly on PDF
      const pointFill = themeConfig.point.fill === 'transparent' ? null : hexToRgb(themeConfig.point.fill)
      const pointStroke = themeConfig.point.stroke ? hexToRgb(themeConfig.point.stroke) : null
      drawPlaceMarkers(pdf, places, project, {
        fillColor: pointFill,
        strokeColor: pointStroke,
        strokeWidth: (themeConfig.point.strokeWidth || 1) * 0.26,
        radius: themeConfig.point.radius * 0.26, // Convert px to mm
      })

      // Stats section
      const statsY = 155
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')

      // Format longest leg info with text arrow instead of Unicode arrow
      const longestLegSub = stats.longestLegFrom
        ? `${stats.longestLegFrom} to ${stats.longestLegTo}`
        : ''

      const statsData = [
        { label: 'Places', value: stats.totalPlaces.toString(), sub: "I've been" },
        { label: 'Countries', value: stats.countries.length.toString(), sub: 'explored' },
        { label: 'Total Journey', value: `${Math.round(stats.totalDistanceKm).toLocaleString()} km`, sub: 'of life paths' },
        { label: 'Longest Move', value: `${Math.round(stats.longestLegKm).toLocaleString()} km`, sub: longestLegSub },
      ]

      const statWidth = (pageWidth - margin * 2) / 2
      statsData.forEach((stat, i) => {
        const x = margin + (i % 2) * statWidth
        const y = statsY + Math.floor(i / 2) * 30

        pdf.setFontSize(10)
        pdf.setTextColor(...mutedColor)
        pdf.text(stat.label, x, y)

        pdf.setFontSize(18)
        pdf.setTextColor(...textColor)
        pdf.setFont('helvetica', 'bold')
        pdf.text(stat.value, x, y + 8)

        pdf.setFontSize(8)
        pdf.setTextColor(...mutedColor)
        pdf.setFont('helvetica', 'normal')
        pdf.text(stat.sub, x, y + 14)
      })

      // Eco stats section (if enabled)
      let contentEndY = statsY + 60
      if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
        const ecoY = statsY + 65

        // Simple tree representation using text
        const treeCount = Math.min(10, Math.ceil(ecoStats.treeCount / 5))
        const treeLine = Array(treeCount).fill('*').join(' ')
        pdf.setFontSize(12)
        pdf.setTextColor(34, 139, 34) // Forest green
        pdf.text(treeLine, margin, ecoY)

        // Eco text
        pdf.setFontSize(11)
        pdf.setTextColor(...mutedColor)
        pdf.text(
          `${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO2 · ${ecoStats.treeCount} trees to offset`,
          margin,
          ecoY + 8
        )

        pdf.setFontSize(9)
        pdf.text('onetreeplanted.org', margin, ecoY + 14)

        contentEndY = ecoY + 20
      }

      // Compact word cloud of place names (below stats)
      const wordCloudBounds = {
        x: margin,
        y: contentEndY + 5,
        width: pageWidth - (margin * 2),
        height: pageHeight - contentEndY - 35, // Leave room for footer
      }

      renderCompactWordCloud(pdf, places, wordCloudBounds, {
        fontSize: 7,
        textColor: mutedColor,
        maxPlaces: 60,
      })

      // Footer with Kartoza branding
      const footerY = pageHeight - 12
      renderKartozaBranding(pdf, margin, footerY)

      pdf.setTextColor(...mutedColor)
      pdf.setFontSize(8)
      pdf.text('mygreatcircle.kartoza.com', margin, footerY + 5)

      // Attribution (centered under word cloud)
      renderAttribution(pdf, wordCloudBounds, footerY + 10, mutedColor)

      pdf.save('my-journey-factsheet.pdf')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  /**
   * Generate poster PDF (A3 landscape)
   */
  const generatePoster = useCallback(async (svgElement, places, theme, ecoMode = false, ecoStats = null) => {
    setIsGenerating(true)

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      })

      const pageWidth = 420
      const pageHeight = 297

      // Full bleed background
      const bgColor = getThemeBackgroundColor(theme)
      const [r, g, b] = hexToRgb(bgColor)
      pdf.setFillColor(r, g, b)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')

      // Determine text color based on background brightness
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      const textColor = brightness > 128 ? [80, 80, 80] : [200, 200, 200]
      const mutedColor = brightness > 128 ? [100, 100, 100] : [160, 160, 160]

      // Map takes most of the page, leaving room for word cloud at bottom
      const mapHeight = pageHeight - 45

      // Full-bleed map
      const posterMapBounds = { x: 0, y: 0, width: pageWidth, height: mapHeight }

      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        // Remove arcs and points from SVG - we'll draw them directly on PDF for reliability
        svgClone.querySelectorAll('.arcs').forEach(g => g.remove())
        svgClone.querySelectorAll('.points').forEach(g => g.remove())

        await pdf.svg(svgClone, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: mapHeight,
        })
      }

      // Create projection matching the SVG map
      const project = createPdfProjection(posterMapBounds)

      // Draw journey arcs directly on PDF (more reliable than SVG conversion)
      // Use theme's arc color or gradient
      const themeConfig = getTheme(theme)
      drawJourneyArcs(pdf, places, posterMapBounds, project, {
        strokeColor: themeConfig.arc.stroke,
        strokeWidth: themeConfig.arc.strokeWidth * 0.26, // Convert px to mm
        gradientColors: themeConfig.arcGradient?.colors,
        dashArray: themeConfig.arc.dashArray,
      })

      // Draw place markers directly on PDF
      const pointFillPoster = themeConfig.point.fill === 'transparent' ? null : hexToRgb(themeConfig.point.fill)
      const pointStrokePoster = themeConfig.point.stroke ? hexToRgb(themeConfig.point.stroke) : null
      drawPlaceMarkers(pdf, places, project, {
        fillColor: pointFillPoster,
        strokeColor: pointStrokePoster,
        strokeWidth: (themeConfig.point.strokeWidth || 1) * 0.26,
        radius: themeConfig.point.radius * 0.26, // Convert px to mm
      })

      // Compact word cloud in a rectangular block at the bottom (4 lines max)
      const wordCloudBounds = {
        x: 10,
        y: mapHeight + 3,
        width: pageWidth - 120, // Leave room for branding on right
        height: 32, // Enough for 4 lines
      }

      renderCompactWordCloud(pdf, places, wordCloudBounds, {
        fontSize: 8,
        textColor: textColor,
        maxPlaces: 80, // Allow more places before eliding
      })

      // Add eco stats if enabled
      if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
        pdf.setFontSize(8)
        pdf.setTextColor(...mutedColor)
        const ecoText = `${ecoStats.treeCount} trees to offset ${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO2`
        pdf.text(ecoText, 10, pageHeight - 8)
      }

      // Kartoza branding on bottom right
      const brandX = pageWidth - 90
      const brandY = mapHeight + 12
      renderKartozaBranding(pdf, brandX, brandY)

      // Center URL under branding - calculate actual branding width
      pdf.setFontSize(9) // Same as branding font size
      const madeWithWidth = pdf.getTextWidth('Made with')
      const spacing = 2.5
      const heartWidth = 3 * 1.3 // heartSize * 1.3
      const byKartozaWidth = pdf.getTextWidth('by Kartoza')
      const totalBrandingWidth = madeWithWidth + spacing + heartWidth + spacing + byKartozaWidth
      const brandingCenterX = brandX + totalBrandingWidth / 2

      pdf.setTextColor(...mutedColor)
      pdf.setFontSize(8)
      const urlText = 'mygreatcircle.kartoza.com'
      const urlWidth = pdf.getTextWidth(urlText)
      pdf.text(urlText, brandingCenterX - (urlWidth / 2), brandY + 5)

      // Attribution (centered under word cloud)
      renderAttribution(pdf, wordCloudBounds, pageHeight - 3, mutedColor)

      pdf.save('my-journey-poster.pdf')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateFactSheet,
    generatePoster,
    isGenerating,
  }
}
