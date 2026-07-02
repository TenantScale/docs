# Rate Limiting

TenantScale provides built-in rate limiting at three levels: **daily API key limits**, **IP-based throttling**, and **plan-based overrides**. All are configurable and work together to protect your API from abuse.

## Rate Limit Architecture

```
Request ──▶ Rate Limit Middleware
                 │
        ┌────────┴────────┐
        ▼                 ▼
   Daily Key Limit    IP Throttle
   (per API key)      (per IP)
        │                 │
        └────────┬────────┘
                 ▼
         Plan Override?
         (higher/lower limits)
                 │
        ┌────────┴────────┐
        ▼                 ▼
    Under Limit?     Over Limit?
        │                 │
   Proceed ✅       429 Too Many
                    Requests ❌
```

## Daily API Key Limits

The primary rate limit is a **daily request cap per API key**. Each API key can make a configurable number of requests per day.

### How It Works

1. On every request, the middleware increments a counter for the API key in the current day
2. If the counter exceeds the limit, the request is rejected with HTTP 429
3. Counters reset automatically at midnight UTC
4. The count is stored in the `rate_limit_counts` table in Supabase

### Database Schema

```sql
CREATE TABLE rate_limit_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per key per day
  UNIQUE(api_key_id, date)
);

CREATE INDEX idx_rate_limits_key_date
  ON rate_limit_counts(api_key_id, date);
```

### Middleware Setup

```typescript
import { rateLimit } from '@tenantscale/sdk'

// Apply daily rate limiting to all routes
app.use(
  rateLimit({
    ts,
    // Maximum requests per day per API key
    maxRequests: 1000,
    // Time window (default: '1d')
    window: '1d',
    // Where to store counters
    storage: 'supabase', // 'supabase' | 'redis' | 'memory'
  })
)
```

### Per-Route Limits

Apply different limits to different routes:

```typescript
// Generous limit for read operations
app.get(
  '/api/orders',
  rateLimit({ ts, maxRequests: 5000, window: '1d' }),
  handler
)

// Strict limit for write operations
app.post(
  '/api/orders',
  rateLimit({ ts, maxRequests: 500, window: '1d' }),
  handler
)

// Very strict for authentication endpoints
app.post(
  '/api/auth/login',
  rateLimit({ ts, maxRequests: 20, window: '1h' }),
  handler
)
```

## IP-Based Throttling

In addition to key-based limits, you can throttle by IP address. This protects against attacks where a single IP cycles through many API keys.

```typescript
import { rateLimit } from '@tenantscale/sdk'

// Throttle by IP: max 100 requests per minute per IP
app.use(
  rateLimit({
    ts,
    type: 'ip',  // 'key' (default) | 'ip' | 'both'
    maxRequests: 100,
    window: '1m',
    storage: 'redis', // IP throttling works best with Redis
    // Identify the IP from the request
    ipResolver: (req) => {
      return req.headers['x-forwarded-for']?.split(',')[0].trim()
        ?? req.socket.remoteAddress
    },
  })
)
```

### Combined Key + IP Limiting

For maximum protection, apply both:

```typescript
app.use(
  rateLimit({
    ts,
    type: 'both',
    key: { maxRequests: 1000, window: '1d' },
    ip: { maxRequests: 100, window: '1m' },
    storage: 'redis',
  })
)
```

This means a request passes only if **both** the key limit and the IP limit are under their thresholds.

### IP Whitelist

Exclude trusted IPs from throttling:

```typescript
app.use(
  rateLimit({
    ts,
    type: 'ip',
    maxRequests: 100,
    window: '1m',
    whitelist: [
      '127.0.0.1',
      '::1',
      // Your internal service IPs
      '10.0.0.0/8',
      '172.16.0.0/12',
      // Stripe webhook IPs
      '3.18.12.63',
      '3.130.192.231',
    ],
  })
)
```

## Plan-Based Overrides

Each plan can define its own rate limits. The `daily_requests` limit in a plan overrides the global `maxRequests` setting:

