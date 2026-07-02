# Hono Adapter

`@tenantscale/hono` provides Hono-style middleware for the TenantScale SDK. It integrates seamlessly with Hono's middleware chain and provides type-safe tenant access via `c.get('tenant')`.

## Installation

```bash
npm install @tenantscale/hono
```

**Peer dependencies:** Requires `hono@^4.0.0` and `@tenantscale/sdk@^1.0.0`.

## Quick Start

```typescript
import { Hono } from 'hono';
import { tenantScaleMiddleware } from '@tenantscale/hono';

const app = new Hono();

app.use('*', tenantScaleMiddleware());

app.get('/api/me', (c) => {
  const tenant = c.get('tenant');
  return c.json({
    message: `Hello, ${tenant.name}!`,
    tenant,
  });
});

export default app;
```

## `tenantScaleMiddleware()`

The main entry point. Applies all TenantScale middleware to matching routes.

```typescript
import { tenantScaleMiddleware } from '@tenantscale/hono';

// Apply globally
app.use('*', tenantScaleMiddleware());

// Apply to a route group
const api = new Hono();
api.use('*', tenantScaleMiddleware());
app.route('/api', api);
```

### Options

```typescript
interface TenantScaleMiddlewareOptions {
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
}
```

## Individual Middleware Functions

Each middleware can be imported individually for fine-grained control.

### `authenticateApiKey`

Resolves the tenant from an API key in the `Authorization` header. Sets `c.get('tenant')` and `c.get('apiKey')`.

```typescript
import { authenticateApiKey } from '@tenantscale/hono';

app.get('/api/protected', authenticateApiKey(), (c) => {
  const tenant = c.get('tenant');
  return c.json({ tenant });
});
```

**Header:** `Authorization: Bearer tsk_live_<key>`

**Sets context variables:** `tenant` (Tenant), `apiKey` (ApiKey)

### `requireScope`

Restricts access to API keys with specific scopes.

```typescript
import { requireScope } from '@tenantscale/hono';

app.delete(
  '/api/admin/tenants/:id',
  authenticateApiKey(),
  requireScope('admin'),
  (c) => c.json({ deleted: true })
);

// Multiple scopes (AND logic)
app.post(
  '/api/billing',
  authenticateApiKey(),
  requireScope(['admin', 'billing:write']),
  (c) => c.json({ ok: true })
);
```

### `requirePlanFeature`

Restricts access to tenants with a specific plan feature.

```typescript
import { requirePlanFeature } from '@tenantscale/hono';

app.get(
  '/api/audit-logs',
  authenticateApiKey(),
  requirePlanFeature('audit-log'),
  (c) => {
    const tenant = c.get('tenant');
    return c.json({ tenantId: tenant.id, logs: [] });
  }
);
```

### `requirePlanLimit`

Checks that the tenant's usage is within their plan limit.

```typescript
import { requirePlanLimit } from '@tenantscale/hono';

app.get(
  '/api/check-limit',
  authenticateApiKey(),
  requirePlanLimit('api-requests'),
  (c) => {
    const tenant = c.get('tenant');
    return c.json({
      limit: tenant.limits['api-requests'],
      usage: tenant.usage['api-requests'],
      remaining: tenant.limits['api-requests'] - tenant.usage['api-requests'],
    });
  }
);

// With custom increment
app.post(
  '/api/bulk',
  authenticateApiKey(),
  requirePlanLimit('api-requests', { increment: 100 }),
  (c) => c.json({ success: true })
);
```

### `rateLimitByApiKey`

Rate limits requests per API key.

```typescript
import { rateLimitByApiKey } from '@tenantscale/hono';

app.use('/api/heavy', rateLimitByApiKey({ max: 1000, windowMs: 60 * 60 * 1000 }));

// Strict rate for auth
app.post('/api/login', rateLimitByApiKey({ max: 10, windowMs: 60 * 1000 }));
```

### `rateLimitByIp`

Rate limits requests per IP address.

```typescript
import { rateLimitByIp } from '@tenantscale/hono';

app.use('/api/public', rateLimitByIp({ max: 30, windowMs: 60 * 1000 }));

app.post('/api/login', rateLimitByIp({ max: 5, windowMs: 60 * 1000 }));
```

## Complete Hono App Example

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import {
  authenticateApiKey,
  requireScope,
  requirePlanFeature,
  requirePlanLimit,
  rateLimitByApiKey,
  rateLimitByIp,
  InvalidApiKeyError,
  InsufficientScopeError,
  PlanLimitExceededError,
  RateLimitExceededError,
} from '@tenantscale/hono';
import type { Tenant, ApiKey } from '@tenantscale/sdk';

// --- Create app with type safety ---
const app = new Hono<{
  Variables: {
    tenant: Tenant;
    apiKey: ApiKey;
  };
}>();

// --- Global middleware ---
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['https://app.example.com'],
  credentials: true,
}));

// --- Health check (no auth) ---
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// --- Public routes (IP rate limited) ---
app.use('/api/public/*', rateLimitByIp({ max: 60, windowMs: 60_000 }));

app.get('/api/public/pricing', (c) => {
  return c.json({
    plans: [
      { id: 'free', name: 'Free', requests: 10000 },
      { id: 'pro', name: 'Pro', requests: 50000 },
      { id: 'enterprise', name: 'Enterprise', requests: -1 },
    ],
  });
});

