// OVERVIEW — the design system at a glance: one card per foundation, each a
// small picture of what the brand on screen holds. The brand switcher and
// Add brand live in the page header. No counters and no checklist:
// a number appears only where something needs attention.

import { useMemo, type ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import { useSavedBrandKeys } from '../../../lib/libraryStatus'
import { useOneThemePlan } from '../../../lib/access'
import { brandThemesSummary, plannedBrandThemes, shippedThemes } from '../../../lib/brandThemes'
import { fontStack } from '../../../lib/fonts'
import { foundationFacts } from '../../../lib/systemDashboard'
import { themeBrandRamp } from '../../../lib/themeSources'
import { Tag, TEXT_LINK } from './parts'
import type { Dashboard } from './dashboardData'

const TONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

function FoundationCard({ title, line, tag, picture, onClick, hint, empty }: {
  title: string
  line: string
  tag?: ReactNode
  picture: ReactNode
  onClick: () => void
  hint: string
  /** No brand yet: a quiet placeholder, not a picture of the scaffold. */
  empty?: boolean
}) {
  if (empty) {
    return (
      <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-dashed border-line bg-surface/40 p-4">
        <span aria-hidden className="mb-2 flex h-20 items-center justify-center">
          <span className="block h-9 w-full rounded-lg border border-dashed border-line/70 bg-elevated/30" />
        </span>
        <span className="text-ui font-semibold text-fg-muted">{title}</span>
        <span className="truncate text-caption text-fg-faint">{line}</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <span aria-hidden className="mb-2 flex h-20 items-center justify-center">{picture}</span>
      <span className="flex items-center gap-2">
        <span className="text-ui font-semibold text-fg">{title}</span>
        {tag}
      </span>
      <span className="truncate text-caption text-fg-muted">{line}</span>
    </button>
  )
}

export default function OverviewPage({ dash, header, brands, onOpenFoundation, onOpenBrand, onOpenStatus }: {
  dash: Dashboard
  header: ReactNode
  brands: ReactNode
  /** Opens that foundation's page in Docs. */
  onOpenFoundation: (key: string) => void
  /** Color opens the brand preview, on the Color edition. */
  onOpenBrand?: () => void
  onOpenStatus: () => void
}) {
  const { t } = useI18n()
  const free = useOneThemePlan()
  const { store, roles, contrast } = dash
  const brand = roles.brand
  const facts = useMemo(() => foundationFacts(store, brand), [store, brand])
  const ramp = themeBrandRamp(brand, store.themeSources, store.themeKinds, store)
  const themes = t(brandThemesSummary(plannedBrandThemes(
    shippedThemes(store.brandThemes, brand), store.themeKinds[brand] === 'dark' ? 'dark' : 'light', free,
  )))
  const fonts = facts.fonts.heading === facts.fonts.body
    ? facts.fonts.body
    : `${facts.fonts.heading} · ${facts.fonts.body}`
  // The store keeps scaffold `light`/`dark` with the default accent when no
  // brand was added; reading those would draw a brand nobody made.
  const savedBrands = useSavedBrandKeys()
  const empty = savedBrands.length === 0
  const failing = empty ? 0 : contrast.failing.length
  const none = t('Not set yet')
  const openHint = t('Open in Docs')

  return (
    <>
      {header}

      <section aria-labelledby="overview-foundations" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 id="overview-foundations" className="text-ui font-semibold text-fg">{t('Foundations')}</h3>
          {brands}
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(10.5rem,1fr))]">
          <FoundationCard
            empty={empty}
            title={t('Color')}
            line={empty ? none : `${(ramp?.[9] ?? store.primaryColor).toUpperCase()} · ${themes}`}
            tag={failing > 0 ? <Tag tone="warning">{t('{n} pairs under AA', { n: failing })}</Tag> : undefined}
            hint={onOpenBrand ? t('Brand preview') : openHint}
            onClick={() => (onOpenBrand ? onOpenBrand() : onOpenFoundation('color'))}
            picture={(
              <span className="flex h-9 w-full overflow-hidden rounded-lg border border-fg/10">
                {TONES.map((tone) => <span key={tone} className="h-full flex-1" style={{ background: ramp?.[tone] ?? 'transparent' }} />)}
              </span>
            )}
          />
          <FoundationCard
            empty={empty}
            title={t('Typography')}
            line={empty ? none : fonts}
            hint={openHint}
            onClick={() => onOpenFoundation('typography')}
            picture={<span className="text-[40px] font-semibold leading-none text-fg" style={{ fontFamily: fontStack(facts.fonts.heading) }}>Aa</span>}
          />
          <FoundationCard
            empty={empty}
            title={t('Radius')}
            line={empty ? none : `${facts.radius.boxes} · ${facts.radius.fields} · ${facts.radius.selectors}`}
            hint={`${t('Boxes')} ${facts.radius.boxes} · ${t('Fields')} ${facts.radius.fields} · ${t('Selectors')} ${facts.radius.selectors}`}
            onClick={() => onOpenFoundation('radius')}
            picture={(
              <span
                className="block h-14 w-14 border-l-2 border-t-2 border-fg/80"
                style={{ borderTopLeftRadius: Math.min(facts.radius.boxes * 2, 56) }}
              />
            )}
          />
          <FoundationCard
            empty={empty}
            title={t('Spacing')}
            line={empty ? none : `${facts.spacing ? t(facts.spacing) : t('Custom')}${facts.fieldHeight ? ` · ${t('Fields')} ${facts.fieldHeight}` : ''}`}
            hint={openHint}
            onClick={() => onOpenFoundation('spacing')}
            picture={(
              <span className="flex items-end gap-1.5">
                {[10, 18, 28, 40].map((h) => <span key={h} className="w-3 rounded-[3px] bg-fg/45" style={{ height: h }} />)}
              </span>
            )}
          />
          <FoundationCard
            empty={empty}
            title={t('Shadow')}
            line={empty ? none : facts.shadow ? t(facts.shadow) : t('Custom')}
            hint={openHint}
            onClick={() => onOpenFoundation('shadow')}
            picture={(
              // A shadow is judged on a light surface, so the well stays light in dark chrome.
              <span className="light flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-elevated">
                <span className="block h-8 w-8 rounded-lg bg-app" style={{ boxShadow: facts.shadowMd }} />
              </span>
            )}
          />
        </div>
        {failing > 0 && (
          <button type="button" onClick={onOpenStatus} className={`${TEXT_LINK} self-start`}>{t('See what fails')}</button>
        )}
      </section>
    </>
  )
}
