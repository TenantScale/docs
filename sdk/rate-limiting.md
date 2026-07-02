# Rate Limiting

The `RateLimiter` manages daily API key limits and IP-based throttling. It supports three storage backends and plan-based overrides.

## RateLimiter

The rate limiter is integrated into the `TenantScale` client and accessible via `ts.rateLimit`:

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  rateLimit: {
    storage: 'supabase',
    defaultMaxRequests: 1000,
    window: '1d',
  },
})

// Rate limit middleware
app.use('/api/*', ts.rateLimit.dailyKeyLimit())
```

### RateLimitConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `'supabase' \| 'redis' \| 'memory'` | `'supabase'` | Counter storage backend |
| `defaultMaxRequests` | `number` | `1000` | Default request limit per window |
| `window` | `string` | `'1d'` | Time window (`'1d'`, `'1h'`, `'1m'`) |
| `usePlanLimits` | `boolean` | `false` | Respect plan-level `daily_requests` limit |
| `fallbackMaxRequests` | `number` | `1000` | Fallback if plan doesn't define `daily_requests` |
| `redis` | `RedisOptions` | — | Redis connection (required for `storage: 'redis'`) |
| `ipResolver` | `(req) => string` | — | Custom function to extract client IP |
| `headers` | `RateLimitHeaders` | — | Custom header names for rate limit headers |
| `warnAtPercentage` | `number` | `80` | Percentage at which to fire `onWarn` callback |
| `onWarn` | `(tenantId, usage) => void` | — | Callback when approaching the limit |
| `onExceeded` | `(tenantId, usage) => void` | — | Callback when limit is exceeded |

## dailyKeyLimit()

Middleware that enforces a daily request limit per API key.

```typescript
app.use(
  '/api/*',
  ts.authenticateApiKey(),
  ts.rateLimit.dailyKeyLimit()
)
```

### How It Works

1. On every request, the middleware increments a counter for the API key
2. If the counter exceeds the limit, returns HTTP 429
3. Counters reset automatically at midnight UTC
4. The count is stored in the selected storage backend

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxRequests` | `number` | `defaultMaxRequests` | Maximum requests in the window |
| `window` | `string` | `'1d'` | Time window |
| `usePlanLimits` | `boolean` | `false` | Use tenant's plan `daily_requests` as limit |
| `storage` | `'supabase' \| 'redis' \| 'memory'` | Global config | Override storage backend |
| `headers` | `RateLimitHeaders` | Global config | Custom header names |
| `skip` | `(req) => boolean` | — | Skip rate limiting for certain requests |

### Per-Route Configuration

```typescript
// Different limits for different endpoints
app.get(
  '/api/orders',
  ts.authenticateApiKey(),
  ts.rateLimit.dailyKeyLimit({ maxRequests: 5000 }),
  handler
)

app.post(
  '/api/orders',
  ts.authenticateApiKey(),
  ts.rateLimit.dailyKeyLimit({ maxRequests: 500 }),
  handler
)

// Unauthenticated routes (rate limit by IP)
app.post(
  '/api/auth/login',
  ts.rateLimit.ipThrottle({ maxRequests: 20, window: '1h' }),
  handler
)
```

## ipThrottle()

Middleware that throttles requests by IP address. Protects against attacks where a single IP cycles through many API keys.

```typescript
app.use(
  '/api/auth/*',
  ts.rateLimit.ipThrottle({
    maxRequests: 20,
    window: '1m',
  })
)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxRequests` | `number` | — | **Required.** Maximum requests per window per IP |
| `window` | `string` | `'1m'` | Time window |
| `storage` | `'supabase' \| 'redis' \| 'memory'` | Global config | Storage backend |
| `ipResolver` | `(req) => string` | Global config | Custom IP resolver |
| `whitelist` | `string[]` | `[]` | IPs or CIDR ranges to exempt |
| `trustProxy` | `boolean` | `true` | Trust `X-Forwarded-For` header |

### Combined Key + IP Limiting

Apply both key-based and IP-based limits:

