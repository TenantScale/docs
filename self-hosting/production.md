# Production Checklist

Before going live with TenantScale, review this comprehensive checklist to ensure your deployment is secure, performant, and reliable.

## 🛡️ Security

### 1. Use Strong API Keys

Ensure your master API keys are cryptographically strong:

```bash
# Generate a 256-bit key
openssl rand -hex 32
# → a1b2c3d4e5f6... (64 characters)
```

| Requirement | Standard |
|-------------|----------|
| Minimum length | 32 characters |
| Recommended length | 64 characters (256-bit) |
| Generation method | `openssl rand -hex 32` or similar CSPRNG |
| Storage | Environment variables, never in code |
| Rotation interval | Every 90 days |

### 2. Configure CORS Strictly

Restrict CORS to your application's exact domain:

```bash
# Vercel
vercel env add CORS_ORIGIN
# Enter: https://app.yourdomain.com

# Docker / Bare metal
CORS_ORIGIN=https://app.yourdomain.com
```

For development, you can allow multiple origins:

```bash
CORS_ORIGIN=http://localhost:3000,https://app.yourdomain.com
```

**Never use `*` in production** if the API handles authenticated requests.

### 3. Enforce HTTPS

- Vercel: Automatic (included with all deployments)
- Custom domain: Ensure SSL/TLS is enabled
- Docker/Bare metal: Use a reverse proxy (Nginx, Caddy) with Let's Encrypt

Nginx example:

```nginx
server {
    listen 443 ssl;
    server_name api.tenantscale.com;

    ssl_certificate /etc/letsencrypt/live/api.tenantscale.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tenantscale.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.tenantscale.com;
    return 301 https://$host$request_uri;
}
```

### 4. Rotate Secrets Regularly

| Secret | Interval | Rotation Command |
|--------|----------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | 90 days | Supabase Dashboard → Settings → API → Rotate |
| `API_SECRET` | 90 days | `openssl rand -hex 32` → update env var |
| `JWT_SECRET` | 90 days | `openssl rand -hex 32` → update env var |
| `STRIPE_SECRET_KEY` | 180 days | Stripe Dashboard → Developers → API Keys → Rotate |
| Tenant API keys | As needed | `tenantscale revoke-api-key <key-id>` then recreate |

### 5. Audit Key Usage

Regularly review API key usage:

```bash
# List all tenants and their API key counts
tenantscale list-tenants --json | jq '.[] | {name, apiKeyCount}'

# Check for unused keys (older than 90 days)
# (Use the audit logs or SDK to check last_used_at)
```

### 6. Set Up Rate Limiting

Ensure rate limiting is configured before going live:

```bash
# IP-based limits
RATE_LIMIT_IP_MAX_PER_MINUTE=60    # Max requests per minute per IP
RATE_LIMIT_IP_MAX_PER_HOUR=1000    # Max requests per hour per IP

# API key limits
RATE_LIMIT_DEFAULT_DAILY=10000     # Default daily limit per API key

# Burst protection
RATE_LIMIT_BURST_MAX=50            # Max requests per second
```

For high-traffic deployments, use Redis as the rate limit backend:

```bash
RATE_LIMIT_STORAGE=redis
REDIS_URL=redis://:password@redis.example.com:6379
```

## ⚡ Performance

### 7. Configure Rate Limiting for Your Scale

| Traffic Level | Storage | Daily Limit | IP/Minute | Redis |
|---------------|---------|-------------|-----------|-------|
| Low (< 10K req/day) | Supabase | 10,000 | 100 | Not needed |
| Medium (< 100K req/day) | Supabase | 50,000 | 60 | Optional |
| High (< 1M req/day) | Redis | 100,000 | 30 | ✅ Required |
| Very High (1M+ req/day) | Redis | Custom | Custom | ✅ Required |

### 8. Use Redis for Rate Limiting (High Traffic)

Redis provides sub-millisecond read/write performance for rate limit counters, compared to Supabase's ~10-50ms per query.

```bash
RATE_LIMIT_STORAGE=redis
REDIS_URL=redis://:password@redis.example.com:6379
REDIS_PREFIX=ts-rl:
```

### 9. Optimize Database Indexes

Ensure all required indexes are created (the `init` migration creates them automatically):

