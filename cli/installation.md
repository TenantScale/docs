# CLI Installation

Install the TenantScale CLI to manage tenants, run migrations, and sync plans from your terminal.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18.x or later | 20.x LTS recommended |
| npm | 9.x or later | Ships with Node.js |
| Supabase project | — | Required for database operations |
| PostgreSQL | 14.x+ | Managed by Supabase |

## Install Globally

The recommended way to install the CLI for regular use:

```bash
npm install -g @tenantscale/cli
```

After installation, verify it works:

```bash
tenantscale --version
# → @tenantscale/cli/1.0.0 darwin-arm64 node-v20.11.0
```

### macOS / Linux

```bash
sudo npm install -g @tenantscale/cli
```

### Windows

```bash
npm install -g @tenantscale/cli
```

On Windows, the CLI is installed to `%APPDATA%\npm` and should be available in PowerShell, CMD, and Git Bash.

## Using `npx` (No Install)

Run any CLI command without a permanent installation:

```bash
npx @tenantscale/cli init
npx @tenantscale/cli migrate up
npx @tenantscale/cli list-tenants --json
```

`npx` downloads the package on first use and caches it locally. This is ideal for:

- CI/CD pipelines
- One-off commands
- Testing before installing
- Environments where you can't install global packages

## Verify Installation

Run the following commands to verify the CLI is working:

```bash
# Check version
tenantscale --version
# → @tenantscale/cli/1.0.0

# Check help
tenantscale --help
# → Usage: tenantscale <command> [options]

# Try a dry-run init (no DB connection needed for help)
tenantscale init --help
# → Initialize TenantScale project
```

If you get a "command not found" error after a global install:

1. **Check npm global path**:
   ```bash
   npm root -g
   # → /usr/local/lib/node_modules (macOS/Linux)
   # → C:\Users\you\AppData\Roaming\npm\node_modules (Windows)
   ```

2. **Ensure npm bin directory is in your PATH**:
   ```bash
   # macOS/Linux
   export PATH=$(npm bin -g):$PATH
   
   # Windows (PowerShell)
   $env:Path += ";$env:APPDATA\npm"
   ```

## Updating

```bash
# Update global install
npm update -g @tenantscale/cli

# Or reinstall latest
npm install -g @tenantscale/cli@latest
```

## Installing a Specific Version

```bash
# Install a specific version
npm install -g @tenantscale/cli@0.9.0

# Install the latest beta
npm install -g @tenantscale/cli@beta
```

## Uninstalling

```bash
npm uninstall -g @tenantscale/cli
```

## Docker (Alternative Installation)

If you prefer Docker, you can use the TenantScale API image which includes the CLI:

```bash
docker run --rm tenantscale/cli --version
docker run --rm -v $(pwd):/workspace tenantscale/cli init
```

## CI/CD Installation

### GitHub Actions

```yaml
- name: Install TenantScale CLI
  run: npm install -g @tenantscale/cli

- name: Run migrations
  run: tenantscale migrate up
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### GitLab CI

```yaml
before_script:
  - npm install -g @tenantscale/cli

migrate:
  script:
    - tenantscale migrate up
  variables:
    SUPABASE_URL: $SUPABASE_URL
    SUPABASE_SERVICE_KEY: $SUPABASE_SERVICE_KEY
```

## Troubleshooting Installation

| Problem | Solution |
|---------|----------|
| `command not found` | Add npm global bin to PATH, or use `npx @tenantscale/cli` |
| `EACCES` permissions | Use `sudo npm install -g` on macOS/Linux, or configure npm prefix |
| `ENOENT` errors | Ensure Node.js 18+ is installed (`node --version`) |
| Slow `npx` startup | Install globally — `npx` downloads on first use |
| Windows Git Bash issues | Use `winpty tenantscale` if interactive prompts behave oddly |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/cli](https://github.com/TenantScale/sdk/tree/main/packages/cli)
