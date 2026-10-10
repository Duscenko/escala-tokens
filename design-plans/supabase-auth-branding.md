# Supabase Auth — branding

The letters are rendered in this repo (`src/lib/authEmail.ts`). Two things
still read "Supabase" until the dashboards are set: the Send Email hook
(section 1) and the GitHub OAuth app name (section 3).

## 1. Confirmation and reset are one card

Both letters are rendered by `src/lib/authEmail.ts`: dark header with the
Escala Tokens mark (`/email/escala-mark.png`) and the wordmark, violet rule,
button, paste-this-link line, then the ignore line plus the site, privacy and
terms. Confirmation is not a second, simpler layout.

**The mail people should receive** for a new account is `POST /api/signup`
(same card, link `?type=signup`). Resend confirmation uses that route too
(`?type=magiclink`, still the confirm card). Reset from the login form is
`POST /api/password-reset`. The Send Email hook `POST /api/auth-email` covers
whatever Supabase still sends itself (the signup fallback, magic link, email
change, reauthentication).

Hook env: `AUTH_EMAIL_HOOK_SECRET` (Standard Webhooks `whsec_…`),
`RESEND_API_KEY`, and `AUTH_FROM` or `CONTACT_FROM`. Point
Authentication → Hooks → Send Email at `https://www.escalatokens.com/api/auth-email`.
Signup stores `user_metadata.locale` so the letter matches the page language.

Until the hook is on, Supabase's own Confirm signup template is what arrives.
Paste the HTML from `confirmationEmail` (subject `Confirm your Escala Tokens account`)
with this href, not `{{ .ConfirmationURL }}`:

`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup`

## Recovery email

`POST /api/password-reset` needs `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
and `AUTH_FROM` (or `CONTACT_FROM`). Until those are set, the browser falls
back to Supabase's Recovery template — paste the same card, with this button
href, or the fallback is the bare default again:

`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`

Subject: `Reset your Escala Tokens password`.

The sender name/address only changes with **custom SMTP** (Authentication →
Emails → SMTP Settings): e.g. Resend with `escalatokens.com` verified
(SPF + DKIM), sender `Escala Tokens <hello@escalatokens.com>`. The built-in
sender is also rate-limited to a few emails an hour.

## 2. Google — dropped (2026-10-06)
Sign-in is email + GitHub only. Google would need a published OAuth app and still shows the
supabase.co host without a paid custom domain. The Google Cloud project `escala-tokens` and its
branding can stay as they are.

## 3. GitHub provider
Same idea: GitHub → Settings → Developer settings → OAuth Apps → name `Escala Tokens`, logo,
homepage `https://escalatokens.com`.
