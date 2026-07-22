# Koa Adapter

`@tenantscale/koa` provides Koa middleware for the TenantScale SDK. It integrates seamlessly with Koa's async middleware pattern and provides tenant context via the Koa context (`ctx`).

## Installation

```bash
npm install @tenantscale/koa koa
# or
pnpm add @tenantscale/koa koa
```

**Peer dependencies:** Requires `koa@^2.0.0` and `@tenantscale/sdk@^1.0.0`.

## Quick Start

```typescript
import Koa from 'koa';
import { authenticateApiKey, errorHandler } from '@tenantscale/koa';
import { createTenantScaleClient } from '@tenantscale/sdk';

const app = new Koa();

// Initialize TenantScale client
const ts = createTenantScaleClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// Add authentication middleware
app.use(authenticateApiKey({ ts }));

// Add error handler
app.on('error', errorHandler());

app.use(async (ctx) => {
  const tenant = ctx.tenant;
  ctx.body = {
    message: `Hello, ${tenant.name}!`,
    tenant,
  };
});

app.listen(3000);
```

## Middleware Functions

Each middleware can be used individually for fine-grained control over your Koa application.

### `authenticateApiKey`

Resolves the tenant from an API key in the `Authorization` header. Sets `ctx.tenant` and `ctx.apiKey`.

```typescript
import { authenticateApiKey } from '@tenantscale/koa';

// Apply globally
app.use(authenticateApiKey({ ts }));

// Apply to specific routes using conditional middleware
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/protected')) {
    await authenticateApiKey({ ts })(ctx, next);
  } else {
    await next();
  }
});
```

**Header format:** `Authorization: Bearer tsk_live_<key>`

**On success:** Populates `ctx.tenant` and `ctx.apiKey` with resolved objects.

**On failure:** Throws `InvalidApiKeyError` (caught by error handler → 401 response).

### `requireScope`

Restricts access to API keys that have a specific scope.

```typescript
import { requireScope } from '@tenantscale/koa';

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/admin')) {
    await requireScope({ ts }, 'admin')(ctx, next);
  } else {
    await next();
  }
});

// Require multiple scopes (must have ALL)
app.use(async (ctx, next) => {
  if (ctx.path === '/api/billing') {
    await requireScope({ ts }, ['admin', 'billing:write'])(ctx, next);
  } else {
    await next();
  }
});
```

**Note:** Must be used after `authenticateApiKey()` so `ctx.apiKey` is available.

### `requirePlanFeature`

Restricts access to tenants with a specific plan feature.

```typescript
import { requirePlanFeature } from '@tenantscale/koa';

app.use(async (ctx, next) => {
  if (ctx.path === '/api/audit-logs') {
    await requirePlanFeature({ ts }, 'audit-log')(ctx, next);
  } else {
    await next();
  }
});

// Require the 'custom-domain' feature
app.use(async (ctx, next) => {
  if (ctx.path === '/api/domains') {
    await requirePlanFeature({ ts }, 'custom-domain')(ctx, next);
  } else {
    await next();
  }
});
```

**Note:** Must be used after `authenticateApiKey()` so `ctx.tenant` is available.

### `requirePlanLimit`

Checks that the tenant's current usage for a given metric is within their plan limit.

```typescript
import { requirePlanLimit } from '@tenantscale/koa';

// Check the 'api-requests' limit
app.use(async (ctx, next) => {
  if (ctx.path === '/api/data') {
    await requirePlanLimit({ ts }, 'api-requests')(ctx, next);
  } else {
    await next();
  }
});

// Check with a custom increment
app.use(async (ctx, next) => {
  if (ctx.path === '/api/bulk') {
    await requirePlanLimit({ ts }, 'api-requests', { increment: 100 })(ctx, next);
  } else {
    await next();
  }
});
```

**Note:** Must be used after `authenticateApiKey()` so `ctx.tenant` is available.

### `rateLimitByApiKey`

Rate limits requests per API key.

```typescript
import { rateLimitByApiKey } from '@tenantscale/koa';

// Default daily limit
app.use(rateLimitByApiKey({ ts }));

// Custom limits
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/heavy')) {
    await rateLimitByApiKey({ ts }, { max: 1000, windowMs: 60 * 60 * 1000 })(ctx, next);
  } else {
    await next();
  }
});

// Different limits for different routes
const strictLimit = rateLimitByApiKey({ ts }, { max: 10, windowMs: 60 * 1000 });
app.use(async (ctx, next) => {
  if (ctx.path === '/api/login') {
    await strictLimit(ctx, next);
  } else {
    await next();
  }
});
```

