package db

import (
	"context"
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