```sql
-- Verify indexes exist
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('tenants', 'api_keys', 'audit_logs')
ORDER BY tablename, indexname;
```

Key indexes to verify:

| Table | Index | Purpose |
|-------|-------|---------|
| `api_keys` | `idx_api_keys_key_hash` | Fast API key authentication |
| `api_keys` | `idx_api_keys_tenant_id` | Tenant key listing |
| `audit_logs` | `idx_audit_logs_created` | Efficient purge operations |
| `tenants` | `idx_tenants_slug` | URL-based tenant lookup |

### 10. Configure Database Connection Pooling

For serverless deployments (Vercel), use PgBouncer to manage connection limits:

```bash
# Supabase PgBouncer connection string
DATABASE_URL=postgres://user:password@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true

# Conservative pool size for serverless
DB_POOL_SIZE=5

# Standard deployment pool size
DB_POOL_SIZE=25
```

## 📊 Monitoring

### 11. Health Endpoint

TenantScale provides a health check endpoint at `/health`:

```bash
curl https://api.tenantscale.com/health
```

Response:

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

Set up external monitoring to call this endpoint every 1-5 minutes:

```bash
# Using UptimeRobot, Better Uptime, or Pingdom
# URL: https://api.tenantscale.com/health
# Interval: 5 minutes
# Alert: If 3 consecutive checks fail
```

### 12. Enable Metrics (Prometheus)

Enable the Prometheus metrics endpoint for detailed monitoring:

```bash
ENABLE_METRICS=true
```

Available metrics:

```
tenantscale_requests_total{method, path, status}
tenantscale_request_duration_ms{method, path}
tenantscale_rate_limit_hits_total{type}
tenantscale_api_keys_total{status}
tenantscale_tenants_total{plan}
tenantscale_webhook_deliveries_total{status}
tenantscale_audit_logs_total
tenantscale_db_pool_active
tenantscale_db_pool_waiting
```

### 13. Structured Logging

Configure structured JSON logging for log aggregation:

```bash
LOG_LEVEL=info
LOG_FORMAT=json
```

Example log entry:

```json
{
  "level": "info",
  "timestamp": "2025-06-15T12:00:00.000Z",
  "method": "GET",
  "path": "/api/me",
  "status": 200,
  "duration": 45,
  "tenantId": "tnt_abc123",
  "requestId": "req_xyz789"
}
```

### 14. Set Up External Monitoring

