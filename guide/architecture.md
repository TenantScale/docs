# Architecture

TenantScale is designed as a modular, layered system that sits between your application and your data store. This page explains the system architecture, the major components, and how data flows through the stack.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Your Application                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     TenantScale SDK Middleware                    │    │
│  │  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────────┐  │    │
│  │  │  Auth &   │ │   Plan    │ │   Rate   │ │   Audit Log     │  │    │
│  │  │ Key Scope │ │Enforcement│ │Limiting  │ │   (Async)       │  │    │
│  │  └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └────────┬────────┘  │    │
│  │        │             │            │                 │            │    │
│  │  ┌─────┴─────────────┴────────────┴─────────────────┴──────┐    │    │
│  │  │              Tenant Resolution Layer                     │    │    │
│  │  │   (API Key → Tenant ID → Auto-Scoped Queries)           │    │    │
│  │  └───────────────────────────┬──────────────────────────────┘    │    │
│  └──────────────────────────────┼──────────────────────────────────┘    │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│     Supabase     │   │  Management API  │   │     Stripe       │
│  (PostgreSQL +   │   │  (Optional)      │   │  (Billing)       │
│   RLS + Auth)    │   │                  │   │                  │
│                  │   │ • Tenant CRUD    │   │ • Subscriptions  │
│ • tenants        │   │ • API Key mgmt  │   │ • Invoices       │
│ • api_keys       │   │ • Webhook admin │   │ • Checkout       │
│ • plans          │   │ • Portal auth   │   │ • Portal         │
│ • audit_logs     │   │ • Analytics     │   │                  │
│ • webhooks       │   └──────────────────┘   └──────────────────┘
│ • subscriptions  │
└──────────────────┘
```

## Component Breakdown

### SDK Middleware Modules

| Module | Responsibility | Key Types |
|--------|---------------|-----------|
| **Auth & Key Resolution** | Validates API keys from `Authorization` headers, resolves scopes, extracts tenant identity | `ApiKey`, `KeyScope`, `AuthContext` |
| **Tenant Resolution** | Determines the active tenant from the authenticated key and binds it to the request context | `Tenant`, `TenantContext` |
| **Plan Enforcement** | Checks feature flags and numeric limits before allowing access to protected resources | `Plan`, `FeatureFlag`, `LimitCheck` |
| **Rate Limiting** | Enforces daily request caps, IP-based throttling, and plan-based overrides | `RateLimitConfig`, `RateLimitState` |
| **Audit Logging** | Emits structured audit events asynchronously into the `audit_logs` table | `AuditEvent`, `AuditLogEntry` |
| **Webhooks** | Delivers tenant-scoped events to registered endpoints with retry logic | `WebhookEvent`, `DeliveryAttempt` |
| **Billing Sync** | Keeps tenant subscriptions in sync with Stripe's subscription state | `Subscription`, `StripeSync` |

### Management API (Optional)

The Management API adds a RESTful control plane for administrators and tenant self-service:

| Endpoint Group | Purpose | Source |
|---------------|---------|--------|
| `/v1/tenants` | Create, read, update, delete tenants | [GitHub](https://github.com/TenantScale/api/blob/main/src/routes/tenants.ts) |
| `/v1/api-keys` | Generate, list, revoke, rotate API keys | [GitHub](https://github.com/TenantScale/api/blob/main/src/routes/api-keys.ts) |
| `/v1/subscriptions` | Manage Stripe subscriptions per tenant | [GitHub](https://github.com/TenantScale/api/blob/main/src/routes/subscriptions.ts) |
| `/v1/webhooks` | Register and manage webhook endpoints | [GitHub](https://github.com/TenantScale/api/blob/main/src/routes/webhooks.ts) |
| `/v1/portal` | Generate Stripe Customer Portal sessions | [GitHub](https://github.com/TenantScale/api/blob/main/src/routes/portal.ts) |
| `/v1/analytics` | Aggregated usage data across tenants | [GitHub](https://github.com/TenantScale/api/blob/main/src/routes/analytics.ts) |

### Database Layer (Supabase / PostgreSQL)

The database stores all tenant data in a shared schema with `tenant_id` as the partitioning key:

| Table | Purpose | Key Column |
|-------|---------|------------|
| `tenants` | Tenant organizations | `id` (UUID) |
| `api_keys` | Scoped authentication credentials | `tenant_id` (FK → tenants) |
| `plans` | Feature flag and limit definitions | `id` (UUID) |
| `subscriptions` | Stripe subscription mirror | `tenant_id` (FK → tenants) |
| `audit_logs` | Append-only event history | `tenant_id` (FK → tenants) |
| `webhooks` | Registered webhook endpoints | `tenant_id` (FK → tenants) |
| `webhook_deliveries` | Delivery attempt log | `webhook_id` (FK → webhooks) |
| `rate_limit_counts` | Per-key request counters | `api_key_id` (FK → api_keys) |

All tables have Row-Level Security (RLS) policies that enforce `tenant_id = auth.uid()` as a second layer of defense.

## Data Flow: Authenticated Request

Here is the complete lifecycle of a single authenticated request:

```
Client                    SDK Middleware                    Supabase                Stripe
  │                           │                                │                      │
  │  POST /api/orders         │                                │                      │
  │  Authorization: Bearer    │                                │                      │
  │  tsk_prod_abc123...       │                                │                      │
  │──────────────────────────▶│                                │                      │
  │                           │                                │                      │
  │                           │  1. Extract API Key           │                      │
  │                           │     from header                │                      │
  │                           │                                │                      │
  │                           │  2. Lookup Key + Tenant        │                      │
  │                           │───────────────────────────────▶│                      │
  │                           │◀───────────────────────────────│                      │
  │                           │  { api_key, tenant, plan }     │                      │
  │                           │                                │                      │
  │                           │  3. Validate Scope             │                      │
  │                           │     orders:write ✓             │                      │
  │                           │                                │                      │
  │                           │  4. Enforce Plan               │                      │
  │                           │     webhooks: true ✓           │                      │
  │                           │     daily_requests: 120/1000   │                      │
  │                           │                                │                      │
  │                           │  5. Check Rate Limit           │                      │
  │                           │───────────────────────────────▶│                      │
  │                           │  UPDATE rate_limit_counts      │                      │
  │                           │◀───────────────────────────────│                      │
  │                           │                                │                      │
  │                           │  6. Execute Handler            │                      │
  │                           │     req.tenant = { id, ... }   │                      │
  │                           │     db query scoped by SDK     │                      │
  │                           │                                │                      │
  │                           │  7. Log Audit Event (async)    │                      │
  │                           │───────────────────────────────▶│                      │
  │                           │  INSERT INTO audit_logs        │                      │
  │                           │                                │                      │
  │                           │  8. Fire Webhooks (async)      │                      │
  │                           │───────────────────────────────▶│                      │
  │                           │                                │  Webhook POST        │
  │                           │                                │────────────────────▶│
  │  { status: 201, data }   │                                │                      │
  │◀──────────────────────────│                                │                      │
