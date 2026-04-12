import { useState, useRef, useMemo } from 'react'
import {
  Box,
  Container,
  VStack,
  Button,
  Heading,
  Flex,
  Spacer,
} from '@chakra-ui/react'

import { PlaceInput } from './components/PlaceInput'
import { MapVisualization } from './components/MapVisualization'
import { ThemeSelector } from './components/ThemeSelector'
import { PlaceList } from './components/PlaceList'
import { InsightsPanel } from './components/InsightsPanel'
import { OutputCards } from './components/OutputCards'
import { Footer } from './components/Footer'

import { useGeocoding } from './hooks/useGeocoding'
import { usePdfGeneration } from './hooks/usePdfGeneration'

import { parsePlaceInput } from './lib/parser'
import { computeJourneyStats } from './lib/geo'

const APP_STATE = {
  INPUT: 'input',
  PREVIEW: 'preview',
  OUTPUT: 'output',
}

function App() {
  const [appState, setAppState] = useState(APP_STATE.INPUT)
  const [places, setPlaces] = useState([])
  const [theme, setTheme] = useState('minimal')
  const [inputText, setInputText] = useState('')

  const svgRef = useRef(null)

  const { geocodePlaces, isLoading: isGeocoding } = useGeocoding()
  const { generateFactSheet, generatePoster, isGenerating } = usePdfGeneration()

  const stats = useMemo(() => computeJourneyStats(places), [places])

  const handleInputSubmit = async (text) => {
    setInputText(text)
    const parsed = parsePlaceInput(text)
    const geocoded = await geocodePlaces(parsed)
    setPlaces(geocoded)
    setAppState(APP_STATE.PREVIEW)
  }

  const handleBack = () => {
    if (appState === APP_STATE.OUTPUT) {
      setAppState(APP_STATE.PREVIEW)
    } else {
      setAppState(APP_STATE.INPUT)
    }
  }

  const handleGenerateOutputs = () => {
    setAppState(APP_STATE.OUTPUT)
  }

  const handleDownloadFactSheet = async () => {
    await generateFactSheet(svgRef.current, places, stats, theme)
  }

  const handleDownloadPoster = async () => {
    await generatePoster(svgRef.current, places, theme)
  }

  const handleStartOver = () => {
    setPlaces([])
    setInputText('')
    setAppState(APP_STATE.INPUT)
  }

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">

          {/* INPUT STATE */}
          {appState === APP_STATE.INPUT && (
            <PlaceInput
              onSubmit={handleInputSubmit}
              isLoading={isGeocoding}
            />
          )}

          {/* PREVIEW STATE */}
          {appState === APP_STATE.PREVIEW && (
            <>
              <Flex align="center" wrap="wrap" gap={4}>
                <Button variant="ghost" onClick={handleBack}>
                  ← Back
                </Button>
                <Spacer />
                <ThemeSelector
                  currentTheme={theme}
                  onThemeChange={setTheme}
                />
                <Spacer />
                <Button
                  colorScheme="brand"
                  onClick={handleGenerateOutputs}
                >
                  Generate Outputs →
                </Button>
              </Flex>

              <Flex
                direction={{ base: 'column', lg: 'row' }}
                gap={6}
              >
                <Box flex={1}>
                  <MapVisualization
                    places={places}
                    theme={theme}
                    width={800}
                    height={450}
                    svgRef={svgRef}
                  />
                </Box>
                <Box w={{ base: '100%', lg: '280px' }}>
                  <PlaceList places={places} />
                </Box>
              </Flex>

              <InsightsPanel stats={stats} />
            </>
          )}

          {/* OUTPUT STATE */}
          {appState === APP_STATE.OUTPUT && (
            <>
              <Flex align="center" wrap="wrap" gap={4}>
                <Button variant="ghost" onClick={handleBack}>
                  ← Change Theme
                </Button>
                <Spacer />
                <Heading size="lg">Your Journey</Heading>
                <Spacer />
                <Button variant="ghost" onClick={handleStartOver}>
                  Start Over
                </Button>
              </Flex>

              <Box>
                <MapVisualization
                  places={places}
                  theme={theme}
                  width={800}
                  height={400}
                  svgRef={svgRef}
                />
              </Box>

              <InsightsPanel stats={stats} />

              <OutputCards
                onDownloadFactSheet={handleDownloadFactSheet}
                onDownloadPoster={handleDownloadPoster}
                isGenerating={isGenerating}
              />
            </>
          )}

          <Footer />
        </VStack>
      </Container>
    </Box>
  )
}

export default App
