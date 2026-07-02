# Tenant Isolation

Tenant isolation is the most critical concern in any multi-tenant system. TenantScale uses a **defense-in-depth** approach — isolation is enforced at multiple layers so a single failure never leads to data leakage.

## The Principle: Never Trust the Client

The golden rule of multi-tenant security:

> **Never trust the client to scope its own queries.**

Even if your frontend sends `tenant_id: "abc"`, you cannot rely on that. A malicious actor or a buggy client could send a different tenant_id and access data they shouldn't see. TenantScale solves this by **resolving the tenant from the API key on the server side** — the tenant_id in the request is authoritative, not whatever the client sends.

```typescript
// ❌ DANGEROUS: Trusting client-supplied tenant_id
app.post('/api/orders', async (req, res) => {
  const { tenant_id } = req.body  // NEVER DO THIS
  const data = await db.query(
    'SELECT * FROM orders WHERE tenant_id = $1',
    [tenant_id]  // Any tenant's data can be accessed!
  )
})

// ✅ CORRECT: TenantScale resolves tenant from API key
app.post('/api/orders',
  ts.authenticateApiKey(),
  async (req, res) => {
    // req.tenant is set by the SDK middleware
    // from the validated API key — immutable and trustworthy
    const data = await ts.db
      .from('orders')
      .select('*')
      .single()  // automatically scoped to req.tenant.id
  }
)
```

## Three Layers of Isolation

TenantScale enforces isolation at three independent layers. Each layer is a complete safety net on its own — together they form an impenetrable barrier.

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: SDK Middleware Enforcement                 │
│                                                      │
│  • API key → tenant resolution on every request     │
│  • Auto-scoped query builder (appends tenant_id)    │
│  • Plan enforcement checks (features + limits)       │
│  • Audit logging scoped to tenant                   │
│                                                     │
│  Bypass: Only admin API keys can skip scoping       │
└─────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────┐
│ Layer 2: Supabase Row-Level Security (RLS)         │
│                                                      │
│  • PostgreSQL policies on every table               │
│  • tenant_id = auth.uid() check enforced at DB      │
│  • Admin roles bypass via app.tenant_admin claim    │
│  • Works even if middleware is bypassed              │
│                                                     │
│  Bypass: Service role key (admin only)              │
└─────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────┐
│ Layer 3: Database Constraints                       │
│                                                      │
│  • NOT NULL on tenant_id columns                    │
│  • Foreign key references to tenants table          │
│  • Composite indexes on (tenant_id, ...)            │
│  • Partial unique indexes per tenant                │
│                                                     │
│  Bypass: None — structural integrity                │
└─────────────────────────────────────────────────────┘
```

### Layer 1: SDK Middleware Enforcement

The SDK is the first line of defense. Every request passes through middleware that resolves the tenant from the API key before your handler executes.

**Auto-Scoped Query Builder**

The SDK's `ts.db` is a wrapped Supabase client that automatically appends `tenant_id = req.tenant.id` to all queries:

```typescript
// Your handler — clean, no tenant_id references
app.get('/api/orders', ts.authenticateApiKey(), async (req, res) => {
  // The SDK transforms this query internally:
  const orders = await ts.db
    .from('orders')
    .select('*')
    .limit(10)

  // Into:
  // SELECT * FROM orders
  // WHERE tenant_id = 'tenant-abc-123'  ← auto-injected
  // LIMIT 10

  res.json({ orders })
})
```

The scoping works for all CRUD operations:

```typescript
// INSERT is scoped too
const order = await ts.db
  .from('orders')
  .insert({ name: 'Widget', amount: 1000 })
  .single()
// INSERT INTO orders (name, amount, tenant_id)
// VALUES ('Widget', 1000, 'tenant-abc-123')

// UPDATE and DELETE are also scoped
await ts.db
  .from('orders')
  .update({ status: 'shipped' })
  .eq('id', orderId)

await ts.db
  .from('orders')
  .delete()
  .eq('id', orderId)
```

**Admin Bypass**

Some operations legitimately need to cross tenant boundaries — analytics, system administration, billing reconciliation. Admin API keys can bypass auto-scoping by using the `.admin` namespace:

```typescript
// Admin key — bypasses tenant scoping
const allTenants = await ts.db.admin
  .from('tenants')
  .select('*')

