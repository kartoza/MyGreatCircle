# Eco Impact Tree Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional eco-awareness feature that visualizes journey carbon footprint as trees needed to offset CO2 emissions.

**Architecture:** Create a `carbon.js` module for emissions calculations and a `TreeGrid.jsx` component for the forest visualization. Integrate these into `InsightsPanel` with a toggle, persist state, and add to PDF exports with full bleed backgrounds.

**Tech Stack:** React 18, Chakra UI, Vitest, jsPDF

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `web/src/lib/carbon.js` | Carbon emissions calculations, transport mode detection, tree equivalence |
| `web/src/lib/carbon.test.js` | Unit tests for carbon calculations |
| `web/src/components/TreeGrid.jsx` | Forest grid visualization component |

### Modified Files
| File | Changes |
|------|---------|
| `web/src/components/InsightsPanel.jsx` | Add eco toggle button, conditionally render TreeGrid |
| `web/src/App.jsx` | Add `ecoMode` state, compute `ecoStats`, update localStorage |
| `web/src/hooks/usePdfGeneration.js` | Full bleed backgrounds, eco stats in PDFs |
| `web/src/lib/themes.js` | Add helper to extract solid background color |

---

## Task 1: Create Carbon Calculation Module with Tests

**Files:**
- Create: `web/src/lib/carbon.js`
- Create: `web/src/lib/carbon.test.js`

- [ ] **Step 1.1: Write failing test for detectTransportMode**

Create `web/src/lib/carbon.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { detectTransportMode } from './carbon'

describe('detectTransportMode', () => {
  it('returns car for distances under 100km', () => {
    expect(detectTransportMode(50)).toBe('car')
    expect(detectTransportMode(99)).toBe('car')
  })

  it('returns train for distances 100-800km', () => {
    expect(detectTransportMode(100)).toBe('train')
    expect(detectTransportMode(500)).toBe('train')
    expect(detectTransportMode(800)).toBe('train')
  })

  it('returns flight for distances over 800km', () => {
    expect(detectTransportMode(801)).toBe('flight')
    expect(detectTransportMode(5000)).toBe('flight')
  })
})
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: FAIL with "cannot find module './carbon'"

- [ ] **Step 1.3: Write detectTransportMode implementation**

Create `web/src/lib/carbon.js`:

```javascript
/**
 * Carbon footprint calculation utilities
 * Estimates CO2 emissions based on travel distance and transport mode
 */

// CO2 emissions in kg per km by transport mode
export const EMISSIONS_PER_KM = {
  car: 0.170,     // kg CO2 per km (EU average)
  train: 0.100,   // blended train/car for medium distances
  flight: 0.255,  // average flight emissions
}

// kg of CO2 absorbed by one mature tree per year
export const CO2_PER_TREE_PER_YEAR = 21

/**
 * Detect likely transport mode based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {'car' | 'train' | 'flight'} - Estimated transport mode
 */
