# Montra readiness audit

**Reviewed:** 15 October 2026. I inspected source and configuration without printing secret values, ran the synthetic service tests and a build, and added regression tests for confirmed defects. No provider was contacted, no account linked, or deployment published.

## Four readiness levels

| Level | Verdict | Evidence |
|---|---|---|
| Synthetic data | **READY for API/service testing; browser flow NOT VERIFIED** | MockProvider supplies synthetic records; 27 in-memory SQLite service tests pass and the build completes. This is not a browser, deployed D1, or production test. |
| Provider sandbox | **BLOCKED** | UnverifiedProvider and DisabledSecretStore fail closed. No provider, documented endpoint/auth flow, sandbox account, or credentials are configured. |
| One personal live account | **BLOCKED** | No live adapter or approval exists. No credit-card data model exists for purchases, refunds, repayments, fees, liability and available credit. |
| One Indian corporate current account | **BLOCKED** | Pilot company, bank/account product, signatory, provider approval, production access, and multi-customer commercial permission are unknown. |

The application has synthetic data only. No sandbox or production feed was found in project configuration. No .env file was found in the source tree; this does not audit unrelated machine locations.

## Check results

| Area | Result and evidence |
|---|---|
| Connector | Only the mock adapter works. Other provider names use a disabled fail-closed adapter in montra/providers.ts. There are no bank endpoints or authorization callbacks. |
| India AA eligibility | Unconfirmed. The Government of India framework and Sahamati's FAQ describe FIU access as limited to eligible regulated entities. Montra's incorporation/regulatory status is unknown; ask whether a provider-approved partner route permits this exact SaaS use. This is screening, not a legal conclusion. [Sahamati FAQ](https://sahamati.org.in/faq/) · [Government of India AA framework](https://www.financialservices.gov.in/account-aggregator-framework). |
| Provider choice/cost | None selected; no quote or contract exists. Setup, monthly minimum, per-account and usage charges are unknown, not zero. Request a written quote and ask who each minimum applies to and whether it offsets usage. |
| Authorization | Demo records identify demo user, organization, connection, method, scopes and expiry. No real bank consent, callback binding, provider protocol, live account grant or bank-side revocation exists. Follow the selected provider's actual protocol; do not invent OAuth. |
| Tenant security | Service checks scope resources, exports, downloads, and connection actions. Tests cover two organizations, outsider IDs, account grants, jobs and exports. Database foreign keys are not composite tenant keys; deployed database testing remains necessary. |
| Transaction correctness | Exact decimal money, currency/direction, scoped provider IDs, source revisions, pagination, deduplication, atomic page/checkpoint saves, retries, pending-to-booked and reversals are tested synthetically. Value date, card liability and transfer double-count logic are absent. |
| Freshness/operations | Attempt, success and source data-through fields are separate; retries are bounded and disconnect fences jobs. No production scheduler, provider rate/timeout handling, webhook validation or alerting is configured. |
| Evidence | Synthetic text only, private authorized downloads, suggestion separate from human review. No malware scanner; real documents blocked. A debit is not proof a recipient received funds. |
| Auth/secrets/hosting | Local synthetic identity only; hosted identity depends on the dispatcher. Secrets manager intentionally fails closed. Production MFA, secret rotation, ingress/header validation, backup restore, HTTPS, region, worker, and monitoring are unverified. |
| Legal/operations | Provider agreement and allowed uses, account-owner authorization, customer terms/privacy notice, processors/locations, retention/deletion, incident contacts and Indian legal review remain open. Code is not a compliance finding. |

## Fixes and verification

Fixed organization switching to reset all workspace state; a final-page disconnect race that could report false sync success; missing attempt timestamps when authorization expired; non-demo organizations being listed/used by sync; concurrent onboarding conflict handling; and wording that called a synthetic comparison file independent evidence.

The suite passed 27/27 service tests, and the production build completed. Tests use in-memory SQLite. Browser end-to-end, Cloudflare D1/R2, provider callback replay, sandbox, backup restore and live-data tests remain unverified. The local web server was unreachable during final browser inspection.

## What we need before choosing a provider

1. Montra's registered country/entity type and whether it has any financial regulator registration or regulated partner.
2. Candidate company's country/legal form, bank name, exact corporate product and whether it is a current account. No account number needed.
3. Whether a company signatory/bank administrator is willing to authorize and discuss read-only access.
4. Whether a personal card sandbox is desired as a separate optional exercise; issuer/product only if known.
5. A rough connector budget after receiving itemized quotes.

Require written provider answers about exact account and entity eligibility; eligible banks; recipient/FIU/partner requirements; data fields/history/refresh; consent/revocation; SaaS display, storage and processing rights; sandbox and production approval; security; and all fees. Do not infer support from a logo, broad coverage claim, sandbox success, or successful payment.

## Safe test sequence

**A. Synthetic now:** From this project folder run npm run dev and open http://localhost:5173/. Sign in with the local development identity; use Create your demo workspace. In Transactions check sample rows/totals. In Accounts & connections exercise duplicate, transient retry, pending-to-booked and reversal scenarios, one at a time; repeat sync and check no duplicates. In Evidence use only provided synthetic text invoices, create a suggested allocation, then make a separate human review. In Reconciliation load the synthetic statement and inspect differences. It is a fixture, not independent evidence. Run node --test tests/montra.test.mjs and npm run build. Browser run remains to be verified.

**B. Sandbox after eligibility screening:** Obtain official documentation and sandbox terms. Use provider test identities. Implement documented consent/callback behavior and least privilege. Verify user/company/account binding, scope, purpose, expiry, pagination, repeat sync, disconnect, replay protection where protocol supports it, and redaction. Keep sandbox results distinct from production approval.

**C. Personal live test, optional:** Only if the provider expressly supports the exact issuer/product and terms allow it. Use existing transactions only. The application needs a card data/reporting model first. A redacted statement tests parsing, not live connectivity.

**D–G. Corporate live pilot after every gate:** Get written company authority and provider production approval; finish production security/privacy, secrets, MFA/session controls, monitoring, durable worker, retention, restore drill, and incident contacts. Import a small closed window from one authorized Indian business current account. Compare booked rows with the company's authorized statement, repeat sync, then disconnect and confirm future retrieval stops. Never create payments to manufacture test records.

Synthetic tests prove only defined sample behavior. Sandbox success proves only one sandbox protocol path. Neither establishes production access, eligibility, legal permission, multi-customer rights, complete history, real-time freshness or deployed security. A personal card test cannot establish corporate account support.

## Development update — 15 October 2026

Full-ledger totals now include authorized rows beyond the 1,000-row display limit without losing integer precision. The UI distinguishes full-history totals from filtered displayed-row summaries and evidence counts. Invalid statement dates and malformed rows return validation errors without saving a report. The expanded suite passes 27/27 and the build completes. Browser inspection was blocked by the browser tool URL policy; visual and end-to-end browser acceptance remain unverified.
