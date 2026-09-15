---
title: Alerts
description: Alert checking endpoint for cron-triggered alert evaluation.
---

# Alerts

The Alerts API provides a single endpoint for checking and evaluating configured alerts. This is typically called by a cron job or scheduled task to periodically evaluate alert conditions.

## Authentication

The alert checking endpoint uses **admin API key authentication** for security.

```bash
Authorization: Bearer tsk_admin_abc123def456
```

## Endpoints

### POST /v1/admin/cron/check-alerts

Trigger evaluation of all configured alerts to check if any conditions are met and should trigger notifications.

**Authentication:** Admin API key required

**Rate Limit:** 10 requests per minute

#### Response

```json
{
  "data": {
    "evaluated": 15,
    "triggered": 3,
    "notificationsSent": 3,
    "results": [
      {
        "alertId": "alert_abc123",
        "tenantId": "tenant_abc123",
        "name": "API Usage Alert",
        "triggered": true,
        "value": 9234,
        "threshold": 9000,
        "triggeredAt": "2025-01-15T10:30:00Z"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `ADMIN_REQUIRED` | 403 | Admin API key required for this operation |
| `INTERNAL_ERROR` | 500 | Error evaluating alerts |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/admin/cron/check-alerts \
  -H "Authorization: Bearer tsk_admin_abc123def456"
```

---

## Alert Configuration

Alerts are configured through the database or CLI, not through API endpoints. The alert checking endpoint evaluates these pre-configured alerts based on:

- **Usage metrics** - API requests, storage, users
- **Billing events** - Subscription changes, payment failures
- **System events** - Tenant creation, deletion
- **Custom thresholds** - Configured per alert

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `ADMIN_REQUIRED` | 403 | Admin API key required for this operation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

For more information on error responses, see the [API Overview](/api/).