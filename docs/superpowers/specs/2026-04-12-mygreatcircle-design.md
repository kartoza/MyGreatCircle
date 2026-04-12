# MyGreatCircle Design Specification

**Date:** 2026-04-12
**Status:** Approved
**Approach:** Minimal Viable Magic (MVP)

## Overview

MyGreatCircle is a web application that transforms a simple list of places into stunning great circle visualizations. Users enter places they've lived, visited, or spent time in, and receive beautiful infographics showing their life journey as luminous arcs across the globe.

The name references the great circle paths that connect places on a sphere—the shortest distance between two points on Earth, rendered as elegant curved arcs.

## Target User

Everyday people curious about visualizing their life journey. This includes those who've mostly stayed local (a few meaningful places) as well as frequent movers. The experience must feel rewarding even with just 2-3 places.

## Core Value Proposition

- **Input:** Dead simple—paste a list of places
- **Output:** Gobsmackingly beautiful visualizations
- **Speed:** Immediate gratification, no account required

---

## User Flow

### State 1: Input

Single text area where users enter places, one per line:

```
London, UK
Cape Town, South Africa 1990-1995
Sydney
Meadowridge, Cape Town
```

**Parsing rules:**
- Each line is one place
- Dates are optional: `1990`, `1990-1995`, or omitted entirely
- Place precision is flexible: "South Africa" or "Meadowridge, Cape Town"
- Order implies sequence (first = earliest, last = most recent)

### State 2: Preview & Refine

- Full-screen D3.js map visualization with great circle arcs
- Sidebar showing geocoded places with confidence indicators
- Places with low confidence (⚠) can be clicked to select alternatives
- Theme selector: Minimal Dark | Vibrant Neon | Vintage | Clean Modern
- "Edit List" returns to input with text preserved

### State 3: Outputs

Three output options presented as cards:

1. **Fact Sheet PDF** (Free) - A4 portrait with map, stats, place list
2. **Poster PDF** (Free) - A3 landscape, full-bleed map visualization
3. **Premium Poster** (Email gated) - Unlocks after email capture

---

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
```

### Insights Logic

Insights are computed client-side and adapt to the data:
- Few places → emphasize countries, total distance
- Many places → emphasize volume, places per decade
- One big intercontinental move → feature it prominently
- Dates provided → show time-based stats (years spanned, longest stay)

---

## API Design

### Endpoints

```
GET  /api/health
     Response: { "status": "ok" }

POST /api/geocode
     Request:  { "query": "Cape Town, South Africa" }
     Response: {
       "results": [
         {
           "name": "Cape Town, Western Cape, South Africa",
           "lat": -33.9249,
           "lng": 18.4241,
           "confidence": "high"
         }
       ],
       "cached": true
     }

GET  /api/v1/...
     Reserved for future endpoints (accounts, sharing, analytics)
```

### Geocoding

- **Provider:** Nominatim (OpenStreetMap)
- **Caching:** In-memory LRU cache (10,000 entries, 7-day TTL)
- **Rate limiting:** Backend manages Nominatim rate limits
- **Future:** Self-hosted Nominatim if scale requires

---

## Visualization

### Technology

- **Library:** D3.js
- **Projection:** Equal Earth (`d3.geoEqualEarth()`)
- **Great circles:** `d3.geoInterpolate()` for geodesic paths

### Rendering Hierarchy

1. **Background:** Theme-specific gradient or solid
2. **Land masses:** Subtle, de-emphasized (opacity 0.3)
3. **Great circle arcs:** Hero element, prominent styling
4. **Place markers:** Dots at each location
5. **Labels:** Optional, theme-dependent

### Theme Definitions

| Theme | Background | Land | Arcs | Points |
|-------|------------|------|------|--------|
| **Minimal Dark** | `#1a1a2e` → `#16213e` | `rgba(255,255,255,0.05)` | White, 1px, 60% opacity | White dots |
| **Vibrant Neon** | `#0f0f23` | `rgba(255,255,255,0.08)` | Rainbow gradient + glow filter | Colored + glow |
| **Vintage** | `#f4f1ea` (paper) | `#e8e0d0` with stroke | Sepia dashed `#5c4033` | Terracotta `#b85c38` |
| **Clean Modern** | `#ffffff` → `#f8fafc` | `#e2e8f0` | Solid blue `#3b82f6` | Blue dots |

---

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
│                                        │
│         [Map Visualization]            │
│         (40% of page height)           │
│                                        │
├────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │ X Places     │  │ Y Countries  │   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ N km total   │  │ M km longest │   │
│  └──────────────┘  └──────────────┘   │
├────────────────────────────────────────┤
│  Your Places:                          │
│  • Place 1                             │
│  • Place 2 (years)                     │
│  • ...                                 │
├────────────────────────────────────────┤
│  mygreatcircle.com                     │
└────────────────────────────────────────┘
```

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

### Watermarks

- **Free PDFs:** Subtle `mygreatcircle.com` in footer/corner
- **Premium PDFs:** No watermark (future paid tier)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  React + Chakra UI                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Place Input │→ │ Map Preview │→ │ PDF Generation          │  │
│  │ (textarea)  │  │ (D3.js SVG) │  │ (jsPDF + svg2pdf.js)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ /api/geocode
┌─────────────────────────────────────────────────────────────────┐
│                         Go Backend                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Static File │  │ Geocode     │  │ Future API              │  │
│  │ Server      │  │ Proxy+Cache │  │ Endpoints               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (rate-limited, cached)
                       ┌─────────────┐
                       │ Nominatim   │
                       │ (external)  │
                       └─────────────┘
```

