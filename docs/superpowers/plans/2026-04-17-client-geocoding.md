# Client-Side Geocoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Nominatim geocoding from server to client, implement 3-tier caching (localStorage, SQLite, Nominatim), add OSM attribution, and replace PDF place lists with word clouds.

**Architecture:** Client handles all Nominatim requests directly with rate limiting. Go backend serves as a shared fuzzy-match cache using SQLite with Levenshtein distance. PDF generation renders place names as scattered word cloud in margins.

**Tech Stack:** Go + SQLite (mattn/go-sqlite3), Levenshtein (agnivade/levenshtein), React hooks, jsPDF

---

## File Structure

### Backend (Go) - New Files

| File | Responsibility |
|------|----------------|
| `internal/db/db.go` | Database connection, migrations |
| `internal/db/repository.go` | PlaceRepository interface |
| `internal/db/sqlite.go` | SQLite implementation |
| `internal/api/places.go` | `/api/places/lookup` and `/api/places/submit` handlers |
| `internal/db/db_test.go` | Repository tests |
| `internal/api/places_test.go` | Places API tests |

### Backend (Go) - Modified Files

| File | Changes |
|------|---------|
| `cmd/mygreatcircle/main.go` | Add `-db` flag, initialize database |
| `internal/api/server.go` | Add PlaceRepository, register new routes |

### Backend (Go) - Deleted Files

| File | Reason |
|------|--------|
| `internal/api/geocode.go` | Replaced by client-side Nominatim |
| `internal/api/geocode_test.go` | Tests for removed code |
| `internal/cache/lru.go` | No longer needed (SQLite replaces LRU) |
| `internal/cache/lru_test.go` | Tests for removed code |

### Frontend (JavaScript) - Modified Files

| File | Changes |
|------|---------|
| `web/src/hooks/useGeocoding.js` | 3-tier caching, client-side Nominatim |
| `web/src/hooks/usePdfGeneration.js` | Word cloud renderer, attribution |
| `web/src/components/Footer.jsx` | Add Nominatim/OSM attribution |

### Frontend (JavaScript) - New Files

| File | Responsibility |
|------|----------------|
| `web/src/lib/nominatim.js` | Nominatim API client with rate limiting |
| `web/src/lib/nominatim.test.js` | Tests for Nominatim client |
| `web/src/lib/wordcloud.js` | Word cloud positioning algorithm |
| `web/src/lib/wordcloud.test.js` | Tests for word cloud |

---

## Task 1: Add Go Dependencies

**Files:**
- Modify: `go.mod`
- Modify: `go.sum`

- [ ] **Step 1: Add SQLite and Levenshtein dependencies**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go get github.com/mattn/go-sqlite3 github.com/agnivade/levenshtein
```

- [ ] **Step 2: Verify dependencies installed**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go mod tidy && cat go.mod
```

Expected: `go.mod` contains `github.com/mattn/go-sqlite3` and `github.com/agnivade/levenshtein`

- [ ] **Step 3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add go.mod go.sum && git commit -m "deps: add sqlite3 and levenshtein packages"
```

---

## Task 2: Create Database Layer - Interface and Types

**Files:**
- Create: `internal/db/repository.go`

- [ ] **Step 1: Write the failing test for Place type**

Create `internal/db/db_test.go`:

```go
package db

import (
	"testing"
)

