# India AA eligibility, integration and assurance review

Reviewed 16 October 2026. This is an engineering decision record, not a regulatory approval. Montra's owner reports no current RBI/SEBI or other financial-sector registration. Live retrieval is blocked and no external vendor has been contacted.

## Findings and corrections

### Eligibility comes before live integration

The [Government of India's AA framework overview](https://www.financialservices.gov.in/account-aggregator-framework) defines an FIU as an entity registered with and regulated by a financial-sector regulator. [Setu's licence documentation](https://docs.setu.co/data/account-aggregator/licenses-and-go-live/licenses) lists categories under RBI, SEBI, IRDAI and PFRDA. Its examples do not establish that every insurance agent, ordinary company or software company qualifies for Montra's proposed use.

Company incorporation, a user's ownership of their card, an SDK, a gateway subscription and sandbox success do not establish FIU eligibility. Do not advertise Montra as licensed, certified or approved.

There is no generic software-project “FIU licence” to request as a shortcut. First define the actual financial service and determine the corresponding regulatory category with qualified Indian counsel. Relevant licensing can entail eligibility, capital, qualifications, governance, continuing supervision and reporting; obtain category-specific advice before choosing any application. Do not acquire an unrelated financial licence merely to obtain account data.

An alternative to investigate is providing technology to an existing eligible FIU. This needs written confirmation of permissible purpose, outsourcing/processing roles, contract and data access boundaries. A partner's licence does not automatically allow Montra to independently collect, reuse or display customer data. No partner arrangement is currently established.

### A gateway simplifies technical work, not legal eligibility

[Setu's multi-AA documentation](https://docs.setu.co/data/account-aggregator/multi-aa-gateway) offers a common API across selected AA partners. It also requires agreements with Setu and each AA used. Do not assume a single contract gives universal coverage or that an ecosystem participant count is a fixed integration requirement.

The gateway must explicitly verify SBI Card / SBI Cashback credit-card history, including supported FI types and issuer status. Deposit accounts, credit underwriting access and bill-payment integrations do not establish card transaction-history availability. Existing docs/sbi-card-connection-route.md remains the product-specific coverage investigation.

### SDK selection is provider-specific

[Setu's quickstart](https://docs.setu.co/data/account-aggregator/v1/quickstart) documents sandbox API credentials and direct API integration. [Its consent-screen documentation](https://docs.setu.co/data/account-aggregator/embed-setu-aa) describes hosted/embedded consent UI. Neither justifies installing a guessed npm SDK. The v1 quickstart is evidence of the integration model, not a recommendation to ship an old protocol: obtain the current supported version before coding a provider adapter.

Before installing anything, record:

- Provider and product, official documentation, supported protocol version and runtime.
- Package name linked by official vendor documentation, publisher/repository, supported release, licence and maintenance status.
- Exact reviewed version, lockfile, dependency and installation-script review, vulnerability assessment and upgrade owner.
- Server/browser boundary: API secrets, private keys, decryption and financial payloads must not enter browser bundles or analytics. Only documented public configuration belongs in a client consent SDK.
- Documented endpoint allowlist, separate environments, timeouts, retry/rate limits and sanitized errors.
- Documented callback verification and replay handling, account/consent/user/workspace binding, expiry and revocation tests. Do not trust a redirect query as evidence of approved consent.
- Vendor telemetry/logging defaults and production data/key custody. Do not use public sample decryption services for live data.

No banking SDK is installed. The current real adapter and secret store remain disabled. A provider's official REST API may be preferable to an SDK where documented and supported. Never implement cryptographic primitives from scratch.

### Certification and security audit have different scopes

The organisation is **Sahamati**. Its [certification framework](https://sahamati.org.in/certification/) assesses conformance and interoperability, including API/FI schemas, authentication, transport-related controls and Central Registry integration. It is not evidence that every application feature, source file or storage component has passed a full security assessment.

[Setu's go-live checklist](https://docs.setu.co/data/account-aggregator/licenses-and-go-live/go-live) describes eligibility evidence, customer-journey review, legal checks, certification and registry onboarding. Ask the selected provider which activities it performs and which remain Montra's responsibility. Verify the current certifier list rather than relying on a name in an older provider guide.

Agree a separate application/cloud security scope (including source and dependency review, VAPT, tenant isolation, key management, backups and incident handling). Auditor qualifications, including any CERT-In requirement, must be confirmed against applicable regulator, contract and deployment requirements. Do not equate Sahamati certification with a comprehensive security audit or claim a universal audit mandate from this engineering review.

### Storage: distinguish the AA from the FIU

The AA is a conduit for encrypted financial data. An FIU's allowed processing and retention must follow its permitted purpose, consent and applicable obligations. The [Sahamati community code of conduct v1.2, storage section](https://sahamati.org.in/wp-content/uploads/2026/02/Sahamati_-AA-Community-Code-of-Conduct_v1.2.pdf) distinguishes usable data life from regulatory archival retention. This is not a blanket prohibition on every FIU storing financial data.

For Montra, define a data inventory before live operation: consent purpose, permitted fields, expiry, usable-data lifetime, encryption and key custodian, processing region, subprocessor roles, deletion/archival rules and restrictions on derived categories/analytics. Expired or revoked consent must stop unauthorized future fetching; continued storage or processing requires its own valid basis. The existing synthetic document deletion delay is not an AA consent policy.

## Execution sequence

1. Establish whether Montra will be an eligible regulated operator or a technology supplier to an eligible FIU. Obtain written confirmation that the proposed money-flow use case is permitted.
2. Obtain exact SBI Card coverage, provider-supported API/SDK details, sandbox terms, all relevant agreements and itemized pricing. The free development budget does not establish free certification or live service access.
3. Register in a permitted developer sandbox using the owner's account and approved terms. No accounts or legal agreements have been created/accepted by this coding work.
4. Implement the documented sandbox adapter with synthetic records and tenant-bound authorization. Verify consent, callback security, expiry, revocation, duplicate handling, retries and source revisions.
5. Implement independent email-link login and protected production storage. Review cloud region, keys, backups, purpose-bound retention and sensitive-log controls.
6. Complete required conformance certification, security remediation and provider production approval. Only then arrange an explicitly authorized live pilot.

## Code and UI delivered in this increment

- Administrator-only GET /api/integration-readiness?org=... reports current verified development facts. POST and subpaths are rejected. It contains no keys or credential-entry fields.
- Settings → Developer readiness displays eligibility, coverage, sandbox, API/SDK, assessment and governance gaps. It offers no self-certification or live-enable button.
- Server access.ts and providers.ts continue to block real workspaces/providers. Readiness text never overrides enforcement.
- Tests cover anonymous, outsider and restricted-member access and attempts to enable live retrieval through the report.

## Questions for the provider and legal adviser

Can an unregulated Montra act as a technology supplier for this precise use case, and under which named FIU and contract? Who is the consenting data recipient? May Montra present transaction history to multiple customer companies? Is SBI Card actually supported? Which processor, region and key-custody model is permitted? Who owns certification and independent audit? What are sandbox, setup, minimum, fetch/account and certification charges? No inquiry has been sent.
