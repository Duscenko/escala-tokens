import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apcaLc, wcagRatio } from '../../lib/color/apca'
import { readableInk } from '../../lib/colorUtils'
import {
  BRAND_EXTRA_LABEL,
  GLOBAL_FAMILY,
  SLOT_DISPLAY_LABEL,
  scaleForFamily,
  type FamilySlot,
  type PrimitiveScales,
} from '../../lib/themeSources'
import { useDesignStore } from '../../store/useDesignStore'
import type { ThemeAppearance } from '../../lib/themeModes'
import { useI18n } from '../../lib/i18n'

const TONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

type Metric = 'wcag' | 'apca'

type FamilyId = FamilySlot | 'secondary' | 'tertiary'

type GridFamily = {
  id: FamilyId
  label: string
  hex: string
  tones: Record<number, string>
}

const FAMILY_ORDER: FamilyId[] = [
  'brand', 'secondary', 'tertiary', 'gray', 'success', 'warning', 'error', 'info',
]

/** Each threshold named by what it is for, so the grid answers "can I set
 *  body text on this?" instead of asking people to know what Lc 60 means.
 *  APCA levels follow its bronze use cases. */
const FILTERS: Record<Metric, { value: number; label: string }[]> = {
  wcag: [
    { value: 3, label: 'Large text · UI' },
    { value: 4.5, label: 'Body text' },
    { value: 7, label: 'Body text, enhanced' },
  ],
  apca: [
    { value: 15, label: 'Non-text' },
    { value: 30, label: 'Placeholders' },
    { value: 45, label: 'Headings · UI' },
    { value: 60, label: 'Content text' },
    { value: 75, label: 'Body text' },
  ],
}

/** Opens on body text: the check most people come for. */
const BODY_FILTER: Record<Metric, number> = { wcag: 4.5, apca: 75 }

function primitivesFromStore(s: {
  primaryScale: PrimitiveScales['primaryScale']
  primaryDarkScale?: PrimitiveScales['primaryDarkScale']
  grayLightScale: PrimitiveScales['grayLightScale']
  grayDarkScale?: PrimitiveScales['grayDarkScale']
  errorScale: PrimitiveScales['errorScale']
  errorDarkScale?: PrimitiveScales['errorDarkScale']
  warningScale: PrimitiveScales['warningScale']
  warningDarkScale?: PrimitiveScales['warningDarkScale']
  successScale: PrimitiveScales['successScale']
  successDarkScale?: PrimitiveScales['successDarkScale']
  infoScale: PrimitiveScales['infoScale']
  infoDarkScale?: PrimitiveScales['infoDarkScale']
  customColors: PrimitiveScales['customColors']
}): PrimitiveScales {
  return {
    primaryScale: s.primaryScale,
    primaryDarkScale: s.primaryDarkScale,
    grayLightScale: s.grayLightScale,
    grayDarkScale: s.grayDarkScale,
    errorScale: s.errorScale,
    errorDarkScale: s.errorDarkScale,
    warningScale: s.warningScale,
    warningDarkScale: s.warningDarkScale,
    successScale: s.successScale,
    successDarkScale: s.successDarkScale,
    infoScale: s.infoScale,
    infoDarkScale: s.infoDarkScale,
    customColors: s.customColors,
  }
}

function familyLabel(id: FamilyId): string {
  if (id === 'secondary' || id === 'tertiary') return BRAND_EXTRA_LABEL[id]
  return SLOT_DISPLAY_LABEL[id]
}

function pairChecks(fg: string, bg: string, metric: Metric) {
  try {
    const wcag = wcagRatio(fg, bg)
    const lc = Math.abs(apcaLc(fg, bg))
    if (metric === 'wcag') {
      return {
        large: wcag >= 3,
        ui: wcag >= 3,
        bodyMin: wcag >= 4.5,
        bodyPref: wcag >= 7,
      }
    }
    return {
      large: lc >= 60,
      ui: lc >= 45,
      bodyMin: lc >= 60,
      bodyPref: lc >= 75,
    }
  } catch {
    return { large: false, ui: false, bodyMin: false, bodyPref: false }
  }
}

function cellScore(fg: string, bg: string, metric: Metric): number | null {
  try {
    if (metric === 'wcag') return wcagRatio(fg, bg)
    return apcaLc(fg, bg)
  } catch {
    return null
  }
}

function passesFilter(score: number, metric: Metric, filter: number | null): boolean {
  if (filter == null) return true
  const mag = metric === 'apca' ? Math.abs(score) : score
  return mag >= filter
}

/** APCA's sign only says which side is lighter, and every threshold reads
 *  the magnitude, so cells show |Lc| like WCAG shows its ratio. `unit` adds
 *  the ":1" / "Lc" the tooltip and labels need. */
function formatScore(score: number, metric: Metric, unit = false): string {
  const value = metric === 'wcag'
    ? (score >= 10 ? score.toFixed(0) : score.toFixed(1))
    : String(Math.round(Math.abs(score)))
  if (!unit) return value
  return metric === 'wcag' ? `${value}:1` : `Lc ${value}`
}

