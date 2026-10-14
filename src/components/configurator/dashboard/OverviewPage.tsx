// OVERVIEW — a modes table. Each saved brand is a column, each foundation is
// a row, and the last column is the empty slot that adds a brand (the same
// gesture as a Figma mode). The column on screen carries a 2px rule in that
// brand's own colour. Cells carry a short summary, not a specimen. A number
// appears only where a contrast pair fails, and only on the brand on screen.

import { useMemo, useState, type ReactNode } from 'react'
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
import { UpgradeToProDialog } from '../UpgradeToProNotice'
import { SOURCE_LABEL, Tag, TEXT_LINK } from './parts'
import type { SourceState } from '../../../lib/systemDashboard'
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

/** The themes a brand ships, as labelled chips. On Free a brand ships one
 *  theme: the other keeps its place with a lock and the PRO mark, and opens
 *  the upgrade notice. */
function ThemesCell({ ids, free, selected, brandName, onOpen }: {
  ids: readonly string[]
  free: boolean
  selected: boolean
  brandName: string
  onOpen?: (appearance: 'light' | 'dark') => void
}) {
  const { t } = useI18n()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const summary = t(brandThemesSummary(ids))
  return (
    <div role="group" aria-label={summary} className={`flex h-full min-w-0 items-center gap-1.5 px-3 ${selected ? CHROME_CONTROL_SHELL : ''}`}>
      <span className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-elevated p-0.5">
        {BRAND_THEME_DEFS.map((def) => {
          const on = ids.includes(def.id)
          const locked = free && !on
          const name = t(def.label)
          if (locked) {
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => setUpgradeOpen(true)}
                title={t('Upgrade to Pro')}
                aria-label={`${name} — ${t('Upgrade to Pro')}`}
                className={`inline-flex h-[27px] items-center gap-1.5 rounded-md px-1.5 text-caption text-fg-faint hover:bg-fg/[0.05] hover:text-fg-muted ${FOCUS}`}
              >
                <AppearanceGlyph kind={def.base} size={12} />
                {name}
                <LockGlyph />
                <span className="flex-shrink-0 rounded-full bg-accent-solid px-1.5 py-px text-nano font-semibold tracking-[0.1em] text-accent-ink">PRO</span>
              </button>
            )
          }
          const chip = `inline-flex h-[27px] items-center gap-1.5 rounded-md px-1.5 text-caption ${
            on ? 'bg-fg/[0.08] text-fg-muted' : 'text-fg-faint opacity-50'
          }`
          if (on && onOpen) {
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onOpen(def.base)}
                title={t('Open {theme} colors', { theme: name })}
                aria-label={`${brandName} — ${t('Open {theme} colors', { theme: name })}`}
                className={`${chip} transition-colors hover:bg-fg/[0.14] hover:text-fg ${FOCUS}`}
              >
                <AppearanceGlyph kind={def.base} size={12} />
                {name}
              </button>
            )
          }
          return (
            <span key={def.id} className={chip}>
              <AppearanceGlyph kind={def.base} size={12} />
              {name}
            </span>
          )
        })}
      </span>
      {upgradeOpen && <UpgradeToProDialog open onClose={() => setUpgradeOpen(false)} />}
    </div>
  )
}

const SYNC_DOT: Record<SourceState, string> = {
  synced: 'bg-status-success-solid',
  stale: 'bg-status-warning-solid',
  never: 'bg-fg-faint',
}

/** One destination's sync state: name and a dot. The dot is never the only
 *  carrier — the label and title say the state in words. */
