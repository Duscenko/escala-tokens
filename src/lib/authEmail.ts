// Auth mail. One card for every letter Supabase asks us to send:
//
//   Reset password  — api/password-reset.ts (Resend), and the Send Email
//                     hook when that is the path that fires.
//   Confirm signup  — the same hook (api/auth-email.ts). The dashboard
//                     template is not a second design; it is only the
//                     fallback, and it must use SIGNUP_TEMPLATE_HREF.
//
// Both open on www.escalatokens.com. A link that stays on *.supabase.co
// is what inboxes flag as phishing.

export const PUBLIC_SITE = 'https://www.escalatokens.com'

/** White BrandMark, 2× the 32px header slot. Email clients do not render SVG. */
export const AUTH_LOGO_URL = `${PUBLIC_SITE}/email/escala-mark.png`

export type MailLocale = 'en' | 'es' | 'fr'

/** Go-template href for Supabase's Recovery template. RedirectTo is the
 *  /login URL `resetPasswordForEmail` already sends. */
export const RECOVERY_TEMPLATE_HREF =
  '{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery'

/** Same shape for Confirm signup, so the fallback template cannot drift
 *  onto a *.supabase.co link or a different card. */
export const SIGNUP_TEMPLATE_HREF =
  '{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup'

export const AUTH_LINK_TYPES = ['recovery', 'signup', 'invite', 'magiclink', 'email_change'] as const
export type AuthLinkType = (typeof AUTH_LINK_TYPES)[number]

export type AuthMailAction = AuthLinkType | 'reauthentication'

type Copy = {
  subject: string
  preheader: string
  heading: string
  body: string
  button: string
  fallback: string
  ignore: string
  privacy: string
}

const RECOVERY: Record<MailLocale, Copy> = {
  en: {
    subject: 'Reset your Escala Tokens password',
    preheader: 'Choose a new password for your Escala Tokens account.',
    heading: 'Reset your password',
    body: 'We received a request to reset the password for {email}. If that was you, choose a new one. This link expires in one hour.',
    button: 'Choose a new password',
    fallback: 'If the button does not work, paste this link into your browser:',
    ignore: 'If you did not ask for this, ignore this email. Your password will not change.',
    privacy: 'Privacy',
  },
  es: {
    subject: 'Restablezca su contraseña de Escala Tokens',
    preheader: 'Elija una contraseña nueva para su cuenta de Escala Tokens.',
    heading: 'Restablezca su contraseña',
    body: 'Recibimos una solicitud para restablecer la contraseña de {email}. Si fue usted, elija una nueva. Este enlace caduca en una hora.',
    button: 'Elegir una contraseña nueva',
    fallback: 'Si el botón no funciona, copie este enlace en el navegador:',
    ignore: 'Si no pidió este cambio, ignore este correo. Su contraseña no cambiará.',
    privacy: 'Privacidad',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe Escala Tokens',
    preheader: 'Choisissez un nouveau mot de passe pour votre compte Escala Tokens.',
    heading: 'Réinitialisez votre mot de passe',
    body: 'Nous avons reçu une demande de réinitialisation du mot de passe de {email}. Si c’était vous, choisissez-en un nouveau. Ce lien expire dans une heure.',
    button: 'Choisir un nouveau mot de passe',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans le navigateur :',
    ignore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message. Votre mot de passe ne changera pas.',
    privacy: 'Confidentialité',
  },
}

const SIGNUP: Record<MailLocale, Copy> = {
  en: {
    subject: 'Confirm your Escala Tokens account',
    preheader: 'One click finishes creating your Escala Tokens account.',
    heading: 'Confirm your account',
    body: 'Confirm {email} to finish creating your Escala Tokens account. Your design systems stay in this browser; an account adds online saving and your Pro licence.',
    button: 'Confirm my account',
    fallback: 'If the button does not work, paste this link into your browser:',
    ignore: 'If you did not sign up for Escala Tokens, ignore this email.',
    privacy: 'Privacy',
  },
  es: {
    subject: 'Confirme su cuenta de Escala Tokens',
    preheader: 'Un clic termina de crear su cuenta de Escala Tokens.',
    heading: 'Confirme su cuenta',
    body: 'Confirme {email} para terminar de crear su cuenta de Escala Tokens. Sus sistemas de diseño siguen en este navegador; una cuenta añade el guardado en línea y su licencia Pro.',
    button: 'Confirmar mi cuenta',
    fallback: 'Si el botón no funciona, copie este enlace en el navegador:',
    ignore: 'Si usted no se registró en Escala Tokens, ignore este correo.',
    privacy: 'Privacidad',
  },
  fr: {
    subject: 'Confirmez votre compte Escala Tokens',
    preheader: 'Un clic termine la création de votre compte Escala Tokens.',
    heading: 'Confirmez votre compte',
    body: 'Confirmez {email} pour terminer la création de votre compte Escala Tokens. Vos systèmes de design restent dans ce navigateur ; un compte ajoute l’enregistrement en ligne et votre licence Pro.',
    button: 'Confirmer mon compte',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans le navigateur :',
    ignore: 'Si vous ne vous êtes pas inscrit à Escala Tokens, ignorez ce message.',
    privacy: 'Confidentialité',
  },
}

