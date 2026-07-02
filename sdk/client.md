# TenantScale Client

The `TenantScale` class is the main entry point for the SDK. It initializes all subsystems — auth, plans, audit, rate limiting, webhooks, and billing — and provides a unified interface.

## Constructor

```typescript
import { TenantScale } from '@tenantscale/sdk'

const ts = new TenantScale(options: TenantScaleOptions)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `supabaseUrl` | `string` | — | **Required.** Your Supabase project URL |
| `supabaseKey` | `string` | — | **Required.** Supabase service role key (never use anon key) |
| `stripeKey` | `string` | — | Stripe secret key. Required for billing features |
| `logger` | `Logger` | `console` | Logger instance. Must implement `info`, `warn`, `error`, `debug` |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Minimum log level to emit |
| `cache` | `CacheConfig` | — | Cache configuration (see below) |
| `rateLimit` | `RateLimitConfig` | — | Rate limiting defaults (see [Rate Limiting](/sdk/rate-limiting)) |
| `webhooks` | `WebhookConfig` | — | Webhook delivery defaults (see [Webhooks](/sdk/webhooks)) |
| `audit` | `AuditConfig` | — | Audit log retention and batching (see [Audit Events](/sdk/audit)) |
| `supabase` | `SupabaseClient` | — | Pre-configured Supabase client instance. Overrides `supabaseUrl` + `supabaseKey` |

### CacheConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `backend` | `'memory' \| 'supabase' \| 'redis'` | `'memory'` | Cache storage backend |
| `defaultTtlMs` | `number` | `300_000` | Default TTL (5 minutes) |
| `maxSize` | `number` | `1000` | Maximum cached entries (LRU eviction) |
| `redis` | `RedisOptions` | — | Redis connection options (required when `backend: 'redis'`) |

### RateLimitConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `'supabase' \| 'redis' \| 'memory'` | `'supabase'` | Rate limit counter storage |
| `defaultMaxRequests` | `number` | `1000` | Default daily request limit |
| `window` | `string` | `'1d'` | Rate limit time window |
| `usePlanLimits` | `boolean` | `false` | Use plan-level `daily_requests` as limit |
| `redis` | `RedisOptions` | — | Redis connection (required when `storage: 'redis'`) |
| `ipResolver` | `(req) => string` | — | Custom IP resolver function |
| `headers` | `RateLimitHeaders` | — | Custom rate limit header names |

### WebhookConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | `number` | `8` | Maximum delivery retry attempts |
| `retryBaseDelayMs` | `number` | `5000` | Base delay for exponential backoff |
| `retryMaxDelayMs` | `number` | `3600000` | Maximum delay between retries (1 hour) |
| `requestTimeoutMs` | `number` | `10000` | HTTP request timeout per delivery |
| `maxConcurrentDeliveries` | `number` | `50` | Concurrent delivery limit |
| `signatureHeader` | `string` | `'Webhook-Signature'` | Header name for webhook signature |
| `deliveryQueue` | `QueueConfig` | — | Delivery queue backend configuration |

### AuditConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `batchSize` | `number` | `10` | Events per batch insert |
| `flushIntervalMs` | `number` | `5000` | Max interval before forcing flush |
| `maxQueueSize` | `number` | `1000` | Max queued events before dropping |
| `retentionDays` | `number` | `90` | Default retention period |
| `cleanupSchedule` | `string` | `'0 3 * * *'` | Cron expression for cleanup |
| `onError` | `(error, events) => void` | — | Error handler for failed inserts |
| `namespace` | `string` | — | Prefix for event type names |

### Logger Interface

```typescript
interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}
```

## Full Configuration Example

```typescript
import { TenantScale } from '@tenantscale/sdk'
import { createClient } from '@supabase/supabase-js'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

