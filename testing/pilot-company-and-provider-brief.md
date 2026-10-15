# Montra: pilot company eligibility and provider quote brief

Research date: 3 October 2026. No vendor has been contacted, selected or approved. No binding quote received.

## Product and recommendation
Montra is a multi-customer business finance application: authorized read-only bank transactions, account context, supporting invoices, reviewed allocations and closed-period statement reconciliation. No payments, lending or credit underwriting in the initial scope.

Recruit an Indian private limited company with an existing INR current account and a finance owner. Prefer a company with multiple bank accounts so it represents the target customer; connect only one initially. A sole-proprietor account test does not validate private-limited-company support.

Prioritize a bank-approved direct corporate statement/balance API for the first real account. ICICI is a candidate because its Account Services documentation explicitly lists statements and balances. This is a recommendation to investigate, not confirmation that Montra may onboard customer accounts. Evaluate Setu and Finvu in parallel for AA eligibility and coverage; do not buy an AA integration before the permitted operating model is confirmed.

## Eligibility gates: written confirmation required
1. Bank and exact account product: existing business current account, INR, held in the company legal name; supported on the proposed API route.
2. Legal entity: private limited / LLP / partnership / sole proprietor recorded explicitly. Non-individual account discovery, representative authorization and joint/multiple-signatory requirements must be explained by the bank/provider.
3. Account state: active, KYC current, authorized business-banking access available. These are proposed screening criteria; final requirements belong to the provider.
4. Authority: company representative can execute the bank/provider's required consent or mandate. A Montra administrator role alone is insufficient. Ask whether a board resolution, authorization letter or multiple approvals is required; do not assume the documents are universal.
5. Read-only scope: balance and all relevant account transactions, including transactions initiated outside the connector. No payment-initiation entitlement required.
6. Montra's role: bank/provider expressly permits a multi-customer SaaS to receive, store and display each company's data for cash visibility and invoice reconciliation. Confirm processor/controller or equivalent contractual roles, customer onboarding, security review and subcontractors.
7. AA route: identify the eligible regulated FIU, permitted purpose, data recipient, storage/processing rights and consent flow. A TSP contract, customer consent or sandbox access alone is not evidence of production eligibility.
8. Data quality: verify stable transaction IDs or an approved alternative, pagination, historical range, refresh delay, debit/credit meaning, dates, narration, updates and reversals. Request a sample payload with no live private data.
9. Operational controls: renewal/expiry, disconnection/revocation, rate limits, retry billing, retention and deletion, region, support and incident handling.
10. Acceptance: compare one closed period against an authorized bank-issued statement; resolve missing, duplicate, changed and unexplained entries before accepting the connector.

## Preferred pilot characteristics (Montra choices, not bank rules)
- Private limited company preferred; existing INR current account.
- 50–500 transactions/month, including several supplier invoices and customer receipts.
- At least 60–90 days of history if the route supports it, plus a bank-issued closed-month statement.
- A finance owner able to spend one hour/week for a four-week pilot.
- Willingness to approve limited read-only access and revoke it after the pilot.
- No requirement to move money, open a new account or share banking passwords/OTPs with Montra.

## Public commercial information
| Candidate | Setup fee | Monthly minimum | Per-account / usage fee | Eligibility / fit |
|---|---|---|---|---|
| ICICI direct Account Services APIs | Not verified publicly; request quote | Not verified publicly; request quote | Not verified publicly; request quote | Statements and balances documented; bank must approve exact company account and third-party SaaS arrangement |
| Setu AA gateway | Not verified publicly; request quote; ask separately about certification | Not verified publicly; request quote | Not verified publicly; request quote | Conditional on eligible FIU model, purpose and non-individual account support |
| Finvu AA | Not verified publicly; request quote | Not verified publicly; request quote | Not verified publicly; request quote | APIs described for regulated businesses; same eligibility and corporate-account questions |

Unknown is not zero. No price range is presented as a quote. Public payout fees, bank-account verification fees and consumer-free AA access are not prices for Montra's transaction-data access. Payment-focused connected-banking and virtual-account products are not equivalent to importing all activity from customers' existing bank accounts.

## Comparable quote assumptions
Use 30-day months and once-daily account retrieval as initial planning assumptions, subject to supported refresh frequency:
| Scenario | Companies | Accounts | Logical account refreshes/month |
|---|---:|---:|---:|
| Pilot | 1 | 1 | 30 |
| Early rollout | 10 | 30 | 900 |
| Growth | 100 | 300 | 9,000 |

These are logical refreshes, not billable API calls. Pagination, balance requests, consent operations, initial backfill and retries may add charges. Ask vendors to price all three scenarios and state precisely what is counted.

Request separate line items for setup/integration; certification; per-customer onboarding; bank activation; platform subscription; minimum commitment; included units; connected-account fees; consent creation/renewal; successful, failed, empty and repeated fetches; pagination; balances; backfill; support/SLA; partner/FIU fees; taxes; cancellation and data export. State whether minimums are additive or credited against usage, and whether they apply per Montra platform, customer or bank.

## Draft vendor message — not sent
Subject: Eligibility and itemized quote: read-only Indian corporate-bank data for Montra

We are building Montra, a multi-customer SaaS for corporate bank visibility and invoice reconciliation. Our initial pilot is one Indian company and one existing INR current account; private limited companies are a target segment. We need read-only statements/transactions and balances where supported, with no payment initiation or credit underwriting.

Please first confirm whether your product and contractual/regulatory operating model permit this use case for our SaaS. Specify the eligible data recipient/FIU where applicable, supported banks and exact non-individual current-account products, representative authorization requirements, storage/display rights, and whether all account activity is available rather than only transactions processed through your service.

Please quote the three scenarios above and itemize every commercial component listed above. Include sandbox access terms, production onboarding requirements, implementation lead time, refresh/history limits, sample documentation, minimum contract term and quote validity. Please distinguish supported today, approval-dependent and planned capabilities.

## Draft pilot-company invitation — not sent
We are developing Montra to help finance teams see bank transactions and connect them to supporting invoices. We are seeking a company for a four-week pilot using one existing INR business current account, subject to bank/provider approval. Access would be read-only: Montra would not initiate payments or ask for your banking password or OTP. We would validate a closed month's transactions against your bank-issued statement and review a small set of invoices with your finance team. Would your finance owner and authorized signatory be willing to discuss the pilot?

## Sources
- ICICI Account Services: https://www.icicibank.com/business-banking/cms/corporate-api-suite/account-services-api
- ICICI Corporate API Suite: https://www.icicibank.com/corporate/transact/online-platform/corporate-api-suite
- Setu production participation: https://docs.setu.co/data/account-aggregator/licenses-and-go-live/participants-in-aa
- Setu commercial onboarding agreements: https://docs.setu.co/dev-tools/bridge/glossary
- Setu v1 certification discussion (verify current applicability and cost): https://docs.setu.co/data/account-aggregator/v1/get-started
- Finvu business offering: https://finvu.in/
- Sahamati eligibility and enterprise FAQ: https://sahamati.org.in/faq/

## Information still needed from Montra
Is Montra incorporated, in which country, and is it an ordinary software company or does it have any financial-sector registration/regulated partner? This determines which production access arrangements vendors can evaluate. No confidential incorporation documents or credentials are needed for the initial screening.
