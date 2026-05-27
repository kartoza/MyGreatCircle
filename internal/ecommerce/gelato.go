package ecommerce

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	gelatoBaseURL = "https://api.gelato.com/v3"
)

// GelatoClient handles communication with Gelato API
type GelatoClient struct {
	apiKey     string
	httpClient *http.Client
	// Product cache
	productCache      []GelatoProduct
	productCacheMu    sync.RWMutex
	productCacheTime  time.Time
	productCacheTTL   time.Duration
}

// GelatoProduct represents a product from Gelato catalog
type GelatoProduct struct {
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Category    string            `json:"category"`
	ImageURL    string            `json:"imageUrl"`
	Variants    []GelatoVariant   `json:"variants"`
	BasePrice   GelatoPrice       `json:"basePrice"`
}

// GelatoVariant represents a product variant
type GelatoVariant struct {
	ID        string      `json:"id"`
	Title     string      `json:"title"`
	Attributes map[string]string `json:"attributes"`
	Price     GelatoPrice `json:"price"`
}

// GelatoPrice represents a price in Gelato
type GelatoPrice struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

// GelatoMockupRequest represents a mockup generation request
type GelatoMockupRequest struct {
	ProductUID string                  `json:"productUid"`
	FileURL    string                  `json:"fileUrl"`
	MockupUID  string                  `json:"mockupUid,omitempty"`
}

// GelatoMockupResponse represents the mockup generation response
type GelatoMockupResponse struct {
	TaskID     string               `json:"taskId"`
	Status     string               `json:"status"` // "created", "completed", "failed"
	MockupURLs []GelatoMockupURL    `json:"mockupUrls,omitempty"`
}

// GelatoMockupURL is a single mockup image URL in the response
type GelatoMockupURL struct {
	MockupUID string `json:"mockupUid"`
	URL       string `json:"url"`
}

// GelatoOrderRequest represents an order creation request
type GelatoOrderRequest struct {
	OrderReferenceID string              `json:"orderReferenceId"`
	CustomerRefID    string              `json:"customerReferenceId,omitempty"`
	Currency         string              `json:"currency"`
	Items            []GelatoOrderItem   `json:"items"`
	ShippingAddress  GelatoShipAddress   `json:"shippingAddress"`
}

// GelatoOrderItem represents an item in an order
type GelatoOrderItem struct {
	ItemReferenceID string `json:"itemReferenceId"`
	ProductUID      string `json:"productUid"`
	Files           []GelatoFile `json:"files"`
	Quantity        int    `json:"quantity"`
}

// GelatoFile represents a file for printing
type GelatoFile struct {
	Type string `json:"type"`
	URL  string `json:"url"`
}

// GelatoShipAddress represents a shipping address
type GelatoShipAddress struct {
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	AddressLine1 string `json:"addressLine1"`
	AddressLine2 string `json:"addressLine2,omitempty"`
	City        string `json:"city"`
	PostCode    string `json:"postCode"`
	Country     string `json:"country"`
	Email       string `json:"email"`
	Phone       string `json:"phone,omitempty"`
}

// GelatoOrderResponse represents the order creation response
type GelatoOrderResponse struct {
	ID           string `json:"id"`
	Status       string `json:"status"`
	TrackingURL  string `json:"trackingUrl,omitempty"`
}

