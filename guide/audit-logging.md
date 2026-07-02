# Audit Logging

TenantScale automatically logs every significant action to an append-only audit log. Every event is scoped to a tenant, includes who performed the action, what they did, and when it happened.

## Automatic Audit Events

The SDK emits audit events for built-in actions automatically:

| Event Type | Triggered When |
|------------|---------------|
| `api_key.created` | A new API key is generated |
| `api_key.revoked` | An API key is revoked |
| `api_key.rotated` | An API key is rotated |
| `tenant.created` | A new tenant is created |
| `tenant.updated` | Tenant settings are changed |
| `plan.changed` | A tenant's plan is changed |
| `subscription.created` | A Stripe subscription is created |
| `subscription.updated` | A subscription is modified |
| `subscription.canceled` | A subscription is canceled |
| `webhook.created` | A webhook endpoint is registered |
| `webhook.delivered` | A webhook delivery is attempted |

Events are logged asynchronously — they never block the request-response cycle.

### The AuditEvent Interface

Every audit event conforms to this interface:

```typescript
interface AuditEvent {
  /** Unique event identifier */
  id: string
  /** Tenant that performed the action */
  tenant_id: string
  /** API key ID that performed the action */
  api_key_id: string | null
  /** Actor identifier (user email, system name, etc.) */
  actor: string | null
  /** Event type (dot-separated namespace) */
  event_type: string
  /** Human-readable description */
  description: string
  /** Relevant entity type (e.g., 'api_key', 'tenant') */
  entity_type: string | null
  /** ID of the affected entity */
  entity_id: string | null
  /** Previous state (for updates) */
  old_values: Record<string, unknown> | null
  /** New state (for creates/updates) */
  new_values: Record<string, unknown> | null
  /** IP address of the requester */
  ip_address: string | null
  /** User agent of the requester */
  user_agent: string | null
  /** ISO 8601 timestamp */
  created_at: string
}
```

### Database Schema

The `audit_logs` table in Supabase:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  api_key_id UUID REFERENCES api_keys(id),
  actor TEXT,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON audit_logs
  FOR ALL
  USING (tenant_id = auth.uid());
```

## Querying Audit Logs

Retrieve audit events using the SDK:

```typescript
// Get all audit events for the current tenant
const events = await ts.audit.queryEvents({
  tenantId: req.tenant.id,
  limit: 50,
  order: { column: 'created_at', ascending: false },
})
```

### Filtering Events

The `queryEvents()` method supports rich filtering:

```typescript
interface AuditQuery {
  tenantId: string
  eventTypes?: string[]
  actor?: string
  entityType?: string
  entityId?: string
  dateRange?: {
    start: string  // ISO 8601
    end: string    // ISO 8601
  }
  limit?: number
  offset?: number
  order?: {
    column: 'created_at' | 'event_type' | 'actor'
    ascending: boolean
  }
}
```

**Examples:**

```typescript
// Get all API key events in the last 7 days
const keyEvents = await ts.audit.queryEvents({
  tenantId: req.tenant.id,
  eventTypes: ['api_key.created', 'api_key.revoked', 'api_key.rotated'],
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  },
})

// Get all changes to a specific order
const orderChanges = await ts.audit.queryEvents({
  tenantId: req.tenant.id,
  entityType: 'order',
  entityId: 'order-abc-123',
})

// Paginate through results
const page1 = await ts.audit.queryEvents({
  tenantId: req.tenant.id,
  limit: 100,
  offset: 0,
})
const page2 = await ts.audit.queryEvents({
  tenantId: req.tenant.id,
  limit: 100,
  offset: 100,
})
```

### Admin: Cross-Tenant Audit Queries

With an admin API key, you can query across all tenants:

```typescript
// Admin can see events across all tenants
const allEvents = await ts.audit.admin.queryEvents({
  limit: 100,
  order: { column: 'created_at', ascending: false },
})

