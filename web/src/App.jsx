import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Flex,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  useToast,
  Badge,
  Tooltip,
  Fade,
  ScaleFade,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
} from '@chakra-ui/react'

import { MapVisualization } from './components/MapVisualization'
import { ThemeSelector } from './components/ThemeSelector'
import { PlaceList } from './components/PlaceList'
import { InsightsPanel } from './components/InsightsPanel'
import { OutputCards } from './components/OutputCards'
import { Footer } from './components/Footer'
import { PlaceInput } from './components/PlaceInput'

import { useGeocoding } from './hooks/useGeocoding'
import { usePdfGeneration } from './hooks/usePdfGeneration'

import { parsePlaceInput } from './lib/parser'
import { computeJourneyStats } from './lib/geo'

// Demo journey to show on first load
const DEMO_PLACES = [
  { id: 'demo-1', name: 'London', coordinates: [-0.1276, 51.5074], confidence: 'high', geocodedName: 'London, UK' },
  { id: 'demo-2', name: 'Cape Town', coordinates: [18.4241, -33.9249], confidence: 'high', geocodedName: 'Cape Town, South Africa' },
  { id: 'demo-3', name: 'Sydney', coordinates: [151.2093, -33.8688], confidence: 'high', geocodedName: 'Sydney, Australia' },
  { id: 'demo-4', name: 'Tokyo', coordinates: [139.6917, 35.6895], confidence: 'high', geocodedName: 'Tokyo, Japan' },
  { id: 'demo-5', name: 'New York', coordinates: [-74.006, 40.7128], confidence: 'high', geocodedName: 'New York, USA' },
]