**Key characteristics:**
- Stateless (no database for MVP)
- No user accounts
- Client-side rendering and PDF generation
- Backend is thin: static files + geocoding proxy

---

## Project Structure

```
MyGreatCircle/
├── .github/workflows/
│   ├── test.yml              # Go tests + lint on PR
│   ├── build.yml             # Multi-platform build verification
│   └── release.yml           # Tagged releases → packages
├── cmd/mygreatcircle/
│   └── main.go               # Entry point
├── internal/
│   ├── api/
│   │   ├── server.go         # HTTP server setup
│   │   ├── handlers.go       # Route handlers
│   │   └── geocode.go        # Nominatim proxy + cache
│   └── cache/
│       └── lru.go            # In-memory LRU cache
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PlaceInput.jsx
│   │   │   ├── MapVisualization.jsx
│   │   │   ├── ThemeSelector.jsx
│   │   │   ├── PlaceList.jsx
│   │   │   ├── InsightsPanel.jsx
│   │   │   └── OutputCards.jsx
│   │   ├── hooks/
│   │   │   ├── useGeocoding.js
│   │   │   └── usePdfGeneration.js
│   │   ├── lib/
│   │   │   ├── themes.js
│   │   │   ├── projections.js
│   │   │   ├── greatCircle.js
│   │   │   ├── insights.js
│   │   │   └── parser.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── mkdocs.yml
│   └── docs/
├── scripts/
├── k8s/
├── flake.nix
├── Makefile
├── .pre-commit-config.yaml
├── SPECIFICATION.md
├── PACKAGES.md
└── README.md
```

---

## Tooling (Following Baboon Patterns)

### Nix Flake

Provides reproducible development environment:
- Go 1.22+, Node 22, gopls, golangci-lint
- `nix run .#dev` - Start backend + frontend dev servers
- `nix run .#build` - Production build
- `nix run .#docs-serve` - mkdocs dev server

### Makefile Targets

- `make run` - Backend only
- `make web-dev` - Frontend dev server
- `make dev` - Both concurrently
- `make test` - Go tests
- `make lint` - golangci-lint
- `make build` - Production binary with embedded web assets

### Pre-commit Hooks

- Go: `go fmt`, `go vet`, `golangci-lint`
- JS/JSX: `prettier`, `eslint`
- General: spell check, license headers

### CI/CD

- **test.yml:** Run on PRs, Go tests + lint
- **build.yml:** Multi-platform build verification
- **release.yml:** On version tags, build binaries + packages (DEB, RPM, Flatpak)

### Neovim Integration

- `.exrc` with leader+p shortcuts
- `.nvim.lua` with Go/JS settings and which-key bindings

---

## Monetization

### Revenue Streams

| Output | Access | Model |
|--------|--------|-------|
| Web preview | Free | AdSense impressions |
| Fact sheet PDF | Free | AdSense (web) + branding watermark |
| Poster PDF | Email gate | List building for future upsell |
| Premium poster | Future | Paid ($3-5), no watermark, extra themes |

### AdSense Placement

- **Input page:** Leaderboard banner (728x90) above fold
- **Output page:** Rectangle (336x280) below output cards

### Email Capture

When user clicks "Get Poster":
1. Modal: "Enter email to unlock your poster"
2. Store email (append to file, future Mailchimp integration)
3. Poster downloads immediately
4. Follow-up email with premium upsell

---

## Future Enhancements (Post-MVP)

1. **Persistence:** Optional accounts, saved journeys
2. **Sharing:** Short URLs (`mygreatcircle.com/v/abc123`)
3. **Premium themes:** Additional visual styles
4. **Physical products:** Print-on-demand t-shirts, desk maps, wall posters
5. **Self-hosted Nominatim:** If rate limits become an issue
6. **Analytics:** Anonymous usage insights

---

## Success Criteria

1. User can enter places and see visualization in < 30 seconds
2. All four themes render correctly and look distinctive
3. PDFs generate client-side without server involvement
4. Geocoding handles ambiguous places gracefully
5. Works on mobile (responsive design)
6. AdSense integration functional
7. Email capture working for poster downloads

---

## Branding

Footer on all pages and outputs:

> Made with 💗 by [Kartoza](https://kartoza.com) | [Donate!](https://github.com/sponsors/kartoza) | [GitHub](https://github.com/kartoza/MyGreatCircle)

---

*This specification defines the MVP scope for MyGreatCircle. Implementation should follow the writing-plans skill for detailed task breakdown.*
