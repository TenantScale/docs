# Self-Hosting Overview

TenantScale is designed to be self-hosted. You control your data, your infrastructure, and your deployment. This section covers everything you need to run TenantScale in production on your own infrastructure.

## Architecture

A self-hosted TenantScale deployment consists of:

```
┌─────────────────────────────────────────────────────┐
│                    Your Application                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Express   │  │ Hono     │  │ Next.js / React   │  │
│  │ Adapter   │  │ Adapter  │  │ Adapter           │  │
│  └─────┬─────┘  └─────┬─────┘  └────────┬──────────┘  │
└────────┼───────────────┼─────────────────┼──────────────┘
         │               │                 │
         ▼               ▼                 ▼
┌────────────────────────────────────────────────────────┐
│               TenantScale API Server                    │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────────────┐ │
│  │ Auth     │ │ Rate     │ │ Plan   │ │ Webhook     │ │
│  │ Middleware│ │ Limiter  │ │ Enforce│ │ Dispatcher  │ │
│  └──────────┘ └──────────┘ └────────┘ └─────────────┘ │
└────────────────────────┬───────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────┐
│                    Supabase (PostgreSQL)                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│  │Tenants │ │API Keys│ │ Plans  │ │Audit   │ │Rate  │ │
│  │        │ │        │ │        │ │Logs    │ │Limits│ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └──────┘ │
└─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────┐
│                    Stripe (Billing)                      │
│              ┌─────────────────────┐                    │
│              │ Products → Prices    │                    │
│              │ Subscriptions        │                    │
│              │ Invoices             │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 20.x | 22.x LTS |
| npm | 9.x | 10.x |
| Supabase Project | Free tier | Pro tier ($25/mo) |
| PostgreSQL | 14.x | 15.x |
| Stripe Account | — | Required for billing |
| Redis (optional) | — | For high-throughput rate limiting |
| Memory | 512 MB | 1 GB+ |
| Storage | 1 GB | 10 GB+ |
| CPU | 1 core | 2+ cores |

## Deployment Options

TenantScale can be deployed three ways. Choose the option that best fits your infrastructure:

### Option 1: Vercel (Recommended)

Deploy the TenantScale API to Vercel's serverless platform for zero-maintenance hosting.

```bash
# Deploy with one command
npx vercel --prod
```

**Pros:**
- Zero infrastructure management
- Automatic SSL and custom domains
- Global edge network
- Free tier available

**Cons:**
- Cold starts on infrequent requests
- 10-second function timeout (sufficient for most operations)
- Database connection pooling requires PgBouncer

[Full Vercel Guide →](/self-hosting/vercel)

### Option 2: Docker

Run the TenantScale API as a Docker container on any cloud provider (AWS ECS, Google Cloud Run, Azure ACI, or your own VM).

```bash
docker run -d \
  --name tenantscale \
  -p 3000:3000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e STRIPE_SECRET_KEY=... \
  tenantscale/api:latest
```

**Pros:**
- Portable across any environment
- Predictable performance (no cold starts)
- Full control over infrastructure
- Easy horizontal scaling

**Cons:**
- Requires container orchestration knowledge
- You manage SSL, domains, and updates

**Docker Compose:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  tenantscale:
    image: tenantscale/api:latest
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

volumes:
  redis_data:
```

### Option 3: Bare Metal

Run the TenantScale API directly on a VM or physical server.

```bash
# Clone the repository
git clone https://github.com/TenantScale/sdk.git
cd sdk

# Install dependencies
npm install

# Build
npm run build

# Start the API server
npm start
```

**Pros:**
- Maximum control and customization
- No container overhead
- Direct access to system resources

**Cons:**
- Manual setup and maintenance
- You handle SSL, process management, and updates

**Process Management with PM2:**

```bash
npm install -g pm2
pm2 start dist/server.js --name tenantscale
pm2 save
pm2 startup
```

## Setup Checklist

Use this checklist to ensure a complete self-hosted setup:

### Step 1: Database (Supabase)

- [ ] Create a Supabase project
- [ ] Run TenantScale migrations
- [ ] Seed default plans (Free, Pro, Enterprise)
- [ ] Enable RLS on tables
- [ ] Record Supabase URL and API keys

[Supabase Setup Guide →](/self-hosting/supabase)

### Step 2: Environment Variables

- [ ] Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `SUPABASE_ANON_KEY` (for client-side RLS)
- [ ] Generate and set `API_SECRET` and `JWT_SECRET`
- [ ] Set Stripe keys (if using billing)
- [ ] Configure rate limiting and logging
- [ ] Set CORS origin for production domain

[Environment Variables Reference →](/self-hosting/env-vars)

### Step 3: Stripe (Billing)

- [ ] Create Stripe account (if not existing)
- [ ] Get Stripe API keys (test mode for development)
- [ ] Run `tenantscale stripe:sync` to sync plans
- [ ] Configure Stripe webhook endpoint
- [ ] Test checkout and portal sessions

[Stripe Setup Guide →](/self-hosting/stripe)

### Step 4: Deployment

- [ ] Choose deployment option (Vercel, Docker, or bare metal)
- [ ] Deploy the API server
- [ ] Configure custom domain
- [ ] Set up SSL/TLS
- [ ] Verify health endpoint returns 200

[Vercel Deployment Guide →](/self-hosting/vercel)

### Step 5: Production Readiness

- [ ] Review security checklist
- [ ] Configure rate limiting for your scale
- [ ] Set up monitoring and alerting
- [ ] Configure database backups
- [ ] Test webhook delivery
- [ ] Verify error handling

[Production Checklist →](/self-hosting/production)

---

**Source:** [github.com/TenantScale/sdk](https://github.com/TenantScale/sdk)
