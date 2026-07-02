# SDK Reference

`@tenantscale/sdk` is the core library that provides multi-tenant authentication, plan enforcement, audit logging, rate limiting, webhook dispatch, and billing — all in a framework-agnostic package.

- **Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
- **License:** MIT
- **Package:** `@tenantscale/sdk`
- **npm:** [npmjs.com/package/@tenantscale/sdk](https://www.npmjs.com/package/@tenantscale/sdk)

## Installation

```bash
npm install @tenantscale/sdk
# or
yarn add @tenantscale/sdk
# or
pnpm add @tenantscale/sdk
# or
bun add @tenantscale/sdk
```

> **Peer dependencies:** Requires `@supabase/supabase-js` ≥2.45 and `stripe` ≥17.0.  
> Full installation guide → [Installation](/sdk/installation)

## Quick Links

| Section | Description |
|---------|-------------|
| [TenantScale Client](/sdk/client) | Constructor options, subsystem access, configuration |
| [Authentication](/sdk/authentication) | API key auth, scope enforcement, portal sessions |
| [API Keys](/sdk/api-keys) | Create, list, rotate, revoke — with scopes and limits |
| [Plans & Features](/sdk/plans) | Feature flags, numeric limits, plan enforcement middleware |
| [Audit Events](/sdk/audit) | Structured event logging, querying, retention |
| [Webhooks](/sdk/webhooks) | Register endpoints, dispatch events, verify signatures |
| [Rate Limiting](/sdk/rate-limiting) | Daily key limits, IP throttling, plan-based overrides |
| [Error Handling](/sdk/errors) | Error hierarchy, typed error classes, error middleware |
| [TypeScript API](/sdk/typescript) | Type exports, generics, type guards, type-safe middleware |

## Exports Overview

All exports are available from the main entry point. Subsystem-specific utilities are also exported from their own paths.

### Main Entry (`@tenantscale/sdk`)

```typescript
// Main client class
import { TenantScale } from '@tenantscale/sdk'

// Authentication
import {
  authenticateApiKey,
  requireScope,
  requirePortalSession,
  type AuthResult,
} from '@tenantscale/sdk'

// Plan enforcement
import {
  requirePlanFeature,
  requirePlanLimit,
  type PlanResult,
} from '@tenantscale/sdk'

// Audit logging
import {
  AuditLogger,
  type AuditEvent,
} from '@tenantscale/sdk'

// Webhooks
import {
  verifyWebhookSignature,
  type WebhookPayload,
  type WebhookDelivery,
} from '@tenantscale/sdk'

// Rate limiting
import {
  dailyKeyLimit,
  ipThrottle,
  type RateLimitConfig,
} from '@tenantscale/sdk'

// Error classes
import {
  TenantScaleError,
  AuthError,
  MissingKeyError,
  InvalidKeyError,
  ExpiredKeyError,
  InsufficientScopeError,
  PlanError,
  FeatureNotAllowedError,
  LimitExceededError,
  RateLimitError,
  WebhookError,
  BillingError,
  ValidationError,
} from '@tenantscale/sdk'

// Types
import type {
  Tenant,
  Plan,
  ApiKey,
  Scope,
  PlanFeature,
  PlanLimit,
  TenantScaleOptions,
  Logger,
  PaginatedResponse,
  Subscription,
  BillingInterval,
  Session,
} from '@tenantscale/sdk'

// Testing utilities
import {
  createAuthTest,
  createPlanTest,
  createRateLimitTest,
  createWebhookTest,
} from '@tenantscale/sdk/testing'
```

### Sub-path Exports

```typescript
// Framework adapters (separate packages)
import '@tenantscale/express'  // Express middleware
import '@tenantscale/hono'     // Hono middleware
import '@tenantscale/next'     // Next.js App Router
import '@tenantscale/react'    // React hooks & context

// Type augmentation is automatic with these packages
```

## Architecture

The SDK is organized into independent subsystems, all accessible from the main `TenantScale` instance:

```
TenantScale
├── auth          → API key validation, scope checks, portal sessions
├── apiKeys       → Create, list, rotate, revoke API keys
├── plans         → Plan resolution, feature checks, limit evaluation
├── audit         → Event logging, querying, retention, export
├── webhooks      → Registration, dispatch, delivery tracking, verification
├── rateLimit     → Daily key limits, IP throttling, plan overrides
├── billing       → Stripe subscription sync, invoice tracking
├── admin         → Cross-tenant admin operations
├── cache         → LRU cache with Redis/Supabase backends
└── db            → Raw Supabase client access
```

Each subsystem is accessed via a property on the client instance:

```typescript
const ts = new TenantScale({ supabaseUrl, supabaseKey })

// Access subsystems
ts.auth          // Authentication module
ts.apiKeys       // API key management
ts.plans         // Plan resolution & enforcement
ts.audit         // Audit logging
ts.webhooks      // Webhook registration & dispatch
ts.rateLimit     // Rate limiting
ts.billing       // Billing & subscriptions
ts.admin         // Admin operations
ts.cache         // Cache management
ts.db            // Supabase client
```

## Framework Integration

The SDK is framework-agnostic. Middleware functions work with any framework that supports a `(req, res, next)` pattern or equivalent. For first-class framework support, use the adapter packages:

- **Express** → `@tenantscale/express` — Express middleware, `req.tenant` type augmentation
- **Hono** → `@tenantscale/hono` — Hono middleware, `c.get('tenant')` context
- **Next.js** → `@tenantscale/next` — `withTenant` wrapper, App Router support
- **React** → `@tenantscale/react` — `useTenant` hook, `TenantProvider` context

See the [Framework Adapters](/adapters/) section for detailed setup guides.

## TypeScript

The SDK is written in TypeScript with strict type safety. All public APIs have complete type definitions. See the [TypeScript API](/sdk/typescript) page for full type documentation.

Key TypeScript features:

- **Generics** for typed metadata on Tenants, Plans, and Audit Events
- **Type guards** for runtime type checking of API responses
- **Type-safe middleware** that augments framework request types
- **Automatic type augmentation** when using framework adapter packages

## Testing

Test utilities are available from `@tenantscale/sdk/testing`:

```typescript
import {
  createAuthTest,
  createPlanTest,
  createRateLimitTest,
  createWebhookTest,
} from '@tenantscale/sdk/testing'

// Each utility creates a sandboxed tenant with a test API key
const authTest = createAuthTest({ ts })
const planTest = createPlanTest({ ts })
const rateLimitTest = createRateLimitTest({ ts })
const webhookTest = createWebhookTest({ ts })
```

## Migration from v1

If upgrading from v1.x, see the [changelog](https://github.com/TenantScale/sdk/releases) for breaking changes. Key changes in v2:

- `TenantScale` constructor now accepts a single options object (previously positional args)
- `authenticateApiKey()` no longer requires an options parameter when called on a configured instance
- Error classes are now exported as named exports
- Testing utilities moved from `@tenantscale/sdk/test` to `@tenantscale/sdk/testing`
- All subsystem methods are now promise-based with consistent error handling
