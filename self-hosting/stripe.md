# Stripe Setup

Integrate TenantScale with Stripe for subscription billing, invoicing, and payment management. This guide covers everything from getting API keys to testing webhooks.

## Prerequisites

- A [Stripe account](https://stripe.com) (free to create)
- Stripe API keys (test or live mode)
- A deployed TenantScale API (see [Vercel Guide](/self-hosting/vercel) or [Docker](#))
- A Supabase project with plans seeded (see [Supabase Setup](/self-hosting/supabase))

## 1. Get Your Stripe Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers → API Keys**
3. You'll see two key types:

| Key | Prefix | Description | Visibility |
|-----|--------|-------------|------------|
| Publishable key | `pk_live_...` or `pk_test_...` | Public, used in client-side code | Public |
| Secret key | `sk_live_...` or `sk_test_...` | Used for server-side API calls | Secret - never share |

4. Copy the **Secret key** (`sk_live_...` or `sk_test_...`)

> **Important:** Use **test mode** keys (starting with `sk_test_`) for development. Switch to **live mode** keys when you're ready for real payments.

## 2. Set Environment Variables

Add the Stripe environment variables to your deployment:

```bash
# Required for billing functionality
STRIPE_SECRET_KEY=sk_live_abc123def456
STRIPE_WEBHOOK_SECRET=whsec_abc123def456

# Optional
STRIPE_PUBLISHABLE_KEY=pk_live_abc123def456
STRIPE_PRICE_PREFIX=ts
STRIPE_CURRENCY=usd
STRIPE_TRIAL_PERIOD_DAYS=0
```

### With Vercel

```bash
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PUBLISHABLE_KEY  # optional
vercel --prod
```

### With Docker

```bash
docker run -d \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  -e STRIPE_PUBLISHABLE_KEY=pk_live_... \
  tenantscale/api:latest
```

## 3. Sync Plans to Stripe

The `stripe:sync` command creates Stripe products and prices for each plan in your database.

### What the Sync Creates

For each plan (Free, Pro, Enterprise), the sync creates:

| TenantScale Plan | Stripe Product | Stripe Price |
|-----------------|----------------|--------------|
| Free | `Free` (no price needed) | — |
| Pro | `Pro` | Monthly recurring price: $29.00 |
| Enterprise | `Enterprise` | Monthly recurring price: $99.00 |

### Run the Sync

```bash
# Preview (no changes made)
tenantscale stripe:sync --dry-run

# Run for real
tenantscale stripe:sync

# With a specific currency
tenantscale stripe:sync --currency eur

# Force update existing products/prices
tenantscale stripe:sync --force
```

### Sync Output

```
Stripe Sync Complete
────────────────────
  Plans synced:      3
  Products created:  1
  Products updated:  2
  Prices created:    2
  Prices updated:    1
  Duration:          1.2s
```

### What Happens Under the Hood

```typescript
// For each plan in your database, the sync:
for (const plan of plans) {
  // 1. Find or create Stripe product
  const product = await stripe.products.createOrUpdate({
    id: `ts_plan_${plan.id}`,
    name: plan.name,
    description: plan.description,
    metadata: { plan_id: plan.id },
  });

  // 2. If plan has a price > 0, create or update Stripe price
  if (plan.price > 0) {
    const price = await stripe.prices.createOrUpdate({
      product: product.id,
      unit_amount: plan.price,
      currency: plan.currency,
      recurring: { interval: plan.interval },
      metadata: { plan_id: plan.id },
    });

    // 3. Save Stripe IDs back to the plan
    await db.updatePlan(plan.id, {
      stripe_product_id: product.id,
      stripe_price_id: price.id,
    });
  }
}
```

## 4. Manual Stripe Dashboard Setup

If you prefer to set up products manually in the Stripe Dashboard:

### Create Products

1. Go to **Products → Add Product**
2. For each plan:
   - **Name:** Match your TenantScale plan name (e.g., "Pro")
   - **Description:** Brief description
   - **Pricing:** Recurring Monthly
   - **Amount:** Match your plan's price (e.g., $29.00 for Pro)
   - **Metadata:** Add `plan_id` with the plan's database ID

### Connect Plans to Stripe

Manually update the Stripe IDs in your database via the CLI:

```bash
tenantscale stripe:sync --force
```

This will detect the manually-created products and link them to your plans.

## 5. Webhook Endpoint Configuration

Stripe sends events to your TenantScale API to keep subscription status synchronized.

### Add Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL:** `https://your-api.com/v1/stripe/webhook`
   - For Vercel: `https://tenantscale-api.vercel.app/v1/stripe/webhook`
   - For custom domain: `https://api.tenantscale.com/v1/stripe/webhook`
4. **Events to listen for:**

| Event | Purpose |
|-------|---------|
| `customer.subscription.created` | New subscription created |
| `customer.subscription.updated` | Subscription plan changed, status changed |
| `customer.subscription.deleted` | Subscription cancelled |
| `invoice.paid` | Payment successful |
| `invoice.payment_failed` | Payment failed (trigger dunning) |
| `checkout.session.completed` | Checkout completed (ready to provision) |
| `customer.created` | New customer created in Stripe |

5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`)

### Set Webhook Secret

```bash
vercel env add STRIPE_WEBHOOK_SECRET
# Paste: whsec_abc123def456...
vercel --prod
```

### Webhook Security

The webhook endpoint verifies the Stripe signature on every request:

```typescript
import stripe from 'stripe';

app.post('/v1/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    // Event is verified — process it
    handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    // Invalid signature
    res.status(400).json({ error: 'Invalid signature' });
  }
});
```

## 6. Testing

### Test Mode Keys

Use test mode for development:

```bash
# Test mode keys start with sk_test_
STRIPE_SECRET_KEY=sk_test_abc123def456
```

Stripe test mode provides:
- Virtual credit card numbers for testing
- No real money changes hands
- Ability to trigger specific events
- Test webhook endpoints

### Test Credit Card Numbers

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline (generic) |
| `4000 0000 0000 3220` | Decline (insufficient funds) |
| `4000 0000 0000 9995` | Decline (charge_processor_failure) |
| `4000 0025 0000 3155` | Requires 3D Secure |

### Create a Test Checkout Session

```bash
curl -X POST https://your-api.vercel.app/v1/tenants/tnt_abc123/checkout \
  -H "Authorization: Bearer tsk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_pro_monthly",
    "successUrl": "https://app.example.com/success",
    "cancelUrl": "https://app.example.com/pricing"
  }'
