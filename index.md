---
layout: home

title: TenantScale
titleTemplate: Multi-tenant middleware for B2B SaaS

hero:
  name: TenantScale
  text: Multi-tenant middleware for B2B SaaS
  tagline: Tenant isolation, plan enforcement, audit logging, and billing — in minutes, not months.
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/TenantScale/sdk
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: 🏗️
    title: From Zero to Multi-Tenant
    details: Add tenant isolation to any Node.js app in under 10 minutes. SDK, framework adapters, and a management API included.
  - icon: 🔒
    title: Tenant-Level Isolation
    details: Automatic scope enforcement, data partitioning, and API key validation. Never leak data between tenants.
  - icon: 📊
    title: Plan Enforcement
    details: Define plans with feature flags and limits. Enforce them at the middleware level — no custom logic needed.
  - icon: 🧾
    title: Built-in Audit Logging
    details: Every tenant-level change is logged automatically. Query events by tenant, action, or time range.
  - icon: ⚡
    title: Framework Agnostic
    details: Use with Express, Hono, Next.js, React, or any framework. Bring your own stack.
  - icon: 💳
    title: Stripe Billing
    details: Subscription management, invoice tracking, and webhook handling built right in.
---

## Getting Started in 60 Seconds

```bash
npm install @tenantscale/sdk
```

Then add one middleware to your app:

```typescript
import { TenantScale } from '@tenantscale/sdk'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
})

// Protect any route
app.use('/api/*', ts.authenticateApiKey())
```

[Continue to the Quick Start →](/guide/quick-start)

## 🚀 What's Included

| Package | Description | License |
|---------|-------------|---------|
| `@tenantscale/sdk` | Core SDK — auth, plans, audit, billing | MIT |
| `@tenantscale/express` | Express.js middleware | MIT |
| `@tenantscale/hono` | Hono.js middleware | MIT |
| `@tenantscale/next` | Next.js App Router adapter | MIT |
| `@tenantscale/react` | React hooks & context | MIT |
| `@tenantscale/cli` | CLI tools — init, migrate | MIT |
| `create-tenantscale-app` | Full-stack starter | MIT |
| `@tenantscale/api` | Management API (self-hosted) | BSL 1.1 |
