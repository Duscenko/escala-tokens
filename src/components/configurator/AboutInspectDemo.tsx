// The About page's shuffle playground — the one piece of the workspace a
// PHONE visitor can actually use (plan: `design-plans/mobile-shuffle-playground.md`). The editor needs a laptop (see
// `DesktopOnlyNotice`), but pointing at a component and seeing the tokens it is
// built from works on any screen, and it is the clearest way to show what
// Escala is: a component is a list of tokens, and a token edit moves every
// component that reads it.
//
// Nothing here is a mock. The card is built from the real `escala-ui`
// components, painted by the generated recipe sheet, and the panel is
// `traceElement` — the same read the Generator's inspector does.
//
// THE SYSTEM ON SCREEN STARTS AS CORE, not the visitor's store: a phone
// visitor has nothing of their own to show, and the demo should look like
// Escala at its best. It is a try-on (`stylePreviewStore`), so nothing is ever
// written.
//
// EDITS GO THROUGH THE SYSTEM, the way they do in the Generator — never a hex
// box or a free px field:
//   - the SYSTEM moves only through Shuffle (`nextShuffle`, the Generator's
//     dice: System Styles first, then random looks), which deals accent,
//     fonts, type density, radius, shadows and page tint at once — every ramp
//     and role re-derives from it. Its deck is the demo's own, so playing here
//     never uses up the styles the desktop session deals;
//   - a colour row re-points the role to a primitive (`accent.9`, `white-a.2`),
//     stored as that REFERENCE, so it keeps following the system after a shuffle;
//   - a length row picks a step of its own scale (radius, spacing, size, stroke).
// Overrides are CSS variables on the stage and the preview only.
//
// PHONE ONLY (`AboutHome` mounts it below `md`). Picking a part opens the
// inspector as a BOTTOM SHEET — 80% of the screen over a blurred backdrop that
// closes it on tap, Esc, or a drag down on its handle. The sheet covers the
// stage, so it carries its OWN live preview of the picked part, painted with
// the same tokens and overrides: a pick shows on the element as it happens.
// The card is shown whole, scaled to fit; a small part is magnified (≤ 1.5×).

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import { useDesignStore } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { stylePreviewStore } from '../../lib/stylePreviewOverlay'
import { THEME_STYLE_PRESETS } from '../../lib/themePresets'
import { scaleLookup } from '../../lib/semanticArchitectures'
import type { GlobalScales } from '../../lib/semanticRoles'
import { createShuffleDeck, nextShuffle, stylePreviewFromRecipe, RANDOM_THEME_LABEL } from '../../lib/randomTheme'
import { inferTypeScaleMode } from '../../lib/typographyStandard'
import { loadGoogleFont } from '../../lib/fonts'
import { trackEvent } from '../../lib/analytics'
import { INTENT_THRESHOLDS } from '../../lib/color/apca'
import { decodeRemix, encodeRemix, remixPreset, remixUrl, takeIncomingRemix } from '../../lib/remixLink'
import { showToast } from '../ui/Toast'
import type { ThemeStylePreset } from '../../lib/themePresets'
import { SHUFFLE_AXES, applyShuffleLocks, type ShuffleAxis } from '../../lib/shuffleLocks'
import { diffReceipt, pickReceipt, playgroundContrast, type ReceiptChange, type ReceiptRow } from '../../lib/playgroundReceipt'
import { readableInk } from '../../lib/colorUtils'
import { BRAND_SPECTRUM, type ColorPreset } from '../../lib/brandPalette'
import { displayHex } from '../../lib/tokenInspector'
import { axesOf, recipeRootOf, traceElement, type TraceKind, type TraceRow } from '../../lib/tokenTrace'
import { CHECKER, ValueMark, slotLabel } from '../preview/artefacts/TokenTracePanel'
import { RandomThemeButton } from './ThemeSaveBar'
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

/** Core / Minimalist — Escala's baseline style, the Core blue. */
const CORE = THEME_STYLE_PRESETS.find((p) => p.id === 'core-minimal') ?? THEME_STYLE_PRESETS[0]

/** The system on the stage: a style whole, or a random look on a scaffold.
 *  `styleId` is set when the dice dealt a System Style (it names the pill).
 *  `baseName` keeps that name once the visitor re-colours it, and
 *  `colorName` is the curated brand colour they picked (`BRAND_SPECTRUM`). */
interface DemoSystem {
  preset: ThemeStylePreset
  styleId?: string
  scaffoldId?: string
  moodId?: string
  baseName?: string
  colorName?: string
}
const CORE_SYSTEM: DemoSystem = { preset: CORE, styleId: CORE.id }

const sameHex = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

const AXIS_LABEL: Record<ShuffleAxis, string> = { color: 'Color', type: 'Type', shape: 'Shape', density: 'Density' }

/** Lines the receipt shows; the rest are counted. */
const RECEIPT_LINES = 4
/** Gap between two receipt lines lighting up their parts (ms). */
const PULSE_STAGGER = 140

/** Every resting token the card's parts read, keyed by CSS variable, with
 *  the parts that read it — the same trace the inspector shows. */
function collectRows(tokens: Parameters<typeof traceElement>[0], stage: HTMLElement | null): Map<string, ReceiptRow> {
  const rows = new Map<string, ReceiptRow>()
  for (const { id } of PARTS) {
    const el = stage?.querySelector(`[data-demo="${id}"]`)
    const trace = el ? traceElement(tokens, el) : null
    for (const slot of trace?.slots ?? []) {
      for (const row of slot.rows) {
        if (row.state) continue
        const known = rows.get(row.cssVar)
        if (known) {
          if (!known.parts.includes(id)) known.parts.push(id)
          continue
        }
        rows.set(row.cssVar, {
          cssVar: row.cssVar,
          label: row.label,
          kind: row.kind,
          value: row.value,
          family: row.facets?.find((f) => f.label === 'Family')?.value,
          parts: [id],
        })
      }
    }
  }
  return rows
}

/** The part a receipt line opens: the most specific one that reads it. */
const partFor = (change: ReceiptChange): PartId =>
  (change.parts.find((p) => p !== 'card') ?? change.parts[0] ?? 'card') as PartId

/** Shuffle counts reported to analytics — a milestone each, not every press. */
const SHUFFLE_MILESTONES = { 1: '1', 2: '2', 6: '6' } as const

