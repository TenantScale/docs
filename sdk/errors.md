# Error Handling

TenantScale defines a hierarchy of error classes for predictable error handling. All errors extend the base `TenantScaleError` class and include a machine-readable `code`, a human-readable `message`, and optional context-specific properties.

## Error Hierarchy

```
TenantScaleError (base)
├── AuthError
│   ├── MissingKeyError
│   ├── InvalidKeyError
│   ├── ExpiredKeyError
│   └── InsufficientScopeError
├── PlanError
│   ├── FeatureNotAllowedError
│   └── LimitExceededError
├── RateLimitError
├── WebhookError
├── BillingError
└── ValidationError
```

### Error Class Structure

Every error class extends `TenantScaleError` and follows this structure:

```typescript
class TenantScaleError extends Error {
  readonly name: string         // Error class name
  readonly code: string         // Machine-readable code (e.g., 'MISSING_API_KEY')
  readonly message: string      // Human-readable description
  readonly statusCode: number   // HTTP status code (e.g., 401, 403, 429)
  readonly details?: Record<string, unknown>  // Additional context
}
```

## TenantScaleError

Base error class for all SDK errors.

```typescript
import { TenantScaleError } from '@tenantscale/sdk'

try {
  await ts.apiKeys.create({ name: 'My Key' })
} catch (error) {
  if (error instanceof TenantScaleError) {
    console.error(error.name)       // e.g., 'ValidationError'
    console.error(error.code)       // e.g., 'VALIDATION_ERROR'
    console.error(error.message)    // e.g., 'name is required'
    console.error(error.statusCode) // e.g., 400
  }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Error class name |
| `code` | `string` | Machine-readable error code |
| `message` | `string` | Human-readable error message |
| `statusCode` | `number` | Recommended HTTP status code |
| `details` | `Record<string, unknown> \| undefined` | Additional context-specific data |

## AuthError

Errors related to authentication and authorization.

```typescript
import { AuthError } from '@tenantscale/sdk'

try {
  await ts.authenticateApiKey()(req, res, next)
} catch (error) {
  if (error instanceof AuthError) {
    console.error('Auth failed:', error.code)
    // Handle specific auth error
  }
}
```

### MissingKeyError

Thrown when no API key is provided in the request.

```typescript
import { MissingKeyError } from '@tenantscale/sdk'

// Triggered by: missing Authorization header
new MissingKeyError()

// Properties:
// code: 'MISSING_API_KEY'
// message: 'Missing API key. Provide a Bearer token in the Authorization header.'
// statusCode: 401
```

| Property | Value |
|----------|-------|
| `code` | `'MISSING_API_KEY'` |
| `statusCode` | `401` |

### InvalidKeyError

Thrown when the API key format is invalid or the key is not found.

```typescript
import { InvalidKeyError } from '@tenantscale/sdk'

// Triggered by: malformed key, key not found in database
new InvalidKeyError()

// Properties:
// code: 'INVALID_API_KEY'
// message: 'Invalid API key. Check that the key is correct and active.'
// statusCode: 401
```

| Property | Value |
|----------|-------|
| `code` | `'INVALID_API_KEY'` |
| `statusCode` | `401` |

### ExpiredKeyError

Thrown when the API key has passed its expiration date.

```typescript
import { ExpiredKeyError } from '@tenantscale/sdk'

// Triggered by: expired API key
new ExpiredKeyError({ expiredAt: '2024-12-31T23:59:59Z' })

// Properties:
// code: 'KEY_EXPIRED'
// message: 'API key has expired (expired at 2024-12-31T23:59:59Z). Create a new key.'
// statusCode: 401
// details.expired_at: '2024-12-31T23:59:59Z'
```

| Property | Value |
|----------|-------|
| `code` | `'KEY_EXPIRED'` |
| `statusCode` | `401` |
| `details.expired_at` | ISO 8601 timestamp of expiration |

### InsufficientScopeError

Thrown when the API key does not have the required scope.

```typescript
import { InsufficientScopeError } from '@tenantscale/sdk'

