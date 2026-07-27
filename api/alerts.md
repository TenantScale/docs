---
title: Alerts
description: Alert configuration endpoints for setting up and managing custom alerts based on tenant activity and metrics.
---

# Alerts

The Alerts API provides endpoints for configuring and managing custom alerts based on tenant activity, usage metrics, and system events.

## Endpoints

### GET /tenants/:id/alerts

List alert configurations for a tenant.

**Authentication:** `alerts:read` scope required

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
| `type` | string | `null` | Filter by alert type |

#### Response

```json
{
  "data": [
    {
      "id": "alert_abc123",
      "tenantId": "tenant_abc123",
      "name": "API Usage Alert",
      "type": "usage",
      "metric": "api_requests",
      "threshold": 9000,
      "comparison": "gte",
      "window": "monthly",
      "active": true,
      "channels": [
        {
          "type": "email",
          "destination": "admin@example.com"
        },
        {
          "type": "webhook",
          "destination": "https://example.com/alerts"
        }
      ],
      "cooldown": 3600,
      "lastTriggered": "2025-01-15T10:30:00Z",
      "triggerCount": 5,
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
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/alerts?page=1&limit=10&active=true" \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /tenants/:id/alerts

Create a new alert configuration for a tenant.

**Authentication:** `alerts:write` scope required

**Rate Limit:** 30 requests per minute per tenant

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "name": "API Usage Alert",
  "type": "usage",
  "metric": "api_requests",
  "threshold": 9000,
  "comparison": "gte",
  "window": "monthly",
  "channels": [
    {
      "type": "email",
      "destination": "admin@example.com"
    }
  ],
  "cooldown": 3600
}
```

#### Zod Schema

```typescript
{
  name: z.string().min(1).max(100),
  type: z.enum(['usage', 'billing', 'system', 'custom']),
  metric: z.string(),
  threshold: z.number(),
  comparison: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  window: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  channels: z.array(z.object({
    type: z.enum(['email', 'webhook', 'slack', 'pagerduty']),
    destination: z.string()
  })).min(1),
  cooldown: z.number().int().min(60).max(86400).default(3600)
}
```

#### Response

```json
{
  "data": {
    "id": "alert_abc123",
    "tenantId": "tenant_abc123",
    "name": "API Usage Alert",
    "type": "usage",
    "metric": "api_requests",
    "threshold": 9000,
    "comparison": "gte",
    "window": "monthly",
    "active": true,
    "channels": [
      {
        "type": "email",
        "destination": "admin@example.com"
      }
    ],
    "cooldown": 3600,
    "lastTriggered": null,
    "triggerCount": 0,
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
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `PLAN_LIMIT_EXCEEDED` | 403 | Tenant has exceeded alert limit for their plan |
| `NOT_FOUND` | 404 | Tenant does not exist |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/alerts \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Usage Alert",
    "type": "usage",
    "metric": "api_requests",
    "threshold": 9000,
    "comparison": "gte",
    "window": "monthly",
    "channels": [
      {
        "type": "email",
        "destination": "admin@example.com"
      }
    ]
  }'
```

---

### GET /alerts/:alertId

Get alert configuration details.

**Authentication:** `alerts:read` scope required