export function detectTransportMode(distanceKm) {
  if (distanceKm < 100) {
    return 'car'
  } else if (distanceKm <= 800) {
    return 'train'
  } else {
    return 'flight'
  }
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: PASS (3 tests)

- [ ] **Step 1.5: Write failing test for calculateLegEmissions**

Add to `web/src/lib/carbon.test.js`:

```javascript
import { detectTransportMode, calculateLegEmissions } from './carbon'

describe('calculateLegEmissions', () => {
  it('calculates car emissions for short distance', () => {
    // 50km * 0.170 kg/km = 8.5 kg
    expect(calculateLegEmissions(50)).toBeCloseTo(8.5, 1)
  })

  it('calculates train emissions for medium distance', () => {
    // 300km * 0.100 kg/km = 30 kg
    expect(calculateLegEmissions(300)).toBeCloseTo(30, 1)
  })

  it('calculates flight emissions for long distance', () => {
    // 5000km * 0.255 kg/km = 1275 kg
    expect(calculateLegEmissions(5000)).toBeCloseTo(1275, 1)
  })
})
```

- [ ] **Step 1.6: Run test to verify it fails**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: FAIL with "calculateLegEmissions is not exported"

- [ ] **Step 1.7: Write calculateLegEmissions implementation**

Add to `web/src/lib/carbon.js`:

```javascript
/**
 * Calculate CO2 emissions for a single journey leg
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} - CO2 emissions in kg
 */
export function calculateLegEmissions(distanceKm) {
  const mode = detectTransportMode(distanceKm)
  return distanceKm * EMISSIONS_PER_KM[mode]
}
```

- [ ] **Step 1.8: Run test to verify it passes**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: PASS (6 tests)

- [ ] **Step 1.9: Write failing test for treesToOffset**

Add to `web/src/lib/carbon.test.js`:

```javascript
import { detectTransportMode, calculateLegEmissions, treesToOffset } from './carbon'

describe('treesToOffset', () => {
  it('calculates 1 tree for 21kg CO2', () => {
    expect(treesToOffset(21)).toBe(1)
  })

  it('calculates 10 trees for 210kg CO2', () => {
    expect(treesToOffset(210)).toBe(10)
  })

  it('rounds up partial trees', () => {
    expect(treesToOffset(22)).toBe(2)
    expect(treesToOffset(1)).toBe(1)
  })

  it('returns 0 for 0 CO2', () => {
    expect(treesToOffset(0)).toBe(0)
  })
})
```

- [ ] **Step 1.10: Run test to verify it fails**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: FAIL with "treesToOffset is not exported"

- [ ] **Step 1.11: Write treesToOffset implementation**

Add to `web/src/lib/carbon.js`:

```javascript
/**
 * Calculate number of trees needed to offset CO2 emissions
 * @param {number} co2Kg - CO2 emissions in kg
 * @returns {number} - Number of trees (rounded up)
 */
export function treesToOffset(co2Kg) {
  if (co2Kg <= 0) return 0
  return Math.ceil(co2Kg / CO2_PER_TREE_PER_YEAR)
}
```

- [ ] **Step 1.12: Run test to verify it passes**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: PASS (10 tests)

- [ ] **Step 1.13: Write failing test for calculateJourneyEmissions**

Add to `web/src/lib/carbon.test.js`:

```javascript
import {
  detectTransportMode,
  calculateLegEmissions,
  treesToOffset,
  calculateJourneyEmissions,
} from './carbon'

describe('calculateJourneyEmissions', () => {
  it('calculates emissions for a multi-leg journey', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074] },
      { name: 'Paris', coordinates: [2.3522, 48.8566] },    // ~344km from London
      { name: 'Sydney', coordinates: [151.2093, -33.8688] }, // ~16,900km from Paris
    ]

    const result = calculateJourneyEmissions(places)

    expect(result.totalCO2Kg).toBeGreaterThan(4000) // Dominated by Paris→Sydney flight
    expect(result.treeCount).toBeGreaterThan(190)
    expect(result.legs).toHaveLength(2)
    expect(result.legs[0].from).toBe('London')
    expect(result.legs[0].to).toBe('Paris')
    expect(result.legs[1].from).toBe('Paris')
    expect(result.legs[1].to).toBe('Sydney')
  })

  it('returns zeros for empty places array', () => {
    const result = calculateJourneyEmissions([])

    expect(result.totalCO2Kg).toBe(0)
    expect(result.treeCount).toBe(0)
    expect(result.legs).toHaveLength(0)
  })

  it('returns zeros for single place', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074] },
    ]

    const result = calculateJourneyEmissions(places)

    expect(result.totalCO2Kg).toBe(0)
    expect(result.treeCount).toBe(0)
    expect(result.legs).toHaveLength(0)
  })

  it('handles places without coordinates', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074] },
      { name: 'Unknown', coordinates: null },
      { name: 'Paris', coordinates: [2.3522, 48.8566] },
    ]

    const result = calculateJourneyEmissions(places)

    // Should still calculate London→Paris leg
    expect(result.legs.length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 1.14: Run test to verify it fails**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: FAIL with "calculateJourneyEmissions is not exported"

- [ ] **Step 1.15: Write calculateJourneyEmissions implementation**

Add to `web/src/lib/carbon.js`:

```javascript
import { haversineDistance } from './geo'

/**
 * Calculate total CO2 emissions for an entire journey
 * @param {Array<{name: string, coordinates: [number, number] | null}>} places - Array of places
 * @returns {{totalCO2Kg: number, treeCount: number, legs: Array}} - Journey emissions data
 */
export function calculateJourneyEmissions(places) {
  const validPlaces = places.filter(p => p.coordinates)

  if (validPlaces.length < 2) {
    return { totalCO2Kg: 0, treeCount: 0, legs: [] }
  }

  const legs = []
  let totalCO2Kg = 0

  for (let i = 1; i < validPlaces.length; i++) {
    const from = validPlaces[i - 1]
    const to = validPlaces[i]
    const distanceKm = haversineDistance(from.coordinates, to.coordinates)
    const mode = detectTransportMode(distanceKm)
    const co2Kg = calculateLegEmissions(distanceKm)

    legs.push({
      from: from.name,
      to: to.name,
      distanceKm: Math.round(distanceKm),
      mode,
      co2Kg: Math.round(co2Kg),
    })

    totalCO2Kg += co2Kg
  }

  return {
    totalCO2Kg: Math.round(totalCO2Kg),
    treeCount: treesToOffset(totalCO2Kg),
    legs,
  }
}
```

- [ ] **Step 1.16: Run test to verify it passes**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- carbon.test.js`

Expected: PASS (14 tests)

- [ ] **Step 1.17: Run all tests to ensure nothing broke**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test`

Expected: All tests pass

- [ ] **Step 1.18: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/lib/carbon.js web/src/lib/carbon.test.js
git commit -m "feat: add carbon emissions calculation module

- detectTransportMode: auto-detect car/train/flight from distance
- calculateLegEmissions: compute CO2 for single journey leg
- treesToOffset: convert CO2 to tree count
- calculateJourneyEmissions: compute full journey emissions"
```

---

## Task 2: Create TreeGrid Component

**Files:**
- Create: `web/src/components/TreeGrid.jsx`

- [ ] **Step 2.1: Create TreeGrid component**

Create `web/src/components/TreeGrid.jsx`:

```javascript
import { Box, Text, VStack, Link, Wrap, WrapItem } from '@chakra-ui/react'

/**
 * Format CO2 in kg to tonnes with 1 decimal place
 */
function formatCO2(kg) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return `${kg}kg`
}

/**
 * Generate array of tree icons, alternating between two types
 */
function generateTreeIcons(count, maxVisible) {
  const visibleCount = Math.min(count, maxVisible)
  const icons = []

  for (let i = 0; i < visibleCount; i++) {
    icons.push(i % 2 === 0 ? '🌲' : '🌳')
  }

  return icons
}

/**
 * TreeGrid - Displays a forest grid visualization of trees needed to offset CO2
 *
 * @param {number} treeCount - Total number of trees to represent
 * @param {number} co2Kg - CO2 in kg for display text
 * @param {number} maxVisible - Maximum tree icons to show (default 50)
 * @param {boolean} compact - If true, shows 3x3 sample grid
 */
export function TreeGrid({ treeCount, co2Kg, maxVisible = 50, compact = false }) {
  if (treeCount === 0) {
    return null
  }

  const treesPerRow = compact ? 3 : 10
  const displayCount = compact ? Math.min(treeCount, 9) : Math.min(treeCount, maxVisible)
  const icons = generateTreeIcons(displayCount, maxVisible)
  const overflow = treeCount > maxVisible && !compact ? treeCount - maxVisible : 0

  // Calculate how many icons should be faded (partial row)
  const fullRows = Math.floor(displayCount / treesPerRow)
  const partialRowCount = displayCount % treesPerRow
  const fadedSlots = partialRowCount > 0 ? treesPerRow - partialRowCount : 0

  return (
    <VStack spacing={2} align="stretch" w="100%">
      {/* Tree grid */}
      <Box>
        <Wrap spacing={compact ? 1 : 0.5} justify={compact ? 'center' : 'flex-start'}>
          {icons.map((icon, i) => (
            <WrapItem key={i}>
              <Text fontSize={compact ? 'md' : 'sm'} lineHeight={1}>
                {icon}
              </Text>
            </WrapItem>
          ))}
          {/* Faded placeholder slots for partial row */}
          {!compact && fadedSlots > 0 && Array.from({ length: fadedSlots }).map((_, i) => (
            <WrapItem key={`faded-${i}`}>
              <Text fontSize="sm" lineHeight={1} opacity={0.3}>
                {i % 2 === 0 ? '🌲' : '🌳'}
              </Text>
            </WrapItem>
          ))}
        </Wrap>
      </Box>

      {/* Overflow indicator */}
      {overflow > 0 && (
        <Text fontSize="xs" color="gray.500" textAlign="center">
          +{overflow} more
        </Text>
      )}

      {/* Stats text */}
      <Text
        fontSize={compact ? 'xs' : 'sm'}
        color="gray.400"
        textAlign={compact ? 'center' : 'left'}
      >
        {formatCO2(co2Kg)} CO₂ · {treeCount} tree{treeCount !== 1 ? 's' : ''} to offset
      </Text>

      {/* Offset link */}
      {!compact && (
        <Link
          href="https://onetreeplanted.org/products/plant-trees"
          target="_blank"
          rel="noopener noreferrer"
          fontSize="sm"
          color="gray.500"
          _hover={{ color: 'teal.300' }}
        >
          Offset your journey →
        </Link>
      )}
    </VStack>
  )
}
```

- [ ] **Step 2.2: Verify component renders without errors**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm run dev`

Open browser, verify no console errors. (Component not yet used, just checking syntax.)

- [ ] **Step 2.3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/components/TreeGrid.jsx
git commit -m "feat: add TreeGrid component for forest visualization

- Displays tree icons in grid layout (10 per row, 3 in compact mode)
- Alternates between 🌲 and 🌳 for visual variety
- Shows faded placeholders for partial rows
- Includes CO2 stat and offset link"
```

---

## Task 3: Add Theme Background Helper

**Files:**
- Modify: `web/src/lib/themes.js`

- [ ] **Step 3.1: Add getThemeBackgroundColor function**

Add to `web/src/lib/themes.js` after the `getTheme` function:

```javascript
/**
 * Get the primary background color for a theme (for PDF fill)
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
```

- [ ] **Step 3.2: Run tests to ensure nothing broke**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test`

Expected: All tests pass

- [ ] **Step 3.3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/lib/themes.js
git commit -m "feat: add getThemeBackgroundColor helper for PDF full bleed"
```

---

## Task 4: Integrate Eco Toggle into InsightsPanel

**Files:**
- Modify: `web/src/components/InsightsPanel.jsx`

- [ ] **Step 4.1: Add imports and update component signature**

Replace the entire `web/src/components/InsightsPanel.jsx` with:

```javascript
import {
  SimpleGrid,
  HStack,
  Box,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  IconButton,
  Tooltip,
  Collapse,
} from '@chakra-ui/react'
import { TreeGrid } from './TreeGrid'

function formatDistance(km) {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`
  }
  return `${km} km`
}

