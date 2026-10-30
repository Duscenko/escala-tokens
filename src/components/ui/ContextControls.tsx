import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CONTEXT_APPEARANCES,
  CONTEXT_DETAILS,
  CONTEXT_FOUNDATIONS,
  contextSize,
  formatApproxTokens,
  type ContextAppearance,
  type ContextDetail,
  type ContextScope,
} from '../../lib/contextRequest'
import { useI18n } from '../../lib/i18n'
import {
  CHROME_CONTROL_HOVER,
  CHROME_CONTROL_SHELL,
  SEGMENT_ACTIVE_INK,
  SEGMENT_INACTIVE,
  SELECT_FOCUS,
} from '../configurator/themeWorkspaceLayout'
import { FIELD_NAME, FIELD_ROW } from './PickerField'
import { SegmentHighlight } from './SegmentHighlight'

// The filters every "context for agents" surface shares — Code's Agent
// context, Variables' Copy context, a component page's Copy context. One set
// of words, one set of controls, so "Values · Light · Color" means the same
// thing wherever it is picked.

export interface ContextOptions {
  scope: ContextScope
  appearance: ContextAppearance
  detail: ContextDetail
}

const PREFS_KEY = 'sd-context-prefs'

/** Appearance and detail are a per-viewer habit ("I always paste values
 *  only"), so they are remembered in this browser. Scope is NOT: it follows
 *  the page you are on. Every read and write is guarded — a blocked storage
 *  must never stop a copy. */
export function readContextPrefs(): Partial<Pick<ContextOptions, 'appearance' | 'detail'>> {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<ContextOptions>
    const out: Partial<Pick<ContextOptions, 'appearance' | 'detail'>> = {}
    if (CONTEXT_APPEARANCES.some((a) => a.key === parsed.appearance)) out.appearance = parsed.appearance
    if (CONTEXT_DETAILS.some((d) => d.key === parsed.detail)) out.detail = parsed.detail
    return out
  } catch {
    return {}
  }
}

export function writeContextPrefs(prefs: Pick<ContextOptions, 'appearance' | 'detail'>) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable — the choice just isn't remembered */
  }
}

/** Options state seeded from the remembered prefs, with the caller's scope. */
export function useContextOptions(scope: ContextScope, fallbackAppearance: ContextAppearance = 'both') {
  const [opts, setOpts] = useState<ContextOptions>(() => {
    const prefs = readContextPrefs()
    return { scope, appearance: prefs.appearance ?? fallbackAppearance, detail: prefs.detail ?? 'full' }
  })
  // The page moved to another foundation → the scope follows it.
  useEffect(() => { setOpts((o) => (o.scope === scope ? o : { ...o, scope })) }, [scope])
  const update = (patch: Partial<ContextOptions>) => {
    setOpts((o) => {
      const next = { ...o, ...patch }
      if (patch.appearance || patch.detail) writeContextPrefs({ appearance: next.appearance, detail: next.detail })
      return next
    })
  }
  return [opts, update] as const
}

