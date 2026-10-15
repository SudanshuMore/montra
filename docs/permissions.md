# Permissions matrix

| Action | Administrator | Finance viewer | Evidence reviewer |
|---|---|---|---|
| View granted accounts, transactions, balances, connection health | Yes | Yes | Yes |
| View evidence and review history on granted accounts | Yes | Yes | Yes |
| Download clean/synthetic evidence on granted accounts | Yes | Yes | Yes |
| Upload synthetic invoices, propose and confirm allocations | Yes | No | Yes |
| Reconcile statement / export granted accounts | Yes | Yes | Yes |
| Sync, renew demo authorization, disconnect | Yes | No | No |
| Manage memberships and account grants | Yes | No | No |
| View organization security audit, retention/deletion controls | Yes | No | No |
| Authorize a bank mandate or initiate payment | No | No | No |

Membership, organization and account scope are checked on every API access. Administrator membership alone is not authority to sign a bank mandate. Non-admin memberships receive only explicitly selected account grants. Documents belong to one permitted account; split payments may allocate within that account and currency. Cross-account invoice allocation is a future decision.

Platform identity is trusted only behind the private Sites dispatcher; direct Worker ingress must not be exposed with caller-controlled identity headers. Local mock authentication binds to loopback and is for synthetic use only.

