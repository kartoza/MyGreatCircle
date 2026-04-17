import {
  SimpleGrid,
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Progress,
  Divider,
  useDisclosure,
} from '@chakra-ui/react'
import { EmailModal } from './EmailModal'

export function OutputCards({
  onDownloadFactSheet,
  onDownloadPoster,
  onDownloadGif,
  isGenerating,
  isGeneratingGif,
  gifProgress,
}) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleMerchClick = (item) => {
    // Open email modal to capture interest
    onOpen()
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

      {/* Merchandise Row */}
      <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={4}>
        Get It Printed
      </Text>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {/* T-Shirt */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="orange.500"
          position="relative"
          overflow="hidden"
          transition="all 0.2s"
          display="flex"
          flexDirection="column"
          _hover={{
            borderColor: 'orange.400',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="orange.500"
            px={2}
            py={0.5}
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
          >
            COMING SOON
          </Box>
          <VStack spacing={4} align="stretch" flex="1">
            <Box textAlign="center">
              <Text fontSize="3xl" mb={2}>👕</Text>
              <Heading size="md">T-Shirt</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Wear your journey with pride
              </Text>
            </Box>
            <Text fontSize="sm" color="orange.400" textAlign="center">
              From $29
            </Text>
            <Box flex="1" />
            <Button
              variant="outline"
              colorScheme="orange"
              onClick={() => handleMerchClick('tshirt')}
              width="100%"
              px={8}
              py={6}
              fontSize="sm"
            >
              Get Notified
            </Button>
          </VStack>
        </Box>

        {/* Canvas Print */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="pink.500"
          position="relative"
          overflow="hidden"
          transition="all 0.2s"
          display="flex"
          flexDirection="column"
          _hover={{
            borderColor: 'pink.400',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="pink.500"
            px={2}
            py={0.5}
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
          >
            COMING SOON
          </Box>
          <VStack spacing={4} align="stretch" flex="1">
            <Box textAlign="center">
              <Text fontSize="3xl" mb={2}>🖼️</Text>
              <Heading size="md">Canvas Print</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Museum-quality wall art
              </Text>
            </Box>
            <Text fontSize="sm" color="pink.400" textAlign="center">
              From $49
            </Text>
            <Box flex="1" />
            <Button
              variant="outline"
              colorScheme="pink"
              onClick={() => handleMerchClick('canvas')}
              width="100%"
              px={8}
              py={6}
              fontSize="sm"
            >
              Get Notified
            </Button>
          </VStack>
        </Box>

        {/* Coffee Mug */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="yellow.500"
          position="relative"
          overflow="hidden"
          transition="all 0.2s"
          display="flex"
          flexDirection="column"
          _hover={{
            borderColor: 'yellow.400',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="yellow.500"
            color="gray.900"
            px={2}
            py={0.5}
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
          >
            COMING SOON
          </Box>
          <VStack spacing={4} align="stretch" flex="1">
            <Box textAlign="center">
              <Text fontSize="3xl" mb={2}>☕</Text>
              <Heading size="md">Coffee Mug</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Start your day with memories
              </Text>
            </Box>
            <Text fontSize="sm" color="yellow.400" textAlign="center">
              From $19
            </Text>
            <Box flex="1" />
            <Button
              variant="outline"
              colorScheme="yellow"
              onClick={() => handleMerchClick('mug')}
              width="100%"
              px={8}
              py={6}
              fontSize="sm"
            >
              Get Notified
            </Button>
          </VStack>
        </Box>
      </SimpleGrid>

      <EmailModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={() => onClose()}
      />
    </>
  )
}