// Compact stat for overlay mode
function CompactStat({ label, value, sub }) {
  return (
    <VStack spacing={0} align="center">
      <Text fontSize="2xl" fontWeight="bold" color="white" lineHeight="1">
        {value}
      </Text>
      <Text fontSize="xs" color="gray.400" textTransform="uppercase">
        {label}
      </Text>
    </VStack>
  )
}

// Eco toggle button
function EcoToggle({ isActive, onToggle }) {
  return (
    <Tooltip label={isActive ? 'Hide eco impact' : 'Show eco impact'}>
      <IconButton
        aria-label="Toggle eco impact"
        icon={<Text fontSize="lg">🌱</Text>}
        size="sm"
        variant="ghost"
        onClick={onToggle}
        bg={isActive ? 'green.600' : 'gray.700'}
        opacity={isActive ? 1 : 0.5}
        _hover={{
          bg: isActive ? 'green.500' : 'gray.600',
          opacity: 1,
        }}
        boxShadow={isActive ? '0 0 12px rgba(56, 161, 105, 0.4)' : 'none'}
        borderRadius="full"
      />
    </Tooltip>
  )
}

export function InsightsPanel({
  stats,
  compact = false,
  ecoMode = false,
  ecoStats = null,
  onEcoToggle = () => {},
}) {
  if (!stats || stats.totalPlaces === 0) {
    return null
  }

  // Compact mode for overlay
  if (compact) {
    return (
      <VStack spacing={3} align="stretch">
        <HStack spacing={8} justify="center" align="center">
          <CompactStat label="Places" value={stats.totalPlaces} />
          <CompactStat label="Countries" value={stats.countries.length} />
          <CompactStat label="Distance" value={formatDistance(stats.totalDistanceKm)} />
          {stats.longestLegKm > 0 && (
            <CompactStat label="Longest Move" value={formatDistance(stats.longestLegKm)} />
          )}
          <EcoToggle isActive={ecoMode} onToggle={onEcoToggle} />
        </HStack>

        <Collapse in={ecoMode} animateOpacity>
          {ecoStats && ecoStats.treeCount > 0 && (
            <Box
              mt={2}
              p={3}
              bg="blackAlpha.400"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="green.700"
            >
              <TreeGrid
                treeCount={ecoStats.treeCount}
                co2Kg={ecoStats.totalCO2Kg}
                compact={true}
              />
            </Box>
          )}
        </Collapse>
      </VStack>
    )
  }

  // Full mode
  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="wider">
          Journey Stats
        </Text>
        <EcoToggle isActive={ecoMode} onToggle={onEcoToggle} />
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat bg="gray.700" p={4} borderRadius="md">
          <StatLabel color="gray.400">Places</StatLabel>
          <StatNumber>{stats.totalPlaces}</StatNumber>
          <StatHelpText>called home</StatHelpText>
        </Stat>

        <Stat bg="gray.700" p={4} borderRadius="md">
          <StatLabel color="gray.400">Countries</StatLabel>
          <StatNumber>{stats.countries.length}</StatNumber>
          <StatHelpText>explored</StatHelpText>
        </Stat>

        <Stat bg="gray.700" p={4} borderRadius="md">
          <StatLabel color="gray.400">Total Journey</StatLabel>
          <StatNumber>{formatDistance(stats.totalDistanceKm)}</StatNumber>
          <StatHelpText>of life paths</StatHelpText>
        </Stat>

        {stats.longestLegKm > 0 && (
          <Stat bg="gray.700" p={4} borderRadius="md">
            <StatLabel color="gray.400">Longest Move</StatLabel>
            <StatNumber>{formatDistance(stats.longestLegKm)}</StatNumber>
            <StatHelpText>
              {stats.longestLegFrom} → {stats.longestLegTo}
            </StatHelpText>
          </Stat>
        )}

        {stats.yearsSpanned && (
          <Stat bg="gray.700" p={4} borderRadius="md">
            <StatLabel color="gray.400">Years Spanned</StatLabel>
            <StatNumber>{stats.yearsSpanned}</StatNumber>
            <StatHelpText>of memories</StatHelpText>
          </Stat>
        )}

        {stats.longestStay && (
          <Stat bg="gray.700" p={4} borderRadius="md">
            <StatLabel color="gray.400">Longest Stay</StatLabel>
            <StatNumber>{stats.longestStay.years} years</StatNumber>
            <StatHelpText>in {stats.longestStay.place}</StatHelpText>
          </Stat>
        )}
      </SimpleGrid>

      <Collapse in={ecoMode} animateOpacity>
        {ecoStats && ecoStats.treeCount > 0 && (
          <Box
            p={4}
            bg="gray.800"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="green.700"
          >
            <TreeGrid
              treeCount={ecoStats.treeCount}
              co2Kg={ecoStats.totalCO2Kg}
              compact={false}
            />
          </Box>
        )}
      </Collapse>
    </VStack>
  )
}
```

- [ ] **Step 4.2: Verify component renders without errors**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm run dev`

