package api

import (
	"fmt"
	"net/http"
	"time"
)

type Server struct {
	port   int
	webDir string
	mux    *http.ServeMux
}

func NewServer(port int, webDir string) *Server {
	s := &Server{
		port:   port,
		webDir: webDir,
		mux:    http.NewServeMux(),
	}
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("POST /api/geocode", s.handleGeocode)

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
