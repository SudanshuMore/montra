# Montra product roadmap

Updated: 15 October 2026.

## Product and first use case

Montra is a financial operations product under development for businesses with multiple bank accounts. It helps finance users review account activity, associate evidence with transactions, and reconcile records. The current implementation uses synthetic data while the bank-access route is being established.

First priority: trustworthy transaction retrieval and reconciliation for one account. Missing entries, duplicates, stale data, incorrect totals, and access across customer boundaries must be detectable or prevented before expansion.

### First acceptance scenario

1. An authorized user selects one account and a short closed history window.
2. Montra retrieves transactions with provider identity, exact amount, currency, status, source time, and retrieval time.
3. The user compares booked entries against a statement for the same account and period.
4. Missing, changed, duplicate, and unexplained entries are visible for review.
5. Repeating retrieval produces no duplicate records or unexplained total changes.
6. Disconnect stops new retrieval. Another customer cannot access these records or exports.

Today this scenario uses mock records and comparison fixtures. Real statements may not contain provider transaction IDs: the production reconciliation strategy must support actual bank identifiers and ambiguous matches with human review. The current ID-based fixture comparison is not a universal statement parser.

## Current implementation

| Component | Built | Remaining |
|---|---|---|
| UI and API | Transactions, connections, evidence, reconciliation, members, audit | Browser acceptance and deployment verification |
| Customer separation | Membership checks and account grants | Production identity and deployed database isolation tests |
| Ingestion | Mock paging, revisions, deduplication, retries, disconnect | Provider protocol, durable scheduling, rate limits/timeouts |
| Money and history | Exact decimals; complete API totals; explicit display-limit scope | Server-side history filtering/pagination, value dates, transfers |
| Reconciliation | Closed-period comparison and stored report | Real formats and matching without shared provider IDs |
| Evidence | Synthetic invoices and human review | Secure real uploads, extraction, exception handling |
| Bank connectivity | Provider interface; real adapter disabled | Eligibility, provider selection, quote, sandbox and production approval |
| Cards | No card-specific implementation | Purchases, refunds, fees, repayments, liability and statement cycles |

There is no defensible overall completion percentage yet. Bank access and production operations remain substantial unknowns.

## Delivery order

| Phase | Work | Acceptance condition | Dependency |
|---|---|---|---|
| 1. Reliable synthetic workflow | Verify UI onboarding, organization switch, sync, evidence, comparison and disconnect; add INR fixtures; paginate/filter full history | Recorded browser results plus service tests; correct totals beyond one display page | Can proceed now |
| 2. Connector decision | Confirm bank/product, permitted recipient/partner route, history, refresh, consent, SaaS rights and fees | Written coverage/eligibility response, sandbox docs and commercial quote | Bank name, Montra legal status, provider answers |
| 3. One sandbox adapter | Implement documented authorization and field mapping; expiry, retries, repeat sync and disconnect | Repeatable sandbox acceptance | Phase 2 access/documentation |
| 4. Production foundations | Production auth, tenant checks, managed secrets, durable jobs, alerts, private storage, retention/deletion and restore drill | Recorded security/operations checks and appropriate agreements | Hosting choice and provider requirements |
| 5. One live account | Small read-only import, statement comparison, repeat sync and disconnect | Account owner/reviewer accepts results and recorded limitations | Phases 3–4 and account authority |
| 6. Multiple business accounts | Normalize fields, keep currencies separate, avoid transfer double-counting, test a second customer | Two accounts reconciled and customer isolation tests pass | First pilot success |
| 7. Evidence operations | Real invoices, safe document processing, partial/multiple matches and review queues | Finance reviewer resolves evidence scenarios | Secure document infrastructure |
| 8. Cards and regions | Card liability model; one additional regional provider at a time | Product-specific reconciliation and verified coverage/permission | Verified feed and customer need |

Phases 1 and 2 can progress together. Dates and connector costs depend on external access and quotes. Payment initiation, lending and investment advice are outside the initial scope.

## Blockers for a live test

- Exact bank and product are unknown. Savings, personal current, corporate current and credit cards are distinct coverage questions.
- Montra's legal/integration status is unconfirmed. Software can be developed individually, but a provider must confirm the permitted route for live data and multi-customer use.
- Provider selection and price are open. Request setup fees, monthly minimums, per-account/user charges, per-fetch charges, taxes, sandbox fees and contract terms. Unknown costs are not zero.
- Production infrastructure is not accepted. Local identity and a successful build are insufficient for customer financial data.
- A personal test does not establish business-account or card support. Keep acceptance results separate.

For India Account Aggregator screening, consult the [Government of India framework](https://www.financialservices.gov.in/account-aggregator-framework) and get provider-specific eligibility confirmation. Do not assume a universal global connector or that read-only access eliminates onboarding requirements.

## Information needed from the founder

1. One bank name and exact account product to evaluate first; no account number or credentials.
2. Card issuer if card coverage should be investigated for a later phase.
3. Whether Montra currently has a registered legal entity or is being developed personally; intended incorporation country if known.
4. After quotes arrive, an affordable monthly pilot budget.
5. Later, an account owner willing to complete provider authorization and review the imported records.

## Development and review

Use small commits describing product behavior. Keep secrets, customer data, generated databases, local platform identifiers and graph indexes out of Git. Graph-assisted review identifies affected code/tests; it supplements inspection and execution rather than proving correctness or guaranteeing token savings.

Record what was tested, what passed, what remains unverified, and the next dependency for every milestone. See the readiness audit and testing guide for current evidence.
