# TypeScript API

TenantScale is written in TypeScript and provides first-class type support. All exports include full type definitions.

## Type Exports

All types are exported from `@tenantscale/sdk`:

```typescript
import type {
  // Core entities
  Tenant,
  Plan,
  ApiKey,
  Scope,

  // Plan system
  PlanFeature,
  PlanLimit,

  // Audit
  AuditEvent,

  // Webhooks
  WebhookPayload,
  WebhookDelivery,

  // Rate limiting
  RateLimitConfig,
  RateLimitUsage,

  // Configuration
  TenantScaleOptions,
  Logger,

  // Results
  AuthResult,
  PlanResult,

  // Billing
  Subscription,
  BillingInterval,
  Session,

  // Pagination
  PaginatedResponse,
} from '@tenantscale/sdk'
```

## Core Entity Types

### Tenant

```typescript
interface Tenant<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique tenant identifier (UUID) */
  id: string
  /** Human-readable name */
  name: string
  /** URL-friendly slug */
  slug: string
  /** Current plan ID */
  plan_id: string
  /** Timestamp of creation */
  created_at: string
  /** Timestamp of last update */
  updated_at: string
  /** Custom metadata fields */
  metadata: TMetadata
  /** Additional fields from your database */
  [key: string]: unknown
}
```

**Generic usage:**

```typescript
// Define your custom tenant metadata
interface TenantMetadata {
  domain: string
  logo_url: string
  contact_email: string
  tier: 'starter' | 'growth' | 'enterprise'
}

// Get a typed tenant
const tenant = await ts.admin.getTenant<TenantMetadata>('tenant-acme-123')
console.log(tenant.data.metadata.domain) // typed as string
console.log(tenant.data.metadata.tier)   // typed as 'starter' | 'growth' | 'enterprise'
```

### Plan

```typescript
interface Plan<TFeatures extends Record<string, boolean> = Record<string, boolean>> {
  /** Unique plan identifier */
  id: string
  /** Human-readable plan name */
  name: string
  /** Plan description */
  description: string | null
  /** Feature flags (generic — define your own) */
  features: TFeatures
  /** Numeric limits */
  limits: Record<string, number>
  /** Associated Stripe price ID (for billing) */
  stripe_price_id: string | null
  /** Whether the plan is active */
  is_active: boolean
  /** Display order (lower = first) */
  sort_order: number
  /** Timestamp of creation */
  created_at: string
  /** Timestamp of last update */
  updated_at: string
}
```

**Generic usage:**

```typescript
// Define your feature flags
interface MyFeatures {
  webhooks: boolean
  audit_logs: boolean
  analytics: boolean
  sso: boolean
  custom_domain: boolean
  api_access: boolean
}

// Get a typed plan
const plan = await ts.plans.getPlan<MyFeatures>('tenant-acme-123')
if (plan.data?.features.webhooks) {
  // webhooks feature is enabled
}
```

### ApiKey

```typescript
interface ApiKey<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique API key identifier */
  id: string
  /** Tenant that owns this key */
  tenant_id: string
  /** Human-readable label */
  name: string
  /** Key prefix (first 16 chars of the key payload) */
  key_prefix: string
  /** Permission scopes */
  scopes: string[]
  /** Environment label */
  environment: 'prod' | 'dev' | 'test' | 'staging'
  /** ISO 8601 expiry date (null = never expires) */
  expires_at: string | null
  /** ISO 8601 revocation date */
  revoked_at: string | null
  /** Reason for revocation */
  revoked_reason: string | null
  /** ISO 8601 of last usage */
  last_used_at: string | null
  /** Custom rate limit override */
  rate_limit_override: RateLimitOverride | null
  /** Custom metadata */
  metadata: TMetadata
  /** Timestamp of creation */
  created_at: string
  /** Timestamp of last update */
  updated_at: string
}

interface RateLimitOverride {
  maxRequests: number
  window: string
}
```

### AuditEvent

