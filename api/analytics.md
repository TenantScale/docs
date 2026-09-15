---
title: Analytics
description: Analytics endpoints for retrieving usage metrics, request analytics, and error analytics for tenants.
---

# Analytics

The Analytics API provides endpoints for retrieving usage metrics, request analytics, and error analytics for tenants.

## Endpoints

### GET /tenants/:id/analytics/overview

Get dashboard overview analytics for a tenant.

**Authentication:** `analytics:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | 30 days ago | ISO 8601 start date |
| `endDate` | string | now | ISO 8601 end date |

#### Response

```json
{
  "data": {
    "tenantId": "tenant_abc123",
    "period": {
      "start": "2024-12-16T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    },
    "summary": {
      "totalRequests": 152345,
      "uniqueUsers": 842,
      "activeUsers": 423,
      "averageResponseTime": 245,
      "errorRate": 0.012
    },
    "usage": {
      "apiRequests": {
        "current": 152345,
        "limit": 100000,
        "percentage": 152.35
      },
      "storageBytes": {
        "current": 1073741824,
        "limit": 5368709120,
        "percentage": 20
      },
      "users": {
        "current": 842,
        "limit": 1000,
        "percentage": 84.2
      }
    },
    "trends": {
      "requests": [
        {
          "date": "2025-01-14",
          "count": 5234
        },
        {
          "date": "2025-01-15",
          "count": 5678
        }
      ],
      "users": [
        {
          "date": "2025-01-14",
          "count": 412
        },
        {
          "date": "2025-01-15",
          "count": 423
        }
      ]
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/analytics/overview?startDate=2025-01-01&endDate=2025-01-15" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### GET /tenants/:id/analytics/requests

Get request analytics broken down by time for a tenant.

**Authentication:** `analytics:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | 30 days ago | ISO 8601 start date |
| `endDate` | string | now | ISO 8601 end date |
| `groupBy` | string | `day` | Group by time period (`hour`, `day`, `week`, `month`) |
| `endpoint` | string | `null` | Filter by specific endpoint |

#### Response

```json
{
  "data": {
    "tenantId": "tenant_abc123",
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    },
    "groupBy": "day",
    "totalRequests": 152345,
    "averageRequestsPerDay": 10156,
    "peakRequests": {
      "date": "2025-01-10",
      "count": 15234
    },
    "breakdown": [
      {
        "date": "2025-01-01",
        "count": 8234,
        "successful": 8123,
        "failed": 111
      },
      {
        "date": "2025-01-02",
        "count": 9456,
        "successful": 9345,
        "failed": 111
      }
    ],
    "byEndpoint": [
      {
        "endpoint": "GET /tenants",
        "count": 23456,
        "percentage": 15.4
      },
      {
        "endpoint": "POST /events",
        "count": 45678,
        "percentage": 30
      }
    ]
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/analytics/requests?startDate=2025-01-01&endDate=2025-01-15&groupBy=day" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### GET /tenants/:id/analytics/errors

Get error analytics for a tenant.

**Authentication:** `analytics:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | 30 days ago | ISO 8601 start date |
| `endDate` | string | now | ISO 8601 end date |
| `errorCode` | string | `null` | Filter by specific error code |

#### Response

```json
{
  "data": {
    "tenantId": "tenant_abc123",
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    },
    "summary": {
      "totalErrors": 1234,
      "errorRate": 0.008,
      "totalRequests": 152345
    },
    "byCode": [
      {
        "code": "VALIDATION_ERROR",
        "count": 456,
        "percentage": 36.9,
        "httpStatus": 422
      },
      {
        "code": "RATE_LIMIT_EXCEEDED",
        "count": 234,
        "percentage": 19,
        "httpStatus": 429
      },
      {
        "code": "INVALID_API_KEY",
        "count": 123,
        "percentage": 10,
        "httpStatus": 401
      }
    ],
    "byEndpoint": [
      {
        "endpoint": "POST /events",
        "errorCount": 234,
        "totalRequests": 45678,
        "errorRate": 0.005
      },
      {
        "endpoint": "GET /tenants",
        "errorCount": 123,
        "totalRequests": 23456,
        "errorRate": 0.005
      }
    ],
    "trends": [
      {
        "date": "2025-01-14",
        "errorCount": 45,
        "errorRate": 0.006
      },
      {
        "date": "2025-01-15",
        "errorCount": 67,
        "errorRate": 0.008
      }
    ]
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/analytics/errors?startDate=2025-01-01&endDate=2025-01-15" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### GET /tenants/:id/analytics/users

Get user analytics for a tenant.

**Authentication:** `analytics:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | 30 days ago | ISO 8601 start date |
| `endDate` | string | now | ISO 8601 end date |

#### Response

```json
{
  "data": {
    "tenantId": "tenant_abc123",
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    },
    "summary": {
      "totalUsers": 842,
      "activeUsers": 423,
      "newUsers": 67,
      "churnedUsers": 12
    },
    "trends": [
      {
        "date": "2025-01-14",
        "totalUsers": 835,
        "activeUsers": 418,
        "newUsers": 5
      },
      {
        "date": "2025-01-15",
        "totalUsers": 842,
        "activeUsers": 423,
        "newUsers": 7
      }
    ],
    "topUsers": [
      {
        "userId": "user_123",
        "requestCount": 1234,
        "lastActive": "2025-01-15T10:30:00Z"
      },
      {
        "userId": "user_456",
        "requestCount": 987,
        "lastActive": "2025-01-15T09:45:00Z"
      }
    ]
  },
  "meta": {
    "requestId": "req_jkl012"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/analytics/users?startDate=2025-01-01&endDate=2025-01-15" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `PLAN_LIMIT_EXCEEDED` | 403 | Usage exceeds the tenant's plan limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Analytics Retention

Analytics data is retained according to the following schedule:

| Data Type | Retention Period |
|-----------|------------------|
| Request analytics | 90 days |
| Error analytics | 90 days |
| User analytics | 365 days |
| Overview metrics | 30 days |

## Rate Limits by Plan

| Plan | Requests per Minute | Requests per Hour |
|------|---------------------|-------------------|
| Starter | 30 | 500 |
| Pro | 60 | 1000 |
| Enterprise | 120 | 2000 |

For more information on error responses, see the [API Overview](/api/).