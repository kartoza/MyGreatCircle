# Client-Side Geocoding with Multi-Tier Caching

**Date:** 2026-04-17
**Status:** Approved
**Author:** Claude Code + Tim Sketches

## Overview

Migrate Nominatim geocoding from server-side to client-side to minimize external API traffic. Implement a three-tier caching strategy: browser localStorage (exact match), Go backend with SQLite (fuzzy Levenshtein match), and direct Nominatim requests from client (last resort). Add proper OSM/Nominatim attribution and replace PDF place name lists with word clouds.

## Goals

1. **Minimize Nominatim traffic** - Most lookups resolved from cache
2. **Improve resilience** - No single point of failure for geocoding
3. **Enable shared caching** - Server aggregates places from all users
4. **Proper attribution** - Comply with OSM/Nominatim usage requirements
5. **Better PDF aesthetics** - Word clouds instead of bullet lists

## Non-Goals

- Self-hosted Nominatim instance (future consideration)
- User accounts or journey persistence
- Offline-first PWA functionality

---

## Architecture

### Data Flow

```
User enters places
        │
        ▼
┌─────────────────────────┐
│ 1. Parse place names    │
│    (existing parser.js) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Check localStorage   │  ◄── Exact match on normalized query
│    (instant)            │
└───────────┬─────────────┘
            │ unresolved
            ▼
┌─────────────────────────┐
│ 3. POST /api/places/    │  ◄── Batch request, fuzzy Levenshtein
│    lookup               │
└───────────┬─────────────┘
            │ still unresolved
            ▼
┌─────────────────────────┐
│ 4. Direct Nominatim     │  ◄── Sequential, 1.1s delay between
│    from client          │      requests, with retry logic
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Cache locally +      │  ◄── localStorage + POST /api/places/submit
│    submit to server     │
└─────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `useGeocoding.js` | Orchestrates 3-tier lookup, rate limiting, caching |
| `PlaceRepository` | Go interface for place storage (SQLite now, PostgreSQL later) |
| `/api/places/lookup` | Fuzzy match against server cache |
| `/api/places/submit` | Accept resolved places from clients |
| `usePdfGeneration.js` | Render word cloud in PDF margins |

---

## Database Schema

### SQLite Table: `places`

```sql
CREATE TABLE places (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    query_normalized TEXT NOT NULL,           -- lowercase, trimmed input
    display_name    TEXT NOT NULL,            -- Nominatim's display_name
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    importance      REAL,                     -- Nominatim's importance score
    created_at      TEXT DEFAULT (datetime('now')),
    hit_count       INTEGER DEFAULT 1         -- popularity tracking
);

CREATE INDEX idx_places_query ON places (query_normalized);
```

### Design Decisions

- **No TTL/expiration** - Geographic coordinates rarely change
- **`hit_count`** - Enables ranking multiple fuzzy matches by popularity
- **`query_normalized`** - Stores original user query for fuzzy matching
- **SQLite first** - Simpler deployment, PostgreSQL migration planned

### Future PostgreSQL Migration

Repository interface enables swap:

```go
type PlaceRepository interface {
    FindExact(ctx context.Context, query string) (*Place, error)
    FindFuzzy(ctx context.Context, query string, maxDistance int) ([]Place, error)
    Save(ctx context.Context, place *Place) error
    IncrementHitCount(ctx context.Context, id int64) error
}
```

PostgreSQL version adds trigram index for native fuzzy search:
```sql
CREATE INDEX idx_places_query_trgm ON places USING gin (query_normalized gin_trgm_ops);
```

---

## API Endpoints

### `POST /api/places/lookup`

Batch fuzzy lookup against server cache.

**Request:**
```json
{
    "queries": ["Cape Town", "Johanesburg", "Durban"]
}
```

**Response:**
```json
{
    "resolved": {
        "cape town": {
            "displayName": "Cape Town, Western Cape, South Africa",
            "lat": -33.92,
            "lng": 18.42
        },
        "durban": {
            "displayName": "Durban, KwaZulu-Natal, South Africa",
            "lat": -29.85,
            "lng": 31.02
        }
    },
    "unresolved": ["johanesburg"]
}
```

### `POST /api/places/submit`

Client submits Nominatim results to populate shared cache.

**Request:**
```json
{
    "places": [
        {
            "query": "Johannesburg",
            "displayName": "Johannesburg, Gauteng, South Africa",
            "lat": -26.20,
            "lng": 28.04,
            "importance": 0.82
        }
    ]
}
```

**Response:**
```json
{
    "saved": 1
}
```

### Deprecated

- `POST /api/geocode` - Remove server-side Nominatim proxy

---

## Client-Side Geocoding

### Rate Limiting

Nominatim policy: 1 request per second maximum.

```javascript
let lastNominatimRequest = 0
const MIN_INTERVAL = 1100 // ms (slightly over 1 second)

async function rateLimitedGeocode(query) {
    const now = Date.now()
    const wait = Math.max(0, MIN_INTERVAL - (now - lastNominatimRequest))
    if (wait > 0) await sleep(wait)
    lastNominatimRequest = Date.now()
    return geocodeFromNominatim(query)
}
```

### Nominatim Request

```javascript
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

