package api

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// ImageStore manages temporary image storage for merchandise printing
type ImageStore struct {
	baseDir string
	baseURL string
	mu      sync.Mutex
	images  map[string]time.Time
}

// NewImageStore creates a new image store
func NewImageStore(baseDir, baseURL string) (*ImageStore, error) {
	// Ensure the images directory exists
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, err
	}

	store := &ImageStore{
		baseDir: baseDir,
		baseURL: baseURL,
		images:  make(map[string]time.Time),
	}

	// Start cleanup goroutine
	go store.cleanupLoop()

	return store, nil
}

// cleanupLoop removes images older than 1 hour
func (s *ImageStore) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		s.cleanup()
	}
}

func (s *ImageStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for id, created := range s.images {
		if now.Sub(created) > time.Hour {
			// Remove old image
			filePath := filepath.Join(s.baseDir, id+".png")
			_ = os.Remove(filePath)
			delete(s.images, id)
		}
	}
}

// Store saves an image and returns its public URL
func (s *ImageStore) Store(data []byte) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Generate unique ID
	idBytes := make([]byte, 16)
	rand.Read(idBytes)
	id := hex.EncodeToString(idBytes)

	// Save file
	filePath := filepath.Join(s.baseDir, id+".png")
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", err
	}

	s.images[id] = time.Now()

	// Return public URL
	return fmt.Sprintf("%s/api/images/%s.png", s.baseURL, id), nil
}

// Get retrieves an image by ID
func (s *ImageStore) Get(id string) ([]byte, error) {
	// Remove .png extension if present
	id = strings.TrimSuffix(id, ".png")

	filePath := filepath.Join(s.baseDir, id+".png")
	return os.ReadFile(filePath)
}

// UploadImageRequest is the request for /api/images/upload
type UploadImageRequest struct {
	// Base64 encoded PNG image data
	Data string `json:"data"`
}

// UploadImageResponse is the response for /api/images/upload
type UploadImageResponse struct {
	URL string `json:"url"`
}

// handleImageUpload handles image uploads for merchandise
func (s *Server) handleImageUpload(w http.ResponseWriter, r *http.Request) {
	if s.imageStore == nil {
		http.Error(w, "Image storage not configured", http.StatusServiceUnavailable)
		return
	}

	var req UploadImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Data == "" {
		http.Error(w, "Image data required", http.StatusBadRequest)
		return
	}

	// Decode base64 data
	// Remove data URL prefix if present
	data := req.Data
	if idx := strings.Index(data, ","); idx != -1 {
		data = data[idx+1:]
	}

	imageData, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		http.Error(w, "Invalid base64 data", http.StatusBadRequest)
		return
	}

	// Store the image
	url, err := s.imageStore.Store(imageData)
	if err != nil {
		http.Error(w, "Failed to store image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(UploadImageResponse{URL: url})
}

// handleImageGet serves stored images
func (s *Server) handleImageGet(w http.ResponseWriter, r *http.Request) {
	if s.imageStore == nil {
		http.Error(w, "Image storage not configured", http.StatusServiceUnavailable)
		return
	}

	// Extract image ID from path
	path := r.URL.Path
	id := strings.TrimPrefix(path, "/api/images/")

	data, err := s.imageStore.Get(id)
	if err != nil {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = io.Copy(w, strings.NewReader(string(data)))
}
