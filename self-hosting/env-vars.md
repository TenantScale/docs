# Environment Variables

Reference table for all environment variables used by the TenantScale API and SDK. These can be set in `.env` files, system environment variables, or your deployment platform's configuration UI.

## Required Variables

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `SUPABASE_URL` | Your Supabase project URL (e.g., `https://xyzproject.supabase.co`) | — | API, SDK, CLI |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — this bypasses RLS, **keep secret** | — | API, SDK, CLI |
| `SUPABASE_ANON_KEY` | Supabase anon/public key — safe for client-side usage | — | API, Client SDK |
| `API_SECRET` | Master API secret used for internal HMAC signing | — | API Server |
| `JWT_SECRET` | Secret for signing portal session tokens and JWTs | — | API Server |
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_live_...` or `sk_test_...`) | — | API Server (billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) | — | API Server (billing) |

## Database

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `SUPABASE_URL` | — | Supabase project URL (e.g., `https://xyzproject.supabase.co`) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key (secret — never expose to clients) | ✅ |
| `SUPABASE_ANON_KEY` | — | Anon key (public, used for client-side RLS) | ✅ |
| `DATABASE_URL` | — | Direct PostgreSQL connection string (overrides Supabase config for migrations) | ❌ |
| `DB_POOL_SIZE` | `20` | Database connection pool size | ❌ |
| `DB_SSL` | `true` | Use SSL for database connections | ❌ |
| `DB_MAX_RETRIES` | `3` | Max connection retries on failure | ❌ |

## Authentication

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `API_SECRET` | — | Master API secret for internal HMAC signing | ✅ |
| `JWT_SECRET` | — | Secret for signing portal session tokens | ✅ |
| `JWT_EXPIRES_IN` | `3600` | Portal session token expiry in seconds (1 hour) | ❌ |
| `JWT_ISSUER` | `tenantscale` | JWT issuer claim | ❌ |
| `PORTAL_SESSION_COOKIE_NAME` | `ts_portal_session` | Cookie name for portal session | ❌ |

## API Server

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `PORT` | `3000` | HTTP server port | ❌ |
| `HOST` | `0.0.0.0` | HTTP server host address | ❌ |
| `NODE_ENV` | `development` | Environment: `development`, `production`, `test` | ❌ |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` | ❌ |
| `LOG_FORMAT` | `json` | Log output format: `json`, `pretty`, `silent` | ❌ |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (comma-separated for multiple) | ❌ |
| `TRUST_PROXY` | `false` | Trust proxy headers (set to `true` behind reverse proxy like Nginx, Vercel) | ❌ |
| `BODY_LIMIT` | `1mb` | Maximum request body size | ❌ |
| `REQUEST_TIMEOUT` | `30000` | Request timeout in milliseconds | ❌ |

## Rate Limiting

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `RATE_LIMIT_STORAGE` | `supabase` | Storage backend: `supabase`, `redis`, or `memory` | ❌ |
| `REDIS_URL` | — | Redis connection string (e.g., `redis://localhost:6379`) | Required if using Redis |
| `REDIS_PREFIX` | `ts-rl:` | Key prefix for Redis rate limit entries | ❌ |
| `REDIS_TLS` | `false` | Enable TLS for Redis connections | ❌ |
| `RATE_LIMIT_DEFAULT_DAILY` | `10000` | Default daily request limit per API key | ❌ |
| `RATE_LIMIT_IP_MAX_PER_MINUTE` | `100` | Max requests per minute per IP address | ❌ |
| `RATE_LIMIT_IP_MAX_PER_HOUR` | `1000` | Max requests per hour per IP address | ❌ |
| `RATE_LIMIT_BURST_MAX` | `50` | Max burst requests per second | ❌ |
| `RATE_LIMIT_CLEANUP_INTERVAL` | `60000` | Stale entry cleanup interval in ms | ❌ |

## Webhooks

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `WEBHOOK_MAX_RETRIES` | `8` | Maximum delivery attempts (exponential backoff) | ❌ |
| `WEBHOOK_TIMEOUT_MS` | `10000` | Timeout for each delivery request in ms | ❌ |
| `WEBHOOK_CONCURRENCY` | `3` | Concurrent webhook delivery workers | ❌ |
| `WEBHOOK_RETRY_BASE_DELAY` | `1000` | Base retry delay in ms (doubles each attempt) | ❌ |
| `WEBHOOK_MAX_BODY_SIZE` | `65536` | Max webhook payload size in bytes | ❌ |
| `WEBHOOK_QUEUE_TYPE` | `in-memory` | Queue backend: `in-memory` or `bull` | ❌ |