// Triggered by: scope check failure
new InsufficientScopeError({
  requiredScope: 'orders:write',
  currentScopes: ['orders:read', 'webhooks:read'],
})

// Properties:
// code: 'INSUFFICIENT_SCOPE'
// message: 'API key requires scope 'orders:write'. Current key has scopes: [orders:read, webhooks:read].'
// statusCode: 403
// details.required_scope: 'orders:write'
// details.current_scopes: ['orders:read', 'webhooks:read']
```

| Property | Value |
|----------|-------|
| `code` | `'INSUFFICIENT_SCOPE'` |
| `statusCode` | `403` |
| `details.required_scope` | The scope that was required |
| `details.current_scopes` | The scopes the key actually has |

## PlanError

Errors related to plan enforcement.

```typescript
import { PlanError } from '@tenantscale/sdk'

try {
  await ts.plans.requirePlanFeature('webhooks')(req, res, next)
} catch (error) {
  if (error instanceof PlanError) {
    console.error('Plan enforcement failed:', error.code)
  }
}
```

### FeatureNotAllowedError

Thrown when a tenant's plan does not include a required feature.

```typescript
import { FeatureNotAllowedError } from '@tenantscale/sdk'

// Triggered by: requirePlanFeature middleware
new FeatureNotAllowedError({
  feature: 'webhooks',
  plan: 'plan_free',
  planName: 'Free',
  upgradeUrl: 'https://your-app.com/billing/upgrade',
})

// Properties:
// code: 'FEATURE_NOT_ALLOWED'
// message: 'Your plan (Free) does not include the 'webhooks' feature. Upgrade to Hobby or Pro to access this feature.'
// statusCode: 403
// details.feature: 'webhooks'
// details.plan: 'plan_free'
// details.plan_name: 'Free'
// details.upgrade_url: 'https://your-app.com/billing/upgrade'
```

| Property | Value |
|----------|-------|
| `code` | `'FEATURE_NOT_ALLOWED'` |
| `statusCode` | `403` |
| `details.feature` | The feature flag that was checked |
| `details.plan` | The tenant's current plan ID |
| `details.plan_name` | Human-readable plan name |
| `details.upgrade_url` | URL where the tenant can upgrade |

### LimitExceededError

Thrown when a tenant has reached a numeric plan limit.

```typescript
import { LimitExceededError } from '@tenantscale/sdk'

// Triggered by: requirePlanLimit middleware
new LimitExceededError({
  limit: 'max_api_keys',
  plan: 'plan_hobby',
  planName: 'Hobby',
  current: 5,
  max: 5,
  upgradeUrl: 'https://your-app.com/billing/upgrade',
})

// Properties:
// code: 'LIMIT_EXCEEDED'
// message: 'You have reached the maximum number of API keys (5) for your plan (Hobby). Delete existing keys or upgrade to Pro for more.'
// statusCode: 403
// details.limit: 'max_api_keys'
// details.current: 5
// details.max: 5
// details.upgrade_url: 'https://your-app.com/billing/upgrade'
```

| Property | Value |
|----------|-------|
| `code` | `'LIMIT_EXCEEDED'` |
| `statusCode` | `403` |
| `details.limit` | The limit name |
| `details.current` | Current usage count |
| `details.max` | Maximum allowed by plan |
| `details.upgrade_url` | URL where the tenant can upgrade |

## RateLimitError

Thrown when a rate limit is exceeded.

```typescript
import { RateLimitError } from '@tenantscale/sdk'

// Triggered by: rate limit middleware
new RateLimitError({
  limit: 1000,
  remaining: 0,
  reset: 1625097600,
  retryAfterSeconds: 3600,
})

// Properties:
// code: 'RATE_LIMIT_EXCEEDED'
// message: 'Daily request limit exceeded. Resets at 2024-07-02T00:00:00Z.'
// statusCode: 429
// details.limit: 1000
// details.remaining: 0
// details.reset: 1625097600
// details.retry_after_seconds: 3600
```

| Property | Value |
|----------|-------|
| `code` | `'RATE_LIMIT_EXCEEDED'` |
| `statusCode` | `429` |
| `details.limit` | Maximum requests in the window |
| `details.remaining` | Remaining requests (always 0) |
| `details.reset` | Unix timestamp when the window resets |
| `details.retry_after_seconds` | Seconds to wait before retrying |

## WebhookError

Errors related to webhook operations.

```typescript
import { WebhookError } from '@tenantscale/sdk'

