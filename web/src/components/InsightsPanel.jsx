import {
  SimpleGrid,
  HStack,
  Box,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  IconButton,
  Tooltip,
  Collapse,
} from '@chakra-ui/react'
import { TreeGrid } from './TreeGrid'

function formatDistance(km) {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`
  }
  return `${km} km`
}

// Compact stat for overlay mode
function CompactStat({ label, value, sub }) {
  return (
    <VStack spacing={0} align="center">
      <Text fontSize="2xl" fontWeight="bold" color="white" lineHeight="1">
        {value}
      </Text>
      <Text fontSize="xs" color="gray.400" textTransform="uppercase">
        {label}
      </Text>
    </VStack>
  )
}

// SVG Seedling icon
function SeedlingIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Stem */}
      <path d="M12 22V12" />
      {/* Left leaf */}
      <path d="M12 12C12 12 8 10 6 6C10 6 12 10 12 12" fill={color} stroke="none" />
      {/* Right leaf */}
      <path d="M12 8C12 8 14 6 18 4C18 8 14 10 12 12" fill={color} stroke="none" />
      {/* Ground */}
      <path d="M8 22h8" />
    </svg>
  )
}

// Eco toggle button
function EcoToggle({ isActive, onToggle }) {
  return (
    <Tooltip label={isActive ? 'Hide eco impact' : 'Show eco impact'}>
      <IconButton
        aria-label="Toggle eco impact"
        icon={<SeedlingIcon size={20} color={isActive ? 'white' : '#9CA3AF'} />}
        size="sm"
        variant="ghost"
        onClick={onToggle}
        bg={isActive ? 'green.600' : 'gray.700'}
        opacity={isActive ? 1 : 0.5}
        _hover={{
          bg: isActive ? 'green.500' : 'gray.600',
          opacity: 1,
        }}
        boxShadow={isActive ? '0 0 12px rgba(56, 161, 105, 0.4)' : 'none'}
        borderRadius="full"
      />
    </Tooltip>
  )
}

export function InsightsPanel({
  stats,
  compact = false,
  ecoMode = false,
  ecoStats = null,
  onEcoToggle = () => {},
}) {
  if (!stats || stats.totalPlaces === 0) {
    return null
  }

  // Compact mode for overlay
  if (compact) {
    return (
      <VStack spacing={3} align="stretch">
        <HStack spacing={8} justify="center" align="center">
          <CompactStat label="Places" value={stats.totalPlaces} />
          <CompactStat label="Countries" value={stats.countries.length} />
          <CompactStat label="Distance" value={formatDistance(stats.totalDistanceKm)} />
          {stats.longestLegKm > 0 && (
            <CompactStat label="Longest Move" value={formatDistance(stats.longestLegKm)} />
          )}
          <EcoToggle isActive={ecoMode} onToggle={onEcoToggle} />
        </HStack>

        <Collapse in={ecoMode} animateOpacity>
          {ecoStats && ecoStats.treeCount > 0 && (
            <Box
              mt={2}
              p={3}
              bg="blackAlpha.400"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="green.700"
            >
              <TreeGrid
                treeCount={ecoStats.treeCount}
                co2Kg={ecoStats.totalCO2Kg}
                compact={true}
              />
            </Box>
          )}
        </Collapse>
      </VStack>
    )
  }

  // Full mode
  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="wider">
          Journey Stats
        </Text>
        <EcoToggle isActive={ecoMode} onToggle={onEcoToggle} />
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat bg="gray.700" p={4} borderRadius="md">
          <StatLabel color="gray.400">Places</StatLabel>
          <StatNumber>{stats.totalPlaces}</StatNumber>
          <StatHelpText>I've been</StatHelpText>
        </Stat>

        <Stat bg="gray.700" p={4} borderRadius="md">
          <StatLabel color="gray.400">Countries</StatLabel>
          <StatNumber>{stats.countries.length}</StatNumber>
          <StatHelpText>explored</StatHelpText>
        </Stat>

        <Stat bg="gray.700" p={4} borderRadius="md">
          <StatLabel color="gray.400">Total Journey</StatLabel>
          <StatNumber>{formatDistance(stats.totalDistanceKm)}</StatNumber>
          <StatHelpText>of life paths</StatHelpText>
        </Stat>

        {stats.longestLegKm > 0 && (
          <Stat bg="gray.700" p={4} borderRadius="md">
            <StatLabel color="gray.400">Longest Move</StatLabel>
            <StatNumber>{formatDistance(stats.longestLegKm)}</StatNumber>
            <StatHelpText>
              {stats.longestLegFrom} → {stats.longestLegTo}
            </StatHelpText>
          </Stat>
        )}

        {stats.yearsSpanned && (
          <Stat bg="gray.700" p={4} borderRadius="md">
            <StatLabel color="gray.400">Years Spanned</StatLabel>
            <StatNumber>{stats.yearsSpanned}</StatNumber>
            <StatHelpText>of memories</StatHelpText>
          </Stat>
        )}

        {stats.longestStay && (
          <Stat bg="gray.700" p={4} borderRadius="md">
            <StatLabel color="gray.400">Longest Stay</StatLabel>
            <StatNumber>{stats.longestStay.years} years</StatNumber>
            <StatHelpText>in {stats.longestStay.place}</StatHelpText>
          </Stat>
        )}
      </SimpleGrid>

      <Collapse in={ecoMode} animateOpacity>
        {ecoStats && ecoStats.treeCount > 0 && (
          <Box
            p={4}
            bg="gray.800"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="green.700"
          >
            <TreeGrid
              treeCount={ecoStats.treeCount}
              co2Kg={ecoStats.totalCO2Kg}
              compact={false}
            />
          </Box>
        )}
      </Collapse>
    </VStack>
  )
}