func TestPlaceStruct(t *testing.T) {
	p := Place{
		ID:              1,
		QueryNormalized: "cape town",
		DisplayName:     "Cape Town, Western Cape, South Africa",
		Lat:             -33.92,
		Lng:             18.42,
		Importance:      0.8,
		HitCount:        5,
	}

	if p.QueryNormalized != "cape town" {
		t.Errorf("expected 'cape town', got %s", p.QueryNormalized)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/db/... -v
```

Expected: FAIL - `package db: no Go files`

- [ ] **Step 3: Create repository interface and types**

Create `internal/db/repository.go`:

```go
package db

import (
	"context"
	"time"
)

// Place represents a geocoded location stored in the cache
type Place struct {
	ID              int64     `json:"id"`
	QueryNormalized string    `json:"queryNormalized"`
	DisplayName     string    `json:"displayName"`
	Lat             float64   `json:"lat"`
	Lng             float64   `json:"lng"`
	Importance      float64   `json:"importance"`
	CreatedAt       time.Time `json:"createdAt"`
	HitCount        int       `json:"hitCount"`
}

// PlaceRepository defines the interface for place storage
type PlaceRepository interface {
	// FindExact finds a place by exact normalized query match
	FindExact(ctx context.Context, query string) (*Place, error)

	// FindFuzzy finds places within maxDistance Levenshtein distance
	FindFuzzy(ctx context.Context, query string, maxDistance int) ([]Place, error)

	// Save stores a new place or updates if query already exists
	Save(ctx context.Context, place *Place) error

	// IncrementHitCount increases the hit count for a place
	IncrementHitCount(ctx context.Context, id int64) error

	// Close closes the database connection
	Close() error
}

// NormalizeQuery lowercases and trims a query string
func NormalizeQuery(query string) string {
	return strings.ToLower(strings.TrimSpace(query))
}
```

- [ ] **Step 4: Add missing import**

The file needs `"strings"` import. Update `internal/db/repository.go`:

```go
package db

import (
	"context"
	"strings"
	"time"
)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/db/... -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add internal/db/repository.go internal/db/db_test.go && git commit -m "feat(db): add PlaceRepository interface and Place type"
```

---

## Task 3: Implement SQLite Repository

**Files:**
- Create: `internal/db/sqlite.go`
- Modify: `internal/db/db_test.go`

- [ ] **Step 1: Write the failing test for SQLite repository**

Add to `internal/db/db_test.go`:

```go
func TestSQLiteRepository_SaveAndFindExact(t *testing.T) {
	repo, err := NewSQLiteRepository(":memory:")
	if err != nil {
		t.Fatalf("failed to create repo: %v", err)
	}
	defer repo.Close()

	ctx := context.Background()
	place := &Place{
		QueryNormalized: "cape town",
		DisplayName:     "Cape Town, Western Cape, South Africa",
		Lat:             -33.92,
		Lng:             18.42,
		Importance:      0.8,
	}

	err = repo.Save(ctx, place)
	if err != nil {
		t.Fatalf("failed to save: %v", err)
	}

	found, err := repo.FindExact(ctx, "cape town")
	if err != nil {
		t.Fatalf("failed to find: %v", err)
	}
	if found == nil {
		t.Fatal("expected to find place")
	}
	if found.DisplayName != "Cape Town, Western Cape, South Africa" {
		t.Errorf("wrong display name: %s", found.DisplayName)
	}
}
```

Add import `"context"` to the test file.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/db/... -v
```

Expected: FAIL - `undefined: NewSQLiteRepository`

- [ ] **Step 3: Implement SQLite repository**

Create `internal/db/sqlite.go`:

```go
package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/agnivade/levenshtein"
	_ "github.com/mattn/go-sqlite3"
)

// SQLiteRepository implements PlaceRepository using SQLite
type SQLiteRepository struct {
	db *sql.DB
}

// NewSQLiteRepository creates a new SQLite repository at the given path
func NewSQLiteRepository(dbPath string) (*SQLiteRepository, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	repo := &SQLiteRepository{db: db}
	if err := repo.migrate(); err != nil {
		db.Close()
		return nil, err
	}

	return repo, nil
}

func (r *SQLiteRepository) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS places (
		id              INTEGER PRIMARY KEY AUTOINCREMENT,
		query_normalized TEXT NOT NULL UNIQUE,
		display_name    TEXT NOT NULL,
		lat             REAL NOT NULL,
		lng             REAL NOT NULL,
		importance      REAL,
		created_at      TEXT DEFAULT (datetime('now')),
		hit_count       INTEGER DEFAULT 1
	);
	CREATE INDEX IF NOT EXISTS idx_places_query ON places (query_normalized);
	`
	_, err := r.db.Exec(schema)
	return err
}

func (r *SQLiteRepository) FindExact(ctx context.Context, query string) (*Place, error) {
	normalized := NormalizeQuery(query)
	row := r.db.QueryRowContext(ctx, `
		SELECT id, query_normalized, display_name, lat, lng, importance, created_at, hit_count
		FROM places WHERE query_normalized = ?
	`, normalized)

	var p Place
	var createdAt string
	err := row.Scan(&p.ID, &p.QueryNormalized, &p.DisplayName, &p.Lat, &p.Lng, &p.Importance, &createdAt, &p.HitCount)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	p.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	return &p, nil
}

func (r *SQLiteRepository) FindFuzzy(ctx context.Context, query string, maxDistance int) ([]Place, error) {
	normalized := NormalizeQuery(query)
	if len(normalized) < 3 {
		return nil, nil
	}

	// Get candidates with matching prefix (first 3 chars)
	prefix := normalized[:3]
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, query_normalized, display_name, lat, lng, importance, created_at, hit_count
		FROM places WHERE query_normalized LIKE ? || '%'
	`, prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []Place
	for rows.Next() {
		var p Place
		var createdAt string
		if err := rows.Scan(&p.ID, &p.QueryNormalized, &p.DisplayName, &p.Lat, &p.Lng, &p.Importance, &createdAt, &p.HitCount); err != nil {
			return nil, err
		}
		p.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)

		// Filter by Levenshtein distance
		dist := levenshtein.ComputeDistance(normalized, p.QueryNormalized)
		if dist <= maxDistance {
			results = append(results, p)
		}
	}

	return results, rows.Err()
}

func (r *SQLiteRepository) Save(ctx context.Context, place *Place) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO places (query_normalized, display_name, lat, lng, importance)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(query_normalized) DO UPDATE SET
			display_name = excluded.display_name,
			lat = excluded.lat,
			lng = excluded.lng,
			importance = excluded.importance,
			hit_count = hit_count + 1
	`, NormalizeQuery(place.QueryNormalized), place.DisplayName, place.Lat, place.Lng, place.Importance)
	return err
}