// --- Authenticated routes ---
app.use('/api/*', authenticateApiKey());

// Current tenant info
app.get('/api/me', (c) => {
  const tenant = c.get('tenant');
  const apiKey = c.get('apiKey');
  return c.json({ tenant, apiKey });
});

// --- Admin routes (scoped) ---
app.use('/api/admin/*', requireScope('admin'));

app.get('/api/admin/tenants', async (c) => {
  const { listTenants } = await import('@tenantscale/sdk');
  const tenants = await listTenants();
  return c.json({ tenants });
});

app.get('/api/admin/stats', (c) => {
  const tenant = c.get('tenant');
  // Admin stats for the tenant
  return c.json({
    totalApiKeys: 42,
    totalRequests: 123456,
    tenantId: tenant.id,
  });
});

// --- Feature-gated routes ---
app.get(
  '/api/audit-logs',
  requirePlanFeature('audit-log'),
  async (c) => {
    const tenant = c.get('tenant');
    const { getAuditLogs } = await import('@tenantscale/sdk');
    const logs = await getAuditLogs({ tenantId: tenant.id });
    return c.json({ logs });
  }
);

app.get(
  '/api/analytics/dashboard',
  requirePlanFeature('analytics'),
  async (c) => {
    const { getAnalytics } = await import('@tenantscale/sdk');
    const analytics = await getAnalytics();
    return c.json({ analytics });
  }
);

// --- Plan-limit-gated routes ---
app.post(
  '/api/bulk/import',
  requirePlanLimit('bulk-import', { increment: 1 }),
  async (c) => {
    const body = await c.req.json();
    // Process import...
    return c.json({ imported: true, count: body.items?.length || 0 });
  }
);

// --- Rate-limited routes ---
app.post(
  '/api/webhooks/send',
  rateLimitByApiKey({ max: 50, windowMs: 60_000 }),
  async (c) => {
    const body = await c.req.json();
    // Send webhook...
    return c.json({ sent: true });
  }
);

// --- Error handler ---
app.onError((err, c) => {
  if (err instanceof InvalidApiKeyError) {
    return c.json({
      error: 'Invalid or missing API key',
      code: 'INVALID_API_KEY',
    }, 401);
  }

  if (err instanceof InsufficientScopeError) {
    return c.json({
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_SCOPE',
      requiredScope: err.requiredScope,
    }, 403);
  }

  if (err instanceof PlanLimitExceededError) {
    return c.json({
      error: 'Plan limit exceeded',
      code: 'PLAN_LIMIT_EXCEEDED',
      limit: err.limit,
      usage: err.usage,
    }, 403);
  }

  if (err instanceof RateLimitExceededError) {
    return c.json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter,
    }, 429);
  }

  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  }, 500);
});

// --- Not found handler ---
app.notFound((c) => {
  return c.json({
    error: 'Route not found',
    code: 'NOT_FOUND',
  }, 404);
});

export default app;
```

## Type Safety with Generics

Hono's type system allows full type safety for the `tenant` and `apiKey` context values.

### Declaring Variables

```typescript
import type { Tenant, ApiKey } from '@tenantscale/sdk';

type AppVariables = {
  tenant: Tenant;
  apiKey: ApiKey;
};

const app = new Hono<{ Variables: AppVariables }>();
```

### Accessing Typed Values

```typescript
app.get('/api/me', authenticateApiKey(), (c) => {
  // Fully typed — no casting needed
  const tenant: Tenant = c.get('tenant');
  const apiKey: ApiKey = c.get('apiKey');

  const id: string = tenant.id;
  const name: string = tenant.name;
  const planName: string = tenant.plan.name;
  const features: string[] = tenant.features;
  const limits: Record<string, number> = tenant.limits;

  return c.json({ tenant, apiKey });
});
```

### Per-route Type Narrowing

```typescript
// With scope narrowing, TypeScript knows the tenant has 'admin' feature
app.get(
  '/api/admin/users',
  authenticateApiKey(),
  requireScope('admin'),
  (c) => {
    const tenant = c.get('tenant');
    // tenant is narrowed — admin scope confirmed
    return c.json({ users: [] });
  }
);
```

## Error Reference

| Error Class | HTTP Status | Code | Context Variable |
|-------------|-------------|------|------------------|
| `InvalidApiKeyError` | 401 | `INVALID_API_KEY` | N/A |
| `InsufficientScopeError` | 403 | `INSUFFICIENT_SCOPE` | `err.requiredScope` |
| `PlanLimitExceededError` | 403 | `PLAN_LIMIT_EXCEEDED` | `err.limit`, `err.usage` |
| `RateLimitExceededError` | 429 | `RATE_LIMIT_EXCEEDED` | `err.retryAfter` |

## Context Variables

After applying TenantScale middleware, the following variables are available via `c.get()`:

| Variable | Type | Set By | Description |
|----------|------|--------|-------------|
| `tenant` | `Tenant` | `authenticateApiKey()` | Resolved tenant object |
| `apiKey` | `ApiKey` | `authenticateApiKey()` | Resolved API key record |
| `rateLimitInfo` | `RateLimitInfo` | `rateLimitByApiKey()` / `rateLimitByIp()` | Current rate limit state |

```typescript
interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp
}
```

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/hono](https://github.com/TenantScale/sdk/tree/main/packages/hono)