```typescript
// Apply daily key limit first, then IP throttle
app.use(
  '/api/*',
  ts.authenticateApiKey(),
  ts.rateLimit.dailyKeyLimit({ maxRequests: 1000 }),
  ts.rateLimit.ipThrottle({
    maxRequests: 200,
    window: '1m',
    whitelist: [
      '127.0.0.1',
      '::1',
      '10.0.0.0/8',
    ],
  }),
  handler
)
```

### IP Resolver

Custom IP resolution for proxies and load balancers:

```typescript
ts.rateLimit.ipThrottle({
  maxRequests: 100,
  ipResolver: (req) => {
    // Try X-Forwarded-For first, then fallback
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.headers['x-real-ip'] as string ??
      req.socket?.remoteAddress ??
      'unknown'
    )
  },
})
```

## getCurrentUsage()

Get the current request count for an API key in the current window.

```typescript
const usage = await ts.rateLimit.getCurrentUsage({
  apiKeyId: 'key_abc123',
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKeyId` | `string` | ✅ | API key ID to check |
| `date` | `string` | — | Specific date (ISO 8601). Defaults to today |

### Return Type

```typescript
interface RateLimitUsage {
  apiKeyId: string
  date: string
  requestCount: number
  limit: number
  remaining: number
  resetAt: string          // ISO 8601 timestamp of window reset
  window: string           // Window duration
}
```

### Usage Example

```typescript
const usage = await ts.rateLimit.getCurrentUsage({
  apiKeyId: 'key_abc123',
})

console.log(usage)
// {
//   apiKeyId: 'key_abc123',
//   date: '2024-07-01',
//   requestCount: 842,
//   limit: 1000,
//   remaining: 158,
//   resetAt: '2024-07-02T00:00:00Z',
//   window: '1d',
// }
```

## resetKeyLimit()

Reset the rate limit counter for a specific API key.

```typescript
await ts.rateLimit.resetKeyLimit({
  apiKeyId: 'key_abc123',
})
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKeyId` | `string` | ✅ | API key ID to reset |
| `date` | `string` | — | Specific date to reset. Defaults to today |

Use cases for resetting:

- A tenant upgrades their plan mid-cycle
- An admin needs to temporarily unblock a key
- Testing and debugging rate limit behavior

## planOverride()

Configure plan-based rate limit overrides. When enabled, the plan's `daily_requests` limit replaces the global default.

```typescript
// Enable plan-based overrides globally
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  rateLimit: {
    usePlanLimits: true,
    fallbackMaxRequests: 100,
  },
})

// Or per-route
ts.rateLimit.dailyKeyLimit({
  usePlanLimits: true,
  fallbackMaxRequests: 100,
})
```

### Limit Resolution Order

1. **Plan limit** — if `usePlanLimits: true` and the plan defines `daily_requests`
2. **Route-specific limit** — if set on the middleware instance
3. **Global default** — from `TenantScale` constructor config
4. **Fallback** — `fallbackMaxRequests` if nothing else matches

```typescript
// Example: plan limits per tier
// Plan: Free       → daily_requests: 100
// Plan: Hobby      → daily_requests: 1000
// Plan: Pro        → daily_requests: 10000
// Plan: Enterprise → daily_requests: 100000

app.get(
  '/api/orders',
  ts.authenticateApiKey(),
  ts.rateLimit.dailyKeyLimit({ usePlanLimits: true }),
  handler
)
```

## Storage Backends

### Supabase (PostgreSQL)

Default backend. Stores counters in the `rate_limit_counts` table.

```typescript
ts.rateLimit.dailyKeyLimit({
  storage: 'supabase', // default
})
```

**Database schema:**

```sql
CREATE TABLE rate_limit_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(api_key_id, date)
);
```

**Pros:** Zero additional infrastructure, persistent across restarts.  
**Cons:** Slightly higher latency (~5-20ms), database connection overhead.

### Redis

Recommended for high-throughput applications.

```typescript
ts.rateLimit.dailyKeyLimit({
  storage: 'redis',
  redis: {
    url: process.env.REDIS_URL!,
    keyPrefix: 'ts-ratelimit:',
  },
})
```

**Pros:** Sub-millisecond latency (~1-3ms), built-in TTL expiration, atomic increments.  
**Cons:** Requires a Redis instance.

### Memory (In-Memory)

Best for development, single-process deployments, or very low traffic.

