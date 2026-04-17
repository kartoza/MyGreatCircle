import { useCallback, useState } from 'react'
import GIF from 'gif.js'
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
 * Hook for generating animated GIFs from the journey
 */
export function useGifGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const generateGif = useCallback(async (places, theme, ecoMode = false, ecoStats = null, options = {}) => {
    const {
      width = 800,
      height = 450,
      frameDelay = 100, // ms between frames
      quality = 10, // 1-30, lower is better quality
      arcSegmentsPerFrame = 3,
    } = options

    setIsGenerating(true)
    setProgress(0)

    try {
      const themeConfig = getTheme(theme)
      const validPlaces = places.filter(p => p && p.coordinates)

      if (validPlaces.length < 2) {
        throw new Error('Need at least 2 places to generate animation')
      }

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // Load world map data
      const worldData = await fetch('/world-110m.json').then(r => r.json())
      const countries = feature(worldData, worldData.objects.countries)

      // Set up projection
      const projection = geoEqualEarth()
        .scale(width / 5.5)
        .translate([width / 2, height / 2])

      const pathGenerator = geoPath().projection(projection)

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

      // Calculate total arc segments
      const totalSegments = allArcPoints.reduce((sum, arc) => sum + arc.points.length - 1, 0)

      // Create GIF encoder
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: width,
        height: height,
        workerScript: '/gif.worker.js',
      })

      // Helper function to draw the base map
      const drawBaseMap = () => {
        // Background
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
        ctx.lineWidth = themeConfig.land.strokeWidth

        countries.features.forEach(country => {
          ctx.beginPath()
          pathGenerator.context(ctx)(country)
          if (themeConfig.land.fill !== 'transparent') {
            ctx.fill()
          }
          ctx.stroke()
        })
      }

      // Helper to draw arcs up to a certain segment
      const drawArcs = (upToSegment) => {
        const useGradient = themeConfig.arcGradient?.colors?.length > 1

        let segmentCount = 0
        ctx.lineWidth = themeConfig.arc.strokeWidth

        if (themeConfig.arc.dashArray) {
          const dashPattern = themeConfig.arc.dashArray.split(',').map(n => parseFloat(n.trim()))
          ctx.setLineDash(dashPattern)
        } else {
          ctx.setLineDash([])
        }

        for (const arc of allArcPoints) {
          for (let j = 1; j < arc.points.length; j++) {
            if (segmentCount >= upToSegment) return

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
      }

      // Helper to draw points up to a certain place index
      const drawPoints = (upToPlaceIndex) => {
        for (let i = 0; i <= upToPlaceIndex && i < validPlaces.length; i++) {
          const [x, y] = projection(validPlaces[i].coordinates)

          ctx.beginPath()
          ctx.arc(x, y, themeConfig.point.radius, 0, Math.PI * 2)

          if (themeConfig.point.fill !== 'transparent') {
            ctx.fillStyle = themeConfig.point.fill
            ctx.fill()
          }

          if (themeConfig.point.stroke) {
            ctx.strokeStyle = themeConfig.point.stroke
            ctx.lineWidth = themeConfig.point.strokeWidth || 1
            ctx.stroke()
          }
        }
      }

      // Helper to draw eco stats overlay
      const drawEcoStats = () => {
        if (!ecoMode || !ecoStats || ecoStats.treeCount <= 0) return

        const padding = 15
        const boxWidth = 180
        const boxHeight = 50
        const boxX = width - boxWidth - padding
        const boxY = height - boxHeight - padding

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8)
        ctx.fill()

        // Tree emoji representation
        const treeCount = Math.min(10, Math.ceil(ecoStats.treeCount / 5))
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#4ade80'
        ctx.textAlign = 'center'
        const trees = Array(treeCount).fill('🌳').join('')
        ctx.fillText(trees, boxX + boxWidth / 2, boxY + 20)

        // CO2 text
        const co2Text = ecoStats.totalCO2Kg >= 1000
          ? `${(ecoStats.totalCO2Kg / 1000).toFixed(1)}t CO2`
          : `${ecoStats.totalCO2Kg}kg CO2`
        ctx.font = '12px sans-serif'
        ctx.fillStyle = '#a3a3a3'
        ctx.fillText(`${ecoStats.treeCount} trees to offset ${co2Text}`, boxX + boxWidth / 2, boxY + 38)
      }

      // Generate frames
      const framesCount = Math.ceil(totalSegments / arcSegmentsPerFrame) + validPlaces.length + 10

      // Initial frames showing just the map
      for (let i = 0; i < 5; i++) {
        drawBaseMap()
        drawPoints(0) // Show first point
        gif.addFrame(ctx, { copy: true, delay: frameDelay })
      }

      // Animate arcs being drawn
      let currentSegment = 0
      let currentPlaceIndex = 0

      while (currentSegment < totalSegments) {
        drawBaseMap()

        // Determine which place we've reached
        let segmentCount = 0
        for (let i = 0; i < allArcPoints.length; i++) {
          segmentCount += allArcPoints[i].points.length - 1
          if (currentSegment < segmentCount) {
            currentPlaceIndex = i + 1
            break
          }
        }

        drawArcs(currentSegment)
        drawPoints(currentPlaceIndex)

        gif.addFrame(ctx, { copy: true, delay: frameDelay })
        currentSegment += arcSegmentsPerFrame

        setProgress(Math.min(90, Math.round((currentSegment / totalSegments) * 80)))
      }

      // Final frames showing complete journey with eco stats
      for (let i = 0; i < 10; i++) {
        drawBaseMap()
        drawArcs(totalSegments)
        drawPoints(validPlaces.length - 1)
        drawEcoStats()
        gif.addFrame(ctx, { copy: true, delay: frameDelay * 2 })
      }

      // Render GIF
      return new Promise((resolve, reject) => {
        gif.on('finished', (blob) => {
          setProgress(100)

          // Create download link
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'my-journey.gif'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          setIsGenerating(false)
          resolve(blob)
        })

        gif.on('progress', (p) => {
          setProgress(80 + Math.round(p * 20))
        })

        gif.render()
      })

    } catch (error) {
      console.error('GIF generation failed:', error)
      setIsGenerating(false)
      throw error
    }
  }, [])

  return {
    generateGif,
    isGenerating,
    progress,
  }
}
