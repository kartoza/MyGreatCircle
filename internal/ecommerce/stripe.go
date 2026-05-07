package ecommerce

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	stripeAPIBaseURL = "https://api.stripe.com/v1"
)

// StripeClient handles communication with Stripe API
type StripeClient struct {
	secretKey      string
	publishableKey string
	webhookSecret  string
	httpClient     *http.Client
}

// StripeCheckoutSession represents a Stripe Checkout session
type StripeCheckoutSession struct {
	ID                 string                 `json:"id"`
	URL                string                 `json:"url"`
	PaymentStatus      string                 `json:"payment_status"`
	Status             string                 `json:"status"`
	CustomerEmail      string                 `json:"customer_email,omitempty"`
	AmountTotal        int64                  `json:"amount_total"`
	Currency           string                 `json:"currency"`
	Metadata           map[string]string      `json:"metadata,omitempty"`
	ShippingDetails    *StripeShippingDetails `json:"shipping_details,omitempty"`
	CustomerDetails    *StripeCustomerDetails `json:"customer_details,omitempty"`
}

// StripeShippingDetails contains shipping information
type StripeShippingDetails struct {
	Name    string         `json:"name"`
	Address StripeAddress  `json:"address"`
}

// StripeCustomerDetails contains customer information
type StripeCustomerDetails struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Phone string `json:"phone,omitempty"`
}

