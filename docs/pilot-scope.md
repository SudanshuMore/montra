# Montra pilot scope
Two synthetic organizations, one synthetic connectivity provider, read-only account activity, explicit source status, evidence allocations and human reviews. No payment initiation, AI matching, universal coverage or real-time claim.

The hosted pilot is owner-private. Authentication comes from the Sites dispatcher; membership and account grants are application authorization. Each signed-in user may create their own isolated pair of synthetic organizations. Onboarding never grants access to existing organizations. Administrators do not gain bank signing authority.

All documents are synthetic-only until a real malware-scanning service, retention policy and private storage controls are verified. Real provider registration and real organizations are disabled in code. One real corporate account is the next controlled acceptance milestone, not an implemented integration.

Architecture: one TypeScript application, React UI, relational SQLite/D1 database, private R2 documents, durable database sync queue and a worker runner. No microservices. Background execution and provider scheduling are operational dependencies; persisted jobs survive request and worker restarts.

Scope excludes payment initiation, FX conversion, inferred beneficiary receipt, automated confirmation, accounting journals, tax determinations and compliance certification.

