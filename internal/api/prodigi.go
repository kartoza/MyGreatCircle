package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Prodigi API configuration
const (
	ProdigiSandboxURL = "https://api.sandbox.prodigi.com"
	ProdigiLiveURL    = "https://api.prodigi.com"
)

// ProdigiProduct represents a product configuration
type ProdigiProduct struct {
	SKU         string  `json:"sku"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	MinPrice    float64 `json:"minPrice"`
}

// Available Prodigi products for MyGreatCircle
var ProdigiProducts = []ProdigiProduct{
	// T-Shirts
	{SKU: "GLOBAL-TRT-BC3001", Name: "Classic T-Shirt", Description: "Bella+Canvas 3001 unisex t-shirt", Category: "tshirt", MinPrice: 29.00},
	{SKU: "GLOBAL-TRT-BC3005", Name: "V-Neck T-Shirt", Description: "Bella+Canvas 3005 v-neck t-shirt", Category: "tshirt", MinPrice: 32.00},
	// Canvas Prints
	{SKU: "GLOBAL-CAN-12X12", Name: "Canvas 12x12", Description: "12x12 inch stretched canvas print", Category: "canvas", MinPrice: 49.00},
	{SKU: "GLOBAL-CAN-16X16", Name: "Canvas 16x16", Description: "16x16 inch stretched canvas print", Category: "canvas", MinPrice: 59.00},
	{SKU: "GLOBAL-CAN-20X20", Name: "Canvas 20x20", Description: "20x20 inch stretched canvas print", Category: "canvas", MinPrice: 79.00},
	{SKU: "GLOBAL-CAN-16X24", Name: "Canvas 16x24", Description: "16x24 inch stretched canvas print", Category: "canvas", MinPrice: 69.00},
	// Mugs
	{SKU: "GLOBAL-MUG-11OZ", Name: "Classic Mug 11oz", Description: "11oz ceramic coffee mug", Category: "mug", MinPrice: 19.00},
	{SKU: "GLOBAL-MUG-15OZ", Name: "Large Mug 15oz", Description: "15oz ceramic coffee mug", Category: "mug", MinPrice: 22.00},
	// Posters
	{SKU: "GLOBAL-HPR-A3", Name: "Poster A3", Description: "A3 premium poster print", Category: "poster", MinPrice: 15.00},
	{SKU: "GLOBAL-HPR-A2", Name: "Poster A2", Description: "A2 premium poster print", Category: "poster", MinPrice: 25.00},
	{SKU: "GLOBAL-HPR-A1", Name: "Poster A1", Description: "A1 premium poster print", Category: "poster", MinPrice: 35.00},
}

// ProdigiAddress represents a shipping address
type ProdigiAddress struct {
	Line1       string `json:"line1"`
	Line2       string `json:"line2,omitempty"`
	PostalCode  string `json:"postalOrZipCode"`
	CountryCode string `json:"countryCode"`
	TownOrCity  string `json:"townOrCity"`
	StateOrArea string `json:"stateOrCounty,omitempty"`
}

// ProdigiRecipient represents the order recipient
type ProdigiRecipient struct {
	Name    string         `json:"name"`
	Email   string         `json:"email,omitempty"`
	Phone   string         `json:"phoneNumber,omitempty"`
	Address ProdigiAddress `json:"address"`
}

// ProdigiAsset represents an image/asset for printing
type ProdigiAsset struct {
	PrintArea string `json:"printArea"`
	URL       string `json:"url"`
}

// ProdigiItem represents an item in the order
type ProdigiItem struct {
	SKU    string         `json:"sku"`
	Copies int            `json:"copies"`
	Assets []ProdigiAsset `json:"assets"`
}

// ProdigiOrderRequest represents a Prodigi order request
type ProdigiOrderRequest struct {
	ShippingMethod  string           `json:"shippingMethod"`
	IdempotencyKey  string           `json:"idempotencyKey,omitempty"`
	MerchantRef     string           `json:"merchantReference,omitempty"`
	Recipient       ProdigiRecipient `json:"recipient"`
	Items           []ProdigiItem    `json:"items"`
	CallbackURL     string           `json:"callbackUrl,omitempty"`
	Metadata        map[string]any   `json:"metadata,omitempty"`
}

// ProdigiCost represents cost information
type ProdigiCost struct {
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
}

// ProdigiCharge represents a charge in the order
type ProdigiCharge struct {
	ID                 string      `json:"id"`
	ProdigiInvoiceNo   string      `json:"prodigiInvoiceNumber"`
	TotalCost          ProdigiCost `json:"totalCost"`
	TotalTax           ProdigiCost `json:"totalTax"`
	Items              []any       `json:"items"`
	Shipments          []any       `json:"shipments"`
}

// ProdigiOrderOutcome represents the order outcome
type ProdigiOrderOutcome struct {
	ID           string          `json:"id"`
	Created      string          `json:"created"`
	Status       ProdigiStatus   `json:"status"`
	Charges      []ProdigiCharge `json:"charges"`
	MerchantRef  string          `json:"merchantReference"`
	Recipient    ProdigiRecipient `json:"recipient"`
	Items        []ProdigiItem   `json:"items"`
}

// ProdigiStatus represents order status details
type ProdigiStatus struct {
	Stage        string `json:"stage"`
	Issues       []any  `json:"issues"`
	DownloadAssets []any `json:"downloadAssets"`
}

// ProdigiOrderResponse represents the API response
type ProdigiOrderResponse struct {
	Outcome ProdigiOrderOutcome `json:"outcome"`
}

// ProdigiQuoteRequest represents a quote request
type ProdigiQuoteRequest struct {
	ShippingMethod string          `json:"shippingMethod"`
	DestCountry    string          `json:"destinationCountryCode"`
	Items          []ProdigiItem   `json:"items"`
}

// ProdigiQuoteOutcome represents the quote outcome
type ProdigiQuoteOutcome struct {
	Quotes []ProdigiQuote `json:"quotes"`
}

// ProdigiQuote represents a single quote
type ProdigiQuote struct {
	ShipmentMethod string        `json:"shipmentMethod"`
	CostSummary    ProdigiCost   `json:"costSummary"`
}

// ProdigiQuoteResponse represents the quote API response
type ProdigiQuoteResponse struct {
	Outcome ProdigiQuoteOutcome `json:"outcome"`
}

// API Request/Response types for our endpoints

// GetProductsResponse is the response for /api/prodigi/products
type GetProductsResponse struct {
	Products []ProdigiProduct `json:"products"`
}

// CreateOrderRequest is the request for /api/prodigi/orders
type CreateOrderRequest struct {
	Product    string           `json:"product"`
	ImageURL   string           `json:"imageUrl"`
	Recipient  ProdigiRecipient `json:"recipient"`
	Quantity   int              `json:"quantity"`
}

// CreateOrderResponse is the response for /api/prodigi/orders
type CreateOrderResponse struct {
	OrderID string  `json:"orderId"`
	Status  string  `json:"status"`
	Total   float64 `json:"total"`
	Currency string `json:"currency"`
}

// GetQuoteRequest is the request for /api/prodigi/quote
type GetQuoteRequest struct {
	Product     string `json:"product"`
	CountryCode string `json:"countryCode"`
	Quantity    int    `json:"quantity"`
}

// GetQuoteResponse is the response for /api/prodigi/quote
type GetQuoteResponse struct {
	ProductCost  float64 `json:"productCost"`
	ShippingCost float64 `json:"shippingCost"`
	Total        float64 `json:"total"`
	Currency     string  `json:"currency"`
}

// getProdigiBaseURL returns the appropriate Prodigi API URL
func getProdigiBaseURL() string {
	if os.Getenv("PRODIGI_LIVE") == "true" {
		return ProdigiLiveURL
	}
	return ProdigiSandboxURL
}

// getProdigiAPIKey returns the Prodigi API key
func getProdigiAPIKey() string {
	return os.Getenv("PRODIGI_API_KEY")
}

// handleProdigiProducts returns available products
func (s *Server) handleProdigiProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetProductsResponse{Products: ProdigiProducts})
}

// handleProdigiQuote gets a price quote for a product
func (s *Server) handleProdigiQuote(w http.ResponseWriter, r *http.Request) {
	apiKey := getProdigiAPIKey()
	if apiKey == "" {
		http.Error(w, "Prodigi API not configured", http.StatusServiceUnavailable)
		return
	}

	var req GetQuoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Product == "" || req.CountryCode == "" {
		http.Error(w, "Product and country code required", http.StatusBadRequest)
		return
	}

	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	// Find product info
	var product *ProdigiProduct
	for _, p := range ProdigiProducts {
		if p.SKU == req.Product {
			product = &p
			break
		}
	}
	if product == nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	// Build quote request
	quoteReq := ProdigiQuoteRequest{
		ShippingMethod: "Standard",
		DestCountry:    req.CountryCode,
		Items: []ProdigiItem{
			{
				SKU:    req.Product,
				Copies: req.Quantity,
				Assets: []ProdigiAsset{
					{PrintArea: "default", URL: "https://example.com/placeholder.png"},
				},
			},
		},
	}

	body, _ := json.Marshal(quoteReq)
	httpReq, err := http.NewRequest("POST", getProdigiBaseURL()+"/v4.0/quotes", bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-API-Key", apiKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, "Failed to contact Prodigi", http.StatusBadGateway)
		return
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("Prodigi error: %s", string(respBody)), resp.StatusCode)
		return
	}

	var quoteResp ProdigiQuoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&quoteResp); err != nil {
		http.Error(w, "Failed to parse Prodigi response", http.StatusInternalServerError)
		return
	}

	// Calculate costs (use first quote)
	var shippingCost float64
	if len(quoteResp.Outcome.Quotes) > 0 {
		// Parse the cost amount
		_, _ = fmt.Sscanf(quoteResp.Outcome.Quotes[0].CostSummary.Amount, "%f", &shippingCost)
	}

	productCost := product.MinPrice * float64(req.Quantity)
	total := productCost + shippingCost

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(GetQuoteResponse{
		ProductCost:  productCost,
		ShippingCost: shippingCost,
		Total:        total,
		Currency:     "USD",
	})
}

// handleProdigiCreateOrder creates a new order
func (s *Server) handleProdigiCreateOrder(w http.ResponseWriter, r *http.Request) {
	apiKey := getProdigiAPIKey()
	if apiKey == "" {
		http.Error(w, "Prodigi API not configured", http.StatusServiceUnavailable)
		return
	}

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Product == "" {
		http.Error(w, "Product SKU required", http.StatusBadRequest)
		return
	}
	if req.ImageURL == "" {
		http.Error(w, "Image URL required", http.StatusBadRequest)
		return
	}
	if req.Recipient.Name == "" {
		http.Error(w, "Recipient name required", http.StatusBadRequest)
		return
	}
	if req.Recipient.Address.Line1 == "" {
		http.Error(w, "Address line 1 required", http.StatusBadRequest)
		return
	}
	if req.Recipient.Address.CountryCode == "" {
		http.Error(w, "Country code required", http.StatusBadRequest)
		return
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	// Find product to validate SKU
	var product *ProdigiProduct
	for _, p := range ProdigiProducts {
		if p.SKU == req.Product {
			product = &p
			break
		}
	}
	if product == nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	// Build Prodigi order request
	orderReq := ProdigiOrderRequest{
		ShippingMethod: "Standard",
		MerchantRef:    fmt.Sprintf("MGC-%d", r.Context().Value("requestId")),
		Recipient:      req.Recipient,
		Items: []ProdigiItem{
			{
				SKU:    req.Product,
				Copies: req.Quantity,
				Assets: []ProdigiAsset{
					{PrintArea: "default", URL: req.ImageURL},
				},
			},
		},
		Metadata: map[string]any{
			"source": "MyGreatCircle",
		},
	}

	body, _ := json.Marshal(orderReq)
	httpReq, err := http.NewRequest("POST", getProdigiBaseURL()+"/v4.0/orders", bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-API-Key", apiKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, "Failed to contact Prodigi", http.StatusBadGateway)
		return
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		http.Error(w, fmt.Sprintf("Prodigi error: %s", string(respBody)), resp.StatusCode)
		return
	}

	var orderResp ProdigiOrderResponse
	if err := json.Unmarshal(respBody, &orderResp); err != nil {
		http.Error(w, "Failed to parse Prodigi response", http.StatusInternalServerError)
		return
	}

	// Calculate total from charges
	var total float64
	currency := "USD"
	if len(orderResp.Outcome.Charges) > 0 {
		charge := orderResp.Outcome.Charges[0]
		_, _ = fmt.Sscanf(charge.TotalCost.Amount, "%f", &total)
		currency = charge.TotalCost.Currency
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(CreateOrderResponse{
		OrderID:  orderResp.Outcome.ID,
		Status:   orderResp.Outcome.Status.Stage,
		Total:    total,
		Currency: currency,
	})
}
