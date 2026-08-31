# Privacy Policy

**Last updated: July 2026**

## 1. Introduction

TenantScale ("we," "us," or "our") provides multi-tenant infrastructure for B2B SaaS applications. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our:

- **Cloud Service** (hosted multi-tenant API and dashboard)
- **Open Source Software** (SDK, CLI, MCP server — for self-hosted use)
- **Website** (tenantscale.com, docs.tenantscale.com, and app.tenantscale.com)
- **Documentation** and related services

If you self-host the TenantScale API server or use the SDK on your own infrastructure, this Privacy Policy governs your interaction with our website and services, but not the data you process on your own systems.

## 2. Information We Collect

### 2.1 Information You Provide

| Context | Data Collected | Purpose |
|---------|---------------|---------|
| Account registration | Email address, password (hashed), tenant name | Create and manage your account |
| Billing | Payment method (processed by Stripe — we never see full card numbers), billing address | Subscription management |
| Support requests | Email, description of issue, relevant logs (if you share them) | Customer support |
| Waitlist signup | Email address | Notify you when the Cloud Service launches |

### 2.2 Information Collected Automatically

| Data | Purpose |
|------|---------|
| API usage metrics (endpoint, status code, response time, tenant ID) | Billing, rate limiting, service improvement |
| Error logs (stack traces, request paths) | Error monitoring and debugging via Sentry |
| Website analytics (page views, referrer, browser) | Site improvement (we use minimal analytics) |
| IP address and request headers | Rate limiting, abuse prevention, geo-routing |

### 2.3 Cookies and Local Storage

We use essential cookies for:

- **Authentication**: Maintaining your portal session (Supabase Auth cookies)
- **Security**: CSRF protection tokens
- **Preferences**: Site appearance preference (dark mode)

We do not use third-party tracking cookies, advertising cookies, or cross-site tracking mechanisms.

## 3. How We Use Your Information

We use collected information to:

- Provide and maintain the Cloud Service
- Process billing and subscription management (via Stripe)
- Monitor and improve service reliability and security
- Communicate with you about service updates, billing, and support
- Enforce rate limits and prevent abuse
- Comply with legal obligations

## 4. Data Sharing and Third Parties

We share data only with essential service providers:

| Provider | Purpose | Data Shared | Location |
|----------|---------|-------------|----------|
| **Supabase** | Database, authentication, file storage | Account data, tenant data, API keys (hashed), audit logs | US (AWS) |
| **Stripe** | Payment processing | Customer name, email, billing address, payment method token | Global (PCI DSS compliant) |
| **Sentry** | Error monitoring | Error stack traces, request metadata, IP address | US |
| **Vercel** | Hosting (API, Portal, Docs) | Request metadata, deployment logs | US and EU |
| **Cloudflare** | DNS, CDN (landing page) | IP address, request metadata | Global |

We do not sell your personal information to third parties. We do not use your data for advertising or training third-party AI models.

### 4.1 Open Source Exemption
If you self-host the TenantScale API, you control your own data sharing. This Privacy Policy applies to our handling of data you provide to us, not data you manage on your own infrastructure.

## 5. Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account information | Until account deletion + 30 days |
| Audit logs | Configurable per plan (default: 7 days Free, 30 days Hobby, 90 days Pro, 1 year Scale) |
| API usage metrics | 13 months |
| Error logs (Sentry) | 90 days |
| Billing records | 7 years (legal requirement) |
| Waitlist signups | Until launch + 6 months |

Upon account deletion, tenant data is permanently deleted within 30 days. Self-hosted data is not affected.

## 6. Data Subject Rights (GDPR/CCPA)

If you are in the EEA, UK, or California, you have the following rights:

- **Access**: Request a copy of your personal data
- **Rectification**: Correct inaccurate data
- **Erasure**: Request deletion of your data (subject to legal retention requirements)
- **Portability**: Export your data in a machine-readable format
- **Objection**: Object to processing for specific purposes
- **Restriction**: Restrict processing in certain circumstances
- **Withdraw Consent**: Where processing is based on consent

To exercise these rights, email privacy@tenantscale.com. We will respond within 30 days.

### California Residents (CCPA)
We do not sell personal information. You have the right to:
- Know what personal information we collect
- Request deletion of your personal information
- Opt out of sale (not applicable — we do not sell data)
- Non-discrimination for exercising your rights

## 7. Data Security

We implement appropriate technical and organizational measures, including:

- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Service role authentication for server-to-server API access
- Row-Level Security (RLS) on all tenant data in Supabase
- API key hashing (SHA-256) — raw keys are never stored
- Rate limiting and DDoS protection
- SSRF protection for webhook delivery
- Regular dependency scanning and security updates

### 7.1 Self-Hosted Security
If you self-host the API, security of your infrastructure is your responsibility. We provide security features (RLS policies, rate limiting, SSRF protection) but do not operate your deployment.

## 8. International Data Transfers

We primarily store data in the United States (US). If you are in the EEA or UK, we ensure appropriate safeguards are in place, including:

- Standard Contractual Clauses (SCCs) with our sub-processors
- Data Processing Agreements (DPAs) with all third-party providers

## 9. Children's Privacy

The Service is not intended for individuals under 16 years of age. We do not knowingly collect data from children. If you believe a child has provided us with personal data, contact privacy@tenantscale.com.

## 10. Subprocessors

We use the following subprocessors:

| Subprocessor | Service | Location |
|-------------|---------|----------|
| Supabase Inc. | Database and authentication | United States |
| Stripe Inc. | Payment processing | United States |
| Functional Software Inc. (Sentry) | Error monitoring | United States |
| Vercel Inc. | Cloud hosting | United States and EU |
| Cloudflare Inc. | CDN and DNS | Global |

If you self-host, you may choose your own subprocessors.

## 11. Changes to This Policy

We will notify you of material changes via:
- Email (for registered users)
- Notice on the Service or website
- Updated "Last updated" date at the top of this policy

## 12. Contact

**Data Controller**: TenantScale (operated by ThatDevMat)

- **Privacy**: privacy@tenantscale.com
- **Security**: security@tenantscale.com
- **Legal**: legal@tenantscale.com
- **Discord**: [TenantScale Community](https://discord.gg/rf2p46wh7u)

For GDPR Article 27 representation, or CCPA requests, contact privacy@tenantscale.com.

## 13. Open Source Note

If you are using our open source software (MIT or BSL-licensed) on your own infrastructure without using the hosted Cloud Service, we are not a data processor for your application. This Privacy Policy covers your interaction with our website and services, not your use of our software in your own environment.