// NewGelatoClient creates a new Gelato API client
func NewGelatoClient() *GelatoClient {
	return &GelatoClient{
		apiKey: os.Getenv("GELATO_API_KEY"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		productCacheTTL: 1 * time.Hour,
	}
}

// IsConfigured returns true if Gelato API key is set
func (c *GelatoClient) IsConfigured() bool {
	return c.apiKey != ""
}

// doRequest performs an HTTP request to Gelato API
func (c *GelatoClient) doRequest(method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, gelatoBaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-API-KEY", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// GetProducts returns the product catalog (cached)
func (c *GelatoClient) GetProducts() ([]GelatoProduct, error) {
	c.productCacheMu.RLock()
	if len(c.productCache) > 0 && time.Since(c.productCacheTime) < c.productCacheTTL {
		products := c.productCache
		c.productCacheMu.RUnlock()
		return products, nil
	}
	c.productCacheMu.RUnlock()

	// Fetch from API
	// Note: Gelato's actual API structure may differ - this is a simplified example
	// In practice, you'd need to handle pagination and specific product queries
	respBody, err := c.doRequest("GET", "/products", nil)
	if err != nil {
		// Return curated product list as fallback
		return c.getCuratedProducts(), nil
	}

	var response struct {
		Products []GelatoProduct `json:"products"`
	}
	if err := json.Unmarshal(respBody, &response); err != nil {
		return c.getCuratedProducts(), nil
	}

	c.productCacheMu.Lock()
	c.productCache = response.Products
	c.productCacheTime = time.Now()
	c.productCacheMu.Unlock()

	return response.Products, nil
}

// getCuratedProducts returns a curated list of products we support
// Based on Gelato's product catalog - https://www.gelato.com/products
func (c *GelatoClient) getCuratedProducts() []GelatoProduct {
	return []GelatoProduct{
		// ============ WALL ART ============
		{
			ID:          "poster_a4",
			Title:       "A4 Poster",
			Description: "Perfect desk or shelf size, premium matte paper",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 12.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "poster_a4_matte", Title: "Matte", Attributes: map[string]string{"size": "A4", "finish": "matte"}, Price: GelatoPrice{Amount: 12.00, Currency: "EUR"}},
				{ID: "poster_a4_gloss", Title: "Glossy", Attributes: map[string]string{"size": "A4", "finish": "gloss"}, Price: GelatoPrice{Amount: 14.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "poster_a3",
			Title:       "A3 Poster",
			Description: "Classic poster size, museum-quality matte paper",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 18.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "poster_a3_matte", Title: "Matte", Attributes: map[string]string{"size": "A3", "finish": "matte"}, Price: GelatoPrice{Amount: 18.00, Currency: "EUR"}},
				{ID: "poster_a3_gloss", Title: "Glossy", Attributes: map[string]string{"size": "A3", "finish": "gloss"}, Price: GelatoPrice{Amount: 20.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "poster_a2",
			Title:       "A2 Poster",
			Description: "Large format, perfect for living rooms",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 28.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "poster_a2_matte", Title: "Matte", Attributes: map[string]string{"size": "A2", "finish": "matte"}, Price: GelatoPrice{Amount: 28.00, Currency: "EUR"}},
				{ID: "poster_a2_gloss", Title: "Glossy", Attributes: map[string]string{"size": "A2", "finish": "gloss"}, Price: GelatoPrice{Amount: 30.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "poster_a1",
			Title:       "A1 Poster",
			Description: "Statement piece, gallery-quality print",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 45.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "poster_a1_matte", Title: "Matte", Attributes: map[string]string{"size": "A1", "finish": "matte"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "poster_a1_gloss", Title: "Glossy", Attributes: map[string]string{"size": "A1", "finish": "gloss"}, Price: GelatoPrice{Amount: 48.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "framed_a4",
			Title:       "Framed A4 Print",
			Description: "Premium print in elegant wooden frame",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 35.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "framed_a4_black", Title: "Black Frame", Attributes: map[string]string{"size": "A4", "frame": "black"}, Price: GelatoPrice{Amount: 35.00, Currency: "EUR"}},
				{ID: "framed_a4_white", Title: "White Frame", Attributes: map[string]string{"size": "A4", "frame": "white"}, Price: GelatoPrice{Amount: 35.00, Currency: "EUR"}},
				{ID: "framed_a4_oak", Title: "Oak Frame", Attributes: map[string]string{"size": "A4", "frame": "oak"}, Price: GelatoPrice{Amount: 38.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "framed_a3",
			Title:       "Framed A3 Print",
			Description: "Gallery-ready with premium wooden frame",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 55.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "framed_a3_black", Title: "Black Frame", Attributes: map[string]string{"size": "A3", "frame": "black"}, Price: GelatoPrice{Amount: 55.00, Currency: "EUR"}},
				{ID: "framed_a3_white", Title: "White Frame", Attributes: map[string]string{"size": "A3", "frame": "white"}, Price: GelatoPrice{Amount: 55.00, Currency: "EUR"}},
				{ID: "framed_a3_oak", Title: "Oak Frame", Attributes: map[string]string{"size": "A3", "frame": "oak"}, Price: GelatoPrice{Amount: 58.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "canvas_30x30",
			Title:       "Canvas 30x30cm",
			Description: "Square gallery-wrapped canvas",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 38.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "canvas_30x30_std", Title: "Standard", Attributes: map[string]string{"size": "30x30cm"}, Price: GelatoPrice{Amount: 38.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "canvas_40x40",
			Title:       "Canvas 40x40cm",
			Description: "Medium square canvas, perfect focal point",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 48.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "canvas_40x40_std", Title: "Standard", Attributes: map[string]string{"size": "40x40cm"}, Price: GelatoPrice{Amount: 48.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "canvas_60x40",
			Title:       "Canvas 60x40cm",
			Description: "Landscape canvas, gallery-wrapped",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 58.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "canvas_60x40_std", Title: "Standard", Attributes: map[string]string{"size": "60x40cm"}, Price: GelatoPrice{Amount: 58.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "canvas_80x60",
			Title:       "Canvas 80x60cm",
			Description: "Large statement canvas for living spaces",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 85.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "canvas_80x60_std", Title: "Standard", Attributes: map[string]string{"size": "80x60cm"}, Price: GelatoPrice{Amount: 85.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "acrylic_30x30",
			Title:       "Acrylic Print 30x30cm",
			Description: "Stunning HD print behind acrylic glass",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 65.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "acrylic_30x30_std", Title: "Standard", Attributes: map[string]string{"size": "30x30cm"}, Price: GelatoPrice{Amount: 65.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "metal_30x30",
			Title:       "Metal Print 30x30cm",
			Description: "Vibrant print on brushed aluminum",
			Category:    "wall-art",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 55.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "metal_30x30_std", Title: "Standard", Attributes: map[string]string{"size": "30x30cm"}, Price: GelatoPrice{Amount: 55.00, Currency: "EUR"}},
			},
		},
		// ============ APPAREL ============
		{
			ID:          "tshirt_unisex",
			Title:       "Classic T-Shirt",
			Description: "100% organic cotton, unisex fit",
			Category:    "apparel",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 22.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "tshirt_s_black", Title: "S - Black", Attributes: map[string]string{"size": "S", "color": "black"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_m_black", Title: "M - Black", Attributes: map[string]string{"size": "M", "color": "black"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_l_black", Title: "L - Black", Attributes: map[string]string{"size": "L", "color": "black"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_xl_black", Title: "XL - Black", Attributes: map[string]string{"size": "XL", "color": "black"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_xxl_black", Title: "XXL - Black", Attributes: map[string]string{"size": "XXL", "color": "black"}, Price: GelatoPrice{Amount: 24.00, Currency: "EUR"}},
				{ID: "tshirt_s_white", Title: "S - White", Attributes: map[string]string{"size": "S", "color": "white"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_m_white", Title: "M - White", Attributes: map[string]string{"size": "M", "color": "white"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_l_white", Title: "L - White", Attributes: map[string]string{"size": "L", "color": "white"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_xl_white", Title: "XL - White", Attributes: map[string]string{"size": "XL", "color": "white"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_xxl_white", Title: "XXL - White", Attributes: map[string]string{"size": "XXL", "color": "white"}, Price: GelatoPrice{Amount: 24.00, Currency: "EUR"}},
				{ID: "tshirt_s_navy", Title: "S - Navy", Attributes: map[string]string{"size": "S", "color": "navy"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_m_navy", Title: "M - Navy", Attributes: map[string]string{"size": "M", "color": "navy"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_l_navy", Title: "L - Navy", Attributes: map[string]string{"size": "L", "color": "navy"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "tshirt_xl_navy", Title: "XL - Navy", Attributes: map[string]string{"size": "XL", "color": "navy"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "hoodie_unisex",
			Title:       "Classic Hoodie",
			Description: "Warm organic cotton blend, kangaroo pocket",
			Category:    "apparel",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 45.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "hoodie_s_black", Title: "S - Black", Attributes: map[string]string{"size": "S", "color": "black"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_m_black", Title: "M - Black", Attributes: map[string]string{"size": "M", "color": "black"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_l_black", Title: "L - Black", Attributes: map[string]string{"size": "L", "color": "black"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_xl_black", Title: "XL - Black", Attributes: map[string]string{"size": "XL", "color": "black"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_s_grey", Title: "S - Grey", Attributes: map[string]string{"size": "S", "color": "grey"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_m_grey", Title: "M - Grey", Attributes: map[string]string{"size": "M", "color": "grey"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_l_grey", Title: "L - Grey", Attributes: map[string]string{"size": "L", "color": "grey"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "hoodie_xl_grey", Title: "XL - Grey", Attributes: map[string]string{"size": "XL", "color": "grey"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "sweatshirt",
			Title:       "Sweatshirt",
			Description: "Cozy crewneck, organic cotton blend",
			Category:    "apparel",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 38.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "sweat_s_black", Title: "S - Black", Attributes: map[string]string{"size": "S", "color": "black"}, Price: GelatoPrice{Amount: 38.00, Currency: "EUR"}},
				{ID: "sweat_m_black", Title: "M - Black", Attributes: map[string]string{"size": "M", "color": "black"}, Price: GelatoPrice{Amount: 38.00, Currency: "EUR"}},
				{ID: "sweat_l_black", Title: "L - Black", Attributes: map[string]string{"size": "L", "color": "black"}, Price: GelatoPrice{Amount: 38.00, Currency: "EUR"}},
				{ID: "sweat_xl_black", Title: "XL - Black", Attributes: map[string]string{"size": "XL", "color": "black"}, Price: GelatoPrice{Amount: 38.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "tank_top",
			Title:       "Tank Top",
			Description: "Lightweight, perfect for summer",
			Category:    "apparel",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 20.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "tank_s_white", Title: "S - White", Attributes: map[string]string{"size": "S", "color": "white"}, Price: GelatoPrice{Amount: 20.00, Currency: "EUR"}},
				{ID: "tank_m_white", Title: "M - White", Attributes: map[string]string{"size": "M", "color": "white"}, Price: GelatoPrice{Amount: 20.00, Currency: "EUR"}},
				{ID: "tank_l_white", Title: "L - White", Attributes: map[string]string{"size": "L", "color": "white"}, Price: GelatoPrice{Amount: 20.00, Currency: "EUR"}},
				{ID: "tank_xl_white", Title: "XL - White", Attributes: map[string]string{"size": "XL", "color": "white"}, Price: GelatoPrice{Amount: 20.00, Currency: "EUR"}},
			},
		},
		// ============ ACCESSORIES ============
		{
			ID:          "mug_11oz",
			Title:       "Classic Mug 11oz",
			Description: "Ceramic mug, dishwasher & microwave safe",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 14.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "mug_11oz_white", Title: "White", Attributes: map[string]string{"size": "11oz", "color": "white"}, Price: GelatoPrice{Amount: 14.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "mug_15oz",
			Title:       "Large Mug 15oz",
			Description: "Bigger ceramic mug for serious coffee lovers",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 16.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "mug_15oz_white", Title: "White", Attributes: map[string]string{"size": "15oz", "color": "white"}, Price: GelatoPrice{Amount: 16.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "mug_enamel",
			Title:       "Enamel Camping Mug",
			Description: "Durable enamel mug, perfect for adventures",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 18.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "mug_enamel_white", Title: "White", Attributes: map[string]string{"material": "enamel"}, Price: GelatoPrice{Amount: 18.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "water_bottle",
			Title:       "Water Bottle",
			Description: "Stainless steel, keeps drinks cold 24h",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 25.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "bottle_500ml", Title: "500ml", Attributes: map[string]string{"size": "500ml"}, Price: GelatoPrice{Amount: 25.00, Currency: "EUR"}},
				{ID: "bottle_750ml", Title: "750ml", Attributes: map[string]string{"size": "750ml"}, Price: GelatoPrice{Amount: 28.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "tote_bag",
			Title:       "Tote Bag",
			Description: "Organic cotton, spacious and durable",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 18.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "tote_natural", Title: "Natural", Attributes: map[string]string{"color": "natural"}, Price: GelatoPrice{Amount: 18.00, Currency: "EUR"}},
				{ID: "tote_black", Title: "Black", Attributes: map[string]string{"color": "black"}, Price: GelatoPrice{Amount: 18.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "backpack",
			Title:       "Backpack",
			Description: "Durable all-over print backpack",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 45.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "backpack_std", Title: "Standard", Attributes: map[string]string{"size": "standard"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "mousepad",
			Title:       "Mouse Pad",
			Description: "Non-slip rubber base, smooth surface",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 12.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "mousepad_rect", Title: "Rectangle", Attributes: map[string]string{"shape": "rectangle"}, Price: GelatoPrice{Amount: 12.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "desk_mat",
			Title:       "Desk Mat",
			Description: "Large desk mat, perfect for your workspace",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 28.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "deskmat_large", Title: "Large (80x40cm)", Attributes: map[string]string{"size": "80x40cm"}, Price: GelatoPrice{Amount: 28.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "puzzle_500",
			Title:       "Jigsaw Puzzle 500pc",
			Description: "High-quality puzzle, great gift idea",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 25.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "puzzle_500_std", Title: "500 pieces", Attributes: map[string]string{"pieces": "500"}, Price: GelatoPrice{Amount: 25.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "puzzle_1000",
			Title:       "Jigsaw Puzzle 1000pc",
			Description: "Challenging puzzle for enthusiasts",
			Category:    "accessories",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 32.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "puzzle_1000_std", Title: "1000 pieces", Attributes: map[string]string{"pieces": "1000"}, Price: GelatoPrice{Amount: 32.00, Currency: "EUR"}},
			},
		},
		// ============ PHONE CASES ============
		{
			ID:          "case_iphone",
			Title:       "iPhone Case",
			Description: "Tough snap case, glossy finish",
			Category:    "phone-cases",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 22.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "case_iphone13", Title: "iPhone 13", Attributes: map[string]string{"model": "iPhone 13"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone13pro", Title: "iPhone 13 Pro", Attributes: map[string]string{"model": "iPhone 13 Pro"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone14", Title: "iPhone 14", Attributes: map[string]string{"model": "iPhone 14"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone14pro", Title: "iPhone 14 Pro", Attributes: map[string]string{"model": "iPhone 14 Pro"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone14promax", Title: "iPhone 14 Pro Max", Attributes: map[string]string{"model": "iPhone 14 Pro Max"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone15", Title: "iPhone 15", Attributes: map[string]string{"model": "iPhone 15"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone15pro", Title: "iPhone 15 Pro", Attributes: map[string]string{"model": "iPhone 15 Pro"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone15promax", Title: "iPhone 15 Pro Max", Attributes: map[string]string{"model": "iPhone 15 Pro Max"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone16", Title: "iPhone 16", Attributes: map[string]string{"model": "iPhone 16"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_iphone16pro", Title: "iPhone 16 Pro", Attributes: map[string]string{"model": "iPhone 16 Pro"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "case_samsung",
			Title:       "Samsung Galaxy Case",
			Description: "Tough snap case, glossy finish",
			Category:    "phone-cases",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 22.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "case_s23", Title: "Galaxy S23", Attributes: map[string]string{"model": "Galaxy S23"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_s23plus", Title: "Galaxy S23+", Attributes: map[string]string{"model": "Galaxy S23+"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_s23ultra", Title: "Galaxy S23 Ultra", Attributes: map[string]string{"model": "Galaxy S23 Ultra"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_s24", Title: "Galaxy S24", Attributes: map[string]string{"model": "Galaxy S24"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_s24plus", Title: "Galaxy S24+", Attributes: map[string]string{"model": "Galaxy S24+"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "case_s24ultra", Title: "Galaxy S24 Ultra", Attributes: map[string]string{"model": "Galaxy S24 Ultra"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
			},
		},
		// ============ HOME & LIVING ============
		{
			ID:          "pillow_cover",
			Title:       "Throw Pillow Cover",
			Description: "Soft polyester, hidden zipper",
			Category:    "home",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 22.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "pillow_16x16", Title: "16x16 inch", Attributes: map[string]string{"size": "16x16"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
				{ID: "pillow_18x18", Title: "18x18 inch", Attributes: map[string]string{"size": "18x18"}, Price: GelatoPrice{Amount: 24.00, Currency: "EUR"}},
				{ID: "pillow_20x20", Title: "20x20 inch", Attributes: map[string]string{"size": "20x20"}, Price: GelatoPrice{Amount: 26.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "blanket",
			Title:       "Fleece Blanket",
			Description: "Soft and cozy, perfect for the couch",
			Category:    "home",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 45.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "blanket_50x60", Title: "50x60 inch", Attributes: map[string]string{"size": "50x60"}, Price: GelatoPrice{Amount: 45.00, Currency: "EUR"}},
				{ID: "blanket_60x80", Title: "60x80 inch", Attributes: map[string]string{"size": "60x80"}, Price: GelatoPrice{Amount: 55.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "towel",
			Title:       "Beach Towel",
			Description: "Soft microfiber, quick-drying",
			Category:    "home",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 35.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "towel_std", Title: "Standard (30x60 inch)", Attributes: map[string]string{"size": "30x60"}, Price: GelatoPrice{Amount: 35.00, Currency: "EUR"}},
			},
		},
		// ============ STATIONERY ============
		{
			ID:          "notebook",
			Title:       "Hardcover Notebook",
			Description: "128 lined pages, lay-flat binding",
			Category:    "stationery",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 18.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "notebook_a5", Title: "A5", Attributes: map[string]string{"size": "A5"}, Price: GelatoPrice{Amount: 18.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "greeting_cards",
			Title:       "Greeting Cards (Pack of 10)",
			Description: "Premium cards with envelopes",
			Category:    "stationery",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 22.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "cards_10pack", Title: "10 Cards", Attributes: map[string]string{"quantity": "10"}, Price: GelatoPrice{Amount: 22.00, Currency: "EUR"}},
			},
		},
		{
			ID:          "postcard",
			Title:       "Postcards (Pack of 20)",
			Description: "Thick cardstock, matte finish",
			Category:    "stationery",
			ImageURL:    "",
			BasePrice:   GelatoPrice{Amount: 15.00, Currency: "EUR"},
			Variants: []GelatoVariant{
				{ID: "postcard_20pack", Title: "20 Cards", Attributes: map[string]string{"quantity": "20"}, Price: GelatoPrice{Amount: 15.00, Currency: "EUR"}},
			},
		},
	}
}

// UploadImage uploads an image to Gelato and returns the URL
func (c *GelatoClient) UploadImage(imageDataURL string) (string, error) {
	// Extract base64 data from data URL
	parts := strings.SplitN(imageDataURL, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid data URL format")
	}

	imageData, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("failed to decode base64 image: %w", err)
	}

	// Create multipart form request
	// Note: This is a simplified implementation - actual Gelato API may differ
	req, err := http.NewRequest("POST", gelatoBaseURL+"/files", bytes.NewReader(imageData))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	req.Header.Set("X-API-KEY", c.apiKey)
	req.Header.Set("Content-Type", "image/png")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("upload failed (status %d): %s", resp.StatusCode, string(body))
	}

	var response struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to parse upload response: %w", err)
	}

	return response.URL, nil
}

// CreateMockup generates a product mockup with the user's image
func (c *GelatoClient) CreateMockup(productUID, fileURL string) (*GelatoMockupResponse, error) {
	reqBody := GelatoMockupRequest{
		ProductUID: productUID,
		FileURL:    fileURL,
	}

	respBody, err := c.doRequest("POST", "/mockup-tasks", reqBody)
	if err != nil {
		return nil, err
	}

	var response GelatoMockupResponse
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse mockup response: %w", err)
	}

	return &response, nil
}

// WaitForMockup polls for mockup completion with timeout
func (c *GelatoClient) WaitForMockup(taskID string, timeout time.Duration) (*GelatoMockupResponse, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := c.GetMockupStatus(taskID)
		if err != nil {
			return nil, err
		}
		if resp.Status == "completed" {
			return resp, nil
		}
		if resp.Status == "failed" {
			return nil, fmt.Errorf("mockup generation failed")
		}
		time.Sleep(1 * time.Second)
	}
	return nil, fmt.Errorf("mockup generation timed out")
}

// GetMockupStatus checks the status of a mockup task
func (c *GelatoClient) GetMockupStatus(taskID string) (*GelatoMockupResponse, error) {
	respBody, err := c.doRequest("GET", "/mockup-tasks/"+taskID, nil)
	if err != nil {
		return nil, err
	}

	var response GelatoMockupResponse
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse mockup status: %w", err)
	}

	return &response, nil
}

// CreateOrder creates an order in Gelato
func (c *GelatoClient) CreateOrder(order *GelatoOrderRequest) (*GelatoOrderResponse, error) {
	respBody, err := c.doRequest("POST", "/orders", order)
	if err != nil {
		return nil, err
	}

	var response GelatoOrderResponse
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse order response: %w", err)
	}

	return &response, nil
}

// GetOrder retrieves order details
func (c *GelatoClient) GetOrder(orderID string) (*GelatoOrderResponse, error) {
	respBody, err := c.doRequest("GET", "/orders/"+orderID, nil)
	if err != nil {
		return nil, err
	}

	var response GelatoOrderResponse
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse order: %w", err)
	}

	return &response, nil
}

// CalculatePrice calculates the customer price including margin
func CalculatePrice(basePrice float64, marginPercent float64) float64 {
	if marginPercent <= 0 {
		marginPercent = 30 // Default 30% margin
	}
	return basePrice * (1 + marginPercent/100)
}

// GetMarginPercent returns the configured margin percentage
func GetMarginPercent() float64 {
	marginStr := os.Getenv("MERCH_MARGIN_PERCENT")
	if marginStr == "" {
		return 30.0
	}
	var margin float64
	_, _ = fmt.Sscanf(marginStr, "%f", &margin)
	if margin <= 0 || margin > 100 {
		return 30.0
	}
	return margin
}
