// `/pricing` while `OPEN_BETA` is on (lib/entitlement.ts) — the open beta.
//
// Decided 2026-10-20: Escala is new and nobody knows it yet, so nothing is
// sold. Every visitor and every account gets the whole product, web and Figma
// plugin. The one limit is about cost, not value: `BETA_MAX_BRANDS` brands
// per design system (Hobby meters Blob writes and function runs). The number
// comes from the same constant the create gate reads, so the page cannot
// promise what the product refuses. `PricingPage` stays in the tree for when
// pricing comes back: flip `OPEN_BETA` and the route shows it again.

import { useEffect, type ReactNode } from 'react'
import { PublicHeader } from './PublicReadingPage'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n } from '../../lib/i18n'
import { BETA_MAX_BRANDS, PRICING_PATH } from '../../lib/entitlement'
import { CONTACT_PATH } from '../../lib/legal'

const BETA_TITLE = 'Open beta — Escala Tokens'
const BETA_DESCRIPTION =
  'Escala is in open beta: the generator, every export and the Figma plugin are free for everyone. Pricing comes after the beta.'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-[5px] flex-shrink-0 text-fg">
      <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line py-4">
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded text-ui font-semibold text-fg ${FOCUS}`}>
        {q}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg-faint transition-transform group-open:rotate-90">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </summary>
      <p className="mt-2 max-w-2xl text-body leading-relaxed text-fg-muted">{children}</p>
    </details>
  )
}

export function OpenBetaPage() {
  const { t } = useI18n()
  const brands = String(BETA_MAX_BRANDS)

  useEffect(() => {
    applyDocumentHead({
      title: t(BETA_TITLE),
      description: t(BETA_DESCRIPTION),
      canonicalPath: PRICING_PATH,
      robots: 'index, follow',
    })
  }, [t])

  const included = [
    t('The generator: every foundation and every System Style'),
    t('Every export: tokens.json, CSS, W3C, Tailwind, Markdown'),
    t('The Figma plugin: live sync, the complete UI Kit and generated documentation'),
    t('Design skills for agents, GitHub push and the CLI'),
    t('Up to {count} brands per design system, each with Light and Dark', { count: brands }),
  ]

  return (
    <div className="flex h-screen flex-col bg-app text-fg">
      <PublicHeader current="pricing" />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-4 py-14 md:px-8">
          <section className="flex flex-col items-center gap-5 text-center">
            <span className="rounded-full bg-fg/10 px-3 py-1 text-body font-medium text-fg">{t('Open beta')}</span>
            <h1 className="text-[clamp(30px,4.6vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              {t('Everything in Escala is free during the open beta.')}
            </h1>
            <p className="max-w-2xl text-ui leading-relaxed text-fg-muted">
              {t('Escala is new. While it finds its first users, every feature on the web and in the Figma plugin is open to everyone. Pricing comes after the beta.')}
            </p>
          </section>

          <section aria-labelledby="beta-included" className="flex flex-col gap-6 rounded-[26px] border border-line bg-surface p-7 md:p-9">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="beta-included" className="text-heading font-semibold">{t('Included for everyone')}</h2>
              <p className="flex items-baseline gap-2">
                <span className="text-[44px] font-medium leading-none tracking-[-0.03em]">$0</span>
                <span className="text-ui text-fg-muted">{t('during the beta')}</span>
              </p>
            </div>
            <ul className="flex flex-col gap-3 border-t border-line pt-6">
              {included.map((item) => (
                <li key={item} className="flex gap-3 text-ui leading-relaxed text-fg">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <a
              href="/"
              className={`flex h-14 w-full items-center justify-between gap-3 rounded-full bg-fg px-7 text-ui font-medium text-app transition-opacity hover:opacity-90 ${FOCUS}`}
            >
              {t('Open the configurator')}<Arrow />
            </a>
          </section>

          <section aria-labelledby="beta-faq" className="flex flex-col gap-4">
            <h2 id="beta-faq" className="text-heading font-semibold">{t('Questions')}</h2>
            <div className="border-t border-line">
              <Faq q={t('Do I need an account?')}>{t('No. You can build and export without one. An account keeps your design systems saved on Escala, in every browser, and connects the Figma plugin.')}</Faq>
              <Faq q={t('Why {count} brands?', { count: brands })}>{t('The beta runs on a small infrastructure. {count} brands per design system, each with Light and Dark, covers most products and keeps the service fast for everyone.', { count: brands })}</Faq>
              <Faq q={t('What happens after the beta?')}>{t('Pricing comes after the beta, announced ahead of time. Everything you export during the beta is yours to keep.')}</Faq>
              <Faq q={t('How can I help?')}>
                {t('Use it and tell us what is missing.')}{' '}
                <a href={CONTACT_PATH} className="text-accent-ui underline-offset-2 hover:underline">{t('Contact form')}</a>
              </Faq>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
