# Express Adapter

`@tenantscale/express` provides Express-style middleware for the TenantScale SDK. Use it to add multi-tenant authentication, plan enforcement, and rate limiting to any Express application.

## Installation

```bash
npm install @tenantscale/express
```

**Peer dependencies:** Requires `express@^4.18.0` and `@tenantscale/sdk@^1.0.0`.

## Quick Start

```typescript
import express from 'express';
import { tenantScaleMiddleware } from '@tenantscale/express';

const app = express();

app.use(express.json());
app.use(tenantScaleMiddleware());

app.get('/api/me', (req, res) => {
  res.json({
    tenant: req.tenant,
    message: `Hello, ${req.tenant.name}!`,
  });
});

app.listen(3000);
```

## `tenantScaleMiddleware()`

The main entry point. Creates a router that applies all TenantScale middleware to matching routes.

```typescript
import { tenantScaleMiddleware } from '@tenantscale/express';

// Apply to all routes
app.use(tenantScaleMiddleware());

// Apply to a specific path prefix
app.use('/api', tenantScaleMiddleware());
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

## Middleware Functions

Each middleware can be used individually for granular control.

### `authenticateApiKey`

Resolves the tenant from an API key in the `Authorization` header. Sets `req.tenant` and `req.apiKey`.

```typescript
import { authenticateApiKey } from '@tenantscale/express';

// Protect specific routes
app.get('/api/protected', authenticateApiKey(), handler);

// Protect a group of routes
const router = express.Router();
router.use(authenticateApiKey());
```

**Header format:** `Authorization: Bearer tsk_live_<key>`

**On success:** Populates `req.tenant` with the resolved tenant object.

**On failure:** Throws `InvalidApiKeyError` (caught by error handler → 401 response).

### `requireScope`

Restricts access to API keys that have a specific scope.

```typescript
import { requireScope } from '@tenantscale/express';

// Require admin scope
app.delete('/api/tenants/:id', authenticateApiKey(), requireScope('admin'), handler);

// Require multiple scopes (must have ALL)
app.post('/api/billing', authenticateApiKey(), requireScope(['admin', 'billing:write']), handler);
```

**Note:** Must be used after `authenticateApiKey()` so `req.apiKey` is available.

### `requirePlanFeature`

Restricts access to tenants with a specific plan feature.

```typescript
import { requirePlanFeature } from '@tenantscale/express';

// Require the 'audit-log' feature
app.get('/api/audit-logs', authenticateApiKey(), requirePlanFeature('audit-log'), handler);

// Require the 'custom-domain' feature
app.post('/api/domains', authenticateApiKey(), requirePlanFeature('custom-domain'), handler);
```

**Note:** Must be used after `authenticateApiKey()` so `req.tenant` is available.

### `requirePlanLimit`

Checks that the tenant's current usage for a given metric is within their plan limit.

```typescript
import { requirePlanLimit } from '@tenantscale/express';

// Check the 'api-requests' limit
app.get('/api/data', authenticateApiKey(), requirePlanLimit('api-requests'), handler);

// Check with a custom increment
app.post('/api/bulk', authenticateApiKey(), requirePlanLimit('api-requests', { increment: 100 }), handler);

// Use the limit value in your handler
app.get('/api/check-limit', authenticateApiKey(), requirePlanLimit('api-requests', { track: true }), (req, res) => {
  res.json({
    limit: req.tenant.limits['api-requests'],
    usage: req.tenant.usage['api-requests'],
    remaining: req.tenant.limits['api-requests'] - req.tenant.usage['api-requests'],
  });
});
```

**Note:** Must be used after `authenticateApiKey()` so `req.tenant` is available.

### `rateLimitByApiKey`

Rate limits requests per API key.

```typescript
import { rateLimitByApiKey } from '@tenantscale/express';

// Default daily limit
app.use(rateLimitByApiKey());

// Custom limits
app.use('/api/heavy', rateLimitByApiKey({ max: 1000, windowMs: 60 * 60 * 1000 }));

// Different limits for different routes
const strictLimit = rateLimitByApiKey({ max: 10, windowMs: 60 * 1000 });
app.post('/api/login', strictLimit);
```

### `rateLimitByIp`

Rate limits requests per IP address. Useful as a global rate limiter for unauthenticated routes.

```typescript
import { rateLimitByIp } from '@tenantscale/express';

// Default: 100 requests per minute
app.use(rateLimitByIp());

// Custom limit
app.use('/api/public', rateLimitByIp({ max: 20, windowMs: 60 * 1000 }));