function SyncChip({ name, state, detail, onClick }: {
  name: string
  state: SourceState
  detail: string | null
  onClick: () => void
}) {
  const { t } = useI18n()
  const status = t(SOURCE_LABEL[state])
  const title = [`${name} — ${status}`, detail].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-fg/[0.05] hover:text-fg ${FOCUS}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${SYNC_DOT[state]}`} />
      {name}
      <span className="hidden font-normal text-fg-faint xl:inline">{status}</span>
    </button>
  )
}

function LockGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function OverviewPage({
  dash, header, onOpenFoundation, onOpenBrand, onOpenStatus, onSelectBrand, onEditBrand, onOpenColorTheme, timeAgo, onSyncFigma, onOpenGithub,
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
  /** A theme chip opens Variables · Color for that brand in that appearance. */
  onOpenColorTheme?: (brand: string, appearance: 'light' | 'dark') => void
  /** "2h ago" for the sync rows. */
  timeAgo: (iso: string) => string
  onSyncFigma: () => void
  onOpenGithub: () => void
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

      <section aria-labelledby="overview-system" className="flex w-full min-w-0 flex-col gap-3">
        {/* The wrapper owns the frame and the scroll. `overflow-hidden` on the table
            itself made IT the scroll container, so the sticky name and Add brand
            columns stuck to a box that never scrolled and fell off at tight widths. */}
        <div className="min-w-0 w-full overflow-x-auto rounded-xl border border-line">
          <table
            className="w-full min-w-full table-auto border-separate border-spacing-0"
          >
            <colgroup>
              <col className="w-36" />
              {/* Brand columns HUG their content (a 1px width is a floor, so each
                  takes its nowrap min-content). The trailing Add-brand column has no
                  width and takes the slack, like an empty Figma mode slot. */}
              {columns.map((column) => <col key={column.key} style={{ width: '1px' }} />)}
              <col />
            </colgroup>
            <thead>
              <tr>
                <th
                  id="overview-system"
                  scope="colgroup"
                  colSpan={columns.length + 1}
                  className={`sticky left-0 border-b ${RULE} bg-side-panel px-3 text-left text-strong font-medium text-fg ${ROW_H}`}
                >
                  {t('Brands')}
                </th>
                <th scope="col" className={`sticky right-0 z-[2] whitespace-nowrap border-b border-l ${RULE} bg-side-panel p-0 ${ROW_H}`}>
                  {/* Where the whole system goes. Each chip is the page for that destination. */}
                  <div className="flex h-full items-center justify-end gap-1.5 px-3">
                    <SyncChip
                      name="Figma"
                      state={dash.figma}
                      detail={store.figmaLastPublishAt ? timeAgo(store.figmaLastPublishAt) : null}
                      onClick={onSyncFigma}
                    />
                    <SyncChip
                      name="GitHub"
                      state={dash.github}
                      detail={store.githubRepo ? [store.githubRepo, store.githubLastPushAt ? timeAgo(store.githubLastPushAt) : null].filter(Boolean).join(' · ') : null}
                      onClick={onOpenGithub}
                    />
                  </div>
                </th>
              </tr>
              <tr>
                <th scope="col" className={`sticky left-0 z-[1] border-b ${RULE} bg-side-panel px-3 text-left text-ui font-medium text-fg ${ROW_H}`}>
                  {t('Foundation')}
                </th>
                {columns.map((column) => {
                  const selected = column.key === brand
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={`border-b border-l ${RULE} ${selected ? 'bg-surface' : 'bg-app'} whitespace-nowrap p-0 ${ROW_H}`}
                      style={selected ? { boxShadow: `inset 0 -2px 0 0 ${column.mark}` } : undefined}
                    >
                      <div className="flex h-full items-center gap-4 px-3">
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
                          <span className="min-w-0 max-w-[12rem] flex-1 truncate">{column.name}</span>
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
                <th scope="col" className={`border-b border-l ${RULE} bg-side-panel p-0 ${ROW_H}`} />
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`sticky left-0 z-[1] border-b ${RULE} bg-app px-3 text-left text-caption font-medium text-fg-muted ${ROW_H}`}>
                  {t('Themes')}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className={`border-b border-l ${RULE} ${column.key === brand ? 'bg-surface' : 'bg-app'} whitespace-nowrap p-0 ${ROW_H}`}>
                    <ThemesCell
                      ids={column.themeIds}
                      free={free}
                      selected={column.key === brand}
                      brandName={column.name}
                      onOpen={onOpenColorTheme ? (appearance) => onOpenColorTheme(column.key, appearance) : undefined}
                    />
                  </td>
                ))}
                <td className={`border-b border-l ${RULE} bg-app ${ROW_H}`} />
              </tr>
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
                          className={`border-l ${RULE} ${selected ? 'bg-surface' : 'bg-app'} whitespace-nowrap p-0 ${ROW_H} ${last ? '' : 'border-b'}`}
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
                    <td className={`border-l ${RULE} bg-app ${ROW_H} ${last ? '' : 'border-b'}`} />
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
