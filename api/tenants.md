---
title: Tenants
description: CRUD operations for managing tenants in your multi-tenant application.
---

# Tenants

The Tenants API provides CRUD operations for managing tenants in your multi-tenant application.

## Endpoints

### GET /tenants

List all tenants.

**Authentication:** `tenants:read` scope required

**Rate Limit:** 60 requests per minute

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |
| `search` | string | `null` | Search by name or slug |
| `planId` | string | `null` | Filter by plan ID |
| `status` | string | `null` | Filter by status (`active`, `suspended`, `deleted`) |

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
      "metadata": {
        "industry": "technology",
        "employees": 100
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
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
curl "https://api.tenantscale.com/v1/tenants?page=1&limit=10&status=active" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /tenants

Create a new tenant.

**Authentication:** `tenants:write` scope required

**Rate Limit:** 30 requests per minute

#### Request Body

```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "planId": "pro",
  "metadata": {
    "industry": "technology",
    "employees": 100
  }
}
```

#### Zod Schema

```typescript
{
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  planId: z.string().optional(),
  metadata: z.record(z.any()).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "tenant_abc123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "planId": "pro",
    "status": "active",
    "metadata": {
      "industry": "technology",
      "employees": 100
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
| `VALIDATION_ERROR` | 422 | Invalid request body (e.g., invalid slug format) |
| `CONFLICT` | 409 | Tenant with the same slug already exists |
| `PLAN_NOT_FOUND` | 404 | Specified plan does not exist |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "slug": "acme-corp",
    "planId": "pro",
    "metadata": {
      "industry": "technology"
    }
  }'
```

---

### GET /tenants/:id

Get tenant details.

**Authentication:** `tenants:read` scope required

**Rate Limit:** 100 requests per minute

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
    "metadata": {
      "industry": "technology",
      "employees": 100
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "usage": {
      "apiRequests": 5234,
      "storageBytes": 1073741824,
      "users": 42
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
curl https://api.tenantscale.com/v1/tenants/tenant_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### PUT /tenants/:id

Update tenant details.

**Authentication:** `tenants:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "planId": "enterprise",
  "metadata": {
    "industry": "technology",
    "employees": 150
  }
}
```

#### Zod Schema

```typescript
{
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  planId: z.string().optional(),
  metadata: z.record(z.any()).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "tenant_abc123",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "planId": "enterprise",
    "status": "active",
    "metadata": {
      "industry": "technology",
      "employees": 150
    },
    "createdAt": "2025-01-01T00:00:00Z",
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
| `CONFLICT` | 409 | Slug already in use by another tenant |
| `NOT_FOUND` | 404 | Tenant does not exist |
| `PLAN_NOT_FOUND` | 404 | Specified plan does not exist |

#### Example

```bash
curl -X PUT https://api.tenantscale.com/v1/tenants/tenant_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "planId": "enterprise"
  }'
```

---

### DELETE /tenants/:id

Delete a tenant.

**Authentication:** `tenants:admin` scope required

**Rate Limit:** 10 requests per hour

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Response

```json
{
  "data": {
    "id": "tenant_abc123",
    "deleted": true,
    "deletedAt": "2025-01-15T12:00:00Z"
  },
  "meta": {
    "requestId": "req_mno345"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Tenant does not exist |
| `CONFLICT` | 409 | Cannot delete tenant with active subscription |

#### Example

```bash
curl -X DELETE https://api.tenantscale.com/v1/tenants/tenant_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456"
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
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate slug) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).