```

Response:

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_abc123..."
}
```

Open the URL in your browser, enter `4242 4242 4242 4242` as the card number, and complete the checkout.

### Verify Webhook Delivery

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/stripe/webhooks)
2. Select your endpoint
3. Click **Send test webhook**
4. Choose an event (e.g., `customer.subscription.updated`)
5. Click **Send**
6. Check your API logs to verify it was received

```bash
# Check Vercel logs
vercel logs --prod | grep stripe
```

## 7. Customer Portal Sessions

TenantScale provides a Stripe Customer Portal for tenants to manage their subscription, payment methods, and invoices.

### Create a Portal Session

```bash
curl -X POST https://your-api.vercel.app/v1/tenants/tnt_abc123/portal \
  -H "Authorization: Bearer tsk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "returnUrl": "https://app.example.com/settings/billing"
  }'
```

Response:

```json
{
  "url": "https://billing.stripe.com/p/session/test_abc123..."
}
```

The portal allows tenants to:
- View and change their subscription plan
- Update payment methods
- View invoices and payment history
- Download receipts
- Cancel subscription (configurable)

### Configure Portal Settings

1. Go to [Stripe Dashboard → Settings → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Configure:
   - **Allowed payment methods** (card, SEPA, etc.)
   - **Subscription management** (allow plan changes, cancellations)
   - **Invoice history** (show past invoices)
   - **Branding** (colors, logo, business name)

## 8. Production Go-Live Checklist

Before going live with Stripe:

- [ ] Switch from test mode to **live mode keys**
- [ ] Run `tenantscale stripe:sync` in live mode
- [ ] Verify webhook endpoint URL points to your live API
- [ ] Update `STRIPE_WEBHOOK_SECRET` with the live signing secret
- [ ] Test a live checkout with a small amount ($1)
- [ ] Verify webhook delivery in Stripe Dashboard
- [ ] Configure Customer Portal settings
- [ ] Set up email receipts (Stripe sends by default)
- [ ] Review tax settings (enable Stripe Tax if needed)
- [ ] Test failure scenarios (declined card, payment retry)
- [ ] Monitor webhook delivery success rate

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
