# CLI Commands

Full reference for all TenantScale CLI commands, including options, flags, and examples.

## Global Options

These options work with every command:

| Option | Alias | Type | Description |
|--------|-------|------|-------------|
| `--config` | `-c` | string | Path to config file (default: finds `.tenantscalerc` automatically) |
| `--env` | `-e` | string | Path to `.env` file (default: `.env` in current directory) |
| `--json` | `-j` | boolean | Output raw JSON instead of formatted tables |
| `--help` | `-h` | boolean | Show help for the command |
| `--version` | `-V` | boolean | Show CLI version |

---

## `tenantscale init`

Initialize TenantScale in your project. This creates the required database tables in your Supabase project.

```bash
tenantscale init
```

The `init` command:
1. Connects to your Supabase database (using config or env vars)
2. Runs the initial migration to create all TenantScale tables
3. Seeds default plans (Free, Pro, Enterprise)

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--force` | `-f` | `false` | Drop and recreate tables if they exist |
| `--skip-seed` | — | `false` | Skip seeding default plans |
| `--migrations-dir` | — | `./migrations` | Custom migrations directory |

### Examples

```bash
# Standard initialization
tenantscale init

# Force re-initialization (drops existing tables)
tenantscale init --force

# Initialize without seeding default plans
tenantscale init --skip-seed

# Use a custom config file
tenantscale init --config ./config/tenantscale.json
```

---

## `tenantscale migrate`

Run or roll back database migrations.

```bash
tenantscale migrate [command]
```

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `up` | Apply pending migrations |
| `down` | Roll back the last batch of migrations |
| `status` | Show migration status (applied vs pending) |
| `create` | Create a new migration file |
| `dry-run` | Show what would be run without applying |

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--steps` | `-n` | `all` | Number of migrations to apply/roll back |
| `--migrations-dir` | — | `./migrations` | Custom migrations directory |
| `--table` | — | `_migrations` | Name of migration tracking table |

### Examples

```bash
# Apply all pending migrations
tenantscale migrate up

# Apply only the next 2 migrations
tenantscale migrate up --steps 2

# Roll back the last migration
tenantscale migrate down

# Roll back 3 migrations
tenantscale migrate down --steps 3

# Show migration status
tenantscale migrate status

# Preview what would run
tenantscale migrate dry-run

# Create a new migration
tenantscale migrate create add_custom_field
```

---

## `tenantscale create-tenant`

Create a new tenant in your database.

```bash
tenantscale create-tenant --name "Acme Corp"
```

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--name` | `-n` | — | **(Required)** Tenant name |
| `--slug` | `-s` | auto-generated | URL-friendly slug |
| `--plan` | `-p` | `free` | Plan ID (e.g., `free`, `pro`, `enterprise`) |
| `--metadata` | `-m` | — | JSON string with custom metadata |
| `--json` | `-j` | `false` | Output as JSON |

### Examples

```bash
# Create a basic tenant
tenantscale create-tenant --name "Acme Corp"

# Create with a specific plan and slug
tenantscale create-tenant \
  --name "Globex Inc" \
  --slug globex-inc \
  --plan pro

# Create with metadata
tenantscale create-tenant \
  --name "Initech" \
  --metadata '{"industry":"finance","tier":"gold"}'

# JSON output for scripting
tenantscale create-tenant --name "Scripted Co" --json
```

### JSON Output

```json
{
  "id": "tnt_abc123",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "planId": "pro",
  "createdAt": "2025-06-15T10:30:00Z",
  "apiKey": "tsk_live_xyz789..."
}
```

The `apiKey` field is only returned on creation — save it immediately.

---

## `tenantscale list-tenants`

List all tenants in your database.

```bash
tenantscale list-tenants
```

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--json` | `-j` | `false` | Output raw JSON array |
| `--plan` | `-p` | — | Filter by plan ID |
| `--search` | `-s` | — | Search by name or slug |
| `--limit` | `-l` | `50` | Maximum results |
| `--offset` | `-o` | `0` | Results offset |

