---
title: Subscriptions
description: Subscription management endpoints for creating, updating, and canceling tenant subscriptions.
---

# Subscriptions

The Subscriptions API provides endpoints for managing tenant subscriptions, including creating, updating, and canceling subscriptions.

## Endpoints

### GET /tenants/:id/subscription

Get subscription details for a tenant.

**Authentication:** `billing:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Response

```json
{
  "data": {
    "id": "sub_abc123",
    "tenantId": "tenant_abc123",
    "planId": "pro",
    "status": "active",
    "stripeCustomerId": "cus_xyz789",
    "stripeSubscriptionId": "sub_def456",
    "currentPeriodStart": "2025-01-01T00:00:00Z",
    "currentPeriodEnd": "2025-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Tenant or subscription does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/tenants/tenant_abc123/subscription \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /tenants/:id/subscription

Create or update a subscription for a tenant.

**Authentication:** `billing:write` scope required

**Rate Limit:** 30 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "planId": "pro",
  "stripeCustomerId": "cus_xyz789",
  "stripePaymentMethodId": "pm_def456",
  "trialDays": 14
}
```

#### Zod Schema

```typescript
{
  planId: z.string(),
  stripeCustomerId: z.string().optional(),
  stripePaymentMethodId: z.string().optional(),
  trialDays: z.number().int().min(0).max(90).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "sub_abc123",
    "tenantId": "tenant_abc123",
    "planId": "pro",
    "status": "trialing",
    "stripeCustomerId": "cus_xyz789",
    "stripeSubscriptionId": "sub_def456",
    "currentPeriodStart": "2025-01-15T10:30:00Z",
    "currentPeriodEnd": "2025-01-29T10:30:00Z",
    "cancelAtPeriodEnd": false,
    "trialEnd": "2025-01-29T10:30:00Z",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `PLAN_NOT_FOUND` | 404 | Specified plan does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error (e.g., invalid payment method) |
| `NOT_FOUND` | 404 | Tenant does not exist |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/subscription \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "pro",
    "stripeCustomerId": "cus_xyz789",
    "stripePaymentMethodId": "pm_def456",
    "trialDays": 14
  }'
```

---

### DELETE /tenants/:id/subscription

Cancel a subscription for a tenant.

**Authentication:** `billing:write` scope required

**Rate Limit:** 10 requests per hour per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `immediate` | boolean | `false` | Cancel immediately instead of at period end |

#### Response

```json
{
  "data": {
    "id": "sub_abc123",
    "tenantId": "tenant_abc123",
    "planId": "pro",
    "status": "canceled",
    "cancelAtPeriodEnd": true,
    "canceledAt": "2025-01-15T10:30:00Z",
    "currentPeriodEnd": "2025-02-01T00:00:00Z"
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Tenant or subscription does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error |

#### Example

```bash
curl -X DELETE "https://api.tenantscale.com/v1/tenants/tenant_abc123/subscription?immediate=false" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /tenants/:id/subscription/portal

Create a Stripe customer portal session for a tenant.

**Authentication:** `billing:write` scope required

**Rate Limit:** 30 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "returnUrl": "https://app.example.com/settings/billing"
}
```

#### Zod Schema

```typescript
{
  returnUrl: z.string().url()
}
```

#### Response

```json
{
  "data": {
    "url": "https://billing.stripe.com/session/abc123def456",
    "customerId": "cus_xyz789"
  },
  "meta": {
    "requestId": "req_jkl012"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `NOT_FOUND` | 404 | Tenant does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error (e.g., no customer exists) |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/subscription/portal \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "returnUrl": "https://app.example.com/settings/billing"
  }'
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `PLAN_LIMIT_EXCEEDED` | 403 | Usage exceeds the tenant's plan limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `STRIPE_ERROR` | 400 | Stripe API error (details in error message) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).