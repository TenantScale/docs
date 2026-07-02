# Billing with Stripe

TenantScale integrates with Stripe to handle subscriptions, invoices, and billing management — all synchronized with your tenant and plan data.

## How Billing Works

TenantScale acts as a bridge between your Supabase data and Stripe's subscription system. When a tenant subscribes to a plan, TenantScale:

1. Creates a Stripe Checkout Session linked to the tenant
2. Syncs the subscription status back to your database
3. Fires webhooks for billing events (invoice paid, payment failed)
4. Handles upgrades, downgrades, and cancellations seamlessly

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Your App   │         │ TenantScale  │         │   Stripe    │
│             │         │              │         │             │
│  "Upgrade"  │────────▶│  Create      │────────▶│  Checkout   │
│  button     │         │  Checkout    │         │  Session    │
│             │         │  Session     │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                               │                        │
                               │                        │
                               ▼                        ▼
                        ┌──────────────┐         ┌─────────────┐
                        │  Supabase    │◀────────│  Webhook    │
                        │              │         │  Handler    │
                        │  tenants     │         │             │
                        │  plans       │         │  checkout.  │
                        │ subscripti-  │         │  session.   │
                        │  ons         │         │  completed  │
                        └──────────────┘         └─────────────┘
```

## Prerequisites

Before integrating billing, make sure you have:

1. **Stripe account** — [Sign up](https://stripe.com) (free to start)
2. **Stripe API keys** — Publishable key (pk_...) and Secret key (sk_...)
3. **Products and Prices** — Created in Stripe Dashboard
4. **Plans in TenantScale** — Linked to Stripe price IDs (see [Plan Enforcement →](/guide/plan-enforcement))

### Linking Plans to Stripe Prices

Each plan in TenantScale must have a corresponding Stripe price:

```typescript
// Plan definition with Stripe price linkage
const plan = await ts.admin.createPlan({
  id: 'plan_pro',
  name: 'Pro',
  features: { webhooks: true, audit_logs: true, sso: true },
  limits: { max_api_keys: 25, daily_requests: 10000, storage_gb: 50 },
  // The Stripe Price ID for this plan
  stripe_price_id: 'price_1Qa2b3c4d5e6f7g',
  // Optional: Stripe Product ID
  stripe_product_id: 'prod_AbCdEf123456',
})
```

### Setup Script Reference

Use this initialization script to set up the billing infrastructure:

```typescript
// scripts/setup-billing.ts
import { TenantScale } from '@tenantscale/sdk'
import Stripe from 'stripe'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
})

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

async function setupBilling() {
  // 1. Create Stripe products and prices
  const products = [
    {
      name: 'Free',
      price: 0,
      currency: 'usd',
      interval: 'month' as const,
      limits: { daily_requests: 100, max_api_keys: 2 },
    },
    {
      name: 'Hobby',
      price: 2900, // $29/month
      currency: 'usd',
      interval: 'month' as const,
      limits: { daily_requests: 1000, max_api_keys: 5 },
    },
    {
      name: 'Pro',
      price: 9900, // $99/month
      currency: 'usd',
      interval: 'month' as const,
      limits: { daily_requests: 10000, max_api_keys: 25 },
    },
    {
      name: 'Pro Annual',
      price: 99900, // $999/year
      currency: 'usd',
      interval: 'year' as const,
      limits: { daily_requests: 10000, max_api_keys: 25 },
    },
  ]

  for (const product of products) {
    // Create Stripe product
    const stripeProduct = await stripe.products.create({
      name: product.name,
      metadata: {
        plan_id: `plan_${product.name.toLowerCase().replace(' ', '_')}`,
      },
    })

    // Create Stripe price
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price,
      currency: product.currency,
      recurring: { interval: product.interval },
      metadata: {
        plan_id: `plan_${product.name.toLowerCase().replace(' ', '_')}`,
      },
    })

    // Create TenantScale plan
    await ts.admin.createPlan({
      id: `plan_${product.name.toLowerCase().replace(' ', '_')}`,
      name: product.name,
      features: {
        webhooks: product.price >= 2900,
        audit_logs: product.price >= 2900,
        sso: product.price >= 9900,
        analytics: product.price >= 2900,
      },
      limits: product.limits,
      stripe_price_id: stripePrice.id,
      stripe_product_id: stripeProduct.id,
    })

    console.log(`Created plan: ${product.name} (${stripePrice.id})`)
  }

  // 2. Set up the Stripe webhook endpoint
  const webhookEndpoint = await stripe.webhookEndpoints.create({
    url: `${process.env.API_URL}/api/webhooks/stripe`,
    enabled_events: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ],
    description: 'TenantScale billing webhook',
  })

  console.log(`Webhook endpoint created: ${webhookEndpoint.id}`)
  console.log(`Webhook secret: ${webhookEndpoint.secret}`)
  console.log('Add STRIPE_WEBHOOK_SECRET to your environment variables!')
}

