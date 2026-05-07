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
	_ = repo.Save(ctx, &db.Place{
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
