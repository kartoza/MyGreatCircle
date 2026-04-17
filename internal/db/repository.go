package db

import (
	"context"
	"strings"
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
