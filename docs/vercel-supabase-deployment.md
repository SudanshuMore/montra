# Vercel and Supabase deployment

Montra has two explicit runtime adapters. Local Vinext development keeps the existing Cloudflare D1/R2 sample database. Next.js production builds resolve `@montra/runtime` to the Supabase/PostgreSQL adapter. A production request never falls back to a synthetic identity.

## Production prerequisites

Connect a Supabase Marketplace resource to the Vercel project. The adapter reads `POSTGRES_URL`, `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), and `SUPABASE_SECRET_KEY` (or the server-only legacy `SUPABASE_SERVICE_ROLE_KEY`). These values belong in protected environment settings. Never expose the secret/database keys through `NEXT_PUBLIC_` variables or source control.

Set `MONTRA_AUTH_ORIGIN` to the exact HTTPS origin. Set `MONTRA_AUTH_MODE=email` only when email delivery and templates are configured and verified. Otherwise leave production disabled. `MONTRA_STORAGE_BUCKET` optionally names the private bucket; its default is `montra-evidence`.

The Vercel build command is `npm run build:vercel`. It runs an explicit, checksum-tracked initial provisioning script before `next build --webpack`. Provisioning creates only the `montra` schema and the private evidence bucket. It refuses an untracked or changed existing application schema. It never imports local customer/sample data or resets an existing database. Follow-up schema changes need separate reviewed migrations.

Application tables live in `montra`, outside the default Data API schema. Public schema access is revoked and row-level security is enabled on every application table. The trusted server connection performs the existing workspace and account authorization checks. The storage client is server-only; clients receive authenticated Montra downloads, never public object URLs. Real uploads and live bank connections remain disabled.

The PostgreSQL adapter binds values separately from SQL, preserves atomic batches, and uses a coarse advisory transaction lock for writes. This preserves the pilot's serialized allocation and disconnect guarantees; it limits write concurrency and should be revisited before scaling. The driver uses TLS, disables prepared statements for the transaction pooler, and limits each instance to two connections.

## Verification and current limits

`tests/postgres.test.mjs` runs the real PostgreSQL engine through PGlite: schema dependencies, onboarding, customer isolation, repeat ingestion, rollback, email confirmation and revoked sessions. `tests/private-storage.test.mjs` checks private object operations and invalid path rejection. Existing SQLite/auth tests remain applicable to local development. Tests use synthetic data and do not establish live email delivery or a security certification.

On memory-constrained Windows hosts, run the suite sequentially with:

```
node --max-old-space-size=384 --max-semi-space-size=1 --v8-pool-size=1 --liftoff-only --no-wasm-tier-up --wasm-num-compilation-tasks=1 --test --test-concurrency=1 tests/*.test.mjs
```

Supabase provisioning and Vercel environment injection are infrastructure setup; they do not prove that the hosted schema was applied. Confirm the actual build/deployment outcome and then test two independent email users. Configure a transactional sender, exact callback and email template before inviting testers. No live bank data should be submitted.
