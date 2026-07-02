# Audit Events

The `AuditLogger` provides structured, immutable event logging. Every event is stored in the `audit_logs` table in Supabase and can be queried by tenant, event type, or time range.

## AuditLogger

Access the audit logger via `ts.audit`:

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
})

await ts.audit.logEvent({ ... })
await ts.audit.queryEvents({ ... })
```

### AuditEvent Interface

```typescript
interface AuditEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
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

## logEvent()

Log a structured audit event.

```typescript
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

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | `string` | ✅ | Tenant that performed the action |
| `eventType` | `string` | ✅ | Dot-separated event type name |
| `description` | `string` | ✅ | Human-readable summary of what happened |
| `apiKeyId` | `string \| null` | — | API key ID that performed the action |
| `actor` | `string \| null` | — | Who performed the action (email, user ID, system name) |
| `entityType` | `string \| null` | — | Type of entity affected (e.g., `'order'`, `'user'`) |
| `entityId` | `string \| null` | — | ID of the affected entity |
| `oldValues` | `Record<string, unknown> \| null` | — | Previous state (for updates) |
| `newValues` | `Record<string, unknown> \| null` | — | New state (for creates/updates) |
| `ipAddress` | `string \| null` | — | Requester IP address |
| `userAgent` | `string \| null` | — | Requester user agent |

### Return Type

```typescript
type LogEventResult =
  | { data: { id: string }; error: null }
  | { data: null; error: TenantScaleError }
```

## Event Type Conventions

Event types follow a `<entity>.<action>` naming convention:

| Pattern | Examples |
|---------|----------|
| `tenant.*` | `tenant.created`, `tenant.updated`, `tenant.deleted` |
| `api_key.*` | `api_key.created`, `api_key.revoked`, `api_key.rotated` |
| `plan.*` | `plan.changed`, `plan.overridden` |
| `order.*` | `order.created`, `order.shipped`, `order.canceled`, `order.refunded` |
| `subscription.*` | `subscription.created`, `subscription.updated`, `subscription.canceled` |
| `webhook.*` | `webhook.created`, `webhook.delivered`, `webhook.deleted` |
| `invoice.*` | `invoice.paid`, `invoice.payment_failed`, `invoice.refunded` |
| `user.*` | `user.invited`, `user.removed`, `user.role_changed` |
| `settings.*` | `settings.updated`, `settings.export_requested` |
| `system.*` | `system.maintenance`, `system.error`, `system.config_change` |
| `billing.*` | `billing.payment_method_updated`, `billing.tax_updated` |

### Best Practices for Custom Events

```typescript
// ✅ DO: Use consistent naming
eventType: 'document.uploaded'

// ✅ DO: Include old/new values for updates
await ts.audit.logEvent({
  eventType: 'user.role_changed',
  oldValues: { role: 'member' },
  newValues: { role: 'admin' },
})

// ✅ DO: Write descriptive descriptions
description: `User admin@acme.com changed role of user@acme.com from member to admin`

// ❌ DON'T: Log every read operation
eventType: 'page.viewed' // Too noisy — 10k views/day = 10k log rows

// ❌ DON'T: Use vague descriptions
description: 'User was updated' // What changed? Who did it?
```

## queryEvents()

Query audit events with rich filtering and pagination.

```typescript
const events = await ts.audit.queryEvents({
  tenantId: 'tenant-acme-123',
  eventTypes: ['api_key.created', 'api_key.revoked'],
  actor: 'admin@acme.com',
  dateRange: {
    start: '2024-06-01T00:00:00Z',
    end: '2024-07-01T00:00:00Z',
  },
  limit: 50,
  offset: 0,
  order: { column: 'created_at', ascending: false },
})
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tenantId` | `string` | — | **Required.** Tenant to query events for |
| `eventTypes` | `string[]` | — | Filter by specific event types |
| `actor` | `string` | — | Filter by actor (email, user ID, system name) |
| `entityType` | `string` | — | Filter by affected entity type |
| `entityId` | `string` | — | Filter by affected entity ID |
| `dateRange.start` | `string` | — | ISO 8601 start of time range |
| `dateRange.end` | `string` | — | ISO 8601 end of time range |
| `limit` | `number` | `50` | Maximum results (max: 1000) |
| `offset` | `number` | `0` | Pagination offset |
| `order.column` | `'created_at' \| 'event_type' \| 'actor'` | `'created_at'` | Sort column |
| `order.ascending` | `boolean` | `false` | Sort direction |

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}
```

### Query Examples

