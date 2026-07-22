# Drizzle Adapter

`@tenantscale/drizzle` provides tenant-safe helpers for Drizzle ORM. Use it to add automatic tenant filtering to your database queries with explicit, expression-based filtering that integrates seamlessly with Drizzle's query builder.

## Installation

```bash
npm install @tenantscale/drizzle
# or
pnpm add @tenantscale/drizzle
```

**Peer dependencies:** Requires `drizzle-orm` and `@tenantscale/sdk@^1.0.0`.

## Quick Start

```typescript
import { tenantFilter } from '@tenantscale/drizzle';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { tickets } from './schema';

// Get tenant ID from your auth context
const tenantId = 'tenant_123';

// Select with tenant filter - only returns tickets for this tenant
const tickets = await db
  .select()
  .from(tickets)
  .where(tenantFilter(tickets.tenant_id, tenantId));
```

## `tenantFilter()`

The main helper function. Creates a Drizzle SQL expression for filtering queries by tenant ID. This returns a proper Drizzle SQL expression that can be combined with other conditions using `and()`, `or()`, etc.

```typescript
import { tenantFilter } from '@tenantscale/drizzle';

tenantFilter(column, tenantId)
```

### Parameters

- **`column`**: The Drizzle column reference (e.g., `tickets.tenant_id`)
- **`tenantId`**: The tenant ID to filter by (string)

### Returns

A Drizzle SQL expression compatible with `.where()` clauses.

### Error Handling

The helper throws an error if `tenantId` is empty or undefined:

```typescript
tenantFilter(tickets.tenant_id, ''); // Throws: tenantId is required
tenantFilter(tickets.tenant_id, undefined); // Throws: tenantId is required
```

**Note:** This validation helps catch bugs early where tenant context might be missing from your request handler.

## Query Operations

### Select Queries

```typescript
import { tenantFilter } from '@tenantscale/drizzle';
import { and, eq, like, gte } from 'drizzle-orm';

// Simple tenant filter - get all tickets for this tenant
const tickets = await db
  .select()
  .from(tickets)
  .where(tenantFilter(tickets.tenant_id, tenantId));

// Combine with other conditions using and()
const openTickets = await db
  .select()
  .from(tickets)
  .where(and(
    eq(tickets.status, 'open'),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// Multiple conditions - complex filtering
const urgentOpenTickets = await db
  .select()
  .from(tickets)
  .where(and(
    eq(tickets.status, 'open'),
    like(tickets.subject, '%urgent%'),
    gte(tickets.priority, 3),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// With joins - filter by tenant on the main table
const results = await db
  .select({
    ticket: tickets,
    user: users,
  })
  .from(tickets)
  .innerJoin(users, eq(tickets.userId, users.id))
  .where(tenantFilter(tickets.tenant_id, tenantId));
```

**Note:** Always include `tenantFilter` as part of your condition chain to ensure tenant isolation.

### Update Queries

```typescript
import { tenantFilter } from '@tenantscale/drizzle';
import { and, eq } from 'drizzle-orm';

// Update a specific ticket - tenant-safe
await db
  .update(tickets)
  .set({ status: 'closed', closedAt: new Date() })
  .where(and(
    eq(tickets.id, ticketId),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// Bulk update - only affects this tenant's records
await db
  .update(tickets)
  .set({ status: 'archived' })
  .where(and(
    eq(tickets.status, 'closed'),
    tenantFilter(tickets.tenant_id, tenantId)
  ));
```

**Note:** The tenant filter prevents accidental updates to other tenants' data. If the ticket doesn't belong to this tenant, the update affects 0 rows.

### Delete Queries

```typescript
import { tenantFilter } from '@tenantscale/drizzle';
import { and, eq, lt } from 'drizzle-orm';

// Delete all records for a tenant (use with caution)
await db
  .delete(tickets)
  .where(tenantFilter(tickets.tenant_id, tenantId));

// Delete specific record with tenant safety
await db
  .delete(tickets)
  .where(and(
    eq(tickets.id, ticketId),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// Conditional delete - old archived tickets
await db
  .delete(tickets)
  .where(and(
    eq(tickets.status, 'archived'),
    lt(tickets.createdAt, new Date('2024-01-01')),
    tenantFilter(tickets.tenant_id, tenantId)
  ));
```

**Note:** Always include tenant filters in delete operations to prevent accidental data loss across tenants.

### Insert Queries

For insert operations, manually add the tenant ID to the values object:

```typescript
import { tenantFilter } from '@tenantscale/drizzle';

// Insert a single record
const [newTicket] = await db
  .insert(tickets)
  .values({
    subject: 'Support request',
    status: 'open',
    priority: 1,
    tenant_id: tenantId, // Manually include tenant ID
  })
  .returning();

// Bulk insert
await db
  .insert(tickets)
  .values([
    { subject: 'Ticket 1', status: 'open', tenant_id: tenantId },
    { subject: 'Ticket 2', status: 'open', tenant_id: tenantId },
    { subject: 'Ticket 3', status: 'open', tenant_id: tenantId },
  ]);
```

