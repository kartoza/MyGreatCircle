import { useCallback, useState } from 'react'
import { geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { getTheme, getThemeBackgroundColor } from '../lib/themes'
import { generateGreatCirclePoints } from '../lib/geo'

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 }
}

/**
 * Parse rgba string to RGB object with alpha
 */
function parseColor(colorStr) {
  if (!colorStr) return { r: 255, g: 255, b: 255, a: 1 }

  if (colorStr.startsWith('#')) {
    return { ...hexToRgb(colorStr), a: 1 }
  }

  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    }
  }

  return { r: 255, g: 255, b: 255, a: 1 }
}

/**
 * Interpolate between colors in a gradient
 */
function interpolateGradient(colors, t) {
  if (!colors || colors.length === 0) return { r: 255, g: 255, b: 255 }
  if (colors.length === 1) return hexToRgb(colors[0])

  t = Math.max(0, Math.min(1, t))
  const segments = colors.length - 1
  const segment = Math.min(Math.floor(t * segments), segments - 1)
  const localT = (t * segments) - segment

  const color1 = hexToRgb(colors[segment])
  const color2 = hexToRgb(colors[segment + 1])

  return {
    r: Math.round(color1.r + (color2.r - color1.r) * localT),
    g: Math.round(color1.g + (color2.g - color1.g) * localT),
    b: Math.round(color1.b + (color2.b - color1.b) * localT),
  }
}

/**
 * Hook for generating high-resolution merchandise images
 */
export function useMerchImage() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateMerchImage = useCallback(async (places, theme, options = {}) => {
    const {
      width = 2400,  // High resolution for print
      height = 2400,
      padding = 100,
    } = options

    setIsGenerating(true)

    try {
      const themeConfig = getTheme(theme)
      const validPlaces = places.filter(p => p && p.coordinates)

      if (validPlaces.length < 2) {
        throw new Error('Need at least 2 places to generate image')
      }

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // Load world map data
      const worldData = await fetch('/world-110m.json').then(r => r.json())
      const countries = feature(worldData, worldData.objects.countries)

      // Set up projection - square format for merchandise
      const mapSize = Math.min(width, height) - padding * 2
      const projection = geoEqualEarth()
        .scale(mapSize / 5.5)
        .translate([width / 2, height / 2])

      const pathGenerator = geoPath().projection(projection)

      // Draw background
      const bgColor = getThemeBackgroundColor(theme)
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)

      // Draw countries
      ctx.fillStyle = themeConfig.land.fill.startsWith('rgba')
        ? themeConfig.land.fill
        : themeConfig.land.fill
      ctx.strokeStyle = themeConfig.land.stroke.startsWith('rgba')
        ? themeConfig.land.stroke
        : themeConfig.land.stroke
      ctx.lineWidth = themeConfig.land.strokeWidth * 2 // Scale up for high res

      countries.features.forEach(country => {
        ctx.beginPath()
        pathGenerator.context(ctx)(country)
        if (themeConfig.land.fill !== 'transparent') {
          ctx.fill()
        }
        ctx.stroke()
      })

      // Prepare arc data
      const allArcPoints = []
      for (let i = 1; i < validPlaces.length; i++) {
        const from = validPlaces[i - 1].coordinates
        const to = validPlaces[i].coordinates
        const arcPoints = generateGreatCirclePoints(from, to, 50)
        allArcPoints.push({
          points: arcPoints.map(p => projection(p)),
          placeIndex: i,
        })
      }

      // Calculate total segments for gradient
      const totalSegments = allArcPoints.reduce((sum, arc) => sum + arc.points.length - 1, 0)
      const useGradient = themeConfig.arcGradient?.colors?.length > 1

      // Draw arcs
      ctx.lineWidth = themeConfig.arc.strokeWidth * 2 // Scale up for high res
      if (themeConfig.arc.dashArray) {
        const dashPattern = themeConfig.arc.dashArray.split(',').map(n => parseFloat(n.trim()) * 2)
        ctx.setLineDash(dashPattern)
      } else {
        ctx.setLineDash([])
      }

      let segmentCount = 0
      for (const arc of allArcPoints) {
        for (let j = 1; j < arc.points.length; j++) {
          const [x1, y1] = arc.points[j - 1]
          const [x2, y2] = arc.points[j]

          // Skip segments that wrap around
          if (Math.abs(x2 - x1) >= width / 2) {
            segmentCount++
            continue
          }

          // Set color
          if (useGradient) {
            const t = segmentCount / totalSegments
            const color = interpolateGradient(themeConfig.arcGradient.colors, t)
            ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
          } else {
            const color = parseColor(themeConfig.arc.stroke)
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
          }

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          segmentCount++
        }
      }

      // Reset dash pattern
      ctx.setLineDash([])

      // Draw points
      for (let i = 0; i < validPlaces.length; i++) {
        const [x, y] = projection(validPlaces[i].coordinates)

        ctx.beginPath()
        ctx.arc(x, y, themeConfig.point.radius * 2, 0, Math.PI * 2) // Scale up for high res

        if (themeConfig.point.fill !== 'transparent') {
          ctx.fillStyle = themeConfig.point.fill
          ctx.fill()
        }

        if (themeConfig.point.stroke) {
          ctx.strokeStyle = themeConfig.point.stroke
          ctx.lineWidth = (themeConfig.point.strokeWidth || 1) * 2
          ctx.stroke()
        }
      }

      // Draw branding
      const brandY = height - padding
      const brandX = width / 2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.beginPath()
      ctx.roundRect(brandX - 200, brandY - 50, 400, 60, 12)
      ctx.fill()

      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#14b8a6'
      ctx.fillText('Made with ❤️ by Kartoza', brandX, brandY - 15)
      ctx.font = '18px sans-serif'
      ctx.fillStyle = '#9ca3af'
      ctx.fillText('mygreatcircle.kartoza.com', brandX, brandY + 10)

      // Return data URL directly (upload happens at checkout time if needed)
      return canvas.toDataURL('image/png')

    } catch (error) {
      console.error('Merchandise image generation failed:', error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateMerchImage,
    isGenerating,
  }
}
