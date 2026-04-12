import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'

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

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(128)
      pdf.text('mygreatcircle.com', pageWidth / 2, pageHeight - 10, { align: 'center' })

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

      // Bottom bar with place names
      const footerY = pageHeight - 15
      pdf.setFontSize(10)
      pdf.setTextColor(128)

      const placeNames = places.map(p => p.name).join(' → ')
      const truncatedNames = placeNames.length > 100
        ? placeNames.slice(0, 100) + '...'
        : placeNames

      pdf.text(truncatedNames, margin, footerY)
      pdf.text('mygreatcircle.com', pageWidth - margin, footerY, { align: 'right' })

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
