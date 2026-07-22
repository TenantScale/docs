# Fastify Adapter

`@tenantscale/fastify` provides Fastify middleware for the TenantScale SDK. It integrates seamlessly with Fastify's hook system and provides tenant context via request decorators.

## Installation

```bash
npm install @tenantscale/fastify fastify
# or
pnpm add @tenantscale/fastify fastify
```

**Peer dependencies:** Requires `fastify@^4.0.0` and `@tenantscale/sdk@^1.0.0`.

## Quick Start

```typescript
import Fastify from 'fastify';
import { authenticateApiKey, errorHandler } from '@tenantscale/fastify';
import { createTenantScaleClient } from '@tenantscale/sdk';

const app = Fastify();

// Initialize TenantScale client
const ts = createTenantScaleClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// Add authentication middleware
app.addHook('preHandler', authenticateApiKey({ ts }));

// Add error handler
app.setErrorHandler(errorHandler());

app.get('/api/me', async (request, reply) => {
  const tenant = request.tenant;
  return reply.send({
    message: `Hello, ${tenant.name}!`,
    tenant,
  });
});

await app.listen({ port: 3000 });
```

## Middleware Functions

Each middleware can be used individually for fine-grained control over your Fastify application.

### `authenticateApiKey`

Resolves the tenant from an API key in the `Authorization` header. Sets `request.tenant` and `request.apiKey`.

```typescript
import { authenticateApiKey } from '@tenantscale/fastify';

app.addHook('preHandler', authenticateApiKey({ ts }));

// Or apply to specific routes
app.get('/api/protected', {
  preHandler: authenticateApiKey({ ts }),
}, async (request, reply) => {
  const tenant = request.tenant;
  return reply.send({ tenant });
});
```

**Header format:** `Authorization: Bearer tsk_live_<key>`

**On success:** Populates `request.tenant` and `request.apiKey` with resolved objects.

**On failure:** Throws `InvalidApiKeyError` (caught by error handler → 401 response).

### `requireScope`

Restricts access to API keys that have a specific scope.

```typescript
import { requireScope } from '@tenantscale/fastify';

app.delete('/api/admin/tenants/:id', {
  preHandler: [authenticateApiKey({ ts }), requireScope({ ts }, 'admin')],
}, async (request, reply) => {
  return reply.send({ deleted: true });
});

// Require multiple scopes (must have ALL)
app.post('/api/billing', {
  preHandler: [authenticateApiKey({ ts }), requireScope({ ts }, ['admin', 'billing:write'])],
}, async (request, reply) => {
  return reply.send({ ok: true });
});
```

**Note:** Must be used after `authenticateApiKey()` so `request.apiKey` is available.

### `requirePlanFeature`

Restricts access to tenants with a specific plan feature.

```typescript
import { requirePlanFeature } from '@tenantscale/fastify';

app.get('/api/audit-logs', {
  preHandler: [authenticateApiKey({ ts }), requirePlanFeature({ ts }, 'audit-log')],
}, async (request, reply) => {
  const tenant = request.tenant;
  return reply.send({ tenantId: tenant.id, logs: [] });
});

// Require the 'custom-domain' feature
app.post('/api/domains', {
  preHandler: [authenticateApiKey({ ts }), requirePlanFeature({ ts }, 'custom-domain')],
}, async (request, reply) => {
  return reply.send({ created: true });
});
```

**Note:** Must be used after `authenticateApiKey()` so `request.tenant` is available.

### `requirePlanLimit`

Checks that the tenant's current usage for a given metric is within their plan limit.

```typescript
import { requirePlanLimit } from '@tenantscale/fastify';

// Check the 'api-requests' limit
app.get('/api/data', {
  preHandler: [authenticateApiKey({ ts }), requirePlanLimit({ ts }, 'api-requests')],
}, async (request, reply) => {
  const tenant = request.tenant;
  return reply.send({
    limit: tenant.limits['api-requests'],
    usage: tenant.usage['api-requests'],
    remaining: tenant.limits['api-requests'] - tenant.usage['api-requests'],
  });
});

// Check with a custom increment
app.post('/api/bulk', {
  preHandler: [authenticateApiKey({ ts }), requirePlanLimit({ ts }, 'api-requests', { increment: 100 })],
}, async (request, reply) => {
  return reply.send({ success: true });
});
```

**Note:** Must be used after `authenticateApiKey()` so `request.tenant` is available.

### `rateLimitByApiKey`

Rate limits requests per API key.

```typescript
import { rateLimitByApiKey } from '@tenantscale/fastify';

// Default daily limit
app.addHook('preHandler', rateLimitByApiKey({ ts }));

// Custom limits
app.register(async function (fastify) {
  fastify.addHook('preHandler', rateLimitByApiKey({ ts }, { max: 1000, windowMs: 60 * 60 * 1000 }));
}, { prefix: '/api/heavy' });

// Different limits for different routes
const strictLimit = rateLimitByApiKey({ ts }, { max: 10, windowMs: 60 * 1000 });
app.post('/api/login', { preHandler: strictLimit }, handler);
```

