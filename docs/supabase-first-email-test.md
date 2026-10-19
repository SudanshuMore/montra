# Owner setup: first email-link test

This is the remaining external setup for P1. Finvu and bank credentials are not involved. Do not create or share a service-role key for this flow.

1. Open https://supabase.com/dashboard and sign in or create your own account. Complete account terms yourself. Create a free development project named Montra Dev in an appropriate available region. Save its database password privately; this integration does not need that password.
2. Obtain the project's HTTPS URL and publishable key from its project/API settings. Keep these out of the public repository. Place them in the ignored .dev.vars file on your computer using the configuration block in email-login-and-workspace-onboarding.md.
3. Set the local Site URL to http://localhost:5173 and allow the exact redirect http://localhost:5173/auth/confirm in Auth URL settings. Do not enable wildcard redirects or disable email confirmation.
4. Enable email authentication. Set the magic-link email template to use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}`. Set email OTP expiration to ten minutes. This template is for the local development project; production needs its own exact HTTPS origin/configuration.
5. The built-in sender can initially send only to authorized project-team addresses and has a low limit. Test with your own project-owner address first. For two independent recipients or broader use, configure an approved SMTP sender. Do not grant someone project-administration access merely to test customer login.
6. Run `npm run db:migrate:auth:local` after the local sample database is initialized, then restart the preview and visit http://localhost:5173/signin . It should offer email sign-in rather than the synthetic identity.
7. Request a link, open it in the same browser, and press Confirm sign-in. Create your sample workspace. Verify it is a separate identity from the old synthetic development account. That old sample data is preserved, not automatically shared with the new account.
8. Sign out. Reopen the used link; it must not create another session. Request a new link if necessary. Repeat with a second permitted test identity in another browser profile, then verify workspace isolation as described in the acceptance checklist.

If a link does not arrive, check spam, authorized-recipient restrictions, the provider's rate limit and Auth logs. Do not paste full email links or tokens into chat or a public issue. Generic request wording deliberately does not disclose whether an email address exists.

The first successful delivered-email test is still pending. Automated tests use a synthetic identity provider or synthetic responses through the real SDK, and do not create an external Supabase account.

Official setup references:
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
