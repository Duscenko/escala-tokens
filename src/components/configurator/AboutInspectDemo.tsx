// The About page's "try the inspector" demo — the one piece of the workspace a
// PHONE visitor can actually use. The editor needs a laptop (see
// `DesktopOnlyNotice`), but pointing at a component and seeing the tokens it is
// built from works on any screen, and it is the clearest way to show what
// Escala is: a component is a list of tokens, and a token edit moves every
// component that reads it.
//
// Nothing here is a mock. The card is built from the real `escala-ui`
// components, painted by the generated recipe sheet from this browser's own
// system (`usePreviewTokens` → `RecipeScope`), and the panel is
// `traceElement` — the same read the Generator's inspector does. Edits are a
// SANDBOX: they override CSS variables on the stage only, never the store, so
// playing here cannot change a visitor's saved system.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import { useDesignStore } from '../../store/useDesignStore'
import { usePreviewTokens } from '../../lib/previewTokens'
import { axesOf, recipeRootOf, traceElement, type TraceRow } from '../../lib/tokenTrace'
import { RecipeScope } from './docs/skeleton/scope'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../escala-ui/card'
import { Avatar, AvatarFallback } from '../escala-ui/avatar'
import { Badge } from '../escala-ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../escala-ui/alert'
import { Button } from '../escala-ui/button'
import { cn } from '../../lib/utils'

/** The parts a visitor can pick, in reading order. `id` is the `data-demo`
 *  marker on the element; `label` names the chip. */
const PARTS = [
  { id: 'card', label: 'Card' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'badge', label: 'Badge' },
  { id: 'alert', label: 'Alert' },
  { id: 'cancel', label: 'Button · outline' },
  { id: 'upgrade', label: 'Button' },
] as const
type PartId = (typeof PARTS)[number]['id']

/** Kinds a visitor can edit: one colour, or one length in px. A sum
 *  (`spacing.2 + stroke.sm`), a type style or a shadow is shown, not edited. */
const LENGTH_KINDS = new Set<TraceRow['kind']>(['radius', 'spacing', 'size', 'stroke'])
const editable = (r: TraceRow) =>
  !r.cssVar.includes('+') && (r.kind === 'color' || (LENGTH_KINDS.has(r.kind) && /^-?\d+(\.\d+)?px$/.test(r.value)))

const HEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i

function UserGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}

/** One editable colour: a native swatch (the phone's own picker) + the hex. */
function ColorEditor({ value, label, onChange }: { value: string; label: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-line-strong">
        <span className="sr-only">{label}</span>
        <span className="absolute inset-1 rounded-md" style={{ background: value }} aria-hidden />
        <input
          type="color"
          value={value.slice(0, 7)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={draft}
        spellCheck={false}
        autoCapitalize="off"
        aria-label={label}
        onChange={(e) => {
          setDraft(e.target.value)
          if (HEX.test(e.target.value.trim())) onChange(e.target.value.trim())
        }}
        onBlur={() => setDraft(value)}
        className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-app px-3 font-mono text-ui uppercase text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      />
    </div>
  )
}

/** One editable length, in px. */
function LengthEditor({ value, label, onChange }: { value: string; label: string; onChange: (px: string) => void }) {
  const n = parseFloat(value)
  const step = (d: number) => onChange(`${Math.max(0, Math.round(n + d))}px`)
  const btn = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-line-strong text-strong text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => step(-1)} aria-label={`${label} −1`}>−</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(n) ? n : ''}
        aria-label={label}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (Number.isFinite(v) && v >= 0) onChange(`${v}px`)
        }}
        className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-app px-3 font-mono text-ui text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      />
      <button type="button" className={btn} onClick={() => step(1)} aria-label={`${label} +1`}>+</button>
    </div>
  )
}

function TraceCard({ row, value, onChange }: { row: TraceRow; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const label = t(row.label)
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
        <code className="min-w-0 truncate rounded-md bg-accent-ui/10 px-1.5 py-0.5 font-mono text-mini text-accent-ui" title={row.cssVar}>
          {row.cssVar}
        </code>
      </div>
      {!editable(row) ? (
        <span className="font-mono text-body text-fg">{value}</span>
      ) : row.kind === 'color' ? (
        <ColorEditor value={value} label={label} onChange={onChange} />
      ) : (
        <LengthEditor value={value} label={label} onChange={onChange} />
      )}
    </div>
  )
}