**Rate Limit:** 100 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alertId` | string | Alert ID |

#### Response

```json
{
  "data": {
    "id": "alert_abc123",
    "tenantId": "tenant_abc123",
    "name": "API Usage Alert",
    "type": "usage",
    "metric": "api_requests",
    "threshold": 9000,
    "comparison": "gte",
    "window": "monthly",
    "active": true,
    "channels": [
      {
        "type": "email",
        "destination": "admin@example.com"
      }
    ],
    "cooldown": 3600,
    "lastTriggered": "2025-01-15T10:30:00Z",
    "triggerCount": 5,
    "history": [
      {
        "triggeredAt": "2025-01-15T10:30:00Z",
        "value": 9234,
        "status": "delivered"
      }
    ],
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
| `NOT_FOUND` | 404 | Alert does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/alerts/alert_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### PUT /alerts/:alertId

Update an alert configuration.

**Authentication:** `alerts:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alertId` | string | Alert ID |

#### Request Body

```json
{
  "name": "Updated API Usage Alert",
  "threshold": 9500,
  "active": true,
  "channels": [
    {
      "type": "email",
      "destination": "admin@example.com"
    },
    {
      "type": "slack",
      "destination": "https://hooks.slack.com/services/..."
    }
  ]
}
```

#### Zod Schema

```typescript
{
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['usage', 'billing', 'system', 'custom']).optional(),
  metric: z.string().optional(),
  threshold: z.number().optional(),
  comparison: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']).optional(),
  window: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  channels: z.array(z.object({
    type: z.enum(['email', 'webhook', 'slack', 'pagerduty']),
    destination: z.string()
  })).min(1).optional(),
  cooldown: z.number().int().min(60).max(86400).optional(),
  active: z.boolean().optional()
}
```

#### Response

```json
{
  "data": {
    "id": "alert_abc123",
    "tenantId": "tenant_abc123",
    "name": "Updated API Usage Alert",
    "type": "usage",
    "metric": "api_requests",
    "threshold": 9500,
    "comparison": "gte",
    "window": "monthly",
    "active": true,
    "channels": [
      {
        "type": "email",
        "destination": "admin@example.com"
      },
      {
        "type": "slack",
        "destination": "https://hooks.slack.com/services/..."
      }
    ],
    "cooldown": 3600,
    "lastTriggered": "2025-01-15T10:30:00Z",
    "triggerCount": 5,
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
| `NOT_FOUND` | 404 | Alert does not exist |

#### Example

```bash
curl -X PUT https://api.tenantscale.com/v1/alerts/alert_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated API Usage Alert",
    "threshold": 9500
  }'
```

---

### DELETE /alerts/:alertId

Delete an alert configuration.

**Authentication:** `alerts:write` scope required

**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alertId` | string | Alert ID |

#### Response

```json
{
  "data": {
    "id": "alert_abc123",
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
| `NOT_FOUND` | 404 | Alert does not exist |

#### Example

```bash
curl -X DELETE https://api.tenantscale.com/v1/alerts/alert_abc123 \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

### POST /alerts/:alertId/test

Test an alert configuration by triggering a mock alert.

**Authentication:** `alerts:write` scope required

**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alertId` | string | Alert ID |

#### Response

```json
{
  "data": {
    "alertId": "alert_abc123",
    "test": true,
    "triggeredAt": "2025-01-15T12:00:00Z",
    "channels": [
      {
        "type": "email",
        "destination": "admin@example.com",
        "status": "sent"
      },
      {
        "type": "slack",
        "destination": "https://hooks.slack.com/services/...",
        "status": "sent"
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
| `NOT_FOUND` | 404 | Alert does not exist |
| `VALIDATION_ERROR` | 422 | Alert configuration is invalid |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/alerts/alert_abc123/test \
  -H "Authorization: Bearer tsk_live_abc123def456"
```

---

## Alert Types

| Type | Description | Available Metrics |
|------|-------------|-------------------|
| `usage` | Monitor resource usage | `api_requests`, `storage_bytes`, `users`, `webhooks` |
| `billing` | Monitor billing events | `subscription.created`, `subscription.canceled`, `invoice.payment_failed` |
| `system` | Monitor system events | `tenant.created`, `tenant.deleted`, `api_key.revoked` |
| `custom` | Custom event-based alerts | Any custom event type |

## Comparison Operators

| Operator | Description |
|----------|-------------|
| `gt` | Greater than |
| `gte` | Greater than or equal to |
| `lt` | Less than |
| `lte` | Less than or equal to |
| `eq` | Equal to |

## Time Windows

| Window | Description |
|--------|-------------|
| `hourly` | Rolling 1-hour window |
| `daily` | Rolling 24-hour window |
| `weekly` | Rolling 7-day window |
| `monthly` | Rolling 30-day window |

## Notification Channels

| Type | Description | Destination Format |
|------|-------------|-------------------|
| `email` | Email notification | Email address |
| `webhook` | HTTP webhook | HTTPS URL |
| `slack` | Slack webhook | Slack webhook URL |
| `pagerduty` | PagerDuty integration | PagerDuty integration key |

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