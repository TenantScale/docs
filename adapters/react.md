# React Adapter

`@tenantscale/react` provides React hooks and context providers for client-side tenant data access. It works with any React framework including Next.js, Vite, Create React App, and Remix.

## Installation

```bash
npm install @tenantscale/react
```

**Peer dependencies:** Requires `react@^18.0.0` and `@tenantscale/sdk@^1.0.0`.

## Quick Start

```tsx
import { TenantProvider, useTenant } from '@tenantscale/react';

// 1. Wrap your app with TenantProvider
function App() {
  return (
    <TenantProvider>
      <MainContent />
    </TenantProvider>
  );
}

// 2. Use the hooks in any component
function MainContent() {
  const { tenant, isLoading, error } = useTenant();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!tenant) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {tenant.name}!</h1>
      <p>Plan: {tenant.plan.name}</p>
    </div>
  );
}
```

## `TenantProvider`

The root provider component. It manages tenant state and provides it to all child components via React context.

### Basic Usage

```tsx
import { TenantProvider } from '@tenantscale/react';

function RootLayout({ children }) {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
}
```

### With API Client

```tsx
import { TenantProvider } from '@tenantscale/react';
import { createClient } from '@tenantscale/sdk';

const client = createClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

function RootLayout({ children }) {
  return (
    <TenantProvider client={client}>
      {children}
    </TenantProvider>
  );
}
```

### With Initial Data (SSR)

```tsx
import { TenantProvider } from '@tenantscale/react';
import type { Tenant } from '@tenantscale/sdk';

// Preloaded from server
const initialTenant: Tenant = {
  id: 'tenant_123',
  name: 'My Company',
  slug: 'my-company',
  plan: { id: 'pro', name: 'Pro' },
  features: ['audit-log', 'custom-domain'],
  limits: { 'api-requests': 50000 },
  usage: { 'api-requests': 12345 },
};

function RootLayout({ children }) {
  return (
    <TenantProvider initialTenant={initialTenant}>
      {children}
    </TenantProvider>
  );
}
```

### Props

```typescript
interface TenantProviderProps {
  /** React children */
  children: React.ReactNode;
  /** Optional TenantScale SDK client instance */
  client?: TenantScaleClient;
  /** Preloaded tenant data (for SSR) */
  initialTenant?: Tenant;
  /** Preloaded plan data (for SSR) */
  initialPlan?: Plan;
  /** Preloaded API keys list (for SSR) */
  initialApiKeys?: ApiKey[];
  /** Called when the tenant changes */
  onTenantChange?: (tenant: Tenant | null) => void;
}
```

## `useTenant()`

The primary hook for accessing tenant data.

```tsx
import { useTenant } from '@tenantscale/react';

function ProfileSection() {
  const {
    tenant,      // Tenant | null
    isLoading,   // boolean
    error,       // Error | null
    refetch,     // () => Promise<void>
    setTenant,   // (tenant: Tenant) => void
  } = useTenant();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorBanner message={error.message} />;
  if (!tenant) return <LoginPrompt />;

  return (
    <div>
      <h2>{tenant.name}</h2>
      <p>Plan: {tenant.plan.name}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `tenant` | `Tenant \| null` | Current tenant data, or null if not loaded |
| `isLoading` | `boolean` | True during initial load |
| `isRefetching` | `boolean` | True during refetch (keeps stale data) |
| `error` | `Error \| null` | Last error, or null |
| `refetch` | `() => Promise<void>` | Manually refetch tenant data |
| `setTenant` | `(tenant: Tenant) => void` | Optimistically update tenant state |

## `usePlan()`

Access the current tenant's plan details, features, and limits.

```tsx
import { usePlan } from '@tenantscale/react';

