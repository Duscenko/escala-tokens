import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { tableRowClass } from './tableChrome'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, type ThemePalette } from '../../store/useDesignStore'
import {
  architectureLabel, buildArchitectureView, scaleLookup, CATEGORICAL_ROLE_COMMENTS,
  type ArchTokenValue, type SemanticArchitecture,
} from '../../lib/semanticArchitectures'
import {
  SCALE_META, ROLE_GROUPS, ALL_ROLES, BRAND_TOKEN_TONES, baseLabelForTone,
  toneIndexOf, sourceScaleFor, recToneFor, recHexFor,
  type Role, type RoleScale, type GlobalScales,
} from '../../lib/semanticRoles'
import { toneLabel, type ColorNaming } from '../../lib/colorUtils'
import { resolveThemePalette } from '../../lib/themeSources'
import { useEnsureColorScales } from '../../lib/colorActions'
import {
  BRAND_GROUPS, findOption, ScaleRow, SystemRampGrid, TokenDetailsModal, DeleteThemeModal,
} from './colorControls'
import { SlidersIcon, PaletteIcon } from '../ui/icons'
import ThemePanel from './ThemePanel'
import { usePreviewTokens } from '../../lib/previewTokens'
import { SEMANTIC_SPECIMENS } from '../preview/atoms/SemanticSpecimens'
import {
  appearanceFromModeKey, appearanceOrder, semanticModesFor, themeModeKey,
  type ThemeAppearance,
} from '../../lib/themeModes'
import VariablesPreviewPane from './VariablesPreviewPane'
import VariableCollectionRail from './VariableCollectionRail'

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
    // `icon.*` is its own hierarchy parallel to `text.*` (icons read lighter
    // than type at the same tone), so it gets its own specimen rather than
    // folding into 'content' — which would show the text preview and no
    // glyphs at all for an icon group.
    case 'icon': return 'icon'
    default: return null
  }
}

const COLOR_FLASH = 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35'

function flatCategoryForRole(key: string): SemanticCategory | null {
  const group = ROLE_GROUPS.find((g) => g.roles.some((r) => r.key === key))
  return (group?.category as SemanticCategory | undefined) ?? null
}

function archNavForToken(
  id: string,
  categories: { key: string; tokens: { key: string }[] }[],
): string | null {
  for (const c of categories) {
    if (c.tokens.some((t) => `${c.key}.${t.key}` === id)) return c.key
  }
  const prefix = categories.filter((c) => id === c.key || id.startsWith(`${c.key}.`))
  prefix.sort((a, b) => b.key.length - a.key.length)
  return prefix[0]?.key ?? null
}

// Architectures whose refs resolve PER-THEME (one column per `themeOrder`
// entry, same as the flat matrix) — so "+ Theme", real theme-name labels and
// deletable columns all apply. Vibrancy/Tonal stay excluded: their light/dark
// are a fixed binary transform of the global primitives with no per-theme
// concept (see ArchitectureView.modeKeys' doc comment in semanticArchitectures.ts).

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
  // type mark so an Icon group and a Content group don't read as the same thing.
  icon:    catIc('M12 3l2.6 6.2 6.4.5-4.9 4.2 1.5 6.1L12 16.8 6.4 20l1.5-6.1L3 9.7l6.4-.5L12 3z'),
  surface: CATEGORY_ICON.background,
  border:  CATEGORY_ICON.border,
  action:  catIc('M3 3l7.5 18 2.6-7.9L21 10.5 3 3z', true),
  status:  catIc('M3 12h4l2.5-7 4 14L16 12h5'),
}
// A nav row's glyph comes from the SAME mapping the preview focus does, so the
// icon can never imply a different grouping than the specimen it opens.
export const archIconFor = (key: string): ReactNode => {
  const focus = focusForNavKey(key)
  return focus ? FOCUS_ICON[focus] : CATEGORY_ICON.all
}

