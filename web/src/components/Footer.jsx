import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react'

export function Footer({ compact = false }) {
  if (compact) {
    return (
      <VStack spacing={1} fontSize="xs" align="center">
        <HStack spacing={2}>
          <Text color="gray.400">Made with</Text>
          <Text color="red.400">♥</Text>
          <Text color="gray.400">by</Text>
          <Link
            href="https://kartoza.com"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            Kartoza
          </Link>
        </HStack>
        <HStack spacing={1}>
          <Text color="gray.500" fontSize="2xs">Geocoding by</Text>
          <Link
            href="https://nominatim.org"
            isExternal
            color="gray.500"
            fontSize="2xs"
            _hover={{ color: 'gray.400' }}
          >
            Nominatim
          </Link>
          <Text color="gray.500" fontSize="2xs">·</Text>
          <Link
            href="https://www.openstreetmap.org/copyright"
            isExternal
            color="gray.500"
            fontSize="2xs"
            _hover={{ color: 'gray.400' }}
          >
            © OpenStreetMap
          </Link>
        </HStack>
      </VStack>
    )
  }

  return (
    <Box
      py={6}
      textAlign="center"
      borderTop="1px solid"
      borderColor="gray.700"
      mt={8}
    >
      <VStack spacing={2}>
        <HStack spacing={2} justify="center" wrap="wrap">
          <Text color="gray.400">Made with</Text>
          <Text color="red.400">💗</Text>
          <Text color="gray.400">by</Text>
          <Link
            href="https://kartoza.com"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            Kartoza
          </Link>
          <Text color="gray.600">|</Text>
          <Link
            href="https://github.com/sponsors/kartoza"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            Donate!
          </Link>
          <Text color="gray.600">|</Text>
          <Link
            href="https://github.com/kartoza/MyGreatCircle"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            GitHub
          </Link>
        </HStack>
        <HStack spacing={2} justify="center" fontSize="xs">
          <Text color="gray.500">Geocoding by</Text>
          <Link
            href="https://nominatim.org"
            isExternal
            color="gray.500"
            _hover={{ color: 'gray.400' }}
          >
            Nominatim
          </Link>
          <Text color="gray.500">· Map data</Text>
          <Link
            href="https://www.openstreetmap.org/copyright"
            isExternal
            color="gray.500"
            _hover={{ color: 'gray.400' }}
          >
            © OpenStreetMap contributors
          </Link>
        </HStack>
      </VStack>
    </Box>
  )
}
