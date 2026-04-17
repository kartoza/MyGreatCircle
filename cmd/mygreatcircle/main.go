package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/kartoza/MyGreatCircle/internal/api"
	"github.com/kartoza/MyGreatCircle/internal/db"
)

var Version = "dev"

func main() {
	port := flag.Int("port", 8080, "Server port")
	webDir := flag.String("web", "web/dist", "Directory for static web files")
	dbPath := flag.String("db", "./data/places.db", "Path to SQLite database")
	version := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *version {
		fmt.Printf("mygreatcircle %s\n", Version)
		os.Exit(0)
	}

	// Ensure data directory exists
	dbDir := filepath.Dir(*dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Fatalf("Failed to create database directory: %v", err)
	}

	// Initialize database
	repo, err := db.NewSQLiteRepository(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer repo.Close()

	server := api.NewServer(*port, *webDir, repo)

	log.Printf("MyGreatCircle %s starting on http://localhost:%d", Version, *port)
	log.Printf("Database: %s", *dbPath)
	if err := server.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
