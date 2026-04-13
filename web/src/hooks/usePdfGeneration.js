import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import { getThemeBackgroundColor } from '../lib/themes'

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
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        // Ensure all arcs and points are fully visible (animations may leave them hidden)
        svgClone.querySelectorAll('.arcs path').forEach(path => {
          path.setAttribute('opacity', '1')
        })
        svgClone.querySelectorAll('.points circle').forEach(circle => {
          circle.setAttribute('opacity', '1')
        })

        const mapWidth = pageWidth - (margin * 2)
        const mapHeight = 100

        await pdf.svg(svgClone, {
          x: margin,
          y: 45,
          width: mapWidth,
          height: mapHeight,
        })
      }

      // Stats section
      const statsY = 155
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')

      const statsData = [
        { label: 'Places', value: stats.totalPlaces.toString(), sub: 'called home' },
        { label: 'Countries', value: stats.countries.length.toString(), sub: 'explored' },
        { label: 'Total Journey', value: `${Math.round(stats.totalDistanceKm).toLocaleString()} km`, sub: 'of life paths' },
        { label: 'Longest Move', value: `${Math.round(stats.longestLegKm).toLocaleString()} km`, sub: stats.longestLegFrom ? `${stats.longestLegFrom} → ${stats.longestLegTo}` : '' },
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
      let ecoEndY = statsY + 60
      if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
        const ecoY = statsY + 65

        // Tree icons (simplified for PDF - just show count with emoji representation)
        const treeLine = '🌲🌳'.repeat(Math.min(10, Math.ceil(ecoStats.treeCount / 5)))
        pdf.setFontSize(14)
        pdf.text(treeLine, margin, ecoY)

        // Eco text
        pdf.setFontSize(11)
        pdf.setTextColor(...mutedColor)
        pdf.text(
          `${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO₂ · ${ecoStats.treeCount} trees to offset`,
          margin,
          ecoY + 8
        )

        pdf.setFontSize(9)
        pdf.text('onetreeplanted.org', margin, ecoY + 14)

        ecoEndY = ecoY + 20
      }

      // Places list
      const listY = ecoEndY + 10
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...textColor)
      pdf.text('Your Places:', margin, listY)

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...textColor)
      places.forEach((place, i) => {
        const y = listY + 8 + (i * 6)
        if (y < pageHeight - 25) {
          let text = `• ${place.name}`
          if (place.yearStart) {
            text += ` (${place.yearStart}${place.yearEnd ? `-${place.yearEnd}` : ''})`
          }
          pdf.text(text, margin, y)
        }
      })

      // Footer with Kartoza branding
      const footerY = pageHeight - 12
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')

      pdf.setTextColor(20, 184, 166)
      pdf.text('Made with', margin, footerY)
      pdf.setTextColor(239, 68, 68)
      pdf.text(' ♥ ', margin + 22, footerY)
      pdf.setTextColor(20, 184, 166)
      pdf.text('by Kartoza', margin + 26, footerY)

      pdf.setTextColor(...mutedColor)
      pdf.setFontSize(8)
      pdf.text('kartoza.com', margin, footerY + 5)
      pdf.text('mygreatcircle.com', pageWidth - margin, footerY, { align: 'right' })

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

      // Full-bleed map (no margin for true full bleed effect)
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        // Ensure all arcs and points are fully visible (animations may leave them hidden)
        svgClone.querySelectorAll('.arcs path').forEach(path => {
          path.setAttribute('opacity', '1')
        })
        svgClone.querySelectorAll('.points circle').forEach(circle => {
          circle.setAttribute('opacity', '1')
        })

        await pdf.svg(svgClone, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight - 25,
        })
      }

      // Bottom bar
      const footerY = pageHeight - 18
      pdf.setFontSize(10)
      pdf.setTextColor(...textColor)

      const placeNames = places.map(p => p.name).join(' → ')
      let footerText = placeNames.length > 60 ? placeNames.slice(0, 60) + '...' : placeNames

      // Add eco stats to footer if enabled
      if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
        footerText += `    🌲×${ecoStats.treeCount}  ${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO₂`
      }

      pdf.text(footerText, 10, footerY)

      // Kartoza branding on bottom right
      const brandY = pageHeight - 10
      pdf.setFontSize(9)
      pdf.setTextColor(20, 184, 166)
      pdf.text('Made with', pageWidth - 95, brandY)
      pdf.setTextColor(239, 68, 68)
      pdf.text(' ♥ ', pageWidth - 73, brandY)
      pdf.setTextColor(20, 184, 166)
      pdf.text('by Kartoza', pageWidth - 69, brandY)
      pdf.setTextColor(...textColor)
      pdf.setFontSize(8)
      pdf.text('kartoza.com | mygreatcircle.com', pageWidth - 10, brandY + 5, { align: 'right' })

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
