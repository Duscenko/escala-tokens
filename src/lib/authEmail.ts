// Password-recovery mail. One renderer, two callers:
//
//   api/password-reset.ts sends this through Resend, with a link on
//   www.escalatokens.com. That is the mail people should receive.
//
//   Supabase's own Recovery template is only the fallback, used when that
//   route is not configured. It must use the same words and the same link
//   shape (`RECOVERY_TEMPLATE_HREF`) or the two mails drift, and a link that
//   stays on *.supabase.co is what inboxes flag as a phishing reset.

export const PUBLIC_SITE = 'https://www.escalatokens.com'

export type MailLocale = 'en' | 'es' | 'fr'

/** Go-template href for Supabase's Recovery template. RedirectTo is the
 *  /login URL `resetPasswordForEmail` already sends. */
export const RECOVERY_TEMPLATE_HREF =
  '{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery'

const COPY: Record<MailLocale, {
  subject: string
  preheader: string
  heading: string
  body: string
  button: string
  fallback: string
  ignore: string
  links: string
}> = {
  en: {
    subject: 'Reset your Escala Tokens password',
    preheader: 'Choose a new password for your Escala Tokens account.',
    heading: 'Reset your password',
    body: 'We received a request to reset the password for {email}. If that was you, choose a new one. This link expires in one hour.',
    button: 'Choose a new password',
    fallback: 'If the button does not work, paste this link into your browser:',
    ignore: 'If you did not ask for this, ignore this email. Your password will not change.',
    links: 'Privacy',
  },
  es: {
    subject: 'Restablezca su contraseña de Escala Tokens',
    preheader: 'Elija una contraseña nueva para su cuenta de Escala Tokens.',
    heading: 'Restablezca su contraseña',
    body: 'Recibimos una solicitud para restablecer la contraseña de {email}. Si fue usted, elija una nueva. Este enlace caduca en una hora.',
    button: 'Elegir una contraseña nueva',
    fallback: 'Si el botón no funciona, copie este enlace en el navegador:',
    ignore: 'Si no pidió este cambio, ignore este correo. Su contraseña no cambiará.',
    links: 'Privacidad',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe Escala Tokens',
    preheader: 'Choisissez un nouveau mot de passe pour votre compte Escala Tokens.',
    heading: 'Réinitialisez votre mot de passe',
    body: 'Nous avons reçu une demande de réinitialisation du mot de passe de {email}. Si c’était vous, choisissez-en un nouveau. Ce lien expire dans une heure.',
    button: 'Choisir un nouveau mot de passe',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans le navigateur :',
    ignore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message. Votre mot de passe ne changera pas.',
    links: 'Confidentialité',
  },
}

export function mailLocale(raw: unknown): MailLocale {
  return raw === 'es' || raw === 'fr' ? raw : 'en'
}

/** The link the person opens. Token stays in the query; LoginPage redeems it
 *  with verifyOtp and then removes it from the address bar. */
export function recoveryPageUrl(tokenHash: string): string {
  const url = new URL('/login', PUBLIC_SITE)
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', 'recovery')
  return url.toString()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fill(template: string, email: string): string {
  return template.replaceAll('{email}', email)
}

export function recoveryEmail(input: {
  locale: MailLocale
  email: string
  url: string
}): { subject: string; html: string; text: string } {
  const copy = COPY[input.locale]
  const email = escapeHtml(input.email)
  // A Supabase template href (`{{ .RedirectTo }}…`) must keep a raw `&`.
  // HTML-escaping it first makes Go's template engine escape it a second time.
  const isTemplate = input.url.includes('{{')
  const href = isTemplate ? input.url.replace(/"/g, '') : escapeHtml(input.url)
  const url = isTemplate ? href : escapeHtml(input.url)
  const privacy = `${PUBLIC_SITE}/privacy`
  const terms = `${PUBLIC_SITE}/terms`
  const termsLabel = input.locale === 'es' ? 'Términos' : input.locale === 'fr' ? 'Conditions' : 'Terms'
  const body = fill(copy.body, email)

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#18181b;padding:22px 28px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.01em;color:#ffffff;">
              Escala Tokens
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:#7f56d9;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;font-family:Inter,Arial,sans-serif;color:#18181b;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;">${escapeHtml(copy.heading)}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3f3f46;">${body}</p>
              <a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;">${escapeHtml(copy.button)}</a>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(copy.fallback)}</p>
              <p style="margin:8px 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:#7f56d9;text-decoration:underline;">${url}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.55;color:#71717a;">
              <p style="margin:0 0 12px;">${escapeHtml(copy.ignore)}</p>
              <p style="margin:0;">
                <a href="${PUBLIC_SITE}" style="color:#3f3f46;text-decoration:none;font-weight:600;">Escala Tokens</a>
                &nbsp;·&nbsp;
                <a href="${privacy}" style="color:#71717a;text-decoration:underline;">${escapeHtml(copy.links)}</a>
                &nbsp;·&nbsp;
                <a href="${terms}" style="color:#71717a;text-decoration:underline;">${escapeHtml(termsLabel)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    'Escala Tokens',
    '',
    copy.heading,
    '',
    fill(copy.body, input.email),
    '',
    copy.button,
    input.url,
    '',
    copy.ignore,
    '',
    `Escala Tokens · ${PUBLIC_SITE}`,
    `${copy.links}: ${privacy}`,
    `${termsLabel}: ${terms}`,
  ].join('\n')

  return { subject: copy.subject, html, text }
}