// Triggered by: webhook delivery failures, invalid webhook configuration
new WebhookError({
  code: 'WEBHOOK_DELIVERY_FAILED',
  message: 'Failed to deliver webhook to https://example.com/hook after 8 attempts.',
  details: {
    webhookId: 'wh_abc123',
    deliveryId: 'del_failed_456',
    lastError: 'Connection timeout',
    attempts: 8,
  },
})

// Other webhook error codes:
// 'WEBHOOK_NOT_FOUND' — webhook ID doesn't exist
// 'WEBHOOK_URL_INVALID' — URL is not valid HTTPS
// 'WEBHOOK_TIMEOUT' — delivery timed out
// 'WEBHOOK_INVALID_SIGNATURE' — signature verification failed
```

| Code | statusCode | Description |
|------|------------|-------------|
| `'WEBHOOK_DELIVERY_FAILED'` | `500` | All delivery retries exhausted |
| `'WEBHOOK_NOT_FOUND'` | `404` | Webhook ID not found |
| `'WEBHOOK_URL_INVALID'` | `400` | Webhook URL is not valid HTTPS |
| `'WEBHOOK_TIMEOUT'` | `504` | Delivery request timed out |
| `'WEBHOOK_INVALID_SIGNATURE'` | `401` | Incoming webhook signature is invalid |

## BillingError

Errors related to billing and Stripe operations.

```typescript
import { BillingError } from '@tenantscale/sdk'

// Triggered by: Stripe API errors, subscription failures
new BillingError({
  code: 'STRIPE_API_ERROR',
  message: 'Stripe API request failed: customer not found',
  details: {
    stripeErrorType: 'invalid_request_error',
    stripeCode: 'resource_missing',
    stripeParam: 'customer',
  },
})

// Other billing error codes:
// 'SUBSCRIPTION_NOT_FOUND' — no subscription for tenant
// 'INVOICE_NOT_FOUND' — invoice ID not found
// 'STRIPE_WEBHOOK_ERROR' — invalid Stripe webhook signature
// 'MISSING_STRIPE_KEY' — stripeKey not configured in TenantScale constructor
```

| Code | statusCode | Description |
|------|------------|-------------|
| `'STRIPE_API_ERROR'` | `502` | Stripe API returned an error |
| `'SUBSCRIPTION_NOT_FOUND'` | `404` | No subscription found for tenant |
| `'INVOICE_NOT_FOUND'` | `404` | Invoice ID not found |
| `'STRIPE_WEBHOOK_ERROR'` | `400` | Invalid Stripe webhook signature or payload |
| `'MISSING_STRIPE_KEY'` | `500` | Stripe key not configured |
| `'STRIPE_RATE_LIMITED'` | `429` | Stripe API rate limit hit |

## ValidationError

Thrown when input validation fails.

```typescript
import { ValidationError } from '@tenantscale/sdk'

// Triggered by: invalid parameters to SDK methods
new ValidationError({
  message: 'Invalid API key name',
  details: {
    field: 'name',
    value: '',
    constraint: 'name must be at least 1 character',
  },
})

// Other validation scenarios:
// - Missing required fields
// - Invalid scope format
// - Invalid URL format
// - Invalid date format
// - Exceeding max length
// - Invalid email format
```

| Property | Value |
|----------|-------|
| `code` | `'VALIDATION_ERROR'` |
| `statusCode` | `400` |
| `details.field` | The field that failed validation |
| `details.value` | The invalid value |
| `details.constraint` | The validation rule that was violated |

## Custom Error Creation

Create custom errors using the error factory:

```typescript
import { TenantScaleError } from '@tenantscale/sdk'

