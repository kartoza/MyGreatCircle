# MyGreatCircle Package Architecture

## Overview

MyGreatCircle is a full-stack web application composed of a thin Go backend server and a comprehensive React frontend. The backend provides static file serving and a geocoding API proxy with caching. The frontend contains all visualization, UI, and PDF generation logic.

## Go Backend Packages

### cmd/mygreatcircle

**Entry point for the application.** Handles command-line flags and starts the HTTP server.

**Key Files:**
- `main.go` - Parse CLI flags (port, web directory, version), initialize server

**CLI Flags:**
- `-port` - HTTP port (default 8080)
- `-web` - Path to web assets directory (default "./web/dist")
- `-version` - Print version and exit

**Responsibilities:**
- Load configuration from environment and flags
- Initialize HTTP server
- Handle graceful shutdown

---

### internal/api

**HTTP server setup, request routing, and API handlers.** This package exposes all backend endpoints and coordinates with the cache.

**Key Files:**
- `server.go` - HTTP server initialization, middleware setup, route definitions
- `handlers.go` - Handler functions for health checks and static file serving
- `geocode.go` - Nominatim proxy with rate limiting and caching

**Exported Functions:**
- `NewServer(config Config) *Server` - Create HTTP server
- `Server.Start() error` - Start listening and serving
- `Server.Stop() error` - Graceful shutdown

**Endpoints:**
- `GET /api/health` - Health check endpoint
- `POST /api/geocode` - Geocoding proxy to Nominatim
- `GET /*` - Static file serving for React frontend

**Responsibilities:**
- Route HTTP requests
- Implement geocoding proxy
- Cache geocoding results
- Serve frontend assets
- Manage rate limiting to Nominatim

---

### internal/cache

**In-memory caching utilities with TTL support.** Provides a generic LRU cache used primarily for geocoding results.

**Key Files:**
- `lru.go` - Generic LRU cache implementation with expiration

**Exported Types:**
- `Cache[K comparable, V any]` - Thread-safe LRU cache with TTL
  - `Set(key K, value V, ttl time.Duration)` - Add/update entry
  - `Get(key K) (V, bool)` - Retrieve entry if not expired
  - `Size() int` - Current number of entries
  - `Clear()` - Remove all entries

**Configuration:**
- Max capacity: 10,000 entries
- TTL: 7 days for geocoding results
- Eviction policy: LRU (least recently used)

**Responsibilities:**
- Store geocoding results
- Expire old entries based on TTL
- Evict oldest items when capacity exceeded
- Provide thread-safe access

---

## React Frontend Packages

### web/src/components

**Reusable React UI components.** All UI rendering logic lives here, organized by feature area.

**PlaceInput.jsx**
- Text area for entering multiple places (one per line)
- Parses input using `parser.js`
- Calls `useGeocoding` hook to geocode places
- Handles optional year/date input
- Shows loading and error states

**MapVisualization.jsx**
- D3.js SVG map with great circle arcs
- Renders world map from TopoJSON
- Draws geodesic paths between places
- Applies theme styling
- Responsive sizing
- Features:
  - Pan and zoom support
  - Animated arc drawing on load
  - Theme-specific color schemes

**ThemeSelector.jsx**
- Radio button group for 4 themes
- Instant theme switching
- Theme options: Minimal Dark, Vibrant Neon, Vintage, Clean Modern
- No data loss on theme change

**PlaceList.jsx**
- Displays all geocoded places
- Shows confidence indicators (high/low)
- Click to view alternative matches for low-confidence places
- Allows selection of correct match
- Updates visualization on selection
- Displays year ranges if provided

**InsightsPanel.jsx**
- Displays journey statistics
- Shows: total places, countries count, distance, longest leg
- Conditional stats based on data (dates, volume)
- Adapts messaging for different journey patterns

**OutputCards.jsx**
- Card UI for PDF download options
- Fact Sheet (A4 PDF)
- Poster (A3 PDF)
- Premium option (email-gated)
- Calls `usePdfGeneration` hook on click

**EmailModal.jsx**
- Modal dialog for email capture
- Triggered on "Get Premium Poster" click
- Validates email format
- Sends email to backend
- Downloads poster after submission

