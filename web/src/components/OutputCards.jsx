import { useState } from 'react'
import {
  SimpleGrid,
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Progress,
  useToast,
  HStack,
} from '@chakra-ui/react'
import { MerchProductBrowser } from './MerchProductBrowser'
import { useGelato } from '../hooks/useGelato'

/**
 * Maps our display categories to Gelato product categories
 */
const SHOP_SECTIONS = {
  apparel: {
    name: 'Apparel',
    icon: '👕',
    description: 'T-shirts, hoodies & sweatshirts',
    color: 'orange',
    categories: ['apparel'],
  },
  print: {
    name: 'Print',
    icon: '🖼️',
    description: 'Posters, canvas & framed prints',
    color: 'pink',
    categories: ['wall-art'],
  },
  swag: {
    name: 'Swag',
    icon: '🎁',
    description: 'Mugs, bags, phone cases & more',
    color: 'yellow',
    categories: ['accessories', 'phone-cases', 'home', 'stationery'],
  },
}

export function OutputCards({
  onDownloadFactSheet,
  onDownloadPoster,
  onDownloadGif,
  onGenerateMerchImage,
  isGenerating,
  isGeneratingGif,
  gifProgress,
}) {
  const [activeSection, setActiveSection] = useState(null)
  const [journeyImageDataUrl, setJourneyImageDataUrl] = useState(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const { createCheckout } = useGelato()
  const toast = useToast()

  const handleShopClick = async (sectionKey) => {
    if (activeSection === sectionKey) {
      setActiveSection(null)
      return
    }
    setActiveSection(sectionKey)

    // Generate journey image for mockup previews if not already done
    if (!journeyImageDataUrl && onGenerateMerchImage) {
      try {
        const imageUrl = await onGenerateMerchImage()
        setJourneyImageDataUrl(imageUrl)
      } catch (err) {
        console.error('Failed to generate journey image for previews:', err)
      }
    }
  }

  const handleSelectProduct = async (product) => {
    setIsCheckingOut(true)
    try {
      await createCheckout(
        product.id,
        product.variants?.[0]?.id || '',
        journeyImageDataUrl || '',
      )
    } catch (error) {
      toast({
        title: 'Checkout unavailable',
        description: 'Merchandise ordering is coming soon. Stay tuned!',
        status: 'info',
        duration: 5000,
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <>
      {/* Free Downloads Row */}
      <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={4}>
        Free Downloads
      </Text>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        {/* Fact Sheet */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.600"
          transition="all 0.2s"
          display="flex"
          flexDirection="column"
          _hover={{
            borderColor: 'gray.500',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <VStack spacing={4} align="stretch" flex="1">
            <Box textAlign="center">
              <Heading size="md">Fact Sheet</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A4 PDF with map, stats & places
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Box flex="1" />
            <Button
              colorScheme="brand"
              onClick={onDownloadFactSheet}
              isLoading={isGenerating}
              loadingText="Generating..."
              width="100%"
              px={8}
              py={6}
              fontSize="sm"
            >
              Download PDF
            </Button>
          </VStack>
        </Box>

        {/* Poster */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.600"
          transition="all 0.2s"
          display="flex"
          flexDirection="column"
          _hover={{
            borderColor: 'gray.500',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <VStack spacing={4} align="stretch" flex="1">
            <Box textAlign="center">
              <Heading size="md">Poster</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A3 landscape, print-ready
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Box flex="1" />
            <Button
              colorScheme="brand"
              onClick={onDownloadPoster}
              isLoading={isGenerating}
              loadingText="Generating..."
              width="100%"
              px={8}
              py={6}
              fontSize="sm"
            >
              Download PDF
            </Button>
          </VStack>
        </Box>

        {/* Animated GIF */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="purple.500"
          transition="all 0.2s"
          display="flex"
          flexDirection="column"
          _hover={{
            borderColor: 'purple.400',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <VStack spacing={4} align="stretch" flex="1">
            <Box textAlign="center">
              <Heading size="md">Animated GIF</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Watch your journey unfold
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Box flex="1" />
            {isGeneratingGif && (
              <Box>
                <Progress
                  value={gifProgress}
                  size="sm"
                  colorScheme="purple"
                  borderRadius="full"
                  mb={2}
                />
                <Text fontSize="xs" color="gray.400" textAlign="center">
                  {gifProgress}% complete
                </Text>
              </Box>
            )}
            <Button
              colorScheme="purple"
              onClick={onDownloadGif}
              isLoading={isGeneratingGif}
              loadingText="Rendering..."
              width="100%"
              px={8}
              py={6}
              fontSize="sm"
            >
              Download GIF
            </Button>
          </VStack>
        </Box>
      </SimpleGrid>

      {/* Shop Row */}
      <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={4}>
        Get It Printed
      </Text>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={activeSection ? 6 : 0}>
        {Object.entries(SHOP_SECTIONS).map(([key, section]) => (
          <Box
            key={key}
            bg={activeSection === key ? `${section.color}.900` : 'gray.700'}
            p={6}
            borderRadius="lg"
            border="2px solid"
            borderColor={activeSection === key ? `${section.color}.400` : `${section.color}.500`}
            position="relative"
            overflow="hidden"
            transition="all 0.2s"
            display="flex"
            flexDirection="column"
            cursor="pointer"
            onClick={() => handleShopClick(key)}
            _hover={{
              borderColor: `${section.color}.400`,
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
          >
            <VStack spacing={4} align="stretch" flex="1">
              <Box textAlign="center">
                <Text fontSize="3xl" mb={2}>{section.icon}</Text>
                <Heading size="md">{section.name}</Heading>
                <Text fontSize="sm" color="gray.400" mt={1}>
                  {section.description}
                </Text>
              </Box>
              <Box flex="1" />
              <Button
                colorScheme={section.color}
                variant={activeSection === key ? 'solid' : 'outline'}
                width="100%"
                px={8}
                py={6}
                fontSize="sm"
              >
                {activeSection === key ? 'Browsing...' : 'Browse'}
              </Button>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Expanded product browser for active section */}
      {activeSection && (
        <Box
          bg="gray.800"
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.600"
          p={6}
        >
          <HStack justify="space-between" mb={4}>
            <Heading size="md">
              {SHOP_SECTIONS[activeSection].icon} {SHOP_SECTIONS[activeSection].name}
            </Heading>
            <Button
              size="sm"
              variant="ghost"
              colorScheme="gray"
              onClick={() => setActiveSection(null)}
            >
              Close
            </Button>
          </HStack>
          <MerchProductBrowser
            onSelectProduct={handleSelectProduct}
            isDisabled={isCheckingOut}
            filterCategories={SHOP_SECTIONS[activeSection].categories}
            journeyImageDataUrl={journeyImageDataUrl}
          />
        </Box>
      )}
    </>
  )
}
