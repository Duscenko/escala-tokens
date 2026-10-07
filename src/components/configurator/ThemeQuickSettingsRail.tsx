// Theme Preview's left rail — one foundation's quick-edit panel at a time.
// Edition sits on `WORKSPACE_CHROME` (no inner `--app` card). `RailCard` is
// the integration-rail card (Connection / Protocol), not this column.
//
// The 64px `FoundationIconRail` beside this column picks the widget: Color
// (accent hue + neutral tint + state chips + Add secondary + Contrast grid),
// Text, Radius, Shadow, Size, Stroke, Icons (status action + weight). Stacking every card at once made the
// artefacts board compete with a scroll of controls; the icon rail is the
// same switcher Variables already uses, so Color / Font / Radius mean the
// same thing one tab apart.
//
// Deliberately NOT here: a "Theme recipe" preset, a Radius Form axis, and the
// Noise effect toggle. Shadows are included because they are a real,
// theme-scoped foundation and repaint the specimens beside this rail.

import { recordEdit, undoEdit, useEditHistory } from '../../lib/editHistory'
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { activeLibraryId, captureSnapshot, DEFAULT_THEME_SOURCES, libraryMatchesSaved, RESERVED_COLOR_KEYS, type DesignSnapshot, useDesignStore } from '../../store/useDesignStore'
import {
  useApplyAccentColor, useApplyGrayColor, useApplyStateColor, addBrandExtra, removeBrandExtra,
  resolveThemePages, stateColorAnchor, type StateRole,
} from '../../lib/colorActions'
import { backgroundFromBase, colorAtHue, generateColorScale, generateDarkColorScale, generateFamilyDarkScale, neutralFromBrand, NEUTRAL_TINTS, readHuePosition, type NeutralTint } from '../../lib/colorUtils'
import { fontStack, FONT_PRESETS, loadGoogleFont } from '../../lib/fonts'
import { TYPE_SCALE_MODES, buildTypeScale, inferTypeScaleMode } from '../../lib/typographyStandard'
import {
  BASE_UNIT_RANGE,
  SELECTOR_DEFAULT_BASE,
  SIZE_DEFAULT_BASE,
  SIZE_STEPS,
  SPACING_STEPS,
  STROKE_SM_STOPS,
  buildSelectorsFromBase,
  buildSizesFromBase,
  inferSelectorBase,
  inferSizeBase,
  INSET_SURFACE_ROLE,
  PADDING_DEFAULT_STEP,
  insetSurfacePadding,
  mergeLayoutRoles,
  OVERLAP_SIZES,
  SPACING_MODES,
  matchSpacingMode,
  type OverlapSize,
  type SpacingMode,
  roleValuePx,
  RADIUS_GROUPS,
  RADIUS_GROUP_STEPS,
  matchRadiusRolePreset,
  radiusPresetPatch,
  radiusGroupStep,
  applyRadiusGroup,
  type GridViewport,
} from '../../lib/layoutTokens'
import { slugify } from '../../lib/utils'
import {
  BRAND_EXTRA_LABEL, GLOBAL_FAMILY, SLOT_DISPLAY_LABEL, nextBrandExtraRank, scaleForFamily,
  type BrandExtraRank,
} from '../../lib/themeSources'
import type { ThemeAppearance } from '../../lib/themeModes'
import { resetThemeSemantics, stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import { openStyleForEditing } from '../../lib/adoptPreset'
import { StyleOverview } from './StyleOverview'
import { randomTheme, randomBoardAppearance } from '../../lib/randomTheme'
import { isScaffoldTheme, myThemeKeys, resolveListedTheme } from '../../lib/themeLibrary'
import { presetHarmony } from '../../lib/themePresets'
import { resolveThemeFoundations } from '../../lib/themeFoundations'
import { goToLogin, useAccess } from '../../lib/access'
import { mergeTypeRoles, resolveTypeStyle, TYPE_ROLE_BY_KEY, asTypeViewport, type TypePrimitives } from '../../lib/typeRoles'
import { PlatformSwitch } from './PlatformRail'
import RailSelect from '../ui/RailSelect'
import { radiusPresetOptions } from './radiusPresetOptions'
import { SHADOW_PRESETS, matchShadowPreset } from '../../lib/shadowTokens'
import { PHOSPHOR_WEIGHTS, type PhosphorWeight } from '../../lib/phosphorIcons'
import { IconSizeLadder, IconStyleOverview } from './docs/specimens'
import { COLOR_RAIL_WIDTH, ColorPickerPopover, STATE_PRESETS, THEME_BAND_H } from './colorControls'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL, SEGMENT_ACTIVE, SEGMENT_INACTIVE, SELECT_LIST, SELECT_OPTION, SELECT_OPTION_OFF, SELECT_OPTION_ON, SELECT_TRIGGER, WORKSPACE_CHROME } from './themeWorkspaceLayout'
import SpectrumSlider from '../ui/SpectrumSlider'
import { showToast } from '../ui/Toast'
import { useI18n } from '../../lib/i18n'
import { InspectorPortal, useInInspector } from './WorkspaceInspector'

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
 * sliders: `.quick-settings-range` is a 20px box drawing a 4px track, so it
 * carries ~8px of its own air on each side and a 13.5px margin on top of that
 * read as ~21px of gap. Measured against the value it labels, not in isolation.
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
          aria-label={t('Theme name')}
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
  const store = useDesignStore()
  const savedLibrary = store.savedSystems.find((entry) => entry.id === activeLibraryId(store))
  return useMemo(
    () => (savedLibrary ? libraryMatchesSaved(store as unknown as DesignSnapshot, savedLibrary.snapshot) : false),
    [store, savedLibrary],
  )
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
      <div ref={scrollRef} className={`h-full min-h-0 overflow-y-auto ${padClass}`}>
        {children}
      </div>
      {fade('bottom', edges.bottom)}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function InfoIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden><circle cx="8" cy="8" r="5.75" /><path d="M8 7.25v3.4M8 5.1h.01" /></svg>
}

function AdvancedIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden><path d="M2.5 4h6M11.5 4h2M2.5 8h2M7.5 8h6M2.5 12h7M12.5 12h1" /><circle cx="10" cy="4" r="1.4" /><circle cx="6" cy="8" r="1.4" /><circle cx="11" cy="12" r="1.4" /></svg>
}

/** Desktop / Mobile for Type, Size and Grid edition — same session cut
 *  Variables' Platform rail writes. Compact fill so it fits the card header
 *  the way Color's Light/Dark does. */
