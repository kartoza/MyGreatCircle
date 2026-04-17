# MyGreatCircle Specification

## Overview

MyGreatCircle is a web application that visualizes personal location history as beautiful great circle arcs on a world map. Users enter a list of places they've lived, worked, or visited, and instantly receive stunning visualizations showing their life journey connected by geodesic paths across the globe.

The application requires no account, no database, and generates all outputs instantly in the browser. The name references the great circle paths that connect places on a sphere—the shortest distance between two points on Earth, rendered as elegant curved arcs.

## User Stories

### US-001: Enter Places
As a user, I want to enter a list of places I've lived or visited so that I can visualize my life journey.

**Acceptance Criteria:**
- A text area accepts multiple lines, one place per line
- Places can optionally include year or year range (e.g., "London 1990-1995")
- Places are geocoded automatically upon submission
- Ambiguous places show alternatives for user selection
- Original text is preserved if user wants to edit the list

### US-002: View Visualization
As a user, I want to see my places connected by great circle arcs so that I can appreciate my life's geographic journey visually.

**Acceptance Criteria:**
- Map displays with selected visual theme
- Great circles connect places in sequence
- Place markers are visible at each location
- Four themes available: Minimal Dark, Vibrant Neon, Vintage, Clean Modern
- Theme switching is instant without re-rendering data
- Map is responsive on mobile and desktop

### US-003: View Insights
As a user, I want to see statistics about my journey so that I can understand my travel patterns.

**Acceptance Criteria:**
- Total places count displayed
- Unique countries count displayed
- Total journey distance in kilometers
- Longest single move highlighted with place names
- Optional: time-based statistics if dates are provided
- Statistics update when theme changes or places are refined

### US-004: Download Fact Sheet
As a user, I want to download a PDF fact sheet so that I can share or print my journey summary.

**Acceptance Criteria:**
- A4 portrait PDF generated
- Contains map visualization, stats, and place list
- Subtle watermark "mygreatcircle.com" in footer
- Downloads immediately without account
- PDF is vector-based for crisp printing

### US-005: Download Poster
As a user, I want to download a print-ready poster so that I can display my journey on a wall.

**Acceptance Criteria:**
- A3 landscape PDF generated
- Full-bleed map visualization as hero element
- Place sequence displayed in footer
- Watermark "mygreatcircle.com" in corner
- Downloads immediately without account
- PDF is vector-based for crisp printing

### US-006: Edit Journey
As a user, I want to edit my place list after seeing the visualization so that I can refine incorrect geocoding or add missing places.

**Acceptance Criteria:**
- "Edit List" button returns to input state with text preserved
- Original text formatting is maintained
- User can modify, add, or remove places
- Re-submission triggers fresh geocoding

### US-007: Resolve Ambiguous Places
As a user, I want to select correct alternatives when a place name is ambiguous so that my visualization is accurate.

**Acceptance Criteria:**
- Low-confidence geocodes show a warning indicator
- Clicking a place reveals alternative matching locations
- User can select the correct match
- Selection updates the visualization immediately

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

## Technical Requirements

### TR-001: Geocoding

#### Three-Tier Caching Architecture
The geocoding system uses a 3-tier caching strategy to minimize Nominatim API calls and share results across users:

1. **Tier 1: Browser localStorage** (exact match)
   - First lookup, instant response
   - Persists across browser sessions
   - Versioned to allow cache invalidation

2. **Tier 2: Server SQLite cache** (fuzzy match)
   - Batch lookup via `POST /api/places/lookup`
   - Uses Levenshtein distance (max 3) for typo tolerance
   - Prefix-based candidate filtering for performance
   - Shared across all users

3. **Tier 3: Nominatim API** (client-side, rate-limited)
   - Direct browser-to-Nominatim requests
   - Rate limited to 1 request per 1.1 seconds
   - Results submitted back to server for shared caching

#### Data Flow
1. User enters places
2. Check localStorage for exact matches
3. Batch lookup unresolved places from server (`POST /api/places/lookup`)
4. Query Nominatim directly for remaining places (sequential, rate-limited)
5. Cache results in localStorage
6. Submit newly resolved places to server (`POST /api/places/submit`)