function Segmented<K extends string>({
  label, items, value, onChange, disabledKeys, disabledHint, labelClass, rowClass, fill = false,
}: {
  labelClass: string
  rowClass: string
  /** Stacked: the track fills the field column and its keys share it. */
  fill?: boolean
  label: string
  items: { key: K; label: string; hint?: string }[]
  value: K
  onChange: (key: K) => void
  disabledKeys?: K[]
  disabledHint?: string
}) {
  const { t } = useI18n()
  const group = useId()
  return (
    <div className={rowClass}>
      <span className={labelClass}>{t(label)}</span>
      {/* The inspector's segmented control (foundation tabs, Light / Dark):
          a borderless `chip-rest` track with a raised selected key. Shared
          tokens, so the two can't drift. */}
      <div role="radiogroup" aria-label={t(label)} className={`flex h-8 min-w-0 items-center gap-0.5 rounded-lg p-0.5 ${fill ? 'w-full' : ''} ${CHROME_CONTROL_SHELL}`}>
        {items.map((item) => {
          const selected = item.key === value
          const disabled = disabledKeys?.includes(item.key) ?? false
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              title={disabled ? disabledHint : item.hint ? t(item.hint) : undefined}
              onClick={() => onChange(item.key)}
              className={`relative inline-flex h-7 min-w-0 items-center justify-center rounded-md text-caption ${fill ? 'flex-1 px-1' : 'px-2.5'} transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-not-allowed disabled:opacity-40 ${selected ? SEGMENT_ACTIVE_INK : SEGMENT_INACTIVE}`}
            >
              {selected && <SegmentHighlight group={group} />}
              <span className="relative truncate">{t(item.label)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** All foundations · one foundation. Shared by the agent paste and the CSS
 *  file, so a scope means the same collection in both. */
function ScopeSelect({ value, scopes, onChange, labelClass, rowClass, fill }: {
  value: ContextScope
  scopes: ContextScope[]
  onChange: (scope: ContextScope) => void
  labelClass: string
  rowClass: string
  fill: boolean
}) {
  const { t } = useI18n()
  return (
    <label className={rowClass}>
      <span className={labelClass}>{t('Scope')}</span>
      {/* The workspace dropdown shell, not the bare native control: its
          arrow sat on the field's own padding, flush against the border.
          `appearance-none` + a drawn chevron at `right-2.5` mirrors the
          text's `pl-2.5`, the same build `VariableSelect` uses. Still a
          native <select>, so keyboard and type-to-jump stay free. */}
      <span className={`relative inline-flex min-w-0 ${fill ? 'w-full' : ''}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ContextScope)}
          className={`h-8 min-w-0 ${fill ? 'w-full' : ''} cursor-pointer appearance-none truncate rounded-lg pl-2.5 pr-7 text-caption font-medium text-fg transition-shadow ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} ${SELECT_FOCUS}`}
        >
          {scopes.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? t('All foundations') : t(CONTEXT_FOUNDATIONS.find((f) => f.key === s)?.label ?? s)}
            </option>
          ))}
        </select>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-faint"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  )
}

export type CssBrandMode = 'one' | 'all'

/** The CSS file's two filters: which collection, and — with more than one
 *  brand — this brand or every brand in one file (`data-brand`). */
export function CssFilters({ scope, onScope, scopes, brands, onBrands, brandCount }: {
  scope: ContextScope
  onScope: (scope: ContextScope) => void
  scopes: ContextScope[]
  brands: CssBrandMode
  onBrands: (mode: CssBrandMode) => void
  brandCount: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <ScopeSelect value={scope} scopes={scopes} onChange={onScope} labelClass="sr-only" rowClass="flex items-center gap-2" fill={false} />
      {brandCount > 1 ? (
        <Segmented
          labelClass="sr-only"
          rowClass="flex items-center gap-2"
          label="Brands"
          items={[
            { key: 'one', label: 'This brand' },
            { key: 'all', label: `All brands (${brandCount})`, hint: 'One file; <html data-brand="…"> picks the brand' },
          ]}
          value={brands}
          onChange={onBrands}
        />
      ) : null}
    </div>
  )
}

/** The three filters. `scopes` lists the scopes this surface can offer
 *  (omit it and the scope row is not drawn — a component page has only one).
 *  `lockedAppearance`, when set, disables every other theme with
 *  `disabledHint` rather than hiding them. */
export function ContextFilters({
  opts, onChange, scopes, lockedAppearance, layout = 'stack', showAppearance = true,
}: {
  /** Off where the theme is picked elsewhere (Code: Copy context's chevron). */
  showAppearance?: boolean
  opts: ContextOptions
  onChange: (patch: Partial<ContextOptions>) => void
  scopes?: ContextScope[]
  lockedAppearance?: ContextAppearance | null
  layout?: 'stack' | 'row'
}) {
  const { t } = useI18n()
  // In a toolbar row the values name themselves ("Light · Dark · Both",
  // "Values · Full brief"), so the captions are for screen readers only.
  // Stacked, each filter is a field row like the rest of the inspector
  // (`FIELD_ROW`: sentence-case name | control in the 58% column), so the
  // three controls share one left and one right edge.
  const stack = layout !== 'row'
  const labelClass = stack ? `${FIELD_NAME} text-fg-muted` : 'sr-only'
  const rowClass = stack ? FIELD_ROW : 'flex items-center gap-2'
  const appearanceDisabled = lockedAppearance
    ? CONTEXT_APPEARANCES.map((a) => a.key).filter((k) => k !== lockedAppearance)
    : undefined
  return (
    <div className={layout === 'row' ? 'flex min-w-0 flex-wrap items-center gap-2' : 'flex flex-col gap-2'}>
      {scopes && scopes.length > 1 ? (
        <ScopeSelect
          value={opts.scope}
          scopes={scopes}
          onChange={(scope) => onChange({ scope })}
          labelClass={labelClass}
          rowClass={rowClass}
          fill={stack}
        />
      ) : null}
      {showAppearance ? (
      <Segmented
          labelClass={labelClass}
          rowClass={rowClass}
          fill={stack}
          label="Theme"
          items={CONTEXT_APPEARANCES}
          value={lockedAppearance ?? opts.appearance}
          onChange={(appearance) => onChange({ appearance })}
          disabledKeys={appearanceDisabled}
          disabledHint={t('Free ships one theme. Pro ships Light and Dark.')}
        />
      ) : null}
      <Segmented
        labelClass={labelClass}
        rowClass={rowClass}
        fill={stack}
        label="Detail"
        items={CONTEXT_DETAILS}
        value={opts.detail}
        onChange={(detail) => onChange({ detail })}
      />
    </div>
  )
}

/** "≈ 1.8k tokens · 214 lines" — what the paste will cost the agent. */
export function ContextSizeNote({ markdown, className = '', showLines = true }: { markdown: string; className?: string; showLines?: boolean }) {
  const { t } = useI18n()
  const size = contextSize(markdown)
  return (
    <span className={`text-caption tabular-nums text-fg-faint ${className}`}>
      {formatApproxTokens(size.approxTokens)}
      {showLines ? <> · {t('{n} lines', { n: size.lines })}</> : null}
    </span>
  )
}

const POPOVER_W = 340

/** A popover anchored under `anchor`, right-aligned to it, portaled to <body>
 *  so a clipping card or scroll column can't cut it. Closes on outside click
 *  and Escape. */
export function AnchoredPopover({
  anchor, open, onClose, children, label,
}: {
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) return
    const place = () => {
      const r = anchor.getBoundingClientRect()
      // Right-aligned to the anchor, but never past the viewport's LEFT edge:
      // an anchor near the left (a Docs page title) pushed the panel off-screen.
      const maxRight = window.innerWidth - POPOVER_W - 8
      setPos({ top: r.bottom + 6, right: Math.max(8, Math.min(window.innerWidth - r.right, maxRight)) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || anchor?.contains(target)) return
      onClose()
    }
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, anchor, onClose])

  if (!open || !pos || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{ position: 'fixed', top: pos.top, right: pos.right, width: POPOVER_W }}
      className="z-[70] rounded-xl border border-line-strong bg-elevated p-3 shadow-lg"
    >
      {children}
    </div>,
    document.body,
  )
}
