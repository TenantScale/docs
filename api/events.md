---
title: Events & Audit
description: Event ingestion, audit log retrieval, and event analytics endpoints for tracking tenant activity.
---

# Events & Audit

The Events & Audit API provides endpoints for ingesting events, retrieving audit logs, and analyzing event data across tenants.

## Endpoints

### POST /events

Ingest a batch of events for a tenant.

**Authentication:** `events:write` scope required

**Rate Limit:** 100 requests per minute per tenant

#### Request Body

```json
{
  "tenantId": "tenant_abc123",
  "events": [
    {
      "type": "user.login",
      "timestamp": "2025-01-15T10:30:00Z",
      "userId": "user_123",
      "metadata": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      }
    }
  ]
}
```

#### Response

```json
{
  "data": {
    "accepted": 1,
    "rejected": 0,
    "batchId": "batch_xyz789"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid event schema or missing required fields |
| `PLAN_LIMIT_EXCEEDED` | 403 | Tenant has exceeded event ingestion limit |
| `INVALID_TENANT` | 404 | Tenant does not exist |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/events \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc123",
    "events": [
      {
        "type": "user.login",
        "timestamp": "2025-01-15T10:30:00Z",
        "userId": "user_123",
        "metadata": {
          "ip": "192.168.1.1"
        }
      }
    ]
  }'
```

---

### GET /events/summary

Get aggregated event summary statistics for a tenant.

**Authentication:** `events:read` scope required

**Rate Limit:** 60 requests per minute per tenant

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant ID |
| `startDate` | string | No | ISO 8601 date (default: 30 days ago) |
| `endDate` | string | No | ISO 8601 date (default: now) |
| `groupBy` | string | No | Group by field (e.g., `type`, `userId`) |

#### Response

```json
{
  "data": {
    "totalEvents": 15234,
    "uniqueUsers": 842,
    "topEventTypes": [
      {
        "type": "user.login",
        "count": 5234
      },
      {
        "type": "user.logout",
        "count": 4102
      }
    ],
    "timeRange": {
      "start": "2024-12-16T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    }
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/events/summary?tenantId=tenant_abc123&startDate=2025-01-01&endDate=2025-01-15" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### GET /tenants/:id/audit-logs

List audit log entries for a specific tenant.

**Authentication:** `audit:read` scope required

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
| `action` | string | `null` | Filter by action type |
| `userId` | string | `null` | Filter by user ID |
| `startDate` | string | `null` | ISO 8601 start date |
| `endDate` | string | `null` | ISO 8601 end date |

#### Response

```json
{
  "data": [
    {
      "id": "audit_123",
      "tenantId": "tenant_abc123",
      "action": "api_key.created",
      "actor": {
        "type": "user",
        "id": "user_123"
      },
      "target": {
        "type": "api_key",
        "id": "key_456"
      },
      "changes": {
        "before": null,
        "after": {
          "name": "Production Key",
          "scopes": ["tenants:read"]
        }
      },
      "timestamp": "2025-01-15T10:30:00Z",
      "ip": "192.168.1.1"
    }
  ],
  "meta": {
    "requestId": "req_ghi789",
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/audit-logs?page=1&limit=10&action=api_key.created" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /tenants/:id/audit-logs

Create a custom audit log entry.

**Authentication:** `audit:write` scope required

**Rate Limit:** 100 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "action": "custom.user_action",
  "actor": {
    "type": "user",
    "id": "user_123"
  },
  "target": {
    "type": "resource",
    "id": "resource_456"
  },
  "metadata": {
    "description": "User performed custom action",
    "additionalInfo": "..."
  }
}
```

#### Response

```json
{
  "data": {
    "id": "audit_789",
    "tenantId": "tenant_abc123",
    "action": "custom.user_action",
    "actor": {
      "type": "user",
      "id": "user_123"
    },
    "target": {
      "type": "resource",
      "id": "resource_456"
    },
    "metadata": {
      "description": "User performed custom action"
    },
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "meta": {
    "requestId": "req_jkl012"
  }
}
```

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/audit-logs \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "custom.user_action",
    "actor": {
      "type": "user",
      "id": "user_123"
    },
    "target": {
      "type": "resource",
      "id": "resource_456"
    },
    "metadata": {
      "description": "User performed custom action"
    }
  }'
```

---

### GET /tenants/:id/audit-logs/stats

Get audit log statistics for a tenant.

**Authentication:** `audit:read` scope required

**Rate Limit:** 30 requests per minute per tenant

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
    "totalEntries": 15234,
    "actionsBreakdown": [
      {
        "action": "api_key.created",
        "count": 234
      },
      {
        "action": "tenant.updated",
        "count": 156
      }
    ],
    "topActors": [
      {
        "actorId": "user_123",
        "actionCount": 456
      }
    ],
    "timeRange": {
      "start": "2024-12-16T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    }
  },
  "meta": {
    "requestId": "req_mno345"
  }
}
```

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/audit-logs/stats?startDate=2025-01-01&endDate=2025-01-15" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### DELETE /tenants/:id/audit-logs/purge

Purge audit logs for a tenant based on criteria.

**Authentication:** `audit:admin` scope required

**Rate Limit:** 10 requests per hour per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "beforeDate": "2024-01-01T00:00:00Z",
  "actions": ["api_key.created", "tenant.updated"]
}
```

#### Response

```json
{
  "data": {
    "deletedCount": 1234,
    "criteria": {
      "beforeDate": "2024-01-01T00:00:00Z",
      "actions": ["api_key.created", "tenant.updated"]
    }
  },
  "meta": {
    "requestId": "req_pqr678"
  }
}
```

#### Example

```bash
curl -X DELETE https://api.tenantscale.com/v1/tenants/tenant_abc123/audit-logs/purge \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "beforeDate": "2024-01-01T00:00:00Z",
    "actions": ["api_key.created"]
  }'
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
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).