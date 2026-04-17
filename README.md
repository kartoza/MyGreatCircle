# MyGreatCircle

Visualize your life journey as stunning great circle arcs across the globe.

## Features

- Enter places you've lived, visited, or spent time in
- See beautiful great circle connections on an interactive map
- Choose from 4 visual themes: Minimal Dark, Vibrant Neon, Vintage, Clean Modern
- Download as PDF fact sheet or poster
- No account required - instant visualization

## Geocoding

MyGreatCircle uses a three-tier caching strategy for place geocoding:

1. **Browser localStorage** - Instant lookup for places you've previously entered
2. **Server SQLite cache** - Shared cache with fuzzy matching (handles typos via Levenshtein distance)
3. **Nominatim API** - Direct client-side queries for new places (rate-limited to respect Nominatim's usage policy)

When you geocode a new place, the result is cached locally in your browser and submitted to the shared server cache so other users benefit from your lookups.

## Attribution

Geocoding powered by [Nominatim](https://nominatim.org) · Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

## Quick Start

```bash
# Enter the development environment
nix develop

# Start the development servers
make dev
```

Then open http://localhost:5173

## Development

### Prerequisites

- Nix with flakes enabled, OR
- Go 1.22+ and Node.js 22+

### Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start backend + frontend dev servers |
| `make build` | Build production binary |
| `make test` | Run Go tests |
| `make lint` | Run linter |
| `make web-build` | Build frontend for production |
| `make docs-dev` | Start documentation server |

## License

MIT

---

Made with 💗 by [Kartoza](https://kartoza.com) | [Donate!](https://github.com/sponsors/kartoza) | [GitHub](https://github.com/kartoza/MyGreatCircle)
