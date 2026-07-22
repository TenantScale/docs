# Fastify Adapter

`@tenantscale/fastify` provides Fastify `preHandler` hooks for the TenantScale SDK. Use it to add multi-tenant API key authentication, portal session validation, plan enforcement, rate limiting, and audit logging to any Fastify application.

## Installation

```bash
npm install @tenantscale/fastify
```

**Peer dependencies:** Requires `fastify` and `@tenantscale/sdk`.

## Quick Start

```typescript
import Fastify from 'fastify';
import { TenantScale } from '@tenantscale/sdk';
import { authenticateApiKey, errorHandler } from '@tenantscale/fastify';

const ts = new TenantScale({ /* SDK config */ });
const app = Fastify();

// Map TenantScale errors to structured JSON responses
app.setErrorHandler(errorHandler());

// Authenticate every route
app.addHook('preHandler', authenticateApiKey({ ts }));

app.get('/api/me', async (req) => {
  return { tenantId: req.tenantId };
});

app.listen({ port: 3000 });
```

## Adapter Options

Every hook takes a `FastifyAdapterOptions` object as its first argument:

```typescript
interface FastifyAdapterOptions {
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

## Hooks

All hooks are async `(req, reply)` functions. Register them globally with `app.addHook('preHandler', ...)` or per-route via the `preHandler` route option.

### `authenticateApiKey`

Resolves the tenant from an API key header (default: `x-api-key`). Decorates the request with `req.tenantKey` and `req.tenantId`, and (unless `audit: false`) logs an `api_key.authenticated` audit event.

```typescript
import { authenticateApiKey } from '@tenantscale/fastify';

// Global
app.addHook('preHandler', authenticateApiKey({ ts }));

// Per-route
app.get('/api/protected', { preHandler: [authenticateApiKey({ ts })] }, handler);

// Custom header
app.addHook('preHandler', authenticateApiKey({ ts, apiKeyHeader: 'x-tenant-key' }));
```

**On failure:** Replies `401` with code `AUTH_FAILED`.

### `requireScope`

Restricts access to API keys that have specific scopes. Must run after `authenticateApiKey` so `req.tenantKey` is available.

```typescript
import { authenticateApiKey, requireScope } from '@tenantscale/fastify';

app.delete('/api/tenants/:id', {
  preHandler: [
    authenticateApiKey({ ts }),
    requireScope({ ts }, 'admin'),
  ],
}, handler);

// Multiple scopes
app.post('/api/billing', {
  preHandler: [
    authenticateApiKey({ ts }),
    requireScope({ ts }, 'admin', 'billing:write'),
  ],
}, handler);
```

**On failure:** Replies `403` with code `MISSING_SCOPE`.

### `requirePortalSession`

Validates a portal session token from the `Authorization` header (`Bearer <token>` format). Decorates the request with `req.portalSession`, and `req.tenantId` when the session is tenant-bound.

```typescript
import { requirePortalSession } from '@tenantscale/fastify';

app.get('/portal/dashboard', {
  preHandler: [requirePortalSession({ ts })],
}, handler);
```

**On failure:** Replies `401` with code `SESSION_INVALID`.

### `requirePortalRole`

Restricts access to portal sessions with specific roles. Must run after `requirePortalSession`.

```typescript
import { requirePortalSession, requirePortalRole } from '@tenantscale/fastify';

app.post('/portal/members/invite', {
  preHandler: [
    requirePortalSession({ ts }),
    requirePortalRole({ ts }, 'owner', 'admin'),
  ],
}, handler);
```

**On failure:** Replies `403` with code `MISSING_ROLE`.

### `requireSuperAdmin`

Restricts access to super admin portal sessions. Must run after `requirePortalSession`.

```typescript
import { requirePortalSession, requireSuperAdmin } from '@tenantscale/fastify';

app.get('/admin/tenants', {
  preHandler: [
    requirePortalSession({ ts }),
    requireSuperAdmin({ ts }),
  ],
}, handler);
```

**On failure:** Replies `403` with code `NOT_SUPER_ADMIN`.

### `requirePlanLimit`

Checks that the tenant's current usage of a feature is within their plan limit. Requires a resolved `req.tenantId`, so it must run after `authenticateApiKey` or `requirePortalSession`. A `null` plan limit means unlimited and the check passes.

The current count can be a number or a (possibly async) function of the request:

```typescript
import { authenticateApiKey, requirePlanLimit } from '@tenantscale/fastify';