```

### Step-by-Step Walkthrough

**Step 1: Extract the API Key**

The SDK reads the `Authorization` header and extracts the bearer token:

```typescript
// From @tenantscale/sdk/src/middleware/auth.ts
function extractApiKey(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim()
}
```

**Step 2: Resolve Tenant, Key, and Plan**

A single database query fetches the API key, its owning tenant, and the tenant's plan:

```typescript
// From @tenantscale/sdk/src/resolver.ts
interface ResolvedContext {
  key: ApiKey
  tenant: Tenant
  plan: Plan
}

async function resolveContext(
  supabase: SupabaseClient,
  key: string
): Promise<ResolvedContext | null> {
  const { data } = await supabase
    .from('api_keys')
    .select(`
      *,
      tenant:tenants!inner(
        *,
        plan:plans!inner(*)
      )
    `)
    .eq('key_hash', hashKey(key))
    .is('revoked_at', null)
    .single()

  if (!data) return null
  return {
    key: data,
    tenant: data.tenant,
    plan: data.tenant.plan,
  }
}
```

Results are cached in an in-memory LRU cache (configurable TTL, default 60 seconds) so subsequent requests from the same key avoid the database round-trip.

**Steps 3–5: Middleware Chain**

Each middleware runs sequentially. If any check fails, the request is rejected immediately:

```typescript
// Pseudo-code for the middleware pipeline
const pipeline = [
  authenticateApiKey(ts),         // Step 1-2: resolve key + tenant
  requireScope('orders:write'),   // Step 3: check scope
  requirePlanFeature('orders'),   // Step 4a: check feature flag
  requirePlanLimit('daily_requests'), // Step 4b: check numeric limit
  rateLimit({ window: '1d' }),    // Step 5: increment + check counter
  auditLog({ action: 'order.created' }), // Step 7: emit event
]
```

**Step 6: Handler Execution**

The handler receives `req.tenant` and all SDK database helpers are automatically scoped:

```typescript
app.post('/api/orders', async (req, res) => {
  // req.tenant is guaranteed to be the authenticated tenant
  const { tenant, plan } = req

  // db helper auto-scopes to tenant.id
  const order = await ts.db
    .from('orders')
    .insert({ name: req.body.name })
    .single()

  res.status(201).json({ order, tenant: tenant.slug })
})
```

The SDK's `ts.db` client is a wrapped Supabase client that appends `tenant_id = req.tenant.id` to every query automatically.

## Deployment Architectures

### SDK-Only (Self-Hosted)

In this model, you embed the TenantScale SDK directly into your application. No TenantScale API is required.

```
┌───────────────────────────────────────────────────┐
│                   Your Server                      │
│  ┌─────────────────────────────────────────────┐  │
│  │           Your Application Code              │  │
│  │  ┌─────────────────────────────────────────┐│  │
│  │  │     @tenantscale/sdk Middleware          ││  │
│  │  │  (auth, plans, rate limits, audit)      ││  │
│  │  └─────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────┘  │
│                      │                             │
└──────────────────────┼─────────────────────────────┘
                       │
               ┌───────▼───────┐
               │   Supabase    │
               │  (PostgreSQL) │
               └───────────────┘
