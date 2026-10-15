# First real provider integration checklist

- [ ] Select one provider after confirming country, bank, legal entity and commercial corporate account eligibility.
- [ ] Obtain official documentation, sandbox access, commercial agreement and written access approval.
- [ ] Record documentation URL/version and verification date in coverage matrix.
- [ ] Confirm read-only scopes, supported authorization mechanism, who can authorize, expiry, renewal and revocation semantics.
- [ ] Confirm account identifiers, pagination, stable transaction identifiers, pending-to-booked identity mapping, updates, reversals and history limits.
- [ ] Confirm balance availability, type and timestamp; do not infer a missing balance.
- [ ] Confirm cursor expiry, refresh delay, rate limits, Retry-After behavior and expected completeness.
- [ ] Confirm whether events exist. Implement only documented verification, replay window, duplicate and out-of-order handling. Unsupported events return an explicit rejection.
- [ ] Provision server-only secrets manager, rotation, least privilege and audit access.
- [ ] Implement and contract-test the real adapter; keep disabled until all prior items are evidenced.
- [ ] Verify bank authorization independently from Montra administrator membership.
- [ ] Test one authorized corporate account and reconcile a closed period with a bank statement.
- [ ] Review missing/duplicate/changed/unexplained records and approve pilot acceptance in writing.

Never put credentials, bank payloads or private documents in prompts, browser bundles, source, shell arguments or error-monitoring events.

