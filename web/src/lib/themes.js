/**
 * Visual theme definitions for map and PDF rendering
 * Each theme defines colors for background, land, arcs, and points
 */

export const THEMES = {
  minimal: {
    id: 'minimal',
    name: 'Minimal Dark',
    description: 'Clean, sophisticated, gallery-worthy',
    background: {
      type: 'gradient',
      colors: ['#1a1a2e', '#16213e'],
      angle: 135,
    },
    land: {
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'rgba(255, 255, 255, 0.6)',
      strokeWidth: 1.5,
      glow: false,
    },
    point: {
      fill: '#ffffff',
      radius: 4,
      glow: false,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  neon: {
    id: 'neon',
    name: 'Vibrant Neon',
    description: 'Bold gradients, glowing arcs, electric energy',
    background: {
      type: 'solid',
      color: '#0f0f23',
    },
    land: {
      fill: 'rgba(255, 255, 255, 0.08)',
      stroke: 'rgba(255, 255, 255, 0.05)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#neonGradient)',
      strokeWidth: 3,
      glow: true,
      glowColor: 'rgba(255, 107, 107, 0.5)',
      glowRadius: 8,
    },
    arcGradient: {
      colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
    },
    point: {
      fill: '#feca57',
      radius: 6,
      glow: true,
      glowColor: 'rgba(254, 202, 87, 0.6)',
      glowRadius: 10,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  vintage: {
    id: 'vintage',
    name: 'Vintage Cartography',
    description: 'Warm paper tones, explorer aesthetic',
    background: {
      type: 'solid',
      color: '#f4f1ea',
    },
    land: {
      fill: '#e8e0d0',
      stroke: '#c4b8a8',
      strokeWidth: 1,
    },
    arc: {
      stroke: '#5c4033',
      strokeWidth: 1.5,
      dashArray: '6,4',
      glow: false,
    },
    point: {
      fill: '#b85c38',
      radius: 5,
      glow: false,
    },
    text: {
      fill: '#5c4033',
      fontFamily: 'Georgia, serif',
    },
  },

  modern: {
    id: 'modern',
    name: 'Clean Modern',
    description: 'Light, professional, works everywhere',
    background: {
      type: 'gradient',
      colors: ['#ffffff', '#f8fafc'],
      angle: 180,
    },
    land: {
      fill: '#e2e8f0',
      stroke: '#cbd5e1',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: '#3b82f6',
      strokeWidth: 2,
      glow: false,
    },
    point: {
      fill: '#3b82f6',
      radius: 5,
      glow: false,
    },
    text: {
      fill: '#1e293b',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Mysterious depths, bioluminescent glow',
    background: {
      type: 'gradient',
      colors: ['#0c1445', '#1a237e', '#0d47a1'],
      angle: 180,
    },
    land: {
      fill: 'rgba(100, 181, 246, 0.15)',
      stroke: 'rgba(100, 181, 246, 0.3)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#oceanGradient)',
      strokeWidth: 2,
      glow: true,
      glowColor: 'rgba(0, 229, 255, 0.4)',
      glowRadius: 6,
    },
    arcGradient: {
      colors: ['#00e5ff', '#00bcd4', '#26c6da'],
    },
    point: {
      fill: '#00e5ff',
      radius: 5,
      glow: true,
      glowColor: 'rgba(0, 229, 255, 0.5)',
      glowRadius: 8,
    },
    text: {
      fill: '#e0f7fa',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  sunset: {
    id: 'sunset',
    name: 'Golden Sunset',
    description: 'Warm twilight colors, dreamy atmosphere',
    background: {
      type: 'gradient',
      colors: ['#1a1a2e', '#4a1942', '#6b2d5c'],
      angle: 180,
    },
    land: {
      fill: 'rgba(255, 183, 77, 0.1)',
      stroke: 'rgba(255, 183, 77, 0.2)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#sunsetGradient)',
      strokeWidth: 2,
      glow: true,
      glowColor: 'rgba(255, 138, 101, 0.4)',
      glowRadius: 6,
    },
    arcGradient: {
      colors: ['#ff8a65', '#ffb74d', '#ffd54f', '#ff7043'],
    },
    point: {
      fill: '#ffd54f',
      radius: 5,
      glow: true,
      glowColor: 'rgba(255, 213, 79, 0.5)',
      glowRadius: 8,
    },
    text: {
      fill: '#fff8e1',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  forest: {
    id: 'forest',
    name: 'Enchanted Forest',
    description: 'Deep woodland greens, natural serenity',
    background: {
      type: 'gradient',
      colors: ['#1b2e1b', '#2d4a2d'],
      angle: 135,
    },
    land: {
      fill: 'rgba(129, 199, 132, 0.12)',
      stroke: 'rgba(129, 199, 132, 0.25)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#forestGradient)',
      strokeWidth: 1.8,
      glow: true,
      glowColor: 'rgba(165, 214, 167, 0.3)',
      glowRadius: 5,
    },
    arcGradient: {
      colors: ['#a5d6a7', '#81c784', '#66bb6a'],
    },
    point: {
      fill: '#c5e1a5',
      radius: 5,
      glow: true,
      glowColor: 'rgba(197, 225, 165, 0.4)',
      glowRadius: 6,
    },
    text: {
      fill: '#e8f5e9',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  arctic: {
    id: 'arctic',
    name: 'Arctic Ice',
    description: 'Crisp frozen landscapes, aurora whispers',
    background: {
      type: 'gradient',
      colors: ['#e3f2fd', '#bbdefb', '#e1f5fe'],
      angle: 180,
    },
    land: {
      fill: '#ffffff',
      stroke: '#90caf9',
      strokeWidth: 0.8,
    },
    arc: {
      stroke: 'url(#arcticGradient)',
      strokeWidth: 2,
      glow: false,
    },
    arcGradient: {
      colors: ['#4fc3f7', '#29b6f6', '#03a9f4', '#00bcd4'],
    },
    point: {
      fill: '#0288d1',
      radius: 5,
      glow: false,
    },
    text: {
      fill: '#01579b',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight Galaxy',
    description: 'Cosmic purples, starlit journey',
    background: {
      type: 'gradient',
      colors: ['#0d0221', '#1a0533', '#2d1b4e'],
      angle: 135,
    },
    land: {
      fill: 'rgba(186, 104, 200, 0.08)',
      stroke: 'rgba(186, 104, 200, 0.15)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#midnightGradient)',
      strokeWidth: 2,
      glow: true,
      glowColor: 'rgba(206, 147, 216, 0.4)',
      glowRadius: 8,
    },
    arcGradient: {
      colors: ['#ce93d8', '#ba68c8', '#ab47bc', '#e1bee7'],
    },
    point: {
      fill: '#e1bee7',
      radius: 5,
      glow: true,
      glowColor: 'rgba(225, 190, 231, 0.5)',
      glowRadius: 10,
    },
    text: {
      fill: '#f3e5f5',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  earth: {
    id: 'earth',
    name: 'Living Earth',
    description: 'Satellite view, natural terrain colors',
    background: {
      type: 'solid',
      color: '#1a3a5c',
    },
    land: {
      fill: '#4a7c59',
      stroke: '#2e5339',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#earthGradient)',
      strokeWidth: 1.5,
      glow: true,
      glowColor: 'rgba(255, 235, 59, 0.3)',
      glowRadius: 4,
    },
    arcGradient: {
      colors: ['#ffeb3b', '#ffc107', '#ff9800'],
    },
    point: {
      fill: '#ffeb3b',
      radius: 4,
      glow: true,
      glowColor: 'rgba(255, 235, 59, 0.5)',
      glowRadius: 6,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  blueprint: {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Technical drafting style, precise lines',
    background: {
      type: 'solid',
      color: '#0a2540',
    },
    land: {
      fill: 'transparent',
      stroke: '#1e88e5',
      strokeWidth: 0.8,
    },
    arc: {
      stroke: '#64b5f6',
      strokeWidth: 1.5,
      dashArray: '8,4',
      glow: false,
    },
    point: {
      fill: 'transparent',
      stroke: '#64b5f6',
      strokeWidth: 1.5,
      radius: 5,
      glow: false,
    },
    text: {
      fill: '#90caf9',
      fontFamily: 'monospace',
    },
  },

  rose: {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Elegant blush tones, sophisticated warmth',
    background: {
      type: 'gradient',
      colors: ['#1a1215', '#2d1f24'],
      angle: 135,
    },
    land: {
      fill: 'rgba(244, 143, 177, 0.08)',
      stroke: 'rgba(244, 143, 177, 0.15)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#roseGradient)',
      strokeWidth: 2,
      glow: true,
      glowColor: 'rgba(244, 143, 177, 0.3)',
      glowRadius: 5,
    },
    arcGradient: {
      colors: ['#f48fb1', '#f8bbd9', '#ffccbc', '#f48fb1'],
    },
    point: {
      fill: '#f8bbd9',
      radius: 5,
      glow: true,
      glowColor: 'rgba(248, 187, 217, 0.4)',
      glowRadius: 6,
    },
    text: {
      fill: '#fce4ec',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Pure black and white, timeless elegance',
    background: {
      type: 'solid',
      color: '#000000',
    },
    land: {
      fill: '#1a1a1a',
      stroke: '#333333',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: '#ffffff',
      strokeWidth: 1.5,
      glow: false,
    },
    point: {
      fill: '#ffffff',
      radius: 4,
      glow: false,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  retro: {
    id: 'retro',
    name: 'Retro 80s',
    description: 'Synthwave vibes, nostalgic neon',
    background: {
      type: 'gradient',
      colors: ['#2b1055', '#7597de'],
      angle: 180,
    },
    land: {
      fill: 'rgba(255, 0, 128, 0.1)',
      stroke: 'rgba(255, 0, 128, 0.3)',
      strokeWidth: 1,
    },
    arc: {
      stroke: 'url(#retroGradient)',
      strokeWidth: 2.5,
      glow: true,
      glowColor: 'rgba(255, 0, 128, 0.5)',
      glowRadius: 10,
    },
    arcGradient: {
      colors: ['#ff0080', '#ff00ff', '#00ffff'],
    },
    point: {
      fill: '#00ffff',
      radius: 5,
      glow: true,
      glowColor: 'rgba(0, 255, 255, 0.6)',
      glowRadius: 12,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },
}

export const THEME_IDS = Object.keys(THEMES)

export function getTheme(id) {
  return THEMES[id] || THEMES.minimal
}

/**
 * Get the primary background color for a theme (for PDF full bleed)
 * @param {string} id - Theme ID
 * @returns {string} - Hex color string
 */
export function getThemeBackgroundColor(id) {
  const theme = getTheme(id)
  if (theme.background.type === 'solid') {
    return theme.background.color
  }
  // For gradients, return the first color
  return theme.background.colors[0]
}
