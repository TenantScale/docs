# Deploy to Vercel

Deploy the TenantScale API to Vercel for a production-ready, serverless deployment with automatic scaling, SSL, and custom domains.

## Prerequisites

- A [Vercel account](https://vercel.com)
- A [Supabase project](/self-hosting/supabase) (with migrations run and plans seeded)
- A [Stripe account](/self-hosting/stripe) (for billing features)
- Node.js 20+ installed locally
- Vercel CLI installed: `npm install -g vercel`

## 1. Clone the Repository

```bash
git clone https://github.com/TenantScale/sdk.git
cd sdk

# Install dependencies
npm install
```

## 2. Link Your Vercel Project

```bash
# Log in to Vercel (if not already)
vercel login

# Link the local directory to a Vercel project
vercel link

# Follow the prompts:
# ? Set up and deploy "~/sdk"? [Y/n] Y
# ? Which scope do you want to deploy to? Your Team
# ? Link to existing project? No
# ? What's your project's name? tenantscale-api
```

If you already have a Vercel project, link to it:

```bash
vercel link --project tenantscale-api
```

## 3. Configure Environment Variables

Set all required environment variables in Vercel:

```bash
# Using Vercel CLI
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SUPABASE_ANON_KEY
vercel env add API_SECRET
vercel env add JWT_SECRET
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
```

Or set them in the Vercel Dashboard:

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings → Environment Variables**
3. Add each variable with the appropriate environment(s): Production, Preview, Development
4. Click **Save**

### Recommended Variables for Production

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
API_SECRET=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -hex 32>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Recommended
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://app.example.com
TRUST_PROXY=true
RATE_LIMIT_STORAGE=supabase
RATE_LIMIT_DEFAULT_DAILY=10000
AUDIT_RETENTION_DAYS=90
```

## 4. Configure Build Settings

Create a `vercel.json` file in the project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30,
      "memory": 512
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### Function Configuration

| Setting | Recommended | Description |
|---------|-------------|-------------|
| `maxDuration` | `30` | Max execution time in seconds (Vercel max: 60s on Pro) |
| `memory` | `512` | Memory in MB (Vercel max: 3009 on Pro) |

## 5. Deploy

```bash
# Deploy to production
vercel --prod

# Or deploy to preview (for testing)
vercel
```

Vercel will build and deploy. After completion, you'll see:

```
✅  Production: https://tenantscale-api.vercel.app [now]
🔗  Inspect: https://vercel.com/your-team/tenantscale-api/...
```

### Verify the Deployment

```bash
# Health check
curl https://tenantscale-api.vercel.app/health
# → {"status":"ok","timestamp":"2025-06-15T12:00:00Z"}

# Check version
curl https://tenantscale-api.vercel.app/version
# → {"version":"1.0.0"}
```

## 6. Configure Custom Domain

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings → Domains**
3. Enter your domain (e.g., `api.tenantscale.com`)
4. Follow the DNS configuration instructions:
   - Add a `CNAME` record pointing `api` to `cname.vercel-dns.com`
   - Or delegate the entire domain to Vercel's nameservers
5. Wait for SSL certificate provisioning (auto, ~1-5 minutes)

### Update CORS

After setting up your custom domain, update the `CORS_ORIGIN` environment variable:

```bash
vercel env rm CORS_ORIGIN
vercel env add CORS_ORIGIN
# Enter: https://app.yourdomain.com
vercel --prod
```

## 7. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL:** `https://tenantscale-api.vercel.app/v1/stripe/webhook`
4. **Events to listen for:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`)
7. Set as `STRIPE_WEBHOOK_SECRET` in Vercel:

```bash
vercel env add STRIPE_WEBHOOK_SECRET
# Paste the whsec_... value
vercel --prod
```

## Production Checklist

Before going live, verify:

- [ ] Health endpoint returns 200
- [ ] All environment variables are set for production
- [ ] CORS is restricted to your app's domain
- [ ] Custom domain is configured with SSL
- [ ] Stripe webhook is registered and verified
- [ ] Rate limiting is configured
- [ ] Supabase connections use connection pooling (PgBouncer)
- [ ] `NODE_ENV` is set to `production`
- [ ] Error monitoring is configured (e.g., Sentry)
- [ ] Database backups are scheduled

## Troubleshooting

### Cold Starts

Cold starts happen when a serverless function hasn't been invoked recently. Mitigation strategies:

| Strategy | Implementation |
|----------|---------------|
| Keep-warm cron | Set up a cron job to call `/health` every 5 minutes |
| Vercel Pro | Pro plan reduces cold start frequency |
| Increase memory | Higher memory allocations reduce cold start time |
| Region proximity | Deploy close to your users |

```bash
# Simple keep-warm using cron (on any server)
*/5 * * * * curl -s https://tenantscale-api.vercel.app/health > /dev/null
```

### Database Connection Limits

Vercel's serverless functions can create many concurrent connections. Mitigation:

1. **Use Supabase's PgBouncer connection pooling** (connection string format):
   ```
   postgres://user:password@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

2. **Set a conservative pool size**:
   ```bash
   DB_POOL_SIZE=5
   ```

3. **Enable connection reuse** across function invocations (use global connection caching)

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 504 Gateway Timeout | Function exceeds max duration | Reduce `maxDuration`, optimize queries |
| 502 Bad Gateway | Function crashes | Check logs, increase memory allocation |
| Connection timeout | Too many DB connections | Use PgBouncer, reduce pool size |
| CORS error | Missing or wrong origin | Set `CORS_ORIGIN` to your exact domain |
| Stripe webhook fails | Wrong signing secret | Re-copy `whsec_...` from Stripe Dashboard |
| 401 Unauthorized | Missing API key in request | Ensure `Authorization: Bearer tsk_...` header |

### Viewing Logs

```bash
# Stream production logs
vercel logs --prod

# View recent logs
vercel logs --prod --limit 50

# Filter by status code
vercel logs --prod | grep " 500 "
```

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
