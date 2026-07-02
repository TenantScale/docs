# Plan Enforcement

Plans define what each tenant can do in your system. TenantScale provides a powerful plan engine that enforces both **feature flags** (boolean gates) and **limits** (numeric caps) at the middleware level.

## How Plans Work

Plans are stored in a Supabase `plans` table and cached in the SDK for fast access. Each tenant has a `plan_id` that links to their current plan.

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Tenant  │────▶│   Plan   │────▶│  Supabase    │
│          │     │          │     │  (plans      │
│ plan_id  │     │ features │     │   table)     │
│ = 'pro'  │     │ limits   │     │              │
│          │     │ price_id │     │  + SDK cache │
└──────────┘     └──────────┘     └──────────────┘
                       │
              ┌────────┴────────┐
              │                 │
         Feature Flags     Limits (numeric)
              │                 │
        requirePlanFeature  requirePlanLimit
```

## Plan Definition Format

Plans are defined in the `plans` table. Each plan has a unique ID, a human-readable name, a set of feature flags, a set of numeric limits, and an optional Stripe price ID for subscription billing.

```typescript
// The Plan interface as used by the SDK
interface Plan {
  id: string
  name: string
  description: string | null
  features: Record<string, boolean>
  limits: Record<string, number>
  stripe_price_id: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
```

### Example Plan Definitions

Here are typical plans for a B2B SaaS product:

| Plan | `features.webhooks` | `features.audit_logs` | `features.sso` | `limits.max_api_keys` | `limits.daily_requests` | `limits.storage_gb` | Stripe Price ID |
|------|---------------------|-----------------------|----------------|----------------------|------------------------|--------------------|-----------------|
| **Free** | `false` | `false` | `false` | 2 | 100 | 0.5 | `price_free_123` |
| **Hobby** | `true` | `true` | `false` | 5 | 1,000 | 5 | `price_hobby_456` |
| **Pro** | `true` | `true` | `true` | 25 | 10,000 | 50 | `price_pro_789` |
| **Enterprise** | `true` | `true` | `true` | 100 | 100,000 | 500 | — (custom) |

### Seeding Plans via Migration

You can seed plans directly in a Supabase migration:

```sql
-- supabase/migrations/20240101000002_seed_plans.sql
INSERT INTO plans (id, name, description, features, limits, stripe_price_id, sort_order)
VALUES
  (
    'plan_free',
    'Free',
    'For individuals and small projects',
    '{"webhooks": false, "audit_logs": false, "sso": false, "analytics": false}',
    '{"max_api_keys": 2, "daily_requests": 100, "storage_gb": 0.5}',
    'price_1Qa2b3c4d5e6f7g',
    1
  ),
  (
    'plan_hobby',
    'Hobby',
    'For growing teams',
    '{"webhooks": true, "audit_logs": true, "sso": false, "analytics": true}',
    '{"max_api_keys": 5, "daily_requests": 1000, "storage_gb": 5}',
    'price_2Rb3c4d5e6f7g8h',
    2
  ),
  (
    'plan_pro',
    'Pro',
    'For serious businesses',
    '{"webhooks": true, "audit_logs": true, "sso": true, "analytics": true}',
    '{"max_api_keys": 25, "daily_requests": 10000, "storage_gb": 50}',
    'price_3Sc4d5e6f7g8h9i',
    3
  )
ON CONFLICT (id) DO NOTHING;
```

Or programmatically using the SDK:

```typescript
// Using the TenantScale SDK
await ts.admin.createPlan({
  id: 'plan_pro',
  name: 'Pro',
  description: 'For serious businesses',
  features: {
    webhooks: true,
    audit_logs: true,
    sso: true,
    analytics: true,
  },
  limits: {
    max_api_keys: 25,
    daily_requests: 10000,
    storage_gb: 50,
  },
  stripe_price_id: 'price_3Sc4d5e6f7g8h9i',
  sort_order: 3,
})
```

## Feature Flag Enforcement

Use `requirePlanFeature()` middleware to check if a tenant's plan has a specific feature enabled:

```typescript
import { requirePlanFeature } from '@tenantscale/sdk'

// Protect a route — only tenants with the 'webhooks' feature can access it
app.post(
  '/api/webhooks',
  ts.authenticateApiKey(),
  requirePlanFeature({ ts, feature: 'webhooks' }),
  async (req, res) => {
    // Handler only runs if the tenant's plan has webhooks: true
    const webhook = await ts.db.from('webhooks').insert(req.body)
    res.status(201).json(webhook)
  }
)
```

**How it works:**

1. The middleware reads the plan from the request context (set by `authenticateApiKey`)
2. It checks `plan.features[featureName]`
3. If `false` or `undefined`, it returns a `403 Forbidden` with a clear error message
4. If `true`, the request proceeds to the handler

**Error response when feature is denied:**

```json
{
  "error": {
    "code": "FEATURE_NOT_ALLOWED",
    "message": "Your plan (Free) does not include the 'webhooks' feature. Upgrade to Hobby or Pro to access this feature.",
    "plan": "plan_free",
    "feature": "webhooks",
    "upgrade_url": "https://your-app.com/billing/upgrade"
  }
}
```

**Combining multiple features:**

```typescript
// Require ALL specified features
app.post(
  '/api/analytics/export',
  ts.authenticateApiKey(),
  requirePlanFeature({ ts, feature: 'analytics' }),
  requirePlanFeature({ ts, feature: 'webhooks' }),
  handler
)
```

## Numeric Limit Enforcement

Use `requirePlanLimit()` to check numeric caps before allowing an operation:

```typescript
import { requirePlanLimit } from '@tenantscale/sdk'

// Protect API key creation — enforce max_api_keys limit
app.post(
  '/api/api-keys',
  ts.authenticateApiKey(),
  requirePlanLimit({
    ts,
    limit: 'max_api_keys',
    getCurrentUsage: async (req) => {
      // Count how many active keys this tenant already has
      const { count } = await ts.db
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .is('revoked_at', null)
      return count
    },
  }),
  async (req, res) => {
    const key = await ts.createApiKey({ name: req.body.name })
    res.status(201).json(key)
  }
)
```

**How limit enforcement works:**

1. The middleware reads the plan's limit value (e.g., `max_api_keys: 5`)
2. It calls `getCurrentUsage(req)` to get the current count
3. If `currentUsage >= plan.limits[limitName]`, it returns a `403 Forbidden`
4. Otherwise, the request proceeds

**Error response when limit is exceeded:**

```json
{
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "You have reached the maximum number of API keys (5) for your plan (Hobby). Delete existing keys or upgrade to Pro for more.",
    "plan": "plan_hobby",
    "limit": "max_api_keys",
    "current": 5,
    "max": 5,
    "upgrade_url": "https://your-app.com/billing/upgrade"
  }
}
```

## Plan Store Resolution with Caching

The SDK caches plan definitions to avoid a database query on every request:

```typescript
// Internal plan resolution (from @tenantscale/sdk/src/plans/resolver.ts)
async function resolvePlan(tenantId: string): Promise<Plan> {
  const cacheKey = `plan:${tenantId}`

  // 1. Check cache
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  // 2. Fetch from database
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan:plans(*)')
    .eq('id', tenantId)
    .single()

  if (!tenant?.plan) {
    throw new TenantScaleError({
      code: 'PLAN_NOT_FOUND',
      message: `No plan found for tenant ${tenantId}`,
    })
  }

  // 3. Cache for next time (default TTL: 5 minutes)
  await cache.set(cacheKey, tenant.plan, { ttlMs: 300_000 })

  return tenant.plan
}
```

**Cache behavior:**

| Aspect | Default | Configurable |
|--------|---------|-------------|
| Cache backend | In-memory LRU | Redis, Memcached, custom |
| TTL | 5 minutes | `cache.defaultTtlMs` in SDK config |
| Max entries | 1000 | `cache.maxSize` in SDK config |
| Invalidation | On plan change via API | Manual via `ts.cache.invalidate()` |

**Manual cache invalidation:**

```typescript
// After updating a plan, invalidate the cache for affected tenants
await ts.cache.invalidatePattern(`plan:${tenantId}`)