function App() {
  const [places, setPlaces] = useState([])
  const [theme, setTheme] = useState('minimal')
  const [inputText, setInputText] = useState('')
  const [showDemo, setShowDemo] = useState(true)
  const [showWelcome, setShowWelcome] = useState(true)
  const [mapDimensions, setMapDimensions] = useState({ width: 1200, height: 800 })

  const svgRef = useRef(null)
  const mapContainerRef = useRef(null)
  const fileInputRef = useRef(null)

  const { isOpen: isInputOpen, onOpen: onInputOpen, onClose: onInputClose } = useDisclosure()
  const { isOpen: isOutputOpen, onOpen: onOutputOpen, onClose: onOutputClose } = useDisclosure()
  const { isOpen: isPlacesOpen, onOpen: onPlacesOpen, onClose: onPlacesClose } = useDisclosure()

  const toast = useToast()
  const { geocodePlaces, isLoading: isGeocoding } = useGeocoding()
  const { generateFactSheet, generatePoster, isGenerating } = usePdfGeneration()

  const displayPlaces = showDemo && places.length === 0 ? DEMO_PLACES : places
  const stats = useMemo(() => computeJourneyStats(displayPlaces), [displayPlaces])

  // Responsive map sizing
  useEffect(() => {
    const updateDimensions = () => {
      setMapDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (places.length > 0) {
      localStorage.setItem('mygreatcircle-journey', JSON.stringify({
        places,
        theme,
        inputText,
        savedAt: new Date().toISOString(),
      }))
    }
  }, [places, theme, inputText])

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mygreatcircle-journey')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.places && data.places.length > 0) {
          setPlaces(data.places)
          setTheme(data.theme || 'minimal')
          setInputText(data.inputText || '')
          setShowDemo(false)
          setShowWelcome(false)
          toast({
            title: 'Welcome back!',
            description: `Restored your journey with ${data.places.length} places.`,
            status: 'success',
            duration: 3000,
          })
        }
      } catch (e) {
        console.error('Failed to restore journey:', e)
      }
    }
  }, [])

  const handleInputSubmit = async (text) => {
    setInputText(text)
    const parsed = parsePlaceInput(text)
    try {
      const geocoded = await geocodePlaces(parsed)
      setPlaces(geocoded)
      setShowDemo(false)
      setShowWelcome(false)
      onInputClose()
      toast({
        title: 'Journey mapped!',
        description: `Found ${geocoded.filter(p => p.coordinates).length} of ${geocoded.length} places.`,
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Geocoding failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    }
  }

  const handleDownloadFactSheet = async () => {
    await generateFactSheet(svgRef.current, displayPlaces, stats, theme)
  }

  const handleDownloadPoster = async () => {
    await generatePoster(svgRef.current, displayPlaces, theme)
  }

  const handleExportJSON = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      theme,
      places: places.map(p => ({
        name: p.name,
        rawInput: p.rawInput,
        yearStart: p.yearStart,
        yearEnd: p.yearEnd,
        coordinates: p.coordinates,
        geocodedName: p.geocodedName,
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-journey.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Journey exported!',
      description: 'Your journey has been saved as JSON.',
      status: 'success',
      duration: 3000,
    })
  }

  const handleImportJSON = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.places && Array.isArray(data.places)) {
          // Restore with IDs
          const restoredPlaces = data.places.map((p, i) => ({
            ...p,
            id: p.id || `imported-${i}`,
            confidence: p.confidence || 'high',
          }))
          setPlaces(restoredPlaces)
          setTheme(data.theme || 'minimal')
          setShowDemo(false)
          setShowWelcome(false)
          toast({
            title: 'Journey imported!',
            description: `Loaded ${restoredPlaces.length} places.`,
            status: 'success',
            duration: 3000,
          })
        }
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Invalid JSON file.',
          status: 'error',
          duration: 5000,
        })
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset for re-import
  }

  const handleStartOver = () => {
    if (places.length > 0 && !window.confirm('Start over? Your current journey will be cleared.')) {
      return
    }
    setPlaces([])
    setInputText('')
    setShowDemo(true)
    setShowWelcome(true)
    localStorage.removeItem('mygreatcircle-journey')
  }

  const handleStartJourney = () => {
    setShowWelcome(false)
    onInputOpen()
  }

  return (
    <Box position="relative" w="100vw" h="100vh" overflow="hidden">
      {/* FULL-SCREEN MAP - THE HERO */}
      <Box
        ref={mapContainerRef}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
      >
        <MapVisualization
          places={displayPlaces}
          theme={theme}
          width={mapDimensions.width}
          height={mapDimensions.height}
          svgRef={svgRef}
        />
      </Box>

      {/* TOP BAR - Floating controls */}
      <Flex
        position="absolute"
        top={4}
        left={4}
        right={4}
        zIndex={10}
        justify="space-between"
        align="center"
        pointerEvents="none"
      >
        {/* Logo/Title */}
        <HStack
          bg="blackAlpha.700"
          backdropFilter="blur(10px)"
          px={4}
          py={2}
          borderRadius="full"
          pointerEvents="auto"
        >
          <Heading size="md" bgGradient="linear(to-r, teal.300, cyan.400)" bgClip="text">
            MyGreatCircle
          </Heading>
          {!showDemo && places.length > 0 && (
            <Badge colorScheme="teal" variant="subtle">
              {places.length} places
            </Badge>
          )}
        </HStack>

        {/* Theme selector */}
        <Box
          bg="blackAlpha.700"
          backdropFilter="blur(10px)"
          px={4}
          py={2}
          borderRadius="full"
          pointerEvents="auto"
        >
          <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
        </Box>

        {/* Action buttons */}
        <HStack
          bg="blackAlpha.700"
          backdropFilter="blur(10px)"
          px={4}
          py={2}
          borderRadius="full"
          spacing={2}
          pointerEvents="auto"
        >
          <Tooltip label="Enter your places">
            <Button
              size="sm"
              variant="ghost"
              colorScheme="teal"
              onClick={onInputOpen}
            >
              Edit Journey
            </Button>
          </Tooltip>
          {places.length > 0 && (
            <>
              <Tooltip label="View place list">
                <Button size="sm" variant="ghost" colorScheme="teal" onClick={onPlacesOpen}>
                  Places
                </Button>
              </Tooltip>
              <Tooltip label="Download PDFs">
                <Button size="sm" colorScheme="teal" onClick={onOutputOpen}>
                  Download
                </Button>
              </Tooltip>
            </>
          )}
        </HStack>
      </Flex>

      {/* WELCOME OVERLAY - First time visitors */}
      {showWelcome && (
        <Fade in={showWelcome}>
          <Flex
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={20}
            bg="blackAlpha.800"
            backdropFilter="blur(8px)"
            align="center"
            justify="center"
          >
            <ScaleFade in={showWelcome} initialScale={0.9}>
              <VStack
                spacing={8}
                maxW="600px"
                textAlign="center"
                p={8}
              >
                <Heading
                  size="3xl"
                  bgGradient="linear(to-r, teal.300, cyan.400, blue.400)"
                  bgClip="text"
                  fontWeight="extrabold"
                >
                  MyGreatCircle
                </Heading>
                <Text fontSize="xl" color="gray.300">
                  Transform the places that shaped your life into a stunning visualization.
                  Watch your journey unfold as luminous arcs across the globe.
                </Text>
                <Text fontSize="md" color="gray.500">
                  Currently showing a demo journey. Enter your own places to see your story.
                </Text>
                <HStack spacing={4}>
                  <Button
                    size="lg"
                    bgGradient="linear(to-r, teal.400, cyan.500)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(to-r, teal.500, cyan.600)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 10px 40px -10px rgba(20, 184, 166, 0.5)',
                    }}
                    onClick={handleStartJourney}
                  >
                    Start Your Journey
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    colorScheme="teal"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Import Journey
                  </Button>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  No account needed. Your data stays in your browser.
                </Text>
              </VStack>
            </ScaleFade>
          </Flex>
        </Fade>
      )}

      {/* BOTTOM BAR - Stats & branding */}
      {!showWelcome && (
        <Flex
          position="absolute"
          bottom={4}
          left={4}
          right={4}
          zIndex={10}
          justify="space-between"
          align="flex-end"
          pointerEvents="none"
        >
          {/* Stats panel */}
          <Box
            bg="blackAlpha.700"
            backdropFilter="blur(10px)"
            px={6}
            py={4}
            borderRadius="xl"
            pointerEvents="auto"
            maxW="500px"
          >
            <InsightsPanel stats={stats} compact />
          </Box>

          {/* Action buttons */}
          <HStack
            bg="blackAlpha.700"
            backdropFilter="blur(10px)"
            px={4}
            py={2}
            borderRadius="full"
            spacing={2}
            pointerEvents="auto"
          >
            {places.length > 0 && (
              <>
                <Tooltip label="Export as JSON">
                  <Button size="sm" variant="ghost" colorScheme="teal" onClick={handleExportJSON}>
                    Export
                  </Button>
                </Tooltip>
                <Tooltip label="Start over">
                  <Button size="sm" variant="ghost" colorScheme="red" onClick={handleStartOver}>
                    Clear
                  </Button>
                </Tooltip>
              </>
            )}
          </HStack>

          {/* Branding */}
          <Box
            bg="blackAlpha.700"
            backdropFilter="blur(10px)"
            px={4}
            py={2}
            borderRadius="full"
            pointerEvents="auto"
          >
            <Footer compact />
          </Box>
        </Flex>
      )}

      {/* INPUT DRAWER */}
      <Drawer isOpen={isInputOpen} placement="left" onClose={onInputClose} size="md">
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DrawerContent bg="gray.900" borderRightRadius="xl">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            <Heading size="md" bgGradient="linear(to-r, teal.300, cyan.400)" bgClip="text">
              Your Places
            </Heading>
          </DrawerHeader>
          <DrawerBody py={6}>
            <PlaceInput
              onSubmit={handleInputSubmit}
              isLoading={isGeocoding}
              initialValue={inputText}
              embedded
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* PLACES LIST DRAWER */}
      <Drawer isOpen={isPlacesOpen} placement="right" onClose={onPlacesClose} size="sm">
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DrawerContent bg="gray.900" borderLeftRadius="xl">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            Place List
          </DrawerHeader>
          <DrawerBody py={4}>
            <PlaceList places={places} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* OUTPUT MODAL */}
      <Modal isOpen={isOutputOpen} onClose={onOutputClose} size="xl" isCentered>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <ModalContent bg="gray.900" borderRadius="xl" mx={4}>
          <ModalHeader>
            <Heading size="md" bgGradient="linear(to-r, teal.300, cyan.400)" bgClip="text">
              Download Your Journey
            </Heading>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <OutputCards
              onDownloadFactSheet={handleDownloadFactSheet}
              onDownloadPoster={handleDownloadPoster}
              isGenerating={isGenerating}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportJSON}
      />
    </Box>
  )
}

export default App
