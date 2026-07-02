# Quick Start

Get multi-tenant support running in your app in under 5 minutes.

## Prerequisites

- Node.js 20+
- A Supabase project ([free tier](https://supabase.com) works great)
- Your web framework of choice

## 1. Install

```bash
npm install @tenantscale/sdk
```

Or with your framework adapter:

```bash
# Express
npm install @tenantscale/express

# Hono
npm install @tenantscale/hono

# Next.js
npm install @tenantscale/next

# React (client-side)
npm install @tenantscale/react
```

## 2. Set up Supabase

Run the migrations to create the required tables:

```bash
npx @tenantscale/cli init
```

This creates: `tenants`, `api_keys`, `plans`, `audit_logs`, `webhooks`, `subscriptions`, and more.

Or copy the SQL manually from [supabase/migrations](https://github.com/TenantScale/api/tree/main/supabase/migrations).

## 3. Configure

```typescript
import { TenantScale } from '@tenantscale/sdk'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // Optional: configure logging
  logger: console,
})
```

## 4. Add Middleware

### Express

```typescript
import { tenantScaleMiddleware } from '@tenantscale/express'
import express from 'express'

const app = express()
app.use(tenantScaleMiddleware({ ts }))

// Protect routes with API key auth
app.get('/api/orders', ts.authenticateApiKey(), (req, res) => {
  // req.tenant is available
  res.json({ tenant: req.tenant })
})
```

### Hono

```typescript
import { authenticateApiKey } from '@tenantscale/hono'
import { Hono } from 'hono'

const app = new Hono()

app.use('/api/*', authenticateApiKey({ ts }))

app.get('/api/orders', (c) => {
  const tenant = c.get('tenant')
  return c.json({ tenant })
})
```

### Next.js App Router

```typescript
// app/api/orders/route.ts
import { withTenant } from '@tenantscale/next'

export const GET = withTenant({ ts }, async (req) => {
  const tenant = req.tenant
  return Response.json({ tenant })
})
```

## 5. Create Your First Tenant

```bash
curl -X POST https://api.tenantscale.com/v1/tenants \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "slug": "acme"}'
```

Or programmatically:

```typescript
const tenant = await ts.createTenant({
  name: 'Acme Corp',
  slug: 'acme',
})
```

## Next Steps

- [Core Concepts →](/guide/core-concepts) — Understand tenants, plans, API keys
- [Framework Adapters →](/adapters/) — Deep dives for your framework
- [API Reference →](/api/) — Full API documentation