Open browser, verify InsightsPanel still renders (eco toggle won't work yet until App.jsx is updated).

- [ ] **Step 4.3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/components/InsightsPanel.jsx
git commit -m "feat: add eco toggle and TreeGrid to InsightsPanel

- Add EcoToggle button with leaf icon and glow effect
- Conditionally render TreeGrid when ecoMode is enabled
- Support both compact and full mode displays
- Use Collapse animation for smooth transitions"
```

---

## Task 5: Wire Up Eco State in App.jsx

**Files:**
- Modify: `web/src/App.jsx`

- [ ] **Step 5.1: Add imports for carbon module**

Add to the imports at the top of `web/src/App.jsx`:

```javascript
import { calculateJourneyEmissions } from './lib/carbon'
```

- [ ] **Step 5.2: Add ecoMode state**

After the existing state declarations (around line 62), add:

```javascript
const [ecoMode, setEcoMode] = useState(false)
```

- [ ] **Step 5.3: Add ecoStats computed value**

After the existing `stats` useMemo (around line 81), add:

```javascript
const ecoStats = useMemo(() => calculateJourneyEmissions(displayPlaces), [displayPlaces])
```

- [ ] **Step 5.4: Update localStorage save to include ecoMode**

Find the localStorage save useEffect and update it:

```javascript
// Auto-save to localStorage
useEffect(() => {
  if (places.length > 0) {
    localStorage.setItem('mygreatcircle-journey', JSON.stringify({
      places,
      theme,
      inputText,
      ecoMode,
      savedAt: new Date().toISOString(),
    }))
  }
}, [places, theme, inputText, ecoMode])
```

- [ ] **Step 5.5: Update localStorage restore to include ecoMode**

Find the localStorage restore useEffect and update it:

```javascript
// Restore from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('mygreatcircle-journey')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.places && data.places.length > 0) {
        setPlaces(data.places)
        setTheme(data.theme || 'minimal')
        setInputText(data.inputText || '')
        setEcoMode(data.ecoMode || false)
        setShowDemo(false)
        setShowWelcome(false)
        toast({
          title: 'Welcome back!',
          description: `Restored your journey with ${data.places.length} places.`,
          status: 'success',
          duration: 3000,
        })
      }
    } catch (e) {
      console.error('Failed to restore journey:', e)
    }
  }
}, [])
```

- [ ] **Step 5.6: Update InsightsPanel props in the bottom bar**

Find the InsightsPanel in the bottom bar section and update it:

```javascript
<InsightsPanel
  stats={stats}
  compact
  ecoMode={ecoMode}
  ecoStats={ecoStats}
  onEcoToggle={() => setEcoMode(!ecoMode)}
