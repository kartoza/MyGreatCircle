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
	DisplayName string  `json:"display_name"`
	Lat         string  `json:"lat"`
	Lon         string  `json:"lon"`
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
