# Next implementation priorities

Updated 16 October 2026 following product-owner feedback.

## Deferred visual work

Retain the agreed direction: Dark / Light / System theme selection, compact top navigation (Transactions, Accounts, Review), workspace selector at top left, settings at top right, subtle depth and motion with reduced-motion support. Financial data, identity and storage take priority now.

## First real-data increment

Owner correction: automatic provider/bank retrieval is the target. Manual statement import is deferred, not the primary implementation path. The statement-parser proposal below is historical and must not take priority over permitted connector access. See india-aa-eligibility-and-sdk-review.md for the current eligibility and SDK decision.

1. Establish independent customer login and server-verified sessions. Existing app/chatgpt-auth.ts reads platform identity headers; standalone deployments must not trust client-supplied copies. Preserve organization membership and per-account authorization on every API route.
2. Choose and provision protected database and object storage after budget, region and deployment decisions. Existing API uses Cloudflare D1-compatible DB and BUCKET bindings, with a synthetic local identity. Database rows are not a substitute for authentication. Keep raw statements, tokens and personal transaction data out of Git and logs.
3. Build statement parsing with preview, row-level validation, explicit import confirmation, provenance and repeat-import protection. SBI Card officially documents customer PDF statement downloads; automated third-party SBI Cashback history access remains unconfirmed. Confirm the user's available export format before choosing a parser.
4. Add explainable transaction grouping: transaction kind (purchase, repayment, refund, fees/interest, transfer, unknown) separately from spending category (food, groceries, transport, utilities, shopping, subscriptions, other). Preserve original descriptions, allow user corrections, retain rule/version provenance, and keep uncertain entries uncategorized. Do not count card repayments as new purchases or refunds as salary. Multi-account transfer matching must prevent double-counting without silently discarding source rows.
5. Add category/account/date summaries with drill-through to included transactions. Separate currencies and pending versus booked entries. Use rules first; statistical clustering is a later optional feature when enough representative data exists.
6. Evaluate provider onboarding in parallel: exact issuer/product coverage, permitted Montra operator/partner model, history fields, refresh limits, storage/display rights, consent revocation and written pricing. Do not assume savings-account AA coverage includes credit cards.

## Information requested

- Available SBI statement formats and other target card issuer names, without credentials or account/card numbers.
- Preferred customer login: email sign-in link, Google or email/password.
- Hosting/auth/storage budget, separately from connector fees.

Sources reviewed: https://www.sbicard.com/en/faq/statement-billing-related.page and https://docs.setu.co/data/account-aggregator/overview . A provider gateway's existence does not confirm this card's coverage. No provider has been contacted and no live access enabled.
