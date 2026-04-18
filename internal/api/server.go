package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

type Server struct {
	port       int
	webDir     string
	mux        *http.ServeMux
	placeRepo  db.PlaceRepository
	imageStore *ImageStore
}

// ServerConfig contains configuration for the server
type ServerConfig struct {
	Port       int
	WebDir     string
	PlaceRepo  db.PlaceRepository
	ImageDir   string
	BaseURL    string
}

func NewServer(port int, webDir string, placeRepo db.PlaceRepository) *Server {
	return NewServerWithConfig(ServerConfig{
		Port:      port,
		WebDir:    webDir,
		PlaceRepo: placeRepo,
	})
}

func NewServerWithConfig(cfg ServerConfig) *Server {
	s := &Server{
		port:      cfg.Port,
		webDir:    cfg.WebDir,
		mux:       http.NewServeMux(),
		placeRepo: cfg.PlaceRepo,
	}

	// Initialize image store if configured
	if cfg.ImageDir != "" && cfg.BaseURL != "" {
		store, err := NewImageStore(cfg.ImageDir, cfg.BaseURL)
		if err == nil {
			s.imageStore = store
		}
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("POST /api/places/lookup", s.handlePlacesLookup)
	s.mux.HandleFunc("POST /api/places/submit", s.handlePlacesSubmit)

	// Prodigi print-on-demand routes
	s.mux.HandleFunc("GET /api/prodigi/products", s.handleProdigiProducts)
	s.mux.HandleFunc("POST /api/prodigi/quote", s.handleProdigiQuote)
	s.mux.HandleFunc("POST /api/prodigi/orders", s.handleProdigiCreateOrder)

	// Image upload/serve routes for merchandise
	s.mux.HandleFunc("POST /api/images/upload", s.handleImageUpload)
	s.mux.HandleFunc("GET /api/images/", s.handleImageGet)

	// Static files (web frontend)
	fs := http.FileServer(http.Dir(s.webDir))
	s.mux.Handle("/", fs)
}

func (s *Server) Start() error {
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", s.port),
		Handler:      s.mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	return server.ListenAndServe()
}