```typescript
interface AuditEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique event identifier */
  id: string
  /** Tenant that performed the action */
  tenant_id: string
  /** API key ID that performed the action */
  api_key_id: string | null
  /** Actor identifier (email, user ID, system name) */
  actor: string | null
  /** Event type (dot-separated) */
  event_type: string
  /** Human-readable description */
  description: string
  /** Entity type affected */
  entity_type: string | null
  /** Entity ID affected */
  entity_id: string | null
  /** Previous state */
  old_values: Record<string, unknown> | null
  /** New state */
  new_values: TData | null
  /** Requester IP */
  ip_address: string | null
  /** Requester user agent */
  user_agent: string | null
  /** ISO 8601 timestamp */
  created_at: string
}
```

### Subscription

```typescript
interface Subscription<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique subscription identifier */
  id: string
  /** Tenant that owns the subscription */
  tenant_id: string
  /** Stripe subscription ID */
  stripe_subscription_id: string
  /** Stripe price ID */
  stripe_price_id: string
  /** Current status */
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'trialing'
  /** Current billing period start */
  current_period_start: string
  /** Current billing period end */
  current_period_end: string
  /** Cancel at period end */
  cancel_at_period_end: boolean
  /** Billing interval */
  billing_interval: BillingInterval
  /** Custom metadata */
  metadata: TMetadata
  /** Timestamp of creation */
  created_at: string
  /** Timestamp of last update */
  updated_at: string
}
```

## Supporting Types

### Scope

```typescript
interface Scope {
  /** Resource being accessed (e.g., 'orders', 'users', '*') */
  resource: string
  /** Action being performed (e.g., 'read', 'write', 'admin') */
  action: string
  /** Full scope string (e.g., 'orders:write') */
  full: string
}
```

### PlanFeature

```typescript
interface PlanFeature {
  /** Feature flag name */
  name: string
  /** Whether the feature is enabled */
  enabled: boolean
}
```

### PlanLimit

```typescript
interface PlanLimit {
  /** Limit name */
  name: string
  /** Maximum value */
  value: number
  /** Current usage (if available) */
  current?: number
}
```

### Session

```typescript
interface Session<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  /** Session token (JWT) */
  token: string
  /** Tenant ID the session belongs to */
  tenant_id: string
  /** ISO 8601 expiry */
  expires_at: string
  /** Custom metadata stored in the JWT */
  metadata: TMetadata
}
```

### BillingInterval

```typescript
type BillingInterval = 'month' | 'year'
```

## Configuration Types

### TenantScaleOptions

```typescript
interface TenantScaleOptions {
  /** Required: Supabase project URL */
  supabaseUrl: string
  /** Required: Supabase service role key */
  supabaseKey: string
  /** Optional: Stripe secret key */
  stripeKey?: string
  /** Optional: Logger instance */
  logger?: Logger
  /** Optional: Minimum log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  /** Optional: Pre-configured Supabase client */
  supabase?: SupabaseClient
  /** Optional: Cache configuration */
  cache?: CacheConfig
  /** Optional: Rate limiting defaults */
  rateLimit?: RateLimitConfig
  /** Optional: Webhook delivery defaults */
  webhooks?: WebhookConfig
  /** Optional: Audit logging defaults */
  audit?: AuditConfig
  /** Optional: Custom plan store */
  planStore?: PlanStore
}
```

### CacheConfig

```typescript
interface CacheConfig {
  backend: 'memory' | 'supabase' | 'redis'
  defaultTtlMs?: number
  maxSize?: number
  redis?: {
    url: string
    keyPrefix?: string
  }
}
```

### RateLimitConfig

```typescript
interface RateLimitConfig {
  storage?: 'supabase' | 'redis' | 'memory'
  defaultMaxRequests?: number
  window?: string
  usePlanLimits?: boolean
  fallbackMaxRequests?: number
  redis?: {
    url: string
    keyPrefix?: string
  }
  ipResolver?: (req: any) => string
  headers?: RateLimitHeaders
  warnAtPercentage?: number
  onWarn?: (tenantId: string, usage: RateLimitUsage) => void
  onExceeded?: (tenantId: string, usage: RateLimitUsage) => void
}

interface RateLimitHeaders {
  limit?: string
  remaining?: string
  reset?: string
}
```

