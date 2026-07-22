# Framework Adapters

TenantScale provides framework-specific adapters that wrap the core SDK into idiomatic middleware for your web framework. Each adapter gives you drop-in tenant isolation, API key authentication, plan enforcement, and rate limiting — without changing your application logic.

## Available Adapters

| Package | Framework | Status | NPM |
|---------|-----------|--------|-----|
| `@tenantscale/express` | Express.js | ✅ Stable | [![npm](https://img.shields.io/npm/v/@tenantscale/express)](https://www.npmjs.com/package/@tenantscale/express) |
| `@tenantscale/fastify` | Fastify | ✅ Stable | [![npm](https://img.shields.io/npm/v/@tenantscale/fastify)](https://www.npmjs.com/package/@tenantscale/fastify) |
| `@tenantscale/hono` | Hono | ✅ Stable | [![npm](https://img.shields.io/npm/v/@tenantscale/hono)](https://www.npmjs.com/package/@tenantscale/hono) |
| `@tenantscale/koa` | Koa | ✅ Stable | [![npm](https://img.shields.io/npm/v/@tenantscale/koa)](https://www.npmjs.com/package/@tenantscale/koa) |
| `@tenantscale/next` | Next.js (App Router) | ✅ Stable | [![npm](https://img.shields.io/npm/v/@tenantscale/next)](https://www.npmjs.com/package/@tenantscale/next) |
| `@tenantscale/react` | React / Next.js (Client) | ✅ Stable | [![npm](https://img.shields.io/npm/v/@tenantscale/react)](https://www.npmjs.com/package/@tenantscale/react) |

### ORM Adapters

| Package | Status |
|---------|--------|
| `@tenantscale/drizzle` | ✅ Stable |

## Feature Comparison

| Feature | Express | Hono | Next.js | React |
|---------|---------|------|---------|-------|
| Middleware style | `app.use()` | `app.use()` | `withTenant()` HOF | Provider + Hooks |
| Tenant access | `req.tenant` | `c.get('tenant')` | `req.tenant` | `useTenant()` |
| API key authentication | ✅ | ✅ | ✅ | ❌ (server-side) |
| Scope-based authorization | ✅ | ✅ | ✅ | ❌ (server-side) |
| Plan feature enforcement | ✅ | ✅ | ✅ | `usePlan()` (read) |
| Plan limit enforcement | ✅ | ✅ | ✅ | ❌ (server-side) |
| Rate limiting | ✅ | ✅ | ✅ | ❌ (server-side) |
| Client-side rendering | ❌ | ❌ | ❌ | ✅ |
| Server-side rendering | N/A | N/A | ✅ | ✅ |
| TypeScript generics | ✅ | ✅ | ✅ | ✅ |
| Custom error handling | ✅ | ✅ | ✅ | N/A |

## Architecture Overview

Each server adapter follows the same request lifecycle:

```
Incoming Request
       │
       ▼
┌──────────────────────┐
│  authenticateApiKey  │  → Resolves tenant from API key
│  (or requireScope)   │  → Validates scopes
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  requirePlanFeature  │  → Checks plan has required feature
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  requirePlanLimit    │  → Checks usage within plan limits
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  rateLimitByApiKey   │  → Applies rate limits per API key
│  (or rateLimitByIp)  │  → Applies rate limits per IP
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│   Your Route Handler │  → req.tenant / c.get('tenant') available
└──────────────────────┘
```

All adapters share the same core SDK under the hood, so behavior is consistent across frameworks. Choose the adapter that matches your stack.

## Quick Links

| Adapter | Documentation | Source |
|---------|--------------|--------|
| Express | [Express Adapter →](/adapters/express) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/express) |
| Fastify | [Fastify Adapter →](/adapters/fastify) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/fastify) |
| Hono | [Hono Adapter →](/adapters/hono) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/hono) |
| Koa | [Koa Adapter →](/adapters/koa) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/koa) |
| Next.js | [Next.js Adapter →](/adapters/nextjs) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/next) |
| React | [React Adapter →](/adapters/react) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/react) |
| Drizzle | [Drizzle Adapter →](/adapters/drizzle) | [GitHub](https://github.com/TenantScale/sdk/tree/main/packages/drizzle) |

## Installation (Quick Reference)

```bash
# Express
npm install @tenantscale/express

# Fastify
npm install @tenantscale/fastify

# Hono
npm install @tenantscale/hono

# Koa
npm install @tenantscale/koa

# Next.js
npm install @tenantscale/next

# React
npm install @tenantscale/react

# ORM adapters
npm install @tenantscale/drizzle
```

All adapters require the core SDK (`@tenantscale/sdk`) as a peer dependency. If it is not already installed, npm will install it automatically.

## Shared Concepts

### Tenant Resolution

All server adapters resolve the tenant from an API key sent in the `Authorization` header:

```
Authorization: Bearer tsk_live_abc123def456
```

The adapter extracts the key, looks up the associated tenant, and makes the tenant object available on the request context.

### Tenant Object Shape

```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  metadata?: Record<string, unknown>;
}
```

### Error Handling

Server adapters throw typed errors that can be caught by framework-specific error handlers:

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `InvalidApiKeyError` | 401 | API key is missing, malformed, or revoked |
| `InsufficientScopeError` | 403 | API key lacks required scope |
| `PlanLimitExceededError` | 403 | Usage exceeds plan limit |
| `RateLimitExceededError` | 429 | Too many requests |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages](https://github.com/TenantScale/sdk/tree/main/packages)
