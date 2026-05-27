package ecommerce

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// MerchService handles merchandise-related HTTP requests
// This is designed to be embeddable in any Go HTTP server
type MerchService struct {
	gelato *GelatoClient
	stripe *StripeClient
}

// NewMerchService creates a new merchandise service
func NewMerchService() *MerchService {
	return &MerchService{
		gelato: NewGelatoClient(),
		stripe: NewStripeClient(),
	}
}

// IsConfigured returns true if all required services are configured
func (s *MerchService) IsConfigured() bool {
	return s.gelato.IsConfigured() && s.stripe.IsConfigured()
}

// ProductsResponse is the API response for product listing
type ProductsResponse struct {
	Products []ProductWithPrice `json:"products"`
	Currency string             `json:"currency"`
}

// ProductWithPrice includes product info with calculated customer price
type ProductWithPrice struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	ImageURL    string    `json:"imageUrl"`
	BasePrice   float64   `json:"basePrice"`
	Price       float64   `json:"price"` // Customer price with margin
	Currency    string    `json:"currency"`
	Variants    []VariantWithPrice `json:"variants"`
}

// VariantWithPrice includes variant info with calculated price
type VariantWithPrice struct {
	ID         string            `json:"id"`
	Title      string            `json:"title"`
	Attributes map[string]string `json:"attributes"`
	BasePrice  float64           `json:"basePrice"`
	Price      float64           `json:"price"`
}

// MockupRequest is the request body for mockup generation
type MockupRequest struct {
	ProductID    string `json:"productId"`
	ImageDataURL string `json:"imageDataUrl"`
}

// MockupResponse is the response for mockup generation
type MockupResponse struct {
	MockupURLs  []MockupURL `json:"mockupUrls"`
	ProductName string      `json:"productName"`
	Price       float64     `json:"price"`
	Currency    string      `json:"currency"`
}

// MockupURL is a single mockup image
type MockupURL struct {
	URL string `json:"url"`
}

// CheckoutRequest is the request body for creating a checkout session
type CheckoutRequest struct {
	ProductID  string `json:"productId"`
	VariantID  string `json:"variantId"`
	ImageURL   string `json:"imageUrl"`
	SuccessURL string `json:"successUrl"`
	CancelURL  string `json:"cancelUrl"`
}

// CheckoutResponse is the response for checkout session creation
type CheckoutResponse struct {
	CheckoutURL string `json:"checkoutUrl"`
	SessionID   string `json:"sessionId"`
}

// ConfigResponse is the response for frontend config
type ConfigResponse struct {
	StripePublishableKey string `json:"stripePublishableKey"`
	IsConfigured         bool   `json:"isConfigured"`
}

// HandleGetConfig returns frontend configuration
func (s *MerchService) HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	resp := ConfigResponse{
		StripePublishableKey: s.stripe.GetPublishableKey(),
		IsConfigured:         s.IsConfigured(),
	}
	writeJSON(w, http.StatusOK, resp)
}

// HandleGetProducts returns the product catalog with prices
func (s *MerchService) HandleGetProducts(w http.ResponseWriter, r *http.Request) {
	if !s.gelato.IsConfigured() {
		writeError(w, http.StatusServiceUnavailable, "Merchandise service not configured")
		return
	}

	products, err := s.gelato.GetProducts()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch products")
		return
	}

	margin := GetMarginPercent()
	productsWithPrice := make([]ProductWithPrice, 0, len(products))

	for _, p := range products {
		variants := make([]VariantWithPrice, 0, len(p.Variants))
		for _, v := range p.Variants {
			variants = append(variants, VariantWithPrice{
				ID:         v.ID,
				Title:      v.Title,
				Attributes: v.Attributes,
				BasePrice:  v.Price.Amount,
				Price:      CalculatePrice(v.Price.Amount, margin),
			})
		}

		productsWithPrice = append(productsWithPrice, ProductWithPrice{
			ID:          p.ID,
			Title:       p.Title,
			Description: p.Description,
			Category:    p.Category,
			ImageURL:    p.ImageURL,
			BasePrice:   p.BasePrice.Amount,
			Price:       CalculatePrice(p.BasePrice.Amount, margin),
			Currency:    p.BasePrice.Currency,
			Variants:    variants,
		})
	}

	writeJSON(w, http.StatusOK, ProductsResponse{
		Products: productsWithPrice,
		Currency: "EUR",
	})
}

