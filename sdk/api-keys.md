# API Keys

API keys are the primary authentication mechanism for tenant-scoped API access. Each key belongs to a tenant and carries scopes that define what it can do.

## Key Format

API keys follow this format:

```
tsk_<env>_<64-char-hex>
```

| Segment | Description | Example |
|---------|-------------|---------|
| `tsk` | Prefix identifying TenantScale keys | `tsk` |
| `<env>` | Environment label | `prod`, `dev`, `test`, `staging` |
| `<64-char-hex>` | Cryptographically random payload | `a1b2c3d4e5f6...` (64 hex chars) |

The first 16 characters of the hex payload are stored as a `key_prefix` for database lookups. The full key is shown only once at creation time.

**Full key example:**
```
tsk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

### Storage

- The **full key** is never stored in plaintext — only a SHA-256 hash is persisted
- The **key prefix** (first 16 hex chars) is stored for identification
- The full key is displayed **once** at creation time

## Creating API Keys

```typescript
const newKey = await ts.apiKeys.create({
  tenantId: 'tenant-acme-123',
  name: 'Production API Key',
  scopes: ['orders:read', 'orders:write', 'webhooks:read'],
  expiresAt: '2025-12-31T23:59:59Z',
  rateLimitOverride: {
    maxRequests: 50000,
    window: '1d',
  },
})
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tenantId` | `string` | `req.tenant.id` | Tenant to create the key for |
| `name` | `string` | — | **Required.** Human-readable label |
| `scopes` | `string[]` | `[]` | Permission scopes for this key |
| `expiresAt` | `string \| null` | `null` | ISO 8601 expiry date. `null` = no expiry |
| `environment` | `'prod' \| 'dev' \| 'test' \| 'staging'` | `'prod'` | Environment label in the key prefix |
| `rateLimitOverride` | `RateLimitOverride \| null` | `null` | Custom rate limit that overrides plan limit |
| `metadata` | `Record<string, unknown>` | `{}` | Arbitrary metadata stored with the key |

### Return Type

```typescript
interface ApiKey {
  id: string
  tenant_id: string
  name: string
  key_prefix: string
  scopes: string[]
  environment: string
  expires_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  last_used_at: string | null
  rate_limit_override: RateLimitOverride | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// The full key is returned only on creation
interface CreatedApiKey extends ApiKey {
  key: string // Full key — show this once!
}
```

## Listing API Keys

```typescript
// List all keys for the current tenant
const keys = await ts.apiKeys.list()

// List with filters
const filtered = await ts.apiKeys.list({
  tenantId: 'tenant-acme-123',
  environment: 'prod',
  includeRevoked: false,
  scopes: ['orders:read'],
  limit: 20,
  offset: 0,
})
```

### Filters

| Filter | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | `string` | `req.tenant.id` | Filter by tenant |
| `environment` | `string` | — | Filter by environment (`'prod'`, `'dev'`, etc.) |
| `includeRevoked` | `boolean` | `false` | Include revoked keys |
| `includeExpired` | `boolean` | `false` | Include expired keys |
| `scopes` | `string[]` | — | Filter by required scopes (keys that have ALL) |
| `name` | `string` | — | Search by name (partial match) |
| `limit` | `number` | `50` | Maximum results (max: 100) |
| `offset` | `number` | `0` | Pagination offset |

### Paginated Response

```typescript
interface PaginatedApiKeys {
  data: ApiKey[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}
```

## Getting a Single Key

```typescript
const key = await ts.apiKeys.get({
  keyId: 'key_abc123',
  tenantId: 'tenant-acme-123', // Optional: verify ownership
})
```

## Rotating API Keys

Rotation invalidates the old key and generates a new one. The old key is immediately revoked.

```typescript
const rotated = await ts.apiKeys.rotate({
  keyId: 'key_abc123',
  reason: 'Scheduled rotation',
})
// Returns the new full key once
console.log('New key:', rotated.key)
console.log('Old key prefix:', rotated.oldKeyPrefix)
```

### Rotation Process

1. Validates the key exists and belongs to the tenant
2. Revokes the old key with the specified reason
3. Logs an `api_key.rotated` audit event
4. Generates a new key with the same name, scopes, and settings
5. Returns the new full key

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `keyId` | `string` | — | **Required.** ID of the key to rotate |
| `tenantId` | `string` | `req.tenant.id` | Tenant that owns the key |
| `reason` | `string` | `'Rotated'` | Reason logged in audit and revocation |
| `preserveExpiry` | `boolean` | `true` | Keep the same expiration date |

## Revoking API Keys

```typescript
await ts.apiKeys.revoke({
  keyId: 'key_abc123',
  reason: 'Compromised key — security incident #42',
})

// The key is immediately invalidated
// Any in-flight requests using this key will fail
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `keyId` | `string` | — | **Required.** ID of the key to revoke |
| `tenantId` | `string` | `req.tenant.id` | Tenant that owns the key |
| `reason` | `string` | — | **Required.** Reason for revocation (logged to audit) |

### Revocation Effects

- The key is immediately invalid — subsequent requests return HTTP 401
- An `api_key.revoked` audit event is logged
- Webhooks with event type `api_key.revoked` are dispatched
- The key prefix is retained in the database (for error messages), but the hash is removed
- Revocation is irreversible — you must create a new key

### Revocation Reasons

Common reasons for revocation:

| Reason | When to Use |
|--------|-------------|
| `'Compromised'` | Key was exposed or leaked |
| `'Rotated'` | Scheduled key rotation |
| `'User revoked'` | Manual revocation by tenant admin |
| `'Tenant deleted'` | Tenant account was closed |
| `'Plan downgrade'` | Tenant downgraded below max key limit |
| `'Security incident'` | Incident response procedure |

## Security Best Practices

### 1. Store Keys Securely

```typescript
// GOOD: Environment variables
const apiKey = process.env.TENANTSCALE_API_KEY

// BAD: Hardcoded in source
const apiKey = 'tsk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z' // ❌
```

### 2. Use Least Privilege Scopes

```typescript
// GOOD: Minimal scopes
const key = await ts.apiKeys.create({
  name: 'Read-only monitoring',
  scopes: ['orders:read', 'analytics:read'],
})

// BAD: Overly permissive
const key = await ts.apiKeys.create({
  name: 'Monitoring key',
  scopes: ['*'], // ❌ Super-admin scope not needed
})
```

### 3. Set Expiration Dates

```typescript
// GOOD: Short-lived keys for CI/CD
const key = await ts.apiKeys.create({
  name: 'Deployment key',
  scopes: ['deploy:write'],
  expiresAt: '2024-12-31T23:59:59Z',
})

// GOOD: No expiry for long-lived but restricted keys
const key = await ts.apiKeys.create({
  name: 'Production API key',
  scopes: ['orders:read'],
  // expiresAt omitted = no expiry
})
```

### 4. Rotate Regularly

```typescript
// Schedule rotation: Rotate all keys older than 90 days
async function rotateOldKeys(ts: TenantScale, tenantId: string) {
  const keys = await ts.apiKeys.list({ tenantId, includeRevoked: false })

  for (const key of keys.data) {
    const age = Date.now() - new Date(key.created_at).getTime()
    const ageDays = age / (1000 * 60 * 60 * 24)

    if (ageDays > 90) {
      const rotated = await ts.apiKeys.rotate({
        keyId: key.id,
        reason: 'Scheduled 90-day rotation',
      })
      // Send the new key securely to the tenant admin
      await notifyTenant(tenantId, rotated.key)
    }
  }
}
```

### 5. Monitor Key Usage

```typescript
// Check last-used timestamp to identify unused keys
const keys = await ts.apiKeys.list({ tenantId })

for (const key of keys.data) {
  if (!key.last_used_at) {
    console.warn(`Key "${key.name}" has never been used — consider revoking`)
  }

  const lastUsed = key.last_used_at ? new Date(key.last_used_at) : null
  if (lastUsed && (Date.now() - lastUsed.getTime()) > 180 * 24 * 60 * 60 * 1000) {
    console.warn(`Key "${key.name}" has not been used in 180 days — consider rotating`)
  }
}
```

### 6. Audit Key Events

```typescript
// All key operations are automatically logged
const auditEvents = await ts.audit.queryEvents({
  tenantId: 'tenant-acme-123',
  eventTypes: ['api_key.created', 'api_key.revoked', 'api_key.rotated'],
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  },
})
```

## Environment Labeling

Use environment labels to organize keys by deployment stage:

```typescript
const devKey = await ts.apiKeys.create({
  name: 'Development',
  environment: 'dev',
  scopes: ['*'],
})

const prodKey = await ts.apiKeys.create({
  name: 'Production',
  environment: 'prod',
  scopes: ['orders:read', 'orders:write'],
})
```

This adds the environment to the key prefix:

```
tsk_dev_a1b2...  vs  tsk_prod_c3d4...
```

## Testing API Key Operations

```typescript
import { createAuthTest } from '@tenantscale/sdk/testing'

describe('API keys', () => {
  const test = createAuthTest({ ts })

  it('creates a key with scopes', async () => {
    const { key } = await ts.apiKeys.create({
      tenantId: test.tenantId,
      name: 'Test key',
      scopes: ['orders:read'],
    })

    expect(key).toMatch(/^tsk_prod_[a-f0-9]{64}$/)
  })

  it('revokes a key and rejects subsequent requests', async () => {
    await ts.apiKeys.revoke({
      keyId: test.keyId,
      reason: 'Testing revocation',
    })

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.validKey}`)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('KEY_REVOKED')
  })
})
```
