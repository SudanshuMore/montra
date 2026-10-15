# Production launch dependencies

This synthetic pilot is not approved for real financial data.

1. Verified provider and bank eligibility, credentials in a managed secret store, company authority and approved read-only mandate.
2. Security review: private ingress and identity-header stripping, least privilege, account grants, abuse/rate controls, penetration test, dependency review and incident response.
3. Approved hosting configuration: HTTPS, managed encryption at rest, region and data residency, backup and tested restore, private object storage, access logging.
4. Deployed continuous worker with monitoring, bounded scheduling, dead-job alerts, recovery drills and retention/deletion processing.
5. Malware scanning service, quarantine and safe document rendering; permit real document types only after scanning passes.
6. Business-approved retention schedule, legal holds, deletion verification (including backups and orphan objects) and data export responsibilities.
7. Real closed-period statement reconciliation and acceptance criteria agreed with finance; HTTP success is not completeness.
8. Authentication lifecycle: corporate SSO/MFA decision, member invite/approval flow, session/offboarding policy, platform access eligibility.
9. Provider SLA/refresh contract, support escalation and human review of pending/booked identity changes and reversals.
10. Explicit legal/privacy review. No regulatory compliance or certification is asserted.

Unresolved choices: provider/country/bank, production identity provider, retention days and legal hold policy, currencies beyond pilot whitelist, cross-account allocations, source-ID changes across booking, scheduling infrastructure and production document scanning vendor.

