---
title: Webhooks
description: Stripe webhook receiver endpoint for processing billing events.
---

# Webhooks

The Webhooks API provides a single endpoint for receiving Stripe webhook events for billing and subscription management.

## Authentication

The webhook endpoint uses **Stripe signature verification** for authentication, not API keys. Requests are verified using the `Stripe-Signature` header.

## Endpoints

### POST /webhooks/stripe

Receive and process Stripe webhook events for subscriptions and billing.

**Authentication:** Stripe signature verification (no API key required)

**Rate Limit:** 100 requests per minute per IP

#### Headers

| Header | Description |
|--------|-------------|
| `Stripe-Signature` | Stripe webhook signature for verification |
| `Content-Type` | `application/json` |

#### Request Body

The request body contains the raw Stripe event payload. Common events include:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### Response

```json
{
  "data": {
    "received": true,
    "eventType": "checkout.session.completed"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_SIGNATURE` | 401 | Stripe signature verification failed |
| `INVALID_EVENT` | 400 | Invalid or unsupported event type |
| `PROCESSING_ERROR` | 500 | Error processing the webhook event |

#### Example

```bash
curl -X POST https://api.tenantscale.com/webhooks/stripe \
  -H "Stripe-Signature: t=...,v1=..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_abc123",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_abc123",
        "customer": "cus_xyz789"
      }
    }
  }'
```

---

## Supported Stripe Events

| Event | Description |
|-------|-------------|
| `checkout.session.completed` | Checkout session completed - new subscription created |
| `customer.subscription.created` | Subscription created in Stripe |
| `customer.subscription.updated` | Subscription updated (plan change, renewal) |
| `customer.subscription.deleted` | Subscription canceled/deleted |
| `invoice.payment_succeeded` | Invoice payment successful |
| `invoice.payment_failed` | Invoice payment failed |

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_SIGNATURE` | 401 | Stripe signature verification failed |
| `INVALID_EVENT` | 400 | Invalid or unsupported event type |
| `PROCESSING_ERROR` | 500 | Error processing the webhook event |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).