### Examples

```bash
# List all tenants (table format)
tenantscale list-tenants

# Output as JSON
tenantscale list-tenants --json

# Filter by plan
tenantscale list-tenants --plan pro

# Search by name
tenantscale list-tenants --search "Acme"

# Limit results
tenantscale list-tenants --limit 10
```

### Table Output

```
┌────────────┬──────────────┬──────┬──────────────────────┬──────────────────────┐
│ ID         │ Name         │ Plan │ Created              │ API Keys             │
├────────────┼──────────────┼──────┼──────────────────────┼──────────────────────┤
│ tnt_abc123 │ Acme Corp    │ pro  │ 2025-06-15 10:30:00  │ 3                    │
│ tnt_def456 │ Globex Inc   │ free │ 2025-06-14 09:00:00  │ 1                    │
│ tnt_ghi789 │ Initech      │ ent  │ 2025-06-13 14:20:00  │ 5                    │
└────────────┴──────────────┴──────┴──────────────────────┴──────────────────────┘
```

### JSON Output

```json
[
  {
    "id": "tnt_abc123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "planId": "pro",
    "createdAt": "2025-06-15T10:30:00Z",
    "apiKeyCount": 3
  }
]
```

---

## `tenantscale get-tenant`

Get detailed information about a specific tenant.

```bash
tenantscale get-tenant <tenant-id>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<tenant-id>` | **(Required)** Tenant ID (e.g., `tnt_abc123`) |

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--json` | `-j` | Output as JSON |

### Examples

```bash
# Get tenant by ID
tenantscale get-tenant tnt_abc123

# JSON output
tenantscale get-tenant tnt_abc123 --json

# With pipe to jq
tenantscale get-tenant tnt_abc123 --json | jq '.plan'
```

### Output

```
Tenant: Acme Corp
────────────────────────────────────────────
  ID:          tnt_abc123
  Slug:        acme-corp
  Plan:        Pro (pro)
  Created:     2025-06-15 10:30:00 UTC
  Updated:     2025-06-15 10:30:00 UTC
  Features:
    • audit-log
    • custom-domain
    • analytics
  Limits:
    api-requests:    50000
    team-members:     10
  API Keys:          3 active
  Subscription:      active (stripe_sub_xyz)
  Metadata:
    industry: technology
```

---

## `tenantscale create-api-key`

Generate a new API key for a tenant.

```bash
tenantscale create-api-key <tenant-id> --name "My API Key"
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<tenant-id>` | **(Required)** Tenant ID to create the key for |

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--name` | `-n` | — | **(Required)** Human-readable name for the key |
| `--scopes` | `-s` | `*` | Comma-separated scopes (e.g., `read,write`) |
| `--expires` | `-e` | never | Expiration date (ISO 8601) |
| `--json` | `-j` | `false` | Output as JSON |

### Examples

```bash
# Create a key with all scopes
tenantscale create-api-key tnt_abc123 --name "Production Key"

# Create with specific scopes
tenantscale create-api-key tnt_abc123 \
  --name "Read-only Key" \
  --scopes "tenants:read,analytics:read"

# Create with expiration
tenantscale create-api-key tnt_abc123 \
  --name "Temporary Key" \
  --expires "2025-12-31T23:59:59Z"

# JSON output (to capture the key)
tenantscale create-api-key tnt_abc123 --name "CI Key" --json
```

### Output

```
API Key created successfully!
────────────────────────────────
  Name:      Production Key
  Key:       tsk_live_abc123def456... (shown only once)
  Prefix:    tsk_live_abc
  Scopes:    *
  Expires:   never
  Tenant:    Acme Corp (tnt_abc123)

⚠  Save this key now — it will not be shown again.
```

---

## `tenantscale revoke-api-key`

Revoke an existing API key. Once revoked, the key can no longer authenticate requests.

