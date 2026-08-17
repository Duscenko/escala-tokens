import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, type ThemePalette } from '../../store/useDesignStore'
import {
  architectureLabel, buildArchitectureView, scaleLookup,
  type ArchTokenValue, type SemanticArchitecture,
} from '../../lib/semanticArchitectures'
import {
  SCALE_META, ROLE_GROUPS, ALL_ROLES, BRAND_TOKEN_TONES, baseLabelForTone,
  toneIndexOf, sourceScaleFor, recToneFor, recHexFor,
  type Role, type RoleScale, type GlobalScales,
} from '../../lib/semanticRoles'
import { toneLabel, type ColorNaming } from '../../lib/colorUtils'
import { resolveThemePalette } from '../../lib/themeSources'
import { ArchitectureSelect, ArchContrastStrip } from './ArchitecturePicker'
import { useEnsureColorScales } from '../../lib/colorActions'
import { BRAND_GROUPS, findOption, ScaleRow, SystemRampGrid, TokenDetailsModal, DeleteThemeModal } from './colorControls'
import { SlidersIcon, PaletteIcon } from '../ui/icons'

// Role catalogue + tone helpers live in lib/semanticRoles.ts (shared with the
// token export so exported values always resolve to a tone of their ramp).
export { BRAND_TOKEN_TONES }


// Shared category id — the table's side-nav and the right-hand preview both key
// off this, so editing a category's tokens shows a matching live specimen.
export type SemanticCategory = 'all' | 'content' | 'background' | 'border'

/**
 * Normalized preview focus — what KIND of thing the selected semantic group
 * governs, independent of which architecture names it. The flat catalogue has
 * three groups (content · background · border), Categorical five (content ·
 * action · surface · status · border), Vibrancy and Tonal their own; the
 * right-hand preview only cares which of these five specimens to show.
 */
export type SemanticFocus = 'content' | 'icon' | 'action' | 'surface' | 'status' | 'border'

/**
 * Nav-item key → preview focus, across every architecture. `null` = no specific
 * focus (the "All tokens" entry), which the shell reads as "show the overview".
 * This is also what drives each nav row's glyph, so the icon and the preview can
 * never disagree about what a group is.
 */
export function focusForNavKey(key: string): SemanticFocus | null {
  switch (key) {
    // Flat catalogue + shared names.
    case 'content': return 'content'
    case 'border': return 'border'
    case 'background': return 'surface'
    // Categorical.
    case 'action': return 'action'
    case 'surface': return 'surface'
    case 'status': return 'status'
    // Astryx.
    case 'accent': return 'action'
    // Astryx ships `icon.*` as its OWN hierarchy parallel to `text.*`, so it
    // gets its own specimen — it used to fold into 'content', which meant
    // picking Icon in the nav showed the text preview and no glyphs at all.
    case 'icon': return 'icon'
    // shadcn/ui (groups shared with Astryx/Categorical/Tonal above reuse
    // those cases: accent, secondary, border).
    case 'base': return 'surface'
    case 'card': return 'surface'
    case 'popover': return 'surface'
    case 'primary': return 'action'
    case 'muted': return 'surface'
    case 'destructive': return 'status'
    case 'sidebar': return 'surface'
    // Vibrancy (Apple HIG grouping).
    case 'labels': return 'content'
    case 'backgrounds': return 'surface'
    case 'materials': return 'surface'
    case 'fills': return 'action'
    case 'separators': return 'border'
    // Tonal (Material 3) + remaining projection groups.
    case 'text': return 'content'
    case 'core': return 'action'
    case 'secondary': return 'action'
    case 'tertiary': return 'action'
    case 'tint': return 'action'
    case 'surfaces': return 'surface'
    case 'fallbacks': return 'surface'
    case 'error': return 'status'
    case 'outlines': return 'border'
    default: return null
  }
}

// Architectures whose refs resolve PER-THEME (one column per `themeOrder`
// entry, same as the flat matrix) — so "+ Theme", real theme-name labels and
// deletable columns all apply. Vibrancy/Tonal stay excluded: their light/dark
// are a fixed binary transform of the global primitives with no per-theme
// concept (see ArchitectureView.modeKeys' doc comment in semanticArchitectures.ts).
const PER_THEME_ARCHITECTURES = new Set<SemanticArchitecture>(['categorical', 'astryx', 'shadcn'])

// ── Category nav metadata: icon + one-line description (tooltip) ─────────────
const catIc = (d: string, filled = false): ReactNode => (
  <svg
    width="15" height="15" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
)

const CATEGORY_ICON: Record<SemanticCategory, ReactNode> = {
  all:        catIc('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
  content:    catIc('M4 7V4h16v3M9 20h6M12 4v16'),
  background: catIc('M3 3h18v18H3z', true),
  border:     catIc('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'),
}

const CATEGORY_DESC: Record<SemanticCategory, string> = {
  all: 'Every semantic role across all categories',
  ...(Object.fromEntries(ROLE_GROUPS.map((g) => [g.category, g.description])) as Record<
    Exclude<SemanticCategory, 'all'>,
    string
  >),
}

// Glyph per normalized focus — action/status have no flat-category equivalent,
// so they get their own (a cursor-ish pointer, a pulse).
const FOCUS_ICON: Record<SemanticFocus, ReactNode> = {
  content: CATEGORY_ICON.content,
  // A star — the app's own stand-in for "a glyph", distinct from Content's
  // type mark so the two Astryx groups don't read as the same thing.
  icon:    catIc('M12 3l2.6 6.2 6.4.5-4.9 4.2 1.5 6.1L12 16.8 6.4 20l1.5-6.1L3 9.7l6.4-.5L12 3z'),
  surface: CATEGORY_ICON.background,
  border:  CATEGORY_ICON.border,
  action:  catIc('M3 3l7.5 18 2.6-7.9L21 10.5 3 3z', true),
  status:  catIc('M3 12h4l2.5-7 4 14L16 12h5'),
}
// A nav row's glyph comes from the SAME mapping the preview focus does, so the
// icon can never imply a different grouping than the specimen it opens.
const archIconFor = (key: string): ReactNode => {
  const focus = focusForNavKey(key)
  return focus ? FOCUS_ICON[focus] : CATEGORY_ICON.all
}

// Checkerboard under alpha swatches so transparency reads visually (vibrancy).
const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(rgba(127,127,127,0.35) 0% 25%, transparent 0% 50%)',
  backgroundSize: '8px 8px',
}

/** Dynamic read-only value cell for projected architectures. Adapts to the
 *  active `architecture.kind`:
 *   · vibrancy — alpha values render on a checkerboard swatch; label tokens
 *     carry a badge revealing their opaque WCAG fallback alias.
 *   · tonal — emphasizes the tonal reference ({primary.40} ↔ {primary.80}),
 *     not the raw hex, so the light↔dark tone inversion stays legible. */

// ── Inline scale editor for an architecture token ───────────────────────────
// Deliberately the SAME shape as the flat matrix's expanded row: the sliders
// icon opens the row, the description + CSS var surface, and each mode shows a
// full ramp with the current tone selected. A popover on the value chip did the
// same job but taught a second interaction for the same task — and hid the
// role's description, which is half of why you open the editor at all.
const PICKABLE_FAMILIES = ['accent', 'neutral', 'neutral-dark', 'error', 'warning', 'success', 'info'] as const

