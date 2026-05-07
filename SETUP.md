# MyGreatCircle Setup Guide

## Development Environment

### Prerequisites

- Go 1.22+
- Node.js 22+
- Nix (recommended for reproducible environment)

### Quick Start

```bash
# Enter Nix development environment
nix develop

# Install frontend dependencies
cd web && npm install && cd ..

# Run development servers
make dev
```

## Print-on-Demand Integration (Gelato)

MyGreatCircle uses [Gelato](https://www.gelato.com) for print-on-demand merchandise. Users can order products with their journey map printed on t-shirts, mugs, wall art, and more.

### Why Gelato?

- **Carbon Neutral**: Local production in 32+ countries reduces shipping emissions
- **European HQ**: Based in Oslo, Norway with strong environmental focus
- **Wide Product Range**: Apparel, mugs, wall art, phone cases, and more
- **Quality API**: REST API with mockup generation, product catalog, and order management

### Setting Up Gelato

1. **Create a Gelato account**
   - Go to https://www.gelato.com
   - Sign up for a business account (free to start)

2. **Generate an API key**
   - Go to Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Copy the generated API key

3. **Set up Stripe for payments**
   - Go to https://dashboard.stripe.com
   - Create an account or sign in
   - Get your API keys from Developers → API Keys
   - Set up a webhook endpoint for `checkout.session.completed` events

4. **Configure environment variables**
   ```bash
   # Gelato API (Print-on-Demand)
   export GELATO_API_KEY="your-gelato-api-key"

   # Stripe Payment Processing
   export STRIPE_SECRET_KEY="sk_live_..."
   export STRIPE_PUBLISHABLE_KEY="pk_live_..."
   export STRIPE_WEBHOOK_SECRET="whsec_..."

   # Optional: Margin configuration (default 30%)
   export MERCH_MARGIN_PERCENT="30"
   ```

   For production, set these in your deployment environment (e.g., systemd service file, Docker compose, or hosting platform secrets).

### How It Works

1. User creates their journey map visualization
2. User clicks "Order Merchandise" to browse products
3. User selects a product and sees a mockup with their map
4. User clicks "Order Now" → redirected to Stripe Checkout
5. User enters shipping address and payment details
6. On successful payment, backend creates Gelato order via API
7. Gelato prints locally (nearest facility) and ships to user
8. User receives tracking information via email
9. Commission accrues in your Stripe account (minus Stripe fees)

### Pricing Model

Your margin is added to Gelato's base price:

Example for a t-shirt:
- Gelato base price: €15.00
- Your margin (30%): €4.50
- Customer pays: €19.50
- Stripe fee (~2.9% + €0.25): ~€0.82
- Your profit: ~€3.68

### Setting Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/merch/webhook`
3. Select events: `checkout.session.completed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### Payout

Revenue is collected via Stripe and paid out to your bank account according to your Stripe settings (typically daily or weekly rolling basis).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GELATO_API_KEY` | For merchandise | Gelato API key for print-on-demand |
| `STRIPE_SECRET_KEY` | For merchandise | Stripe secret key for payment processing |
| `STRIPE_PUBLISHABLE_KEY` | For merchandise | Stripe publishable key (frontend) |
| `STRIPE_WEBHOOK_SECRET` | For merchandise | Stripe webhook signing secret |
| `MERCH_MARGIN_PERCENT` | No (default: 30) | Profit margin percentage to add to base prices |

## Database

The application uses SQLite for caching geocoded places. The database is created automatically at startup.

```bash
# Default location
./data/places.db

# Custom location
./mygreatcircle -db /path/to/places.db
```

## Running in Production

```bash
# Build the application
make build

# Run with configuration
./mygreatcircle \
  -port 8080 \
  -web ./web/dist \
  -db ./data/places.db
```

For systemd deployment, create `/etc/systemd/system/mygreatcircle.service`:

```ini
[Unit]
Description=MyGreatCircle
After=network.target

[Service]
Type=simple
User=mygreatcircle
WorkingDirectory=/opt/mygreatcircle
ExecStart=/opt/mygreatcircle/mygreatcircle -port 8080 -web /opt/mygreatcircle/web/dist -db /opt/mygreatcircle/data/places.db
Environment=GELATO_API_KEY=your-gelato-api-key
Environment=STRIPE_SECRET_KEY=sk_live_your-key
Environment=STRIPE_PUBLISHABLE_KEY=pk_live_your-key
Environment=STRIPE_WEBHOOK_SECRET=whsec_your-secret
Restart=always

[Install]
WantedBy=multi-user.target
```

---

Made with 💗 by [Kartoza](https://kartoza.com) | [Donate!](https://github.com/sponsors/kartoza) | [GitHub](https://github.com/kartoza/MyGreatCircle)