// Create a custom error
class CustomError extends TenantScaleError {
  constructor(params: {
    code: string
    message: string
    statusCode?: number
    details?: Record<string, unknown>
  }) {
    super(params)
    this.name = 'CustomError'
  }
}

// Usage
throw new CustomError({
  code: 'CUSTOM_ERROR',
  message: 'Something specific happened',
  statusCode: 418,
  details: { foo: 'bar' },
})

// Catch it
try {
  // ...some operation
} catch (error) {
  if (error instanceof CustomError) {
    console.error(error.code, error.details)
  } else if (error instanceof TenantScaleError) {
    console.error('SDK error:', error.message)
  }
}
```

## Error Middleware Example

Create a centralized error handler for your Express app:

```typescript
import {
  TenantScaleError,
  AuthError,
  MissingKeyError,
  InvalidKeyError,
  ExpiredKeyError,
  InsufficientScopeError,
  PlanError,
  FeatureNotAllowedError,
  LimitExceededError,
  RateLimitError,
  WebhookError,
  BillingError,
  ValidationError,
} from '@tenantscale/sdk'
import { Request, Response, NextFunction } from 'express'

function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle TenantScale errors
  if (error instanceof TenantScaleError) {
    const body: Record<string, unknown> = {
      error: {
        code: error.code,
        message: error.message,
      },
    }

    // Add details for specific error types
    if (error instanceof InsufficientScopeError) {
      body.error.required_scope = error.details?.required_scope
      body.error.current_scopes = error.details?.current_scopes
    }

    if (error instanceof FeatureNotAllowedError) {
      body.error.feature = error.details?.feature
      body.error.plan = error.details?.plan
      body.error.upgrade_url = error.details?.upgrade_url
    }

    if (error instanceof LimitExceededError) {
      body.error.limit = error.details?.limit
      body.error.current = error.details?.current
      body.error.max = error.details?.max
      body.error.upgrade_url = error.details?.upgrade_url
    }

    if (error instanceof RateLimitError) {
      body.error.limit = error.details?.limit
      body.error.remaining = error.details?.remaining
      body.error.reset = error.details?.reset
      body.error.retry_after_seconds = error.details?.retry_after_seconds
      res.set('Retry-After', String(error.details?.retry_after_seconds ?? 60))
    }

    if (error instanceof ExpiredKeyError) {
      body.error.expired_at = error.details?.expired_at
    }

    return res.status(error.statusCode).json(body)
  }

  // Handle unexpected errors
  console.error('Unhandled error:', error)
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  })
}

// Register with Express
app.use(errorHandler)
```

## Catching Errors by Category

```typescript
try {
  await someSdkOperation()
} catch (error) {
  if (error instanceof AuthError) {
    // Handle authentication errors (401)
  } else if (error instanceof PlanError) {
    // Handle plan enforcement errors (403)
  } else if (error instanceof RateLimitError) {
    // Handle rate limit errors (429)
  } else if (error instanceof WebhookError) {
    // Handle webhook errors (4xx/5xx)
  } else if (error instanceof BillingError) {
    // Handle billing errors (4xx/5xx)
  } else if (error instanceof ValidationError) {
    // Handle validation errors (400)
  } else if (error instanceof TenantScaleError) {
    // Handle any other SDK error
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error)
  }
}
```

## Error Codes Reference

| Error Class | Code | HTTP Status |
|-------------|------|-------------|
| `MissingKeyError` | `MISSING_API_KEY` | 401 |
| `InvalidKeyError` | `INVALID_API_KEY` | 401 |
| `ExpiredKeyError` | `KEY_EXPIRED` | 401 |
| `InsufficientScopeError` | `INSUFFICIENT_SCOPE` | 403 |
| `FeatureNotAllowedError` | `FEATURE_NOT_ALLOWED` | 403 |
| `LimitExceededError` | `LIMIT_EXCEEDED` | 403 |
| `RateLimitError` | `RATE_LIMIT_EXCEEDED` | 429 |
| `WebhookError` | `WEBHOOK_*` | 4xx/5xx |
| `BillingError` | `STRIPE_API_ERROR` | 502 |
| `ValidationError` | `VALIDATION_ERROR` | 400 |
