// `/pricing` — the two products, what each plan gets, and the launch promo.
//
// Content mirrors design-plans/pricing-and-packaging.md and the approved
// canvas ("Escala pricing & paywall"). Two rules keep it honest:
//   - The plan LIMITS come from `lib/entitlement.ts` (FREE_MAX_THEMES,
//     PRO_MAX_THEMES), the same constants the sync screen and, from phase 3,
//     `api/tokens.ts` read — so this page cannot promise a number the server
//     disagrees with.
//   - Nothing is shown that does not exist yet. During the free promo (to Oct 31)
//     the Pro CTA opens the configurator; once it ends it goes to the Polar
//     checkout (`lib/polar.ts`);
//     Library · Figma has no published price, so it says so instead of a
//     placeholder; the refund policy is not on the page until it is decided.
//
// A public reading page like /legal: `PublicHeader` on top, one scrolling
// column, readable on a phone (the one place, with About, where that matters).

import { useEffect, type ReactNode } from 'react'
import { PublicHeader } from './PublicReadingPage'
import TopBanner from '../configurator/TopBanner'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n } from '../../lib/i18n'
import { CONTACT_PATH } from '../../lib/legal'
import {
  FREE_MAX_THEMES, PRICING_PATH, PRO_LAUNCH_PRICE_USD, PRO_MAX_THEMES, PRO_PRICE_USD,
} from '../../lib/entitlement'
import { useEntitlement } from '../../lib/useEntitlement'
import { POLAR_CHECKOUT_URL } from '../../lib/polar'

const PRICING_TITLE = 'Pricing — Escala Tokens'
const PRICING_DESCRIPTION = 'Escala is free to build and export. Pro adds what runs on our servers: hosted sync to Figma, the live MCP, and up to 10 themes with every platform mode.'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
const CTA = `inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-ui font-semibold transition-opacity hover:opacity-90 ${FOCUS}`

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-mini font-semibold uppercase tracking-[0.12em] text-fg-faint">{children}</p>
}

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

