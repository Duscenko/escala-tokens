// The contact form's draft, shared by the page and api/contact.ts.
//
// Production sends through Resend when that route is configured. Until it is,
// the page opens this mailto so a message still reaches the public inbox
// (a Zoho alias — see PUBLIC_CONTACT_EMAIL) instead of the form disappearing.

import { PUBLIC_CONTACT_EMAIL } from './legal'

export const CONTACT_LIMITS = { name: 100, email: 254, message: 5000, system: 80, minMessage: 10 } as const

export const CONTACT_EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/

export function contactDraftError(email: string, message: string): 'invalid_email' | 'invalid_message' | null {
  if (!CONTACT_EMAIL_RE.test(email.trim())) return 'invalid_email'
  const n = message.trim().length
  if (n < CONTACT_LIMITS.minMessage || n > CONTACT_LIMITS.message) return 'invalid_message'
  return null
}

export type ContactMailInput = {
  to?: string
  topicLabel: string
  name: string
  email: string
  system: string
  message: string
}

/** A mailto the visitor's own mail app sends. Subject matches the API's. */
export function contactMailto(input: ContactMailInput): string {
  const name = input.name.trim()
  const email = input.email.trim()
  const system = input.system.trim()
  const message = input.message.trim()
  const subject = `[Escala · ${input.topicLabel}] ${name || email}`.slice(0, 160)
  const lines = [
    `Topic: ${input.topicLabel}`,
    `From: ${name || '(no name)'} <${email}>`,
    system ? `System ID: ${system}` : null,
    '',
    message,
  ].filter((line): line is string => line !== null)
  const to = input.to || PUBLIC_CONTACT_EMAIL
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
