# Authentication

TenantScale provides three authentication mechanisms: **API key authentication**, **scope-based authorization**, and **portal session authentication**. These can be used independently or chained together for defense in depth.

## authenticateApiKey()

The primary authentication middleware. It validates the API key from the `Authorization` header and resolves the tenant.

```typescript
import { TenantScale } from '@tenantscale/sdk'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
})

// Apply globally
app.use('/api/*', ts.authenticateApiKey())

// Or per-route
app.get('/api/orders', ts.authenticateApiKey(), handler)
```

### Header Format

The SDK expects the API key in the `Authorization` header using the `Bearer` scheme:

```
Authorization: Bearer tsk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

The `Bearer` prefix is required. Keys in other formats (e.g., `Basic`, custom headers) are not supported.

### How It Works

1. Extracts the `Bearer` token from the `Authorization` header
2. Decodes the key prefix to identify the key in the database
3. Validates the key is active (not revoked or expired)
4. Resolves the owning tenant
5. Attaches `tenant`, `apiKey`, and `plan` to the request context
6. Passes control to the next handler

### Error Responses

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Missing `Authorization` header | 401 | `MISSING_API_KEY` |
| Invalid key format | 401 | `INVALID_API_KEY` |
| Key not found | 401 | `INVALID_API_KEY` |
| Key has been revoked | 401 | `KEY_REVOKED` |
| Key has expired | 401 | `KEY_EXPIRED` |
| Tenant not found | 401 | `TENANT_NOT_FOUND` |

**Response body:**

```json
{
  "error": {
    "code": "MISSING_API_KEY",
    "message": "Missing API key. Provide a Bearer token in the Authorization header."
  }
}
```

```json
{
  "error": {
    "code": "KEY_EXPIRED",
    "message": "API key has expired (expired at 2024-12-31T23:59:59Z). Create a new key.",
    "expired_at": "2024-12-31T23:59:59Z"
  }
}
```

```json
{
  "error": {
    "code": "KEY_REVOKED",
    "message": "API key has been revoked (reason: Rotation). Generate a new key.",
    "revoked_at": "2024-07-01T12:00:00Z",
    "reason": "Rotation"
  }
}
```

### Optional Authentication

For routes where authentication is optional (e.g., public read endpoints), pass `optional: true`:

```typescript
// Public endpoint — tenant info is available if authenticated, but not required
app.get('/api/products', ts.authenticateApiKey({ optional: true }), (req, res) => {
  if (req.tenant) {
    // Show tenant-specific pricing
    res.json({ products, pricingTier: req.plan?.name })
  } else {
    // Show public pricing
    res.json({ products, pricingTier: 'default' })
  }
})
```

When authentication is optional:
- A valid key resolves `req.tenant`, `req.apiKey`, and `req.plan`
- A missing or invalid key silently continues (no error response)
- `req.tenant` will be `undefined`

### Custom Header Name

You can use a custom header instead of `Authorization`:

```typescript
app.use('/api/*', ts.authenticateApiKey({
  headerName: 'X-API-Key',
  // Expected: X-API-Key: tsk_prod_a1b2c3d4...
}))
```

## requireScope()

Scope-based authorization middleware. Checks that the authenticated API key has the required scope(s).

```typescript
app.post(
  '/api/orders',
  ts.authenticateApiKey(),
  ts.requireScope('orders:write'),
  handler
)
```

### Scope Format

Scopes follow a `resource:action` convention:

| Scope Pattern | Example | Meaning |
|---------------|---------|---------|
| `<resource>:read` | `orders:read` | Read-only access to orders |
| `<resource>:write` | `orders:write` | Read and write access to orders |
| `<resource>:admin` | `orders:admin` | Full administrative access to orders |
| `<resource>:*` | `orders:*` | All actions on a resource |
| `*:read` | `*:read` | Read access to all resources |
| `*` | `*` | Super-admin access (all resources, all actions) |
| `admin` | `admin` | Admin-level access (same as `admin:*`) |

### Common Scopes

| Scope | Grants Access To |
|-------|-----------------|
| `orders:read` | `GET /api/orders`, `GET /api/orders/:id` |
| `orders:write` | `POST /api/orders`, `PUT /api/orders/:id` |
| `orders:admin` | All order operations + delete |
| `webhooks:read` | `GET /api/webhooks` |
| `webhooks:write` | `POST /api/webhooks`, `PUT /api/webhooks/:id` |
| `billing:read` | `GET /api/subscription`, `GET /api/invoices` |
| `admin` | All management API endpoints |
| `*` | Everything |

### Requiring Multiple Scopes

Pass multiple scope arguments — all must match (AND logic):

```typescript
// API key needs BOTH orders:read AND analytics:read
app.get(
  '/api/dashboard',
  ts.authenticateApiKey(),
  ts.requireScope('orders:read', 'analytics:read'),
  handler
)
```

### Requiring Any Scope (OR logic)

Use the `any` option to require at least one matching scope:

```typescript
// Key needs EITHER orders:read OR admin
app.get(
  '/api/orders',
  ts.authenticateApiKey(),
  ts.requireScope({ any: ['orders:read', 'admin'] }),
  handler
)
```

### Scope Hierarchy

Scopes follow a hierarchical matching pattern:

- `orders:*` matches `orders:read`, `orders:write`, `orders:admin`
- `*:read` matches `orders:read`, `users:read`, `analytics:read`
- `*` matches every scope
- `admin` matches `admin:*`, `admin:read`, `admin:write`

### Error Response

```json
{
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "API key requires scope 'orders:write'. Current key has scopes: [orders:read, webhooks:read].",
    "required_scope": "orders:write",
    "current_scopes": ["orders:read", "webhooks:read"]
  }
}
```

### Checking Scopes Programmatically

You can also check scopes without middleware:

```typescript
const hasScope = ts.auth.checkScope({
  requiredScope: 'orders:write',
  keyScopes: ['orders:read', 'orders:write'],
})
// true

