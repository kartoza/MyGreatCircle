import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Button,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Badge,
  Image,
  useToast,
} from '@chakra-ui/react'
import { useGelato, formatPrice, CATEGORY_INFO, getProductIcon } from '../hooks/useGelato'
import { useProductMockup } from '../hooks/useProductMockup'

/**
 * Product browser for Gelato merchandise
 * Shows products grouped by category with mockup previews
 */
export function MerchProductBrowser({ onSelectProduct, isDisabled, filterCategories, journeyImageDataUrl }) {
  const {
    products,
    productsByCategory,
    isLoading,
    error,
    fetchProducts,
  } = useGelato()
  const { generateMockup } = useProductMockup()
  const [selectedCategory, setSelectedCategory] = useState(0)
  const [mockupCache, setMockupCache] = useState({})
  const toast = useToast()

  // Fetch products on mount
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading products',
        description: error,
        status: 'error',
        duration: 5000,
      })
    }
  }, [error, toast])

  // Generate mockups for visible products when journey image is available
  const getMockup = useCallback(async (productId) => {
    if (!journeyImageDataUrl || mockupCache[productId]) return mockupCache[productId]

    try {
      const mockupUrl = await generateMockup(journeyImageDataUrl, productId, 400, 300)
      setMockupCache(prev => ({ ...prev, [productId]: mockupUrl }))
      return mockupUrl
    } catch (err) {
      console.error('Failed to generate mockup for', productId, err)
      return null
    }
  }, [journeyImageDataUrl, mockupCache, generateMockup])

  if (isLoading && products.length === 0) {
    return (
      <VStack py={8} spacing={4}>
        <Spinner size="lg" color="brand.500" />
        <Text color="gray.400">Loading products...</Text>
      </VStack>
    )
  }

  if (products.length === 0) {
    return (
      <Box bg="gray.700" p={6} borderRadius="lg" textAlign="center">
        <Text color="gray.400">No products available at this time.</Text>
      </Box>
    )
  }

  // Sort categories by order, optionally filtered
  const categories = Object.keys(productsByCategory)
    .filter(cat => !filterCategories || filterCategories.includes(cat))
    .sort((a, b) => {
      const orderA = CATEGORY_INFO[a]?.order || 99
      const orderB = CATEGORY_INFO[b]?.order || 99
      return orderA - orderB
    })

  // Hide tabs if only one category
  const showTabs = categories.length > 1

  return (
    <Box>
      <Tabs
        variant="soft-rounded"
        colorScheme="brand"
        index={selectedCategory}
        onChange={setSelectedCategory}
      >
        {showTabs && (
          <TabList mb={4} flexWrap="wrap" gap={2}>
            {categories.map((category) => {
              const info = CATEGORY_INFO[category] || CATEGORY_INFO.other
              return (
                <Tab
                  key={category}
                  bg="gray.700"
                  _selected={{ bg: 'brand.500', color: 'white' }}
                >
                  <HStack spacing={2}>
                    <Text>{info.icon}</Text>
                    <Text>{info.name}</Text>
                    <Badge
                      colorScheme="gray"
                      variant="subtle"
                      fontSize="xs"
                      borderRadius="full"
                    >
                      {productsByCategory[category].length}
                    </Badge>
                  </HStack>
                </Tab>
              )
            })}
          </TabList>
        )}

        <TabPanels>
          {categories.map((category) => (
            <TabPanel key={category} px={0}>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {productsByCategory[category].map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                    isDisabled={isDisabled}
                    getMockup={getMockup}
                    mockupUrl={mockupCache[product.id]}
                  />
                ))}
              </SimpleGrid>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  )
}

/**
 * Individual product card with mockup preview
 */
function ProductCard({ product, onSelect, isDisabled, getMockup, mockupUrl }) {
  const hasVariants = product.variants && product.variants.length > 1
  const [isLoadingMockup, setIsLoadingMockup] = useState(false)

  // Generate mockup when card becomes visible
  useEffect(() => {
    if (!mockupUrl && getMockup && !isLoadingMockup) {
      setIsLoadingMockup(true)
      getMockup(product.id).finally(() => setIsLoadingMockup(false))
    }
  }, [product.id, mockupUrl, getMockup, isLoadingMockup])

  return (
    <Box
      bg="gray.700"
      borderRadius="lg"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{
        transform: isDisabled ? 'none' : 'translateY(-2px)',
        boxShadow: isDisabled ? 'none' : 'lg',
      }}
    >
      {/* Product mockup or icon */}
      <Box
        bg="gray.600"
        h="160px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        overflow="hidden"
      >
        {mockupUrl ? (
          <Image
            src={mockupUrl}
            alt={product.title}
            objectFit="cover"
            w="100%"
            h="100%"
          />
        ) : isLoadingMockup ? (
          <VStack spacing={2}>
            <Spinner size="sm" color="gray.400" />
            <Text fontSize="xs" color="gray.500">Generating preview...</Text>
          </VStack>
        ) : (
          <Text fontSize="4xl" opacity={0.7}>
            {getProductIcon(product.id)}
          </Text>
        )}
      </Box>

      <VStack p={4} spacing={3} align="stretch">
        <Box>
          <Heading size="sm" color="white" noOfLines={1}>
            {product.title}
          </Heading>
          <Text fontSize="xs" color="gray.400" noOfLines={2} minH="2.5em">
            {product.description}
          </Text>
        </Box>

        <HStack justify="space-between" align="center">
          <VStack spacing={0} align="start">
            <Text
              fontSize="lg"
              fontWeight="bold"
              color="brand.300"
            >
              {formatPrice(product.price, product.currency)}
            </Text>
            {hasVariants && (
              <Text fontSize="xs" color="gray.500">
                {product.variants.length} variants
              </Text>
            )}
          </VStack>

          <Button
            size="sm"
            colorScheme="brand"
            onClick={() => onSelect(product)}
            isDisabled={isDisabled}
          >
            Select
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

export default MerchProductBrowser