### `rateLimitByIp`

Rate limits requests per IP address. Useful as a global rate limiter for unauthenticated routes.

```typescript
import { rateLimitByIp } from '@tenantscale/fastify';

// Default: 100 requests per minute
app.addHook('preHandler', rateLimitByIp({ ts }));

// Custom limit
app.register(async function (fastify) {
  fastify.addHook('preHandler', rateLimitByIp({ ts }, { max: 20, windowMs: 60 * 1000 }));
}, { prefix: '/api/public' });

// Strict rate for auth endpoints
const authLimit = rateLimitByIp({ ts }, { max: 5, windowMs: 60 * 1000 });
app.post('/api/login', { preHandler: authLimit }, handler);
app.post('/api/register', { preHandler: authLimit }, handler);
```

## Error Handler

The `errorHandler` function provides standardized error responses for all TenantScale errors.

```typescript
import { errorHandler } from '@tenantscale/fastify';

app.setErrorHandler(errorHandler());
```

This handler automatically converts TenantScale errors to appropriate HTTP responses:

| Error | Status | Code |
|-------|--------|------|
| `InvalidApiKeyError` | 401 | `INVALID_API_KEY` |
| `InsufficientScopeError` | 403 | `INSUFFICIENT_SCOPE` |
| `PlanLimitExceededError` | 403 | `PLAN_LIMIT_EXCEEDED` |
| `RateLimitExceededError` | 429 | `RATE_LIMIT_EXCEEDED` |

### Custom Error Handler

If you need custom error handling, you can wrap the default handler:

```typescript
import { errorHandler } from '@tenantscale/fastify';

app.setErrorHandler(async (error, request, reply) => {
  // Handle TenantScale errors with default handler
  const tenantScaleHandler = errorHandler();
  await tenantScaleHandler(error, request, reply);
  
  // Add custom logging
  if (error.statusCode >= 500) {
    app.log.error(error);
  }
});
```

## Configuration Options

### TenantScale Client Options

```typescript
import { createTenantScaleClient } from '@tenantscale/sdk';

const ts = createTenantScaleClient({
  /**
   * Supabase project URL. Falls back to SUPABASE_URL env var.
   */
  supabaseUrl?: string;

  /**
   * Supabase service role key. Falls back to SUPABASE_SERVICE_ROLE_KEY env var.
   */
  supabaseKey?: string;

  /**
   * Rate limit storage backend. Defaults to 'supabase'.
   */
  rateLimitStorage?: 'supabase' | 'redis' | 'memory';

  /**
   * Redis URL (required if rateLimitStorage is 'redis').
   */
  redisUrl?: string;

  /**
   * Daily request limit per API key. Defaults to 10000.
   */
  defaultDailyLimit?: number;

  /**
   * Max requests per minute per IP. Defaults to 100.
   */
  ipMaxPerMinute?: number;
});
```

### Middleware Options

```typescript
// Rate limit options
interface RateLimitOptions {
  max?: number;           // Maximum requests
  windowMs?: number;      // Time window in milliseconds
}

// Plan limit options
interface PlanLimitOptions {
  increment?: number;     // Amount to increment usage by
  track?: boolean;        // Track usage without incrementing
}
```

## Working with Fastify Hooks

### Global Hooks

Apply middleware globally using Fastify's hook system:

```typescript
import { authenticateApiKey, rateLimitByIp } from '@tenantscale/fastify';

// Apply to all routes
app.addHook('preHandler', authenticateApiKey({ ts }));

// Apply IP rate limiting before auth
app.addHook('onRequest', rateLimitByIp({ ts }));
```

### Route-Level Hooks

Apply middleware to specific routes or route groups:

```typescript
// Single route
app.get('/api/protected', {
  preHandler: authenticateApiKey({ ts }),
}, handler);

// Multiple middleware
app.post('/api/admin/action', {
  preHandler: [
    authenticateApiKey({ ts }),
    requireScope({ ts }, 'admin'),
    requirePlanFeature({ ts }, 'admin-panel'),
  ],
}, handler);
```

### Plugin-Level Hooks

Apply middleware within Fastify plugins:

```typescript
import fp from 'fastify-plugin';

async function apiRoutes(fastify, options) {
  // All routes in this plugin require auth
  fastify.addHook('preHandler', authenticateApiKey({ ts }));

  fastify.get('/me', async (request, reply) => {
    return reply.send({ tenant: request.tenant });
  });
}

app.register(fp(apiRoutes), { prefix: '/api' });
```

## Request Decorators

After applying TenantScale middleware, the following decorators are available on the request object:

| Decorator | Type | Set By | Description |
|-----------|------|--------|-------------|
| `request.tenant` | `Tenant` | `authenticateApiKey()` | Resolved tenant object |
| `request.apiKey` | `ApiKey` | `authenticateApiKey()` | Resolved API key record |
| `request.rateLimitInfo` | `RateLimitInfo` | `rateLimitByApiKey()` / `rateLimitByIp()` | Current rate limit state |

```typescript
interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp
}
```

### Using Decorators

