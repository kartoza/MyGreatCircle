import { Box, HStack, Link, Text } from '@chakra-ui/react'

export function Footer() {
  return (
    <Box
      py={6}
      textAlign="center"
      borderTop="1px solid"
      borderColor="gray.700"
      mt={8}
    >
      <HStack spacing={2} justify="center" wrap="wrap">
        <Text color="gray.400">Made with 💗 by</Text>
        <Link
          href="https://kartoza.com"
          isExternal
          color="brand.400"
          _hover={{ color: 'brand.300' }}
        >
          Kartoza
        </Link>
        <Text color="gray.600">|</Text>
        <Link
          href="https://github.com/sponsors/kartoza"
          isExternal
          color="brand.400"
          _hover={{ color: 'brand.300' }}
        >
          Donate!
        </Link>
        <Text color="gray.600">|</Text>
        <Link
          href="https://github.com/kartoza/MyGreatCircle"
          isExternal
          color="brand.400"
          _hover={{ color: 'brand.300' }}
        >
          GitHub
        </Link>
      </HStack>
    </Box>
  )
}