## Audit Logging

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `AUDIT_RETENTION_DAYS` | `90` | Default audit log retention period in days | ❌ |
| `AUDIT_PURGE_SCHEDULE` | `0 3 * * *` | Cron schedule for auto-purge (cron syntax) | ❌ |
| `AUDIT_BATCH_SIZE` | `1000` | Entries to purge per batch | ❌ |
| `AUDIT_ENABLED` | `true` | Enable or disable audit logging globally | ❌ |

## Stripe (Billing)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `STRIPE_SECRET_KEY` | — | Stripe API secret key (`sk_live_...` or `sk_test_...`) | ✅ (for billing) |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret (`whsec_...`) | ✅ (for webhooks) |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key (`pk_live_...`) — for client-side | ❌ |
| `STRIPE_PRICE_PREFIX` | `ts` | Prefix for auto-generated Stripe price IDs | ❌ |
| `STRIPE_CURRENCY` | `usd` | Default currency for plan sync | ❌ |
| `STRIPE_TRIAL_PERIOD_DAYS` | `0` | Default trial period in days for new subscriptions | ❌ |
| `STRIPE_API_VERSION` | `2023-10-16` | Stripe API version | ❌ |
| `STRIPE_MAX_RETRIES` | `3` | Max retries for Stripe API calls | ❌ |
| `STRIPE_CONNECT_ENABLED` | `false` | Enable Stripe Connect for platform billing | ❌ |

## Vercel-Specific

| Variable | Description | Auto-Set |
|----------|-------------|----------|
| `VERCEL_URL` | Deployment URL (e.g., `my-app.vercel.app`) | ✅ |
| `VERCEL_ENV` | Environment: `production`, `preview`, `development` | ✅ |
| `VERCEL_REGION` | Server region (e.g., `iad1`) | ✅ |
| `VERCEL_PROJECT_ID` | Vercel project ID | ❌ |

## Optional Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_METRICS` | `false` | Enable Prometheus metrics endpoint at `/metrics` |
| `ENABLE_SWAGGER` | `true` (dev) | Enable Swagger/OpenAPI docs at `/docs` |
| `ENABLE_PLAYGROUND` | `true` (dev) | Enable API playground at `/playground` |
| `ENABLE_HEALTH_CHECK` | `true` | Enable health check endpoint at `/health` |
| `ENABLE_REQUEST_LOGGING` | `true` | Log all HTTP requests |

## Example `.env` File

```bash
# ─── Required ──────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
API_SECRET=your-api-secret-min-32-chars-long
JWT_SECRET=your-jwt-secret-min-32-chars-long

# ─── Stripe (Billing) ──────────────────────────────────
STRIPE_SECRET_KEY=sk_live_abc123def456
STRIPE_WEBHOOK_SECRET=whsec_abc123def456
STRIPE_PUBLISHABLE_KEY=pk_live_abc123def456

# ─── API Server ────────────────────────────────────────
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://app.example.com
TRUST_PROXY=true

# ─── Rate Limiting ─────────────────────────────────────
RATE_LIMIT_STORAGE=redis
REDIS_URL=redis://:password@redis.example.com:6379
RATE_LIMIT_DEFAULT_DAILY=50000
RATE_LIMIT_IP_MAX_PER_MINUTE=60

# ─── Database ──────────────────────────────────────────
DB_POOL_SIZE=25
DB_SSL=true

# ─── Webhooks ──────────────────────────────────────────
WEBHOOK_MAX_RETRIES=5
WEBHOOK_TIMEOUT_MS=15000

# ─── Audit ─────────────────────────────────────────────
AUDIT_RETENTION_DAYS=90
AUDIT_ENABLED=true

# ─── Optional ──────────────────────────────────────────
ENABLE_METRICS=true
ENABLE_SWAGGER=false
```

## Security Best Practices

### Secrets That Must Be Strong

| Variable | Minimum Length | Recommended Generation |
|----------|---------------|----------------------|
| `API_SECRET` | 32 characters | `openssl rand -hex 32` |
| `JWT_SECRET` | 32 characters | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | — | Generated by Stripe Dashboard |

### Never Commit Secrets

Add `.env` to your `.gitignore`:

```bash
# .gitignore
.env
.env.*
!.env.example
```

### Production Secrets Management

| Platform | Recommended Approach |
|----------|---------------------|
| Vercel | Vercel Environment Variables (Project Settings → Environment Variables) |
| Docker | `.env.production` file (not committed) or Docker secrets |
| AWS ECS | AWS Secrets Manager or Parameter Store |
| Kubernetes | Kubernetes Secrets |
| Render / Railway | Built-in environment variable UI |

### Rotation Schedule

| Secret | Rotation Interval |
|--------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Every 90 days |
| `API_SECRET` | Every 90 days |
| `JWT_SECRET` | Every 90 days |
| `STRIPE_SECRET_KEY` | Every 180 days |
| `STRIPE_WEBHOOK_SECRET` | Every 180 days |

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
