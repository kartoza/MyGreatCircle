import { Box, Text, VStack, Link, Wrap, WrapItem } from '@chakra-ui/react'

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
 * Generate array of tree icons, alternating between two types
 */
function generateTreeIcons(count, maxVisible) {
  const visibleCount = Math.min(count, maxVisible)
  const icons = []

  for (let i = 0; i < visibleCount; i++) {
    icons.push(i % 2 === 0 ? '🌲' : '🌳')
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

  const treesPerRow = compact ? 3 : 10
  const displayCount = compact ? Math.min(treeCount, 9) : Math.min(treeCount, maxVisible)
  const icons = generateTreeIcons(displayCount, maxVisible)
  const overflow = treeCount > maxVisible && !compact ? treeCount - maxVisible : 0

  // Calculate how many icons should be faded (partial row)
  const fullRows = Math.floor(displayCount / treesPerRow)
  const partialRowCount = displayCount % treesPerRow
  const fadedSlots = partialRowCount > 0 ? treesPerRow - partialRowCount : 0

  return (
    <VStack spacing={2} align="stretch" w="100%">
      {/* Tree grid */}
      {compact ? (
        // Compact mode: simple inline display
        <Box textAlign="center" py={1}>
          <span style={{ fontSize: '20px', letterSpacing: '4px' }}>
            🌲🌳🌲🌳🌲🌳🌲🌳🌲
          </span>
        </Box>
      ) : (
        // Full mode: wrapped grid
        <Box>
          <Wrap spacing={0.5} justify="flex-start">
            {icons.map((icon, i) => (
              <WrapItem key={i}>
                <Text fontSize="sm" lineHeight={1}>
                  {icon}
                </Text>
              </WrapItem>
            ))}
            {/* Faded placeholder slots for partial row */}
            {fadedSlots > 0 && Array.from({ length: fadedSlots }).map((_, i) => (
              <WrapItem key={`faded-${i}`}>
                <Text fontSize="sm" lineHeight={1} opacity={0.3}>
                  {i % 2 === 0 ? '🌲' : '🌳'}
                </Text>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}

      {/* Overflow indicator */}
      {overflow > 0 && (
        <Text fontSize="xs" color="gray.500" textAlign="center">
          +{overflow} more
        </Text>
      )}

      {/* Stats text */}
      <Text
        fontSize={compact ? 'xs' : 'sm'}
        color="gray.400"
        textAlign={compact ? 'center' : 'left'}
      >
        {formatCO2(co2Kg)} CO₂ · {treeCount} tree{treeCount !== 1 ? 's' : ''} to offset
      </Text>

      {/* Offset link */}
      {!compact && (
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
      )}
    </VStack>
  )
}
