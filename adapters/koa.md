# Koa Adapter

`@tenantscale/koa` provides Koa middleware for the TenantScale SDK. Use it to add multi-tenant API key authentication, portal session validation, plan enforcement, rate limiting, and audit logging to any Koa application.

## Installation

```bash
npm install @tenantscale/koa
```

**Peer dependencies:** Requires `koa` and `@tenantscale/sdk`.

## Quick Start

```typescript
import Koa from 'koa';
import { TenantScale } from '@tenantscale/sdk';
import { authenticateApiKey, errorHandler } from '@tenantscale/koa';

const ts = new TenantScale({ /* SDK config */ });
const app = new Koa();

// Map TenantScale errors to structured JSON responses
app.use(errorHandler());

// Authenticate every request
app.use(authenticateApiKey({ ts }));

app.use(async (ctx) => {
  ctx.body = { tenantId: ctx.tenantId };
});

app.listen(3000);
```

## Adapter Options

Every middleware takes a `KoaAdapterOptions` object as its first argument:

```typescript
interface KoaAdapterOptions {
  /** TenantScale SDK instance */
  ts: TenantScale;

  /** Automatically log an audit event on successful API key authentication. Defaults to true. */
  audit?: boolean;

  /** Header name for API key authentication. Defaults to 'x-api-key'. */
  apiKeyHeader?: string;

  /** Header name for portal session authentication. Defaults to 'authorization'. */
  authHeader?: string;
}
```

## Middleware

All middleware are standard Koa `(ctx, next)` functions. Register them with `app.use()` or with a router such as `@koa/router`.

### `authenticateApiKey`

Resolves the tenant from an API key header (default: `x-api-key`). Sets `ctx.tenantKey` and `ctx.tenantId`, and (unless `audit: false`) logs an `api_key.authenticated` audit event.

```typescript
import { authenticateApiKey } from '@tenantscale/koa';

// Global
app.use(authenticateApiKey({ ts }));

// With @koa/router, per route group
router.use('/api', authenticateApiKey({ ts }));

// Custom header
app.use(authenticateApiKey({ ts, apiKeyHeader: 'x-tenant-key' }));
```

**On failure:** Responds `401` with code `AUTH_FAILED`.

### `requireScope`

Restricts access to API keys that have specific scopes. Must run after `authenticateApiKey` so `ctx.tenantKey` is available.

```typescript
import { authenticateApiKey, requireScope } from '@tenantscale/koa';

router.delete(
  '/api/tenants/:id',
  authenticateApiKey({ ts }),
  requireScope({ ts }, 'admin'),
  handler,
);

// Multiple scopes
router.post(
  '/api/billing',
  authenticateApiKey({ ts }),
  requireScope({ ts }, 'admin', 'billing:write'),
  handler,
);
```

**On failure:** Responds `403` with code `MISSING_SCOPE`.

### `requirePortalSession`

Validates a portal session token from the `Authorization` header (`Bearer <token>` format). Sets `ctx.portalSession`, and `ctx.tenantId` when the session is tenant-bound.

```typescript
import { requirePortalSession } from '@tenantscale/koa';

router.get('/portal/dashboard', requirePortalSession({ ts }), handler);
```

**On failure:** Responds `401` with code `SESSION_INVALID`.

### `requirePortalRole`

Restricts access to portal sessions with specific roles. Must run after `requirePortalSession`.

```typescript
import { requirePortalSession, requirePortalRole } from '@tenantscale/koa';

router.post(
  '/portal/members/invite',
  requirePortalSession({ ts }),
  requirePortalRole({ ts }, 'owner', 'admin'),
  handler,
);
```

**On failure:** Responds `403` with code `MISSING_ROLE`.

### `requireSuperAdmin`

Restricts access to super admin portal sessions. Must run after `requirePortalSession`.

```typescript
import { requirePortalSession, requireSuperAdmin } from '@tenantscale/koa';

router.get(
  '/admin/tenants',
  requirePortalSession({ ts }),
  requireSuperAdmin({ ts }),
  handler,
);
```

**On failure:** Responds `403` with code `NOT_SUPER_ADMIN`.

### `requirePlanLimit`

Checks that the tenant's current usage of a feature is within their plan limit. Requires a resolved `ctx.tenantId`, so it must run after `authenticateApiKey` or `requirePortalSession`. A `null` plan limit means unlimited and the check passes.

The current count can be a number or a (possibly async) function of the context:

```typescript
import { authenticateApiKey, requirePlanLimit } from '@tenantscale/koa';

router.post(
  '/api/projects',
  authenticateApiKey({ ts }),
  requirePlanLimit({ ts }, 'projects', async (ctx) => {
    return countProjects(ctx.tenantId);
  }),
  handler,
);
```