func (r *SQLiteRepository) IncrementHitCount(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE places SET hit_count = hit_count + 1 WHERE id = ?`, id)
	return err
}

func (r *SQLiteRepository) Close() error {
	return r.db.Close()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/db/... -v
```

Expected: PASS

- [ ] **Step 5: Add fuzzy matching test**

Add to `internal/db/db_test.go`:

```go
func TestSQLiteRepository_FindFuzzy(t *testing.T) {
	repo, err := NewSQLiteRepository(":memory:")
	if err != nil {
		t.Fatalf("failed to create repo: %v", err)
	}
	defer repo.Close()

	ctx := context.Background()

	// Save "johannesburg"
	err = repo.Save(ctx, &Place{
		QueryNormalized: "johannesburg",
		DisplayName:     "Johannesburg, Gauteng, South Africa",
		Lat:             -26.20,
		Lng:             28.04,
		Importance:      0.82,
	})
	if err != nil {
		t.Fatalf("failed to save: %v", err)
	}

	// Search for "johanesburg" (typo - missing 'n')
	results, err := repo.FindFuzzy(ctx, "johanesburg", 3)
	if err != nil {
		t.Fatalf("failed to find fuzzy: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].DisplayName != "Johannesburg, Gauteng, South Africa" {
		t.Errorf("wrong result: %s", results[0].DisplayName)
	}
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/db/... -v
```

Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add internal/db/sqlite.go internal/db/db_test.go && git commit -m "feat(db): implement SQLite repository with fuzzy matching"
```

---

## Task 4: Create Places API Handlers

**Files:**
- Create: `internal/api/places.go`
- Create: `internal/api/places_test.go`

- [ ] **Step 1: Write the failing test for lookup handler**

Create `internal/api/places_test.go`:

```go
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

func TestPlacesLookup_ExactMatch(t *testing.T) {
	repo, err := db.NewSQLiteRepository(":memory:")
	if err != nil {
		t.Fatalf("failed to create repo: %v", err)
	}
	defer repo.Close()

	// Pre-populate cache
	ctx := context.Background()
	repo.Save(ctx, &db.Place{
		QueryNormalized: "cape town",
		DisplayName:     "Cape Town, Western Cape, South Africa",
		Lat:             -33.92,
		Lng:             18.42,
		Importance:      0.8,
	})

	server := NewServer(8080, ".", repo)

	body := `{"queries": ["Cape Town"]}`
	req := httptest.NewRequest("POST", "/api/places/lookup", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	server.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp LookupResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if len(resp.Resolved) != 1 {
		t.Fatalf("expected 1 resolved, got %d", len(resp.Resolved))
	}
	if _, ok := resp.Resolved["cape town"]; !ok {
		t.Error("expected 'cape town' in resolved")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/api/... -v -run TestPlacesLookup
```

Expected: FAIL - `undefined: LookupResponse`

- [ ] **Step 3: Create places handler**

Create `internal/api/places.go`:

```go
package api

import (
	"encoding/json"
	"net/http"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

// LookupRequest is the request body for /api/places/lookup
type LookupRequest struct {
	Queries []string `json:"queries"`
}

// ResolvedPlace is a successfully resolved place
type ResolvedPlace struct {
	DisplayName string  `json:"displayName"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

// LookupResponse is the response for /api/places/lookup
type LookupResponse struct {
	Resolved   map[string]ResolvedPlace `json:"resolved"`
	Unresolved []string                 `json:"unresolved"`
}

// SubmitRequest is the request body for /api/places/submit
type SubmitRequest struct {
	Places []SubmitPlace `json:"places"`
}

// SubmitPlace is a place to be cached
type SubmitPlace struct {
	Query       string  `json:"query"`
	DisplayName string  `json:"displayName"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Importance  float64 `json:"importance"`
}

// SubmitResponse is the response for /api/places/submit
type SubmitResponse struct {
	Saved int `json:"saved"`
}

func (s *Server) handlePlacesLookup(w http.ResponseWriter, r *http.Request) {
	var req LookupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	resolved := make(map[string]ResolvedPlace)
	var unresolved []string

	for _, query := range req.Queries {
		normalized := db.NormalizeQuery(query)

		// Try exact match first
		place, err := s.placeRepo.FindExact(ctx, normalized)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		if place != nil {
			s.placeRepo.IncrementHitCount(ctx, place.ID)
			resolved[normalized] = ResolvedPlace{
				DisplayName: place.DisplayName,
				Lat:         place.Lat,
				Lng:         place.Lng,
			}
			continue
		}

		// Try fuzzy match (max distance 3)
		fuzzyResults, err := s.placeRepo.FindFuzzy(ctx, normalized, 3)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		if len(fuzzyResults) > 0 {
			// Return best match (first result, sorted by distance then hit_count)
			best := fuzzyResults[0]
			s.placeRepo.IncrementHitCount(ctx, best.ID)
			resolved[normalized] = ResolvedPlace{
				DisplayName: best.DisplayName,
				Lat:         best.Lat,
				Lng:         best.Lng,
			}
			continue
		}

		// Not found
		unresolved = append(unresolved, query)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LookupResponse{
		Resolved:   resolved,
		Unresolved: unresolved,
	})
}

func (s *Server) handlePlacesSubmit(w http.ResponseWriter, r *http.Request) {
	var req SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	saved := 0

	for _, p := range req.Places {
		place := &db.Place{
			QueryNormalized: p.Query,
			DisplayName:     p.DisplayName,
			Lat:             p.Lat,
			Lng:             p.Lng,
			Importance:      p.Importance,
		}
		if err := s.placeRepo.Save(ctx, place); err != nil {
			// Log but continue
			continue
		}
		saved++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SubmitResponse{Saved: saved})
}
```

- [ ] **Step 4: Update Server to include PlaceRepository**

Modify `internal/api/server.go`:

```go
package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

type Server struct {
	port      int
	webDir    string
	mux       *http.ServeMux
	placeRepo db.PlaceRepository
}

func NewServer(port int, webDir string, placeRepo db.PlaceRepository) *Server {
	s := &Server{
		port:      port,
		webDir:    webDir,
		mux:       http.NewServeMux(),
		placeRepo: placeRepo,
	}
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("POST /api/places/lookup", s.handlePlacesLookup)
	s.mux.HandleFunc("POST /api/places/submit", s.handlePlacesSubmit)

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

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/api/... -v -run TestPlacesLookup
```

Expected: PASS

- [ ] **Step 6: Add submit test**

Add to `internal/api/places_test.go`:

```go
func TestPlacesSubmit(t *testing.T) {
	repo, err := db.NewSQLiteRepository(":memory:")
	if err != nil {
		t.Fatalf("failed to create repo: %v", err)
	}
	defer repo.Close()

	server := NewServer(8080, ".", repo)

	body := `{
		"places": [{
			"query": "Durban",
			"displayName": "Durban, KwaZulu-Natal, South Africa",
			"lat": -29.85,
			"lng": 31.02,
			"importance": 0.75
		}]
	}`
	req := httptest.NewRequest("POST", "/api/places/submit", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	server.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp SubmitResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp.Saved != 1 {
		t.Errorf("expected 1 saved, got %d", resp.Saved)
	}

	// Verify it's now findable
	ctx := context.Background()
	found, _ := repo.FindExact(ctx, "durban")
	if found == nil {
		t.Error("expected to find durban after submit")
	}
}
```

- [ ] **Step 7: Run all API tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./internal/api/... -v
```

Expected: PASS (all tests)

- [ ] **Step 8: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add internal/api/places.go internal/api/places_test.go internal/api/server.go && git commit -m "feat(api): add places lookup and submit endpoints"
```

---

## Task 5: Update Main Entry Point

**Files:**
- Modify: `cmd/mygreatcircle/main.go`

- [ ] **Step 1: Update main.go to initialize database**

```go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/kartoza/MyGreatCircle/internal/api"
	"github.com/kartoza/MyGreatCircle/internal/db"
)

var Version = "dev"

func main() {
	port := flag.Int("port", 8080, "Server port")
	webDir := flag.String("web", "web/dist", "Directory for static web files")
	dbPath := flag.String("db", "./data/places.db", "Path to SQLite database")
	version := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *version {
		fmt.Printf("mygreatcircle %s\n", Version)
		os.Exit(0)
	}

	// Ensure data directory exists
	dbDir := filepath.Dir(*dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Fatalf("Failed to create database directory: %v", err)
	}

	// Initialize database
	repo, err := db.NewSQLiteRepository(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer repo.Close()

	server := api.NewServer(*port, *webDir, repo)

	log.Printf("MyGreatCircle %s starting on http://localhost:%d", Version, *port)
	log.Printf("Database: %s", *dbPath)
	if err := server.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
```

- [ ] **Step 2: Build to verify compilation**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go build ./cmd/mygreatcircle
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add cmd/mygreatcircle/main.go && git commit -m "feat: add database initialization to main"
```

---

## Task 6: Remove Old Geocoding Code

**Files:**
- Delete: `internal/api/geocode.go`
- Delete: `internal/api/geocode_test.go`
- Delete: `internal/cache/lru.go`
- Delete: `internal/cache/lru_test.go`

- [ ] **Step 1: Delete old files**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && rm -f internal/api/geocode.go internal/api/geocode_test.go internal/cache/lru.go internal/cache/lru_test.go && rmdir internal/cache 2>/dev/null || true
```

- [ ] **Step 2: Verify project still builds**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go build ./cmd/mygreatcircle
```

Expected: No errors

- [ ] **Step 3: Run all Go tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./... -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add -A && git commit -m "refactor: remove server-side Nominatim proxy

Client-side geocoding replaces server-side proxy.
SQLite cache replaces in-memory LRU cache."
```

---

## Task 7: Create Client-Side Nominatim Module

**Files:**
- Create: `web/src/lib/nominatim.js`
- Create: `web/src/lib/nominatim.test.js`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/nominatim.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeQuery, createRateLimiter } from './nominatim'

describe('nominatim', () => {
  describe('normalizeQuery', () => {
    it('lowercases and trims query', () => {
      expect(normalizeQuery('  Cape Town  ')).toBe('cape town')
      expect(normalizeQuery('JOHANNESBURG')).toBe('johannesburg')
    })
  })

  describe('createRateLimiter', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('enforces minimum interval between calls', async () => {
      const rateLimiter = createRateLimiter(1000)
      const fn = vi.fn().mockResolvedValue('result')

      // First call - immediate
      const p1 = rateLimiter(fn)
      expect(fn).toHaveBeenCalledTimes(1)

      // Second call - should wait
      const p2 = rateLimiter(fn)
      expect(fn).toHaveBeenCalledTimes(1) // Still 1

      // Advance time
      await vi.advanceTimersByTimeAsync(1000)
      await p2

      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- --run nominatim
```

Expected: FAIL - module not found

- [ ] **Step 3: Create nominatim module**

Create `web/src/lib/nominatim.js`:

```javascript
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'MyGreatCircle/1.0 (https://github.com/kartoza/MyGreatCircle)'

/**
 * Normalize a query string for cache keys
 * @param {string} query - The query to normalize
 * @returns {string} Lowercased, trimmed query
 */
export function normalizeQuery(query) {
  return query.toLowerCase().trim()
}

/**
 * Create a rate limiter that enforces minimum interval between calls
 * @param {number} minInterval - Minimum milliseconds between calls
 * @returns {Function} Rate-limited function wrapper
 */
export function createRateLimiter(minInterval) {
  let lastCall = 0
  let queue = Promise.resolve()

  return async (fn) => {
    queue = queue.then(async () => {
      const now = Date.now()
      const elapsed = now - lastCall
      if (elapsed < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - elapsed))
      }
      lastCall = Date.now()
      return fn()
    })
    return queue
  }
}

// Singleton rate limiter (1.1 second interval)
const rateLimiter = createRateLimiter(1100)

/**
 * Geocode a place using Nominatim API (rate-limited)
 * @param {string} query - Place name to geocode
 * @returns {Promise<Array>} Array of results from Nominatim
 */
export async function geocodeWithNominatim(query) {
  return rateLimiter(async () => {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5'
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT
      }
    })

    if (response.status === 429) {
      throw new Error('Rate limited by Nominatim')
    }

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }

    const results = await response.json()

    // Transform to our format
    return results.map(r => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      importance: r.importance,
      confidence: r.importance > 0.5 ? 'high' : 'low'
    }))
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- --run nominatim
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add web/src/lib/nominatim.js web/src/lib/nominatim.test.js && git commit -m "feat(web): add client-side Nominatim module with rate limiting"
```

---

## Task 8: Refactor useGeocoding Hook

**Files:**
- Modify: `web/src/hooks/useGeocoding.js`

- [ ] **Step 1: Rewrite useGeocoding with 3-tier caching**

Replace `web/src/hooks/useGeocoding.js`:

```javascript
import { useState, useCallback } from 'react'
import { normalizeQuery, geocodeWithNominatim } from '../lib/nominatim'

const GEOCODE_CACHE_KEY = 'mygreatcircle-geocode-cache'
const CACHE_VERSION = 2 // Bumped to invalidate old format

/**
 * Load geocoding cache from localStorage
 */
function loadCache() {
  try {
    const stored = localStorage.getItem(GEOCODE_CACHE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.version === CACHE_VERSION) {
        return data.cache
      }
    }
  } catch (e) {
    console.warn('Failed to load geocode cache:', e)
  }
  return {}
}

/**
 * Save geocoding cache to localStorage
 */
function saveCache(cache) {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      cache,
      updatedAt: new Date().toISOString(),
    }))
  } catch (e) {
    console.warn('Failed to save geocode cache:', e)
  }
}

/**
 * Lookup places from server cache (fuzzy matching)
 */
async function lookupFromServer(queries) {
  const response = await fetch('/api/places/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  })

  if (!response.ok) {
    throw new Error(`Server lookup failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Submit resolved places to server cache
 */
async function submitToServer(places) {
  try {
    await fetch('/api/places/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places }),
    })
  } catch (e) {
    console.warn('Failed to submit places to server:', e)
  }
}

/**
 * Hook for geocoding places via 3-tier caching
 * Tier 1: localStorage (exact match)
 * Tier 2: Server cache (fuzzy match)
 * Tier 3: Nominatim API (rate-limited)
 */
export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Geocode a single place through all cache tiers
   */
  const geocodePlace = useCallback(async (query) => {
    const normalized = normalizeQuery(query)
    const cache = loadCache()

    // Tier 1: localStorage exact match
    if (cache[normalized]) {
      console.log(`[Tier 1] localStorage hit: "${query}"`)
      return { ...cache[normalized], fromLocalCache: true }
    }

    // Tier 2: Server fuzzy match
    console.log(`[Tier 2] Checking server cache: "${query}"`)
    try {
      const serverResult = await lookupFromServer([query])
      if (serverResult.resolved && serverResult.resolved[normalized]) {
        const place = serverResult.resolved[normalized]
        // Cache locally for next time
        cache[normalized] = {
          results: [{
            name: place.displayName,
            lat: place.lat,
            lng: place.lng,
            confidence: 'high'
          }],
          cachedAt: new Date().toISOString(),
        }
        saveCache(cache)
        console.log(`[Tier 2] Server cache hit: "${query}"`)
        return { results: cache[normalized].results, fromServerCache: true }
      }
    } catch (e) {
      console.warn('Server lookup failed, falling back to Nominatim:', e)
    }

    // Tier 3: Nominatim API
    console.log(`[Tier 3] Querying Nominatim: "${query}"`)
    const nominatimResults = await geocodeWithNominatim(query)

    if (nominatimResults.length > 0) {
      // Transform and cache
      const results = nominatimResults.map(r => ({
        name: r.displayName,
        lat: r.lat,
        lng: r.lng,
        confidence: r.confidence,
      }))

      cache[normalized] = {
        results,
        cachedAt: new Date().toISOString(),
      }
      saveCache(cache)

      // Submit to server for shared caching
      submitToServer([{
        query: normalized,
        displayName: results[0].name,
        lat: results[0].lat,
        lng: results[0].lng,
        importance: nominatimResults[0].importance || 0.5,
      }])

      return { results, fromNominatim: true }
    }

    return { results: [] }
  }, [])

  /**
   * Geocode an array of places with progressive updates
   */
  const geocodePlaces = useCallback(async (places, onProgress) => {
    setIsLoading(true)
    setError(null)

    const cache = loadCache()
    const geocodedPlaces = []

    // Separate into cached vs uncached
    const uncachedQueries = []
    const queryToPlaceIndex = {}

    places.forEach((place, index) => {
      const normalized = normalizeQuery(place.name)
      if (cache[normalized]) {
        // Already in localStorage
        const cached = cache[normalized]
        if (cached.results && cached.results.length > 0) {
          const best = cached.results[0]
          geocodedPlaces[index] = {
            ...place,
            coordinates: [best.lng, best.lat],
            confidence: best.confidence || 'high',
            alternatives: cached.results.slice(1),
            geocodedName: best.name,
          }
        } else {
          geocodedPlaces[index] = { ...place, confidence: 'failed', alternatives: [] }
        }
      } else {
        uncachedQueries.push(place.name)
        queryToPlaceIndex[normalizeQuery(place.name)] = index
      }
    })

    // Report progress for cached places
    if (onProgress) {
      const cachedCount = places.length - uncachedQueries.length
      if (cachedCount > 0) {
        onProgress([...geocodedPlaces.filter(Boolean)], cachedCount / places.length, cachedCount, places.length)
      }
    }

    // Tier 2: Batch lookup from server
    if (uncachedQueries.length > 0) {
      try {
        const serverResult = await lookupFromServer(uncachedQueries)

        // Process resolved
        for (const [normalizedQuery, place] of Object.entries(serverResult.resolved || {})) {
          const index = queryToPlaceIndex[normalizedQuery]
          if (index !== undefined) {
            geocodedPlaces[index] = {
              ...places[index],
              coordinates: [place.lng, place.lat],
              confidence: 'high',
              alternatives: [],
              geocodedName: place.displayName,
            }
            // Cache locally
            cache[normalizedQuery] = {
              results: [{ name: place.displayName, lat: place.lat, lng: place.lng, confidence: 'high' }],
              cachedAt: new Date().toISOString(),
            }
            delete queryToPlaceIndex[normalizedQuery]
          }
        }
        saveCache(cache)

        // Update progress
        if (onProgress) {
          const resolvedCount = places.length - Object.keys(queryToPlaceIndex).length
          onProgress([...geocodedPlaces.filter(Boolean)], resolvedCount / places.length, resolvedCount, places.length)
        }
      } catch (e) {
        console.warn('Server batch lookup failed:', e)
      }
    }

    // Tier 3: Nominatim for remaining (sequential with rate limiting)
    const remainingQueries = Object.keys(queryToPlaceIndex)
    for (let i = 0; i < remainingQueries.length; i++) {
      const normalizedQuery = remainingQueries[i]
      const index = queryToPlaceIndex[normalizedQuery]
      const place = places[index]

      try {
        const result = await geocodePlace(place.name)
        if (result.results && result.results.length > 0) {
          const best = result.results[0]
          geocodedPlaces[index] = {
            ...place,
            coordinates: [best.lng, best.lat],
            confidence: best.confidence || 'high',
            alternatives: result.results.slice(1),
            geocodedName: best.name,
          }
        } else {
          geocodedPlaces[index] = { ...place, confidence: 'failed', alternatives: [] }
        }
      } catch (e) {
        console.error(`Failed to geocode "${place.name}":`, e)
        geocodedPlaces[index] = { ...place, confidence: 'failed', alternatives: [] }
      }

      // Report progress
      if (onProgress) {
        const completed = places.length - remainingQueries.length + i + 1
        onProgress([...geocodedPlaces.filter(Boolean)], completed / places.length, completed, places.length)
      }
    }

    setIsLoading(false)
    return geocodedPlaces
  }, [geocodePlace])

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const cache = loadCache()
    return {
      entries: Object.keys(cache).length,
      places: Object.keys(cache),
    }
  }, [])

  /**
   * Clear the geocoding cache
   */
  const clearCache = useCallback(() => {
    localStorage.removeItem(GEOCODE_CACHE_KEY)
    console.log('Geocode cache cleared')
  }, [])

  return {
    geocodePlace,
    geocodePlaces,
    isLoading,
    error,
    getCacheStats,
    clearCache,
  }
}
```

- [ ] **Step 2: Run frontend tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add web/src/hooks/useGeocoding.js && git commit -m "feat(web): refactor useGeocoding for 3-tier caching

Tier 1: localStorage (exact match)
Tier 2: Server cache (fuzzy Levenshtein match)
Tier 3: Nominatim API (rate-limited, client-side)"
```

---

## Task 9: Create Word Cloud Module

**Files:**
- Create: `web/src/lib/wordcloud.js`
- Create: `web/src/lib/wordcloud.test.js`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/wordcloud.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { calculateMarginZones, findNonOverlappingPosition, generateWordCloudPositions } from './wordcloud'

describe('wordcloud', () => {
  describe('calculateMarginZones', () => {
    it('calculates four margin rectangles around map bounds', () => {
      const mapBounds = { x: 50, y: 50, width: 300, height: 200 }
      const pageSize = { width: 400, height: 300 }
      const marginSize = 40

      const zones = calculateMarginZones(mapBounds, pageSize, marginSize)

      expect(zones).toHaveLength(4)
      expect(zones[0].name).toBe('top')
      expect(zones[1].name).toBe('bottom')
      expect(zones[2].name).toBe('left')
      expect(zones[3].name).toBe('right')
    })
  })

  describe('generateWordCloudPositions', () => {
    it('positions all places without overlap', () => {
      const places = [
        { name: 'Paris' },
        { name: 'London' },
        { name: 'Tokyo' },
      ]
      const mapBounds = { x: 50, y: 50, width: 300, height: 150 }
      const pageSize = { width: 400, height: 250 }

      const positions = generateWordCloudPositions(places, mapBounds, pageSize, {
        getTextWidth: (text) => text.length * 3,
        fontSize: 8,
      })

      expect(positions.length).toBeLessThanOrEqual(places.length)
      // All positioned items should have x, y coordinates
      positions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- --run wordcloud
```

Expected: FAIL - module not found

- [ ] **Step 3: Create word cloud module**

Create `web/src/lib/wordcloud.js`:

```javascript
/**
 * Calculate margin zones around the map bounds
 * @param {Object} mapBounds - { x, y, width, height } of the map
 * @param {Object} pageSize - { width, height } of the page
 * @param {number} marginSize - Size of margin zones
 * @returns {Array} Array of zone objects with { name, x, y, width, height }
 */
export function calculateMarginZones(mapBounds, pageSize, marginSize = 40) {
  return [
    {
      name: 'top',
      x: 0,
      y: 0,
      width: pageSize.width,
      height: mapBounds.y - 5,
    },
    {
      name: 'bottom',
      x: 0,
      y: mapBounds.y + mapBounds.height + 5,
      width: pageSize.width,
      height: pageSize.height - (mapBounds.y + mapBounds.height) - 20, // Leave room for footer
    },
    {
      name: 'left',
      x: 0,
      y: mapBounds.y,
      width: mapBounds.x - 5,
      height: mapBounds.height,
    },
    {
      name: 'right',
      x: mapBounds.x + mapBounds.width + 5,
      y: mapBounds.y,
      width: pageSize.width - (mapBounds.x + mapBounds.width) - 5,
      height: mapBounds.height,
    },
  ]
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(r1, r2, padding = 2) {
  return !(
    r1.x + r1.width + padding < r2.x ||
    r2.x + r2.width + padding < r1.x ||
    r1.y + r1.height + padding < r2.y ||
    r2.y + r2.height + padding < r1.y
  )
}

/**
 * Find a non-overlapping position for text within margin zones
 * @param {string} text - The text to position
 * @param {Array} zones - Available margin zones
 * @param {Array} existingPositions - Already placed text boxes
 * @param {Object} options - { getTextWidth, fontSize }
 * @returns {Object|null} Position { x, y, width, height, text } or null if cannot fit
 */
export function findNonOverlappingPosition(text, zones, existingPositions, options) {
  const { getTextWidth, fontSize } = options
  const textWidth = getTextWidth(text)
  const textHeight = fontSize * 1.2

  const maxAttempts = 50

  // Try each zone in round-robin fashion
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const zone = zones[attempt % zones.length]

    // Skip if zone is too small
    if (zone.width < textWidth + 4 || zone.height < textHeight + 4) {
      continue
    }

    // Random position within zone
    const x = zone.x + Math.random() * (zone.width - textWidth)
    const y = zone.y + textHeight + Math.random() * (zone.height - textHeight - 4)

    const newRect = { x, y, width: textWidth, height: textHeight }

    // Check for overlaps
    const hasOverlap = existingPositions.some(pos =>
      rectsOverlap(newRect, pos)
    )

    if (!hasOverlap) {
      return { ...newRect, text }
    }
  }

  return null
}

/**
 * Generate word cloud positions for all places
 * @param {Array} places - Array of { name } objects
 * @param {Object} mapBounds - { x, y, width, height }
 * @param {Object} pageSize - { width, height }
 * @param {Object} options - { getTextWidth, fontSize }
 * @returns {Array} Array of positioned text objects
 */
export function generateWordCloudPositions(places, mapBounds, pageSize, options) {
  const zones = calculateMarginZones(mapBounds, pageSize)
  const positions = []
  const skipped = []

  // Shuffle places for random distribution
  const shuffled = [...places].sort(() => Math.random() - 0.5)

  for (const place of shuffled) {
    const position = findNonOverlappingPosition(place.name, zones, positions, options)
    if (position) {
      positions.push(position)
    } else {
      skipped.push(place.name)
    }
  }

  return { positions, skipped }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test -- --run wordcloud
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add web/src/lib/wordcloud.js web/src/lib/wordcloud.test.js && git commit -m "feat(web): add word cloud positioning algorithm"
```

---

## Task 10: Update PDF Generation with Word Cloud and Attribution

**Files:**
- Modify: `web/src/hooks/usePdfGeneration.js`

- [ ] **Step 1: Update usePdfGeneration.js**

Replace the places list rendering with word cloud and add attribution. Update `web/src/hooks/usePdfGeneration.js`:

```javascript
import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import { getThemeBackgroundColor } from '../lib/themes'
import { generateWordCloudPositions } from '../lib/wordcloud'

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

/**
 * Render word cloud of place names in PDF margins
 */
function renderWordCloud(pdf, places, mapBounds, pageSize, textColor) {
  const fontSize = 8
  pdf.setFontSize(fontSize)
  pdf.setTextColor(153, 153, 153) // Light gray #999

  const { positions, skipped } = generateWordCloudPositions(
    places,
    mapBounds,
    pageSize,
    {
      getTextWidth: (text) => pdf.getTextWidth(text),
      fontSize,
    }
  )

  // Render positioned place names
  for (const pos of positions) {
    pdf.text(pos.text, pos.x, pos.y)
  }

  // If places were skipped, add overflow indicator
  if (skipped.length > 0) {
    const overflowText = `... and ${skipped.length} more places`
    const overflowWidth = pdf.getTextWidth(overflowText)
    pdf.text(overflowText, (pageSize.width - overflowWidth) / 2, pageSize.height - 25)
  }
}

/**
 * Render attribution text
 */
function renderAttribution(pdf, x, y, mutedColor) {
  pdf.setFontSize(7)
  pdf.setTextColor(...mutedColor)
  pdf.text('Geocoding by Nominatim · Map data © OpenStreetMap contributors', x, y)
}

/**
 * Hook for generating PDFs from the map visualization
 */
export function usePdfGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)

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
      const mapBounds = { x: margin, y: 45, width: pageWidth - (margin * 2), height: 100 }
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        // Ensure all arcs and points are fully visible
        svgClone.querySelectorAll('.arcs path').forEach(path => {
          path.setAttribute('opacity', '1')
        })
        svgClone.querySelectorAll('.points circle').forEach(circle => {
          circle.setAttribute('opacity', '1')
        })

        await pdf.svg(svgClone, {
          x: mapBounds.x,
          y: mapBounds.y,
          width: mapBounds.width,
          height: mapBounds.height,
        })
      }

      // Word cloud of place names in margins
      renderWordCloud(pdf, places, mapBounds, { width: pageWidth, height: pageHeight }, textColor)

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

        // Tree icons (simplified for PDF)
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

      // Attribution
      renderAttribution(pdf, margin, footerY + 10, mutedColor)

      pdf.save('my-journey-factsheet.pdf')
    } finally {
      setIsGenerating(false)
    }
  }, [])

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
      const mutedColor = brightness > 128 ? [120, 120, 120] : [160, 160, 160]

      // Map bounds (full bleed with room for footer)
      const mapBounds = { x: 0, y: 0, width: pageWidth, height: pageHeight - 30 }

      // Full-bleed map
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true)

        // Ensure all arcs and points are fully visible
        svgClone.querySelectorAll('.arcs path').forEach(path => {
          path.setAttribute('opacity', '1')
        })
        svgClone.querySelectorAll('.points circle').forEach(circle => {
          circle.setAttribute('opacity', '1')
        })

        await pdf.svg(svgClone, {
          x: mapBounds.x,
          y: mapBounds.y,
          width: mapBounds.width,
          height: mapBounds.height,
        })
      }

      // Word cloud in margins (adjusted for poster layout)
      const posterMapBounds = { x: 20, y: 15, width: pageWidth - 40, height: pageHeight - 50 }
      renderWordCloud(pdf, places, posterMapBounds, { width: pageWidth, height: pageHeight }, textColor)

      // Bottom bar with eco stats
      const footerY = pageHeight - 18
      pdf.setFontSize(10)
      pdf.setTextColor(...textColor)

      let footerText = ''
      if (ecoMode && ecoStats && ecoStats.treeCount > 0) {
        footerText = `🌲×${ecoStats.treeCount}  ${formatCO2ForPdf(ecoStats.totalCO2Kg)} CO₂`
        pdf.text(footerText, 10, footerY)
      }

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

      // Attribution
      renderAttribution(pdf, 10, pageHeight - 5, mutedColor)

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

- [ ] **Step 2: Run frontend tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add web/src/hooks/usePdfGeneration.js && git commit -m "feat(pdf): add word cloud place names and OSM attribution

- Replace bullet list with word cloud in margins
- Add Nominatim/OSM attribution to footer
- Gray text for low visual impact"
```

---

## Task 11: Add Attribution to Web Footer

**Files:**
- Modify: `web/src/components/Footer.jsx`

- [ ] **Step 1: Update Footer with attribution**

Update `web/src/components/Footer.jsx`:

```javascript
import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react'

export function Footer({ compact = false }) {
  if (compact) {
    return (
      <VStack spacing={1} fontSize="xs" align="center">
        <HStack spacing={2}>
          <Text color="gray.400">Made with</Text>
          <Text color="red.400">♥</Text>
          <Text color="gray.400">by</Text>
          <Link
            href="https://kartoza.com"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            Kartoza
          </Link>
        </HStack>
        <HStack spacing={1}>
          <Text color="gray.500" fontSize="2xs">Geocoding by</Text>
          <Link
            href="https://nominatim.org"
            isExternal
            color="gray.500"
            fontSize="2xs"
            _hover={{ color: 'gray.400' }}
          >
            Nominatim
          </Link>
          <Text color="gray.500" fontSize="2xs">·</Text>
          <Link
            href="https://www.openstreetmap.org/copyright"
            isExternal
            color="gray.500"
            fontSize="2xs"
            _hover={{ color: 'gray.400' }}
          >
            © OpenStreetMap
          </Link>
        </HStack>
      </VStack>
    )
  }

  return (
    <Box
      py={6}
      textAlign="center"
      borderTop="1px solid"
      borderColor="gray.700"
      mt={8}
    >
      <VStack spacing={2}>
        <HStack spacing={2} justify="center" wrap="wrap">
          <Text color="gray.400">Made with</Text>
          <Text color="red.400">💗</Text>
          <Text color="gray.400">by</Text>
          <Link
            href="https://kartoza.com"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            Kartoza
          </Link>
          <Text color="gray.600">|</Text>
          <Link
            href="https://github.com/sponsors/kartoza"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            Donate!
          </Link>
          <Text color="gray.600">|</Text>
          <Link
            href="https://github.com/kartoza/MyGreatCircle"
            isExternal
            color="teal.400"
            _hover={{ color: 'teal.300' }}
          >
            GitHub
          </Link>
        </HStack>
        <HStack spacing={2} justify="center" fontSize="xs">
          <Text color="gray.500">Geocoding by</Text>
          <Link
            href="https://nominatim.org"
            isExternal
            color="gray.500"
            _hover={{ color: 'gray.400' }}
          >
            Nominatim
          </Link>
          <Text color="gray.500">· Map data</Text>
          <Link
            href="https://www.openstreetmap.org/copyright"
            isExternal
            color="gray.500"
            _hover={{ color: 'gray.400' }}
          >
            © OpenStreetMap contributors
          </Link>
        </HStack>
      </VStack>
    </Box>
  )
}
```

- [ ] **Step 2: Build frontend to verify no errors**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add web/src/components/Footer.jsx && git commit -m "feat(ui): add Nominatim/OSM attribution to footer"
```

---

## Task 12: Update Handlers Test File

**Files:**
- Modify: `internal/api/handlers.go` (if exists, add health handler)

- [ ] **Step 1: Check handlers.go exists and update if needed**

Read `internal/api/handlers.go` and ensure handleHealth exists:

```go
package api

import (
	"encoding/json"
	"net/http"
)

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./... -v
```

Expected: PASS

- [ ] **Step 3: Run full build**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go build ./cmd/mygreatcircle && cd web && npm run build
```

Expected: Both build successfully

- [ ] **Step 4: Commit any remaining changes**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add -A && git status
```

If there are changes:

```bash
git commit -m "chore: finalize client-side geocoding migration"
```

---

## Task 13: Update Documentation

**Files:**
- Modify: `SPECIFICATION.md`

- [ ] **Step 1: Update SPECIFICATION.md with new architecture**

Add section for geocoding architecture:

```markdown
## Geocoding Architecture

### Three-Tier Caching

1. **Tier 1: Browser localStorage** - Exact match on normalized query
2. **Tier 2: Server SQLite cache** - Fuzzy Levenshtein matching (distance ≤ 3)
3. **Tier 3: Nominatim API** - Client-side, rate-limited (1 req/1.1s)

### Data Flow

1. User enters places
2. Check localStorage for exact matches
3. Batch lookup unresolved places from server (`POST /api/places/lookup`)
4. Query Nominatim directly for remaining places (sequential, rate-limited)
5. Cache results in localStorage and submit to server (`POST /api/places/submit`)

### API Endpoints

- `POST /api/places/lookup` - Batch fuzzy lookup
- `POST /api/places/submit` - Submit resolved places to shared cache

### Attribution

Nominatim and OpenStreetMap attribution displayed in:
- Web UI footer
- PDF fact sheet footer
- PDF poster footer
```

- [ ] **Step 2: Commit documentation**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git add SPECIFICATION.md && git commit -m "docs: update SPECIFICATION.md with geocoding architecture"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run all Go tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go test ./... -v
```

Expected: All PASS

- [ ] **Step 2: Run all frontend tests**

```bash
cd /home/timlinux/dev/go/MyGreatCircle/web && npm test
```

Expected: All PASS

- [ ] **Step 3: Build and run server**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && go build ./cmd/mygreatcircle && ./mygreatcircle -port 8080
```

Expected: Server starts, database initializes

- [ ] **Step 4: Test in browser**

Open http://localhost:8080, enter some places, verify:
- Console shows tier 1/2/3 cache lookups
- Places resolve correctly
- PDF exports include word cloud and attribution
- Footer shows Nominatim/OSM attribution

- [ ] **Step 5: Final commit if needed**

```bash
cd /home/timlinux/dev/go/MyGreatCircle && git status
```

If clean, you're done!
