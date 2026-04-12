import { useState } from 'react'
import {
  Box,
  Button,
  Textarea,
  VStack,
  Text,
  Heading,
} from '@chakra-ui/react'

const PLACEHOLDER = `Enter places you've lived or visited, one per line:

London, UK
Cape Town, South Africa 1990-1995
Sydney
Meadowridge, Cape Town`

export function PlaceInput({ onSubmit, isLoading }) {
  const [inputText, setInputText] = useState('')

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText)
    }
  }

  const lineCount = inputText.split('\n').filter(l => l.trim()).length

  return (
    <VStack spacing={6} align="stretch" maxW="600px" mx="auto">
      <Box textAlign="center">
        <Heading size="xl" mb={2}>MyGreatCircle</Heading>
        <Text fontSize="lg" color="gray.400">
          Map the places that made you
        </Text>
      </Box>

      <Box>
        <Text mb={2} fontSize="sm" color="gray.400">
          Enter places you've lived or visited, one per line.
          Years are optional (e.g., "London 1990" or "Paris 2000-2005").
        </Text>
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER}
          size="lg"
          minH="250px"
          bg="gray.800"
          border="1px solid"
          borderColor="gray.600"
          _hover={{ borderColor: 'gray.500' }}
          _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
          fontFamily="mono"
          fontSize="md"
        />
        <Text mt={2} fontSize="sm" color="gray.500">
          {lineCount} {lineCount === 1 ? 'place' : 'places'} entered
        </Text>
      </Box>

      <Button
        colorScheme="brand"
        size="lg"
        onClick={handleSubmit}
        isLoading={isLoading}
        isDisabled={lineCount === 0}
        loadingText="Finding your places..."
      >
        Show My Journey →
      </Button>
    </VStack>
  )
}
