import { useState } from 'react'
import {
  SimpleGrid,
  Box,
  VStack,
  Heading,
  Text,
  Button,
  useDisclosure,
} from '@chakra-ui/react'
import { EmailModal } from './EmailModal'

export function OutputCards({
  onDownloadFactSheet,
  onDownloadPoster,
  isGenerating,
}) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleEmailSubmit = async (email) => {
    // In production, send email to backend
    console.log('Email captured:', email)
    // For now, just download the poster
    await onDownloadPoster()
  }

  return (
    <>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {/* Fact Sheet */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.600"
          transition="all 0.2s"
          _hover={{
            borderColor: 'gray.500',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <VStack spacing={4} align="stretch">
            <Box textAlign="center" minH="80px">
              <Text fontSize="2xl" mb={2} aria-hidden="true" role="img">📄</Text>
              <Heading size="md">Fact Sheet</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A4 PDF with map, stats & places
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center" minH="20px">
              Free
            </Text>
            <Button
              colorScheme="brand"
              onClick={onDownloadFactSheet}
              isLoading={isGenerating}
              loadingText="Generating..."
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
          _hover={{
            borderColor: 'gray.500',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <VStack spacing={4} align="stretch">
            <Box textAlign="center" minH="80px">
              <Text fontSize="2xl" mb={2} aria-hidden="true" role="img">🖼️</Text>
              <Heading size="md">Poster</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A3 landscape, print-ready
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center" minH="20px">
              Free
            </Text>
            <Button
              colorScheme="brand"
              onClick={onDownloadPoster}
              isLoading={isGenerating}
              loadingText="Generating..."
            >
              Download PDF
            </Button>
          </VStack>
        </Box>

        {/* Premium */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="brand.500"
          position="relative"
          overflow="hidden"
          transition="all 0.2s"
          _hover={{
            borderColor: 'brand.400',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
        >
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="brand.500"
            px={2}
            py={0.5}
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
          >
            COMING SOON
          </Box>
          <VStack spacing={4} align="stretch">
            <Box textAlign="center" minH="80px">
              <Text fontSize="2xl" mb={2} aria-hidden="true" role="img">🎁</Text>
              <Heading size="md">Premium</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Extra themes, no watermark
              </Text>
            </Box>
            <Text fontSize="sm" color="brand.400" textAlign="center" minH="20px">
              Unlock with email
            </Text>
            <Button
              variant="outline"
              colorScheme="brand"
              onClick={onOpen}
            >
              Get Notified
            </Button>
          </VStack>
        </Box>
      </SimpleGrid>

      <EmailModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleEmailSubmit}
      />
    </>
  )
}
