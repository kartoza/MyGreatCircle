# Eco Impact Tree Visualization Feature

**Date:** 2026-04-13
**Status:** Approved
**Author:** Claude (with user collaboration)

## Overview

Add an optional eco-awareness feature that visualizes the carbon footprint of a user's journey as the number of trees needed to offset the CO2 emissions. The feature is educational, playful, and informative without being guilt-inducing.

## User Story

**US-008: View Eco Impact**

As a user, I want to see the environmental impact of my journey so that I can understand my carbon footprint and optionally take action to offset it.

**Acceptance Criteria:**
- A toggle in the InsightsPanel enables/disables eco impact display
- When enabled, shows a forest grid visualization with tree icons
- Each tree icon represents one tree's yearly CO2 absorption capacity
- CO2 is calculated based on estimated transport mode (derived from distance)
- A subtle link to carbon offset services is provided
- Eco stats appear in PDF exports when enabled
- Feature persists in localStorage with other journey data

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tone | Educational neutral | Informative without guilt-tripping; "CO2 equivalent to X trees' yearly absorption" |
| Carbon calculation | Distance-based heuristic | Balances accuracy with simplicity; auto-detects transport mode |
| Toggle location | Inside InsightsPanel | Keeps eco-data grouped with other journey stats |
| Visualization | Forest grid | Visual impact; each icon = 1 tree; tangible representation |
| Scaling | Cap at 50 icons | Prevents visual overload; shows "+X more" for larger counts |
| Compact mode | 3x3 sample grid | Maintains visual identity in constrained space |
| Toggle style | Circular leaf icon button | Clean, minimal; glows green when active |
| Call-to-action | Offset link | Links to One Tree Planted or similar service |

## Technical Specification

### New Files

#### `web/src/lib/carbon.js`

Carbon calculation utilities.

**Constants:**
```javascript
const EMISSIONS_PER_KM = {
  car: 0.170,      // kg CO2 per km
  train: 0.100,    // blended train/car for medium distances
  flight: 0.255,   // average flight emissions
}

const CO2_PER_TREE_PER_YEAR = 21  // kg absorbed by one mature tree annually
```

**Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `detectTransportMode` | `(distanceKm: number) => 'car' \| 'train' \| 'flight'` | Returns transport mode based on distance thresholds |
| `calculateLegEmissions` | `(distanceKm: number) => number` | Returns CO2 in kg for a single leg |
| `calculateJourneyEmissions` | `(places: Place[]) => EcoStats` | Computes total emissions for entire journey |
| `treesToOffset` | `(co2Kg: number) => number` | Converts CO2 kg to number of trees |

**Transport Mode Thresholds:**
- Distance < 100km → car (170g CO2/km)
- Distance 100-800km → train/car blend (100g CO2/km)
- Distance > 800km → flight (255g CO2/km)

**Types:**
```typescript
interface EcoStats {
  totalCO2Kg: number;
  treeCount: number;
  legs: LegEmission[];
}

interface LegEmission {
  from: string;
  to: string;
  distanceKm: number;
  mode: 'car' | 'train' | 'flight';
  co2Kg: number;
}
```

#### `web/src/components/TreeGrid.jsx`

Visual forest grid component.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `treeCount` | number | required | Total trees to display |
| `co2Kg` | number | required | CO2 in kg for display text |
| `maxVisible` | number | 50 | Maximum individual tree icons |
| `compact` | boolean | false | If true, shows 3x3 sample |

**Rendering Behavior:**
- Trees per row: 10 (full mode), 3 (compact mode)
- Icons alternate between 🌲 and 🌳 for visual variety
- Partial final row: remaining slots rendered at 30% opacity
- Overflow: displays "+{n} more" text when treeCount > maxVisible
- Footer text: "{X.X} tonnes CO2 · {n} trees to offset"
- Offset link: "Offset your journey →" linking to https://onetreeplanted.org/products/plant-trees

### Modified Files

#### `web/src/components/InsightsPanel.jsx`

**New Props:**
| Prop | Type | Description |
|------|------|-------------|
| `ecoMode` | boolean | Whether eco impact is visible |
| `ecoStats` | EcoStats \| null | Calculated eco statistics |
| `onEcoToggle` | () => void | Callback to toggle eco mode |

**Changes:**
- Add toggle button (🌱 icon) in top-right corner
- Toggle styling: muted when off, green glow when on
- Conditionally render TreeGrid below existing stats when ecoMode=true
- Compact mode: shows 3x3 TreeGrid sample
- Full mode: shows full TreeGrid

#### `web/src/App.jsx`

**New State:**
```javascript
const [ecoMode, setEcoMode] = useState(false)
```

**New Computed Value:**
```javascript
const ecoStats = useMemo(() =>
  calculateJourneyEmissions(displayPlaces),
  [displayPlaces]
)
```

**Changes:**
- Import `calculateJourneyEmissions` from carbon.js
- Add `ecoMode` state
- Compute `ecoStats` from places
- Pass `ecoMode`, `ecoStats`, `onEcoToggle` to InsightsPanel
- Add `ecoMode` to localStorage persistence

