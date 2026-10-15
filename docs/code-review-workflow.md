# Graph-assisted code review

Montra uses [code-review-graph](https://github.com/tirth8205/code-review-graph) as an optional local development tool. It is not an application dependency.

Install `code-review-graph==2.3.9` in an isolated Python environment (Python 3.10 or later), activate that environment, then run from the repository root:

```sh
code-review-graph build --repo .
code-review-graph impact --repo . --files montra/service.ts montra/reconciliation.ts --depth 1 --max-results 60
code-review-graph query callers_of validDate --repo .
code-review-graph update --repo .
npm test
npm run build
```

Use `query --help` and `impact --help` for supported options. Ambiguous names require a qualified symbol name returned by the tool. Request compact summaries and affected paths before reading code. Keep `.code-review-graph/` local; it contains generated indexes and absolute paths. Embedding services and editor integration are optional and were not configured for this review.

## Review recorded on 15 October 2026

- Built a fresh Montra graph with version 2.3.9: 100 files, 734 nodes, 4,377 edges. The saved graph from another project was not reused.
- Queried the impact of `service.ts`, `money.ts`, `reconciliation.ts`, and the workspace component. The graph identified eight additional affected files, including sync, access checks, the API dispatcher and the service test suite.
- Queried `validDate` callers and the service handler's related tests; inspected the changed logic and authorization boundary.
- The graph reported unresolved call sites and truncated edge output. It is navigation assistance, not an exhaustive correctness or security review. No token-saving percentage was independently measured.
- Ran all 27 service tests successfully and completed the application build. Tests include full-ledger totals above the display cap, integer precision, account restrictions, and malformed reconciliation input.
- Browser acceptance remains pending because the browser tool blocked access to the local preview under its URL policy.