// Checkerboard under alpha swatches so transparency reads visually (vibrancy).
export const CHECKER_STYLE: React.CSSProperties = {
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
// The alpha twins, listed AFTER the solids in the architecture picker so any
// role can be re-pointed at a translucent primitive (16 Categorical roles
// already are — `action.ghost.*`, `surface.overlay`, `border.ring.*`, the
// `status.*.surface` tints — and a hand override can move any other one there
// too). Shown unconditionally: an earlier build gated them on "is the current
// ref alpha", which meant a solid role could never be switched to alpha.
const ALPHA_FAMILIES = ['accent-a', 'neutral-a', 'error-a', 'warning-a', 'success-a', 'info-a', 'black-a', 'white-a'] as const
const ARCH_PICKABLE_FAMILIES = [...PICKABLE_FAMILIES, ...ALPHA_FAMILIES] as const

// Built through `scaleLookup` — the SAME resolver the architecture table and
// the export use — so the swatch you click is the colour that mode will
// actually render. It used to read `scales.brand`/`scales.error`/… directly,
// i.e. the LIGHT ramps for every mode: a dark theme's picker showed light
// tints, and picking one silently stored a ref that resolves to a completely
// different (dark-twin) colour. Every mode showed an identical grid, which is
// what made the bug invisible.
//
// `pageBackground`/`darkBackground` are REQUIRED for the alpha twins to
// resolve (`{accent-a.N}` is composited on demand against the page); omitting
// them is why the alpha rows rendered empty. `black-a`/`white-a` are constants
// and resolve regardless.
function rampsOf(
  scales: GlobalScales,
  palette?: ThemePalette,
  kind: 'light' | 'dark' = 'light',
  pageBackground?: string,
  darkBackground?: string,
): Record<string, Record<number, string> | undefined> {
  const look = scaleLookup(scales, palette, kind, pageBackground, darkBackground)
  const build = (fam: string) => {
    const out: Record<number, string> = {}
    for (let tone = 1; tone <= 12; tone++) {
      const hex = look(fam, tone)
      if (hex) out[tone] = hex
    }
    return Object.keys(out).length ? out : undefined
  }
  return Object.fromEntries(ARCH_PICKABLE_FAMILIES.map((fam) => [fam, build(fam)]))
}

/** `neutral.12` → ['neutral', 12]; null for raw CSS (vibrancy alphas, blur). */
export function parseRef(label: string): [string, number] | null {
  const m = /^([a-z-]+)\.(\d+)$/.exec(label)
  return m ? [m[1], Number(m[2])] : null
}

// The mode's name + light/dark glyph used to live here; it's the collapsible
// section header now (see TokenDetailsModal's `sections`), so this renders the
// grid alone rather than printing a second label inside its own card.
export function ArchModeEditor({
  label, value, scales, palette, kind, pageBackground, darkBackground, onPick, onOpenFamily,
}: {
  /** That mode's own palette + polarity — the grid MUST resolve through these
   *  (see `rampsOf`), or a dark mode offers light swatches. */
  palette?: ThemePalette
  kind: 'light' | 'dark'
  /** Required for the alpha twins to resolve — see `rampsOf`. */
  pageBackground?: string
  darkBackground?: string
  /** Display text — the theme's name (accent-prefixed for a custom theme) or
   *  the plain 'light'/'dark' word for Vibrancy/Tonal. Used for the grid's
   *  accessible name; the visible label is the section header's. */
  label: string
  value: ArchTokenValue
  scales: GlobalScales
  onPick: (ref: string) => void
  /** Jump to a family's ramp in Color · Primitives — you pick a tone here,
   *  but the ramp itself is edited there. Takes the family vocabulary name
   *  (`accent`, `neutral`, `error`…); the table resolves it against the
   *  previewed theme's own families. */
  onOpenFamily?: (family: string) => void
}) {
  const parsed = parseRef(value.label)
  const ramps = rampsOf(scales, palette, kind, pageBackground, darkBackground)
  const family = parsed?.[0] ?? 'accent'
  const tone = parsed?.[1] ?? null

  // `neutral` and `neutral-dark` are the only two families that mean the same
  // ROLE at opposite polarities — a role's light ref is `{neutral.N}`, its dark
  // ref `{neutral-dark.N}`. When a theme PALETTE is in play `scaleLookup`
  // resolves both to that palette's single gray ramp, so the grid showed two
  // byte-identical rows. Each mode card only ever writes its own polarity, so
  // drop the other neutral here (kept only if it's somehow the current ref, so
  // an existing selection still rings).
  const pickableFamilies = ARCH_PICKABLE_FAMILIES.filter((key) => {
    const drop = kind === 'dark' ? 'neutral' : 'neutral-dark'
    return key !== drop || key === family
  })

  return (
    <div className="flex flex-col gap-2">
      {/* Every family, every tone, in one grid — picking a cell writes
          `{family.tone}` directly. This replaced a chip row ("which family?")
          stacked over a single ScaleRow ("which tone?"): that split one choice
          into two clicks and hid all the other families behind the active
          chip, so you couldn't compare candidates while choosing. Same widget
          the colour picker used to carry as its "Palette" block. */}
      <SystemRampGrid
        ramps={pickableFamilies.map((key) => ({ key, scale: ramps[key] }))}
        selected={tone != null ? { family, tone } : null}
        onPick={(fam, t) => onPick(`{${fam}.${t}}`)}
        ariaLabel={`Pick a token for ${label}`}
        onOpenFamily={onOpenFamily}
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
  const Chip = onEdit ? 'button' : 'span'
  return (
    <span className="flex flex-col items-start gap-1 min-w-0 max-w-full">
      <Chip
        {...(onEdit ? { onClick: onEdit, type: 'button' as const, title: `${v.label} — click to read from another primitive` } : {})}
        className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface border text-caption font-mono text-fg-muted max-w-full ${
          edited ? 'border-accent-ui' : 'border-line'
        } ${onEdit ? 'hover:border-line-strong hover:text-fg transition-colors cursor-pointer' : ''}`}
      >
        <span className="relative w-3.5 h-3.5 rounded-[3px] flex-shrink-0 overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
          {hasAlpha && <span className="absolute inset-0" style={CHECKER_STYLE} aria-hidden />}
          <span className="absolute inset-0" style={{ background: v.css }} />
        </span>
        <span className="truncate tabular-nums" title={v.label}>{v.label}</span>
      </Chip>
      {fallback && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-elevated/70 border border-line text-micro font-mono text-fg-faint max-w-full"
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

/** Per-ROLE guidance for a Categorical token, from `CATEGORICAL_ROLE_COMMENTS`
 *  (keyed `group.key`), falling back to the category blurb when a role somehow
 *  has none. The `[ROLE: Xyz]` prefix is an AI-bundle convention — drop it for
 *  the human-facing Token Details dialog, keeping the "Affects … / …" sentence. */
function archRoleDescription(id: string, categoryFallback: string): string {
  const raw = CATEGORICAL_ROLE_COMMENTS[id]
  if (!raw) return categoryFallback
  return raw.replace(/^\[ROLE:[^\]]*\]\s*/, '').trim()
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
    <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface border border-line text-caption font-mono text-fg-muted max-w-full">
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
      className={`relative z-[1] transition-colors ${active ? 'text-accent-ui' : 'text-fg-muted group-hover:text-fg'}`}
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
        <span key={n} className="text-nano font-mono tabular-nums leading-none text-center text-fg-faint">
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

function MatrixRow({
  role,
  index,
  cols,
  modified,
  expanded,
  flash,
  gridStyle,
  naming,
  onToggle,
}: {
  role: Role
  index: number
  cols: ThemeCol[]
  modified: boolean
  expanded: boolean
  flash?: boolean
  gridStyle: React.CSSProperties
  naming: ColorNaming
  /** `colKey` set = a specific appearance column's cell was clicked, so Token
   *  Details should open on THAT section; omitted (name / tune button) means
   *  "open on whatever's previewed". */
  onToggle: (colKey?: string) => void
}) {
  const isEven = index % 2 === 1

  return (
    <div
      id={`color-role-${role.key}`}
      className={flash ? COLOR_FLASH : expanded ? 'bg-blue-50/40 dark:bg-blue-950/10' : isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}
    >
      <div className={tableRowClass(index, 'grid', { zebra: false })} style={gridStyle}>
        {/* Name only — description + copyable var move into the expanded editor
            so each row stays a single, compact line.
            `sticky left-0` — the mirror of the trailing settings column's own
            pin. A theme column is added by a single click and the matrix has
            no width budget for many of them, so without this the FIRST thing
            to scroll out of reach is the one column that says which row you're
            reading.
            It paints an OPAQUE `bg-app` (a sticky element gets its own layer,
            so an unpainted one would let the value columns show through as
            they pass underneath) and then RE-PAINTS this row's zebra/expanded
            tint and its hover tint as two absolute overlays. That's the same
            two-layer stack the row already builds (wrapper paints the stripe,
            grid paints hover) reproduced on top of the opaque base — which is
            why this cell, unlike the trailing one, neither double-tints on
            striped rows nor goes dead on hover. `sticky` is itself a
            positioned value, so the overlays anchor to this cell without
            needing `relative`. */}
        <div className="flex items-center gap-2 py-2 pl-3 pr-2 min-w-0 border-r border-line sticky left-0 z-10 bg-app">
          <span
            aria-hidden
            className={`absolute inset-0 pointer-events-none ${
              flash ? 'bg-accent-ui/[0.12]' : expanded ? 'bg-blue-50/40 dark:bg-blue-950/10' : isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
            }`}
          />
          <span aria-hidden className="absolute inset-0 pointer-events-none group-hover:bg-black/[0.025] dark:group-hover:bg-white/[0.04]" />
          {/* `relative` so the label paints ABOVE the two tint overlays —
              absolutely-positioned siblings otherwise sit on top of in-flow
              content, and the expanded state's 40%-opacity blue would visibly
              wash the token name. */}
          <button onClick={() => onToggle()} aria-label={`Edit ${role.label} scale`} className="relative flex items-center gap-2 min-w-0 text-left flex-1">
            {/* Color-token marker — a palette glyph, not a fill: the actual value
                already shows in the Light/Dark columns, so a per-row swatch just
                duplicated it. */}
            <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-fg-muted" aria-hidden>
              <PaletteIcon size={16} />
            </span>
            <code className="font-mono text-body text-fg-muted truncate" title={role.label}>{role.label}</code>
            {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified from recommended" />}
          </button>
        </div>

        {/* One value cell per theme — the previewed theme's column is tinted */}
        {cols.map((col, i) => {
          const tone = toneIndexOf(col.scale, col.value)
          // A role can draw from a different family in dark mode (content-inverse,
          // border-brand-alt) — badge the family that actually resolved this cell.
          const effScale: RoleScale = col.kind === 'dark' && role.darkScale ? role.darkScale : role.scale
          return (
            <button
              key={col.key}
              onClick={() => onToggle(col.key)}
              className={`flex items-center min-w-0 px-2 py-2.5 text-left ${i < cols.length - 1 ? 'border-r border-line' : ''} ${
                col.previewed ? 'bg-accent-ui/[0.06]' : ''
              }`}
              aria-label={`${col.key} value ${SCALE_META[effScale].label}-${tone ?? '?'}`}
            >
              <AliasBadge scale={effScale} tone={tone} color={col.value} naming={naming} />
            </button>
          )
        })}

        {/* Filter / edit toggle — opens Token Details. Glass plate is on
            `STICKY_TRAIL` so the icon stays readable over scrolling modes. */}
        <button
          onClick={() => onToggle()}
          aria-expanded={expanded}
          aria-label={expanded ? 'Close Token Details' : 'Edit scale'}
          className={`group flex items-center justify-center h-full py-2.5 text-fg-muted hover:text-fg transition-colors ${STICKY_TRAIL} ${
            flash ? 'bg-accent-ui/20' : expanded ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
          }`}
        >
          <TuneIcon active={expanded} />
        </button>
      </div>
    </div>
  )
}

/** Floor for the pinned "Token name" track, shared by the flat matrix and the
 *  architecture table so the two can't drift. 11rem = 198px at this app's 18px
 *  root — the SAME 198px `ColorPrimitives`' family nav and this section's own
 *  "Token architecture" / category-nav cells use, so the table's left edge
 *  lands on the one column line every row above it already shares. */
const NAME_MIN_TRACK = '10rem'
/** Trailing tune / add-theme track — keep overlay width in lockstep. */
const TRAIL_TRACK = '2.75rem'

/** Pinned trailing cells. The plate is the readability layer — a sibling
 *  overlay sat on top of the icons and washed them out. `backdrop-blur-xl`
 *  plus `bg-app/80` keeps the rail glassy without letting swatches collide
 *  with the sliders. The fade dissolves the mode column into that plate. */
const STICKY_TRAIL =
  'relative sticky right-0 z-10 border-l border-line bg-app/90 backdrop-blur-xl supports-[backdrop-filter]:bg-app/80 before:pointer-events-none before:absolute before:inset-y-0 before:right-full before:w-10 before:bg-gradient-to-r before:from-transparent before:to-app/90'

const MAX_DOTS = 6
const MIN_OVERFLOW = 52

/**
 * Horizontal-scroll position indicator for the token table — a row of dots
 * floating at the bottom of the table column, carousel-style.
 *
 * It exists because the theme columns are the ONE axis of this table that grows
 * without bound: every "+ Theme" adds a full column, and past three or four the
 * matrix scrolls sideways with nothing on screen saying so. A vertical
 * scrollbar is implied by the rows running off the bottom; a horizontal one on
 * a table whose left column is now PINNED is not — the pinned names make the
 * table look complete at any scroll offset, which is exactly what makes the
 * hidden columns easy to miss. The dots are the cue that replaces the
 * scrollbar the sticky column visually took away.
 *
 * Rules it keeps:
 *  · **It renders NOTHING when everything fits.** An indicator that's always
 *    there stops meaning "there's more" — at two themes on a normal window
 *    there is no more, and the row is silent.
 *  · **Dots are PROGRESS positions, not pages of content.** `active` is the
 *    scroll offset mapped over the full scrollable range, so the last dot
 *    genuinely lights at the end — a literal `scrollLeft / clientWidth` page
 *    index can never reach its own last page when the final page is partial
 *    (a 1.2-viewport-wide table has a max offset of 0.2 viewports, which
 *    rounds to page 0 forever).
 *  · **Capped at MAX_DOTS.** Ten themes should not produce ten dots; past the
 *    cap it degrades into a segmented progress bar, which still answers
 *    "how much further is there" without becoming its own dense control.
 *  · **The visible dot is 5px; the BUTTON around it is 20px.** Same rule the
 *    preview Slider's track follows — claim the target with padding, not by
 *    drawing something fatter.
 */
function ScrollPager({
  scrollRef,
  watch,
  reduce,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Re-measure when this changes. A ResizeObserver can't cover it: adding a
   *  theme overflows the GRID TRACKS inside a block child whose own box width
   *  never changes, so neither the scroll container nor its child resizes —
   *  only `scrollWidth` moves, and nothing observes that. */
  watch: string
  reduce: boolean
}) {
  const [dots, setDots] = useState(0)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth
      // A sliver of overflow is not "there's more content" — sub-pixel track
      // rounding alone lands around 18px here, and summoning an indicator for
      // that trains people to ignore it. MIN_OVERFLOW is roughly a third of the
      // narrowest value column (8.5rem), i.e. the point where something real is
      // actually hidden.
      if (max < MIN_OVERFLOW || el.clientWidth === 0) { setDots(0); setActive(0); return }
      const n = Math.min(MAX_DOTS, Math.max(2, Math.ceil(el.scrollWidth / el.clientWidth)))
      setDots(n)
      setActive(Math.round((el.scrollLeft / max) * (n - 1)))
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', measure); ro.disconnect() }
  }, [scrollRef, watch])

  if (dots === 0) return null

  return (
    <div
      role="group"
      aria-label="Table scroll position"
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2"
    >
      {/* The pill is what lets the dots sit over scrolling rows and stay
          readable without dimming them — `bg-app/80` + blur rather than a
          solid bar, so the row underneath still reads as continuous. */}
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-line bg-app/80 px-1 py-0.5 backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity">
        {Array.from({ length: dots }, (_, i) => {
          const on = i === active
          return (
            <button
              key={i}
              onClick={() => {
                const el = scrollRef.current
                if (!el) return
                const max = el.scrollWidth - el.clientWidth
                el.scrollTo({ left: (i / (dots - 1)) * max, behavior: reduce ? 'auto' : 'smooth' })
              }}
              aria-label={`Scroll to position ${i + 1} of ${dots}`}
              aria-current={on}
              className="flex h-5 w-5 items-center justify-center"
            >
              <span
                aria-hidden
                className={`h-[5px] rounded-full ${reduce ? '' : 'transition-all duration-200'} ${
                  on ? 'w-3 bg-accent-ui' : 'w-[5px] bg-fg-faint/50'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SemanticPreviewPane({
  previewTheme,
  previewAppearance,
  focus,
  onEditToken,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
  focus: SemanticFocus
  onEditToken: (id: string) => void
}) {
  const tokens = usePreviewTokens(previewTheme, previewAppearance)
  return (
    <VariablesPreviewPane watch={`${focus}/${previewTheme}/${previewAppearance}`} scope={focus}>
      {SEMANTIC_SPECIMENS[focus]({ tokens, onEditToken })}
    </VariablesPreviewPane>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step3_SemanticTokens({
  onFocusChange,
  previewTheme,
  previewAppearance,
  onPreviewThemeChange,
  onPreviewAppearanceChange,
  query: externalQuery,
  onQueryChange,
  railCollapsed = false,
  revealRole,
  managedThemesExternally = false,
  onOpenPrimitiveFamily,
}: {
  /** Shared with the Foundation toolbar so search occupies one consistent
   *  position across Primitives and Semantics. */
  query?: string
  onQueryChange?: (value: string) => void
  /** Reports which semantic GROUP is selected so the shell can point the
   *  preview at it. Deliberately NOT the same value as the nav's own category
   *  state: this component owns that internally (flat and non-flat keep
   *  separate selections), and emits a normalized `SemanticFocus` that means
   *  the same thing in every architecture. They used to be one shared piece of
   *  state, which is why the non-flat nav could never move the preview. */
  onFocusChange?: (f: SemanticFocus | 'all') => void
  /** Theme currently rendered in the right-hand preview (eye toggle). */
  previewTheme?: string
  previewAppearance?: ThemeAppearance
  onPreviewThemeChange?: (theme: string) => void
  onPreviewAppearanceChange?: (appearance: ThemeAppearance) => void
  /** Collapses this tab's 198px left column to a 56px glyph strip — the SAME
   *  state Primitives' family rail uses (`colorRailCollapsed`, owned by
   *  `Configurator` because TopNav sizes its brand divider from the column's
   *  width). Shared rather than per-tab on purpose: it's one column that
   *  changes what it LISTS per tab, so collapsing it on Primitives and finding
   *  it expanded on Semantics would read as two different columns. */
  railCollapsed?: boolean
  /** Preview specimen asked to open this token / group (`key` + `seq` so repeats work). */
  /** `token` opens the editor on arrival, `group` selects the category,
   *  `row` scrolls + flashes the row and leaves the editor closed. */
  revealRole?: { key: string; seq: number; as?: 'token' | 'group' | 'row' } | null
  /** Theme lifecycle belongs to the shared Themes Library rail. */
  managedThemesExternally?: boolean
  /** Jump from a ramp-grid family label to that family in Color · Primitives.
   *  Receives the family vocabulary name (`accent`, `neutral`, `error`…). */
  onOpenPrimitiveFamily?: (family: string) => void
}) {
  const store = useDesignStore()
  const {
    primaryColor, errorColor, primaryScale, errorScale, warningScale, successScale, infoScale,
    primaryDarkScale, errorDarkScale, warningDarkScale, successDarkScale, infoDarkScale,
    grayLightScale, grayDarkScale, customColors,
    pageBackground, darkBackground,
    themes, themeSemantics, themeOrder, themeKinds, themeSources, colorNaming,
    setThemeModeToken, removeTheme, setThemeOrder,
    panelBackground, setPanelBackground,
    semanticArchitecture, architectureOverrides,
    setArchitectureOverride,
  } = store

  const reduce = useReducedMotion() ?? false

  // New-theme / edit-theme panel. NOT anchored to its trigger any more: it
  // docks flush against the Color Variables column, in the same place from
  // every entry point here and from Primitives' own "+ New theme" CTA — see
  // `ThemePanel`. The triggers therefore pass no anchor element.
  const [addThemeOpen, setAddThemeOpen] = useState<boolean | string>(false)
  const openAddTheme = (editKey?: string) => {
    const next = editKey ?? true
    setAddThemeOpen((cur) => (cur === next ? false : next))
  }

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
  const activeTheme = previewTheme && themeOrder.includes(previewTheme)
    ? previewTheme
    : (themeOrder[0] ?? 'light')
  const preferredAppearance = themeKinds[activeTheme] ?? 'light'
  const activeAppearance = previewAppearance ?? preferredAppearance
  const activeThemeSemantics = semanticModesFor(themeSemantics, themes, activeTheme, preferredAppearance)
  const scaleFor = (appearance: ThemeAppearance, role: Role) =>
    sourceScaleFor(role, appearance, scales, resolveThemePalette(themeSources[activeTheme], appearance, store))

  // The theme's spectrum leads the matrix: dark-spectrum themes use Dark →
  // Light, while light-spectrum themes use Light → Dark. Preview selection is
  // independent and never mutates this stable per-theme ordering.
  const themeCols = appearanceOrder(preferredAppearance)
  const archThemeCols = themeCols.map((appearance) => themeModeKey(activeTheme, appearance))
  // Columns grow evenly with the table by default. A drag only turns the
  // adjusted column into a fixed track; otherwise Light and Dark use the
  // available width homogeneously, including when the preview rail closes.
  const DEFAULT_COL_W = 124
  const MIN_COL_W = 104
  const MAX_COL_W = 184
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const widthOf = (t: string) => colWidths[t] ?? DEFAULT_COL_W
  // The "Token name" column is resizable too. It fills the row by default (null
  // → a 1fr track, the original behavior); once dragged it becomes a fixed width
  // and a trailing flexible spacer absorbs the freed slack so the table still
  // spans the full width.
  const MIN_NAME_W = 150
  const MAX_NAME_W = 520
  const DEFAULT_NAME_W = 204
  const [nameWidth, setNameWidth] = useState<number | null>(null)
  const themeTrack = (theme: string) => colWidths[theme] == null
    ? `minmax(${MIN_COL_W}px, 1fr)`
    : `${widthOf(theme)}px`
  const themeTracks = `${themeCols.map(themeTrack).join(' ')} ${TRAIL_TRACK}`
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: nameWidth == null
      ? `minmax(${DEFAULT_NAME_W}px, 1.15fr) ${themeTracks}`
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
    if (managedThemesExternally) return
    if (from === to) return
    const next: string[] = [...themeCols].filter((t) => t !== from)
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

  const recHexOf = (appearance: ThemeAppearance, role: Role) =>
    recHexFor(role, appearance, scaleFor(appearance, role))

  const kindOf = (mode: string): ThemeAppearance =>
    appearanceFromModeKey(mode) ?? (mode === 'dark' ? 'dark' : 'light')

  // Column display name — built-in themes carry the chosen color family's name
  // in front ("Purple light" / "Purple dark") so the matrix reads as *this*
  // system's themes, matching Home's family dropdown. Custom themes keep the
  // name the user gave them; an off-catalogue accent falls back to plain
  // light/dark.
  const themeDisplayName = (mode: string): string => kindOf(mode) === 'dark' ? 'Dark' : 'Light'

  const isModified = (role: Role) =>
    themeCols.some((appearance) => {
      const cur = activeThemeSemantics[appearance]?.[role.key]
      const rec = recHexOf(appearance, role)
      return !!cur && !!rec && cur.toLowerCase() !== rec.toLowerCase()
    })

  // UI state — category is controllable; falls back to internal state standalone.
  const [activeCategory, setInternalCategory] = useState<SemanticCategory>('all')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  // Which section Token Details should open on. Set to a specific appearance
  // key when a value cell IN that column is clicked; `null` for every other
  // open path (the row name, the tune icon, the Variables-preview panel, a
  // reveal-from-specimen), which then falls back to the previewed appearance.
  // Fixes: opening a role always landed on the theme's *preferred* appearance
  // (usually Dark), ignoring which column you actually clicked.
  const [detailsMode, setDetailsMode] = useState<string | null>(null)
  const [localQuery, setLocalQuery] = useState('')
  const query = externalQuery ?? localQuery
  const setQuery = onQueryChange ?? setLocalQuery
  const [flashKey, setFlashKey] = useState<string | null>(null)
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
    for (const appearance of themeCols) {
      const p = resolveThemePalette(themeSources[activeTheme], appearance, store)
      if (p) out[themeModeKey(activeTheme, appearance)] = p
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTheme, themeSources, primaryScale, grayLightScale, grayDarkScale, errorScale, warningScale, successScale, infoScale, customColors])

  const archView = useMemo(
    () =>
      isFlat
        ? null
        : buildArchitectureView(
            semanticArchitecture,
            {
              themes: Object.fromEntries(
                themeCols.map((appearance) => [themeModeKey(activeTheme, appearance), activeThemeSemantics[appearance]]),
              ),
              themeKinds: Object.fromEntries(
                themeCols.map((appearance) => [themeModeKey(activeTheme, appearance), appearance]),
              ),
              themePalettes: resolvedPalettes,
              scales,
              accent: primaryColor,
              pageBackground,
              darkBackground,
            },
            errorColor,
            architectureOverrides[semanticArchitecture] ?? {},
            // Every theme in the workspace — Categorical resolves one column
            // per entry; Vibrancy/Tonal ignore this (always light/dark, see
            // ArchitectureView.modeKeys). Passing it uniformly means "+ Theme"
            // just works the moment Categorical's math supports it, with no
            // per-architecture branch needed here.
            archThemeCols,
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [semanticArchitecture, primaryColor, errorColor, primaryScale, grayLightScale, grayDarkScale, errorScale, warningScale, successScale, infoScale, activeThemeSemantics, resolvedPalettes, architectureOverrides, themeCols, archThemeCols, pageBackground, darkBackground],
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
    themeCols.forEach((appearance) => {
      const hex = recHexOf(appearance, role)
      if (hex) setThemeModeToken(activeTheme, appearance, role.key, hex)
    })
  }

  // Auto-populate on mount + resync whenever any scale changes. Overwrites only
  // empty OR stale values (a stored hex that no longer maps to any tone in the
  // token's current source scale — e.g. after a gray-flavor change regenerates
  // the gray ramp). Intentional customisations are preserved.
  useEffect(() => {
    if (!ready) return
    ALL_ROLES.forEach((role) => {
      themeCols.forEach((appearance) => {
        const src = scaleFor(appearance, role)
        const cur = activeThemeSemantics[appearance]?.[role.key]
        if (!cur || toneIndexOf(src, cur) === null) {
          const hex = recHexOf(appearance, role)
          if (hex) setThemeModeToken(activeTheme, appearance, role.key, hex)
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, grayLightScale, grayDarkScale, primaryScale, errorScale, warningScale, successScale, infoScale, activeTheme, themeSources])

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

  const previewFocus = focusForNavKey(activeKey) ?? 'surface'
  const editFromPreview = (id: string) => {
    setQuery('')
    // From the Variables-preview panel there's no column — open on whatever
    // appearance the preview is currently showing.
    setDetailsMode(null)
    if (isFlat) {
      const category = flatCategoryForRole(id)
      if (category) selectCategory(category)
      setExpandedRole(id)
    } else {
      const category = archView ? archNavForToken(id, archView.categories) : null
      if (category) {
        setArchCategory(category)
        onFocusChange?.(focusForNavKey(category) ?? 'all')
      }
      setArchEditing(id)
    }
    setFlashKey(id)
    window.setTimeout(() => document.getElementById(`color-role-${id}`)?.scrollIntoView({ block: 'center' }), 60)
    window.setTimeout(() => setFlashKey(null), 1400)
  }

  // Non-flat table rows — straight from the projection, filtered by search.
  // Keys repeat across groups (content.primary vs action.primary), so rows are
  // group-qualified: unique React keys AND unambiguous names in the All view.
  const archTokens = !isFlat && archView
    ? (archCategory === 'all'
        ? archView.categories.flatMap((c) =>
            c.tokens.map((t) => ({ ...t, id: `${c.key}.${t.key}`, name: `${c.key}.${t.key}`, description: archRoleDescription(`${c.key}.${t.key}`, c.description) })),
          )
        : (() => {
            const cat = archView.categories.find((c) => c.key === archCategory)
            return (cat?.tokens ?? []).map((t) => ({
              ...t, id: `${archCategory}.${t.key}`, name: t.key, description: archRoleDescription(`${archCategory}.${t.key}`, cat?.description ?? ''),
            }))
          })()
      ).filter((t) => !q || t.name.toLowerCase().includes(q))
    : []

  useEffect(() => {
    if (!revealRole?.key) return
    setQuery('')
    setDetailsMode(null)

    if (revealRole.as === 'group') {
      const focus = revealRole.key as SemanticFocus
      if (isFlat) {
        const cat: SemanticCategory =
          focus === 'border' ? 'border' : focus === 'content' || focus === 'icon' ? 'content' : 'background'
        selectCategory(cat)
      } else {
        const exact = navItems.find((i) => i.key === focus)
        const mapped = navItems.find((i) => i.key !== 'all' && focusForNavKey(i.key) === focus)
        const iconFallback = navItems.find((i) => i.key === 'content')
        const nav = exact?.key ?? mapped?.key ?? (focus === 'icon' ? iconFallback?.key : undefined) ?? 'all'
        setArchCategory(nav)
        onFocusChange?.(focusForNavKey(nav) ?? 'all')
      }
      return
    }

    const id = revealRole.key
    // `'row'` reveals WITHOUT opening the editor. The caller is a Token Details
    // drawer whose whole request was "show me the full table" — re-opening an
    // identical drawer on arrival would dock 360px straight over the token-name
    // column, i.e. hide the thing that was asked for. The row still scrolls in
    // and flashes, and its own tune icon opens the editor if you want it.
    const openEditor = revealRole.as !== 'row'
    if (isFlat) {
      const cat = flatCategoryForRole(id)
      if (cat) selectCategory(cat)
      if (openEditor) setExpandedRole(id)
    } else {
      const nav = archView ? archNavForToken(id, archView.categories) : null
      if (nav) {
        setArchCategory(nav)
        onFocusChange?.(focusForNavKey(nav) ?? 'all')
        if (openEditor) setArchEditing(id)
      }
    }
    setFlashKey(id)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = window.setTimeout(() => {
      document.getElementById(`color-role-${id}`)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    }, 80)
    const t1 = window.setTimeout(() => setFlashKey(null), 1400)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
    }
    // Nav + projection are read at reveal time; seq is what retriggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealRole?.key, revealRole?.seq, revealRole?.as])
  // Name column keeps a real minimum — with flexible value columns it would
  // otherwise collapse to 0 on narrow panes (overflow-auto scrolls). Value
  // track count follows `modeKeys` — 2 for Vibrancy/Tonal (fixed), N for
  // Categorical (one per theme, so "+ Theme" actually grows the table).
  const archModeKeys = archView?.modeKeys ?? archThemeCols
  /**
   * The heading for one value column. A PER_THEME architecture's columns ARE
   * the project's themes, so they take the user's own theme names; a fixed-mode
   * architecture owns its column names, and only Carbon has keys a reader
   * cannot decode (`g90` → "Gray 90"). Three call sites below share this — the
   * header row, the tone-picker sections and the mode editor — and they must
   * not be able to disagree.
   */
  // Categorical is the only architecture and it is per-theme by construction —
  // its columns ARE `themeOrder`, so a mode name is always a theme name. The
  // retired architectures (Vibrancy/Tonal/Carbon) were the ones with fixed,
  // contract-owned mode names, which is what `architectureModeLabel` existed
  // to render; it went with them.
  const archModeLabel = (mode: string) => themeDisplayName(mode)
  /** Everything that can change the table's `scrollWidth`, as one string for
   *  `ScrollPager` to re-measure on. Not a ResizeObserver's job: the tracks
   *  overflow a block child whose own box never changes size, so neither the
   *  scroll container nor its child ever fires one. */
  const scrollWatch = [
    semanticArchitecture,
    isFlat ? themeCols.join('|') : archModeKeys.join('|'),
    nameWidth ?? 'auto',
    themeCols.map(widthOf).join(','),
    isFlat ? visibleRoles.length : archTokens.length,
  ].join('/')
  const archGridStyle: React.CSSProperties = {
    // Last track = the edit toggle, mirroring the flat matrix's trailing column.
    gridTemplateColumns: `minmax(${DEFAULT_NAME_W}px, 1.15fr) ${archModeKeys.map(() => `minmax(${MIN_COL_W}px, 1fr)`).join(' ')} ${TRAIL_TRACK}`,
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
      {/* ── Body: categories flush under Groups; tabs · table on the right ── */}
      <div className="flex flex-1 min-h-0 items-stretch">
        <VariableCollectionRail collapsed={railCollapsed} ariaLabel="Color collections and groups">
          <div role="navigation" aria-label="Semantic color groups" className={`flex flex-col gap-0.5 ${railCollapsed ? 'items-center' : ''}`}>
          {navItems.map((item) => {
            const isActive = activeKey === item.key
            return (
              <div key={item.key} className={`relative ${railCollapsed ? '' : 'w-full'}`}>
                <button
                  onClick={() => selectNavItem(item.key)}
                  aria-label={item.label}
                  aria-current={isActive}
                  title={railCollapsed ? `${item.label} — ${item.description}` : item.description}
                  className={`flex items-center rounded-lg transition-colors ${
                    railCollapsed ? 'w-10 h-8 justify-center' : 'w-full gap-2.5 px-2.5 py-2 text-left'
                  } ${
                    isActive ? 'bg-elevated text-accent-ui shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                  }`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-[15px]" aria-hidden>{item.icon}</span>
                  {!railCollapsed && (
                    <>
                      <span className="flex-1 min-w-0 truncate text-ui font-medium">{item.label}</span>
                      {item.modified > 0 && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent-ui" aria-hidden />
                      )}
                    </>
                  )}
                </button>
                {railCollapsed && item.modified > 0 && (
                  <span
                    className="pointer-events-none absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent-ui"
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
          </div>
        </VariableCollectionRail>

        <div className="flex-1 min-w-0 flex flex-col bg-app min-h-0">

        {/* Token table — scrolls internally; column header stays pinned.
            `tableRef` is what the Token Details dialog docks against, so it
            opens beside the trailing settings column instead of over the
            values it's editing.
            The wrapper exists to anchor `ScrollPager`: the dots have to sit at
            the bottom of the VIEWPORT of the table, not at the bottom of its
            (taller, wider) content, so they can't live inside the scrolling
            element itself. */}
        <div className="flex-1 min-w-0 flex min-h-0">
        <div className="relative flex-1 min-w-0 min-h-0">
        <div ref={tableRef} className="h-full min-w-0 overflow-auto bg-app">
          {!isFlat && archView ? (
            // ── Architecture table — read-only, schema-faithful: rows and
            // values come straight from the projection the export emits. ──
            <div className="min-w-[28rem]">
              <div
                className="grid items-stretch h-[52px] border-b border-line bg-app text-mini font-semibold uppercase tracking-widest text-fg-faint sticky top-0 z-20"
                style={archGridStyle}
              >
                {/* Pinned, matching the rows' own name cells below. `bg-app`
                    is its own, not inherited: the header div's background
                    scrolls with the header's content box, so without a fill
                    here the mode labels would slide visibly under this one. */}
                <span className="flex items-center pl-4 border-r border-line sticky left-0 z-10 bg-app">Token name</span>
                {archModeKeys.map((mode, i) => {
                  const isPreviewed = activeAppearance === kindOf(mode)
                  const label = archModeLabel(mode)
                  // Categorical's columns ARE `themeOrder`, one per theme,
                  // same as the flat matrix — so every column is a real,
                  // deletable theme. (The retired Vibrancy/Tonal/Carbon
                  // architectures had fixed contract-owned mode slots with no
                  // per-theme concept, which is what this used to guard.)
                  const deletable = themeCols.length > 1
                  return (
                    <span key={mode} className={`flex items-center min-w-0 px-1.5 py-1.5 ${i < archModeKeys.length - 1 ? 'border-r border-line' : ''} ${isPreviewed ? 'bg-accent-ui/[0.06]' : ''}`}>
                      {/* Same "whole header is the preview toggle" affordance
                          the flat matrix's columns use — 'light'/'dark' are
                          always valid theme keys, and Categorical's added
                          theme is a real one too, so this just works without
                          new plumbing. No drag-reorder/resize here (unlike
                          flat): the non-flat table is schema-order, not a
                          user-arranged matrix, so reordering columns has no
                          meaning to preserve. */}
                      <button
                        onClick={() => onPreviewAppearanceChange?.(kindOf(mode))}
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
                      {/* Opens the SAME `ThemePanel` "+ Theme" mints, in
                          edit mode — rename, or re-point a slot to another
                          family. Every mode key here is a real theme
                          (`themeSources[mode]` always resolves, even for
                          Vibrancy/Tonal's fixed light/dark), so the edit
                          affordance isn't gated on `isThemeCol` the way
                          delete is. */}
                      {!managedThemesExternally && <button
                        onClick={() => openAddTheme(mode)}
                        aria-label={`Edit theme ${label}`}
                        title={`Edit theme ${label}`}
                        className="text-fg-faint hover:text-fg transition-colors flex-shrink-0 px-1"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>}
                      {!managedThemesExternally && deletable && (
                        <button
                          onClick={() => setThemeToDelete(mode)}
                          aria-label={`Remove theme ${label}`}
                          title={`Remove theme ${label}`}
                          className="text-fg-faint hover:text-status-danger transition-colors flex-shrink-0 px-1"
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
                    shove this column away. */}
                <span className={`flex items-center justify-center py-1.5 ${STICKY_TRAIL}`}>
                  {!managedThemesExternally ? (
                    <button
                      onClick={() => openAddTheme()}
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
                  const flash = flashKey === t.id
                  return (
                  <div
                    key={t.id}
                    id={`color-role-${t.id}`}
                    className={flash ? COLOR_FLASH : isOpen ? 'bg-blue-50/40 dark:bg-blue-950/10' : idx % 2 === 1 ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}
                  >
                    <div
                      // `group` so the pinned name cell can re-paint this row's
                      // hover tint over its own opaque base (the flat matrix's
                      // row already carried it).
                      className={tableRowClass(idx, 'grid', { zebra: false })}
                      style={archGridStyle}
                    >
                      {/* Pinned name cell — the arch half of the same fix the
                          flat matrix's `MatrixRow` carries; see its comment for
                          the opaque-base + two-overlay layering and why the
                          inner button needs `relative`. */}
                      <div className="flex items-center gap-2 py-2 pl-3 pr-2 min-w-0 border-r border-line sticky left-0 z-10 bg-app">
                        <span
                          aria-hidden
                          className={`absolute inset-0 pointer-events-none ${
                            flash ? 'bg-accent-ui/[0.12]' : isOpen ? 'bg-blue-50/40 dark:bg-blue-950/10' : idx % 2 === 1 ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
                          }`}
                        />
                        <span aria-hidden className="absolute inset-0 pointer-events-none group-hover:bg-black/[0.025] dark:group-hover:bg-white/[0.04]" />
                        <button
                          onClick={() => editable && (setDetailsMode(null), setArchEditing(isOpen ? null : t.id))}
                          className="relative flex items-center gap-2 min-w-0 text-left flex-1"
                          aria-label={`Edit ${t.name} scale`}
                        >
                          <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-fg-muted" aria-hidden>
                            <PaletteIcon size={16} />
                          </span>
                          <code className="font-mono text-body text-fg-muted truncate" title={t.name}>{t.name}</code>
                          {archModeKeys.some((m) => t.edited?.[m]) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified from the schema" />
                          )}
                        </button>
                      </div>
                      {archModeKeys.map((mode, i) => (
                        <button
                          key={mode}
                          onClick={() => editable && (setDetailsMode(mode), setArchEditing(isOpen ? null : t.id))}
                          // Last mode has no `border-r`: the sticky trail owns
                          // that seam (`border-l`) so the two never stack.
                          className={`flex items-center min-w-0 px-2 py-2.5 text-left ${i < archModeKeys.length - 1 ? 'border-r border-line' : ''}`}
                        >
                          <TokenCell
                            v={t.modes[mode]}
                            kind={semanticArchitecture}
                            fallback={t.fallback?.[mode]}
                            edited={Boolean(t.edited?.[mode])}
                          />
                        </button>
                      ))}
                      {/* Filter / edit toggle — glass plate on `STICKY_TRAIL`. */}
                      <button
                        onClick={() => editable && (setDetailsMode(null), setArchEditing(isOpen ? null : t.id))}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Close Token Details' : 'Edit scale'}
                        disabled={!editable}
                        className={`group flex items-center justify-center h-full py-2.5 text-fg-muted hover:text-fg disabled:opacity-30 transition-colors ${STICKY_TRAIL} ${
                          flash ? 'bg-accent-ui/20' : isOpen ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
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
            <div className="grid items-stretch h-[52px] border-b border-line bg-app text-mini font-semibold uppercase tracking-widest text-fg-faint sticky top-0 z-20" style={gridStyle}>
              {/* Pinned — see the arch header's matching cell. `sticky` is a
                  positioned value, so it still anchors the resize grip below
                  exactly as `relative` did. */}
              <span className="group flex items-center pl-4 border-r border-line sticky left-0 z-10 bg-app">
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
              {themeCols.map((t, i) => {
                const isPreviewed = activeAppearance === kindOf(t)
                const displayName = themeDisplayName(t)
                const canDelete = !managedThemesExternally
                return (
                  <span
                    key={t}
                    draggable={!managedThemesExternally}
                    onDragStart={(e) => {
                      if (managedThemesExternally) { e.preventDefault(); return }
                      if (resizingRef.current) { e.preventDefault(); return }
                      dragThemeRef.current = t; setDragTheme(t); e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => { e.preventDefault(); if (dragThemeRef.current && dragThemeRef.current !== t) setDropTarget(t) }}
                    onDragLeave={() => setDropTarget((cur) => (cur === t ? null : cur))}
                    onDrop={(e) => { e.preventDefault(); if (dragThemeRef.current) reorderColumns(dragThemeRef.current, t); dragThemeRef.current = null; setDragTheme(null); setDropTarget(null) }}
                    onDragEnd={() => { dragThemeRef.current = null; setDragTheme(null); setDropTarget(null) }}
                    className={`group relative flex items-center gap-1 px-1.5 py-2 min-w-0 transition-colors ${
                      i < themeCols.length - 1 ? 'border-r border-line' : ''
                    } ${
                      isPreviewed ? 'bg-accent-ui/[0.06]' : ''
                    } ${managedThemesExternally ? '' : 'cursor-grab active:cursor-grabbing'} ${dragTheme === t ? 'opacity-40' : ''}`}
                  >
                    {dropTarget === t && (
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-accent-ui z-20" aria-hidden />
                    )}
                    {/* Whole name is the toggle — the active theme reads as a
                        highlighted pill (same language as the category rail). */}
                    <button
                      onClick={() => onPreviewAppearanceChange?.(kindOf(t))}
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
                    {/* No per-ROLE colour editing in this table, by design: a
                        theme is a READING of the primitives, never a place to
                        set colour. This edit button doesn't violate that — it
                        opens `ThemePanel` in edit mode, which only lets you
                        rename the theme or re-point one of its six SLOTS
                        (brand/gray/error/warning/success/info) to a different
                        primitive family, the same "+ Theme" mechanism that
                        created it. There was previously no way back into that
                        panel once a theme existed — creating one was a
                        one-shot form with no edit entry point, so a typo'd
                        name or a slot you wanted pointed elsewhere meant
                        deleting the theme and starting over. */}
                    {!managedThemesExternally && <button
                      onClick={() => openAddTheme(t)}
                      aria-label={`Edit theme ${displayName}`}
                      title={`Edit theme ${displayName}`}
                      className="text-fg-faint hover:text-fg transition-colors flex-shrink-0"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>}
                    {!managedThemesExternally && canDelete && (
                      <button
                        onClick={() => setThemeToDelete(t)}
                        aria-label={`Remove theme ${displayName}`}
                        title={`Remove theme ${displayName}`}
                        className="text-fg-faint hover:text-status-danger transition-colors flex-shrink-0"
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
              <span className={`flex items-center justify-center py-1.5 ${STICKY_TRAIL}`}>
                {!managedThemesExternally && <button
                  onClick={() => openAddTheme()}
                  aria-label="Add a theme"
                  title="Add a theme — its roles resolve through the primary colors"
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-line text-fg-faint hover:text-fg hover:border-line-strong hover:bg-elevated transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8"/></svg>
                </button>}
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
                  cols={themeCols.map((appearance) => {
                    const kind = kindOf(appearance)
                    return {
                      key: appearance,
                      kind,
                      scale: scaleFor(appearance, role),
                      value: activeThemeSemantics[appearance]?.[role.key] ?? '',
                      recTone: recToneFor(role, kind, scaleFor(appearance, role)),
                      previewed: activeAppearance === appearance,
                    }
                  })}
                  modified={isModified(role)}
                  expanded={expandedRole === role.key}
                  flash={flashKey === role.key}
                  gridStyle={gridStyle}
                  naming={colorNaming}
                  onToggle={(colKey) => {
                    setDetailsMode(colKey ?? null)
                    setExpandedRole((cur) => (cur === role.key ? null : role.key))
                  }}
                />
              ))
            )}
          </div>
          )}
        </div>
        <ScrollPager scrollRef={tableRef} watch={scrollWatch} reduce={reduce} />
        </div>
        <SemanticPreviewPane previewTheme={activeTheme} previewAppearance={activeAppearance} focus={previewFocus} onEditToken={editFromPreview} />
        </div>
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
          const cols: ThemeCol[] = themeCols.map((appearance) => {
            const kind = kindOf(appearance)
            return {
              key: appearance,
              kind,
              scale: scaleFor(appearance, role),
              value: activeThemeSemantics[appearance]?.[role.key] ?? '',
              recTone: recToneFor(role, kind, scaleFor(appearance, role)),
              previewed: activeAppearance === appearance,
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
              onClose={() => { setExpandedRole(null); setDetailsMode(null) }}
              reduce={reduce}
              anchorRef={tableRef}
              // The clicked column's own key (`col.key` is a bare 'light' /
              // 'dark', which is exactly what the sections below are keyed by);
              // absent that, the previewed appearance. This was
              // `themeModeKey(...)` — a 'Theme::light' string that matched NO
              // section, so it always silently fell through to `sections[0]`
              // (the theme's preferred appearance, usually Dark).
              initialOpenKey={detailsMode ?? activeAppearance}
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
                      onChange={(hex) => setThemeModeToken(activeTheme, col.kind, role.key, hex)}
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
              // `t.id`, never `t.name`: rows are bare inside a category because
              // the nav names it (see `archTokens`), but this dialog carries no
              // category context — and its CSS chip is COPY-PASTEABLE, so a
              // bare name emitted `var(--control)` for `border.control`, a
              // variable that does not exist. The quick-edit drawer already
              // uses the qualified id; both now name a token the same way.
              name={t.id}
              cssVarName={t.id.replace(/\./g, '-')}
              description={t.description}
              onReset={() => {
                for (const mode of archModeKeys) setArchitectureOverride(semanticArchitecture, t.id, mode, null)
              }}
              resetDisabled={!archModeKeys.some((m) => t.edited?.[m])}
              onClose={() => { setArchEditing(null); setDetailsMode(null) }}
              reduce={reduce}
              anchorRef={tableRef}
              // `archModeKeys` may be bare 'light'/'dark' (categorical) OR
              // 'Theme::light' mode keys — so resolve the previewed fallback by
              // MATCHING `kindOf`, not by assuming a format. A clicked column
              // always passes its own exact `mode` string via `detailsMode`.
              initialOpenKey={detailsMode ?? (archModeKeys.find((m) => kindOf(m) === activeAppearance) ?? archModeKeys[0])}
              // No ToneAxisRow in these sections: SystemRampGrid prints its own
              // 1–12 axis under each mode's ramps, and a bare grid-cols-12 row
              // would sit misaligned anyway — it lacks the grid's leading
              // family-label column. The flat modal above still uses it, since
              // TonePicker has no axis of its own.
              sections={archModeKeys
                .filter((mode) => parseRef(t.modes[mode]?.label ?? ''))
                .map((mode) => ({
                  key: mode,
                  label: archModeLabel(mode),
                  kind: kindOf(mode),
                  content: (
                    <ArchModeEditor
                      value={t.modes[mode]}
                      scales={scales}
                      palette={resolvedPalettes[mode]}
                      kind={kindOf(mode)}
                      pageBackground={pageBackground}
                      darkBackground={darkBackground}
                      label={archModeLabel(mode)}
                      onPick={(refStr) => setArchitectureOverride(semanticArchitecture, t.id, mode, refStr)}
                      onOpenFamily={onOpenPrimitiveFamily}
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
      {!managedThemesExternally && <ThemePanel
        open={addThemeOpen !== false}
        editKey={typeof addThemeOpen === 'string' ? addThemeOpen : null}
        onClose={() => setAddThemeOpen(false)}
        railCollapsed={railCollapsed}
        appearance={kindOf(previewTheme ?? 'light')}
        onCreated={(key) => onPreviewThemeChange?.(key)}
        onRenamed={(oldKey, newKey) => {
          if (previewTheme === oldKey) onPreviewThemeChange?.(newKey)
          setAddThemeOpen((cur) => (cur === oldKey ? newKey : cur))
        }}
      />}
    </div>
  )
}
