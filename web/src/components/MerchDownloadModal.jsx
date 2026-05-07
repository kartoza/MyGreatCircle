import { useState, useEffect, useRef } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Box,
  Text,
  Button,
  SimpleGrid,
  Spinner,
  Divider,
  Link,
  useToast,
} from '@chakra-ui/react'

/**
 * Export presets for different merchandise products
 */
export const EXPORT_PRESETS = {
  standard: { width: 2400, height: 2400, name: 'journey-map-square', label: 'Standard Square', description: 'Best for most products' },
  tshirt: { width: 4500, height: 5400, name: 'journey-map-tshirt', label: 'T-Shirt', description: 'Portrait format for apparel' },
  poster: { width: 3600, height: 4800, name: 'journey-map-poster', label: 'Poster', description: 'High-res portrait print' },
  mug: { width: 2700, height: 1100, name: 'journey-map-mug', label: 'Mug Wrap', description: 'Wide format for mugs' },
}

/**
 * Marketplace links for print-on-demand services
 */
const MARKETPLACES = [
  {
    name: 'Redbubble',
    url: 'https://www.redbubble.com/portfolio/images/new',
    description: 'T-shirts, stickers, phone cases, and more',
    icon: '🎨',
  },
  {
    name: 'Society6',
    url: 'https://society6.com/studio/upload',
    description: 'Art prints, home decor, apparel',
    icon: '🖼️',
  },
  {
    name: 'Zazzle',
    url: 'https://www.zazzle.com/sell/designers',
    description: 'Custom products with design tools',
    icon: '✨',
  },
  {
    name: 'Fine Art America',
    url: 'https://fineartamerica.com/sellyourart',
    description: 'Gallery-quality prints and canvas',
    icon: '🎭',
  },
]

export function MerchDownloadModal({
  isOpen,
  onClose,
  generateImage,
  places,
  theme,
}) {
  const toast = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [downloadingPreset, setDownloadingPreset] = useState(null)
  const canvasRef = useRef(null)

  // Generate preview when modal opens
  useEffect(() => {
    if (isOpen && places?.length >= 2) {
      generatePreview()
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [isOpen, places, theme])

  const generatePreview = async () => {
    setIsGenerating(true)
    try {
      const { dataUrl } = await generateImage(places, theme, {
        width: 600,
        height: 600,
        padding: 25,
      })
      setPreviewUrl(dataUrl)
    } catch (error) {
      console.error('Preview generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (presetKey) => {
    const preset = EXPORT_PRESETS[presetKey]
    setDownloadingPreset(presetKey)

    try {
      const { dataUrl } = await generateImage(places, theme, {
        width: preset.width,
        height: preset.height,
        padding: Math.round(preset.width * 0.04),
      })

      // Create download link
      const link = document.createElement('a')
      link.download = `${preset.name}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Download started',
        description: `${preset.label} image (${preset.width}x${preset.height}px)`,
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    } finally {
      setDownloadingPreset(null)
    }
  }

  const handleMarketplaceClick = (marketplace) => {
    window.open(marketplace.url, '_blank', 'noopener,noreferrer')
    toast({
      title: `Opening ${marketplace.name}`,
      description: 'Upload your downloaded image to create products',
      status: 'info',
      duration: 3000,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg="gray.800" maxW="600px">
        <ModalHeader>Download for Print-on-Demand</ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Preview Section */}
            <Box>
              <Text fontSize="sm" color="gray.400" mb={2}>
                Preview
              </Text>
              <Box
                bg="gray.900"
                borderRadius="lg"
                p={4}
                display="flex"
                justifyContent="center"
                alignItems="center"
                minH="200px"
              >
                {isGenerating ? (
                  <VStack>
                    <Spinner size="lg" color="brand.500" />
                    <Text fontSize="sm" color="gray.400">
                      Generating preview...
                    </Text>
                  </VStack>
                ) : previewUrl ? (
                  <Box
                    as="img"
                    src={previewUrl}
                    alt="Journey map preview"
                    maxH="200px"
                    borderRadius="md"
                    boxShadow="lg"
                  />
                ) : (
                  <Text color="gray.500">Unable to generate preview</Text>
                )}
              </Box>
            </Box>

            <Divider borderColor="gray.600" />

            {/* Download Options */}
            <Box>
              <Text fontSize="sm" color="gray.400" mb={3}>
                Download High-Resolution Images
              </Text>
              <SimpleGrid columns={2} spacing={3}>
                {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    colorScheme="brand"
                    size="sm"
                    height="auto"
                    py={3}
                    px={4}
                    isLoading={downloadingPreset === key}
                    loadingText="Generating..."
                    onClick={() => handleDownload(key)}
                    _hover={{ bg: 'gray.700' }}
                  >
                    <VStack spacing={0} align="start" w="100%">
                      <Text fontWeight="bold">{preset.label}</Text>
                      <Text fontSize="xs" color="gray.400">
                        {preset.width}x{preset.height}px
                      </Text>
                    </VStack>
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            <Divider borderColor="gray.600" />

            {/* Marketplace Links */}
            <Box>
              <Text fontSize="sm" color="gray.400" mb={3}>
                Upload to Print-on-Demand Marketplaces
              </Text>
              <VStack spacing={2} align="stretch">
                {MARKETPLACES.map((marketplace) => (
                  <Button
                    key={marketplace.name}
                    variant="ghost"
                    justifyContent="flex-start"
                    height="auto"
                    py={3}
                    px={4}
                    onClick={() => handleMarketplaceClick(marketplace)}
                    _hover={{ bg: 'gray.700' }}
                  >
                    <HStack spacing={3} w="100%">
                      <Text fontSize="xl">{marketplace.icon}</Text>
                      <VStack spacing={0} align="start" flex={1}>
                        <HStack>
                          <Text fontWeight="bold">{marketplace.name}</Text>
                          <Text fontSize="xs" color="gray.500">↗</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">
                          {marketplace.description}
                        </Text>
                      </VStack>
                    </HStack>
                  </Button>
                ))}
              </VStack>
            </Box>

            {/* Instructions */}
            <Box bg="gray.700" p={4} borderRadius="lg">
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                How it works
              </Text>
              <VStack spacing={1} align="start">
                <Text fontSize="xs" color="gray.300">
                  1. Download the image size that matches your product
                </Text>
                <Text fontSize="xs" color="gray.300">
                  2. Click a marketplace link to open their upload page
                </Text>
                <Text fontSize="xs" color="gray.300">
                  3. Upload your image and choose your products
                </Text>
                <Text fontSize="xs" color="gray.300">
                  4. Set your prices and start selling (or order for yourself!)
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
