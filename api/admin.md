---
title: Admin
description: Admin endpoints for system administration, health checks, and system-wide operations.
---

# Admin

The Admin API provides endpoints for system administration, health checks, and system-wide operations that require elevated permissions.

## Endpoints

### GET /health

Health check endpoint for monitoring system status.

**Authentication:** None (public endpoint)

**Rate Limit:** 100 requests per minute per IP

#### Response

```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "1.2.3",
    "services": {
      "database": {
        "status": "healthy",
        "latency": 5
      },
      "cache": {
        "status": "healthy",
        "latency": 2
      },
      "queue": {
        "status": "healthy",
        "latency": 10
      }
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Example

```bash
curl https://api.tenantscale.com/v1/health
```

---

### GET /metrics

Prometheus metrics endpoint for monitoring and alerting.

**Authentication:** Admin API key required

**Rate Limit:** 30 requests per minute

#### Response

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/tenants",status="200"} 1234

# HELP http_request_duration_seconds Duration of HTTP requests
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 100
http_request_duration_seconds_bucket{le="0.5"} 500
http_request_duration_seconds_bucket{le="1.0"} 800
http_request_duration_seconds_bucket{le="+Inf"} 1000

# HELP active_tenants Total number of active tenants
# TYPE active_tenants gauge
active_tenants 42
```

#### Example

```bash
curl https://api.tenantscale.com/v1/metrics \
  -H "Authorization: Bearer tsk_admin_abc123def456"
```

---

### GET /admin/tenants

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
    "requestId": "req_def456",
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

### POST /admin/tenants/:id/suspend

Suspend a tenant.

**Authentication:** Admin API key required

**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "reason": "Violation of terms of service",
  "note": "Exceeded API rate limits repeatedly"
}
```

#### Zod Schema

```typescript
{
  reason: z.string().min(1).max(500),
  note: z.string().max(1000).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "tenant_abc123",
    "status": "suspended",
    "suspendedAt": "2025-01-15T10:30:00Z",
    "suspensionReason": "Violation of terms of service",
    "suspensionNote": "Exceeded API rate limits repeatedly"
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
| `NOT_FOUND` | 404 | Tenant does not exist |
| `CONFLICT` | 409 | Tenant is already suspended |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/admin/tenants/tenant_abc123/suspend \
  -H "Authorization: Bearer tsk_admin_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of terms of service",
    "note": "Exceeded API rate limits repeatedly"
  }'
```

---

### POST /admin/tenants/:id/unsuspend

Unsuspend a tenant.

**Authentication:** Admin API key required

**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "note": "Issue resolved - user has been contacted"
}
```

#### Zod Schema

```typescript
{
  note: z.string().max(1000).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "tenant_abc123",
    "status": "active",
    "unsuspendedAt": "2025-01-15T11:00:00Z",
    "unsuspensionNote": "Issue resolved - user has been contacted"
  },
  "meta": {
    "requestId": "req_jkl012"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Tenant does not exist |
| `CONFLICT` | 409 | Tenant is not suspended |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/admin/tenants/tenant_abc123/unsuspend \
  -H "Authorization: Bearer tsk_admin_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Issue resolved"
  }'
```

---

### GET /admin/analytics

Get system-wide analytics.

**Authentication:** Admin API key required

**Rate Limit:** 30 requests per minute

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | 30 days ago | ISO 8601 start date |
| `endDate` | string | now | ISO 8601 end date |

#### Response

```json
{
  "data": {
    "period": {
      "start": "2024-12-16T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    },
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
    "requestId": "req_mno345"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/admin/analytics?startDate=2025-01-01&endDate=2025-01-15" \
  -H "Authorization: Bearer tsk_admin_abc123def456"
```

---

### POST /admin/stripe/sync-plans

Sync plans to Stripe.

**Authentication:** Admin API key required

**Rate Limit:** 10 requests per hour

#### Request Body

```json
{
  "planIds": ["starter", "pro", "enterprise"]
}
```

#### Zod Schema

```typescript
{
  planIds: z.array(z.string()).optional()
}
```

#### Response

```json
{
  "data": {
    "synced": 3,
    "failed": 0,
    "results": [
      {
        "planId": "starter",
        "stripePriceId": "price_abc123",
        "status": "synced"
      },
      {
        "planId": "pro",
        "stripePriceId": "price_def456",
        "status": "synced"
      },
      {
        "planId": "enterprise",
        "stripePriceId": "price_ghi789",
        "status": "synced"
      }
    ]
  },
  "meta": {
    "requestId": "req_pqr678"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `STRIPE_ERROR` | 400 | Stripe API error |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/admin/stripe/sync-plans \
  -H "Authorization: Bearer tsk_admin_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "planIds": ["starter", "pro", "enterprise"]
  }'
```

---

### POST /admin/cache/clear

Clear system cache.

**Authentication:** Admin API key required

**Rate Limit:** 10 requests per minute

#### Request Body

```json
{
  "keys": ["tenant:*", "plan:*"]
}
```

#### Zod Schema

```typescript
{
  keys: z.array(z.string()).optional()
}
```

#### Response

```json
{
  "data": {
    "cleared": 156,
    "keys": ["tenant:*", "plan:*"]
  },
  "meta": {
    "requestId": "req_stu901"
  }
}
```

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/admin/cache/clear \
  -H "Authorization: Bearer tsk_admin_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "keys": ["tenant:*"]
  }'
```

---

## Admin API Key Authentication

Admin endpoints require a special admin API key that starts with `tsk_admin_`. These keys have elevated permissions and should be stored securely.

```bash
Authorization: Bearer tsk_admin_abc123def456
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `ADMIN_REQUIRED` | 403 | Admin API key required for this operation |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `STRIPE_ERROR` | 400 | Stripe API error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).