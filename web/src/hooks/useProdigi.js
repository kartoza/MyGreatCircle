import { useState, useCallback } from 'react'

/**
 * Hook for Prodigi print-on-demand integration
 */
export function useProdigi() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch available products
   */
  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/prodigi/products')
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }
      const data = await response.json()
      setProducts(data.products || [])
      return data.products
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get a price quote for a product
   */
  const getQuote = useCallback(async (productSku, countryCode, quantity = 1) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/prodigi/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: productSku,
          countryCode,
          quantity,
        }),
      })
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Failed to get quote')
      }
      return await response.json()
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Create an order
   */
  const createOrder = useCallback(async (productSku, imageUrl, recipient, quantity = 1) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/prodigi/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: productSku,
          imageUrl,
          recipient,
          quantity,
        }),
      })
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Failed to create order')
      }
      return await response.json()
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get products by category
   */
  const getProductsByCategory = useCallback((category) => {
    return products.filter(p => p.category === category)
  }, [products])

  return {
    products,
    isLoading,
    error,
    fetchProducts,
    getQuote,
    createOrder,
    getProductsByCategory,
  }
}

/**
 * Product categories with display info
 */
export const PRODUCT_CATEGORIES = {
  tshirt: {
    id: 'tshirt',
    name: 'T-Shirts',
    icon: '👕',
    description: 'Wear your journey with pride',
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas Prints',
    icon: '🖼️',
    description: 'Museum-quality wall art',
  },
  mug: {
    id: 'mug',
    name: 'Coffee Mugs',
    icon: '☕',
    description: 'Start your day with memories',
  },
  poster: {
    id: 'poster',
    name: 'Posters',
    icon: '📜',
    description: 'High-quality art prints',
  },
}

/**
 * Country codes for shipping
 */
export const SHIPPING_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'CA', name: 'Canada' },
  { code: 'ZA', name: 'South Africa' },
]
