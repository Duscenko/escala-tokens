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

## 2. Google consent screen ("Sign in to yihnyflwmcthygfqszub.supabase.co")

That text is Google's, driven by two things:
- **Google Cloud Console → APIs & Services → OAuth consent screen**: set App name
  `Escala Tokens`, logo, support email, and **Authorized domains** `escalatokens.com`
  (+ homepage, privacy `/privacy` and terms `/terms` links), then **Publish app**.
  The consent title becomes "Sign in to Escala Tokens" once the app is verified.
- The line "Google will allow yihnyflwmcthygfqszub.supabase.co…" shows the OAuth redirect
  host. Only a **Supabase custom domain** (paid add-on, e.g. `auth.escalatokens.com`) removes it.
  Until then this part stays; the app name above is the free fix.

## 3. GitHub provider
Same idea: GitHub → Settings → Developer settings → OAuth Apps → name `Escala Tokens`, logo,
homepage `https://escalatokens.com`.
