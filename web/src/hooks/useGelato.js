import { useState, useCallback, useEffect } from 'react'

/**
 * Curated product catalog (fallback when API not available)
 * Prices are base prices - margin will be added
 */
const FALLBACK_PRODUCTS = [
  // Wall Art
  { id: 'poster_a4', title: 'A4 Poster', description: 'Perfect desk or shelf size, premium matte paper', category: 'wall-art', price: 15.60, currency: 'EUR', variants: [{ id: 'poster_a4_matte', title: 'Matte', price: 15.60 }, { id: 'poster_a4_gloss', title: 'Glossy', price: 18.20 }] },
  { id: 'poster_a3', title: 'A3 Poster', description: 'Classic poster size, museum-quality matte paper', category: 'wall-art', price: 23.40, currency: 'EUR', variants: [{ id: 'poster_a3_matte', title: 'Matte', price: 23.40 }, { id: 'poster_a3_gloss', title: 'Glossy', price: 26.00 }] },
  { id: 'poster_a2', title: 'A2 Poster', description: 'Large format, perfect for living rooms', category: 'wall-art', price: 36.40, currency: 'EUR', variants: [{ id: 'poster_a2_matte', title: 'Matte', price: 36.40 }, { id: 'poster_a2_gloss', title: 'Glossy', price: 39.00 }] },
  { id: 'poster_a1', title: 'A1 Poster', description: 'Statement piece, gallery-quality print', category: 'wall-art', price: 58.50, currency: 'EUR', variants: [{ id: 'poster_a1_matte', title: 'Matte', price: 58.50 }, { id: 'poster_a1_gloss', title: 'Glossy', price: 62.40 }] },
  { id: 'framed_a4', title: 'Framed A4 Print', description: 'Premium print in elegant wooden frame', category: 'wall-art', price: 45.50, currency: 'EUR', variants: [{ id: 'framed_a4_black', title: 'Black Frame', price: 45.50 }, { id: 'framed_a4_white', title: 'White Frame', price: 45.50 }, { id: 'framed_a4_oak', title: 'Oak Frame', price: 49.40 }] },
  { id: 'framed_a3', title: 'Framed A3 Print', description: 'Gallery-ready with premium wooden frame', category: 'wall-art', price: 71.50, currency: 'EUR', variants: [{ id: 'framed_a3_black', title: 'Black Frame', price: 71.50 }, { id: 'framed_a3_white', title: 'White Frame', price: 71.50 }, { id: 'framed_a3_oak', title: 'Oak Frame', price: 75.40 }] },
  { id: 'canvas_30x30', title: 'Canvas 30x30cm', description: 'Square gallery-wrapped canvas', category: 'wall-art', price: 49.40, currency: 'EUR', variants: [{ id: 'canvas_30x30_std', title: 'Standard', price: 49.40 }] },
  { id: 'canvas_40x40', title: 'Canvas 40x40cm', description: 'Medium square canvas, perfect focal point', category: 'wall-art', price: 62.40, currency: 'EUR', variants: [{ id: 'canvas_40x40_std', title: 'Standard', price: 62.40 }] },
  { id: 'canvas_60x40', title: 'Canvas 60x40cm', description: 'Landscape canvas, gallery-wrapped', category: 'wall-art', price: 75.40, currency: 'EUR', variants: [{ id: 'canvas_60x40_std', title: 'Standard', price: 75.40 }] },
  { id: 'canvas_80x60', title: 'Canvas 80x60cm', description: 'Large statement canvas for living spaces', category: 'wall-art', price: 110.50, currency: 'EUR', variants: [{ id: 'canvas_80x60_std', title: 'Standard', price: 110.50 }] },
  { id: 'acrylic_30x30', title: 'Acrylic Print 30x30cm', description: 'Stunning HD print behind acrylic glass', category: 'wall-art', price: 84.50, currency: 'EUR', variants: [{ id: 'acrylic_30x30_std', title: 'Standard', price: 84.50 }] },
  { id: 'metal_30x30', title: 'Metal Print 30x30cm', description: 'Vibrant print on brushed aluminum', category: 'wall-art', price: 71.50, currency: 'EUR', variants: [{ id: 'metal_30x30_std', title: 'Standard', price: 71.50 }] },
  // Apparel
  { id: 'tshirt_unisex', title: 'Classic T-Shirt', description: '100% organic cotton, unisex fit', category: 'apparel', price: 28.60, currency: 'EUR', variants: [{ id: 'tshirt_s_black', title: 'S - Black', price: 28.60 }, { id: 'tshirt_m_black', title: 'M - Black', price: 28.60 }, { id: 'tshirt_l_black', title: 'L - Black', price: 28.60 }, { id: 'tshirt_xl_black', title: 'XL - Black', price: 28.60 }, { id: 'tshirt_s_white', title: 'S - White', price: 28.60 }, { id: 'tshirt_m_white', title: 'M - White', price: 28.60 }, { id: 'tshirt_l_white', title: 'L - White', price: 28.60 }, { id: 'tshirt_xl_white', title: 'XL - White', price: 28.60 }, { id: 'tshirt_s_navy', title: 'S - Navy', price: 28.60 }, { id: 'tshirt_m_navy', title: 'M - Navy', price: 28.60 }, { id: 'tshirt_l_navy', title: 'L - Navy', price: 28.60 }, { id: 'tshirt_xl_navy', title: 'XL - Navy', price: 28.60 }] },
  { id: 'hoodie_unisex', title: 'Classic Hoodie', description: 'Warm organic cotton blend, kangaroo pocket', category: 'apparel', price: 58.50, currency: 'EUR', variants: [{ id: 'hoodie_s_black', title: 'S - Black', price: 58.50 }, { id: 'hoodie_m_black', title: 'M - Black', price: 58.50 }, { id: 'hoodie_l_black', title: 'L - Black', price: 58.50 }, { id: 'hoodie_xl_black', title: 'XL - Black', price: 58.50 }, { id: 'hoodie_s_grey', title: 'S - Grey', price: 58.50 }, { id: 'hoodie_m_grey', title: 'M - Grey', price: 58.50 }, { id: 'hoodie_l_grey', title: 'L - Grey', price: 58.50 }, { id: 'hoodie_xl_grey', title: 'XL - Grey', price: 58.50 }] },
  { id: 'sweatshirt', title: 'Sweatshirt', description: 'Cozy crewneck, organic cotton blend', category: 'apparel', price: 49.40, currency: 'EUR', variants: [{ id: 'sweat_s_black', title: 'S - Black', price: 49.40 }, { id: 'sweat_m_black', title: 'M - Black', price: 49.40 }, { id: 'sweat_l_black', title: 'L - Black', price: 49.40 }, { id: 'sweat_xl_black', title: 'XL - Black', price: 49.40 }] },
  // Accessories
  { id: 'mug_11oz', title: 'Classic Mug 11oz', description: 'Ceramic mug, dishwasher & microwave safe', category: 'accessories', price: 18.20, currency: 'EUR', variants: [{ id: 'mug_11oz_white', title: 'White', price: 18.20 }] },
  { id: 'mug_15oz', title: 'Large Mug 15oz', description: 'Bigger ceramic mug for serious coffee lovers', category: 'accessories', price: 20.80, currency: 'EUR', variants: [{ id: 'mug_15oz_white', title: 'White', price: 20.80 }] },
  { id: 'mug_enamel', title: 'Enamel Camping Mug', description: 'Durable enamel mug, perfect for adventures', category: 'accessories', price: 23.40, currency: 'EUR', variants: [{ id: 'mug_enamel_white', title: 'White', price: 23.40 }] },
  { id: 'water_bottle', title: 'Water Bottle', description: 'Stainless steel, keeps drinks cold 24h', category: 'accessories', price: 32.50, currency: 'EUR', variants: [{ id: 'bottle_500ml', title: '500ml', price: 32.50 }, { id: 'bottle_750ml', title: '750ml', price: 36.40 }] },
  { id: 'tote_bag', title: 'Tote Bag', description: 'Organic cotton, spacious and durable', category: 'accessories', price: 23.40, currency: 'EUR', variants: [{ id: 'tote_natural', title: 'Natural', price: 23.40 }, { id: 'tote_black', title: 'Black', price: 23.40 }] },
  { id: 'backpack', title: 'Backpack', description: 'Durable all-over print backpack', category: 'accessories', price: 58.50, currency: 'EUR', variants: [{ id: 'backpack_std', title: 'Standard', price: 58.50 }] },
  { id: 'mousepad', title: 'Mouse Pad', description: 'Non-slip rubber base, smooth surface', category: 'accessories', price: 15.60, currency: 'EUR', variants: [{ id: 'mousepad_rect', title: 'Rectangle', price: 15.60 }] },
  { id: 'desk_mat', title: 'Desk Mat', description: 'Large desk mat, perfect for your workspace', category: 'accessories', price: 36.40, currency: 'EUR', variants: [{ id: 'deskmat_large', title: 'Large (80x40cm)', price: 36.40 }] },
  { id: 'puzzle_500', title: 'Jigsaw Puzzle 500pc', description: 'High-quality puzzle, great gift idea', category: 'accessories', price: 32.50, currency: 'EUR', variants: [{ id: 'puzzle_500_std', title: '500 pieces', price: 32.50 }] },
  { id: 'puzzle_1000', title: 'Jigsaw Puzzle 1000pc', description: 'Challenging puzzle for enthusiasts', category: 'accessories', price: 41.60, currency: 'EUR', variants: [{ id: 'puzzle_1000_std', title: '1000 pieces', price: 41.60 }] },
  // Phone Cases
  { id: 'case_iphone', title: 'iPhone Case', description: 'Tough snap case, glossy finish', category: 'phone-cases', price: 28.60, currency: 'EUR', variants: [{ id: 'case_iphone14', title: 'iPhone 14', price: 28.60 }, { id: 'case_iphone14pro', title: 'iPhone 14 Pro', price: 28.60 }, { id: 'case_iphone15', title: 'iPhone 15', price: 28.60 }, { id: 'case_iphone15pro', title: 'iPhone 15 Pro', price: 28.60 }, { id: 'case_iphone16', title: 'iPhone 16', price: 28.60 }, { id: 'case_iphone16pro', title: 'iPhone 16 Pro', price: 28.60 }] },
  { id: 'case_samsung', title: 'Samsung Galaxy Case', description: 'Tough snap case, glossy finish', category: 'phone-cases', price: 28.60, currency: 'EUR', variants: [{ id: 'case_s23', title: 'Galaxy S23', price: 28.60 }, { id: 'case_s24', title: 'Galaxy S24', price: 28.60 }, { id: 'case_s24ultra', title: 'Galaxy S24 Ultra', price: 28.60 }] },
  // Home
  { id: 'pillow_cover', title: 'Throw Pillow Cover', description: 'Soft polyester, hidden zipper', category: 'home', price: 28.60, currency: 'EUR', variants: [{ id: 'pillow_16x16', title: '16x16 inch', price: 28.60 }, { id: 'pillow_18x18', title: '18x18 inch', price: 31.20 }, { id: 'pillow_20x20', title: '20x20 inch', price: 33.80 }] },
  { id: 'blanket', title: 'Fleece Blanket', description: 'Soft and cozy, perfect for the couch', category: 'home', price: 58.50, currency: 'EUR', variants: [{ id: 'blanket_50x60', title: '50x60 inch', price: 58.50 }, { id: 'blanket_60x80', title: '60x80 inch', price: 71.50 }] },
  { id: 'towel', title: 'Beach Towel', description: 'Soft microfiber, quick-drying', category: 'home', price: 45.50, currency: 'EUR', variants: [{ id: 'towel_std', title: 'Standard (30x60 inch)', price: 45.50 }] },
  // Stationery
  { id: 'notebook', title: 'Hardcover Notebook', description: '128 lined pages, lay-flat binding', category: 'stationery', price: 23.40, currency: 'EUR', variants: [{ id: 'notebook_a5', title: 'A5', price: 23.40 }] },
  { id: 'greeting_cards', title: 'Greeting Cards (Pack of 10)', description: 'Premium cards with envelopes', category: 'stationery', price: 28.60, currency: 'EUR', variants: [{ id: 'cards_10pack', title: '10 Cards', price: 28.60 }] },
  { id: 'postcard', title: 'Postcards (Pack of 20)', description: 'Thick cardstock, matte finish', category: 'stationery', price: 19.50, currency: 'EUR', variants: [{ id: 'postcard_20pack', title: '20 Cards', price: 19.50 }] },
]

