import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import App from './App'

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
  },
  colors: {
    // Rich teal/cyan palette - premium, gallery-worthy
    brand: {
      50: '#e6fffa',
      100: '#b2f5ea',
      200: '#81e6d9',
      300: '#4fd1c5',
      400: '#38b2ac',
      500: '#319795',
      600: '#2c7a7b',
      700: '#285e61',
      800: '#234e52',
      900: '#1d4044',
    },
    // Accent gradient colors
    accent: {
      teal: '#14b8a6',
      cyan: '#06b6d4',
      blue: '#3b82f6',
      purple: '#8b5cf6',
      pink: '#ec4899',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        minHeight: '100vh',
      },
    },
  },
  components: {
    Button: {
      variants: {
        brand: {
          bg: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
          color: 'white',
          _hover: {
            bg: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 40px -10px rgba(20, 184, 166, 0.5)',
          },
          _active: {
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
)