// Check multiple scopes (all required)
const hasAll = ts.auth.checkScope({
  scope: ['orders:read', 'orders:write'],
  keyScopes: ['orders:read', 'orders:write', 'webhooks:read'],
  mode: 'all',
})
// true

// Check any scope
const hasAny = ts.auth.checkScope({
  scope: ['orders:admin', 'admin'],
  keyScopes: ['orders:read'],
  mode: 'any',
})
// false
```

## requirePortalSession()

Validates a customer portal session JWT. Portal sessions are short-lived tokens used for tenant-facing dashboard pages.

```typescript
app.get(
  '/portal/dashboard',
  ts.requirePortalSession(),
  (req, res) => {
    // req.tenant is resolved from the session
    res.json({ tenant: req.tenant, session: req.session })
  }
)
```

### How Portal Sessions Work

1. A tenant authenticates via your app (e.g., email + password)
2. Your backend calls `ts.auth.createPortalSession(tenantId, options)`
3. The returned JWT is set as a cookie or passed to the frontend
4. `requirePortalSession()` validates the JWT on each request
5. The tenant is resolved and attached to the request

### Creating Portal Sessions

```typescript
// Create a portal session for a tenant admin
const session = await ts.auth.createPortalSession({
  tenantId: 'tenant-acme-123',
  expiresIn: '1h',          // Short-lived
  metadata: {
    userId: 'user-456',
    email: 'admin@acme.com',
    role: 'admin',
  },
})

// Returns:
// {
//   token: 'eyJhbGciOiJIUzI1NiIs...',  // JWT
//   expiresAt: '2024-07-01T15:00:00Z',
//   tenantId: 'tenant-acme-123',
// }
```

### Cookie-Based Sessions

```typescript
// Create session and set as HTTP-only cookie
app.post('/portal/login', async (req, res) => {
  const { email, password } = req.body
  const tenant = await authenticateUser(email, password)

  const session = await ts.auth.createPortalSession({
    tenantId: tenant.id,
    expiresIn: '24h',
    metadata: { email, role: 'admin' },
  })

  res
    .cookie('ts_session', session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
    .redirect('/portal/dashboard')
})

// Protect portal routes
app.use('/portal/*', ts.requirePortalSession())
```

### Session Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | `string` | — | **Required.** Tenant to create session for |
| `expiresIn` | `string` | `'1h'` | Session TTL (human-readable: `'15m'`, `'24h'`, `'7d'`) |
| `metadata` | `Record<string, unknown>` | `{}` | Arbitrary data stored in the JWT |
| `cookieName` | `string` | `'ts_session'` | Cookie name (when using cookie extraction) |

### Portal Session Options

```typescript
app.use('/portal/*', ts.requirePortalSession({
  // Extract JWT from cookie instead of Authorization header
  source: 'cookie',
  cookieName: 'ts_session',
  // Maximum session age (rejects older sessions)
  maxAge: '24h',
  // Verify additional claims
  verify: {
    tenantId: true,  // Ensures the tenant still exists
  },
}))
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | `'header' \| 'cookie'` | `'header'` | Where to extract the JWT from |
| `cookieName` | `string` | `'ts_session'` | Cookie name when `source: 'cookie'` |
| `maxAge` | `string` | `null` | Reject sessions older than this duration |
| `verify` | `VerifyConfig` | — | Additional verification options |

### Error Responses

```json
{
  "error": {
    "code": "INVALID_SESSION",
    "message": "Portal session is invalid or expired. Please log in again.",
    "expired_at": "2024-07-01T15:00:00Z"
  }
}
```

## Middleware Chaining

Authentication and authorization middleware should be chained in a specific order:

```typescript
app.post(
  '/api/admin/webhooks',

  // 1. Authenticate first
  ts.authenticateApiKey(),

  // 2. Check scope
  ts.requireScope('admin', 'webhooks:write'),

  // 3. Plan enforcement
  ts.plans.requirePlanFeature('webhooks'),

  // 4. Handler
  async (req, res) => {
    const webhook = await ts.webhooks.create({
      url: req.body.url,
      events: req.body.events,
    })
    res.status(201).json(webhook)
  }
)
```

The order matters:
1. **Authenticate** — resolve who the requester is
2. **Authorize** — check what they're allowed to do
3. **Enforce plans** — check feature access and limits
4. **Rate limit** — protect against abuse
5. **Audit log** — record what happened

### Framework-Agnostic Middleware

The middleware functions work with any framework. Here's the Express signature:

```typescript
type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>
```

For other frameworks:

```typescript
// Hono
app.use('/api/*', ts.authenticateApiKey())
app.get('/api/orders', ts.requireScope('orders:read'), handler)

// Next.js App Router
import { withTenant } from '@tenantscale/next'
export const GET = withTenant({ ts }, async (req) => {
  // Already authenticated
  return Response.json({ tenant: req.tenant })
})
```

## Testing Authentication

```typescript
import { createAuthTest } from '@tenantscale/sdk/testing'

describe('authentication', () => {
  const test = createAuthTest({ ts })

  it('accepts valid API keys', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.validKey}`)

    expect(res.status).toBe(200)
    expect(res.body.tenant.id).toBe(test.tenantId)
  })

  it('rejects missing API keys', async () => {
    const res = await request(app).get('/api/orders')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('MISSING_API_KEY')
  })

  it('rejects revoked API keys', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.revokedKey}`)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('KEY_REVOKED')
  })
})
```
