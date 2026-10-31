// Theme Preview's left rail — one foundation's quick-edit panel at a time.
// Edition sits on `WORKSPACE_CHROME` (no inner `--app` card). `RailCard` is
// the integration-rail card (Connection / Protocol), not this column.
//
// The 64px `FoundationIconRail` beside this column picks the widget: Color
// (accent hue + neutral tint + state chips + Contrast grid),
// Text, Radius, Shadow, Size, Stroke, Icons (status action + weight). Stacking every card at once made the
// artefacts board compete with a scroll of controls; the icon rail is the
// same switcher Variables already uses, so Color / Font / Radius mean the
// same thing one tab apart.
//
// Deliberately NOT here: a "Theme recipe" preset, a Radius Form axis, and the
// Noise effect toggle. Shadows are included because they are a real,
// theme-scoped foundation and repaint the specimens beside this rail.

import { releaseInspectorPin } from '../preview/artefacts/TokenInspector'
import { recordEdit } from '../../lib/editHistory'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { captureSnapshot, DEFAULT_THEME_SOURCES, RESERVED_COLOR_KEYS, type DesignSnapshot, useDesignStore } from '../../store/useDesignStore'
import {
  useApplyAccentColor, useApplyGrayColor, useApplyStateColor,
  resolveThemePages, stateColorAnchor, type StateRole,
  followingDarkAnchors, retwinFollowingDarkAnchors,
} from '../../lib/colorActions'
import { backgroundFromBase, colorAtHue, darkShadowMap, generateColorScale, generateLightNeutralScale, generateDarkColorScale, generateFamilyDarkScale, neutralFromBrand, NEUTRAL_TINTS, readHuePosition, type NeutralTint } from '../../lib/colorUtils'
import { fontStack, FONT_PRESETS, loadGoogleFont } from '../../lib/fonts'
import { useTheme } from '../../lib/theme'
import { TYPE_SCALE_MODES, buildTypeScale, inferTypeScaleMode } from '../../lib/typographyStandard'
import {
  BASE_UNIT_RANGE,
  FIELD_BASE_MIN,
  SIZE_CONTROL_MIN_PX,
  SIZE_DEFAULT_BASE,
  SIZE_STEPS,
  SPACING_STEPS,
  STROKE_SM_STOPS,
  buildSizesFromBase,
  inferSizeBase,
  INSET_SURFACE_ROLE,
  PADDING_DEFAULT_STEP,
  insetSurfacePadding,
  INSET_SIDES,
  clearInsetSides,
  insetSideKey,
  withInsetSide,
  type InsetSide,
  type SpacingStep,
  SPACING_MODES,
  matchSpacingMode,
  type SpacingMode,
  RADIUS_GROUPS,
  RADIUS_AXIS_STEPS,
  RADIUS_ROLE_PRESETS,
  radiusPresetPx,
  matchRadiusRolePreset,
  radiusPresetPatch,
  radiusAxisStep,
  radiusAtViewport,
  radiusRoleAt,
  applyRadiusGroup,
  type RadiusRoleViewports,
  type GridViewport,
} from '../../lib/layoutTokens'
import { slugify } from '../../lib/utils'
import {
  GLOBAL_FAMILY, SLOT_DISPLAY_LABEL, scaleForFamily,
  type BrandExtraRank,
} from '../../lib/themeSources'
import type { ThemeAppearance } from '../../lib/themeModes'
import { brandThemeDef, plannedBrandThemes, shippedThemes } from '../../lib/brandThemes'
import { resetThemeSemantics, stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import {
  adoptRemixOverGuestSeed, colorRowHasEdits, foundationRowHasEdits, openStyleForEditing, resetFoundationRow, resetThemeColorToOrigin,
  type FoundationRow,
} from '../../lib/adoptPreset'
import { StyleOverview } from './StyleOverview'
import { nextShuffle, randomLabelAfterTweak, styleLabelAfterShuffle } from '../../lib/randomTheme'
import { isScaffoldTheme, myThemeKeys, resolveListedTheme } from '../../lib/themeLibrary'
import { presetHarmony, themeStylePreset } from '../../lib/themePresets'
import { resolveThemeFoundations } from '../../lib/themeFoundations'
import { LockGlyph } from '../ui/icons'
import { UpgradeToProDialog } from './UpgradeToProNotice'
import { SHADOW_PRESETS, matchShadowPreset, matchDarkShadowPreset } from '../../lib/shadowTokens'
import { PHOSPHOR_WEIGHTS, type PhosphorWeight } from '../../lib/phosphorIcons'
import { IconSizeLadder, IconStyleOverview, PhosphorWeightProvider, PreviewIcon } from './docs/specimens'
import { COLOR_RAIL_WIDTH, THEME_BAND_H } from './colorControls'
import { CHROME_CONTROL_SHELL, INSPECTOR_TABS_H, SEGMENT_ACTIVE_INK, SEGMENT_INACTIVE, WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { SegmentHighlight } from '../ui/SegmentHighlight'
import { showToast } from '../ui/Toast'
import { useI18n } from '../../lib/i18n'
import { PickerField } from '../ui/PickerField'
import { useCloseOnAnchorScroll } from '../ui/useCloseOnAnchorScroll'
import { MOTION_PRESETS, MOTION_PRESET_KEYS, matchMotionPreset, motionPresetPatch, normalizeMotionSettings, type MotionPresetKey } from '../../lib/motion'
import { MotionPreview, motionSummary } from './MotionPreview'
import { AddFontButton, AddFontDialog } from './AddFontDialog'
import { RadiusPresetGlyph, ShadowPresetGlyph, SpacingModeGlyph } from './PresetGlyphs'
import ThemeSaveBar, { ThemeSetupBar, type ShipActions } from './ThemeSaveBar'
import { StylePicker } from './ThemePanel'
import { ColorRolesPanel, type ColorRoleRow, type RampLegend } from './ColorRolesPanel'
import { COLOR_ROLE_ORDER, darkTwinOf, harmonizedState, lightTwinOf, roleColorAtHue, type ColorRoleId, type StateRoleId } from '../../lib/colorRoles'
import type { ColorScale } from '../../types/tokens'
import { ThemeResetButton, useThemeReset } from './ThemeResetButton'
import { useLibraryStatus } from '../../lib/libraryStatus'
import { useSetupStep } from '../../lib/themeSetup'
import { useAccess, useOneThemePlan } from '../../lib/access'
import { InspectorHeaderInline, InspectorHeaderPortal, InspectorPortal, useInInspector, useInspectorHeader } from './WorkspaceInspector'
import { FoundationGlyph } from './FoundationIconRail'

/**
 * ONE width for every left column in the Themes workspace — this rail, the
 * component showcase's filter and the System doc list all sit in the same slot,
 * one view apart, so three different widths (296 / 240 / 198) read as the
 * column jumping when you switch views. `COLOR_RAIL_WIDTH` is the one that
 * already had a reason to be its size (see its note in `colorControls`: the
 * shell derives TopNav's brand block from it, so the divider runs unbroken from
 * the very top), which makes it the default the other two adopt rather than a
 * fourth number invented here.
 */
export const QUICK_SETTINGS_WIDTH = COLOR_RAIL_WIDTH
/** Stable hook for Token Details — `aria-label` is translated, this is not. */
export const QUICK_SETTINGS_ID = 'theme-quick-settings'

/** One vertical rhythm for edition cards and semantic accordion rows. */
/** Card-to-card gap, shared with the integration rail. */
export const QUICK_RAIL_STACK_GAP = 'gap-3'

/** Edition cards + Name field — `rounded-lg` (action/control radius in chrome). */
export const RAIL_SURFACE_RADIUS = 'rounded-lg'

/**
 * The rail's vertical rhythm, in ONE place — six foundations are stacked in
 * this column now, so a card's height is what decides how many of them you can
 * see at once, and the padding was written when a card was the only thing on
 * screen.
 *
 * Every value here is a Tailwind step, NOT an arbitrary `[15px]`: this app sets
 * `:root { font: 18px }`, so the scale resolves 12.5% larger than its name
 * (`py-3` = 13.5px, `h-9` = 40.5px) — which is why the rows read heavier than
 * the class names suggest and why eyeballing a pixel value here goes wrong.
 *
 * `ROW_GAP_CONTROL` is deliberately smaller than the `mt-3` it replaced above
 * sliders: the stepped sliders are `DotSlider` wells, filled edge to edge like
 * the `PickerField` beside them, so they carry no air of their own and the
 * label→control gap is the margin alone. Measured against the value it labels.
 */
/**
 * ONE ink rule across the six cards, because compacting them removed the air
 * that used to do this job: full-strength `text-fg` is reserved for a card's
 * TITLE and its resolved VALUES (the base-unit number, the stroke px, the
 * selected radius badge). Every label, caption and axis name is `text-fg-muted`
 * or fainter. Before this, a 9px axis name and an 11px row label were both on
 * `--fg` while the card title differed only by semibold-vs-medium at the same
 * 11px — three levels rendering as one.
 */
/** Preview block above a slider — tall enough for the largest specimen in it
 *  (a 17px `Aa`, a 20px selector square), no taller. */
const ROW_PREVIEW_H = 'h-8'
/** Preview/readout → slider, and slider → its axis labels. */
const ROW_GAP_CONTROL = 'mt-2'
/** Every block in an edition: the inspector inset on all four sides, so a
 *  section's air matches the panel's edges. The first block of a section
 *  drops its top (EditionCard), sitting under its header like Color does. */
const RAIL_BLOCK = 'min-w-0 p-[var(--inspector-inset)]'

function defaultThemeLabel(key: string) {
  if (key === 'light') return 'Light'
  if (key === 'dark') return 'Dark'
  return key.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/** Name row: muted "Name:" label, value in `text-fg`, edit on double-click. */
function ThemeNameFieldShell({
  stored,
  draftName,
  setDraftName,
  nameError,
  setNameError,
  commitName,
  onRevertDraft,
  readOnlyDisplay,
  heightClass = 'h-9',
  textSizeClass = 'text-body',
}: {
  stored: string
  draftName: string
  setDraftName: (value: string) => void
  nameError: boolean
  setNameError: (value: boolean) => void
  commitName: () => void
  onRevertDraft: () => void
  readOnlyDisplay?: string
  heightClass?: string
  textSizeClass?: string
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const finishEdit = (commit: boolean) => {
    if (commit) commitName()
    else onRevertDraft()
    setEditing(false)
  }

  const borderClass = nameError ? 'border-status-danger/70' : 'border-line'
  const shellClass = `flex w-full min-w-0 items-center gap-2 border bg-transparent pl-3 pr-2 transition-[border-color,box-shadow] ${RAIL_SURFACE_RADIUS} ${heightClass} ${borderClass}`

  if (readOnlyDisplay) {
    return (
      <div className={shellClass}>
        <span className={`flex-shrink-0 font-medium text-fg-faint ${textSizeClass}`}>{t('Name')}:</span>
        <span className={`min-w-0 flex-1 truncate font-semibold text-fg ${textSizeClass}`}>{readOnlyDisplay}</span>
      </div>
    )
  }

  const displayName = draftName.trim() || stored

  return (
    <div
      className={`${shellClass} ${editing ? 'ring-2 ring-accent-ui/15 border-accent-ui/70' : 'hover:border-line-strong'}`}
      title={editing ? undefined : t('Double-click to rename')}
      onDoubleClick={() => {
        if (!editing) setEditing(true)
      }}
    >
      <span className={`flex-shrink-0 font-medium text-fg-faint ${textSizeClass}`}>{t('Name')}:</span>
      {editing ? (
        <input
          ref={inputRef}
          value={draftName}
          maxLength={48}
          aria-label={t('Brand name')}
          aria-invalid={nameError || undefined}
          onChange={(event) => { setDraftName(event.target.value); setNameError(false) }}
          onBlur={() => finishEdit(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              finishEdit(true)
              inputRef.current?.blur()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              onRevertDraft()
              setEditing(false)
            }
          }}
          className={`min-w-0 flex-1 bg-transparent py-0 font-semibold text-fg outline-none ${textSizeClass}`}
        />
      ) : (
        <span className={`min-w-0 flex-1 truncate font-semibold text-fg ${textSizeClass}`}>{displayName}</span>
      )}
    </div>
  )
}

/**
 * The theme's identity — one editable name — as the rail's pinned top band. It's
 * `THEME_BAND_H` because it sits on the SAME row as the canvas's view switcher (the
 * rail is a sibling of that header, not a child of the view below it), and a
 * different height there would break the line across the two columns.
 *
 * Export lives with GitHub and Figma in the workspace toolbar; keeping this
 * band name-only makes the label the single source of truth. Pinned rather
 * than scrolled: renaming the theme you're looking at shouldn't
 * be something you scroll a column of sliders back up to reach.
 */
export function ThemeIdentityBand({
  previewTheme,
  tryOnLabel,
}: {
  previewTheme: string
  /** The System Style currently being tried on, if any. While a try-on is live
   *  this band names THAT style and is read-only — the try-on holds no theme of
   *  its own, so `previewTheme` is still whichever built-in was selected and the
   *  field read "Dark" while the board rendered Core. Worse than confusing:
   *  typing in it renamed a theme that MY THEMES deliberately doesn't list. The
   *  name becomes editable the moment the style is real (Add to system, or the
   *  first-edit auto-adopt), which is also the first moment there is something
   *  for a name to belong to. */
  tryOnLabel?: string
}) {
  const { themeLabels, setThemeLabel } = useDesignStore()
  const stored = themeLabels[previewTheme] || defaultThemeLabel(previewTheme)
  const [draftName, setDraftName] = useState(stored)
  const [nameError, setNameError] = useState(false)
  useEffect(() => { setDraftName(stored) }, [stored])
  const commitName = () => {
    const next = draftName.trim()
    if (!next) { setNameError(true); return }
    setNameError(false)
    if (next !== stored) setThemeLabel(previewTheme, next)
  }
  const revertDraft = () => {
    setDraftName(stored)
    setNameError(false)
  }
  return (
    <div className="flex-shrink-0 flex items-center px-3" style={{ height: THEME_BAND_H }}>
      <ThemeNameFieldShell
        stored={stored}
        draftName={draftName}
        setDraftName={setDraftName}
        nameError={nameError}
        setNameError={setNameError}
        commitName={commitName}
        onRevertDraft={revertDraft}
        readOnlyDisplay={tryOnLabel}
      />
    </div>
  )
}

/**
 * Whether the system on screen matches its entry in My libraries. Save theme
 * (disabled + ✓ when true) reads this. It is NOT
 * `themeHasEdits` — that one means "differs from the style it was made from"
 * and drives Reset, a different question from "is this saved".
 */
export function useLibrarySaved(): boolean {
  return useLibraryStatus() === 'saved'
}

/**
 * The theme's name, editable in place — the canvas header's title. Same
 * commit rules as `ThemeIdentityBand` (blank is refused, Enter commits, Esc
 * reverts). While a System Style is only tried on, it shows that style's name
 * read-only: there is no theme of the user's yet for a name to belong to.
 * Callers key it on the theme so a draft never outlives the theme it was
 * typed for.
 */
export function ThemeNameField({ previewTheme, readOnlyLabel }: {
  previewTheme: string
  readOnlyLabel?: string
}) {
  const { themeLabels, setThemeLabel } = useDesignStore()
  const stored = themeLabels[previewTheme] || defaultThemeLabel(previewTheme)
  const [draftName, setDraftName] = useState(stored)
  const [nameError, setNameError] = useState(false)
  useEffect(() => { setDraftName(stored) }, [stored])
  if (readOnlyLabel) {
    return <span className="min-w-0 truncate px-2 text-ui font-semibold text-fg">{readOnlyLabel}</span>
  }
  const commitName = () => {
    const next = draftName.trim()
    if (!next) { setNameError(true); return }
    setNameError(false)
    if (next !== stored) setThemeLabel(previewTheme, next)
  }
  const revertDraft = () => {
    setDraftName(stored)
    setNameError(false)
  }
  return (
    <div className="min-w-0 max-w-[min(100%,28rem)] flex-1">
      <ThemeNameFieldShell
        stored={stored}
        draftName={draftName}
        setDraftName={setDraftName}
        nameError={nameError}
        setNameError={setNameError}
        commitName={commitName}
        onRevertDraft={revertDraft}
        heightClass="h-8"
        textSizeClass="text-ui"
      />
    </div>
  )
}

/** Mask that dissolves a solid `--tab-bar` fill. A gradient *color*
 *  toward `transparent` interpolates to transparent BLACK (Tailwind v4
 *  does this `in oklab`), which leaves a 1px lighter seam on the opaque
 *  edge — the gap sitting on this fade's top. Masking keeps every visible
 *  pixel the chrome colour; only coverage fades.
 *
 *  Coverage starts well under 1 so the edge is a whisper, not a slab —
 *  no solid hold, ~20px tall. A 14px opaque band + `h-11` read as a
 *  second header over Color edition. */
const RAIL_EDGE_MASK = (toward: 'bottom' | 'top') =>
  `linear-gradient(to ${toward}, rgb(0 0 0 / 0.38), transparent)`

/** Edge fades on a rail scroll body. The rail is `WORKSPACE_CHROME`
 *  (`bg-tab-bar`); dissolving from `--app` painted a darker bar over the first
 *  row — the same mismatch ThemeCodeFormat already documents. Top only after
 *  content has scrolled under the pinned band; bottom only while more remains
 *  below. Neither edge paints when the column does not overflow. */
export function ThemeRailScrollRegion({
  children,
  className = '',
  padClass = 'px-3 py-3',
}: {
  children: React.ReactNode
  className?: string
  padClass?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const sync = () => {
      const overflow = el.scrollHeight - el.clientHeight > 2
      setEdges({
        top: overflow && el.scrollTop > 1,
        bottom: overflow && el.scrollTop + el.clientHeight < el.scrollHeight - 2,
      })
    }
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    const content = el.firstElementChild
    if (content) ro.observe(content)
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [])

  const fade = (edge: 'top' | 'bottom', on: boolean) => (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 h-5 transition-opacity duration-150 ${
        edge === 'top' ? '-top-px' : '-bottom-px'
      } ${on ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: 'var(--tab-bar)',
        WebkitMaskImage: RAIL_EDGE_MASK(edge === 'top' ? 'bottom' : 'top'),
        maskImage: RAIL_EDGE_MASK(edge === 'top' ? 'bottom' : 'top'),
      }}
    />
  )

  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      {fade('top', edges.top)}
      <div ref={scrollRef} className={`h-full min-h-0 overflow-y-auto overflow-x-hidden ${padClass}`}>
        {children}
      </div>
      {fade('bottom', edges.bottom)}
    </div>
  )
}

export function Chevron({ open }: { open: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-fg-faint transition-[transform,color] group-hover/row:text-fg ${open ? 'rotate-180' : ''}`} aria-hidden><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function InfoIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden><circle cx="8" cy="8" r="5.75" /><path d="M8 7.25v3.4M8 5.1h.01" /></svg>
}

function AdvancedIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden><path d="M2.5 4h6M11.5 4h2M2.5 8h2M7.5 8h6M2.5 12h7M12.5 12h1" /><circle cx="10" cy="4" r="1.4" /><circle cx="6" cy="8" r="1.4" /><circle cx="11" cy="12" r="1.4" /></svg>
}

function CutFacts({ rows }: { rows: { label: string; value: string }[] }) {
  const { t } = useI18n()
  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <li key={row.label} className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-caption text-fg">{t(row.label)}</span>
          <span className="flex-shrink-0 font-mono text-mini tabular-nums text-fg-muted">{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * SPACING MODE — four ready-made densities in a 2×2 grid, laid out as the two
 * axes they are: the top row is how much room (Compact · Airy), the bottom how
 * much weight (Quiet · Bold). Each tile draws its own mode — a card whose inset,
 * control height and stroke are that mode's real values, scaled — so the choice
 * is visible before it is made. The selection is READ from the tokens
 * (`matchSpacingMode`): edit a value elsewhere and no tile is lit.
 */
/** Card padding as the box it is: a card drawn with its four padding bands at
 *  their real proportions, each band naming its px. Click a band to edit that
 *  side, the middle to edit all four, and drag the slider under it. A side left
 *  following the middle reads faint; one set by hand reads in the accent, with
 *  "Match all" to send it back. Writes `inset-surface` and its
 *  `-top · -right · -bottom · -left` sides (Variables · Spacing). */
function InsetSidesCard({ spacing, spacingRoles, onBase, onSide, onScrubStart, onScrubEnd }: {
  spacing: Record<string, string>
  spacingRoles: Record<string, string> | undefined
  onBase: (step: string) => void
  onSide: (side: InsetSide, step: string | undefined) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}) {
  const { t } = useI18n()
  const [target, setTarget] = useState<'all' | InsetSide>('all')
  const isStep = (step: string | undefined): step is SpacingStep => !!step && SPACING_STEPS.includes(step as SpacingStep)
  const pxOf = (step: string) => parseFloat(spacing[step] ?? '') || Number(step.replace('_', '.')) * 4
  const base = spacingRoles?.[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP
  const baseStep: SpacingStep = isStep(base) ? base : PADDING_DEFAULT_STEP
  const own = (side: InsetSide) => {
    const step = spacingRoles?.[insetSideKey(INSET_SURFACE_ROLE, side)]
    return isStep(step) ? step : undefined
  }
  const stepOf = (side: InsetSide) => own(side) ?? baseStep
  const label: Record<InsetSide, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' }
  // Drawn band = 18px floor (room for its label) + a quarter of the real px,
  // capped at 64 — enough that 0 → 64 visibly grows without crushing the middle.
  const band = (side: InsetSide) => 18 + Math.min(pxOf(stepOf(side)), 64) / 4
  const editing = target === 'all' ? baseStep : stepOf(target)
  const sideButton = (side: InsetSide) => {
    const selected = target === side
    const custom = own(side) !== undefined
    const vertical = side === 'top' || side === 'bottom'
    return (
      <button
        key={side}
        type="button"
        aria-pressed={selected}
        aria-label={`${t('Edit')} ${t(label[side]).toLowerCase()} — ${pxOf(stepOf(side))}px${custom ? '' : `, ${t('follows all sides')}`}`}
        onClick={() => setTarget(selected ? 'all' : side)}
        className={`absolute flex items-center justify-center rounded-[5px] text-mini tabular-nums transition-[inset,width,height,background-color,color] duration-200 ease-[var(--ease-out-quint)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${selected ? 'bg-accent-solid/20 text-fg' : `hover:bg-fg/[0.06] ${custom ? 'text-accent-ui' : 'text-fg-faint hover:text-fg-muted'}`}`}
        style={vertical
          ? { left: band('left'), right: band('right'), [side]: 0, height: band(side) }
          : { top: band('top'), bottom: band('bottom'), [side]: 0, width: band(side) }}
      >
        {pxOf(stepOf(side))}
      </button>
    )
  }
  return (
    <div>
      <div className="relative h-28 rounded-[10px] border border-line-strong bg-surface">
        {(['top', 'right', 'bottom', 'left'] as const).map(sideButton)}
        <button
          type="button"
          aria-pressed={target === 'all'}
          aria-label={`${t('Edit all sides')} — ${pxOf(baseStep)}px`}
          onClick={() => setTarget('all')}
          className={`absolute flex flex-col items-center justify-center gap-0.5 rounded-[6px] border transition-[inset,background-color,border-color] duration-200 ease-[var(--ease-out-quint)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${target === 'all' ? 'border-accent-ui/60 bg-accent-solid/15' : 'border-dashed border-line-strong bg-fg/[0.04] hover:bg-fg/[0.07]'}`}
          style={{ top: band('top'), right: band('right'), bottom: band('bottom'), left: band('left') }}
        >
          <span className="text-micro uppercase tracking-[0.12em] text-fg-faint">{t('All sides')}</span>
          <span className="text-ui tabular-nums text-fg">{pxOf(baseStep)}px</span>
        </button>
      </div>
      <div className={`${ROW_GAP_CONTROL} flex items-baseline justify-between gap-2`}>
        <span className="text-micro uppercase tracking-[0.12em] text-fg-faint">
          {t('Editing')} {target === 'all' ? t('all sides') : t(label[target]).toLowerCase()}
        </span>
        {target !== 'all' && (own(target) !== undefined
          ? <button type="button" onClick={() => onSide(target, undefined)} className="rounded text-micro text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">{t('Match all')}</button>
          : <span className="text-micro text-fg-faint">{t('Follows all sides')}</span>)}
      </div>
      <DotSlider
        ariaLabel={target === 'all' ? 'Card padding, all sides' : `Card padding ${label[target].toLowerCase()}`}
        stops={SPACING_STEPS.map((_, i) => i)}
        value={SPACING_STEPS.indexOf(editing)}
        format={(i) => `${pxOf(SPACING_STEPS[i])}px`}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
        onChange={(i) => {
          const step = SPACING_STEPS[i]
          if (target === 'all') onBase(step)
          // Landing a side on the middle value hands it back to the middle,
          // so "set by hand" only ever means "different from all sides".
          else onSide(target, step === baseStep ? undefined : step)
        }}
        className="mt-1"
      />
    </div>
  )
}

function SpacingModeGrid({ value, spacing, sizes, stroke, onChange }: {
  value: SpacingMode['id'] | null
  /** The theme's own scale, so a drawn inset is the px it will really be. */
  spacing: Record<string, string>
  sizes: Record<string, string>
  stroke: Record<string, string> | undefined
  onChange: (mode: SpacingMode) => void
}) {
  const { t } = useI18n()
  const order: SpacingMode['id'][] = ['compact', 'quiet', 'airy', 'bold']
  const insetPx = (step: string) => parseFloat(spacing[step] ?? '') || Number(step) * 4
  const current = SPACING_MODES.find((m) => m.id === value)
  return (
    <div>
      <PickerField
        label="Mode"
        ariaLabel="Spacing mode"
        value={value ?? ''}
        valueLabel={t('Custom')}
        leading={current
          ? <SpacingModeGlyph size="sm" fieldBase={current.fieldBase} insetPx={insetPx(current.insetStep)} border={current.border} />
          : <SpacingModeGlyph size="sm" fieldBase={inferSizeBase(sizes) ?? SIZE_DEFAULT_BASE} insetPx={12} border={parseFloat(stroke?.sm ?? '1') || 1} />}
        options={order.map((id) => {
          const mode = SPACING_MODES.find((m) => m.id === id)!
          return {
            value: id,
            label: mode.label,
            description: `${t('Field')} ${Math.round(mode.fieldBase * 10)} · ${t('Card')} ${insetPx(mode.insetStep)} · ${t('Border')} ${mode.border}`,
          }
        })}
        optionVisual={(id, selected) => {
          const mode = SPACING_MODES.find((m) => m.id === id)!
          return <SpacingModeGlyph fieldBase={mode.fieldBase} insetPx={insetPx(mode.insetStep)} border={mode.border} selected={selected} />
        }}
        info={<InfoHint>{t("Four ready-made densities. Each sets field size, card padding and border width together; Custom means they were set by hand. Ordinary tokens, still editable in Variables.")}</InfoHint>}
        onChange={(id) => {
          const mode = SPACING_MODES.find((m) => m.id === id)
          if (mode) onChange(mode)
        }}
      />
    </div>
  )
}

function ColorAppearanceSwitch({ value, onChange, lockedTo }: {
  value: ThemeAppearance
  onChange: (appearance: ThemeAppearance) => void
  /** Free: the one theme this brand ships. The other segment is a lock. */
  lockedTo?: ThemeAppearance
}) {
  const { t } = useI18n()
  const group = useId()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  return (
    // Named, so it is not read as a second "which themes ship" control: this
    // one only picks which of the shipped themes the board is painted in.
    <div className="flex w-full items-center justify-between gap-2">
    <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Previewing')}</span>
    <div
      className={`flex h-8 flex-shrink-0 items-center rounded-lg p-0.5 ${CHROME_CONTROL_SHELL}`}
      role="group"
      aria-label={t('Preview appearance')}
      title={t('Choose which theme of this brand the artefacts display.')}
    >
      {(['light', 'dark'] as const).map((mode) => {
        const locked = Boolean(lockedTo && mode !== lockedTo)
        return (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          aria-label={locked ? `${t(mode === 'light' ? 'Light' : 'Dark')} — ${t('Upgrade to Pro')}` : undefined}
          title={locked ? t('Upgrade to Pro') : undefined}
          onClick={() => (locked ? setUpgradeOpen(true) : onChange(mode))}
          // Same pill as Desktop / Tablet / Mobile (`ViewportSwitch`): one
          // control language for every segmented switch in an edition header.
          className={`relative flex h-7 items-center justify-center rounded-md px-2.5 text-caption transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
            locked ? 'text-fg-faint' : value === mode ? SEGMENT_ACTIVE_INK : SEGMENT_INACTIVE
          }`}
        >
          {!locked && value === mode && <SegmentHighlight group={group} />}
          <span className="relative flex items-center gap-1">
            {locked && <LockGlyph size={12} />}
            {t(mode === 'light' ? 'Light' : 'Dark')}
          </span>
        </button>
        )
      })}
    </div>
    <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}

function RailTooltip({ children, label, tooltipId, clickOnly = false }: { children: React.ReactNode; label: string; tooltipId: string; clickOnly?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const updatePosition = useCallback(() => {
    const rect = anchor.current?.getBoundingClientRect()
    if (!rect) return
    // The quick-settings body owns scrolling and must clip its content. Render
    // the tooltip above that viewport instead of weakening the rail's scroll
    // mask — otherwise every hint gets cut off as soon as its row is hovered.
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - 200, rect.right - 192)),
      top: rect.bottom + 6,
    })
  }, [])
  const hide = () => setPosition(null)

  useEffect(() => {
    if (!position) return
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [position, updatePosition])
  // Like HintTip: scrolling the rail hides the hint instead of dragging it.
  useCloseOnAnchorScroll(position != null, anchor, hide)

  useEffect(() => {
    if (!clickOnly || !position) return
    const onPointerDown = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) hide()
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') hide() }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [clickOnly, position])

  return (
    <>
      <span
        ref={anchor}
        className="inline-flex"
        onMouseEnter={clickOnly ? undefined : updatePosition}
        onMouseLeave={clickOnly ? undefined : hide}
        onFocus={clickOnly ? undefined : updatePosition}
        onBlur={hide}
        onClick={clickOnly ? () => { if (position) hide(); else updatePosition() } : undefined}
      >
        {children}
      </span>
      {position && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[70] w-[192px] rounded-md border border-line-strong bg-app px-2.5 py-2 text-mini leading-relaxed text-fg-muted shadow-lg"
          style={position}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  )
}

function HeaderAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      // 27px (`h-6` at this 18px root), not 31.5 — still over WCAG 2.5.8's
      // 24px floor, and a header action sitting beside an 11px caption should
      // not be the tallest thing in the row.
      className="grid h-6 w-6 place-items-center rounded-md text-fg-faint transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
    >
      {children}
    </button>
  )
}

function InfoHint({ children }: { children: string }) {
  const id = useId()
  return (
    <RailTooltip label={children} tooltipId={id} clickOnly>
      <button
        type="button"
        aria-label={`About this setting: ${children}`}
        aria-describedby={id}
        className="grid h-6 w-6 place-items-center rounded-md text-fg-faint transition-colors duration-150 hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
      >
        <InfoIcon />
      </button>
    </RailTooltip>
  )
}

/**
 * Foundations that have a Theme Preview widget. `spacing` stays Variables-only.
 * Grid is the frame cut (columns / gutter / margin) — Desktop vs Mobile, same
 * session `previewViewport` Type and Size read. `icons` is Style edition
 * (icon weight + status action). Adding a panel means adding its key here
 * and a matching `EditionCard` below, nowhere else.
 */
export const QUICK_PANEL_FOUNDATIONS = ['color', 'typography', 'radius', 'sizes', 'shadow', 'icons', 'motion'] as const
export type QuickPanelFoundation = (typeof QUICK_PANEL_FOUNDATIONS)[number]

export function isQuickPanelFoundation(key: string): key is QuickPanelFoundation {
  return (QUICK_PANEL_FOUNDATIONS as readonly string[]).includes(key)
}

/** Widget the Preview rail should light — Color when the Variables table has no twin. */
export function previewWidgetKey(key: string): QuickPanelFoundation {
  return isQuickPanelFoundation(key) ? key : 'color'
}


type ColorChipId = 'accent' | 'neutral' | StateRole | BrandExtraRank

/**
 * Integration-rail card — Connection / Protocol. `bg-app` on `WORKSPACE_CHROME`
 * is the boundary (no extra border). Theme Preview edition does not use this.
 */
export function RailCard({ title, trailing, footer, flush, children }: {
  title: string
  /** Header slot — unused by Theme Preview edition. */
  trailing?: React.ReactNode
  footer?: React.ReactNode
  /** No row rules, Regular title. */
  flush?: boolean
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <section aria-label={t(title)} className={`min-w-0 overflow-visible bg-app ${RAIL_SURFACE_RADIUS}`}>
      <div className="flex min-h-8 items-center justify-between gap-2 px-3 pt-2 pb-1.5">
        <span className={`min-w-0 truncate text-caption text-fg ${flush ? 'font-normal' : 'font-semibold'}`}>{t(title)}</span>
        {trailing}
      </div>
      <div className={flush ? undefined : 'divide-y divide-line'}>{children}</div>
      {footer}
    </section>
  )
}

/** The inspector band for the Theme panel (Figma 1:6886): the panel's name and
 *  the door to the list of editions, or — in that list — the way back. */
function PanelHeader({ editing, title, name, onEdit, onBack }: {
  editing: boolean
  title: string
  /** The brand's name field. It takes the title's place at rest, so the
   *  panel is headed by WHAT is being edited instead of the word "Theme". */
  name?: ReactNode
  onEdit?: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  // The band already insets (60px − 2.5rem) / 2 on each side; 0.25rem more
  // lands it on `--inspector-inset` = (60px − 2rem) / 2, the space above and
  // below the field — so the header's sides match its top and bottom, and
  // every row below.
  return (
    <div className="flex w-full min-w-0 items-center gap-2 px-1">
      {editing && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('Back')}
          className="-ml-1.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg transition-colors hover:bg-fg/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 8H3M7 4 3 8l4 4" />
          </svg>
        </button>
      )}
      {!editing && name
        ? <div className="flex min-w-0 flex-1">{name}</div>
        : <span className="min-w-0 flex-1 truncate text-title text-fg">{title}</span>}
      {!editing && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="-mr-2 flex h-9 flex-shrink-0 items-center gap-2 rounded-lg px-2 text-strong font-medium text-fg transition-colors hover:bg-fg/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Edit')}
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
            <path d="M4 3v5M4 12v5M10 3v2M10 9v8M16 3v8M16 15v2" />
            <circle cx="4" cy="10" r="2" />
            <circle cx="10" cy="7" r="2" />
            <circle cx="16" cy="13" r="2" />
          </svg>
        </button>
      )}
    </div>
  )
}

/** Header → Edit: every edition in one list (glyph · name · chevron). Picking
 *  one opens its row in the accordion and returns there. */
const EDIT_LIST: { key: QuickPanelFoundation; title: string }[] = [
  { key: 'color', title: 'Color' },
  { key: 'typography', title: 'Font' },
  { key: 'radius', title: 'Radius' },
  { key: 'shadow', title: 'Shadow' },
  { key: 'sizes', title: 'Spacing' },
  { key: 'icons', title: 'Icons' },
  { key: 'motion', title: 'Motion' },
]

function EditList({ active, locked, onPick }: {
  active: string
  locked: boolean
  onPick: (key: QuickPanelFoundation) => void
}) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('Editions')} className="flex flex-col px-[var(--inspector-inset)]">
      {EDIT_LIST.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onPick(item.key)}
          disabled={locked && item.key !== active}
          aria-current={item.key === active ? 'true' : undefined}
          className="group flex h-[52px] w-full items-center gap-3 border-b border-line text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
        >
          <FoundationGlyph id={item.key} className="h-[18px] w-[18px] flex-shrink-0 text-fg-muted group-hover:text-fg" />
          <span className="min-w-0 flex-1 truncate text-strong text-fg">{t(item.title)}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg-faint group-hover:text-fg">
            <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
          </svg>
        </button>
      ))}
    </nav>
  )
}

/** Set by the rail when its host can switch editions. `locked` is guided
 *  setup: every row stays listed, and only the current step opens.
 *  Null (an embed with no switcher) leaves the row headers static. */
const EditionSwitchContext = createContext<{
  select: (key: QuickPanelFoundation) => void
  locked?: boolean
  /** Every row folded: the open row's header was clicked. `activePanel`
   *  stays put (the board and icon rail keep following it); only the
   *  accordion closes. Any row click opens it again. */
  collapsed?: boolean
  setCollapsed?: (collapsed: boolean) => void
} | null>(null)

/**
 * One foundation's quick panel: title, widgets, and the door to Variables.
 *
 * The "Go to advanced edition" button is `selectFoundation` in disguise —
 * `setActiveFoundation(key)` + switch to the Variables tab — so arriving there
 * lands on the very foundation you were adjusting. Color edition puts Light/
 * Dark in that header slot (the board + ramps share one appearance). Random
 * lives on the guest previewer and the Random-create save bar — never here.
 *
 * Sits on `WORKSPACE_CHROME`. Do not wrap this in `RailCard` — that `--app`
 * fill is for the integration rail's Connection / Protocol blocks.
 */
/**
 * One row of the quick-settings accordion: glyph · name · what it holds now ·
 * chevron. Every foundation is listed at once so the whole system reads at a
 * glance (`summary`), and only the open row shows its controls. One row is
 * always open — it is `activePanel`, the same key the icon rail and the board
 * already follow, so the accordion cannot disagree with them.
 */
function ResetRowGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.7-3.97" />
      <path d="M2.2 3.2v3.1h3.1" />
    </svg>
  )
}

function EditionRowHeader({ title, foundationKey, summary, open, panelId, onReset, resetTarget, action }: {
  /** A tool for the open row (Color: show all colours), beside Reset. */
  action?: React.ReactNode
  title: string
  foundationKey: string
  summary?: React.ReactNode
  open: boolean
  panelId: string
  /** Set only while this row differs from what Reset restores. */
  onReset?: () => void
  /** What the row goes back to ("Core", "System defaults"). */
  resetTarget?: string
}) {
  const { t } = useI18n()
  const ctx = useContext(EditionSwitchContext)
  const locked = !open && Boolean(ctx?.locked)
  const interactive = Boolean(ctx) && !open
  // Rows are names, not icons (Figma 1:6895): the glyphs live in the Edit
  // list (header → Edit). The open row is the section title over its controls;
  // clicking it folds the accordion.
  if (open) {
    // Per-row Reset: shown only while the row moved off its origin, so its
    // presence alone says "edited". It sits beside the chevron, outside the
    // fold button (a button cannot hold a button). The title row reserves its
    // width so the title never runs under it.
    const reset = onReset ? (
      <button
        type="button"
        onClick={onReset}
        aria-label={`${t('Reset')} ${t(title)} — ${t(resetTarget ?? 'System defaults')}`}
        title={`${t('Reset')} ${t(title)} — ${t(resetTarget ?? 'System defaults')}`}
        className="absolute right-[calc(var(--inspector-inset)+1.5rem)] top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-fg-faint transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
      >
        <ResetRowGlyph />
      </button>
    ) : null
    // The row's own tool sits left of Reset (or where Reset would be).
    const tool = action ? (
      <span className={`absolute top-1/2 -translate-y-1/2 ${onReset ? 'right-[calc(var(--inspector-inset)+3.25rem)]' : 'right-[calc(var(--inspector-inset)+1.5rem)]'}`}>{action}</span>
    ) : null
    // The tools float over the header (a button cannot hold a button); the
    // title keeps clear of them so it never runs underneath.
    const clear = onReset && action ? 'mr-[3.25rem]' : onReset || action ? 'mr-[1.75rem]' : ''
    const title_ = <span className={`min-w-0 flex-1 truncate text-left text-strong font-medium text-fg ${clear}`}>{t(title)}</span>
    if (!ctx?.setCollapsed) {
      return (
        <div className="relative">
          <div className="flex h-12 w-full items-center gap-3 px-[var(--inspector-inset)]" aria-expanded={ctx ? open : undefined} aria-controls={ctx ? panelId : undefined}>
            {title_}
            <Chevron open />
          </div>
          {tool}
          {reset}
        </div>
      )
    }
    return (
      <div className="relative">
        <button
          type="button"
          aria-expanded
          aria-controls={panelId}
          onClick={() => ctx.setCollapsed?.(true)}
          className={`group/row flex h-12 w-full items-center gap-3 px-[var(--inspector-inset)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50`}
        >
          {title_}
          <Chevron open />
        </button>
        {tool}
        {reset}
      </div>
    )
  }
  const inner = (
    <>
      <span className="min-w-0 flex-1 truncate text-left text-ui text-fg-muted transition-colors group-hover/row:text-fg group-disabled/row:text-fg-muted">{t(title)}</span>
      {summary != null && <span className="flex min-w-0 max-w-[50%] flex-shrink-0 items-center justify-end gap-1.5 truncate text-caption tabular-nums text-fg-faint">{summary}</span>}
      {locked ? <LockGlyph /> : <Chevron open={open} />}
    </>
  )
  const shell = 'flex h-12 w-full items-center gap-3 px-[var(--inspector-inset)]'
  if (!interactive) {
    return <div className={shell} aria-expanded={ctx ? open : undefined} aria-controls={ctx ? panelId : undefined}>{inner}</div>
  }
  return (
    <button
      type="button"
      aria-expanded={false}
      aria-controls={panelId}
      disabled={locked}
      title={locked ? t('Finish customizing your brand to see full Variables and Docs.') : undefined}
      onClick={() => { ctx?.setCollapsed?.(false); ctx?.select(foundationKey as QuickPanelFoundation) }}
      className={`group/row ${shell} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {inner}
    </button>
  )
}

/** An edition's body, unfolding from its header: height + fade on the way
 *  in, quicker on the way out. Its own component so every opening starts
 *  CLIPPED (a body mounting at height 0 must not spill for a frame) and lets
 *  go of the clip once it lands — popovers and focus rings inside are never
 *  cut at rest. */
export function EditionBody({ id, children }: { id: string; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  const [moving, setMoving] = useState(!reduce)
  return (
    <motion.div
      id={id}
      initial={reduce ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      onAnimationStart={() => setMoving(true)}
      onAnimationComplete={() => setMoving(false)}
      style={{ overflow: moving ? 'hidden' : 'visible' }}
    >
      {children}
    </motion.div>
  )
}

function EditionCard({ title, foundationKey, open = true, summary, trailing, footer, flush, onOpenAdvanced, advancedDisabled = false, showAdvancedEdition = true, onReset, resetTarget, action, children }: {
  /** A tool on the open row's header, beside Reset. */
  action?: React.ReactNode
  title: string
  foundationKey: string
  /** Accordion state. A closed row shows only its header. */
  open?: boolean
  /** The row's current value, shown on its header (accent hex, font, preset). */
  summary?: React.ReactNode
  /** Header slot — Color edition puts Light/Dark here. */
  trailing?: React.ReactNode
  /** Replaces the default Advanced footer. */
  footer?: React.ReactNode
  /** No row rules — Color edition groups with its own hairlines. */
  flush?: boolean
  onOpenAdvanced: (foundationKey: string) => void
  /** Guided setup keeps you on the board: the advanced edition waits until
   *  the theme is finished. */
  advancedDisabled?: boolean
  /** Hides the door to the advanced edition (Variables). */
  showAdvancedEdition?: boolean
  /** Row Reset, passed only while the row differs from its origin. */
  onReset?: () => void
  resetTarget?: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const panelId = `quick-edition-${foundationKey}`
  const ctx = useContext(EditionSwitchContext)
  open = open && !ctx?.collapsed
  const sectionRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(open)
  const reduce = useReducedMotion()
  // A row opened from its header lands in view: once the row above has folded
  // and this one has unfolded (EditionBody, 0.26s), the rail scrolls just
  // enough to show the whole row, never past its header. Without it a row
  // low in the list (Radius, Motion) opened under the panel's footer.
  useEffect(() => {
    const opened = open && !wasOpen.current
    wasOpen.current = open
    if (!opened) return
    const timer = window.setTimeout(() => {
      const section = sectionRef.current
      if (!section) return
      let scroller = section.parentElement
      while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
      if (!scroller) return
      const view = scroller.getBoundingClientRect()
      const row = section.getBoundingClientRect()
      const below = row.bottom - view.bottom
      const above = row.top - view.top
      const delta = above < 0 ? above : below > 0 ? Math.min(below, above) : 0
      if (delta) scroller.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' })
    }, reduce ? 0 : 280)
    return () => window.clearTimeout(timer)
  }, [open, reduce])
  return (
    <section ref={sectionRef} aria-label={t(title)} className="min-w-0 overflow-visible border-b border-line">
      <EditionRowHeader title={title} foundationKey={foundationKey} summary={summary} open={open} panelId={panelId} onReset={onReset} resetTarget={resetTarget} action={action} />
      {/* The body unfolds from its header and folds back into it: height +
          fade (`EditionBody`). */}
      <AnimatePresence initial={false}>
      {open && (
      <EditionBody id={panelId} key="body">
      {trailing && (
        <div className="flex justify-end border-b border-line px-[var(--inspector-inset)] py-2">
          {trailing}
        </div>
      )}
      <div className={flush ? '[&>:first-child>:first-child]:pt-0' : 'divide-y divide-line [&>:first-child]:pt-0'}>{children}</div>
      {footer !== undefined
        ? footer
        : showAdvancedEdition ? (
          // A way OUT of the row, so it reads as a link, not as one more
          // control: no box, faint ink, under the row's last setting.
          <div className="px-[var(--inspector-inset)] pb-[var(--inspector-inset)]">
            <button
              type="button"
              onClick={() => onOpenAdvanced(foundationKey)}
              disabled={advancedDisabled}
              title={advancedDisabled ? t('Available once the brand is finished') : undefined}
              className="-ml-1.5 inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-mini font-medium text-fg-faint transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg-faint"
            >
              <AdvancedIcon />
              {t('Go to advanced edition')}
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : null}
      </EditionBody>
      )}
      </AnimatePresence>
    </section>
  )
}

const CONTRAST_THUMB_STEPS = [3, 9, 12] as const

function ContrastGridThumb({ tones, className = 'size-7 rounded-[5px]' }: { tones: readonly string[]; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid flex-shrink-0 grid-cols-3 gap-px overflow-hidden bg-line ${className}`}
    >
      {tones.flatMap((bg, col) =>
        tones.map((fg, row) => (
          <span
            key={`${row}-${col}`}
            className="min-h-0 min-w-0"
            style={{
              background: `linear-gradient(${fg}, ${fg}) center / 45% 45% no-repeat, ${bg}`,
            }}
          />
        )),
      )}
    </span>
  )
}

/** The ONE label line over a wide control (a slider, a diagram): the name in
 *  muted ink on the left, the current value in full ink on the right. Every
 *  stepped control in the panel heads itself with this, so "Text scale",
 *  "Border width", "Saturation" and Radius' axes read as one family. */
const SLIDER_LABEL = 'min-w-0 truncate text-caption font-medium text-fg-muted'
const SLIDER_VALUE = 'flex-shrink-0 text-caption tabular-nums text-fg'

function SettingItem({ label, value, hint, advancedLabel, onAdvanced, children }: {
  label?: string
  /** The current value, read out on the label line (right-aligned). */
  value?: React.ReactNode
  hint?: string
  advancedLabel?: string
  onAdvanced?: () => void
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const compact = !label
  const trailing = (hint || (advancedLabel && onAdvanced)) ? (
    // `-my-1` lets the 27px buttons overhang the 16px label line instead of
    // setting the row's height. Without it a hinted row's label sits ~5px
    // further from its control than an unhinted one's — invisible alone, and
    // exactly the kind of drift that makes a stack of six cards read as
    // hand-placed. The overhang stays inside the row's own top padding.
    <span className="-my-1 flex flex-shrink-0 items-center gap-0.5">
      {hint ? <InfoHint>{t(hint)}</InfoHint> : null}
      {advancedLabel && onAdvanced ? <HeaderAction label={t(advancedLabel)} onClick={onAdvanced}><AdvancedIcon /></HeaderAction> : null}
    </span>
  ) : null

  if (compact && hint && !advancedLabel) {
    return (
      <div className={RAIL_BLOCK}>
        <div className="flex items-start gap-2">
          {trailing}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    )
  }

  const hasHeader = Boolean(label || trailing)
  return (
    <div className={RAIL_BLOCK}>
      {hasHeader && (
        // No `min-h` — the header is one label line tall, full stop. It was
        // `min-h-7` (31.5px) to reserve room for the trailing buttons, i.e.
        // 15px of air bought for a control most rows don't have; the buttons
        // now overhang the line instead (see `trailing`), so every row's
        // label→control gap is the same whether it carries a hint or not.
        <div className={`flex items-center gap-2 ${compact ? 'mb-1 justify-end' : 'mb-1.5 justify-between'}`}>
          {/* `text-fg-muted`, one step under the card title's `text-fg`. Both
              were 11px on `--fg` and differed only by semibold-vs-medium, which
              at 11px is not a legible difference — "Font edition" and "Body
              font" read as siblings, so the card's own panel was the only thing
              saying where a set started. Compacting made that worse, not
              better: less air between two levels that look identical is mush.
              Measured 6.2:1 on `--rail-section` (AA for small text; `fg-faint`
              would be 3.79 and is why the house eyebrow treatment is not the
              answer here). */}
          {label ? (
            <span className="flex min-w-0 items-center gap-0.5">
              <span className={SLIDER_LABEL}>{t(label)}</span>
              {/* The ⓘ follows the NAME, as it does on a picker row. */}
              {trailing}
            </span>
          ) : trailing}
          {label && value != null ? <span className={SLIDER_VALUE}>{value}</span> : null}
        </div>
      )}
      {children}
    </div>
  )
}

/** Thumb width — the pill has to hold the widest value (`None`, `1.5px`). */
const DOT_THUMB = '3.75rem'

/** The base units the Fields slider can land on: the accessibility floor, then
 *  every half pixel above it (3.6 → 4, 4.5, 5 — the range's own grid). */
const BASE_UNIT_STOPS = [
  BASE_UNIT_RANGE.min,
  ...Array.from(
    { length: Math.floor((BASE_UNIT_RANGE.max - BASE_UNIT_RANGE.min) / BASE_UNIT_RANGE.step) + 1 },
    (_, i) => Math.ceil(BASE_UNIT_RANGE.min / BASE_UNIT_RANGE.step + i) * BASE_UNIT_RANGE.step,
  ).filter((value) => value > BASE_UNIT_RANGE.min && value <= BASE_UNIT_RANGE.max),
]

/**
 * A stepped slider drawn as what it is: one dot per value the setting can
 * take, and a raised pill riding the dots with the current value written on it.
 * Same shell as `PickerField` (h-8 `bg-surface` well, 3px inset) so the rail's
 * controls read as one family. The thumb moves by `transform` on a rail exactly
 * the travel wide, so `translateX(r * 100%)` lands it on stop `r` with no layout.
 * That carrier box sticks out past the track by up to the travel, so the track
 * clips it (`overflow-hidden`) — otherwise it widens the rail and scrolls it
 * sideways. The thumb never leaves the 3px inset, so nothing visible is cut.
 */
/** Exported for the phone's Controls panel, so both speak one control. */
export function DotSlider({ stops, value, onChange, onScrubStart, onScrubEnd, format, renderValue, ariaLabel, className = '' }: {
  stops: readonly number[]
  value: number
  onChange: (value: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  /** The value as words — the thumb's text and what a screen reader hears. */
  format: (value: number) => string
  /** Richer thumb content than `format` (a glyph beside the text); aria still uses `format`. */
  renderValue?: (value: number) => ReactNode
  ariaLabel: string
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  const [dragging, setDragging] = useState(false)
  const last = stops.length - 1
  // Nearest stop, so a hand-edited value off the grid still seats the thumb.
  const index = stops.reduce((best, stop, i) => Math.abs(stop - value) < Math.abs(stops[best] - value) ? i : best, 0)
  const ratio = last > 0 ? index / last : 0
  const indexAt = (clientX: number) => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb || last === 0) return 0
    const rect = track.getBoundingClientRect()
    const travel = rect.width - 6 - thumb.offsetWidth
    const r = (clientX - rect.left - 3 - thumb.offsetWidth / 2) / travel
    return Math.max(0, Math.min(last, Math.round(r * last)))
  }
  const select = (i: number) => { if (i !== index) onChange(stops[i]) }
  const finish = () => { if (!dragging) return; setDragging(false); onScrubEnd?.() }
  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={stops[0]}
      aria-valuemax={stops[last]}
      aria-valuenow={stops[index]}
      aria-valuetext={format(stops[index])}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        onScrubStart?.()
        setDragging(true)
        select(indexAt(event.clientX))
      }}
      onPointerMove={(event) => { if (dragging) select(indexAt(event.clientX)) }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onKeyDown={(event) => {
        const next = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? index - 1
          : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? index + 1
          : event.key === 'Home' ? 0
          : event.key === 'End' ? last
          : null
        if (next === null) return
        event.preventDefault()
        select(Math.max(0, Math.min(last, next)))
      }}
      className={`group/dots relative h-8 cursor-ew-resize overflow-hidden touch-none select-none rounded-lg bg-surface transition-shadow duration-150 hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${className}`}
    >
      <div aria-hidden className="absolute inset-y-0 left-[3px]" style={{ width: `calc(100% - 6px - ${DOT_THUMB})` }}>
        {stops.map((stop, i) => (
          <span
            key={stop}
            className="absolute top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-faint/60"
            style={{ left: `calc(${last > 0 ? (i / last) * 100 : 0}% + ${DOT_THUMB} / 2)` }}
          />
        ))}
        <div
          className={`absolute inset-y-[3px] left-0 w-full transition-transform ease-[var(--ease-out-quint)] motion-reduce:transition-none ${dragging ? 'duration-150' : 'duration-200'}`}
          style={{ transform: `translateX(${ratio * 100}%)` }}
        >
          <span
            ref={thumbRef}
            className={`absolute inset-y-0 left-0 flex items-center justify-center rounded-[calc(0.5rem-3px)] bg-elevated text-ui font-medium tabular-nums text-fg transition-[box-shadow,scale] duration-150 motion-reduce:transition-none ${dragging ? 'scale-[0.97] shadow-[0_2px_8px_rgb(0_0_0/0.35),inset_0_0_0_1px_var(--line-strong)]' : 'shadow-[0_1px_3px_rgb(0_0_0/0.25),inset_0_0_0_1px_var(--line)]'}`}
            style={{ width: DOT_THUMB }}
          >
            {/* Drag affordance: ◂ ▸ at the pill's edges on hover, focus and drag. */}
            <svg width="4" height="6" viewBox="0 0 4 6" className={`absolute left-1 text-fg-faint transition-opacity duration-150 group-hover/dots:opacity-100 group-focus-visible/dots:opacity-100 ${dragging ? 'opacity-100' : 'opacity-0'}`}><path d="M4 0 0 3l4 3z" fill="currentColor" /></svg>
            <span key={stops[index]} className="dot-slider-value flex items-center gap-1">{renderValue ? renderValue(stops[index]) : format(stops[index])}</span>
            <svg width="4" height="6" viewBox="0 0 4 6" className={`absolute right-1 text-fg-faint transition-opacity duration-150 group-hover/dots:opacity-100 group-focus-visible/dots:opacity-100 ${dragging ? 'opacity-100' : 'opacity-0'}`}><path d="M0 0l4 3-4 3z" fill="currentColor" /></svg>
          </span>
        </div>
      </div>
    </div>
  )
}

/** A base-unit card whose preview uses the thing being sized: compact controls
 * for fields and actual square selectors. This keeps the ramp legible without
 * borrowing the generic analytics-bar language used by component libraries. */
function BaseUnitCard({
  steps, values, base, kind, onChange, onScrubStart, onScrubEnd, ariaLabel, usedStep,
}: {
  steps: readonly string[]
  values: Record<string, string>
  base: number | null
  kind: 'field' | 'selector'
  onChange: (base: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  ariaLabel: string
  /** Primitive this viewport cut actually aliases (`md` Control / `lg` Touch). */
  usedStep?: string
}) {
  const { t } = useI18n()
  const px = steps.map((step) => parseFloat(values[step] ?? '0') || 0)
  const smPx = px[steps.indexOf('sm')] ?? 0
  const mdPx = px[steps.indexOf('md')] ?? 0
  const peak = Math.max(...px, 1)
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div role="img" aria-label={`${kind === 'selector' ? 'Selector' : 'Field'} size scale preview`} className={`flex ${ROW_PREVIEW_H} min-w-0 flex-1 items-center justify-between gap-1`}>
          {px.map((value, index) => {
            const ratio = value / peak
            const used = !usedStep || usedStep === steps[index]
            return kind === 'selector' ? (
              <span
                key={steps[index]}
                className={`flex-shrink-0 rounded-[3px] border border-fg/55 bg-fg/10 ${used ? '' : 'opacity-[0.38]'}`}
                style={{ width: 8 + ratio * 10, height: 8 + ratio * 10 }}
              />
            ) : (
              <span
                key={steps[index]}
                className={`flex-shrink-0 rounded-[3px] border border-fg/45 bg-fg/10 ${used ? '' : 'opacity-[0.38]'}`}
                style={{ width: 10 + ratio * 12, height: 7 + ratio * 7 }}
              />
            )
          })}
        </div>
        <div className="text-right leading-none">
          <span className="block text-heading font-semibold tabular-nums text-fg">
            {base === null ? 'Custom' : base.toFixed(1)}
          </span>
          <span className="mt-1 block text-micro uppercase tracking-widest text-fg-faint">
            {base === null ? 'hand-edited' : 'Pixels'}
          </span>
        </div>
      </div>
      <div className={`${ROW_GAP_CONTROL} grid gap-x-1 text-center`} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step) => (
          <span key={step} className={`text-micro font-medium uppercase ${!usedStep || usedStep === step ? 'text-fg-faint' : 'text-fg-faint/40'}`}>{step}</span>
        ))}
        {steps.map((step) => (
          <span key={step} className={`text-mini tabular-nums ${!usedStep || usedStep === step ? 'text-fg-muted' : 'text-fg-faint/50'}`}>{px[steps.indexOf(step)]}</span>
        ))}
      </div>
      <DotSlider
        stops={BASE_UNIT_STOPS}
        value={base ?? BASE_UNIT_RANGE.min}
        format={(value) => value.toFixed(1)}
        onChange={onChange}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
        ariaLabel={ariaLabel}
        className={ROW_GAP_CONTROL}
      />
      {kind === 'field' && (
        <p className={`mt-1.5 text-micro leading-snug ${mdPx < SIZE_CONTROL_MIN_PX ? 'text-status-warning' : 'text-fg-faint'}`}>
          {mdPx < SIZE_CONTROL_MIN_PX
            ? t('Control height is {px}px — raise the base unit to {minBase} or above for {minPx}px.', {
              px: mdPx,
              minBase: FIELD_BASE_MIN.toFixed(1),
              minPx: SIZE_CONTROL_MIN_PX,
            })
            : t('SM {sm}px · Control {md}px (base × 8 and × 10).', { sm: smPx, md: mdPx })}
        </p>
      )}
    </div>
  )
}

/**
 * Radius as presets + THREE independent axes — Boxes / Fields / Selectors.
 *
 * This is the Figma plugin's own Radius step, drawn the same way, because the
 * quick edition is what the plugin executes: four ready-made presets in a 2×2
 * grid (corner sample · name · Boxes · Fields · Selectors px), and below them a
 * disclosure, "Fine-tune each corner", with one row per axis — the header
 * carries the resolved px ("Boxes · 16px"), the hint sits right, and a
 * `DotSlider` over the nine steps whose thumb draws the picked corner beside
 * its step name.
 *
 * The MODEL is DaisyUI's (`--radius-box` / `--radius-field` /
 * `--radius-selector`) over the roles this system ships, so the token contract
 * is unchanged. The ramp is not edited here: five steps meaning the same pixels
 * on every axis is what makes the axes comparable.
 */
const CORNER_MAX = 26 // the plugin caps the drawn arc so `full` stays a corner

/** The picked step's corner, drawn small on the slider thumb: an L of top +
 *  left border at the step's radius, scaled from the plugin's capped arc into
 *  a 10px box so `none` → `5xl` still read as square → round. */
function RadiusThumbCorner({ px }: { px: number }) {
  return (
    <span
      aria-hidden
      className="block h-2.5 w-2.5 flex-shrink-0 border-l-[1.5px] border-t-[1.5px] border-accent-ui"
      style={{ borderTopLeftRadius: (Math.min(px, CORNER_MAX) / CORNER_MAX) * 10 }}
    />
  )
}

function RadiusCard({
  radius, radiusRoles, radiusRoleViewports, platform, onRoles, onPreset, onScrubStart, onScrubEnd,
}: {
  radius: Record<string, string>
  radiusRoles: Record<string, string> | undefined
  /** Per-viewport overrides — what a Tablet / Mobile value reads first. */
  radiusRoleViewports: RadiusRoleViewports | undefined
  /** The platform heading the panel: every corner and px follows it. */
  platform: GridViewport
  onRoles: (next: Record<string, string>) => void
  /** Apply a preset — the three axis picks on the standard ramp. */
  onPreset: (label: string) => void
  /** Bracket a drag across an axis so it lands as ONE undo step. */
  onScrubStart?: () => void
  onScrubEnd?: () => void
}) {
  const { t } = useI18n()
  const matched = matchRadiusRolePreset(radiusRoles)
  // What each axis resolves to now, for the closed field's mark when no preset matches.
  const radiusPx = (key: string) => {
    const group = RADIUS_GROUPS.find((g) => g.key === key)
    return group ? Math.round(parseFloat(radius[radiusRoleAt(radiusRoles, radiusRoleViewports, group.roles[0], platform)] ?? '') || 0) : 0
  }
  return (
    <div className="flex flex-col gap-3">
      <PickerField
        label="Preset"
        ariaLabel="Radius preset"
        value={matched ?? ''}
        valueLabel={t('Custom')}
        leading={(() => {
          const preset = RADIUS_ROLE_PRESETS.find((p) => p.label === matched)
          const [boxes, fields, selectors] = preset ? radiusPresetPx(preset) : [radiusPx('boxes'), radiusPx('fields'), radiusPx('selectors')]
          return <RadiusPresetGlyph size="sm" boxes={boxes} fields={fields} selectors={selectors} />
        })()}
        options={RADIUS_ROLE_PRESETS.map((preset) => {
          const [boxes, fields, selectors] = radiusPresetPx(preset)
          return { value: preset.label, label: preset.label, description: `${boxes} · ${fields} · ${selectors}px` }
        })}
        optionVisual={(label, selected) => {
          const preset = RADIUS_ROLE_PRESETS.find((p) => p.label === label)!
          const [boxes, fields, selectors] = radiusPresetPx(preset)
          return <RadiusPresetGlyph boxes={boxes} fields={fields} selectors={selectors} selected={selected} />
        }}
        info={<InfoHint>{t("A preset sets boxes, fields and selectors together. The three sliders below round each one on its own.")}</InfoHint>}
        onChange={onPreset}
      />
      {/* The three axes ARE the radius: always on screen, never behind a
          Fine-tune. The preset above is a shortcut to three positions; when no
          preset matches, the field and the row header both read Custom, so no
          extra line is needed to say so. */}
      <div className="flex flex-col gap-3.5 border-t border-line pt-3">
        {RADIUS_GROUPS.map((group) => {
          const current = radiusAxisStep(group, radiusRoles)
          // What the axis resolves to on the platform shown — a per-viewport
          // override wins, otherwise the token's own step for that viewport.
          const atStep = radiusRoleAt(radiusRoles, radiusRoleViewports, group.roles[0], platform)
          const px = Math.round(parseFloat(radius[atStep] ?? '') || 0)
          const overridden = platform !== 'desktop' && group.roles.some((role) => radiusRoleViewports?.[platform]?.[role] != null)
          const stepPx = RADIUS_AXIS_STEPS.map((step) => Math.round(parseFloat(radius[radiusAtViewport(step, platform)] ?? '') || 0))
          return (
            <div key={group.key} className="min-w-0">
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-0.5">
                  <span className={SLIDER_LABEL}>{t(group.label)}</span>
                  <InfoHint>{overridden ? `${t(group.hint)}. ${t('Set by hand on')} ${t(platform)}.` : `${t('Used by')} ${t(group.hint)}.`}</InfoHint>
                </span>
                {/* A per-viewport value set by hand is a STATE, so it stays on
                    screen: the value turns accent, the ⓘ says why. */}
                <span className={`${SLIDER_VALUE} ${overridden ? '!text-accent-ui' : ''}`}>{current ?? t('Custom')} · {px}px</span>
              </div>
              <DotSlider
                ariaLabel={`${group.label} radius`}
                stops={RADIUS_AXIS_STEPS.map((_, i) => i)}
                // A Custom axis (its roles disagree) seats the thumb on the
                // step nearest what it resolves to, so a drag starts from there.
                value={current ? RADIUS_AXIS_STEPS.indexOf(current) : stepPx.reduce((best, stepValue, i) => Math.abs(stepValue - px) < Math.abs(stepPx[best] - px) ? i : best, 0)}
                format={(i) => `${RADIUS_AXIS_STEPS[i]} (${stepPx[i]}px)`}
                renderValue={(i) => <><RadiusThumbCorner px={stepPx[i]} />{RADIUS_AXIS_STEPS[i]}</>}
                onScrubStart={onScrubStart}
                onScrubEnd={onScrubEnd}
                onChange={(i) => onRoles(applyRadiusGroup(group, radiusRoles, RADIUS_AXIS_STEPS[i]))}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SAME_AS_LIGHT = 'same-as-light'

function ShadowCard({ shadows, shadowsDark, onChange, onChangeDark }: {
  shadows: Record<string, string>
  /** This theme's own dark ramp; undefined = Dark follows Light. */
  shadowsDark?: Record<string, string>
  onChange: (value: Record<string, string>) => void
  /** undefined puts Dark back on Light's derived twin. */
  onChangeDark: (value: Record<string, string> | undefined) => void
}) {
  const { t } = useI18n()
  const active = matchShadowPreset(shadows)
  // Light and Dark elevation behave differently (a dark page has almost no
  // room left to go darker), so Dark is its own pick. Its drawings are always
  // the dark twin — what the dark appearance will actually paint.
  const activeDark = shadowsDark ? matchDarkShadowPreset(shadowsDark) : SAME_AS_LIGHT
  const darkLead = activeDark === SAME_AS_LIGHT ? shadows
    : SHADOW_PRESETS.find((p) => p.label === activeDark)?.values
  // The drawings sit on the CHROME, so they follow the chrome's appearance, not
  // the previewed theme's. The stored ramp is the LIGHT one — a near-black
  // shadow that is mathematically the dark page — so `darkShadow` (the twin the
  // board, the export and Variables' Shadow table use) paints it in dark chrome.
  const chromeDark = useTheme() === 'dark'
  return (
    <div className="flex flex-col gap-2">
    <PickerField
      label="Light depth"
      ariaLabel="Light shadow depth"
      value={active ?? ''}
      valueLabel={t('Custom')}
      leading={<ShadowPresetGlyph size="sm" values={shadows} dark={chromeDark} />}
      options={SHADOW_PRESETS.map((preset) => ({ value: preset.label, label: preset.label, description: preset.description }))}
      optionVisual={(label, selected) => {
        const preset = SHADOW_PRESETS.find((p) => p.label === label)!
        return <ShadowPresetGlyph values={preset.values} dark={chromeDark} selected={selected} />
      }}
      info={<InfoHint>{t("Grades the complete elevation ramp used by cards, menus, modals, and toasts.")}</InfoHint>}
      onChange={(label) => {
        const preset = SHADOW_PRESETS.find((p) => p.label === label)
        if (preset) onChange({ ...preset.values })
      }}
    />
    <PickerField
      label="Dark depth"
      ariaLabel="Dark shadow depth"
      value={activeDark ?? ''}
      valueLabel={t('Custom')}
      leading={darkLead
        ? <ShadowPresetGlyph size="sm" values={darkLead} dark />
        : <ShadowPresetGlyph size="sm" values={shadowsDark ?? {}} dark={false} />}
      options={[
        { value: SAME_AS_LIGHT, label: 'Same as Light', description: 'Light’s depth, translated for a dark page: a deeper shadow and a 1px rim' },
        ...SHADOW_PRESETS.map((preset) => ({ value: preset.label, label: preset.label, description: preset.description })),
      ]}
      optionVisual={(label, selected) => {
        const values = label === SAME_AS_LIGHT ? shadows : SHADOW_PRESETS.find((p) => p.label === label)!.values
        return <ShadowPresetGlyph values={values} dark selected={selected} />
      }}
      info={<InfoHint>{t("The dark appearance's own elevation ramp. Same as Light derives it from the light depth.")}</InfoHint>}
      onChange={(label) => {
        if (label === SAME_AS_LIGHT) { onChangeDark(undefined); return }
        const preset = SHADOW_PRESETS.find((p) => p.label === label)
        if (preset) onChangeDark(darkShadowMap(preset.values))
      }}
    />
    </div>
  )
}

/**
 * The Base row is a TINT dial, not a hue slider — the system already picks the
 * neutral's hue (from the accent, or the default), and what the designer wants
 * to choose here is how much of that hue survives: a near-pure grey at one end,
 * a clearly coloured neutral at the other. That axis IS `neutralTint`
 * (Pure · Subtle · Tinted · Vivid). A snapping 4-stop slider keeps the curated
 * levels — a free 0–1 value would land the ramp math on a tint nobody chose —
 * while giving the drag-along-a-range feel a segmented control doesn't.
 *
 * The track previews the four levels at a constant lightness (`neutralFromBrand`
 * at each `brandSat`), so the range you're dialing is visible.
 */
export function TintSlider({
  hueHex, value, onChange,
}: {
  /** Any hex in the neutral's hue — the track paints from it. */
  hueHex: string
  value: NeutralTint
  onChange: (tint: NeutralTint) => void
}) {
  const index = Math.max(0, NEUTRAL_TINTS.findIndex((t) => t.key === value))
  const stops = NEUTRAL_TINTS.map((t, i) =>
    `${neutralFromBrand(hueHex, t.key)} ${(i / (NEUTRAL_TINTS.length - 1)) * 100}%`,
  ).join(', ')
  return (
    <div>
      <div
        className="relative h-5 rounded-full border border-line"
        style={{ background: `linear-gradient(to right, ${stops}) border-box` }}
      >
        <input
          type="range"
          aria-label="Neutral tint"
          min={0}
          max={NEUTRAL_TINTS.length - 1}
          step={1}
          value={index}
          onChange={(event) => onChange(NEUTRAL_TINTS[Number(event.target.value)].key)}
          className="bar-slider absolute inset-0 h-full w-full cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
        />
      </div>
      <div className="mt-1 flex justify-between text-micro font-medium uppercase tracking-wide text-fg-faint" aria-hidden>
        {NEUTRAL_TINTS.map((t) => (
          <span key={t.key} className={t.key === value ? 'text-fg' : undefined}>{t.label}</span>
        ))}
      </div>
    </div>
  )
}

/** "−.15", "0", "+.3" — fits the 24px chip slot the rows above use. */
export function formatShift(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n).toFixed(2).replace(/^0/, '').replace(/0$/, '')
  return `${n < 0 ? '−' : '+'}${abs}`
}

/**
 * CONTRAST SHIFT as a bar, in the same language as Brand accent and Neutral
 * tint: a 20px painted track, a ring thumb, a caption row underneath. The
 * track reads softer → stronger in the neutral's own hue — the ramp's steps
 * pulled together on the left, pushed apart on the right.
 */
export function ContrastSlider({
  hueHex, value, onChange, showMarks = true,
}: {
  hueHex: string
  value: number
  onChange: (n: number) => void
  /** Caption row under the track. Off when the parent already labels the row
   *  the same way Saturation and Brightness do, so the three stay one height. */
  showMarks?: boolean
}) {
  const soft = `color-mix(in oklab, ${hueHex} 45%, #a3a3a3)`
  const deep = `color-mix(in oklab, ${hueHex} 55%, #000)`
  const bright = `color-mix(in oklab, ${hueHex} 35%, #fff)`
  const marks: [string, number][] = [['Softer', -1], ['Default', 0], ['Stronger', 1]]
  return (
    <div>
      <div
        className="relative h-5 rounded-full border border-line"
        style={{ background: `linear-gradient(to right, ${soft} 0%, ${hueHex} 50%, ${deep} 75%, ${bright} 100%) border-box` }}
      >
        <input
          type="range"
          aria-label="Contrast shift"
          min={-1}
          max={1}
          step={0.05}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onDoubleClick={() => onChange(0)}
          className="bar-slider absolute inset-0 h-full w-full cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
        />
      </div>
      {showMarks && (
        <div className="mt-1 flex justify-between text-micro font-medium uppercase tracking-wide text-fg-faint" aria-hidden>
          {marks.map(([label, at]) => (
            <span key={label} className={(at === 0 ? value === 0 : Math.sign(value) === at) ? 'text-fg' : undefined}>{label}</span>
          ))}
        </div>
      )}
    </div>
  )
}


/** Where Fine-tune's Reset puts Saturation and Brightness. Brightness 0.5 is
 *  the hue's own cusp — the lightness at which that hue can be most vivid — and
 *  saturation sits just short of the gamut wall, where the colour is vivid but
 *  not neon and its ramp keeps room at both ends. Both are relative to the hue
 *  (see `readHuePosition`), so the same pair is "ideal" at every angle. */
export const FINE_TUNE_IDEAL = { saturation: 0.85, lightness: 0.5 } as const

/** The circular reset beside a Fine-tune slider. ONE control for the quick rail
 *  and the create/edit form, so the two editors cannot drift apart. Disabled at
 *  the default rather than hidden: a control that vanishes reads as broken. */
export function FineResetButton({ label, disabled, onClick, className = '' }: {
  label: string
  disabled: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-fg-faint hover:text-fg disabled:cursor-default disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
      </svg>
    </button>
  )
}

/** One axis of the accent — Saturation or Brightness — over its own hue. The
 *  track is drawn from the same `colorAtHue` the value is, so what the thumb
 *  sits on is the colour it will commit. Preview while dragging, commit once
 *  on release, like the hue slider beside it. */
export function AccentAxisSlider({ axis, label, value, onPreview, onCommit, action }: {
  axis: 'saturation' | 'lightness'
  label: string
  value: string
  onPreview: (hex: string) => void
  onCommit: (hex: string) => void
  /** Trailing control beside the track (a reset), same slot Ramp contrast uses. */
  action?: React.ReactNode
}) {
  // Frozen at pointer-down: a grey (saturation 0) has no hue to read back, so
  // re-reading mid-drag would snap the hue to red and ratchet.
  const frozen = useRef<ReturnType<typeof readHuePosition> | null>(null)
  const live = readHuePosition(value)
  const { hue, position } = frozen.current ?? live
  const current = live.position[axis]
  const at = (t: number) => colorAtHue({ ...position, [axis]: t }, hue)
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `${at(t)} ${t * 100}%`).join(', ')
  const pending = useRef<string | null>(null)
  const commit = () => { frozen.current = null; if (pending.current) { onCommit(pending.current); pending.current = null } }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className={SLIDER_LABEL}>{label}</span>
        <span className={SLIDER_VALUE}>{Math.round(current * 100)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-5 min-w-0 flex-1 rounded-full border border-line" style={{ background: `linear-gradient(to right, ${stops}) border-box` }}>
          <input
            type="range"
            aria-label={label}
            min={0}
            max={1}
            step={0.01}
            value={current}
            onPointerDown={() => { frozen.current = readHuePosition(value) }}
            onChange={(e) => { const hex = at(Number(e.target.value)); pending.current = hex; onPreview(hex) }}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            className="bar-slider absolute inset-0 h-full w-full cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
          />
        </div>
        {action}
      </div>
    </div>
  )
}

export default function ThemeQuickSettingsRail({
  previewTheme,
  previewAppearance,
  colorAppearance,
  onColorAppearanceChange,
  activePanel = 'color',
  onSelectPanel,
  onOpenAdvanced,
  onAccentPreview,
  stylePreview,
  onNeedAccount,
  onAdoptStyle,
  onQuickEditOpenChange,
  onRandomBoardAppearance,
  contrastOpen = false,
  onContrastOpenChange,
  previewViewport = 'desktop',
  embed = false,
  randomHandle,
  lockAdvanced = false,
  exploringRandom = false,
  onExploringRandomEnd,
  onUseTheme,
  ship,
  onDiscardRandom,
  startStyle,
  mappedColour,
  onMappedColourChange,
  rampLegend,
}: {
  /** The open ramp as the board map's legend (ThemePreviewHub owns it). */
  rampLegend?: RampLegend
  /** The colour whose ramp is open — the board maps it (ColorRoleMapView).
   *  Omitted (create studio): the ramp toggle stays local and maps nothing. */
  mappedColour?: ColorRoleId | null
  onMappedColourChange?: (id: ColorRoleId | null) => void
  previewTheme: string
  previewAppearance: ThemeAppearance
  /** Light/Dark currently on the artefacts board — Color edition reads and writes this ramp. */
  colorAppearance?: ThemeAppearance
  onColorAppearanceChange?: (appearance: ThemeAppearance) => void
  /** Which edition card the foundation icon rail asked for. */
  activePanel?: QuickPanelFoundation
  /** Switch edition from the card's own title. Same handler as the icon rail. */
  onSelectPanel?: (key: QuickPanelFoundation) => void
  /** Each edition's mark for the switcher (the shell's FOUNDATIONS icons). */
  /** Opens the Variables tab on a foundation — ONE handler where there used to
   *  be five `onOpen*` props plus a per-`SettingItem` `advancedLabel`, and
   *  where `stroke` had none of its own (it borrowed Sizes'). Each panel now
   *  carries a single "Go to advanced edition" button at its foot. */
  onOpenAdvanced: (foundationKey: string) => void
  onAccentPreview?: (hex: string | null) => void
  /** A System Style being tried on. The rail dims and stops taking input until
   *  the style is added to My themes; the preview canvas still renders the
   *  preset via `resolveStylePreviewTokens`. */
  stylePreview?: StylePreview | null
  /** Random / Undo on a try-on rewrite the overlay. Nothing is stored. */
  /** Variables, Docs, or a second theme while signed out. The shell opens the
   *  register dialog and stays on this screen. */
  onNeedAccount?: () => void
  /** Fired when a try-on is adopted into the system (auto-adopt, or Reset on a
   *  previewed style). The shell re-points `previewTheme` and drops the
   *  ephemeral preview. */
  onAdoptStyle?: (themeKey: string) => void
  /** Reports whether a contained colour picker is open, so the canvas beside
   *  this rail can cede matching space instead of sitting under the fly-out. */
  onQuickEditOpenChange?: (open: boolean) => void
  /** Portal target for the contained Accent / Neutral pickers. */
  containedDrawerRootRef?: RefObject<HTMLElement | null>
  /** Flip the whole artefacts board light or dark — fired with Random. */
  onRandomBoardAppearance?: (appearance: ThemeAppearance) => void
  /** Contrast grid occupies the artefacts canvas while Color edition is open. */
  contrastOpen?: boolean
  onContrastOpenChange?: (open: boolean) => void
  /** Session desktop / mobile cut — Type and Spacing edition resolve against this. */
  previewViewport?: GridViewport
  onPreviewPlatformChange?: (platform: GridViewport) => void
  /** Render in the page column instead of the inspector. The create studio
   *  uses the inspector for the step list, so the edition sits in the card. */
  embed?: boolean
  /** Hands this rail's Random (a whole new theme) to a footer it does not
   *  render — the create studio's die. Same pattern as `submitHandle`. */
  randomHandle?: { current: (() => void) | null }
  /** Create studio: advanced edition waits until the brand is finished, same
   *  as guided setup (`setupStep`). */
  lockAdvanced?: boolean
  /** Home → Random: the footer is Random / Save theme, not Update theme. */
  exploringRandom?: boolean
  onExploringRandomEnd?: () => void
  /** Save bar's primary action: keep the theme and open Code. */
  onUseTheme?: () => void
  /** The footer's three doors out (CSS · Figma · Agent); see `ThemeSaveBar`. */
  ship?: ShipActions
  onDiscardRandom?: () => void
  /** Create studio: "Start from style" heads the Color row, so the whole first
   *  step (style · name · appearance · accent · states) IS that row and there
   *  is no Continue (design-plans/entry-flow-set-see-ship.md, phase 2). */
  startStyle?: { value: string; onChange: (id: string) => void }
}) {
  const { t } = useI18n()
  const inInspector = useInInspector()
  // With the edition strip in the inspector's band the card opens straight
  // under that band's rule: no extra top gap above the first row.
  const inBand = useInspectorHeader()
  // Header → Edit swaps the accordion for the list of editions, in place.
  const [editList, setEditList] = useState(false)
  // The row the Edit list just sent us to. Once the accordion is back, that
  // row is pinned to the top of the scroll region while the bodies above it
  // fold and its own unfolds (~260ms), so the person lands ON what they picked
  // instead of hunting for it below the previous row.
  const [landOn, setLandOn] = useState<QuickPanelFoundation | null>(null)
  useEffect(() => {
    if (!landOn || editList) return
    const started = performance.now()
    let frame = 0
    const pin = () => {
      const section = document.getElementById(`quick-edition-${landOn}`)?.closest('section')
      const scroller = section?.closest<HTMLElement>('.overflow-y-auto')
      if (section && scroller) {
        scroller.scrollTop += section.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      }
      if (performance.now() - started < 400) frame = requestAnimationFrame(pin)
    }
    frame = requestAnimationFrame(pin)
    // One last pin once every fold has landed: frames can be throttled (a
    // background pane), and the row must still end at the top.
    const settle = setTimeout(() => { pin(); setLandOn(null) }, 450)
    return () => { cancelAnimationFrame(frame); clearTimeout(settle) }
  }, [landOn, editList])
  // The open row's header folds the accordion; picking a foundation anywhere
  // (a row, the icon rail, the board) opens it again.
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [collapsedFor, setCollapsedFor] = useState(activePanel)
  if (collapsedFor !== activePanel) { setCollapsedFor(activePanel); setRailCollapsed(false) }
  const brandLabel = useDesignStore((state) => state.themeLabels[previewTheme]) || defaultThemeLabel(previewTheme)
  const store = useDesignStore()
  const applyAccent = useApplyAccentColor()
  const applyNeutral = useApplyGrayColor()
  const applyState = useApplyStateColor()
  const [accentPreview, setAccentPreview] = useState<string | null>(null)
  // Font's role table is the heaviest thing in the rail: closed until asked,
  // like Colour's Fine-tune, so a row opens to its quick controls only.
  const [openChip, setOpenChip] = useState<ColorChipId | null>(null)
  // Which colour role the Color edition's slider is pointed at.
  const [colorRole, setColorRole] = useState<ColorRoleId>('accent')
  // The row's colour while its hue is being dragged, before the commit.
  const [rolePreview, setRolePreview] = useState<{ id: ColorRoleId; hex: string } | null>(null)
  const rampAppearance = colorAppearance ?? previewAppearance
  // The brand's DEFAULT theme (`themeKinds`) and, when it ships a single one
  // under this plan, which. The Light/Dark switch and "Themes this brand
  // ships" both read these, so they cannot disagree.
  const free = useOneThemePlan()
  const leadTheme: ThemeAppearance = store.themeKinds[previewTheme] === 'dark' ? 'dark' : 'light'
  const plannedShips = plannedBrandThemes(shippedThemes(store.brandThemes, previewTheme), leadTheme, free)
  const shipsOne: ThemeAppearance | undefined = plannedShips.length === 1 ? brandThemeDef(plannedShips[0])?.base : undefined
  // Only ever set by a FAILED adopt (`mintTheme` refusing — a name collision it
  // can't resolve, a slot it can't fill). Rendered next to the button, not as a
  // toast: a failure the user has to act on shouldn't time out.
  const [adoptError, setAdoptError] = useState<string | null>(null)

  const lastRandomScaffold = useRef<string | undefined>(undefined)
  const lastRandomMood = useRef<string | undefined>(undefined)
  // `target` is resolved once per gesture — a drag must adopt the tried-on
  // style on its FIRST move, not on every frame.
  const scrub = useRef<{ snapshot: DesignSnapshot; label: string; target?: string } | null>(null)
  const {
    themeSources, customColors, primaryColor, grayBaseColor, neutralTint, linkNeutralToAccent,
    contrastShift, setContrastShift, setNeutralTint,
    patchThemeFoundations,
  } = store
  // While a style is being tried on, every readout comes from the PRESET — the
  // same source `resolveStylePreviewTokens` paints the artefacts from, so the
  // rail and the canvas can't describe different systems.
  const ownThemeCount = myThemeKeys(store.themeOrder, store.themes).length
  const tryOn = stylePreview ?? null
  const setupStep = useSetupStep(previewTheme)
  const editionLocked = setupStep != null || lockAdvanced
  const access = useAccess()
  // Guest canvas header no longer carries Undo / Redo / Reset. Undo sits in
  // the save bar; Reset belongs with this theme's settings (back to Core).
  const themeReset = useThemeReset(previewTheme, access.guest && !tryOn && setupStep == null)
  // Variables is open without an account, so the door is too.
  const showAdvancedEdition = true
  const foundations = tryOn
    ? { ...resolveThemeFoundations(store, previewTheme), ...tryOn.preset.foundations }
    : resolveThemeFoundations(store, previewTheme)
  const { typography, radius, shadows, shadowsDark, sizes, stroke, spacing, spacingRoles, iconWeight } = foundations
  const motion = normalizeMotionSettings(foundations.motion)
  const motionPreset = matchMotionPreset(motion)
  const sizeUsedStep = previewViewport === 'mobile'
    ? (foundations.sizeRoles?.touch ?? 'lg')
    : (foundations.sizeRoles?.control ?? 'md')
  const setIconWeight = (key: string, value: PhosphorWeight) =>
    patchThemeFoundations(key, { iconWeight: value })
  const setMotionPreset = (key: string, value: MotionPresetKey) =>
    patchThemeFoundations(key, { motion: motionPresetPatch(value) })
  // Font families this system added + which Font field opened "Add font".
  const fontSources = useDesignStore((s) => s.fontSources) ?? []
  const [addFontFor, setAddFontFor] = useState<'body' | 'display' | null>(null)
  // Every write takes an explicit theme KEY rather than closing over
  // `previewTheme`, because during a try-on the first edit adopts the style and
  // the write has to land on the NEWLY minted theme — a key that does not exist
  // yet at render time. `commit`/`applyScrub` resolve it and pass it in.
  const setTypography = (key: string, value: typeof typography) => {
    patchThemeFoundations(key, { typography: value })
    // A single-theme kit has nowhere else for the typeface to live — keep the
    // root `typography` (Variables · Type + tokens.json root) in lockstep so
    // Live Sync's root write and the Theme Preview edit can't disagree.
    const themes = useDesignStore.getState().themes
    if (Object.keys(themes).length === 1) {
      useDesignStore.getState().setTypography({
        ...useDesignStore.getState().typography,
        fontFamily: value.fontFamily,
        headingFontFamily: value.headingFontFamily ?? value.fontFamily,
        sizes: value.sizes ?? useDesignStore.getState().typography.sizes,
        lineHeights: value.lineHeights ?? useDesignStore.getState().typography.lineHeights,
        weights: value.weights ?? useDesignStore.getState().typography.weights,
      })
    }
  }
  // Axis picks write the ROLES only — the primitive ramp is untouched, which is
  // the whole point of the split: Boxes cannot move Fields.
  const setRadiusRoles = (key: string, value: Record<string, string>) => {
    patchThemeFoundations(key, { radiusRoles: value })
    // Same single-theme lockstep as the typeface: Theme Preview writes
    // `themeFoundations[theme]`, but Live Sync's root `radiusRoles` is what a
    // one-column Radius collection actually applies. Without this, boxes /
    // fields / selectors move on the canvas and stay put in Figma.
    const themes = useDesignStore.getState().themes
    if (Object.keys(themes).length === 1) {
      useDesignStore.getState().setRadiusRoles(value)
    }
  }
  // A preset writes the three axes on the standard ramp (and clears any
  // per-viewport override) — the same `radiusPresetPatch` Variables applies —
  // mirrored to the root for a one-theme system, like the roles above.
  const setRadiusPreset = (key: string, label: string) => {
    const resolved = resolveThemeFoundations(useDesignStore.getState(), key)
    const next = radiusPresetPatch(label, resolved.radiusRoles)
    if (!next) return
    patchThemeFoundations(key, next)
    if (Object.keys(useDesignStore.getState().themes).length === 1) {
      useDesignStore.getState().setRadius(next.radius)
      useDesignStore.getState().setRadiusRoles(next.radiusRoles)
      useDesignStore.setState({ radiusRoleViewports: {} })
    }
  }
  const setShadows = (key: string, value: Record<string, string>) => patchThemeFoundations(key, { shadows: value })
  const setShadowsDark = (key: string, value: Record<string, string> | undefined) => patchThemeFoundations(key, { shadowsDark: value })
  const setSizes = (key: string, value: Record<string, string>) => patchThemeFoundations(key, { sizes: value })
  const setStroke = (key: string, value: Record<string, string>) => patchThemeFoundations(key, { stroke: value })
  // Container inset writes BOTH: the `inset-surface` spacing role (the token the
  // preview actually reads) and the four-sided `padding` mirror (the export's
  // resolved-px copy), so `--spacing-inset-surface` and `--padding-*` can't
  // drift after a quick edit.
  const setContainerInset = (key: string, stepIndex: number) => {
    const step = SPACING_STEPS[Math.max(0, Math.min(SPACING_STEPS.length - 1, stepIndex))]
    const px = spacing[step] ?? `${Number(step) * 4}px`
    // Setting the whole inset makes it symmetric again: the sides follow it.
    patchThemeFoundations(key, {
      spacingRoles: clearInsetSides({ ...spacingRoles, [INSET_SURFACE_ROLE]: step }, 'inset-surface'),
      padding: insetSurfacePadding(px),
    })
  }
  // One side of the card padding; `undefined` follows the inset again. The
  // `padding` mirror takes each side's px so `--padding-*` keeps aliasing.
  const setContainerInsetSide = (key: string, side: InsetSide, step: string | undefined) => {
    const roles = withInsetSide(spacingRoles ?? {}, 'inset-surface', side, step)
    const base = roles[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP
    const pxOf = (s: string) => spacing[s] ?? `${Number(s.replace('_', '.')) * 4}px`
    const padding = Object.fromEntries(INSET_SIDES.map((s) => [s, pxOf(roles[insetSideKey('inset-surface', s)] ?? base)]))
    patchThemeFoundations(key, { spacingRoles: roles, padding })
  }
  const brandFamily = themeSources[previewTheme]?.brand ?? 'accent'
  const grayFamily = themeSources[previewTheme]?.gray ?? 'neutral'
  const themeAccent = brandFamily === 'accent' ? primaryColor : customColors.find((family) => family.key === brandFamily)?.base ?? primaryColor
  const themeNeutral = grayFamily === 'neutral' ? grayBaseColor : customColors.find((family) => family.key === grayFamily)?.base ?? grayBaseColor
  const accent = tryOn ? tryOn.preset.accent : themeAccent
  const neutral = tryOn ? presetHarmony(tryOn.preset).neutral : themeNeutral
  const activeTint = tryOn ? tryOn.preset.neutralTint : neutralTint

  useEffect(() => () => {
    onAccentPreview?.(null)
  }, [onAccentPreview])

  // SpectrumSlider deliberately previews an Accent before committing its
  // expensive ramp regeneration. Clear that ephemeral value when the user
  // changes theme, or the next theme's Neutral tint track can briefly inherit
  // the previous theme's hue.
  useEffect(() => {
    setAccentPreview(null)
    onAccentPreview?.(null)
  }, [previewTheme, onAccentPreview])

  const announceAdopted = (name: string) =>
    showToast(t('{name} added to My brands', { name }))

  const showUndo = (snapshot: DesignSnapshot, label: string) => {
    // Every rail edit is one step of the Undo / Redo history — the header's
    // and the footer's Undo (ThemeSaveBar) both walk it.
    recordEdit(snapshot, label)
  }

  /**
   * Resolves the theme a write should land on. A tried-on style is NOT a write
   * target: it used to auto-adopt as "<Style> Copy" on the first slider nudge,
   * which is how My themes filled up with themes nobody chose (reported). While
   * a style is only previewed, the rail shows its overview + Edit theme instead
   * of the controls, so this branch is a guard, not a path anyone reaches.
   */
  const resolveWriteTarget = (): string | null => {
    if (tryOn) return null
    if (!isScaffoldTheme(previewTheme)) return previewTheme
    const listed = myThemeKeys(store.themeOrder, store.themes)
    if (!listed.length) return previewTheme
    return resolveListedTheme(store.themeOrder, store.themes, store.themeKinds, listed[listed.length - 1], previewAppearance)
  }

  /** Edit theme — the rail's twin of the sheet's button, same helper.
   *  The first design system is added locally so quick edition opens on this
   *  screen. A second theme, and Variables / Docs, ask for an account. */
  const editTryOn = () => {
    if (!tryOn) return
    const ownedCount = myThemeKeys(store.themeOrder, store.themes).length
    // A phone remix replaces the guest's untouched automatic brand instead of
    // asking for an account (`adoptRemixOverGuestSeed`); null = not that case.
    const swapped = access.guest ? adoptRemixOverGuestSeed(tryOn.preset, tryOn.appearance) : null
    if (swapped) {
      if ('error' in swapped) { setAdoptError(t(swapped.error, { count: ownThemeCount })); return }
      setAdoptError(null)
      announceAdopted(swapped.name)
      onAdoptStyle?.(swapped.key)
      return
    }
    if (access.guest && ownedCount > 0) { onNeedAccount?.(); return }
    const result = openStyleForEditing(tryOn.preset, tryOn.appearance)
    if ('error' in result) { setAdoptError(t(result.error, { count: ownThemeCount })); return }
    setAdoptError(null)
    if (result.created) announceAdopted(result.name)
    onAdoptStyle?.(result.key)
  }

  const commit = (label: string, action: (themeKey: string) => void) => {
    const snapshot = captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)
    const target = resolveWriteTarget()
    if (!target) return
    action(target)
    // The Undo snapshot is taken BEFORE the adopt, so undoing an edit that
    // adopted a style also un-adopts it — one gesture, one reversal.
    showUndo(snapshot, label)
  }

  /** A Color-edition edit. Every colour without a Dark pick of its own is
   *  re-solved as the dark twin of its light anchor afterwards — the plugin's
   *  rule (`accentFor` / `stateFor`), so Dark shows the same colours on both. */
  const colorCommit = (label: string, action: (themeKey: string) => void) => {
    commit(label, (themeKey) => {
      const following = followingDarkAnchors(useDesignStore.getState(), themeKey)
      action(themeKey)
      retwinFollowingDarkAnchors(themeKey, following)
    })
  }

  // Per-row Reset, beside the open row's chevron. Present only while the row
  // differs from what the brand Reset restores (its origin System Style, or no
  // override for a hand-made brand) — one Undo step, like any edit.
  const rowResetTarget = themeStylePreset(store.themeOrigin?.[previewTheme] ?? '')?.label ?? 'System defaults'
  const rowReset = (row: FoundationRow, title: string) => {
    if (tryOn || setupStep != null || !foundationRowHasEdits(store, previewTheme, row)) return undefined
    return () => commit(`${title} reset`, (themeKey) => {
      resetFoundationRow(themeKey, row)
      // A one-brand system mirrors type and radius roles at the root (see
      // setTypography / setRadiusRoles): bring the root back with it.
      const s = useDesignStore.getState()
      if (Object.keys(s.themes).length !== 1) return
      const resolved = resolveThemeFoundations(s, themeKey)
      if (row === 'typography') {
        s.setTypography({
          ...s.typography,
          fontFamily: resolved.typography.fontFamily,
          headingFontFamily: resolved.typography.headingFontFamily ?? resolved.typography.fontFamily,
          sizes: resolved.typography.sizes ?? s.typography.sizes,
          lineHeights: resolved.typography.lineHeights ?? s.typography.lineHeights,
          weights: resolved.typography.weights ?? s.typography.weights,
        })
      }
      if (row === 'radius') {
        s.setRadius(resolved.radius)
        s.setRadiusRoles(resolved.radiusRoles)
        useDesignStore.setState({ radiusRoleViewports: resolved.radiusRoleViewports ?? {} })
      }
    })
  }
  const colorReset = !tryOn && setupStep == null && colorRowHasEdits(store, previewTheme)
    ? () => commit('Colour reset', (themeKey) => resetThemeColorToOrigin(themeKey, applyAccent))
    : undefined

  const beginScrub = (label: string) => {
    if (scrub.current) return
    scrub.current = {
      snapshot: captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot),
      label,
    }
  }

  const applyScrub = (label: string, action: (themeKey: string) => void) => {
    if (!scrub.current) { commit(label, action); return }
    if (!scrub.current.target) {
      const target = resolveWriteTarget()
      if (!target) return
      scrub.current.target = target
    }
    action(scrub.current.target)
  }

  const endScrub = () => {
    if (!scrub.current) return
    showUndo(scrub.current.snapshot, scrub.current.label)
    scrub.current = null
  }

  // Accent only — the Base row is a tint dial now, not a colour edit.
  //
  // ALWAYS forks off the system's own `accent` primitive, and off any family a
  // second theme reads. Only a theme that PRIVATELY owns its brand family
  // retints in place. The old rule ("fork only when shared") let a theme whose
  // brand still pointed at the global `accent` rewrite `primaryColor` — and
  // through it the page, the neutral and every status ramp — from a control
  // that claims to edit one theme. That is also why the Accent swatch and the
  // Neutral-tint row could end up describing two different colours.
  /** `darkValue` sets the dark theme's anchor on its own; omitted, dark
   *  follows `value` as it always has. */
  const writeAccent = (themeKey: string, value: string, darkValue?: string) => {
    const s = useDesignStore.getState()
    // Re-read the family from the store: after an auto-adopt this is the
    // NEWLY minted theme's brand family, not the host's.
    const family = s.themeSources[themeKey]?.brand ?? DEFAULT_THEME_SOURCES.brand
    const affected = s.themeOrder.filter((theme) => (s.themeSources[theme]?.brand ?? DEFAULT_THEME_SOURCES.brand) === family)
    const isGlobal = family === DEFAULT_THEME_SOURCES.brand
    if (!isGlobal && affected.length <= 1) {
      // A private theme may safely retint its own linked Neutral in place.
      // Passing `false` here was the direct cause of Accent moving while the
      // neutral/page remained the old purple.
      applyAccent(value, s.linkNeutralToAccent, themeKey, darkValue)
      return
    }

    const labelRoot = s.themeLabels[themeKey] || themeKey.replace(/-/g, ' ')
    const baseKey = slugify(`${labelRoot}-brand`) || `${themeKey}-brand`
    let familyKey = baseKey
    let suffix = 2
    while (s.customColors.some((color) => color.key === familyKey)) familyKey = `${baseKey}-${suffix++}`
    const linkedNeutral = s.linkNeutralToAccent
      ? neutralFromBrand(value, s.neutralTint)
      : null
    const themePages = linkedNeutral
      ? {
          light: backgroundFromBase(linkedNeutral, 'light', s.neutralTint),
          dark: backgroundFromBase(linkedNeutral, 'dark', s.neutralTint),
        }
      : resolveThemePages(s, themeKey)

    s.addCustomColor({
      key: familyKey,
      label: `${labelRoot} Accent`,
      base: value,
      darkBase: darkValue ?? value,
      scale: generateColorScale(value, s.colorAlgorithm, s.contrastShift, themePages.light),
      darkScale: generateFamilyDarkScale(darkValue ?? value, s.colorAlgorithm, s.contrastShift, themePages.dark),
    })

    let gray = s.themeSources[themeKey]?.gray ?? DEFAULT_THEME_SOURCES.gray
    if (linkedNeutral) {
      const neutralRoot = slugify(`${labelRoot}-neutral`) || `${themeKey}-neutral`
      let neutralKey = neutralRoot
      let neutralSuffix = 2
      while (s.customColors.some((color) => color.key === neutralKey)) neutralKey = `${neutralRoot}-${neutralSuffix++}`
      s.addCustomColor({
        key: neutralKey,
        label: `${labelRoot} Neutral`,
        base: linkedNeutral,
        scale: generateLightNeutralScale(linkedNeutral, s.colorAlgorithm, s.contrastShift, themePages.light, s.neutralTint),
        darkScale: generateDarkColorScale(linkedNeutral, s.colorAlgorithm, s.contrastShift, themePages.dark, s.neutralTint),
      })
      gray = neutralKey
    }
    s.updateTheme(themeKey, s.themeKinds[themeKey] ?? 'light', {
      ...DEFAULT_THEME_SOURCES,
      ...s.themeSources[themeKey],
      brand: familyKey,
      gray,
    })
  }

  /** `fromLink` = the accent re-deriving a linked state, which must not unlink it. */
  const writeState = (themeKey: string, role: StateRole, hex: string, appearance: ThemeAppearance, fromLink = false) => {
    const s = useDesignStore.getState()
    const family = s.themeSources[themeKey]?.[role] ?? GLOBAL_FAMILY[role]
    const affected = s.themeOrder.filter((theme) => (s.themeSources[theme]?.[role] ?? GLOBAL_FAMILY[role]) === family)
    const isGlobal = family === GLOBAL_FAMILY[role]
    if (!isGlobal && affected.length <= 1) {
      applyState(role, hex, fromLink, themeKey, appearance)
      return
    }
    const labelRoot = s.themeLabels[themeKey] || themeKey.replace(/-/g, ' ')
    const baseKey = slugify(`${labelRoot}-${role}`) || `${themeKey}-${role}`
    let familyKey = baseKey
    let suffix = 2
    while (s.customColors.some((color) => color.key === familyKey) || RESERVED_COLOR_KEYS.includes(familyKey)) {
      familyKey = `${baseKey}-${suffix++}`
    }
    const pages = resolveThemePages(s, themeKey)
    s.addCustomColor({
      key: familyKey,
      label: `${labelRoot} ${SLOT_DISPLAY_LABEL[role]}`,
      base: hex,
      darkBase: hex,
      scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light),
      darkScale: generateFamilyDarkScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark),
    })
    s.updateTheme(themeKey, s.themeKinds[themeKey] ?? 'light', {
      ...DEFAULT_THEME_SOURCES,
      ...s.themeSources[themeKey],
      [role]: familyKey,
    })
  }



  // Accent drags preview before they commit their full ramp regeneration. The
  // linked neutral has to read that SAME live accent; reading `neutral` here
  // left the tint track one gesture behind the Accent row until pointer-up.
  // A detached neutral remains stable, as expected.
  const liveAccent = accentPreview ?? accent
  const liveNeutral = linkNeutralToAccent
    ? neutralFromBrand(liveAccent, activeTint)
    : neutral
  const colorReadStore = tryOn ? stylePreviewStore(store, tryOn, previewTheme) : store
  const brandScale = scaleForFamily(
    colorReadStore.themeSources[previewTheme]?.brand ?? GLOBAL_FAMILY.brand,
    rampAppearance,
    colorReadStore,
  )
  const fromRamp = CONTRAST_THUMB_STEPS
    .map((step) => brandScale?.[step])
    .filter((hex): hex is string => Boolean(hex))
  const contrastThumbTones = fromRamp.length === CONTRAST_THUMB_STEPS.length
    ? fromRamp
    : [
        liveAccent,
        liveNeutral,
        stateColorAnchor(colorReadStore, 'error', rampAppearance, tryOn ? undefined : previewTheme),
      ]
  const stateHex = (role: StateRole, appearance: ThemeAppearance) =>
    stateColorAnchor(colorReadStore, role, appearance, tryOn ? undefined : previewTheme)
  useEffect(() => { setOpenChip(null) }, [rampAppearance])

  // ── Color edition: one list of roles, each shown in the theme on screen ──
  const roleBrandFamily = colorReadStore.themeSources[previewTheme]?.brand ?? GLOBAL_FAMILY.brand
  const roleGrayFamily = colorReadStore.themeSources[previewTheme]?.gray ?? GLOBAL_FAMILY.gray
  const accentAnchor = (appearance: ThemeAppearance) =>
    scaleForFamily(roleBrandFamily, appearance, colorReadStore)?.[9] ?? accent
  const neutralAnchor = (appearance: ThemeAppearance) => appearance === 'light'
    ? liveNeutral
    : scaleForFamily(roleGrayFamily, 'dark', colorReadStore)?.[9] ?? liveNeutral
  const roleHex = (id: ColorRoleId, appearance: ThemeAppearance): string =>
    id === 'accent' ? accentAnchor(appearance)
      : id === 'neutral' ? neutralAnchor(appearance)
        : stateHex(id, appearance)
  const themePage = resolveThemePages(store, previewTheme)
  // Each role's ramp in the theme on screen, from the family this theme
  // reads for that slot — what the row's ramp toggle shows.
  const roleRamps = Object.fromEntries(COLOR_ROLE_ORDER.map((id) => {
    const slot = id === 'accent' ? 'brand' : id === 'neutral' ? 'gray' : id
    const family = colorReadStore.themeSources[previewTheme]?.[slot] ?? GLOBAL_FAMILY[slot]
    return [id, scaleForFamily(family, rampAppearance, colorReadStore)]
  })) as Partial<Record<ColorRoleId, ColorScale>>
  const colorRows: ColorRoleRow[] = COLOR_ROLE_ORDER.map((id) => ({
    id,
    hex: rolePreview?.id === id ? rolePreview.hex : roleHex(id, rampAppearance),
    linked: id === 'neutral' ? linkNeutralToAccent : id === 'accent' ? undefined : store.linkStatesToAccent,
    readOnly: id === 'neutral' && rampAppearance === 'dark',
  }))
  /** Both themes at `hue`, each SOLVED against its own page: light keeps the
   *  passing tone nearest your colour, dark the dimmest one that still passes
   *  (`solveRoleColor`). Both start from the LIGHT colour, so the dark anchor
   *  is always a function of the brand, never of an earlier dark solve. */
  const roleAtHue = (id: ColorRoleId, hue: number) => id === 'neutral'
    ? (() => {
        // A neutral is a hue at the tint's saturation (`neutralFromBrand`),
        // so the slider moves only the hue; the dark anchor is derived from
        // this one base by the gray applier.
        const hex = neutralFromBrand(colorAtHue({ saturation: 1, lightness: 0.5 }, hue), activeTint)
        return { light: hex, dark: hex }
      })()
    : ({
    light: roleColorAtHue(roleHex(id, 'light'), hue, 'light', themePage.light),
    dark: roleColorAtHue(roleHex(id, 'light'), hue, 'dark', themePage.dark),
  })
  const previewRoleHue = (id: ColorRoleId, hex: string, hue: number) => {
    setRolePreview({ id, hex })
    if (id === 'accent') {
      const light = roleAtHue('accent', hue).light
      setAccentPreview(light)
      onAccentPreview?.(rampAppearance === 'dark' ? hex : light)
    }
  }
  const commitRoleHue = (id: ColorRoleId, hue: number) => {
    setRolePreview(null)
    const { light, dark } = roleAtHue(id, hue)
    if (id === 'neutral') {
      colorCommit('Neutral updated', (themeKey) => applyNeutral(light, themeKey))
      return
    }
    if (id === 'accent') {
      colorCommit('Accent updated', (themeKey) => writeAccentAndStates(themeKey, light, dark))
      setAccentPreview(null)
      onAccentPreview?.(null)
      return
    }
    colorCommit(`${SLOT_DISPLAY_LABEL[id]} updated`, (themeKey) => {
      writeState(themeKey, id, light, 'light')
      writeState(themeKey, id, dark, 'dark')
    })
  }
  /** A typed or picked hex sets that role in the theme on screen only. */
  const STATE_IDS: StateRoleId[] = ['success', 'error', 'warning', 'info']
  /** While states follow the accent, every accent write re-solves all four
   *  (`harmonizedState`) inside the same commit, so one Undo reverts both. */
  /** Re-solve all four states from the accent (`harmonizedState`). Pages are
   *  read AFTER any accent write, since a linked neutral moves the page. */
  const harmonizeStates = (themeKey: string, accentLight: string) => {
    const pages = resolveThemePages(useDesignStore.getState(), themeKey)
    for (const role of STATE_IDS) {
      const next = harmonizedState(role, stateHex(role, 'light'), accentLight, pages)
      writeState(themeKey, role, next.light, 'light', true)
      writeState(themeKey, role, next.dark, 'dark', true)
    }
  }
  const writeAccentAndStates = (themeKey: string, light: string, dark: string) => {
    writeAccent(themeKey, light, dark)
    if (useDesignStore.getState().linkStatesToAccent) harmonizeStates(themeKey, light)
  }
  const toggleStatesLink = () => {
    if (store.linkStatesToAccent) {
      commit('States unlinked', () => useDesignStore.getState().setLinkStatesToAccent(false))
      return
    }
    colorCommit('States linked', (themeKey) => {
      useDesignStore.getState().setLinkStatesToAccent(true)
      harmonizeStates(themeKey, accentAnchor('light'))
    })
  }
  /** A typed or picked hex is ONE colour read two ways. In Light it sets the
   *  light anchor and re-solves the dark one at the same hue (`darkTwinOf`).
   *  In Dark it sets the dark anchor as typed and re-solves the light one
   *  (`lightTwinOf`): keeping the old light anchor meant a colour chosen in
   *  Dark came back as a different colour in Light. */
  /** The picker canvas mid-drag: paints the row (and, for Accent, the board)
   *  the way `setRoleHex` will land it, without an Undo step per frame. */
  const previewRoleHex = (id: ColorRoleId, hex: string | null) => {
    setRolePreview(hex ? { id, hex } : null)
    if (id !== 'accent') return
    const light = hex && rampAppearance === 'dark' ? lightTwinOf(hex, themePage.light) : hex
    setAccentPreview(light)
    onAccentPreview?.(light && rampAppearance === 'dark' ? hex : light)
  }
  const setRoleHex = (id: ColorRoleId, hex: string) => {
    if (id === 'neutral') {
      colorCommit('Neutral updated', (themeKey) => applyNeutral(hex, themeKey))
      return
    }
    const dark = rampAppearance === 'dark' ? hex : darkTwinOf(hex, themePage.dark)
    if (id === 'accent') {
      const light = rampAppearance === 'dark' ? lightTwinOf(hex, themePage.light) : hex
      colorCommit('Accent updated', (themeKey) => writeAccentAndStates(themeKey, light, dark))
      return
    }
    colorCommit(`${SLOT_DISPLAY_LABEL[id]} updated`, (themeKey) => {
      writeState(themeKey, id, rampAppearance === 'light' ? hex : lightTwinOf(hex, themePage.light), 'light')
      writeState(themeKey, id, dark, 'dark')
    })
  }
  const toggleNeutralLink = () => {
    if (linkNeutralToAccent) {
      commit('Neutral unlinked', () => useDesignStore.getState().setLinkNeutralToAccent(false))
      return
    }
    colorCommit('Neutral linked', (themeKey) => {
      useDesignStore.getState().setLinkNeutralToAccent(true)
      applyNeutral(neutralFromBrand(accentAnchor('light'), activeTint), themeKey, true)
    })
  }

  const applyRandomTheme = () => {
    const headingFamily = typography.headingFontFamily ?? typography.fontFamily
    const rng = Math.random
    // System Styles first (Core, Glass…), then random looks — see `nextShuffle`.
    const recipe = nextShuffle({
      currentStyle: useDesignStore.getState().themeOrigin?.[previewTheme],
      accent: liveAccent,
      bodyFont: typography.fontFamily,
      headingFont: headingFamily,
      typeScale: inferTypeScaleMode(typography.sizes ?? {}),
      avoidScaffold: lastRandomScaffold.current,
      avoidMood: lastRandomMood.current,
      rng,
    })
    lastRandomScaffold.current = recipe.scaffoldId
    lastRandomMood.current = recipe.moodId
    loadGoogleFont(recipe.bodyFont)
    loadGoogleFont(recipe.headingFont)
    commit(t('Random tweak applied'), (themeKey) => {
      // The mood was designed in one appearance (Abyss is a dark page, Cupcake
      // a light one): the board opens on it rather than on a coin flip. Inside
      // the commit so one Undo also reverts it where it is stored (the studio).
      onRandomBoardAppearance?.(recipe.appearance)
      setNeutralTint(recipe.neutralTint)
      writeAccent(themeKey, recipe.accent)
      // The page gets its OWN hue now (Abyss: teal page, lime accent), so the
      // neutral is written by hand — which unlinks it from the accent.
      applyNeutral(recipe.neutral, themeKey)
      // The mood's severities, after the neutral: their ramps anchor to the
      // page it just produced. A hand-set state unlinks the states too.
      const pages = resolveThemePages(useDesignStore.getState(), themeKey)
      for (const role of STATE_IDS) {
        const hex = recipe.states[role]
        writeState(themeKey, role, hex, 'light')
        writeState(themeKey, role, darkTwinOf(hex, pages.dark), 'dark')
      }
      useDesignStore.getState().setThemeFoundations(themeKey, recipe.foundations)
      const next = useDesignStore.getState()
      useDesignStore.setState({
        architectureOverrides: resetThemeSemantics(
          next.architectureOverrides,
          recipe.semantics,
          themeKey,
        ),
      })
      if (Object.keys(next.themes).length === 1 && recipe.foundations.typography) {
        setTypography(themeKey, recipe.foundations.typography)
      }
      // A dealt style IS that style now (Reset goes back to it, and it takes
      // its name); a random look has no style's name to keep.
      const origin = next.themeOrigin?.[themeKey]
      const label = recipe.styleId
        ? styleLabelAfterShuffle(themeKey, next.themeLabels, origin, recipe.styleId)
        : randomLabelAfterTweak(themeKey, next.themeLabels, origin)
      if (recipe.styleId) useDesignStore.getState().setThemeOrigin(themeKey, recipe.styleId)
      if (label) useDesignStore.getState().setThemeLabel(themeKey, label)
    })
  }
  if (randomHandle) randomHandle.current = applyRandomTheme

  const typeScaleMode = inferTypeScaleMode(typography.sizes)
  const typeScaleBodyPx = TYPE_SCALE_MODES.map((mode) => parseFloat(buildTypeScale(mode.factor).sizes['text-md'] ?? '') || 0)
  const currentBodyPx = parseFloat(typography.sizes?.['text-md'] ?? '') || 0

  const parsedStrokeSm = parseFloat(stroke?.sm ?? '1px')
  const strokeSm = Number.isFinite(parsedStrokeSm) ? parsedStrokeSm : 1
  const strokeIndex = Math.max(0, STROKE_SM_STOPS.findIndex((stop) => stop === strokeSm))
  // A try-on is EDITABLE. The rail used to dim to `opacity-50
  // pointer-events-none` while one was live, on the theory that it should read
  // as inactive beside an uncommitted style — and that is the reported
  // "parálisis": the workspace lands on a seeded Core try-on, so the very first
  // thing a new user sees is a whole column of controls they cannot touch, with
  // no visible way out except a button in a different column.
  //
  // Nothing about the dimming was load-bearing. `resolveWriteTarget` already
  // adopts the style on the first write and every path into the store
  // (`commit`, `applyScrub`) goes through it, so the controls were mechanically
  // ready the whole time — the CSS was the only obstacle. Editing a try-on now
  // does exactly what editing anything else does, and the adopt announces
  // itself (`announceAdopted`) so the new row in My themes isn't a surprise.
  const colorPickerOpen = openChip != null
  const quickEditOpen = colorPickerOpen

  useEffect(() => {
    onQuickEditOpenChange?.(quickEditOpen)
  }, [quickEditOpen, onQuickEditOpenChange])

  useEffect(() => {
    setOpenChip(null)
    if (activePanel !== 'color') onContrastOpenChange?.(false)
  }, [activePanel, onContrastOpenChange])

  const aside = (
    <aside
      id={QUICK_SETTINGS_ID}
      aria-label={t('Quick settings')}
      className={embed || inInspector
        ? 'flex-1 min-h-0 w-full flex flex-col'
        : `flex-shrink-0 min-h-0 flex flex-col border-r border-line ${WORKSPACE_CHROME}`}
      style={embed || inInspector ? undefined : { width: QUICK_SETTINGS_WIDTH }}
    >
      {/* No Name band here any more: a theme is renamed where it is LISTED —
          double-click in the theme switcher or the library, or Rename in a
          row's options. This column is for editing how the theme looks. */}
      {/* Only "Edit theme" adds a style to My themes (sheet or rail). The error
          below is the My-themes-full case. */}
      {inBand && !tryOn && (
        <InspectorHeaderPortal>
          <PanelHeader
            editing={editList}
            title={editList ? t('Edit {name}', { name: brandLabel }) : t('Theme')}
            name={<ThemeNameField key={previewTheme} previewTheme={previewTheme} />}
            // The docked inspector pin covers this panel: drop it, or the
            // edit list opens underneath and the button looks dead.
            onEdit={onSelectPanel ? () => { releaseInspectorPin(); setEditList(true) } : undefined}
            onBack={() => { releaseInspectorPin(); setEditList(false) }}
          />
        </InspectorHeaderPortal>
      )}
      {/* The create studio has no inspector band to portal into: it draws the
          same band here, so a new brand's panel reads exactly like a saved
          one's (name field + Edit, then the accordion). */}
      {!inBand && startStyle && !tryOn && (
        <div
          className="flex flex-shrink-0 items-center border-b border-line"
          style={{ height: INSPECTOR_TABS_H, paddingInline: `calc((${INSPECTOR_TABS_H}px - 2.5rem) / 2)` }}
        >
          <PanelHeader
            editing={editList}
            title={editList ? t('Edit {name}', { name: brandLabel }) : t('Theme')}
            name={<ThemeNameField key={previewTheme} previewTheme={previewTheme} />}
            onEdit={onSelectPanel ? () => setEditList(true) : undefined}
            onBack={() => setEditList(false)}
          />
        </div>
      )}
      {adoptError && <p role="alert" className="flex-shrink-0 px-[var(--inspector-inset)] pt-3 text-mini text-status-danger">{adoptError}</p>}
      {/* Only this region scrolls; the Undo bar below is a pinned footer, so it
          never floats mid-content or leaves a gap under a short rail. Same
          shape as KitsPopover's scroll-body + fixed-footer. */}
      <div className="flex flex-1 min-h-0 flex-col">
      {/* Under a header band (the inspector's, or the create studio's Name
          band) the accordion starts flush: its rows carry their own height and
          dividers, so top padding only left a strip above Color. */}
      <ThemeRailScrollRegion padClass={inBand || startStyle ? 'pb-3' : 'py-3'}>
      {editList && onSelectPanel && !tryOn ? (
        <EditList
          active={activePanel}
          locked={setupStep != null}
          onPick={(key) => {
            onSelectPanel(key)
            setEditList(false)
            // Picking a row is "take me there": it opens even if it was the
            // folded current row, and lands at the top of the panel.
            setRailCollapsed(false)
            setLandOn(key)
          }}
        />
      ) : tryOn ? (
        // A previewed style isn't yours yet, so there is nothing to edit — show
        // what it is and the one way to make it yours, instead of controls
        // that would have to adopt it behind your back.
        <section aria-label={t('EscalaUI styles')} className="min-w-0">
          <div className="flex min-h-8 items-center border-b border-line px-[var(--inspector-inset)] pb-2 mb-3">
            <span className="min-w-0 truncate text-caption font-normal text-fg">{t('EscalaUI styles')}</span>
          </div>
          <StyleOverview
            compact
            preset={tryOn.preset}
            appearance={tryOn.appearance}
            owned={myThemeKeys(store.themeOrder, store.themes).some((key) => store.themeOrigin?.[key] === tryOn.preset.id)}
            firstSystem={myThemeKeys(store.themeOrder, store.themes).length === 0}
            onEdit={editTryOn}
          />
        </section>
      ) : (
      <div className="flex flex-col">
        {<EditionCard
          title="Color"
          foundationKey="color"
          open={activePanel === 'color'}
          summary={<><span aria-hidden className="h-3 w-3 flex-shrink-0 rounded-[3px] border border-line" style={{ background: liveAccent }} />{liveAccent.toUpperCase()}</>}
          flush
          onReset={colorReset}
          resetTarget={rowResetTarget}
          onOpenAdvanced={onOpenAdvanced}
          showAdvancedEdition={showAdvancedEdition}
          advancedDisabled={editionLocked}
          // The Contrast grid is a check, not a setting: a small toggle on the
          // header (beside Reset and the chevron) instead of a row in the body,
          // so the colours stay short and Font · Radius sit closer below.
          action={(
            <button
              type="button"
              onClick={() => onContrastOpenChange?.(!contrastOpen)}
              aria-pressed={contrastOpen}
              aria-label={contrastOpen ? `${t('Hide')} ${t('Contrast grid')}` : `${t('Show')} ${t('Contrast grid')}`}
              title={t('Contrast grid')}
              className={`grid h-6 w-6 place-items-center rounded-md transition-[background-color,box-shadow,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55 ${
                contrastOpen ? 'bg-elevated ring-1 ring-accent-ui' : 'opacity-80 hover:bg-elevated hover:opacity-100'
              }`}
            >
              <ContrastGridThumb tones={contrastThumbTones} className="size-4 rounded-[3px]" />
            </button>
          )}
          // ONE row on every plan: "Themes this brand ships" below. A brand
          // that ships one theme is edited in it. A brand that ships both is
          // shown in the theme it opens on, and the "Opens on ⇄" line under
          // the row swaps it — so Pro is Free plus one line, not a second
          // Light/Dark switch. Only a style that is merely tried on (it ships
          // nothing yet, so it has no row) keeps a plain view switch.
          trailing={tryOn ? (
            <ColorAppearanceSwitch
              value={rampAppearance}
              onChange={(next) => onColorAppearanceChange?.(next)}
              lockedTo={free ? (shipsOne ?? rampAppearance) : undefined}
            />
          ) : undefined}
        >
          <div className="divide-y divide-line">
            {startStyle && (
              <div className={RAIL_BLOCK}>
                <StylePicker value={startStyle.value} accent={liveAccent} onChange={startStyle.onChange} />
              </div>
            )}
            <div className={RAIL_BLOCK}>
              <ColorRolesPanel
                appearance={rampAppearance}
                rampContrast={(
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-0.5">
                        <span className={SLIDER_LABEL}>{t('Ramp contrast')}</span>
                        <InfoHint>{t('How far apart the twelve tones of every ramp sit.')}</InfoHint>
                      </span>
                      <span className={SLIDER_VALUE}>{formatShift(contrastShift)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <ContrastSlider
                          hueHex={liveNeutral}
                          value={contrastShift}
                          showMarks={false}
                          onChange={(n) => commit('Contrast shift updated', () => setContrastShift(n))}
                        />
                      </div>
                      <FineResetButton
                        label={t('Reset contrast shift')}
                        disabled={contrastShift === 0}
                        onClick={() => commit('Contrast shift reset', () => setContrastShift(0))}
                        className="-mt-0.5"
                      />
                    </div>
                  </div>
                )}
                // Light · Dark and Random (with how daring it is) live on
                // the board toolbar, so the rail starts at the colours.
                rows={colorRows}
                selected={colorRole}
                onSelect={setColorRole}
                onHex={setRoleHex}
                onHexPreview={previewRoleHex}
                onHuePreview={previewRoleHue}
                onHueCommit={commitRoleHue}
                solveAt={(id, hue) => roleAtHue(id, hue)[rampAppearance]}
                neutralTint={activeTint}
                onNeutralTint={(tint) => colorCommit('Neutral tint updated', (themeKey) => {
                  setNeutralTint(tint)
                  applyNeutral(linkNeutralToAccent ? neutralFromBrand(liveAccent, tint) : neutral, themeKey, true)
                })}
                onToggleLink={(id) => (id === 'neutral' ? toggleNeutralLink() : toggleStatesLink())}
                page={themePage[rampAppearance]}
                ramps={roleRamps}
                naming={colorReadStore.colorNaming}
                rampOpen={mappedColour}
                onRampOpenChange={onMappedColourChange}
                rampLegend={rampLegend}
              />
            </div>

            {/* Fine-tune moved into each colour's picker (icons: Saturation ·
                Brightness · Ramp contrast). The Contrast grid opens from the
                card header (`action`). */}
          </div>
        </EditionCard>}

        {(() => {
          // The SAME two families Variables · Type ships (`font-family-body` /
          // `font-family-heading`) — the quick card showed only the body one,
          // so a theme with a distinct heading face (Nature's Fraunces over DM
          // Sans) couldn't be seen or changed here. `headingFontFamily`
          // undefined means "same as body", which is exactly what Variables'
          // display row falls back to.
          // Built-in list, then the families this system ADDED (AddFontDialog),
          // then — only if it is neither — the value the theme already holds.
          const added = fontSources.filter((f) => !FONT_PRESETS.some((p) => p.value === f.family))
          const familyOptions = (current: string) => {
            const known = FONT_PRESETS.some((item) => item.value === current) || added.some((f) => f.family === current)
            return [
              ...(known ? [] : [{ value: current, label: current, group: 'In this theme' }]),
              ...added.map((f) => ({ value: f.family, label: f.family, group: 'Added to this system' })),
              ...FONT_PRESETS.map((font) => ({ value: font.value, label: font.label, group: font.category })),
            ]
          }
          const stackOf = (family: string) => fontStack(family, fontSources.find((f) => f.family === family)?.category)
          const setBody = (value: string) => commit('Typeface updated', (themeKey) => { loadGoogleFont(value); setTypography(themeKey, { ...typography, fontFamily: value }) })
          const setDisplay = (value: string) => commit('Heading typeface updated', (themeKey) => { loadGoogleFont(value); setTypography(themeKey, { ...typography, headingFontFamily: value }) })
          const addFontFooter = (field: 'body' | 'display') => (close: () => void) => (
            <AddFontButton onOpen={() => { close(); setAddFontFor(field) }} />
          )
          const headingFamily = typography.headingFontFamily ?? typography.fontFamily
          return (
        <EditionCard title="Font" foundationKey="typography" onReset={rowReset('typography', 'Font')} resetTarget={rowResetTarget} open={activePanel === 'typography'} summary={headingFamily === typography.fontFamily ? typography.fontFamily : `${typography.fontFamily} · ${headingFamily}`} onOpenAdvanced={onOpenAdvanced} showAdvancedEdition={showAdvancedEdition} advancedDisabled={editionLocked}>
          {/* One stack of labelled fields (name | control, like Colour's role
              rows), then the roles they grade. The
              notes that used to be hover hints now open with the list, where
              the choice is made. */}
          <div className={`flex flex-col gap-2 ${RAIL_BLOCK}`}>
            <PickerField
              label="Body"
              ariaLabel="Body font family"
              value={typography.fontFamily}
              render={(value) => ({ fontFamily: stackOf(value) })}
              leading={<span className="text-ui font-medium leading-none text-fg" style={{ fontFamily: stackOf(typography.fontFamily) }}>Aa</span>}
              options={familyOptions(typography.fontFamily)}
              searchPlaceholder="Search fonts"
              emptyLabel="No fonts match"
              info={<InfoHint>{t("Headings, body text and controls.")}</InfoHint>}
              onChange={setBody}
              footer={addFontFooter('body')}
            />
            {/* Only the Display role reads this family (`font-family-heading`);
                H1–H6 follow the body stack — the same rule Variables and Docs
                state. */}
            <PickerField
              label="Display"
              ariaLabel="Display font family"
              value={headingFamily}
              render={(value) => ({ fontFamily: stackOf(value) })}
              leading={<span className="text-ui font-medium leading-none text-fg" style={{ fontFamily: stackOf(headingFamily) }}>Aa</span>}
              options={familyOptions(headingFamily)}
              searchPlaceholder="Search fonts"
              emptyLabel="No fonts match"
              info={<InfoHint>{t("Display titles only. Headings, body and controls use the body font.")}</InfoHint>}
              onChange={setDisplay}
              footer={addFontFooter('display')}
            />
            <AddFontDialog
              open={addFontFor !== null}
              onClose={() => setAddFontFor(null)}
              onAdded={(family) => (addFontFor === 'display' ? setDisplay(family) : setBody(family))}
            />
            {/* A dot per scale step, the body size riding the thumb: the mode
                names are too long for a thumb, so the name sits in the header
                (as Border width's word does) and the thumb says what it does. */}
            <div className="mt-1">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className={SLIDER_LABEL}>{t('Text scale')}</span>
                <span className={SLIDER_VALUE}>{t(TYPE_SCALE_MODES.find((mode) => mode.key === typeScaleMode)?.label ?? 'Custom')}</span>
              </div>
              <DotSlider
                ariaLabel="Type scale"
                stops={TYPE_SCALE_MODES.map((_, i) => i)}
                // Custom sizes seat the thumb on the mode whose body size is closest.
                value={typeScaleMode
                  ? TYPE_SCALE_MODES.findIndex((mode) => mode.key === typeScaleMode)
                  : typeScaleBodyPx.reduce((best, px, i) => Math.abs(px - currentBodyPx) < Math.abs(typeScaleBodyPx[best] - currentBodyPx) ? i : best, 0)}
                format={(i) => `${typeScaleBodyPx[i]}px`}
                onScrubStart={() => beginScrub('Type scale updated')}
                onScrubEnd={endScrub}
                onChange={(i) => applyScrub('Type scale updated', (themeKey) => {
                  const { sizes: nextSizes, lineHeights } = buildTypeScale(TYPE_SCALE_MODES[i].factor)
                  setTypography(themeKey, { ...typography, sizes: nextSizes, lineHeights })
                })}
              />
            </div>
          </div>
        </EditionCard>
          )
        })()}

        {(
        <EditionCard title="Radius" foundationKey="radius" onReset={rowReset('radius', 'Radius')} resetTarget={rowResetTarget} open={activePanel === 'radius'} summary={t(matchRadiusRolePreset(foundations.radiusRoles) ?? 'Custom')} onOpenAdvanced={onOpenAdvanced} showAdvancedEdition={showAdvancedEdition} advancedDisabled={editionLocked}>
          <SettingItem>
            <RadiusCard
              radius={radius}
              radiusRoles={foundations.radiusRoles}
              radiusRoleViewports={foundations.radiusRoleViewports}
              platform={previewViewport}
              onRoles={(next) => applyScrub('Radius updated', (themeKey) => setRadiusRoles(themeKey, next))}
              onScrubStart={() => beginScrub('Radius updated')}
              onScrubEnd={endScrub}
              onPreset={(label) => commit('Radius preset updated', (themeKey) => setRadiusPreset(themeKey, label))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {(
        <EditionCard title="Shadow" foundationKey="shadow" onReset={rowReset('shadow', 'Shadow')} resetTarget={rowResetTarget} open={activePanel === 'shadow'} summary={shadowsDark
          ? `${t(matchShadowPreset(shadows) ?? 'Custom')} / ${t(matchDarkShadowPreset(shadowsDark) ?? 'Custom')}`
          : t(matchShadowPreset(shadows) ?? 'Custom')} onOpenAdvanced={onOpenAdvanced} showAdvancedEdition={showAdvancedEdition} advancedDisabled={editionLocked}>
          <SettingItem>
            <ShadowCard
              shadows={shadows}
              shadowsDark={shadowsDark}
              onChange={(value) => commit('Shadow depth updated', (themeKey) => setShadows(themeKey, value))}
              onChangeDark={(value) => commit('Dark shadow depth updated', (themeKey) => setShadowsDark(themeKey, value))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {(
        <EditionCard title="Spacing" foundationKey="sizes" onReset={rowReset('sizes', 'Spacing')} resetTarget={rowResetTarget} open={activePanel === 'sizes'} summary={t(SPACING_MODES.find((mode) => mode.id === matchSpacingMode(sizes, spacingRoles, stroke))?.label ?? 'Custom')} onOpenAdvanced={onOpenAdvanced} showAdvancedEdition={showAdvancedEdition} advancedDisabled={editionLocked}>
          <SettingItem>
            <CutFacts rows={[
              { label: previewViewport === 'mobile' ? 'Touch' : 'Control', value: sizes[sizeUsedStep] ?? sizeUsedStep },
            ]} />
          </SettingItem>
          <SettingItem>
            <SpacingModeGrid
              value={matchSpacingMode(sizes, spacingRoles, stroke)}
              spacing={spacing}
              sizes={sizes}
              stroke={stroke}
              onChange={(mode) => commit(`Spacing mode: ${mode.label}`, (themeKey) => {
                setSizes(themeKey, buildSizesFromBase(mode.fieldBase))
                setContainerInset(themeKey, SPACING_STEPS.indexOf(mode.insetStep))
                setStroke(themeKey, { ...stroke, sm: `${mode.border}px` })
              })}
            />
          </SettingItem>

          <SettingItem label="Card padding" hint="The inset of cards, modals and alerts (Spacing · Inset surface). Pick the middle to set every side, or one band to give that side its own value.">
            <InsetSidesCard
              spacing={spacing}
              spacingRoles={spacingRoles}
              onBase={(step) => applyScrub('Card padding updated', (themeKey) => setContainerInset(themeKey, SPACING_STEPS.indexOf(step as (typeof SPACING_STEPS)[number])))}
              onSide={(side, step) => applyScrub('Card padding updated', (themeKey) => setContainerInsetSide(themeKey, side, step))}
              onScrubStart={() => beginScrub('Card padding updated')}
              onScrubEnd={endScrub}
            />
          </SettingItem>

          <SettingItem
            label="Fields"
            hint={t('Base unit × 8 = SM, × 10 = Control (MD). Keep MD at least {minPx}px (base {minBase} or higher).', {
              minPx: SIZE_CONTROL_MIN_PX,
              minBase: FIELD_BASE_MIN.toFixed(1),
            })}
          >
            <BaseUnitCard
              ariaLabel="Fields base size in pixels"
              kind="field"
              steps={SIZE_STEPS}
              values={sizes}
              usedStep={sizeUsedStep}
              base={inferSizeBase(sizes) ?? null}
              onScrubStart={() => beginScrub('Field sizes updated')}
              onScrubEnd={endScrub}
              onChange={(base) => applyScrub('Field sizes updated', (themeKey) => setSizes(themeKey, buildSizesFromBase(base)))}
            />
          </SettingItem>

          <SettingItem
            label="Border width"
            value={t(strokeSm === 0 ? 'No border' : strokeSm < 1 ? 'Hairline' : 'Border')}
            hint="Controls dividers and component borders. The 2px focus ring remains unchanged."
          >
            <div>
              <DotSlider
                ariaLabel="Border width"
                stops={STROKE_SM_STOPS}
                value={STROKE_SM_STOPS[strokeIndex]}
                format={(stop) => stop === 0 ? t('None') : `${stop}px`}
                onScrubStart={() => beginScrub('Border width updated')}
                onScrubEnd={endScrub}
                onChange={(next) => applyScrub('Border width updated', (themeKey) => setStroke(themeKey, { ...stroke, sm: `${next}px` }))}
              />
            </div>
          </SettingItem>
        </EditionCard>
        )}

        {(
        <EditionCard title="Icons" foundationKey="icons" onReset={rowReset('icons', 'Icons')} resetTarget={rowResetTarget} open={activePanel === 'icons'} summary={t((iconWeight ?? 'regular').charAt(0).toUpperCase() + (iconWeight ?? 'regular').slice(1))} onOpenAdvanced={onOpenAdvanced} showAdvancedEdition={showAdvancedEdition} advancedDisabled={editionLocked}>
          <div className={RAIL_BLOCK}>
            <IconStyleOverview weight={iconWeight ?? 'regular'} ariaLabel={t('Phosphor icons at this weight')} />
            <p className="mt-2 text-center text-micro text-fg-faint">{t('Phosphor icons at this weight')}</p>
          </div>
          <div className={RAIL_BLOCK}>
            <PickerField
              label="Weight"
              ariaLabel="Icon weight"
              info={<InfoHint>{t("Phosphor stroke weight for every glyph. The set never changes; only the weight is a style decision.")}</InfoHint>}
              value={iconWeight ?? 'regular'}
              leading={<PhosphorWeightProvider weight={iconWeight ?? 'regular'}><PreviewIcon concept="home" size={14} /></PhosphorWeightProvider>}
              options={PHOSPHOR_WEIGHTS.map((weight) => ({
                value: weight,
                label: weight.charAt(0).toUpperCase() + weight.slice(1),
              }))}
              onChange={(value) => commit('Icon weight updated', (themeKey) => setIconWeight(themeKey, value))}
            />
          </div>
          <SettingItem label="Icon sizes" hint="Three sizes that follow your control height — larger buttons and fields get larger glyphs, smaller ones smaller. The same size on Desktop, Tablet and Mobile.">
            <IconSizeLadder weight={iconWeight ?? 'regular'} sizes={sizes} />
          </SettingItem>
        </EditionCard>
        )}

        {(
        <EditionCard title="Motion" foundationKey="motion" onReset={rowReset('motion', 'Motion')} resetTarget={rowResetTarget} open={activePanel === 'motion'} summary={t(motionSummary(motion))} onOpenAdvanced={onOpenAdvanced} showAdvancedEdition={showAdvancedEdition} advancedDisabled={editionLocked}>
          <div className={RAIL_BLOCK}>
            <MotionPreview settings={motion} />
          </div>
          <div className={RAIL_BLOCK}>
            <PickerField
              label="Preset"
              ariaLabel="Motion preset"
              info={<InfoHint>{t("How every component moves: hovers, overlays, lists. Reduced motion is built in on top of any preset.")}</InfoHint>}
              value={motionPreset ?? 'custom'}
              valueLabel={motionPreset ? undefined : t('Custom')}
              options={MOTION_PRESET_KEYS.map((key) => ({
                value: key,
                label: MOTION_PRESETS[key].label,
                description: MOTION_PRESETS[key].brief,
              }))}
              onChange={(value) => commit('Motion updated', (themeKey) => setMotionPreset(themeKey, value))}
            />
          </div>
        </EditionCard>
        )}

        {themeReset.show && (
          <div className="px-[var(--inspector-inset)] pt-3">
            <ThemeResetButton wide mode={themeReset.mode} target={themeReset.target} onClick={themeReset.onClick} />
          </div>
        )}
      </div>
      )}
      </ThemeRailScrollRegion>

      {/* Undo + Save / Update theme — shared with Variables. Hidden while a
          System Style is only tried on (that overlay is not the store). */}
      {!embed && !tryOn && (setupStep != null ? <ThemeSetupBar themeKey={previewTheme} /> : (
        <ThemeSaveBar
          exploringRandom={exploringRandom}
          onSaved={onExploringRandomEnd}
          onGetCode={onUseTheme}
          ship={ship}
          themeKey={previewTheme}
          onDiscard={onDiscardRandom}
        />
      ))}
      </div>
    </aside>
  )
  // Guided setup opens one step at a time: the strip stays, the other steps wait.
  const switchable = (
    <EditionSwitchContext.Provider value={onSelectPanel ? { select: onSelectPanel, locked: setupStep != null, collapsed: railCollapsed, setCollapsed: setRailCollapsed } : null}>{aside}</EditionSwitchContext.Provider>
  )
  return embed
    ? <InspectorHeaderInline>{switchable}</InspectorHeaderInline>
    : <InspectorPortal>{switchable}</InspectorPortal>
}
