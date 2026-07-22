# Contributing to TenantScale Docs

First off, thanks for taking the time to contribute! 🎉

Good documentation is just as important as good code — it's how people actually use TenantScale. Whether it's fixing a typo, adding an adapter guide, or writing an API reference page, your contribution matters.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [How the Docs Site Works](#how-the-docs-site-works)
- [Adding a New Page](#adding-a-new-page)
- [Editing an Existing Page](#editing-an-existing-page)
- [Linking Between Pages](#linking-between-pages)
- [Documentation Style Guide](#documentation-style-guide)
- [Pull Request Process](#pull-request-process)
- [Reference: SDK CONTRIBUTING.md](#reference-sdk-contributingmd)

---

## Code of Conduct

This project and everyone participating in it is governed by the [TenantScale Code of Conduct](https://github.com/TenantScale/sdk/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (install via `npm install -g pnpm` or `corepack enable && corepack prepare pnpm@latest --activate`)

### Setup

```bash
# Clone the docs repo
git clone https://github.com/TenantScale/docs.git
cd docs

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

That's it. The dev server starts at `http://localhost:5173` with hot-reload — edit a Markdown file and the page updates instantly.

### Common Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start VitePress dev server with hot-reload |
| `pnpm build` | Build the static site for production |
| `pnpm preview` | Preview the production build locally |

---

## Project Structure

```
tenantscale-docs/
├── .vitepress/
│   └── config.ts          # Site config: nav, sidebar, theme settings
├── adapters/              # Framework adapter guides
│   ├── index.md           # Adapters overview
│   ├── express.md         # Express adapter guide
│   ├── hono.md            # Hono adapter guide
│   ├── nextjs.md          # Next.js App Router guide
│   └── react.md           # React hooks guide
├── api/                   # API reference docs
│   ├── index.md           # API overview
│   ├── admin.md           # Admin endpoints
│   ├── analytics.md       # Analytics endpoints
│   ├── audit.md           # Audit log endpoints
│   ├── events.md          # Events & audit endpoints
│   ├── plans.md           # Plan configuration endpoints
│   ├── portal.md          # Portal session endpoints
│   ├── subscriptions.md   # Subscription endpoints
│   ├── webhooks.md        # Webhook endpoints
│   └── ...                # (some API pages may be missing — good place to contribute!)
├── cli/                   # CLI reference
│   ├── index.md           # CLI overview
│   ├── installation.md    # CLI installation
│   ├── commands.md        # CLI command reference
│   └── configuration.md   # CLI configuration
├── guide/                 # Main documentation guides
│   ├── index.md           # What is TenantScale?
│   ├── quick-start.md     # 10-minute quick start
│   ├── core-concepts.md   # Core architecture concepts
│   ├── architecture.md    # System architecture
│   ├── tenant-isolation.md
│   ├── plan-enforcement.md
│   ├── audit-logging.md
│   ├── rate-limiting.md
│   ├── webhooks.md
│   └── billing.md         # Billing with Stripe
├── sdk/                   # SDK reference
│   ├── index.md           # SDK overview
│   ├── installation.md    # SDK installation
│   ├── client.md          # TenantScale client
│   ├── authentication.md  # Auth & API keys
│   ├── api-keys.md        # API key management
│   ├── plans.md           # Plans & features
│   ├── audit.md           # Audit events
│   ├── webhooks.md        # Webhook management
│   ├── rate-limiting.md   # Rate limiting
│   ├── errors.md          # Error handling
│   └── typescript.md      # TypeScript API reference
├── self-hosting/          # Self-hosting deployment guides
│   ├── index.md           # Overview
│   ├── supabase.md        # Supabase setup
│   ├── env-vars.md        # Environment variables
│   ├── vercel.md          # Deploy to Vercel
│   ├── stripe.md          # Stripe setup
│   └── production.md      # Production checklist
├── public/                # Static assets (images, SVGs, favicon)
├── index.md               # Home page
├── package.json
└── CONTRIBUTING.md         # ← you are here
```

---

## How the Docs Site Works

The docs site is built with [VitePress](https://vitepress.dev/), a static site generator powered by Vite and Vue. Here's what you need to know:

### Markdown-Based

Every page is a Markdown file (`.md`). VitePress renders them to HTML. You can use standard Markdown plus Vue components and frontmatter:

```markdown
---
title: My Page
description: A brief description for SEO
---

# My Page

Content here...
```

### Sidebar & Navigation

The sidebar is configured in `.vitepress/config.ts`. If you add a new page, you need to add it to the sidebar config so it appears in the navigation. See the `sidebar` object in `config.ts` — each top-level key (`/guide/`, `/sdk/`, `/api/`, etc.) has its own sidebar array.

### Routing

Each Markdown file maps to a URL automatically:
- `guide/quick-start.md` → `https://docs.tenantscale.com/guide/quick-start`
- `adapters/express.md` → `https://docs.tenantscale.com/adapters/express`

Because `cleanUrls: true` is set in the config, URLs don't have `.html` extensions.

---

## Adding a New Page

### 1. Create the Markdown file

Place it in the appropriate directory. For example, to add a Fastify adapter guide:

```bash
touch adapters/fastify.md
```

### 2. Add frontmatter

Every page should start with YAML frontmatter:

```markdown
---
title: Fastify Adapter
description: Use TenantScale with Fastify — add multi-tenant auth, plan enforcement, and rate limiting to your Fastify application.
---

# Fastify Adapter

<!-- content here -->
```

### 3. Register in the sidebar

Open `.vitepress/config.ts` and add the page to the `sidebar` object under the appropriate section:

```typescript
// In the '/adapters/' sidebar
items: [
  { text: 'Overview', link: '/adapters/' },
  { text: 'Express', link: '/adapters/express' },
  { text: 'Fastify', link: '/adapters/fastify' },  // ← add this
  { text: 'Hono', link: '/adapters/hono' },
  // ...
],
```

### 4. Verify with the dev server

```bash
pnpm dev
# Open http://localhost:5173/adapters/fastify
```

---

## Editing an Existing Page

### Via the GitHub web UI

Every page has an **"Edit this page on GitHub"** link at the bottom right — click it, make your changes, and open a pull request directly from the web UI. This is the fastest way to fix a typo or make a small improvement.

### Via a local clone

```bash
# Create a branch
git checkout -b docs/fix-typo

# Edit the file
code guide/quick-start.md

# Preview
pnpm dev

# Commit and push
git add -A && git commit -m "docs: fix typo in quick start guide"
git push -u origin HEAD
```

---

## Linking Between Pages

### Internal links (within the docs site)

Use the file's route path (without `.md` extension):

```markdown
See the [Quick Start guide](/guide/quick-start).
Learn about [tenant isolation](/guide/tenant-isolation).
Check the [Express adapter docs](/adapters/express).
```

### Anchor links

Link to a specific heading on the same or another page:

```markdown
See [Configuration options](#configuration-options).
Read about [rate limit headers](/sdk/rate-limiting#rate-limit-headers).
```

### Links to GitHub

Use full URLs for external links:

```markdown
View the [source code on GitHub](https://github.com/TenantScale/sdk/blob/main/packages/sdk/src/sdk.ts).
```

### Links to npm packages

```markdown
Install from npm: `pnpm add @tenantscale/express`
```

---

## Documentation Style Guide

### Tone

- **Clear and direct.** Write for a developer who wants to get something done.
- **Action-oriented.** Start with "what you'll build" or "what this does."
- **Professional but friendly.** You're a teammate, not a textbook.
- **Avoid marketing fluff.** No "revolutionary" or "game-changing." Let the features speak for themselves.

### Formatting conventions

| Element | Convention |
|---------|-----------|
| **Headings** | Sentence case (`## Quick start`, not `## Quick Start`) |
| **Code blocks** | Always specify the language (` ```typescript `, ` ```bash `) |
| **Inline code** | Use backticks for: package names, function names, file paths, CLI commands |
| **Bold** | For UI labels and key terms |
| **Lists** | Use `-` for unordered, `1.` for ordered |
| **Callouts** | Use blockquotes for tips/warnings: `> **Tip:** ...` or `> **Warning:** ...` |
| **Placeholders** | Use `<angle_brackets>` for user-specific values: `api.example.com/<tenant_id>/events` |
| **Environment variables** | Use `UPPER_CASE` with backticks: `` `STRIPE_SECRET_KEY` `` |

### Page structure

Each guide or reference page should follow this pattern:

1. **Title** — `# Page Title` (H1)
2. **One-paragraph intro** — what this page covers
3. **Prerequisites** — if any (optional)
4. **Main content** — steps, code examples, API tables
5. **Related** — links to related pages (optional)

### API reference pages

For API endpoint documentation, use this structure:

```markdown
## POST /endpoint-name

### Description
What this endpoint does.

### Request
```http
POST https://api.tenantscale.com/v1/endpoint
Content-Type: application/json
Authorization: Bearer <api_key>
```

### Request body
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `field` | `string` | Yes | Description |

### Response
```json
{
  "id": "abc123"
}
```

### Error codes
| Status | Code | Description |
|--------|------|-------------|
| 400 | `invalid_request` | Description |
```

---

## Pull Request Process

### Branch naming

```
docs/fix-typo           # Small fixes
docs/adapter-guide      # New adapter docs page
docs/api-reference      # API reference additions
docs/restructure        # Major reorganization
```

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). For docs:

```bash
git commit -m "docs: fix typo in quick start guide"
git commit -m "docs(adapters): add Fastify adapter guide"
git commit -m "docs(api): document analytics endpoints"
```

### DCO sign-off

All commits must include a `Signed-off-by` trailer (Developer Certificate of Origin). Use `git commit -s` to add it automatically:

```bash
git commit -s -m "docs: fix typo in quick start guide"
```

This certifies that you have the right to submit your contribution under the project's license.

### Before opening a PR

- [ ] `pnpm build` completes without errors
- [ ] Preview looks correct at `pnpm dev`
- [ ] All internal links work
- [ ] New pages are registered in the sidebar config
- [ ] Spelling and grammar are correct
- [ ] PR description explains what changed and why

### CI checks

When you open a PR, CI runs:
1. **Build** — VitePress builds the site
2. **Broken link check** — all internal links are valid

All must pass before merge.

### Merge

PRs are **squash merged** into `main`. The squash commit title should be descriptive since it appears in the changelog.

---

## Reference: SDK CONTRIBUTING.md

This docs site is part of the TenantScale project. For broader contribution guidelines — including how to contribute to the SDK itself, add new adapters, or report bugs — see the main [SDK CONTRIBUTING.md](https://github.com/TenantScale/sdk/blob/main/CONTRIBUTING.md).

Key things from the SDK guide that also apply here:
- **Good first issues** are tagged with `good first issue` — start there
- **Need help?** Join the [Discord server](https://discord.gg/tenantscale) — best for quick questions
- **All contributors are recognized** — you'll be added to the README after your PR merges

---

*Thank you for contributing to TenantScale Docs! 🚀*