**Note:** `tenantFilter` is not used for inserts since there's no `.where()` clause. You must explicitly set `tenant_id` in the values object.

## Design Philosophy

This package takes a deliberately scoped approach to tenant isolation:

- **Explicit filtering**: The `tenantFilter` helper returns a proper Drizzle SQL expression that you explicitly include in your queries. This ensures full compatibility with Drizzle's expression-based API.
- **No magic**: Users must explicitly add the tenant filter to their queries, which makes the behavior clear, predictable, and debuggable.
- **Proxy-based approach rejected**: The initial design used a Proxy to automatically inject tenant filters, but this doesn't work with Drizzle's expression-based API where `.where()` expects SQL expressions like `eq(col, val)`, not column/value tuples.

This design prioritizes correctness and transparency over convenience, ensuring that tenant isolation is always visible in your code.

## Limitations

- **Manual inclusion required**: This helper only provides the tenant filter expression. It does not automatically inject tenant filters into queries. You must remember to include `tenantFilter` in every query that should be tenant-scoped.
- **Insert operations**: For insert operations, you must manually add the tenant ID to the values object. The helper cannot handle this since inserts don't have `.where()` clauses.
- **No query interception**: Unlike some ORM-level solutions, this package doesn't intercept or modify queries. It's a pure helper function that you explicitly use.

## Complete Example

```typescript
import { tenantFilter } from '@tenantscale/drizzle';
import { and, eq, like, gte, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { tickets, users } from './schema';
import { Pool } from 'pg';

// Initialize Drizzle
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Tenant context (typically from your auth middleware)
const tenantId = 'tenant_abc123';

// --- Select operations ---

// Get all tickets for this tenant
const allTickets = await db
  .select()
  .from(tickets)
  .where(tenantFilter(tickets.tenant_id, tenantId));

// Get open tickets with high priority
const highPriorityOpen = await db
  .select()
  .from(tickets)
  .where(and(
    eq(tickets.status, 'open'),
    gte(tickets.priority, 3),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// Search tickets by subject
const searchResults = await db
  .select()
  .from(tickets)
  .where(and(
    like(tickets.subject, '%bug%'),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// Join with users table
const ticketsWithUsers = await db
  .select({
    ticket: tickets,
    user: users,
  })
  .from(tickets)
  .innerJoin(users, eq(tickets.userId, users.id))
  .where(tenantFilter(tickets.tenant_id, tenantId));

// --- Update operations ---

// Close a specific ticket (tenant-safe)
await db
  .update(tickets)
  .set({ status: 'closed', closedAt: new Date() })
  .where(and(
    eq(tickets.id, 'ticket_456'),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// Bulk update - archive old closed tickets
await db
  .update(tickets)
  .set({ status: 'archived' })
  .where(and(
    eq(tickets.status, 'closed'),
    lt(tickets.closedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// --- Delete operations ---

// Delete archived tickets older than 90 days
await db
  .delete(tickets)
  .where(and(
    eq(tickets.status, 'archived'),
    lt(tickets.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    tenantFilter(tickets.tenant_id, tenantId)
  ));

// --- Insert operations ---

// Create a new ticket
const [newTicket] = await db
  .insert(tickets)
  .values({
    subject: 'Support request',
    description: 'Need help with integration',
    status: 'open',
    priority: 2,
    userId: 'user_123',
    tenant_id: tenantId, // Manually include tenant ID
  })
  .returning();

// Bulk insert
await db
  .insert(tickets)
  .values([
    { subject: 'Ticket 1', status: 'open', priority: 1, userId: 'user_123', tenant_id: tenantId },
    { subject: 'Ticket 2', status: 'open', priority: 2, userId: 'user_123', tenant_id: tenantId },
    { subject: 'Ticket 3', status: 'open', priority: 1, userId: 'user_456', tenant_id: tenantId },
  ]);
```

## How It Differs from Raw Drizzle

With raw Drizzle, you would manually construct tenant filtering logic:

```typescript
// Raw Drizzle (manual tenant filtering)
await db
  .select()
  .from(tickets)
  .where(eq(tickets.tenant_id, tenantId));
```

With `@tenantscale/drizzle`, you get a consistent helper that:

- **Clear intent**: `tenantFilter` makes the purpose obvious compared to generic `eq`
- **Built-in validation**: Throws if `tenantId` is missing, catching bugs early
- **Composable**: Works seamlessly with `and()`, `or()`, and other Drizzle operators
- **Explicit visibility**: Makes tenant filtering visible and auditable in your codebase
- **Standardized**: Provides a consistent pattern across your application

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/drizzle](https://github.com/TenantScale/sdk/tree/main/packages/drizzle)