const LENGTH_SCALES = ['radius', 'spacing', 'size', 'stroke'] as const
type LengthScale = (typeof LENGTH_SCALES)[number]

/** The scale a length row reads, from its ref's OWN namespace — never from
 *  its kind: the trace files `selector.*` and `icon.*` under `size` too, and
 *  those are different ramps. */
function scaleOf(row: TraceRow): LengthScale | undefined {
  const ns = row.ref.split('.')[0]
  return (LENGTH_SCALES as readonly string[]).includes(ns) ? (ns as LengthScale) : undefined
}
/** `spacing.gap-control` → `gap-control` · `spacing.0_5` → `0_5`. */
const nameOf = (row: TraceRow) => row.ref.slice(row.ref.indexOf('.') + 1)

/** An edit, stored as what the system would store: a primitive reference for
 *  a colour, a step of its scale for a length. Resolved at render, so a colour
 *  pick keeps following the accent through a shuffle. */
type Override =
  | { kind: 'color'; ref: string }
  | { kind: 'length'; scale: LengthScale; step: string }

type Filter = 'all' | 'color' | 'layout' | 'type'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'color', label: 'Color' },
  { key: 'layout', label: 'Layout' },
  { key: 'type', label: 'Type' },
]
const filterOf = (kind: TraceKind): Exclude<Filter, 'all'> =>
  kind === 'color' ? 'color' : kind === 'type' ? 'type' : 'layout'

const FAMILY_REF = /^([a-z-]+)\.(\d+)$/
const px = (v: string) => parseFloat(v)
const roleIdOf = (row: TraceRow) => row.pickId ?? row.ref.replace(/^color\./, '')

/** `neutral-dark` → Neutral · `accent-a` → Accent-Alpha — the names the
 *  Primitives table gives these families. Token names stay in English. */
function familyLabel(fam: string): string {
  const base = fam === 'neutral-dark' ? 'neutral' : fam.replace(/-a$/, '')
  const word = base.charAt(0).toUpperCase() + base.slice(1)
  return fam.endsWith('-a') ? `${word}-Alpha` : word
}

/** Steps of a length scale, smallest first, one per distinct value. */
function stepsOf(scale: Record<string, string> | undefined): { key: string; value: string }[] {
  const seen = new Set<number>()
  return Object.entries(scale ?? {})
    .filter(([, v]) => Number.isFinite(px(v)))
    .sort((a, b) => px(a[1]) - px(b[1]))
    .filter(([, v]) => (seen.has(px(v)) ? false : (seen.add(px(v)), true)))
    .map(([key, value]) => ({ key, value }))
}

/** Centre the matching child of a horizontal strip by scrolling the strip
 *  alone — `scrollIntoView` would also move the sheet and the page. */
function centerInStrip(strip: HTMLElement | null, selector: string) {
  const item = strip?.querySelector<HTMLElement>(selector)
  if (!strip || !item) return
  strip.scrollLeft = item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2
}

/** `2_5` is how a half step is keyed (a `.` would split a Figma path). */
const stepLabel = (key: string) => key.replace('_', '.')

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

function PointerGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8.5V3.25a1.25 1.25 0 0 1 2.5 0V7.5l3.2.7a1.6 1.6 0 0 1 1.25 1.8l-.5 3.2a1.6 1.6 0 0 1-1.6 1.3H7.6a1.6 1.6 0 0 1-1.25-.6L3.6 10.6a1.2 1.2 0 0 1 1.7-1.7Z" />
    </svg>
  )
}

function LockGlyph({ locked }: { locked: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d={locked ? 'M5.5 7V5a2.5 2.5 0 0 1 5 0v2' : 'M5.5 7V5a2.5 2.5 0 0 1 4.9-.7'} />
    </svg>
  )
}

function WarnGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2.5 14 13H2Z" />
      <path d="M8 6.5v3M8 11.5v.01" />
    </svg>
  )
}

/** One side of a receipt line: a swatch for a colour, the value otherwise. */
function ChangeValue({ kind, value, muted = false }: { kind: ReceiptChange['kind']; value: string; muted?: boolean }) {
  if (kind === 'color') {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="relative h-4 w-4 flex-shrink-0 overflow-hidden rounded ring-1 ring-black/10 dark:ring-white/15" style={/^#[0-9a-f]{8}$/i.test(value) ? CHECKER : undefined} aria-hidden>
          <span className="absolute inset-0" style={{ background: value }} />
        </span>
        <span className={cn('truncate font-mono text-caption tabular-nums', muted ? 'text-fg-faint' : 'text-fg')}>{displayHex(value)}</span>
      </span>
    )
  }
  return <span className={cn('min-w-0 truncate font-mono text-caption tabular-nums', muted ? 'text-fg-faint' : 'text-fg')}>{value}</span>
}

function LaptopGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3.5" width="10" height="7" rx="1" />
      <path d="M1.5 12.5h13" />
    </svg>
  )
}

/** The share sheet where there is one (AirDrop, Messages, mail to yourself),
 *  the clipboard where there is not. A cancelled sheet is not a hand-off. */
async function handOff(url: string, t: (s: string) => string = (s) => s) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Escala Tokens', text: t('A design system I shuffled on Escala Tokens'), url })
      trackEvent({ name: 'mobile_handoff', props: { via: 'share' } })
      return
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    trackEvent({ name: 'mobile_handoff', props: { via: 'copy' } })
    showToast(t('Link copied. Open it on your laptop.'))
  } catch {
    showToast(t('Could not copy the link.'), undefined, true)
  }
}

function ResetGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.78" />
      <path d="M2.75 2.5v2.75H5.5" />
    </svg>
  )
}

