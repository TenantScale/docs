# Core Concepts

## Tenants

A **tenant** is your customer — an organization that uses your SaaS product. Each tenant has:

- **A unique ID** — auto-generated UUID
- **A slug** — human-readable identifier (e.g., `acme-corp`)
- **A plan** — determines feature access and limits
- **API keys** — used to authenticate requests

Tenants are isolated from each other at every layer: database queries, auth middleware, audit logs, and billing.

```typescript
interface Tenant {
  id: string
  name: string
  slug: string
  plan_id: string
  created_at: string
  updated_at: string
  // Custom fields you add to your Supabase tenants table
  [key: string]: unknown
}
```

## Plans & Features

A **plan** defines what a tenant can do. Plans have:

- **Feature flags** — boolean gates (e.g., `webhooks: true`, `audit_logs: false`)
- **Limits** — numeric caps (e.g., `max_api_keys: 5`, `daily_requests: 1000`)
- **Stripe product linkage** — for subscription billing

```typescript
interface Plan {
  id: string
  name: string          // "Free", "Hobby", "Pro"
  features: {
    webhooks: boolean
    audit_logs: boolean
    analytics: boolean
    sso: boolean
  }
  limits: {
    max_api_keys: number
    max_tenants?: number
    daily_requests: number
    storage_gb: number
  }
  stripe_price_id?: string
}
```

Plans are stored in Supabase and cached in the SDK for fast enforcement.

## API Keys

API Keys authenticate requests and carry **scopes** that define what the key can do:

```typescript
interface ApiKey {
  id: string
  tenant_id: string
  name: string              // Human label: "Production", "Staging"
  scope: string[]           // ["orders:read", "orders:write"]
  key_prefix: string        // "tsk_prod_a1b2..." — shown once
  created_at: string
  expires_at?: string
  revoked_at?: string
  last_used_at?: string
}
```

Scopes are validated on every request. A key with `orders:read` scope cannot call `POST /api/orders`.

## Tenant Isolation Model

TenantScale uses **shared database, row-level isolation**:

- All tenants share the same database tables
- Every row has a `tenant_id` column
- The SDK automatically scopes queries to the authenticated tenant
- Supabase RLS policies act as a second layer of defense

This approach gives you:
- **Simple operations** — single database, simple backups
- **No data leakage** — tenant_id is enforced at the middleware level
- **Cross-tenant analytics** — when you need them (admin role bypasses isolation)

## Request Lifecycle

```
Request → API Key Auth → Scope Check → Plan Enforcement → Rate Limit → Handler → Audit Log
   │          │              │              │                │           │         │
   │     Validates     Checks key     Verifies plan    Checks daily    Your     Logs the
   │     the API key   has required   allows the       request limit  business  action to
   │     from header   scope          feature          is not         logic    audit_logs
   │                                                                   
   └─ Rejects with 401 ─┴─ 403 ─┴─ 403 ─┴─ 429 ─┴─ 200 ─┴─ 201
```

## Next Steps

- [Architecture →](/guide/architecture) — Deep dive into the system design
- [Tenant Isolation →](/guide/tenant-isolation) — How isolation works in detail
- [Plan Enforcement →](/guide/plan-enforcement) — Defining and enforcing plans