### WebhookConfig

```typescript
interface WebhookConfig {
  maxRetries?: number
  retryBaseDelayMs?: number
  retryMaxDelayMs?: number
  requestTimeoutMs?: number
  maxConcurrentDeliveries?: number
  signatureHeader?: string
  deliveryQueue?: {
    type: 'supabase' | 'redis' | 'rabbitmq'
    pollIntervalMs?: number
  }
}
```

### AuditConfig

```typescript
interface AuditConfig {
  batchSize?: number
  flushIntervalMs?: number
  maxQueueSize?: number
  retentionDays?: number
  cleanupSchedule?: string
  onError?: (error: Error, events: AuditEvent[]) => void
  namespace?: string
}
```

### Logger

```typescript
interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}
```

## Result Types

The SDK uses result objects for operations that can fail, providing type-safe error handling without try/catch:

### AuthResult

```typescript
type AuthResult =
  | {
      authenticated: true
      tenant: Tenant
      apiKey: ApiKey
      plan: Plan
    }
  | {
      authenticated: false
      error: AuthError
    }
```

### PlanResult

```typescript
type PlanResult<T> =
  | { data: T; error: null }
  | { data: null; error: TenantScaleError }
```

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}
```

## Generics for Typed Metadata

Many core types accept generics for custom metadata fields:

```typescript
// Tenant with custom metadata
interface AppTenantMetadata {
  companySize: number
  industry: string
  preferredLocale: string
}

const tenant = await ts.admin.getTenant<AppTenantMetadata>('tenant-acme-123')
// tenant.metadata.companySize is typed as number

// Audit event with typed new_values
interface OrderData {
  orderId: string
  amount: number
  status: 'pending' | 'paid' | 'shipped'
  items: Array<{ sku: string; quantity: number }>
}

const event = await ts.audit.queryEvents<OrderData>({ tenantId })
// event.new_values.amount is typed as number
// event.new_values.items[0].sku is typed as string

// Plan with typed feature flags
type MyPlanFeatures = {
  webhooks: boolean
  audit_logs: boolean
  analytics: boolean
}

const plan = await ts.plans.getPlan<MyPlanFeatures>('tenant-acme-123')
// plan.features.webhooks is typed as boolean (not just boolean)
```

## Type Guards

The SDK provides type guard functions for runtime type checking:

```typescript
import { isTenantScaleError, isAuthError, isPlanError } from '@tenantscale/sdk'

try {
  await ts.apiKeys.create({ name: 'My Key' })
} catch (error) {
  if (isTenantScaleError(error)) {
    // error is narrowed to TenantScaleError
    console.error(error.code, error.statusCode)
  }

  if (isAuthError(error)) {
    // error is narrowed to AuthError
    console.error('Auth failure:', error.message)
  }

  if (isPlanError(error)) {
    // error is narrowed to PlanError
    if (error.code === 'FEATURE_NOT_ALLOWED') {
      // Narrowed to FeatureNotAllowedError
    }
  }
}
```

### Built-in Type Guards

| Guard Function | Narrowed Type |
|----------------|---------------|
| `isTenantScaleError(error)` | `TenantScaleError` |
| `isAuthError(error)` | `AuthError` |
| `isPlanError(error)` | `PlanError` |
| `isRateLimitError(error)` | `RateLimitError` |
| `isWebhookError(error)` | `WebhookError` |
| `isBillingError(error)` | `BillingError` |
| `isValidationError(error)` | `ValidationError` |

## Type-Safe Middleware

The SDK provides type-safe middleware that augments framework request types. When using framework adapter packages, the augmentation is automatic.

### Express Type Augmentation

```typescript
import { Request, Response, NextFunction } from 'express'
import type { Tenant, Plan, ApiKey } from '@tenantscale/sdk'