const MAGIC: Record<MailLocale, Copy> = {
  en: {
    subject: 'Sign in to Escala Tokens',
    preheader: 'Your sign-in link for Escala Tokens.',
    heading: 'Sign in',
    body: 'Use this link to sign in as {email}. It expires in one hour.',
    button: 'Sign in',
    fallback: 'If the button does not work, paste this link into your browser:',
    ignore: 'If you did not ask to sign in, ignore this email.',
    privacy: 'Privacy',
  },
  es: {
    subject: 'Inicie sesión en Escala Tokens',
    preheader: 'Su enlace de acceso a Escala Tokens.',
    heading: 'Inicie sesión',
    body: 'Use este enlace para entrar como {email}. Caduca en una hora.',
    button: 'Iniciar sesión',
    fallback: 'Si el botón no funciona, copie este enlace en el navegador:',
    ignore: 'Si usted no pidió iniciar sesión, ignore este correo.',
    privacy: 'Privacidad',
  },
  fr: {
    subject: 'Connectez-vous à Escala Tokens',
    preheader: 'Votre lien de connexion à Escala Tokens.',
    heading: 'Connectez-vous',
    body: 'Utilisez ce lien pour vous connecter en tant que {email}. Il expire dans une heure.',
    button: 'Se connecter',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans le navigateur :',
    ignore: 'Si vous n’avez pas demandé à vous connecter, ignorez ce message.',
    privacy: 'Confidentialité',
  },
}

const EMAIL_CHANGE: Record<MailLocale, Copy> = {
  en: {
    subject: 'Confirm your new Escala Tokens email',
    preheader: 'Confirm the new address for your Escala Tokens account.',
    heading: 'Confirm your new email',
    body: 'Confirm {email} as the address for your Escala Tokens account.',
    button: 'Confirm this address',
    fallback: 'If the button does not work, paste this link into your browser:',
    ignore: 'If you did not ask to change your email, ignore this message. Your address will not change.',
    privacy: 'Privacy',
  },
  es: {
    subject: 'Confirme su nuevo correo de Escala Tokens',
    preheader: 'Confirme la nueva dirección de su cuenta de Escala Tokens.',
    heading: 'Confirme su nuevo correo',
    body: 'Confirme {email} como dirección de su cuenta de Escala Tokens.',
    button: 'Confirmar esta dirección',
    fallback: 'Si el botón no funciona, copie este enlace en el navegador:',
    ignore: 'Si usted no pidió cambiar el correo, ignore este mensaje. Su dirección no cambiará.',
    privacy: 'Privacidad',
  },
  fr: {
    subject: 'Confirmez votre nouvel e-mail Escala Tokens',
    preheader: 'Confirmez la nouvelle adresse de votre compte Escala Tokens.',
    heading: 'Confirmez votre nouvel e-mail',
    body: 'Confirmez {email} comme adresse de votre compte Escala Tokens.',
    button: 'Confirmer cette adresse',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans le navigateur :',
    ignore: 'Si vous n’avez pas demandé à changer d’e-mail, ignorez ce message. Votre adresse ne changera pas.',
    privacy: 'Confidentialité',
  },
}

const REAUTH: Record<MailLocale, Omit<Copy, 'button' | 'fallback'> & { codeLabel: string }> = {
  en: {
    subject: 'Your Escala Tokens sign-in code',
    preheader: 'Your code to continue in Escala Tokens.',
    heading: 'Your sign-in code',
    body: 'Enter this code to continue as {email}.',
    codeLabel: 'Code',
    ignore: 'If you did not ask for this, ignore this email.',
    privacy: 'Privacy',
  },
  es: {
    subject: 'Su código de acceso a Escala Tokens',
    preheader: 'Su código para continuar en Escala Tokens.',
    heading: 'Su código de acceso',
    body: 'Introduzca este código para continuar como {email}.',
    codeLabel: 'Código',
    ignore: 'Si usted no pidió esto, ignore este correo.',
    privacy: 'Privacidad',
  },
  fr: {
    subject: 'Votre code de connexion Escala Tokens',
    preheader: 'Votre code pour continuer dans Escala Tokens.',
    heading: 'Votre code de connexion',
    body: 'Saisissez ce code pour continuer en tant que {email}.',
    codeLabel: 'Code',
    ignore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
    privacy: 'Confidentialité',
  },
}

export function mailLocale(raw: unknown): MailLocale {
  return raw === 'es' || raw === 'fr' ? raw : 'en'
}

export function authLinkType(raw: string | null | undefined): AuthLinkType | null {
  return AUTH_LINK_TYPES.includes(raw as AuthLinkType) ? (raw as AuthLinkType) : null
}