async function geocodeFromNominatim(query) {
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '5'
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
            'User-Agent': 'MyGreatCircle/1.0 (https://github.com/kartoza/MyGreatCircle)'
        }
    })
    return response.json()
}
```

### localStorage Structure

```javascript
{
    version: 2,  // bumped to invalidate old cache format
    cache: {
        "cape town": {
            displayName: "Cape Town, Western Cape, South Africa",
            lat: -33.92,
            lng: 18.42,
            cachedAt: 1713369600000
        }
    }
}
```

---

## Fuzzy Matching

### Strategy (SQLite + Go)

1. Normalize query: lowercase, trim whitespace
2. Query SQLite for candidates: `WHERE query_normalized LIKE 'prefix%'` (first 3 chars)
3. Compute Levenshtein distance in Go using `agnivade/levenshtein`
4. Return matches where distance ≤ 3, sorted by distance then hit_count

### Example

| Query | Cached Entry | Distance | Match? |
|-------|--------------|----------|--------|
| "johanesburg" | "johannesburg" | 1 | Yes |
| "cape twon" | "cape town" | 1 | Yes |
| "sydney" | "singapore" | 6 | No |

---

## Attribution

### Requirements

Per OSM usage policy, must credit Nominatim and OpenStreetMap.

### Attribution Text

```
Geocoding by Nominatim · Map data © OpenStreetMap contributors
```

### Placement

| Location | Format |
|----------|--------|
| Web UI footer | Inline with Kartoza branding |
| PDF fact sheet footer | Gray text below Kartoza line |
| PDF poster footer | Gray text in footer area |
| Settings/About panel | Full text with clickable links |

### Links

- Nominatim: `https://nominatim.org`
- OSM Copyright: `https://www.openstreetmap.org/copyright`

---

## PDF Word Cloud

### Current State

- Fact sheet: Bullet list of place names
- Poster: Arrow-separated footer (`Paris → London → Tokyo`)

### New Design

Place names rendered as word cloud in PDF margins.

```
┌─────────────────────────────────────────┐
│  Paris    Tokyo         Sydney          │  ← top margin
│                                         │
│ Berlin ┌─────────────────────────────┐ Mumbai │
│        │                             │        │
│ Lagos  │           MAP               │ Toronto│
│        │                             │        │
│ Seoul  └─────────────────────────────┘ Lima   │
│                                         │
│  Dubai    Cairo         Auckland        │  ← bottom margin
└─────────────────────────────────────────┘
```

### Implementation

1. **Margin zones:** Calculate 4 rectangles around map bounds (top, bottom, left, right)
2. **Text placement algorithm:**
   - Shuffle place names array for randomness
   - For each place, try up to 50 random positions within margin zones
   - Accept first position that doesn't collide with existing text
   - Distribute evenly across all 4 margins (round-robin zone selection)
3. **Collision detection:**
   - Get text bounding box using `pdf.getTextWidth()` and font height
   - Add 2pt padding around each text element
   - Check intersection with all previously placed text boxes
4. **Styling:**
   - Color: Light gray (#999999)
   - Size: 8pt uniform
   - Opacity: Built into color (no separate alpha)
   - Rotation: Horizontal only (no rotation for readability)

### Overflow Handling

If a place cannot be positioned after 50 attempts, skip it. After processing all places, if any were skipped, add "... and X more places" centered in the bottom margin.

---

## Testing Strategy

### Unit Tests

- `PlaceRepository` CRUD operations
- Levenshtein fuzzy matching accuracy
- Rate limiter timing
- Word cloud collision detection

### Integration Tests

- Full geocoding flow: localStorage → server → Nominatim → cache
- API endpoint request/response validation

### Manual Testing

- Verify attribution displays correctly in all locations
- PDF word cloud visual review across different place counts

---

## Migration Path

### Phase 1: Add New Infrastructure

1. Create SQLite database and repository
2. Add `/api/places/lookup` and `/api/places/submit` endpoints
3. Refactor `useGeocoding.js` for client-side Nominatim

### Phase 2: Deprecate Old Endpoint

1. Remove `/api/geocode` endpoint
2. Remove server-side Nominatim proxy code
3. Remove server-side rate limiter

### Phase 3: PDF Updates

1. Implement word cloud renderer
2. Add attribution to PDF footers
3. Add attribution to web UI

### Future: PostgreSQL Migration

1. Add PostgreSQL repository implementation
2. Configure via environment variable
3. Add trigram index for native fuzzy search

---

## Files to Modify

### Backend (Go)

| File | Changes |
|------|---------|
| `internal/db/sqlite.go` | New: SQLite connection, migrations |
| `internal/db/repository.go` | New: PlaceRepository interface |
| `internal/db/sqlite_repository.go` | New: SQLite implementation |
| `internal/api/places.go` | New: lookup/submit handlers |
| `internal/api/server.go` | Register new routes, remove old |
| `internal/api/geocode.go` | Delete after migration |
| `cmd/mygreatcircle/main.go` | Initialize database |

### Frontend (JavaScript)

| File | Changes |
|------|---------|
| `web/src/hooks/useGeocoding.js` | Refactor for 3-tier caching |
| `web/src/hooks/usePdfGeneration.js` | Word cloud renderer, attribution |
| `web/src/components/Footer.jsx` | Add Nominatim/OSM attribution |
| `web/src/components/SettingsPanel.jsx` | Attribution with links |

### New Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/mattn/go-sqlite3` | SQLite driver |
| `github.com/agnivade/levenshtein` | Fuzzy string matching |

---

## Open Questions

None - all requirements clarified during design.

---

## Appendix: Nominatim Usage Policy

From https://operations.osmfoundation.org/policies/nominatim/:

- Maximum 1 request per second
- Must provide valid User-Agent header
- Must display attribution to OpenStreetMap
- No bulk geocoding without permission
