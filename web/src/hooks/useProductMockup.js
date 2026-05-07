import { useCallback } from 'react'

/**
 * Product mockup configurations
 * Each defines how to composite the journey map onto the product
 */
const MOCKUP_CONFIGS = {
  // Wall art - simple frame overlay
  poster: {
    type: 'frame',
    bgColor: '#f5f5f5',
    frameColor: '#333',
    frameWidth: 8,
    padding: 20,
    shadow: true,
  },
  framed: {
    type: 'frame',
    bgColor: '#fff',
    frameColor: '#8B4513',
    frameWidth: 15,
    padding: 25,
    matColor: '#f9f9f9',
    matWidth: 20,
    shadow: true,
  },
  canvas: {
    type: 'canvas',
    bgColor: '#f0f0f0',
    depth: 15,
    shadow: true,
  },
  // Apparel - show on colored background with overlay
  tshirt: {
    type: 'apparel',
    bgColor: '#1a1a2e',
    productColor: '#222',
    printArea: { x: 0.25, y: 0.15, w: 0.5, h: 0.4 },
  },
  hoodie: {
    type: 'apparel',
    bgColor: '#1a1a2e',
    productColor: '#333',
    printArea: { x: 0.25, y: 0.2, w: 0.5, h: 0.35 },
  },
  // Mugs - wrap around cylinder
  mug: {
    type: 'mug',
    bgColor: '#f5f5f5',
    mugColor: '#fff',
    printArea: { x: 0.1, y: 0.2, w: 0.8, h: 0.5 },
  },
  // Phone cases
  case: {
    type: 'phone',
    bgColor: '#1a1a2e',
    phoneColor: '#111',
    printArea: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
  },
  // Default
  default: {
    type: 'simple',
    bgColor: '#f5f5f5',
    padding: 20,
  },
}

/**
 * Get mockup config for a product ID
 */
function getMockupConfig(productId) {
  for (const [prefix, config] of Object.entries(MOCKUP_CONFIGS)) {
    if (productId.startsWith(prefix)) {
      return config
    }
  }
  return MOCKUP_CONFIGS.default
}

/**
 * Hook for generating client-side product mockups
 */
export function useProductMockup() {
  /**
   * Generate a mockup image with the journey map on a product
   * @param {string} journeyMapDataUrl - Data URL of the journey map image
   * @param {string} productId - Product ID to determine mockup style
   * @param {number} width - Output width
   * @param {number} height - Output height
   * @returns {Promise<string>} - Data URL of the mockup
   */
  const generateMockup = useCallback(async (journeyMapDataUrl, productId, width = 400, height = 400) => {
    const config = getMockupConfig(productId)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // Load journey map image
    const journeyImg = await loadImage(journeyMapDataUrl)

    // Draw based on mockup type
    switch (config.type) {
      case 'frame':
        drawFramedMockup(ctx, journeyImg, width, height, config)
        break
      case 'canvas':
        drawCanvasMockup(ctx, journeyImg, width, height, config)
        break
      case 'apparel':
        drawApparelMockup(ctx, journeyImg, width, height, config)
        break
      case 'mug':
        drawMugMockup(ctx, journeyImg, width, height, config)
        break
      case 'phone':
        drawPhoneMockup(ctx, journeyImg, width, height, config)
        break
      default:
        drawSimpleMockup(ctx, journeyImg, width, height, config)
    }

    return canvas.toDataURL('image/png')
  }, [])

  return { generateMockup }
}

/**
 * Load an image from a data URL
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Draw framed poster/print mockup
 */
function drawFramedMockup(ctx, img, width, height, config) {
  const { bgColor, frameColor, frameWidth, padding, matColor, matWidth = 0, shadow } = config

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  const totalFrame = frameWidth + matWidth + padding
  const imgW = width - totalFrame * 2
  const imgH = height - totalFrame * 2

  // Shadow
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 5
    ctx.shadowOffsetY = 5
  }

  // Frame
  ctx.fillStyle = frameColor
  ctx.fillRect(padding, padding, width - padding * 2, height - padding * 2)

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Mat (if present)
  if (matWidth > 0) {
    ctx.fillStyle = matColor
    ctx.fillRect(
      padding + frameWidth,
      padding + frameWidth,
      width - (padding + frameWidth) * 2,
      height - (padding + frameWidth) * 2
    )
  }

  // Image
  ctx.drawImage(img, totalFrame, totalFrame, imgW, imgH)
}

/**
 * Draw canvas print mockup with 3D depth
 */