**On failure:** Responds `403` with code `PLAN_LIMIT_REACHED` (details include `limit` and `current` when handled by `errorHandler`).

### `rateLimitByApiKey`

Enforces the tenant's daily request limit per API key. Must run after `authenticateApiKey`.

```typescript
import { authenticateApiKey, rateLimitByApiKey } from '@tenantscale/koa';

app.use(authenticateApiKey({ ts }));
app.use(rateLimitByApiKey({ ts }));
```

**On failure:** Responds `429` with code `DAILY_LIMIT_EXCEEDED`.

### `rateLimitByIp`

Rate limits by client IP (resolved from `x-forwarded-for`, then `x-real-ip`). Useful for unauthenticated routes such as signup endpoints. Sets a `Retry-After` header when blocking.

```typescript
import { rateLimitByIp } from '@tenantscale/koa';

router.post('/api/signup', rateLimitByIp({ ts }), handler);
```

**On failure:** Responds `429` with code `IP_RATE_LIMITED`.

### `auditLog`

Writes an audit event for the route (fire-and-forget; failures are logged, never block the request). Requires a resolved `ctx.tenantId`, otherwise it is a no-op.

```typescript
import { authenticateApiKey, auditLog } from '@tenantscale/koa';

router.post(
  '/api/tickets',
  authenticateApiKey({ ts }),
  auditLog({ ts }, {
    action: 'ticket.created',
    resource: '/api/tickets',
    getDetails: (ctx) => ({ body: ctx.request.body }),
  }),
  handler,
);
```

## Error Handling

`errorHandler()` returns a Koa middleware that wraps downstream middleware in a try/catch and maps `TenantScaleError` subclasses to structured JSON responses, adds `details` for plan/rate limit errors, and sets `Retry-After` when applicable. Non-TenantScale errors become a `500` (the message is hidden when `NODE_ENV=production`).

Register it **first**, so it wraps everything downstream:

```typescript
import { errorHandler } from '@tenantscale/koa';

app.use(errorHandler());
```

Error response shape:

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
```

## Complete Koa App Example

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import { TenantScale } from '@tenantscale/sdk';
import {
  authenticateApiKey,
  requireScope,
  requirePortalSession,
  requireSuperAdmin,
  requirePlanLimit,
  rateLimitByApiKey,
  rateLimitByIp,
  auditLog,
  errorHandler,
} from '@tenantscale/koa';

const ts = new TenantScale({ /* SDK config */ });
const app = new Koa();
const router = new Router();

app.use(errorHandler());

// --- Public routes ---
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

router.post('/api/signup', rateLimitByIp({ ts }), (ctx) => {
  ctx.body = { created: true };
});

// --- API key routes ---
const auth = authenticateApiKey({ ts });
const rateLimit = rateLimitByApiKey({ ts });

router.get('/api/me', auth, (ctx) => {
  ctx.body = { tenantId: ctx.tenantId };
});

router.post(
  '/api/projects',
  auth,
  rateLimit,
  requireScope({ ts }, 'projects:write'),
  requirePlanLimit({ ts }, 'projects', (ctx) => countProjects(ctx.tenantId)),
  auditLog({ ts }, { action: 'project.created', resource: '/api/projects' }),
  (ctx) => {
    ctx.body = { created: true };
  },
);

// --- Portal routes ---
router.get(
  '/admin/tenants',
  requirePortalSession({ ts }),
  requireSuperAdmin({ ts }),
  (ctx) => {
    ctx.body = { tenants: [] };
  },
);

app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
```

## Context State

After the middleware run, the context carries:

| Property | Set by | Type |
|----------|--------|------|
| `ctx.tenantKey` | `authenticateApiKey` | `ApiKeyInfo` |
| `ctx.tenantId` | `authenticateApiKey` / `requirePortalSession` | `string` |
| `ctx.portalSession` | `requirePortalSession` | `PortalSessionInfo` |

`ApiKeyInfo` and `PortalSessionInfo` are re-exported from `@tenantscale/koa` for convenience.

## Error Reference

| Middleware | HTTP Status | Code |
|------------|-------------|------|
| `authenticateApiKey` | 401 | `AUTH_FAILED` |
| `requirePortalSession` | 401 | `SESSION_INVALID` |
| `requireScope` | 403 | `MISSING_SCOPE` |
| `requirePortalRole` | 403 | `MISSING_ROLE` |
| `requireSuperAdmin` | 403 | `NOT_SUPER_ADMIN` |
| `requirePlanLimit` | 403 | `PLAN_LIMIT_REACHED` |
| `rateLimitByApiKey` | 429 | `DAILY_LIMIT_EXCEEDED` |
| `rateLimitByIp` | 429 | `IP_RATE_LIMITED` |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/koa](https://github.com/TenantScale/sdk/tree/main/packages/koa)
