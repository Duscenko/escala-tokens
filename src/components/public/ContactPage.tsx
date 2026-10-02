// `/contact` — the publisher's only contact channel. No inbox is published:
// the form posts to api/contact.ts, which relays the message by email from the
// server. Same page anatomy as /legal and /privacy (PublicHeader + docs blocks).
//
// No cookies, no CAPTCHA: spam is handled by a hidden honeypot field, a minimum
// fill time (`renderedAt`) and a per-IP limit — see api/contact.ts.
//
// The form only renders when the server reports sending is configured
// (GET /api/contact → 200). Otherwise the page says so and offers LinkedIn, so
// it can never collect a message that would go nowhere. In local dev (no
// serverless functions under Vite) the form renders anyway, to work on the UI.

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { DocHeader, DocSection, DocTitle } from '../configurator/docs/blocks'
import { PublicHeader } from './PublicReadingPage'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n, type Locale } from '../../lib/i18n'
import { CONTACT_PATH, CONTACT_TOPICS, LEGAL, PRIVACY_PATH, type ContactTopic } from '../../lib/legal'

type Copy = {
  title: string
  description: string
  lead: string
  formTitle: string
  topic: string
  topics: Record<ContactTopic, string>
  name: string
  optional: string
  email: string
  emailHint: string
  system: string
  systemHint: string
  message: string
  send: string
  sending: string
  sent: string
  sentBody: string
  another: string
  notice: (privacy: ReactNode) => ReactNode
  errors: { invalid_email: string; invalid_message: string; rate_limited: string; generic: string }
  unavailable: (linkedin: ReactNode) => ReactNode
}

const COPY: Record<Locale, Copy> = {
  fr: {
    title: 'Contact',
    description: 'Écrire à l’éditeur d’Escala Tokens : question, demande RGPD, suppression d’un système publié, bug.',
    lead: 'Une question, une demande liée à vos données, un bug ou un partenariat : écrivez-nous ici. Nous répondons par e-mail, en général sous quelques jours et au plus tard sous un mois pour les demandes RGPD.',
    formTitle: 'Écrire un message',
    topic: 'Sujet',
    topics: { general: 'Question générale', privacy: 'Demande RGPD (accès, rectification, effacement…)', delete: 'Supprimer un système publié', bug: 'Signaler un bug', business: 'Partenariat ou entreprise' },
    name: 'Nom', optional: 'facultatif',
    email: 'E-mail', emailHint: 'Uniquement pour vous répondre.',
    system: 'Identifiant du système', systemHint: 'Utile pour une suppression ou une demande RGPD — il ressemble à esc_7K2M-9QX4-N3PD.',
    message: 'Message',
    send: 'Envoyer', sending: 'Envoi…',
    sent: 'Message envoyé', sentBody: 'Merci. Nous vous répondrons à l’adresse indiquée.', another: 'Écrire un autre message',
    notice: (privacy) => <>Vos données servent uniquement à vous répondre et ne sont pas stockées sur nos serveurs. Aucun cookie. Détails dans la {privacy}.</>,
    errors: { invalid_email: 'Vérifiez l’adresse e-mail.', invalid_message: 'Le message doit contenir entre 10 et 5 000 caractères.', rate_limited: 'Trop de messages envoyés. Réessayez dans une heure.', generic: 'L’envoi a échoué. Réessayez dans un instant.' },
    unavailable: (linkedin) => <>Le formulaire est momentanément indisponible. Vous pouvez nous écrire sur {linkedin}.</>,
  },
  es: {
    title: 'Contacto',
    description: 'Escribir al editor de Escala Tokens: preguntas, solicitudes RGPD, eliminar un sistema publicado, errores.',
    lead: 'Una pregunta, una solicitud sobre sus datos, un error o una colaboración: escríbanos aquí. Respondemos por correo, normalmente en pocos días y como máximo en un mes para las solicitudes RGPD.',
    formTitle: 'Escribir un mensaje',
    topic: 'Tema',
    topics: { general: 'Pregunta general', privacy: 'Solicitud RGPD (acceso, rectificación, supresión…)', delete: 'Eliminar un sistema publicado', bug: 'Informar de un error', business: 'Colaboración o empresa' },
    name: 'Nombre', optional: 'opcional',
    email: 'Correo electrónico', emailHint: 'Solo para responderle.',
    system: 'Identificador del sistema', systemHint: 'Útil para una eliminación o una solicitud RGPD; tiene este aspecto: esc_7K2M-9QX4-N3PD.',
    message: 'Mensaje',
    send: 'Enviar', sending: 'Enviando…',
    sent: 'Mensaje enviado', sentBody: 'Gracias. Le responderemos a la dirección indicada.', another: 'Escribir otro mensaje',
    notice: (privacy) => <>Sus datos solo sirven para responderle y no se guardan en nuestros servidores. Sin cookies. Detalles en la {privacy}.</>,
    errors: { invalid_email: 'Revise la dirección de correo.', invalid_message: 'El mensaje debe tener entre 10 y 5.000 caracteres.', rate_limited: 'Demasiados mensajes enviados. Inténtelo de nuevo en una hora.', generic: 'No se pudo enviar. Inténtelo de nuevo en un momento.' },
    unavailable: (linkedin) => <>El formulario no está disponible en este momento. Puede escribirnos por {linkedin}.</>,
  },
  en: {
    title: 'Contact',
    description: 'Write to the publisher of Escala Tokens: questions, GDPR requests, deleting a published system, bugs.',
    lead: 'A question, a request about your data, a bug or a partnership: write to us here. We answer by email, usually within a few days and at the latest within one month for GDPR requests.',
    formTitle: 'Write a message',
    topic: 'Topic',
    topics: { general: 'General question', privacy: 'GDPR request (access, rectification, erasure…)', delete: 'Delete a published system', bug: 'Report a bug', business: 'Partnership or business' },
    name: 'Name', optional: 'optional',
    email: 'Email', emailHint: 'Only used to answer you.',
    system: 'System ID', systemHint: 'Helpful for a deletion or GDPR request — it looks like esc_7K2M-9QX4-N3PD.',
    message: 'Message',
    send: 'Send', sending: 'Sending…',
    sent: 'Message sent', sentBody: 'Thank you. We’ll reply to the address you gave.', another: 'Write another message',
    notice: (privacy) => <>Your data is used only to answer you and is not stored on our servers. No cookies. Details in the {privacy}.</>,
    errors: { invalid_email: 'Check the email address.', invalid_message: 'The message must be between 10 and 5,000 characters.', rate_limited: 'Too many messages sent. Try again in an hour.', generic: 'Sending failed. Try again in a moment.' },
    unavailable: (linkedin) => <>The form is temporarily unavailable. You can reach us on {linkedin}.</>,
  },
}

