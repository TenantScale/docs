---
title: Health & Status
description: Health check and status endpoints for monitoring.
---

# Health & Status

The Health & Status endpoints let you verify that the TenantScale API is running and healthy. These are public endpoints used by uptime monitors, load balancers, and deployment pipelines.

## Endpoints

### GET /health

Public health check. Returns the service status and the health of its dependencies.

**Authentication:** None (public)

**Rate Limit:** 60 requests per minute

#### Response

```json
{
  "status": "ok",
  "timestamp": "2025-06-15T12:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "connected",
    "stripe": "configured",
    "redis": "connected"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `SERVICE_UNAVAILABLE` | 503 | A required dependency is unavailable |

#### Example

```bash
curl https://api.tenantscale.com/health
```

---

### GET /version

Returns the deployed API version.

**Authentication:** None (public)

**Rate Limit:** 60 requests per minute

#### Response

```json
{
  "version": "1.0.0"
}
```

#### Example

```bash
curl https://api.tenantscale.com/version
```

---

## Monitoring Cheatsheet

| Scenario | Endpoint | Interpretation |
|----------|----------|----------------|
| Liveness probe | `GET /health` | `status: ok` means the service is running |
| Readiness probe | `GET /health` | All `checks` are `connected` / `configured` |
| Version pinning | `GET /version` | Confirm the deployed release |

For operational metrics such as request rates and error counts, see [Metrics](/api/metrics). For a deployment overview, see the [Self-Hosting](/self-hosting/) guide.