package main

import (
	"archive/zip"
	"bufio"
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

const (
	geonamesBaseURL = "https://download.geonames.org/export/dump/"
)

// GeoNamesRecord represents a parsed GeoNames record
type GeoNamesRecord struct {
	GeonameID      int64
	Name           string
	AsciiName      string
	AlternateNames []string
	Latitude       float64
	Longitude      float64
	FeatureClass   string
	FeatureCode    string
	CountryCode    string
	Population     int64
	Timezone       string
}

// Available data files
var availableFiles = []string{
	"cities500.zip",    // Cities with population > 500 (~200k places)
	"cities1000.zip",   // Cities with population > 1000 (~140k places)
	"cities5000.zip",   // Cities with population > 5000 (~50k places)
	"cities15000.zip",  // Cities with population > 15000 (~25k places)
	"allCountries.zip", // All places (~12M places, ~1.5GB)
}

// Country-specific files that can be downloaded
var countryFiles = []string{
	"ZA.zip", "GB.zip", "US.zip", "DE.zip", "FR.zip", "ES.zip", "IT.zip",
	"NL.zip", "BE.zip", "AT.zip", "CH.zip", "SE.zip", "NO.zip", "DK.zip",
	"FI.zip", "PL.zip", "PT.zip", "IE.zip", "AU.zip", "NZ.zip", "CA.zip",
	"JP.zip", "CN.zip", "IN.zip", "BR.zip", "MX.zip", "AR.zip", "CL.zip",
	"EG.zip", "NG.zip", "KE.zip", "GH.zip", "MA.zip", "TN.zip",
}

func main() {
	dbPath := flag.String("db", "./data/places.db", "Path to SQLite database")
	dataDir := flag.String("data", "./data/geonames", "Directory for downloaded GeoNames files")
	files := flag.String("files", "allCountries", "Comma-separated list of files to import (cities500, cities1000, cities5000, cities15000, allCountries, or country codes like ZA,GB,US)")
	minPopulation := flag.Int64("min-pop", 0, "Minimum population to import (0 for all)")
	skipDownload := flag.Bool("skip-download", false, "Skip downloading, use existing files")
	listFiles := flag.Bool("list", false, "List available files and exit")
	batchSize := flag.Int("batch-size", 10000, "Batch size for database inserts")
	flag.Parse()

	if *listFiles {
		fmt.Println("Available data files:")
		fmt.Println("\nCity files (by population):")
		for _, f := range availableFiles {
			fmt.Printf("  - %s\n", strings.TrimSuffix(f, ".zip"))
		}
		fmt.Println("\nCountry-specific files:")
		for i, f := range countryFiles {
			fmt.Printf("  %s", strings.TrimSuffix(f, ".zip"))
			if (i+1)%10 == 0 {
				fmt.Println()
			} else {
				fmt.Print(", ")
			}
		}
		fmt.Println("\n\nExamples:")
		fmt.Println("  geonames-import -files=cities15000")
		fmt.Println("  geonames-import -files=ZA,GB,US")
		fmt.Println("  geonames-import -files=cities5000 -min-pop=10000")
		os.Exit(0)
	}

	// Ensure directories exist
	if err := os.MkdirAll(*dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(*dbPath), 0755); err != nil {
		log.Fatalf("Failed to create database directory: %v", err)
	}

	// Initialize database
	repo, err := db.NewSQLiteRepository(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer repo.Close()

	// Parse file list
	fileList := parseFileList(*files)
	if len(fileList) == 0 {
		log.Fatal("No files specified")
	}

	log.Printf("GeoNames Import Tool")
	log.Printf("Database: %s", *dbPath)
	log.Printf("Data directory: %s", *dataDir)
	log.Printf("Files to import: %v", fileList)
	if *minPopulation > 0 {
		log.Printf("Minimum population: %d", *minPopulation)
	}

	ctx := context.Background()
	totalImported := 0

	for _, file := range fileList {
		zipFile := file + ".zip"
		zipPath := filepath.Join(*dataDir, zipFile)

		// Download if needed
		if !*skipDownload {
			if err := downloadFile(zipPath, geonamesBaseURL+zipFile); err != nil {
				log.Printf("Warning: Failed to download %s: %v", zipFile, err)
				continue
			}
		} else if _, err := os.Stat(zipPath); os.IsNotExist(err) {
			log.Printf("Warning: File %s not found, skipping", zipPath)
			continue
		}

		// Import the file
		count, err := importZipFile(ctx, repo, zipPath, *minPopulation, *batchSize)
		if err != nil {
			log.Printf("Warning: Failed to import %s: %v", zipFile, err)
			continue
		}

		log.Printf("Imported %d places from %s", count, zipFile)
		totalImported += count
	}

	log.Printf("Import complete! Total places imported: %d", totalImported)
}

func parseFileList(files string) []string {
	parts := strings.Split(files, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		// Add .zip extension reference if needed
		result = append(result, strings.TrimSuffix(p, ".zip"))
	}
	return result
}

func downloadFile(filepath string, url string) error {
	// Check if file already exists - no expiry, keep forever
	if _, err := os.Stat(filepath); err == nil {
		log.Printf("Using cached file: %s", filepath)
		return nil
	}

	log.Printf("Downloading %s...", url)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Show progress
	size := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 32*1024)
	lastPrint := time.Now()

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			out.Write(buf[:n])
			downloaded += int64(n)

			if time.Since(lastPrint) > time.Second {
				if size > 0 {
					log.Printf("  Progress: %.1f%% (%d MB / %d MB)",
						float64(downloaded)/float64(size)*100,
						downloaded/1024/1024,
						size/1024/1024)
				} else {
					log.Printf("  Downloaded: %d MB", downloaded/1024/1024)
				}
				lastPrint = time.Now()
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	log.Printf("  Download complete: %d MB", downloaded/1024/1024)
	return nil
}

func importZipFile(ctx context.Context, repo db.PlaceRepository, zipPath string, minPop int64, batchSize int) (int, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return 0, err
	}
	defer r.Close()

	count := 0
	batch := make([]*db.Place, 0, batchSize)

	for _, f := range r.File {
		// Skip readme and other non-data files
		if !strings.HasSuffix(f.Name, ".txt") || strings.Contains(f.Name, "readme") {
			continue
		}

		log.Printf("Processing %s...", f.Name)

		rc, err := f.Open()
		if err != nil {
			return count, err
		}

		scanner := bufio.NewScanner(rc)
		// Increase buffer size for long lines
		buf := make([]byte, 0, 1024*1024)
		scanner.Buffer(buf, 1024*1024)

		lineNum := 0
		for scanner.Scan() {
			lineNum++
			record, err := parseGeoNamesLine(scanner.Text())
			if err != nil {
				continue // Skip invalid lines
			}

			// Skip if below minimum population
			if minPop > 0 && record.Population < minPop {
				continue
			}

			// Create place entries for name and alternate names
			places := createPlacesFromRecord(record)
			batch = append(batch, places...)

			// Flush batch if full
			if len(batch) >= batchSize {
				if err := saveBatch(ctx, repo, batch); err != nil {
					log.Printf("Warning: Failed to save batch: %v", err)
				}
				count += len(batch)
				batch = batch[:0]

				if count%100000 == 0 {
					log.Printf("  Progress: %d places imported", count)
				}
			}
		}

		rc.Close()

		if err := scanner.Err(); err != nil {
			log.Printf("Warning: Scanner error: %v", err)
		}
	}

	// Flush remaining batch
	if len(batch) > 0 {
		if err := saveBatch(ctx, repo, batch); err != nil {
			log.Printf("Warning: Failed to save final batch: %v", err)
		}
		count += len(batch)
	}

	return count, nil
}

func parseGeoNamesLine(line string) (*GeoNamesRecord, error) {
	fields := strings.Split(line, "\t")
	if len(fields) < 19 {
		return nil, fmt.Errorf("invalid line: expected 19 fields, got %d", len(fields))
	}

	geonameID, _ := strconv.ParseInt(fields[0], 10, 64)
	lat, _ := strconv.ParseFloat(fields[4], 64)
	lng, _ := strconv.ParseFloat(fields[5], 64)
	population, _ := strconv.ParseInt(fields[14], 10, 64)

	var alternateNames []string
	if fields[3] != "" {
		alternateNames = strings.Split(fields[3], ",")
	}

	return &GeoNamesRecord{
		GeonameID:      geonameID,
		Name:           fields[1],
		AsciiName:      fields[2],
		AlternateNames: alternateNames,
		Latitude:       lat,
		Longitude:      lng,
		FeatureClass:   fields[6],
		FeatureCode:    fields[7],
		CountryCode:    fields[8],
		Population:     population,
		Timezone:       fields[17],
	}, nil
}

func createPlacesFromRecord(record *GeoNamesRecord) []*db.Place {
	var places []*db.Place

	// Calculate importance based on population
	importance := calculateImportance(record.Population, record.FeatureClass)

	// Create display name with country code
	displayName := record.Name
	if record.CountryCode != "" {
		displayName = fmt.Sprintf("%s, %s", record.Name, record.CountryCode)
	}

	// Main name
	if record.Name != "" {
		places = append(places, &db.Place{
			QueryNormalized: db.NormalizeQuery(record.Name),
			DisplayName:     displayName,
			Lat:             record.Latitude,
			Lng:             record.Longitude,
			Importance:      importance,
			Source:          "geonames",
		})
	}

	// ASCII name (if different)
	if record.AsciiName != "" && record.AsciiName != record.Name {
		places = append(places, &db.Place{
			QueryNormalized: db.NormalizeQuery(record.AsciiName),
			DisplayName:     displayName,
			Lat:             record.Latitude,
			Lng:             record.Longitude,
			Importance:      importance * 0.9, // Slightly lower importance for ASCII variant
			Source:          "geonames",
		})
	}

	// Alternate names (limit to first 5 to avoid too many entries)
	for i, altName := range record.AlternateNames {
		if i >= 5 {
			break
		}
		altName = strings.TrimSpace(altName)
		if altName == "" || altName == record.Name || altName == record.AsciiName {
			continue
		}
		places = append(places, &db.Place{
			QueryNormalized: db.NormalizeQuery(altName),
			DisplayName:     displayName,
			Lat:             record.Latitude,
			Lng:             record.Longitude,
			Importance:      importance * 0.8, // Lower importance for alternate names
			Source:          "geonames",
		})
	}

	return places
}

func calculateImportance(population int64, featureClass string) float64 {
	// Base importance on population (logarithmic scale)
	var importance float64

	switch {
	case population >= 10000000: // 10M+
		importance = 1.0
	case population >= 1000000: // 1M+
		importance = 0.9
	case population >= 500000:
		importance = 0.8
	case population >= 100000:
		importance = 0.7
	case population >= 50000:
		importance = 0.6
	case population >= 10000:
		importance = 0.5
	case population >= 5000:
		importance = 0.4
	case population >= 1000:
		importance = 0.3
	case population > 0:
		importance = 0.2
	default:
		importance = 0.1
	}

	// Boost for certain feature classes
	switch featureClass {
	case "P": // Populated place
		importance *= 1.0
	case "A": // Administrative division
		importance *= 1.1
	default:
		importance *= 0.9
	}

	// Cap at 1.0
	if importance > 1.0 {
		importance = 1.0
	}

	return importance
}

func saveBatch(ctx context.Context, repo db.PlaceRepository, places []*db.Place) error {
	for _, place := range places {
		if err := repo.Save(ctx, place); err != nil {
			// Ignore duplicate key errors
			if !strings.Contains(err.Error(), "UNIQUE constraint") {
				return err
			}
		}
	}
	return nil
}
