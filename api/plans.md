---
title: Plans
description: Plan configuration endpoints for managing subscription plans and their features.
---

# Plans

The Plans API provides endpoints for managing subscription plans, including creating, updating, and deleting plans along with their features and limits.

## Endpoints

### GET /plans

List all available plans.

**Authentication:** `plans:read` scope required

**Rate Limit:** 60 requests per minute

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |
| `active` | boolean | `true` | Filter by active status |

#### Response

```json
{
  "data": [
    {
      "id": "starter",
      "name": "Starter",
      "description": "Perfect for small teams",
      "price": 29,
      "currency": "USD",
      "interval": "monthly",
      "active": true,
      "features": [
        {
          "name": "api_requests",
          "limit": 10000,
          "unit": "per month"
        },
        {
          "name": "users",
          "limit": 5,
          "unit": "total"
        }
      ],
      "metadata": {
        "highlight": true
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
curl "https://api.tenantscale.com/v1/plans?page=1&limit=10&active=true" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /plans

Create a new plan.

**Authentication:** `plans:write` scope required

**Rate Limit:** 10 requests per hour

#### Request Body

```json
{
  "id": "enterprise",
  "name": "Enterprise",
  "description": "For large organizations",
  "price": 299,
  "currency": "USD",
  "interval": "monthly",
  "features": [
    {
      "name": "api_requests",
      "limit": 1000000,
      "unit": "per month"
    },
    {
      "name": "users",
      "limit": 100,
      "unit": "total"
    },
    {
      "name": "custom_domains",
      "limit": 10,
      "unit": "total"
    }
  ],
  "metadata": {
    "highlight": true,
    "popular": true
  }
}
```

#### Zod Schema

```typescript
{
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  features: z.array(z.object({
    name: z.string(),
    limit: z.number().int().min(0),
    unit: z.string()
  })),
  metadata: z.record(z.any()).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "enterprise",
    "name": "Enterprise",
    "description": "For large organizations",
    "price": 299,
    "currency": "USD",
    "interval": "monthly",
    "active": true,
    "features": [
      {
        "name": "api_requests",
        "limit": 1000000,
        "unit": "per month"
      },
      {
        "name": "users",
        "limit": 100,
        "unit": "total"
      },
      {
        "name": "custom_domains",
        "limit": 10,
        "unit": "total"
      }
    ],
    "metadata": {
      "highlight": true,
      "popular": true
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
| `VALIDATION_ERROR` | 422 | Invalid request body (e.g., invalid plan ID format) |
| `CONFLICT` | 409 | Plan with the same ID already exists |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/plans \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "enterprise",
    "name": "Enterprise",
    "description": "For large organizations",
    "price": 299,
    "currency": "USD",
    "interval": "monthly",
    "features": [
      {
        "name": "api_requests",
        "limit": 1000000,
        "unit": "per month"
      },
      {
        "name": "users",
        "limit": 100,
        "unit": "total"
      }
    ]
  }'
```

---

### GET /plans/:id

Get plan details.

**Authentication:** `plans:read` scope required

**Rate Limit:** 100 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Plan ID |

#### Response

```json
{
  "data": {
    "id": "pro",
    "name": "Pro",
    "description": "For growing teams",
    "price": 99,
    "currency": "USD",
    "interval": "monthly",
    "active": true,
    "features": [
      {
        "name": "api_requests",
        "limit": 100000,
        "unit": "per month"
      },
      {
        "name": "users",
        "limit": 25,
        "unit": "total"
      },
      {
        "name": "webhooks",
        "limit": 10,
        "unit": "total"
      }
    ],
    "metadata": {
      "highlight": true
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Plan does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/plans/pro \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### PUT /plans/:id

Update a plan.

**Authentication:** `plans:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Plan ID |

#### Request Body

```json
{
  "name": "Pro Plan",
  "description": "Updated description for growing teams",
  "price": 119,
  "features": [
    {
      "name": "api_requests",
      "limit": 150000,
      "unit": "per month"
    },
    {
      "name": "users",
      "limit": 30,
      "unit": "total"
    }
  ]
}
```

#### Zod Schema

```typescript
{
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  interval: z.enum(['monthly', 'yearly']).optional(),
  features: z.array(z.object({
    name: z.string(),
    limit: z.number().int().min(0),
    unit: z.string()
  })).optional(),
  metadata: z.record(z.any()).optional()
}
```

#### Response

```json
{
  "data": {
    "id": "pro",
    "name": "Pro Plan",
    "description": "Updated description for growing teams",
    "price": 119,
    "currency": "USD",
    "interval": "monthly",
    "active": true,
    "features": [
      {
        "name": "api_requests",
        "limit": 150000,
        "unit": "per month"
      },
      {
        "name": "users",
        "limit": 30,
        "unit": "total"
      }
    ],
    "metadata": {
      "highlight": true
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
| `NOT_FOUND` | 404 | Plan does not exist |

#### Example

```bash
curl -X PUT https://api.tenantscale.com/v1/plans/pro \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Plan",
    "price": 119
  }'
```

---

### DELETE /plans/:id

Delete a plan.

**Authentication:** `plans:admin` scope required

**Rate Limit:** 10 requests per hour

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Plan ID |

#### Response

```json
{
  "data": {
    "id": "legacy",
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
| `NOT_FOUND` | 404 | Plan does not exist |
| `CONFLICT` | 409 | Cannot delete plan with active subscriptions |

#### Example

```bash
curl -X DELETE https://api.tenantscale.com/v1/plans/legacy \
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
| `CONFLICT` | 409 | Resource already exists or in use |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).