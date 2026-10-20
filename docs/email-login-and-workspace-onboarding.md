# Email-link login and workspace onboarding

## What is implemented

Montra uses the official @supabase/supabase-js SDK, pinned at 2.118.0, for email link issuance and verification. It does not generate its own email credentials or use a banking SDK for identity. The SDK is server-only. Authentication identities and Montra's SQL membership records have different responsibilities.

1. Open /signin. The screen shows the configured sign-in mode; an unavailable provider never falls back to a real-looking mock login.
2. POST /auth/request sends the email request using the provider. Montra binds the attempt to a random, HttpOnly browser challenge, stores its hash and email hash, and expires the attempt after ten minutes.
3. The email points to /auth/confirm?token_hash=... . GET shows a confirmation form without consuming the link. POST checks the request origin and browser challenge, verifies the provider token, checks the verified email matches the initiating request, and atomically consumes the attempt.
4. A successful verification creates an opaque Montra session. The database stores only its SHA-256 hash, verified user ID, creation time, expiry and revocation time. Supabase access and refresh tokens are not stored. Session life is bounded by the provider access-token expiry and one hour; the user must sign in again afterward. No refresh-token lifecycle is implemented.
5. Each API request resolves the session server-side. Workspace membership and account grants are checked by the existing service; a client-supplied organization ID, role or email cannot grant access.
6. New users create their own two explicitly synthetic workspaces using the existing sample onboarding. The flow works when a verified identity already exists in users. A database onboarding claim prevents concurrent duplicate provisioning. It is not a live-bank onboarding flow.
7. Sign out revokes the current Montra session and expires its cookie. A new sign-in rotates the browser's prior session. Other devices retain their own sessions until expiry or database revocation. Global sign-out and an administrator session-management UI are not implemented.

Cookies use Path=/, HttpOnly and SameSite=Lax. HTTPS uses Secure and __Host- names. Insecure cookies are permitted only for localhost/127.0.0.1 development. Repeated or malformed cookies fail closed. Authentication responses have no-store and no-referrer headers. The confirmation page has a restrictive CSP and does not load third-party resources.

## Configuration required before actual email testing

A free Supabase project has been provisioned in Mumbai and connected to the Vercel project. Its production origin and exact callback have been saved. The Resend domain is verified and custom SMTP is configured. Use `emails/sign-in.html` for both the magic-link and first-time confirmation templates, with a ten-minute email OTP expiry. Actual delivered-email and two-user hosted acceptance must be recorded separately; automated tests do not send real mail. Do not send service-role keys, SMTP passwords or database passwords through chat. See `vercel-supabase-deployment.md` for the production adapter and database provisioning path.

For local Cloudflare development put these values in ignored .dev.vars (Vercel production uses protected project environment settings):

```dotenv
MONTRA_AUTH_MODE=email
MONTRA_AUTH_ORIGIN=http://localhost:5173
MONTRA_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
MONTRA_SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
```

Use the publishable key, not the service-role/secret key. Hosted Supabase project URLs are the supported initial adapter; self-hosted/custom auth domains require a separately reviewed configuration change. The application fails closed if email mode is selected without credentials; it never trusts platform identity headers in email mode.

In Supabase:

- Enable email authentication and keep email verification enabled.
- Set the Site URL to the exact Montra origin. Allow the exact /auth/confirm redirect for that origin; do not use production wildcard redirects.
- Configure both the magic-link and confirm-sign-up templates to point at the server confirmation route using the provider token hash. `emails/sign-in.html` is the version-controlled branded template. For a single local project the link can use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}">Sign in to Montra</a>
```

- Set email OTP expiry to ten minutes, matching Montra's browser attempt expiry. For local and deployed environments use separate projects or carefully reviewed per-environment templates/redirects; do not send production links to localhost.
- The built-in sender is restricted to the project's team addresses and has a low sending limit; it is not general customer email delivery. Configure a suitable SMTP service for broader testing/production. Finvu access is unrelated to email delivery.
- Set provider abuse protection/rate limits. Montra additionally limits each email to three requests per fixed 15-minute bucket and all requests to thirty per fixed minute; verification has a sixty-per-minute bucket. These are development defaults, not substitutes for deployment-level abuse controls.
- Request metadata cleanup is performed on subsequent login requests. Schedule cleanup before production use. Do not log callback URLs, token hashes, email bodies, cookies or authorization headers in application/proxy telemetry.

Apply drizzle/0001_email_sessions.sql to the existing application D1 database before onboarding/sign-in. For an existing initialized local sample database, run `npm run db:migrate:auth:local`. This command detects exactly one local application database, adds only the auth tables in a transaction, tracks a normalized checksum and refuses unknown/partial schemas. It preserves sample records and can be rerun. Fresh test databases run all migrations. Do not reset existing databases. Restart local development after setting bindings. The code does not provision a hosted database, configure SMTP or certify a cloud region.

## Authentication modes and deployment boundary

Development defaults to the existing platform's synthetic identity on loopback hosts. /signin labels it and links to the local sample login. Production defaults to disabled authentication unless explicitly configured.

For the original trusted platform only, MONTRA_AUTH_MODE=platform and MONTRA_TRUST_PLATFORM_IDENTITY=true allow its verified identity headers. This is safe only behind an ingress that strips client-supplied oai-authenticated-user-* headers and injects verified identity. Never enable that mode on an ordinary public deployment. Email mode ignores these headers. Direct service tests continue accepting injected test Identity values, but the deployed route resolves identity itself.

## Verification and limits

Tests exercise the route-independent auth handler with a synthetic provider, including explicit confirmation, single-use links, expired attempts, mismatched emails, missing cookies, origin checks, request limits, session tampering, signout/replay, rotation, concurrent confirmation and two-user onboarding/isolation. They do not prove real delivery or Supabase dashboard settings. Existing service tests cover account/document/export/job isolation and role denials.

Live email acceptance must use two approved test recipients: request links, open them in their initiating browsers, create separate sample workspaces, attempt cross-workspace reads/updates, sign out, and check an old copied cookie is denied. Test expiry and scanner GET behaviour. The local synthetic login is not evidence of a successful email sign-in.

Provider account suspension/revocation is not currently pushed into Montra's independent session table. Existing sessions expire within one hour unless revoked there; before live financial data, define immediate operator suspension/revocation handling and evaluate MFA/session reauthentication. Server-side bank authorization remains separately required and live data remains disabled.

## Why P2 distinguishes transaction kind from category

A purchase of INR 1,000 followed by an INR 1,000 card repayment is one purchase, not INR 2,000 in spending. A refund of INR 200 is a return against spending, not salary. A fee of INR 50 is a separate charge. These distinctions make charts and summaries useful without changing the imported amount, date, direction or description.

Transaction kind describes purchase/repayment/refund/fee/transfer/unknown. Category describes groceries/transport/software/etc. Start with explainable suggestions and user correction records; uncertain entries remain unknown. Store corrections separately with actor, timestamp and rule/source revision. The original bank record remains intact. Card-kind inference must use issuer fields/account type when available, not assume every credit is income. P2 is designed here, not implemented in this increment.

## Official references

- https://supabase.com/docs/reference/javascript/auth-signinwithotp
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
