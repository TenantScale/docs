# Next.js Adapter

`@tenantscale/next` provides middleware and route handlers for Next.js App Router. It supports both server-side rendering (SSR) and API route protection with full type safety.

## Installation

```bash
npm install @tenantscale/next
```

**Peer dependencies:** Requires `next@^14.0.0` and `@tenantscale/sdk@^1.0.0`.

## Adapter Architecture

The Next.js adapter provides three integration points:

1. **`withTenant()` HOF** — Wraps API route handlers (App Router)
2. **`middleware.ts`** — Edge middleware for global protection
3. **`getTenantFromCookies()`** — Server component data access

```
Browser Request
      │
      ├──→ [Optional] middleware.ts ───→ Quick auth check, redirect if invalid
      │
      ├──→ API Route (withTenant) ───→ Full auth, plan checks, rate limiting
      │
      └──→ Server Component ───→ getTenantFromCookies() for SSR data
```

## `withTenant()` — Route Handler Wrapper

The Higher-Order Function (HOF) for protecting API routes in the App Router.

### Basic Usage

```typescript
// app/api/me/route.ts
import { withTenant } from '@tenantscale/next';

export const GET = withTenant(async (req) => {
  return Response.json({
    tenant: req.tenant,
    message: `Hello, ${req.tenant.name}!`,
  });
});
```

### With Options

```typescript
// app/api/admin/route.ts
import { withTenant } from '@tenantscale/next';

export const GET = withTenant(
  async (req) => {
    return Response.json({ secret: 'data' });
  },
  {
    requiredScopes: ['admin'],
    requiredFeatures: ['admin-panel'],
    rateLimit: { max: 100, windowMs: 60_000 },
  }
);
```

### Options Reference

```typescript
interface WithTenantOptions {
  /**
   * Required API key scopes. Throws 403 if missing.
   */
  requiredScopes?: string | string[];

  /**
   * Required plan features. Throws 403 if missing.
   */
  requiredFeatures?: string | string[];

  /**
   * Plan limit to check before executing the handler.
   */
  planLimit?: {
    metric: string;
    increment?: number;
  };

  /**
   * Rate limiting configuration.
   */
  rateLimit?: {
    max: number;
    windowMs: number;
    /**
     * Rate limit by 'apiKey' (default) or 'ip'.
     */
    by?: 'apiKey' | 'ip';
  };

  /**
   * Supabase config (falls back to env vars).
   */
  supabaseUrl?: string;
  supabaseKey?: string;
}
```

### Error Handling

Errors are returned as JSON responses automatically:

```typescript
import { withTenant } from '@tenantscale/next';
import { InvalidApiKeyError, InsufficientScopeError, RateLimitExceededError } from '@tenantscale/next';

export const GET = withTenant(async (req) => {
  // If auth fails, the HOF returns a JSON error response
  // Your handler code only runs if all checks pass
  return Response.json({ data: 'success' });
});

// You can also catch errors manually:
export const POST = withTenant(async (req) => {
  try {
    // Your logic
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return Response.json(
        { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }
    throw error;
  }
});
```

### Full API Route Example

```typescript
// app/api/tenants/[id]/route.ts
import { NextRequest } from 'next/server';
import { withTenant } from '@tenantscale/next';

// GET /api/tenants/:id
export const GET = withTenant(
  async (req, { params }) => {
    const { getTenant } = await import('@tenantscale/sdk');
    const tenant = await getTenant(params.id);

    return Response.json({ tenant });
  },
  {
    requiredScopes: ['tenants:read'],
    rateLimit: { max: 300, windowMs: 60_000 },
  }
);

// POST /api/tenants/:id/settings
export const POST = withTenant(
  async (req, { params }) => {
    const body = await req.json();
    const { updateTenant } = await import('@tenantscale/sdk');
    const updated = await updateTenant(params.id, body);

    return Response.json({ tenant: updated });
  },
  {
    requiredScopes: ['tenants:write'],
    requiredFeatures: ['custom-settings'],
    planLimit: { metric: 'api-requests', increment: 5 },
  }
);

// DELETE /api/tenants/:id
export const DELETE = withTenant(
  async (req, { params }) => {
    const { deleteTenant } = await import('@tenantscale/sdk');
    await deleteTenant(params.id);

    return new Response(null, { status: 204 });
  },
  {
    requiredScopes: ['admin'],
  }
);
```

## `middleware.ts` — Edge Middleware

Use Next.js Edge Middleware for a lightweight auth check before requests reach your routes. This is useful for:

- Redirecting unauthenticated users to login
- Short-circuiting invalid API keys at the edge
- Setting cookies for server component access

### Basic Middleware

