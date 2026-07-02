# API Reference

The TenantScale REST API provides programmatic access to tenants, API keys, subscriptions, webhooks, analytics, and more. Use it to integrate TenantScale into your existing backend, build custom dashboards, or automate tenant management.

## Base URL

```
https://api.tenantscale.com/v1
```

For self-hosted deployments, replace `api.tenantscale.com` with your own domain:

```
https://tenantscale.yourcompany.com/v1
```

## Authentication

All API requests must include an API key in the `Authorization` header:

```
Authorization: Bearer tsk_live_abc123def456
```

API keys are generated per tenant using the CLI or the Create API Key endpoint. API keys start with `tsk_` followed by a prefix.

### API Key Types

| Type | Prefix | Use Case |
|------|--------|----------|
| Live | `tsk_live_` | Production API access |
| Test | `tsk_test_` | Development and testing |

### Authentication Errors

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key does not have the required scope |

## Success Responses

All successful responses follow a consistent shape:

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

For list endpoints, the response includes pagination metadata:

```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

## Error Responses

Errors follow a consistent shape:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or has been revoked.",
    "details": {
      "keyPrefix": "tsk_live_abc"
    }
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `PLAN_LIMIT_EXCEEDED` | 403 | Usage exceeds the tenant's plan limit |
| `PLAN_FEATURE_MISSING` | 403 | The tenant's plan does not include the required feature |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate slug) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service disruption |

### Error Details

The `details` object provides additional context:

- `details.requiredScopes` — For `INSUFFICIENT_SCOPE`: the scopes that were required
- `details.limit` and `details.usage` — For `PLAN_LIMIT_EXCEEDED`: the limit that was exceeded and current usage
- `details.retryAfter` — For `RATE_LIMIT_EXCEEDED`: seconds until the rate limit resets
- `details.field` — For `VALIDATION_ERROR`: the field that failed validation
- `details.requiredFeature` — For `PLAN_FEATURE_MISSING`: the feature that was required

## Pagination

All list endpoints use cursor-based pagination with standard query parameters.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: `100`) |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Items per page |
| `total` | integer | Total items across all pages |
| `totalPages` | integer | Total number of pages |

### Pagination Example

```
GET /v1/tenants?page=2&limit=10
```

```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_789",
    "page": 2,
    "limit": 10,
    "total": 53,
    "totalPages": 6
  }
}
```

## API Rate Limits

The TenantScale API enforces rate limits per API key and per IP address.

| Limit | Value | Applies To |
|-------|-------|------------|
| Requests per day per API key | 10,000 (configurable) | All authenticated requests |
| Requests per minute per IP | 100 | Unauthenticated requests |
| Burst | 50 requests per second | All requests |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9942
X-RateLimit-Reset: 1625097600
```

## Endpoints

### Tenants

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants` | List all tenants | `tenants:read` |
| `POST` | `/tenants` | Create a new tenant | `tenants:write` |
| `GET` | `/tenants/:id` | Get tenant details | `tenants:read` |
| `PUT` | `/tenants/:id` | Update tenant | `tenants:write` |
| `DELETE` | `/tenants/:id` | Delete a tenant | `tenants:admin` |

**POST /tenants**

```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "planId": "pro",
  "metadata": {
    "industry": "technology"
  }
}
```

### API Keys

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/api-keys` | List API keys for a tenant | `api-keys:read` |
| `POST` | `/tenants/:id/api-keys` | Create an API key | `api-keys:write` |
| `GET` | `/api-keys/:keyId` | Get API key details | `api-keys:read` |
| `DELETE` | `/api-keys/:keyId` | Revoke an API key | `api-keys:write` |

**POST /tenants/:id/api-keys**

```json
{
  "name": "Production Key",
  "scopes": ["tenants:read", "webhooks:write"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

### Plans

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/plans` | List all plans | `plans:read` |
| `POST` | `/plans` | Create a new plan | `plans:write` |
| `GET` | `/plans/:id` | Get plan details | `plans:read` |
| `PUT` | `/plans/:id` | Update a plan | `plans:write` |
| `DELETE` | `/plans/:id` | Delete a plan | `plans:admin` |

### Subscriptions

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/subscription` | Get subscription details | `billing:read` |
| `POST` | `/tenants/:id/subscription` | Create or update subscription | `billing:write` |
| `DELETE` | `/tenants/:id/subscription` | Cancel subscription | `billing:write` |
| `POST` | `/tenants/:id/subscription/portal` | Create Stripe portal session | `billing:write` |

### Webhooks

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/webhooks` | List webhook endpoints | `webhooks:read` |
| `POST` | `/tenants/:id/webhooks` | Register a webhook endpoint | `webhooks:write` |
| `PUT` | `/webhooks/:webhookId` | Update webhook endpoint | `webhooks:write` |
| `DELETE` | `/webhooks/:webhookId` | Delete webhook endpoint | `webhooks:write` |
| `GET` | `/webhooks/:webhookId/deliveries` | List webhook delivery attempts | `webhooks:read` |
| `POST` | `/webhooks/:webhookId/redeliver` | Redeliver a webhook | `webhooks:write` |

