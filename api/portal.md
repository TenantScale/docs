---
title: Portal Sessions
description: Customer portal session endpoints for creating Stripe customer portal and checkout sessions.
---

# Portal Sessions

The Portal Sessions API provides endpoints for creating Stripe customer portal sessions and checkout sessions, allowing customers to manage their subscriptions and payment methods.

## Endpoints

### POST /tenants/:id/portal

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
  "returnUrl": "https://app.example.com/settings/billing",
  "configuration": {
    "payment_method_update": true,
    "subscription_cancel": true,
    "subscription_update": true
  }
}
```

#### Zod Schema

```typescript
{
  returnUrl: z.string().url(),
  configuration: z.object({
    payment_method_update: z.boolean().optional(),
    subscription_cancel: z.boolean().optional(),
    subscription_update: z.boolean().optional()
  }).optional()
}
```

#### Response

```json
{
  "data": {
    "url": "https://billing.stripe.com/session/abc123def456",
    "customerId": "cus_xyz789",
    "sessionId": "sess_abc123",
    "expiresAt": "2025-01-15T11:30:00Z"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request body (e.g., invalid URL) |
| `NOT_FOUND` | 404 | Tenant does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error (e.g., no customer exists) |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/portal \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "returnUrl": "https://app.example.com/settings/billing",
    "configuration": {
      "payment_method_update": true,
      "subscription_cancel": true
    }
  }'
```

---

### POST /tenants/:id/checkout

Create a Stripe checkout session for a tenant.

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
  "successUrl": "https://app.example.com/success",
  "cancelUrl": "https://app.example.com/cancel",
  "customerEmail": "billing@example.com",
  "metadata": {
    "source": "onboarding_flow"
  }
}
```

#### Zod Schema

```typescript
{
  planId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string()).optional()
}
```

#### Response

```json
{
  "data": {
    "url": "https://checkout.stripe.com/c/pay/abc123def456",
    "sessionId": "cs_abc123",
    "planId": "pro",
    "expiresAt": "2025-01-15T11:30:00Z"
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
| `NOT_FOUND` | 404 | Tenant does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/checkout \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "pro",
    "successUrl": "https://app.example.com/success",
    "cancelUrl": "https://app.example.com/cancel",
    "customerEmail": "billing@example.com"
  }'
```

---

### GET /tenants/:id/portal/configuration

Get the portal configuration for a tenant.

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
    "tenantId": "tenant_abc123",
    "customerId": "cus_xyz789",
    "configuration": {
      "payment_method_update": true,
      "subscription_cancel": true,
      "subscription_update": true,
      "invoice_history": true
    },
    "businessProfile": {
      "businessName": "Acme Corp",
      "headline": "Manage your subscription",
      "privacy_policy_url": "https://example.com/privacy",
      "terms_of_service_url": "https://example.com/terms"
    }
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Tenant does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/tenants/tenant_abc123/portal/configuration \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### PUT /tenants/:id/portal/configuration

Update the portal configuration for a tenant.

**Authentication:** `billing:write` scope required

**Rate Limit:** 30 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "configuration": {
    "payment_method_update": true,
    "subscription_cancel": false,
    "subscription_update": true,
    "invoice_history": true
  },
  "businessProfile": {
    "businessName": "Acme Corp",
    "headline": "Manage your subscription",
    "privacy_policy_url": "https://example.com/privacy",
    "terms_of_service_url": "https://example.com/terms"
  }
}
```

#### Zod Schema

```typescript
{
  configuration: z.object({
    payment_method_update: z.boolean().optional(),
    subscription_cancel: z.boolean().optional(),
    subscription_update: z.boolean().optional(),
    invoice_history: z.boolean().optional()
  }).optional(),
  businessProfile: z.object({
    businessName: z.string().optional(),
    headline: z.string().optional(),
    privacy_policy_url: z.string().url().optional(),
    terms_of_service_url: z.string().url().optional()
  }).optional()
}
```

#### Response

```json
{
  "data": {
    "tenantId": "tenant_abc123",
    "customerId": "cus_xyz789",
    "configuration": {
      "payment_method_update": true,
      "subscription_cancel": false,
      "subscription_update": true,
      "invoice_history": true
    },
    "businessProfile": {
      "businessName": "Acme Corp",
      "headline": "Manage your subscription",
      "privacy_policy_url": "https://example.com/privacy",
      "terms_of_service_url": "https://example.com/terms"
    },
    "updatedAt": "2025-01-15T11:00:00Z"
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

#### Example

```bash
curl -X PUT https://api.tenantscale.com/v1/tenants/tenant_abc123/portal/configuration \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "configuration": {
      "subscription_cancel": false
    }
  }'
```

---

## Portal Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `payment_method_update` | boolean | Allow customers to update payment methods |
| `subscription_cancel` | boolean | Allow customers to cancel subscriptions |
| `subscription_update` | boolean | Allow customers to update subscription plans |
| `invoice_history` | boolean | Allow customers to view invoice history |

## Session Expiration

Both portal and checkout sessions expire after 30 minutes. The `expiresAt` field in the response indicates when the session will expire.

## Business Profile

The business profile settings customize the appearance of the Stripe customer portal:

| Field | Type | Description |
|-------|------|-------------|
| `businessName` | string | Business name displayed in the portal |
| `headline` | string | Headline text displayed in the portal |
| `privacy_policy_url` | string | URL to privacy policy |
| `terms_of_service_url` | string | URL to terms of service |

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