### `rateLimitByIp`

Rate limits requests per IP address. Useful as a global rate limiter for unauthenticated routes.

```typescript
import { rateLimitByIp } from '@tenantscale/koa';

// Default: 100 requests per minute
app.use(rateLimitByIp({ ts }));

// Custom limit
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/public')) {
    await rateLimitByIp({ ts }, { max: 20, windowMs: 60 * 1000 })(ctx, next);
  } else {
    await next();
  }
});

// Strict rate for auth endpoints
const authLimit = rateLimitByIp({ ts }, { max: 5, windowMs: 60 * 1000 });
app.use(async (ctx, next) => {
  if (ctx.path === '/api/login' || ctx.path === '/api/register') {
    await authLimit(ctx, next);
  } else {
    await next();
  }
});
```

## Error Handler

The `errorHandler` function provides standardized error responses for all TenantScale errors.

```typescript
import { errorHandler } from '@tenantscale/koa';

app.on('error', errorHandler());
```

This handler automatically converts TenantScale errors to appropriate HTTP responses:

| Error | Status | Code |
|-------|--------|------|
| `InvalidApiKeyError` | 401 | `INVALID_API_KEY` |
| `InsufficientScopeError` | 403 | `INSUFFICIENT_SCOPE` |
| `PlanLimitExceededError` | 403 | `PLAN_LIMIT_EXCEEDED` |
| `RateLimitExceededError` | 429 | `RATE_LIMIT_EXCEEDED` |

Koa's error handling works differently from Express - errors are emitted as events rather than passed to error handling middleware. The `errorHandler` function is designed to work with Koa's `app.on('error')` event system.

### Custom Error Handler

If you need custom error handling, you can wrap the default handler:

```typescript
import { errorHandler } from '@tenantscale/koa';

const tenantScaleHandler = errorHandler();

app.on('error', (err, ctx) => {
  // Handle TenantScale errors with default handler
  tenantScaleHandler(err, ctx);
  
  // Add custom logging
  if (err.status >= 500) {
    console.error('Server error:', err);
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

## Working with Koa Context

### Global Middleware

Apply middleware globally using Koa's `app.use()`:

```typescript
import { authenticateApiKey, rateLimitByIp } from '@tenantscale/koa';

// Apply to all routes
app.use(authenticateApiKey({ ts }));

// Apply IP rate limiting before auth
app.use(rateLimitByIp({ ts }));
```

### Conditional Middleware

Apply middleware to specific routes using conditional logic:

```typescript
// Single route
app.use(async (ctx, next) => {
  if (ctx.path === '/api/protected') {
    await authenticateApiKey({ ts })(ctx, next);
  } else {
    await next();
  }
});

// Multiple middleware for specific routes
app.use(async (ctx, next) => {
  if (ctx.path === '/api/admin/action') {
    await authenticateApiKey({ ts })(ctx, next);
    await requireScope({ ts }, 'admin')(ctx, next);
    await requirePlanFeature({ ts }, 'admin-panel')(ctx, next);
  } else {
    await next();
  }
});
```

### Using Router Libraries

When using Koa router libraries like `@koa/router`, you can apply middleware at the route level:

```typescript
import Router from '@koa/router';
import { authenticateApiKey, requireScope } from '@tenantscale/koa';

const router = new Router();

// Apply middleware to specific routes
router.get('/api/protected', authenticateApiKey({ ts }), async (ctx) => {
  ctx.body = { tenant: ctx.tenant };
});

// Multiple middleware
router.post('/api/admin/action', 
  authenticateApiKey({ ts }),
  requireScope({ ts }, 'admin'),
  async (ctx) => {
    ctx.body = { success: true };
  }
);

app.use(router.routes());
```

## Context Properties

After applying TenantScale middleware, the following properties are available on the Koa context:

| Property | Type | Set By | Description |
|----------|------|--------|-------------|
| `ctx.tenant` | `Tenant` | `authenticateApiKey()` | Resolved tenant object |
| `ctx.apiKey` | `ApiKey` | `authenticateApiKey()` | Resolved API key record |
| `ctx.rateLimitInfo` | `RateLimitInfo` | `rateLimitByApiKey()` / `rateLimitByIp()` | Current rate limit state |

```typescript
interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp
}
```

### Using Context Properties

```typescript
app.use(authenticateApiKey({ ts }));