export function AboutInspectDemo() {
  const { t } = useI18n()
  const chrome = useTheme()
  const themeOrder = useDesignStore((s) => s.themeOrder)
  const themeKinds = useDesignStore((s) => s.themeKinds)
  // The visitor's own system, in the page's appearance: the first theme of
  // that kind, else the first theme (painted in the page's appearance).
  const themeKey = themeOrder.find((k) => themeKinds?.[k] === chrome) ?? themeOrder[0] ?? 'light'
  const tokens = usePreviewTokens(themeKey, chrome, 'mobile')

  const stageRef = useRef<HTMLDivElement>(null)
  const [part, setPart] = useState<PartId>('card')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [element, setElement] = useState<Element | null>(null)

  // Mark the picked element (the dashed outline) and keep a handle to trace it.
  useEffect(() => {
    const el = stageRef.current?.querySelector(`[data-demo="${part}"]`) ?? null
    el?.setAttribute('data-inspected', '')
    setElement(el)
    return () => el?.removeAttribute('data-inspected')
  }, [part, tokens.archTokens == null])

  const trace = element ? traceElement(tokens, element) : null
  const root = element ? recipeRootOf(element) : null
  const heading = useMemo(() => {
    if (!trace || !root) return ''
    const axes = Object.entries(axesOf(root, trace.component))
      .filter(([axis, v]) => axis !== 'State' && v !== 'default')
      .map(([axis, v]) => ` ${axis.toLowerCase()}="${v}"`)
      .join('')
    return `<${trace.component}${axes} />`
  }, [trace, root])

  // Resting rows only, one card per CSS variable: the same token read by two
  // slots is one decision, so it is one field.
  const rows = useMemo(() => {
    const seen = new Set<string>()
    const out: TraceRow[] = []
    for (const slot of trace?.slots ?? []) {
      for (const row of slot.rows) {
        if (row.state || seen.has(row.cssVar)) continue
        seen.add(row.cssVar)
        out.push(row)
      }
    }
    return out
  }, [trace])

  if (!tokens.archTokens) return null

  const pick = (target: EventTarget | null) => {
    const hit = (target as Element | null)?.closest?.('[data-demo]')
    const id = hit?.getAttribute('data-demo') as PartId | null
    if (id && PARTS.some((p) => p.id === id)) setPart(id)
  }

  const set = (cssVar: string, value: string) => setOverrides((o) => ({ ...o, [cssVar]: value }))
  const edited = Object.keys(overrides).length > 0

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      {/* ── The stage: a real screen, painted with this browser's system ── */}
      <div className="flex flex-col gap-3">
        <div
          ref={stageRef}
          onClickCapture={(e) => {
            // Picking is the job here: a tap selects, it never submits.
            e.preventDefault()
            pick(e.target)
          }}
          onFocusCapture={(e) => pick(e.target)}
          className={cn(
            'flex min-h-[340px] items-center justify-center rounded-2xl border border-line p-4 sm:p-8',
            '[&_[data-inspected]]:outline-2 [&_[data-inspected]]:outline-dashed [&_[data-inspected]]:outline-offset-4 [&_[data-inspected]]:outline-[var(--accent-ui)]',
            '[&_[data-demo]]:cursor-pointer',
          )}
          style={{
            backgroundColor: tokens.archTokens['surface.page'] ?? undefined,
            backgroundImage: 'radial-gradient(color-mix(in srgb, var(--fg) 14%, transparent) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          <RecipeScope t={tokens}>
            <div style={{ display: 'contents', ...(overrides as CSSProperties) }}>
              <Card data-demo="card" className="w-full max-w-[340px]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar data-demo="avatar" size="lg">
                      <AvatarFallback><UserGlyph /></AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <CardTitle>{t('Upgrade your plan')}</CardTitle>
                      <CardDescription>{t('Get more space for your team.')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Badge data-demo="badge" variant="secondary"><CheckGlyph /> {t('Special offer')}</Badge>
                  <Alert data-demo="alert">
                    <AlertTitle>{t('Save 20% today')}</AlertTitle>
                    <AlertDescription>{t('Includes custom domains and priority support.')}</AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button data-demo="cancel" variant="outline" className="flex-1">{t('Cancel')}</Button>
                  <Button data-demo="upgrade" className="flex-1">{t('Upgrade')}</Button>
                </CardFooter>
              </Card>
            </div>
          </RecipeScope>
        </div>

        {/* Big targets for the small parts (a badge is hard to tap on a phone). */}
        <div role="group" aria-label={t('Pick a component')} className="flex flex-wrap gap-1.5">
          {PARTS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={part === p.id}
              onClick={() => setPart(p.id)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50',
                part === p.id
                  ? 'border-accent-ui bg-accent-ui/10 text-accent-ui'
                  : 'border-line-strong text-fg-muted hover:text-fg',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── The inspector: every token the picked component reads ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-elevated/30">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Inspecting')}</span>
            <code className="truncate font-mono text-ui font-semibold text-accent-ui">{heading}</code>
          </div>
          {edited && (
            <button
              type="button"
              onClick={() => setOverrides({})}
              className="flex-shrink-0 rounded-md px-2 py-1 text-body font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              {t('Reset')}
            </button>
          )}
        </div>
        <div className="flex max-h-[460px] flex-col gap-2 overflow-y-auto p-3">
          {rows.map((row) => (
            <TraceCard
              key={row.cssVar}
              row={row}
              value={overrides[row.cssVar] ?? row.value}
              onChange={(v) => set(row.cssVar, v)}
            />
          ))}
        </div>
        <p className="border-t border-line px-4 py-3 text-caption leading-relaxed text-fg-faint">
          {t('Change a value and every component that reads that token follows. Nothing here touches your saved system.')}
        </p>
      </div>
    </div>
  )
}
