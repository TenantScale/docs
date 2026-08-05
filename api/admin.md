---
title: Admin
description: Admin endpoints for cross-tenant operations, system statistics, and impersonation.
---

# Admin

The Admin API provides endpoints for cross-tenant operations, system-wide statistics, and tenant impersonation that require elevated permissions.

## Authentication

Admin endpoints require **admin API key authentication**. These keys have elevated permissions and should be stored securely.

```bash
Authorization: Bearer tsk_admin_abc123def456
```

## Endpoints

### GET /v1/admin/tenants

List all tenants across the system (admin view).

**Authentication:** Admin API key required

**Rate Limit:** 30 requests per minute

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |
| `status` | string | `null` | Filter by status (`active`, `suspended`, `deleted`) |
| `planId` | string | `null` | Filter by plan ID |

#### Response

```json
{
  "data": [
    {
      "id": "tenant_abc123",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "planId": "pro",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z",
      "usage": {
        "apiRequests": 5234,
        "storageBytes": 1073741824,
        "users": 42
      }
    }
  ],
  "meta": {
    "requestId": "req_abc123",
    "page": 1,
    "limit": 20,
    "total": 53,
    "totalPages": 3
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/admin/tenants?page=1&limit=10&status=active" \
  -H "Authorization: Bearer tsk_admin_abc123def456"
```

---

### GET /v1/admin/tenants/:id

Get detailed information about a specific tenant (admin view).

**Authentication:** Admin API key required

**Rate Limit:** 60 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Response

```json
{
  "data": {
    "id": "tenant_abc123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "planId": "pro",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "usage": {
      "apiRequests": 5234,
      "storageBytes": 1073741824,
      "users": 42
    },
    "subscription": {
      "id": "sub_abc123",
      "status": "active",
      "currentPeriodEnd": "2025-02-01T00:00:00Z"
    }
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Tenant does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/admin/tenants/tenant_abc123 \
  -H "Authorization: Bearer tsk_admin_abc123def456"
```

---

### GET /v1/admin/stats

Get system-wide statistics and metrics.

**Authentication:** Admin API key required

**Rate Limit:** 30 requests per minute

#### Response

```json
{
  "data": {
    "tenants": {
      "total": 53,
      "active": 42,
      "suspended": 8,
      "deleted": 3
    },
    "requests": {
      "total": 1523456,
      "averagePerDay": 50782,
      "peak": 123456
    },
    "subscriptions": {
      "total": 38,
      "active": 35,
      "canceled": 3,
      "mrr": 12345.67
    },
    "errors": {
      "total": 1234,
      "errorRate": 0.0008
    }
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Example

```bash
curl https://api.tenantscale.com/v1/admin/stats \
  -H "Authorization: Bearer tsk_admin_abc123def456"
```

---

### POST /v1/admin/impersonate

Impersonate a tenant by generating an impersonation token.

**Authentication:** Admin API key required

**Rate Limit:** 10 requests per minute

#### Request Body

```json
{
  "tenantId": "tenant_abc123"
}
```

#### Zod Schema

```typescript
{
  tenantId: z.string()
}
```

#### Response

```json
{
  "data": {
    "token": "imp_abc123def456",
    "tenantId": "tenant_abc123",
    "expiresAt": "2025-01-15T11:30:00Z"
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
curl -X POST https://api.tenantscale.com/v1/admin/impersonate \
  -H "Authorization: Bearer tsk_admin_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc123"
  }'
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `ADMIN_REQUIRED` | 403 | Admin API key required for this operation |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).