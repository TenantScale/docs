---
title: API Keys
description: Create, list, and revoke tenant API keys.
---

# API Keys

The API Keys endpoints let you create, list, and revoke the API keys used to authenticate against the TenantScale API. Keys are scoped to a tenant and carry a set of granted scopes.

## Endpoints

### GET /tenants/:id/api-keys

List all API keys for a tenant.

**Authentication:** `api-keys:read` scope required

**Rate Limit:** 60 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Response

```json
{
  "data": [
    {
      "id": "tsk_abc123",
      "name": "Production Key",
      "prefix": "tsk_live_abc",
      "scopes": ["tenants:read", "webhooks:write"],
      "type": "live",
      "createdAt": "2025-01-01T00:00:00Z",
      "lastUsedAt": "2025-01-15T09:00:00Z",
      "expiresAt": null
    }
  ],
  "meta": {
    "requestId": "req_abc123",
    "page": 1,
    "limit": 20,
    "total": 4,
    "totalPages": 1
  }
}
```

**Note:** Only the key `prefix` and metadata are returned. The full key value is only shown once at creation.

#### Example

```bash
curl "https://api.tenantscale.com/v1/tenants/tenant_abc123/api-keys" \
  -H "Authorization: Bearer tsk_li...f456"
```

---

### POST /tenants/:id/api-keys

Create a new API key for a tenant.

**Authentication:** `api-keys:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant ID |

#### Request Body

```json
{
  "name": "Production Key",
  "scopes": ["tenants:read", "webhooks:write"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

#### Response

```json
{
  "data": {
    "id": "tsk_abc123",
    "key": "tsk_live_...f456",
    "name": "Production Key",
    "prefix": "tsk_live_abc",
    "scopes": ["tenants:read", "webhooks:write"],
    "type": "live",
    "createdAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2025-12-31T23:59:59Z"
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

**Warning:** The full `key` value is returned only on creation. It cannot be recovered later, so store it immediately.

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid fields (e.g., empty name, unknown scope) |
| `NOT_FOUND` | 404 | Tenant does not exist |

#### Example

```bash
curl -X POST https://api.tenantscale.com/v1/tenants/tenant_abc123/api-keys \
  -H "Authorization: Bearer tsk_li...f456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "scopes": ["tenants:read", "webhooks:write"]
  }'
```

---

### GET /api-keys/:keyId

Get details for a single API key.

**Authentication:** `api-keys:read` scope required

**Rate Limit:** 100 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyId` | string | API key ID |

#### Response

```json
{
  "data": {
    "id": "tsk_abc123",
    "prefix": "tsk_live_abc",
    "name": "Production Key",
    "scopes": ["tenants:read", "webhooks:write"],
    "type": "live",
    "tenantId": "tenant_abc123",
    "createdAt": "2025-01-01T00:00:00Z",
    "lastUsedAt": "2025-01-15T09:00:00Z",
    "revokedAt": null
  },
  "meta": {
    "requestId": "req_ghi789"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | API key does not exist |

#### Example

```bash
curl https://api.tenantscale.com/v1/api-keys/tsk_abc123 \
  -H "Authorization: Bearer tsk_li...f456"
```

---

### DELETE /api-keys/:keyId

Revoke an API key. Revoked keys immediately stop authenticating requests.

**Authentication:** `api-keys:write` scope required

**Rate Limit:** 30 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyId` | string | API key ID |

#### Response

```json
{
  "data": {
    "id": "tsk_abc123",
    "revoked": true,
    "revokedAt": "2025-01-15T12:00:00Z"
  },
  "meta": {
    "requestId": "req_jkl012"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | API key does not exist |
| `CONFLICT` | 409 | Key is already revoked |

#### Example

```bash
curl -X DELETE https://api.tenantscale.com/v1/api-keys/tsk_abc123 \
  -H "Authorization: Bearer tsk_li...f456"
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing, malformed, revoked, or expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope(s) |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `CONFLICT` | 409 | Resource already in the requested state |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds allowed limit |

For more information on error responses, see the [API Overview](/api/).