**Footer.jsx**
- Branding footer with links
- "Made with 💗 by Kartoza" attribution
- Links to Kartoza, GitHub, and sponsors

---

### web/src/hooks

**Custom React hooks** for complex stateful logic and side effects.

**useGeocoding.js**
- Manages geocoding API calls
- Batches requests to Nominatim
- Handles rate limiting
- Caches results in hook state
- Returns: `{ results, loading, error }`
- Integration points:
  - Called from PlaceInput component
  - Geocodes place names on submission
  - Respects backend cache

**usePdfGeneration.js**
- Encapsulates PDF generation logic
- Uses jsPDF + svg2pdf.js
- Generates Fact Sheet (A4) and Poster (A3)
- Handles SVG-to-PDF conversion
- Returns promise for async generation
- Features:
  - Vector PDF output
  - Watermarking
  - Responsive sizing
  - Error handling

---

### web/src/lib

**Utility libraries** for data processing, math, and configuration.

**parser.js**
- Parses free-form place input text
- Extracts place name and date ranges
- Handles formats: "Place", "Place YYYY", "Place YYYY-YYYY"
- Returns array of Place objects with names and dates
- Error handling for malformed input
- Test coverage via `parser.test.js`

**themes.js**
- Visual theme definitions (Minimal Dark, Vibrant Neon, Vintage, Clean Modern)
- Theme object structure:
  ```javascript
  {
    name: string,
    background: string | gradient,
    land: { fill, opacity, stroke },
    arcs: { stroke, opacity, filter },
    points: { fill, radius, glow },
    labels: { fill, fontSize }
  }
  ```
- Used by MapVisualization component

**geo.js**
- Great circle and geodesic mathematics
- Key functions:
  - `greatCircleDistance(lat1, lon1, lat2, lon2)` - Distance in km
  - `computeInsights(places, years)` - Journey statistics
  - `interpolateGreatCircle(start, end, steps)` - Points along arc
  - `countUniquePlaces(places)` - Deduplication
  - `getCountryFromCoordinates(lat, lon)` - Reverse geocoding hint
- Test coverage via `geo.test.js`

**topo/world.json**
- TopoJSON world map data
- Feature collection with countries, coastlines
- Used by MapVisualization for rendering land masses
- Sourced from Natural Earth Data
- Optimized for web (simplified geometry)

---

## Frontend Dependencies

### Core Framework
- **react** (^18.0.0) - UI framework
- **react-dom** - DOM rendering

### UI Framework
- **@chakra-ui/react** - Component library
- **@emotion/react**, **@emotion/styled** - CSS-in-JS

### Visualization
- **d3** (^7.0.0) - Data-driven visualization
- **d3-geo** - Geographic projections
- **topojson-client** - TopoJSON parsing

### PDF Generation
- **jspdf** (^2.5.0) - PDF creation
- **svg2pdf.js** - SVG to PDF conversion

### Utilities
- **uuid** - Unique ID generation
- **axios** - HTTP client for API calls

### Development
- **vite** - Frontend build tool
- **vitest** - Unit testing
- **prettier** - Code formatting
- **eslint** - Code linting

---

## Go Dependencies

**The Go backend uses only the Go standard library for the MVP.**

This includes:
- `net/http` - HTTP server and client
- `encoding/json` - JSON marshaling/unmarshaling
- `fmt`, `log` - Logging
- `sync` - Thread synchronization (for cache locking)
- `time` - TTL management
- `context` - Request context and timeouts
- `flag` - CLI flag parsing

**Rationale:** Minimizing external dependencies reduces deployment complexity and attack surface. The standard library provides everything needed for this MVP.

---

## Build System

### Vite (Frontend)
- **vite.config.js** - Frontend build configuration
- **Entry point:** `web/src/main.jsx`
- **Output:** `web/dist/` (static assets)
- **Optimization:**
  - Code splitting
  - CSS minification
  - Asset hashing
  - Source maps in development

### Go Build
- **Standard go build** - Compiles backend binary
- **Embedding:** Go 1.16+ embed package (future) for embedding web assets
- **Output:** `mygreatcircle` binary