```typescript
ts.rateLimit.dailyKeyLimit({
  storage: 'memory',
})
```

**Pros:** No external dependencies, fastest possible latency (~0.01ms).  
**Cons:** Counters reset on server restart, not shared across instances.

### Backend Comparison

| Feature | Supabase | Redis | Memory |
|---------|----------|-------|--------|
| Persistence | ✅ Yes | ✅ Yes (configurable) | ❌ Resets on restart |
| Shared across instances | ✅ Yes | ✅ Yes | ❌ Per-process |
| Latency | ~5-20ms | ~1-3ms | ~0.01ms |
| Infrastructure | None (uses Supabase) | Requires Redis | None |
| Best for | Small deployments | Production scale | Dev / single instance |

## Rate Limit Response Headers

Every rate-limited response includes standard headers:

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 842
X-RateLimit-Reset: 1625097600
```

When the limit is exceeded:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1625097600
Retry-After: 3600
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Daily request limit exceeded. Resets at 2024-07-02T00:00:00Z.",
    "limit": 1000,
    "remaining": 0,
    "reset": 1625097600,
    "retry_after_seconds": 3600
  }
}
```

### Header Reference

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests in the current window | `1000` |
| `X-RateLimit-Remaining` | Remaining requests in the current window | `842` |
| `X-RateLimit-Reset` | Unix timestamp when the window resets | `1625097600` |
| `Retry-After` | Seconds to wait before retrying (on 429) | `3600` |

### Custom Header Configuration

```typescript
ts.rateLimit.dailyKeyLimit({
  maxRequests: 1000,
  headers: {
    limit: 'X-MyApp-Limit',
    remaining: 'X-MyApp-Remaining',
    reset: 'X-MyApp-Reset',
  },
})
```

## Rate Limit Groups

Group multiple routes under a single rate limit counter:

```typescript
// All report routes share a pool of 50 requests/day
const reportLimit = new RateLimitGroup({
  ts,
  key: 'reports',
  maxRequests: 50,
  window: '1d',
})

app.get('/api/reports/daily', reportLimit.middleware(), handler)
app.get('/api/reports/monthly', reportLimit.middleware(), handler)
app.get('/api/reports/custom', reportLimit.middleware(), handler)
```

## Skipping Rate Limits

Exempt certain routes or conditions from rate limiting:

```typescript
ts.rateLimit.dailyKeyLimit({
  maxRequests: 1000,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health'
      // Skip for webhook receivers (Stripe needs to deliver)
      || req.path.startsWith('/api/webhooks/stripe')
      // Skip for admin users
      || req.headers['x-internal-request'] === 'true'
  },
})
```

## Alerting and Monitoring

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  rateLimit: {
    warnAtPercentage: 80,
    onWarn: (tenantId, usage) => {
      console.warn(`Tenant ${tenantId}: ${usage.percentage}% of limit used`)
      // Send to monitoring system
      datadog.increment('rate_limit.warning', { tenantId })
    },
    onExceeded: (tenantId, usage) => {
      console.error(`Tenant ${tenantId} exceeded rate limit`)
      // Send alert
      datadog.increment('rate_limit.exceeded', { tenantId })
      // Optionally notify tenant admin
      await sendAlert(tenantId, 'Rate limit exceeded')
    },
  },
})
```

## Testing Rate Limiting

```typescript
import { createRateLimitTest } from '@tenantscale/sdk/testing'

describe('rate limiting', () => {
  const test = createRateLimitTest({ ts })

  it('allows requests under the limit', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.apiKey}`)

    expect(res.status).toBe(200)
    expect(res.headers['x-ratelimit-remaining']).toBe('999')
  })

  it('blocks requests over the limit', async () => {
    // Exhaust the limit
    for (let i = 0; i < 1000; i++) {
      await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${test.apiKey}`)
    }

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.apiKey}`)

    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('respects plan-level overrides', async () => {
    await test.asTenant({ plan: 'plan_pro' }, async () => {
      // Pro plan has daily_requests: 10000
      const limit = await ts.rateLimit.getCurrentUsage({
        apiKeyId: test.apiKeyId,
      })
      expect(limit.limit).toBe(10000)
    })
  })
})
```
