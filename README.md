# Montra — Synthetic Banking and Evidence Pilot

Montra is a portfolio project exploring how a finance team could review read-only bank activity alongside invoices. It is designed for multiple customer organizations, with server-side organization and account authorization checks.

**Current boundary:** the only bank connector is a mock provider. It returns synthetic USD transactions for two demo organizations. There is no bank, Account Aggregator, ConnectPay, Plaid, or other provider connection, and there is no production financial data. Sandbox and live linking are disabled. The dashboard is not evidence of a successful bank integration.

## What works today

- Two isolated synthetic demo organizations for each local demo user.
- Paginated transaction ingestion with exact decimal amounts, explicit currency and direction, source revisions, and provider timestamps.
- Idempotent duplicate handling, bounded retry with checkpoints, pending-to-booked updates, and reversals.
- Organization and account authorization on API resources, exports, downloads, and sync actions.
- Private synthetic invoice fixtures, suggested allocations, and separate human review decisions.
- Synthetic statement comparison and test scenarios for duplicates, retries, updates, and reversals.
- Clear provider boundary: the unverified provider adapter fails closed.

## Run locally

Requirements: Node.js 22.13 or later and dependencies installed.

```powershell
npm run dev
```

Open `http://localhost:5173/`, choose **Sign in to Montra** (local development identity only), and create the demo workspace. Start in **Transactions** to review the generated activity, then use **Accounts & connections** to exercise synthetic failure scenarios. Use **Evidence** for synthetic invoice fixtures and **Reconciliation** for a synthetic comparison fixture.

Do not enter real bank or card credentials or upload real statements or invoices. The product is configured for synthetic testing only.

## Verify

```powershell
node --test tests/montra.test.mjs
npm run build
```

The automated suite uses an in-memory SQLite adapter to exercise the service and sync logic; it is not a deployed Cloudflare D1 integration test or a browser end-to-end test. The build checks that the app compiles. Neither proves provider eligibility, production security, or data completeness.

## Engineering story

The project demonstrates a small data pipeline: receive paginated source records, validate and normalize money, retain source revisions, deduplicate by scoped provider identity, save each page and its checkpoint together, and recover from temporary failures. It also demonstrates tenant-aware access checks, reviewable evidence matching, and reconciliation against a comparison dataset.

For a Data Engineer portfolio, present this as a **synthetic financial-data ingestion and reconciliation prototype**. Be clear that provider connectivity, real customer use, and production deployment have not been completed.

## Planned next steps

1. Finish and document synthetic UI/API verification and keep the demo boundary enforced.
2. Choose one Indian corporate bank account candidate; ask its authorized company representative for written consent to discuss read-only testing.
3. Screen provider eligibility, account type coverage, commercial permission, sandbox access, implementation requirements, and itemized pricing. Do not select on “global coverage” alone.
4. Implement one provider's documented sandbox flow only after its eligibility and sandbox instructions are confirmed.
5. Compare a small closed period against an authorized, redacted statement; repeat sync; disconnect; record results.
6. Prepare authentication, secrets, hosting, backups/restore, monitoring, privacy/legal review, retention, and customer agreements before any live data.
7. After the project is reviewable, create a clean Git repository from this project folder, inspect tracked files for secrets and local state, and then publish the portfolio repository with an accurate README and screenshots containing synthetic data only.

See [docs/portfolio-build-plan.md](docs/portfolio-build-plan.md) for the plain-language project history, ordered plan, and interview explanation. See [testing/pilot-company-and-provider-brief.md](testing/pilot-company-and-provider-brief.md) for account/provider screening questions and draft messages that have not been sent.
