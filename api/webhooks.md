---
title: Webhooks
description: Webhook management and dispatch endpoints for configuring and managing webhook notifications.
---

# Webhooks

The Webhooks API provides endpoints for managing webhook endpoints, viewing delivery attempts, and redelivering failed webhooks.

## Endpoints

### GET /tenants/:id/webhooks

List webhook endpoints for a tenant.

**Authentication:** `webhooks:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |
| `active` | boolean | `null` | Filter by active status |

#### Response

```json
{
  "data": [
    {
      "id": "webhook_abc123",
      "tenantId": "tenant_abc123",
      "url": "https://example.com/webhooks",
      "events": ["tenant.created", "tenant.updated", "subscription.canceled"],
      "secret": "whsec_abc123def456",
      "active": true,
      "headers": {
        "X-Custom-Header": "value"
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "requestId": "req_abc123",
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/webhooks?page=1&limit=10&active=true" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /tenants/:id/webhooks

Register a new webhook endpoint for a tenant.

**Authentication:** `webhooks:write` scope required

**Rate Limit:** 30 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "url": "https://example.com/webhooks",
  "events": ["tenant.created", "tenant.updated", "subscription.canceled"],
  "secret": "whsec_abc123def456",
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

#### Zod Schema

```typescript
{
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(10).max(100).optional(),
  headers: z.record(z.string()).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "webhook_abc123",
    "tenantId": "tenant_abc123",
    "url": "https://example.com/webhooks",
    "events": ["tenant.created", "tenant.updated", "subscription.canceled"],
    "secret": "whsec_abc123def456",
    "active": true,
    "headers": {
      "X-Custom-Header": "value"
    },
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
| `VALIDATION_ERROR` | 422 | Invalid request body (e.g., invalid URL) |
| `PLAN_LIMIT_EXCEEDED` | 403 | Tenant has exceeded webhook limit for their plan |
| `NOT_FOUND` | 404 | Tenant does not exist |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/webhooks \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhooks",
    "events": ["tenant.created", "tenant.updated"],
    "secret": "whsec_abc123def456"
  }'
```

---

### PUT /webhooks/:webhookId

Update a webhook endpoint.

**Authentication:** `webhooks:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookId` | string | Webhook ID |

#### Request Body

```json
{
  "url": "https://example.com/webhooks/updated",
  "events": ["tenant.created", "tenant.updated", "subscription.canceled", "tenant.deleted"],
  "active": true,
  "headers": {
    "X-Custom-Header": "updated-value"
  }
}
```

#### Zod Schema

```typescript
{
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().min(10).max(100).optional(),
  active: z.boolean().optional(),
  headers: z.record(z.string()).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "webhook_abc123",
    "tenantId": "tenant_abc123",
    "url": "https://example.com/webhooks/updated",
    "events": ["tenant.created", "tenant.updated", "subscription.canceled", "tenant.deleted"],
    "secret": "whsec_abc123def456",
    "active": true,
    "headers": {
      "X-Custom-Header": "updated-value"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T11:00:00Z"
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `NOT_FOUND` | 404 | Webhook does not exist |

#### Example

```bash
curl -X PUT https://api.tenantscale.com/v1/webhooks/webhook_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhooks/updated",
    "active": true
  }'
```

---

### DELETE /webhooks/:webhookId

Delete a webhook endpoint.

**Authentication:** `webhooks:write` scope required

**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookId` | string | Webhook ID |

#### Response

```json
{
  "data": {
    "id": "webhook_abc123",
    "deleted": true,
    "deletedAt": "2025-01-15T12:00:00Z"
  },
  "meta": {
    "requestId": "req_jkl012"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Webhook does not exist |

#### Example

```bash
curl -X DELETE https://api.tenantscale.com/v1/webhooks/webhook_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### GET /webhooks/:webhookId/deliveries

List webhook delivery attempts for a specific webhook.

**Authentication:** `webhooks:read` scope required

**Rate Limit:** 60 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookId` | string | Webhook ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |
| `status` | string | `null` | Filter by status (`success`, `failed`, `pending`) |
| `event` | string | `null` | Filter by event type |

#### Response

```json
{
  "data": [
    {
      "id": "delivery_xyz789",
      "webhookId": "webhook_abc123",
      "event": "tenant.created",
      "payload": {
        "tenantId": "tenant_abc123",
        "name": "Acme Corp"
      },
      "status": "success",
      "statusCode": 200,
      "response": {
        "received": true
      },
      "attemptedAt": "2025-01-15T10:30:00Z",
      "duration": 245
    }
  ],
  "meta": {
    "requestId": "req_mno345",
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/webhooks/webhook_abc123/deliveries?page=1&limit=10&status=failed" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /webhooks/:webhookId/redeliver

Redeliver a failed webhook.

**Authentication:** `webhooks:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookId` | string | Webhook ID |

#### Request Body

```json
{
  "deliveryId": "delivery_xyz789"
}
```

#### Zod Schema

```typescript
{
  deliveryId: z.string()
}
```

#### Response

```json
{
  "data": {
    "id": "delivery_xyz789",
    "webhookId": "webhook_abc123",
    "event": "tenant.created",
    "status": "pending",
    "redelivery": true,
    "attemptedAt": "2025-01-15T12:00:00Z"
  },
  "meta": {
    "requestId": "req_pqr678"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `NOT_FOUND` | 404 | Webhook or delivery does not exist |
| `CONFLICT` | 409 | Delivery is already in progress |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/webhooks/webhook_abc123/redeliver \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryId": "delivery_xyz789"
  }'
```

---

## Webhook Event Types

| Event | Description |
|-------|-------------|
| `tenant.created` | A new tenant was created |
| `tenant.updated` | A tenant was updated |
| `tenant.deleted` | A tenant was deleted |
| `subscription.created` | A subscription was created |
| `subscription.updated` | A subscription was updated |
| `subscription.canceled` | A subscription was canceled |
| `api_key.created` | An API key was created |
| `api_key.revoked` | An API key was revoked |
| `webhook.created` | A webhook endpoint was created |
| `webhook.deleted` | A webhook endpoint was deleted |

## Webhook Signature

All webhook requests include a signature in the `X-TenantScale-Signature` header. You can verify the signature using the webhook secret:

```typescript
import crypto from 'crypto';

const signature = req.headers['x-tenantscale-signature'];
const payload = req.body;

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature !== expectedSignature) {
  // Invalid signature
}
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `PLAN_LIMIT_EXCEEDED` | 403 | Usage exceeds the tenant's plan limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).