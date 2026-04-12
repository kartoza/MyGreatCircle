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
        >
          <VStack spacing={4} align="stretch">
            <Box textAlign="center">
              <Text fontSize="2xl" mb={2}>📄</Text>
              <Heading size="md">Fact Sheet</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A4 PDF with map, stats & places
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Button
              colorScheme="brand"
              onClick={onDownloadFactSheet}
              isLoading={isGenerating}
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
        >
          <VStack spacing={4} align="stretch">
            <Box textAlign="center">
              <Text fontSize="2xl" mb={2}>🖼️</Text>
              <Heading size="md">Poster</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A3 landscape, print-ready
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Button
              colorScheme="brand"
              onClick={onDownloadPoster}
              isLoading={isGenerating}
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
          border="2px solid"
          borderColor="brand.500"
          position="relative"
        >
          <Box
            position="absolute"
            top={-3}
            right={4}
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
            <Box textAlign="center">
              <Text fontSize="2xl" mb={2}>🎁</Text>
              <Heading size="md">Premium</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Extra themes, no watermark
              </Text>
            </Box>
            <Text fontSize="sm" color="brand.400" textAlign="center">
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