app.use(async (ctx) => {
  const tenant = ctx.tenant;
  const apiKey = ctx.apiKey;

  ctx.body = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    plan: tenant.plan.name,
    features: tenant.features,
    apiKeyId: apiKey.id,
    apiKeyScopes: apiKey.scopes,
  };
});
```

## Complete Koa App Example

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import {
  authenticateApiKey,
  requireScope,
  requirePlanFeature,
  requirePlanLimit,
  rateLimitByApiKey,
  rateLimitByIp,
  errorHandler,
} from '@tenantscale/koa';
import { createTenantScaleClient } from '@tenantscale/sdk';

// --- Initialize Koa ---
const app = new Koa();
const router = new Router();

// --- Initialize TenantScale ---
const ts = createTenantScaleClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// --- Global middleware ---

// IP rate limiter (before auth, for unauthenticated routes)
app.use(rateLimitByIp({ ts }, { max: 30, windowMs: 60 * 1000 }));

// Error handler
app.on('error', errorHandler());

// --- Public routes (no auth required) ---

router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
});

router.get('/api/public/pricing', async (ctx) => {
  ctx.body = {
    plans: [
      { id: 'free', name: 'Free', requests: 10000 },
      { id: 'pro', name: 'Pro', requests: 50000 },
      { id: 'enterprise', name: 'Enterprise', requests: -1 },
    ],
  };
});

// --- Authenticated routes ---

// Apply authentication to all /api routes
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api')) {
    await authenticateApiKey({ ts })(ctx, next);
  } else {
    await next();
  }
});

// Current tenant info
router.get('/api/me', async (ctx) => {
  ctx.body = {
    tenant: ctx.tenant,
    apiKey: ctx.apiKey,
  };
});

// --- Admin routes (scoped) ---
router.get('/api/admin/tenants', 
  authenticateApiKey({ ts }),
  requireScope({ ts }, 'admin'),
  async (ctx) => {
    const { listTenants } = await import('@tenantscale/sdk');
    const tenants = await listTenants();
    ctx.body = { tenants };
  }
);

// --- Feature-gated routes ---
router.get('/api/audit-logs',
  authenticateApiKey({ ts }),
  requirePlanFeature({ ts }, 'audit-log'),
  async (ctx) => {
    const tenant = ctx.tenant;
    const { getAuditLogs } = await import('@tenantscale/sdk');
    const logs = await getAuditLogs({ tenantId: tenant.id });
    ctx.body = { logs };
  }
);

// --- Plan-limit-gated routes ---
router.post('/api/bulk/import',
  authenticateApiKey({ ts }),
  requirePlanLimit({ ts }, 'bulk-import', { increment: 1 }),
  async (ctx) => {
    // Process bulk import...
    ctx.body = { imported: true };
  }
);

// --- Rate-limited routes ---
const sensitiveRateLimit = rateLimitByApiKey({ ts }, { max: 100, windowMs: 60 * 1000 });
router.post('/api/webhooks/send',
  authenticateApiKey({ ts }),
  sensitiveRateLimit,
  async (ctx) => {
    // Send webhook...
    ctx.body = { sent: true };
  }
);

app.use(router.routes());
app.use(router.allowedMethods());

// --- Start server ---
app.listen(3000);
console.log('Server running on http://localhost:3000');
```

## Type Safety

Koa's type system allows you to augment the context type for full type safety.

```typescript
import { Tenant, ApiKey } from '@tenantscale/sdk';

// Augment Koa context type
declare module 'koa' {
  interface DefaultContext {
    tenant: Tenant;
    apiKey: ApiKey;
  }
}
```

After this declaration, TypeScript will recognize `ctx.tenant` and `ctx.apiKey` as properly typed throughout your application.

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

The Koa adapter provides comprehensive tenant management features:

- **API key authentication**: Validates API keys from the `Authorization` header
- **Portal session validation**: Support for portal-based authentication
- **Scope and role checks**: Restrict access based on API key scopes and tenant roles
- **Plan limit enforcement**: Ensure tenants stay within their plan limits
- **Rate limiting**: Per-API key and per-IP rate limiting with configurable storage backends
- **Audit logging**: Automatic audit trail for tenant operations
- **Standardized error responses**: Consistent error format across all endpoints

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/koa](https://github.com/TenantScale/sdk/tree/main/packages/koa)
