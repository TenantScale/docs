---
title: Subscriptions
description: Subscription management endpoints for Stripe checkout and customer portal sessions.
---

# Subscriptions

The Subscriptions API provides endpoints for creating Stripe checkout sessions and customer portal sessions for subscription management.

## Authentication

Subscription endpoints use **portal session authentication**, not API key authentication. These endpoints are accessed through the customer portal using a valid portal session token.

## Endpoints

### POST /v1/subscriptions/checkout

Create a Stripe checkout session for a new subscription.

**Authentication:** Portal session token required

**Rate Limit:** 30 requests per minute per tenant

#### Request Body

```json
{
  "planId": "pro",
  "successUrl": "https://app.example.com/settings/billing?success=true",
  "cancelUrl": "https://app.example.com/settings/billing?canceled=true"
}
```

#### Zod Schema

```typescript
{
  planId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
}
```

#### Response

```json
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/c/pay/abc123def456",
    "sessionId": "cs_abc123def456"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `PLAN_NOT_FOUND` | 404 | Specified plan does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/subscriptions/checkout \
  -H "Authorization: Bearer <portal_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "pro",
    "successUrl": "https://app.example.com/settings/billing?success=true",
    "cancelUrl": "https://app.example.com/settings/billing?canceled=true"
  }'
```

---

### POST /v1/subscriptions/portal

Create a Stripe customer portal session for managing existing subscriptions.

**Authentication:** Portal session token required

**Rate Limit:** 30 requests per minute per tenant

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
    "portalUrl": "https://billing.stripe.com/session/abc123def456",
    "customerId": "cus_xyz789"
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
| `STRIPE_ERROR` | 400 | Stripe API error (e.g., no customer exists) |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/subscriptions/portal \
  -H "Authorization: Bearer <portal_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "returnUrl": "https://app.example.com/settings/billing"
  }'
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_SESSION` | 401 | Portal session token is missing, malformed, or expired |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `PLAN_NOT_FOUND` | 404 | Specified plan does not exist |
| `STRIPE_ERROR` | 400 | Stripe API error (details in error message) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).