// Filter to a specific tenant
const tenantEvents = await ts.audit.admin.queryEvents({
  tenantId: 'tenant-abc-123',
  eventTypes: ['plan.changed'],
})
```

## Custom Events with logEvent()

Log your own business events:

```typescript
// Log a custom business event
await ts.audit.logEvent({
  tenantId: req.tenant.id,
  apiKeyId: req.apiKey?.id,
  actor: req.user?.email ?? 'system',
  eventType: 'order.created',
  description: `Order #${orderId} created for $${amount}`,
  entityType: 'order',
  entityId: orderId,
  newValues: { id: orderId, amount, status: 'pending' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
})
```

**Built-in vs. custom events:**

| Aspect | Built-in Events | Custom Events |
|--------|----------------|---------------|
| Trigger | SDK actions (key creation, plan change, etc.) | Your application code |
| Consistency | Guaranteed fields | You control the payload |
| Performance | Fire-and-forget (non-blocking) | Same fire-and-forget pattern |
| Indexing | Pre-indexed columns | Indexed by entity_type / entity_id |

### Custom Event Patterns

```typescript
// Order lifecycle events
await ts.audit.logEvent({
  tenantId: req.tenant.id,
  eventType: 'order.shipped',
  description: `Order ${orderId} marked as shipped`,
  entityType: 'order',
  entityId: orderId,
  newValues: { status: 'shipped', tracking_number: '1Z999AA10123456784' },
})

// User management events
await ts.audit.logEvent({
  tenantId: req.tenant.id,
  eventType: 'user.role_changed',
  description: `User ${email} role changed from ${oldRole} to ${newRole}`,
  entityType: 'user',
  entityId: userId,
  oldValues: { role: oldRole },
  newValues: { role: newRole },
})

// Document events
await ts.audit.logEvent({
  tenantId: req.tenant.id,
  eventType: 'document.deleted',
  description: `Document "${docName}" deleted by ${actor}`,
  entityType: 'document',
  entityId: docId,
  oldValues: { name: docName, size: fileSize },
})
```

## Standalone AuditLogger

For advanced scenarios, you can use the `AuditLogger` directly:

```typescript
import { AuditLogger } from '@tenantscale/sdk'

const logger = new AuditLogger({
  supabase: supabaseClient,
  // Events are batched and sent in the background
  batchSize: 10,
  flushIntervalMs: 5000,
  // Optional: custom namespace
  namespace: 'my-app',
})

// Log without tenant context (global events)
await logger.log({
  eventType: 'system.maintenance',
  description: 'Scheduled maintenance completed',
  actor: 'infra-bot',
  newValues: { duration_minutes: 15 },
})

// Use throughout your app
app.post('/api/documents', async (req, res) => {
  const doc = await createDocument(req.body)
  await logger.log({
    tenantId: req.tenant.id,
    eventType: 'document.created',
    description: `Document "${doc.name}" created`,
    entityType: 'document',
    entityId: doc.id,
    actor: req.user.email,
    ipAddress: req.ip,
  })
  res.json(doc)
})
```

**Configuration options:**

| Option | Default | Description |
|--------|---------|-------------|
| `batchSize` | 10 | Events are flushed when this many accumulate |
| `flushIntervalMs` | 5000 | Max time before pending events are flushed |
| `maxQueueSize` | 1000 | Max events in memory before dropping |
| `namespace` | `null` | Prefix for event types (e.g., `my-app.`) |
| `onError` | `console.error` | Error handler for failed inserts |

## Retention Configuration

Audit logs can grow quickly. TenantScale provides configurable retention policies.

### Global Retention

Set a global retention period in the SDK configuration:

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  audit: {
    // Automatically delete events older than this
    retentionDays: 90,
    // Cleanup runs daily at 3 AM
    cleanupSchedule: '0 3 * * *',
  },
})
```

### Per-Plan Retention

You can also set different retention periods per plan:

```typescript
// Plan definition with audit retention
const plan = {
  id: 'plan_pro',
  name: 'Pro',
  features: { audit_logs: true },
  limits: {
    audit_retention_days: 365,  // 1 year for Pro
  },
}

// Plan definition for Free tier
const freePlan = {
  id: 'plan_free',
  name: 'Free',
  features: { audit_logs: false },  // No audit logs at all
}
```

| Plan | audit_logs feature | audit_retention_days | Effective Retention |
|------|-------------------|---------------------|--------------------|
| Free | `false` | — | Audit logging disabled |
| Hobby | `true` | 30 | 30 days |
| Pro | `true` | 365 | 1 year |
| Enterprise | `true` | 730 | 2 years |

### Manual Cleanup

Trigger retention cleanup manually:

```typescript
// Clean up old events for all tenants
const deleted = await ts.audit.cleanup({
  retentionDays: 90,
})
console.log(`Deleted ${deleted} events older than 90 days`)

// Clean up for a specific tenant
const tenantDeleted = await ts.audit.cleanup({
  tenantId: 'tenant-abc-123',
  retentionDays: 30,
})
```

### Archiving

For compliance requirements, archive events before deletion:

```typescript
// Archive events to a separate table or export
await ts.audit.archive({
  olderThanDays: 90,
  destination: 'audit_archive',  // Another Supabase table
})

// Export as JSON
const exportStream = await ts.audit.export({
  tenantId: 'tenant-abc-123',
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31',
  },
  format: 'jsonl',
})
```

## Best Practices

### 1. Log Everything Notable

A good rule of thumb: if a human would want to know about it later, log it.

```typescript
// ✅ DO: Log state-changing operations
await ts.audit.logEvent({
  tenantId: req.tenant.id,
  eventType: 'email.template_updated',
  description: `Email template "${templateName}" updated by ${actor}`,
  entityType: 'email_template',
  entityId: templateId,
  oldValues: { subject: oldSubject, body: oldBody },
  newValues: { subject: newSubject, body: newBody },
})

// ❌ DON'T: Log every read operation (too noisy)
await ts.audit.logEvent({
  eventType: 'page.viewed',  // 10,000 views/day = 10,000 log entries
})
```

### 2. Include Context

Always include enough context to understand what happened:

```typescript
// ❌ TOO LITTLE CONTEXT
await ts.audit.logEvent({
  eventType: 'user.updated',
  description: 'User was updated',
})

// ✅ GOOD CONTEXT
await ts.audit.logEvent({
  eventType: 'user.updated',
  description: `User ${email} updated: role changed from ${oldRole} to ${newRole}`,
  actor: adminEmail,
  entityType: 'user',
  entityId: userId,
  oldValues: { role: oldRole },
  newValues: { role: newRole },
  ipAddress: req.ip,
})
```

### 3. Use Consistent Event Type Naming

Establish a convention and stick to it:

```
<entity>.<action>
```

| Pattern | Examples |
|---------|----------|
| `order.created` | `order.created`, `order.shipped`, `order.canceled` |
| `user.*` | `user.invited`, `user.removed`, `user.role_changed` |
| `billing.*` | `billing.invoice_paid`, `billing.payment_failed` |
| `settings.*` | `settings.updated`, `settings.export_requested` |

### 4. Use Old/New Values for Updates

Recording before-and-after state is invaluable for debugging:

```typescript
await ts.audit.logEvent({
  eventType: 'api_key.scope_changed',
  oldValues: { scope: ['orders:read'] },
  newValues: { scope: ['orders:read', 'orders:write'] },
})
```

### 5. Monitor Audit Log Health

Set up alerts for audit log failures:

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  audit: {
    onError: (error, events) => {
      // Send to your error tracking service
      sentry.captureException(error, {
        extra: { pendingEvents: events.length },
      })
      // Or write to a fallback log
      console.error('Audit log failed, events queued:', events.length)
    },
  },
})
```

### 6. Rate-Limit Audit Logging

If you have high-volume events, use the batch mechanism effectively:

```typescript
const logger = new AuditLogger({
  supabase: supabaseClient,
  batchSize: 50,        // Flush every 50 events
  flushIntervalMs: 2000, // Or every 2 seconds, whichever comes first
  maxQueueSize: 5000,    // Drop events if queue gets too large
})
```

## Testing Audit Logging

```typescript
import { createAuditTest } from '@tenantscale/sdk/testing'