```

**When to use:**
- You want zero external dependencies beyond Supabase
- You don't need the TenantScale admin UI or portal
- You're okay managing tenants and API keys programmatically
- You have fewer than ~50 tenants

**Pros:**
- No additional infrastructure
- Full control over middleware configuration
- Lower latency (no extra API hop)

**Cons:**
- No built-in admin dashboard
- Must implement tenant CRUD yourself
- No cross-tenant analytics out of the box

**Setup example:**

```typescript
import { TenantScale } from '@tenantscale/sdk'
import { tenantScaleMiddleware } from '@tenantscale/express'
import express from 'express'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  cache: { defaultTtlMs: 30_000 },
})

const app = express()
app.use(tenantScaleMiddleware({ ts }))

app.get('/api/orders', ts.authenticateApiKey(), (req, res) => {
  res.json({ tenant: req.tenant })
})

app.listen(3000)
```

### SDK + API (Management Plane)

Add the TenantScale API as a separate service for tenant management, billing, webhooks, and portal sessions.

```
┌──────────────────────┐     ┌──────────────────────┐
│   Your App Server    │     │  TenantScale API      │
│  ┌────────────────┐  │     │  ┌────────────────┐  │
│  │ @tenantscale   │  │     │  │ Tenant CRUD    │  │
│  │ /sdk           │  │     │  │ API Key Mgmt   │  │
│  └────────┬───────┘  │     │  │ Billing        │  │
│           │          │     │  │ Webhooks       │  │
│           │          │     │  │ Portal         │  │
│           │          │     │  │ Analytics      │  │
│           │          │     │  └────────┬───────┘  │
└───────────┼──────────┘     └───────────┼──────────┘
            │                            │
            └──────────┬─────────────────┘
                       │
                ┌──────▼───────┐     ┌──────────┐
                │   Supabase   │     │  Stripe  │
                │ (PostgreSQL) │     │ (Billing)│
                └──────────────┘     └──────────┘
```

**When to use:**
- You need the TenantScale admin dashboard
- You want Stripe billing integration out of the box
- You need webhook management for tenants
- You want cross-tenant analytics
- You have more than ~50 tenants

**Pros:**
- Full feature set available
- Admin dashboard included
- Stripe billing synchronization
- Tenant self-service portal
- Cross-tenant analytics

**Cons:**
- Additional service to deploy and maintain
- Slightly higher latency for management operations
- Requires more infrastructure

**Deployment options:**
- [Self-host on Vercel →](/self-hosting/vercel)
- [Self-host with Docker →](/self-hosting/production)
- [TenantScale Cloud (coming soon)]

### Hybrid: API for Management, SDK for Performance

A common pattern is to use the API only for management operations (creating tenants, managing keys, billing) while the SDK handles the hot path (every authenticated request). This gives you the best of both worlds.

```
Management Ops ──────▶ TenantScale API ──▶ Supabase
(create tenant,       (port 3001)
manage keys, billing)

Runtime Requests ────▶ Your App + SDK ──▶ Supabase
(API calls from        (port 3000)
your customers)
```

## Caching Architecture

The SDK uses a layered cache to minimize database pressure:

| Cache | What It Stores | TTL | Invalidation |
|-------|---------------|-----|-------------|
| **Key → Tenant** | API key hash → tenant data | 60s | On key revocation or plan change |
| **Plan Definitions** | Plan ID → full plan object | 300s | On plan update via API |
| **Rate Limit Counts** | Key ID → current window count | Window duration | On each request increment |

Cache is in-memory by default. You can provide a custom cache implementation (e.g., Redis) when constructing the SDK:

```typescript
import { RedisCache } from '@tenantscale/sdk/cache/redis'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  cache: new RedisCache({ url: process.env.REDIS_URL! }),
})
```

## Related Resources

- [Source: SDK Middleware Pipeline](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/middleware/pipeline.ts)
- [Source: Tenant Resolver](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/resolver.ts)
- [Source: Management API Router](https://github.com/TenantScale/api/blob/main/src/routes/index.ts)
- [Source: Supabase Migrations](https://github.com/TenantScale/api/tree/main/supabase/migrations)
- [Tenant Isolation →](/guide/tenant-isolation)
- [Plan Enforcement →](/guide/plan-enforcement)
- [Core Concepts →](/guide/core-concepts)