function Badge({ children, solid }: { children: ReactNode; solid?: boolean }) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-nano font-semibold uppercase tracking-[0.1em] ${
        solid ? 'bg-accent-solid text-accent-ink' : 'border border-line-strong text-fg-muted'
      }`}
    >
      {children}
    </span>
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
  const entitlement = useEntitlement()

  useEffect(() => {
    applyDocumentHead({
      title: t(PRICING_TITLE),
      description: t(PRICING_DESCRIPTION),
      canonicalPath: PRICING_PATH,
      robots: 'index, follow',
    })
  }, [t])

  const max = String(PRO_MAX_THEMES)
  const groups: Group[] = [
    {
      title: t('Build'),
      rows: [
        { label: t('Configurator, every foundation, unlimited themes while editing'), free: true, pro: true },
        { label: t('System Styles'), free: t('All 12'), pro: t('All 12') },
        { label: t('Exports: tokens.json, CSS, W3C, Tailwind, Markdown'), free: true, pro: true },
        { label: t('Generated documentation (Figma doc pages, system README)'), free: null, pro: true },
      ],
    },
    {
      title: 'Figma',
      rows: [
        { label: t('Themes in one Figma file'), free: t('{n} (Light or Dark)', { n: String(FREE_MAX_THEMES) }), pro: t('Up to {max}', { max }) },
        { label: t('Platform modes'), free: 'Desktop', pro: 'Desktop, Tablet, Mobile' },
        { label: t('Manual import of tokens.json'), free: true, pro: true },
        { label: t('Hosted sync (Live Sync and auto-publish)'), free: null, pro: t('12 months') },
      ],
    },
    {
      title: t('AI'),
      rows: [
        { label: t('Offline agent skill and design.md'), free: true, pro: true },
        { label: t('Live MCP against your published system'), free: null, pro: t('12 months') },
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
      {(entitlement.promo || entitlement.launchPrice) && (() => {
        // Oct: the free promo. Nov 1–15: the launch price. After: nothing —
        // the regular price needs no banner. Same strip as the Figma plugin
        // bar (`TopBanner`), above the header; not dismissible, since this
        // page is where the offer is being read.
        const days = entitlement.promo ? entitlement.daysLeft : entitlement.launchDaysLeft
        return (
          <TopBanner>
            <Badge solid>{t('Launch')}</Badge>
            <span>
              {entitlement.promo
                ? t('Everything in Pro is free for everyone until October 31.')
                : t('Escala Pro is ${launch} until November 15, then ${price}.', { launch: String(PRO_LAUNCH_PRICE_USD), price: String(PRO_PRICE_USD) })}
            </span>
            <span className="font-mono tabular-nums text-accent-ui">
              {days === 1 ? t('1 day left') : t('{n} days left', { n: String(days) })}
            </span>
          </TopBanner>
        )
      })()}
      <PublicHeader current="pricing" />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 py-14 md:px-8">
          <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <h1 className="text-[clamp(30px,4.6vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              {t('Your own token system. Free to build. Pro when it has to stay in sync.')}
            </h1>
            <p className="max-w-2xl text-ui leading-relaxed text-fg-muted">
              {t('Escala generates variables with a clear, architecture-agnostic structure. Configuring and exporting is free. Pro pays for what we run for you: hosted sync to Figma, the live MCP, and every theme and platform mode.')}
            </p>
          </section>

          <section aria-labelledby="pricing-escala" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <Eyebrow>{t('Product 1')}</Eyebrow>
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
                    t('All 12 System Styles, unlimited themes while editing'),
                    t('Every export: tokens.json, CSS, W3C, Tailwind, Markdown'),
                    t('Open-source Figma plugin, manual import'),
                    t('{n} theme in Light or Dark, and Desktop mode in Figma', { n: String(FREE_MAX_THEMES) }),
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
                    {t('Your system stays in step with Figma and your agents.')}
                  </h3>
                </div>
                <div className="relative flex flex-col gap-3">
                  <p className="flex items-baseline gap-3">
                    <span className="text-[clamp(64px,8vw,104px)] font-medium leading-[0.9] tracking-[-0.04em]">${entitlement.priceUsd}</span>
                    <span className="text-ui text-fg-muted">{t('once')}</span>
                  </p>
                  <p className="text-ui text-fg-muted">
                    {entitlement.launchPrice
                      ? t('launch price until November 15, then ${price}', { price: String(PRO_PRICE_USD) })
                      : t('one payment, no subscription')}
                  </p>
                </div>
                <div className="relative border-t border-line pt-7">
                  <Features items={[
                    t('Everything in Free'),
                    t('Up to {max} themes in Figma, each with Light + Dark', { max }),
                    t('Desktop, Tablet and Mobile platform modes'),
                    t('Hosted sync: Figma updates when you edit'),
                    t('Live MCP for Cursor, Claude Code and VS Code'),
                    t('Generated documentation for your system'),
                    t('12 months of sync, MCP and updates included'),
                  ]} />
                </div>
                <div className="relative mt-auto flex flex-col gap-2">
                  {entitlement.promo ? (
                    <>
                      <a href="/" className={`${PLAN_CTA} bg-fg text-app hover:opacity-90`}>{t('Use Pro free until October 31')}<Arrow /></a>
                      <p className="text-caption text-fg-muted">{t('No licence needed during the launch offer.')}</p>
                    </>
                  ) : (
                    <a href={POLAR_CHECKOUT_URL} className={`${PLAN_CTA} bg-fg text-app hover:opacity-90`}>
                      {t('Get Pro')} · ${entitlement.priceUsd}<Arrow />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <CompareTable groups={groups} proPrice={entitlement.priceUsd} />
          </section>

          <section aria-labelledby="pricing-library" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <Eyebrow>{t('Product 2')}</Eyebrow>
              <h2 id="pricing-library" className="text-heading font-semibold">Escala Library</h2>
              <p className="max-w-2xl text-ui leading-relaxed text-fg-muted">
                {t('A professional component library wired to the variables Escala generates. Change the brand, the theme or the platform, and every component follows without being touched. Works with Escala Free or Pro.')}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { title: 'Library · Figma', body: t('The professional Figma file, linked to your Escala variables.'), note: t('Price announced soon') },
                { title: 'Library · Code', body: t('The same components in React, reading your Escala variables as CSS custom properties.'), note: null },
                { title: 'Complete', body: t('Escala Pro, Library · Figma and Library · Code in one purchase.'), note: null },
              ].map((card) => (
                <div key={card.title} className="flex flex-col gap-4 rounded-2xl border border-dashed border-line-strong p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-title font-semibold">{card.title}</h3>
                    <Badge>{t('Coming soon')}</Badge>
                  </div>
                  <p className="text-body leading-relaxed text-fg-muted">{card.body}</p>
                  {card.note && <p className="text-body font-semibold text-fg">{card.note}</p>}
                  <a href={CONTACT_PATH} className={`${CTA} mt-auto border border-line-strong text-fg`}>{t('Tell me when it ships')}</a>
                </div>
              ))}
            </div>
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
                { h: t('Included for 12 months'), p: t('Hosted sync, the live MCP and new versions of the plugin.') },
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
              <Faq q={t('Is Escala open source?')}>{t('Partly. The configurator, the CLI and the MCP server are MIT, so you can fork and self-host them. The Figma plugin is proprietary: free to install, source not published. Pro pays for the service we host and the plugin, not for the configurator code. If you host the configurator yourself, you set your own limits.')}</Faq>
              <Faq q={t('What happens to a file I already synced?')}>{t('Files you synced during the launch keep everything they have in Figma. Without Pro, hosted sync stops; you can still import tokens.json in the plugin by hand, with one theme in Desktop mode.')}</Faq>
              <Faq q={t('Why does Figma show fewer modes than I chose?')}>{t('Figma limits modes per collection by its own plan: Starter allows 1, Professional 4. Escala sends what you choose; Figma decides how many columns a file can hold.')}</Faq>
              <Faq q={t('Do I need an account?')}>{t('No. You get a licence key by email after paying and paste it once in the app.')}</Faq>
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