// Admin key with explicit tenant filter
const acmeOrders = await ts.db.admin
  .from('orders')
  .select('*')
  .eq('tenant_id', 'tenant-acme-123')
```

Admin keys are explicitly created with the `admin: true` flag and should be heavily restricted.

### Layer 2: Supabase Row-Level Security (RLS)

RLS is your safety net if the middleware is ever bypassed (e.g., a direct database query, a bug in the SDK, or a misconfigured route).

**Standard RLS Policy Template**

Every table in your database should have an RLS policy like this:

```sql
-- Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation policy
CREATE POLICY tenant_isolation ON orders
  FOR ALL
  USING (tenant_id = auth.uid());
```

This ensures that even a direct query like `SELECT * FROM orders` only returns rows where `tenant_id` matches the authenticated user's UID.

**Service vs. Anonymous Key Handling**

In TenantScale, the SDK uses the Supabase **service_role key** (which bypasses RLS) to make queries. This means the SDK itself is responsible for scoping. The RLS policies are designed for **direct database access scenarios** — admin panels, data tools, ad-hoc queries.

For applications that let users authenticate with Supabase Auth directly, you'll want RLS policies that handle both paths:

```sql
-- Policy that works for both SDK-scoped and direct access
CREATE POLICY tenant_isolation ON orders
  FOR ALL
  USING (
    -- For SDK-scoped queries (service_role bypasses RLS anyway)
    -- For direct user queries: match the authenticated user's tenant
    tenant_id = (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );
```

**Admin Bypass at RLS Level**

You can also define admin roles that bypass RLS entirely:

```sql
CREATE POLICY admin_bypass ON orders
  FOR ALL
  USING (
    -- Check if user has admin role
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
    OR
    -- Standard tenant isolation
    tenant_id = (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );
```

**Complete RLS Setup Example**

```sql
-- Run this migration for every tenant-scoped table

-- 1. Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 2. Create a reusable function for tenant isolation
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT tenant_id FROM user_tenants
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- 3. Apply policies
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY tenant_isolation_invoices ON invoices
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- 4. Create an admin bypass role
CREATE POLICY admin_access_orders ON orders
  FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );
```

### Layer 3: Database Constraints

The final layer is structural — database constraints that make it impossible to have a row without a tenant:

```sql
-- Every tenant-scoped table must have:
-- 1. A NOT NULL tenant_id column
-- 2. A foreign key to the tenants table
-- 3. A composite index for query performance

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Composite index for tenant-scoped queries
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
```

**Partial Unique Indexes Per Tenant**

If you need unique values per tenant (e.g., order numbers), use partial indexes:

```sql
-- Ensure order_number is unique within each tenant
CREATE UNIQUE INDEX idx_orders_number_per_tenant
  ON orders(tenant_id, order_number)
  WHERE deleted_at IS NULL;
-- This allows different tenants to have the same order_number
-- but prevents duplicates within the same tenant
```

**Cross-Tenant Reference Safety**

Use foreign keys to prevent orphaned data and enforce referential integrity:

```sql
-- All tenant-scoped tables should reference tenants.id
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  ON DELETE CASCADE;
```

## Common Pitfalls

### 1. Leaking tenant_id in URLs

❌ **Don't expose tenant_id in route parameters — clients can tamper with them:**

```typescript
// ❌ DANGEROUS: tenant_id in URL is attacker-controlled
app.get('/api/:tenant_id/orders', async (req, res) => {
  const { tenant_id } = req.params
  const orders = await db.query(
    'SELECT * FROM orders WHERE tenant_id = $1',
    [tenant_id]
  )
})
```

✅ **The SDK resolves the tenant from the API key, never from URL parameters:**

```typescript
// ✅ CORRECT: tenant comes from the authenticated API key
app.get('/api/orders', ts.authenticateApiKey(), async (req, res) => {
  // req.tenant.id is trustworthy — set by middleware
  const orders = await ts.db.from('orders').select('*')
})
```

### 2. Forgetting to Scope Batch Operations

❌ **Batch operations can leak data if not properly scoped:**

```typescript
// ❌ DANGEROUS: This updates across ALL tenants
await ts.db
  .from('orders')
  .update({ status: 'archived' })
  .lt('created_at', '2024-01-01')  // No tenant filter!
```

✅ **The SDK scopes automatically, but be explicit for safety:**

```typescript
// ✅ CORRECT: Auto-scoped by SDK middleware
await ts.db
  .from('orders')
  .update({ status: 'archived' })
  .lt('created_at', '2024-01-01')
// Internally becomes:
// UPDATE orders SET status = 'archived'
// WHERE created_at < '2024-01-01'
// AND tenant_id = 'tenant-abc-123'

// ✅ EXTRA SAFE: Be explicit when you mean cross-tenant
// (requires admin key)
await ts.db.admin
  .from('orders')
  .update({ status: 'archived' })
  .lt('created_at', '2024-01-01')
```

### 3. Shared Caches Without Tenant Keys

❌ **Caching data without tenant awareness can leak information:**

```typescript
// ❌ DANGEROUS: Global cache key returns wrong tenant's data
const cacheKey = `order:${orderId}`
const cached = await redis.get(cacheKey)
// If Tenant A cached their order, Tenant B gets their data!
```

✅ **Always include tenant_id in cache keys:**

```typescript
// ✅ CORRECT: Tenant-scoped cache keys
const cacheKey = `tenant:${req.tenant.id}:order:${orderId}`
const cached = await redis.get(cacheKey)

// Or use the SDK's built-in scoped cache helper
const order = await ts.cache.get(
  `order:${orderId}`,
  { tenantId: req.tenant.id }  // auto-prefixed
)
```

### 4. Direct Supabase Queries in Handlers

❌ **Bypassing the SDK's scoped client defeats isolation:**

```typescript
// ❌ DANGEROUS: Using raw Supabase client without SDK scoping
app.get('/api/orders', ts.authenticateApiKey(), async (req, res) => {
  const { data } = await supabase  // raw client — NO SCOPING!
    .from('orders')
    .select('*')
  // Returns ALL tenants' orders!
})
```

✅ **Always use `ts.db` inside handlers:**

```typescript
// ✅ CORRECT: Use the SDK's wrapped client
app.get('/api/orders', ts.authenticateApiKey(), async (req, res) => {
  const { data } = await ts.db  // auto-scoped!
    .from('orders')
    .select('*')
})
```

### 5. Ignoring RLS When Running Migrations

❌ **Disabling RLS for migrations creates a window of vulnerability:**

```sql
-- ❌ DANGEROUS: RLS disabled for migration
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ...migration runs...
-- ...forgot to re-enable RLS!
```

✅ **Always re-enable RLS immediately:**

```sql
-- ✅ CORRECT: Migration with RLS preservation
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ...migration runs quickly...
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Verify:
SELECT relname, relrowsecurity FROM pg_class
WHERE relname = 'orders';
```

## Isolation Testing

TenantScale includes a test utility to verify isolation is working correctly:

```typescript
import { createIsolationTest } from '@tenantscale/sdk/testing'

describe('tenant isolation', () => {
  const test = createIsolationTest({ ts })

  it('prevents cross-tenant data access', async () => {
    await test.expectIsolation({
      table: 'orders',
      tenantA: { name: 'Tenant A Order' },
      tenantB: async (db) => {
        // Tenant B should NOT see Tenant A's order
        const orders = await db.from('orders').select('*')
        expect(orders).toHaveLength(0)
      },
    })
  })

  it('admin key can access all tenants', async () => {
    await test.expectAdminAccess({
      table: 'orders',
      operation: 'select',
    })
  })
})
```

**What to test for each table:**

| Test | What It Validates |
|------|------------------|
| **Cross-tenant read** | Tenant A cannot read Tenant B's rows |
| **Cross-tenant write** | Tenant A cannot insert/update/delete Tenant B's rows |
| **Unscoped query** | A SELECT without WHERE returns only own rows |
| **Admin bypass** | Admin keys can access all rows |
| **RLS enforcement** | Direct Supabase queries are also isolated |
| **Concurrent access** | Race conditions don't break isolation |

## Related Resources

- [Source: Auto-Scoped Query Builder](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/db/scoped-client.ts)
- [Source: Admin Bypass Logic](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/db/admin-client.ts)
- [Source: Supabase RLS Policies](https://github.com/TenantScale/api/tree/main/supabase/migrations)
- [Source: Isolation Test Utilities](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/testing/isolation.ts)
- [Architecture →](/guide/architecture)
- [Core Concepts →](/guide/core-concepts)
