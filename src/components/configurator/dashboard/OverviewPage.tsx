// OVERVIEW — a modes table. Each saved brand is a column, each foundation is
// a row, and the last column is the empty slot that adds a brand (the same
// gesture as a Figma mode). The column on screen carries a 2px rule in that
// brand's own colour. Cells carry a short summary, not a specimen. A number
// appears only where a contrast pair fails, and only on the brand on screen.

import { useMemo, type ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import { useSavedBrandKeys } from '../../../lib/libraryStatus'
import { useOneThemePlan } from '../../../lib/access'
import { wcagRatio } from '../../../lib/color/apca'
import { BRAND_THEME_DEFS, brandThemesSummary, plannedBrandThemes, shippedThemes } from '../../../lib/brandThemes'
import { fontStack } from '../../../lib/fonts'
import { foundationFacts, type FoundationFacts } from '../../../lib/systemDashboard'
import { useTheme } from '../../../lib/theme'
import { themeBrandRamp, themeDisplayName } from '../../../lib/themeSources'
import { AppearanceGlyph } from '../colorControls'
import { ThemeAvatar } from '../ThemeLibraryRail'
import { CHROME_CONTROL_SHELL } from '../themeWorkspaceLayout'
import { Tag, TEXT_LINK } from './parts'
import type { Dashboard } from './dashboardData'
import type { ColorScale } from '../../../types/tokens'

/** Chrome page the rule and Edit sit on. Same hexes as `--app`. */
const CHROME_PAGE = { dark: '#0e0f13', light: '#fdfdff' } as const
const MARK_TONES = [9, 10, 8, 11, 7, 12, 6, 5, 4, 3, 2, 1] as const

/** The brand's own colour, walked only when the anchor cannot be read on the chrome. */
function brandMark(ramp: ColorScale | undefined, fallback: string, page: string): string {
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const tone of MARK_TONES) {
    const hex = ramp?.[tone]
    if (hex && !seen.has(hex)) {
      seen.add(hex)
      candidates.push(hex)
    }
  }
  if (!seen.has(fallback)) candidates.push(fallback)
  for (const hex of candidates) {
    try {
      if (wcagRatio(hex, page) >= 4.5) return hex
    } catch {
      /* a value the contrast parser rejects is not a mark */
    }
  }
  return candidates[0] ?? fallback
}

const TONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
const ROWS = ['color', 'radius', 'spacing', 'shadow', 'typography'] as const
type RowKey = (typeof ROWS)[number]

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'
const RULE = 'border-line'
const ROW_H = 'h-11'

function PlusGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
    </svg>
  )
}

/** Read-only light/dark switch — same shell as brand theme pickers in Color. */
function ThemeMarks({ ids }: { ids: readonly string[] }) {
  const { t } = useI18n()
  const summary = t(brandThemesSummary(ids))
  return (
    <span
      role="group"
      aria-label={summary}
      title={summary}
      className={`pointer-events-none flex h-7 flex-shrink-0 select-none items-center gap-0.5 rounded-lg border border-line p-0.5 ${CHROME_CONTROL_SHELL}`}
    >
      {BRAND_THEME_DEFS.map((def) => {
        const on = ids.includes(def.id)
        return (
          <span
            key={def.id}
            aria-hidden
            title={t(def.label)}
            className={`flex h-6 min-w-[1.75rem] items-center justify-center gap-0.5 rounded-md px-1 ${
              on ? 'bg-fg/8 text-fg' : 'text-fg-faint opacity-50'
            }`}
          >
            <AppearanceGlyph kind={def.base} size={12} />
            {on ? <CheckGlyph /> : null}
          </span>
        )
      })}
    </span>
  )
}