/** The demo screen. `data-demo` marks every part a visitor can inspect. */
function DemoCard({ label }: { label: (s: string) => string }) {
  return (
    <Card data-demo="card" className="w-full max-w-[340px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar data-demo="avatar" size="lg">
            <AvatarFallback><UserGlyph /></AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle>{label('Upgrade your plan')}</CardTitle>
            <CardDescription>{label('Get more space for your team.')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Badge data-demo="badge" variant="secondary"><CheckGlyph /> {label('Special offer')}</Badge>
        <Alert data-demo="alert">
          <AlertTitle>{label('Save 20% today')}</AlertTitle>
          <AlertDescription>{label('Includes custom domains and priority support.')}</AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="gap-2">
        <Button data-demo="cancel" variant="outline" className="flex-1">{label('Cancel')}</Button>
        <Button data-demo="upgrade" className="flex-1">{label('Upgrade')}</Button>
      </CardFooter>
    </Card>
  )
}

/** One part on its own, as the preview shows it: the card whole, a small part
 *  alone at the size it has inside the card. */
function DemoPart({ id, label }: { id: PartId; label: (s: string) => string }) {
  switch (id) {
    case 'card':
      return <div className="w-[340px]"><DemoCard label={label} /></div>
    case 'avatar':
      return <Avatar size="lg"><AvatarFallback><UserGlyph /></AvatarFallback></Avatar>
    case 'badge':
      return <Badge variant="secondary"><CheckGlyph /> {label('Special offer')}</Badge>
    case 'alert':
      return (
        <Alert className="w-[292px]">
          <AlertTitle>{label('Save 20% today')}</AlertTitle>
          <AlertDescription>{label('Includes custom domains and priority support.')}</AlertDescription>
        </Alert>
      )
    case 'cancel':
      return <Button variant="outline" className="w-[150px]">{label('Cancel')}</Button>
    case 'upgrade':
      return <Button className="w-[150px]">{label('Upgrade')}</Button>
  }
}

/** Fit a child to its box, up to `max` (1 = shrink only). A CSS transform
 *  after layout, so the part keeps its true proportions; `offsetWidth/Height`
 *  read the untransformed size, so the fit can't feed back into itself. */
function ScaleToFit({ children, pad = 16, max = 1 }: { children: ReactNode; pad?: number; max?: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current
    if (!o || !i) return
    const fit = () => {
      if (!i.offsetWidth || !i.offsetHeight) return
      const s = Math.min(max, (o.clientWidth - pad * 2) / i.offsetWidth, (o.clientHeight - pad * 2) / i.offsetHeight)
      setScale((prev) => (prev != null && Math.abs(prev - s) < 0.005 ? prev : s))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [pad, max])
  return (
    <div ref={outer} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        ref={inner}
        className="flex-shrink-0"
        style={{ transform: `scale(${scale ?? 1})`, opacity: scale == null ? 0 : 1 }}
      >
        {children}
      </div>
    </div>
  )
}

/** The dotted canvas the demo sits on, in the system's own page colour. */
function canvasStyle(page: string | undefined): CSSProperties {
  return {
    backgroundColor: page,
    backgroundImage: 'radial-gradient(color-mix(in srgb, var(--fg) 14%, transparent) 1px, transparent 1px)',
    backgroundSize: '16px 16px',
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={cn('flex-shrink-0 text-fg-faint transition-transform duration-200 ease-[var(--ease-out-quint)]', open && 'rotate-180')}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** Choose a primitive: the family, then one of its 12 tones. */
function TonePicker({
  current, families, look, onPick,
}: {
  current: string | undefined
  families: string[]
  look: (fam: string, tone: number) => string | undefined
  onPick: (ref: string) => void
}) {
  const m = current ? FAMILY_REF.exec(current) : null
  const [fam, setFam] = useState(m?.[1] ?? families[0])
  const alpha = fam.endsWith('-a')
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Family" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {families.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={f === fam}
            onClick={() => setFam(f)}
            className={cn(
              'flex min-h-9 flex-shrink-0 items-center gap-2 rounded-full border px-3 text-body font-medium transition-colors',
              FOCUS,
              f === fam ? 'border-accent-ui bg-accent-ui/10 text-fg' : 'border-line text-fg-muted hover:text-fg',
            )}
          >
            <span
              className="h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/15"
              style={{ background: look(f, 9), ...(f.endsWith('-a') ? CHECKER : {}) }}
              aria-hidden
            />
            {familyLabel(f)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((tone) => {
          const hex = look(fam, tone)
          if (!hex) return <span key={tone} />
          const selected = m?.[1] === fam && Number(m[2]) === tone
          return (
            <button
              key={tone}
              type="button"
              aria-pressed={selected}
              aria-label={`${fam}.${tone}`}
              title={`${fam}.${tone}`}
              onClick={() => onPick(`${fam}.${tone}`)}
              className={cn(
                'relative h-11 overflow-hidden rounded-lg ring-1 ring-black/10 transition-transform active:scale-95 dark:ring-white/10',
                FOCUS,
                selected && 'ring-2 ring-accent-ui ring-offset-2 ring-offset-surface dark:ring-accent-ui',
              )}
              style={alpha ? CHECKER : undefined}
            >
              <span className="absolute inset-0" style={{ background: hex }} aria-hidden />
              <span
                className="relative font-mono text-mini font-semibold tabular-nums"
                style={{ color: alpha ? undefined : readableInk(hex) }}
              >
                {tone}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Choose a step of the row's own scale. */
function StepPicker({
  kind, steps, current, onPick,
}: {
  kind: LengthScale
  steps: { key: string; value: string }[]
  current: string | undefined
  onPick: (step: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => centerInStrip(listRef.current, '[aria-pressed="true"]'), [])
  return (
    // Bleeds to the row's edges (`-mx-3`) and fades there, so a pill scrolled
    // past the edge reads as "more this way", not as a pill cut in half.
    <div
      ref={listRef}
      className="relative -mx-3 flex gap-1.5 overflow-x-auto px-3 py-0.5 [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-12px),transparent)] [scrollbar-width:none]"
    >
      {steps.map((s) => {
        const selected = s.key === current
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={selected}
            aria-label={`${kind}.${stepLabel(s.key)} · ${s.value}`}
            onClick={() => onPick(s.key)}
            className={cn(
              'flex min-w-14 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border px-2.5 py-2 transition-[color,background-color,border-color,transform] active:scale-95',
              kind === 'radius' ? 'h-[68px]' : 'h-12',
              FOCUS,
              selected ? 'border-accent-ui bg-accent-ui/10' : 'border-line hover:border-line-strong',
            )}
          >
            {kind === 'radius' && (
              // The corner itself, at the step's radius (capped to fit the mark).
              <span
                className={cn('h-4 w-4 flex-shrink-0 border-l-[1.5px] border-t-[1.5px]', selected ? 'border-accent-ui' : 'border-fg-muted')}
                style={{ borderTopLeftRadius: Math.min(px(s.value), 14) }}
                aria-hidden
              />
            )}
            <span className="flex flex-col items-center leading-none">
              <span className={cn('font-mono text-body font-semibold', selected ? 'text-fg' : 'text-fg-muted')}>{stepLabel(s.key)}</span>
              <span className="mt-1 font-mono text-mini tabular-nums text-fg-faint">{s.value}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The curated brand colours, one tap each, in hue order. Scrolls sideways
 *  under the system name; the picked one is ringed and kept in view. A
 *  dealt accent outside the run rides first, so the row always shows what
 *  is on screen. */
function ColorRow({
  current, kept, onPick, label, keptLabel,
}: {
  current: string
  kept: boolean
  onPick: (color: ColorPreset) => void
  label: string
  keptLabel: string
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const known = BRAND_SPECTRUM.some((c) => sameHex(c.hex, current))
  const colors = known ? BRAND_SPECTRUM : [{ label: current, hex: current }, ...BRAND_SPECTRUM]
  useEffect(() => centerInStrip(stripRef.current, '[aria-checked="true"]'), [current])
  return (
    <div className="flex flex-col gap-1.5 border-t border-line/70 pb-2 pt-2">
      <span className="flex items-center justify-between gap-2 px-3 text-mini text-fg-faint">
        <span>{label}</span>
        {kept && (
          <span className="flex items-center gap-1 text-fg-muted">
            <LockGlyph locked />
            {keptLabel}
          </span>
        )}
      </span>
      <div
        ref={stripRef}
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 overflow-x-auto px-2 py-1 [mask-image:linear-gradient(to_right,transparent,#000_10px,#000_calc(100%-10px),transparent)] [scrollbar-width:none]"
      >
        {colors.map((c) => {
          const on = sameHex(c.hex, current)
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.label}
              title={c.label}
              onClick={() => onPick(c)}
              className={cn('flex h-11 w-9 flex-shrink-0 items-center justify-center rounded-full', FOCUS)}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/10 transition-transform duration-150 ease-[var(--ease-out-quint)] active:scale-90 dark:ring-white/15',
                  on && 'ring-2 ring-fg ring-offset-2 ring-offset-app dark:ring-fg',
                )}
                style={{ background: c.hex, color: readableInk(c.hex) }}
                aria-hidden
              >
                {on && <CheckGlyph />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AboutInspectDemo() {
  const { t } = useI18n()
  const chrome = useTheme()
  const reduceMotion = useReducedMotion() ?? false

  // ── The system: Core, or whatever the visitor shuffled to ──
  const [system, setSystem] = useState<DemoSystem>(CORE_SYSTEM)
  const deck = useRef(createShuffleDeck())
  const shuffles = useRef(0)
  const overlay = useMemo(
    () => ({
      ...stylePreviewStore(useDesignStore.getState(), { preset: system.preset, appearance: chrome }, chrome),
      semanticArchitecture: 'categorical' as const,
    }),
    [system, chrome],
  )
  const tokens = useMemo(() => resolvePreviewTokens(overlay, chrome, chrome, 'mobile'), [overlay, chrome])
  const look = useMemo(() => {
    const o = overlay
    const scales: GlobalScales = {
      brand: o.primaryScale, gray: o.grayLightScale, error: o.errorScale,
      warning: o.warningScale, success: o.successScale, info: o.infoScale,
      grayDark: o.grayDarkScale,
      dark: {
        brand: o.primaryDarkScale, gray: o.grayDarkScale, error: o.errorDarkScale,
        warning: o.warningDarkScale, success: o.successDarkScale, info: o.infoDarkScale,
      },
    }
    return scaleLookup(scales, undefined, chrome, o.pageBackground, o.darkBackground)
  }, [overlay, chrome])
  // The static scales, as the system ships them (tokens.json `radius`,
  // `spacing`, `sizes`, `stroke`) — what a role can point at.
  const rawScales: Record<LengthScale, Record<string, string> | undefined> = useMemo(() => ({
    radius: tokens.radius, spacing: tokens.spacing, size: tokens.sizes, stroke: tokens.stroke,
  }), [tokens])
  const lengthScales: Record<LengthScale, { key: string; value: string }[]> = useMemo(() => ({
    radius: stepsOf(rawScales.radius),
    spacing: stepsOf(rawScales.spacing),
    size: stepsOf(rawScales.size),
    stroke: stepsOf(rawScales.stroke),
  }), [rawScales])

  const stageRef = useRef<HTMLDivElement>(null)
  const partsRef = useRef<HTMLDivElement>(null)
  const [part, setPart] = useState<PartId>('card')
  const [open, setOpen] = useState(false)

  // Keep the picked part's chip in view in the sheet (Button sits past the edge).
  useEffect(() => {
    if (open) centerInStrip(partsRef.current, '[aria-pressed="true"]')
  }, [open, part])
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [element, setElement] = useState<Element | null>(null)

  // ── Locks: the axes the next shuffle keeps ──
  const [locks, setLocks] = useState<ReadonlySet<ShuffleAxis>>(new Set())
  const toggleLock = (axis: ShuffleAxis) => setLocks((prev) => {
    const next = new Set(prev)
    if (next.has(axis)) next.delete(axis)
    else next.add(axis)
    return next
  })

  // ── Receipt: what the last shuffle moved. The rows BEFORE are read at the
  // press; the rows AFTER once the new tokens have painted. ──
  const [receipt, setReceipt] = useState<{ id: number; changes: ReceiptChange[] } | null>(null)
  const before = useRef<Map<string, ReceiptRow> | null>(null)
  const receiptSeq = useRef(0)
  useEffect(() => {
    const prev = before.current
    if (!prev) return
    before.current = null
    receiptSeq.current += 1
    setReceipt({ id: receiptSeq.current, changes: diffReceipt(prev, collectRows(tokens, stageRef.current)) })
  }, [tokens])

  // Each line lights up the parts that read its token, one after the other —
  // the "one variable, many components" beat, shown rather than said.
  useEffect(() => {
    const stage = stageRef.current
    if (!receipt || reduceMotion || !stage) return
    const timers: number[] = []
    pickReceipt(receipt.changes, RECEIPT_LINES).forEach((change, i) => {
      timers.push(window.setTimeout(() => {
        for (const id of change.parts) {
          const el = stage.querySelector<HTMLElement>(`[data-demo="${id}"]`)
          if (!el) continue
          el.removeAttribute('data-pulse')
          void el.offsetWidth // restart the animation on a part already pulsing
          el.setAttribute('data-pulse', '')
        }
      }, i * PULSE_STAGGER))
    })
    return () => {
      timers.forEach(clearTimeout)
      stage.querySelectorAll('[data-pulse]').forEach((el) => el.removeAttribute('data-pulse'))
    }
  }, [receipt, reduceMotion])

  // ── Contrast: the System dashboard's audit, in light AND dark ──
  const contrast = useMemo(() => {
    const store = useDesignStore.getState()
    const rolesIn = (mode: 'light' | 'dark') => resolvePreviewTokens(
      { ...stylePreviewStore(store, { preset: system.preset, appearance: mode }, mode), semanticArchitecture: 'categorical' as const },
      mode, mode, 'mobile',
    ).archTokens ?? {}
    return playgroundContrast({ light: rolesIn('light'), dark: rolesIn('dark') })
  }, [system])
  const [contrastOpen, setContrastOpen] = useState(false)

  // ── Hand-off: the system on stage as a `?remix=` link to open on a laptop.
  // Encoded ahead of the tap (deflate is async), so the share sheet opens
  // inside the tap itself — Safari refuses one that waits on a promise. ──
  const [encoded, setEncoded] = useState<{ system: DemoSystem; url: string } | null>(null)
  const link = encoded?.system === system ? encoded.url : null
  useEffect(() => {
    let live = true
    encodeRemix(system.preset).then((code) => { if (live) setEncoded({ system, url: remixUrl(code) }) }, () => {})
    return () => { live = false }
  }, [system])

  // A `?remix=` opened on a phone lands here: the playground starts on it.
  useEffect(() => {
    const code = takeIncomingRemix()
    if (!code) return
    let live = true
    decodeRemix(code).then((decoded) => {
      if (!live) return
      if (!decoded) { showToast(t('This link could not be opened.'), undefined, true); return }
      const preset = remixPreset(decoded, code, t(RANDOM_THEME_LABEL))
      loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
      loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
      setSystem({ preset, styleId: decoded.whole ? preset.id : undefined })
      stageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep a handle on the picked element to trace it (the marker is what the
  // desktop inspector outlines; the phone shows the part in the sheet instead).
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

  // Resting rows only, one row per CSS variable (the same token read by two
  // slots is one decision), still grouped by the slot that reads it first.
  const sections = useMemo(() => {
    const seen = new Set<string>()
    return (trace?.slots ?? [])
      .map((slot) => ({
        slot: slot.slot,
        rows: slot.rows.filter((row) => {
          if (row.state || seen.has(row.cssVar)) return false
          seen.add(row.cssVar)
          return true
        }),
      }))
      .filter((s) => s.rows.length)
  }, [trace])
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, color: 0, layout: 0, type: 0 }
    for (const s of sections) for (const r of s.rows) { c.all++; c[filterOf(r.kind)]++ }
    return c
  }, [sections])

  // Families a colour can point at — the solids, then the translucent
  // ladders, in the appearance on screen.
  const families = useMemo(() => {
    const dark = chrome === 'dark'
    return [
      'accent', dark ? 'neutral-dark' : 'neutral', 'error', 'warning', 'success', 'info',
      'accent-a', dark ? 'white-a' : 'black-a',
    ]
  }, [chrome])

  const resolve = (o: Override): string | undefined => {
    if (o.kind === 'color') {
      const m = FAMILY_REF.exec(o.ref)
      return m ? look(m[1], Number(m[2])) : undefined
    }
    return lengthScales[o.scale].find((s) => s.key === o.step)?.value
  }
  const overrideStyle = Object.fromEntries(
    Object.entries(overrides).flatMap(([v, o]) => {
      const css = resolve(o)
      return css ? [[v, css]] : []
    }),
  ) as CSSProperties

  if (!tokens.archTokens) return null

  const inspect = (id: PartId) => {
    if (id !== part) { setOpenRow(null); setFilter('all') }
    setPart(id)
    setOpen(true)
  }
  const partOf = (target: EventTarget | null) => {
    const id = (target as Element | null)?.closest?.('[data-demo]')?.getAttribute('data-demo') as PartId | null
    return id && PARTS.some((p) => p.id === id) ? id : null
  }

  const isCore = system === CORE_SYSTEM
  const edited = Object.keys(overrides).length > 0
  const resetAll = () => { setOverrides({}); setSystem(CORE_SYSTEM); setReceipt(null) }
  const baseName = system.styleId
    ? THEME_STYLE_PRESETS.find((p) => p.id === system.styleId)?.label ?? system.preset.label
    : system.baseName ?? t(RANDOM_THEME_LABEL)
  const systemName = system.colorName ? `${baseName} · ${system.colorName}` : baseName

  // A brand colour, picked from the curated run (never a free hex): the
  // accent changes and every ramp and role re-derives from it, like a
  // shuffle does. The colour then stays locked, so the next shuffle moves
  // type, shape and density around the colour the visitor chose.
  const pickColor = (color: ColorPreset) => {
    if (sameHex(color.hex, system.preset.accent)) return
    before.current = collectRows(tokens, stageRef.current)
    setSystem({
      preset: { ...system.preset, accent: color.hex },
      scaffoldId: system.scaffoldId,
      moodId: system.moodId,
      baseName,
      colorName: color.label,
    })
    setContrastOpen(false)
    if (!locks.has('color') && locks.size < SHUFFLE_AXES.length - 1) {
      setLocks((prev) => new Set(prev).add('color'))
    }
  }

  // One press of the Generator's dice, painted as a try-on.
  const shuffle = () => {
    const type = system.preset.foundations.typography
    const recipe = nextShuffle({
      currentStyle: system.styleId,
      accent: system.preset.accent,
      bodyFont: type?.fontFamily,
      headingFont: type?.headingFontFamily ?? type?.fontFamily,
      typeScale: inferTypeScaleMode(type?.sizes),
      avoidScaffold: system.scaffoldId,
      avoidMood: system.moodId,
      deck: deck.current,
    })
    loadGoogleFont(recipe.bodyFont)
    loadGoogleFont(recipe.headingFont)
    const style = recipe.styleId ? THEME_STYLE_PRESETS.find((p) => p.id === recipe.styleId) : undefined
    const dealt = style ?? stylePreviewFromRecipe({ preset: system.preset, appearance: chrome }, recipe, chrome).preset
    before.current = collectRows(tokens, stageRef.current)
    setSystem({
      // A locked axis keeps this system's own fields; a style dealt through a
      // lock is no longer that style whole, so it takes no style's name.
      preset: applyShuffleLocks(system.preset, dealt, locks),
      styleId: locks.size ? undefined : style?.id,
      scaffoldId: recipe.scaffoldId,
      moodId: recipe.moodId,
      // A kept colour keeps its name; a dealt one is the dice's.
      colorName: locks.has('color') ? system.colorName : undefined,
    })
    setContrastOpen(false)
    shuffles.current += 1
    const reached = SHUFFLE_MILESTONES[shuffles.current as keyof typeof SHUFFLE_MILESTONES]
    if (reached) trackEvent({ name: 'mobile_shuffle', props: { reached, locked: locks.size ? 'some' : 'none' } })
  }

  const page = tokens.archTokens['surface.page'] ?? undefined
  const lines = receipt ? pickReceipt(receipt.changes, RECEIPT_LINES) : []
  const more = receipt ? receipt.changes.length - lines.length : 0
  const contrastPasses = contrast.measured > 0 && contrast.failing.length === 0
  // A receipt line opens the inspector right on its token.
  const openAt = (change: ReceiptChange) => {
    setPart(partFor(change))
    setFilter(filterOf(change.kind))
    setOpenRow(change.cssVar)
    setOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* ── The stage: a real screen, painted with Core. Nothing is outlined
            at rest — a dashed box there read as "already selected". The hint
            says what to do; the accent pill is the one control on the canvas. ── */}
        <div
          ref={stageRef}
          onClickCapture={(e) => {
            // Picking is the job here: a tap selects and opens, it never submits.
            e.preventDefault()
            const id = partOf(e.target)
            if (id) inspect(id)
          }}
          className="relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-line px-4 pb-4 pt-14 [&_[data-demo]]:cursor-pointer"
          style={canvasStyle(page)}
        >
          <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-app/80 px-2.5 py-1 text-caption font-medium text-fg-muted backdrop-blur-sm">
            <PointerGlyph />
            {t('Tap any part')}
          </span>

          <RecipeScope t={tokens}>
            <div style={{ display: 'contents', ...overrideStyle }}>
              <DemoCard label={t} />
            </div>
          </RecipeScope>

          {/* ── The system: Core, or a shuffle of it — never typed. Two ways
              to move it, both in reach of a thumb: Shuffle deals a whole new
              look; a colour below re-paints this one. ── */}
          <div className="flex w-full max-w-[340px] flex-col rounded-2xl border border-line bg-app/85 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1 p-1 pl-3">
            {/* Same width as the card above (`max-w-[340px]`): the name takes
                the slack, the actions stay at the right edge. */}
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-mini text-fg-faint">{t('System')}</span>
              <span className="truncate text-body font-medium text-fg" aria-live="polite">{systemName}</span>
            </span>
            {(!isCore || edited) && (
              <button
                type="button"
                onClick={resetAll}
                aria-label={t('Reset')}
                title={t('Reset')}
                className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-elevated hover:text-fg active:scale-95', FOCUS)}
              >
                <ResetGlyph />
              </button>
            )}
            <RandomThemeButton
              variant="labeled"
              label={t('Shuffle system')}
              visibleLabel={t('Shuffle')}
              className="!h-11 !rounded-xl !bg-fg px-3.5 text-body font-semibold !text-app hover:!bg-fg/90"
              onClick={shuffle}
            />
          </div>
          <ColorRow
            current={system.preset.accent}
            kept={locks.has('color')}
            onPick={pickColor}
            label={t('Brand color')}
            keptLabel={t('Kept while shuffling')}
          />
          </div>
        </div>

        {/* ── Locks: keep an axis, shuffle the rest. One always stays free, so
            the dice always has something to move. ── */}
        <div role="group" aria-label={t('Keep while shuffling')} className="flex flex-col gap-2">
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Keep while shuffling')}</span>
          <div className="grid grid-cols-4 gap-1.5">
            {SHUFFLE_AXES.map((axis) => {
              const on = locks.has(axis)
              const last = !on && locks.size === SHUFFLE_AXES.length - 1
              return (
                <button
                  key={axis}
                  type="button"
                  aria-pressed={on}
                  disabled={last}
                  onClick={() => toggleLock(axis)}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-caption font-medium transition-[color,background-color,border-color,transform] active:scale-[0.97] disabled:opacity-40',
                    FOCUS,
                    on ? 'border-accent-ui bg-accent-ui/10 text-fg' : 'border-line text-fg-muted hover:text-fg',
                  )}
                >
                  <LockGlyph locked={on} />
                  {t(AXIS_LABEL[axis])}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── The receipt: contrast first (the promise), then what moved ── */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/40 p-3">
          <button
            type="button"
            aria-expanded={contrastPasses ? undefined : contrastOpen}
            onClick={() => !contrastPasses && setContrastOpen((o) => !o)}
            className={cn(
              'flex min-h-9 items-center gap-2 self-start rounded-xl px-3 py-1.5 text-left text-body font-medium',
              FOCUS,
              contrastPasses ? 'cursor-default bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning',
            )}
          >
            {contrastPasses ? <CheckGlyph /> : <WarnGlyph />}
            <span aria-live="polite">
              {contrastPasses
                ? t('{count} contrast pairs pass in light and dark', { count: contrast.measured })
                : t('{failing} of {count} contrast pairs fall short', { failing: contrast.failing.length, count: contrast.measured })}
            </span>
          </button>
          {!contrastPasses && contrastOpen && (
            <ul className="flex flex-col gap-1 px-1">
              {contrast.failing.map((f) => (
                <li key={`${f.theme}-${f.role}-${f.against}`} className="flex items-baseline justify-between gap-3 text-caption">
                  <span className="min-w-0 truncate font-mono text-fg-muted">{f.role} / {f.against}</span>
                  <span className="flex-shrink-0 font-mono tabular-nums text-fg-faint">
                    {t(f.theme === 'dark' ? 'Dark' : 'Light')} · {f.wcag.toFixed(2)}:1 / {INTENT_THRESHOLDS[f.intent].wcag}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!receipt ? (
            <p className="px-1 text-body text-fg-muted">{t('Shuffle to see which tokens change.')}</p>
          ) : !lines.length ? (
            <p className="px-1 text-body text-fg-muted">{t('Nothing the card reads changed.')}</p>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="px-1 text-mini font-semibold uppercase tracking-widest text-fg-faint">
                {t('{count} tokens changed', { count: receipt.changes.length })}
              </span>
              {lines.map((change, i) => (
                <motion.button
                  key={`${receipt.id}-${change.cssVar}`}
                  type="button"
                  onClick={() => openAt(change)}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: (i * PULSE_STAGGER) / 1000, ease: [0.22, 1, 0.36, 1] }}
                  className={cn('flex min-h-11 w-full flex-col gap-0.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-elevated/60', FOCUS)}
                >
                  <code className="w-full truncate font-mono text-caption text-accent-ui">{change.cssVar}</code>
                  <span className="flex w-full items-center gap-1.5 text-body text-fg">
                    <ChangeValue kind={change.kind} value={change.before} muted />
                    <span className="text-fg-faint" aria-hidden>→</span>
                    <ChangeValue kind={change.kind} value={change.after} />
                    <span className="ml-auto flex-shrink-0 text-caption text-fg-faint">
                      {t(change.parts.length === 1 ? '1 part' : '{count} parts', { count: change.parts.length })}
                    </span>
                  </span>
                </motion.button>
              ))}
              {more > 0 && (
                <span className="px-1 text-caption text-fg-faint">{t('+{count} more, tap any part to see them', { count: more })}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Hand-off: the playground's way out, to the editor on a laptop ── */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!link}
            onClick={() => link && handOff(link, t)}
            className={cn(
              'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-fg px-4 text-ui font-semibold text-app transition-[opacity,transform] active:scale-[0.98] disabled:opacity-60',
              FOCUS,
            )}
          >
            <LaptopGlyph />
            {t('Continue on my laptop')}
          </button>
          <p className="px-1 text-caption leading-relaxed text-fg-muted">
            {t('Sends this system as a link. It opens in the editor on a laptop, no account needed.')}
            {edited && <> {t('Inspector edits stay on this phone.')}</>}
          </p>
        </div>

        {/* Big targets for the small parts (a badge is hard to tap on a phone):
            ONE row that scrolls, bleeding to the page edge, never a wrap. */}
        <div
          role="group"
          aria-label={t('Pick a component')}
          className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-24px),transparent)] [scrollbar-width:none]"
        >
          {PARTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => inspect(p.id)}
              className={cn(
                'min-h-11 flex-shrink-0 rounded-full border border-line-strong bg-surface/40 px-4 text-body font-medium text-fg-muted transition-[color,transform] hover:text-fg active:scale-[0.97]',
                FOCUS,
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── The inspector: every token the picked component reads ── */}
      <InspectorSheet
        open={open}
        onClose={() => { setOpen(false); setOpenRow(null) }}
        heading={heading}
        count={counts.all}
        edited={edited}
        onReset={() => setOverrides({})}
      >
        {/* The picked part, live: the sheet covers the stage, so the change
            has to show here. Not interactive — it is a picture of the part. */}
        <div className="relative h-44 flex-shrink-0 border-b border-line" style={canvasStyle(page)} aria-hidden inert>
          <motion.div
            key={part}
            className="h-full w-full"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <RecipeScope t={tokens}>
              <div style={{ display: 'contents', ...overrideStyle }}>
                {/* The card shrinks to fit; a small part is magnified so its
                    colour and corners read at a glance. */}
                <ScaleToFit pad={part === 'card' ? 12 : 20} max={part === 'card' ? 1 : 1.5}>
                  <DemoPart id={part} label={t} />
                </ScaleToFit>
              </div>
            </RecipeScope>
          </motion.div>
        </div>

        {/* Parts — switch without leaving the sheet. */}
        <div
          ref={partsRef}
          className="relative flex flex-shrink-0 gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5 [scrollbar-width:none]"
        >
          {PARTS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={part === p.id}
              onClick={() => inspect(p.id)}
              className={cn(
                'min-h-9 flex-shrink-0 rounded-full border px-3 text-body font-medium transition-colors',
                FOCUS,
                part === p.id ? 'border-accent-ui bg-accent-ui/10 text-fg' : 'border-line text-fg-muted hover:text-fg',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Kinds — the Generator inspector's filter. */}
        <div role="tablist" aria-label={t('Token kind')} className="flex flex-shrink-0 items-center gap-1 border-b border-line px-3 py-2">
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={f.key === filter}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-body font-medium transition-colors',
                FOCUS,
                f.key === filter ? 'bg-elevated text-fg' : 'text-fg-faint hover:text-fg',
              )}
            >
              {t(f.label)}
              <span className={cn('tabular-nums', f.key === filter ? 'text-fg-muted' : '')}>{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {sections.map((section) => {
            const rows = section.rows.filter((r) => filter === 'all' || filterOf(r.kind) === filter)
            if (!rows.length) return null
            return (
              <section key={section.slot} aria-label={slotLabel(section.slot)} className="flex flex-col gap-2">
                <h4 className="m-0 px-1 text-mini font-semibold uppercase tracking-widest text-fg-faint">
                  {slotLabel(section.slot)}
                </h4>
                {rows.map((row) => {
                  const scale = scaleOf(row)
                  // A PRIMITIVE step (`spacing.4`) is its own value: re-pointing
                  // it is not a thing the system does (editing one rescales the
                  // whole scale), so it is shown, not edited. A ROLE
                  // (`radius.action`) aliases a step and can be re-pointed.
                  const primitive = !!scale && nameOf(row) in (rawScales[scale] ?? {})
                  return (
                  <TraceRowItem
                    key={row.cssVar}
                    row={row}
                    scale={scale}
                    primitive={primitive}
                    override={overrides[row.cssVar]}
                    current={
                      row.kind === 'color'
                        ? tokens.archLabels?.[roleIdOf(row)]
                        : primitive
                          ? nameOf(row)
                          : scale && lengthScales[scale].find((s) => px(s.value) === px(row.value))?.key
                    }
                    resolved={overrides[row.cssVar] ? resolve(overrides[row.cssVar]) : undefined}
                    expanded={openRow === row.cssVar}
                    onToggle={() => setOpenRow((o) => (o === row.cssVar ? null : row.cssVar))}
                    picker={(current) => {
                      if (row.kind === 'color') {
                        return (
                          <TonePicker
                            current={current}
                            families={current && FAMILY_REF.test(current) && !families.includes(current.split('.')[0])
                              ? [...families, current.split('.')[0]]
                              : families}
                            look={look}
                            onPick={(ref) => setOverrides((o) => ({ ...o, [row.cssVar]: { kind: 'color', ref } }))}
                          />
                        )
                      }
                      if (!scale || primitive) return null
                      return (
                        <StepPicker
                          kind={scale}
                          steps={lengthScales[scale]}
                          current={current}
                          onPick={(step) => setOverrides((o) => ({ ...o, [row.cssVar]: { kind: 'length', scale, step } }))}
                        />
                      )
                    }}
                  />
                  )
                })}
              </section>
            )
          })}
        </div>
      </InspectorSheet>
    </>
  )
}

/** One token the part reads: mark · property · value, the variable under it.
 *  A colour role or a length role opens its picker in place; a primitive
 *  step, a sum, a type style or a shadow is shown, not edited. */
function TraceRowItem({
  row, scale, primitive, override, current, resolved, expanded, onToggle, picker,
}: {
  row: TraceRow
  /** The length scale the row reads (from its ref), if it is a length. */
  scale: LengthScale | undefined
  /** The row reads a scale step directly, not a role that aliases one. */
  primitive: boolean
  override: Override | undefined
  /** The primitive or step the row reads now, before any edit. */
  current: string | undefined
  resolved: string | undefined
  expanded: boolean
  onToggle: () => void
  picker: (current: string | undefined) => ReactNode
}) {
  const panelId = useId()
  const pickedRef = override?.kind === 'color' ? override.ref : override?.kind === 'length' ? override.step : undefined
  const now = pickedRef ?? current
  const shown: TraceRow = resolved ? { ...row, value: resolved } : row
  const editable = !row.cssVar.includes('+') && (
    (row.kind === 'color' && !!now && FAMILY_REF.test(now)) || (!!scale && !primitive && !!now)
  )

  // Name the value the way the system does: `accent.9` for a colour, the px
  // for a length with its step under it.
  const value = row.kind === 'color'
    ? (now && FAMILY_REF.test(now) ? now : displayHex(shown.value))
    : shown.value
  // The step as the recipe refs write it (`radius.md`, `spacing.0_5`): a bare
  // `4` under `16px` read as a second, unexplained number.
  const step = row.kind !== 'color' && scale && now ? `${scale}.${now}` : null

  // Generator layout: the property and its VALUE share the first line (what a
  // designer reads), the variable gets the whole second line so it never
  // truncates to `--color-action-primary-def…`.
  const head = (
    <>
      <span className="flex w-full items-center gap-3">
        <ValueMark row={shown} size="lg" />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-ui font-medium text-fg">{row.label}</span>
          {override && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-ui" aria-label="Edited" />}
        </span>
        <span className="flex flex-shrink-0 flex-col items-end">
          <span className="max-w-[9rem] truncate font-mono text-body tabular-nums text-fg" title={shown.value}>
            {value}
          </span>
          {step && <span className="font-mono text-mini text-fg-faint">{step}</span>}
        </span>
        {editable && <Chevron open={expanded} />}
      </span>
      <code className="ml-12 min-w-0 max-w-[calc(100%-3rem)] self-start truncate rounded-md bg-accent-ui/10 px-1.5 py-0.5 font-mono text-mini text-accent-ui" title={row.ref}>
        {row.cssVar}
      </code>
    </>
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-colors duration-200',
        expanded ? 'border-accent-ui/45 bg-accent-ui/[0.06]' : 'border-line bg-surface/70',
      )}
    >
      {editable ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn('flex w-full flex-col gap-1.5 p-3 text-left', FOCUS, 'focus-visible:ring-inset')}
        >
          {head}
        </button>
      ) : (
        <div className="flex w-full flex-col gap-1.5 p-3">{head}</div>
      )}
      {row.facets && (
        <div className="mx-3 mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-app/50 px-3 py-2">
          {row.facets.map((facet) => (
            <span key={facet.label} className="contents">
              <span className="text-caption text-fg-faint">{facet.label}</span>
              <span className="truncate text-right font-mono text-caption tabular-nums text-fg-muted">{facet.value}</span>
            </span>
          ))}
        </div>
      )}
      {editable && expanded && (
        <div id={panelId} className="border-t border-line/70 p-3">
          {picker(now)}
        </div>
      )}
    </div>
  )
}

/** Drag distance (px) past which letting go of the handle closes the sheet. */
const DRAG_CLOSE = 120

/** The inspector as a bottom sheet: portaled to `<body>` so no transformed
 *  ancestor can trap its `fixed`, the page behind it frozen while it is open,
 *  focus moved in on open and handed back on close. */
function InspectorSheet({
  open, onClose, heading, count, edited, onReset, children,
}: {
  open: boolean
  onClose: () => void
  heading: string
  count: number
  edited: boolean
  onReset: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion() ?? false
  const dragControls = useDragControls()
  const sheetRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // The parent passes a fresh `onClose` every render; the open/close effect
  // must run once per opening, not once per edit.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    // Focus the dialog, not its ✕: a button focused on open wears its focus
    // ring, which on a phone reads as already pressed.
    sheetRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.({ preventScroll: true })
    }
  }, [open])

  const ease = reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={ease}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={ease}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > DRAG_CLOSE || info.velocity.y > 600) onClose()
            }}
            className="fixed inset-x-0 bottom-0 z-[61] flex h-[80dvh] flex-col overflow-hidden rounded-t-2xl border-t border-line bg-app shadow-2xl outline-none"
          >
            {/* Handle + header: the drag zone (the list below keeps its own scroll). */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex-shrink-0 touch-none border-b border-line"
            >
              <div className="flex justify-center pb-1 pt-2.5" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-line-strong" />
              </div>
              <div className="flex items-center justify-between gap-3 pb-2 pl-4 pr-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span id={titleId} className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Inspecting')}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <code className="truncate font-mono text-strong font-semibold text-accent-ui">{heading}</code>
                    <span className="flex-shrink-0 rounded-md bg-elevated px-1.5 py-0.5 font-mono text-mini tabular-nums text-fg-muted">{count}</span>
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {edited && (
                    <button
                      type="button"
                      onClick={onReset}
                      className={cn('min-h-9 rounded-lg px-2.5 text-body font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg', FOCUS)}
                    >
                      {t('Reset')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('Close')}
                    className={cn('flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-elevated hover:text-fg', FOCUS)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
