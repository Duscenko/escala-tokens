// `/pricing` — the two products, what each plan gets, and the launch promo.
//
// Content mirrors design-plans/pricing-and-packaging.md and the approved
// canvas ("Escala pricing & paywall"). Two rules keep it honest:
//   - The plan LIMITS come from `lib/entitlement.ts` (FREE_MAX_THEMES,
//     PRO_MAX_THEMES), the same constants the sync screen and, from phase 3,
//     `api/tokens.ts` read — so this page cannot promise a number the server
//     disagrees with.
//   - Nothing is shown that does not exist yet. The free promo ended 7 Oct 2026;
//     the Pro CTA goes to the Polar checkout (`lib/polar.ts`).
//     Library · Figma has no published price, so it says Coming soon.
//     Refunds are 14 days, the same sentence as /terms.
//
// A public reading page like /legal: `PublicHeader` on top, one scrolling
// column, readable on a phone (the one place, with About, where that matters).

import { useEffect, type ReactNode } from 'react'
import { PublicHeader } from './PublicReadingPage'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n } from '../../lib/i18n'
import {
  FREE_MAX_MODES, PRICING_PATH, PRO_MAX_MODES,
} from '../../lib/entitlement'
import { useEntitlement } from '../../lib/useEntitlement'
import { useAuth } from '../../lib/auth'
import { checkoutUrl } from '../../lib/polar'
const PRICING_TITLE = 'Pricing — Escala Tokens'
const PRICING_DESCRIPTION =
  'Escala is free to build and export. Pro adds what runs on our servers: the complete UI Kit in Figma and more than 10 modes per file.'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
const PLAN_CTA = `flex h-14 w-full items-center justify-between gap-3 rounded-full px-7 text-ui font-medium transition-[opacity,background-color] ${FOCUS}`

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-[5px] flex-shrink-0 text-fg">
      <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-ui leading-relaxed text-fg">
          <Check />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

// A cell is `true` (included, nothing more to say), `null` (not included) or a
// string — the value only when it actually DIFFERS ("Up to 10", "12 months").
// "Included" written out nine times was half the table saying the same word,
// burying the few cells that tell the plans apart; a check carries it instead.
type Cell = string | true | null
type Row = { label: string; free: Cell; pro: Cell }
type Group = { title: string; rows: Row[] }

