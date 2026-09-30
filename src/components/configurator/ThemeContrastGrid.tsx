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

const APCA_FILTERS = [15, 30, 45, 60, 75] as const
const WCAG_FILTERS = [3, 4.5, 7] as const

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

function formatScore(score: number, metric: Metric): string {
  if (metric === 'wcag') return score >= 10 ? score.toFixed(0) : score.toFixed(1)
  const rounded = Math.round(score)
  return rounded > 0 ? `+${rounded}` : String(rounded)
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
  const [metric, setMetric] = useState<Metric>('apca')
  const [filter, setFilter] = useState<number | null>(null)
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
  const filters = metric === 'apca' ? APCA_FILTERS : WCAG_FILTERS

  useEffect(() => {
    if (filter != null && !(filters as readonly number[]).includes(filter)) setFilter(null)
  }, [metric, filter, filters])

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

  return (
    <div className="flex h-full min-h-0 flex-col">
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[11.5rem] flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-line px-4 py-3">
          <div>
            <p className="text-micro font-semibold uppercase tracking-widest text-fg-faint">{t('Guidelines')}</p>
            <p className="mt-2 text-caption text-fg-muted">WCAG 2</p>
            <p className="text-caption text-fg-muted">APCA Lc</p>
          </div>
          <div className="flex rounded-lg border border-line p-0.5">
            <button
              type="button"
              onClick={() => setMetric('wcag')}
              aria-pressed={metric === 'wcag'}
              className={`flex-1 rounded-md px-2 py-1 text-mini font-medium ${metric === 'wcag' ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              WCAG 2
            </button>
            <button
              type="button"
              onClick={() => setMetric('apca')}
              aria-pressed={metric === 'apca'}
              className={`flex-1 rounded-md px-2 py-1 text-mini font-medium ${metric === 'apca' ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              APCA Lc
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {filters.map((value) => {
              const on = filter === value
              const label = metric === 'apca' ? `${value}+` : `${value}:1`
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(on ? null : value)}
                  aria-pressed={on}
                  className={`rounded-md px-2 py-1 text-left text-caption ${on ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
                >
                  {label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setFilter(null)}
              aria-pressed={filter == null}
              className={`rounded-md px-2 py-1 text-left text-caption ${filter == null ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              {t('All')}
            </button>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
          <div
            className="grid w-full min-w-[40rem]"
            style={{ gridTemplateColumns: `2.75rem repeat(${TONES.length}, minmax(2.25rem, 1fr))` }}
            onMouseLeave={() => setHover(null)}
          >
            <div />
            {TONES.map((tone) => (
              <div key={`h-${tone}`} className="pb-1.5 text-center text-micro tabular-nums text-fg-faint">{tone}</div>
            ))}
            {TONES.map((fgTone) => {
              const fg = selected.tones[fgTone]
              return (
                <div key={`r-${fgTone}`} className="contents">
                  <div className="pr-2 text-right text-micro tabular-nums text-fg-faint" style={{ lineHeight: '2.25rem' }}>{fgTone}</div>
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
                        aria-label={same ? `${fgTone} on ${bgTone}` : `${fgTone} on ${bgTone} — ${score == null ? '—' : formatScore(score, metric)}`}
                        className={`relative h-9 overflow-hidden rounded-sm text-micro tabular-nums ${hovered ? 'ring-2 ring-accent-ui ring-offset-1 ring-offset-app' : ''}`}
                        style={{
                          background: pass || same ? bg : `color-mix(in srgb, ${bg} 28%, var(--app))`,
                          color: pass || same ? ink : 'var(--fg-faint)',
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
            <span className="tabular-nums">{metric === 'apca' ? 'Lc' : 'WCAG'}</span>
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