/**
 * Hook for interacting with the Gelato merchandise API
 */
export function useGelato() {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [error, setError] = useState(null)

  // Check if merchandise service is configured
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/merch/config')
        if (response.ok) {
          const data = await response.json()
          setIsConfigured(data.isConfigured)
        }
      } catch (err) {
        console.error('Failed to check merch config:', err)
        setIsConfigured(false)
      }
    }
    checkConfig()
  }, [])

  // Fetch products from the API (falls back to local catalog)
  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/merch/products')
      if (!response.ok) {
        // Use fallback products
        setProducts(FALLBACK_PRODUCTS)
        return FALLBACK_PRODUCTS
      }
      const data = await response.json()
      const prods = data.products && data.products.length > 0 ? data.products : FALLBACK_PRODUCTS
      setProducts(prods)
      return prods
    } catch (err) {
      // Use fallback products on error
      console.log('Using fallback product catalog')
      setProducts(FALLBACK_PRODUCTS)
      return FALLBACK_PRODUCTS
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Generate a mockup for a product
  const generateMockup = useCallback(async (productId, imageDataUrl) => {
    setError(null)

    try {
      const response = await fetch('/api/merch/mockup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          imageDataUrl,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to generate mockup')
      }

      return await response.json()
    } catch (err) {
      setError(err.message)
      console.error('Mockup generation error:', err)
      throw err
    }
  }, [])

  // Create a checkout session
  const createCheckout = useCallback(async (productId, variantId, imageUrl, successUrl, cancelUrl) => {
    setError(null)

    try {
      const response = await fetch('/api/merch/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          variantId,
          imageUrl,
          successUrl: successUrl || `${window.location.origin}/order-success`,
          cancelUrl: cancelUrl || `${window.location.origin}`,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to create checkout')
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }

      return data
    } catch (err) {
      setError(err.message)
      console.error('Checkout creation error:', err)
      throw err
    }
  }, [])

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    const category = product.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(product)
    return acc
  }, {})

  return {
    products,
    productsByCategory,
    isLoading,
    isConfigured,
    error,
    fetchProducts,
    generateMockup,
    createCheckout,
  }
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount, currency = 'EUR') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
  return formatter.format(amount)
}

