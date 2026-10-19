# P1 delivery checklist

Updated 18 October 2026. Independent identity and customer isolation take priority while the Finvu enquiry awaits a response. A check below describes code or test evidence, not production approval.

## 1. Identity and login

- [x] Pin the official Supabase JavaScript SDK; keep the integration server-side.
- [x] Provide a sign-in screen with explicit configured/unavailable/sample modes.
- [x] Bind link confirmation to the requesting browser and verified email.
- [x] Require explicit confirmation; GET alone does not consume a link.
- [x] Store session hashes with expiry and revocation; rotate on a new login.
- [x] Reject forged platform identity headers in email mode and fail closed in unconfigured production.
- [x] Exercise the actual SDK adapter with synthetic HTTP responses.
- [x] Create/select the owner's Supabase project and approved region (Mumbai, free plan).
- [ ] Configure exact redirect URL, email template and ten-minute expiry.
- [ ] Validate actual delivery to approved test recipients; configure SMTP before broader use.

## 2. Workspace onboarding and access

- [x] Verified identities can create the existing pair of isolated sample workspaces.
- [x] Enforce workspace membership and per-account access server-side.
- [x] Prevent duplicate provisioning with a unique onboarding claim.
- [x] Test independent users, cross-workspace reads/updates, expired sessions and sign-out replay.
- [x] Add a repeatable local auth-schema migration without resetting existing sample data.
- [ ] Run the complete two-user scenario with the real identity service.
- [ ] Add email invitations and membership lifecycle controls in a subsequent P1 increment; current membership management still uses existing user IDs.

## 3. Production data foundation before real financial records

- [x] Provision a Supabase resource and connect it to Vercel; retain synthetic local bindings.
- [x] Implement PostgreSQL runtime, checksum-tracked schema provisioning and private storage adapter.
- [ ] Verify the hosted schema, private bucket and deployed application end to end.
- [ ] Verify production ingress, secrets, backup/restore, retention and access monitoring.
- [ ] Decide and implement operator suspension/global session revocation, MFA/reauthentication and operational abuse protection.
- [ ] Complete deployment/security acceptance; code tests do not establish it.

## After this increment

P2: transaction kind and spending category, user corrections and source-preserving audit history. P3: account/category/date summaries linked to the included records. Finvu sandbox and live onboarding remain a separate dependency; no banking SDK is installed and SBI Card coverage is unconfirmed.

Owner action needed next: follow docs/email-login-and-workspace-onboarding.md to create the Supabase project. Configure credentials only in protected local/runtime settings, never in public source or chat.
