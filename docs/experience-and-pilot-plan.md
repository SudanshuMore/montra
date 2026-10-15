# Montra experience and first-use-case plan

16 October 2026. Montra is a product in development. The current environment uses synthetic financial data.

## Product focus

First prove that one account's history is accurate, repeatable and isolated from other customers. Then expand to multiple accounts and analysis. Do not equate invoice review with permission to make a payment.

| Area | Everyday purpose | Priority |
| --- | --- | --- |
| Transactions | Find money coming in or going out, then open its details | Now |
| Connected accounts | See the source, refresh data and stop future retrieval | Now |
| Statement comparison | Detect missing entries, duplicates and changed values before trusting totals | Now: data acceptance check |
| Supporting documents | Explain an existing transaction with an invoice or receipt | Next: after the import is reliable |
| Members and permissions | Give each person only the access they need | Now: customer separation |
| Activity log | See who made changes and when | Now |
| Document settings | Set the delay between hiding a deleted document and removing its bytes | Before real documents |
| Invoice approval request | Submit invoice → administrator approves/rejects → record decision | Separate future workflow |
| Payment execution | Send money through a separately authorized payment provider | Outside current read-only scope |
| Analytics | Account summaries, trends and drill-through to the underlying entries | After data validation |

## UX research translated into decisions

- [Nielsen Norman Group: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports keeping advanced controls behind a secondary interaction. Demo failure scenarios and connection internals are collapsed; core tasks remain visible.
- [W3C: listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) describes labelled selection and keyboard behaviour. Reuse the existing Radix Select rather than inventing custom keyboard interactions. Screen-reader and keyboard acceptance still need manual verification.
- [Carbon: data tables](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) groups search, filters and actions in a toolbar and allows detail disclosure. Keep the transaction table stable, with drill-through into the existing detail sheet.
- [Nielsen Norman Group: system status](https://www.nngroup.com/articles/visibility-system-status/) emphasizes feedback about the current state. Keep last update, progress and recoverable errors understandable without reading provider metadata.
- [GOV.UK: file upload](https://design-system.service.gov.uk/components/file-upload/) informs explicit format guidance and upload errors, not Montra's visual identity. A future importer must explain allowed formats and rejected rows before committing data.

Visual direction: dark teal navigation, one company selector without repeated names, restrained mint accents, consistent rounded controls, clear focus indicators, member initials and readable role descriptions. Preserve readable financial tables and reduced-motion support. This is source-implemented, not visually signed off.

## Five-minute synthetic acceptance trial

1. Open Connected accounts. Select Normal feed in Demo testing tools, then Update transactions. Wait for completion in Update history.
2. Open Transactions. Search one description, filter the account and open an entry. Check amount, date, direction and source.
3. Refresh the same feed again. Transaction count and totals must not increase merely because data was fetched twice. Try Duplicate records and repeat.
4. Load the demo statement under Check against statement, choose its account and fixture dates, authorize the comparison and compare. A matching demo fixture validates the comparison mechanics, not a real bank feed's completeness.
5. Try the differences fixture in testing/statement-with-differences.json. Investigate the categories in the report.
6. Switch workspaces. Records from the first company must not appear. Test restricted-member server permissions using the regression suite; the local demo identity is not a complete production multi-user login trial.
7. Optionally load the demo invoice, link it from transaction details and record a review note. This confirms an evidence match; it never sends a payment.

Renew demo permission extends synthetic read authorization. Disconnect stops new retrieval but retains imported records. Test scenarios simulate provider edge cases; About this demo connection states the simulator's limits, not real bank coverage.

## Real-life trial: next implementation boundary

The current statement comparison accepts structured synthetic JSON. It is not an SBI PDF/CSV importer. Real uploads and the real provider adapter remain disabled. Existing storage is private local demo storage, not a claim of production readiness.

Recommended next increment: a separate statement preview/import flow, beginning with synthetic data shaped like a redacted issuer export. Establish the actual available format first; do not infer SBI column names. Parse → preview dates, amounts, currency and debit/credit meaning → show rejected/ambiguous rows → user confirms account → import with provenance and repeat-import protection → compare totals. Mark statement-imported data separately from provider-retrieved data.

Before processing real documents: implement and verify production identity, tenant authorization, protected storage, file validation/scanning as applicable, bounded parsing, safe logs, deletion and backup policy. An optional browser-only preview could avoid storing a statement, but must be separately implemented and verified to send no document content over the network. It is not implemented yet.

For provider retrieval, follow docs/sbi-card-connection-route.md. SBI Card coverage, permitted operator/partner eligibility, contract pricing and sandbox access remain unconfirmed. Research these in parallel; do not present a generic bank sandbox as proof of SBI credit-card support.

## Feedback to collect

Can the user identify the current company, switch it, explain their role, tell whether a refresh finished, and explain a comparison difference without help? Record the screen, attempted action, expected result and actual result using synthetic examples. Test keyboard navigation, long organization/email names, 360px mobile width and 200% zoom before visual sign-off.