/** The link the person opens. Token stays in the query; LoginPage redeems it
 *  with verifyOtp and then removes it from the address bar. */
export function authPageUrl(tokenHash: string, type: AuthLinkType): string {
  const url = new URL('/login', PUBLIC_SITE)
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', type)
  return url.toString()
}

export function recoveryPageUrl(tokenHash: string): string {
  return authPageUrl(tokenHash, 'recovery')
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

function hrefOf(url: string): { href: string; shown: string } {
  // A Supabase template href (`{{ .RedirectTo }}…`) must keep a raw `&`.
  // HTML-escaping it first makes Go's template engine escape it a second time.
  const isTemplate = url.includes('{{')
  const href = isTemplate ? url.replace(/"/g, '') : escapeHtml(url)
  return { href, shown: isTemplate ? href : escapeHtml(url) }
}

function termsLabel(locale: MailLocale): string {
  return locale === 'es' ? 'Términos' : locale === 'fr' ? 'Conditions' : 'Terms'
}

function layout(input: {
  locale: MailLocale
  copy: Copy
  email: string
  url: string
  code?: string
}): { subject: string; html: string; text: string } {
  const { href, shown } = hrefOf(input.url)
  const privacy = `${PUBLIC_SITE}/privacy`
  const terms = `${PUBLIC_SITE}/terms`
  const termsName = termsLabel(input.locale)
  const email = escapeHtml(input.email)
  const body = fill(input.copy.body, email)
  const code = input.code ? escapeHtml(input.code) : ''
  const action = code
    ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(REAUTH[input.locale].codeLabel)}</p>
              <p style="margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:0.18em;color:#18181b;">${code}</p>`
    : `<a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;">${escapeHtml(input.copy.button)}</a>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(input.copy.fallback)}</p>
              <p style="margin:8px 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:#7f56d9;text-decoration:underline;">${shown}</a></p>`

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(input.copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.copy.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#18181b;padding:20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding:0 12px 0 0;">
                    <img src="${AUTH_LOGO_URL}" width="32" height="32" alt="" style="display:block;border:0;outline:none;text-decoration:none;">
                  </td>
                  <td style="vertical-align:middle;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.01em;color:#ffffff;">
                    Escala Tokens
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:#7f56d9;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;font-family:Inter,Arial,sans-serif;color:#18181b;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;">${escapeHtml(input.copy.heading)}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3f3f46;">${body}</p>
              ${action}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.55;color:#71717a;">
              <p style="margin:0 0 12px;">${escapeHtml(input.copy.ignore)}</p>
              <p style="margin:0;">
                <a href="${PUBLIC_SITE}" style="color:#3f3f46;text-decoration:none;font-weight:600;">Escala Tokens</a>
                &nbsp;·&nbsp;
                <a href="${privacy}" style="color:#71717a;text-decoration:underline;">${escapeHtml(input.copy.privacy)}</a>
                &nbsp;·&nbsp;
                <a href="${terms}" style="color:#71717a;text-decoration:underline;">${escapeHtml(termsName)}</a>
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
    input.copy.heading,
    '',
    fill(input.copy.body, input.email),
    '',
    code ? `${REAUTH[input.locale].codeLabel}: ${input.code}` : `${input.copy.button}\n${input.url}`,
    '',
    input.copy.ignore,
    '',
    `Escala Tokens · ${PUBLIC_SITE}`,
    `${input.copy.privacy}: ${privacy}`,
    `${termsName}: ${terms}`,
  ].join('\n')

  return { subject: input.copy.subject, html, text }
}

export function recoveryEmail(input: {
  locale: MailLocale
  email: string
  url: string
}): { subject: string; html: string; text: string } {
  return layout({ ...input, copy: RECOVERY[input.locale] })
}

export function confirmationEmail(input: {
  locale: MailLocale
  email: string
  url: string
}): { subject: string; html: string; text: string } {
  return layout({ ...input, copy: SIGNUP[input.locale] })
}

const COPY_OF: Record<Exclude<AuthMailAction, 'reauthentication'>, Record<MailLocale, Copy>> = {
  recovery: RECOVERY,
  signup: SIGNUP,
  invite: SIGNUP,
  magiclink: MAGIC,
  email_change: EMAIL_CHANGE,
}

/** One card for every action the Send Email hook can receive. */
export function authActionEmail(input: {
  locale: MailLocale
  email: string
  action: AuthMailAction
  url: string
  code?: string
}): { subject: string; html: string; text: string } {
  if (input.action === 'reauthentication') {
    const copy = REAUTH[input.locale]
    return layout({
      locale: input.locale,
      email: input.email,
      url: input.url,
      code: input.code || '',
      copy: { ...copy, button: '', fallback: '' },
    })
  }
  return layout({ ...input, copy: COPY_OF[input.action][input.locale] })
}