setupBilling().catch(console.error)
```

## Checkout Session Creation

When a tenant wants to subscribe or upgrade, create a Stripe Checkout Session:

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Create a checkout session for a tenant
app.post(
  '/api/billing/create-checkout',
  ts.authenticateApiKey(),
  async (req, res) => {
    const tenant = req.tenant
    const { priceId, successUrl, cancelUrl } = req.body

    // Look up the plan by Stripe price ID
    const plan = await ts.admin.getPlanByStripePrice(priceId)
    if (!plan) {
      return res.status(400).json({
        error: 'Invalid price ID',
      })
    }

    // Create or retrieve the Stripe customer for this tenant
    let stripeCustomerId = tenant.stripe_customer_id
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        metadata: { tenant_id: tenant.id },
      })
      stripeCustomerId = customer.id
      // Save the Stripe customer ID on the tenant
      await ts.admin.updateTenant(tenant.id, {
        stripe_customer_id: stripeCustomerId,
      })
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL}/billing/success`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/billing/cancel`,
      client_reference_id: tenant.id,
      metadata: {
        tenant_id: tenant.id,
        plan_id: plan.id,
        plan_name: plan.name,
      },
      subscription_data: {
        metadata: {
          tenant_id: tenant.id,
          plan_id: plan.id,
        },
        // Handle proration when switching plans
        proration_behavior: 'create_prorations',
      },
    })

    res.json({
      url: session.url,
      sessionId: session.id,
    })
  }
)
```

### Checkout Options

| Option | Description | Default |
|--------|-------------|---------|
| `mode` | `subscription` (recurring) or `payment` (one-time) | `subscription` |
| `proration_behavior` | How to handle mid-cycle plan changes | `create_prorations` |
| `allow_promotion_codes` | Enable promo code field | `false` |
| `tax_id_collection` | Collect tax IDs | `false` |
| `automatic_tax` | Enable automatic tax calculation | `false` |
| `payment_method_types` | Allowed payment methods | `['card']` |

### Handling the Frontend

In your frontend, redirect the user to the checkout URL:

```typescript
// React example
import { useState } from 'react'

function UpgradeButton({ priceId }: { priceId: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: window.location.href,
      }),
    })

    const { url } = await res.json()
    // Redirect to Stripe Checkout
    window.location.href = url
  }

  return (
    <button onClick={handleUpgrade} disabled={loading}>
      {loading ? 'Redirecting to Stripe...' : 'Upgrade'}
    </button>
  )
}
```

## Subscription Management

### Getting the Current Subscription

```typescript
// Get the current subscription for the authenticated tenant
const subscription = await ts.subscriptions.getCurrent({
  tenantId: req.tenant.id,
})

// Returns:
interface Subscription {
  id: string
  tenant_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan_id: string
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
  current_period_start: string
  current_period_end: string
  canceled_at: string | null
  trial_end: string | null
  metadata: Record<string, string>
  created_at: string
  updated_at: string
}
```