function PlanBadge() {
  const { plan, features, limits, usage, isLoading } = usePlan();

  if (isLoading) return <Spinner />;

  return (
    <div className="plan-info">
      <h3>{plan.name}</h3>
      <p>${plan.price / 100}/month</p>

      <h4>Features</h4>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            {feature} {feature === 'audit-log' ? '✅' : ''}
          </li>
        ))}
      </ul>

      <h4>Usage</h4>
      {Object.entries(limits).map(([key, limit]) => (
        <div key={key}>
          {key}: {usage[key] || 0} / {limit === -1 ? '∞' : limit}
        </div>
      ))}
    </div>
  );
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `plan` | `Plan` | Current plan object with id, name, price |
| `features` | `string[]` | Plan features list |
| `limits` | `Record<string, number>` | Plan limits (metric → max value, -1 = unlimited) |
| `usage` | `Record<string, number>` | Current usage per metric |
| `isLoading` | `boolean` | True during load |
| `error` | `Error \| null` | Last error |

## `useApiKeys()`

Manage API keys for the current tenant (requires admin scope).

```tsx
import { useApiKeys } from '@tenantscale/react';

function ApiKeyManager() {
  const { apiKeys, createKey, revokeKey, isLoading } = useApiKeys();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h3>API Keys ({apiKeys.length})</h3>

      <button onClick={() => createKey({ name: 'New Key', scopes: ['read'] })}>
        Create Key
      </button>

      <ul>
        {apiKeys.map((key) => (
          <li key={key.id}>
            <code>{key.prefix}...{key.suffix}</code>
            <span>{key.scopes.join(', ')}</span>
            <span>{key.createdAt.toLocaleDateString()}</span>
            <button onClick={() => revokeKey(key.id)} disabled={key.revoked}>
              {key.revoked ? 'Revoked' : 'Revoke'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `apiKeys` | `ApiKey[]` | List of API keys for the current tenant |
| `createKey` | `(opts: CreateKeyOptions) => Promise<ApiKey>` | Create a new API key |
| `revokeKey` | `(keyId: string) => Promise<void>` | Revoke an API key |
| `isLoading` | `boolean` | True during load |
| `error` | `Error \| null` | Last error |

### `createKey` Options

```typescript
interface CreateKeyOptions {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}
```

## SSR Support with Preloaded Data

For frameworks that support server-side rendering (Next.js, Remix), you can preload tenant data on the server and pass it to the client to avoid a loading flash.

### Next.js App Router

```tsx
// app/layout.tsx
import { TenantProvider } from '@tenantscale/react';
import { getTenantFromCookies } from '@tenantscale/next';
import { cookies } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const tenant = await getTenantFromCookies(cookieStore);

  return (
    <html>
      <body>
        <TenantProvider initialTenant={tenant || undefined}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

### Next.js Pages Router

```tsx
// pages/_app.tsx
import { TenantProvider } from '@tenantscale/react';
import type { AppProps } from 'next/app';
import type { Tenant } from '@tenantscale/sdk';

type Props = AppProps & {
  pageProps: {
    tenant?: Tenant;
  };
};

export default function MyApp({ Component, pageProps }: Props) {
  return (
    <TenantProvider initialTenant={pageProps.tenant}>
      <Component {...pageProps} />
    </TenantProvider>
  );
}

// pages/dashboard.tsx
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Fetch tenant data server-side
  const tenant = await fetchTenantFromSession(ctx.req);
  return { props: { tenant } };
};
```

### Remix

```tsx
// app/root.tsx
import { TenantProvider } from '@tenantscale/react';
import { json, LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const tenant = await getTenantFromRequest(request);
  return json({ tenant });
}

export default function App({ children }: { children: React.ReactNode }) {
  const { tenant } = useLoaderData<typeof loader>();

  return (
    <TenantProvider initialTenant={tenant}>
      {children}
    </TenantProvider>
  );
}
```

## Client-Side Authentication

For pure client-side apps (no SSR), authenticate by calling the TenantScale API directly:

```tsx
import { TenantProvider, useTenant } from '@tenantscale/react';
import { createClient } from '@tenantscale/sdk';
import { useState } from 'react';

function LoginForm() {
  const [apiKey, setApiKey] = useState('');
  const { setTenant } = useTenant();
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const client = createClient({ apiKey });
      const tenant = await client.getCurrentTenant();
      setTenant(tenant);
    } catch (err) {
      setError('Invalid API key');
    }
  };

  return (
    <div>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your API key"
      />
      <button onClick={handleLogin}>Authenticate</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## TypeScript Types

```typescript
import type { Tenant, Plan, ApiKey } from '@tenantscale/sdk';
import {
  TenantProvider,
  useTenant,
  usePlan,
  useApiKeys,
  type TenantContextValue,
  type PlanContextValue,
} from '@tenantscale/react';

// Type-safe custom hook
function useMyFeature(): {
  tenantName: string;
  isPro: boolean;
} {
  const { tenant } = useTenant();
  const { plan } = usePlan();

  return {
    tenantName: tenant?.name ?? 'Unknown',
    isPro: plan?.id === 'pro',
  };
}
```

## Full Example

```tsx
import React from 'react';
import { TenantProvider, useTenant, usePlan, useApiKeys } from '@tenantscale/react';
import { createClient } from '@tenantscale/sdk';

// Create SDK client
const client = createClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

// App root
export default function App() {
  return (
    <TenantProvider client={client}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4">
          <Dashboard />
        </main>
      </div>
    </TenantProvider>
  );
}

// Header with tenant info
function Header() {
  const { tenant, isLoading } = useTenant();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between">
        <h1 className="text-xl font-bold">My SaaS App</h1>
        {isLoading ? (
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded" />
        ) : tenant ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{tenant.name}</span>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {tenant.plan.name}
            </span>
          </div>
        ) : (
          <button className="text-blue-600">Sign In</button>
        )}
      </div>
    </header>
  );
}

