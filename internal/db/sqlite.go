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
