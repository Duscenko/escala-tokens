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

/** The mark on its dark tile (144px, shown at 44). Email clients do not render SVG. */
export const AUTH_LOGO_URL = `${PUBLIC_SITE}/email/escala-logo.png`

/** Every message the product sends comes from the support inbox, and a reply
 *  to any of them lands in the same Zoho mailbox people already read. */
/** Same address as PUBLIC_CONTACT_EMAIL (legal.ts). Not imported: this file is
 *  loaded by Vercel functions as ESM, where an extensionless relative import
 *  fails at runtime and takes every auth route down with it. A test pins them. */
export const MAIL_SUPPORT = 'support@escalatokens.com'
/** Resend only verifies mail.escalatokens.com today. Once escalatokens.com is
 *  verified there, set AUTH_FROM to `Escala Tokens <support@escalatokens.com>`. */
export const MAIL_FROM_DEFAULT = 'Escala Tokens <support@mail.escalatokens.com>'

/** `AUTH_FROM` wins when set; otherwise the verified sending subdomain. One rule for the
 *  three auth routes and the contact form, so none of them can drift. */
export function mailFrom(fromEnv: string | undefined): string {
  return (fromEnv || '').trim() || MAIL_FROM_DEFAULT
}

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

type Footer = {
  help: string
  why: string
  privacy: string
  terms: string
  legal: string
  contact: string
  company: string
}

const FOOTER: Record<MailLocale, Footer> = {
  en: {
    help: 'Questions? Reply to this email or write to',
    why: 'You are receiving this message because of an action on your Escala Tokens account ({email}). It is a service message, not marketing.',
    privacy: 'Privacy',
    terms: 'Terms',
    legal: 'Legal notice',
    contact: 'Contact',
    company: 'Design tokens for product teams',
  },
  es: {
    help: '¿Dudas? Responda a este correo o escriba a',
    why: 'Recibe este mensaje por una acción en su cuenta de Escala Tokens ({email}). Es un mensaje de servicio, no publicidad.',
    privacy: 'Privacidad',
    terms: 'Términos',
    legal: 'Aviso legal',
    contact: 'Contacto',
    company: 'Design tokens para equipos de producto',
  },
  fr: {
    help: 'Une question ? Répondez à ce message ou écrivez à',
    why: 'Vous recevez ce message à la suite d’une action sur votre compte Escala Tokens ({email}). C’est un message de service, pas de la publicité.',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    legal: 'Mentions légales',
    contact: 'Contact',
    company: 'Design tokens pour les équipes produit',
  },
}

const FONT = "Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"
const INK = '#18181b'

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
  const legal = `${PUBLIC_SITE}/legal`
  const contact = `${PUBLIC_SITE}/contact`
  const f = FOOTER[input.locale]
  const email = escapeHtml(input.email)
  const body = fill(input.copy.body, `<strong style="color:#18181b;font-weight:600;">${email}</strong>`)
  const code = input.code ? escapeHtml(input.code) : ''
  const action = code
    ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(REAUTH[input.locale].codeLabel)}</p>
              <p style="margin:0 0 8px;padding:16px 20px;background:#f4f4f5;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;line-height:1.2;font-weight:600;letter-spacing:0.22em;color:#18181b;text-align:center;">${code}</p>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:${INK};border-radius:10px;">
                    <a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;">${escapeHtml(input.copy.button)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(input.copy.fallback)}</p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:${INK};text-decoration:underline;">${shown}</a></p>`

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.copy.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 4px 20px;">
              <a href="${PUBLIC_SITE}" style="text-decoration:none;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding:0 12px 0 0;">
                      <img src="${AUTH_LOGO_URL}" width="44" height="44" alt="Escala Tokens" style="display:block;border:0;outline:none;border-radius:12px;">
                    </td>
                    <td style="vertical-align:middle;font-family:${FONT};font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#18181b;">Escala Tokens</td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:40px 36px 36px;font-family:${FONT};color:#18181b;">
              <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.015em;color:#18181b;">${escapeHtml(input.copy.heading)}</h1>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#3f3f46;">${body}</p>
              ${action}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e4e4e7;">
                <tr>
                  <td style="padding-top:20px;font-family:${FONT};font-size:13px;line-height:1.55;color:#71717a;">${escapeHtml(input.copy.ignore)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
              <p style="margin:0 0 14px;">${escapeHtml(f.help)} <a href="mailto:${MAIL_SUPPORT}" style="color:#3f3f46;font-weight:600;text-decoration:underline;">${MAIL_SUPPORT}</a></p>
              <p style="margin:0 0 18px;">
                <a href="${PUBLIC_SITE}" style="color:#3f3f46;text-decoration:none;font-weight:600;">escalatokens.com</a>
                &nbsp;&middot;&nbsp;<a href="${privacy}" style="color:#71717a;text-decoration:underline;">${escapeHtml(f.privacy)}</a>
                &nbsp;&middot;&nbsp;<a href="${terms}" style="color:#71717a;text-decoration:underline;">${escapeHtml(f.terms)}</a>
                &nbsp;&middot;&nbsp;<a href="${legal}" style="color:#71717a;text-decoration:underline;">${escapeHtml(f.legal)}</a>
                &nbsp;&middot;&nbsp;<a href="${contact}" style="color:#71717a;text-decoration:underline;">${escapeHtml(f.contact)}</a>
              </p>
              <p style="margin:0 0 14px;color:#a1a1aa;">${fill(escapeHtml(f.why), email)}</p>
              <p style="margin:0;color:#a1a1aa;">&copy; ${new Date().getFullYear()} Escala Tokens &middot; ${escapeHtml(f.company)}</p>
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
    '--',
    `${f.help} ${MAIL_SUPPORT}`,
    `Escala Tokens · ${PUBLIC_SITE}`,
    `${f.privacy}: ${privacy}`,
    `${f.terms}: ${terms}`,
    `${f.legal}: ${legal}`,
    fill(f.why, input.email),
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
