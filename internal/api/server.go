package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/kartoza/MyGreatCircle/internal/db"
)

type Server struct {
	port      int
	webDir    string
	mux       *http.ServeMux
	placeRepo db.PlaceRepository
}

func NewServer(port int, webDir string, placeRepo db.PlaceRepository) *Server {
	s := &Server{
		port:      port,
		webDir:    webDir,
		mux:       http.NewServeMux(),
		placeRepo: placeRepo,
	}
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("POST /api/geocode", s.handleGeocode)
	s.mux.HandleFunc("POST /api/places/lookup", s.handlePlacesLookup)
	s.mux.HandleFunc("POST /api/places/submit", s.handlePlacesSubmit)

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