### Audit Logs

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/audit-logs` | List audit log entries | `audit:read` |
| `POST` | `/tenants/:id/audit-logs` | Create an audit log entry | `audit:write` |
| `GET` | `/tenants/:id/audit-logs/stats` | Audit log statistics | `audit:read` |
| `DELETE` | `/tenants/:id/audit-logs/purge` | Purge audit logs | `audit:admin` |

### Rate Limits

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/rate-limits` | Get rate limit status | `rate-limits:read` |
| `POST` | `/tenants/:id/rate-limits/reset` | Reset rate limit counters | `rate-limits:write` |

### Analytics

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/analytics/overview` | Dashboard overview | `analytics:read` |
| `GET` | `/tenants/:id/analytics/requests` | Request analytics by time | `analytics:read` |
| `GET` | `/tenants/:id/analytics/errors` | Error analytics | `analytics:read` |

### Billing

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/tenants/:id/invoices` | List invoices | `billing:read` |
| `GET` | `/tenants/:id/invoices/:invoiceId` | Get invoice details | `billing:read` |
| `POST` | `/tenants/:id/checkout` | Create Stripe checkout session | `billing:write` |
| `POST` | `/tenants/:id/portal` | Create Stripe customer portal session | `billing:write` |

### System

| Method | Path | Description | Scopes |
|--------|------|-------------|--------|
| `GET` | `/health` | Health check | None (public) |
| `GET` | `/metrics` | Prometheus metrics | `system:read` |
| `POST` | `/stripe/webhook` | Stripe webhook receiver | None (public, verified by signature) |
| `POST` | `/stripe/sync-plans` | Sync plans to Stripe | `system:write` |

## Full Endpoint Summary

| # | Method | Path | Resource Group |
|---|--------|------|----------------|
| 1 | `GET` | `/tenants` | Tenants |
| 2 | `POST` | `/tenants` | Tenants |
| 3 | `GET` | `/tenants/:id` | Tenants |
| 4 | `PUT` | `/tenants/:id` | Tenants |
| 5 | `DELETE` | `/tenants/:id` | Tenants |
| 6 | `GET` | `/tenants/:id/api-keys` | API Keys |
| 7 | `POST` | `/tenants/:id/api-keys` | API Keys |
| 8 | `GET` | `/api-keys/:keyId` | API Keys |
| 9 | `DELETE` | `/api-keys/:keyId` | API Keys |
| 10 | `GET` | `/plans` | Plans |
| 11 | `POST` | `/plans` | Plans |
| 12 | `GET` | `/plans/:id` | Plans |
| 13 | `PUT` | `/plans/:id` | Plans |
| 14 | `DELETE` | `/plans/:id` | Plans |
| 15 | `GET` | `/tenants/:id/subscription` | Subscriptions |
| 16 | `POST` | `/tenants/:id/subscription` | Subscriptions |
| 17 | `DELETE` | `/tenants/:id/subscription` | Subscriptions |
| 18 | `POST` | `/tenants/:id/subscription/portal` | Subscriptions |
| 19 | `GET` | `/tenants/:id/webhooks` | Webhooks |
| 20 | `POST` | `/tenants/:id/webhooks` | Webhooks |
| 21 | `PUT` | `/webhooks/:webhookId` | Webhooks |
| 22 | `DELETE` | `/webhooks/:webhookId` | Webhooks |
| 23 | `GET` | `/webhooks/:webhookId/deliveries` | Webhooks |
| 24 | `POST` | `/webhooks/:webhookId/redeliver` | Webhooks |
| 25 | `GET` | `/tenants/:id/audit-logs` | Audit Logs |
| 26 | `POST` | `/tenants/:id/audit-logs` | Audit Logs |
| 27 | `GET` | `/tenants/:id/audit-logs/stats` | Audit Logs |
| 28 | `DELETE` | `/tenants/:id/audit-logs/purge` | Audit Logs |
| 29 | `GET` | `/tenants/:id/rate-limits` | Rate Limits |
| 30 | `POST` | `/tenants/:id/rate-limits/reset` | Rate Limits |
| 31 | `GET` | `/tenants/:id/analytics/overview` | Analytics |
| 32 | `GET` | `/tenants/:id/analytics/requests` | Analytics |
| 33 | `GET` | `/tenants/:id/analytics/errors` | Analytics |
| 34 | `GET` | `/tenants/:id/invoices` | Billing |
| 35 | `GET` | `/tenants/:id/invoices/:invoiceId` | Billing |
| 36 | `POST` | `/tenants/:id/checkout` | Billing |
| 37 | `POST` | `/tenants/:id/portal` | Billing |
| 38 | `GET` | `/health` | System |
| 39 | `GET` | `/metrics` | System |
| 40 | `POST` | `/stripe/webhook` | System |
| 41 | `POST` | `/stripe/sync-plans` | System |

## ETags and Conditional Requests

All `GET` endpoints return `ETag` headers. You can use `If-None-Match` to get a `304 Not Modified` response when data hasn't changed:

```bash
curl -H "Authorization: Bearer tsk_live_..." \
     -H "If-None-Match: \"abc123\"" \
     https://api.tenantscale.com/v1/tenants/tnt_123
```

## Idempotency

`POST` and `PUT` requests support idempotency via the `Idempotency-Key` header:

```bash
curl -X POST https://api.tenantscale.com/v1/tenants \
     -H "Authorization: Bearer tsk_live_..." \
     -H "Idempotency-Key: unique-key-123" \
     -d '{"name": "Acme Corp"}'
```

Idempotency keys expire after 24 hours.

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
