import { HStack, Box, Tooltip, Text } from '@chakra-ui/react'
import { THEMES, THEME_IDS } from '../lib/themes'

export function ThemeSelector({ currentTheme, onThemeChange }) {
  return (
    <HStack spacing={1}>
      <Text fontSize="xs" color="gray.400" mr={2}>
        Theme:
      </Text>
      {THEME_IDS.map(themeId => {
        const theme = THEMES[themeId]
        const isSelected = currentTheme === themeId

        // Get preview color for swatch
        const previewColor = theme.background.type === 'gradient'
          ? theme.background.colors[0]
          : theme.background.color

        // Get arc color for the inner ring
        const arcColor = theme.arc.stroke.startsWith('url')
          ? (theme.arcGradient?.colors?.[0] || '#ffffff') // Use first gradient color
          : theme.arc.stroke

        return (
          <Tooltip
            key={themeId}
            label={`${theme.name}: ${theme.description}`}
            placement="bottom"
            hasArrow
            bg="gray.800"
          >
            <Box
              as="button"
              w="28px"
              h="28px"
              borderRadius="full"
              bg={previewColor}
              border="3px solid"
              borderColor={isSelected ? 'teal.400' : 'transparent'}
              position="relative"
              transition="all 0.2s"
              _hover={{
                transform: 'scale(1.15)',
                borderColor: isSelected ? 'teal.400' : 'whiteAlpha.400',
              }}
              onClick={() => onThemeChange(themeId)}
              overflow="hidden"
            >
              {/* Inner arc color indicator */}
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w="10px"
                h="10px"
                borderRadius="full"
                bg={arcColor}
                opacity={0.9}
              />
            </Box>
          </Tooltip>
        )
      })}
    </HStack>
  )
}
