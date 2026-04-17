import {
  VStack,
  HStack,
  Box,
  Text,
  Tooltip,
  Badge,
  IconButton,
  Spinner,
} from '@chakra-ui/react'
import { GeocodingErrorType } from '../hooks/useGeocoding'

function getErrorInfo(errorType) {
  switch (errorType) {
    case GeocodingErrorType.NO_MATCH:
      return { icon: '✗', color: 'red.400', label: 'No matching location found', canRetry: false }
    case GeocodingErrorType.RATE_LIMITED:
      return { icon: '⏱', color: 'orange.400', label: 'Rate limited - click to retry', canRetry: true }
    case GeocodingErrorType.TIMEOUT:
      return { icon: '⏱', color: 'orange.400', label: 'Request timed out - click to retry', canRetry: true }
    case GeocodingErrorType.NETWORK_ERROR:
      return { icon: '⚡', color: 'orange.400', label: 'Network error - click to retry', canRetry: true }
    default:
      // Unknown error type (or missing) - allow retry since we don't know the cause
      return { icon: '?', color: 'orange.400', label: 'Error - click to retry', canRetry: true }
  }
}

function ConfidenceIcon({ confidence, errorType, onRetry, isRetrying }) {
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

  // Failed state - show error type and retry if applicable
  const errorInfo = getErrorInfo(errorType)

  if (isRetrying) {
    return <Spinner size="sm" color="blue.400" />
  }

  if (errorInfo.canRetry && onRetry) {
    return (
      <Tooltip label={errorInfo.label}>
        <Text
          color={errorInfo.color}
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation()
            onRetry()
          }}
          _hover={{ opacity: 0.7 }}
        >
          {errorInfo.icon} ↻
        </Text>
      </Tooltip>
    )
  }

  return (
    <Tooltip label={errorInfo.label}>
      <Text color={errorInfo.color}>{errorInfo.icon}</Text>
    </Tooltip>
  )
}

export function PlaceList({ places, onPlaceClick, onRetryPlace, retryingPlaceId }) {
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
      {places.filter(p => p != null).map((place, index) => (
        <HStack
          key={place.id || index}
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
            {place.confidence === 'failed' && place.errorMessage && (
              <Text fontSize="xs" color="red.300">
                {place.errorMessage}
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
          <ConfidenceIcon
            confidence={place.confidence}
            errorType={place.errorType}
            onRetry={onRetryPlace ? () => onRetryPlace(place) : null}
            isRetrying={retryingPlaceId === place.id}
          />
        </HStack>
      ))}
    </VStack>
  )
}
