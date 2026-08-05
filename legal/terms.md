# Terms of Service

**Last updated: July 2026**

## 1. Acceptance of Terms

By accessing or using TenantScale ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.

These Terms apply to all users of the Service, including visitors, customers, and API consumers.

## 2. Description of Service

TenantScale provides multi-tenant middleware infrastructure for B2B SaaS applications, including:

- **Open Source SDK** (`@tenantscale/sdk` and related packages) — released under the MIT License
- **Self-Hosted API Server** — released under the BSL 1.1 License (free to self-host)
- **Hosted Cloud Service** — managed multi-tenant infrastructure billed on a subscription basis

## 3. Open Source Usage

### 3.1 SDK (MIT License)
The `@tenantscale/sdk`, `@tenantscale/mcp`, and all framework adapter packages are licensed under the MIT License. You may use, modify, and distribute them without restriction, including in commercial applications. No account, registration, or payment is required to use the SDK.

### 3.2 Self-Hosted API (BSL 1.1)
The TenantScale API server is licensed under the Business Source License 1.1. You may self-host the API server for production use without a commercial agreement, provided it is not a multi-tenant platform that competes with TenantScale's hosted service. The BSL 1.1 grant automatically converts to a permanent Apache License 2.0 on a per-copy basis three years from the first release of that version (or 2029-01-01, whichever is earlier).

### 3.3 Contributions
Contributions to TenantScale open source repositories are governed by the [Developer Certificate of Origin (DCO)](https://developercertificate.org). By submitting a pull request, you agree to include a `Signed-off-by` line on your commits, certifying that you have the right to license your contribution under the same license as the project you are contributing to.

## 4. Cloud Service Accounts

### 4.1 Registration
To use the hosted Cloud Service, you must create an account. You agree to provide accurate, current, and complete information and to keep your account credentials confidential.

### 4.2 Responsibility
You are responsible for all activity occurring under your account, including activities of your team members and API keys associated with your tenant. Notify us immediately at security@tenantscale.com of any unauthorized use of your account.

### 4.3 Account Types
- **Free Tier**: Limited-feature account with usage caps as described on our pricing page
- **Paid Tiers**: Subscription-based accounts with higher limits and additional features

## 5. Billing and Payments

### 5.1 Subscription Fees
Paid Cloud Service tiers are billed in advance on a monthly or annual basis, as selected during checkout. Fees are non-refundable except as required by applicable law or as explicitly stated in this agreement.

### 5.2 Price Changes
We may change subscription fees with 30 days' notice. Price increases will not apply to your current billing period. Continued use after the notice period constitutes acceptance of the new fees.

### 5.3 Payment Processing
All payments are processed securely through Stripe, Inc. We do not store credit card numbers on our servers. Your payment information is subject to Stripe's Privacy Policy and Terms of Service, in addition to these Terms.

### 5.4 Usage-Based Billing
Certain tiers may include usage-based billing components (e.g., API call overages). Usage is measured by our metering system and billed in arrears. Disputes must be submitted within 30 days of the invoice date.

### 5.5 Failed Payments
If payment fails, we will notify you and provide a grace period. If payment is not received within 14 days, we may suspend access to the Cloud Service. Continued non-payment may result in termination and data deletion after 30 additional days.

### 5.6 Self-Hosted Billing
Self-hosted deployments of the API server are not subject to Cloud Service subscription fees. You are responsible for your own infrastructure costs.

## 6. Acceptable Use

### 6.1 Lawful Use
You may not use the Service for any unlawful purpose or in violation of any applicable laws or regulations.

### 6.2 Prohibited Activities
You may not:

- Use the Service to distribute malware, phishing content, or engage in fraud
- Attempt to bypass rate limits, authentication, or other security mechanisms
- Use the Service in a way that causes material harm to other users or our infrastructure
- Scrape or extract data from the Service for competitive analysis without our written consent
- Use the Service for any application that violates intellectual property rights

### 6.3 Open Source Restrictions
Nothing in this section restricts your use of the open source components (MIT or BSL-licensed) under their respective licenses.

## 7. Data Protection and Privacy

Your use of the Service is also governed by our [Privacy Policy](/legal/privacy). Key points:

- We act as a data processor for tenant data you store via our API
- We use Supabase for database services, Stripe for payment processing, and Sentry for error monitoring
- We implement appropriate technical and organizational measures to protect data
- Data retention is configurable per plan (see Privacy Policy for defaults)

## 8. Intellectual Property

### 8.1 Our IP
TenantScale, the TenantScale logo, and the TenantScale name are our trademarks. The Service's source code is licensed under the terms described in Section 3.

### 8.2 Your IP
You retain all rights to the data, code, and content you create using the Service. We claim no ownership over your applications or tenant data.

## 9. Service Level

### 9.1 Cloud Service Uptime
We aim for 99.9% uptime for the Cloud Service. Scheduled maintenance will be announced with at least 24 hours' notice via our status page and/or Discord community.

### 9.2 Self-Hosted
We provide no uptime guarantee for self-hosted deployments. The API server software is provided "as is."

### 9.3 Support
Support response times vary by plan tier, as described on our pricing page. Free tier users receive community support via Discord.

## 10. Limitation of Liability

To the maximum extent permitted by applicable law:

- The Service is provided "as is" without warranties of any kind, either express or implied
- We are not liable for any indirect, incidental, special, consequential, or punitive damages
- Our total liability for any claim arising from the Service is limited to the amount you have paid us in the 12 months preceding the claim
- These limitations do not apply to liability for gross negligence, fraud, or personal injury

## 11. Indemnification

You agree to indemnify and hold TenantScale harmless from any claims arising from:

- Your use of the Service in violation of these Terms
- Content you submit, store, or process through the Service
- Your violation of any third-party rights

## 12. Termination

### 12.1 By You
You may cancel your Cloud Service subscription at any time from the billing portal. Service continues until the end of your current billing period.

### 12.2 By Us
We may suspend or terminate your access to the Cloud Service if:

- You materially breach these Terms and fail to cure within 15 days of notice
- Your payment is 30+ days past due
- Your use poses a security risk to the Service or other users

### 12.3 Data Export
Upon termination, you may export your data via our API. We will retain your data for 30 days after termination, after which it will be deleted. Self-hosted deployments are unaffected.

## 13. Changes to Terms

We may update these Terms from time to time. Material changes will be notified via email or through the Service at least 30 days in advance. Continued use after changes take effect constitutes acceptance of the new Terms.

## 14. Governing Law

These Terms are governed by the laws of the State of California, USA, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of San Francisco County, California.

## 15. Contact

For questions about these Terms:

- **Email**: legal@tenantscale.com
- **Security**: security@tenantscale.com
- **Discord**: [TenantScale Community](https://discord.gg/tenantscale)
- **Mail**: TenantScale, c/o ThatDevMat

## 16. Open Source Notice

This is a legal document. Our open source licenses (MIT and BSL 1.1) are separate and take precedence over these Terms for use of the licensed software outside of the hosted Cloud Service. Nothing in these Terms restricts rights granted by those licenses.