/**
 * Category display names and icons
 */
export const CATEGORY_INFO = {
  'wall-art': { name: 'Wall Art', icon: '🖼️', order: 1 },
  'apparel': { name: 'Apparel', icon: '👕', order: 2 },
  'accessories': { name: 'Accessories', icon: '🎒', order: 3 },
  'phone-cases': { name: 'Phone Cases', icon: '📱', order: 4 },
  'home': { name: 'Home & Living', icon: '🏠', order: 5 },
  'stationery': { name: 'Stationery', icon: '📓', order: 6 },
  'other': { name: 'Other', icon: '📦', order: 99 },
}

/**
 * Product icons based on product ID prefix
 */
export const PRODUCT_ICONS = {
  poster: '🖼️',
  framed: '🖼️',
  canvas: '🎨',
  acrylic: '💎',
  metal: '🔲',
  tshirt: '👕',
  hoodie: '🧥',
  sweatshirt: '👔',
  tank: '🎽',
  mug: '☕',
  water: '🍶',
  tote: '👜',
  backpack: '🎒',
  mousepad: '🖱️',
  desk: '💻',
  puzzle: '🧩',
  case: '📱',
  pillow: '🛋️',
  blanket: '🛏️',
  towel: '🏖️',
  notebook: '📓',
  greeting: '💌',
  postcard: '📮',
}

/**
 * Get icon for a product based on its ID
 */
export function getProductIcon(productId) {
  for (const [prefix, icon] of Object.entries(PRODUCT_ICONS)) {
    if (productId.startsWith(prefix)) {
      return icon
    }
  }
  return '📦'
}