// Or invalidate all plan caches
await ts.cache.invalidatePattern('plan:*')
```

## Full Guard Stack

For a truly protected endpoint, stack all the guards:

```typescript
import {
  authenticateApiKey,
  requireScope,
  requirePlanFeature,
  requirePlanLimit,
  rateLimit,
  auditLog,
} from '@tenantscale/sdk'

app.post(
  '/api/webhooks',

  // 1. Authenticate and resolve tenant
  authenticateApiKey({ ts }),

  // 2. Check scope
  requireScope({ ts, scope: 'webhooks:write' }),

  // 3. Check feature flag
  requirePlanFeature({ ts, feature: 'webhooks' }),

  // 4. Check numeric limit (max 3 webhook endpoints)
  requirePlanLimit({
    ts,
    limit: 'max_webhooks',
    getCurrentUsage: async (req) => {
      const { count } = await ts.db
        .from('webhooks')
        .select('*', { count: 'exact', head: true })
      return count
    },
  }),

  // 5. Rate limit
  rateLimit({ ts, window: '1d', maxRequests: 100 }),

  // 6. Audit log
  auditLog({ ts, action: 'webhook.created' }),

  // 7. Handler
  async (req, res) => {
    const webhook = await ts.db.from('webhooks').insert({
      url: req.body.url,
      events: req.body.events,
    })
    res.status(201).json(webhook)
  }
)
```

The guard order matters — always authenticate first, then scope, then plan, then rate limit.

## Upgrade / Downgrade via Stripe

Plan changes are triggered by Stripe subscription events. When a customer upgrades or downgrades through Stripe, the TenantScale webhook handler updates the tenant's plan automatically.

### Upgrade Flow

```
Customer clicks "Upgrade" in Stripe Checkout
                    │
                    ▼
Stripe Checkout Session created with new price_id
                    │
                    ▼
Customer completes payment
                    │
                    ▼
Stripe sends checkout.session.completed webhook
                    │
                    ▼
