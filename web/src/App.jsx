import { useState } from 'react'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

const APP_STATE = {
  INPUT: 'input',
  PREVIEW: 'preview',
  OUTPUT: 'output',
}

function App() {
  const [appState, setAppState] = useState(APP_STATE.INPUT)
  const [places, setPlaces] = useState([])
  const [theme, setTheme] = useState('minimal')

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading size="2xl" mb={2}>MyGreatCircle</Heading>
            <Text fontSize="lg" color="gray.400">
              Map the places that made you
            </Text>
          </Box>

          <Box p={6} bg="gray.800" borderRadius="lg">
            <Text>App state: {appState}</Text>
            <Text>Places: {places.length}</Text>
            <Text>Theme: {theme}</Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

export default App