function PlatformCutSwitch({ value, onChange }: {
  value: GridViewport
  onChange: (platform: GridViewport) => void
}) {
  return <PlatformSwitch value={value} onChange={onChange} layout="compact" />
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
 * OVERLAP as a bar — the same shape as Border width below it: a caption + live
 * px over a 6-stop slider (xs … 2xl) with the stop names underneath. It picks
 * which `overlap-*` role the board's avatar card shows, so dragging it walks
 * the stack through the system's six overlaps. The px are the LIVE role values:
 * editing them in Variables moves the readout and the card the same frame.
 */
function OverlapBar({ value, onChange, pxOf }: {
  value: OverlapSize
  onChange: (size: OverlapSize) => void
  pxOf: (size: OverlapSize) => number
}) {
  const { t } = useI18n()
  const index = Math.max(0, OVERLAP_SIZES.indexOf(value))
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-micro uppercase tracking-[0.12em] text-fg-faint">{`overlap-${value}`}</span>
        <span className="text-ui font-semibold tabular-nums text-fg">{`${pxOf(value)}px`}</span>
      </div>
      <RangeInput
        ariaLabel={t('Overlap')}
        min={0}
        max={OVERLAP_SIZES.length - 1}
        step={1}
        value={index}
        onChange={(i) => onChange(OVERLAP_SIZES[i])}
        className={ROW_GAP_CONTROL}
      />
      <div className="mt-1 flex justify-between text-micro tabular-nums text-fg-faint" aria-hidden>
        {OVERLAP_SIZES.map((size) => (
          <span key={size} className={size === value ? 'text-fg' : undefined}>{size}</span>
        ))}
      </div>
    </div>
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
function SpacingModeGrid({ value, onChange }: {
  value: SpacingMode['id'] | null
  onChange: (mode: SpacingMode) => void
}) {
  const { t } = useI18n()
  const order: SpacingMode['id'][] = ['compact', 'airy', 'quiet', 'bold']
  return (
    <div>
      <div role="radiogroup" aria-label={t('Spacing mode')} className="grid grid-cols-2 gap-1.5">
        {order.map((id) => {
          const mode = SPACING_MODES.find((m) => m.id === id)!
          const on = value === id
          // The drawing, at ~1/4 scale: inset, control height and stroke all
          // come from the mode itself.
          const inset = Math.round((Number(mode.insetStep) * 4) / 3)
          const control = Math.round((mode.fieldBase * 10) / 3)
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              title={t(mode.description)}
              onClick={() => onChange(mode)}
              className={`flex flex-col items-start gap-1.5 rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                on ? 'border-accent-ui bg-accent-ui/[0.08]' : 'border-line hover:border-line-strong hover:bg-elevated'
              }`}
            >
              <span
                aria-hidden
                className="flex w-full flex-col justify-end rounded-[4px] bg-fg/[0.05]"
                style={{ height: 34, padding: inset, border: `${mode.border}px solid color-mix(in srgb, var(--fg) 45%, transparent)` }}
              >
                <span className="block rounded-[2px] bg-fg/30" style={{ height: control }} />
              </span>
              <span className={`text-caption font-medium ${on ? 'text-fg' : 'text-fg-muted'}`}>{t(mode.label)}</span>
            </button>
          )
        })}
      </div>
      {value === null && (
        <p className="mt-1.5 text-micro text-fg-faint">{t('Custom — values set by hand. Pick a mode to reset all three.')}</p>
      )}
    </div>
  )
}

function ColorAppearanceSwitch({ value, onChange }: {
  value: ThemeAppearance
  onChange: (appearance: ThemeAppearance) => void
}) {
  const { t } = useI18n()
  return (
    <div
      className={`flex h-8 flex-shrink-0 items-center rounded-lg p-0.5 ${CHROME_CONTROL_SHELL}`}
      role="group"
      aria-label={t('Preview appearance')}
      title={t('Choose which appearance of this theme the artefacts display.')}
    >
      {(['light', 'dark'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          // Same pill as Desktop / Tablet / Mobile (`PlatformSwitch`): one
          // control language for every segmented switch in an edition header.
          className={`flex h-7 items-center justify-center rounded-md px-2.5 text-caption transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
            value === mode ? SEGMENT_ACTIVE : SEGMENT_INACTIVE
          }`}
        >
          {t(mode === 'light' ? 'Light' : 'Dark')}
        </button>
      ))}
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
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [position, updatePosition])

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
 * session `previewPlatform` Type and Size read. `icons` is Style edition
 * (icon weight + status action). Adding a panel means adding its key here
 * and a matching `EditionCard` below, nowhere else.
 */
export const QUICK_PANEL_FOUNDATIONS = ['color', 'typography', 'radius', 'sizes', 'shadow', 'icons'] as const
export type QuickPanelFoundation = (typeof QUICK_PANEL_FOUNDATIONS)[number]

/** Widgets whose values actually change with Desktop / Mobile. Color / radius
 *  / shadow keep the artefacts board on desktop so a platform cut is not a
 *  second appearance toggle sitting on every panel. */
export const PLATFORM_QUICK_PANELS: ReadonlySet<QuickPanelFoundation> = new Set(['typography', 'sizes'])

export function isQuickPanelFoundation(key: string): key is QuickPanelFoundation {
  return (QUICK_PANEL_FOUNDATIONS as readonly string[]).includes(key)
}

/** Widget the Preview rail should light — Color when the Variables table has no twin. */
export function previewWidgetKey(key: string): QuickPanelFoundation {
  return isQuickPanelFoundation(key) ? key : 'color'
}

const STATE_ROLES: StateRole[] = ['error', 'warning', 'success', 'info']

function extraSeedHex(brandHex: string, rank: BrandExtraRank): string {
  try {
    const { hue, position } = readHuePosition(brandHex)
    return colorAtHue(position, hue + (rank === 'secondary' ? 42 : 84))
  } catch {
    return brandHex
  }
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

/**
 * One foundation's quick panel: title, widgets, and the door to Variables.
 *
 * The "Go to advanced edition" button is `selectFoundation` in disguise —
 * `setActiveFoundation(key)` + switch to the Variables tab — so arriving there
 * lands on the very foundation you were adjusting. Color edition puts Light/
 * Dark in that header slot (the board + ramps share one appearance) and
 * replaces the footer with Random.
 *
 * Sits on `WORKSPACE_CHROME`. Do not wrap this in `RailCard` — that `--app`
 * fill is for the integration rail's Connection / Protocol blocks.
 */
function EditionCard({ title, foundationKey, trailing, footer, flush, onOpenAdvanced, children }: {
  title: string
  foundationKey: string
  /** Header slot — Color edition puts Light/Dark here. */
  trailing?: React.ReactNode
  /** Replaces the default Advanced footer. Color edition puts Random here. */
  footer?: React.ReactNode
  /** No row rules — Color edition groups with its own hairlines. */
  flush?: boolean
  onOpenAdvanced: (foundationKey: string) => void
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <section aria-label={t(title)} className="min-w-0 overflow-visible">
      <div className="flex min-h-8 items-center justify-between gap-2 border-b border-line px-3 pb-2">
        <span className="min-w-0 truncate text-caption font-semibold text-fg">{t(title)}</span>
        {trailing}
      </div>
      <div className={flush ? undefined : 'divide-y divide-line'}>{children}</div>
      {footer ?? (
        <div className="border-t border-line px-3 pb-2.5 pt-2">
          <button
            type="button"
            onClick={() => onOpenAdvanced(foundationKey)}
            className={`flex h-8 w-full items-center justify-center gap-1.5 border border-line bg-input-bg px-2 text-mini font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${RAIL_SURFACE_RADIUS}`}
          >
            <AdvancedIcon />
            {t('Go to advanced edition')}
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * Color edition's Random footer — Figma 40:1365. Fill is the same 6% wash
 * as `--line`. The stroke is that designed rainbow, traveling the perimeter
 * as a comet (`.random-theme-border` in index.css) so the button reads as
 * the one generative action without a static rainbow sitting on every row.
 */
const CONTRAST_THUMB_STEPS = [3, 9, 12] as const

function ContrastGridThumb({ tones }: { tones: readonly string[] }) {
  return (
    <span
      aria-hidden
      className="grid size-7 flex-shrink-0 grid-cols-3 gap-px overflow-hidden rounded-[5px] bg-line"
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

function RandomThemeButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('Random tweak')}
      title={t('Random tweak')}
      className="relative flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-line text-mini font-normal text-fg-muted transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <span
        aria-hidden
        className="relative z-[1] block size-[14px] bg-current"
        style={{
          WebkitMask: "url('/icons/settings/random.svg') center / contain no-repeat",
          mask: "url('/icons/settings/random.svg') center / contain no-repeat",
        }}
      />
      <span className="relative z-[1]">{t('Random tweak')}</span>
      <span aria-hidden className="random-theme-border pointer-events-none absolute inset-0 rounded-lg" />
    </button>
  )
}

function SettingItem({ label, hint, advancedLabel, onAdvanced, children }: {
  label?: string
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
      <div className="min-w-0 px-3 py-2">
        <div className="flex items-start gap-2">
          {trailing}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    )
  }

  const hasHeader = Boolean(label || trailing)
  return (
    <div className={`min-w-0 px-3 ${compact ? 'py-2' : 'py-2.5'}`}>
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
          {label ? <span className="min-w-0 truncate text-caption font-medium text-fg-muted">{t(label)}</span> : null}
          {trailing}
        </div>
      )}
      {children}
    </div>
  )
}

function RangeInput({ min, max, step, value, onChange, onScrubStart, onScrubEnd, ariaLabel, className = '' }: {
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  ariaLabel: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  const onScrubEndRef = useRef(onScrubEnd)
  const [dragging, setDragging] = useState(false)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onScrubEndRef.current = onScrubEnd }, [onScrubEnd])
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100
  const valueAt = useCallback((element: HTMLInputElement, clientX: number) => {
    const rect = element.getBoundingClientRect()
    if (!rect.width) return min
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const raw = min + ratio * (max - min)
    const snapped = min + Math.round((raw - min) / step) * step
    return Math.max(min, Math.min(max, Number(snapped.toFixed(6))))
  }, [max, min, step])
  useEffect(() => {
    if (!dragging) return
    const update = (event: PointerEvent) => {
      if (!inputRef.current) return
      onChangeRef.current(valueAt(inputRef.current, event.clientX))
    }
    const finish = (event: PointerEvent) => {
      update(event)
      setDragging(false)
      onScrubEndRef.current?.()
    }
    window.addEventListener('pointermove', update)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', update)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [dragging, valueAt])
  return (
    <input
      ref={inputRef}
      type="range"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.focus()
        onScrubStart?.()
        setDragging(true)
        onChange(valueAt(event.currentTarget, event.clientX))
      }}
      onKeyDown={(event) => {
        const amount = event.shiftKey ? step * 10 : step
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); onChange(Math.max(min, value - amount)) }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); onChange(Math.min(max, value + amount)) }
        if (event.key === 'Home') { event.preventDefault(); onChange(min) }
        if (event.key === 'End') { event.preventDefault(); onChange(max) }
      }}
      className={`quick-settings-range ${className}`}
      style={{ '--quick-range-progress': `${Math.max(0, Math.min(100, progress))}%` } as React.CSSProperties}
    />
  )
}

