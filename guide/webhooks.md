# Webhooks

TenantScale provides a built-in webhook system that lets your tenants receive real-time notifications about events in their account. The system handles delivery, retries, and signature verification.

## Webhook Event Types

Tenants can subscribe to receive notifications for these events:

| Event Type | Description | Payload Includes |
|------------|-------------|------------------|
| `api_key.created` | A new API key was generated | `{ api_key: { id, name, key_prefix } }` |
| `api_key.revoked` | An API key was revoked | `{ api_key: { id, name } }` |
| `tenant.updated` | Tenant settings changed | `{ tenant: { id, name, slug }, changes: [...] }` |
| `plan.changed` | Tenant's plan was changed | `{ previous_plan: {...}, current_plan: {...} }` |
| `subscription.created` | A new subscription started | `{ subscription: { id, status, current_period_start } }` |
| `subscription.updated` | Subscription was modified | `{ subscription: { id, status, ... }, changes: [...] }` |
| `subscription.canceled` | Subscription was canceled | `{ subscription: { id, status, canceled_at } }` |
| `invoice.paid` | An invoice was paid | `{ invoice: { id, amount_paid, currency, status } }` |
| `invoice.payment_failed` | Payment failed | `{ invoice: { id, amount_due, attempt_count, next_attempt } }` |
| `data.exported` | Data export completed | `{ export: { id, type, format, download_url } }` |
| `user.invited` | Team member was invited | `{ invitation: { email, role, invited_by } }` |
| `user.removed` | Team member was removed | `{ user: { email, role } }` |

### Payload Shape

Every webhook delivery follows a consistent envelope:

```typescript
interface WebhookPayload<T = Record<string, unknown>> {
  /** Unique event ID for idempotency */
  id: string
  /** Tenant that owns this event */
  tenant_id: string
  /** Event type (same as subscription) */
  event: string
  /** ISO 8601 timestamp of when the event occurred */
  created_at: string
  /** Event-specific data */
  data: T
  /** API version that generated this event */
  api_version: string
  /** Signature for verification (see below) */
  signature: string
}
```

**Example: `plan.changed` payload**

```json
{
  "id": "evt_2N5xK7y8Z9aBcDeF",
  "tenant_id": "tenant-acme-corp",
  "event": "plan.changed",
  "created_at": "2024-07-01T14:30:00Z",
  "data": {
    "previous_plan": {
      "id": "plan_hobby",
      "name": "Hobby"
    },
    "current_plan": {
      "id": "plan_pro",
      "name": "Pro"
    },
    "changed_by": "user@acme.com"
  },
  "api_version": "2024-06-01",
  "signature": "whsec_abc123def456..."
}
```

**Example: `invoice.paid` payload**

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
      "paid_at": "2024-07-01T14:35:00Z",
      "period_start": "2024-07-01T00:00:00Z",
      "period_end": "2024-08-01T00:00:00Z"
    }
  },
  "api_version": "2024-06-01",
  "signature": "whsec_abc123def456..."
}
```

## Signature Verification

Every webhook payload is signed with a secret key. Your tenant's endpoint **must** verify the signature before processing the payload to ensure it came from TenantScale and hasn't been tampered with.

### How Signatures Work

1. TenantScale generates a unique `webhook_secret` for each registered endpoint
2. The payload is serialized to JSON and signed using HMAC-SHA256
3. The signature is included in the `Webhook-Signature` header and the payload body
4. Your endpoint verifies the signature using the shared secret

### Verification Example

```typescript
import { verifyWebhookSignature } from '@tenantscale/sdk/webhooks'

