# CLI Reference

`@tenantscale/cli` provides command-line tools for initializing your TenantScale project, running migrations, and managing tenants. It is the primary interface for administrative operations.

## Overview

The TenantScale CLI lets you:

- **Initialize** a new TenantScale project with database migrations
- **Run & roll back** database schema migrations
- **Create, list, and inspect** tenants
- **Generate and revoke** API keys
- **Sync** subscription plans to Stripe
- **Purge** old audit log entries

## Commands

| Command | Description | Source |
|---------|-------------|--------|
| `init` | Initialize TenantScale and create database tables | [docs](#tenantscale-init) |
| `migrate` | Run or roll back database migrations | [docs](#tenantscale-migrate) |
| `create-tenant` | Create a new tenant | [docs](#tenantscale-create-tenant) |
| `list-tenants` | List all tenants (table or JSON output) | [docs](#tenantscale-list-tenants) |
| `get-tenant` | Get details for a specific tenant | [docs](#tenantscale-get-tenant) |
| `create-api-key` | Generate a new API key for a tenant | [docs](#tenantscale-create-api-key) |
| `revoke-api-key` | Revoke an existing API key | [docs](#tenantscale-revoke-api-key) |
| `stripe:sync` | Sync subscription plans to Stripe products/prices | [docs](#tenantscale-stripe-sync) |
| `audit:purge` | Purge expired audit log entries | [docs](#tenantscale-audit-purge) |

## Using `npx` vs Global Install

### npx (No Install Required)

Run any command without installing:

```bash
npx @tenantscale/cli init
npx @tenantscale/cli list-tenants
npx @tenantscale/cli create-tenant --name "Acme Corp"
```

Use `npx` for one-off commands or CI/CD pipelines.

### Global Install

Install once for repeated use:

```bash
npm install -g @tenantscale/cli
tenantscale init
tenantscale list-tenants
```

Use the global install for local development workflow.

## Source

The CLI is part of the TenantScale monorepo:

```
@tenantscale/cli
├── src/
│   ├── commands/        # Command implementations
│   │   ├── init.ts
│   │   ├── migrate.ts
│   │   ├── create-tenant.ts
│   │   ├── list-tenants.ts
│   │   ├── get-tenant.ts
│   │   ├── create-api-key.ts
│   │   ├── revoke-api-key.ts
│   │   ├── stripe-sync.ts
│   │   └── audit-purge.ts
│   ├── config.ts        # Config file loading
│   ├── db.ts            # Database connection
│   └── utils.ts         # Shared utilities
├── package.json
└── tsconfig.json
```

**Source:** [github.com/TenantScale/sdk/tree/main/packages/cli](https://github.com/TenantScale/sdk/tree/main/packages/cli)

## Getting Started

```bash
# Quick start with npx
npx @tenantscale/cli init

# Or install globally
npm install -g @tenantscale/cli
tenantscale init
```

## Configuration

The CLI needs a connection to your Supabase database. Configure it via:

1. **Config file** — `.tenantscalerc` (JSON or YAML) in your project root
2. **Environment variables** — `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. **`.env` file** — Auto-loaded from the current directory

See [CLI Configuration](/cli/configuration) for full details.

## Global Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--config` | `-c` | Path to config file |
| `--env` | `-e` | Path to .env file |
| `--json` | `-j` | Output as JSON (machine-readable) |
| `--help` | `-h` | Show help for a command |
| `--version` | `-V` | Show CLI version |

## Command Documentation

Detailed documentation for each command is available:

- [Commands Reference](/cli/commands) — Full command details with options and examples
- [Installation Guide](/cli/installation) — Installation prerequisites and verification
- [Configuration Guide](/cli/configuration) — Config files, environment variables, and secrets

## Version

```bash
npx @tenantscale/cli --version
# or
tenantscale --version
```

Current stable version: `1.0.0`

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/cli](https://github.com/TenantScale/sdk/tree/main/packages/cli)