```typescript
// Plan definitions with custom rate limits
const plans = {
  plan_free: {
    name: 'Free',
    limits: {
      daily_requests: 100,
      max_api_keys: 2,
    },
  },
  plan_hobby: {
    name: 'Hobby',
    limits: {
      daily_requests: 1000,
      max_api_keys: 5,
    },
  },
  plan_pro: {
    name: 'Pro',
    limits: {
      daily_requests: 10000,
      max_api_keys: 25,
    },
  },
}
```

When `usePlanLimits` is enabled, the middleware automatically reads `plan.limits.daily_requests` and uses that as the cap:

```typescript
app.use(
  rateLimit({
    ts,
    // Use the tenant's plan limits instead of a hardcoded value
    usePlanLimits: true,
    // Fallback if plan doesn't specify daily_requests
    fallbackMaxRequests: 100,
    window: '1d',
  })
)
```

**Limit resolution order:**

1. **Plan limit** (if `usePlanLimits: true` and plan defines `daily_requests`)
2. **Route-specific limit** (if set on the middleware instance)
3. **Global default** (fallback)

### Per-Plan Enforcement Example

```typescript
// Internal admin routes — high limit
app.get(
  '/api/admin/stats',
  ts.authenticateApiKey(),
  ts.requireScope('admin'),
  rateLimit({ ts, maxRequests: 50000, window: '1d' }),
  handler
)

// Customer-facing API — uses plan limits
app.get(
  '/api/orders',
  ts.authenticateApiKey(),
  rateLimit({ ts, usePlanLimits: true }),
  handler
)

// Webhook endpoints — no rate limit (they're internal)
app.post(
  '/api/webhooks/stripe',
  rateLimit({ ts, maxRequests: -1 }), // -1 = unlimited
  handler
)
```

## Rate Limit Response Headers

Every rate-limited response includes standard headers so clients can adjust their behavior:

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
app.use(
  rateLimit({
    ts,
    maxRequests: 1000,
    headers: {
      // Custom header names
      limit: 'X-MyApp-Limit',
      remaining: 'X-MyApp-Remaining',
      reset: 'X-MyApp-Reset',
    },
  })
)
```

## Storage Backends

TenantScale supports three storage backends for rate limit counters.

### Supabase (PostgreSQL)

Default backend. Stores counters in the `rate_limit_counts` table.

```typescript
rateLimit({
  ts,
  storage: 'supabase', // default
  maxRequests: 1000,
})
```

**Pros:** Zero additional infrastructure, persistent across restarts.
**Cons:** Slightly higher latency, database connection overhead.

### Redis

Recommended for high-throughput applications.

```typescript
rateLimit({
  ts,
  storage: 'redis',
  redis: {
    url: process.env.REDIS_URL!,
    // Optional: prefix for Redis keys
    keyPrefix: 'ts-rate-limit:',
  },
  maxRequests: 1000,
})
```

**Pros:** Sub-millisecond latency, built-in TTL expiration, atomic increments.
**Cons:** Requires a Redis instance.

### Memory (In-Memory)

Best for development, single-process deployments, or very low traffic.

```typescript
rateLimit({
  ts,
  storage: 'memory',
  maxRequests: 1000,
})
```

**Pros:** No external dependencies, fastest possible latency.
**Cons:** Counters reset on server restart, not shared across instances.

### Backend Comparison

| Feature | Supabase | Redis | Memory |
|---------|----------|-------|--------|
| Persistence | ✅ Yes | ✅ Yes (configurable) | ❌ Resets on restart |
| Shared across instances | ✅ Yes | ✅ Yes | ❌ Per-process |
| Latency | ~5-20ms | ~1-3ms | ~0.01ms |
| Infrastructure | None (uses Supabase) | Requires Redis | None |
| Best for | Small deployments | Production scale | Dev / single instance |

## Per-Route Limits

Different endpoints need different limits. Apply rate limit middleware with route-specific configs:

```typescript
const router = express.Router()

// Public API — strict
router.use('/api/public',
  rateLimit({ ts, maxRequests: 100, window: '1d' })
)

// Authenticated API — plan-based
router.use('/api/v1',
  ts.authenticateApiKey(),
  rateLimit({ ts, usePlanLimits: true })
)

// Admin API — generous
router.use('/api/admin',
  ts.authenticateApiKey(),
  ts.requireScope('admin'),
  rateLimit({ ts, maxRequests: 50000, window: '1d' })
)

