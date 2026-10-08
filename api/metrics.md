---
title: Metrics
description: Prometheus-format metrics endpoint for scraping system and tenant metrics.
---

# Metrics

The Metrics endpoint exposes operational metrics in [Prometheus](https://prometheus.io) text format, suitable for scraping by Prometheus, Grafana, or any OpenMetrics-compatible collector.

## Endpoint

### GET /metrics

Expose system and per-endpoint metrics in Prometheus exposition format.

**Authentication:** `system:read` scope required

**Rate Limit:** 30 requests per minute

#### Response

Returns a `text/plain` body using the [Prometheus text format](https://prometheus.io/docs/instrumenting/exposition_formats/):

```text
# HELP tenantscale_http_requests_total Total HTTP requests received.
# TYPE tenantscale_http_requests_total counter
tenantscale_http_requests_total{method="GET",route="/v1/tenants",status="200"} 5234
tenantscale_http_requests_total{method="POST",route="/v1/tenants",status="201"} 128

# HELP tenantscale_http_request_duration_seconds HTTP request duration histogram.
# TYPE tenantscale_http_request_duration_seconds histogram
tenantscale_http_request_duration_seconds_bucket{route="/v1/tenants",le="0.1"} 4200
tenantscale_http_request_duration_seconds_bucket{route="/v1/tenants",le="+Inf"} 5234
tenantscale_http_request_duration_seconds_sum{route="/v1/tenants"} 182.5
tenantscale_http_request_duration_seconds_count{route="/v1/tenants"} 5234

# HELP tenantscale_active_tenants Number of active tenants.
# TYPE tenantscale_active_tenants gauge
tenantscale_active_tenants 1560

# HELP tenantscale_api_usage_requests Tenant API request usage.
# TYPE tenantscale_api_usage_requests gauge
tenantscale_api_usage_requests{tenant_id="tenant_abc123"} 9500
```

#### Common Metric Families

| Metric | Type | Description |
|--------|------|-------------|
| `tenantscale_http_requests_total` | counter | Total HTTP requests by method, route, and status |
| `tenantscale_http_request_duration_seconds` | histogram | Request latency |
| `tenantscale_active_tenants` | gauge | Current number of active tenants |
| `tenantscale_api_usage_requests` | gauge | Per-tenant API request usage |

#### Example

```bash
curl https://api.tenantscale.com/metrics \
  -H "Authorization: Bearer tsk_li...f456"
```

---

## Scraping with Prometheus

Add a scrape target for the `/metrics` endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "tenantscale"
    scheme: https
    metrics_path: /metrics
    bearer_token: tsk_live_...f456
    static_configs:
      - targets: ["api.tenantscale.com"]
```

> **Note:** Authenticate with a key that holds the `system:read` scope. Never expose an unauthenticated `/metrics` endpoint in production.

## Related

- [Health & Status](/api/status) — liveness and readiness probes
- [Analytics](/api/analytics) — product-level usage analytics, not raw metrics
- [API Overview](/api/) — common conventions