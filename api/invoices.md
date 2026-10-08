---
title: Invoices
description: List and retrieve Stripe invoices for a tenant.
---

# Invoices

The Invoices endpoints let you list and retrieve the Stripe invoices generated for a tenant's subscription and usage. Invoices are created automatically based on the tenant's [subscription](/api/subscriptions).

## Endpoints

### GET /tenants/:id/invoices

List a tenant's invoices.

**Authentication:** `billing:read` scope required

**Rate Limit:** 60 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |
| `status` | string | `null` | Filter by status (`draft`, `open`, `paid`, `void`, `uncollectible`) |

#### Response

```json
{
  "data": [
    {
      "id": "inv_abc123",
      "tenantId": "tenant_abc123",
      "stripeInvoiceId": "in_1QabcXYZ",
      "number": "INV-2025-001",
      "status": "paid",
      "currency": "usd",
      "amountDue": 9900,
      "amountPaid": 9900,
      "amountRemaining": 0,
      "periodStart": "2025-02-01T00:00:00Z",
      "periodEnd": "2025-02-28T23:59:59Z",
      "createdAt": "2025-03-01T00:00:00Z",
      "paidAt": "2025-03-01T00:05:00Z",
      "hostedUrl": "https://pay.stripe.com/invoice/invst_abc",
      "pdfUrl": "https://pay.stripe.com/invoice/invst_abc/pdf"
    }
  ],
  "meta": {
    "requestId": "req_abc123",
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/invoices?status=paid" \
  -H "Authorization: Bearer tsk_li...f456"
```

---

### GET /tenants/:id/invoices/:invoiceId

Get a single invoice's details.

**Authentication:** `billing:read` scope required

**Rate Limit:** 100 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |
| `invoiceId` | string | Invoice ID |

#### Response

```json
{
  "data": {
    "id": "inv_abc123",
    "tenantId": "tenant_abc123",
    "stripeInvoiceId": "in_1QabcXYZ",
    "number": "INV-2025-001",
    "status": "paid",
    "currency": "usd",
    "amountDue": 9900,
    "amountPaid": 9900,
    "amountRemaining": 0,
    "billingReason": "subscription_cycle",
    "lines": [
      {
        "description": "Pro plan (annual)",
        "amount": 9900,
        "quantity": 1
      }
    ],
    "periodStart": "2025-02-01T00:00:00Z",
    "periodEnd": "2025-02-28T23:59:59Z",
    "createdAt": "2025-03-01T00:00:00Z",
    "hostedUrl": "https://pay.stripe.com/invoice/invst_abc",
    "pdfUrl": "https://pay.stripe.com/invoice/invst_abc/pdf"
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Invoice does not exist for this tenant |

#### Example

```bash
curl https://api.tenantscale.com/v1/tenants/tenant_abc123/invoices/inv_abc123 \
  -H "Authorization: Bearer tsk_li...f456"
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |

For more information on error responses, see the [API Overview](/api/).