function Menu<T extends string>({
  value, options, onChange, ariaLabel, render,
}: {
  value: string
  /** `group` is an optional eyebrow the list breaks on. With 65 typefaces a
   *  flat column is a wall you scroll rather than a set you scan; the header
   *  only renders when it CHANGES, so an ungrouped caller is unaffected. */
  options: { value: T; label: string; description?: string; group?: string }[]
  onChange: (value: T) => void
  ariaLabel: string
  render?: (value: string) => React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} className={SELECT_TRIGGER}>
        <span className="min-w-0 flex-1 truncate text-body text-fg" style={render?.(value)}>{options.find((option) => option.value === value)?.label ?? value}</span>
        <Chevron open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} role="listbox" className={`absolute z-40 top-full left-0 mt-1.5 w-full max-h-64 overflow-y-auto ${SELECT_LIST}`}>
            {options.map((option, index) => (
              <Fragment key={option.value}>
              {option.group && option.group !== options[index - 1]?.group ? (
                <div className={`px-2.5 pb-1 text-micro font-semibold uppercase tracking-[0.14em] text-fg-faint ${index ? 'mt-2 border-t border-line pt-2' : 'pt-1'}`}>
                  {option.group}
                </div>
              ) : null}
              <button type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false) }} className={`${SELECT_OPTION} ${option.value === value ? SELECT_OPTION_ON : SELECT_OPTION_OFF}`} style={render?.(option.value)}>
                <span className="block text-body">{option.label}</span>
                {option.description ? <span className="block mt-0.5 text-mini text-fg-faint">{option.description}</span> : null}
              </button>
              </Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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
  /** Primitive this platform cut actually aliases (`md` Control / `lg` Touch). */
  usedStep?: string
}) {
  const px = steps.map((step) => parseFloat(values[step] ?? '0') || 0)
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
      <RangeInput
        min={BASE_UNIT_RANGE.min}
        max={BASE_UNIT_RANGE.max}
        step={BASE_UNIT_RANGE.step}
        value={base ?? BASE_UNIT_RANGE.min}
        onChange={onChange}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
        ariaLabel={ariaLabel}
        className={ROW_GAP_CONTROL}
      />
    </div>
  )
}

// The readout speaks ROLES, not scale steps: what a designer reads on screen is
// a caption, a label, body copy, a heading and a display title — each one an
// alias of some `text-*` / `display-*` step that can differ per platform and be
// re-pointed in Variables · Type. Reading the steps directly (it used to show
// `text-xs…text-xl`) hid every heading the slider also moves, and its "16"
// stayed 16 after `body-md` was re-pointed or the platform switched.
const TYPE_READOUT_ROLES = [
  { key: 'caption', label: 'Caption' },
  { key: 'label', label: 'Label' },
  { key: 'body-md', label: 'Body' },
  { key: 'heading-md', label: 'Heading' },
  { key: 'display', label: 'Display' },
] as const

/** Px of a type role at a platform, through the theme's own role map. */
function typeRolePx(typography: TypePrimitives & { roles?: object }, key: string, platform: string): number {
  const cut = asTypeViewport(platform)
  const alias = mergeTypeRoles(typography.roles)[key]?.[cut] ?? TYPE_ROLE_BY_KEY[key]?.[cut]
  return alias ? parseFloat(resolveTypeStyle(alias, typography).size) || 0 : 0
}

// The "Aa" row is a picture of the RELATIONSHIP between roles, not their size —
// a 60px display can't sit in a 36px row. Log-mapped onto 9–21px so the ratio
// between neighbours survives (12 → 14 → 16 still read as steps, 30 → 60 as a
// jump) where a linear clamp flattened every heading to the same cap.
function readoutGlyphPx(px: number): number {
  if (!px) return 9
  const t = (Math.log(px) - Math.log(12)) / (Math.log(72) - Math.log(12))
  return Math.round((9 + 12 * Math.min(1, Math.max(0, t))) * 10) / 10
}

/**
 * Type scale as ONE control — the same "move the whole ramp together" idea as
 * Sizes' base unit, so editing a label size is a scrub, not a trip to Advanced
 * type. Five curated density modes (`TYPE_SCALE_MODES`); dragging regenerates
 * every `text-*`/`display-*` size AND its line-height at the mode's factor, so
 * the vertical rhythm follows. Hand-editing a single size in Advanced makes the
 * readout say "Custom" (no mode matches) — the slider still snaps you back onto
 * a curated scale. The readout resolves through the ROLES at the previewed
 * platform, so it shows what the slider actually does to the text on screen.
 */
function TypeScaleCard({
  typography, platform, onScrub, onScrubStart, onScrubEnd,
}: {
  typography: TypePrimitives & { roles?: object }
  platform: string
  onScrub: (modeIndex: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}) {
  const { t } = useI18n()
  const mode = inferTypeScaleMode(typography.sizes)
  const index = mode ? TYPE_SCALE_MODES.findIndex((m) => m.key === mode) : 2
  const px = TYPE_READOUT_ROLES.map((role) => typeRolePx(typography, role.key, platform))
  const bodyPx = px[TYPE_READOUT_ROLES.findIndex((role) => role.key === 'body-md')]
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div role="img" aria-label={t('Type scale preview')} className={`flex ${ROW_PREVIEW_H} items-end gap-1.5`}>
          {px.map((value, i) => (
            <span
              key={TYPE_READOUT_ROLES[i].key}
              className="font-semibold leading-none text-fg/70"
              style={{ fontSize: readoutGlyphPx(value) }}
            >
              Aa
            </span>
          ))}
        </div>
        <div className="flex-shrink-0 text-right leading-none">
          <span className="block text-heading font-semibold tabular-nums text-fg" title={t('Body size')}>
            {Math.round(bodyPx)}
          </span>
          <span className="mt-1 block text-micro uppercase tracking-wide text-fg-faint">
            {t(mode ? TYPE_SCALE_MODES[index].label : 'Custom')}
          </span>
        </div>
      </div>
      <div className={`${ROW_GAP_CONTROL} grid gap-x-1 text-center`} style={{ gridTemplateColumns: `repeat(${TYPE_READOUT_ROLES.length}, minmax(0, 1fr))` }}>
        {TYPE_READOUT_ROLES.map((role) => (
          <span key={role.key} className="truncate text-micro font-medium uppercase text-fg-faint">{t(role.label)}</span>
        ))}
        {TYPE_READOUT_ROLES.map((role, i) => (
          <span key={role.key} className="text-mini tabular-nums text-fg-muted">{Math.round(px[i])}</span>
        ))}
      </div>
      <RangeInput
        min={0}
        max={TYPE_SCALE_MODES.length - 1}
        step={1}
        value={index}
        onChange={onScrub}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
        ariaLabel="Type scale"
        className={ROW_GAP_CONTROL}
      />
    </div>
  )
}

// One base (`lg`) grades the Tailwind/HeroUI ramp. Named presets are points
// on that formula (Sharp=8, Soft=12, Rounded=16, Pill=24), so the gallery,
// the slider and Variables' Preset dropdown can never disagree. 40 is the
// ceiling StepRadius already uses.
const RADIUS_TILE = 33 // Figma node 4185:21283