function CompareTable({ groups, proPrice }: { groups: Group[]; proPrice: number }) {
  const { t } = useI18n()
  const cell = (value: Cell, pro: boolean) => {
    if (value === true) {
      return (
        <span className="inline-flex items-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={pro ? 'text-accent-ui' : 'text-fg'}>
            <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">{t('Included')}</span>
        </span>
      )
    }
    // A dash in `text-fg-muted`, not the words in `text-fg-faint` — faint
    // measured 4.39:1 here, under AA; the label stays for screen readers.
    if (value === null) {
      return (
        <span className="inline-flex items-center text-fg-muted">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4.5 8h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="sr-only">{t('Not included')}</span>
        </span>
      )
    }
    return <span className={pro ? 'font-medium text-fg' : 'text-fg'}>{value}</span>
  }
  // The Pro column carries the same accent the Pro card does, as a faint wash
  // down its whole height, so the table reads as "this column is the offer".
  const proCol = 'bg-accent-ui/[0.05]'
  const pad = 'px-3 md:px-5'
  // The rule between the feature labels and the two plans — runs the whole
  // table height, so every row reads as label | Free | Pro.
  const DIVIDER = 'border-l border-line'
  // Titles (the caption, the header row, each group) sit on a faint band so
  // they read as headings, not as one more feature row. Translucent on purpose:
  // over the Pro column it stacks with that column's accent wash instead of
  // erasing it.
  const BAND = 'bg-fg/[0.045]'
  return (
    <div className="flex flex-col gap-4">
      {/* A heading BEFORE the card, not a <caption> inside it: it names the
          table without taking a row of the table's own chrome, and
          `aria-labelledby` keeps the programmatic name a caption gave. */}
      <h3 id="pricing-compare" className="text-title font-semibold">{t('Compare Escala plans')}</h3>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {/* table-fixed + percentage plan columns: the feature label wraps and
            both plans stay on screen at phone width — no horizontal scroll
            hiding the Pro column, which is the one this table exists to sell. */}
        <table aria-labelledby="pricing-compare" className="w-full table-fixed border-collapse text-body">
          <colgroup>
            <col />
            <col className="w-[27%] md:w-[24%]" />
            <col className={`w-[27%] md:w-[24%] ${proCol}`} />
          </colgroup>
          <thead>
            <tr className="border-t border-line align-bottom">
              {/* The FIRST group's title lives here, on the header's own line, in the
                  same type as Free / Pro — a lone "BUILD" row right under the
                  header was a second header with nothing under it yet. */}
              <th scope="col" className={`${pad} ${BAND} py-3 text-left text-ui font-semibold text-fg`}>{groups[0]?.title}</th>
              <th scope="col" className={`${pad} ${DIVIDER} ${BAND} py-3 text-left`}>
                <span className="block text-ui font-semibold text-fg">{t('Free')}</span>
                <span className="block text-caption font-normal text-fg-muted">$0</span>
              </th>
              <th scope="col" className={`${pad} ${BAND} py-3 text-left`}>
                <span className="block text-ui font-semibold text-fg">Pro</span>
                <span className="block text-caption font-normal text-fg-muted">
                  ${proPrice} <span className="hidden sm:inline">{t('one-time')}</span>
                </span>
              </th>
            </tr>
          </thead>
          {groups.map((group, index) => (
            <tbody key={group.title}>
              {index > 0 && (
                <tr className="border-t border-line">
                  {/* Three cells, not a colSpan, so the divider and the Pro wash
                      run unbroken through the group rows. */}
                  <th scope="colgroup" className={`${pad} ${BAND} py-3 text-left text-ui font-semibold text-fg`}>
                    {group.title}
                  </th>
                  <td aria-hidden className={`${DIVIDER} ${BAND}`} />
                  <td aria-hidden className={BAND} />
                </tr>
              )}
              {group.rows.map((row, rowIndex) => (
                <tr key={row.label} className={`${index === 0 && rowIndex === 0 ? 'border-t border-line' : 'border-t border-line/60'} transition-colors hover:bg-elevated/40`}>
                  <th scope="row" className={`${pad} py-3 text-left align-top font-normal leading-snug text-fg-muted`}>{row.label}</th>
                  <td className={`${pad} ${DIVIDER} py-3 align-top leading-snug`}>{cell(row.free, false)}</td>
                  <td className={`${pad} py-3 align-top leading-snug`}>{cell(row.pro, true)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
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

export function PricingPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const entitlement = useEntitlement()

  useEffect(() => {
    applyDocumentHead({
      title: t(PRICING_TITLE),
      description: t(PRICING_DESCRIPTION),
      canonicalPath: PRICING_PATH,
      robots: 'index, follow',
    })
  }, [t])

  const free = String(FREE_MAX_MODES)
  const max = String(PRO_MAX_MODES)
  const groups: Group[] = [
    {
      title: t('Build'),
      rows: [
        { label: t('Configurator, every foundation, unlimited brands while editing'), free: true, pro: true },
        { label: t('System Styles'), free: t('All 12'), pro: t('All 12') },
        { label: t('Exports: tokens.json, CSS, W3C, Tailwind, Markdown'), free: true, pro: true },
        { label: t('Generated documentation (Figma doc pages, system README)'), free: null, pro: true },
      ],
    },
    {
      title: 'Figma',
      rows: [
        { label: t('Agent context: every brand, theme and viewport'), free: true, pro: true },
        { label: t('Modes in one Figma file'), free: t('Up to {n}', { n: free }), pro: t('More than {n}, up to what your Figma plan holds', { n: free }) },
        { label: t('Platform modes'), free: 'Desktop, Tablet, Mobile', pro: 'Desktop, Tablet, Mobile' },
        { label: t('Manual import of tokens.json'), free: true, pro: true },
        { label: t('Complete UI Kit in Figma (59 editable components)'), free: t('Components as images'), pro: true },
        { label: t('Customize every component from Escala Tokens through the Figma plugin (agent context)'), free: null, pro: true },
      ],
    },
    {
      title: t('AI'),
      rows: [
        { label: t('Design skills: AGENTS.md and agent skills'), free: true, pro: true },
      ],
    },
    {
      title: t('Updates and support'),
      rows: [
        { label: t('Updates'), free: t('Open source'), pro: t('12 months') },
        { label: t('Support'), free: t('GitHub community'), pro: t('Email') },
      ],
    },
  ]

  return (
    <div className="flex h-screen flex-col bg-app text-fg">
      <PublicHeader current="pricing" />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 py-14 md:px-8">
          <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <h1 className="text-[clamp(30px,4.6vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              {t('Your own token system. Free to build. Pro for the complete Figma UI Kit.')}
            </h1>
            <p className="max-w-2xl text-ui leading-relaxed text-fg-muted">
              {t('Escala generates variables with a clear, architecture-agnostic structure. Configuring and exporting is free. Pro adds the complete UI Kit Library in Figma, and every brand, theme and platform mode.')}
            </p>
          </section>

          <section aria-labelledby="pricing-escala" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 id="pricing-escala" className="text-heading font-semibold">{t('Escala, the generator')}</h2>
            </div>

            {/* One shell, two plans — the quiet Free card beside the Pro card that
                carries the glow and the big number, so the eye lands on the offer. */}
            <div className="grid gap-2 rounded-[32px] border border-line bg-surface/60 p-2 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="flex flex-col gap-8 rounded-[26px] bg-surface p-7 md:p-9">
                <div>
                  <h3 className="text-[26px] font-semibold leading-tight tracking-[-0.01em]">{t('Free')}</h3>
                  <p className="mt-3 max-w-sm text-ui leading-relaxed text-fg-muted">{t('Build the whole system and take it anywhere by hand.')}</p>
                </div>
                <p className="flex items-baseline gap-3">
                  <span className="text-[56px] font-medium leading-none tracking-[-0.03em]">$0</span>
                  <span className="text-ui text-fg-muted">{t('forever')}</span>
                </p>
                <div className="border-t border-line pt-7">
                  <Features items={[
                    t('All 12 System Styles, unlimited brands while editing'),
                    t('Every export: tokens.json, CSS, W3C, Tailwind, Markdown'),
                    t('Open-source Figma plugin, manual import'),
                    t('The full agent context: every brand, theme and viewport, up to {n} modes in Figma', { n: free }),
                    t('Offline agent skill, GitHub push, CLI'),
                  ]} />
                </div>
                <a href="/" className={`${PLAN_CTA} mt-auto border border-line-strong text-fg hover:bg-elevated`}>
                  {t('Open the configurator')}<Arrow />
                </a>
              </div>

              <div className="relative flex flex-col gap-8 overflow-hidden rounded-[26px] bg-surface p-7 md:p-9">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 70% 60% at 100% 0%, color-mix(in srgb, var(--accent-ui) 34%, transparent), transparent 72%),' +
                      'radial-gradient(ellipse 60% 55% at 0% 100%, color-mix(in srgb, var(--status-danger) 22%, transparent), transparent 72%)',
                  }}
                />
                <div className="relative flex flex-col gap-4">
                  <span className="self-start rounded-full bg-fg/10 px-3 py-1 text-body font-medium text-fg">{t('One-time')}</span>
                  <h3 className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.1] tracking-[-0.02em]">
                    {t('The complete UI Kit in Figma, adapted to your system in one pass.')}
                  </h3>
                </div>
                <div className="relative flex flex-col gap-3">
                  <p className="flex items-baseline gap-3">
                    <span className="text-[clamp(64px,8vw,104px)] font-medium leading-[0.9] tracking-[-0.04em]">${entitlement.priceUsd}</span>
                    <span className="text-ui text-fg-muted">{t('once')}</span>
                  </p>
                  <p className="text-ui text-fg-muted">{t('one payment, no subscription')}</p>
                </div>
                <div className="relative border-t border-line pt-7">
                  <Features items={[
                    t('Everything in Free'),
                    t('More than {n} modes in one Figma file', { n: free }),
                    t('The complete UI Kit in Figma: 59 editable components generated by the plugin from your agent context'),
                    t('Generated documentation for your system'),
                    t('12 months of plugin updates included'),
                  ]} />
                </div>
                <div className="relative mt-auto flex flex-col gap-2">
                  {entitlement.promo ? (
                    <>
                      <a href="/" className={`${PLAN_CTA} bg-fg text-app hover:opacity-90`}>{t('Get it free')}<Arrow /></a>
                      <p className="text-caption text-fg-muted">{t('No licence needed during the launch offer.')}</p>
                    </>
                  ) : (
                    <a href={checkoutUrl(user?.email)} className={`${PLAN_CTA} bg-fg text-app hover:opacity-90`}>
                      {t('Get Pro')} · ${entitlement.priceUsd}<Arrow />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <CompareTable groups={groups} proPrice={entitlement.priceUsd} />
          </section>

          <section aria-labelledby="pricing-once" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 id="pricing-once" className="text-heading font-semibold">{t('Pay once. Here is what that buys.')}</h2>
              <p className="max-w-2xl text-ui leading-relaxed text-fg-muted">
                {t('What runs on your machine is yours for good. What runs on our servers is included for 12 months.')}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { h: t('Yours for good'), p: t('The configurator, every export, the plugin, manual import, and everything already synced into your Figma files.') },
                { h: t('Included for 12 months'), p: t('New versions of the plugin.') },
                { h: t('After that'), p: t('Renew at a lower price, or keep working on Free. Nothing you made breaks.') },
              ].map((item) => (
                <div key={item.h} className="rounded-xl border border-line bg-surface p-5">
                  <p className="text-ui font-semibold text-fg">{item.h}</p>
                  <p className="mt-1.5 text-body leading-relaxed text-fg-muted">{item.p}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="pricing-faq" className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <h2 id="pricing-faq" className="text-heading font-semibold">{t('Questions')}</h2>
            <div className="border-t border-line">
              <Faq q={t('Is Escala open source?')}>{t('Partly. The configurator and the CLI are MIT, so you can fork and self-host them. The Figma plugin is proprietary: free to install, source not published. Pro pays for the service we host and the plugin, not for the configurator code. If you host the configurator yourself, you set your own limits.')}</Faq>
              <Faq q={t('What happens to a file I already synced?')}>{t('Files you synced during the launch keep everything they have in Figma. Without Pro you can still import tokens.json in the plugin by hand, every brand, theme and viewport, up to 10 modes.')}</Faq>
              <Faq q={t('Why does Figma show fewer modes than I chose?')}>{t('Figma limits modes per collection by its own plan: Starter allows 1, Professional 4. Escala sends what you choose; Figma decides how many columns a file can hold.')}</Faq>
              <Faq q={t('Do I need an account?')}>{t('No. After you pay, Polar shows a licence key. Open the menu and choose Account, then Activate licence. It stays in this browser.')}</Faq>
              <Faq q={t('Can I get a refund?')}>{t('Yes. 14 days from purchase, on request through the contact form. Polar is the merchant of record: payment, invoicing and VAT follow Polar’s terms.')}</Faq>
            </div>
          </section>
        </main>

        <footer className="border-t border-line px-4 py-5 text-center text-caption text-fg-faint">
          {t('Prices in US dollars. Taxes calculated at checkout.')}
        </footer>
      </div>
    </div>
  )
}
