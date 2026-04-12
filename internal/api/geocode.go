package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
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
	Results    []GeocodeResult `json:"results"`
	Cached     bool            `json:"cached"`
	RateLimit  bool            `json:"rateLimit,omitempty"`
	RetryAfter int             `json:"retryAfter,omitempty"` // milliseconds
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

// Rate limiter for Nominatim API (max 1 request per second per their usage policy)
type rateLimiter struct {
	mu           sync.Mutex
	lastRequest  time.Time
	minInterval  time.Duration
}

var nominatimRateLimiter = &rateLimiter{
	minInterval: 1100 * time.Millisecond, // Slightly over 1 second to be safe
}

// Wait blocks until it's safe to make a request, returns time waited
func (rl *rateLimiter) Wait() time.Duration {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastRequest)

	if elapsed < rl.minInterval {
		sleepTime := rl.minInterval - elapsed
		time.Sleep(sleepTime)
		rl.lastRequest = time.Now()
		return sleepTime
	}

	rl.lastRequest = now
	return 0
}

// TimeUntilNext returns milliseconds until next request is allowed
func (rl *rateLimiter) TimeUntilNext() int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	elapsed := time.Since(rl.lastRequest)
	if elapsed >= rl.minInterval {
		return 0
	}
	return int((rl.minInterval - elapsed).Milliseconds())
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

	// Check cache first (no rate limit needed for cached results)
	if results, ok := geocodeCache.Get(query); ok {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GeocodeResponse{Results: results, Cached: true})
		return
	}

	// Apply rate limiting for Nominatim requests
	// This blocks until it's safe to make a request
	waited := nominatimRateLimiter.Wait()
	if waited > 0 {
		// Log rate limiting for monitoring
		fmt.Printf("Rate limited: waited %v before querying Nominatim for %q\n", waited, query)
	}

	// Query Nominatim
	results, err := queryNominatim(query)
	if err != nil {
		// Check if it's a rate limit error from Nominatim
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "rate limit") {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "2")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(GeocodeResponse{
				RateLimit:  true,
				RetryAfter: 2000,
			})
			return
		}
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
	// User-Agent required by Nominatim usage policy
	req.Header.Set("User-Agent", "MyGreatCircle/1.0 (https://github.com/kartoza/MyGreatCircle; contact@kartoza.com)")

	resp, err := nominatimClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Handle rate limiting from Nominatim
	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("429 rate limit exceeded")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nominatim returned status %d", resp.StatusCode)
	}

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
