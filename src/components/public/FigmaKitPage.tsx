// `/figma-kit` — the Escala Design System for Figma: a live preview of the file
// and the way to buy it. Constants and the reasoning live in `lib/figmaKit.ts`.
//
// A public reading page like /pricing: `PublicHeader` on top, one scrolling
// column. The embed is the page's centre of gravity, so it runs wider than the
// text column and loads only when it scrolls near the screen (Figma's embed is
// heavy and should not block the first paint).

import { useEffect, useState, type ReactNode } from 'react'
import { PublicHeader } from './PublicReadingPage'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n } from '../../lib/i18n'
import { CONTACT_PATH } from '../../lib/legal'
import {
  FIGMA_KIT_CHECKOUT_URL, FIGMA_KIT_EMBED_URL, FIGMA_KIT_FILE_URL, FIGMA_KIT_PATH,
  FIGMA_KIT_PRICE, figmaKitPurchased,
} from '../../lib/figmaKit'
import { FigmaGlyph } from '../ui/icons'

export const FIGMA_KIT_TITLE = 'Escala Design System for Figma'
export const FIGMA_KIT_DESCRIPTION =
  'An editable Figma design system built on Escala tokens, plus an Escala Pro licence for the web generator and the Figma plugin. Preview the file live.'

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

/** The buy action. With no checkout link yet it says so instead of a dead button. */
function BuyButton({ wide = false }: { wide?: boolean }) {
  const { t } = useI18n()
  const size = wide ? 'h-14 w-full justify-between px-7' : 'h-10 justify-center gap-1.5 px-5'
  if (!FIGMA_KIT_CHECKOUT_URL) {
    return (
      <span
        aria-disabled
        className={`inline-flex items-center rounded-full bg-fg/10 text-ui font-medium text-fg-muted ${size}`}
      >
        {t('Coming soon')}
      </span>
    )
  }
  return (
    <a
      href={FIGMA_KIT_CHECKOUT_URL}
      className={`inline-flex items-center gap-3 rounded-full bg-fg text-ui font-medium text-app transition-opacity hover:opacity-90 ${size} ${FOCUS}`}
    >
      {FIGMA_KIT_PRICE != null ? t('Buy for ${price}', { price: String(FIGMA_KIT_PRICE) }) : t('Buy now')}
      <Arrow />
    </a>
  )
}

export function FigmaKitPage() {
  const { t } = useI18n()
  const [purchased] = useState(() => figmaKitPurchased(window.location.search))

  useEffect(() => {
    applyDocumentHead({
      title: t(FIGMA_KIT_TITLE),
      description: t(FIGMA_KIT_DESCRIPTION),
      canonicalPath: FIGMA_KIT_PATH,
      robots: 'index, follow',
    })
  }, [t])

  // The success return carries `?purchased=1`; drop it from the address bar so
  // a shared or reloaded URL does not keep thanking someone who did not buy.
  useEffect(() => {
    if (purchased) window.history.replaceState(null, '', FIGMA_KIT_PATH)
  }, [purchased])

  // One purchase, three things: the Figma file (delivered by Polar right after
  // payment), and an Escala Pro licence key for the web generator and the
  // Figma plugin. The key is the Polar "Escala Pro licence" benefit; it counts
  // once Pro starts, in December — until then everything is open (open beta).
  const included = [
    t('The Escala Design System as an editable Figma file, yours to keep'),
    t('Variables for colour, type, radius, spacing and sizes, in Light and Dark, with Desktop, Tablet and Mobile modes'),
    t('70+ components on shadcn anatomy, every layer bound to a variable'),
    t('An Escala Pro licence key: every Pro feature of the web generator and the Figma plugin for 12 months'),
    t('Every update to the Figma file'),
  ]

  return (
    <div className="flex h-screen flex-col bg-app text-fg">
      <PublicHeader />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-14 md:px-8">
          {purchased && (
            <div role="status" className="rounded-2xl border border-status-success/30 bg-status-success/10 px-5 py-4 text-ui text-fg">
              <strong className="font-semibold">{t('Thank you for your purchase.')}</strong>{' '}
              {t('Polar has emailed you the receipt, the link to your copy of the Figma file and your Escala Pro licence key.')}
            </div>
          )}

          <section className="flex flex-col items-center gap-5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-ui/[0.1] px-2.5 py-1 text-body font-medium leading-none text-accent-ui">
              <FigmaGlyph size={12} />
              {t('Figma design system')}
            </span>
            <h1 className="max-w-2xl text-balance text-[clamp(30px,4.6vw,44px)] font-normal leading-[1.1] tracking-[-0.02em]">
              {t('The Escala Design System, ready in Figma.')}
            </h1>
            <p className="max-w-2xl text-ui leading-relaxed text-fg-muted">
              {t('An editable Figma file with every component bound to real variables, plus an Escala Pro licence for the web and the plugin. Explore the file below before you buy.')}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <BuyButton />
              <a
                href={FIGMA_KIT_FILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-5 text-ui font-medium text-fg transition-colors hover:bg-elevated ${FOCUS}`}
              >
                <FigmaGlyph size={14} />
                {t('Open in Figma')}
              </a>
            </div>
          </section>

          <section aria-label={t('Live preview of the Figma file')} className="flex flex-col gap-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-surface">
              <iframe
                title={t('Escala Design System in Figma')}
                src={FIGMA_KIT_EMBED_URL}
                loading="lazy"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <p className="text-center text-body text-fg-muted">
              {t('Live and read-only. Drag to move, scroll to zoom.')}
            </p>
          </section>

          <section aria-labelledby="kit-included" className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-[26px] border border-line bg-surface p-7 md:p-9">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="kit-included" className="text-heading font-semibold">{t('What you get')}</h2>
              {FIGMA_KIT_PRICE != null && (
                <p className="flex items-baseline gap-2">
                  <span className="text-[44px] font-medium leading-none tracking-[-0.03em]">${FIGMA_KIT_PRICE}</span>
                  <span className="text-ui text-fg-muted">{t('one time')}</span>
                </p>
              )}
            </div>
            <ul className="flex flex-col gap-3 border-t border-line pt-6">
              {included.map((item) => (
                <li key={item} className="flex gap-3 text-ui leading-relaxed text-fg">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <BuyButton wide />
            <p className="text-center text-body text-fg-muted">{t('Secure payment with Polar.')}</p>
          </section>

          <section aria-labelledby="kit-faq" className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <h2 id="kit-faq" className="text-heading font-semibold">{t('Questions')}</h2>
            <div className="border-t border-line">
              <Faq q={t('How do I receive the file?')}>{t('Right after payment, Polar emails you the receipt, your licence key and a link to the Figma file. Open the link while signed in to Figma and it copies the file into your own account, ready to edit. The same link always gives you the latest version.')}</Faq>
              <Faq q={t('What is the licence key for?')}>{t('It unlocks Escala Pro on the web and in the Figma plugin. Escala is free for everyone during the open beta; Pro starts in December, and your key counts from then on. Paste it once in the app.')}</Faq>
              <Faq q={t('Can I use it for client and commercial projects?')}>{t('Yes, in as many projects as you like. You may not resell or redistribute the file itself.')}</Faq>
              <Faq q={t('Do I get updates?')}>{t('Yes. Updates to the file are included at no extra cost.')}</Faq>
              <Faq q={t('Something else?')}>
                {t('Write to us and we will answer.')}{' '}
                <a href={CONTACT_PATH} className="text-accent-ui underline-offset-2 hover:underline">{t('Contact form')}</a>
              </Faq>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
