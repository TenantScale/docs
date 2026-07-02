# Supabase Setup

Supabase provides the database backend for TenantScale. This guide walks through creating a Supabase project, running migrations, understanding the schema, and configuring Row-Level Security (RLS).

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **New project**
3. Choose a name (e.g., "TenantScale Production")
4. Set a **strong database password** (save this securely — you'll need it for direct connections)
5. Choose a **region** close to your users and API server
6. Click **Create project** and wait 1-2 minutes for provisioning

![Screenshot of the Supabase new project form in the Supabase dashboard](https://supabase.com/docs/_next/image?url=%2Fdocs%2Fimg%2Fguides%2Fgetting-started%2Fcreate-project.png&w=1200&q=75)

### Pricing Considerations

| Tier | Monthly Cost | Database Size | Best For |
|------|-------------|---------------|----------|
| Free | $0 | 500 MB | Development, small projects |
| Pro | $25 | 8 GB | Production (recommended minimum) |
| Team | $599 | 16 GB | High-traffic production |
| Enterprise | Custom | Custom | Large-scale deployments |

## 2. Run Migrations

### Via CLI (Recommended)

The TenantScale CLI handles migrations automatically:

```bash
# Install the CLI
npm install -g @tenantscale/cli

# Set up environment
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Run migrations
tenantscale init
```

This creates all required tables, indexes, and seeds default plans.

### Via SQL Editor

You can also run migrations directly from the Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Create a new query
4. Paste the migration SQL from [github.com/TenantScale/sdk/blob/main/packages/cli/migrations](https://github.com/TenantScale/sdk/tree/main/packages/cli/migrations)
5. Click **Run**

### Migration Status

```bash
# Check which migrations have been applied
tenantscale migrate status
```

## 3. Database Schema

TenantScale uses 8 core tables. Below is the complete schema.

### `tenants`

Stores multi-tenant accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `name` | `text` | `NOT NULL` | Tenant display name |
| `slug` | `text` | `UNIQUE`, `NOT NULL` | URL-friendly identifier |
| `plan_id` | `text` | `NOT NULL`, `FK → plans.id` | Current plan |
| `stripe_customer_id` | `text` | `UNIQUE` | Stripe customer reference |
| `metadata` | `jsonb` | `DEFAULT '{}'` | Custom metadata |
| `is_active` | `boolean` | `DEFAULT true` | Soft delete flag |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

**Indexes:**
- `idx_tenants_slug` on `slug`
- `idx_tenants_plan_id` on `plan_id`
- `idx_tenants_stripe_customer` on `stripe_customer_id`

### `api_keys`

API keys for tenant authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `tenant_id` | `uuid` | `NOT NULL`, `FK → tenants.id` | Owning tenant |
| `name` | `text` | `NOT NULL` | Human-readable name |
| `key_hash` | `text` | `UNIQUE`, `NOT NULL` | SHA-256 hash of the API key |
| `prefix` | `text` | `NOT NULL` | First 8 chars of the key (for identification) |
| `scopes` | `jsonb` | `DEFAULT '["*"]'` | Permitted scopes |
| `expires_at` | `timestamptz` | — | Key expiration (null = never) |
| `revoked_at` | `timestamptz` | — | Revocation timestamp (null = active) |
| `revoked_reason` | `text` | — | Reason for revocation |
| `last_used_at` | `timestamptz` | — | Last authentication timestamp |
| `metadata` | `jsonb` | `DEFAULT '{}'` | Custom metadata |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

**Indexes:**
- `idx_api_keys_tenant_id` on `tenant_id`
- `idx_api_keys_key_hash` on `key_hash` (for fast lookup)
- `idx_api_keys_active` on `(revoked_at, expires_at)` (partial index for active keys)

### `plans`

Subscription plan definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | `PK` | Plan ID (e.g., `free`, `pro`, `enterprise`) |
| `name` | `text` | `NOT NULL` | Display name |
| `description` | `text` | — | Plan description |
| `price` | `integer` | `NOT NULL`, `DEFAULT 0` | Price in cents (0 = free) |
| `currency` | `text` | `DEFAULT 'usd'` | ISO 4217 currency code |
| `interval` | `text` | `DEFAULT 'month'` | Billing interval: `month` or `year` |
| `features` | `jsonb` | `DEFAULT '[]'` | Feature flags (array of strings) |
| `limits` | `jsonb` | `DEFAULT '{}'` | Rate/usage limits (object with metric → max) |
| `stripe_price_id` | `text` | — | Linked Stripe price ID |
| `stripe_product_id` | `text` | — | Linked Stripe product ID |
| `is_public` | `boolean` | `DEFAULT true` | Visible in plan listings |
| `sort_order` | `integer` | `DEFAULT 0` | Display ordering |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

### `audit_logs`

Immutable audit trail for tenant operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `tenant_id` | `uuid` | `NOT NULL`, `FK → tenants.id` | Tenant that performed the action |
| `actor_type` | `text` | `NOT NULL` | Actor type: `api_key`, `admin`, `system` |
| `actor_id` | `text` | — | ID of the actor |
| `action` | `text` | `NOT NULL` | Action performed (e.g., `api_key.created`) |
| `resource_type` | `text` | — | Type of resource affected |
| `resource_id` | `text` | — | ID of resource affected |
| `details` | `jsonb` | `DEFAULT '{}'` | Action-specific details |
| `ip_address` | `inet` | — | Request IP address |
| `user_agent` | `text` | — | Request user agent |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

**Indexes:**
- `idx_audit_logs_tenant` on `tenant_id`
- `idx_audit_logs_action` on `action`
- `idx_audit_logs_created` on `created_at` (for purging)
- `idx_audit_logs_tenant_action` on `(tenant_id, action)` (composite)

### `webhooks`

Webhook endpoint registrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `tenant_id` | `uuid` | `NOT NULL`, `FK → tenants.id` | Owning tenant |
| `url` | `text` | `NOT NULL` | Webhook destination URL |
| `events` | `jsonb` | `NOT NULL` | Subscribed event types |
| `secret` | `text` | `NOT NULL` | HMAC signing secret |
| `is_active` | `boolean` | `DEFAULT true` | Enable/disable |
| `retry_count` | `integer` | `DEFAULT 3` | Max retry attempts |
| `timeout_ms` | `integer` | `DEFAULT 10000` | Request timeout |
| `metadata` | `jsonb` | `DEFAULT '{}'` | Custom metadata |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

### `webhook_deliveries`

Delivery attempt records for webhooks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `webhook_id` | `uuid` | `NOT NULL`, `FK → webhooks.id` | Webhook definition |
| `event_type` | `text` | `NOT NULL` | Event type delivered |
| `payload` | `jsonb` | `NOT NULL` | Event payload |
| `status` | `text` | `NOT NULL` | `pending`, `delivered`, `failed` |
| `status_code` | `integer` | — | HTTP response status |
| `response_body` | `text` | — | Response body (truncated) |
| `attempt` | `integer` | `NOT NULL` | Attempt number (1-based) |
| `duration_ms` | `integer` | — | Response time |
| `error` | `text` | — | Error message if failed |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |

**Indexes:**
- `idx_webhook_deliveries_webhook` on `webhook_id`
- `idx_webhook_deliveries_status` on `status`

### `subscriptions`

Stripe subscription links.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `tenant_id` | `uuid` | `UNIQUE`, `NOT NULL`, `FK → tenants.id` | Owning tenant |
| `stripe_subscription_id` | `text` | `UNIQUE` | Stripe subscription ID |
| `stripe_customer_id` | `text` | `NOT NULL` | Stripe customer ID |
| `status` | `text` | `NOT NULL`, `DEFAULT 'incomplete'` | Subscription status |
| `current_period_start` | `timestamptz` | — | Current billing period start |
| `current_period_end` | `timestamptz` | — | Current billing period end |
| `cancel_at_period_end` | `boolean` | `DEFAULT false` | Scheduled cancellation |
| `trial_start` | `timestamptz` | — | Trial period start |
| `trial_end` | `timestamptz` | — | Trial period end |
| `metadata` | `jsonb` | `DEFAULT '{}'` | Custom metadata |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

### `rate_limits`

Rate limit counters (supports Supabase, Redis, and in-memory backends).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PK`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `key` | `text` | `UNIQUE`, `NOT NULL` | Rate limit key (e.g., `api_key:tsk_abc:day`) |
| `count` | `integer` | `NOT NULL`, `DEFAULT 0` | Current count |
| `max` | `integer` | `NOT NULL` | Maximum allowed count |
| `window_start` | `timestamptz` | `NOT NULL` | Window start timestamp |
| `window_end` | `timestamptz` | `NOT NULL` | Window end timestamp |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

**Indexes:**
- `idx_rate_limits_key` on `key`
- `idx_rate_limits_window` on `window_end`

## 4. Row-Level Security (RLS)

TenantScale uses Row-Level Security to ensure tenants can only access their own data. Run these commands in the Supabase SQL Editor after migrations:

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy: users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
  USING (id = auth.uid());

-- API keys: tenants can only see their own keys
CREATE POLICY api_key_isolation ON api_keys
  USING (tenant_id = auth.uid());

-- Audit logs: tenants see only their own logs
CREATE POLICY audit_log_isolation ON audit_logs
  USING (tenant_id = auth.uid());

-- Webhooks: tenants see only their own webhooks
CREATE POLICY webhook_isolation ON webhooks
  USING (tenant_id = auth.uid());

-- Rate limits: tenants see only their own limits
CREATE POLICY rate_limit_isolation ON rate_limits
  USING (key LIKE auth.uid() || ':%');
```

**Important:** RLS policies work with the Supabase anon key (`SUPABASE_ANON_KEY`). Service role requests (`SUPABASE_SERVICE_ROLE_KEY`) bypass RLS.

## 5. Seeding Default Plans

Run this SQL in the Supabase SQL Editor to seed the default plans:

```sql
INSERT INTO plans (id, name, description, price, currency, interval, features, limits, sort_order)
VALUES
  ('free', 'Free', 'For small projects and testing', 0, 'usd', 'month',
    '["basic-auth", "api-access"]',
    '{"api-requests": 10000, "team-members": 2}',
    1),
  ('pro', 'Pro', 'For growing businesses', 2900, 'usd', 'month',
    '["basic-auth", "api-access", "audit-log", "webhooks", "analytics", "custom-domain"]',
    '{"api-requests": 50000, "team-members": 10, "webhooks": 5}',
    2),
  ('enterprise', 'Enterprise', 'For large-scale deployments', 9900, 'usd', 'month',
    '["basic-auth", "api-access", "audit-log", "webhooks", "analytics", "custom-domain", "sso", "dedicated-support", "advanced-audit"]',
    '{"api-requests": -1, "team-members": -1, "webhooks": 50}',
    3)
ON CONFLICT (id) DO NOTHING;
```

Or use the CLI:

```bash
tenantscale init --skip-seed  # Run migrations without seeds
# Then seed manually:
tenantscale init --force --skip-seed  # If you need to re-seed later
```

## 6. Getting API Keys from the Supabase Dashboard

After creating your Supabase project, navigate to the dashboard:

1. Go to **Project Settings** → **API**
2. You'll find three key values:

| Key | Location | Usage |
|-----|----------|-------|
| **Project URL** | Settings → API → Project URL | Set as `SUPABASE_URL` |
| **anon public** | Settings → API → anon public | Set as `SUPABASE_ANON_KEY` (safe for client-side) |
| **service_role** | Settings → API → service_role | Set as `SUPABASE_SERVICE_ROLE_KEY` (keep secret!) |

![Screenshot of the Supabase API keys in the project settings](https://supabase.com/docs/_next/image?url=%2Fdocs%2Fimg%2Fguides%2Fgetting-started%2Fcreate-project.png&w=1200&q=75)

### Security Warnings

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to clients — it bypasses RLS
- **Never commit** API keys to version control
- **Rotate keys** immediately if compromised (Settings → API → Rotate)

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
