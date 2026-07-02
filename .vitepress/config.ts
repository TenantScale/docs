import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TenantScale',
  titleTemplate: ':title — TenantScale Docs',
  description: 'Multi-tenant middleware for B2B SaaS — tenant isolation, plan enforcement, audit logging, and billing in minutes.',
  lang: 'en-US',
  appearance: 'dark',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0a1628' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'og:title', content: 'TenantScale Docs' }],
    ['meta', { property: 'og:description', content: 'Multi-tenant middleware for B2B SaaS — tenant isolation, plan enforcement, audit logging, and billing in minutes.' }],
    ['meta', { property: 'og:url', content: 'https://docs.tenantscale.com' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'SDK', link: '/sdk/', activeMatch: '/sdk/' },
      { text: 'Adapters', link: '/adapters/', activeMatch: '/adapters/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'CLI', link: '/cli/', activeMatch: '/cli/' },
      { text: 'Self-Hosting', link: '/self-hosting/', activeMatch: '/self-hosting/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'What is TenantScale?', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
            { text: 'Architecture', link: '/guide/architecture' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Tenant Isolation', link: '/guide/tenant-isolation' },
            { text: 'Plan Enforcement', link: '/guide/plan-enforcement' },
            { text: 'Audit Logging', link: '/guide/audit-logging' },
            { text: 'Rate Limiting', link: '/guide/rate-limiting' },
            { text: 'Webhooks', link: '/guide/webhooks' },
            { text: 'Billing with Stripe', link: '/guide/billing' },
          ],
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Self-Hosting', link: '/self-hosting/' },
            { text: 'Supabase Setup', link: '/self-hosting/supabase' },
            { text: 'Environment Variables', link: '/self-hosting/env-vars' },
          ],
        },
      ],

      '/sdk/': [
        {
          text: 'SDK Reference',
          items: [
            { text: 'Overview', link: '/sdk/' },
            { text: 'Installation', link: '/sdk/installation' },
            { text: 'TenantScale Client', link: '/sdk/client' },
            { text: 'Authentication', link: '/sdk/authentication' },
            { text: 'API Keys', link: '/sdk/api-keys' },
            { text: 'Plans & Features', link: '/sdk/plans' },
            { text: 'Audit Events', link: '/sdk/audit' },
            { text: 'Webhooks', link: '/sdk/webhooks' },
            { text: 'Rate Limiting', link: '/sdk/rate-limiting' },
            { text: 'Error Handling', link: '/sdk/errors' },
            { text: 'TypeScript API', link: '/sdk/typescript' },
          ],
        },
      ],

      '/adapters/': [
        {
          text: 'Framework Adapters',
          items: [
            { text: 'Overview', link: '/adapters/' },
            { text: 'Express', link: '/adapters/express' },
            { text: 'Hono', link: '/adapters/hono' },
            { text: 'Next.js', link: '/adapters/nextjs' },
            { text: 'React', link: '/adapters/react' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Authentication', link: '/api/auth' },
            { text: 'Tenants', link: '/api/tenants' },
            { text: 'API Keys', link: '/api/api-keys' },
            { text: 'Portal Sessions', link: '/api/portal' },
            { text: 'Webhooks', link: '/api/webhooks' },
            { text: 'Subscriptions', link: '/api/subscriptions' },
            { text: 'Invoices', link: '/api/invoices' },
            { text: 'Analytics', link: '/api/analytics' },
            { text: 'Events & Audit', link: '/api/events' },
            { text: 'Plans', link: '/api/plans' },
            { text: 'Alerts', link: '/api/alerts' },
            { text: 'Admin', link: '/api/admin' },
            { text: 'Health & Status', link: '/api/status' },
            { text: 'Metrics', link: '/api/metrics' },
          ],
        },
      ],

      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'Installation', link: '/cli/installation' },
            { text: 'Commands', link: '/cli/commands' },
            { text: 'Configuration', link: '/cli/configuration' },
          ],
        },
      ],

      '/self-hosting/': [
        {
          text: 'Self-Hosting',
          items: [
            { text: 'Overview', link: '/self-hosting/' },
            { text: 'Supabase Setup', link: '/self-hosting/supabase' },
            { text: 'Environment Variables', link: '/self-hosting/env-vars' },
            { text: 'Deploy to Vercel', link: '/self-hosting/vercel' },
            { text: 'Stripe Setup', link: '/self-hosting/stripe' },
            { text: 'Production Checklist', link: '/self-hosting/production' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/TenantScale' },
      { icon: 'discord', link: 'https://discord.gg/tenantscale' },
    ],

    editLink: {
      pattern: 'https://github.com/TenantScale/docs/edit/main/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License (SDK) and BSL 1.1 (API).',
      copyright: 'Copyright © 2025-present TenantScale',
    },

    search: {
      provider: 'local',
    },

    lastUpdated: true,
  },

  cleanUrls: true,
})