// Your webhook endpoint
app.post('/api/webhooks/tenantscale', async (req, res) => {
  const signature = req.headers['webhook-signature'] as string
  const secret = process.env.TENANTSCALE_WEBHOOK_SECRET!

  // 1. Verify the signature
  const isValid = verifyWebhookSignature({
    payload: req.body,
    signature,
    secret,
  })

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // 2. Process the event
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

  // 3. Acknowledge receipt
  res.status(200).json({ received: true })
})
```

**Signature verification implementation:**

```typescript
// From @tenantscale/sdk/src/webhooks/verify.ts
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature({
  payload,
  signature,
  secret,
}: {
  payload: unknown
  signature: string
  secret: string
}): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')

  const expected = Buffer.from(expectedSignature)
  const actual = Buffer.from(signature)

  // Constant-time comparison prevents timing attacks
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
```

### Signature Header

The `Webhook-Signature` header includes the timestamp and signature:

```
Webhook-Signature: t=1721234567,signature=abc123def456...
```

You should verify both the signature and the timestamp to prevent replay attacks:

```typescript
function verifyWebhookSignature({
  payload,
  signatureHeader,
  secret,
  maxAgeMs = 5 * 60 * 1000, // 5 minutes
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

  const timestamp = parseInt(parts.t, 10)
  const signature = parts.signature

  // Reject if timestamp is too old (prevents replay attacks)
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

TenantScale automatically retries failed deliveries with exponential backoff.

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

### Retry Logic

```typescript
// From @tenantscale/sdk/src/webhooks/delivery.ts
function calculateBackoff(attempt: number): number {
  // Exponential backoff with jitter
  const baseDelay = 5000 // 5 seconds base
  const exponential = Math.min(
    baseDelay * Math.pow(3, attempt - 1),
    3600000 // Max 1 hour
  )
  // Add ±25% jitter
  const jitter = exponential * (0.75 + Math.random() * 0.5)
  return Math.floor(jitter)
}
```

### Delivery Statuses

| Status | Description |
|--------|-------------|
| `pending` | Queued for delivery |
| `delivering` | Currently being sent |
| `delivered` | Successfully delivered (HTTP 2xx) |
| `failed` | All retries exhausted |
| `cancelled` | Webhook endpoint was deleted before delivery |

### Monitoring Deliveries

```typescript
// Get delivery status for a specific webhook
const deliveries = await ts.webhooks.getDeliveries({
  webhookId: 'wh_abc123',
  status: 'failed', // Filter by status
  limit: 10,
})

// Each delivery includes:
interface DeliveryAttempt {
  id: string
  webhook_id: string
  event_id: string
  status: 'pending' | 'delivering' | 'delivered' | 'failed'
  attempt: number
  max_attempts: number
  response_status: number | null
  response_body: string | null
  error_message: string | null
  executed_at: string
  next_retry_at: string | null
}
```

### Retry a Failed Delivery

```typescript
// Manually retry a failed delivery (admin only)
await ts.webhooks.admin.retryDelivery({
  deliveryId: 'del_failed_123',
})
```

## Delivery Statuses Table

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Event is queued, waiting to be sent | Wait for delivery |
| `delivering` | Currently being sent to the endpoint | Monitor |
| `delivered` | Endpoint returned HTTP 2xx | No action needed |
| `failed` | All 8 retries exhausted | Check endpoint health, then retry |
| `cancelled` | Webhook was deleted mid-delivery | No action needed |

## Registering a Webhook Endpoint

### As a Tenant (via SDK or API)

```typescript
// Register a webhook to receive specific events
const webhook = await ts.webhooks.create({
  url: 'https://my-app.com/api/webhooks/tenantscale',
  events: [
    'plan.changed',
    'subscription.canceled',
    'invoice.paid',
    'invoice.payment_failed',
  ],
  description: 'Production webhook for billing events',
})

console.log('Save this secret — it will not be shown again!')
console.log(`Webhook Secret: ${webhook.secret}`)
// Output:
// Webhook ID: wh_prod_abc123
// Webhook Secret: whsec_abc123def456...
```

### Via the Management API

```bash
curl -X POST https://api.tenantscale.com/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://my-app.com/api/webhooks/tenantscale",
    "events": ["plan.changed", "invoice.paid"],
    "description": "Production webhook"
  }'
```

Response:

```json
{
  "id": "wh_prod_abc123",
  "url": "https://my-app.com/api/webhooks/tenantscale",
  "events": ["plan.changed", "invoice.paid"],
  "status": "active",
  "secret": "whsec_abc123def456...",
  "created_at": "2024-07-01T14:00:00Z"
}
```

### Managing Webhooks

```typescript
// List all webhooks for the current tenant
const webhooks = await ts.webhooks.list()

// Update an existing webhook
await ts.webhooks.update({
  webhookId: 'wh_prod_abc123',
  events: ['plan.changed', 'invoice.paid', 'invoice.payment_failed'],
})

// Rotate the webhook secret
const newSecret = await ts.webhooks.rotateSecret({
  webhookId: 'wh_prod_abc123',
})

// Delete a webhook
await ts.webhooks.delete({ webhookId: 'wh_prod_abc123' })
```

## Configuration Options

### Global Webhook Settings

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  webhooks: {
    // Delivery settings
    maxRetries: 8,
    retryBaseDelayMs: 5000,
    retryMaxDelayMs: 3600000, // 1 hour
    requestTimeoutMs: 10000,   // 10 second timeout per attempt

    // Concurrency
    maxConcurrentDeliveries: 50,

    // Queue
    deliveryQueue: {
      type: 'supabase',  // 'supabase' | 'redis' | 'rabbitmq'
      pollIntervalMs: 1000,
    },

    // Signing
    signatureHeader: 'Webhook-Signature',
    signatureVersion: 2,

    // Payload
    maxPayloadSizeBytes: 256_000, // 256KB
  },
})
```

### Per-Tenant Configuration

Tenants can configure their webhook preferences:

```typescript
// Tenant-level webhook settings (set by tenant admin)
await ts.tenants.updateWebhookConfig({
  retrySettings: {
    maxRetries: 15, // Enterprise tenant gets more retries
  },
  rateLimit: {
    maxDeliveriesPerMinute: 100,
  },
})
```

## Testing Webhooks

### Local Testing with the SDK

```typescript
import { createWebhookTest } from '@tenantscale/sdk/testing'

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

    // Wait for delivery
    const delivery = await test.waitForDelivery({
      webhookId: endpoint.id,
      timeoutMs: 5000,
    })

    expect(delivery.status).toBe('delivered')
  })

  it('retries failed deliveries', async () => {
    const endpoint = await test.createEndpoint({
      url: 'https://httpbin.org/status/500', // Always fails
      events: ['plan.changed'],
    })

    await test.triggerEvent({ event: 'plan.changed', data: {} })

    // Should attempt retries
    const deliveries = await test.waitForAttempts({
      webhookId: endpoint.id,
      attempts: 3,
      timeoutMs: 30000,
    })

    expect(deliveries).toHaveLength(3)
    expect(deliveries[0].status).toBe('failed')
  })

  it('verifies signatures correctly', () => {
    const payload = { event: 'test', data: { foo: 'bar' } }
    const secret = 'whsec_test_secret'

    // Generate signature
    const signature = test.generateSignature({ payload, secret })

    // Verify
    const isValid = verifyWebhookSignature({
      payload,
      signature,
      secret,
    })
    expect(isValid).toBe(true)

    // Wrong secret should fail
    const wrongSecret = verifyWebhookSignature({
      payload,
      signature,
      secret: 'wrong_secret',
    })
    expect(wrongSecret).toBe(false)
  })
})
```

### Using the Stripe Webhook Simulator

For testing Stripe-related webhooks:

```typescript
// Trigger a test invoice.paid event
await test.triggerStripeEvent({
  type: 'invoice.paid',
  invoice: {
    id: 'in_test_123',
    amount_paid: 29900,
    currency: 'usd',
  },
})
```

## Best Practices

### 1. Always Verify Signatures

Never skip signature verification — it's the only way to ensure the webhook came from TenantScale.

```typescript
// ✅ ALWAYS verify
app.post('/webhooks', (req, res) => {
  if (!verifyWebhookSignature({ ... })) {
    return res.status(401).end()
  }
  // ...
})