const ts = new TenantScale({
  // Required
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // Optional: Stripe billing
  stripeKey: process.env.STRIPE_SECRET_KEY!,

  // Logging
  logger: {
    info: (msg, ...args) => console.log(`[TS] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[TS] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[TS] ${msg}`, ...args),
    debug: (msg, ...args) => console.debug(`[TS] ${msg}`, ...args),
  },
  logLevel: 'info',

  // Cache (Redis-backed)
  cache: {
    backend: 'redis',
    defaultTtlMs: 300_000,
    maxSize: 5000,
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'ts-cache:',
    },
  },

  // Rate limiting
  rateLimit: {
    storage: 'redis',
    defaultMaxRequests: 1000,
    window: '1d',
    usePlanLimits: true,
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'ts-ratelimit:',
    },
    headers: {
      limit: 'X-RateLimit-Limit',
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
    },
    ipResolver: (req) =>
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      'unknown',
  },

  // Webhooks
  webhooks: {
    maxRetries: 8,
    retryBaseDelayMs: 5000,
    retryMaxDelayMs: 3600000,
    requestTimeoutMs: 10000,
    maxConcurrentDeliveries: 50,
    signatureHeader: 'Webhook-Signature',
    deliveryQueue: {
      type: 'redis',
      pollIntervalMs: 1000,
    },
  },

  // Audit logging
  audit: {
    batchSize: 25,
    flushIntervalMs: 5000,
    maxQueueSize: 2000,
    retentionDays: 90,
    cleanupSchedule: '0 3 * * *',
    onError: (error, events) => {
      console.error('Audit log batch insert failed:', error)
      // Send failed events to a fallback
    },
    namespace: 'my-app',
  },
})
```

## Subsystem Access

Each subsystem is accessible as a property of the `TenantScale` instance:

| Property | Type | Description |
|----------|------|-------------|
| `ts.auth` | `AuthModule` | API key validation, scope checks, portal sessions |
| `ts.apiKeys` | `ApiKeyModule` | API key CRUD, rotation, revocation |
| `ts.plans` | `PlanModule` | Plan resolution, feature checks, limit evaluation |
| `ts.audit` | `AuditModule` | Event logging, querying, retention, export |
| `ts.webhooks` | `WebhookModule` | Registration, dispatch, delivery tracking |
| `ts.rateLimit` | `RateLimitModule` | Key limits, IP throttling, usage queries |
| `ts.billing` | `BillingModule` | Stripe subscription sync, invoice management |
| `ts.admin` | `AdminModule` | Cross-tenant admin operations |
| `ts.cache` | `CacheModule` | Cache get/set/invalidate |
| `ts.db` | `SupabaseClient` | Raw Supabase client access |

### Method Reference

Each subsystem exposes methods. The full method reference is available on each subsystem's dedicated page:

#### `ts.auth`
| Method | Description | Page |
|--------|-------------|------|
| `authenticateApiKey()` | Middleware: validates API key from Authorization header | [Authentication](/sdk/authentication) |
| `requireScope(scope)` | Middleware: checks that the API key has the required scope | [Authentication](/sdk/authentication) |
| `requirePortalSession()` | Middleware: validates a portal session JWT | [Authentication](/sdk/authentication) |

#### `ts.apiKeys`
| Method | Description | Page |
|--------|-------------|------|
| `create(options)` | Create a new API key for a tenant | [API Keys](/sdk/api-keys) |
| `list(filters)` | List API keys for a tenant with optional filters | [API Keys](/sdk/api-keys) |
| `get(keyId)` | Get details for a specific API key | [API Keys](/sdk/api-keys) |
| `rotate(keyId)` | Rotate an API key (generate new key, invalidate old) | [API Keys](/sdk/api-keys) |
| `revoke(keyId, reason)` | Revoke an API key immediately | [API Keys](/sdk/api-keys) |

#### `ts.plans`
| Method | Description | Page |
|--------|-------------|------|
| `getPlan(tenantId)` | Resolve the plan for a tenant | [Plans](/sdk/plans) |
| `hasFeature(tenantId, feature)` | Check if a tenant's plan has a feature enabled | [Plans](/sdk/plans) |
| `getLimit(tenantId, limit)` | Get the numeric value of a plan limit | [Plans](/sdk/plans) |
| `requirePlanFeature(feature)` | Middleware: guards route by feature flag | [Plans](/sdk/plans) |
| `requirePlanLimit(limit, getUsage)` | Middleware: guards route by numeric limit | [Plans](/sdk/plans) |

#### `ts.audit`
| Method | Description | Page |
|--------|-------------|------|
| `logEvent(event)` | Log an audit event | [Audit Events](/sdk/audit) |
| `queryEvents(filter)` | Query audit events with filters and pagination | [Audit Events](/sdk/audit) |
| `cleanup(options)` | Delete events older than a retention period | [Audit Events](/sdk/audit) |
| `export(options)` | Export events as JSONL stream | [Audit Events](/sdk/audit) |

#### `ts.webhooks`
| Method | Description | Page |
|--------|-------------|------|
| `create(options)` | Register a new webhook endpoint | [Webhooks](/sdk/webhooks) |
| `list()` | List all webhooks for the current tenant | [Webhooks](/sdk/webhooks) |
| `update(webhookId, changes)` | Update a webhook endpoint | [Webhooks](/sdk/webhooks) |
| `delete(webhookId)` | Delete a webhook endpoint | [Webhooks](/sdk/webhooks) |
| `dispatch(event, data)` | Dispatch an event to matching webhooks | [Webhooks](/sdk/webhooks) |
| `getDeliveries(webhookId)` | Get delivery history for a webhook | [Webhooks](/sdk/webhooks) |
| `retryDelivery(deliveryId)` | Retry a failed delivery | [Webhooks](/sdk/webhooks) |

#### `ts.rateLimit`
| Method | Description | Page |
|--------|-------------|------|
| `getCurrentUsage(apiKeyId)` | Get current request count for an API key | [Rate Limiting](/sdk/rate-limiting) |
| `resetKeyLimit(apiKeyId)` | Reset the rate limit counter for an API key | [Rate Limiting](/sdk/rate-limiting) |
| `dailyKeyLimit(options)` | Middleware: enforces daily key limit | [Rate Limiting](/sdk/rate-limiting) |
| `ipThrottle(options)` | Middleware: enforces IP-based throttling | [Rate Limiting](/sdk/rate-limiting) |

#### `ts.billing`
| Method | Description | Page |
|--------|-------------|------|
| `syncSubscription(tenantId)` | Sync Stripe subscription for a tenant | [Billing](/guide/billing) |
| `getSubscription(tenantId)` | Get current subscription details | [Billing](/guide/billing) |
| `listInvoices(tenantId)` | List invoices for a tenant | [Billing](/guide/billing) |
| `createCheckoutSession(tenantId, priceId)` | Create a Stripe Checkout session | [Billing](/guide/billing) |

## Version

```typescript
console.log(ts.version)
// '2.0.0'
```

## Error Handling

All subsystem methods throw typed errors that extend `TenantScaleError`. See [Error Handling](/sdk/errors) for the full hierarchy and examples.

```typescript
try {
  await ts.apiKeys.create({ name: 'My Key', scopes: ['orders:read'] })
} catch (error) {
  if (error instanceof LimitExceededError) {
    console.error('Max API keys reached for this plan:', error.message)
  } else if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message)
  } else if (error instanceof TenantScaleError) {
    console.error('SDK error:', error.code, error.message)
  }
}
```