### Makefile
- `make dev` - Concurrent backend + frontend dev
- `make build` - Production release build
- `make test` - Run Go tests
- `make lint` - Lint Go code
- `make web-build` - Build frontend only

### Nix Flake
- **flake.nix** - Declarative development environment
- **Dependencies:** Go 1.22+, Node.js 22, golangci-lint, gopls
- **Entry point:** `nix develop` for dev shell

---

## Data Flow

### 1. User Input to Visualization

```
PlaceInput (textarea)
  ↓
parser.js (parse text)
  ↓
useGeocoding (API call)
  ↓
/api/geocode (backend proxy)
  ↓
Nominatim (external)
  ↓
Cache (backend stores)
  ↓
useGeocoding (returns results)
  ↓
PlaceList (show places + alternatives)
  ↓
MapVisualization (render map + arcs)
```

### 2. Visualization to PDF

```
MapVisualization (SVG element)
  ↓
OutputCards (click download)
  ↓
usePdfGeneration (start generation)
  ↓
geo.js (prepare data)
  ↓
jsPDF + svg2pdf.js (convert to PDF)
  ↓
Browser download (user receives file)
```

---

## Testing

### Go Tests
- Located in `*_test.go` files
- Test LRU cache, handlers, API endpoints
- Run with `go test ./...`

### JavaScript Tests
- Located in `*.test.js` files
- Test parser, geo utilities
- Run with `npm test` or `vitest`
- Coverage tracked via CI

---

## Performance Considerations

### Frontend
- **Lazy loading:** Components load on demand
- **Memoization:** `React.memo()` for expensive components
- **Efficient D3:** Minimal DOM updates after initial render
- **PDF generation:** Async, doesn't block UI

### Backend
- **Cache hits:** 70%+ for repeated places
- **Rate limiting:** 1 req/sec to Nominatim
- **Connection pooling:** HTTP client reuses connections
- **Compression:** gzip for static assets

### Network
- **Static CDN:** Future enhancement for web assets
- **API caching:** 7-day TTL reduces external API calls
- **Lazy loading:** Only geocode on user action

---

## Security Considerations

- **No database:** No injection vulnerabilities
- **No authentication:** No token management
- **CORS:** Restricted to same-origin for API
- **Input validation:** Parser validates place format
- **Content-Security-Policy:** Headers configured in server
- **XSS prevention:** React escapes by default

---

## Deployment

### Development
```bash
nix develop
make dev
```

### Production Build
```bash
nix develop
make build
```

### Docker (Future)
- Single-stage build with Go + Node
- Multi-platform images (amd64, arm64)
- Minimal base image (scratch or alpine)

### Binary Distribution
- Release builds for:
  - Linux (amd64, arm64): DEB, RPM, AppImage, AUR, Nix
  - macOS (amd64, arm64): DMG
  - Windows (amd64): MSI, portable EXE

---

## File Organization Best Practices

### Naming Conventions
- Components: PascalCase (PlaceInput.jsx)
- Utilities: camelCase (parser.js)
- Tests: `.test.js` suffix (geo.test.js)
- Config files: kebab-case or .yaml

### Imports
- Relative imports for local modules
- Absolute imports from package root (configured via Vite)
- Group imports: React, external libs, local modules

### CSS and Styling
- Chakra UI for theming and components
- Theme customization via ThemeSelector
- Inline styles via Chakra's `sx` prop for dynamic styling

---

## Maintenance

### Adding New Features
1. Create component in `components/` if UI
2. Create hook in `hooks/` if complex logic
3. Add utility to `lib/` if reusable
4. Write tests alongside implementation
5. Update SPECIFICATION.md
6. Commit with clear message

### Updating Dependencies
- Frontend: `npm update` in `web/` directory
- Backend: `go get -u ./...`
- Nix: `nix flake update`
- Test thoroughly before committing

---

## Related Documentation

- **SPECIFICATION.md** - User stories, requirements, API specs
- **README.md** - Quick start and overview
- **docs/** - MkDocs for user and developer guides
