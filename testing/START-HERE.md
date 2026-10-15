# Montra: first use case and acceptance test

## The first use case
A finance user checks a company's bank activity, opens a booked supplier payment, attaches its invoice, and records a reviewed allocation. Start with Atlas Workspace: USD 2,800 paid for September office rent. Confirming the invoice match is not a statement that the supplier received money.

The connector supplies authorized read-only account and transaction data. Payment initiation is outside this pilot.

## Test setup
- Organization A: Acme Design Co. (or your chosen demo name).
- Organization B: Cedar Works. Each has its own synthetic account and records, even though fixtures are intentionally identical.
- Account: Demo Bank, Operating account ending 4821, USD.
- Eight normal-feed transactions: seven booked, one pending.
- Booked money in: USD 19,590.00. Booked money out: USD 4,335.40. Net movement: USD 15,254.60.
- Provider-reported balance: USD 28,450.65. This is an independent synthetic snapshot, not derived from those eight transactions.
- Statement period: 2026-09-01 through 2026-09-27, UTC.
- Use only synthetic text invoices. Real PDFs and real bank data remain disabled.

## Step-by-step testing
| Step | Action | Expected result |
|---|---|---|
| 1 | Open the local app, sign in and create demo organizations | Two separate organizations; initial background imports are queued |
| 2 | Select Acme and open Transactions; refresh if import is still running | Eight rows, seven booked and one pending; totals above |
| 3 | Open Accounts & connections | Operating account, balance snapshot, last attempt, last success and data-through shown separately; stale synthetic feed clearly labelled |
| 4 | Open Evidence; upload invoices/atlas-full.txt; enter total 2800.00 and select Operating account | Private synthetic invoice stored |
| 5 | Open Atlas Workspace transaction demo-002 | USD 2800.00 debit; original narration and source revision visible |
| 6 | Select atlas-full.txt; allocate 2800.00; click Suggest allocation | Suggested only; no automatic confirmation |
| 7 | Enter 'Checked AT-0926 against the booked bank debit and lease invoice'; confirm reviewed match | Confirmed allocation and reviewer/time/note history; ledger evidence status updates |
| 8 | Refresh the browser and reopen the transaction | Invoice, allocation and review persist |
| 9 | Switch to Cedar Works | Acme's uploaded invoice and reviews are absent; identical fixture narration is not shared data |
| 10 | Open Reconciliation; upload statement-normal.json; use the stated closed period and confirm authorization | Seven imported booked records vs seven statement rows; no differences |
| 11 | Upload statement-with-differences.json instead | Missing demo-999; duplicate demo-001; changed demo-002; unexplained demo-003 |
| 12 | Choose Duplicate records scenario and sync | Still eight transactions; no duplicate source revisions |
| 13 | Choose Transient page failure and sync | Bounded retry resumes from checkpoint; existing ledger is preserved |
| 14 | Choose Pending → booked update and sync | demo-005 becomes booked at USD 475.50; older source revision remains; original statement now has an unexplained entry |
| 15 | Choose Reversal and sync | Original demo-007 is marked reversed; separate demo-009 credit references it; original debit is retained |
| 16 | Disconnect Cedar's connection LAST | Queued retrieval is cancelled; new retrieval is blocked; old records remain |

Do duplicate/retry tests before update/reversal. Returning the mock to Normal does not roll back newer source timestamps. Disconnection cannot currently be undone in the UI. Use Cedar for destructive workflow checks.

## Additional evidence cases
- atlas-part-a.txt (1400.00) + atlas-part-b.txt (1400.00): allocate both to the 2800.00 Atlas payment instead of atlas-full.txt. Confirm separately; total must not exceed the transaction.
- atlas-wrong-amount.txt (3000.00): a 3000.00 allocation to the 2800.00 debit must fail. A permitted partial allocation is not proof of a correct invoice; the reviewer must reject a wrong invoice.
- cloudline-a.txt and cloudline-b.txt (249.00 each): two plausible invoices. Suggestions remain unconfirmed; only one full allocation can be confirmed against demo-003.
- forma-partial.txt (2000.00): allocate 1200.00 against demo-007. The payment is fully explained but the invoice still has 800.00 unallocated. Reversal should invalidate the confirmed match.
- invalid-document.html: unsupported type/content must fail. Do not enable real uploads to make this test pass.

## Permissions and isolation
The initial demo identity is an administrator of both organizations. Switching organizations alone does not prove security isolation. Automated tests send cross-organization IDs and check denied resource access. For manual viewer/reviewer tests, use separately authenticated users; private hosted audience changes and corporate identity setup are separate prerequisites. Local mock sign-in supplies only one identity.

Finance viewer: may read permitted accounts but cannot upload, review, sync or manage members. Evidence reviewer: may upload and review only on granted accounts. Administrator: manages organization access but gains no bank signing authority.

## Test log
For each step record date, organization, expected result, actual result, pass/fail, and screenshot or error. Report the first failing step before proceeding to dependent steps. No live account credentials are needed for these tests.
