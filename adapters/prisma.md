# Prisma Adapter

`@tenantscale/prisma` provides tenant-safe helpers for [Prisma ORM](https://www.prisma.io). It prevents cross-tenant data leaks by making sure every query is scoped to the current tenant — either automatically via Prisma's `$extends()` API, or explicitly with a `tenantFilter` helper.

## Installation

```bash
npm install @tenantscale/prisma
# or
pnpm add @tenantscale/prisma
```

**Peer dependencies:** Requires `@prisma/client` (`^5.0.0 || ^6.0.0`).

## Approach 1: Automatic Query Scoping with `withTenantScope`

The recommended approach uses Prisma's `$extends()` API to automatically inject tenant filters into all queries. This prevents cross-tenant data leaks by ensuring every query is scoped to the current tenant.

```typescript
import { PrismaClient } from '@prisma/client'
import { withTenantScope } from '@tenantscale/prisma'

const prisma = new PrismaClient()

// Create a tenant-scoped client
const tenantPrisma = prisma.$extends(withTenantScope({ tenantId: 'tenant-123' }))

// All queries are automatically scoped to tenant-123
const users = await tenantPrisma.user.findMany()
// Equivalent to: prisma.user.findMany({ where: { tenant_id: 'tenant-123' } })

// Create operations automatically include tenant_id
const user = await tenantPrisma.user.create({
  data: { name: 'John', email: 'john@example.com' }
  // tenant_id is automatically added: { name: 'John', email: 'john@example.com', tenant_id: 'tenant-123' }
})

// Update operations automatically include tenant filter
const updated = await tenantPrisma.user.update({
  where: { id: 'user-1' },
  data: { name: 'John Updated' }
  // Automatically becomes: { where: { id: 'user-1', tenant_id: 'tenant-123' }, ... }
})

// Delete operations automatically include tenant filter
await tenantPrisma.user.delete({
  where: { id: 'user-1' }
  // Automatically becomes: { where: { id: 'user-1', tenant_id: 'tenant-123' } }
})
```

### Supported Operations

- `findMany()`, `findFirst()`, `findUnique()` — auto-adds `WHERE tenant_id = ?`
- `update()`, `updateMany()` — auto-adds `WHERE tenant_id = ?`
- `delete()`, `deleteMany()` — auto-adds `WHERE tenant_id = ?`
- `create()`, `createMany()` — auto-adds `tenant_id` to data
- `upsert()` — auto-adds `tenant_id` to `where`, `create`, and `update`

## Approach 2: Manual Filtering with `tenantFilter`

For explicit control, use the `tenantFilter` helper to manually add tenant conditions to your queries:

```typescript
import { tenantFilter } from '@tenantscale/prisma'

// Select with tenant filter
const users = await prisma.user.findMany({
  where: {
    ...tenantFilter('tenant-123'),
    status: 'active'
  }
})

// Update with tenant filter
await prisma.user.update({
  where: {
    id: 'user-1',
    ...tenantFilter('tenant-123')
  },
  data: { status: 'inactive' }
})

// Delete with tenant filter
await prisma.user.deleteMany({
  where: tenantFilter('tenant-123')
})
```

## Custom Tenant Column

By default both helpers use a `tenant_id` column. If your schema uses a different column name for tenant isolation, pass it as the second argument:

```typescript
import { withTenantScope, tenantFilter } from '@tenantscale/prisma'

const tenantPrisma = prisma.$extends(
  withTenantScope({
    tenantId: 'tenant-123',
    tenantColumn: 'organization_id'
  })
)

const filter = tenantFilter('tenant-123', 'organization_id')
```

## Integration with TenantScale

Combine with the TenantScale SDK for complete multi-tenant isolation:

```typescript
import { PrismaClient } from '@prisma/client'
import { TenantScale } from '@tenantscale/sdk'
import { withTenantScope } from '@tenantscale/prisma'

const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
})

const prisma = new PrismaClient()

// In your API route handler
app.post('/api/users', async (req, res) => {
  // Validate API key and resolve the tenant
  const apiKey = await ts.validateApiKey(req.headers.authorization)
  if (!apiKey) return res.status(401).json({ error: 'Invalid API key' })

  // Scope all queries to the resolved tenant
  const tenantPrisma = prisma.$extends(
    withTenantScope({ tenantId: apiKey.tenant_id })
  )

  const users = await tenantPrisma.user.findMany()
  res.json({ users })
})
```

## Which Approach Should I Use?

| | `withTenantScope` | `tenantFilter` |
|---|---|---|
| Effort | Zero — automatic | Manual per query |
| Safety | Filters injected everywhere | Easy to forget one query |
| Control | Global behavior | Per-query explicit |
| Best for | New code, most apps | Migration from raw Prisma, edge cases |

**Note:** `withTenantScope` returns a new extended client — use it per-request (or per-tenant) so the tenant context is always correct. Avoid sharing one scoped client across tenants.

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/prisma](https://github.com/TenantScale/sdk/tree/main/packages/prisma)
