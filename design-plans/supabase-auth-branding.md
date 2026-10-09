# Supabase Auth — branding (done in the dashboards, not in code)

Three things still read "Supabase" to a new user. None can be fixed from this repo.

## 1. Confirmation email ("Supabase Auth <noreply@mail.app.supabase.io>")

Supabase → Authentication → **Email Templates** (Confirm signup, Reset password, Magic link,
Change email). Paste the HTML below and set the subject to `Confirm your Escala Tokens account`.

The sender name/address only changes with **custom SMTP** (Authentication → Emails → SMTP
Settings): e.g. Resend with `escalatokens.com` verified (SPF + DKIM), sender
`Escala Tokens <hello@escalatokens.com>`. The built-in sender is also rate-limited to a few
emails an hour, so custom SMTP is needed for real traffic anyway.

```html
<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b">
  <p style="font-size:13px;font-weight:600;letter-spacing:.02em;margin:0 0 24px">Escala Tokens</p>
  <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">Confirm your account</h1>
  <p style="font-size:15px;line-height:1.5;margin:0 0 24px;color:#52525b">
    One click and you're in. Your design systems stay in your browser; an account only adds online
    saving and your Pro licence.
  </p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#7f56d9;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:10px">
    Confirm my account
  </a>
  <p style="font-size:12px;line-height:1.5;margin:32px 0 0;color:#71717a">
    If you didn't sign up for Escala Tokens, ignore this email. escalatokens.com
  </p>
</div>
```

## Recovery email

The mail people receive is rendered by `src/lib/authEmail.ts` and sent by
`POST /api/password-reset` (Resend). The link opens
`https://www.escalatokens.com/login?token_hash=…&type=recovery`, which is what
stops inboxes treating a `*.supabase.co` reset link as phishing. Header is the
dark "Escala Tokens" band; footer is the "ignore this" line plus the site,
privacy and terms.

That route needs `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and `AUTH_FROM`
(or `CONTACT_FROM`). Until those are set, the browser falls back to Supabase's
Recovery template — paste the same HTML, with this button href, or the fallback
is the bare default again:

`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`

Subject: `Reset your Escala Tokens password`.

## 2. Google — dropped (2026-10-06)
Sign-in is email + GitHub only. Google would need a published OAuth app and still shows the
supabase.co host without a paid custom domain. The Google Cloud project `escala-tokens` and its
branding can stay as they are.

## 3. GitHub provider
Same idea: GitHub → Settings → Developer settings → OAuth Apps → name `Escala Tokens`, logo,
homepage `https://escalatokens.com`.