// HandleCreateMockup generates a product mockup
func (s *MerchService) HandleCreateMockup(w http.ResponseWriter, r *http.Request) {
	if !s.gelato.IsConfigured() {
		writeError(w, http.StatusServiceUnavailable, "Merchandise service not configured")
		return
	}

	var req MockupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ProductID == "" || req.ImageDataURL == "" {
		writeError(w, http.StatusBadRequest, "productId and imageDataUrl are required")
		return
	}

	// Upload the image first
	imageURL, err := s.gelato.UploadImage(req.ImageDataURL)
	if err != nil {
		log.Printf("Image upload failed: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to upload image")
		return
	}

	// Create mockup task
	mockupTask, err := s.gelato.CreateMockup(req.ProductID, imageURL)
	if err != nil {
		log.Printf("Mockup creation failed: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to create mockup")
		return
	}

	// Poll for completion (up to 30s)
	mockup, err := s.gelato.WaitForMockup(mockupTask.TaskID, 30*time.Second)
	if err != nil {
		log.Printf("Mockup polling failed: %v", err)
		writeError(w, http.StatusInternalServerError, "Mockup generation timed out")
		return
	}

	// Get product details for price
	products, _ := s.gelato.GetProducts()
	var productName string
	var price float64
	currency := "EUR"
	for _, p := range products {
		if p.ID == req.ProductID {
			productName = p.Title
			price = CalculatePrice(p.BasePrice.Amount, GetMarginPercent())
			currency = p.BasePrice.Currency
			break
		}
	}

	// Map mockup URLs
	urls := make([]MockupURL, 0, len(mockup.MockupURLs))
	for _, mu := range mockup.MockupURLs {
		urls = append(urls, MockupURL{URL: mu.URL})
	}

	writeJSON(w, http.StatusOK, MockupResponse{
		MockupURLs:  urls,
		ProductName: productName,
		Price:       price,
		Currency:    currency,
	})
}

// HandleCreateCheckout creates a Stripe checkout session
func (s *MerchService) HandleCreateCheckout(w http.ResponseWriter, r *http.Request) {
	if !s.IsConfigured() {
		writeError(w, http.StatusServiceUnavailable, "Payment service not configured")
		return
	}

	var req CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ProductID == "" || req.ImageURL == "" {
		writeError(w, http.StatusBadRequest, "productId and imageUrl are required")
		return
	}

	// Get product details
	products, err := s.gelato.GetProducts()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch product")
		return
	}

	var product *GelatoProduct
	var variant *GelatoVariant
	for i := range products {
		if products[i].ID == req.ProductID {
			product = &products[i]
			// Find variant if specified
			if req.VariantID != "" {
				for j := range products[i].Variants {
					if products[i].Variants[j].ID == req.VariantID {
						variant = &products[i].Variants[j]
						break
					}
				}
			}
			break
		}
	}

	if product == nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}

	// Calculate price
	basePrice := product.BasePrice.Amount
	if variant != nil {
		basePrice = variant.Price.Amount
	}
	customerPrice := CalculatePrice(basePrice, GetMarginPercent())

	// Build product name with variant
	productName := product.Title
	if variant != nil {
		productName = fmt.Sprintf("%s - %s", product.Title, variant.Title)
	}

	// Create Stripe checkout session
	session, err := s.stripe.CreateCheckoutSession(&CheckoutSessionRequest{
		ProductID:   req.ProductID,
		VariantID:   req.VariantID,
		ProductName: productName,
		ProductDesc: product.Description,
		ImageURL:    req.ImageURL,
		UnitAmount:  ConvertToCents(customerPrice),
		Currency:    product.BasePrice.Currency,
		Quantity:    1,
		SuccessURL:  req.SuccessURL,
		CancelURL:   req.CancelURL,
	})
	if err != nil {
		log.Printf("Checkout session creation failed: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to create checkout session")
		return
	}

	writeJSON(w, http.StatusOK, CheckoutResponse{
		CheckoutURL: session.URL,
		SessionID:   session.ID,
	})
}

