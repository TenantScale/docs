# Plans & Features

The plan store is the central system for defining and enforcing per-tenant feature access and usage limits.

## PlanStore

The `PlanStore` class handles plan resolution, feature checking, and limit evaluation. It's accessible via `ts.plans`.

```typescript
const plan = await ts.plans.getPlan(tenantId)
```

### Plan Interface

```typescript
interface Plan<TFeatures extends Record<string, boolean> = Record<string, boolean>> {
  id: string
  name: string
  description: string | null
  features: TFeatures
  limits: Record<string, number>
  stripe_price_id: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
```

The `features` object is generic — you define your own feature flags:

```typescript
type MyFeatures = {
  webhooks: boolean
  audit_logs: boolean
  analytics: boolean
  sso: boolean
  custom_domain: boolean
  api_access: boolean
}

// Get typed plan
const plan = await ts.plans.getPlan<MyFeatures>(tenantId)
// plan.features.webhooks is typed as boolean
```

## getPlan()

Resolve the plan for a specific tenant.

```typescript
const plan = await ts.plans.getPlan('tenant-acme-123')

console.log(plan)
// {
//   id: 'plan_pro',
//   name: 'Pro',
//   features: { webhooks: true, audit_logs: true, sso: true, analytics: true },
//   limits: { max_api_keys: 25, daily_requests: 10000, storage_gb: 50 },
//   ...
// }
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | `string` | Tenant ID to resolve the plan for |

### Return Type

```typescript
type PlanResult<T extends Record<string, boolean>> =
  | { data: Plan<T>; error: null }
  | { data: null; error: TenantScaleError }
```

### Error Cases

| Scenario | Error |
|----------|-------|
| Tenant not found | `TenantScaleError` (code: `TENANT_NOT_FOUND`) |
| Tenant has no plan | `TenantScaleError` (code: `PLAN_NOT_FOUND`) |
| Plan is inactive | `TenantScaleError` (code: `PLAN_INACTIVE`) |

### Caching

Plans are cached to avoid database queries on every request. The default cache TTL is 5 minutes.

```typescript
// Invalidate plan cache for a tenant
await ts.cache.invalidate(`plan:${tenantId}`)

// Or invalidate all plan caches
await ts.cache.invalidatePattern('plan:*')
```

## hasFeature()

Check if a tenant's plan has a specific feature enabled.

```typescript
const hasWebhooks = await ts.plans.hasFeature({
  tenantId: 'tenant-acme-123',
  feature: 'webhooks',
})
// Returns boolean
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | `string` | Tenant to check |
| `feature` | `string` | Feature flag name |

### Return Type

```typescript
type HasFeatureResult =
  | { data: boolean; error: null }
  | { data: null; error: TenantScaleError }
```

### Usage in Business Logic

```typescript
async function canCreateWebhook(tenantId: string): Promise<boolean> {
  const result = await ts.plans.hasFeature({ tenantId, feature: 'webhooks' })
  return result.data ?? false
}
```

## getLimit()

Get the numeric value of a plan limit for a tenant.

```typescript
const maxKeys = await ts.plans.getLimit({
  tenantId: 'tenant-acme-123',
  limit: 'max_api_keys',
})
// Returns number (e.g., 25)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | `string` | Tenant to check |
| `limit` | `string` | Limit name (e.g., `'max_api_keys'`, `'daily_requests'`) |

### Return Type

```typescript
type GetLimitResult =
  | { data: number; error: null }
  | { data: null; error: TenantScaleError }
```

### Checking Multiple Limits

```typescript
async function checkResourceEligibility(tenantId: string) {
  const [maxKeys, dailyReqs, storageGb] = await Promise.all([
    ts.plans.getLimit({ tenantId, limit: 'max_api_keys' }),
    ts.plans.getLimit({ tenantId, limit: 'daily_requests' }),
    ts.plans.getLimit({ tenantId, limit: 'storage_gb' }),
  ])

  return {
    canCreateKey: (maxKeys.data ?? 0) > currentKeyCount,
    dailyBudget: dailyReqs.data ?? 0,
    storageLimit: storageGb.data ?? 0,
  }
}
```

## requirePlanFeature()

Middleware that guards a route by checking a feature flag on the tenant's plan.

```typescript
import { requirePlanFeature } from '@tenantscale/sdk'

app.post(
  '/api/webhooks',
  ts.authenticateApiKey(),
  ts.plans.requirePlanFeature('webhooks'),
  async (req, res) => {
    // Only runs if tenant's plan has webhooks: true
    const webhook = await ts.webhooks.create(req.body)
    res.status(201).json(webhook)
  }
)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `feature` | `string` | — | **Required.** Feature flag name to check |
| `tenantId` | `string` | `req.tenant.id` | Tenant to check (from request context) |
| `errorMessage` | `string` | — | Custom error message |
| `upgradeUrl` | `string` | — | Custom upgrade URL in error response |

### Error Response