#### Attribution Requirements
Nominatim and OpenStreetMap attribution must be displayed in:
- Web UI footer (both compact and full versions)
- PDF fact sheet footer
- PDF poster footer
- README documentation

Attribution text: "Geocoding by Nominatim · Map data © OpenStreetMap contributors"

### TR-002: Client-Side Processing
- Visualization rendered with D3.js
- PDF generation with jsPDF + svg2pdf.js
- No server-side processing for PDFs
- All computation happens in the browser
- Generate unique IDs using UUID for place tracking

### TR-003: Stateless Architecture
- No user accounts required for MVP
- No database for MVP (future enhancement)
- Session data lives only in browser
- All state managed client-side with React hooks
- Shareable URLs possible via future enhancement

### TR-004: Responsive Design
- Layout works on mobile, tablet, and desktop
- Header pinned to top, footer to bottom
- Main content scrolls or pages as needed
- Touch-friendly interface for mobile

### TR-005: Performance
- Page load and initial interaction < 1 second
- Geocoding requests batched where possible
- Cache hits should return instantly
- PDF generation completes in < 5 seconds

### TR-006: Accessibility
- Semantic HTML structure
- Color contrast meets WCAG AA standards
- Keyboard navigation support
- Alt text for all meaningful images

## Data Model

### Client-Side Types

```typescript
interface Place {
  id: string;                      // Generated UUID
  rawInput: string;                // Original user text
  name: string;                    // Parsed place name
  yearStart?: number;              // Optional start year
  yearEnd?: number;                // Optional end year
  coordinates: [number, number];   // [longitude, latitude]
  confidence: 'high' | 'low';      // Geocoding confidence
  alternatives?: GeocodingResult[];// Other possible matches
}

interface Journey {
  places: Place[];
  theme: 'minimal' | 'neon' | 'vintage' | 'modern';
}

interface Insights {
  totalPlaces: number;
  countries: string[];
  totalDistanceKm: number;
  longestLegKm: number;
  longestLegFrom: string;
  longestLegTo: string;
  yearsSpanned?: number;
  longestStay?: { place: string; years: number };
}

interface GeocodingResult {
  name: string;
  lat: number;
  lng: number;
  confidence: 'high' | 'low';
  boundingbox?: [number, number, number, number];
}

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

## API Specification

### Health Endpoint

```
GET /api/health

Response:
{
  "status": "ok"
}
```

### Places Lookup Endpoint

Batch fuzzy lookup of places from the server-side cache.

```
POST /api/places/lookup

Request:
{
  "queries": ["Cape Town", "Johannesburg", "Durban"]
}

Response:
{
  "resolved": {
    "cape town": {
      "displayName": "Cape Town, Western Cape, South Africa",
      "lat": -33.9249,
      "lng": 18.4241
    },
    "johannesburg": {
      "displayName": "Johannesburg, Gauteng, South Africa",
      "lat": -26.2041,
      "lng": 28.0473
    }
  },
  "unresolved": ["durban"]
}
```

### Places Submit Endpoint

Submit newly geocoded places to the shared server cache.

```
POST /api/places/submit

Request:
{
  "places": [
    {
      "query": "Durban",
      "displayName": "Durban, KwaZulu-Natal, South Africa",
      "lat": -29.8587,
      "lng": 31.0218,
      "importance": 0.75
    }
  ]
}

Response:
{
  "saved": 1
}
```

### Future API Endpoints

Reserved for future implementation under `/api/v1/`:
- User accounts and journey persistence
- Journey sharing with short URLs
- Analytics and usage tracking

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  React + Chakra UI                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Place Input │→ │ Map Preview │→ │ PDF Generation          │  │
│  │ (textarea)  │  │ (D3.js SVG) │  │ (jsPDF + svg2pdf.js)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│       ↓                                        ↓                   │
│   Input Parser         D3 Visualization   SVG → PDF              │
│   Place matching       Theme rendering    Client-side            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ /api/geocode
┌─────────────────────────────────────────────────────────────────┐
│                         Go Backend                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Static File │  │ Geocode     │  │ Future API              │  │
│  │ Server      │  │ Proxy+Cache │  │ Endpoints               │  │
│  │ (Vite dist) │  │ (Nominatim) │  │ (accounts, sharing)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (rate-limited, cached)
                       ┌─────────────┐
                       │ Nominatim   │
                       │ (external)  │
                       └─────────────┘
```