function drawCanvasMockup(ctx, img, width, height, config) {
  const { bgColor, depth, shadow } = config
  const padding = 30

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  const imgW = width - padding * 2 - depth
  const imgH = height - padding * 2 - depth

  // Shadow
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetX = 8
    ctx.shadowOffsetY = 8
  }

  // Canvas depth (side)
  ctx.fillStyle = '#ddd'
  ctx.beginPath()
  ctx.moveTo(padding + imgW, padding)
  ctx.lineTo(padding + imgW + depth, padding - depth / 2)
  ctx.lineTo(padding + imgW + depth, padding + imgH - depth / 2)
  ctx.lineTo(padding + imgW, padding + imgH)
  ctx.closePath()
  ctx.fill()

  // Canvas depth (bottom)
  ctx.fillStyle = '#ccc'
  ctx.beginPath()
  ctx.moveTo(padding, padding + imgH)
  ctx.lineTo(padding + depth, padding + imgH + depth / 2)
  ctx.lineTo(padding + imgW + depth, padding + imgH + depth / 2)
  ctx.lineTo(padding + imgW, padding + imgH)
  ctx.closePath()
  ctx.fill()

  ctx.shadowColor = 'transparent'

  // Main image
  ctx.drawImage(img, padding, padding, imgW, imgH)
}

/**
 * Draw apparel (t-shirt/hoodie) mockup
 */
function drawApparelMockup(ctx, img, width, height, config) {
  const { bgColor, productColor, printArea } = config

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // Draw simplified t-shirt shape
  ctx.fillStyle = productColor
  const shirtW = width * 0.7
  const shirtH = height * 0.8
  const shirtX = (width - shirtW) / 2
  const shirtY = (height - shirtH) / 2

  // Body
  ctx.beginPath()
  ctx.roundRect(shirtX, shirtY + shirtH * 0.15, shirtW, shirtH * 0.85, 10)
  ctx.fill()

  // Sleeves
  ctx.beginPath()
  ctx.ellipse(shirtX - shirtW * 0.1, shirtY + shirtH * 0.25, shirtW * 0.2, shirtH * 0.15, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(shirtX + shirtW + shirtW * 0.1, shirtY + shirtH * 0.25, shirtW * 0.2, shirtH * 0.15, 0.3, 0, Math.PI * 2)
  ctx.fill()

  // Collar
  ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.ellipse(width / 2, shirtY + shirtH * 0.12, shirtW * 0.15, shirtH * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()

  // Print area
  const pX = width * printArea.x
  const pY = height * printArea.y
  const pW = width * printArea.w
  const pH = height * printArea.h

  ctx.drawImage(img, pX, pY, pW, pH)
}

/**
 * Draw mug mockup
 */
function drawMugMockup(ctx, img, width, height, config) {
  const { bgColor, mugColor, printArea } = config

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  const mugW = width * 0.6
  const mugH = height * 0.7
  const mugX = (width - mugW) / 2
  const mugY = (height - mugH) / 2

  // Handle
  ctx.strokeStyle = mugColor
  ctx.lineWidth = 15
  ctx.beginPath()
  ctx.arc(mugX + mugW + 10, mugY + mugH / 2, mugH * 0.25, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()

  // Mug body
  ctx.fillStyle = mugColor
  ctx.beginPath()
  ctx.roundRect(mugX, mugY, mugW, mugH, [10, 10, 20, 20])
  ctx.fill()

  // Print area
  const pX = mugX + mugW * printArea.x
  const pY = mugY + mugH * printArea.y
  const pW = mugW * printArea.w
  const pH = mugH * printArea.h

  ctx.drawImage(img, pX, pY, pW, pH)

  // Mug rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(mugX, mugY + 5)
  ctx.lineTo(mugX + mugW, mugY + 5)
  ctx.stroke()
}

/**
 * Draw phone case mockup
 */
function drawPhoneMockup(ctx, img, width, height, config) {
  const { bgColor, phoneColor, printArea } = config

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  const phoneW = width * 0.5
  const phoneH = height * 0.85
  const phoneX = (width - phoneW) / 2
  const phoneY = (height - phoneH) / 2

  // Phone body shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 5
  ctx.shadowOffsetY = 5

  // Phone case
  ctx.fillStyle = phoneColor
  ctx.beginPath()
  ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 25)
  ctx.fill()

  ctx.shadowColor = 'transparent'

  // Camera bump
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.roundRect(phoneX + phoneW * 0.1, phoneY + phoneH * 0.03, phoneW * 0.35, phoneH * 0.12, 10)
  ctx.fill()

  // Print area
  const pX = phoneX + phoneW * printArea.x
  const pY = phoneY + phoneH * printArea.y
  const pW = phoneW * printArea.w
  const pH = phoneH * printArea.h

  // Clip to rounded rect
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(phoneX + 5, phoneY + 5, phoneW - 10, phoneH - 10, 22)
  ctx.clip()
  ctx.drawImage(img, pX, pY, pW, pH)
  ctx.restore()
}

/**
 * Draw simple mockup (default)
 */
function drawSimpleMockup(ctx, img, width, height, config) {
  const { bgColor, padding } = config

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3

  ctx.drawImage(img, padding, padding, width - padding * 2, height - padding * 2)
}

export default useProductMockup