// HandleWebhook processes Stripe webhook events
func (s *MerchService) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	if !s.IsConfigured() {
		writeError(w, http.StatusServiceUnavailable, "Payment service not configured")
		return
	}

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	// Verify signature
	signature := r.Header.Get("Stripe-Signature")
	event, err := s.stripe.VerifyWebhookSignature(body, signature)
	if err != nil {
		log.Printf("Webhook signature verification failed: %v", err)
		writeError(w, http.StatusBadRequest, "Invalid signature")
		return
	}

	// Handle event types
	switch event.Type {
	case "checkout.session.completed":
		s.handleCheckoutCompleted(event)
	default:
		log.Printf("Unhandled webhook event type: %s", event.Type)
	}

	w.WriteHeader(http.StatusOK)
}

// handleCheckoutCompleted processes a completed checkout session
func (s *MerchService) handleCheckoutCompleted(event *StripeWebhookEvent) {
	session, err := ParseCheckoutSessionFromEvent(event.Data.Object)
	if err != nil {
		log.Printf("Failed to parse checkout session: %v", err)
		return
	}

	log.Printf("Checkout completed: %s (amount: %d %s)", session.ID, session.AmountTotal, session.Currency)

	// Get full session details including shipping
	fullSession, err := s.stripe.GetCheckoutSession(session.ID)
	if err != nil {
		log.Printf("Failed to get full session details: %v", err)
		return
	}

	// Create Gelato order
	if fullSession.ShippingDetails == nil {
		log.Printf("No shipping details in session %s", session.ID)
		return
	}

	// Parse name into first/last
	nameParts := strings.SplitN(fullSession.ShippingDetails.Name, " ", 2)
	firstName := nameParts[0]
	lastName := ""
	if len(nameParts) > 1 {
		lastName = nameParts[1]
	}

	// Get metadata
	productID := session.Metadata["product_id"]
	variantID := session.Metadata["variant_id"]
	imageURL := session.Metadata["image_url"]

	if productID == "" || imageURL == "" {
		log.Printf("Missing required metadata in session %s", session.ID)
		return
	}

	// Create Gelato order
	order := &GelatoOrderRequest{
		OrderReferenceID: generateID(),
		CustomerRefID:    session.ID,
		Currency:         strings.ToUpper(session.Currency),
		Items: []GelatoOrderItem{
			{
				ItemReferenceID: generateID(),
				ProductUID:      getGelatoProductUID(productID, variantID),
				Files: []GelatoFile{
					{
						Type: "default",
						URL:  imageURL,
					},
				},
				Quantity: 1,
			},
		},
		ShippingAddress: GelatoShipAddress{
			FirstName:    firstName,
			LastName:     lastName,
			AddressLine1: fullSession.ShippingDetails.Address.Line1,
			AddressLine2: fullSession.ShippingDetails.Address.Line2,
			City:         fullSession.ShippingDetails.Address.City,
			PostCode:     fullSession.ShippingDetails.Address.PostalCode,
			Country:      fullSession.ShippingDetails.Address.Country,
			Email:        fullSession.CustomerDetails.Email,
		},
	}

	orderResp, err := s.gelato.CreateOrder(order)
	if err != nil {
		log.Printf("Failed to create Gelato order: %v", err)
		return
	}

	log.Printf("Gelato order created: %s (status: %s)", orderResp.ID, orderResp.Status)
}

// getGelatoProductUID maps our product/variant IDs to Gelato product UIDs
// This mapping would need to be configured based on actual Gelato product catalog
func getGelatoProductUID(productID, variantID string) string {
	// For now, return a simple concatenation
	// In production, this would map to actual Gelato product UIDs
	if variantID != "" {
		return variantID
	}
	return productID
}

// generateID generates a unique identifier
func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%d-%s", time.Now().UnixNano(), hex.EncodeToString(b))
}

// writeJSON writes a JSON response
func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// writeError writes an error response
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