```typescript
// Recent events for a tenant dashboard
const recent = await ts.audit.queryEvents({
  tenantId: req.tenant.id,
  limit: 20,
  order: { column: 'created_at', ascending: false },
})

// Security audit: all key-related events this month
const keyAudit = await ts.audit.queryEvents({
  tenantId: 'tenant-acme-123',
  eventTypes: ['api_key.created', 'api_key.revoked', 'api_key.rotated'],
  dateRange: {
    start: new Date(new Date().setDate(1)).toISOString(),
    end: new Date().toISOString(),
  },
})

// Changes to a specific entity
const orderChanges = await ts.audit.queryEvents({
  tenantId: 'tenant-acme-123',
  entityType: 'order',
  entityId: 'order-abc-456',
})

// Activity by a specific user
const userActivity = await ts.audit.queryEvents({
  tenantId: 'tenant-acme-123',
  actor: 'user@acme.com',
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  },
})
```

## Standalone AuditLogger

For advanced scenarios, use the `AuditLogger` directly:

```typescript
import { AuditLogger } from '@tenantscale/sdk'

const logger = new AuditLogger({
  supabase: supabaseClient,
  batchSize: 10,
  flushIntervalMs: 5000,
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

### Standalone Logger Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `supabase` | `SupabaseClient` | — | **Required.** Supabase client instance |
| `batchSize` | `number` | `10` | Events are flushed when this many accumulate |
| `flushIntervalMs` | `number` | `5000` | Max time before pending events are flushed |
| `maxQueueSize` | `number` | `1000` | Max events in memory before dropping |
| `namespace` | `string` | `''` | Prefix for event types (e.g., `'my-app.'`) |
| `tableName` | `string` | `'audit_logs'` | Custom table name for audit logs |
| `onError` | `(error, events) => void` | `console.error` | Error handler for failed inserts |

## Retention

Audit logs can grow quickly. Configure retention to manage storage.

### Global Retention

```typescript
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  audit: {
    retentionDays: 90,
    cleanupSchedule: '0 3 * * *',    // Daily at 3 AM
  },
})
```

### Per-Plan Retention

Different plans can have different retention periods:

```typescript
// Plan definitions
const planHobby = {
  id: 'plan_hobby',
  limits: {
    audit_retention_days: 30,  // 30-day retention
  },
}

const planPro = {
  id: 'plan_pro',
  features: { audit_logs: true },
  limits: {
    audit_retention_days: 365,  // 1 year retention
  },
}
```

| Plan | `audit_logs` feature | `audit_retention_days` | Effective Retention |
|------|---------------------|----------------------|--------------------|
| Free | `false` | — | Audit logging disabled |
| Hobby | `true` | 30 | 30 days |
| Pro | `true` | 365 | 1 year |
| Enterprise | `true` | 730 | 2 years |

### Manual Cleanup

```typescript
// Clean up old events for all tenants
const deleted = await ts.audit.cleanup({ retentionDays: 90 })
console.log(`Deleted ${deleted} events older than 90 days`)

// Clean up for a specific tenant
const tenantDeleted = await ts.audit.cleanup({
  tenantId: 'tenant-acme-123',
  retentionDays: 30,
})
```

### Archiving

For compliance, archive events before deletion:

```typescript
// Archive to a separate table
await ts.audit.archive({
  olderThanDays: 90,
  destination: 'audit_archive', // Another Supabase table
})

// Export as JSONL
const exportStream = await ts.audit.export({
  tenantId: 'tenant-acme-123',
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31',
  },
  format: 'jsonl',
})
```

## Admin: Cross-Tenant Queries

With an admin API key, query across all tenants:

```typescript
// All events across all tenants (admin only)
const allEvents = await ts.audit.admin.queryEvents({
  limit: 100,
  order: { column: 'created_at', ascending: false },
})

// Events for a specific tenant (admin access)
const tenantEvents = await ts.audit.admin.queryEvents({
  tenantId: 'tenant-acme-123',
  eventTypes: ['plan.changed'],
})
```

## Error Handling

```typescript
import { TenantScaleError, ValidationError } from '@tenantscale/sdk'

try {
  await ts.audit.logEvent({
    tenantId: req.tenant.id,
    eventType: 'order.created',
    description: 'New order created',
    // Missing entityType, entityId — still valid
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message)
  } else if (error instanceof TenantScaleError) {
    console.error('Audit log failed:', error.message)
  }
}
```

## Testing Audit Logging

```typescript
import { createTenantTest } from '@tenantscale/sdk/testing'

describe('audit logging', () => {
  it('logs and retrieves custom events', async () => {
    await ts.audit.logEvent({
      tenantId: 'test-tenant-id',
      eventType: 'test.event',
      description: 'Test event',
    })

    const events = await ts.audit.queryEvents({
      tenantId: 'test-tenant-id',
      eventTypes: ['test.event'],
    })

    expect(events.data).toHaveLength(1)
    expect(events.data[0].event_type).toBe('test.event')
    expect(events.data[0].description).toBe('Test event')
  })
})
```
