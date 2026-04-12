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