// Webhook receiver — no limit (Stripe needs to deliver)
router.use('/api/webhooks',
  rateLimit({ ts, maxRequests: -1 }) // unlimited
)

// Auth endpoints — strict IP-based
router.use('/api/auth',
  rateLimit({ ts, type: 'ip', maxRequests: 20, window: '1m' })
)
```

### Rate Limit Groups

You can group multiple routes under a single rate limit counter:

```typescript
// All report-generation routes share a pool of 50 requests/day
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

## Handling Rate Limit Errors

### Client-Side Retry

Advise your API consumers to handle 429 responses with exponential backoff:

```typescript
// Client-side retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit = {}) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, options)

    if (res.status !== 429) return res

    const retryAfter = res.headers.get('Retry-After')
    const wait = retryAfter
      ? parseInt(retryAfter) * 1000
      : Math.min(1000 * Math.pow(2, attempt), 30_000)

    console.warn(`Rate limited, retrying in ${wait}ms (attempt ${attempt})`)
    await new Promise(r => setTimeout(r, wait))
  }
  throw new Error('Max retries exceeded')
}
```

### Server-Side Override

Override rate limits for specific API keys (e.g., for enterprise customers):

```typescript
// Create an API key with custom rate limit
const key = await ts.createApiKey({
  name: 'Enterprise Customer Key',
  tenantId: 'tenant-enterprise-123',
  // Custom rate limit overrides the plan limit
  rateLimitOverride: {
    maxRequests: 100000,
    window: '1d',
  },
})
```

### Rate Limit Alerting

Set up monitoring on rate limit counters:

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  rateLimit: {
    // Alert when a tenant reaches 80% of their limit
    warnAtPercentage: 80,
    onWarn: (tenantId, usage) => {
      console.warn(`Tenant ${tenantId} at ${usage.percentage}% of rate limit`)
      // Send to your monitoring system
      datadog.increment('rate_limit.warning', { tenantId })
    },
    // Log when a tenant hits the limit
    onExceeded: (tenantId, usage) => {
      console.error(`Tenant ${tenantId} exceeded rate limit`)
      datadog.increment('rate_limit.exceeded', { tenantId })
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
    expect(res.headers['x-ratelimit-remaining']).toBeGreaterThan(0)
  })

  it('rejects requests over the limit', async () => {
    // Use a test key with a limit of 3
    const limitedKey = await test.createKey({ dailyLimit: 3 })

    for (let i = 0; i < 3; i++) {
      await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${limitedKey}`)
    }

    // 4th request should be rate limited
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${limitedKey}`)

    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('returns correct rate limit headers', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.apiKey}`)

    expect(res.headers).toMatchObject({
      'x-ratelimit-limit': expect.any(String),
      'x-ratelimit-remaining': expect.any(String),
      'x-ratelimit-reset': expect.any(String),
    })
  })

  it('resets counters daily', async () => {
    // Simulate a day passing
    await test.advanceTime({ days: 1 })

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${test.apiKey}`)

    // Counter should be reset
    expect(Number(res.headers['x-ratelimit-remaining'])).toBe(
      Number(res.headers['x-ratelimit-limit'])
    )
  })

  it('applies plan-based limits', async () => {
    const proKey = await test.createKey({ plan: 'plan_pro' })
    const freeKey = await test.createKey({ plan: 'plan_free' })

    // Pro key should have higher limit
    const proRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${proKey}`)

    const freeRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${freeKey}`)

    expect(Number(proRes.headers['x-ratelimit-limit'])).toBeGreaterThan(
      Number(freeRes.headers['x-ratelimit-limit'])
    )
  })
})
```

## Related Resources

- [Source: Rate Limit Middleware](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/middleware/rate-limit.ts)
- [Source: Rate Limit Storage (Supabase)](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/rate-limit/storage/supabase.ts)
- [Source: Rate Limit Storage (Redis)](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/rate-limit/storage/redis.ts)
- [Source: Rate Limit Test Utilities](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/testing/rate-limit.ts)
- [Plan Enforcement →](/guide/plan-enforcement)
- [SDK Rate Limiting Reference →](/sdk/rate-limiting)
