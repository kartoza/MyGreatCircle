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