// Built through `scaleLookup` — the SAME resolver the architecture table and
// the export use — so the swatch you click is the colour that mode will
// actually render. It used to read `scales.brand`/`scales.error`/… directly,
// i.e. the LIGHT ramps for every mode: a dark theme's picker showed light
// tints, and picking one silently stored a ref that resolves to a completely
// different (dark-twin) colour. Every mode showed an identical grid, which is
// what made the bug invisible.
function rampsOf(
  scales: GlobalScales,
  palette?: ThemePalette,
  kind: 'light' | 'dark' = 'light',
): Record<string, Record<number, string> | undefined> {
  const look = scaleLookup(scales, palette, kind)
  const build = (fam: string) => {
    const out: Record<number, string> = {}
    for (let tone = 1; tone <= 12; tone++) {
      const hex = look(fam, tone)
      if (hex) out[tone] = hex
    }
    return Object.keys(out).length ? out : undefined
  }
  return Object.fromEntries(PICKABLE_FAMILIES.map((fam) => [fam, build(fam)]))
}

/** `neutral.12` → ['neutral', 12]; null for raw CSS (vibrancy alphas, blur). */
function parseRef(label: string): [string, number] | null {
  const m = /^([a-z-]+)\.(\d+)$/.exec(label)
  return m ? [m[1], Number(m[2])] : null
}

// The mode's name + light/dark glyph used to live here; it's the collapsible
// section header now (see TokenDetailsModal's `sections`), so this renders the
// grid alone rather than printing a second label inside its own card.
function ArchModeEditor({
  label, value, scales, palette, kind, onPick,
}: {
  /** That mode's own palette + polarity — the grid MUST resolve through these
   *  (see `rampsOf`), or a dark mode offers light swatches. */
  palette?: ThemePalette
  kind: 'light' | 'dark'
  /** Display text — the theme's name (accent-prefixed for a custom theme) or
   *  the plain 'light'/'dark' word for Vibrancy/Tonal. Used for the grid's
   *  accessible name; the visible label is the section header's. */
  label: string
  value: ArchTokenValue
  scales: GlobalScales
  onPick: (ref: string) => void
}) {
  const parsed = parseRef(value.label)
  const ramps = rampsOf(scales, palette, kind)
  const family = parsed?.[0] ?? 'accent'
  const tone = parsed?.[1] ?? null

  return (
    <div className="flex flex-col gap-2">
      {/* Every family, every tone, in one grid — picking a cell writes
          `{family.tone}` directly. This replaced a chip row ("which family?")
          stacked over a single ScaleRow ("which tone?"): that split one choice
          into two clicks and hid all the other families behind the active
          chip, so you couldn't compare candidates while choosing. Same widget
          the colour picker used to carry as its "Palette" block. */}
      <SystemRampGrid
        ramps={PICKABLE_FAMILIES.map((key) => ({ key, scale: ramps[key] }))}
        selected={tone != null ? { family, tone } : null}
        onPick={(fam, t) => onPick(`{${fam}.${t}}`)}
        ariaLabel={`Pick a token for ${label}`}
      />
    </div>
  )
}

