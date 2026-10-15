# Montra

Montra is a financial operations product under development, bringing read-only bank activity, supporting invoices, and reconciliation into one workspace for businesses with multiple accounts. It is designed for multiple customer organizations, with server-side organization and account authorization checks.

**Current boundary:** the only bank connector is a mock provider. It returns synthetic USD transactions for two demo organizations. There is no bank, Account Aggregator, ConnectPay, Plaid, or other provider connection, and there is no production financial data. Sandbox and live linking are disabled. The dashboard is not evidence of a successful bank integration.

## What works today

- Two isolated synthetic demo organizations for each local demo user.
- Paginated transaction ingestion with exact decimal amounts, explicit currency and direction, source revisions, and provider timestamps.
- Idempotent duplicate handling, bounded retry with checkpoints, pending-to-booked updates, and reversals.
- Organization and account authorization on API resources, exports, downloads, and sync actions.
- Private synthetic invoice fixtures, suggested allocations, and separate human review decisions.
- Synthetic statement comparison and test scenarios for duplicates, retries, updates, and reversals.
- Full-ledger totals independent of the display cap, with explicit filtered display scope.
- Clear provider boundary: the unverified provider adapter fails closed.

## Run locally

Requirements: Node.js 22.13 or later. Install dependencies with `npm ci`.

```powershell
npm run dev
```

Open `http://localhost:5173/`, choose **Sign in to Montra** (local development identity only), and create the demo workspace. Start in **Transactions** to review the generated activity, then use **Connected accounts** to exercise synthetic failure scenarios. Use **Supporting documents** for synthetic invoice fixtures and **Check against statement** for a synthetic comparison fixture.

Do not enter real bank or card credentials or upload real statements or invoices. The product is configured for synthetic testing only.

## Verify

```powershell
npm test
npm run build
```

The automated suite uses an in-memory SQLite adapter to exercise the service and sync logic; it is not a deployed Cloudflare D1 integration test or a browser end-to-end test. The build checks that the app compiles. Neither proves provider eligibility, production security, or data completeness.

## Architecture

The ingestion pipeline handles: receive paginated source records, validate and normalize money, retain source revisions, deduplicate by scoped provider identity, save each page and its checkpoint together, and recover from temporary failures. The service enforces tenant-aware access checks and supports reviewable evidence matching and reconciliation against a comparison dataset.

## Planned next steps

1. Finish and document synthetic UI/API verification and keep the demo boundary enforced.
2. Choose one Indian corporate bank account candidate; ask its authorized company representative for written consent to discuss read-only testing.
3. Screen provider eligibility, account type coverage, commercial permission, sandbox access, implementation requirements, and itemized pricing. Do not select on “global coverage” alone.
4. Implement one provider's documented sandbox flow only after its eligibility and sandbox instructions are confirmed.
5. Prepare authentication, secrets, hosting, backups/restore, monitoring, privacy/legal review, retention, and customer agreements before any live data.
6. Run one authorized account pilot: compare a small closed period against a statement, repeat sync, disconnect, and record results.
7. Expand to multiple business accounts, evidence workflows, credit cards, and additional regional providers after each preceding milestone is accepted.

See [the product roadmap](docs/product-roadmap.md) for use cases, priorities, acceptance criteria, dependencies, and the full delivery plan. See [testing/pilot-company-and-provider-brief.md](testing/pilot-company-and-provider-brief.md) for account/provider screening questions and draft messages that have not been sent.

Development reviews can use the [local graph workflow](docs/code-review-workflow.md).

See the [SBI Card connection investigation](docs/sbi-card-connection-route.md) for verified findings, unresolved coverage and eligibility questions, pricing, the proposed API flow, and the live-pilot prerequisites.
