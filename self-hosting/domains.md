# Domain & DNS Setup

This document covers the DNS configuration needed to go live with custom domains for all TenantScale services.

## Domain Map

| Service | Custom Domain | Current URL | Hosting | Status |
|---------|--------------|-------------|---------|--------|
| Landing | **tenantscale.com** | tenantscale.com | Cloudflare Workers | ✅ Live |
| Landing | **www.tenantscale.com** | — | Cloudflare Workers (redirects to apex) | ⚠️ Pending |
| API | **api.tenantscale.com** | tenantscale-api.vercel.app | Vercel | ⚠️ DNS pending |
| Portal | **app.tenantscale.com** | (Vercel auto-assigned) | Vercel | ⚠️ DNS pending |
| Docs | **docs.tenantscale.com** | tenantscale-docs.vercel.app | Vercel | ✅ Live |

## Prerequisites

1. **Domain registered** — tenantscale.com registered at your domain registrar
2. **Cloudflare account** — Domain added to Cloudflare (nameservers pointed to Cloudflare)
3. **Vercel account** — With all projects deployed (API, Portal, Docs)

## Step 1: Cloudflare DNS Records

In Cloudflare Dashboard → DNS → Add records:

```text
# ── Landing Page (Cloudflare Workers) ──
# These are handled automatically by the Workers route config.
# The wrangler.jsonc already defines:
#   routes: [{ pattern: "tenantscale.com", custom_domain: true }]
# Deploy with: wrangler deploy

# ── API (Vercel) ──
CNAME  api     cname.vercel-dns.com    # Proxied (orange cloud)

# ── Portal (Vercel) ──
CNAME  app     cname.vercel-dns.com    # Proxied (orange cloud)

# ── Docs (Vercel) ──
CNAME  docs    cname.vercel-dns.com    # Proxied (orange cloud)

# ── Email (Resend) ──
# Resend needs these for DKIM/SPF:
TXT    @       "v=spf1 include:spf.resend.com ~all"
CNAME  resend._domainkey  dkim1.resend.com
```

## Step 2: Vercel Custom Domains

For each Vercel project, add the custom domain in the dashboard:

### API (`tenantscale-api` project)
```bash
# In Vercel Dashboard → tenantscale-api → Settings → Domains
# Add: api.tenantscale.com
# Verify DNS → CNAME record pointing to cname.vercel-dns.com
```

### Portal (`tenantscale-portal` project)
```bash
# In Vercel Dashboard → tenantscale-portal → Settings → Domains
# Add: app.tenantscale.com
# Verify DNS → CNAME record pointing to cname.vercel-dns.com
```

### Docs (`tenantscale-docs` project)
```bash
# In Vercel Dashboard → tenantscale-docs → Settings → Domains
# Add: docs.tenantscale.com
# Verify DNS → CNAME record pointing to cname.vercel-dns.com
```

## Step 3: Cloudflare Workers Custom Domain

The landing page (wrangler.jsonc) already has the route configured:

```json
"routes": [
  { "pattern": "tenantscale.com", "custom_domain": true },
  { "pattern": "www.tenantscale.com", "custom_domain": true }
]
```

Deploy with:
```bash
cd /c/Users/matth/tenantscale-landing
npx wrangler deploy
```

This will automatically configure the Cloudflare Workers route for tenantscale.com.

> **Note**: If the domain is not yet in your Cloudflare account, the deploy will fail.
> Add the domain to Cloudflare first:
> 1. Cloudflare Dashboard → Add Site → tenantscale.com
> 2. Update nameservers at your registrar to Cloudflare's
> 3. Wait for DNS propagation (5-30 min)
> 4. Then deploy the worker

## Step 4: Update API Environment Variables

After domains are configured, update the API env vars:

```bash
# Current (dev):
CORS_ORIGIN=*
STRIPE_SUCCESS_URL=http://localhost:3003/billing
STRIPE_CANCEL_URL=http://localhost:3003/billing
STRIPE_PORTAL_RETURN_URL=http://localhost:3003/billing
PORTAL_URL=http://localhost:3003

# Production:
CORS_ORIGIN=https://app.tenantscale.com
STRIPE_SUCCESS_URL=https://app.tenantscale.com/billing
STRIPE_CANCEL_URL=https://app.tenantscale.com/billing
STRIPE_PORTAL_RETURN_URL=https://app.tenantscale.com/billing
PORTAL_URL=https://app.tenantscale.com
```

## Step 5: Verify Everything

```bash
# Check DNS propagation
nslookup tenantscale.com
nslookup api.tenantscale.com
nslookup app.tenantscale.com
nslookup docs.tenantscale.com

# Check HTTPS
curl -I https://tenantscale.com
curl -I https://api.tenantscale.com/health
curl -I https://app.tenantscale.com
curl -I https://docs.tenantscale.com
```

## SSL Certificates

- **Cloudflare Workers**: Auto-provisioned via Cloudflare's edge certificate
- **Vercel**: Auto-provisioned via Let's Encrypt (automatic with custom domain setup)
- Both are fully managed — no manual certificate renewal needed

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ERR_CONNECTION_REFUSED` | DNS not propagated yet | Wait 5-30 min, check nslookup |
| Cloudflare 522 error | Origin server not responding | Check Vercel deployment status |
| Cloudflare 526 error | SSL handshake failed | Verify Vercel SSL cert is valid |
| Workers returning 404 | Route not matching | Check wrangler.jsonc route pattern |
| Vercel 404 on custom domain | Domain not added in Vercel dashboard | Add domain in Vercel project settings |