// ❌ NEVER skip verification
app.post('/webhooks', (req, res) => {
  // Trusting req.body without verification!
  // Anyone can send fake events here
})
```

### 2. Respond Quickly (Under 10 Seconds)

Webhook deliveries have a 10-second timeout. If your processing takes longer, acknowledge immediately and process asynchronously:

```typescript
app.post('/api/webhooks/tenantscale', async (req, res) => {
  // 1. Verify signature
  if (!verifyWebhookSignature({ ... })) {
    return res.status(401).end()
  }

  // 2. Acknowledge immediately (under 10s)
  res.status(200).json({ received: true })

  // 3. Process asynchronously
  processWebhookEvent(req.body).catch(err => {
    console.error('Webhook processing failed:', err)
  })
})

async function processWebhookEvent(payload: WebhookPayload) {
  // This runs after we've already responded
  switch (payload.event) {
    case 'invoice.paid':
      await updateAccountingSystem(payload.data)
      await sendReceiptEmail(payload.data)
      break
  }
}
```

### 3. Handle Idempotency

Webhook deliveries can be duplicated. Use the event `id` for idempotency:

```typescript
const processedEvents = new Set<string>()

app.post('/api/webhooks/tenantscale', async (req, res) => {
  const { id } = req.body

  // Skip if already processed
  if (processedEvents.has(id)) {
    return res.status(200).json({ received: true, duplicate: true })
  }

  processedEvents.add(id)

  // Process the event
  // ...
})
```

For persistence across restarts, store processed event IDs in a database table.

### 4. Monitor Webhook Health

Set up monitoring for webhook delivery failures:

```typescript
const ts = new TenantScale({
  webhooks: {
    onDeliveryFailed: (delivery) => {
      // Alert your team
      alerts.send({
        severity: 'warning',
        title: 'Webhook delivery failed',
        message: `Webhook ${delivery.webhook_id} failed after ${delivery.attempt} attempts`,
        metadata: {
          url: delivery.url,
          event: delivery.event_id,
          error: delivery.error_message,
        },
      })
    },
  },
})
```

### 5. Log All Deliveries

Audit log webhook deliveries for debugging:

```typescript
const ts = new TenantScale({
  webhooks: {
    onDelivered: (delivery) => {
      ts.audit.logEvent({
        tenantId: delivery.tenant_id,
        eventType: 'webhook.delivered',
        description: `Webhook ${delivery.webhook_id} delivered ${delivery.event} to ${delivery.url}`,
        entityType: 'webhook_delivery',
        entityId: delivery.id,
        newValues: {
          event: delivery.event,
          response_status: delivery.response_status,
          attempt: delivery.attempt,
        },
      })
    },
  },
})
```

## Related Resources

- [Source: Webhook Delivery Engine](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/webhooks/delivery.ts)
- [Source: Webhook Signature Verification](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/webhooks/verify.ts)
- [Source: Webhook Routes (API)](https://github.com/TenantScale/api/blob/main/src/routes/webhooks.ts)
- [Source: Webhook Test Utilities](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/testing/webhooks.ts)
- [Audit Logging →](/guide/audit-logging)
- [Billing →](/guide/billing)
- [SDK Webhooks Reference →](/sdk/webhooks)