/**
 * Radius as THREE independent axes — Boxes / Fields / Selectors.
 *
 * The dial this replaced graded the whole ramp from a single `lg`, so every
 * role moved together: choosing Pill turned the CARD into a stadium along with
 * the checkbox, which is unreadable and was the reported defect. The three-axis
 * MODEL is DaisyUI's (`--radius-box` / `--radius-field` / `--radius-selector`),
 * mapped onto the roles this system already ships, so the token contract is
 * unchanged and only WHICH step each role aliases is picked per axis.
 *
 * The PRESENTATION is Figma node 4185:21283, adapted: each option is a 33px
 * well whose TOP-LEFT corner is drawn at that step's radius (an L of
 * left + top border, other corners square, so the arc IS the sample). The
 * selected well fills, its L goes accent and doubles in weight, gets an inset
 * press shadow, and carries a small round badge with the resolved px. The
 * design's hardcoded hexes map to chrome tokens: `#737375` L → `--fg` at 22%,
 * `#285cc3` selected L → `--accent-ui`, `#2a2a2d` fill → `--elevated`,
 * `rgba(40,92,195,0.24)` badge → `--accent-ui` at 22%. The ramp is not edited
 * here — five steps meaning the same pixels on every axis is what makes the
 * axes comparable; regrading belongs in the advanced editor.
 */