TenantScale webhook handler:
  1. Look up tenant by client_reference_id
  2. Update tenant.plan_id to match new price
  3. Log audit event: plan.changed
  4. Fire webhooks to tenant's endpoints
  5. Update rate limit counters
```

### Handling Plan Changes in the SDK

```typescript
// When you detect a plan change (from webhook or API)
await ts.admin.updateTenantPlan({
  tenantId: 'tenant-abc-123',
  planId: 'plan_pro',
  reason: 'upgraded_via_stripe',
})

// This automatically:
// 1. Updates tenant.plan_id in the database
// 2. Invalidates the plan cache for that tenant
// 3. Logs an audit event
// 4. Fires tenant webhooks (if enabled)
// 5. Resets rate limit counters if daily_requests changed
```

### Proration

TenantScale doesn't handle proration directly — Stripe handles it. When a subscription is upgraded mid-cycle, Stripe automatically credits the remaining time on the old plan and charges for the new plan. TenantScale just reflects the plan change in your database.

```typescript
// Stripe handles proration during checkout
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_pro_789', quantity: 1 }],
  subscription_data: {
    proration_behavior: 'create_prorations',
  },
  client_reference_id: tenantId,
  // ... other options
})
```

### Downgrade / Cancellation

When a subscription is canceled or downgraded:

```typescript
// Stripe sends customer.subscription.updated with status: 'past_due' | 'canceled'
// TenantScale webhook handler:

async function handleSubscriptionUpdate(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const tenantId = subscription.metadata.tenant_id

  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    // Downgrade to Free plan
    await ts.admin.updateTenantPlan({
      tenantId,
      planId: 'plan_free',
      reason: `subscription_${subscription.status}`,
    })

    // Revoke access to Pro features
    await ts.cache.invalidatePattern(`plan:${tenantId}`)
  }
}
```

## Feature-Aware Middleware Pattern

For more complex scenarios, you can create custom guard middleware that combines multiple checks:

```typescript
function requireWebhookAccess({ ts }: { ts: TenantScale }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { plan } = req

    // Check feature flag
    if (!plan.features.webhooks) {
      return res.status(403).json({
        code: 'FEATURE_NOT_ALLOWED',
        message: 'Webhooks require the Hobby plan or above.',
        upgrade_url: '/billing',
      })
    }

    // Check numeric limit
    const { count } = await ts.db
      .from('webhooks')
      .select('*', { count: 'exact', head: true })

    const maxWebhooks = plan.limits.max_webhooks ?? 3
    if (count >= maxWebhooks) {
      return res.status(403).json({
        code: 'LIMIT_EXCEEDED',
        message: `You've reached the maximum of ${maxWebhooks} webhooks.`,
      })
    }

    next()
  }
}
```

## Testing Plan Enforcement

TenantScale includes test utilities for plan enforcement:

```typescript
import { createPlanTest } from '@tenantscale/sdk/testing'

describe('plan enforcement', () => {
  const test = createPlanTest({ ts })

  it('allows feature for paying plan', async () => {
    await test.asTenant({ plan: 'plan_pro' }, async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${test.apiKey}`)
        .send({ url: 'https://example.com/hook' })

      expect(res.status).toBe(201)
    })
  })

  it('blocks feature for free plan', async () => {
    await test.asTenant({ plan: 'plan_free' }, async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${test.apiKey}`)
        .send({ url: 'https://example.com/hook' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FEATURE_NOT_ALLOWED')
    })
  })

  it('enforces numeric limits', async () => {
    await test.asTenant({ plan: 'plan_hobby' }, async () => {
      // Create max allowed API keys
      for (let i = 0; i < 5; i++) {
        await ts.createApiKey({ name: `Key ${i}` })
      }

      // Next creation should fail
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${test.apiKey}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('LIMIT_EXCEEDED')
    })
  })

  it('caches plan data between requests', async () => {
    // First request populates cache
    await test.asTenant({ plan: 'plan_pro' }, async () => {
      await request(app).get('/api/orders')
        .set('Authorization', `Bearer ${test.apiKey}`)
    })

    // Database call count should be 0 for second request
    const dbCalls = test.getDatabaseCallCount()
    await test.asTenant({ plan: 'plan_pro' }, async () => {
      await request(app).get('/api/orders')
        .set('Authorization', `Bearer ${test.apiKey}`)
    })

    expect(test.getDatabaseCallCount() - dbCalls).toBe(0)
  })
})
```

## Plan Management API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/plans` | List all active plans |
| `GET` | `/v1/plans/:id` | Get a specific plan |
| `POST` | `/v1/plans` | Create a new plan (admin only) |
| `PATCH` | `/v1/plans/:id` | Update a plan (admin only) |
| `DELETE` | `/v1/plans/:id` | Deactivate a plan (admin only) |

## Related Resources

- [Source: Plan Resolver](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/plans/resolver.ts)
- [Source: Feature Flag Middleware](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/middleware/require-plan-feature.ts)
- [Source: Limit Middleware](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/middleware/require-plan-limit.ts)
- [Source: Plan Test Utilities](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/testing/plan.ts)
- [Tenant Isolation →](/guide/tenant-isolation)
- [Billing →](/guide/billing)
- [SDK Plans Reference →](/sdk/plans)