// Manual augmentation if not using @tenantscale/express
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant<{ companySize: number }>
      plan?: Plan<{ webhooks: boolean }>
      apiKey?: ApiKey
      session?: Session
    }
  }
}

// Now req.tenant is typed
app.get('/api/orders', (req: Request, res: Response) => {
  const tenant = req.tenant
  if (tenant) {
    console.log(tenant.metadata.companySize) // typed as number
  }
})
```

### Create Type-Safe Middleware

```typescript
import { TenantScale, type Tenant, type Plan } from '@tenantscale/sdk'
import { Request, Response, NextFunction } from 'express'

// Typed middleware factory
function requireCustomField(fieldName: keyof Tenant['metadata']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant

    if (!tenant) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!tenant.metadata[fieldName]) {
      return res.status(400).json({
        error: `Tenant must have ${String(fieldName)} configured`,
      })
    }

    next()
  }
}

// Usage with full type safety
app.post(
  '/api/configure',
  ts.authenticateApiKey(),
  requireCustomField('domain'), // Type-checked against Tenant metadata
  handler
)
```

### Generic Middleware

```typescript
// A generic middleware that works with any Tenant metadata type
function requireMetadata<T extends Record<string, unknown>>(
  key: keyof T,
  validator: (value: unknown) => value is T[keyof T]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant as { metadata: T } | undefined
    if (!tenant) return res.status(401).json({ error: 'Not authenticated' })

    const value = tenant.metadata[key]
    if (!validator(value)) {
      return res.status(400).json({
        error: `Invalid or missing ${String(key)}`,
      })
    }

    next()
  }
}

// Define a validator
function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

// Use it
app.post(
  '/api/domain',
  ts.authenticateApiKey(),
  requireMetadata('domain', isString),
  handler
)
```

## Type Assertions

For cases where you know more about the data shape than TypeScript, use the SDK's assertion helpers:

```typescript
import { assertTenant, assertPlan } from '@tenantscale/sdk'

function processTenant(data: unknown) {
  // Throws ValidationError if the data is not a valid Tenant
  const tenant = assertTenant(data)
  console.log(tenant.name) // Now typed as Tenant
}

function processPlan(data: unknown) {
  const plan = assertPlan(data)
  console.log(plan.features) // Typed as Record<string, boolean>
}
```

### Available Assertions

| Function | Input | Throws | Returns |
|----------|-------|--------|---------|
| `assertTenant(data)` | `unknown` | `ValidationError` | `Tenant` |
| `assertPlan(data)` | `unknown` | `ValidationError` | `Plan` |
| `assertApiKey(data)` | `unknown` | `ValidationError` | `ApiKey` |
| `assertAuditEvent(data)` | `unknown` | `ValidationError` | `AuditEvent` |

## Module Augmentation

When building a framework adapter or custom integration, you can augment the SDK's types:

```typescript
// Augment the TenantScale class with custom methods
declare module '@tenantscale/sdk' {
  interface TenantScale {
    // Add a custom method
    myCustomMethod(): Promise<void>
  }

  // Add custom configuration options
  interface TenantScaleOptions {
    myCustomOption?: string
  }
}
```

## Type Imports from Subpaths

For tree-shaking and smaller bundles, import types from specific subpaths:

```typescript
// Core types
import type { Tenant, Plan, ApiKey } from '@tenantscale/sdk'

// Error types
import type {
  TenantScaleError,
  AuthError,
  PlanError,
} from '@tenantscale/sdk'

// Configuration types
import type {
  TenantScaleOptions,
  RateLimitConfig,
  WebhookConfig,
} from '@tenantscale/sdk'

// All types are re-exported from the main entry point
```

## TypeScript Version Requirement

The SDK requires TypeScript ≥5.0 for full type support. Key features used:

- **Template literal types** for scope pattern matching
- **Variadic tuple types** for multi-scope requireScope()
- **Satisfies operator** for type-safe config objects
- **Const type parameters** for literal type inference
- ** decorator metadata** (optional, for framework adapters)

### tsconfig Recommendations

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```