function RadiusTile({
  px, step, value, groupLabel, selected, onClick,
}: {
  px: number
  step: string
  value: string
  groupLabel: string
  selected: boolean
  onClick: () => void
}) {
  // Cap so `full` (9999) draws a quarter circle rather than overflowing.
  const r = Math.min(px, RADIUS_TILE)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${groupLabel} radius ${step} (${value})`}
      title={`${step} — ${value}`}
      onClick={onClick}
      className="relative shrink-0 transition-[border-color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      style={{
        width: RADIUS_TILE,
        height: RADIUS_TILE,
        borderStyle: 'solid',
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: selected ? 2 : 1,
        borderTopWidth: selected ? 2 : 1,
        borderTopLeftRadius: r,
        // Figma's selected L is a saturated accent stroke (#285cc3), which is
        // `--accent-solid` (the brand), not `--accent-ui` (which walks toward
        // the page for text contrast and reads pastel here).
        borderColor: selected
          ? 'var(--accent-solid)'
          : 'color-mix(in srgb, var(--fg) 22%, transparent)',
        background: selected
          ? 'var(--elevated)'
          : 'color-mix(in srgb, var(--elevated) 55%, transparent)',
        // A pressed-well cue — dark in both themes, so the hardcode is correct.
        boxShadow: selected ? 'inset 0 4px 4px rgba(0,0,0,0.25)' : undefined,
      }}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[8px] font-medium leading-none tabular-nums"
          style={{
            width: 16,
            height: 16,
            background: 'color-mix(in srgb, var(--accent-solid) 20%, transparent)',
            color: 'var(--accent-ui)',
          }}
        >
          {Math.round(px)}
        </span>
      )}
    </button>
  )
}

function RadiusCard({
  radius, radiusRoles, onRoles, onPreset,
}: {
  radius: Record<string, string>
  radiusRoles: Record<string, string> | undefined
  onRoles: (next: Record<string, string>) => void
  /** Apply a preset — the three axis picks on the standard ramp. */
  onPreset: (label: string) => void
}) {
  // `gap-3` (13.5px here), not the design's literal 15px — a one-off arbitrary
  // value in a column where every other gap is a scale step is a 2px difference
  // nobody can see and one more number to keep in step.
  return (
    <div className="flex flex-col gap-3">
      {/* The same select the Variables rail carries. A preset IS a set of the
          three axis picks below, so choosing one moves those rows, and moving a
          row off the bundle reads Custom. */}
      <div className="min-w-0">
        <span className="mb-1 block text-micro font-medium text-fg-muted">Preset</span>
        <RailSelect
          value={matchRadiusRolePreset(radiusRoles)}
          options={radiusPresetOptions()}
          onChange={onPreset}
          ariaLabel="Radius preset"
        />
      </div>
      {RADIUS_GROUPS.map((group) => {
        const current = radiusGroupStep(group, radiusRoles)
        return (
          <div key={group.key} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-1.5">
              {/* Muted, like every other label in this rail — see the rule
                  under `SettingItem`'s own label. At `text-fg` these 9px axis
                  names read STRONGER than the 11px row label above them, which
                  inverts the hierarchy: the only full-strength text in a card
                  is its title and its resolved values (here, the px badge on
                  the selected tile). */}
              <span className="min-w-0 flex-shrink-0 text-micro font-medium text-fg-muted">{group.label}</span>
              <span className="min-w-0 flex-1 truncate text-nano text-fg-faint">{group.hint}</span>
              {/* The Figma has no header readout — the badge on the selected
                  well carries the value. `Custom` is the one case it does not
                  cover (roles off the ladder), so it stays here. */}
              {current === null && (
                <span className="flex-shrink-0 text-nano text-fg-faint">Custom</span>
              )}
            </div>
            <div className="flex items-center justify-between" role="group" aria-label={`${group.label} radius`}>
              {RADIUS_GROUP_STEPS.map((step) => {
                const value = radius[step] ?? '0px'
                return (
                  <RadiusTile
                    key={step}
                    px={parseFloat(value) || 0}
                    step={step}
                    value={value}
                    groupLabel={group.label}
                    selected={current === step}
                    onClick={() => onRoles(applyRadiusGroup(group, radiusRoles, step))}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShadowCard({ shadows, onChange }: { shadows: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  const active = matchShadowPreset(shadows)
  return (
    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Shadow depth">
      {SHADOW_PRESETS.map((preset) => {
        const selected = active === preset.label
        return (
          <button
            key={preset.label}
            type="button"
            aria-pressed={selected}
            title={preset.description}
            onClick={() => onChange({ ...preset.values })}
            className={`flex min-w-0 flex-col items-center gap-2 rounded-lg border px-1 py-2 text-micro font-medium transition-[border-color,background-color,color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${selected ? 'border-line-strong bg-elevated text-fg' : 'border-line bg-app text-fg-faint hover:border-line-strong hover:text-fg'}`}
          >
            <span className="h-5 w-5 rounded bg-surface" style={{ boxShadow: preset.values.md }} aria-hidden />
            <span className="truncate">{preset.label}</span>
          </button>
        )
      })}
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
function TintSlider({
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
        style={{ background: `linear-gradient(to right, ${stops})` }}
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
function formatShift(n: number): string {
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
function ContrastSlider({
  hueHex, value, onChange,
}: {
  hueHex: string
  value: number
  onChange: (n: number) => void
}) {
  const soft = `color-mix(in oklab, ${hueHex} 45%, #a3a3a3)`
  const deep = `color-mix(in oklab, ${hueHex} 55%, #000)`
  const bright = `color-mix(in oklab, ${hueHex} 35%, #fff)`
  const marks: [string, number][] = [['Softer', -1], ['Default', 0], ['Stronger', 1]]
  return (
    <div>
      <div
        className="relative h-5 rounded-full border border-line"
        style={{ background: `linear-gradient(to right, ${soft} 0%, ${hueHex} 50%, ${deep} 75%, ${bright} 100%)` }}
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
      <div className="mt-1 flex justify-between text-micro font-medium uppercase tracking-wide text-fg-faint" aria-hidden>
        {marks.map(([label, at]) => (
          <span key={label} className={(at === 0 ? value === 0 : Math.sign(value) === at) ? 'text-fg' : undefined}>{label}</span>
        ))}
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
  onOpenAdvanced,
  onAccentPreview,
  stylePreview,
  onAdoptStyle,
  onQuickEditOpenChange,
  containedDrawerRootRef,
  onRandomBoardAppearance,
  contrastOpen = false,
  onContrastOpenChange,
  previewPlatform = 'desktop',
  onPreviewPlatformChange,
  overlapSize = 'md',
  onOverlapSizeChange,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
  /** Light/Dark currently on the artefacts board — Color edition reads and writes this ramp. */
  colorAppearance?: ThemeAppearance
  onColorAppearanceChange?: (appearance: ThemeAppearance) => void
  /** Which edition card the foundation icon rail asked for. */
  activePanel?: QuickPanelFoundation
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
  previewPlatform?: GridViewport
  onPreviewPlatformChange?: (platform: GridViewport) => void
  /** Which overlap size the board's avatar card shows — view state, lifted to
   *  the hub so the bar here and the card there are one value. */
  overlapSize?: OverlapSize
  onOverlapSizeChange?: (size: OverlapSize) => void
}) {
  const { t } = useI18n()
  const inInspector = useInInspector()
  const store = useDesignStore()
  const applyAccent = useApplyAccentColor()
  const applyNeutral = useApplyGrayColor()
  const applyState = useApplyStateColor()
  const [undo, setUndo] = useState<{ snapshot: DesignSnapshot; label: string } | null>(null)
  // The footer bar offers THIS edit only while it is still the newest step of
  // the edit history. Once the header's Undo / ⌘Z has stepped past it, the bar
  // would otherwise sit there naming an edit it no longer undoes.
  const lastStep = useEditHistory((h) => h.past[h.past.length - 1])
  const undoIsCurrent = Boolean(undo && lastStep?.snapshot === undo.snapshot)
  const [accentPreview, setAccentPreview] = useState<string | null>(null)
  const [openChip, setOpenChip] = useState<ColorChipId | null>(null)
  const rampAppearance = colorAppearance ?? previewAppearance
  // Only ever set by a FAILED adopt (`mintTheme` refusing — a name collision it
  // can't resolve, a slot it can't fill). Rendered next to the button, not as a
  // toast: a failure the user has to act on shouldn't time out.
  const [adoptError, setAdoptError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const chipRefs = useRef<Partial<Record<ColorChipId, HTMLDivElement | null>>>({})
  const accentSwatchRef = useRef<HTMLDivElement>(null)
  const neutralSwatchRef = useRef<HTMLDivElement>(null)
  const lastRandomScaffold = useRef<string | undefined>(undefined)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const librarySaved = useLibrarySaved()
  const access = useAccess()
  const foundations = tryOn
    ? { ...resolveThemeFoundations(store, previewTheme), ...tryOn.preset.foundations }
    : resolveThemeFoundations(store, previewTheme)
  const { typography, radius, shadows, sizes, selector, stroke, spacing, spacingRoles, iconWeight } = foundations
  const platformSwitch = onPreviewPlatformChange ? (
    <PlatformCutSwitch value={previewPlatform} onChange={onPreviewPlatformChange} />
  ) : undefined
  const sizeUsedStep = previewPlatform === 'mobile'
    ? (foundations.sizeRoles?.touch ?? 'lg')
    : (foundations.sizeRoles?.control ?? 'md')
  const setIconWeight = (key: string, value: PhosphorWeight) =>
    patchThemeFoundations(key, { iconWeight: value })
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
  const setSizes = (key: string, value: Record<string, string>) => patchThemeFoundations(key, { sizes: value })
  const setSelector = (key: string, value: Record<string, string>) => patchThemeFoundations(key, { selector: value })
  const setStroke = (key: string, value: Record<string, string>) => patchThemeFoundations(key, { stroke: value })
  // Container inset writes BOTH: the `inset-surface` spacing role (the token the
  // preview actually reads) and the four-sided `padding` mirror (the export's
  // resolved-px copy), so `--spacing-inset-surface` and `--padding-*` can't
  // drift after a quick edit.
  const setContainerInset = (key: string, stepIndex: number) => {
    const step = SPACING_STEPS[Math.max(0, Math.min(SPACING_STEPS.length - 1, stepIndex))]
    const px = spacing[step] ?? `${Number(step) * 4}px`
    patchThemeFoundations(key, {
      spacingRoles: { ...spacingRoles, [INSET_SURFACE_ROLE]: step },
      padding: insetSurfacePadding(px),
    })
  }
  const brandFamily = themeSources[previewTheme]?.brand ?? 'accent'
  const grayFamily = themeSources[previewTheme]?.gray ?? 'neutral'
  const themeAccent = brandFamily === 'accent' ? primaryColor : customColors.find((family) => family.key === brandFamily)?.base ?? primaryColor
  const themeNeutral = grayFamily === 'neutral' ? grayBaseColor : customColors.find((family) => family.key === grayFamily)?.base ?? grayBaseColor
  const accent = tryOn ? tryOn.preset.accent : themeAccent
  const neutral = tryOn ? presetHarmony(tryOn.preset).neutral : themeNeutral
  const activeTint = tryOn ? tryOn.preset.neutralTint : neutralTint

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
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
    showToast(t('{name} added to My themes', { name }))

  const showUndo = (snapshot: DesignSnapshot, label: string) => {
    // Every rail edit is one step of the header's Undo / Redo history; the
    // footer bar is the same step, offered right where the edit was made.
    recordEdit(snapshot, label)
    setUndo({ snapshot, label })
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), 9000)
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

  /** Edit theme — the rail's twin of the sheet's button, same helper. */
  const editTryOn = () => {
    if (!tryOn) return
    const result = openStyleForEditing(tryOn.preset, previewAppearance)
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
  const writeAccent = (themeKey: string, value: string) => {
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
      applyAccent(value, s.linkNeutralToAccent, themeKey)
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
      scale: generateColorScale(value, s.colorAlgorithm, s.contrastShift, themePages.light),
      darkScale: generateFamilyDarkScale(value, s.colorAlgorithm, s.contrastShift, themePages.dark),
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
        scale: generateColorScale(linkedNeutral, s.colorAlgorithm, s.contrastShift, themePages.light, 'light', s.neutralTint),
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

  const writeState = (themeKey: string, role: StateRole, hex: string, appearance: ThemeAppearance) => {
    const s = useDesignStore.getState()
    const family = s.themeSources[themeKey]?.[role] ?? GLOBAL_FAMILY[role]
    const affected = s.themeOrder.filter((theme) => (s.themeSources[theme]?.[role] ?? GLOBAL_FAMILY[role]) === family)
    const isGlobal = family === GLOBAL_FAMILY[role]
    if (!isGlobal && affected.length <= 1) {
      applyState(role, hex, false, themeKey, appearance)
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

  const writeExtra = (themeKey: string, rank: BrandExtraRank, hex: string) => {
    const s = useDesignStore.getState()
    const key = s.themeSources[themeKey]?.[rank]
    if (!key) return
    const pages = resolveThemePages(s, themeKey)
    s.updateCustomColor(key, {
      base: hex,
      scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light),
      darkScale: generateFamilyDarkScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark),
    })
  }

  const applyAccentScoped = (value: string) => {
    commit('Accent updated', (themeKey) => writeAccent(themeKey, value))
  }

  const restore = () => {
    if (!undo) return
    // Through the history, not a raw setState, so the header's Redo can bring
    // it back and the two Undo doors can't disagree about where you are.
    undoEdit()
    setUndo(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  // ONE commit path for the accent, whichever control produced the hex — the
  // hue slider's release and the picker's every change. Two paths would be two
  // chances to skip `applyAccentScoped`'s forking rule.
  const commitAccent = (hex: string) => {
    applyAccentScoped(hex)
    setAccentPreview(null)
    onAccentPreview?.(null)
  }

  // Accent drags preview before they commit their full ramp regeneration. The
  // linked neutral has to read that SAME live accent; reading `neutral` here
  // left the tint track one gesture behind the Accent row until pointer-up.
  // A detached neutral remains stable, as expected.
  const liveAccent = accentPreview ?? accent
  const liveNeutral = linkNeutralToAccent
    ? neutralFromBrand(liveAccent, activeTint)
    : neutral
  // The chip is the base shown by the track, not a second derivation of it.
  const neutralChip = liveNeutral
  const themeRefs = themeSources[previewTheme]
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
  const extraHex = (rank: BrandExtraRank) => {
    const key = themeRefs?.[rank]
    if (!key) return null
    return customColors.find((color) => color.key === key)?.base ?? null
  }
  const nextExtra = nextBrandExtraRank(themeRefs)
  const lastExtra: BrandExtraRank | null = themeRefs?.tertiary
    ? 'tertiary'
    : themeRefs?.secondary
      ? 'secondary'
      : null
  const toggleChip = (id: ColorChipId) => {
    setOpenChip((current) => current === id ? null : id)
  }
  useEffect(() => { setOpenChip(null) }, [rampAppearance])
  useEffect(() => {
    if (!justSaved) return
    const id = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(id)
  }, [justSaved])
  const chipAnchor = (id: ColorChipId): RefObject<HTMLElement | null> => ({
    current: chipRefs.current[id] ?? null,
  })

  const applyRandomTheme = () => {
    const headingFamily = typography.headingFontFamily ?? typography.fontFamily
    const rng = Math.random
    const recipe = randomTheme({
      accent: liveAccent,
      bodyFont: typography.fontFamily,
      headingFont: headingFamily,
      typeScale: inferTypeScaleMode(typography.sizes ?? {}),
      avoidScaffold: lastRandomScaffold.current,
      rng,
    })
    lastRandomScaffold.current = recipe.scaffoldId
    onRandomBoardAppearance?.(randomBoardAppearance(rng))
    loadGoogleFont(recipe.bodyFont)
    loadGoogleFont(recipe.headingFont)
    commit(t('Random tweak applied'), (themeKey) => {
      setNeutralTint(recipe.neutralTint)
      writeAccent(themeKey, recipe.accent)
      if (useDesignStore.getState().linkNeutralToAccent) {
        applyNeutral(neutralFromBrand(recipe.accent, recipe.neutralTint), themeKey, true)
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
    })
  }

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
  const drawerContained = Boolean(containedDrawerRootRef)
  const colorPickerOpen = openChip != null
  const quickEditOpen = colorPickerOpen

  useEffect(() => {
    onQuickEditOpenChange?.(quickEditOpen)
  }, [quickEditOpen, onQuickEditOpenChange])

  useEffect(() => {
    setOpenChip(null)
    if (activePanel !== 'color') onContrastOpenChange?.(false)
  }, [activePanel, onContrastOpenChange])

  return (
    <InspectorPortal>
    <aside
      id={QUICK_SETTINGS_ID}
      aria-label={t('Quick settings')}
      className={inInspector
        ? 'flex-1 min-h-0 w-full flex flex-col'
        : `flex-shrink-0 min-h-0 flex flex-col border-r border-line ${WORKSPACE_CHROME}`}
      style={inInspector ? undefined : { width: QUICK_SETTINGS_WIDTH }}
    >
      {/* No Name band here any more: a theme is renamed where it is LISTED —
          double-click in the theme switcher or the library, or Rename in a
          row's options. This column is for editing how the theme looks. */}
      {/* Only "Edit theme" adds a style to My themes (sheet or rail). The error
          below is the My-themes-full case. */}
      {adoptError && <p role="alert" className="flex-shrink-0 px-3 pt-3 text-mini text-status-danger">{adoptError}</p>}
      {/* Only this region scrolls; the Undo bar below is a pinned footer, so it
          never floats mid-content or leaves a gap under a short rail. Same
          shape as KitsPopover's scroll-body + fixed-footer. */}
      <div className="flex flex-1 min-h-0 flex-col">
      <ThemeRailScrollRegion padClass="py-3">
      {tryOn ? (
        // A previewed style isn't yours yet, so there is nothing to edit — show
        // what it is and the one way to make it yours, instead of controls
        // that would have to adopt it behind your back.
        <section aria-label={t('EscalaUI themes')} className="min-w-0">
          <div className="flex min-h-8 items-center border-b border-line px-3 pb-2 mb-3">
            <span className="min-w-0 truncate text-caption font-normal text-fg">{t('EscalaUI themes')}</span>
          </div>
          <StyleOverview
            compact
            preset={tryOn.preset}
            appearance={previewAppearance}
            owned={myThemeKeys(store.themeOrder, store.themes).some((key) => store.themeOrigin?.[key] === tryOn.preset.id)}
            onEdit={editTryOn}
          />
        </section>
      ) : (
      <div className={`flex flex-col ${QUICK_RAIL_STACK_GAP}`}>
        {activePanel === 'color' && <EditionCard
          title="Color edition"
          foundationKey="color"
          flush
          onOpenAdvanced={onOpenAdvanced}
          trailing={
            <ColorAppearanceSwitch
              value={rampAppearance}
              onChange={(next) => onColorAppearanceChange?.(next)}
            />
          }
          footer={(
            <div className="border-t border-line px-3 pb-2.5 pt-2">
              <RandomThemeButton onClick={applyRandomTheme} />
            </div>
          )}
        >
          <div className="divide-y divide-line">
            <div className="flex flex-col px-3 py-2.5">
              <p className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-fg-faint">{t('Brand accent')}</p>
              <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <SpectrumSlider
                  value={accent}
                  ariaLabel="Accent hue"
                  onPreview={(hex) => {
                    setAccentPreview(hex)
                    onAccentPreview?.(hex)
                  }}
                  onCommit={commitAccent}
                />
              </div>
              {/* The chip is the part people aim at first — "a colour chip that
                  looks clickable must be clickable". It opens the SAME
                  `ColorPickerPanel` the theme editor's slot rows use, which is
                  also the only way to reach an exact brand hex: the slider moves
                  HUE only, holding saturation and lightness from whatever was
                  there before, so it can never land on a specific colour. */}
              <div ref={accentSwatchRef} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleChip('accent')}
                  aria-haspopup="dialog"
                  aria-expanded={openChip === 'accent'}
                  aria-label={`${t('Accent')} — ${liveAccent} — open picker`}
                  className="block h-6 w-6 rounded-full border border-line transition-[transform,border-color] duration-75 hover:border-fg-faint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                  style={{ background: liveAccent }}
                />
              </div>
              <ColorPickerPopover
                open={openChip === 'accent'}
                onClose={() => setOpenChip(null)}
                anchor={accentSwatchRef}
                label="Accent"
                value={accent}
                onChange={commitAccent}
                dynamicAccentPalette
                accentHueFrom={liveAccent}
                appearance={rampAppearance}
                contained={drawerContained}
                containedRootRef={containedDrawerRootRef}
                containedDockLeft={COLOR_RAIL_WIDTH}
              />
              </div>

              <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <TintSlider
                  hueHex={liveNeutral}
                  value={activeTint}
                  // THEME-SCOPED, both sides. This wrote
                  // `neutralFromBrand(primaryColor, …)` / `grayBaseColor` — the
                  // GLOBALS — while the track two lines up reads the theme's own
                  // `neutral` and the Accent row above shows its own `accent`.
                  // On any minted theme those are different colours (measured on
                  // `lime`: accent #20c5c4 teal, but the tint re-derived from
                  // #9522e9 violet), so the track and the result were computed
                  // from two different hues — the reported mismatch.
                  onChange={(tint) => commit('Neutral tint updated', (themeKey) => {
                    setNeutralTint(tint)
                    applyNeutral(linkNeutralToAccent ? neutralFromBrand(liveAccent, tint) : neutral, themeKey, true)
                  })}
                />
              </div>
              {/* Same rule as the Accent chip: the swatch people aim at first
                  has to be clickable, and the tint dial alone can't reach a
                  specific neutral (it only decides how much accent hue a
                  DERIVED neutral keeps). The picker is the way to set the
                  neutral itself — and doing so UNLINKS it from the accent
                  (`fromLink` omitted), which is the documented
                  detach-on-manual-edit rule. */}
              <div ref={neutralSwatchRef} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleChip('neutral')}
                  aria-haspopup="dialog"
                  aria-expanded={openChip === 'neutral'}
                  aria-label={`${t('Neutral tint')} — ${neutralChip} — open picker`}
                  className="block h-6 w-6 rounded-full border border-line transition-[transform,border-color] duration-75 hover:border-fg-faint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                  style={{ background: neutralChip }}
                />
              </div>
              <ColorPickerPopover
                open={openChip === 'neutral'}
                onClose={() => setOpenChip(null)}
                anchor={neutralSwatchRef}
                label="Neutral"
                value={liveNeutral}
                onChange={(hex) => commit('Neutral updated', (themeKey) => applyNeutral(hex, themeKey))}
                dynamicNeutralPalette
                neutralRampFrom={liveAccent}
                appearance={rampAppearance}
                contained={drawerContained}
                containedRootRef={containedDrawerRootRef}
                containedDockLeft={COLOR_RAIL_WIDTH}
              />
            </div>
              </div>
            </div>

            {/* Its own section, not a third bar in Brand accent: contrast is how
                the ramp's steps are spread, a different question from which colour
                or how tinted — the title keeps it from reading as part of them. */}
            <div className="flex flex-col px-3 py-2.5">
              <p className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-fg-faint">{t('Contrast')}</p>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <ContrastSlider
                    hueHex={liveNeutral}
                    value={contrastShift}
                    onChange={(n) => commit('Contrast shift updated', () => setContrastShift(n))}
                  />
                </div>
                {/* The chip slot, as in Brand accent, carries the readout;
                    clicking it is the reset, since 0 is the generator's own. */}
                <button
                  type="button"
                  onClick={() => commit('Contrast shift reset', () => setContrastShift(0))}
                  disabled={contrastShift === 0}
                  title={t('Reset contrast shift')}
                  aria-label={`${t('Contrast shift')} ${contrastShift.toFixed(2)} — ${t('Reset contrast shift')}`}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-line text-[9px] font-semibold tabular-nums text-fg transition-colors hover:border-fg-faint disabled:cursor-default disabled:text-fg-faint disabled:hover:border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                >
                  {formatShift(contrastShift)}
                </button>
            </div>
            <div className="mt-2.5 border-t border-line pt-2">
              <button
                type="button"
                onClick={() => onContrastOpenChange?.(!contrastOpen)}
                aria-pressed={contrastOpen}
                className="group flex h-9 w-full min-w-0 items-center gap-2 text-left"
              >
                <ContrastGridThumb tones={contrastThumbTones} />
                <span className="min-w-0 flex-1 truncate text-caption font-medium text-fg">{t('Contrast grid')}</span>
                <span
                  className={`flex h-7 flex-shrink-0 items-center rounded-md px-2.5 text-caption font-semibold transition-colors ${
                    contrastOpen
                      ? 'border border-line text-fg-muted group-hover:text-fg'
                      : 'bg-elevated text-fg ring-1 ring-line-strong'
                  }`}
                >
                  {contrastOpen ? t('Hide') : t('Show')}
                </span>
              </button>
            </div>
            </div>

            <div className="px-3 py-2.5">
              <p className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-fg-faint">{t('States')}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {STATE_ROLES.map((role) => {
                  const hex = stateHex(role, rampAppearance)
                  return (
                    <div key={role} className="min-w-0">
                      <div
                        ref={(node) => { chipRefs.current[role] = node }}
                        className="flex flex-col items-center gap-1"
                      >
                        <button
                          type="button"
                          onClick={() => toggleChip(role)}
                          aria-haspopup="dialog"
                          aria-expanded={openChip === role}
                          aria-label={`${t(SLOT_DISPLAY_LABEL[role])} — ${hex} — open picker`}
                          className="block h-6 w-6 rounded-full border border-line transition-[transform,border-color] duration-75 hover:border-fg-faint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                          style={{ background: hex }}
                        />
                        <span className="max-w-full truncate text-micro text-fg-faint">{t(SLOT_DISPLAY_LABEL[role])}</span>
                      </div>
                      <ColorPickerPopover
                        open={openChip === role}
                        onClose={() => setOpenChip(null)}
                        anchor={chipAnchor(role)}
                        label={SLOT_DISPLAY_LABEL[role]}
                        value={hex}
                        onChange={(next) => commit(`${SLOT_DISPLAY_LABEL[role]} updated`, (themeKey) => writeState(themeKey, role, next, rampAppearance))}
                        palette={STATE_PRESETS[role]}
                        appearance={rampAppearance}
                        contained={drawerContained}
                        containedRootRef={containedDrawerRootRef}
                        containedDockLeft={COLOR_RAIL_WIDTH}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {(['secondary', 'tertiary'] as const).map((rank) => {
                  const hex = extraHex(rank)
                  if (!hex) return null
                  return (
                    <div key={rank} className="min-w-0">
                      <div
                        ref={(node) => { chipRefs.current[rank] = node }}
                        className="flex flex-col items-center gap-1"
                      >
                        <button
                          type="button"
                          onClick={() => toggleChip(rank)}
                          aria-haspopup="dialog"
                          aria-expanded={openChip === rank}
                          aria-label={`${t(BRAND_EXTRA_LABEL[rank])} — ${hex} — open picker`}
                          className="block h-6 w-6 rounded-full border border-line transition-[transform,border-color] duration-75 hover:border-fg-faint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                          style={{ background: hex }}
                        />
                        <span className="max-w-[4rem] truncate text-micro text-fg-faint">{t(BRAND_EXTRA_LABEL[rank])}</span>
                      </div>
                      <ColorPickerPopover
                        open={openChip === rank}
                        onClose={() => setOpenChip(null)}
                        anchor={chipAnchor(rank)}
                        label={BRAND_EXTRA_LABEL[rank]}
                        value={hex}
                        onChange={(next) => commit(`${BRAND_EXTRA_LABEL[rank]} updated`, (themeKey) => writeExtra(themeKey, rank, next))}
                        dynamicAccentPalette
                        accentHueFrom={hex}
                        appearance={rampAppearance}
                        contained={drawerContained}
                        containedRootRef={containedDrawerRootRef}
                        containedDockLeft={COLOR_RAIL_WIDTH}
                      />
                    </div>
                  )
                })}
                {nextExtra && (
                  <button
                    type="button"
                    onClick={() => commit(`${BRAND_EXTRA_LABEL[nextExtra]} added`, (themeKey) => {
                      const s = useDesignStore.getState()
                      const brandFamily = s.themeSources[themeKey]?.brand ?? 'accent'
                      const brandHex = brandFamily === 'accent'
                        ? s.primaryColor
                        : s.customColors.find((color) => color.key === brandFamily)?.base ?? s.primaryColor
                      addBrandExtra(themeKey, extraSeedHex(brandHex, nextExtra))
                    })}
                    title={t('Adds a brand palette. Buttons and alerts still use Accent until you assign this in Semantics.')}
                    className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-caption font-medium text-fg-faint transition-colors hover:text-fg"
                  >
                    <span aria-hidden className="text-ui leading-none">+</span>
                    {t('Add {rank}', { rank: t(BRAND_EXTRA_LABEL[nextExtra]).toLowerCase() })}
                  </button>
                )}
                {lastExtra && (
                  <button
                    type="button"
                    onClick={() => commit(`${BRAND_EXTRA_LABEL[lastExtra]} removed`, (themeKey) => {
                      removeBrandExtra(themeKey, lastExtra)
                    })}
                    className="text-caption font-medium text-fg-faint transition-colors hover:text-status-danger"
                  >
                    {t('Remove')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </EditionCard>}

        {activePanel === 'typography' && (() => {
          // The SAME two families Variables · Type ships (`font-family-body` /
          // `font-family-heading`) — the quick card showed only the body one,
          // so a theme with a distinct heading face (Nature's Fraunces over DM
          // Sans) couldn't be seen or changed here. `headingFontFamily`
          // undefined means "same as body", which is exactly what Variables'
          // display row falls back to.
          const familyOptions = (current: string) =>
            FONT_PRESETS.some((item) => item.value === current)
              ? FONT_PRESETS.map((font) => ({ value: font.value, label: font.label, group: font.category }))
              : [
                  { value: current, label: current, group: 'In this theme' },
                  ...FONT_PRESETS.map((font) => ({ value: font.value, label: font.label, group: font.category })),
                ]
          const headingFamily = typography.headingFontFamily ?? typography.fontFamily
          return (
        <EditionCard title="Font edition" foundationKey="typography" onOpenAdvanced={onOpenAdvanced} trailing={platformSwitch}>
          <SettingItem label="Body font">
            <Menu
              ariaLabel="Body font family"
              value={typography.fontFamily}
              render={(value) => ({ fontFamily: fontStack(value) })}
              options={familyOptions(typography.fontFamily)}
              onChange={(value) => commit('Typeface updated', (themeKey) => { loadGoogleFont(value); setTypography(themeKey, { ...typography, fontFamily: value }) })}
            />
          </SettingItem>

          <SettingItem label="Heading font">
            <Menu
              ariaLabel="Heading font family"
              value={headingFamily}
              render={(value) => ({ fontFamily: fontStack(value) })}
              options={familyOptions(headingFamily)}
              onChange={(value) => commit('Heading typeface updated', (themeKey) => { loadGoogleFont(value); setTypography(themeKey, { ...typography, headingFontFamily: value }) })}
            />
          </SettingItem>

          <SettingItem label="Text scale" hint="Grades every caption, label, body style and heading together. Values are the type roles at the platform shown above, as in Variables · Type.">
            <TypeScaleCard
              typography={typography}
              platform={previewPlatform}
              onScrubStart={() => beginScrub('Type scale updated')}
              onScrubEnd={endScrub}
              onScrub={(i) => applyScrub('Type scale updated', (themeKey) => {
                const { sizes: nextSizes, lineHeights } = buildTypeScale(TYPE_SCALE_MODES[i].factor)
                setTypography(themeKey, { ...typography, sizes: nextSizes, lineHeights })
              })}
            />
          </SettingItem>
        </EditionCard>
          )
        })()}

        {activePanel === 'radius' && (
        <EditionCard title="Radius edition" foundationKey="radius" onOpenAdvanced={onOpenAdvanced}>
          <SettingItem label="Radius" hint="The preset sets the scale; boxes, fields and selectors then round independently on it.">
            <RadiusCard
              radius={radius}
              radiusRoles={foundations.radiusRoles}
              onRoles={(next) => applyScrub('Radius updated', (themeKey) => setRadiusRoles(themeKey, next))}
              onPreset={(label) => commit('Radius preset updated', (themeKey) => setRadiusPreset(themeKey, label))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {activePanel === 'shadow' && (
        <EditionCard title="Shadow edition" foundationKey="shadow" onOpenAdvanced={onOpenAdvanced}>
          <SettingItem label="Shadow" hint="Grades the complete elevation ramp used by cards, menus, modals, and toasts.">
            <ShadowCard
              shadows={shadows}
              onChange={(value) => commit('Shadow depth updated', (themeKey) => setShadows(themeKey, value))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {activePanel === 'sizes' && (
        <EditionCard title="Spacing edition" foundationKey="sizes" onOpenAdvanced={onOpenAdvanced} trailing={platformSwitch}>
          <SettingItem>
            <CutFacts rows={[
              { label: previewPlatform === 'mobile' ? 'Touch' : 'Control', value: sizes[sizeUsedStep] ?? sizeUsedStep },
            ]} />
          </SettingItem>
          <SettingItem label="Mode" hint="Four ready-made densities. Each sets field size, card padding (Spacing · Inset surface) and border width together — ordinary tokens, still editable in Variables.">
            <SpacingModeGrid
              value={matchSpacingMode(sizes, spacingRoles, stroke)}
              onChange={(mode) => commit(`Spacing mode: ${mode.label}`, (themeKey) => {
                setSizes(themeKey, buildSizesFromBase(mode.fieldBase))
                setContainerInset(themeKey, SPACING_STEPS.indexOf(mode.insetStep))
                setStroke(themeKey, { ...stroke, sm: `${mode.border}px` })
              })}
            />
          </SettingItem>

          <SettingItem label="Fields" hint="Base size for buttons, inputs, selects, and tabs.">
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


          <SettingItem label="Overlap" hint="Walk the avatar card on the board through the six overlap sizes. Edit their values in Variables · Spacing · Overlap.">
            <OverlapBar
              value={overlapSize}
              onChange={(size) => onOverlapSizeChange?.(size)}
              pxOf={(size) => roleValuePx(mergeLayoutRoles('spacing', spacingRoles)[`overlap-${size}`], spacing) ?? 0}
            />
          </SettingItem>

          <SettingItem label="Border width" hint="Controls dividers and component borders. The 2px focus ring remains unchanged.">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-micro uppercase tracking-[0.12em] text-fg-faint">{t(strokeSm === 0 ? 'No border' : strokeSm < 1 ? 'Hairline' : 'Border')}</span>
                <span className="text-ui font-semibold tabular-nums text-fg">{stroke?.sm ?? '1px'}</span>
              </div>
              <RangeInput
                ariaLabel="Border width"
                min={0}
                max={STROKE_SM_STOPS.length - 1}
                step={1}
                value={strokeIndex}
                onScrubStart={() => beginScrub('Border width updated')}
                onScrubEnd={endScrub}
                onChange={(index) => {
                  const next = STROKE_SM_STOPS[index]
                  applyScrub('Border width updated', (themeKey) => setStroke(themeKey, { ...stroke, sm: `${next}px` }))
                }}
                className={ROW_GAP_CONTROL}
              />
              <div className="mt-1 flex justify-between text-micro tabular-nums text-fg-faint" aria-hidden>
                {STROKE_SM_STOPS.map((stop) => <span key={stop}>{stop === 0 ? 'None' : stop}</span>)}
              </div>
            </div>
          </SettingItem>
        </EditionCard>
        )}

        {activePanel === 'icons' && (
        <EditionCard title="Style edition" foundationKey="icons" onOpenAdvanced={onOpenAdvanced}>
          <div className="px-3 pt-1 pb-2">
            <IconStyleOverview weight={iconWeight ?? 'regular'} ariaLabel={t('Phosphor icons at this weight')} />
            <p className="mt-2 text-center text-micro text-fg-faint">{t('Phosphor icons at this weight')}</p>
          </div>
          <SettingItem label="Icon weight" hint="Phosphor stroke weight for every glyph. The set never changes; only the weight is a style decision.">
            <Menu
              ariaLabel="Icon weight"
              value={iconWeight ?? 'regular'}
              options={PHOSPHOR_WEIGHTS.map((weight) => ({
                value: weight,
                label: weight.charAt(0).toUpperCase() + weight.slice(1),
              }))}
              onChange={(value) => commit('Icon weight updated', (themeKey) => setIconWeight(themeKey, value))}
            />
          </SettingItem>
          <SettingItem label="Icon sizes" hint="Small 24, medium 32, large 40. The same size on Desktop, Tablet and Mobile — a control's height does not step, so the glyph holds with it.">
            <IconSizeLadder weight={iconWeight ?? 'regular'} />
          </SettingItem>
        </EditionCard>
        )}

        {activePanel === 'sizes' && (
          inferSizeBase(sizes) !== SIZE_DEFAULT_BASE ||
          inferSelectorBase(selector) !== SELECTOR_DEFAULT_BASE ||
          (spacingRoles?.[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP) !== PADDING_DEFAULT_STEP
        ) && (
          <button
            type="button"
            onClick={() => commit('Sizes reset', (themeKey) => {
              setSizes(themeKey, buildSizesFromBase(SIZE_DEFAULT_BASE))
              setSelector(themeKey, buildSelectorsFromBase(SELECTOR_DEFAULT_BASE))
              setContainerInset(themeKey, SPACING_STEPS.indexOf(PADDING_DEFAULT_STEP))
            })}
            className="self-start rounded-md px-1 py-0.5 text-mini text-fg-faint transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            Reset sizes to the standard ramp
          </button>
        )}
      </div>
      )}
      </ThemeRailScrollRegion>

      <AnimatePresence>
        {undo && undoIsCurrent && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className={`flex-shrink-0 border-t border-line ${WORKSPACE_CHROME} px-4 py-2`}>
            <button type="button" onClick={restore} className="text-caption font-medium text-accent-ui hover:underline underline-offset-2">
              Undo {undo.label}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Persistence is GLOBAL, not a property of one edition — pinned under
          every panel. Creating a second theme lives on the Themes library
          page; this door only saves the system on screen so My libraries
          has a real entry before anyone mints another theme. Hidden while a
          System Style is only tried on (that overlay is not the store). */}
      {!tryOn && (
        <div className={`flex-shrink-0 border-t border-line px-3 py-3 ${WORKSPACE_CHROME}`}>
          <button
            type="button"
            onClick={() => {
              // A guest signs up first; the shell finishes the save on return.
              if (access.gated) { goToLogin('save-library'); return }
              store.saveCurrentSystem()
              setJustSaved(true)
            }}
            disabled={librarySaved && !justSaved}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent-solid text-caption font-semibold text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {/* Already saved → a check beside the label, so the dimmed button
                reads as "done", not "unavailable". */}
            {(librarySaved || justSaved) && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 6.5 5 9l4.5-5.5" />
              </svg>
            )}
            {justSaved ? t('Saved') : t('Save theme')}
          </button>
        </div>
      )}
      </div>
    </aside>
    </InspectorPortal>
  )
}
