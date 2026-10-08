---
title: Authentication
description: How to authenticate to the TenantScale API with API keys, scopes, and bearer tokens.
---

# Authentication

The TenantScale API authenticates every request with an API key sent in the `Authorization` header. This page covers how authentication works, the different key types, and how scopes restrict access.

## Bearer Token

All API requests must include an API key as a bearer token:

```http
Authorization: Bearer tsk_li...f456
```

Keys start with the prefix `tsk_` followed by a key type and a short identifier. The full key value is only shown once at creation, so store it securely.

## API Key Types

| Type | Prefix | Use Case |
|------|--------|----------|
| Live | `tsk_live_...` | Production API access |
| Test | `tsk_test_...` | Development and testing |
| Admin | `tsk_ad_...` | Elevated, cross-tenant operations |

Admin keys unlock the [Admin](/api/admin) endpoints and require elevated permissions. Do not use them in client-side or untrusted environments.

## Scopes

Each API key can be granted one or more scopes. A request is only allowed through if the key holds every scope required by the endpoint.

| Scope | Access |
|-------|--------|
| `tenants:read` / `tenants:write` / `tenants:admin` | [Tenants](/api/tenants) |
| `api-keys:read` / `api-keys:write` | [API Keys](/api/api-keys) |
| `plans:read` / `plans:write` / `plans:admin` | [Plans](/api/plans) |
| `billing:read` / `billing:write` | [Subscriptions](/api/subscriptions), [Invoices](/api/invoices) |
| `webhooks:read` / `webhooks:write` | [Webhooks](/api/webhooks) |
| `audit:read` / `audit:write` / `audit:admin` | [Events & Audit](/api/events), [Audit Logs](/api/audit) |
| `analytics:read` | [Analytics](/api/analytics) |
| `system:read` / `system:write` | [Status](/api/status), [Metrics](/api/metrics) |

## Authentication Errors

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_API_KEY` | 401 | Key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | Key does not hold the required scope(s) |

Example `INSUFFICIENT_SCOPE` error response:

```json
{
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "The provided API key does not have permission for this request.",
    "details": {
      "requiredScopes": ["billing:write"],
      "presentScopes": ["billing:read"]
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

## Creating API keys

Tenant-scoped API keys are created with the [Create API key](/api/api-keys#post-tenants-id-api-keys) endpoint. Admin keys are provisioned through your environment configuration.

See [API Keys](/api/api-keys) for the full key CRUD reference, and the [API Overview](/api/) for the common error conventions shared across all endpoints.