const PRIVACY_LABEL: Record<Locale, string> = { fr: 'politique de confidentialité', en: 'privacy policy', es: 'política de privacidad' }

const FIELD = 'w-full bg-app border border-line-strong rounded-lg px-3 py-2 text-ui text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-accent-ui focus-visible:ring-2 focus-visible:ring-accent-ui/30 aria-[invalid=true]:border-status-danger'
const LABEL = 'text-body font-medium text-fg'
const HINT = 'text-caption text-fg-faint'

function A({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="text-accent-ui underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded-sm"
    >
      {children}
    </a>
  )
}

function initialTopic(): ContactTopic {
  const q = new URLSearchParams(window.location.search).get('topic')
  return (CONTACT_TOPICS as readonly string[]).includes(q ?? '') ? (q as ContactTopic) : 'general'
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; code: keyof Copy['errors'] }

export function ContactPage() {
  const { t, locale } = useI18n()
  const c = COPY[locale]
  const id = useId()
  const renderedAt = useRef(Date.now())
  const [available, setAvailable] = useState<boolean | null>(import.meta.env.DEV ? true : null)
  const [topic, setTopic] = useState<ContactTopic>(initialTopic)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [system, setSystem] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    applyDocumentHead({ title: `${c.title} — Escala Tokens`, description: c.description, canonicalPath: CONTACT_PATH, robots: 'index, follow' })
  }, [c.title, c.description])

  useEffect(() => {
    if (import.meta.env.DEV) return
    fetch('/api/contact', { method: 'GET' })
      .then((r) => setAvailable(r.ok))
      .catch(() => setAvailable(false))
  }, [])

  const showSystem = topic === 'delete' || topic === 'privacy'
  const emailError = status.kind === 'error' && status.code === 'invalid_email'
  const messageError = status.kind === 'error' && status.code === 'invalid_message'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'sending') return
    setStatus({ kind: 'sending' })
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, name, email, system: showSystem ? system : '', message, website, renderedAt: renderedAt.current }),
      })
      if (r.ok) {
        setStatus({ kind: 'sent' })
        return
      }
      const data = (await r.json().catch(() => ({}))) as { error?: string }
      const code = data.error === 'invalid_email' || data.error === 'invalid_message' || data.error === 'rate_limited' ? data.error : 'generic'
      setStatus({ kind: 'error', code })
    } catch {
      setStatus({ kind: 'error', code: 'generic' })
    }
  }

  function reset() {
    setMessage('')
    setSystem('')
    renderedAt.current = Date.now()
    setStatus({ kind: 'idle' })
  }

  const privacy = <A href={PRIVACY_PATH}>{PRIVACY_LABEL[locale]}</A>

  return (
    <div className="h-screen bg-app text-fg flex flex-col">
      <PublicHeader />
      <div className="@container flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <article className="w-full min-w-0 max-w-4xl mx-auto px-5 @min-[760px]:px-8 py-7 flex flex-col gap-8">
          <DocHeader section={t('About')} kind={t('Legal & data')} title={c.title} actions={null} />
          <DocTitle title={c.title} eyebrow="Escala Tokens" lead={c.lead} />

          <DocSection id="form" title={status.kind === 'sent' ? c.sent : c.formTitle}>
            {available === null ? null : !available ? (
              <p className="text-ui text-fg-muted leading-relaxed max-w-2xl">{c.unavailable(<A href={LEGAL.linkedin} external>LinkedIn</A>)}</p>
            ) : status.kind === 'sent' ? (
              <div role="status" className="flex flex-col items-start gap-3 max-w-xl">
                <p className="text-ui text-fg-muted leading-relaxed">{c.sentBody}</p>
                <button type="button" onClick={reset} className="text-ui text-accent-ui hover:underline underline-offset-2">{c.another}</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-5 max-w-xl">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-topic`} className={LABEL}>{c.topic}</label>
                  <select id={`${id}-topic`} value={topic} onChange={(e) => setTopic(e.target.value as ContactTopic)} className={FIELD}>
                    {CONTACT_TOPICS.map((k) => <option key={k} value={k}>{c.topics[k]}</option>)}
                  </select>
                </div>

                <div className="grid gap-5 @min-[640px]:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-name`} className={LABEL}>{c.name} <span className="font-normal text-fg-faint">({c.optional})</span></label>
                    <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className={FIELD} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-email`} className={LABEL}>{c.email}</label>
                    <input
                      id={`${id}-email`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      maxLength={254} autoComplete="email" aria-invalid={emailError || undefined}
                      aria-describedby={`${id}-email-hint`} className={FIELD}
                    />
                    <span id={`${id}-email-hint`} className={emailError ? 'text-caption text-status-danger' : HINT}>{emailError ? c.errors.invalid_email : c.emailHint}</span>
                  </div>
                </div>

                {showSystem && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-system`} className={LABEL}>{c.system} <span className="font-normal text-fg-faint">({c.optional})</span></label>
                    <input id={`${id}-system`} value={system} onChange={(e) => setSystem(e.target.value)} maxLength={80} spellCheck={false} aria-describedby={`${id}-system-hint`} className={`${FIELD} font-mono`} />
                    <span id={`${id}-system-hint`} className={HINT}>{c.systemHint}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-message`} className={LABEL}>{c.message}</label>
                  <textarea
                    id={`${id}-message`} required rows={7} value={message} onChange={(e) => setMessage(e.target.value)}
                    minLength={10} maxLength={5000} aria-invalid={messageError || undefined}
                    aria-describedby={messageError ? `${id}-message-error` : undefined}
                    className={`${FIELD} resize-y leading-relaxed`}
                  />
                  {messageError && <span id={`${id}-message-error`} className="text-caption text-status-danger">{c.errors.invalid_message}</span>}
                </div>

                {/* Honeypot: invisible and unreachable for people (off-screen,
                    aria-hidden, no tab stop, no autofill); bots that fill every
                    field land in the server's silent trap. */}
                <div aria-hidden className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor={`${id}-website`}>Website</label>
                  <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={status.kind === 'sending'}
                      className="px-5 py-2 rounded-lg text-ui font-semibold bg-accent-solid text-accent-ink disabled:opacity-40 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app"
                    >
                      {status.kind === 'sending' ? c.sending : c.send}
                    </button>
                    <span role="status" aria-live="polite" className="text-caption text-status-danger">
                      {status.kind === 'error' && (status.code === 'rate_limited' || status.code === 'generic') ? c.errors[status.code] : ''}
                    </span>
                  </div>
                  <p className="text-caption text-fg-faint leading-relaxed">{c.notice(privacy)}</p>
                </div>
              </form>
            )}
          </DocSection>
        </article>
      </div>
    </div>
  )
}
