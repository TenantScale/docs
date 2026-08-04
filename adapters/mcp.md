# MCP Server

`@tenantscale/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server for TenantScale. It gives AI coding tools — Claude, Cursor, GitHub Copilot — real-time access to your tenant schema, RLS validation, and endpoint structure during development.

Instead of guessing at your data model, an AI assistant connected to this server can:

- Look up the exact structure of your tenant tables
- Check whether a SQL query is properly tenant-scoped
- Generate RLS policies for new tables
- Recommend route patterns that follow TenantScale conventions

## Installation

```bash
npm install @tenantscale/mcp
# or
pnpm add @tenantscale/mcp
```

## Quick Start

```bash
# Start the MCP server
npx @tenantscale/mcp
```

Configure your AI coding tool to connect to the MCP server.

### Claude Desktop / Claude Code

Add to `claude.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "tenantscale": {
      "command": "npx",
      "args": ["@tenantscale/mcp"]
    }
  }
}
```

### Cursor

Add the same server entry under **Settings → MCP** (or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tenantscale": {
      "command": "npx",
      "args": ["@tenantscale/mcp"]
    }
  }
}
```

## Tools

| Tool | Purpose |
|------|---------|
| `get_tenant_schema` | Look up tenant table structures and columns |
| `validate_tenant_query` | Check if a SQL query is properly tenant-scoped |
| `generate_rls_policy` | Generate RLS policies for new tables |
| `suggest_endpoint_structure` | Recommend route patterns following TenantScale conventions |

## Development

```bash
pnpm dev    # Start with tsx watch
pnpm build  # Compile TypeScript
```

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/mcp](https://github.com/TenantScale/sdk/tree/main/packages/mcp)