// StripeAddress represents a Stripe address
type StripeAddress struct {
	Line1      string `json:"line1"`
	Line2      string `json:"line2,omitempty"`
	City       string `json:"city"`
	State      string `json:"state,omitempty"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

// StripeWebhookEvent represents a Stripe webhook event
type StripeWebhookEvent struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Data     StripeEventData `json:"data"`
	Created  int64           `json:"created"`
	Livemode bool            `json:"livemode"`
}

// StripeEventData contains the event payload
type StripeEventData struct {
	Object json.RawMessage `json:"object"`
}

// CheckoutSessionRequest contains parameters for creating a checkout session
type CheckoutSessionRequest struct {
	ProductID       string  `json:"productId"`
	VariantID       string  `json:"variantId"`
	ProductName     string  `json:"productName"`
	ProductDesc     string  `json:"productDescription,omitempty"`
	ImageURL        string  `json:"imageUrl"`
	UnitAmount      int64   `json:"unitAmount"` // Amount in cents
	Currency        string  `json:"currency"`
	Quantity        int64   `json:"quantity"`
	SuccessURL      string  `json:"successUrl"`
	CancelURL       string  `json:"cancelUrl"`
	CustomerEmail   string  `json:"customerEmail,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

// NewStripeClient creates a new Stripe API client
func NewStripeClient() *StripeClient {
	return &StripeClient{
		secretKey:      os.Getenv("STRIPE_SECRET_KEY"),
		publishableKey: os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		webhookSecret:  os.Getenv("STRIPE_WEBHOOK_SECRET"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsConfigured returns true if Stripe keys are set
func (c *StripeClient) IsConfigured() bool {
	return c.secretKey != "" && c.webhookSecret != ""
}

// GetPublishableKey returns the publishable key for frontend use
func (c *StripeClient) GetPublishableKey() string {
	return c.publishableKey
}

// doRequest performs an HTTP request to Stripe API
func (c *StripeClient) doRequest(method, path string, data url.Values) ([]byte, error) {
	var reqBody io.Reader
	if data != nil {
		reqBody = strings.NewReader(data.Encode())
	}

	req, err := http.NewRequest(method, stripeAPIBaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(c.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

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

// CreateCheckoutSession creates a new Stripe Checkout session
func (c *StripeClient) CreateCheckoutSession(req *CheckoutSessionRequest) (*StripeCheckoutSession, error) {
	data := url.Values{}
	data.Set("mode", "payment")
	data.Set("success_url", req.SuccessURL)
	data.Set("cancel_url", req.CancelURL)

	// Line item
	data.Set("line_items[0][price_data][currency]", strings.ToLower(req.Currency))
	data.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(req.UnitAmount, 10))
	data.Set("line_items[0][price_data][product_data][name]", req.ProductName)
	if req.ProductDesc != "" {
		data.Set("line_items[0][price_data][product_data][description]", req.ProductDesc)
	}
	if req.ImageURL != "" {
		data.Set("line_items[0][price_data][product_data][images][0]", req.ImageURL)
	}
	data.Set("line_items[0][quantity]", strconv.FormatInt(req.Quantity, 10))

	// Shipping address collection
	data.Set("shipping_address_collection[allowed_countries][0]", "US")
	data.Set("shipping_address_collection[allowed_countries][1]", "CA")
	data.Set("shipping_address_collection[allowed_countries][2]", "GB")
	data.Set("shipping_address_collection[allowed_countries][3]", "DE")
	data.Set("shipping_address_collection[allowed_countries][4]", "FR")
	data.Set("shipping_address_collection[allowed_countries][5]", "NL")
	data.Set("shipping_address_collection[allowed_countries][6]", "BE")
	data.Set("shipping_address_collection[allowed_countries][7]", "AU")
	data.Set("shipping_address_collection[allowed_countries][8]", "NZ")
	data.Set("shipping_address_collection[allowed_countries][9]", "ZA")
	data.Set("shipping_address_collection[allowed_countries][10]", "IE")
	data.Set("shipping_address_collection[allowed_countries][11]", "AT")
	data.Set("shipping_address_collection[allowed_countries][12]", "CH")
	data.Set("shipping_address_collection[allowed_countries][13]", "ES")
	data.Set("shipping_address_collection[allowed_countries][14]", "IT")
	data.Set("shipping_address_collection[allowed_countries][15]", "PT")
	data.Set("shipping_address_collection[allowed_countries][16]", "SE")
	data.Set("shipping_address_collection[allowed_countries][17]", "NO")
	data.Set("shipping_address_collection[allowed_countries][18]", "DK")
	data.Set("shipping_address_collection[allowed_countries][19]", "FI")

	// Customer email
	if req.CustomerEmail != "" {
		data.Set("customer_email", req.CustomerEmail)
	}

	// Metadata for order processing
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			data.Set("metadata["+k+"]", v)
		}
	}
	// Always include product info in metadata
	data.Set("metadata[product_id]", req.ProductID)
	data.Set("metadata[variant_id]", req.VariantID)
	data.Set("metadata[image_url]", req.ImageURL)

	respBody, err := c.doRequest("POST", "/checkout/sessions", data)
	if err != nil {
		return nil, err
	}

	var session StripeCheckoutSession
	if err := json.Unmarshal(respBody, &session); err != nil {
		return nil, fmt.Errorf("failed to parse session response: %w", err)
	}

	return &session, nil
}

// GetCheckoutSession retrieves a checkout session by ID
func (c *StripeClient) GetCheckoutSession(sessionID string) (*StripeCheckoutSession, error) {
	respBody, err := c.doRequest("GET", "/checkout/sessions/"+sessionID+"?expand[]=shipping_details&expand[]=customer_details", nil)
	if err != nil {
		return nil, err
	}

	var session StripeCheckoutSession
	if err := json.Unmarshal(respBody, &session); err != nil {
		return nil, fmt.Errorf("failed to parse session: %w", err)
	}

	return &session, nil
}

// VerifyWebhookSignature verifies the Stripe webhook signature
func (c *StripeClient) VerifyWebhookSignature(payload []byte, signatureHeader string) (*StripeWebhookEvent, error) {
	// Parse the signature header
	// Format: t=timestamp,v1=signature,v1=signature...
	var timestamp string
	var signatures []string

	parts := strings.Split(signatureHeader, ",")
	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			timestamp = kv[1]
		case "v1":
			signatures = append(signatures, kv[1])
		}
	}

	if timestamp == "" || len(signatures) == 0 {
		return nil, fmt.Errorf("invalid signature header format")
	}

	// Verify timestamp is not too old (5 minute tolerance)
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid timestamp: %w", err)
	}
	if time.Now().Unix()-ts > 300 {
		return nil, fmt.Errorf("webhook timestamp too old")
	}

	// Compute expected signature
	signedPayload := timestamp + "." + string(payload)
	mac := hmac.New(sha256.New, []byte(c.webhookSecret))
	mac.Write([]byte(signedPayload))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	// Check if any signature matches
	valid := false
	for _, sig := range signatures {
		if hmac.Equal([]byte(sig), []byte(expectedSig)) {
			valid = true
			break
		}
	}

	if !valid {
		return nil, fmt.Errorf("invalid signature")
	}

	// Parse the event
	var event StripeWebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("failed to parse webhook event: %w", err)
	}

	return &event, nil
}

// ParseCheckoutSessionFromEvent extracts checkout session from webhook event data
func ParseCheckoutSessionFromEvent(data json.RawMessage) (*StripeCheckoutSession, error) {
	var session StripeCheckoutSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("failed to parse checkout session from event: %w", err)
	}
	return &session, nil
}

// ConvertToCents converts a float amount to cents
func ConvertToCents(amount float64) int64 {
	return int64(amount * 100)
}

// ConvertFromCents converts cents to a float amount
func ConvertFromCents(cents int64) float64 {
	return float64(cents) / 100
}
