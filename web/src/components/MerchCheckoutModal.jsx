import { useState, useEffect } from 'react'
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
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  Badge,
  useToast,
} from '@chakra-ui/react'
import { useProdigi, PRODUCT_CATEGORIES, SHIPPING_COUNTRIES } from '../hooks/useProdigi'

/**
 * Steps in the checkout flow
 */
const STEPS = {
  SELECT_PRODUCT: 'select_product',
  SHIPPING: 'shipping',
  REVIEW: 'review',
  CONFIRM: 'confirm',
}

export function MerchCheckoutModal({
  isOpen,
  onClose,
  category,
  imageUrl,
}) {
  const toast = useToast()
  const {
    products,
    isLoading,
    error,
    fetchProducts,
    getQuote,
    createOrder,
    getProductsByCategory,
  } = useProdigi()

  const [step, setStep] = useState(STEPS.SELECT_PRODUCT)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [quote, setQuote] = useState(null)
  const [orderResult, setOrderResult] = useState(null)

  // Shipping form state
  const [shipping, setShipping] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    townOrCity: '',
    stateOrArea: '',
    postalCode: '',
    countryCode: 'US',
  })

  // Load products on mount
  useEffect(() => {
    if (isOpen && products.length === 0) {
      fetchProducts()
    }
  }, [isOpen, products.length, fetchProducts])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(STEPS.SELECT_PRODUCT)
      setSelectedProduct(null)
      setQuantity(1)
      setQuote(null)
      setOrderResult(null)
    }
  }, [isOpen])

  const categoryProducts = getProductsByCategory(category)
  const categoryInfo = PRODUCT_CATEGORIES[category] || {}

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
  }

  const handleShippingChange = (field, value) => {
    setShipping(prev => ({ ...prev, [field]: value }))
  }

  const handleGetQuote = async () => {
    if (!selectedProduct) return

    const quoteResult = await getQuote(selectedProduct.sku, shipping.countryCode, quantity)
    if (quoteResult) {
      setQuote(quoteResult)
      setStep(STEPS.REVIEW)
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedProduct || !imageUrl) return

    const recipient = {
      name: shipping.name,
      email: shipping.email,
      phoneNumber: shipping.phone,
      address: {
        line1: shipping.line1,
        line2: shipping.line2,
        townOrCity: shipping.townOrCity,
        stateOrCounty: shipping.stateOrArea,
        postalOrZipCode: shipping.postalCode,
        countryCode: shipping.countryCode,
      },
    }

    const result = await createOrder(selectedProduct.sku, imageUrl, recipient, quantity)
    if (result) {
      setOrderResult(result)
      setStep(STEPS.CONFIRM)
      toast({
        title: 'Order placed!',
        description: `Order ID: ${result.orderId}`,
        status: 'success',
        duration: 5000,
      })
    }
  }

  const isShippingValid = () => {
    return (
      shipping.name.trim() !== '' &&
      shipping.line1.trim() !== '' &&
      shipping.townOrCity.trim() !== '' &&
      shipping.postalCode.trim() !== '' &&
      shipping.countryCode !== ''
    )
  }

  const renderProductSelection = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="bold">
        {categoryInfo.icon} Choose your {categoryInfo.name}
      </Text>

      {isLoading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
          <Text mt={2}>Loading products...</Text>
        </Box>
      ) : categoryProducts.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          No products available in this category yet.
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {categoryProducts.map(product => (
            <Box
              key={product.sku}
              p={4}
              borderRadius="lg"
              border="2px solid"
              borderColor={selectedProduct?.sku === product.sku ? 'brand.500' : 'gray.600'}
              bg={selectedProduct?.sku === product.sku ? 'gray.700' : 'gray.800'}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ borderColor: 'brand.400' }}
              onClick={() => handleProductSelect(product)}
            >
              <Text fontWeight="bold">{product.name}</Text>
              <Text fontSize="sm" color="gray.400">{product.description}</Text>
              <Text mt={2} color="green.400" fontWeight="bold">
                From ${product.minPrice.toFixed(2)}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      )}

      <HStack mt={4}>
        <FormControl maxW="120px">
          <FormLabel fontSize="sm">Quantity</FormLabel>
          <Select
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            size="sm"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <Button
        colorScheme="brand"
        isDisabled={!selectedProduct}
        onClick={() => setStep(STEPS.SHIPPING)}
      >
        Continue to Shipping
      </Button>
    </VStack>
  )

  const renderShippingForm = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="bold">Shipping Address</Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Full Name</FormLabel>
          <Input
            value={shipping.name}
            onChange={(e) => handleShippingChange('name', e.target.value)}
            placeholder="John Doe"
            size="sm"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Email</FormLabel>
          <Input
            type="email"
            value={shipping.email}
            onChange={(e) => handleShippingChange('email', e.target.value)}
            placeholder="john@example.com"
            size="sm"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Phone</FormLabel>
          <Input
            type="tel"
            value={shipping.phone}
            onChange={(e) => handleShippingChange('phone', e.target.value)}
            placeholder="+1 234 567 8900"
            size="sm"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Country</FormLabel>
          <Select
            value={shipping.countryCode}
            onChange={(e) => handleShippingChange('countryCode', e.target.value)}
            size="sm"
          >
            {SHIPPING_COUNTRIES.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>

      <FormControl isRequired>
        <FormLabel fontSize="sm">Address Line 1</FormLabel>
        <Input
          value={shipping.line1}
          onChange={(e) => handleShippingChange('line1', e.target.value)}
          placeholder="123 Main Street"
          size="sm"
        />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Address Line 2</FormLabel>
        <Input
          value={shipping.line2}
          onChange={(e) => handleShippingChange('line2', e.target.value)}
          placeholder="Apt 4B"
          size="sm"
        />
      </FormControl>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel fontSize="sm">City</FormLabel>
          <Input
            value={shipping.townOrCity}
            onChange={(e) => handleShippingChange('townOrCity', e.target.value)}
            placeholder="New York"
            size="sm"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">State/Province</FormLabel>
          <Input
            value={shipping.stateOrArea}
            onChange={(e) => handleShippingChange('stateOrArea', e.target.value)}
            placeholder="NY"
            size="sm"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Postal Code</FormLabel>
          <Input
            value={shipping.postalCode}
            onChange={(e) => handleShippingChange('postalCode', e.target.value)}
            placeholder="10001"
            size="sm"
          />
        </FormControl>
      </SimpleGrid>

      <HStack mt={4} justify="space-between">
        <Button variant="ghost" onClick={() => setStep(STEPS.SELECT_PRODUCT)}>
          Back
        </Button>
        <Button
          colorScheme="brand"
          isDisabled={!isShippingValid()}
          isLoading={isLoading}
          onClick={handleGetQuote}
        >
          Get Quote
        </Button>
      </HStack>
    </VStack>
  )

  const renderReview = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="bold">Review Your Order</Text>

      <Box p={4} bg="gray.700" borderRadius="lg">
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">{selectedProduct?.name}</Text>
            <Text fontSize="sm" color="gray.400">Quantity: {quantity}</Text>
          </VStack>
          <Badge colorScheme="green" fontSize="md" px={3} py={1}>
            {categoryInfo.icon}
          </Badge>
        </HStack>
      </Box>

      <Box p={4} bg="gray.700" borderRadius="lg">
        <Text fontWeight="bold" mb={2}>Shipping To:</Text>
        <Text fontSize="sm">{shipping.name}</Text>
        <Text fontSize="sm">{shipping.line1}</Text>
        {shipping.line2 && <Text fontSize="sm">{shipping.line2}</Text>}
        <Text fontSize="sm">
          {shipping.townOrCity}, {shipping.stateOrArea} {shipping.postalCode}
        </Text>
        <Text fontSize="sm">
          {SHIPPING_COUNTRIES.find(c => c.code === shipping.countryCode)?.name}
        </Text>
      </Box>

      {quote && (
        <Box p={4} bg="gray.700" borderRadius="lg">
          <Text fontWeight="bold" mb={2}>Price Summary</Text>
          <VStack spacing={1} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm">Product:</Text>
              <Text fontSize="sm">${quote.productCost.toFixed(2)}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm">Shipping:</Text>
              <Text fontSize="sm">${quote.shippingCost.toFixed(2)}</Text>
            </HStack>
            <Divider my={2} />
            <HStack justify="space-between">
              <Text fontWeight="bold">Total:</Text>
              <Text fontWeight="bold" color="green.400">
                ${quote.total.toFixed(2)} {quote.currency}
              </Text>
            </HStack>
          </VStack>
        </Box>
      )}

      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Alert status="info" variant="subtle">
        <AlertIcon />
        <Text fontSize="sm">
          Payment will be processed by Prodigi. Your journey map will be printed and shipped directly to you.
        </Text>
      </Alert>

      <HStack mt={4} justify="space-between">
        <Button variant="ghost" onClick={() => setStep(STEPS.SHIPPING)}>
          Back
        </Button>
        <Button
          colorScheme="green"
          isLoading={isLoading}
          onClick={handlePlaceOrder}
        >
          Place Order
        </Button>
      </HStack>
    </VStack>
  )

  const renderConfirmation = () => (
    <VStack spacing={6} align="center" py={8}>
      <Text fontSize="4xl">🎉</Text>
      <Text fontSize="xl" fontWeight="bold">Order Placed Successfully!</Text>

      <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
        <Text fontSize="sm" color="gray.400">Order ID</Text>
        <Text fontWeight="bold" fontFamily="mono">{orderResult?.orderId}</Text>
      </Box>

      <Text textAlign="center" color="gray.400">
        You'll receive an email confirmation when your order ships.
        Your unique journey map is being prepared for printing!
      </Text>

      <Button colorScheme="brand" onClick={onClose}>
        Done
      </Button>
    </VStack>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg="gray.800">
        <ModalHeader>
          {step === STEPS.CONFIRM ? 'Order Confirmed' : `Order ${categoryInfo.name}`}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          {step === STEPS.SELECT_PRODUCT && renderProductSelection()}
          {step === STEPS.SHIPPING && renderShippingForm()}
          {step === STEPS.REVIEW && renderReview()}
          {step === STEPS.CONFIRM && renderConfirmation()}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