function TokenCell({
  v,
  kind,
  fallback,
  onEdit,
  edited,
}: {
  v: ArchTokenValue
  kind: SemanticArchitecture
  fallback?: ArchTokenValue
  /** Present when the value is a primitive ref and can therefore be re-pointed. */
  onEdit?: () => void
  edited?: boolean
}) {
  const hasAlpha = /\/\s*0\./.test(v.css)
  const tonal = kind === 'tonal' ? /^([a-z-]+)\.(\d+)$/.exec(v.label) : null
  const Chip = onEdit ? 'button' : 'span'
  return (
    <span className="flex flex-col items-start gap-1 min-w-0 max-w-full">
      <Chip
        {...(onEdit ? { onClick: onEdit, type: 'button' as const, title: `${v.label} — click to read from another primitive` } : {})}
        className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface border text-[11px] font-mono text-fg-muted max-w-full ${
          edited ? 'border-accent-ui' : 'border-line'
        } ${onEdit ? 'hover:border-line-strong hover:text-fg transition-colors cursor-pointer' : ''}`}
      >
        <span className="relative w-3.5 h-3.5 rounded-[3px] flex-shrink-0 overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
          {hasAlpha && <span className="absolute inset-0" style={CHECKER_STYLE} aria-hidden />}
          <span className="absolute inset-0" style={{ background: v.css }} />
        </span>
        {tonal ? (
          <span className="truncate tabular-nums" title={`${v.css} — tone ${tonal[2]} (inverts between themes)`}>
            {'{'}{tonal[1]}.<span className="text-accent-ui font-semibold">{tonal[2]}</span>{'}'}
          </span>
        ) : (
          <span className="truncate tabular-nums" title={v.label}>{v.label}</span>
        )}
      </Chip>
      {fallback && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-elevated/70 border border-line text-[9.5px] font-mono text-fg-faint max-w-full"
          title={`Opaque WCAG fallback (${fallback.css}) — applied when backdrop-filter / vibrancy is unavailable`}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" className="flex-shrink-0 opacity-70" aria-hidden>
            <path d="M6 1l4 1.6v2.9c0 2.6-1.7 4.5-4 5.5-2.3-1-4-2.9-4-5.5V2.6L6 1z" />
          </svg>
          <span className="truncate">fallback {'{'}{fallback.label}{'}'}</span>
        </span>
      )}
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip the trailing "(neutral-900)"-style tone hint — shown via the alias badge now. */
function cleanDescription(description: string): string {
  return description.replace(/\s*\([^)]*\)\s*$/, '').trim()
}


// ── Sub-components ─────────────────────────────────────────────────────────

/** Aliased reference badge — mirrors how Figma shows a variable bound to a primitive. */
function AliasBadge({ scale, tone, color, naming }: { scale: RoleScale; tone: number | null; color: string; naming: ColorNaming }) {
  // The `base` family labels by white/black; the numbered ramps use the active
  // naming scheme (50–950) so the badge matches the exported primitive name.
  const label = scale === 'base'
    ? (tone != null ? baseLabelForTone(tone) : '—')
    : (tone != null ? toneLabel(naming, tone) : '—')
  return (
    <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface border border-line text-[11px] font-mono text-fg-muted max-w-full">
      <span
        className="w-3.5 h-3.5 rounded-[3px] flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10"
        style={{ backgroundColor: color || 'var(--elevated)' }}
      />
      <span className="truncate tabular-nums">
        {SCALE_META[scale].label}<span className="text-fg-faint">-</span>{label}
      </span>
    </span>
  )
}

/** Per-mode scale editor trigger — the shared official sliders icon with the
 *  matrix's active/hover coloring. */
function TuneIcon({ active }: { active: boolean }) {
  return (
    <SlidersIcon
      size={15}
      className={`transition-colors ${active ? 'text-accent-ui' : 'text-fg-faint group-hover:text-fg-muted'}`}
    />
  )
}

// A thin wrapper over the shared ScaleRow (the same compact 12-column grid
// Picker Color's "click to apply" ramps use) rather than a hand-rolled
// flex-wrap grid — the old version wrapped tone 12 onto its own line at the
// modal's width and ran noticeably bigger/looser than every other ramp in
// the app. `baseIndex={0}` suppresses ScaleRow's anchor ring (tone 9,
// primitive-wide) — irrelevant here, this ramp cares about `selectedTone`.
function TonePicker({
  scale, selectedTone, recommendedTone, onChange,
}: {
  scale: Record<number, string>
  selectedTone: number | null
  recommendedTone: number
  onChange: (hex: string) => void
}) {
  return (
    <ScaleRow
      scale={scale}
      baseIndex={0}
      selectedIndex={selectedTone}
      recommendedIndex={recommendedTone}
      onSelect={(_, hex) => onChange(hex)}
      ariaLabel="Pick a tone"
      size="thin"
      showNumbers={false}
    />
  )
}

// One 1–12 axis, shared by every mode's ramp in a Token Details modal instead
// of each ramp printing its own — same technique the Edit-family-color
// popover's Palette section uses for its accent/neutral rows. Grid metrics
// (grid-cols-12 gap-1) must match ScaleRow's exactly or the numbers drift out
// of column with the swatches above them.
function ToneAxisRow() {
  return (
    <div className="grid grid-cols-12 gap-1" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
        <span key={n} className="text-[8px] font-mono tabular-nums leading-none text-center text-fg-faint">
          {n}
        </span>
      ))}
    </div>
  )
}

// ── Matrix row — Name · one value column per theme + filter-icon editor ──────

/** A theme column resolved for one role: the scale it draws from + current value. */
type ThemeCol = {
  key: string
  kind: 'light' | 'dark'
  scale: Record<number, string>
  value: string
  recTone: number
  /** This theme is the one shown in the live preview — its column is tinted. */
  previewed?: boolean
}

/** Eye glyph — open (active = previewed theme) vs. struck-through (inactive). */
function EyeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.9M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

/** Sun (light) / moon (dark) glyph used by the per-theme editor labels. */
function KindIcon({ kind }: { kind: 'light' | 'dark' }) {
  return kind === 'light' ? (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-amber-500"><circle cx="6" cy="6" r="2.4" fill="currentColor"/><path d="M6 1v1.4M6 9.6V11M1 6h1.4M9.6 6H11M2.5 2.5l1 1M8.5 8.5l1 1M9.5 2.5l-1 1M3.5 8.5l-1 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
  ) : (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-indigo-400"><path d="M10 7.2A4.2 4.2 0 1 1 4.8 2a3.3 3.3 0 0 0 5.2 5.2z" fill="currentColor"/></svg>
  )
}

function MatrixRow({
  role,
  index,
  cols,
  modified,
  expanded,
  gridStyle,
  naming,
  onToggle,
}: {
  role: Role
  index: number
  cols: ThemeCol[]
  modified: boolean
  expanded: boolean
  gridStyle: React.CSSProperties
  naming: ColorNaming
  onToggle: () => void
}) {
  const isEven = index % 2 === 1

  return (
    <div className={expanded ? 'bg-blue-50/40 dark:bg-blue-950/10' : isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}>
      <div className="grid items-center border-t border-line/40 group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]" style={gridStyle}>
        {/* Name only — description + copyable var move into the expanded editor
            so each row stays a single, compact line. */}
        <div className="flex items-center gap-3 py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
          <button onClick={onToggle} aria-label={`Edit ${role.label} scale`} className="flex items-center gap-2.5 min-w-0 text-left flex-1">
            {/* Color-token marker — a palette glyph, not a fill: the actual value
                already shows in the Light/Dark columns, so a per-row swatch just
                duplicated it. */}
            <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-fg-muted" aria-hidden>
              <PaletteIcon size={16} />
            </span>
            <code className="font-mono text-[12px] text-fg-muted truncate" title={role.label}>{role.label}</code>
            {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified from recommended" />}
          </button>
        </div>

        {/* One value cell per theme — the previewed theme's column is tinted */}
        {cols.map((col) => {
          const tone = toneIndexOf(col.scale, col.value)
          // A role can draw from a different family in dark mode (content-inverse,
          // border-brand-alt) — badge the family that actually resolved this cell.
          const effScale: RoleScale = col.kind === 'dark' && role.darkScale ? role.darkScale : role.scale
          return (
            <button
              key={col.key}
              onClick={onToggle}
              className={`flex items-center min-w-0 px-3 py-3 text-left border-r border-line ${
                col.previewed ? 'bg-accent-ui/[0.06]' : ''
              }`}
              aria-label={`${col.key} value ${SCALE_META[effScale].label}-${tone ?? '?'}`}
            >
              <AliasBadge scale={effScale} tone={tone} color={col.value} naming={naming} />
            </button>
          )
        })}

        {/* Filter / edit toggle — opens the Token Details modal (see the
            main component's render) rather than expanding inline.
            `sticky right-0` — see the arch table's matching cell for the full
            reasoning (pinned corner, explicit background to occlude scrolled
            mode columns, the tiny accepted double-tint trade-off on striped/
            expanded rows). `isEven`/`expanded` repeat this row's own
            `<div>` wrapper classes for the same reason. */}
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Close Token Details' : 'Edit scale'}
          className={`group flex items-center justify-center h-full py-2.5 text-fg-faint hover:text-fg-muted transition-colors sticky right-0 z-10 border-l border-line ${
            expanded ? 'bg-blue-50/40 dark:bg-blue-950/10' : isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : 'bg-app'
          }`}
        >
          <TuneIcon active={expanded} />
        </button>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step3_SemanticTokens({
  onFocusChange,
  previewTheme,
  onPreviewThemeChange,
  tabBar,
  onOpenAddTheme,
}: {
  /** Color's three-tab bar, passed down (not pre-wrapped) so it renders on the
   *  SAME row as this table's "Tokens" header — exactly how ColorPrimitives
   *  places it next to "Groups". Both tabs sit in one position across tabs. */
  tabBar?: ReactNode
  /** Reports which semantic GROUP is selected so the shell can point the
   *  preview at it. Deliberately NOT the same value as the nav's own category
   *  state: this component owns that internally (flat and non-flat keep
   *  separate selections), and emits a normalized `SemanticFocus` that means
   *  the same thing in every architecture. They used to be one shared piece of
   *  state, which is why the non-flat nav could never move the preview. */
  onFocusChange?: (f: SemanticFocus | 'all') => void
  /** Theme currently rendered in the right-hand preview (eye toggle). */
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** "+ Theme" — opens `AddThemePanel` DOCKED in the right-hand aside
   *  (Configurator owns that boolean and swaps it in for `PreviewPanel`), not
   *  a modal this component renders itself. Every trigger just reports up. */
  onOpenAddTheme: () => void
}) {
  const store = useDesignStore()
  const {
    primaryColor, errorColor, primaryScale, errorScale, warningScale, successScale, infoScale,
    primaryDarkScale, errorDarkScale, warningDarkScale, successDarkScale, infoDarkScale,
    grayLightScale, grayDarkScale, customColors,
    themes, themeOrder, themeKinds, themeSources, colorNaming,
    setThemeToken, removeTheme, setThemeOrder,
    panelBackground, setPanelBackground,
    semanticArchitecture, architectureOverrides,
    setArchitectureOverride,
  } = store

  const reduce = useReducedMotion() ?? false

  // Self-seed any ramp that's still empty (state scales on a system built from
  // Home, which only generates brand + neutral) so the matrix never dead-ends
  // on the "pick an accent first" gate while Home is already showing primitives.
  useEnsureColorScales()

  // `grayDark` is what dark themes resolve their gray roles from. It MUST be
  // passed: the resync effect below rewrites any token that isn't a tone of its
  // source ramp, so omitting it would make every dark gray look stale and snap
  // back to the legacy fixed ramp — wiping the accent-tinted dark scale.
  const scales: GlobalScales = {
    gray:     grayLightScale,
    grayDark: grayDarkScale,
    // Dark twins — a dark theme resolves every family from these.
    dark: {
      gray:    grayDarkScale,
      brand:   primaryDarkScale,
      error:   errorDarkScale,
      warning: warningDarkScale,
      success: successDarkScale,
      info:    infoDarkScale,
    },
    brand:    primaryScale,
    error:    errorScale,
    warning:  warningScale,
    success:  successScale,
    info:     infoScale,
  }

  // Ramp + recommended value resolution shared with the token export
  // (lib/semanticRoles.ts) so the editor and exports never disagree.
  const scaleFor = (theme: string, role: Role, kind: 'light' | 'dark') =>
    sourceScaleFor(role, kind, scales, resolveThemePalette(themeSources[theme], kind, store))

  const themeCols = themeOrder.filter((t) => themes[t])
  // Per-column widths (px) — a view preference, kept local (not a token). Drag a
  // column's right edge to resize. The default fits the longest source name a
  // cell shows (`neutral-900` wants 75px next to its swatch) without truncating;
  // at the old 112 every neutral row read "neutr…".
  const DEFAULT_COL_W = 160
  const MIN_COL_W = 76
  const MAX_COL_W = 260
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const widthOf = (t: string) => colWidths[t] ?? DEFAULT_COL_W
  // The "Token name" column is resizable too. It fills the row by default (null
  // → a 1fr track, the original behavior); once dragged it becomes a fixed width
  // and a trailing flexible spacer absorbs the freed slack so the table still
  // spans the full width.
  const MIN_NAME_W = 150
  const MAX_NAME_W = 520
  const DEFAULT_NAME_W = 288
  const [nameWidth, setNameWidth] = useState<number | null>(null)
  const themeTracks = `${themeCols.map((t) => `${widthOf(t)}px`).join(' ')} 2.75rem`
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: nameWidth == null
      ? `minmax(0,1fr) ${themeTracks}`
      : `${nameWidth}px ${themeTracks} minmax(0,1fr)`,
  }

  // Drag-to-reorder columns (HTML5 DnD). `dragTheme` is the grabbed column;
  // `dropTarget` highlights the column it will land before. A ref mirrors the
  // grabbed column so `onDrop` reads it synchronously, independent of render
  // timing (state may not have flushed between dragstart and drop).
  const [dragTheme, setDragTheme] = useState<string | null>(null)
  const dragThemeRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const reorderColumns = (from: string, to: string) => {
    if (from === to) return
    const next = themeCols.filter((t) => t !== from)
    const at = next.indexOf(to)
    next.splice(at < 0 ? next.length : at, 0, from)
    setThemeOrder(next)
  }

  // Pointer-drag column resize — bound to the right edge of each header cell.
  // `resizingRef` suppresses the parent cell's reorder-drag while resizing.
  const resizingRef = useRef(false)
  const startResize = (
    startW: number,
    onChange: (w: number) => void,
    e: React.PointerEvent,
    min = MIN_COL_W,
    max = MAX_COL_W,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = true
    const startX = e.clientX
    const onMove = (ev: PointerEvent) => {
      onChange(Math.max(min, Math.min(max, startW + (ev.clientX - startX))))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      // Defer clearing so the trailing dragstart (if any) is still suppressed.
      setTimeout(() => { resizingRef.current = false }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const resizeTheme = (t: string, e: React.PointerEvent) =>
    startResize(widthOf(t), (w) => setColWidths((prev) => ({ ...prev, [t]: w })), e)

  // Delete a column, re-pointing the live preview if it was the one shown.
  const deleteTheme = (t: string) => {
    if (Object.keys(themes).length <= 1) return
    if (previewTheme === t) {
      const next = themeCols.find((c) => c !== t)
      if (next) onPreviewThemeChange?.(next)
    }
    removeTheme(t)
  }

  const ready =
    Object.keys(primaryScale).length > 0 &&
    Object.keys(errorScale).length   > 0 &&
    Object.keys(warningScale).length > 0 &&
    Object.keys(successScale).length > 0 &&
    Object.keys(infoScale).length    > 0

  const recHexOf = (theme: string, role: Role, kind: 'light' | 'dark') =>
    recHexFor(role, kind, scaleFor(theme, role, kind))

  const kindOf = (theme: string): 'light' | 'dark' => themeKinds[theme] ?? 'light'

  // Column display name — built-in themes carry the chosen color family's name
  // in front ("Purple light" / "Purple dark") so the matrix reads as *this*
  // system's themes, matching Home's family dropdown. Custom themes keep the
  // name the user gave them; an off-catalogue accent falls back to plain
  // light/dark.
  const themeDisplayName = (t: string): string => {
    if (t !== 'light' && t !== 'dark') return t
    const accent = primaryColor.toLowerCase()
    const family =
      findOption(BRAND_GROUPS, accent)?.label ??
      customColors.find((c) => c.base.toLowerCase() === accent)?.label
    return family ? `${family} ${t}` : t
  }

  const isModified = (role: Role) =>
    themeCols.some((t) => {
      const cur = themes[t]?.[role.key]
      const rec = recHexOf(t, role, kindOf(t))
      return !!cur && !!rec && cur.toLowerCase() !== rec.toLowerCase()
    })

  // UI state — category is controllable; falls back to internal state standalone.
  const [activeCategory, setInternalCategory] = useState<SemanticCategory>('all')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  /** The token table's scroll container — the Token Details dialog's anchor. */
  const tableRef = useRef<HTMLDivElement>(null)

  // Which architecture cell has its primitive picker open (`tokenId:mode`).
  const [archEditing, setArchEditing] = useState<string | null>(null)
  // Theme key pending a delete confirmation — deleteTheme() used to fire
  // straight off the column header's X with no warning, which silently wiped
  // every semantic value mapped to that theme. Shared by both the flat
  // matrix's header and Categorical's (the only two places a column is a
  // real, deletable theme).
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null)

  // ── Architecture-driven view ──────────────────────────────────────────────
  // For a NON-flat architecture the sidebar categories, counts and table rows
  // all derive from the projection itself (buildArchitectureView), so the UI
  // always mirrors the exact schema the export emits. The flat matrix keeps
  // its full editing behavior.
  const isFlat = semanticArchitecture === 'flat'
  // Every theme's ramps, resolved from the families it references. Recomputed
  // whenever a family moves, so the architecture projections track Primitives.
  const resolvedPalettes = useMemo(() => {
    const out: Record<string, NonNullable<ReturnType<typeof resolveThemePalette>>> = {}
    for (const t of Object.keys(themeSources)) {
      const p = resolveThemePalette(themeSources[t], themeKinds[t] ?? 'light', store)
      if (p) out[t] = p
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSources, themeKinds, primaryScale, grayLightScale, grayDarkScale, errorScale, warningScale, successScale, infoScale, customColors])

  const archView = useMemo(
    () =>
      isFlat
        ? null
        : buildArchitectureView(
            semanticArchitecture,
            { themes, themeKinds, themePalettes: resolvedPalettes, scales, accent: primaryColor },
            errorColor,
            architectureOverrides[semanticArchitecture] ?? {},
            // Every theme in the workspace — Categorical resolves one column
            // per entry; Vibrancy/Tonal ignore this (always light/dark, see
            // ArchitectureView.modeKeys). Passing it uniformly means "+ Theme"
            // just works the moment Categorical's math supports it, with no
            // per-architecture branch needed here.
            themeCols,
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [semanticArchitecture, primaryColor, errorColor, primaryScale, grayLightScale, grayDarkScale, errorScale, warningScale, successScale, infoScale, themes, themeKinds, resolvedPalettes, architectureOverrides, themeCols],
  )
  // Sidebar selection for non-flat architectures ('all' + the schema's groups).
  const [archCategory, setArchCategory] = useState<string>('all')

  // Architecture switch resets the view state: first nav option, cleared
  // search/expansion, and the right-hand preview back to the generic overview.
  // Both nav selections reset, so the focus resets unconditionally — it used to
  // fire only for non-flat, which doubled as the thing that PINNED non-flat's
  // focus to 'all' forever (nothing else ever set it).
  useEffect(() => {
    setArchCategory('all')
    setInternalCategory('all')
    setExpandedRole(null)
    setQuery('')
    onFocusChange?.('all')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanticArchitecture])

  function selectCategory(c: SemanticCategory) {
    setInternalCategory(c)
    onFocusChange?.(focusForNavKey(c) ?? 'all')
    setExpandedRole(null)
  }

  function resetRole(role: Role) {
    themeCols.forEach((t) => {
      const hex = recHexOf(t, role, kindOf(t))
      if (hex) setThemeToken(t, role.key, hex)
    })
  }

  // Auto-populate on mount + resync whenever any scale changes. Overwrites only
  // empty OR stale values (a stored hex that no longer maps to any tone in the
  // token's current source scale — e.g. after a gray-flavor change regenerates
  // the gray ramp). Intentional customisations are preserved.
  useEffect(() => {
    if (!ready) return
    ALL_ROLES.forEach((role) => {
      themeCols.forEach((t) => {
        const kind = kindOf(t)
        const src = scaleFor(t, role, kind)
        const cur = themes[t]?.[role.key]
        if (!cur || toneIndexOf(src, cur) === null) {
          const hex = recHexOf(t, role, kind)
          if (hex) setThemeToken(t, role.key, hex)
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, grayLightScale, grayDarkScale, primaryScale, errorScale, warningScale, successScale, infoScale, themeOrder, themeSources])

  const q = query.trim().toLowerCase()

  // Internal category nav (master) → table (detail). "All" shows every role flat.
  const NAV: { key: SemanticCategory; label: string; roles: Role[] }[] = [
    { key: 'all', label: 'All tokens', roles: ALL_ROLES },
    ...ROLE_GROUPS.map((g) => ({ key: g.category as SemanticCategory, label: g.label, roles: g.roles })),
  ]
  const baseRoles = activeCategory === 'all'
    ? ALL_ROLES
    : ROLE_GROUPS.find((g) => g.category === activeCategory)?.roles ?? []
  const visibleRoles = q
    ? baseRoles.filter((r) => r.label.toLowerCase().includes(q) || cleanDescription(r.description).toLowerCase().includes(q))
    : baseRoles

  // Unified nav model — flat reads the role catalogue; other architectures read
  // the projection's own groups, so sidebar + counts mirror the exported schema.
  type NavItem = { key: string; label: string; count: number; description: string; icon: ReactNode; modified: number }
  const navItems: NavItem[] = isFlat
    ? NAV.map((item) => ({
        key: item.key,
        label: item.label,
        count: item.roles.length,
        description: CATEGORY_DESC[item.key],
        icon: CATEGORY_ICON[item.key],
        modified: item.roles.filter(isModified).length,
      }))
    : [
        {
          key: 'all',
          label: 'All tokens',
          count: archView?.total ?? 0,
          description: `Every role in the ${architectureLabel(semanticArchitecture)} schema`,
          icon: CATEGORY_ICON.all,
          modified: 0,
        },
        ...(archView?.categories ?? []).map((c) => ({
          key: c.key,
          label: c.label,
          count: c.tokens.length,
          description: c.description,
          icon: archIconFor(c.key),
          modified: 0,
        })),
      ]
  const activeKey = isFlat ? (activeCategory as string) : archCategory

  function selectNavItem(key: string) {
    if (isFlat) {
      selectCategory(key as SemanticCategory)
    } else {
      setArchCategory(key)
      // Non-flat used to stop here — the shell never heard about the selection,
      // so its focus stayed 'all' and the preview showed the generic overview
      // no matter which group you picked.
      onFocusChange?.(focusForNavKey(key) ?? 'all')
      setExpandedRole(null)
    }
  }

  // Non-flat table rows — straight from the projection, filtered by search.
  // Keys repeat across groups (content.primary vs action.primary), so rows are
  // group-qualified: unique React keys AND unambiguous names in the All view.
  const archTokens = !isFlat && archView
    ? (archCategory === 'all'
        ? archView.categories.flatMap((c) =>
            c.tokens.map((t) => ({ ...t, id: `${c.key}.${t.key}`, name: `${c.key}.${t.key}`, description: c.description })),
          )
        : (() => {
            const cat = archView.categories.find((c) => c.key === archCategory)
            return (cat?.tokens ?? []).map((t) => ({
              ...t, id: `${archCategory}.${t.key}`, name: t.key, description: cat?.description ?? '',
            }))
          })()
      ).filter((t) => !q || t.name.toLowerCase().includes(q))
    : []
  // Name column keeps a real minimum — with flexible value columns it would
  // otherwise collapse to 0 on narrow panes (overflow-auto scrolls). Value
  // track count follows `modeKeys` — 2 for Vibrancy/Tonal (fixed), N for
  // Categorical (one per theme, so "+ Theme" actually grows the table).
  const archModeKeys = archView?.modeKeys ?? ['light', 'dark']
  const archGridStyle: React.CSSProperties = {
    // Last track = the edit toggle, mirroring the flat matrix's trailing column.
    gridTemplateColumns: `minmax(11rem,1.4fr) ${archModeKeys.map(() => 'minmax(8.5rem,1fr)').join(' ')} 2.75rem`,
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-48 text-fg-faint text-sm">
        Pick an accent color in the Color section first to generate the scales.
      </div>
    )
  }

  return (
    // Plain div, no enter animation — see the matching note in
    // ColorPrimitives: the three Color tabs share one chrome, so only the
    // foundation-level swap should animate. (`reduce` is still used by the
    // modals below.)
    <div className="h-full flex flex-col">
      {/* ── Row 1 — "Groups" + the tab bar + search, on ONE line, matching
          ColorPrimitives' own row 1 (same h-[52px], same 198px split). MOVED
          ABOVE the architecture strip (was row 2) — same reorder as
          ColorPrimitives: the nav's own header sits directly above the nav it
          labels, not interleaved with the control strip. `border-line` (full
          strength) since this now sits at the TOP of the chrome, above
          another chrome row rather than above the nav — the strip below picks
          up the lighter `/60` instead, matching whichever row sits directly
          above the nav + table. ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line">
        {/* No "+" here, unlike ColorPrimitives' matching "Groups" cell: adding
            a theme adds a COLUMN, so its trigger lives at the end of the
            column headers (see the tables' trailing header cell) where the new
            column actually appears. Primitives' + adds a row-group, which is
            why it belongs beside the nav label there. */}
        <div className="w-[198px] flex-shrink-0 flex items-center px-4 h-[52px] border-r border-line">
          {/* "Groups", not "Tokens" — the same word ColorPrimitives uses for
              the same nav two rows below. Both list GROUPS (families there,
              semantic categories here); calling it something else on one tab
              made the two rails read as unrelated controls. */}
          <span className="text-[13px] font-semibold text-fg">Groups</span>
        </div>
        {/* Mirrors ColorPrimitives' matching row — items-stretch, no left
            padding (tab tint reaches the edge), pr-3 (12px) on the right so
            the search field keeps clearance instead of sitting flush. */}
        <div className="flex-1 min-w-0 flex items-stretch gap-3 pr-3">
          <div className="flex-1 min-w-0">{tabBar}</div>
          {/* Panel background — Radix-style solid/translucent for raised
              surfaces (cards, panels). Only relevant while viewing Background. */}
          {isFlat && activeCategory === 'background' && (
            <div className="self-center flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-fg-faint">Panel background</span>
              <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-elevated border border-line">
                {(['solid', 'translucent'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setPanelBackground(v)}
                    aria-pressed={panelBackground === v}
                    className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                      panelBackground === v ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg-muted'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="self-center flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-48 max-w-[45%] focus-within:border-line-strong transition-colors flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted placeholder:text-fg-faint outline-none"
              aria-label="Filter tokens"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear filter"
                className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2 — architecture strip. Mirrors ColorPrimitives' quick-edit
          row exactly: a 198px labelled cell holding the control (there a
          family hex field, here the architecture dropdown) against a flex-1
          cell showing what that choice produces (there the ScaleRow, here the
          live WCAG contrast chips). Same 198px + border-r as the rows around
          it, so the left edge reads as one continuous column across all
          three. MOVED BELOW "Groups" (was row 1) — see that row's own note.
          `border-line/60` (the lighter weight) since this now sits between
          "Groups" above and the nav + table below, the same "chrome-to-chrome
          is lighter, chrome-to-content is full-strength" rule the row order
          swap carried over from ColorPrimitives. ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Token architecture</span>
          <ArchitectureSelect />
        </div>
        {/* pr-3 (12px) — mirrors ColorPrimitives' matching row. */}
        <div className="flex-1 min-w-0 flex items-center gap-4 pl-6 lg:pl-8 pr-3 py-5">
          <ArchContrastStrip kind={semanticArchitecture} />
        </div>
      </div>

      {/* ── Row 3 — nav + table, filling the remaining height ── */}
      <div className="flex-1 min-h-0 flex items-stretch">
        {/* Category nav — same 198px/border-r/bg-app as ColorPrimitives' family nav */}
        <nav aria-label="Token categories" className="w-[198px] flex-shrink-0 h-full border-r border-line py-1.5 px-2 flex flex-col gap-0.5 bg-app overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeKey === item.key
            return (
              <div key={item.key} className="relative group">
                <button
                  onClick={() => selectNavItem(item.key)}
                  aria-label={item.label}
                  aria-current={isActive}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-elevated text-accent-ui shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                  }`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-[15px]" aria-hidden>{item.icon}</span>
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{item.label}</span>
                  {item.modified > 0 && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent-ui" aria-hidden />
                  )}
                </button>
                {/* Hover tooltip — the category's description; the label now shows inline */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 w-44 rounded-lg bg-fg text-app text-[11px] leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-40 shadow-lg"
                >
                  {item.description}
                </span>
              </div>
            )
          })}
        </nav>

        {/* Token table — scrolls internally; column header stays pinned.
            `tableRef` is what the Token Details dialog docks against, so it
            opens beside the trailing settings column instead of over the
            values it's editing. */}
        <div ref={tableRef} className="flex-1 min-w-0 overflow-auto">
          {!isFlat && archView ? (
            // ── Architecture table — read-only, schema-faithful: rows and
            // values come straight from the projection the export emits. ──
            <div className="min-w-[28rem]">
              <div
                className="grid items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky top-0 z-10"
                style={archGridStyle}
              >
                <span className="pl-4 py-3 border-r border-line">Token name</span>
                {archModeKeys.map((mode) => {
                  const isPreviewed = previewTheme === mode
                  const label = PER_THEME_ARCHITECTURES.has(semanticArchitecture) ? themeDisplayName(mode) : mode
                  // Only a PER_THEME_ARCHITECTURES entry's columns are real
                  // theme columns (one per `themeOrder` entry, same as the
                  // flat matrix) — Vibrancy/Tonal's 'light'/'dark' are fixed
                  // slots of a global transform with no per-theme concept, so
                  // there's nothing meaningful to delete (matches why
                  // "+ Theme" is hidden for those too, above).
                  const isThemeCol = PER_THEME_ARCHITECTURES.has(semanticArchitecture)
                  const deletable = isThemeCol && themeCols.length > 1
                  return (
                    <span key={mode} className={`flex items-center border-r border-line min-w-0 px-1.5 py-1.5 ${isPreviewed ? 'bg-accent-ui/[0.06]' : ''}`}>
                      {/* Same "whole header is the preview toggle" affordance
                          the flat matrix's columns use — 'light'/'dark' are
                          always valid theme keys, and Categorical's added
                          theme is a real one too, so this just works without
                          new plumbing. No drag-reorder/resize here (unlike
                          flat): the non-flat table is schema-order, not a
                          user-arranged matrix, so reordering columns has no
                          meaning to preserve. */}
                      <button
                        onClick={() => onPreviewThemeChange?.(mode)}
                        aria-label={isPreviewed ? `${label} is shown in preview` : `Preview theme ${label}`}
                        aria-pressed={isPreviewed}
                        title={isPreviewed ? `${label} — shown in preview` : `Show ${label} in the preview`}
                        className={`flex items-center gap-1.5 flex-1 min-w-0 px-1.5 py-1.5 rounded-md transition-colors ${
                          isPreviewed ? 'text-accent-ui' : 'text-fg-faint hover:text-fg-muted hover:bg-elevated/50'
                        }`}
                      >
                        <EyeIcon active={isPreviewed} />
                        <span className="truncate">{label}</span>
                      </button>
                      {deletable && (
                        <button
                          onClick={() => setThemeToDelete(mode)}
                          aria-label={`Remove theme ${label}`}
                          title={`Remove theme ${label}`}
                          className="text-fg-faint hover:text-red-500 transition-colors flex-shrink-0 px-1"
                        >
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8"/></svg>
                        </button>
                      )}
                    </span>
                  )
                })}
                {/* Trailing header cell = "add another mode". It sits at the
                    END of the theme columns because that's where the new
                    column lands — the affordance points at its own result.
                    Hidden for Vibrancy/Tonal, whose light/dark are a fixed
                    binary transform with no per-theme concept (same rule the
                    per-column delete follows). Falls back to the decorative
                    tune glyph so the column keeps its width either way.
                    `sticky right-0` on top of the header's own `sticky top-0`
                    — a corner cell doubly pinned, so it survives BOTH scroll
                    axes. Reported as: adding a mode (a real, common action —
                    every "+ Theme" click grows this row) must never push this
                    control out of reach behind a horizontal scroll; extra
                    modes should make the MIDDLE of the table scroll, not
                    shove this column away. `bg-app` keeps scrolled mode
                    columns from showing through underneath it; `border-l`
                    gives the pinned edge a boundary that doesn't depend on
                    which column happens to be scrolled under it. */}
                <span className="flex items-center justify-center py-1.5 sticky right-0 z-10 bg-app border-l border-line">
                  {(isFlat || PER_THEME_ARCHITECTURES.has(semanticArchitecture)) ? (
                    <button
                      onClick={onOpenAddTheme}
                      aria-label="Add a theme"
                      title="Add a theme — its roles resolve through the primary colors"
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-line text-fg-faint hover:text-fg hover:border-line-strong hover:bg-elevated transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8"/></svg>
                    </button>
                  ) : (
                    <TuneIcon active={false} />
                  )}
                </span>
              </div>
              {archTokens.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">
                  No tokens match “{query}”.
                </div>
              ) : (
                archTokens.map((t, idx) => {
                  const isOpen = archEditing === t.id
                  // Raw CSS (vibrancy alphas, blur) has no primitive to swap,
                  // so those rows stay display-only.
                  const editable = archModeKeys.some((m) => parseRef(t.modes[m]?.label ?? ''))
                  return (
                  <div key={t.id} className={isOpen ? 'bg-blue-50/40 dark:bg-blue-950/10' : idx % 2 === 1 ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}>
                    <div
                      className="grid items-center border-t border-line/40 transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"
                      style={archGridStyle}
                    >
                      <div className="flex items-center gap-2.5 py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                        <button
                          onClick={() => editable && setArchEditing(isOpen ? null : t.id)}
                          className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                          aria-label={`Edit ${t.name} scale`}
                        >
                          <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-fg-muted" aria-hidden>
                            <PaletteIcon size={16} />
                          </span>
                          <code className="font-mono text-[12px] text-fg-muted truncate" title={t.name}>{t.name}</code>
                          {archModeKeys.some((m) => t.edited?.[m]) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified from the schema" />
                          )}
                        </button>
                      </div>
                      {archModeKeys.map((mode) => (
                        <button
                          key={mode}
                          onClick={() => editable && setArchEditing(isOpen ? null : t.id)}
                          // Border-r on EVERY mode column, including the last —
                          // the header above already puts one after every mode
                          // (unconditionally, see its `archModeKeys.map`), so
                          // skipping it here for the final column left rows with
                          // no divider before the trailing edit-icon cell while
                          // the header still showed one. Same fix as the
                          // Primitives table, which never had this gap.
                          className="flex items-center min-w-0 px-3 py-3 text-left border-r border-line"
                        >
                          <TokenCell
                            v={t.modes[mode]}
                            kind={semanticArchitecture}
                            fallback={t.fallback?.[mode]}
                            edited={Boolean(t.edited?.[mode])}
                          />
                        </button>
                      ))}
                      {/* Filter / edit toggle — opens the Token Details modal,
                          same as the flat matrix (see the main component's render).
                          `sticky right-0`, matching the header's corner cell — this
                          is the per-row half of the same pin (see that cell's own
                          comment). The background REPEATS the row wrapper's own
                          `isOpen`/zebra classes rather than inheriting them: a
                          sticky element paints its own layer on top of whatever's
                          already there, so without an explicit, matching fill here
                          the mode columns scrolling underneath would show through
                          this one cell as they pass. (Known, accepted residual:
                          since the row wrapper ALSO paints that same translucent
                          tint underneath, the two composite to a hair darker right
                          under this column specifically — 0.018 → ~0.036 opacity —
                          imperceptible at this size, and the alternative (an
                          untinted sticky cell cutting a flat notch through every
                          striped row) reads as an actual rendering glitch, which
                          this doesn't.) */}
                      <button
                        onClick={() => editable && setArchEditing(isOpen ? null : t.id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Close Token Details' : 'Edit scale'}
                        disabled={!editable}
                        className={`group flex items-center justify-center h-full py-2.5 text-fg-faint hover:text-fg-muted disabled:opacity-30 transition-colors sticky right-0 z-10 border-l border-line ${
                          isOpen ? 'bg-blue-50/40 dark:bg-blue-950/10' : idx % 2 === 1 ? 'bg-black/[0.018] dark:bg-white/[0.02]' : 'bg-app'
                        }`}
                      >
                        <TuneIcon active={isOpen} />
                      </button>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          ) : (
          <div className="min-w-[26rem]">
            {/* Column header — one column per theme; custom themes are removable */}
            <div className="grid items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky top-0 z-10" style={gridStyle}>
              <span className="group relative pl-4 py-3 border-r border-line">
                Token name
                <span
                  onPointerDown={(e) => {
                    // Seed from the column's current rendered width so switching
                    // from the 1fr default to a fixed width doesn't jump.
                    const startW = (e.currentTarget as HTMLElement).parentElement?.offsetWidth ?? nameWidth ?? DEFAULT_NAME_W
                    startResize(startW, setNameWidth, e, MIN_NAME_W, MAX_NAME_W)
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  draggable={false}
                  role="separator"
                  aria-label="Resize Token name column"
                  title="Drag to resize column"
                  className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-accent-ui/40 transition-opacity"
                />
              </span>
              {themeCols.map((t) => {
                const isPreviewed = previewTheme === t
                const displayName = themeDisplayName(t)
                const canDelete = themeCols.length > 1
                return (
                  <span
                    key={t}
                    draggable
                    onDragStart={(e) => {
                      if (resizingRef.current) { e.preventDefault(); return }
                      dragThemeRef.current = t; setDragTheme(t); e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => { e.preventDefault(); if (dragThemeRef.current && dragThemeRef.current !== t) setDropTarget(t) }}
                    onDragLeave={() => setDropTarget((cur) => (cur === t ? null : cur))}
                    onDrop={(e) => { e.preventDefault(); if (dragThemeRef.current) reorderColumns(dragThemeRef.current, t); dragThemeRef.current = null; setDragTheme(null); setDropTarget(null) }}
                    onDragEnd={() => { dragThemeRef.current = null; setDragTheme(null); setDropTarget(null) }}
                    className={`group relative flex items-center gap-1 px-1.5 py-2 border-r border-line min-w-0 cursor-grab active:cursor-grabbing transition-colors ${
                      isPreviewed ? 'bg-accent-ui/[0.06]' : ''
                    } ${dragTheme === t ? 'opacity-40' : ''}`}
                  >
                    {dropTarget === t && (
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-accent-ui z-20" aria-hidden />
                    )}
                    {/* Whole name is the toggle — the active theme reads as a
                        highlighted pill (same language as the category rail). */}
                    <button
                      onClick={() => onPreviewThemeChange?.(t)}
                      aria-label={isPreviewed ? `${displayName} is shown in preview` : `Preview theme ${displayName}`}
                      aria-pressed={isPreviewed}
                      title={isPreviewed ? `${displayName} — shown in preview` : `Show ${displayName} in the preview`}
                      className={`flex items-center gap-1.5 flex-1 min-w-0 px-1.5 py-1 rounded-md transition-colors ${
                        isPreviewed
                          ? 'text-accent-ui'
                          : 'text-fg-faint hover:text-fg-muted hover:bg-elevated/50'
                      }`}
                    >
                      <EyeIcon active={isPreviewed} />
                      <span className="truncate">{displayName}</span>
                    </button>
                    {/* No per-theme colour editing here, by design: a theme is a
                        READING of the primitives, never a place to set colour.
                        Editing a theme's accent in isolation would fork it from
                        the primary it resolves through — the Figma model, where
                        modes reference variables instead of holding their own
                        values. Colour is edited in Primary Color; this table
                        only maps roles to it. */}
                    {canDelete && (
                      <button
                        onClick={() => setThemeToDelete(t)}
                        aria-label={`Remove theme ${displayName}`}
                        title={`Remove theme ${displayName}`}
                        className="text-fg-faint hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8"/></svg>
                      </button>
                    )}
                    {/* Right-edge resize grip — drag to set this column's width. */}
                    <span
                      onPointerDown={(e) => resizeTheme(t, e)}
                      onDragStart={(e) => e.preventDefault()}
                      draggable={false}
                      role="separator"
                      aria-label={`Resize ${displayName} column`}
                      title="Drag to resize column"
                      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-accent-ui/40 transition-opacity"
                    />
                  </span>
                )
              })}
              {/* Trailing header cell = "add another mode" — see the arch
                  table's matching cell above. Flat always resolves an extra
                  theme as a real column, so it's always live here.
                  `sticky right-0` — same pinned-corner treatment as the arch
                  table's matching cell; see that one's comment for why. Flat
                  is if anything the MORE likely table to grow past the
                  viewport, since it's the one with the full 89-role matrix
                  and no architecture curating it down. */}
              <span className="flex items-center justify-center py-1.5 sticky right-0 z-10 bg-app border-l border-line">
                <button
                  onClick={onOpenAddTheme}
                  aria-label="Add a theme"
                  title="Add a theme — its roles resolve through the primary colors"
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-line text-fg-faint hover:text-fg hover:border-line-strong hover:bg-elevated transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8"/></svg>
                </button>
              </span>
            </div>

            {visibleRoles.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-fg-faint">
                No tokens match “{query}”.
              </div>
            ) : (
              visibleRoles.map((role, idx) => (
                <MatrixRow
                  key={role.key}
                  role={role}
                  index={idx}
                  cols={themeCols.map((t) => {
                    const kind = kindOf(t)
                    return {
                      key: t,
                      kind,
                      scale: scaleFor(t, role, kind),
                      value: themes[t]?.[role.key] ?? '',
                      recTone: recToneFor(role, kind, scaleFor(t, role, kind)),
                      previewed: previewTheme === t,
                    }
                  })}
                  modified={isModified(role)}
                  expanded={expandedRole === role.key}
                  gridStyle={gridStyle}
                  naming={colorNaming}
                  onToggle={() => setExpandedRole((cur) => (cur === role.key ? null : role.key))}
                />
              ))
            )}
          </div>
          )}
        </div>
      </div>

      {/* Token Details — one instance per architecture kind, since flat and
          non-flat track separate "which row is open" state (expandedRole vs
          archEditing) and read from different data shapes (Role/ThemeCol vs
          the projected ArchToken). Only one can ever be non-null at a time —
          switching architecture clears both. */}
      <AnimatePresence>
        {isFlat && expandedRole && (() => {
          const role = ALL_ROLES.find((r) => r.key === expandedRole)
          if (!role) return null
          const cols: ThemeCol[] = themeCols.map((t) => {
            const kind = kindOf(t)
            return {
              key: t,
              kind,
              scale: scaleFor(t, role, kind),
              value: themes[t]?.[role.key] ?? '',
              recTone: recToneFor(role, kind, scaleFor(t, role, kind)),
              previewed: previewTheme === t,
            }
          })
          return (
            <TokenDetailsModal
              key="flat-token-details"
              name={role.label}
              cssVarName={role.key}
              description={cleanDescription(role.description)}
              onReset={() => resetRole(role)}
              resetDisabled={!isModified(role)}
              onClose={() => setExpandedRole(null)}
              reduce={reduce}
              anchorRef={tableRef}
              initialOpenKey={previewTheme}
              sections={cols.map((col) => ({
                key: col.key,
                label: col.key,
                kind: col.kind,
                content: (
                  <div className="flex flex-col gap-2">
                    <TonePicker
                      scale={col.scale}
                      selectedTone={toneIndexOf(col.scale, col.value)}
                      recommendedTone={col.recTone}
                      onChange={(hex) => setThemeToken(col.key, role.key, hex)}
                    />
                    {/* Per-section now, not once at the bottom: with the modes
                        collapsible, a single trailing axis would belong to
                        whichever section happened to still be open. */}
                    <ToneAxisRow />
                  </div>
                ),
              }))}
            />
          )
        })()}

        {!isFlat && archEditing && (() => {
          const t = archTokens.find((x) => x.id === archEditing)
          if (!t) return null
          return (
            <TokenDetailsModal
              key="arch-token-details"
              name={t.name}
              cssVarName={t.name.replace(/\./g, '-')}
              description={t.description}
              onReset={() => {
                for (const mode of archModeKeys) setArchitectureOverride(semanticArchitecture, t.id, mode, null)
              }}
              resetDisabled={!archModeKeys.some((m) => t.edited?.[m])}
              onClose={() => setArchEditing(null)}
              reduce={reduce}
              anchorRef={tableRef}
              initialOpenKey={previewTheme}
              // No ToneAxisRow in these sections: SystemRampGrid prints its own
              // 1–12 axis under each mode's ramps, and a bare grid-cols-12 row
              // would sit misaligned anyway — it lacks the grid's leading
              // family-label column. The flat modal above still uses it, since
              // TonePicker has no axis of its own.
              sections={archModeKeys
                .filter((mode) => parseRef(t.modes[mode]?.label ?? ''))
                .map((mode) => ({
                  key: mode,
                  label: PER_THEME_ARCHITECTURES.has(semanticArchitecture) ? themeDisplayName(mode) : mode,
                  kind: kindOf(mode),
                  content: (
                    <ArchModeEditor
                      value={t.modes[mode]}
                      scales={scales}
                      palette={resolvedPalettes[mode]}
                      kind={kindOf(mode)}
                      label={PER_THEME_ARCHITECTURES.has(semanticArchitecture) ? themeDisplayName(mode) : mode}
                      onPick={(refStr) => setArchitectureOverride(semanticArchitecture, t.id, mode, refStr)}
                    />
                  ),
                }))}
            />
          )
        })()}

        {themeToDelete && (
          <DeleteThemeModal
            key="delete-theme"
            name={themeDisplayName(themeToDelete)}
            isPreviewed={previewTheme === themeToDelete}
            onCancel={() => setThemeToDelete(null)}
            onConfirm={() => { deleteTheme(themeToDelete); setThemeToDelete(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
