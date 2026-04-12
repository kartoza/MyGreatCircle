import { useEffect, useRef, useMemo } from 'react'
import { Box } from '@chakra-ui/react'
import * as d3 from 'd3'
import { geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { getTheme } from '../lib/themes'
import { generateGreatCirclePoints } from '../lib/geo'

export function MapVisualization({
  places,
  theme = 'minimal',
  width = 800,
  height = 450,
  svgRef: externalSvgRef,
}) {
  const containerRef = useRef(null)
  const internalSvgRef = useRef(null)
  const svgRef = externalSvgRef || internalSvgRef

  const themeConfig = useMemo(() => getTheme(theme), [theme])

  const validPlaces = useMemo(() =>
    places.filter(p => p.coordinates),
    [places]
  )

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous content
    d3.select(containerRef.current).selectAll('*').remove()

    // Create SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    // Store ref
    svgRef.current = svg.node()

    // Add defs for gradients and filters
    const defs = svg.append('defs')

    // Background gradient
    if (themeConfig.background.type === 'gradient') {
      const bgGradient = defs.append('linearGradient')
        .attr('id', 'bgGradient')
        .attr('gradientTransform', `rotate(${themeConfig.background.angle})`)

      themeConfig.background.colors.forEach((color, i) => {
        bgGradient.append('stop')
          .attr('offset', `${(i / (themeConfig.background.colors.length - 1)) * 100}%`)
          .attr('stop-color', color)
      })
    }

    // Neon gradient for arcs
    if (themeConfig.arcGradient) {
      const arcGradient = defs.append('linearGradient')
        .attr('id', 'neonGradient')
        .attr('gradientUnits', 'userSpaceOnUse')

      themeConfig.arcGradient.colors.forEach((color, i) => {
        arcGradient.append('stop')
          .attr('offset', `${(i / (themeConfig.arcGradient.colors.length - 1)) * 100}%`)
          .attr('stop-color', color)
      })
    }

    // Glow filter
    if (themeConfig.arc.glow || themeConfig.point.glow) {
      const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%')

      filter.append('feGaussianBlur')
        .attr('stdDeviation', themeConfig.arc.glowRadius || 4)
        .attr('result', 'coloredBlur')

      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    }

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', themeConfig.background.type === 'gradient'
        ? 'url(#bgGradient)'
        : themeConfig.background.color)

    // Projection - Equal Earth (Patterson)
    const projection = geoEqualEarth()
      .scale(width / 5.5)
      .translate([width / 2, height / 2])

    const pathGenerator = geoPath().projection(projection)

    // Load and render world map
    d3.json('/world-110m.json').then(world => {
      const countries = feature(world, world.objects.countries)

      // Draw land
      svg.append('g')
        .selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', pathGenerator)
        .attr('fill', themeConfig.land.fill)
        .attr('stroke', themeConfig.land.stroke)
        .attr('stroke-width', themeConfig.land.strokeWidth)

      // Draw great circle arcs
      if (validPlaces.length >= 2) {
        const arcsGroup = svg.append('g').attr('class', 'arcs')

        for (let i = 1; i < validPlaces.length; i++) {
          const from = validPlaces[i - 1].coordinates
          const to = validPlaces[i].coordinates
          const points = generateGreatCirclePoints(from, to, 50)

          const lineGenerator = d3.line()
            .x(d => projection(d)[0])
            .y(d => projection(d)[1])
            .curve(d3.curveCardinal.tension(0.5))

          arcsGroup.append('path')
            .attr('d', lineGenerator(points))
            .attr('fill', 'none')
            .attr('stroke', themeConfig.arc.stroke)
            .attr('stroke-width', themeConfig.arc.strokeWidth)
            .attr('stroke-dasharray', themeConfig.arc.dashArray || 'none')
            .attr('filter', themeConfig.arc.glow ? 'url(#glow)' : null)
            .attr('opacity', 0)
            .transition()
            .duration(1000)
            .delay(i * 300)
            .attr('opacity', 1)
        }
      }

      // Draw place markers
      const pointsGroup = svg.append('g').attr('class', 'points')

      validPlaces.forEach((place, i) => {
        const [x, y] = projection(place.coordinates)

        pointsGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 0)
          .attr('fill', themeConfig.point.fill)
          .attr('filter', themeConfig.point.glow ? 'url(#glow)' : null)
          .transition()
          .duration(500)
          .delay(i * 200)
          .attr('r', themeConfig.point.radius)
      })
    })

  }, [validPlaces, theme, width, height, themeConfig, svgRef])

  return (
    <Box
      ref={containerRef}
      borderRadius="lg"
      overflow="hidden"
      boxShadow="xl"
    />
  )
}
