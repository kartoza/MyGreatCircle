import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'

// Kartoza logo as SVG path data (simplified K logo)
const KARTOZA_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30" width="100" height="30">
  <rect x="0" y="0" width="100" height="30" rx="4" fill="#14b8a6"/>
  <text x="50" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">KARTOZA</text>
</svg>
`

/**
 * Hook for generating PDFs from the map visualization
 */
export function usePdfGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)

  /**
   * Generate fact sheet PDF (A4 portrait)
   */
  const generateFactSheet = useCallback(async (svgElement, places, stats, theme) => {
    setIsGenerating(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = 210
      const pageHeight = 297
      const margin = 15

      // Title
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('MyGreatCircle', pageWidth / 2, 25, { align: 'center' })

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(128)
      pdf.text('Your Life in Places', pageWidth / 2, 33, { align: 'center' })
      pdf.setTextColor(0)

      // Map visualization
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)
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

      // Stats grid
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
        pdf.setTextColor(128)
        pdf.text(stat.label, x, y)

        pdf.setFontSize(18)
        pdf.setTextColor(0)
        pdf.setFont('helvetica', 'bold')
        pdf.text(stat.value, x, y + 8)

        pdf.setFontSize(8)
        pdf.setTextColor(128)
        pdf.setFont('helvetica', 'normal')
        pdf.text(stat.sub, x, y + 14)
      })

      // Places list
      const listY = 220
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0)
      pdf.text('Your Places:', margin, listY)

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
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
      pdf.setTextColor(60)
      pdf.setFont('helvetica', 'normal')

      // Kartoza branding
      pdf.setTextColor(20, 184, 166) // Teal color
      pdf.text('Made with', margin, footerY)
      pdf.setTextColor(239, 68, 68) // Red heart
      pdf.text(' ♥ ', margin + 22, footerY)
      pdf.setTextColor(20, 184, 166)
      pdf.text('by Kartoza', margin + 26, footerY)

      // Links
      pdf.setTextColor(100)
      pdf.setFontSize(8)
      pdf.text('kartoza.com', margin, footerY + 5)

      // MyGreatCircle URL on right
      pdf.text('mygreatcircle.com', pageWidth - margin, footerY, { align: 'right' })

      pdf.save('my-journey-factsheet.pdf')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  /**
   * Generate poster PDF (A3 landscape)
   */
  const generatePoster = useCallback(async (svgElement, places, theme) => {
    setIsGenerating(true)

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      })

      const pageWidth = 420
      const pageHeight = 297
      const margin = 10

      // Full-bleed map
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        await pdf.svg(svgClone, {
          x: margin,
          y: margin,
          width: pageWidth - margin * 2,
          height: pageHeight - 35,
        })
      }

      // Bottom bar with place names and Kartoza branding
      const footerY = pageHeight - 18
      pdf.setFontSize(10)
      pdf.setTextColor(100)

      const placeNames = places.map(p => p.name).join(' → ')
      const truncatedNames = placeNames.length > 80
        ? placeNames.slice(0, 80) + '...'
        : placeNames

      pdf.text(truncatedNames, margin, footerY)

      // Kartoza branding on bottom right
      const brandY = pageHeight - 10
      pdf.setFontSize(9)
      pdf.setTextColor(20, 184, 166)
      pdf.text('Made with', pageWidth - 95, brandY)
      pdf.setTextColor(239, 68, 68)
      pdf.text(' ♥ ', pageWidth - 73, brandY)
      pdf.setTextColor(20, 184, 166)
      pdf.text('by Kartoza', pageWidth - 69, brandY)
      pdf.setTextColor(100)
      pdf.setFontSize(8)
      pdf.text('kartoza.com | mygreatcircle.com', pageWidth - margin, brandY + 5, { align: 'right' })

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
