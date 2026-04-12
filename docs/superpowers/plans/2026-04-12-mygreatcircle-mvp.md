# MyGreatCircle MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that transforms a list of places into stunning great circle visualizations with PDF export.

**Architecture:** Stateless single-page app with React + Chakra UI frontend, D3.js for map visualization, client-side PDF generation. Thin Go backend serves static files and proxies geocoding requests to Nominatim with caching.

**Tech Stack:** Go 1.22+, React 18, Chakra UI, D3.js, jsPDF, svg2pdf.js, Vite, Nix

---

## File Structure

```
MyGreatCircle/
├── cmd/mygreatcircle/
│   └── main.go                    # CLI entry point, flags, server startup
├── internal/
│   ├── api/
│   │   ├── server.go              # HTTP server, middleware, routing
│   │   ├── handlers.go            # Health check handler
│   │   └── geocode.go             # Nominatim proxy with rate limiting
│   └── cache/
│       └── lru.go                 # Generic LRU cache with TTL
├── web/
│   ├── src/
│   │   ├── main.jsx               # React entry point
│   │   ├── App.jsx                # Main app with state management
│   │   ├── components/
│   │   │   ├── PlaceInput.jsx     # Text area for place entry
│   │   │   ├── MapVisualization.jsx # D3.js SVG map with great circles
│   │   │   ├── ThemeSelector.jsx  # Theme toggle buttons
│   │   │   ├── PlaceList.jsx      # Geocoded places with confidence
│   │   │   ├── InsightsPanel.jsx  # Stats display
│   │   │   ├── OutputCards.jsx    # PDF download cards
│   │   │   ├── EmailModal.jsx     # Email capture modal
│   │   │   └── Footer.jsx         # Kartoza branding
│   │   ├── hooks/
│   │   │   ├── useGeocoding.js    # Geocoding API calls
│   │   │   └── usePdfGeneration.js # PDF generation logic
│   │   └── lib/
│   │       ├── parser.js          # Parse place text input
│   │       ├── themes.js          # Theme color definitions
│   │       ├── insights.js        # Compute journey insights
│   │       └── geo.js             # Great circle math + distance
│   ├── public/
│   │   └── world-110m.json        # TopoJSON world map data
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── mkdocs.yml
├── .github/workflows/
│   ├── test.yml
│   ├── build.yml
│   └── release.yml
├── flake.nix
├── flake.lock
├── Makefile
├── .envrc
├── .exrc
├── .nvim.lua
├── .pre-commit-config.yaml
├── .gitignore
├── go.mod
├── go.sum
├── README.md
├── SPECIFICATION.md
└── PACKAGES.md
```

---

## Task 1: Project Foundation

**Files:**
- Create: `flake.nix`
- Create: `.envrc`
- Create: `.gitignore`
- Create: `go.mod`
- Create: `Makefile`
- Create: `README.md`

- [ ] **Step 1: Initialize git repository**

```bash
cd /home/timlinux/dev/go/MyGreatCircle
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# Go
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
vendor/

# Node
node_modules/
web/dist/
web/build/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Build
dist/
build/

# Environment
.env
.env.local

# Nix
result
result-*

# Superpowers
.superpowers/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create flake.nix**

```nix
{
  description = "MyGreatCircle - Visualize your life journey as great circle arcs";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        version = "0.1.0";

        mygreatcircle = pkgs.buildGoModule {
          pname = "mygreatcircle";
          inherit version;
          src = ./.;
          vendorHash = null;

          ldflags = [
            "-s" "-w"
            "-X main.Version=${version}"
          ];

          meta = with pkgs.lib; {
            description = "Visualize your life journey as great circle arcs";
            homepage = "https://github.com/kartoza/MyGreatCircle";
            license = licenses.mit;
            maintainers = [ ];
          };
        };

      in {
        packages = {
          default = mygreatcircle;
          mygreatcircle = mygreatcircle;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Go
            go_1_22
            gopls
            gotools
            go-tools
            golangci-lint

            # Node
            nodejs_22
            nodePackages.npm

            # Documentation
            python312
            python312Packages.mkdocs
            python312Packages.mkdocs-material

            # Tools
            git
            jq
            curl
          ];

          shellHook = ''
            echo "MyGreatCircle development environment"
            echo "Go: $(go version)"
            echo "Node: $(node --version)"
            echo ""
            echo "Commands:"
            echo "  make dev     - Start backend + frontend"
            echo "  make test    - Run tests"
            echo "  make build   - Build production binary"
          '';
        };

        apps = {
          default = {
            type = "app";
            program = "${mygreatcircle}/bin/mygreatcircle";
          };
        };
      }
    );
}
```

- [ ] **Step 4: Create .envrc**

```bash
if command -v nix &> /dev/null; then
  use flake
fi
```

- [ ] **Step 5: Create go.mod**

```bash
go mod init github.com/kartoza/MyGreatCircle
```

- [ ] **Step 6: Create Makefile**

```makefile
.PHONY: all build run test lint clean dev web-dev web-build web-install docs-dev

VERSION := 0.1.0
BINARY := mygreatcircle
GO := go
GOFLAGS := -ldflags "-s -w -X main.Version=$(VERSION)"

all: build

build:
	$(GO) build $(GOFLAGS) -o $(BINARY) ./cmd/mygreatcircle

run: build
	./$(BINARY)

test:
	$(GO) test -v ./...

lint:
	golangci-lint run

clean:
	rm -f $(BINARY)
	rm -rf web/dist web/node_modules

# Development
dev:
	@echo "Starting backend and frontend..."
	@make -j2 run web-dev

# Web frontend
web-install:
	cd web && npm install

web-dev: web-install
	cd web && npm run dev

web-build: web-install
	cd web && npm run build

# Documentation
docs-dev:
	cd docs && mkdocs serve

docs-build:
	cd docs && mkdocs build
```

- [ ] **Step 7: Create README.md**

```markdown
# MyGreatCircle

Visualize your life journey as stunning great circle arcs across the globe.

## Features

- Enter places you've lived, visited, or spent time in
- See beautiful great circle connections on an interactive map
- Choose from 4 visual themes: Minimal Dark, Vibrant Neon, Vintage, Clean Modern
- Download as PDF fact sheet or poster
- No account required - instant visualization

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
```

- [ ] **Step 8: Commit project foundation**

```bash
git add .gitignore flake.nix .envrc go.mod Makefile README.md
git commit -m "feat: initialize project with Nix flake and Makefile"
```

---

## Task 2: Go Backend Skeleton

**Files:**
- Create: `cmd/mygreatcircle/main.go`
- Create: `internal/api/server.go`
- Create: `internal/api/handlers.go`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p cmd/mygreatcircle internal/api internal/cache
```

- [ ] **Step 2: Write main.go**

Create `cmd/mygreatcircle/main.go`:

```go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/kartoza/MyGreatCircle/internal/api"
)

var Version = "dev"

func main() {
	port := flag.Int("port", 8080, "Server port")
	webDir := flag.String("web", "web/dist", "Directory for static web files")
	version := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *version {
		fmt.Printf("mygreatcircle %s\n", Version)
		os.Exit(0)
	}

	server := api.NewServer(*port, *webDir)

	log.Printf("MyGreatCircle %s starting on http://localhost:%d", Version, *port)
	if err := server.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
```

- [ ] **Step 3: Write server.go**

Create `internal/api/server.go`:

```go
package api

import (
	"fmt"
	"net/http"
	"time"
)

type Server struct {
	port   int
	webDir string
	mux    *http.ServeMux
}

func NewServer(port int, webDir string) *Server {
	s := &Server{
		port:   port,
		webDir: webDir,
		mux:    http.NewServeMux(),
	}
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("GET /api/health", s.handleHealth)

	// Static files (web frontend)
	fs := http.FileServer(http.Dir(s.webDir))
	s.mux.Handle("/", fs)
}

func (s *Server) Start() error {
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", s.port),
		Handler:      s.mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	return server.ListenAndServe()
}
```

- [ ] **Step 4: Write handlers.go**

Create `internal/api/handlers.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
)

type HealthResponse struct {
	Status string `json:"status"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(HealthResponse{Status: "ok"})
}
```

- [ ] **Step 5: Run go mod tidy**

```bash
go mod tidy
```

- [ ] **Step 6: Verify it compiles**

```bash
go build ./cmd/mygreatcircle
```

Expected: Binary created without errors

- [ ] **Step 7: Commit backend skeleton**

```bash
git add cmd/ internal/
git commit -m "feat: add Go backend skeleton with health endpoint"
```

---

## Task 3: LRU Cache

**Files:**
- Create: `internal/cache/lru.go`
- Create: `internal/cache/lru_test.go`

- [ ] **Step 1: Write failing test for LRU cache**

Create `internal/cache/lru_test.go`:

```go
package cache

