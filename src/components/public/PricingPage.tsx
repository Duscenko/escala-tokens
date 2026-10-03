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

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-[3px] flex-shrink-0 text-fg-muted">
      <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-body leading-relaxed text-fg">
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

type Cell = string | null
type Row = { label: string; free: Cell; pro: Cell }
type Group = { title: string; rows: Row[] }

function CompareTable({ groups }: { groups: Group[] }) {
  const { t } = useI18n()
  const cell = (value: Cell) =>
    value === null
      ? <span className="text-fg-faint">{t('Not included')}</span>
      : <span className="text-fg">{value}</span>
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] border-collapse text-body">
        <caption className="px-5 pt-5 pb-2 text-left text-ui font-semibold text-fg">{t('Compare Escala plans')}</caption>
        <thead>
          <tr className="text-mini font-semibold uppercase tracking-[0.12em] text-fg-faint">
            <th scope="col" className="px-5 py-3 text-left font-semibold">{t('Feature')}</th>
            <th scope="col" className="w-[24%] px-5 py-3 text-left font-semibold">{t('Free')}</th>
            <th scope="col" className="w-[24%] px-5 py-3 text-left font-semibold">Pro</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title}>
            <tr className="border-t border-line">
              <th colSpan={3} scope="colgroup" className="px-5 pt-4 pb-2 text-left text-caption font-semibold text-accent-ui">
                {group.title}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.label} className="border-t border-line/60">
                <th scope="row" className="px-5 py-3 text-left font-normal text-fg-muted">{row.label}</th>
                <td className="px-5 py-3">{cell(row.free)}</td>
                <td className="px-5 py-3">{cell(row.pro)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
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
        { label: t('Configurator, every foundation, unlimited themes while editing'), free: t('Included'), pro: t('Included') },
        { label: t('System Styles'), free: t('All 12'), pro: t('All 12') },
        { label: t('Exports: tokens.json, CSS, W3C, Tailwind, Markdown'), free: t('Included'), pro: t('Included') },
        { label: t('Generated documentation (Figma doc pages, system README)'), free: null, pro: t('Included') },
      ],
    },
    {
      title: 'Figma',
      rows: [
        { label: t('Themes in one Figma file'), free: t('{n} (Light + Dark)', { n: String(FREE_MAX_THEMES) }), pro: t('Up to {max}', { max }) },
        { label: t('Platform modes'), free: 'Desktop', pro: 'Desktop, Tablet, Mobile' },
        { label: t('Manual import of tokens.json'), free: t('Included'), pro: t('Included') },
        { label: t('Hosted sync (Live Sync and auto-publish)'), free: null, pro: t('12 months') },
      ],
    },
    {
      title: t('AI'),
      rows: [
        { label: t('Offline agent skill and design.md'), free: t('Included'), pro: t('Included') },
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
      <PublicHeader />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {(entitlement.promo || entitlement.launchPrice) && (() => {
          // Oct: the free promo. Nov 1–15: the launch price. After: nothing —
          // the regular price needs no banner.
          const days = entitlement.promo ? entitlement.daysLeft : entitlement.launchDaysLeft
          return (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-accent-ui/[0.08] px-4 py-2.5 text-body">
              <Badge solid>{t('Launch')}</Badge>
              <span className="text-fg">
                {entitlement.promo
                  ? t('Everything in Pro is free for everyone until October 31.')
                  : t('Escala Pro is ${launch} until November 15, then ${price}.', { launch: String(PRO_LAUNCH_PRICE_USD), price: String(PRO_PRICE_USD) })}
              </span>
              <span className="font-mono tabular-nums text-accent-ui">
                {days === 1 ? t('1 day left') : t('{n} days left', { n: String(days) })}
              </span>
            </div>
          )
        })()}

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

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
                <div>
                  <h3 className="text-title font-semibold">{t('Free')}</h3>
                  <p className="mt-1 text-body text-fg-muted">{t('Build the whole system and take it anywhere by hand.')}</p>
                </div>
                <p className="flex items-baseline gap-2">
                  <span className="text-[40px] font-semibold leading-none tracking-[-0.02em]">$0</span>
                  <span className="text-body text-fg-faint">{t('forever')}</span>
                </p>
                <a href="/" className={`${CTA} border border-line-strong text-fg`}>{t('Open the configurator')}</a>
                <Features items={[
                  t('All 12 System Styles, unlimited themes while editing'),
                  t('Every export: tokens.json, CSS, W3C, Tailwind, Markdown'),
                  t('Open-source Figma plugin, manual import'),
                  t('{n} theme (Light + Dark) and Desktop mode in Figma', { n: String(FREE_MAX_THEMES) }),
                  t('Offline agent skill, GitHub push, CLI'),
                ]} />
              </div>

              <div className="flex flex-col gap-5 rounded-2xl border border-accent-ui/60 bg-surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-title font-semibold">Pro</h3>
                    <p className="mt-1 text-body text-fg-muted">{t('Your system stays in step with Figma and your agents.')}</p>
                  </div>
                  <Badge solid>{t('One-time')}</Badge>
                </div>
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[40px] font-semibold leading-none tracking-[-0.02em]">${entitlement.priceUsd}</span>
                  <span className="text-body text-fg-muted">
                    {entitlement.launchPrice
                      ? t('launch price until November 15, then ${price}', { price: String(PRO_PRICE_USD) })
                      : t('one payment, no subscription')}
                  </span>
                </p>
                {entitlement.promo ? (
                  <div className="flex flex-col gap-2">
                    <a href="/" className={`${CTA} bg-accent-solid text-accent-ink`}>{t('Use Pro free until October 31')}</a>
                    <p className="text-caption text-fg-faint">{t('No licence needed during the launch offer.')}</p>
                  </div>
                ) : (
                  <a href={POLAR_CHECKOUT_URL} className={`${CTA} bg-accent-solid text-accent-ink`}>{t('Get Pro')}</a>
                )}
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
            </div>

            <CompareTable groups={groups} />
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
              <Faq q={t('Is Escala open source?')}>{t('Yes. The configurator, the Figma plugin, the CLI and the MCP server are MIT. Pro pays for the service we host, not for the code. If you host it yourself, you set your own limits.')}</Faq>
              <Faq q={t('What happens on November 1?')}>{t('Files you synced during the launch keep everything they have in Figma. Without Pro, hosted sync stops; you can still import tokens.json in the plugin by hand, with one theme in Desktop mode.')}</Faq>
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