### Updating a Subscription

```typescript
// Change to a different plan
app.post(
  '/api/billing/change-plan',
  ts.authenticateApiKey(),
  async (req, res) => {
    const tenant = req.tenant
    const { newPriceId } = req.body

    const subscription = await ts.subscriptions.getCurrent({
      tenantId: tenant.id,
    })

    // Update the Stripe subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: subscription.stripe_item_id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          previous_plan_id: subscription.plan_id,
        },
      }
    )

    res.json({
      status: 'updated',
      subscription: updatedSubscription.id,
      plan: updatedSubscription.items.data[0].price.metadata.plan_id,
    })
  }
)
```

### Canceling a Subscription

```typescript
// Cancel at period end (recommended)
app.post(
  '/api/billing/cancel',
  ts.authenticateApiKey(),
  async (req, res) => {
    const tenant = req.tenant
    const subscription = await ts.subscriptions.getCurrent({
      tenantId: tenant.id,
    })

    // Cancel at period end — tenant keeps access until billing period ends
    await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
        metadata: {
          cancel_requested_at: new Date().toISOString(),
        },
      }
    )

    // Update local subscription status
    await ts.db
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('id', subscription.id)

    res.json({
      status: 'cancel_scheduled',
      message: 'Subscription will be canceled at the end of the billing period.',
      current_period_end: subscription.current_period_end,
    })
  }
)
```

### Reactivating a Subscription

```typescript
// Reactivate before the period ends
app.post(
  '/api/billing/reactivate',
  ts.authenticateApiKey(),
  async (req, res) => {
    const tenant = req.tenant
    const subscription = await ts.subscriptions.getCurrent({
      tenantId: tenant.id,
    })

    if (!subscription.cancel_at_period_end) {
      return res.status(400).json({
        error: 'Subscription is not scheduled for cancellation',
      })
    }

    // Remove the cancel_at_period_end flag
    await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: false,
        metadata: {
          reactivated_at: new Date().toISOString(),
        },
      }
    )

    await ts.db
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('id', subscription.id)

    res.json({
      status: 'reactivated',
      message: 'Subscription has been reactivated.',
    })
  }
)
```

## Stripe Webhook Handler

The Stripe webhook handler keeps your database in sync with Stripe. TenantScale handles the most common events out of the box.

### Setting Up the Webhook Endpoint