```json
{
  "error": {
    "code": "FEATURE_NOT_ALLOWED",
    "message": "Your plan (Free) does not include the 'webhooks' feature. Upgrade to Hobby or Pro to access this feature.",
    "plan": "plan_free",
    "feature": "webhooks",
    "upgrade_url": "https://your-app.com/billing/upgrade"
  }
}
```

## requirePlanLimit()

Middleware that guards a route by checking a numeric usage limit.

```typescript
app.post(
  '/api/api-keys',
  ts.authenticateApiKey(),
  ts.plans.requirePlanLimit({
    limit: 'max_api_keys',
    getCurrentUsage: async (req) => {
      const { count } = await ts.db
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .is('revoked_at', null)
      return count
    },
  }),
  async (req, res) => {
    const key = await ts.apiKeys.create({ name: req.body.name })
    res.status(201).json(key)
  }
)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | `string` | **Required.** Limit name from the plan (e.g., `'max_api_keys'`) |
| `getCurrentUsage` | `(req) => number \| Promise<number>` | **Required.** Function that returns current usage count |
| `tenantId` | `string` | Tenant to check (default: `req.tenant.id`) |
| `errorMessage` | `string` | Custom error message |
| `upgradeUrl` | `string` | Custom upgrade URL in error response |

### Error Response

```json
{
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "You have reached the maximum number of API keys (5) for your plan (Hobby). Delete existing keys or upgrade to Pro for more.",
    "plan": "plan_hobby",
    "limit": "max_api_keys",
    "current": 5,
    "max": 5,
    "upgrade_url": "https://your-app.com/billing/upgrade"
  }
}
```

### Multiple Limits Checking

Check several limits at once with a custom middleware:

```typescript
function requireStorageCapacity({ ts }: { ts: TenantScale }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenant.id

    // Check storage limit
    const storageLimit = await ts.plans.getLimit({ tenantId, limit: 'storage_gb' })
    const currentStorage = await getCurrentStorageUsage(tenantId)

    if (currentStorage >= (storageLimit.data ?? 0)) {
      return res.status(403).json({
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Storage limit (${storageLimit.data}GB) reached. Upgrade your plan for more storage.`,
          limit: 'storage_gb',
          current: currentStorage,
          max: storageLimit.data,
        },
      })
    }

    next()
  }
}

// Usage
app.post(
  '/api/files/upload',
  ts.authenticateApiKey(),
  requireStorageCapacity({ ts }),
  uploadHandler
)
```

## requirePlan()

Combine feature and limit checks into a single middleware:

```typescript
app.post(
  '/api/webhooks',
  ts.authenticateApiKey(),
  ts.plans.requirePlan({
    features: ['webhooks', 'audit_logs'],
    limits: [
      {
        name: 'max_webhooks',
        getCurrentUsage: async (req) => {
          const { count } = await ts.db
            .from('webhooks')
            .select('*', { count: 'exact', head: true })
          return count
        },
      },
    ],
  }),
  handler
)
```

## Custom Plan Store Extension

For advanced use cases, you can extend the plan store with custom resolution logic:

```typescript
import { PlanStore } from '@tenantscale/sdk'

class CustomPlanStore extends PlanStore {
  async getPlan(tenantId: string) {
    // Try custom resolution first
    const customPlan = await this.resolveCustomPlan(tenantId)
    if (customPlan) return customPlan

    // Fall back to default
    return super.getPlan(tenantId)
  }

  private async resolveCustomPlan(tenantId: string) {
    // Example: Check an external entitlement service
    const entitlement = await externalEntitlementService.get(tenantId)
    if (!entitlement) return null

    return {
      id: `custom_${entitlement.tier}`,
      name: entitlement.tierName,
      features: entitlement.features,
      limits: entitlement.limits,
      // ... other plan fields
    }
  }
}

// Use custom store
const ts = new TenantScale({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // Custom plan store will be used instead of the default
  planStore: new CustomPlanStore(),
})
```

## Plan Change Webhooks

When a tenant's plan changes, the SDK can fire webhooks and invalidate caches:

```typescript
// After a plan change (e.g., from Stripe webhook)
await ts.admin.updateTenantPlan({
  tenantId: 'tenant-acme-123',
  planId: 'plan_pro',
  reason: 'upgraded_via_stripe',
})

// This automatically:
// 1. Updates tenant.plan_id
// 2. Invalidates plan cache
// 3. Logs audit event: plan.changed
// 4. Fires tenant webhooks (if webhooks feature enabled)
// 5. Resets rate limit counters if daily_requests changed
```

## Testing Plan Enforcement

```typescript
import { createPlanTest } from '@tenantscale/sdk/testing'

describe('plan enforcement', () => {
  const test = createPlanTest({ ts })

  it('allows feature for paying plan', async () => {
    await test.asTenant({ plan: 'plan_pro' }, async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${test.apiKey}`)
        .send({ url: 'https://example.com/hook' })

      expect(res.status).toBe(201)
    })
  })

  it('blocks feature for free plan', async () => {
    await test.asTenant({ plan: 'plan_free' }, async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${test.apiKey}`)
        .send({ url: 'https://example.com/hook' })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FEATURE_NOT_ALLOWED')
    })
  })
})
```