export default function OverviewPage({
  dash, header, onOpenFoundation, onOpenBrand, onOpenStatus, onSelectBrand, onEditBrand, onCreateBrand, canCreateBrand, createBrandTitle,
}: {
  dash: Dashboard
  header: ReactNode
  /** Opens that foundation's page in Docs. */
  onOpenFoundation: (key: string) => void
  /** Color opens the brand preview, on the Color edition. */
  onOpenBrand?: () => void
  onOpenStatus: () => void
  /** Makes that brand the one on screen. Stays on Overview when the column name is clicked. */
  onSelectBrand: (key: string) => void
  /** Opens that brand in the editor. */
  onEditBrand: (key: string) => void
  onCreateBrand: () => void
  canCreateBrand: boolean
  /** Shown on the add control when the plan cap blocks another brand. */
  createBrandTitle?: string
}) {
  const { t } = useI18n()
  const free = useOneThemePlan()
  const chrome = useTheme()
  const { store, roles, contrast } = dash
  const brand = roles.brand
  const savedBrands = useSavedBrandKeys()
  const failing = savedBrands.length === 0 ? 0 : contrast.failing.length
  const openHint = t('Open in Docs')

  const columns = useMemo(() => savedBrands.map((key) => {
    const facts = foundationFacts(store, key)
    const ramp = themeBrandRamp(key, store.themeSources, store.themeKinds, store)
    const themeIds = plannedBrandThemes(
      shippedThemes(store.brandThemes, key), store.themeKinds[key] === 'dark' ? 'dark' : 'light', free,
    )
    return {
      key,
      facts,
      ramp,
      themeIds,
      appearance: store.themeKinds[key] === 'dark' ? 'dark' as const : 'light' as const,
      name: themeDisplayName(key, store.themeLabels),
      mark: brandMark(ramp, store.primaryColor, CHROME_PAGE[chrome]),
    }
  }), [savedBrands, store, free, chrome])

  const open = (key: string, go: () => void) => {
    onSelectBrand(key)
    go()
  }

  const rowLabel: Record<RowKey, string> = {
    color: t('Color'),
    radius: t('Radius'),
    spacing: t('Spacing'),
    shadow: t('Shadow'),
    typography: t('Typography'),
  }

  return (
    <>
      {header}

      <section aria-labelledby="overview-system" className="flex flex-col gap-3">
        <h3 id="overview-system" className="text-ui font-semibold text-fg">{t('Design system')}</h3>
        <div className="max-w-full overflow-x-auto">
          <table
            className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-line"
            style={{ minWidth: `calc(9rem + ${columns.length} * 18rem + 3rem)` }}
          >
            <colgroup>
              <col className="w-36" />
              {columns.map((column) => <col key={column.key} style={{ width: '18rem' }} />)}
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={`sticky left-0 z-[1] border-b ${RULE} bg-app px-3 text-left text-caption font-medium text-fg-muted ${ROW_H}`}>
                  {t('Foundation')}
                </th>
                {columns.map((column) => {
                  const selected = column.key === brand
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={`border-b border-l ${RULE} bg-surface p-0 ${ROW_H}`}
                      style={selected ? { boxShadow: `inset 0 -2px 0 0 ${column.mark}` } : undefined}
                    >
                      <div className="flex h-full items-center gap-2 px-3">
                        <button
                          type="button"
                          onClick={() => onSelectBrand(column.key)}
                          aria-pressed={selected}
                          title={column.name}
                          className={`flex h-full min-w-0 flex-1 items-center gap-2 text-left text-ui font-semibold transition-colors hover:bg-fg/[0.04] ${FOCUS} ${selected ? 'text-fg' : 'text-fg-muted'}`}
                        >
                          <ThemeAvatar
                            size={22}
                            ramp={column.ramp}
                            appearance={column.appearance}
                            fallback={store.primaryColor}
                          />
                          <span className="min-w-0 flex-1 truncate">{column.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditBrand(column.key)}
                          title={t('Edit brand')}
                          className={`flex-shrink-0 rounded-sm text-caption font-medium text-fg hover:underline ${FOCUS}`}
                        >
                          {t('Edit')}
                        </button>
                      </div>
                    </th>
                  )
                })}
                <th scope="col" className={`border-b border-l ${RULE} bg-surface p-0 text-right ${ROW_H}`}>
                  <div className="flex h-full items-center justify-end px-3">
                    <button
                      type="button"
                      onClick={onCreateBrand}
                      disabled={!canCreateBrand}
                      aria-label={t('Add new brand')}
                      title={canCreateBrand ? t('Add new brand') : createBrandTitle}
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg-muted ${FOCUS}`}
                    >
                      <PlusGlyph />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, index) => {
                const last = index === ROWS.length - 1
                return (
                  <tr key={row}>
                    <th
                      scope="row"
                      className={`sticky left-0 z-[1] bg-app px-3 text-left text-caption font-medium text-fg-muted ${ROW_H} ${last ? '' : `border-b ${RULE}`}`}
                    >
                      {rowLabel[row]}
                    </th>
                    {columns.map((column) => {
                      const selected = column.key === brand
                      const accentHex = (column.ramp?.[9] ?? store.primaryColor).toUpperCase()
                      return (
                        <td
                          key={column.key}
                          className={`border-l ${RULE} bg-surface p-0 ${ROW_H} ${last ? '' : 'border-b'}`}
                        >
                          <SummaryCell
                            row={row}
                            facts={column.facts}
                            ramp={column.ramp}
                            themeIds={column.themeIds}
                            accentHex={accentHex}
                            failing={selected && row === 'color' ? failing : 0}
                            hint={row === 'color' && onOpenBrand ? t('Brand preview') : openHint}
                            onClick={() => open(column.key, () => {
                              if (row === 'color') (onOpenBrand ? onOpenBrand() : onOpenFoundation('color'))
                              else onOpenFoundation(row)
                            })}
                          />
                        </td>
                      )
                    })}
                    <td className={`border-l ${RULE} bg-surface ${ROW_H} ${last ? '' : 'border-b'}`} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {failing > 0 && (
          <button type="button" onClick={onOpenStatus} className={`${TEXT_LINK} self-start`}>{t('See what fails')}</button>
        )}
      </section>
    </>
  )
}

function SummaryCell({
  row, facts, ramp, themeIds, accentHex, failing, hint, onClick,
}: {
  row: RowKey
  facts: FoundationFacts
  ramp: ColorScale | undefined
  themeIds: readonly string[]
  accentHex: string
  failing: number
  hint: string
  onClick: () => void
}) {
  const { t } = useI18n()
  const fonts = facts.fonts.heading === facts.fonts.body
    ? facts.fonts.body
    : `${facts.fonts.heading} · ${facts.fonts.body}`
  const radius = `${facts.radius.boxes} · ${facts.radius.fields} · ${facts.radius.selectors}`
  const spacing = `${facts.spacing ? t(facts.spacing) : t('Custom')}${facts.fieldHeight ? ` · ${facts.fieldHeight}` : ''}`
  const shadow = facts.shadow ? t(facts.shadow) : t('Custom')

  return (
    <button
      type="button"
      onClick={onClick}
      title={row === 'radius'
        ? `${t('Boxes')} ${facts.radius.boxes} · ${t('Fields')} ${facts.radius.fields} · ${t('Selectors')} ${facts.radius.selectors}`
        : hint}
      className={`flex h-full w-full min-w-0 items-center gap-2 px-3 text-left transition-colors hover:bg-fg/[0.04] ${FOCUS}`}
    >
      {row === 'color' && (
        <>
          <span aria-hidden className="flex h-3 w-14 flex-shrink-0 overflow-hidden rounded-sm border border-fg/10">
            {TONES.map((tone) => <span key={tone} className="h-full flex-1" style={{ background: ramp?.[tone] ?? 'transparent' }} />)}
          </span>
          <span className="sr-only">{t(brandThemesSummary(themeIds))}</span>
          <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">{accentHex}</span>
          <ThemeMarks ids={themeIds} />
          {failing > 0 && <Tag tone="warning">{t('{n} pairs under AA', { n: failing })}</Tag>}
        </>
      )}
      {row === 'radius' && (
        <>
          <span
            aria-hidden
            className="block h-3.5 w-3.5 flex-shrink-0 border-l-2 border-t-2 border-fg-muted"
            style={{ borderTopLeftRadius: Math.min(facts.radius.boxes, 8) }}
          />
          <span className="min-w-0 flex-1 truncate text-caption tabular-nums text-fg-muted">{radius}</span>
        </>
      )}
      {row === 'spacing' && (
        <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">{spacing}</span>
      )}
      {row === 'shadow' && (
        <>
          <span aria-hidden className="light flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-elevated">
            <span className="block h-2.5 w-2.5 rounded-[3px] bg-app" style={{ boxShadow: facts.shadowMd }} />
          </span>
          <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">{shadow}</span>
        </>
      )}
      {row === 'typography' && (
        <>
          <span aria-hidden className="flex-shrink-0 text-ui font-semibold leading-none text-fg" style={{ fontFamily: fontStack(facts.fonts.heading) }}>Aa</span>
          <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">{fonts}</span>
        </>
      )}
    </button>
  )
}
