---
title: Migration Guide
description: Migrate existing TenantScale adapters and integrations to the current @tenantscale/sdk adapter API.
---

# Adapter Migration Guide

This guide shows how to migrate existing TenantScale integrations to the current `@tenantscale/sdk` adapter API. It covers moving from manual SDK calls in your route handlers to the idiomatic per-framework adapters, and upgrading any in-tree or prior integrations to the current 0.4.x API.

## Version compatibility

The SDK and framework adapters are versioned together and published on npm:

| Package | Current version |
|---------|-----------------|
| `@tenantscale/sdk` | `0.4.x` |
| `@tenantscale/express` | `0.4.x` |
| `@tenantscale/hono` | `0.4.x` |
| `@tenantscale/next` | `0.4.x` |
| `@tenantscale/react` | `0.4.x` |
| `@tenantscale/drizzle` | `0.x` |

The adapters declare `@tenantscale/sdk` as a peer dependency pinned to the `^0.4.0` range. If an existing project references `@tenantscale/sdk@^1.0.0`, update it — that version does not exist.

```bash
npm install @tenantscale/express@latest @tenantscale/sdk@^0.4.0
```

## Why migrate to the adapters

If your codebase currently calls the SDK directly inside every route handler — resolving the tenant, checking scopes, and applying rate limits manually — the adapters replace that boilerplate with drop-in middleware:

**Before — manual SDK wiring in each handler:**

```typescript
import { authenticateApiKey, requireScope } from '@tenantscale/sdk';

app.get('/api/me', async (req, res) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  const { tenant } = await authenticateApiKey(apiKey);
  requireScope(tenant, ['tenants:read']);
  res.json({ tenant });
});
```

**After — `@tenantscale/express` middleware:**

```typescript
import { authenticateApiKey, requireScope } from '@tenantscale/express';

app.get('/api/me', authenticateApiKey(), requireScope('tenants:read'), (req, res) => {
  res.json({ tenant: req.tenant });
});
```

The adapter resolves the tenant, populates the request context, and throws typed errors that your framework's error handler can map to HTTP responses.

## Quick reference by framework

| From | To | Notes |
|------|----|-------|
| Manual SDK calls in handlers | [`@tenantscale/express`](/adapters/express) | `app.use(tenantScaleMiddleware())` |
| Manual SDK calls in handlers | [`@tenantscale/hono`](/adapters/hono) | Access tenant via `c.get('tenant')` |
| Manual SDK calls in handlers | [`@tenantscale/next`](/adapters/nextjs) | `withTenant()` higher-order function |
| Manual SDK calls in handlers | [`@tenantscale/koa`](/adapters/koa) | Koa middleware form |
| Manual `WHERE tenant_id = ?` | [`@tenantscale/drizzle`](/adapters/drizzle) | `tenantFilter(column, tenantId)` |
| Manual RLS/SQL generation | [`@tenantscale/mcp`](/adapters/mcp) | `generate_rls_policy` tool |

## Common migration steps

### 1. Resolve the tenant once, centrally

Move tenant resolution out of individual handlers into app-level middleware. With the framework adapters this is a single `app.use(...)` call rather than repeated SDK calls.

### 2. Replace manual checks with typed middleware

Scopes, plan features, plan limits, and rate limits each have a dedicated middleware function in the adapters. Replace your hand-rolled checks:

| Manual pattern | Adapter equivalent |
|----------------|--------------------|
| Parse `Authorization` header | `authenticateApiKey()` |
| Check `tenant.scopes.includes(...)` | `requireScope('...')` |
| Check `tenant.features.includes(...)` | `requirePlanFeature('...')` |
| Compare `usage` to `limits` | `requirePlanLimit('...')` |
| Custom expiry tracking | `rateLimitByApiKey()` / `rateLimitByIp()` |

### 3. Centralize error handling

Adapters throw typed errors such as `InvalidApiKeyError`, `InsufficientScopeError`, `PlanLimitExceededError`, and `RateLimitExceededError`. If your old code returned ad-hoc JSON errors, switch to a single error handler that maps each error class to its HTTP status. See the [Express error reference](/adapters/express#error-reference) for an example.

### 4. Vendor-pinned components to current APIs

If you maintain a custom or fork-based adapter against the SDK, align its exports with the current adapter surface. See the [Design philosophy](/adapters/drizzle#design-philosophy) documented for Drizzle: TenantScale prefers explicit, composable helpers over implicit proxy-based injection.

## Migrating ORM queries (Drizzle)

If you previously scoped Drizzle queries with inline `eq()` calls, migrate to `tenantFilter()` for built-in validation and consistency:

**Before:**

```typescript
await db.select().from(tickets).where(eq(tickets.tenant_id, tenantId));
```

**After:**

```typescript
import { tenantFilter } from '@tenantscale/drizzle';

await db.select().from(tickets).where(tenantFilter(tickets.tenant_id, tenantId));
```

`tenantFilter()` throws if the tenant ID is missing, which catches bugs where tenant context was never populated. It composes with `and()`, `or()`, and other Drizzle operators. See the [Drizzle adapter](/adapters/drizzle) for a full walkthrough.

## Migrating AI-assistant workflows (MCP)

If your team used a custom MCP server or CLI script to inspect the tenant schema and generate RLS policies, migrate to [`@tenantscale/mcp`](/adapters/mcp). It provides `get_tenant_schema`, `validate_tenant_query`, `generate_rls_policy`, and `suggest_endpoint_structure` out of the box.

## Related

- [Adapters overview](/adapters/)
- [Express adapter](/adapters/express)
- [Drizzle adapter](/adapters/drizzle)
- [MCP server](/adapters/mcp)