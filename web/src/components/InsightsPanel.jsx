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
} from '@chakra-ui/react'

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

export function InsightsPanel({ stats, compact = false }) {
  if (!stats || stats.totalPlaces === 0) {
    return null
  }

  // Compact mode for overlay
  if (compact) {
    return (
      <HStack spacing={8} justify="center">
        <CompactStat label="Places" value={stats.totalPlaces} />
        <CompactStat label="Countries" value={stats.countries.length} />
        <CompactStat label="Distance" value={formatDistance(stats.totalDistanceKm)} />
        {stats.longestLegKm > 0 && (
          <CompactStat label="Longest Move" value={formatDistance(stats.longestLegKm)} />
        )}
      </HStack>
    )
  }

  // Full mode
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
      <Stat bg="gray.700" p={4} borderRadius="md">
        <StatLabel color="gray.400">Places</StatLabel>
        <StatNumber>{stats.totalPlaces}</StatNumber>
        <StatHelpText>called home</StatHelpText>
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
  )
}