app.post('/api/projects', {
  preHandler: [
    authenticateApiKey({ ts }),
    requirePlanLimit({ ts }, 'projects', async (req) => {
      return countProjects(req.tenantId);
    }),
  ],
}, handler);
```

**On failure:** Replies `403` with code `PLAN_LIMIT_REACHED` (details include `limit` and `current` when handled by `errorHandler`).

### `rateLimitByApiKey`

Enforces the tenant's daily request limit per API key. Must run after `authenticateApiKey`.

```typescript
import { authenticateApiKey, rateLimitByApiKey } from '@tenantscale/fastify';

app.addHook('preHandler', authenticateApiKey({ ts }));
app.addHook('preHandler', rateLimitByApiKey({ ts }));
```

**On failure:** Replies `429` with code `DAILY_LIMIT_EXCEEDED`.

### `rateLimitByIp`

Rate limits by client IP (resolved from `x-forwarded-for`, then `x-real-ip`). Useful for unauthenticated routes such as signup endpoints. Sets a `Retry-After` header when blocking.

```typescript
import { rateLimitByIp } from '@tenantscale/fastify';

app.post('/api/signup', {
  preHandler: [rateLimitByIp({ ts })],
}, handler);
```

**On failure:** Replies `429` with code `IP_RATE_LIMITED`.

### `auditLog`

Writes an audit event for the route (fire-and-forget; failures are logged, never block the request). Requires a resolved `req.tenantId`, otherwise it is a no-op.

```typescript
import { authenticateApiKey, auditLog } from '@tenantscale/fastify';

app.post('/api/tickets', {
  preHandler: [
    authenticateApiKey({ ts }),
    auditLog({ ts }, {
      action: 'ticket.created',
      resource: '/api/tickets',
      getDetails: (req) => ({ body: req.body }),
    }),
  ],
}, handler);
```

## Error Handling

`errorHandler()` returns a Fastify error handler that maps `TenantScaleError` subclasses to structured JSON responses, adds `details` for plan/rate limit errors, and sets `Retry-After` when applicable. Non-TenantScale errors become a `500` (the message is hidden when `NODE_ENV=production`).

```typescript
import { errorHandler } from '@tenantscale/fastify';

app.setErrorHandler(errorHandler());
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

## Complete Fastify App Example

```typescript
import Fastify from 'fastify';
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
} from '@tenantscale/fastify';

const ts = new TenantScale({ /* SDK config */ });
const app = Fastify();

app.setErrorHandler(errorHandler());

// --- Public routes ---
app.get('/health', async () => ({ status: 'ok' }));

app.post('/api/signup', {
  preHandler: [rateLimitByIp({ ts })],
}, async () => ({ created: true }));

// --- API key routes ---
const auth = authenticateApiKey({ ts });
const rateLimit = rateLimitByApiKey({ ts });

app.get('/api/me', { preHandler: [auth] }, async (req) => ({
  tenantId: req.tenantId,
}));

app.post('/api/projects', {
  preHandler: [
    auth,
    rateLimit,
    requireScope({ ts }, 'projects:write'),
    requirePlanLimit({ ts }, 'projects', (req) => countProjects(req.tenantId)),
    auditLog({ ts }, { action: 'project.created', resource: '/api/projects' }),
  ],
}, async () => ({ created: true }));

// --- Portal routes ---
app.get('/admin/tenants', {
  preHandler: [
    requirePortalSession({ ts }),
    requireSuperAdmin({ ts }),
  ],
}, async () => ({ tenants: [] }));

app.listen({ port: 3000 });
```

## Request Decorations

After the hooks run, the request carries:

| Property | Set by | Type |
|----------|--------|------|
| `req.tenantKey` | `authenticateApiKey` | `ApiKeyInfo` |
| `req.tenantId` | `authenticateApiKey` / `requirePortalSession` | `string` |
| `req.portalSession` | `requirePortalSession` | `PortalSessionInfo` |

`ApiKeyInfo` and `PortalSessionInfo` are re-exported from `@tenantscale/fastify` for convenience.

## Error Reference

| Hook | HTTP Status | Code |
|------|-------------|------|
| `authenticateApiKey` | 401 | `AUTH_FAILED` |
| `requirePortalSession` | 401 | `SESSION_INVALID` |
| `requireScope` | 403 | `MISSING_SCOPE` |
| `requirePortalRole` | 403 | `MISSING_ROLE` |
| `requireSuperAdmin` | 403 | `NOT_SUPER_ADMIN` |
| `requirePlanLimit` | 403 | `PLAN_LIMIT_REACHED` |
| `rateLimitByApiKey` | 429 | `DAILY_LIMIT_EXCEEDED` |
| `rateLimitByIp` | 429 | `IP_RATE_LIMITED` |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/fastify](https://github.com/TenantScale/sdk/tree/main/packages/fastify)
