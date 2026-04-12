import { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Input,
  Button,
  Text,
} from '@chakra-ui/react'

export function EmailModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return

    setIsSubmitting(true)
    try {
      await onSubmit(email)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.800">
        <ModalHeader>Get Your Poster</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <Text color="gray.400">
              Enter your email to unlock the high-resolution poster download.
              We'll also send you updates about new themes and features.
            </Text>

            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: 'brand.500' }}
            />

            <Button
              colorScheme="brand"
              width="100%"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!email || !email.includes('@')}
            >
              Download Poster
            </Button>

            <Text fontSize="xs" color="gray.500">
              We respect your privacy. Unsubscribe anytime.
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
