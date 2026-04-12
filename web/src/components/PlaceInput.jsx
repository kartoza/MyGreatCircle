import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Textarea,
  VStack,
  Text,
  Heading,
} from '@chakra-ui/react'

const PLACEHOLDER = `London, UK
Cape Town, South Africa 1990-1995
Sydney
Tokyo 2010-2015
New York`

const EXAMPLE_JOURNEYS = [
  `London, UK
Paris, France
Barcelona, Spain
Rome, Italy`,
  `New York, USA 1990-2000
San Francisco 2000-2010
Seattle 2010-2015
Portland 2015-2020`,
  `Cape Town, South Africa
Johannesburg
Nairobi, Kenya
Cairo, Egypt`,
]

export function PlaceInput({ onSubmit, isLoading, initialValue = '', embedded = false }) {
  const [inputText, setInputText] = useState(initialValue)

  useEffect(() => {
    if (initialValue) {
      setInputText(initialValue)
    }
  }, [initialValue])

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText)
    }
  }

  const handleTryExample = () => {
    const randomExample = EXAMPLE_JOURNEYS[Math.floor(Math.random() * EXAMPLE_JOURNEYS.length)]
    setInputText(randomExample)
  }

  const lineCount = inputText.split('\n').filter(l => l.trim()).length

  return (
    <VStack spacing={6} align="stretch">
      {!embedded && (
        <Box textAlign="center">
          <Heading
            size="xl"
            mb={2}
            bgGradient="linear(to-r, teal.300, cyan.400)"
            bgClip="text"
          >
            MyGreatCircle
          </Heading>
          <Text fontSize="lg" color="gray.400">
            Map the places that made you
          </Text>
        </Box>
      )}

      <Box>
        <Text mb={3} fontSize="sm" color="gray.400">
          Enter places you've lived or visited, one per line.
          Dates are optional — add them like "London 1990" or "Paris 2000-2005".
        </Text>
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER}
          size="lg"
          minH={embedded ? '300px' : '250px'}
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          _hover={{ borderColor: 'teal.500' }}
          _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px var(--chakra-colors-teal-400)' }}
          fontFamily="mono"
          fontSize="md"
          color="white"
          _placeholder={{ color: 'gray.500' }}
        />
        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" color="gray.500">
            {lineCount} {lineCount === 1 ? 'place' : 'places'} entered
          </Text>
          <Button
            size="xs"
            variant="ghost"
            colorScheme="teal"
            onClick={handleTryExample}
          >
            Try an example
          </Button>
        </Box>
      </Box>

      <Button
        bgGradient="linear(to-r, teal.400, cyan.500)"
        color="white"
        size="lg"
        onClick={handleSubmit}
        isLoading={isLoading}
        isDisabled={lineCount === 0}
        loadingText="Mapping your journey..."
        _hover={{
          bgGradient: 'linear(to-r, teal.500, cyan.600)',
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 40px -10px rgba(20, 184, 166, 0.5)',
        }}
        _active={{
          transform: 'translateY(0)',
        }}
      >
        Map My Journey →
      </Button>

      {embedded && (
        <Text fontSize="xs" color="gray.600" textAlign="center">
          Your data stays in your browser. Export anytime as JSON.
        </Text>
      )}
    </VStack>
  )
}