function thresholdLabel(value: number, metric: Metric): string {
  return metric === 'wcag' ? `${value}:1` : `Lc ${value}`
}

type HoverCell = { fg: number; bg: number; x: number; y: number }

export default function ThemeContrastGrid({
  previewTheme,
  previewAppearance,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  // WCAG 2 is the ratio most teams already know; APCA stays one click away.
  const [metric, setMetric] = useState<Metric>('wcag')
  const [filter, setFilter] = useState<number | null>(BODY_FILTER.wcag)
  const [activeFamily, setActiveFamily] = useState<FamilyId>('brand')
  const [hover, setHover] = useState<HoverCell | null>(null)
  const hoverRef = useRef<HTMLDivElement>(null)

  const refs = store.themeSources[previewTheme]
  const kind = previewAppearance
  const {
    primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale, customColors,
  } = store

  const families = useMemo<GridFamily[]>(() => {
    const primitives = primitivesFromStore({
      primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
      errorScale, errorDarkScale, warningScale, warningDarkScale,
      successScale, successDarkScale, infoScale, infoDarkScale, customColors,
    })
    const out: GridFamily[] = []
    for (const id of FAMILY_ORDER) {
      const key = id === 'secondary' || id === 'tertiary'
        ? refs?.[id]
        : (refs?.[id] ?? GLOBAL_FAMILY[id])
      if (!key) continue
      const scale = scaleForFamily(key, kind, primitives)
      if (!scale || !scale[9]) continue
      out.push({ id, label: familyLabel(id), hex: scale[9], tones: scale })
    }
    return out
  }, [
    refs, kind, primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale, customColors,
  ])

  useEffect(() => {
    if (!families.some((f) => f.id === activeFamily) && families[0]) {
      setActiveFamily(families[0].id)
    }
  }, [families, activeFamily])

  const selected = families.find((f) => f.id === activeFamily) ?? families[0]
  const filters = FILTERS[metric]
  // Switching standard keeps the question: body text stays body text.
  const switchMetric = (next: Metric) => {
    if (next === metric) return
    setMetric(next)
    setFilter((current) => (current == null ? null : BODY_FILTER[next]))
  }

  useEffect(() => {
    if (!hover) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setHover(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hover])

  if (!selected) return null

  const hoverFg = hover ? selected.tones[hover.fg] : null
  const hoverBg = hover ? selected.tones[hover.bg] : null
  const hoverChecks = hoverFg && hoverBg ? pairChecks(hoverFg, hoverBg, metric) : null
  const hoverScore = hoverFg && hoverBg ? cellScore(hoverFg, hoverBg, metric) : null

  return (
    <div className="@container/cg flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 px-4 py-3">
        {families.map((family) => {
          const on = family.id === selected.id
          return (
            <button
              key={family.id}
              type="button"
              onClick={() => setActiveFamily(family.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors ${
                on
                  ? 'border-transparent bg-elevated text-fg'
                  : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: family.hex }} aria-hidden />
              {t(family.label)}
            </button>
          )
        })}
      </div>

      {/* The controls sit beside the grid on a wide board and above it on a
          narrow one, so the twelve-by-twelve grid always gets the full width
          and never needs a horizontal scroll. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden @[44rem]/cg:flex-row">
        <aside className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-y border-line px-4 py-2 @[44rem]/cg:w-[11.5rem] @[44rem]/cg:flex-col @[44rem]/cg:flex-nowrap @[44rem]/cg:items-stretch @[44rem]/cg:gap-4 @[44rem]/cg:overflow-y-auto @[44rem]/cg:border-y-0 @[44rem]/cg:border-r @[44rem]/cg:py-3">
          <div className="flex flex-col gap-2">
            <p className="hidden text-micro font-semibold uppercase tracking-widest text-fg-faint @[44rem]/cg:block">{t('Guidelines')}</p>
          <div className="flex rounded-lg border border-line p-0.5">
            <button
              type="button"
              onClick={() => switchMetric('wcag')}
              aria-pressed={metric === 'wcag'}
              className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-mini font-medium ${metric === 'wcag' ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              WCAG 2
            </button>
            <button
              type="button"
              onClick={() => switchMetric('apca')}
              aria-pressed={metric === 'apca'}
              className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-mini font-medium ${metric === 'apca' ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              APCA Lc
            </button>
          </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="hidden text-micro font-semibold uppercase tracking-widest text-fg-faint @[44rem]/cg:block">{t('Check for')}</p>
          <div className="flex flex-wrap gap-0.5 @[44rem]/cg:flex-col">
            {filters.map(({ value, label }) => {
              const on = filter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(on ? null : value)}
                  aria-pressed={on}
                  className={`flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left text-caption ${on ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
                >
                  <span>{t(label)}</span>
                  <span className="flex-shrink-0 whitespace-nowrap text-mini tabular-nums text-fg-faint">{thresholdLabel(value, metric)}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setFilter(null)}
              aria-pressed={filter == null}
              className={`rounded-md px-2 py-1 text-left text-caption ${filter == null ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              {t('Every value')}
            </button>
          </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-auto p-2 @[44rem]/cg:gap-3 @[44rem]/cg:p-4">
          {/* What a square means, said once where the eye lands first. */}
          <p className="mx-auto w-full max-w-[56rem] flex-shrink-0 text-caption text-fg-muted">
            {filter == null
              ? t('Each square: the row tone as text on the column tone.')
              : t('Each square: the row tone as text on the column tone. Faded squares don\'t pass.')}
          </p>
          {/* Columns share the width (minmax 0) and rows share the height, so
              the whole grid fits its panel; a row never drops below 1.25rem. */}
          <div
            className="mx-auto grid w-full max-w-[56rem] flex-1 grid-cols-[1.25rem_repeat(12,minmax(0,1fr))] grid-rows-[auto_repeat(12,minmax(1.25rem,1fr))] @[44rem]/cg:grid-cols-[2rem_repeat(12,minmax(0,1fr))]"
            onMouseLeave={() => setHover(null)}
          >
            <div />
            {TONES.map((tone) => (
              <div key={`h-${tone}`} className="pb-1 text-center text-[9px] tabular-nums text-fg-faint @[40rem]/cg:pb-1.5 @[40rem]/cg:text-micro">{tone}</div>
            ))}
            {TONES.map((fgTone) => {
              const fg = selected.tones[fgTone]
              return (
                <div key={`r-${fgTone}`} className="contents">
                  <div className="flex items-center justify-end pr-1 text-[9px] tabular-nums text-fg-faint @[40rem]/cg:pr-2 @[40rem]/cg:text-micro">{fgTone}</div>
                  {TONES.map((bgTone) => {
                    const bg = selected.tones[bgTone]
                    if (!fg || !bg) return <div key={bgTone} />
                    const same = fgTone === bgTone
                    const score = same ? null : cellScore(fg, bg, metric)
                    const pass = score != null && passesFilter(score, metric, filter)
                    const ink = readableInk(bg)
                    const hovered = hover?.fg === fgTone && hover?.bg === bgTone
                    return (
                      <button
                        key={bgTone}
                        type="button"
                        onMouseEnter={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          setHover({ fg: fgTone, bg: bgTone, x: rect.right + 8, y: rect.top })
                        }}
                        onFocus={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          setHover({ fg: fgTone, bg: bgTone, x: rect.right + 8, y: rect.top })
                        }}
                        aria-label={same ? `${fgTone} on ${bgTone}` : `${fgTone} on ${bgTone} — ${score == null ? '—' : formatScore(score, metric, true)}`}
                        className={`relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-sm text-[9px] tabular-nums tracking-tighter @[40rem]/cg:text-micro @[40rem]/cg:tracking-normal ${hovered ? 'ring-2 ring-accent-ui ring-offset-1 ring-offset-app' : ''}`}
                        style={{
                          // A tone on itself has no contrast: faded like a
                          // fail, so only real passes stand out.
                          background: pass ? bg : `color-mix(in srgb, ${bg} 28%, var(--app))`,
                          color: pass ? ink : 'var(--fg-faint)',
                        }}
                      >
                        {same || score == null ? '—' : formatScore(score, metric)}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {hover && hoverFg && hoverBg && hoverChecks && createPortal(
        <div
          ref={hoverRef}
          role="tooltip"
          className="pointer-events-none fixed z-[80] w-64 overflow-hidden rounded-xl border border-line bg-elevated shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
          style={{
            left: Math.min(hover.x, window.innerWidth - 272),
            top: Math.min(hover.y, window.innerHeight - 220),
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 text-caption text-fg-muted">
            <span className="tabular-nums text-fg">{hover.fg} on {hover.bg}</span>
            <span className="tabular-nums">{hoverScore == null ? '—' : formatScore(hoverScore, metric, true)}</span>
          </div>
          <div className="px-3 pb-3">
            <div
              className="rounded-lg px-3 py-2.5 text-ui font-medium"
              style={{ background: hoverBg, color: hoverFg }}
            >
              {t('Sample text preview')}
            </div>
          </div>
          <ul className="border-t border-line px-3 py-2 text-caption">
            <CheckRow ok={hoverChecks.large} label={t('Large text (≥24px bold or ≥18.66px regular)')} />
            <CheckRow ok={hoverChecks.ui} label={t('Small text, UI elements')} />
            <CheckRow ok={hoverChecks.bodyMin} label={t('Body text (minimum)')} />
            <CheckRow ok={hoverChecks.bodyPref} label={t('Body text (preferred)')} />
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-start gap-2 py-0.5 ${ok ? 'text-fg' : 'text-fg-muted'}`}>
      <span aria-hidden className={`mt-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] ${ok ? 'bg-status-success-solid text-white' : 'bg-status-danger-solid/80 text-white'}`}>
        {ok ? '✓' : '×'}
      </span>
      <span>{label}</span>
    </li>
  )
}