/>
```

- [ ] **Step 5.7: Update JSON export to include ecoMode**

Find `handleExportJSON` and update the data object:

```javascript
const handleExportJSON = () => {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    theme,
    ecoMode,
    places: places.map(p => ({
      name: p.name,
      rawInput: p.rawInput,
      yearStart: p.yearStart,
      yearEnd: p.yearEnd,
      coordinates: p.coordinates,
      geocodedName: p.geocodedName,
    })),
  }
  // ... rest of function unchanged
```

- [ ] **Step 5.8: Update JSON import to include ecoMode**

Find `handleImportJSON` and update:

```javascript
const handleImportJSON = (event) => {
  // ... file reading code unchanged ...
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (data.places && Array.isArray(data.places)) {
        const restoredPlaces = data.places.map((p, i) => ({
          ...p,
          id: p.id || `imported-${i}`,
          confidence: p.confidence || 'high',
        }))
        setPlaces(restoredPlaces)
        setTheme(data.theme || 'minimal')
        setEcoMode(data.ecoMode || false)
        setShowDemo(false)
        setShowWelcome(false)
        // ... toast unchanged
      }
    } catch (error) {
      // ... error handling unchanged
    }
  }
  // ... rest unchanged
```

- [ ] **Step 5.9: Verify the feature works end-to-end**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm run dev`