```typescript
import { stripeWebhookHandler } from '@tenantscale/sdk/stripe'

// Single handler for all Stripe events
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler({
    ts,
    stripe,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    // Optional: custom handlers for specific events
    onEvent: {
      'checkout.session.completed': async (event, { ts, stripe }) => {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata!.tenant_id
        const planId = session.metadata!.plan_id

        // Activate the plan
        await ts.admin.updateTenantPlan({
          tenantId,
          planId,
          reason: 'checkout_completed',
        })

        // Log the event
        await ts.audit.logEvent({
          tenantId,
          eventType: 'subscription.created',
          description: `Subscribed to ${session.metadata!.plan_name}`,
          newValues: {
            subscription_id: session.subscription,
            customer_id: session.customer,
            plan_id: planId,
          },
        })
      },

      'invoice.paid': async (event, { ts }) => {
        const invoice = event.data.object as Stripe.Invoice
        const tenantId = invoice.metadata?.tenant_id
          ?? invoice.subscription_details?.metadata?.tenant_id

        if (!tenantId) return

        // Ensure subscription is marked as active
        if (invoice.subscription) {
          await ts.db
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', invoice.subscription)
        }

        await ts.audit.logEvent({
          tenantId,
          eventType: 'invoice.paid',
          description: `Invoice ${invoice.id} paid — $${(invoice.amount_paid / 100).toFixed(2)}`,
          newValues: {
            invoice_id: invoice.id,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency,
          },
        })
      },

      'invoice.payment_failed': async (event, { ts }) => {
        const invoice = event.data.object as Stripe.Invoice
        const tenantId = invoice.metadata?.tenant_id
          ?? invoice.subscription_details?.metadata?.tenant_id

        if (!tenantId) return

        // Mark subscription as past_due
        if (invoice.subscription) {
          await ts.db
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription)
        }

        await ts.audit.logEvent({
          tenantId,
          eventType: 'billing.payment_failed',
          description: `Payment failed for invoice ${invoice.id}`,
          newValues: {
            invoice_id: invoice.id,
            amount_due: invoice.amount_due,
            attempt_count: invoice.attempt_count,
            next_attempt: invoice.next_payment_attempt,
          },
        })
      },

      'customer.subscription.updated': async (event, { ts }) => {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata.tenant_id

        if (!tenantId) return

        // Sync subscription status
        const dbSubscription = {
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }

        await ts.db
          .from('subscriptions')
          .update(dbSubscription)
          .eq('stripe_subscription_id', subscription.id)

        // Handle plan changes from Stripe
        const priceId = subscription.items.data[0]?.price?.id
        if (priceId) {
          const plan = await ts.admin.getPlanByStripePrice(priceId)
          if (plan && plan.id !== subscription.metadata.plan_id) {
            await ts.admin.updateTenantPlan({
              tenantId,
              planId: plan.id,
              reason: 'stripe_subscription_updated',
            })
          }
        }
      },

      'customer.subscription.deleted': async (event, { ts }) => {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata.tenant_id

        if (!tenantId) return

        // Downgrade to Free plan
        await ts.admin.updateTenantPlan({
          tenantId,
          planId: 'plan_free',
          reason: 'subscription_canceled',
        })

        await ts.db
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)

        await ts.audit.logEvent({
          tenantId,
          eventType: 'subscription.canceled',
          description: 'Subscription canceled, downgraded to Free plan',
        })
      },
    },
  })
)
```

### Supported Stripe Events

| Stripe Event | Handler Action |
|-------------|----------------|
| `checkout.session.completed` | Activate plan for tenant |
| `customer.subscription.created` | Create subscription record |
| `customer.subscription.updated` | Sync status, handle plan changes |
| `customer.subscription.deleted` | Downgrade to Free plan |
| `invoice.paid` | Mark subscription as active |
| `invoice.payment_failed` | Mark subscription as past_due |

## Proration

When a tenant upgrades or downgrades mid-cycle, Stripe automatically handles proration. TenantScale just reflects the result.

### How Proration Works

1. Tenant changes from Plan A ($29/month) to Plan B ($99/month) on day 15
2. Stripe calculates credit for unused time on Plan A: ~$14.50
3. Stripe charges for remaining time on Plan B: ~$49.50
4. Tenant is charged the difference: ~$35.00
5. TenantScale updates the tenant's plan immediately
6. The plan change and invoice are logged to audit

### Proration Configuration

```typescript
// During checkout (upgrade)
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_pro_789', quantity: 1 }],
  subscription_data: {
    proration_behavior: 'create_prorations',
    // Optional: credit notes for negative proration
    proration_behavior: 'always_invoice',
  },
})

// During subscription update (downgrade)
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, price: 'price_hobby_456' }],
  proration_behavior: 'create_prorations',
  // For downgrades, create a credit note instead of refunding
  proration_behavior: 'always_invoice',
})
```

## Customer Portal Sessions

Stripe's Customer Portal lets tenants manage their own billing — update payment methods, view invoices, and change plans.

### Creating a Portal Session

