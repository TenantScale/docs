# TenantScale

**TenantScale** is an open-source middleware stack that adds multi-tenant support to any B2B SaaS application. It handles the hard parts of multi-tenancy so you don't have to.

## Why TenantScale?

Building multi-tenant SaaS from scratch means solving the same problems over and over:

- **Tenant isolation** — How do you ensure Tenant A never sees Tenant B's data?
- **API key management** — Generate, scope, rotate, and revoke keys at scale
- **Plan enforcement** — Feature flags, usage limits, upgrade/downgrade flows
- **Audit logging** — Who did what, when, and in which tenant?
- **Billing** — Stripe subscriptions tied to tenants, proration, invoice handling
- **Portal sessions** — Admin panel authentication scoped to a tenant

**TenantScale solves all of this** with a clean, framework-agnostic SDK and a self-hostable management API.

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your App   │────▶│ TenantScale  │────▶│  Supabase   │
│ (Express,   │     │ Middleware    │     │ (PostgreSQL)│
│  Hono, etc) │◀────│ SDK + API    │◀────│  + Auth     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Stripe    │
                    │  (Billing)  │
                    └─────────────┘
```

1. Your app sends requests with an API key
2. TenantScale middleware validates the key, resolves the tenant, and enforces plan limits
3. Data operations are automatically scoped to the correct tenant
4. Audit events are logged, rate limits are checked, billing is synchronized

## Two Deployment Models

### SDK-only (self-hosted)
Use `@tenantscale/sdk` directly with your Supabase database. No TenantScale cloud needed. The SDK handles auth, plan enforcement, audit logging, and rate limiting as middleware in your app.

Requires: Supabase project + your application.

### SDK + API (management plane)
Add the TenantScale API for tenant CRUD, API key management, billing, analytics, and portal sessions. Self-host the API or use TenantScale Cloud.

Requires: Supabase project + API deployment + your application.

## License

- **SDK & Adapters** (`@tenantscale/*`) — [MIT License](https://github.com/TenantScale/sdk/blob/main/LICENSE)
- **API** (`@tenantscale/api`) — [BSL 1.1 License](https://github.com/TenantScale/api/blob/main/LICENSE)
- **Portal** — Proprietary (TenantScale Cloud)
