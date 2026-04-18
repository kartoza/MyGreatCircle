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
	Source      string  `json:"source"` // "geonames" or "nominatim"
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
				Source:      place.Source,
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
			// Return best match (first result)
			best := fuzzyResults[0]
			s.placeRepo.IncrementHitCount(ctx, best.ID)
			resolved[normalized] = ResolvedPlace{
				DisplayName: best.DisplayName,
				Lat:         best.Lat,
				Lng:         best.Lng,
				Source:      best.Source,
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
			continue
		}
		saved++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SubmitResponse{Saved: saved})
}