```typescript
// middleware.ts
import { tenantScaleMiddleware } from '@tenantscale/next/middleware';

export const middleware = tenantScaleMiddleware({
  // Optional: redirect URL for unauthenticated requests
  loginUrl: '/login',
  // Routes that don't require auth
  publicRoutes: ['/api/public', '/api/health', '/_next/static'],
});

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

### Custom Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateApiKey } from '@tenantscale/next/middleware';

export async function middleware(request: NextRequest) {
  // Public routes pass through
  if (request.nextUrl.pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }

  // Authenticate API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const result = await authenticateApiKey(request);

    if (!result.authenticated) {
      return Response.json(
        { error: 'Unauthorized', code: 'INVALID_API_KEY' },
        { status: 401 }
      );
    }

    // Set tenant cookie for server components
    const response = NextResponse.next();
    response.cookies.set('ts_tenant', JSON.stringify(result.tenant), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

### What Middleware Can and Cannot Do

| Capability | Supported | Notes |
|------------|-----------|-------|
| Validate API key format | ✅ | Checks `tsk_` prefix |
| Resolve tenant | ✅ | Full DB lookup |
| Check scopes | ✅ | `requireScope` available |
| Rate limiting | ❌ | Use `withTenant()` for rate limits |
| Heavy DB queries | ⚠️ | Edge has 50ms/500μs limits — prefer `withTenant()` |
| Set cookies | ✅ | For SSR data passing |
| Redirect | ✅ | Unauthenticated → login page |

## Server Components with `getTenantFromCookies()`

In server components, you can access tenant data without an API call by reading the cookie set by middleware.

### Setup

First, configure middleware to set the tenant cookie (see example above). Then use `getTenantFromCookies()` in your server components.

### Basic Usage

```typescript
// app/dashboard/page.tsx
import { getTenantFromCookies } from '@tenantscale/next';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const tenant = await getTenantFromCookies(cookieStore);

  if (!tenant) {
    return <div>Please log in to view this page.</div>;
  }

  return (
    <div>
      <h1>Welcome, {tenant.name}</h1>
      <p>Plan: {tenant.plan.name}</p>
      <p>API Requests Used: {tenant.usage['api-requests']} / {tenant.limits['api-requests']}</p>
    </div>
  );
}
```

### With Plan Data

```typescript
// app/settings/billing/page.tsx
import { getTenantFromCookies } from '@tenantscale/next';
import { cookies } from 'next/headers';
import { getPlan } from '@tenantscale/sdk';

export default async function BillingPage() {
  const cookieStore = await cookies();
  const tenant = await getTenantFromCookies(cookieStore);

  if (!tenant) return <div>Unauthorized</div>;

  const plan = await getPlan(tenant.plan.id);

  return (
    <div>
      <h1>Billing</h1>
      <p>Current Plan: {plan.name}</p>
      <p>Price: ${plan.price / 100}/month</p>
      <ul>
        {plan.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <a href="/api/portal">Manage Subscription →</a>
    </div>
  );
}
```

### Error Handling

```typescript
import { getTenantFromCookies, TenantSessionError } from '@tenantscale/next';

export default async function ProtectedPage() {
  const cookieStore = await cookies();

  try {
    const tenant = await getTenantFromCookies(cookieStore);
    if (!tenant) {
      return <div>Please log in.</div>;
    }
    return <Dashboard tenant={tenant} />;
  } catch (error) {
    if (error instanceof TenantSessionError) {
      return <div>Session expired. Please re-authenticate.</div>;
    }
    throw error;
  }
}
```

## Type Safety

`@tenantscale/next` provides full TypeScript support.

### Request Type Augmentation

```typescript
import { NextRequest } from 'next/server';

// Augment NextRequest to include tenant
declare module 'next/server' {
  interface NextRequest {
    tenant?: import('@tenantscale/sdk').Tenant;
    apiKey?: import('@tenantscale/sdk').ApiKey;
  }
}
```

### Typed `withTenant` Handler

```typescript
import { withTenant, type TenantRouteHandler } from '@tenantscale/next';

// Explicitly typed handler
const handler: TenantRouteHandler = async (req, context) => {
  // req.tenant is typed as Tenant
  // context.params is typed as Record<string, string | string[]>
  return Response.json({ tenant: req.tenant });
};

export const GET = withTenant(handler);
```

### Generic Params

```typescript
import { withTenant, type TenantRouteContext } from '@tenantscale/next';

interface Params {
  tenantId: string;
  resourceId: string;
}

export const GET = withTenant(
  async (
    req,
    { params }: TenantRouteContext<Params>
  ) => {
    const { tenantId, resourceId } = params;
    // Both are typed as string
    return Response.json({ tenantId, resourceId });
  }
);
```

## Server Components vs API Routes

| Aspect | `withTenant()` (API Routes) | `getTenantFromCookies()` (Server Components) |
|--------|----------------------------|---------------------------------------------|
| Auth method | API key in Authorization header | HTTP-only cookie set by middleware |
| Rate limiting | ✅ Built-in | ❌ Must implement separately |
| Plan enforcement | ✅ Built-in | ❌ Manual check |
| Use case | External API access | Server-rendered pages |
| Data freshness | Real-time | Up to cookie TTL (1h default) |
| Edge compatible | ✅ | ✅ |

## Environment Variables

The Next.js adapter reads from the same environment variables as the core SDK:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-side only) |
| `SUPABASE_ANON_KEY` | For public routes | Anon key for RLS |

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/next](https://github.com/TenantScale/sdk/tree/main/packages/next)