1. Enter some places spanning multiple continents
2. Click the 🌱 toggle in the bottom stats bar
3. Verify the forest grid appears with correct tree count
4. Refresh the page and verify ecoMode state persists

- [ ] **Step 5.10: Run all tests**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test`

Expected: All tests pass

- [ ] **Step 5.11: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/App.jsx
git commit -m "feat: integrate eco impact state into App.jsx

- Add ecoMode state and ecoStats computed value
- Persist ecoMode in localStorage
- Pass eco props to InsightsPanel
- Include ecoMode in JSON export/import"
```

---

## Task 6: Add Full Bleed and Eco Stats to PDFs

**Files:**
- Modify: `web/src/hooks/usePdfGeneration.js`

- [ ] **Step 6.1: Add import for theme helper**

Add to imports at top of `web/src/hooks/usePdfGeneration.js`:

```javascript
import { getThemeBackgroundColor } from '../lib/themes'
```

- [ ] **Step 6.2: Add helper to convert hex to RGB**

Add after the imports, before the `usePdfGeneration` function:

```javascript
/**
 * Convert hex color to RGB array for jsPDF
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : [255, 255, 255]
}

/**
 * Format CO2 for PDF display
 */
function formatCO2ForPdf(kg) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return `${kg}kg`
}
```

- [ ] **Step 6.3: Update generateFactSheet signature and add full bleed**

Update the `generateFactSheet` function to accept ecoMode and ecoStats, and add full bleed:

```javascript
/**
 * Generate fact sheet PDF (A4 portrait)
 */
const generateFactSheet = useCallback(async (svgElement, places, stats, theme, ecoMode = false, ecoStats = null) => {
  setIsGenerating(true)

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = 210
    const pageHeight = 297

    // Full bleed background
    const bgColor = getThemeBackgroundColor(theme)
    const [r, g, b] = hexToRgb(bgColor)
    pdf.setFillColor(r, g, b)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')

    // Determine text color based on background brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    const textColor = brightness > 128 ? [30, 30, 30] : [255, 255, 255]
    const mutedColor = brightness > 128 ? [100, 100, 100] : [160, 160, 160]

    const margin = 15

    // Title
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...textColor)
    pdf.text('MyGreatCircle', pageWidth / 2, 25, { align: 'center' })

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...mutedColor)
    pdf.text('Your Life in Places', pageWidth / 2, 33, { align: 'center' })

    // Map visualization
    if (svgElement) {
      const svgClone = svgElement.cloneNode(true)
      const mapWidth = pageWidth - (margin * 2)
      const mapHeight = 100

      await pdf.svg(svgClone, {
        x: margin,
        y: 45,
        width: mapWidth,
        height: mapHeight,
      })
    }

    // Stats section
    const statsY = 155
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')

    const statsData = [
      { label: 'Places', value: stats.totalPlaces.toString(), sub: 'called home' },
      { label: 'Countries', value: stats.countries.length.toString(), sub: 'explored' },
      { label: 'Total Journey', value: `${Math.round(stats.totalDistanceKm).toLocaleString()} km`, sub: 'of life paths' },
      { label: 'Longest Move', value: `${Math.round(stats.longestLegKm).toLocaleString()} km`, sub: stats.longestLegFrom ? `${stats.longestLegFrom} → ${stats.longestLegTo}` : '' },
    ]

    const statWidth = (pageWidth - margin * 2) / 2
    statsData.forEach((stat, i) => {
      const x = margin + (i % 2) * statWidth
      const y = statsY + Math.floor(i / 2) * 30

      pdf.setFontSize(10)
      pdf.setTextColor(...mutedColor)
      pdf.text(stat.label, x, y)

      pdf.setFontSize(18)
      pdf.setTextColor(...textColor)
      pdf.setFont('helvetica', 'bold')
      pdf.text(stat.value, x, y + 8)

      pdf.setFontSize(8)
      pdf.setTextColor(...mutedColor)
      pdf.setFont('helvetica', 'normal')
      pdf.text(stat.sub, x, y + 14)
    })

    // Eco stats section (if enabled)
    let ecoEndY = statsY + 60
    if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
      const ecoY = statsY + 65

      // Tree icons (simplified for PDF - just show count with emoji representation)
      const treeLine = '🌲🌳'.repeat(Math.min(10, Math.ceil(ecoStats.treeCount / 5)))
      pdf.setFontSize(14)
      pdf.text(treeLine, margin, ecoY)

      // Eco text
      pdf.setFontSize(11)
      pdf.setTextColor(...mutedColor)
      pdf.text(
        `${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO₂ · ${ecoStats.treeCount} trees to offset`,
        margin,
        ecoY + 8
      )

      pdf.setFontSize(9)
      pdf.text('onetreeplanted.org', margin, ecoY + 14)

      ecoEndY = ecoY + 20
    }

    // Places list
    const listY = ecoEndY + 10
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...textColor)
    pdf.text('Your Places:', margin, listY)

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...textColor)
    places.forEach((place, i) => {
      const y = listY + 8 + (i * 6)
      if (y < pageHeight - 25) {
        let text = `• ${place.name}`
        if (place.yearStart) {
          text += ` (${place.yearStart}${place.yearEnd ? `-${place.yearEnd}` : ''})`
        }
        pdf.text(text, margin, y)
      }
    })

    // Footer with Kartoza branding
    const footerY = pageHeight - 12
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')

    pdf.setTextColor(20, 184, 166)
    pdf.text('Made with', margin, footerY)
    pdf.setTextColor(239, 68, 68)
    pdf.text(' ♥ ', margin + 22, footerY)
    pdf.setTextColor(20, 184, 166)
    pdf.text('by Kartoza', margin + 26, footerY)

    pdf.setTextColor(...mutedColor)
    pdf.setFontSize(8)
    pdf.text('kartoza.com', margin, footerY + 5)
    pdf.text('mygreatcircle.com', pageWidth - margin, footerY, { align: 'right' })

    pdf.save('my-journey-factsheet.pdf')
  } finally {
    setIsGenerating(false)
  }
}, [])
```

- [ ] **Step 6.4: Update generatePoster signature and add full bleed**

Update the `generatePoster` function:

```javascript
/**
 * Generate poster PDF (A3 landscape)
 */
const generatePoster = useCallback(async (svgElement, places, theme, ecoMode = false, ecoStats = null) => {
  setIsGenerating(true)

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
    })

    const pageWidth = 420
    const pageHeight = 297

    // Full bleed background
    const bgColor = getThemeBackgroundColor(theme)
    const [r, g, b] = hexToRgb(bgColor)
    pdf.setFillColor(r, g, b)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')

    // Determine text color based on background brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    const textColor = brightness > 128 ? [80, 80, 80] : [200, 200, 200]

    // Full-bleed map (no margin for true full bleed effect)
    if (svgElement) {
      const svgClone = svgElement.cloneNode(true)

      await pdf.svg(svgClone, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight - 25,
      })
    }

    // Bottom bar
    const footerY = pageHeight - 18
    pdf.setFontSize(10)
    pdf.setTextColor(...textColor)

    const placeNames = places.map(p => p.name).join(' → ')
    let footerText = placeNames.length > 60 ? placeNames.slice(0, 60) + '...' : placeNames

    // Add eco stats to footer if enabled
    if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
      footerText += `    🌲×${ecoStats.treeCount}  ${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO₂`
    }

    pdf.text(footerText, 10, footerY)

    // Kartoza branding on bottom right
    const brandY = pageHeight - 10
    pdf.setFontSize(9)
    pdf.setTextColor(20, 184, 166)
    pdf.text('Made with', pageWidth - 95, brandY)
    pdf.setTextColor(239, 68, 68)
    pdf.text(' ♥ ', pageWidth - 73, brandY)
    pdf.setTextColor(20, 184, 166)
    pdf.text('by Kartoza', pageWidth - 69, brandY)
    pdf.setTextColor(...textColor)
    pdf.setFontSize(8)
    pdf.text('kartoza.com | mygreatcircle.com', pageWidth - 10, brandY + 5, { align: 'right' })

    pdf.save('my-journey-poster.pdf')
  } finally {
    setIsGenerating(false)
  }
}, [])
```

- [ ] **Step 6.5: Test PDF generation with different themes**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm run dev`

1. Enter places, enable eco mode
2. Switch to each theme and download the fact sheet
3. Verify full bleed background matches theme
4. Verify eco stats appear in PDF when eco mode is on

- [ ] **Step 6.6: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/hooks/usePdfGeneration.js
git commit -m "feat: add full bleed backgrounds and eco stats to PDFs

- Fill entire page with theme background color
- Adjust text colors based on background brightness
- Add eco stats section to fact sheet when enabled
- Add tree count to poster footer when enabled"
```

---

## Task 7: Update App.jsx to Pass Eco Props to PDF Generation

**Files:**
- Modify: `web/src/App.jsx`

- [ ] **Step 7.1: Update handleDownloadFactSheet**

Find `handleDownloadFactSheet` and update:

```javascript
const handleDownloadFactSheet = async () => {
  await generateFactSheet(svgRef.current, displayPlaces, stats, theme, ecoMode, ecoStats)
}
```

- [ ] **Step 7.2: Update handleDownloadPoster**

Find `handleDownloadPoster` and update:

```javascript
const handleDownloadPoster = async () => {
  await generatePoster(svgRef.current, displayPlaces, theme, ecoMode, ecoStats)
}
```

- [ ] **Step 7.3: Test complete flow**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm run dev`

1. Enter places spanning multiple continents
2. Enable eco mode with the toggle
3. Download fact sheet - verify eco stats appear
4. Disable eco mode
5. Download fact sheet - verify eco stats do NOT appear
6. Test with different themes

- [ ] **Step 7.4: Run all tests**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test`

Expected: All tests pass

- [ ] **Step 7.5: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add web/src/App.jsx
git commit -m "feat: pass eco state to PDF generation functions"
```

---

## Task 8: Update Documentation

**Files:**
- Modify: `SPECIFICATION.md`

- [ ] **Step 8.1: Add US-008 user story to SPECIFICATION.md**

Add after US-007 in the User Stories section:

```markdown
### US-008: View Eco Impact
As a user, I want to see the environmental impact of my journey so that I can understand my carbon footprint and optionally take action to offset it.

**Acceptance Criteria:**
- A toggle (🌱 icon) in the InsightsPanel enables/disables eco impact display
- When enabled, shows a forest grid visualization with tree icons
- Each tree icon represents one tree's yearly CO2 absorption capacity (~21kg CO2)
- CO2 is calculated based on estimated transport mode (car <100km, train 100-800km, flight >800km)
- A link to One Tree Planted offset service is provided
- Eco stats appear in PDF exports when enabled
- Feature persists in localStorage with other journey data
```

- [ ] **Step 8.2: Update Data Model section**

Add after the existing interfaces:

```markdown
interface EcoStats {
  totalCO2Kg: number;           // Total journey CO2 emissions in kg
  treeCount: number;            // Trees needed to offset
  legs: LegEmission[];          // Per-leg breakdown
}

interface LegEmission {
  from: string;
  to: string;
  distanceKm: number;
  mode: 'car' | 'train' | 'flight';
  co2Kg: number;
}
```

- [ ] **Step 8.3: Update Project Structure**

Add to the file listing:

```markdown
│   │   │   ├── carbon.js               # CO2 emissions calculations
│   │   │   ├── carbon.test.js          # Carbon calculation tests
│   │   ├── components/
│   │   │   ├── TreeGrid.jsx            # Forest grid eco visualization
```

- [ ] **Step 8.4: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git add SPECIFICATION.md
git commit -m "docs: add eco impact feature to specification"
```

---

## Task 9: Final Verification

- [ ] **Step 9.1: Run all tests**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm test`

Expected: All tests pass

- [ ] **Step 9.2: Run linter**

Run: `cd /home/timlinux/dev/go/MyGreatCircle/web && npm run lint`

Expected: No errors (warnings acceptable)

- [ ] **Step 9.3: Manual end-to-end test**

Run: `cd /home/timlinux/dev/go/MyGreatCircle && make dev`

Test checklist:
- [ ] Enter places: London, Cape Town, Sydney, Tokyo
- [ ] Verify journey renders on map
- [ ] Click eco toggle (🌱) in bottom stats bar
- [ ] Verify tree grid appears with reasonable count (~200+ trees)
- [ ] Verify CO2 displayed in tonnes format
- [ ] Verify "Offset your journey →" link works
- [ ] Download fact sheet - verify full bleed and eco stats
- [ ] Switch to Vintage theme - verify light background in PDF
- [ ] Disable eco mode - verify PDF excludes eco stats
- [ ] Refresh page - verify eco mode state persists
- [ ] Export JSON - verify ecoMode field present
- [ ] Clear and import JSON - verify ecoMode restored

- [ ] **Step 9.4: Commit any fixes needed**

If any issues found, fix and commit with appropriate message.

- [ ] **Step 9.5: Final commit to increment version**

Update version in `web/package.json` from `0.1.0` to `0.2.0`:

```bash
cd /home/timlinux/dev/go/MyGreatCircle
# Edit web/package.json to change version to 0.2.0
git add web/package.json
git commit -m "chore: bump version to 0.2.0 for eco impact feature"
```

---

## Summary

This plan implements the eco impact tree visualization feature in 9 tasks:

1. **Carbon module** - Core calculation logic with tests
2. **TreeGrid component** - Visual forest grid
3. **Theme helper** - Background color extraction for PDFs
4. **InsightsPanel integration** - Toggle and conditional display
5. **App.jsx state** - ecoMode state and persistence
6. **PDF generation** - Full bleed and eco stats
7. **PDF prop wiring** - Connect eco state to PDF functions
8. **Documentation** - Update SPECIFICATION.md
9. **Final verification** - Tests and manual QA

Total estimated steps: ~45 bite-sized actions with frequent commits.