| Tool | Purpose | Configuration |
|------|---------|---------------|
| [Sentry](https://sentry.io) | Error tracking | `SENTRY_DSN` env var |
| [Datadog](https://datadoghq.com) | APM and metrics | `DD_API_KEY` env var |
| [Better Stack](https://betterstack.com) | Uptime monitoring | Health endpoint URL |
| [PagerDuty](https://pagerduty.com) | Alerting | Integrate with monitoring tools |
| [Grafana](https://grafana.com) | Dashboards | Prometheus data source |

## 🔒 Reliability

### 15. Database Backups

Supabase handles automated backups:

| Tier | Backup Frequency | Retention |
|------|-----------------|-----------|
| Free | Daily | 7 days |
| Pro | Daily | 7 days |
| Team | Daily | 14 days |
| Enterprise | Custom | Custom |

Verify backups are working:

```bash
# Supabase Dashboard → Database → Backups
# Check last successful backup timestamp
```

For additional safety, set up pg_dump exports to external storage:

```bash
# Example: Daily backup to S3
0 2 * * * pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://backups/tenantscale/$(date +%Y-%m-%d).sql.gz
```

### 16. Idempotency for Payment Operations

Stripe operations are idempotent by default when using the `Idempotency-Key` header. TenantScale's API supports idempotency on `POST` and `PUT` endpoints.

```typescript
// The API handles idempotency automatically
// Retry-safe request:
fetch('/v1/tenants/tnt_abc/checkout', {
  method: 'POST',
  headers: {
    'Idempotency-Key': 'unique-key-123',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ priceId: 'price_pro' }),
});
```

### 17. Graceful Degradation

Configure fallback behavior when external services are unavailable:

```typescript
// Fallback: If Stripe is down, allow access based on cached plan data
async function checkPlanLimit(tenantId: string, metric: string) {
  try {
    // Primary: check against Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(tenantId);
    return parsePlanFromSubscription(subscription);
  } catch (error) {
    // Fallback: use cached plan data from Supabase
    const tenant = await db.getTenant(tenantId);
    return tenant.plan;
  }
}
```

| Service Outage | Behavior | User Impact |
|----------------|----------|-------------|
| Stripe API | Use cached plan data, queue webhooks | None (temporary) |
| Redis | Fall back to Supabase rate limiting | Slightly slower rate checks |
| Database | Return 503 temporarily | Cannot serve requests |
| Supabase | Cannot serve any requests | Critical |

## Scaling Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Daily API requests | 100,000 | Add Redis for rate limiting |
| Daily API requests | 1,000,000 | Scale database, add read replicas |
| Concurrent tenants | 1,000 | Review indexing, add connection pooling |
| Concurrent tenants | 10,000 | Consider dedicated database |
| Webhook deliveries/hour | 10,000 | Increase `WEBHOOK_CONCURRENCY` |
| Audit log entries | 10,000,000 | Implement partitioning or archival |
| Database size | 80% of plan limit | Upgrade Supabase tier |
| Request latency p99 | > 500ms | Profile and optimize slow queries |
| Error rate | > 1% | Investigate and fix errors |

## Pre-Launch Checklist (15 Items)

### Database
- [ ] **Supabase project created** with appropriate tier (Free/Pro/Team)
- [ ] **Migrations run** — all tables exist with correct schema
- [ ] **Default plans seeded** (Free, Pro, Enterprise)
- [ ] **Database indexes verified** — query performance is adequate
- [ ] **Backups configured** — automated daily backups active

### Environment
- [ ] **All required vars set** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `API_SECRET`, `JWT_SECRET`
- [ ] **Stripe keys configured** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] **Rate limiting configured** — appropriate limits for expected traffic
- [ ] **`NODE_ENV=production`** — production mode enabled

### Deployment
- [ ] **Health endpoint returns 200** — `curl /health`
- [ ] **Custom domain configured** with valid SSL certificate
- [ ] **CORS restricted** to production application domain
- [ ] **Stripe webhook registered** and verified — test event received

### Monitoring
- [ ] **Error monitoring active** (Sentry or equivalent configured)
- [ ] **Uptime monitoring active** — health endpoint checked every 5 minutes
- [ ] **Logs accessible** — able to stream and search production logs

### Final Verification

```bash
# 1. Health check
curl https://api.tenantscale.com/health | jq .
# → {"status":"ok"}

# 2. Create a test tenant
tenantscale create-tenant --name "Pre-Launch Test" --plan free

# 3. Create an API key
tenantscale create-api-key tnt_prelaunch --name "Test Key" --json

# 4. Make an authenticated request
curl -H "Authorization: Bearer tsk_live_..." https://api.tenantscale.com/v1/me
# → {"tenant": {...}}

# 5. Verify Stripe sync
tenantscale stripe:sync --dry-run
# → "Plans to sync: 3"

# 6. Check CORS
curl -H "Origin: https://app.example.com" -I https://api.tenantscale.com/health
# → Access-Control-Allow-Origin: https://app.example.com

# 7. Check rate limit headers
curl -I https://api.tenantscale.com/v1/me -H "Authorization: Bearer tsk_live_..."
# → X-RateLimit-Remaining: 9999
```

## Emergency Response Plan

### If You Get a 5xx Error Spike

1. Check the health endpoint: `curl /health`
2. Stream recent logs: `vercel logs --prod --limit 100`
3. Check database status: Supabase Dashboard → Database → Performance
4. Check Stripe status: [status.stripe.com](https://status.stripe.com)
5. If database is slow, check for slow queries: Supabase Dashboard → Database → Query Performance

### If Rate Limits Are Hit Unexpectedly

1. Check `RATE_LIMIT_DEFAULT_DAILY` is appropriate
2. Check for runaway API calls in audit logs
3. Temporarily increase limits if needed
4. Investigate the calling client

### If a Tenant Reports Billing Issues

1. Check Stripe Dashboard for subscription status
2. Check webhook delivery logs
3. Manually trigger webhook: Stripe Dashboard → Webhooks → Send test webhook
4. Verify `STRIPE_WEBHOOK_SECRET` is correct

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