### Key Characteristics
- Stateless (no database for MVP)
- No user accounts
- Client-side rendering and PDF generation
- Backend is thin: static files + geocoding proxy with caching

## Project Structure

```
MyGreatCircle/
├── .github/
│   └── workflows/
│       ├── test.yml                  # Go tests + lint on PR
│       ├── build.yml                 # Multi-platform build verification
│       └── release.yml               # Tagged releases → packages
├── cmd/
│   └── mygreatcircle/
│       └── main.go                   # Entry point, CLI flags
├── internal/
│   ├── api/
│   │   ├── server.go                 # HTTP server setup, routing
│   │   ├── handlers.go               # Health check endpoint
│   │   ├── places.go                 # Places lookup/submit endpoints
│   │   └── places_test.go            # Places API tests
│   └── db/
│       ├── repository.go             # PlaceRepository interface
│       ├── sqlite.go                 # SQLite implementation with fuzzy matching
│       └── db_test.go                # Database tests
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PlaceInput.jsx        # Text input with parser
│   │   │   ├── MapVisualization.jsx  # D3.js visualization
│   │   │   ├── ThemeSelector.jsx     # Theme toggle
│   │   │   ├── PlaceList.jsx         # Place list with alternatives
│   │   │   ├── InsightsPanel.jsx     # Journey statistics
│   │   │   ├── OutputCards.jsx       # PDF download cards
│   │   │   ├── EmailModal.jsx        # Email capture for poster
│   │   │   ├── TreeGrid.jsx          # Forest grid eco visualization
│   │   │   └── Footer.jsx            # Branding footer
│   │   ├── hooks/
│   │   │   ├── useGeocoding.js       # Geocoding API integration
│   │   │   └── usePdfGeneration.js   # PDF generation logic
│   │   ├── lib/
│   │   │   ├── parser.js             # Parse place input text
│   │   │   ├── themes.js             # Visual theme definitions
│   │   │   ├── geo.js                # Great circle math, distance, insights
│   │   │   ├── carbon.js             # CO2 emissions calculations
│   │   │   ├── carbon.test.js        # Carbon calculation tests
│   │   │   ├── nominatim.js          # Client-side Nominatim with rate limiting
│   │   │   ├── nominatim.test.js     # Nominatim module tests
│   │   │   ├── wordcloud.js          # Word cloud positioning algorithm
│   │   │   ├── wordcloud.test.js     # Word cloud tests
│   │   │   └── topo/world.json       # World map TopoJSON
│   │   ├── App.jsx                   # Main app component, state management
│   │   └── main.jsx                  # React entry point
│   ├── public/
│   │   └── favicon.ico
│   ├── dist/                         # Built frontend (Vite)
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── docs/
│   ├── mkdocs.yml                    # MkDocs configuration
│   └── docs/
│       ├── index.md                  # User guide
│       ├── developer.md              # Developer guide
│       ├── architecture.md           # Architecture details
│       └── api.md                    # API documentation
├── scripts/
│   └── build-packages.sh             # Release packaging script
├── flake.nix                         # Nix dev environment
├── flake.lock
├── Makefile                          # Development tasks
├── .pre-commit-config.yaml           # Code quality checks
├── .exrc                             # Neovim key mappings
├── .nvim.lua                         # Neovim config
├── SPECIFICATION.md                  # This file
├── PACKAGES.md                       # Package documentation
├── README.md                         # Project overview
└── go.mod                            # Go module definition
```

## Visualization Details

### D3 Projection and Rendering

- **Projection:** Equal Earth (`d3.geoEqualEarth()`)
- **Great circles:** `d3.geoInterpolate()` for geodesic paths
- **Rendering hierarchy:**
  1. Background (theme-specific gradient or solid)
  2. Land masses (subtle, de-emphasized)
  3. Great circle arcs (hero element, prominent)
  4. Place markers (dots at each location)
  5. Labels (optional, theme-dependent)