import (
	"testing"
	"time"
)

func TestLRUCache_SetAndGet(t *testing.T) {
	c := NewLRU[string, string](10, time.Hour)

	c.Set("key1", "value1")

	val, ok := c.Get("key1")
	if !ok {
		t.Fatal("expected key1 to exist")
	}
	if val != "value1" {
		t.Errorf("expected value1, got %s", val)
	}
}

func TestLRUCache_Expiration(t *testing.T) {
	c := NewLRU[string, string](10, 50*time.Millisecond)

	c.Set("key1", "value1")

	time.Sleep(100 * time.Millisecond)

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected key1 to be expired")
	}
}

func TestLRUCache_Eviction(t *testing.T) {
	c := NewLRU[string, string](2, time.Hour)

	c.Set("key1", "value1")
	c.Set("key2", "value2")
	c.Set("key3", "value3") // Should evict key1

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected key1 to be evicted")
	}

	_, ok = c.Get("key2")
	if !ok {
		t.Fatal("expected key2 to exist")
	}

	_, ok = c.Get("key3")
	if !ok {
		t.Fatal("expected key3 to exist")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/cache/... -v
```

Expected: FAIL - package not found or types not defined

- [ ] **Step 3: Implement LRU cache**

Create `internal/cache/lru.go`:

```go
package cache

import (
	"container/list"
	"sync"
	"time"
)

type entry[K comparable, V any] struct {
	key       K
	value     V
	expiresAt time.Time
}

type LRU[K comparable, V any] struct {
	capacity int
	ttl      time.Duration
	mu       sync.RWMutex
	items    map[K]*list.Element
	order    *list.List
}

func NewLRU[K comparable, V any](capacity int, ttl time.Duration) *LRU[K, V] {
	return &LRU[K, V]{
		capacity: capacity,
		ttl:      ttl,
		items:    make(map[K]*list.Element),
		order:    list.New(),
	}
}

func (c *LRU[K, V]) Get(key K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var zero V
	elem, ok := c.items[key]
	if !ok {
		return zero, false
	}

	e := elem.Value.(*entry[K, V])
	if time.Now().After(e.expiresAt) {
		c.removeElement(elem)
		return zero, false
	}

	c.order.MoveToFront(elem)
	return e.value, true
}

func (c *LRU[K, V]) Set(key K, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if elem, ok := c.items[key]; ok {
		c.order.MoveToFront(elem)
		e := elem.Value.(*entry[K, V])
		e.value = value
		e.expiresAt = time.Now().Add(c.ttl)
		return
	}

	if c.order.Len() >= c.capacity {
		c.evictOldest()
	}

	e := &entry[K, V]{
		key:       key,
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
	elem := c.order.PushFront(e)
	c.items[key] = elem
}

func (c *LRU[K, V]) evictOldest() {
	elem := c.order.Back()
	if elem != nil {
		c.removeElement(elem)
	}
}

func (c *LRU[K, V]) removeElement(elem *list.Element) {
	c.order.Remove(elem)
	e := elem.Value.(*entry[K, V])
	delete(c.items, e.key)
}

func (c *LRU[K, V]) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/cache/... -v
```

Expected: PASS

- [ ] **Step 5: Commit LRU cache**

```bash
git add internal/cache/
git commit -m "feat: add generic LRU cache with TTL support"
```

---

## Task 4: Geocoding Proxy

**Files:**
- Create: `internal/api/geocode.go`
- Create: `internal/api/geocode_test.go`

- [ ] **Step 1: Write failing test for geocode handler**

Create `internal/api/geocode_test.go`:

```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGeocodeHandler_ValidRequest(t *testing.T) {
	server := NewServer(8080, ".")

	body := GeocodeRequest{Query: "Cape Town, South Africa"}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/geocode", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	server.mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var resp GeocodeResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(resp.Results) == 0 {
		t.Error("expected at least one result")
	}
}

func TestGeocodeHandler_EmptyQuery(t *testing.T) {
	server := NewServer(8080, ".")

	body := GeocodeRequest{Query: ""}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/geocode", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	server.mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/... -v
```

Expected: FAIL - types not defined

- [ ] **Step 3: Implement geocode handler**

Create `internal/api/geocode.go`:

```go
package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/kartoza/MyGreatCircle/internal/cache"
)

type GeocodeRequest struct {
	Query string `json:"query"`
}

type GeocodeResult struct {
	Name       string  `json:"name"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	Confidence string  `json:"confidence"`
}

type GeocodeResponse struct {
	Results []GeocodeResult `json:"results"`
	Cached  bool            `json:"cached"`
}

type NominatimResult struct {
	DisplayName string `json:"display_name"`
	Lat         string `json:"lat"`
	Lon         string `json:"lon"`
	Importance  float64 `json:"importance"`
}

var geocodeCache = cache.NewLRU[string, []GeocodeResult](10000, 7*24*time.Hour)

var nominatimClient = &http.Client{
	Timeout: 10 * time.Second,
}

func (s *Server) handleGeocode(w http.ResponseWriter, r *http.Request) {
	var req GeocodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	query := strings.TrimSpace(req.Query)
	if query == "" {
		http.Error(w, "Query cannot be empty", http.StatusBadRequest)
		return
	}

	// Check cache
	if results, ok := geocodeCache.Get(query); ok {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GeocodeResponse{Results: results, Cached: true})
		return
	}

	// Query Nominatim
	results, err := queryNominatim(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Geocoding failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Cache results
	geocodeCache.Set(query, results)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GeocodeResponse{Results: results, Cached: false})
}

func queryNominatim(query string) ([]GeocodeResult, error) {
	u := fmt.Sprintf(
		"https://nominatim.openstreetmap.org/search?q=%s&format=json&limit=5",
		url.QueryEscape(query),
	)

	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "MyGreatCircle/1.0 (https://github.com/kartoza/MyGreatCircle)")

	resp, err := nominatimClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var nominatimResults []NominatimResult
	if err := json.Unmarshal(body, &nominatimResults); err != nil {
		return nil, err
	}

	results := make([]GeocodeResult, 0, len(nominatimResults))
	for _, nr := range nominatimResults {
		var lat, lng float64
		fmt.Sscanf(nr.Lat, "%f", &lat)
		fmt.Sscanf(nr.Lon, "%f", &lng)

		confidence := "low"
		if nr.Importance > 0.5 {
			confidence = "high"
		}

		results = append(results, GeocodeResult{
			Name:       nr.DisplayName,
			Lat:        lat,
			Lng:        lng,
			Confidence: confidence,
		})
	}

	return results, nil
}
```

- [ ] **Step 4: Update server.go to add geocode route**

Edit `internal/api/server.go`, add to setupRoutes():

```go
func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("POST /api/geocode", s.handleGeocode)

	// Static files (web frontend)
	fs := http.FileServer(http.Dir(s.webDir))
	s.mux.Handle("/", fs)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
go test ./internal/api/... -v
```

Expected: PASS (note: test depends on external Nominatim API)

- [ ] **Step 6: Run go mod tidy**

```bash
go mod tidy
```

- [ ] **Step 7: Commit geocode handler**

```bash
git add internal/api/
git commit -m "feat: add geocoding proxy with Nominatim and LRU caching"
```

---

## Task 5: React Frontend Setup

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`
- Create: `web/src/App.jsx`

- [ ] **Step 1: Create web directory**

```bash
mkdir -p web/src/components web/src/hooks web/src/lib web/public
```

- [ ] **Step 2: Create package.json**

Create `web/package.json`:

```json
{
  "name": "mygreatcircle-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx"
  },
  "dependencies": {
    "@chakra-ui/react": "^2.10.4",
    "@emotion/react": "^11.13.5",
    "@emotion/styled": "^11.13.5",
    "d3": "^7.9.0",
    "d3-geo": "^3.1.1",
    "framer-motion": "^11.15.0",
    "jspdf": "^2.5.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "svg2pdf.js": "^2.2.4",
    "topojson-client": "^3.1.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.1.0",
    "vite": "^6.0.7"
  }
}
```

- [ ] **Step 3: Create vite.config.js**

Create `web/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 4: Create index.html**

Create `web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MyGreatCircle - Visualize Your Life Journey</title>
    <meta name="description" content="Transform your life places into stunning great circle visualizations" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.jsx**

Create `web/src/main.jsx`:

```jsx
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
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
  },
  colors: {
    brand: {
      50: '#fff8e6',
      100: '#ffe6b3',
      200: '#ffd480',
      300: '#ffc24d',
      400: '#ffb01a',
      500: '#D4922A',
      600: '#b37a23',
      700: '#8c5f1b',
      800: '#664514',
      900: '#402b0c',
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
```

- [ ] **Step 6: Create App.jsx skeleton**

Create `web/src/App.jsx`:

```jsx
import { useState } from 'react'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

const APP_STATE = {
  INPUT: 'input',
  PREVIEW: 'preview',
  OUTPUT: 'output',
}

function App() {
  const [appState, setAppState] = useState(APP_STATE.INPUT)
  const [places, setPlaces] = useState([])
  const [theme, setTheme] = useState('minimal')

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading size="2xl" mb={2}>MyGreatCircle</Heading>
            <Text fontSize="lg" color="gray.400">
              Map the places that made you
            </Text>
          </Box>

          <Box p={6} bg="gray.800" borderRadius="lg">
            <Text>App state: {appState}</Text>
            <Text>Places: {places.length}</Text>
            <Text>Theme: {theme}</Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

export default App
```

- [ ] **Step 7: Install dependencies and verify**

```bash
cd web && npm install && npm run dev &
sleep 3
curl -s http://localhost:5173 | head -20
pkill -f "vite"
```

Expected: HTML response with React app

- [ ] **Step 8: Commit frontend setup**

```bash
git add web/
git commit -m "feat: set up React frontend with Chakra UI and Vite"
```

---

## Task 6: Input Parser Library

**Files:**
- Create: `web/src/lib/parser.js`
- Create: `web/src/lib/parser.test.js`

- [ ] **Step 1: Write parser tests**

Create `web/src/lib/parser.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { parsePlaceInput, parseSingleLine } from './parser'

describe('parseSingleLine', () => {
  it('parses place name only', () => {
    const result = parseSingleLine('London, UK')
    expect(result.name).toBe('London, UK')
    expect(result.yearStart).toBeUndefined()
    expect(result.yearEnd).toBeUndefined()
  })

  it('parses place with single year', () => {
    const result = parseSingleLine('Cape Town 1990')
    expect(result.name).toBe('Cape Town')
    expect(result.yearStart).toBe(1990)
    expect(result.yearEnd).toBeUndefined()
  })

  it('parses place with year range', () => {
    const result = parseSingleLine('Sydney, Australia 1985-1990')
    expect(result.name).toBe('Sydney, Australia')
    expect(result.yearStart).toBe(1985)
    expect(result.yearEnd).toBe(1990)
  })

  it('parses place with year range in parentheses', () => {
    const result = parseSingleLine('Paris (2000-2005)')
    expect(result.name).toBe('Paris')
    expect(result.yearStart).toBe(2000)
    expect(result.yearEnd).toBe(2005)
  })

  it('handles empty input', () => {
    const result = parseSingleLine('')
    expect(result).toBeNull()
  })

  it('handles whitespace-only input', () => {
    const result = parseSingleLine('   ')
    expect(result).toBeNull()
  })
})

describe('parsePlaceInput', () => {
  it('parses multiple lines', () => {
    const input = `London, UK
Cape Town 1990-1995
Sydney`
    const results = parsePlaceInput(input)
    expect(results).toHaveLength(3)
    expect(results[0].name).toBe('London, UK')
    expect(results[1].name).toBe('Cape Town')
    expect(results[1].yearStart).toBe(1990)
    expect(results[2].name).toBe('Sydney')
  })

  it('filters empty lines', () => {
    const input = `London

Cape Town

`
    const results = parsePlaceInput(input)
    expect(results).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Add vitest to package.json**

Edit `web/package.json`, add to devDependencies and scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.1.0",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd web && npm install && npm test
```

Expected: FAIL - module not found

- [ ] **Step 4: Implement parser**

Create `web/src/lib/parser.js`:

```javascript
import { v4 as uuidv4 } from 'uuid'

/**
 * Parse a single line of place input
 * Formats supported:
 *   "London, UK"
 *   "Cape Town 1990"
 *   "Sydney 1985-1990"
 *   "Paris (2000-2005)"
 *
 * @param {string} line - Single line of input
 * @returns {Object|null} Parsed place object or null if empty
 */
export function parseSingleLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Match year patterns at end of line
  // Pattern 1: 1990-1995 or 1990 - 1995
  // Pattern 2: (1990-1995) or (1990)
  // Pattern 3: 1990 (single year)

  const yearRangeRegex = /\s*\(?(\d{4})\s*[-–]\s*(\d{4})\)?$/
  const singleYearRegex = /\s*\(?(\d{4})\)?$/

  let name = trimmed
  let yearStart
  let yearEnd

  const rangeMatch = trimmed.match(yearRangeRegex)
  if (rangeMatch) {
    yearStart = parseInt(rangeMatch[1], 10)
    yearEnd = parseInt(rangeMatch[2], 10)
    name = trimmed.slice(0, rangeMatch.index).trim()
  } else {
    const singleMatch = trimmed.match(singleYearRegex)
    if (singleMatch) {
      // Only treat as year if it's a plausible year (1800-2100)
      const potentialYear = parseInt(singleMatch[1], 10)
      if (potentialYear >= 1800 && potentialYear <= 2100) {
        yearStart = potentialYear
        name = trimmed.slice(0, singleMatch.index).trim()
      }
    }
  }

  // Clean up trailing punctuation from name
  name = name.replace(/[,;:]+$/, '').trim()

  return {
    id: uuidv4(),
    rawInput: line,
    name,
    yearStart,
    yearEnd,
    coordinates: null,
    confidence: null,
    alternatives: null,
  }
}

/**
 * Parse multi-line place input
 * @param {string} input - Multi-line text input
 * @returns {Array} Array of parsed place objects
 */
export function parsePlaceInput(input) {
  return input
    .split('\n')
    .map(parseSingleLine)
    .filter(place => place !== null)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd web && npm test
```

Expected: PASS

- [ ] **Step 6: Commit parser**

```bash
git add web/src/lib/parser.js web/src/lib/parser.test.js web/package.json
git commit -m "feat: add place input parser with year extraction"
```

---

## Task 7: Geocoding Hook

**Files:**
- Create: `web/src/hooks/useGeocoding.js`

- [ ] **Step 1: Create geocoding hook**

Create `web/src/hooks/useGeocoding.js`:

```javascript
import { useState, useCallback } from 'react'

/**
 * Hook for geocoding places via the backend API
 * @returns {Object} { geocodePlace, geocodePlaces, isLoading, error }
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Geocode a single place
   * @param {string} query - Place name to geocode
   * @returns {Promise<Object>} Geocoding results
   */
  const geocodePlace = useCallback(async (query) => {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    return response.json()
  }, [])

  /**
   * Geocode an array of places, updating each with coordinates
   * @param {Array} places - Array of parsed place objects
   * @returns {Promise<Array>} Places with coordinates filled in
   */
  const geocodePlaces = useCallback(async (places) => {
    setIsLoading(true)
    setError(null)

    try {
      const geocodedPlaces = await Promise.all(
        places.map(async (place) => {
          try {
            const result = await geocodePlace(place.name)

            if (result.results && result.results.length > 0) {
              const best = result.results[0]
              return {
                ...place,
                coordinates: [best.lng, best.lat],
                confidence: best.confidence,
                alternatives: result.results.slice(1),
                geocodedName: best.name,
              }
            }

            return {
              ...place,
              confidence: 'failed',
              alternatives: [],
            }
          } catch (err) {
            console.error(`Failed to geocode "${place.name}":`, err)
            return {
              ...place,
              confidence: 'failed',
              alternatives: [],
            }
          }
        })
      )

      setIsLoading(false)
      return geocodedPlaces
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      throw err
    }
  }, [geocodePlace])

  return {
    geocodePlace,
    geocodePlaces,
    isLoading,
    error,
  }
}
```

- [ ] **Step 2: Commit geocoding hook**

```bash
git add web/src/hooks/useGeocoding.js
git commit -m "feat: add useGeocoding hook for API calls"
```

---

## Task 8: Theme Definitions

**Files:**
- Create: `web/src/lib/themes.js`

- [ ] **Step 1: Create theme definitions**

Create `web/src/lib/themes.js`:

```javascript
/**
 * Visual theme definitions for map and PDF rendering
 * Each theme defines colors for background, land, arcs, and points
 */

export const THEMES = {
  minimal: {
    id: 'minimal',
    name: 'Minimal Dark',
    description: 'Clean, sophisticated, gallery-worthy',
    background: {
      type: 'gradient',
      colors: ['#1a1a2e', '#16213e'],
      angle: 135,
    },
    land: {
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'rgba(255, 255, 255, 0.6)',
      strokeWidth: 1.5,
      glow: false,
    },
    point: {
      fill: '#ffffff',
      radius: 4,
      glow: false,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  neon: {
    id: 'neon',
    name: 'Vibrant Neon',
    description: 'Bold gradients, glowing arcs, electric energy',
    background: {
      type: 'solid',
      color: '#0f0f23',
    },
    land: {
      fill: 'rgba(255, 255, 255, 0.08)',
      stroke: 'rgba(255, 255, 255, 0.05)',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: 'url(#neonGradient)',
      strokeWidth: 3,
      glow: true,
      glowColor: 'rgba(255, 107, 107, 0.5)',
      glowRadius: 8,
    },
    arcGradient: {
      colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
    },
    point: {
      fill: '#feca57',
      radius: 6,
      glow: true,
      glowColor: 'rgba(254, 202, 87, 0.6)',
      glowRadius: 10,
    },
    text: {
      fill: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    },
  },

  vintage: {
    id: 'vintage',
    name: 'Vintage Cartography',
    description: 'Warm paper tones, explorer aesthetic',
    background: {
      type: 'solid',
      color: '#f4f1ea',
    },
    land: {
      fill: '#e8e0d0',
      stroke: '#c4b8a8',
      strokeWidth: 1,
    },
    arc: {
      stroke: '#5c4033',
      strokeWidth: 1.5,
      dashArray: '6,4',
      glow: false,
    },
    point: {
      fill: '#b85c38',
      radius: 5,
      glow: false,
    },
    text: {
      fill: '#5c4033',
      fontFamily: 'Georgia, serif',
    },
  },

  modern: {
    id: 'modern',
    name: 'Clean Modern',
    description: 'Light, professional, works everywhere',
    background: {
      type: 'gradient',
      colors: ['#ffffff', '#f8fafc'],
      angle: 180,
    },
    land: {
      fill: '#e2e8f0',
      stroke: '#cbd5e1',
      strokeWidth: 0.5,
    },
    arc: {
      stroke: '#3b82f6',
      strokeWidth: 2,
      glow: false,
    },
    point: {
      fill: '#3b82f6',
      radius: 5,
      glow: false,
    },
    text: {
      fill: '#1e293b',
      fontFamily: 'system-ui, sans-serif',
    },
  },
}

export const THEME_IDS = Object.keys(THEMES)

export function getTheme(id) {
  return THEMES[id] || THEMES.minimal
}
```

- [ ] **Step 2: Commit theme definitions**

```bash
git add web/src/lib/themes.js
git commit -m "feat: add visual theme definitions for map rendering"
```

---

## Task 9: Geo Utilities (Great Circle Math)

**Files:**
- Create: `web/src/lib/geo.js`
- Create: `web/src/lib/geo.test.js`

- [ ] **Step 1: Write geo utility tests**

Create `web/src/lib/geo.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { haversineDistance, generateGreatCirclePoints, computeJourneyStats } from './geo'

describe('haversineDistance', () => {
  it('calculates distance between London and Cape Town', () => {
    const london = [-0.1276, 51.5074]
    const capeTown = [18.4241, -33.9249]
    const distance = haversineDistance(london, capeTown)
    // Approximately 9,600 km
    expect(distance).toBeGreaterThan(9500)
    expect(distance).toBeLessThan(9700)
  })

  it('returns 0 for same point', () => {
    const point = [0, 0]
    expect(haversineDistance(point, point)).toBe(0)
  })
})

describe('generateGreatCirclePoints', () => {
  it('generates points along great circle arc', () => {
    const start = [-0.1276, 51.5074] // London
    const end = [18.4241, -33.9249]  // Cape Town
    const points = generateGreatCirclePoints(start, end, 10)

    expect(points).toHaveLength(10)
    expect(points[0]).toEqual(start)
    expect(points[points.length - 1][0]).toBeCloseTo(end[0], 1)
    expect(points[points.length - 1][1]).toBeCloseTo(end[1], 1)
  })
})

describe('computeJourneyStats', () => {
  it('computes stats for a journey', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074], geocodedName: 'London, UK' },
      { name: 'Cape Town', coordinates: [18.4241, -33.9249], geocodedName: 'Cape Town, South Africa' },
      { name: 'Sydney', coordinates: [151.2093, -33.8688], geocodedName: 'Sydney, Australia' },
    ]

    const stats = computeJourneyStats(places)

    expect(stats.totalPlaces).toBe(3)
    expect(stats.totalDistanceKm).toBeGreaterThan(20000)
    expect(stats.countries.length).toBeGreaterThanOrEqual(1)
    expect(stats.longestLegFrom).toBeDefined()
    expect(stats.longestLegTo).toBeDefined()
  })

  it('handles single place', () => {
    const places = [
      { name: 'London', coordinates: [-0.1276, 51.5074], geocodedName: 'London, UK' },
    ]

    const stats = computeJourneyStats(places)

    expect(stats.totalPlaces).toBe(1)
    expect(stats.totalDistanceKm).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test
```

Expected: FAIL - module not found

- [ ] **Step 3: Implement geo utilities**

Create `web/src/lib/geo.js`:

```javascript
import { geoInterpolate } from 'd3-geo'

const EARTH_RADIUS_KM = 6371

/**
 * Calculate distance between two points using Haversine formula
 * @param {Array} point1 - [longitude, latitude]
 * @param {Array} point2 - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(point1, point2) {
  const [lon1, lat1] = point1
  const [lon2, lat2] = point2

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * Generate points along a great circle arc
 * @param {Array} start - [longitude, latitude]
 * @param {Array} end - [longitude, latitude]
 * @param {number} numPoints - Number of points to generate
 * @returns {Array} Array of [longitude, latitude] points
 */
export function generateGreatCirclePoints(start, end, numPoints = 50) {
  const interpolate = geoInterpolate(start, end)
  const points = []

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    points.push(interpolate(t))
  }

  return points
}

/**
 * Extract country from geocoded name
 * @param {string} geocodedName - Full geocoded name (e.g., "London, UK")
 * @returns {string} Country name or last component
 */
export function extractCountry(geocodedName) {
  if (!geocodedName) return 'Unknown'
  const parts = geocodedName.split(',').map(s => s.trim())
  return parts[parts.length - 1] || 'Unknown'
}

/**
 * Compute journey statistics from geocoded places
 * @param {Array} places - Array of geocoded place objects
 * @returns {Object} Journey statistics
 */
export function computeJourneyStats(places) {
  const validPlaces = places.filter(p => p.coordinates)

  if (validPlaces.length === 0) {
    return {
      totalPlaces: 0,
      countries: [],
      totalDistanceKm: 0,
      longestLegKm: 0,
      longestLegFrom: null,
      longestLegTo: null,
    }
  }

  // Extract unique countries
  const countries = [...new Set(
    validPlaces
      .map(p => extractCountry(p.geocodedName))
      .filter(c => c !== 'Unknown')
  )]

  // Calculate distances between consecutive places
  let totalDistanceKm = 0
  let longestLegKm = 0
  let longestLegFrom = null
  let longestLegTo = null

  for (let i = 1; i < validPlaces.length; i++) {
    const from = validPlaces[i - 1]
    const to = validPlaces[i]
    const distance = haversineDistance(from.coordinates, to.coordinates)

    totalDistanceKm += distance

    if (distance > longestLegKm) {
      longestLegKm = distance
      longestLegFrom = from.name
      longestLegTo = to.name
    }
  }

  // Calculate years spanned if dates are available
  let yearsSpanned = null
  const placesWithYears = validPlaces.filter(p => p.yearStart)
  if (placesWithYears.length >= 2) {
    const years = placesWithYears.map(p => p.yearStart)
    yearsSpanned = Math.max(...years) - Math.min(...years)
  }

  // Find longest stay
  let longestStay = null
  for (const place of validPlaces) {
    if (place.yearStart && place.yearEnd) {
      const duration = place.yearEnd - place.yearStart
      if (!longestStay || duration > longestStay.years) {
        longestStay = { place: place.name, years: duration }
      }
    }
  }

  return {
    totalPlaces: validPlaces.length,
    countries,
    totalDistanceKm: Math.round(totalDistanceKm),
    longestLegKm: Math.round(longestLegKm),
    longestLegFrom,
    longestLegTo,
    yearsSpanned,
    longestStay,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd web && npm test
```

Expected: PASS

- [ ] **Step 5: Commit geo utilities**

```bash
git add web/src/lib/geo.js web/src/lib/geo.test.js
git commit -m "feat: add geo utilities for great circle math and journey stats"
```

---

## Task 10: Download World Map TopoJSON

**Files:**
- Create: `web/public/world-110m.json`

- [ ] **Step 1: Download world map data**

```bash
curl -o web/public/world-110m.json "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
```

- [ ] **Step 2: Verify file downloaded**

```bash
ls -la web/public/world-110m.json
head -c 200 web/public/world-110m.json
```

Expected: File exists and contains JSON

- [ ] **Step 3: Commit map data**

```bash
git add web/public/world-110m.json
git commit -m "feat: add world map TopoJSON data"
```

---

## Task 11: PlaceInput Component

**Files:**
- Create: `web/src/components/PlaceInput.jsx`

- [ ] **Step 1: Create PlaceInput component**

Create `web/src/components/PlaceInput.jsx`:

```jsx
import { useState } from 'react'
import {
  Box,
  Button,
  Textarea,
  VStack,
  Text,
  Heading,
} from '@chakra-ui/react'

const PLACEHOLDER = `Enter places you've lived or visited, one per line:

London, UK
Cape Town, South Africa 1990-1995
Sydney
Meadowridge, Cape Town`

export function PlaceInput({ onSubmit, isLoading }) {
  const [inputText, setInputText] = useState('')

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText)
    }
  }

  const lineCount = inputText.split('\n').filter(l => l.trim()).length

  return (
    <VStack spacing={6} align="stretch" maxW="600px" mx="auto">
      <Box textAlign="center">
        <Heading size="xl" mb={2}>MyGreatCircle</Heading>
        <Text fontSize="lg" color="gray.400">
          Map the places that made you
        </Text>
      </Box>

      <Box>
        <Text mb={2} fontSize="sm" color="gray.400">
          Enter places you've lived or visited, one per line.
          Years are optional (e.g., "London 1990" or "Paris 2000-2005").
        </Text>
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER}
          size="lg"
          minH="250px"
          bg="gray.800"
          border="1px solid"
          borderColor="gray.600"
          _hover={{ borderColor: 'gray.500' }}
          _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
          fontFamily="mono"
          fontSize="md"
        />
        <Text mt={2} fontSize="sm" color="gray.500">
          {lineCount} {lineCount === 1 ? 'place' : 'places'} entered
        </Text>
      </Box>

      <Button
        colorScheme="brand"
        size="lg"
        onClick={handleSubmit}
        isLoading={isLoading}
        isDisabled={lineCount === 0}
        loadingText="Finding your places..."
      >
        Show My Journey →
      </Button>
    </VStack>
  )
}
```

- [ ] **Step 2: Commit PlaceInput component**

```bash
git add web/src/components/PlaceInput.jsx
git commit -m "feat: add PlaceInput component with textarea and submit"
```

---

## Task 12: MapVisualization Component

**Files:**
- Create: `web/src/components/MapVisualization.jsx`

- [ ] **Step 1: Create MapVisualization component**

Create `web/src/components/MapVisualization.jsx`:

```jsx
import { useEffect, useRef, useMemo } from 'react'
import { Box } from '@chakra-ui/react'
import * as d3 from 'd3'
import { geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { getTheme } from '../lib/themes'
import { generateGreatCirclePoints } from '../lib/geo'

export function MapVisualization({
  places,
  theme = 'minimal',
  width = 800,
  height = 450,
  svgRef: externalSvgRef,
}) {
  const containerRef = useRef(null)
  const internalSvgRef = useRef(null)
  const svgRef = externalSvgRef || internalSvgRef

  const themeConfig = useMemo(() => getTheme(theme), [theme])

  const validPlaces = useMemo(() =>
    places.filter(p => p.coordinates),
    [places]
  )

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous content
    d3.select(containerRef.current).selectAll('*').remove()

    // Create SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    // Store ref
    svgRef.current = svg.node()

    // Add defs for gradients and filters
    const defs = svg.append('defs')

    // Background gradient
    if (themeConfig.background.type === 'gradient') {
      const bgGradient = defs.append('linearGradient')
        .attr('id', 'bgGradient')
        .attr('gradientTransform', `rotate(${themeConfig.background.angle})`)

      themeConfig.background.colors.forEach((color, i) => {
        bgGradient.append('stop')
          .attr('offset', `${(i / (themeConfig.background.colors.length - 1)) * 100}%`)
          .attr('stop-color', color)
      })
    }

    // Neon gradient for arcs
    if (themeConfig.arcGradient) {
      const arcGradient = defs.append('linearGradient')
        .attr('id', 'neonGradient')
        .attr('gradientUnits', 'userSpaceOnUse')

      themeConfig.arcGradient.colors.forEach((color, i) => {
        arcGradient.append('stop')
          .attr('offset', `${(i / (themeConfig.arcGradient.colors.length - 1)) * 100}%`)
          .attr('stop-color', color)
      })
    }

    // Glow filter
    if (themeConfig.arc.glow || themeConfig.point.glow) {
      const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%')

      filter.append('feGaussianBlur')
        .attr('stdDeviation', themeConfig.arc.glowRadius || 4)
        .attr('result', 'coloredBlur')

      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    }

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', themeConfig.background.type === 'gradient'
        ? 'url(#bgGradient)'
        : themeConfig.background.color)

    // Projection - Equal Earth (Patterson)
    const projection = geoEqualEarth()
      .scale(width / 5.5)
      .translate([width / 2, height / 2])

    const pathGenerator = geoPath().projection(projection)

    // Load and render world map
    d3.json('/world-110m.json').then(world => {
      const countries = feature(world, world.objects.countries)

      // Draw land
      svg.append('g')
        .selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', pathGenerator)
        .attr('fill', themeConfig.land.fill)
        .attr('stroke', themeConfig.land.stroke)
        .attr('stroke-width', themeConfig.land.strokeWidth)

      // Draw great circle arcs
      if (validPlaces.length >= 2) {
        const arcsGroup = svg.append('g').attr('class', 'arcs')

        for (let i = 1; i < validPlaces.length; i++) {
          const from = validPlaces[i - 1].coordinates
          const to = validPlaces[i].coordinates
          const points = generateGreatCirclePoints(from, to, 50)

          const lineGenerator = d3.line()
            .x(d => projection(d)[0])
            .y(d => projection(d)[1])
            .curve(d3.curveCardinal.tension(0.5))

          arcsGroup.append('path')
            .attr('d', lineGenerator(points))
            .attr('fill', 'none')
            .attr('stroke', themeConfig.arc.stroke)
            .attr('stroke-width', themeConfig.arc.strokeWidth)
            .attr('stroke-dasharray', themeConfig.arc.dashArray || 'none')
            .attr('filter', themeConfig.arc.glow ? 'url(#glow)' : null)
            .attr('opacity', 0)
            .transition()
            .duration(1000)
            .delay(i * 300)
            .attr('opacity', 1)
        }
      }

      // Draw place markers
      const pointsGroup = svg.append('g').attr('class', 'points')

      validPlaces.forEach((place, i) => {
        const [x, y] = projection(place.coordinates)

        pointsGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 0)
          .attr('fill', themeConfig.point.fill)
          .attr('filter', themeConfig.point.glow ? 'url(#glow)' : null)
          .transition()
          .duration(500)
          .delay(i * 200)
          .attr('r', themeConfig.point.radius)
      })
    })

  }, [validPlaces, theme, width, height, themeConfig, svgRef])

  return (
    <Box
      ref={containerRef}
      borderRadius="lg"
      overflow="hidden"
      boxShadow="xl"
    />
  )
}
```

- [ ] **Step 2: Commit MapVisualization component**

```bash
git add web/src/components/MapVisualization.jsx
git commit -m "feat: add D3.js MapVisualization with great circle arcs"
```

---

## Task 13: ThemeSelector Component

**Files:**
- Create: `web/src/components/ThemeSelector.jsx`

- [ ] **Step 1: Create ThemeSelector component**

Create `web/src/components/ThemeSelector.jsx`:

```jsx
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
```

- [ ] **Step 2: Commit ThemeSelector component**

```bash
git add web/src/components/ThemeSelector.jsx
git commit -m "feat: add ThemeSelector component"
```

---

## Task 14: PlaceList Component

**Files:**
- Create: `web/src/components/PlaceList.jsx`

- [ ] **Step 1: Create PlaceList component**

Create `web/src/components/PlaceList.jsx`:

```jsx
import {
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  Tooltip,
  Badge,
} from '@chakra-ui/react'

function ConfidenceIcon({ confidence }) {
  if (confidence === 'high') {
    return (
      <Tooltip label="Location confirmed">
        <Text color="green.400">✓</Text>
      </Tooltip>
    )
  }
  if (confidence === 'low') {
    return (
      <Tooltip label="Location uncertain - click to see alternatives">
        <Text color="yellow.400" cursor="pointer">⚠</Text>
      </Tooltip>
    )
  }
  return (
    <Tooltip label="Could not find location">
      <Text color="red.400">✗</Text>
    </Tooltip>
  )
}

export function PlaceList({ places, onPlaceClick }) {
  return (
    <VStack
      spacing={2}
      align="stretch"
      maxH="300px"
      overflowY="auto"
      pr={2}
    >
      <Text fontSize="sm" fontWeight="bold" color="gray.400" mb={1}>
        Your Places ({places.length})
      </Text>

      {places.map((place, index) => (
        <HStack
          key={place.id}
          p={2}
          bg="gray.700"
          borderRadius="md"
          spacing={3}
          cursor={place.confidence === 'low' ? 'pointer' : 'default'}
          onClick={() => place.confidence === 'low' && onPlaceClick?.(place)}
          _hover={place.confidence === 'low' ? { bg: 'gray.600' } : {}}
        >
          <Text fontSize="sm" color="gray.500" w="20px">
            {index + 1}
          </Text>

          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium">
              {place.name}
            </Text>
            {place.yearStart && (
              <Text fontSize="xs" color="gray.400">
                {place.yearStart}
                {place.yearEnd && `–${place.yearEnd}`}
              </Text>
            )}
          </Box>

          <ConfidenceIcon confidence={place.confidence} />
        </HStack>
      ))}
    </VStack>
  )
}
```

- [ ] **Step 2: Commit PlaceList component**

```bash
git add web/src/components/PlaceList.jsx
git commit -m "feat: add PlaceList component with confidence indicators"
```

---

## Task 15: InsightsPanel Component

**Files:**
- Create: `web/src/components/InsightsPanel.jsx`

- [ ] **Step 1: Create InsightsPanel component**

Create `web/src/components/InsightsPanel.jsx`:

```jsx
import {
  SimpleGrid,
  Box,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react'

function formatDistance(km) {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`
  }
  return `${km} km`
}

export function InsightsPanel({ stats }) {
  if (!stats || stats.totalPlaces === 0) {
    return null
  }

  return (
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
  )
}
```

- [ ] **Step 2: Commit InsightsPanel component**

```bash
git add web/src/components/InsightsPanel.jsx
git commit -m "feat: add InsightsPanel component for journey statistics"
```

---

## Task 16: PDF Generation Hook

**Files:**
- Create: `web/src/hooks/usePdfGeneration.js`

- [ ] **Step 1: Create PDF generation hook**

Create `web/src/hooks/usePdfGeneration.js`:

```jsx
import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'

/**
 * Hook for generating PDFs from the map visualization
 */
export function usePdfGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)

  /**
   * Generate fact sheet PDF (A4 portrait)
   */
  const generateFactSheet = useCallback(async (svgElement, places, stats, theme) => {
    setIsGenerating(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = 210
      const pageHeight = 297
      const margin = 15

      // Title
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('MyGreatCircle', pageWidth / 2, 25, { align: 'center' })

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(128)
      pdf.text('Your Life in Places', pageWidth / 2, 33, { align: 'center' })
      pdf.setTextColor(0)

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

      // Stats grid
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
        pdf.setTextColor(128)
        pdf.text(stat.label, x, y)

        pdf.setFontSize(18)
        pdf.setTextColor(0)
        pdf.setFont('helvetica', 'bold')
        pdf.text(stat.value, x, y + 8)

        pdf.setFontSize(8)
        pdf.setTextColor(128)
        pdf.setFont('helvetica', 'normal')
        pdf.text(stat.sub, x, y + 14)
      })

      // Places list
      const listY = 220
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0)
      pdf.text('Your Places:', margin, listY)

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
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

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(128)
      pdf.text('mygreatcircle.com', pageWidth / 2, pageHeight - 10, { align: 'center' })

      pdf.save('my-journey-factsheet.pdf')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  /**
   * Generate poster PDF (A3 landscape)
   */
  const generatePoster = useCallback(async (svgElement, places, theme) => {
    setIsGenerating(true)

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      })

      const pageWidth = 420
      const pageHeight = 297
      const margin = 10

      // Full-bleed map
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        await pdf.svg(svgClone, {
          x: margin,
          y: margin,
          width: pageWidth - margin * 2,
          height: pageHeight - 35,
        })
      }

      // Bottom bar with place names
      const footerY = pageHeight - 15
      pdf.setFontSize(10)
      pdf.setTextColor(128)

      const placeNames = places.map(p => p.name).join(' → ')
      const truncatedNames = placeNames.length > 100
        ? placeNames.slice(0, 100) + '...'
        : placeNames

      pdf.text(truncatedNames, margin, footerY)
      pdf.text('mygreatcircle.com', pageWidth - margin, footerY, { align: 'right' })

      pdf.save('my-journey-poster.pdf')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateFactSheet,
    generatePoster,
    isGenerating,
  }
}
```

- [ ] **Step 2: Commit PDF generation hook**

```bash
git add web/src/hooks/usePdfGeneration.js
git commit -m "feat: add PDF generation hook with fact sheet and poster support"
```

---

## Task 17: OutputCards and EmailModal Components

**Files:**
- Create: `web/src/components/OutputCards.jsx`
- Create: `web/src/components/EmailModal.jsx`

- [ ] **Step 1: Create EmailModal component**

Create `web/src/components/EmailModal.jsx`:

```jsx
import { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Input,
  Button,
  Text,
} from '@chakra-ui/react'

export function EmailModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return

    setIsSubmitting(true)
    try {
      await onSubmit(email)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.800">
        <ModalHeader>Get Your Poster</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <Text color="gray.400">
              Enter your email to unlock the high-resolution poster download.
              We'll also send you updates about new themes and features.
            </Text>

            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: 'brand.500' }}
            />

            <Button
              colorScheme="brand"
              width="100%"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!email || !email.includes('@')}
            >
              Download Poster
            </Button>

            <Text fontSize="xs" color="gray.500">
              We respect your privacy. Unsubscribe anytime.
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
```

- [ ] **Step 2: Create OutputCards component**

Create `web/src/components/OutputCards.jsx`:

```jsx
import { useState } from 'react'
import {
  SimpleGrid,
  Box,
  VStack,
  Heading,
  Text,
  Button,
  useDisclosure,
} from '@chakra-ui/react'
import { EmailModal } from './EmailModal'

export function OutputCards({
  onDownloadFactSheet,
  onDownloadPoster,
  isGenerating,
}) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleEmailSubmit = async (email) => {
    // In production, send email to backend
    console.log('Email captured:', email)
    // For now, just download the poster
    await onDownloadPoster()
  }

  return (
    <>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {/* Fact Sheet */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.600"
        >
          <VStack spacing={4} align="stretch">
            <Box textAlign="center">
              <Text fontSize="2xl" mb={2}>📄</Text>
              <Heading size="md">Fact Sheet</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A4 PDF with map, stats & places
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Button
              colorScheme="brand"
              onClick={onDownloadFactSheet}
              isLoading={isGenerating}
            >
              Download PDF
            </Button>
          </VStack>
        </Box>

        {/* Poster */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.600"
        >
          <VStack spacing={4} align="stretch">
            <Box textAlign="center">
              <Text fontSize="2xl" mb={2}>🖼️</Text>
              <Heading size="md">Poster</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                A3 landscape, print-ready
              </Text>
            </Box>
            <Text fontSize="sm" color="green.400" textAlign="center">
              Free
            </Text>
            <Button
              colorScheme="brand"
              onClick={onDownloadPoster}
              isLoading={isGenerating}
            >
              Download PDF
            </Button>
          </VStack>
        </Box>

        {/* Premium */}
        <Box
          bg="gray.700"
          p={6}
          borderRadius="lg"
          border="2px solid"
          borderColor="brand.500"
          position="relative"
        >
          <Box
            position="absolute"
            top={-3}
            right={4}
            bg="brand.500"
            px={2}
            py={0.5}
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
          >
            COMING SOON
          </Box>
          <VStack spacing={4} align="stretch">
            <Box textAlign="center">
              <Text fontSize="2xl" mb={2}>🎁</Text>
              <Heading size="md">Premium</Heading>
              <Text fontSize="sm" color="gray.400" mt={1}>
                Extra themes, no watermark
              </Text>
            </Box>
            <Text fontSize="sm" color="brand.400" textAlign="center">
              Unlock with email
            </Text>
            <Button
              variant="outline"
              colorScheme="brand"
              onClick={onOpen}
            >
              Get Notified
            </Button>
          </VStack>
        </Box>
      </SimpleGrid>

      <EmailModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleEmailSubmit}
      />
    </>
  )
}
```

- [ ] **Step 3: Commit output components**

```bash
git add web/src/components/OutputCards.jsx web/src/components/EmailModal.jsx
git commit -m "feat: add OutputCards and EmailModal components"
```

---

## Task 18: Footer Component

**Files:**
- Create: `web/src/components/Footer.jsx`

- [ ] **Step 1: Create Footer component**

Create `web/src/components/Footer.jsx`:

```jsx
import { Box, HStack, Link, Text } from '@chakra-ui/react'

export function Footer() {
  return (
    <Box
      py={6}
      textAlign="center"
      borderTop="1px solid"
      borderColor="gray.700"
      mt={8}
    >
      <HStack spacing={2} justify="center" wrap="wrap">
        <Text color="gray.400">Made with 💗 by</Text>
        <Link
          href="https://kartoza.com"
          isExternal
          color="brand.400"
          _hover={{ color: 'brand.300' }}
        >
          Kartoza
        </Link>
        <Text color="gray.600">|</Text>
        <Link
          href="https://github.com/sponsors/kartoza"
          isExternal
          color="brand.400"
          _hover={{ color: 'brand.300' }}
        >
          Donate!
        </Link>
        <Text color="gray.600">|</Text>
        <Link
          href="https://github.com/kartoza/MyGreatCircle"
          isExternal
          color="brand.400"
          _hover={{ color: 'brand.300' }}
        >
          GitHub
        </Link>
      </HStack>
    </Box>
  )
}
```

- [ ] **Step 2: Commit Footer component**

```bash
git add web/src/components/Footer.jsx
git commit -m "feat: add Footer component with Kartoza branding"
```

---

## Task 19: Integrate All Components in App.jsx

**Files:**
- Modify: `web/src/App.jsx`

- [ ] **Step 1: Update App.jsx with full integration**

Replace `web/src/App.jsx`:

```jsx
import { useState, useRef, useMemo } from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Flex,
  Spacer,
} from '@chakra-ui/react'

import { PlaceInput } from './components/PlaceInput'
import { MapVisualization } from './components/MapVisualization'
import { ThemeSelector } from './components/ThemeSelector'
import { PlaceList } from './components/PlaceList'
import { InsightsPanel } from './components/InsightsPanel'
import { OutputCards } from './components/OutputCards'
import { Footer } from './components/Footer'

import { useGeocoding } from './hooks/useGeocoding'
import { usePdfGeneration } from './hooks/usePdfGeneration'

import { parsePlaceInput } from './lib/parser'
import { computeJourneyStats } from './lib/geo'

const APP_STATE = {
  INPUT: 'input',
  PREVIEW: 'preview',
  OUTPUT: 'output',
}

function App() {
  const [appState, setAppState] = useState(APP_STATE.INPUT)
  const [places, setPlaces] = useState([])
  const [theme, setTheme] = useState('minimal')
  const [inputText, setInputText] = useState('')

  const svgRef = useRef(null)

  const { geocodePlaces, isLoading: isGeocoding } = useGeocoding()
  const { generateFactSheet, generatePoster, isGenerating } = usePdfGeneration()

  const stats = useMemo(() => computeJourneyStats(places), [places])

  const handleInputSubmit = async (text) => {
    setInputText(text)
    const parsed = parsePlaceInput(text)
    const geocoded = await geocodePlaces(parsed)
    setPlaces(geocoded)
    setAppState(APP_STATE.PREVIEW)
  }

  const handleBack = () => {
    if (appState === APP_STATE.OUTPUT) {
      setAppState(APP_STATE.PREVIEW)
    } else {
      setAppState(APP_STATE.INPUT)
    }
  }

  const handleGenerateOutputs = () => {
    setAppState(APP_STATE.OUTPUT)
  }

  const handleDownloadFactSheet = async () => {
    await generateFactSheet(svgRef.current, places, stats, theme)
  }

  const handleDownloadPoster = async () => {
    await generatePoster(svgRef.current, places, theme)
  }

  const handleStartOver = () => {
    setPlaces([])
    setInputText('')
    setAppState(APP_STATE.INPUT)
  }

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">

          {/* INPUT STATE */}
          {appState === APP_STATE.INPUT && (
            <PlaceInput
              onSubmit={handleInputSubmit}
              isLoading={isGeocoding}
            />
          )}

          {/* PREVIEW STATE */}
          {appState === APP_STATE.PREVIEW && (
            <>
              <Flex align="center" wrap="wrap" gap={4}>
                <Button variant="ghost" onClick={handleBack}>
                  ← Back
                </Button>
                <Spacer />
                <ThemeSelector
                  currentTheme={theme}
                  onThemeChange={setTheme}
                />
                <Spacer />
                <Button
                  colorScheme="brand"
                  onClick={handleGenerateOutputs}
                >
                  Generate Outputs →
                </Button>
              </Flex>

              <Flex
                direction={{ base: 'column', lg: 'row' }}
                gap={6}
              >
                <Box flex={1}>
                  <MapVisualization
                    places={places}
                    theme={theme}
                    width={800}
                    height={450}
                    svgRef={svgRef}
                  />
                </Box>
                <Box w={{ base: '100%', lg: '280px' }}>
                  <PlaceList places={places} />
                </Box>
              </Flex>

              <InsightsPanel stats={stats} />
            </>
          )}

          {/* OUTPUT STATE */}
          {appState === APP_STATE.OUTPUT && (
            <>
              <Flex align="center" wrap="wrap" gap={4}>
                <Button variant="ghost" onClick={handleBack}>
                  ← Change Theme
                </Button>
                <Spacer />
                <Heading size="lg">Your Journey</Heading>
                <Spacer />
                <Button variant="ghost" onClick={handleStartOver}>
                  Start Over
                </Button>
              </Flex>

              <Box>
                <MapVisualization
                  places={places}
                  theme={theme}
                  width={800}
                  height={400}
                  svgRef={svgRef}
                />
              </Box>

              <InsightsPanel stats={stats} />

              <OutputCards
                onDownloadFactSheet={handleDownloadFactSheet}
                onDownloadPoster={handleDownloadPoster}
                isGenerating={isGenerating}
              />
            </>
          )}

          <Footer />
        </VStack>
      </Container>
    </Box>
  )
}

export default App
```

- [ ] **Step 2: Verify the app runs**

```bash
cd web && npm run dev &
sleep 3
curl -s http://localhost:5173 | grep "MyGreatCircle"
pkill -f "vite"
```

Expected: HTML containing "MyGreatCircle"

- [ ] **Step 3: Commit full integration**

```bash
git add web/src/App.jsx
git commit -m "feat: integrate all components in App.jsx"
```

---

## Task 20: Pre-commit Configuration

**Files:**
- Create: `.pre-commit-config.yaml`

- [ ] **Step 1: Create pre-commit config**

Create `.pre-commit-config.yaml`:

```yaml
repos:
  # Go
  - repo: https://github.com/dnephin/pre-commit-golang
    rev: v0.5.1
    hooks:
      - id: go-fmt
      - id: go-vet
      - id: go-imports

  - repo: https://github.com/golangci/golangci-lint
    rev: v1.61.0
    hooks:
      - id: golangci-lint

  # JavaScript/React
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v4.0.0-alpha.8
    hooks:
      - id: prettier
        types_or: [javascript, jsx, json, css]
        args: ['--write']

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v9.15.0
    hooks:
      - id: eslint
        types: [javascript]
        args: ['--fix']
        additional_dependencies:
          - eslint
          - eslint-plugin-react
          - eslint-plugin-react-hooks

  # General
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=1000']

  - repo: https://github.com/codespell-project/codespell
    rev: v2.3.0
    hooks:
      - id: codespell
        args: ['-L', 'crate,nd']
```

- [ ] **Step 2: Commit pre-commit config**

```bash
git add .pre-commit-config.yaml
git commit -m "feat: add pre-commit hooks for Go and JS linting"
```

---

## Task 21: GitHub Actions CI

**Files:**
- Create: `.github/workflows/test.yml`
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Create test workflow**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-go:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run Go tests
        run: go test -v ./...

      - name: Run Go vet
        run: go vet ./...

      - name: Run golangci-lint
        uses: golangci/golangci-lint-action@v6
        with:
          version: latest

  test-web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run lint
        run: npm run lint
```

- [ ] **Step 2: Create build workflow**

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Build web frontend
        run: |
          cd web
          npm ci
          npm run build

      - name: Build Go binary
        run: go build -v ./cmd/mygreatcircle

      - name: Upload binary
        uses: actions/upload-artifact@v4
        with:
          name: mygreatcircle-${{ matrix.os }}
          path: mygreatcircle*
```

- [ ] **Step 3: Commit CI workflows**

```bash
git add .github/
git commit -m "feat: add GitHub Actions for testing and building"
```

---

## Task 22: Neovim Integration

**Files:**
- Create: `.exrc`
- Create: `.nvim.lua`

- [ ] **Step 1: Create .exrc**

Create `.exrc`:

```vim
" MyGreatCircle project shortcuts
" All under <leader>p prefix

" Build & Run
nnoremap <leader>pb :!make build<CR>
nnoremap <leader>pr :!make run<CR>
nnoremap <leader>pd :!make dev<CR>

" Testing
nnoremap <leader>pt :!make test<CR>
nnoremap <leader>pT :!cd web && npm test<CR>

" Linting
nnoremap <leader>pl :!make lint<CR>
nnoremap <leader>pL :!cd web && npm run lint<CR>

" Web
nnoremap <leader>pwi :!cd web && npm install<CR>
nnoremap <leader>pwd :!cd web && npm run dev<CR>
nnoremap <leader>pwb :!cd web && npm run build<CR>

" Documentation
nnoremap <leader>pdd :!make docs-dev<CR>
nnoremap <leader>pdb :!make docs-build<CR>
```

- [ ] **Step 2: Create .nvim.lua**

Create `.nvim.lua`:

```lua
-- MyGreatCircle project-specific Neovim configuration

-- Go settings
vim.api.nvim_create_autocmd("FileType", {
  pattern = "go",
  callback = function()
    vim.opt_local.tabstop = 4
    vim.opt_local.shiftwidth = 4
    vim.opt_local.expandtab = false
  end,
})

-- JavaScript/JSX settings
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "javascript", "javascriptreact", "json" },
  callback = function()
    vim.opt_local.tabstop = 2
    vim.opt_local.shiftwidth = 2
    vim.opt_local.expandtab = true
  end,
})

-- Format on save for Go
vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = "*.go",
  callback = function()
    vim.lsp.buf.format({ async = false })
  end,
})

-- Which-key mappings (if available)
local ok, wk = pcall(require, "which-key")
if ok then
  wk.register({
    p = {
      name = "Project",
      b = { "<cmd>!make build<CR>", "Build" },
      r = { "<cmd>!make run<CR>", "Run" },
      d = { "<cmd>!make dev<CR>", "Dev servers" },
      t = { "<cmd>!make test<CR>", "Test Go" },
      T = { "<cmd>!cd web && npm test<CR>", "Test Web" },
      l = { "<cmd>!make lint<CR>", "Lint Go" },
      L = { "<cmd>!cd web && npm run lint<CR>", "Lint Web" },
      w = {
        name = "Web",
        i = { "<cmd>!cd web && npm install<CR>", "Install" },
        d = { "<cmd>!cd web && npm run dev<CR>", "Dev" },
        b = { "<cmd>!cd web && npm run build<CR>", "Build" },
      },
    },
  }, { prefix = "<leader>" })
end
```

- [ ] **Step 3: Commit Neovim config**

```bash
git add .exrc .nvim.lua
git commit -m "feat: add Neovim project configuration"
```

---

## Task 23: SPECIFICATION.md and PACKAGES.md

**Files:**
- Create: `SPECIFICATION.md`
- Create: `PACKAGES.md`

- [ ] **Step 1: Create SPECIFICATION.md**

Create `SPECIFICATION.md`:

```markdown
# MyGreatCircle Specification

## Overview

MyGreatCircle is a web application that visualizes personal location history as beautiful great circle arcs on a world map.

## User Stories

### US-001: Enter Places
As a user, I want to enter a list of places I've lived or visited so that I can visualize my life journey.

**Acceptance Criteria:**
- Text area accepts multiple lines, one place per line
- Optional year or year range supported (e.g., "London 1990-1995")
- Places are geocoded automatically upon submission
- Ambiguous places show alternatives for selection

### US-002: View Visualization
As a user, I want to see my places connected by great circle arcs so that I can appreciate my life's geographic journey.

**Acceptance Criteria:**
- Map displays with selected visual theme
- Great circles connect places in sequence
- Place markers visible with animation
- Four themes available: Minimal Dark, Vibrant Neon, Vintage, Clean Modern

### US-003: View Insights
As a user, I want to see statistics about my journey so that I can understand my travel patterns.

**Acceptance Criteria:**
- Total places count displayed
- Countries count displayed
- Total journey distance in kilometers
- Longest single move highlighted

### US-004: Download Fact Sheet
As a user, I want to download a PDF fact sheet so that I can share or print my journey summary.

**Acceptance Criteria:**
- A4 portrait PDF generated
- Contains map visualization, stats, and place list
- Branding watermark in footer
- Downloads immediately without account

### US-005: Download Poster
As a user, I want to download a print-ready poster so that I can display my journey.

**Acceptance Criteria:**
- A3 landscape PDF generated
- Full-bleed map visualization
- Place sequence in footer
- Downloads immediately without account

## Technical Requirements

### TR-001: Geocoding
- Use Nominatim (OpenStreetMap) for geocoding
- Cache results with 7-day TTL
- Handle rate limiting gracefully

### TR-002: Client-Side Processing
- Visualization rendered with D3.js
- PDF generation with jsPDF + svg2pdf.js
- No server-side processing for PDFs

### TR-003: Stateless Architecture
- No user accounts required
- No database for MVP
- Session data lives only in browser

## API Specification

See `docs/superpowers/specs/2026-04-12-mygreatcircle-design.md` for full API documentation.
```

- [ ] **Step 2: Create PACKAGES.md**

Create `PACKAGES.md`:

```markdown
# MyGreatCircle Package Architecture

## Go Backend

### cmd/mygreatcircle
Entry point for the application. Handles CLI flags and starts the HTTP server.

### internal/api
HTTP server and handlers.
- `server.go` - Server setup, middleware, routing
- `handlers.go` - Health check endpoint
- `geocode.go` - Nominatim proxy with rate limiting

### internal/cache
Generic caching utilities.
- `lru.go` - LRU cache with TTL support

## React Frontend

### web/src/components
React UI components.
- `PlaceInput.jsx` - Text area for entering places
- `MapVisualization.jsx` - D3.js SVG map with great circles
- `ThemeSelector.jsx` - Visual theme toggle
- `PlaceList.jsx` - List of geocoded places with confidence
- `InsightsPanel.jsx` - Journey statistics display
- `OutputCards.jsx` - PDF download cards
- `EmailModal.jsx` - Email capture modal
- `Footer.jsx` - Branding footer

### web/src/hooks
React custom hooks.
- `useGeocoding.js` - Geocoding API calls
- `usePdfGeneration.js` - PDF generation logic

### web/src/lib
Utility libraries.
- `parser.js` - Parse place input text
- `themes.js` - Visual theme definitions
- `geo.js` - Great circle math and journey stats

## Dependencies

### Go
- Standard library only (no external dependencies)

### JavaScript
- React 18 - UI framework
- Chakra UI - Component library
- D3.js - Data visualization
- jsPDF - PDF generation
- svg2pdf.js - SVG to PDF conversion
- topojson-client - Map data parsing
- uuid - ID generation

## Build System
- Nix - Reproducible development environment
- Vite - Frontend build tool
- Make - Task automation
```

- [ ] **Step 3: Commit documentation**

```bash
git add SPECIFICATION.md PACKAGES.md
git commit -m "docs: add SPECIFICATION.md and PACKAGES.md"
```

---

## Task 24: Final Verification

- [ ] **Step 1: Run all Go tests**

```bash
go test ./... -v
```

Expected: All tests pass

- [ ] **Step 2: Run all frontend tests**

```bash
cd web && npm test
```

Expected: All tests pass

- [ ] **Step 3: Build production binary**

```bash
make build
```

Expected: Binary created successfully

- [ ] **Step 4: Build frontend**

```bash
make web-build
```

Expected: `web/dist/` created with production build

- [ ] **Step 5: Start full application**

```bash
./mygreatcircle -web web/dist &
sleep 2
curl -s http://localhost:8080/api/health
curl -s http://localhost:8080 | head -5
pkill mygreatcircle
```

Expected: Health check returns `{"status":"ok"}`, main page returns HTML

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: MyGreatCircle MVP complete"
```

---

## Summary

This plan implements the complete MyGreatCircle MVP:

1. **Tasks 1-4:** Project foundation and Go backend
2. **Tasks 5-9:** React frontend setup and core libraries
3. **Tasks 10-18:** UI components and PDF generation
4. **Tasks 19-23:** Integration, CI/CD, and documentation
5. **Task 24:** Final verification

Total: 24 tasks with ~100 granular steps following TDD principles.