```typescript
app.post(
  '/api/billing/portal',
  ts.authenticateApiKey(),
  async (req, res) => {
    const tenant = req.tenant

    // Ensure tenant has a Stripe customer ID
    if (!tenant.stripe_customer_id) {
      return res.status(400).json({
        error: 'No billing account found. Please subscribe first.',
      })
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.APP_URL}/billing`,
      configuration: {
        // Configure what features are available in the portal
        features: {
          cancel_subscriptions: {
            enabled: true,
            mode: 'at_period_end', // 'at_period_end' or 'immediately'
          },
          subscription_pause: {
            enabled: true,
          },
          payment_method_update: {
            enabled: true,
          },
          invoice_history: {
            enabled: true,
          },
          customer_update: {
            enabled: true,
            allowed_updates: ['address', 'tax_id'],
          },
        },
      },
    })

    res.json({
      url: session.url,
    })
  }
)
```

### Portal Configuration Options

```typescript
interface PortalConfiguration {
  features: {
    cancel_subscriptions?: {
      enabled: boolean
      mode: 'at_period_end' | 'immediately'
    }
    subscription_pause?: {
      enabled: boolean
    }
    payment_method_update?: {
      enabled: boolean
    }
    invoice_history?: {
      enabled: boolean
    }
    customer_update?: {
      enabled: boolean
      allowed_updates: ('name' | 'email' | 'address' | 'tax_id')[]
    }
  }
}
```

## Full Billing API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/billing/create-checkout` | Create Stripe Checkout Session |
| `POST` | `/api/billing/portal` | Create Customer Portal Session |
| `POST` | `/api/billing/change-plan` | Change subscription plan |
| `POST` | `/api/billing/cancel` | Cancel subscription |
| `POST` | `/api/billing/reactivate` | Reactivate canceled subscription |
| `GET` | `/api/billing/subscription` | Get current subscription |
| `GET` | `/api/billing/invoices` | List recent invoices |
| `POST` | `/api/webhooks/stripe` | Stripe webhook receiver |

## Testing Billing

### Using Stripe Test Mode

```typescript
import { createBillingTest } from '@tenantscale/sdk/testing'

describe('billing', () => {
  const test = createBillingTest({
    ts,
    stripe,
    // Use test price IDs
    prices: {
      free: 'price_1TestFree',
      hobby: 'price_1TestHobby',
      pro: 'price_1TestPro',
    },
  })

  it('creates a checkout session', async () => {
    const session = await test.createCheckout({
      tenantId: test.tenant.id,
      priceId: test.prices.pro,
    })

    expect(session.url).toContain('stripe.com')
    expect(session.mode).toBe('subscription')
  })

  it('handles successful checkout', async () => {
    // Simulate a successful Stripe checkout
    const result = await test.simulateCheckoutComplete({
      tenantId: test.tenant.id,
      priceId: test.prices.pro,
    })

    expect(result.subscription.status).toBe('active')
    expect(result.tenant.plan_id).toBe('plan_pro')
  })

  it('handles subscription cancellation', async () => {
    // Simulate cancellation
    const result = await test.simulateSubscriptionDeleted({
      tenantId: test.tenant.id,
    })

    expect(result.tenant.plan_id).toBe('plan_free')
  })

  it('handles failed payment', async () => {
    const result = await test.simulatePaymentFailed({
      tenantId: test.tenant.id,
    })

    expect(result.subscription.status).toBe('past_due')
  })

  it('creates a portal session', async () => {
    const session = await test.createPortalSession({
      tenantId: test.tenant.id,
    })

    expect(session.url).toContain('stripe.com')
  })
})
```

## Related Resources

- [Source: Stripe Webhook Handler](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/stripe/webhook-handler.ts)
- [Source: Subscription Management](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/subscriptions/manager.ts)
- [Source: Billing Routes (API)](https://github.com/TenantScale/api/blob/main/src/routes/subscriptions.ts)
- [Source: Billing Test Utilities](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/testing/billing.ts)
- [Source: Database Migrations (Subscriptions)](https://github.com/TenantScale/api/blob/main/supabase/migrations/003_subscriptions.sql)
- [Plan Enforcement →](/guide/plan-enforcement)
- [Webhooks →](/guide/webhooks)
- [Self-Hosting: Stripe Setup →](/self-hosting/stripe)
