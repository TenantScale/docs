# Installation

## Installing the SDK

Install `@tenantscale/sdk` via your preferred package manager:

```bash
# npm
npm install @tenantscale/sdk

# yarn
yarn add @tenantscale/sdk

# pnpm
pnpm add @tenantscale/sdk

# bun
bun add @tenantscale/sdk
```

### Install with Framework Adapter

Choose the adapter that matches your web framework:

```bash
# Express
npm install @tenantscale/sdk @tenantscale/express

# Hono
npm install @tenantscale/sdk @tenantscale/hono

# Next.js
npm install @tenantscale/sdk @tenantscale/next

# React (client-side)
npm install @tenantscale/sdk @tenantscale/react
```

### Install with Billing Support

If you need Stripe billing integration, install the Stripe peer dependency:

```bash
npm install @tenantscale/sdk stripe
```

### Install All Optional Dependencies

For a full-featured setup with Redis-backed rate limiting and Stripe billing:

```bash
npm install @tenantscale/sdk @supabase/supabase-js stripe ioredis
```

## Peer Dependencies

| Package | Minimum Version | Required For | Optional? |
|---------|----------------|-------------|-----------|
| `@supabase/supabase-js` | ≥2.45.0 | Database operations, plan storage, audit logging | No |
| `stripe` | ≥17.0.0 | Billing, subscriptions, invoice sync | Yes |
| `ioredis` | ≥5.4.0 | Redis-backed rate limiting, webhook queue | Yes |

The SDK will warn at startup if required peer dependencies are missing.

## Prerequisites

- **Node.js 20+** (18.x may work but is not officially supported)
- **A Supabase project** — all data (tenants, plans, API keys, audit logs) is stored in Supabase
- **(Optional) A Stripe account** — for subscription billing

### Database Setup

Run the CLI migration to create required tables:

```bash
npx @tenantscale/cli init
```

This creates the following tables:
- `tenants` — tenant organizations
- `api_keys` — scoped API keys
- `plans` — plan definitions with features and limits
- `audit_logs` — append-only event log
- `webhooks` — registered webhook endpoints
- `webhook_deliveries` — delivery tracking
- `subscriptions` — Stripe subscription sync
- `rate_limit_counts` — daily request counters
- `portal_sessions` — customer portal session tokens

Alternatively, copy the SQL manually from the [supabase/migrations](https://github.com/TenantScale/api/tree/main/supabase/migrations) directory.

## TypeScript Configuration

### tsconfig.json

For the best TypeScript experience, configure your `tsconfig.json` with these recommended settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

### Strict Mode

The SDK ships with full type definitions that benefit from strict mode. We recommend:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

## Type Augmentation

The SDK augments framework request types to provide typed access to tenant and plan data. Each framework adapter package includes the appropriate type declarations.

### Express

```typescript
// With @tenantscale/express installed, Request is augmented automatically:
import { Request } from 'express'

// req.tenant is now available and typed
app.get('/api/orders', async (req: Request, res: Response) => {
  const tenant = req.tenant // Tenant | undefined
  const plan = req.plan     // Plan | undefined
  const apiKey = req.apiKey // ApiKey | undefined
})

// For custom augmentations, declare module merging:
declare module 'express-serve-static-core' {
  interface Request {
    tenant: Tenant
    plan: Plan
    apiKey: ApiKey
  }
}
```

### Hono

```typescript
// With @tenantscale/hono installed:
import { Context } from 'hono'

app.use('/api/*', authenticateApiKey({ ts }))

app.get('/api/orders', (c: Context) => {
  const tenant = c.get('tenant')   // Tenant
  const plan = c.get('plan')       // Plan
  const apiKey = c.get('apiKey')   // ApiKey
  return c.json({ tenant, plan })
})

// Type augmentation for Hono variables:
declare module 'hono' {
  interface ContextVariableMap {
    tenant: Tenant
    plan: Plan
    apiKey: ApiKey
  }
}
```

### Next.js

```typescript
// With @tenantscale/next installed:
import { withTenant } from '@tenantscale/next'
import { NextRequest } from 'next/server'

export const GET = withTenant({ ts }, async (req: NextRequest) => {
  const tenant = req.tenant // Tenant | undefined
  return Response.json({ tenant })
})

// Manual augmentation:
declare module 'next/server' {
  interface NextRequest {
    tenant?: Tenant
    plan?: Plan
    apiKey?: ApiKey
  }
}
```

### Without a Framework Adapter

If you're not using a framework adapter package, you can augment types manually:

```typescript
import type { Tenant, Plan, ApiKey } from '@tenantscale/sdk'

// Express example
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant
      plan?: Plan
      apiKey?: ApiKey
    }
  }
}
```

## Verifying Installation

Create a minimal test to verify the SDK is installed correctly:

```typescript
import { TenantScale } from '@tenantscale/sdk'

const ts = new TenantScale({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-service-role-key',
})

console.log('TenantScale SDK initialized:', ts.version)
// Output: TenantScale SDK initialized: 2.0.0
```

## Troubleshooting

### "Cannot find module '@tenantscale/sdk'"

Ensure the package is installed:

```bash
npm ls @tenantscale/sdk
```

If missing, reinstall:

```bash
npm install @tenantscale/sdk
```

### "Missing peer dependency @supabase/supabase-js"

Install the Supabase client:

```bash
npm install @supabase/supabase-js
```

### TypeScript errors after installation

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": false
  }
}
```

### "Cannot use import statement outside a module"

Add `"type": "module"` to your `package.json` or use `.mts` file extension:

```json
{
  "type": "module"
}
```
