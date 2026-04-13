import { Box, Text, VStack, Link, Wrap, WrapItem, Icon } from '@chakra-ui/react'

/**
 * Format CO2 in kg to tonnes with 1 decimal place
 */
function formatCO2(kg) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return `${kg}kg`
}

/**
 * Evergreen tree SVG icon (like 🌲)
 */
function EvergreenTree({ size = 16, color = '#22c55e' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2L4 14h5v8h6v-8h5L12 2z" />
    </svg>
  )
}

/**
 * Deciduous tree SVG icon (like 🌳)
 */
function DeciduousTree({ size = 16, color = '#16a34a' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="8" r="6" />
      <rect x="10" y="14" width="4" height="8" />
    </svg>
  )
}

/**
 * Generate array of tree components, alternating between two types
 */
function generateTreeIcons(count, maxVisible) {
  const visibleCount = Math.min(count, maxVisible)
  const icons = []

  for (let i = 0; i < visibleCount; i++) {
    icons.push(i % 2 === 0 ? 'evergreen' : 'deciduous')
  }

  return icons
}

/**
 * TreeGrid - Displays a forest grid visualization of trees needed to offset CO2
 *
 * @param {number} treeCount - Total number of trees to represent
 * @param {number} co2Kg - CO2 in kg for display text
 * @param {number} maxVisible - Maximum tree icons to show (default 50)
 * @param {boolean} compact - If true, shows 3x3 sample grid
 */
export function TreeGrid({ treeCount, co2Kg, maxVisible = 50, compact = false }) {
  if (treeCount === 0) {
    return null
  }

  // Compact mode: simple centered layout with SVG trees
  if (compact) {
    return (
      <VStack spacing={2} align="center" w="100%">
        <Box display="flex" justifyContent="center" gap={1}>
          <EvergreenTree size={20} />
          <DeciduousTree size={20} />
          <EvergreenTree size={20} />
          <DeciduousTree size={20} />
          <EvergreenTree size={20} />
          <DeciduousTree size={20} />
          <EvergreenTree size={20} />
          <DeciduousTree size={20} />
          <EvergreenTree size={20} />
        </Box>
        <Text fontSize="xs" color="gray.400">
          {formatCO2(co2Kg)} CO₂ · {treeCount} trees to offset
        </Text>
      </VStack>
    )
  }

  // Full mode calculations
  const displayCount = Math.min(treeCount, maxVisible)
  const icons = generateTreeIcons(displayCount, maxVisible)
  const overflow = treeCount > maxVisible ? treeCount - maxVisible : 0
  const treesPerRow = 10
  const partialRowCount = displayCount % treesPerRow
  const fadedSlots = partialRowCount > 0 ? treesPerRow - partialRowCount : 0

  return (
    <VStack spacing={2} align="stretch" w="100%">
      {/* Tree grid */}
      <Box>
        <Wrap spacing={1} justify="flex-start">
          {icons.map((type, i) => (
            <WrapItem key={i}>
              {type === 'evergreen' ? (
                <EvergreenTree size={16} />
              ) : (
                <DeciduousTree size={16} />
              )}
            </WrapItem>
          ))}
          {/* Faded placeholder slots for partial row */}
          {fadedSlots > 0 && Array.from({ length: fadedSlots }).map((_, i) => (
            <WrapItem key={`faded-${i}`} opacity={0.3}>
              {i % 2 === 0 ? (
                <EvergreenTree size={16} />
              ) : (
                <DeciduousTree size={16} />
              )}
            </WrapItem>
          ))}
        </Wrap>
      </Box>

      {/* Overflow indicator */}
      {overflow > 0 && (
        <Text fontSize="xs" color="gray.500" textAlign="center">
          +{overflow} more
        </Text>
      )}

      {/* Stats text */}
      <Text fontSize="sm" color="gray.400">
        {formatCO2(co2Kg)} CO₂ · {treeCount} trees to offset
      </Text>

      {/* Offset link */}
      <Link
        href="https://onetreeplanted.org/products/plant-trees"
        target="_blank"
        rel="noopener noreferrer"
        fontSize="sm"
        color="gray.500"
        _hover={{ color: 'teal.300' }}
      >
        Offset your journey →
      </Link>
    </VStack>
  )
}
