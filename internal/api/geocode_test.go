package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

func TestGeocodeHandler_ValidRequest(t *testing.T) {
	repo, err := db.NewSQLiteRepository(":memory:")
	if err != nil {
		t.Fatalf("failed to create repo: %v", err)
	}
	defer repo.Close()

	server := NewServer(8080, ".", repo)

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
	repo, err := db.NewSQLiteRepository(":memory:")
	if err != nil {
		t.Fatalf("failed to create repo: %v", err)
	}
	defer repo.Close()

	server := NewServer(8080, ".", repo)

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
