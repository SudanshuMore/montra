# Data flow and trust boundaries

```mermaid
flowchart LR
  U[Authorized user] -->|HTTPS and identity| D[Private Sites dispatcher]
  D -->|Trusted identity headers| A[Montra API: membership and account checks]
  A -->|Prepared statements| DB[(D1 relational database)]
  A -->|Private synthetic document bytes| R2[(R2 private bucket)]
  A --> Q[Durable sync jobs in D1]
  W[Background worker / poller] -->|Scoped authenticated processing| Q
  Q --> P[Capability-based provider adapter]
  P --> M[Synthetic provider]
  P -. Disabled .-> B[Verified real provider: future]
  P --> S[Source records and append-only revisions]
  S --> T[Normalized transaction current state]
  A --> E[Allocations and human match reviews]
  A --> AU[Audit events without raw payloads]
  A -->|Short-lived user-bound download grant| U
```

Browser input is untrusted. IDs never substitute for authorization. Every business row carries organization scope; account-bearing records carry account scope. Raw transaction narration is rendered as text. Raw provider payloads stay in protected source revision storage and are never included in error telemetry.

Provider credentials must be resolved server-side through a secrets-manager adapter. No provider credential exists in this pilot. The incomplete real adapter throws before any network request. Scanning is a deployment integration point: real documents fail closed. Synthetic text invoices are visibly labelled and validated; a text-only demo upload does not imply a malware-free production service.

Transport security and managed encryption at rest depend on the hosting platform's verified configuration. These are deployment requirements, not claims of certification.