```typescript
app.get('/api/me', {
  preHandler: authenticateApiKey({ ts }),
}, async (request, reply) => {
  const tenant = request.tenant;
  const apiKey = request.apiKey;

  return reply.send({
    tenantId: tenant.id,
    tenantName: tenant.name,
    plan: tenant.plan.name,
    features: tenant.features,
    apiKeyId: apiKey.id,
    apiKeyScopes: apiKey.scopes,
  });
});
```

## Complete Fastify App Example

```typescript
import Fastify from 'fastify';
import {
  authenticateApiKey,
  requireScope,
  requirePlanFeature,
  requirePlanLimit,
  rateLimitByApiKey,
  rateLimitByIp,
  errorHandler,
} from '@tenantscale/fastify';
import { createTenantScaleClient } from '@tenantscale/sdk';

// --- Initialize Fastify ---
const app = Fastify({
  logger: true,
});

// --- Initialize TenantScale ---
const ts = createTenantScaleClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// --- Global middleware ---

// IP rate limiter (before auth, for unauthenticated routes)
app.addHook('onRequest', rateLimitByIp({ ts }, { max: 30, windowMs: 60 * 1000 }));

// Error handler
app.setErrorHandler(errorHandler());

// --- Public routes (no auth required) ---

app.get('/health', async (request, reply) => {
  return reply.send({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/public/pricing', async (request, reply) => {
  return reply.send({
    plans: [
      { id: 'free', name: 'Free', requests: 10000 },
      { id: 'pro', name: 'Pro', requests: 50000 },
      { id: 'enterprise', name: 'Enterprise', requests: -1 },
    ],
  });
});

// --- Authenticated routes ---

// Apply authentication to all /api routes
app.register(async function (fastify) {
  fastify.addHook('preHandler', authenticateApiKey({ ts }));

  // Current tenant info
  fastify.get('/me', async (request, reply) => {
    return reply.send({
      tenant: request.tenant,
      apiKey: request.apiKey,
    });
  });

  // --- Admin routes (scoped) ---
  fastify.register(async function (admin) {
    admin.addHook('preHandler', requireScope({ ts }, 'admin'));

    admin.get('/tenants', async (request, reply) => {
      const { listTenants } = await import('@tenantscale/sdk');
      const tenants = await listTenants();
      return reply.send({ tenants });
    });
  }, { prefix: '/admin' });

  // --- Feature-gated routes ---
  fastify.get('/audit-logs', {
    preHandler: requirePlanFeature({ ts }, 'audit-log'),
  }, async (request, reply) => {
    const tenant = request.tenant;
    const { getAuditLogs } = await import('@tenantscale/sdk');
    const logs = await getAuditLogs({ tenantId: tenant.id });
    return reply.send({ logs });
  });

  // --- Plan-limit-gated routes ---
  fastify.post('/bulk/import', {
    preHandler: requirePlanLimit({ ts }, 'bulk-import', { increment: 1 }),
  }, async (request, reply) => {
    // Process bulk import...
    return reply.send({ imported: true });
  });

  // --- Rate-limited routes ---
  const sensitiveRateLimit = rateLimitByApiKey({ ts }, { max: 100, windowMs: 60 * 1000 });
  fastify.post('/webhooks/send', {
    preHandler: sensitiveRateLimit,
  }, async (request, reply) => {
    // Send webhook...
    return reply.send({ sent: true });
  });

}, { prefix: '/api' });

// --- Start server ---
await app.listen({ port: 3000 });
console.log('Server running on http://localhost:3000');
```

## Type Safety

Fastify's type system allows you to augment the request type for full type safety.

```typescript
import { Tenant, ApiKey } from '@tenantscale/sdk';

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    tenant: Tenant;
    apiKey: ApiKey;
  }
}
```

After this declaration, TypeScript will recognize `request.tenant` and `request.apiKey` as properly typed throughout your application.

## Error Reference

| Error Class | HTTP Status | Code | Cause |
|-------------|-------------|------|-------|
| `InvalidApiKeyError` | 401 | `INVALID_API_KEY` | Missing, malformed, or revoked API key |
| `InsufficientScopeError` | 403 | `INSUFFICIENT_SCOPE` | API key lacks required scope |
| `PlanLimitExceededError` | 403 | `PLAN_LIMIT_EXCEEDED` | Usage exceeds plan limit |
| `RateLimitExceededError` | 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

All errors extend the base `TenantScaleError` class:

```typescript
class TenantScaleError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
}
```

## Features

The Fastify adapter provides comprehensive tenant management features:

- **API key authentication**: Validates API keys from the `Authorization` header
- **Portal session validation**: Support for portal-based authentication
- **Scope and role checks**: Restrict access based on API key scopes and tenant roles
- **Plan limit enforcement**: Ensure tenants stay within their plan limits
- **Rate limiting**: Per-API key and per-IP rate limiting with configurable storage backends
- **Audit logging**: Automatic audit trail for tenant operations
- **Standardized error responses**: Consistent error format across all endpoints

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/fastify](https://github.com/TenantScale/sdk/tree/main/packages/fastify)
