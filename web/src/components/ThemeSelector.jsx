import { HStack, Button, Tooltip } from '@chakra-ui/react'
import { THEMES, THEME_IDS } from '../lib/themes'

export function ThemeSelector({ currentTheme, onThemeChange }) {
  return (
    <HStack spacing={2} wrap="wrap" justify="center">
      {THEME_IDS.map(themeId => {
        const theme = THEMES[themeId]
        const isSelected = currentTheme === themeId

        // Get preview color for button
        const previewColor = theme.background.type === 'gradient'
          ? theme.background.colors[0]
          : theme.background.color

        const textColor = ['vintage', 'modern'].includes(themeId)
          ? 'gray.800'
          : 'white'

        return (
          <Tooltip
            key={themeId}
            label={theme.description}
            placement="top"
          >
            <Button
              size="sm"
              bg={previewColor}
              color={textColor}
              border="2px solid"
              borderColor={isSelected ? 'brand.500' : 'transparent'}
              _hover={{
                transform: 'scale(1.05)',
                borderColor: 'brand.400',
              }}
              onClick={() => onThemeChange(themeId)}
            >
              {theme.name}
            </Button>
          </Tooltip>
        )
      })}
    </HStack>
  )
}
