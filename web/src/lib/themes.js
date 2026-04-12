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
}

export const THEME_IDS = Object.keys(THEMES)

export function getTheme(id) {
  return THEMES[id] || THEMES.minimal
}