### Theme Specifications

| Theme | Background | Land | Arcs | Points |
|-------|------------|------|------|--------|
| **Minimal Dark** | `#1a1a2e` → `#16213e` | `rgba(255,255,255,0.05)` | White, 1px, 60% opacity | White dots |
| **Vibrant Neon** | `#0f0f23` | `rgba(255,255,255,0.08)` | Rainbow gradient + glow filter | Colored + glow |
| **Vintage** | `#f4f1ea` (paper) | `#e8e0d0` with stroke | Sepia dashed `#5c4033` | Terracotta `#b85c38` |
| **Clean Modern** | `#ffffff` → `#f8fafc` | `#e2e8f0` | Solid blue `#3b82f6` | Blue dots |

## PDF Generation

### Technology
- **Library:** jsPDF + svg2pdf.js
- **Execution:** Client-side (browser)
- **Output:** Vector PDFs (crisp at any print size)

### Fact Sheet (A4 Portrait)

```
┌────────────────────────────────────────┐
│  MyGreatCircle                         │
│  "Your Life in Places"                 │
├────────────────────────────────────────┤
│ Paris                                  │
│         [Map Visualization]      Tokyo │
│         (40% of page height)           │
│ London                          Berlin │
├────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │ X Places     │  │ Y Countries  │   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ N km total   │  │ M km longest │   │
│  └──────────────┘  └──────────────┘   │
├────────────────────────────────────────┤
│  Made with ♥ by Kartoza               │
│  Geocoding by Nominatim · © OSM       │
│  mygreatcircle.com                     │
└────────────────────────────────────────┘
```

Place names appear as a word cloud in the margins around the map (gray text, equal size, random placement) rather than a bullet list.

### Poster (A3 Landscape)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                  [Full-bleed Map Visualization]              │
│                  (Great circles as hero, 85% of area)        │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Place 1 → Place 2 → Place 3 → ...          mygreatcircle.com│
└──────────────────────────────────────────────────────────────┘
```

## Development Tooling

### Nix Flake
Provides reproducible development environment with:
- Go 1.22+, Node.js 22, golangci-lint, gopls
- `nix develop` enters the dev environment
- All dependencies managed via Nix

### Makefile Targets
- `make dev` - Start backend + frontend dev servers
- `make build` - Production binary with embedded web assets
- `make test` - Run Go tests
- `make lint` - Run linters
- `make web-dev` - Frontend dev server only
- `make web-build` - Build frontend for production

### Pre-commit Hooks
- Go: `go fmt`, `go vet`, `golangci-lint`
- JavaScript/JSX: `prettier`, `eslint`
- General: spell check, license headers

### CI/CD Pipeline
- **test.yml:** Runs on PRs, Go tests + lint
- **build.yml:** Multi-platform build verification
- **release.yml:** On version tags, builds packages for DEB, RPM, Flatpak

### Neovim Integration
- `.exrc` with leader+p shortcuts for common tasks
- `.nvim.lua` with Go/JavaScript language settings
- which-key bindings for navigation

## Success Criteria

1. User can enter places and see visualization in < 30 seconds
2. All four themes render correctly and look distinctive
3. PDFs generate client-side without server involvement
4. Geocoding handles ambiguous places gracefully
5. Responsive design works on mobile and desktop
6. Great circles render correctly using proper geodesics
7. Insights calculations are accurate
8. Performance is snappy (< 1s first load, < 5s PDF generation)

## Future Enhancements (Post-MVP)

1. **Persistence:** Optional accounts, saved journeys
2. **Sharing:** Short URLs (mygreatcircle.com/v/abc123)
3. **Premium Features:** Additional themes, no watermarks, exclusive outputs
4. **Physical Products:** Print-on-demand merchandise
5. **Self-hosted Nominatim:** If rate limits become an issue
6. **Analytics:** Anonymous usage insights
7. **Social Sharing:** Preset templates for common journey patterns

## Branding

Footer on all pages and outputs:

> Made with 💗 by [Kartoza](https://kartoza.com) | [Donate!](https://github.com/sponsors/kartoza) | [GitHub](https://github.com/kartoza/MyGreatCircle)
