# CLI Configuration

The TenantScale CLI can be configured via a config file, environment variables, or a combination of both. Configuration is resolved in a specific order, with more specific settings taking precedence.

## Configuration Resolution Order

The CLI resolves configuration in the following order (later sources override earlier ones):

1. **Default values** — Built-in defaults
2. **`.env` file** — Key-value pairs from `.env` in the current directory
3. **`.tenantscalerc` config file** — JSON or YAML in the project root (or parent directories)
4. **Environment variables** — System environment variables (highest priority)
5. **Command-line flags** — `--config`, `--env`, and other flags

## Config File (`.tenantscalerc`)

Create a `.tenantscalerc` file in your project root. Supported formats: JSON, YAML, and YAML with `.yml` or `.yaml` extension.

### JSON Format (`.tenantscalerc`)

```json
{
  "supabase": {
    "url": "https://your-project.supabase.co",
    "serviceKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "migrations": {
    "directory": "./db/migrations",
    "table": "_migrations"
  },
  "stripe": {
    "secretKey": "sk_live_...",
    "webhookSecret": "whsec_...",
    "currency": "usd"
  },
  "audit": {
    "retentionDays": 90
  },
  "rateLimit": {
    "storage": "supabase",
    "defaultDaily": 10000,
    "ipMaxPerMinute": 100
  }
}
```

### YAML Format (`.tenantscalerc.yaml` or `.tenantscalerc.yml`)

```yaml
supabase:
  url: https://your-project.supabase.co
  serviceKey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

migrations:
  directory: ./db/migrations
  table: _migrations

stripe:
  secretKey: sk_live_...
  webhookSecret: whsec_...
  currency: usd

audit:
  retentionDays: 90

rateLimit:
  storage: supabase
  defaultDaily: 10000
  ipMaxPerMinute: 100
```

### Config File Discovery

The CLI searches for `.tenantscalerc` starting from the current working directory and walking up through parent directories:

```
/project/
├── src/
├── .tenantscalerc   ← Found here (current dir)
└── package.json

/home/user/
└── projects/
    └── my-app/
        ├── .tenantscalerc   ← Or found here (walking up)
        └── package.json
```

### Specifying a Custom Path

Use the `--config` flag to specify an explicit path:

```bash
tenantscale init --config ./config/tenantscale.json
tenantscale list-tenants --config /etc/tenantscale/config.yaml
```

## Environment Variables

All configuration values can be set via environment variables. This is the recommended approach for production deployments and CI/CD.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TENANTSCALE_API_URL` | TenantScale API base URL | `https://api.tenantscale.com` |
| `TENANTSCALE_API_KEY` | Master API key for API access | `tsk_live_abc123...` |
| `SUPABASE_URL` | Supabase project URL | `https://xyzproject.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIs...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_ANON_KEY` | — | Supabase anon key (for RLS-enabled operations) |
| `DATABASE_URL` | — | Direct PostgreSQL connection string (overrides Supabase config) |
| `STRIPE_SECRET_KEY` | — | Stripe secret key (required for `stripe:sync`) |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| `STRIPE_CURRENCY` | `usd` | Default currency for stripe:sync |
| `MIGRATIONS_DIR` | `./migrations` | Custom migrations directory |
| `AUDIT_RETENTION_DAYS` | `90` | Default audit log retention period |
| `RATE_LIMIT_STORAGE` | `supabase` | Rate limit storage backend |
| `RATE_LIMIT_DEFAULT_DAILY` | `10000` | Default daily API key limit |
| `RATE_LIMIT_IP_MAX_PER_MINUTE` | `100` | Max requests per minute per IP |
| `LOG_LEVEL` | `info` | Logging level: debug, info, warn, error |
| `NODE_ENV` | `development` | Environment name |

### Naming Convention

Environment variables use `UPPER_SNAKE_CASE` with underscores separating words. Config file keys use `camelCase`.

| Config Key | Environment Variable |
|------------|---------------------|
| `supabase.url` | `SUPABASE_URL` |
| `supabase.serviceKey` | `SUPABASE_SERVICE_KEY` |
| `migrations.directory` | `MIGRATIONS_DIR` |
| `audit.retentionDays` | `AUDIT_RETENTION_DAYS` |
| `rateLimit.defaultDaily` | `RATE_LIMIT_DEFAULT_DAILY` |

## `.env` File Loading

The CLI automatically loads a `.env` file from the current working directory if present. This allows you to keep configuration in a local file without modifying your shell profile.

### Example `.env`

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (for stripe:sync)
STRIPE_SECRET_KEY=sk_live_abc123def456
STRIPE_WEBHOOK_SECRET=whsec_abc123def456
STRIPE_CURRENCY=usd

# Configuration
AUDIT_RETENTION_DAYS=90
RATE_LIMIT_DEFAULT_DAILY=10000
LOG_LEVEL=info
```

### Custom `.env` Path

Use the `--env` flag to load a different env file:

```bash
tenantscale migrate up --env .env.production
tenantscale stripe:sync --env ./config/stripe.env
```

### `.env` File Precedence

If both `.env` and environment variables are set, the **environment variables take precedence** (higher priority in the resolution order).

## Complete Configuration Example

### Using Config File + `.env`

`.tenantscalerc.yaml`:
```yaml
supabase:
  url: https://your-project.supabase.co
  serviceKey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

migrations:
  directory: ./db/migrations
```

`.env`:
```bash
AUDIT_RETENTION_DAYS=90
LOG_LEVEL=debug
```

Then override for production:
```bash
export LOG_LEVEL=info
tenantscale audit:purge
```

### Using Only Environment Variables

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export AUDIT_RETENTION_DAYS=90

tenantscale init
```

### Using Only Command-Line Config

```bash
tenantscale \
  --config ./tenantscale.json \
  --env .env.production \
  init --force
```

## Configuration Validation

The CLI validates configuration before running commands. Common issues:

| Issue | Error Message | Fix |
|-------|---------------|-----|
| Missing Supabase URL | `SUPABASE_URL is required` | Set env var or add to config file |
| Missing Service Key | `SUPABASE_SERVICE_KEY is required` | Set env var or add to config file |
| Invalid URL format | `Invalid SUPABASE_URL format` | Must be a valid HTTPS URL |
| File not found | `Config file not found: ...` | Check the path or use defaults |
| Invalid JSON/YAML | `Failed to parse config file` | Check syntax with a linter |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/cli](https://github.com/TenantScale/sdk/tree/main/packages/cli)