// Dashboard with plan usage and API keys
function Dashboard() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { plan, features, limits, usage } = usePlan();
  const { apiKeys, createKey, revokeKey } = useApiKeys();

  if (tenantLoading) return <div className="text-center py-12">Loading...</div>;
  if (!tenant) return <div className="text-center py-12">Please sign in to continue.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Plan Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Plan</h2>
        <p className="text-3xl font-bold">${plan.price / 100}<span className="text-sm text-gray-500">/mo</span></p>
        <p className="text-gray-600 mt-1">{plan.name} Plan</p>

        <h3 className="font-medium mt-4 mb-2">Features</h3>
        <ul className="space-y-1">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-green-500">✓</span> {f}
            </li>
          ))}
        </ul>

        <h3 className="font-medium mt-4 mb-2">Usage</h3>
        {Object.entries(limits).map(([key, limit]) => (
          <div key={key} className="mb-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{key.replace(/-/g, ' ')}</span>
              <span>{usage[key] || 0} / {limit === -1 ? '∞' : limit.toLocaleString()}</span>
            </div>
            {limit > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((usage[key] || 0) / limit) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* API Keys Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <button
            onClick={() => createKey({ name: `Key ${apiKeys.length + 1}`, scopes: ['read'] })}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            + New Key
          </button>
        </div>

        {apiKeys.length === 0 ? (
          <p className="text-gray-500 text-sm">No API keys created yet.</p>
        ) : (
          <ul className="divide-y">
            {apiKeys.map((key) => (
              <li key={key.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <code className="text-sm text-gray-500">{key.prefix}...{key.suffix}</code>
                </div>
                <button
                  onClick={() => revokeKey(key.id)}
                  disabled={key.revoked}
                  className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  {key.revoked ? 'Revoked' : 'Revoke'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

---

**Source:** [github.com/TenantScale/sdk/tree/main/packages/react](https://github.com/TenantScale/sdk/tree/main/packages/react)