#### `web/src/hooks/usePdfGeneration.js`

**Changes:**
- Accept `ecoMode` and `ecoStats` parameters
- Implement full bleed: fill entire page with theme background color before content
- If `ecoMode` is true, render TreeGrid in PDF output
- Fact Sheet: TreeGrid appears after stat cards, before place list
- Poster: Compact tree count + CO2 appears in footer bar

### PDF Full Bleed Implementation

Both Fact Sheet and Poster PDFs must have edge-to-edge bleed:

1. Set page margins to 0
2. Before any content, fill entire page with theme background:
   ```javascript
   const bgColor = getThemeBackground(theme)
   doc.setFillColor(bgColor)
   doc.rect(0, 0, pageWidth, pageHeight, 'F')
   ```
3. All content positioned with explicit coordinates (no margin offsets)
4. Theme background colors:
   - Minimal Dark: `#1a1a2e`
   - Vibrant Neon: `#0f0f23`
   - Vintage: `#f4f1ea`
   - Clean Modern: `#ffffff`

## Data Flow

```
places (state)
    │
    ├──► computeJourneyStats() ──► stats
    │
    └──► calculateJourneyEmissions() ──► ecoStats
                                              │
                    ┌─────────────────────────┼─────────────────┐
                    │                         │                 │
                    ▼                         ▼                 ▼
             InsightsPanel            PDF Generation      localStorage
             (TreeGrid)               (if ecoMode)        (persist)
```

## localStorage Schema Update

```javascript
{
  places: Place[],
  theme: string,
  inputText: string,
  ecoMode: boolean,      // NEW
  savedAt: string
}
```

## UI Mockups

### Compact Mode (Bottom Bar)
```
┌─────────────────────────────────────────────────────────────────┐
│  5        3        12.4k km    8.2k km    [🌱]                 │
│ Places  Countries  Distance   Longest     toggle               │
│                                                                 │
│  ┌─────────────────────────────────────────┐  (when enabled)   │
│  │ 🌲🌳🌲  47 trees · 1.0t CO₂             │                   │
│  │ 🌳🌲🌳  Offset your journey →           │                   │
│  │ 🌲🌳🌲                                  │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Full Mode (Panel/Drawer)
```
┌────────────────────────────────────────────────────────────────┐
│  Journey Stats                                          [🌱]  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 5        │  │ 3        │  │ 12.4k km │  │ 8.2k km  │       │
│  │ Places   │  │ Countries│  │ Distance │  │ Longest  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 🌲🌳🌲🌳🌲🌳🌲🌳🌲🌳                                     │  │
│  │ 🌲🌳🌲🌳🌲🌳🌲🌳🌲🌳                                     │  │
│  │ 🌲🌳🌲🌳🌲🌳🌲🌳🌲🌳                                     │  │
│  │ 🌲🌳🌲🌳🌲🌳🌲                                           │  │
│  │                                                          │  │
│  │ 1.0 tonnes CO₂ · 47 trees to offset                     │  │
│  │ Offset your journey →                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Toggle States
```
OFF: [🌱] - muted bg (#2d3748), 50% opacity
ON:  [🌱] - green gradient bg, glow effect, full opacity
```

## Testing Requirements

### Unit Tests (`web/src/lib/carbon.test.js`)

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Short distance → car | 50km | mode: 'car', ~8.5kg CO2 |
| Medium distance → train | 300km | mode: 'train', ~30kg CO2 |
| Long distance → flight | 5000km | mode: 'flight', ~1275kg CO2 |
| Tree calculation | 21kg CO2 | 1 tree |
| Tree calculation | 210kg CO2 | 10 trees |
| Empty places | [] | 0 CO2, 0 trees |
| Single place | [London] | 0 CO2, 0 trees (no legs) |

### Component Tests (`web/src/components/TreeGrid.test.jsx`)

- Renders correct number of tree icons (up to max)
- Shows "+N more" when count exceeds max
- Compact mode shows 3x3 grid
- Displays CO2 in tonnes format
- Offset link has correct href and target

### Integration Tests

- Toggle persists in localStorage
- Eco stats update when places change
- PDFs include/exclude eco stats based on ecoMode

## Implementation Order

1. Create `carbon.js` with calculation functions and tests
2. Create `TreeGrid.jsx` component
3. Modify `InsightsPanel.jsx` to add toggle and TreeGrid
4. Modify `App.jsx` to manage ecoMode state and compute ecoStats
5. Update localStorage persistence
6. Modify `usePdfGeneration.js` for full bleed and eco stats
7. End-to-end testing

## Future Enhancements

- Per-leg transport mode override (user can correct auto-detection)
- Historical comparison ("You traveled X% more/less than average")
- Gamification ("Plant your first tree!" achievement)
- Direct integration with offset providers (API-based donation)
- Shareable eco-impact cards for social media

## References

- CO2 per tree absorption: ~21kg/year (EPA, various forestry studies)
- Flight emissions: ~255g CO2/km (ICAO Carbon Calculator)
- Car emissions: ~170g CO2/km (EU average, includes manufacturing)
- Train emissions: ~40g CO2/km (varies by region/electricity source)