```bash
tenantscale revoke-api-key <key-id>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<key-id>` | **(Required)** API key ID to revoke |

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--reason` | `-r` | Reason for revocation (logged to audit) |
| `--json` | `-j` | Output as JSON |

### Examples

```bash
# Revoke a key
tenantscale revoke-api-key key_abc123

# Revoke with reason (for audit trail)
tenantscale revoke-api-key key_abc123 --reason "Compromised key - rotated"

# JSON output
tenantscale revoke-api-key key_abc123 --json
```

### Output

```
API Key revoked successfully
────────────────────────────
  Key ID:    key_abc123
  Name:      Production Key
  Revoked:   2025-06-15 11:00:00 UTC
  Reason:    Compromised key — rotated
```

---

## `tenantscale stripe:sync`

Sync your subscription plans to Stripe as products and prices. This creates or updates Stripe products for each plan in your database.

```bash
tenantscale stripe:sync
```

### What It Creates

For each plan (Free, Pro, Enterprise), the sync creates:

- A **Stripe Product** with the plan name and description
- A **Stripe Price** (recurring monthly) based on the plan's configured price

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--dry-run` | `-d` | `false` | Show what would be synced without making changes |
| `--currency` | `-c` | `usd` | Currency for prices |
| `--force` | `-f` | `false` | Update existing products even if unchanged |
| `--json` | `-j` | `false` | Output as JSON |

### Examples

```bash
# Preview what would be synced (safe to run)
tenantscale stripe:sync --dry-run

# Run the sync
tenantscale stripe:sync

# Sync with different currency
tenantscale stripe:sync --currency eur

# Force update
tenantscale stripe:sync --force
```

### Dry-Run Output

```
Stripe Sync (DRY RUN — no changes made)
────────────────────────────────────────
Plans to sync: 3
  ✓ Free       → $0/month    → Update product: Existing, price unchanged
  ✓ Pro        → $29/month   → Create price: Monthly $29.00
  ✓ Enterprise → $99/month   → Create price: Monthly $99.00

Run without --dry-run to apply.
```

### Success Output

```
Stripe Sync Complete
────────────────────
  Plans synced:      3
  Products created:  0
  Products updated:  2
  Prices created:    1
  Prices updated:    2
  Duration:          1.2s
```

---

## `tenantscale audit:purge`

Purge expired audit log entries to save storage space and maintain performance.

```bash
tenantscale audit:purge
```

### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--days` | `-d` | `90` | Purge entries older than this many days |
| `--tenant` | `-t` | all | Purge only for a specific tenant |
| `--dry-run` | — | `false` | Show what would be purged without deleting |
| `--json` | `-j` | `false` | Output as JSON |

### Examples

```bash
# Purge default 90-day retention
tenantscale audit:purge

# Purge entries older than 30 days
tenantscale audit:purge --days 30

# Preview what would be purged
tenantscale audit:purge --days 90 --dry-run

# Purge for a specific tenant
tenantscale audit:purge --tenant tnt_abc123 --days 60
```

### Dry-Run Output

```
Audit Purge (DRY RUN — no deletions made)
──────────────────────────────────────────
  Retention period:   90 days
  Entries to purge:   12,847
  Oldest entry:       2024-03-01
  Newest to keep:     2025-03-17

Run without --dry-run to purge.
```

### Success Output

```
Audit Purge Complete
────────────────────
  Entries purged:    12,847
  Retention days:    90
  Storage saved:     45.2 MB
  Duration:          3.4s
```

---

## `tenantscale --help`

Get help for any command:

```bash
# General help
tenantscale --help

# Command-specific help
tenantscale init --help
tenantscale migrate --help
tenantscale stripe:sync --help
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (invalid input, connection failure) |
| `2` | Configuration error (missing env vars, invalid config) |
| `3` | Database error (connection failed, migration failed) |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/cli](https://github.com/TenantScale/sdk/tree/main/packages/cli)