describe('audit logging', () => {
  const test = createAuditTest({ ts })

  it('logs built-in events automatically', async () => {
    const key = await ts.createApiKey({ name: 'Test Key' })

    const events = await ts.audit.queryEvents({
      tenantId: key.tenant_id,
      eventTypes: ['api_key.created'],
    })

    expect(events).toHaveLength(1)
    expect(events[0].entity_id).toBe(key.id)
    expect(events[0].new_values).toMatchObject({
      name: 'Test Key',
    })
  })

  it('logs custom events', async () => {
    await ts.audit.logEvent({
      tenantId: test.tenantId,
      eventType: 'test.custom_event',
      description: 'A custom test event',
      newValues: { test: true },
    })

    const events = await ts.audit.queryEvents({
      tenantId: test.tenantId,
      eventTypes: ['test.custom_event'],
    })

    expect(events).toHaveLength(1)
  })

  it('respects tenant isolation', async () => {
    // Events from Tenant A should not appear in Tenant B's queries
    const tenantAEvents = await ts.audit.queryEvents({
      tenantId: test.tenantAId,
    })
    const tenantBEvents = await ts.audit.queryEvents({
      tenantId: test.tenantBId,
    })

    // Each tenant only sees their own events
    const allA = tenantAEvents.every(e => e.tenant_id === test.tenantAId)
    const allB = tenantBEvents.every(e => e.tenant_id === test.tenantBId)
    expect(allA).toBe(true)
    expect(allB).toBe(true)
  })
})
```

## Related Resources

- [Source: Audit Logger](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/audit/logger.ts)
- [Source: Audit Middleware](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/middleware/audit-log.ts)
- [Source: Audit Query Builder](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/audit/query.ts)
- [Core Concepts →](/guide/core-concepts)
- [Webhooks →](/guide/webhooks)
