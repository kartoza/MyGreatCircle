import { Box, HStack, Link, Text } from '@chakra-ui/react'

export function Footer({ compact = false }) {
  if (compact) {
    return (
      <HStack spacing={2} fontSize="xs">
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
    </Box>
  )
}
