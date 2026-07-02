# Webhooks

The webhooks module handles registering webhook endpoints, dispatching events, and verifying incoming webhook signatures.

## Webhook Module

Access the webhook subsystem via `ts.webhooks`:

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
})

// Tenant-scoped operations
await ts.webhooks.create({ ... })
await ts.webhooks.list()
await ts.webhooks.update({ ... })
await ts.webhooks.delete({ ... })
await ts.webhooks.dispatch({ ... })
await ts.webhooks.getDeliveries({ ... })

// Admin operations
await ts.webhooks.admin.retryDelivery({ ... })
```

## dispatch()

Dispatch an event to all registered webhooks that match the event type. Events are delivered asynchronously — the call returns immediately after queuing.

```typescript
await ts.webhooks.dispatch({
  event: 'plan.changed',
  data: {
    previous_plan: { id: 'plan_hobby', name: 'Hobby' },
    current_plan: { id: 'plan_pro', name: 'Pro' },
    changed_by: 'admin@acme.com',
  },
  tenantId: 'tenant-acme-123',
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event` | `string` | ✅ | Event type name (e.g., `'plan.changed'`) |
| `data` | `Record<string, unknown>` | ✅ | Event-specific payload |
| `tenantId` | `string` | ✅ | Tenant that owns this event |
| `idempotencyKey` | `string` | — | Custom idempotency key (auto-generated if omitted) |

### Return Type

```typescript
interface DispatchResult {
  id: string                // Event ID
  deliveryCount: number     // Number of webhooks that matched
  queuedAt: string          // ISO 8601 timestamp
}
```

### Dispatch Flow

```
dispatch({ event, data, tenantId })
  │
  ├─▶ Look up tenant's registered webhooks
  │     Filter by event type match
  │
  ├─▶ Create delivery records (one per matching webhook)
  │
  ├─▶ Queue deliveries for background processing
  │
  └─▶ Return { id, deliveryCount, queuedAt }

Background worker:
  ┌─▶ For each pending delivery:
  │     POST to webhook URL with signed payload
  │     ├─▶ 2xx → mark as delivered
  │     └─▶ non-2xx/timeout → schedule retry
  │
  └─▶ After max retries → mark as failed
```

### Idempotency

Dispatch is idempotent. Duplicate events with the same `idempotencyKey` are safely ignored:

```typescript
// This is safe to call multiple times with the same key
await ts.webhooks.dispatch({
  event: 'order.created',
  data: { orderId: 'order-123' },
  tenantId: 'tenant-acme-123',
  idempotencyKey: `order.created:order-123`,
})
```

## register()

Register a new webhook endpoint for a tenant.

```typescript
const webhook = await ts.webhooks.create({
  url: 'https://my-app.com/api/webhooks/tenantscale',
  events: [
    'plan.changed',
    'subscription.canceled',
    'invoice.paid',
    'invoice.payment_failed',
  ],
  description: 'Production webhook for billing events',
  secret: undefined, // Auto-generated if omitted
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `string` | ✅ | HTTPS endpoint URL |
| `events` | `string[]` | ✅ | Event types to subscribe to (supports wildcards) |
| `description` | `string` | — | Human-readable description |
| `secret` | `string` | — | Custom webhook secret (auto-generated if omitted) |
| `secret` | `string` | — | Custom signing secret (auto-generated) |
| `tenantId` | `string` | — | Tenant ID (default: authenticated tenant) |
| `enabled` | `boolean` | — | Enable/disable the endpoint (default: `true`) |

### Return Type

```typescript
interface Webhook {
  id: string
  tenant_id: string
  url: string
  events: string[]
  description: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// On creation, the secret is returned once
interface CreatedWebhook extends Webhook {
  secret: string // Show this once, it won't be returned again
}
```

### Event Patterns

Webhooks support wildcard patterns for event subscriptions:

| Pattern | Matches |
|---------|---------|
| `plan.changed` | Exact match: only `plan.changed` |
| `plan.*` | All plan events: `plan.changed`, `plan.overridden` |
| `*.paid` | All paid events: `invoice.paid`, `subscription.paid` |
| `*` | **All events** — use with caution |
| `invoice.*` | All invoice events: `invoice.paid`, `invoice.payment_failed`, `invoice.refunded` |
| `subscription.*` | All subscription events |
| `api_key.*` | All API key events |

```typescript
// Subscribe to all billing-related events
const billingWebhook = await ts.webhooks.create({
  url: 'https://my-app.com/billing-hooks',
  events: ['invoice.*', 'subscription.*'],
  description: 'All billing events',
})

// Subscribe to everything (not recommended for production)
const allEventsWebhook = await ts.webhooks.create({
  url: 'https://my-app.com/all-hooks',
  events: ['*'],
  description: '⚠️ All events',
})
```

## update()

Update an existing webhook endpoint.

```typescript
await ts.webhooks.update({
  webhookId: 'wh_prod_abc123',
  url: 'https://my-app.com/new-webhook-url',
  events: ['plan.changed', 'invoice.paid', 'invoice.payment_failed'],
  description: 'Updated production webhook',
  enabled: true,
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookId` | `string` | **Required.** Webhook ID to update |
| `url` | `string` | New endpoint URL |
| `events` | `string[]` | New event subscriptions |
| `description` | `string` | New description |
| `enabled` | `boolean` | Enable or disable the endpoint |

All parameters except `webhookId` are optional — only provided fields are updated.

## delete()

Delete a webhook endpoint.

```typescript
await ts.webhooks.delete({ webhookId: 'wh_prod_abc123' })
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | `string` | ✅ | Webhook ID to delete |
| `tenantId` | `string` | — | Tenant ID (default: authenticated tenant) |

Deletion is immediate. Any pending deliveries for this webhook are cancelled.

## list()

List all webhooks for the current tenant.

```typescript
const webhooks = await ts.webhooks.list()

// Optional filtering
const activeWebhooks = await ts.webhooks.list({
  status: 'active',
  limit: 20,
  offset: 0,
})
```

### Filters

| Filter | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | `string` | `req.tenant.id` | Filter by tenant |
| `status` | `'active' \| 'inactive'` | — | Filter by status |
| `event` | `string` | — | Filter by subscribed event |
| `limit` | `number` | `50` | Maximum results (max: 100) |
| `offset` | `number` | `0` | Pagination offset |

## getDeliveries()

Get delivery history for a webhook endpoint.

```typescript
const deliveries = await ts.webhooks.getDeliveries({
  webhookId: 'wh_prod_abc123',
  status: 'failed',
  limit: 10,
})
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `webhookId` | `string` | — | **Required.** Webhook ID |
| `status` | `'pending' \| 'delivering' \| 'delivered' \| 'failed'` | — | Filter by status |
| `limit` | `number` | `50` | Maximum results |
| `offset` | `number` | `0` | Pagination offset |

### Delivery Record

```typescript
interface WebhookDelivery {
  id: string
  webhook_id: string
  event_id: string
  event_type: string
  status: 'pending' | 'delivering' | 'delivered' | 'failed' | 'cancelled'
  attempt: number
  max_attempts: number
  response_status: number | null
  response_body: string | null
  error_message: string | null
  executed_at: string
  next_retry_at: string | null
  created_at: string
}
```

## retryDelivery()

Manually retry a failed delivery (admin only).

```typescript
await ts.webhooks.admin.retryDelivery({
  deliveryId: 'del_failed_123',
})
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deliveryId` | `string` | ✅ | ID of the failed delivery to retry |

### Retry Conditions

- Only `failed` status deliveries can be retried
- The webhook endpoint must still be active
- The tenant must still exist
- Retries restart the attempt counter from 1

## verifyWebhookSignature()

Verify the signature of an incoming webhook payload. Your tenant's endpoints use this to verify events came from TenantScale.

```typescript
import { verifyWebhookSignature } from '@tenantscale/sdk'

app.post('/api/webhooks/tenantscale', async (req, res) => {
  const signature = req.headers['webhook-signature'] as string
  const secret = process.env.TENANTSCALE_WEBHOOK_SECRET!

  // Verify the signature
  const isValid = verifyWebhookSignature({
    payload: req.body,
    signature,
    secret,
    maxAgeMs: 5 * 60 * 1000, // 5 minutes
  })

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Process the event
  const { event, data } = req.body

  switch (event) {
    case 'plan.changed':
      await handlePlanChange(data)
      break
    case 'invoice.paid':
      await handleInvoicePaid(data)
      break
    case 'subscription.canceled':
      await handleSubscriptionCanceled(data)
      break
  }

  res.status(200).json({ received: true })
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | `unknown` | ✅ | Raw request body |
| `signature` | `string` | ✅ | Signature from `Webhook-Signature` header |
| `secret` | `string` | ✅ | Your webhook signing secret |
| `maxAgeMs` | `number` | — | Max age for signed payloads (prevents replay attacks, default: 5 min) |

### Return Type

```typescript
boolean
```

### Signature Header Format

```
Webhook-Signature: t=1721234567,signature=abc123def456...
```

| Component | Description | Example |
|-----------|-------------|---------|
| `t` | Unix timestamp of when the signature was generated | `1721234567` |
| `signature` | HMAC-SHA256 hex digest | `abc123def456...` |

### Verification Steps

1. Parse the `Webhook-Signature` header to extract timestamp and signature
2. Check that the timestamp is within `maxAgeMs` of the current time (replay protection)
3. Recompute the HMAC-SHA256 of `timestamp.payload` using the shared secret
4. Compare using timing-safe equality

### Signature Verification Implementation

```typescript
// The actual verification logic (from @tenantscale/sdk/src/webhooks/verify.ts)
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature({
  payload,
  signatureHeader,
  secret,
  maxAgeMs = 5 * 60 * 1000,
}: {
  payload: unknown
  signatureHeader: string
  secret: string
  maxAgeMs?: number
}): boolean {
  // Parse header: "t=1721234567,signature=abc123..."
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => p.split('='))
  )

  const timestamp = parseInt(parts['t'] ?? '0', 10)
  const signature = parts['signature'] ?? ''

  // Reject if timestamp is too old
  const age = Date.now() - timestamp * 1000
  if (age > maxAgeMs) return false

  // Verify signature includes the timestamp
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`
  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  return timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  )
}
```

## Retry Policy

Failed deliveries are automatically retried with exponential backoff.

### Retry Schedule

| Attempt | Delay Before Retry | Cumulative Time |
|---------|-------------------|-----------------|
| 1 | Immediate | 0s |
| 2 | ~10 seconds | ~10s |
| 3 | ~30 seconds | ~40s |
| 4 | ~1 minute | ~1m 40s |
| 5 | ~3 minutes | ~4m 40s |
| 6 | ~10 minutes | ~14m 40s |
| 7 | ~30 minutes | ~44m 40s |
| 8 | ~1 hour | ~1h 44m |

After 8 failed attempts, the delivery is marked as **failed** and no further attempts are made.

### Configuring Retry Policy

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  webhooks: {
    maxRetries: 8,
    retryBaseDelayMs: 5000,      // Base delay: 5 seconds
    retryMaxDelayMs: 3600000,    // Max delay: 1 hour
    requestTimeoutMs: 10000,     // Request timeout: 10 seconds
    maxConcurrentDeliveries: 50, // Max concurrent deliveries
  },
})
```

### Delivery Queue Configuration

```typescript
const ts = new TenantScale({
  webhooks: {
    deliveryQueue: {
      type: 'supabase', // 'supabase' | 'redis' | 'rabbitmq'
      pollIntervalMs: 1000, // How often to poll for pending deliveries
    },
  },
})
```

## Webhook Payload

Every webhook delivery follows a consistent envelope:

```typescript
interface WebhookPayload<T = Record<string, unknown>> {
  id: string                 // Unique event ID for idempotency
  tenant_id: string          // Tenant that owns this event
  event: string              // Event type
  created_at: string         // ISO 8601 timestamp
  data: T                    // Event-specific data
  api_version: string        // API version
  signature: string          // Signature for verification
}
```

### Example Payloads

**plan.changed:**

```json
{
  "id": "evt_2N5xK7y8Z9aBcDeF",
  "tenant_id": "tenant-acme-corp",
  "event": "plan.changed",
  "created_at": "2024-07-01T14:30:00Z",
  "data": {
    "previous_plan": { "id": "plan_hobby", "name": "Hobby" },
    "current_plan": { "id": "plan_pro", "name": "Pro" },
    "changed_by": "user@acme.com"
  },
  "api_version": "2024-06-01",
  "signature": "whsec_abc123def456..."
}
```

**invoice.paid:**

```json
{
  "id": "evt_3M6yL8z0AbCdEfGh",
  "tenant_id": "tenant-acme-corp",
  "event": "invoice.paid",
  "created_at": "2024-07-01T14:35:00Z",
  "data": {
    "invoice": {
      "id": "in_1Qa2b3c4d5e6f7g",
      "amount_paid": 29900,
      "currency": "usd",
      "status": "paid",
      "paid_at": "2024-07-01T14:35:00Z"
    }
  },
  "api_version": "2024-06-01",
  "signature": "whsec_abc123def456..."
}
```

## Testing Webhooks

```typescript
import { createWebhookTest } from '@tenantscale/sdk/testing'
import { verifyWebhookSignature } from '@tenantscale/sdk'

describe('webhooks', () => {
  const test = createWebhookTest({ ts })

  it('delivers events to registered endpoints', async () => {
    const endpoint = await test.createEndpoint({
      url: 'https://requestbin.example.com/hooks',
      events: ['plan.changed'],
    })

    await test.triggerEvent({
      event: 'plan.changed',
      data: {
        previous_plan: { id: 'plan_hobby', name: 'Hobby' },
        current_plan: { id: 'plan_pro', name: 'Pro' },
      },
    })

    const delivery = await test.waitForDelivery({
      webhookId: endpoint.id,
      timeoutMs: 5000,
    })

    expect(delivery.status).toBe('delivered')
  })

  it('verifies signatures correctly', () => {
    const payload = { event: 'test', data: { foo: 'bar' } }
    const secret = 'whsec_test_secret'

    const signature = test.generateSignature({ payload, secret })

    const isValid = verifyWebhookSignature({
      payload,
      signature,
      secret,
    })
    expect(isValid).toBe(true)
  })
})
```
