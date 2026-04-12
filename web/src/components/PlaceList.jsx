import {
  VStack,
  HStack,
  Box,
  Text,
  Tooltip,
  Badge,
} from '@chakra-ui/react'

function ConfidenceIcon({ confidence }) {
  if (confidence === 'high') {
    return (
      <Tooltip label="Location confirmed">
        <Text color="green.400">✓</Text>
      </Tooltip>
    )
  }
  if (confidence === 'low') {
    return (
      <Tooltip label="Location uncertain - click to see alternatives">
        <Text color="yellow.400" cursor="pointer">⚠</Text>
      </Tooltip>
    )
  }
  return (
    <Tooltip label="Could not find location">
      <Text color="red.400">✗</Text>
    </Tooltip>
  )
}

export function PlaceList({ places, onPlaceClick }) {
  if (!places || places.length === 0) {
    return (
      <Box p={4} bg="gray.800" borderRadius="md">
        <Text color="gray.400" textAlign="center">
          No places entered yet
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing={2} align="stretch">
      <Text fontSize="sm" fontWeight="bold" color="gray.400" mb={1}>
        Your Places ({places.length})
      </Text>
      {places.map((place, index) => (
        <HStack
          key={place.id}
          p={3}
          bg="gray.800"
          borderRadius="md"
          cursor={place.alternatives?.length > 0 ? 'pointer' : 'default'}
          _hover={{ bg: 'gray.700' }}
          onClick={() => onPlaceClick && onPlaceClick(place)}
        >
          <Text color="gray.500" fontSize="sm" w="20px">
            {index + 1}.
          </Text>
          <Box flex={1}>
            <Text fontWeight="medium">{place.name}</Text>
            {place.geocodedName && place.geocodedName !== place.name && (
              <Text fontSize="xs" color="gray.400">
                {place.geocodedName}
              </Text>
            )}
          </Box>
          {place.yearStart && (
            <Badge colorScheme="purple" variant="subtle">
              {place.yearEnd
                ? `${place.yearStart}-${place.yearEnd}`
                : place.yearStart}
            </Badge>
          )}
          <ConfidenceIcon confidence={place.confidence} />
        </HStack>
      ))}
    </VStack>
  )
}