// Strict rate for auth endpoints
const authLimit = rateLimitByIp({ max: 5, windowMs: 60 * 1000 });
app.post('/api/login', authLimit);
app.post('/api/register', authLimit);
```

## Complete Express App Example

```typescript
import express, { Request, Response, NextFunction } from 'express';
import {
  tenantScaleMiddleware,
  authenticateApiKey,
  requireScope,
  requirePlanFeature,
  requirePlanLimit,
  rateLimitByApiKey,
  rateLimitByIp,
  TenantScaleError,
  InvalidApiKeyError,
  InsufficientScopeError,
  PlanLimitExceededError,
  RateLimitExceededError,
} from '@tenantscale/express';

const app = express();

// --- Global middleware ---
app.use(express.json());

// Global IP rate limiter (before auth, for unauthenticated routes)
app.use('/api/public', rateLimitByIp({ max: 30, windowMs: 60 * 1000 }));

// --- Public routes (no auth required) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/public/pricing', (_req, res) => {
  res.json({ plans: ['free', 'pro', 'enterprise'] });
});

// --- Authenticated routes ---
app.use('/api', tenantScaleMiddleware());

// Get current tenant info
app.get('/api/me', authenticateApiKey(), (req, res) => {
  res.json({
    tenant: req.tenant,
    apiKey: req.apiKey,
  });
});

// Admin-only: list all tenants
app.get(
  '/api/admin/tenants',
  authenticateApiKey(),
  requireScope('admin'),
  requirePlanFeature('admin-panel'),
  async (req, res) => {
    const { listTenants } = await import('@tenantscale/sdk');
    const tenants = await listTenants();
    res.json({ tenants });
  }
);

// Audit logs (pro feature)
app.get(
  '/api/audit-logs',
  authenticateApiKey(),
  requirePlanFeature('audit-log'),
  async (req, res) => {
    const { getAuditLogs } = await import('@tenantscale/sdk');
    const logs = await getAuditLogs({ tenantId: req.tenant.id });
    res.json({ logs });
  }
);

// Bulk API (checks plan limit)
app.post(
  '/api/bulk/import',
  authenticateApiKey(),
  requirePlanLimit('bulk-import', { increment: 1 }),
  async (req, res) => {
    // Process bulk import...
    res.json({ imported: true });
  }
);

// Strict rate limit for sensitive operations
const sensitiveRateLimit = rateLimitByApiKey({ max: 100, windowMs: 60 * 1000 });
app.post(
  '/api/webhooks/send',
  authenticateApiKey(),
  sensitiveRateLimit,
  async (req, res) => {
    // Send webhook...
    res.json({ sent: true });
  }
);

// --- Error handler ---
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof InvalidApiKeyError) {
    return res.status(401).json({
      error: 'Invalid or missing API key',
      code: 'INVALID_API_KEY',
    });
  }

  if (err instanceof InsufficientScopeError) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_SCOPE',
      requiredScope: err.requiredScope,
    });
  }

  if (err instanceof PlanLimitExceededError) {
    return res.status(403).json({
      error: 'Plan limit exceeded',
      code: 'PLAN_LIMIT_EXCEEDED',
      limit: err.limit,
      usage: err.usage,
    });
  }

  if (err instanceof RateLimitExceededError) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter,
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Type Augmentation

`@tenantscale/express` augments the Express `Request` type to include `tenant` and `apiKey` properties. This gives you full type safety in your route handlers.

```typescript
import { Tenant, ApiKey } from '@tenantscale/sdk';

// Augment the Express Request
declare global {
  namespace Express {
    interface Request {
      tenant: Tenant;
      apiKey: ApiKey;
    }
  }
}
```

If you use the `tenantScaleMiddleware()` function, the augmentation is applied automatically. If you import individual middleware functions, you may need to add the declaration above.

### Using the Types

```typescript
import { Request, Response } from 'express';

// req.tenant is fully typed
app.get('/api/me', authenticateApiKey(), (req: Request, res: Response) => {
  const tenantId: string = req.tenant.id;
  const planName: string = req.tenant.plan.name;
  const features: string[] = req.tenant.features;

  res.json({
    id: tenantId,
    plan: planName,
    features,
    usage: req.tenant.usage,
  });
});
```

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

## Testing

For integration tests, you can stub the TenantScale middleware:

```typescript
import { createTenantStub } from '@tenantscale/express/testing';

const mockTenant = createTenantStub({
  id: 'tenant_123',
  name: 'Test Tenant',
  plan: 'pro',
  features: ['audit-log', 'custom-domain'],
  limits: { 'api-requests': 50000 },
});

// Use in tests
app.use((req, _res, next) => {
  req.tenant = mockTenant;
  next();
});
```

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/express](https://github.com/TenantScale/sdk/tree/main/packages/express)
