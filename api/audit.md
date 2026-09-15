---
title: Audit Logs
description: Audit log retrieval and management endpoints for tracking tenant activity and compliance.
---

# Audit Logs

The Audit Logs API provides endpoints for retrieving, creating, and managing audit log entries for compliance and security monitoring.

## Endpoints

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
| `actorType` | string | `null` | Filter by actor type (`user`, `system`, `api`) |
| `actorId` | string | `null` | Filter by specific actor ID |
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
        "id": "user_123",
        "name": "John Doe"
      },
      "target": {
        "type": "api_key",
        "id": "key_456",
        "name": "Production Key"
      },
      "changes": {
        "before": null,
        "after": {
          "name": "Production Key",
          "scopes": ["tenants:read", "webhooks:write"]
        }
      },
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "requestId": "req_abc123",
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
    "id": "user_123",
    "name": "John Doe"
  },
  "target": {
    "type": "resource",
    "id": "resource_456",
    "name": "Custom Resource"
  },
  "changes": {
    "before": {
      "status": "inactive"
    },
    "after": {
      "status": "active"
    }
  },
  "metadata": {
    "description": "User performed custom action",
    "source": "user_interface"
  }
}
```

#### Zod Schema

```typescript
{
  action: z.string().min(1).max(100),
  actor: z.object({
    type: z.enum(['user', 'system', 'api']),
    id: z.string(),
    name: z.string().optional()
  }),
  target: z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional()
  }),
  changes: z.object({
    before: z.any().optional(),
    after: z.any().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
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
      "id": "user_123",
      "name": "John Doe"
    },
    "target": {
      "type": "resource",
      "id": "resource_456",
      "name": "Custom Resource"
    },
    "changes": {
      "before": {
        "status": "inactive"
      },
      "after": {
        "status": "active"
      }
    },
    "metadata": {
      "description": "User performed custom action",
      "source": "user_interface"
    },
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2025-01-15T10:30:00Z"
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
| `NOT_FOUND` | 404 | Tenant does not exist |

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
| `groupBy` | string | `action` | Group by field (`action`, `actor`, `target`) |

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
      "totalEntries": 15234,
      "uniqueActors": 42,
      "uniqueTargets": 156
    },
    "actionsBreakdown": [
      {
        "action": "api_key.created",
        "count": 234,
        "percentage": 1.5
      },
      {
        "action": "tenant.updated",
        "count": 156,
        "percentage": 1.0
      },
      {
        "action": "user.login",
        "count": 8234,
        "percentage": 54.0
      }
    ],
    "topActors": [
      {
        "actorId": "user_123",
        "actorName": "John Doe",
        "actionCount": 456,
        "percentage": 3.0
      },
      {
        "actorId": "user_456",
        "actorName": "Jane Smith",
        "actionCount": 234,
        "percentage": 1.5
      }
    ],
    "byDate": [
      {
        "date": "2025-01-14",
        "count": 456
      },
      {
        "date": "2025-01-15",
        "count": 512
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
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/audit-logs/stats?startDate=2025-01-01&endDate=2025-01-15&groupBy=action" \
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
  "actions": ["api_key.created", "tenant.updated"],
  "actorId": "user_123"
}
```

#### Zod Schema

```typescript
{
  beforeDate: z.string().datetime().optional(),
  actions: z.array(z.string()).optional(),
  actorId: z.string().optional()
}
```

#### Response

```json
{
  "data": {
    "deletedCount": 1234,
    "criteria": {
      "beforeDate": "2024-01-01T00:00:00Z",
      "actions": ["api_key.created", "tenant.updated"],
      "actorId": "user_123"
    },
    "purgedAt": "2025-01-15T12:00:00Z"
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
curl -X DELETE https://api.tenantscale.com/v1/tenants/tenant_abc123/audit-logs/purge \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "beforeDate": "2024-01-01T00:00:00Z",
    "actions": ["api_key.created"]
  }'
```

---

### GET /audit-logs/:auditId

Get a specific audit log entry by ID.

**Authentication:** `audit:read` scope required

**Rate Limit:** 100 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `auditId` | string | Audit log entry ID |

#### Response

```json
{
  "data": {
    "id": "audit_123",
    "tenantId": "tenant_abc123",
    "action": "api_key.created",
    "actor": {
      "type": "user",
      "id": "user_123",
      "name": "John Doe"
    },
    "target": {
      "type": "api_key",
      "id": "key_456",
      "name": "Production Key"
    },
    "changes": {
      "before": null,
      "after": {
        "name": "Production Key",
        "scopes": ["tenants:read", "webhooks:write"]
      }
    },
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2025-01-15T10:30:00Z",
    "metadata": {
      "source": "api",
      "requestId": "req_abc123"
    }
  },
  "meta": {
    "requestId": "req_mno345"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Audit log entry does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/audit-logs/audit_123 \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

## Standard Audit Actions

| Action | Description | Category |
|--------|-------------|----------|
| `tenant.created` | Tenant was created | Tenant |
| `tenant.updated` | Tenant was updated | Tenant |
| `tenant.deleted` | Tenant was deleted | Tenant |
| `api_key.created` | API key was created | Security |
| `api_key.updated` | API key was updated | Security |
| `api_key.revoked` | API key was revoked | Security |
| `subscription.created` | Subscription was created | Billing |
| `subscription.updated` | Subscription was updated | Billing |
| `subscription.canceled` | Subscription was canceled | Billing |
| `webhook.created` | Webhook endpoint was created | Integration |
| `webhook.updated` | Webhook endpoint was updated | Integration |
| `webhook.deleted` | Webhook endpoint was deleted | Integration |
| `alert.created` | Alert was created | Monitoring |
| `alert.updated` | Alert was updated | Monitoring |
| `alert.deleted` | Alert was deleted | Monitoring |
| `alert.triggered` | Alert was triggered | Monitoring |
| `user.login` | User logged in | Authentication |
| `user.logout` | User logged out | Authentication |

## Audit Log Retention

Audit logs are retained according to the following schedule based on plan:

| Plan | Retention Period |
|------|------------------|
| Starter | 90 days |
| Pro | 180 days |
| Enterprise | 365 days |

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