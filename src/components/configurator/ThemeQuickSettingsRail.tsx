// Theme Preview's left rail — quick settings for the theme on screen.
//
// This column used to hold an artefact filter (Overview / Forms / Cards /
// Others), while the real quick-edit controls sat in a dock pinned to the
// bottom of the canvas. Both are retired: the controls now live beside the
// artefacts they repaint, and the grid always shows every screen.
//
// Two halves. The top rows edit COLOUR and TYPE — one primitive each, via the
// same appliers the Color hub uses. The `Sizes` section edits a whole RAMP from
// one base unit: `size` (control heights) and `selector` (the checkbox square)
// are `base × multiplier` scales, so a slider regenerates them exactly the way
// Spacing's base unit already regenerates `--spacing-*`.
//
// Deliberately NOT here: a "Theme recipe" preset, a Radius Form axis, and the
// Noise effect toggle. Shadows are included because they are a real,
// theme-scoped foundation and repaint the specimens beside this rail.

import { Fragment, useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { captureSnapshot, DEFAULT_THEME_SOURCES, type DesignSnapshot, useDesignStore } from '../../store/useDesignStore'
import { useApplyAccentColor, useApplyGrayColor, resolveThemePages } from '../../lib/colorActions'
import { backgroundFromBase, generateColorScale, generateDarkColorScale, generateFamilyDarkScale, neutralFromBrand, NEUTRAL_TINTS, type NeutralTint } from '../../lib/colorUtils'
import { fontStack, FONT_PRESETS, loadGoogleFont } from '../../lib/fonts'
import { TYPE_SCALE_KEYS, TYPE_SCALE_MODES, buildTypeScale, inferTypeScaleMode } from '../../lib/typographyStandard'
import {
  BASE_UNIT_RANGE,
  SELECTOR_STEPS,
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
  insetSurfaceStepIndex,
  insetSurfacePadding,
  RADIUS_GROUPS,
  RADIUS_GROUP_STEPS,
  radiusGroupStep,
  applyRadiusGroup,
} from '../../lib/layoutTokens'
import { slugify } from '../../lib/utils'
import type { ThemeAppearance } from '../../lib/themeModes'
import { resetThemeSemantics, type StylePreview } from '../../lib/stylePreviewOverlay'
import { adoptPreset } from '../../lib/adoptPreset'
import { presetHarmony, themeStylePreset } from '../../lib/themePresets'
import { resolveThemeFoundations } from '../../lib/themeFoundations'
import { SHADOW_PRESETS, matchShadowPreset } from '../../lib/shadowTokens'
import { COLOR_RAIL_WIDTH, ColorPickerPopover, THEME_BAND_H } from './colorControls'
import SemanticTokenGroups from './SemanticTokenGroups'
import SpectrumSlider from '../ui/SpectrumSlider'
import { useI18n } from '../../lib/i18n'

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

/** One vertical rhythm for edition cards and semantic accordion rows. */
const QUICK_RAIL_STACK_GAP = 'gap-3'

function defaultThemeLabel(key: string) {
  if (key === 'light') return 'Light'
  if (key === 'dark') return 'Dark'
  return key.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function EditThemeIcon() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 flex-shrink-0 bg-current text-fg-faint"
      style={{
        WebkitMask: "url('/icons/settings/edit.svg') center / contain no-repeat",
        mask: "url('/icons/settings/edit.svg') center / contain no-repeat",
      }}
    />
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
export function ThemeIdentityBand({ previewTheme }: { previewTheme: string }) {
  const { t } = useI18n()
  const { themeLabels, setThemeLabel } = useDesignStore()
  const stored = themeLabels[previewTheme] || defaultThemeLabel(previewTheme)
  const [draftName, setDraftName] = useState(stored)
  const [nameError, setNameError] = useState(false)
  const commitName = () => {
    const next = draftName.trim()
    if (!next) { setNameError(true); return }
    setNameError(false)
    setThemeLabel(previewTheme, next)
  }
  return (
    <div className="flex-shrink-0 flex items-center px-3" style={{ height: THEME_BAND_H }}>
      <label
        className={`group flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-white pl-3 pr-2 transition-[color,border-color,background-color,box-shadow] hover:border-line-strong focus-within:border-accent-ui/70 focus-within:ring-2 focus-within:ring-accent-ui/15 dark:bg-input-bg dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${nameError ? 'border-status-danger/70' : 'border-line'}`}
        title={t('Rename theme')}
      >
          <span className="flex-shrink-0 text-caption font-medium text-fg-faint">{t('Name')}</span>
          <input
            value={draftName}
            maxLength={48}
            aria-label={t('Theme name')}
            aria-invalid={nameError || undefined}
            onChange={(event) => { setDraftName(event.target.value); setNameError(false) }}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') { setDraftName(stored); setNameError(false); event.currentTarget.blur() }
            }}
            className="min-w-0 flex-1 bg-transparent py-1 text-body font-semibold text-fg outline-none"
          />
          <span className="ml-auto grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-fg-faint transition-colors group-hover:bg-elevated group-hover:text-fg-muted group-focus-within:bg-elevated group-focus-within:text-fg"><EditThemeIcon /></span>
      </label>
    </div>
  )
}

/** Top fade on a rail scroll body — visible only once content has scrolled up
 *  under the pinned `ThemeIdentityBand`, not at rest. */
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
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const sync = () => setScrolled(el.scrollTop > 1)
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [])

  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-app via-app/90 to-transparent transition-opacity duration-150 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
      />
      <div ref={scrollRef} className={`h-full min-h-0 overflow-y-auto ${padClass}`}>
        {children}
      </div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function InfoIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden><circle cx="8" cy="8" r="5.75" /><path d="M8 7.25v3.4M8 5.1h.01" /></svg>
}

function ResetIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.77" /><path d="M2.4 2.9v2.6h2.6" /></svg>
}

function AdvancedIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden><path d="M2.5 4h6M11.5 4h2M2.5 8h2M7.5 8h6M2.5 12h7M12.5 12h1" /><circle cx="10" cy="4" r="1.4" /><circle cx="6" cy="8" r="1.4" /><circle cx="11" cy="12" r="1.4" /></svg>
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
      className="grid h-7 w-7 place-items-center rounded-md text-fg-faint transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
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
        className="grid h-7 w-7 place-items-center rounded-md text-fg-faint transition-colors duration-150 hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
      >
        <InfoIcon />
      </button>
    </RailTooltip>
  )
}

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <section aria-label={t(label)} className="min-w-0 divide-y divide-line overflow-visible rounded-xl bg-rail-section">
      {children}
    </section>
  )
}

/**
 * The foundations that have a quick panel below — and therefore the ONLY ones
 * the Theme preview icon rail offers.
 *
 * Exported so the rail filters off this list instead of keeping its own copy:
 * an icon that leads to an empty column claims a feature that isn't there, and
 * a second list in `Configurator` is exactly how that drifts. `spacing`, `grid`
 * and `icons` are absent because they have no quick control at all — they stay
 * fully editable on the Variables tab, which always offers all nine.
 *
 * Adding a panel below means adding its key here, and nowhere else.
 */
export const QUICK_PANEL_FOUNDATIONS = ['color', 'typography', 'radius', 'shadow', 'sizes', 'stroke'] as const

// Sun / moon, painted as CSS masks off the shipped assets (they carry a
// hardcoded `stroke="white"`, so a bare <img> can't follow the button's ink).
// Same technique — and the same two files — as the Themes Library's own
// appearance toggle.
const APPEARANCE_ICON: Record<ThemeAppearance, string> = {
  light: '/icons/settings/light-mode.svg',
  dark: '/icons/settings/dark-mode.svg',
}

/**
 * Which appearance of this theme the canvas shows.
 *
 * Lives in the Color panel's CARD HEADER, not as a `SettingItem` row of its
 * own: it is the one control here that writes no token (it re-reads each
 * family's light ramp or its dark twin), and the two rows under it — the
 * accent hue and the neutral tint — are exactly what it re-reads. A full row
 * spent on a view control, above the two it qualifies, read as a third token
 * setting.
 */
function AppearanceToggle({ value, onChange }: {
  value: ThemeAppearance
  onChange: (appearance: ThemeAppearance) => void
}) {
  const { t } = useI18n()
  return (
    <span className="flex flex-shrink-0 items-center gap-px rounded-md border border-line bg-app/60 p-px" role="group" aria-label={t('Preview appearance')}>
      {(['light', 'dark'] as const).map((appearance) => {
        const on = value === appearance
        const mask = `url('${APPEARANCE_ICON[appearance]}') center / contain no-repeat`
        return (
          <button
            key={appearance}
            type="button"
            onClick={() => onChange(appearance)}
            aria-pressed={on}
            aria-label={t('Preview in {appearance}', { appearance: t(appearance) })}
            title={t('Preview in {appearance}', { appearance: t(appearance) })}
            // 24px target around a 14px glyph — the hit area grows, the mark
            // does not, the rule `HitArea` follows everywhere else.
            className={`grid h-6 w-6 place-items-center rounded transition-[background-color,opacity] ${
              on ? 'bg-elevated text-fg opacity-100' : 'text-fg-muted opacity-40 hover:opacity-75'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
          >
            <span aria-hidden className="h-3.5 w-3.5 bg-current" style={{ WebkitMask: mask, mask }} />
          </button>
        )
      })}
    </span>
  )
}

/**
 * One foundation's quick panel: a titled card, its controls, and the single
 * door to the full token table.
 *
 * The "Go to advanced edition" button is `selectFoundation` in disguise —
 * `setActiveFoundation(key)` + switch to the Variables tab — so arriving there
 * lands on the very foundation you were adjusting, and the icon rail's
 * selection survives the jump.
 */
function EditionCard({ title, foundationKey, trailing, onOpenAdvanced, children }: {
  title: string
  foundationKey: string
  /** Header slot — the Color panel puts its light/dark toggle here. */
  trailing?: React.ReactNode
  onOpenAdvanced: (foundationKey: string) => void
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <section aria-label={t(title)} className="min-w-0 overflow-visible rounded-xl bg-rail-section">
      <div className="flex min-h-9 items-center justify-between gap-2 px-3 pt-2.5">
        <span className="min-w-0 truncate text-caption font-semibold text-fg">{t(title)}</span>
        {trailing}
      </div>
      <div className="divide-y divide-line">{children}</div>
      <div className="px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => onOpenAdvanced(foundationKey)}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-app px-2 text-mini font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <AdvancedIcon />
          {t('Go to advanced edition')}
        </button>
      </div>
    </section>
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
    <span className="flex flex-shrink-0 items-center gap-0.5">
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
    <div className={`min-w-0 px-3 ${compact ? 'py-2' : 'py-3'}`}>
      {hasHeader && (
        <div className={`flex min-h-7 items-center gap-2 ${compact ? 'mb-1 justify-end' : 'mb-2 justify-between'}`}>
          {label ? <span className="min-w-0 truncate text-caption font-medium text-fg">{t(label)}</span> : null}
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
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} className="w-full h-9 px-2.5 flex items-center gap-2 rounded-lg border border-line-strong/80 bg-elevated/70 hover:border-line-strong hover:bg-elevated text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">
        <span className="min-w-0 flex-1 truncate text-body text-fg" style={render?.(value)}>{value}</span>
        <Chevron open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} role="listbox" className="absolute z-40 top-full left-0 mt-1.5 w-full max-h-64 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1">
            {options.map((option, index) => (
              <Fragment key={option.value}>
              {option.group && option.group !== options[index - 1]?.group ? (
                <div className={`px-2.5 pb-1 text-micro font-semibold uppercase tracking-[0.14em] text-fg-faint ${index ? 'mt-2 border-t border-line pt-2' : 'pt-1'}`}>
                  {option.group}
                </div>
              ) : null}
              <button type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false) }} className={`w-full px-2.5 py-1.5 rounded-md text-left transition-colors ${option.value === value ? 'bg-elevated text-fg font-medium' : 'text-fg-muted hover:bg-surface hover:text-fg'}`} style={render?.(option.value)}>
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
  steps, values, base, kind, onChange, onScrubStart, onScrubEnd, ariaLabel,
}: {
  steps: readonly string[]
  values: Record<string, string>
  base: number | null
  kind: 'field' | 'selector'
  onChange: (base: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  ariaLabel: string
}) {
  const px = steps.map((step) => parseFloat(values[step] ?? '0') || 0)
  const peak = Math.max(...px, 1)
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div role="img" aria-label={`${kind === 'selector' ? 'Selector' : 'Field'} size scale preview`} className="flex h-9 min-w-0 flex-1 items-center justify-between gap-1">
          {px.map((value, index) => {
            const ratio = value / peak
            return kind === 'selector' ? (
              <span
                key={steps[index]}
                className="flex-shrink-0 rounded-[3px] border border-fg/55 bg-fg/10"
                style={{ width: 8 + ratio * 10, height: 8 + ratio * 10 }}
              />
            ) : (
              <span
                key={steps[index]}
                className="flex-shrink-0 rounded-[3px] border border-fg/45 bg-fg/10"
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
      <div className="mt-3 grid gap-x-1 text-center" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step) => <span key={step} className="text-micro font-medium uppercase text-fg-faint">{step}</span>)}
        {steps.map((step) => <span key={step} className="text-mini tabular-nums text-fg-muted">{px[steps.indexOf(step)]}</span>)}
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
        className="mt-3"
      />
    </div>
  )
}

/**
 * Container inset — the one dial for how much room every boxed surface (Card,
 * panel, alert, the artefact collage) leaves inside its edge. It moves the
 * `inset-surface` spacing role (which is what `paddingOf` actually reads), so
 * the slider snaps across `SPACING_STEPS` rather than being free px — same
 * stepped model as the Stroke control in this panel. The readout shows the
 * resolved px so the number is the number that ships.
 */
function ContainerInsetCard({
  stepIndex, spacing, onChange, onScrubStart, onScrubEnd,
}: {
  stepIndex: number
  spacing: Record<string, string>
  onChange: (index: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}) {
  // `|| fallback` would swallow a legitimate 0 (step 0 = 0px), so guard on
  // NaN explicitly.
  const parsed = parseFloat(spacing[SPACING_STEPS[stepIndex]] ?? '')
  const resolvedPx = Math.round(Number.isFinite(parsed) ? parsed : 20)
  // A 46×34 box, its inner block inset by the padding scaled into a 0–11px
  // visual range — reads the step difference without the inner block getting
  // too thin at the top of the ramp.
  const maxStepPx = 64
  const visualInset = Math.round((resolvedPx / maxStepPx) * 11)
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div role="img" aria-label="Container inset preview" className="flex h-9 items-center">
          <span
            className="grid place-items-stretch rounded-[4px] border border-fg/45 bg-fg/[0.06]"
            style={{ width: 46, height: 34, padding: visualInset }}
          >
            <span className="rounded-[2px] bg-fg/25" />
          </span>
        </div>
        <div className="text-right leading-none">
          <span className="block text-heading font-semibold tabular-nums text-fg">{resolvedPx}</span>
          <span className="mt-1 block text-micro uppercase tracking-widest text-fg-faint">Pixels</span>
        </div>
      </div>
      <RangeInput
        min={0}
        max={SPACING_STEPS.length - 1}
        step={1}
        value={stepIndex}
        onChange={onChange}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
        ariaLabel="Container padding in pixels"
        className="mt-3"
      />
      <div className="mt-1 flex justify-between text-micro tabular-nums text-fg-faint" aria-hidden>
        <span>0</span>
        <span>{maxStepPx}</span>
      </div>
    </div>
  )
}

// The five text steps the readout shows — `TYPE_SCALE_KEYS[0..4]`, i.e. the
// `text-*` band (the display steps scale with them and are the same decision).
const TYPE_READOUT_KEYS = TYPE_SCALE_KEYS.slice(0, 5)

/**
 * Type scale as ONE control — the same "move the whole ramp together" idea as
 * Sizes' base unit, so editing a label size is a scrub, not a trip to Advanced
 * type. Five curated density modes (`TYPE_SCALE_MODES`); dragging regenerates
 * every `text-*`/`display-*` size AND its line-height at the mode's factor, so
 * the vertical rhythm follows. Hand-editing a single size in Advanced makes the
 * readout say "Custom" (no mode matches) — the slider still snaps you back onto
 * a curated scale.
 */
function TypeScaleCard({
  sizes, onScrub, onScrubStart, onScrubEnd,
}: {
  sizes: Record<string, string>
  onScrub: (modeIndex: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}) {
  const mode = inferTypeScaleMode(sizes)
  const index = mode ? TYPE_SCALE_MODES.findIndex((m) => m.key === mode) : 2
  const px = TYPE_READOUT_KEYS.map((k) => parseFloat(sizes[k] ?? '0') || 0)
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div role="img" aria-label="Type scale preview" className="flex h-9 items-end gap-1.5">
          {px.map((value, i) => (
            <span
              key={TYPE_READOUT_KEYS[i]}
              className="font-semibold leading-none text-fg/70"
              style={{ fontSize: Math.max(9, Math.min(17, value * 0.72)) }}
            >
              Aa
            </span>
          ))}
        </div>
        <div className="flex-shrink-0 text-right leading-none">
          <span className="block text-heading font-semibold tabular-nums text-fg">
            {Math.round(parseFloat(sizes['text-md'] ?? '16') || 16)}
          </span>
          <span className="mt-1 block text-micro uppercase tracking-wide text-fg-faint">
            {mode ? TYPE_SCALE_MODES[index].label : 'Custom'}
          </span>
        </div>
      </div>
      <div className="mt-3 grid gap-x-1 text-center" style={{ gridTemplateColumns: `repeat(${TYPE_READOUT_KEYS.length}, minmax(0, 1fr))` }}>
        {TYPE_READOUT_KEYS.map((k) => <span key={k} className="text-micro font-medium uppercase text-fg-faint">{k.replace('text-', '')}</span>)}
        {TYPE_READOUT_KEYS.map((k, i) => <span key={k} className="text-mini tabular-nums text-fg-muted">{px[i]}</span>)}
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
        className="mt-3"
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
  radius, radiusRoles, onRoles,
}: {
  radius: Record<string, string>
  radiusRoles: Record<string, string> | undefined
  onRoles: (next: Record<string, string>) => void
}) {
  return (
    <div className="flex flex-col gap-[15px]">
      {RADIUS_GROUPS.map((group) => {
        const current = radiusGroupStep(group, radiusRoles)
        return (
          <div key={group.key} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 flex-shrink-0 text-micro font-medium text-fg">{group.label}</span>
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
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.35)]
            [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 rounded-full"
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

export default function ThemeQuickSettingsRail({
  foundation,
  previewTheme,
  previewAppearance,
  onPreviewAppearanceChange,
  onOpenAdvanced,
  onAccentPreview,
  stylePreview,
  onAdoptStyle,
  onQuickEditOpenChange,
  containedDrawerRootRef,
  onOpenPrimitiveFamily,
  onOpenInVariables,
}: {
  /** Which foundation's quick panel to render — driven by the workspace's icon
   *  rail, so the lit icon and the column on screen are the same decision. The
   *  column used to stack ALL of them (Color / Typography / Shape / Components)
   *  in one scroll, which left the rail with nothing to point at. */
  foundation: string
  previewTheme: string
  previewAppearance: ThemeAppearance
  onPreviewAppearanceChange: (appearance: ThemeAppearance) => void
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
  /** Reports whether the Semantics quick-edit drawer (`TokenDetailsModal`,
   *  `contained` — scoped to `ThemePreviewHub`'s own box) is open, so the
   *  canvas beside this rail can cede matching space instead of letting the
   *  drawer's absolutely-positioned panel paint over it. */
  onQuickEditOpenChange?: (open: boolean) => void
  /** Portal target for the contained token drawer — `ThemePreviewHub`'s root. */
  containedDrawerRootRef?: RefObject<HTMLElement | null>
  /** A ramp-grid family label in the Semantics quick-edit drawer → open that
   *  family's ramp in the Color · Primitives table. */
  onOpenPrimitiveFamily?: (family: string) => void
  /** Leave the Semantics quick-edit drawer for that token's row in the full
   *  Color · Semantics table. */
  onOpenInVariables?: (tokenId: string) => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const applyAccent = useApplyAccentColor()
  const applyNeutral = useApplyGrayColor()
  const [undo, setUndo] = useState<{ snapshot: DesignSnapshot; label: string } | null>(null)
  const [accentPreview, setAccentPreview] = useState<string | null>(null)
  const [accentPickerOpen, setAccentPickerOpen] = useState(false)
  const [neutralPickerOpen, setNeutralPickerOpen] = useState(false)
  const [semanticDrawerOpen, setSemanticDrawerOpen] = useState(false)
  const accentSwatchRef = useRef<HTMLDivElement>(null)
  const neutralSwatchRef = useRef<HTMLDivElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // `target` is resolved once per gesture — a drag must adopt the tried-on
  // style on its FIRST move, not on every frame.
  const scrub = useRef<{ snapshot: DesignSnapshot; label: string; target?: string } | null>(null)
  const {
    themeSources, customColors, primaryColor, grayBaseColor, neutralTint, linkNeutralToAccent,
    patchThemeFoundations, setNeutralTint,
  } = store
  // While a style is being tried on, every readout comes from the PRESET — the
  // same source `resolveStylePreviewTokens` paints the artefacts from, so the
  // rail and the canvas can't describe different systems.
  const tryOn = stylePreview ?? null
  const foundations = tryOn
    ? { ...resolveThemeFoundations(store, previewTheme), ...tryOn.preset.foundations }
    : resolveThemeFoundations(store, previewTheme)
  const { typography, radius, shadows, sizes, selector, stroke, spacing, spacingRoles } = foundations
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
  const setRadiusRoles = (key: string, value: Record<string, string>) =>
    patchThemeFoundations(key, { radiusRoles: value })
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

  const showUndo = (snapshot: DesignSnapshot, label: string) => {
    setUndo({ snapshot, label })
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), 9000)
  }

  /**
   * Resolves the theme a write should land on, ADOPTING the tried-on style
   * first if there is one. This is what makes the rail editable during a
   * try-on: an ephemeral preview has no theme to write to, so the first edit
   * makes it real. Returns `null` only if minting failed.
   */
  const resolveWriteTarget = (): string | null => {
    if (!tryOn) return previewTheme
    // Auto-adopt as "<Style> Copy" — the first quick-settings edit is the user
    // starting to iterate, so it lands in MY THEMES as a duplication of the
    // style, not as the style itself.
    const adopted = adoptPreset(tryOn.preset, previewAppearance, { asCopy: true, copyWord: t('Copy') })
    if ('error' in adopted) return null
    onAdoptStyle?.(adopted.key)
    return adopted.key
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
  const applyAccentScoped = (value: string) => {
    commit('Accent updated', (themeKey) => {
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
    })
  }

  const restore = () => {
    if (!undo) return
    useDesignStore.setState(undo.snapshot)
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

  // What Reset goes back TO. A theme adopted from a System Style returns to
  // that style; one made by hand returns to the system defaults, which is the
  // honest answer — there is no earlier version of it to restore.
  const originPreset = tryOn
    ? tryOn.preset
    : themeStylePreset(store.themeOrigin?.[previewTheme] ?? '')
  const resetTargetLabel = originPreset ? originPreset.label : 'System defaults'

  const resetTheme = () => commit('Theme reset', (themeKey) => {
    const s = useDesignStore.getState()
    const preset = themeStylePreset(s.themeOrigin?.[themeKey] ?? '')
    if (!preset) {
      // No origin — drop every theme-scoped override so the theme falls back to
      // the system's own foundations. Colours are left alone: a hand-made
      // theme's accent IS the thing the user chose, not a deviation from
      // something else.
      s.setThemeFoundations(themeKey, null)
      return
    }
    s.setThemeFoundations(themeKey, preset.foundations)
    s.setNeutralTint(preset.neutralTint)
    // Semantics too — foundations alone left hand-edited borders/ink sticking
    // after Reset, so the theme disagreed with its System Style origin.
    useDesignStore.setState({
      architectureOverrides: resetThemeSemantics(
        s.architectureOverrides,
        preset.semantics,
        themeKey,
      ),
    })
    // Through the normal applier, so the neutral, the states and the page all
    // re-derive exactly as they did when the style was first adopted.
    applyAccent(preset.accent, true, themeKey)
    loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
    loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
  })

  const parsedStrokeSm = parseFloat(stroke?.sm ?? '1px')
  const strokeSm = Number.isFinite(parsedStrokeSm) ? parsedStrokeSm : 1
  const strokeIndex = Math.max(0, STROKE_SM_STOPS.findIndex((stop) => stop === strokeSm))
  // A System Style try-on from the library is preview-only until "Add to
  // system" — the rail dims and stops taking input so it reads as inactive
  // beside an uncommitted style, not as something you can edit in place.
  const previewingStyle = tryOn !== null
  const disabledShell = previewingStyle ? 'opacity-50 pointer-events-none select-none' : ''
  const drawerContained = Boolean(containedDrawerRootRef)
  const colorPickerOpen = accentPickerOpen || neutralPickerOpen

  useEffect(() => {
    onQuickEditOpenChange?.(colorPickerOpen || semanticDrawerOpen)
  }, [colorPickerOpen, semanticDrawerOpen, onQuickEditOpenChange])

  useEffect(() => {
    if (!semanticDrawerOpen) return
    setAccentPickerOpen(false)
    setNeutralPickerOpen(false)
  }, [semanticDrawerOpen])

  useEffect(() => {
    if (!previewingStyle) return
    setAccentPickerOpen(false)
    setNeutralPickerOpen(false)
  }, [previewingStyle])

  return (
    <aside
      aria-label={t('Quick settings')}
      aria-disabled={previewingStyle || undefined}
      className="flex-shrink-0 min-h-0 flex flex-col border-r border-line pt-3 bg-nav"
      style={{ width: QUICK_SETTINGS_WIDTH }}
    >
      <div className={`flex-shrink-0 ${disabledShell}`}>
        <ThemeIdentityBand previewTheme={previewTheme} />
      </div>
      {tryOn && (
        <div className="flex-shrink-0 border-b border-line px-3 py-2 text-mini leading-relaxed text-fg-muted">
          Trying <span className="font-semibold text-fg">{tryOn.preset.shortLabel}</span> — add it from the
          library to edit here.
        </div>
      )}
      {/* Only this region scrolls; the Undo bar below is a pinned footer, so it
          never floats mid-content or leaves a gap under a short rail. Same
          shape as KitsPopover's scroll-body + fixed-footer. */}
      <div className={`flex flex-1 min-h-0 flex-col ${disabledShell}`}>
      <ThemeRailScrollRegion>
      <div className={`flex flex-col ${QUICK_RAIL_STACK_GAP}`}>
        {foundation === 'color' && (
        <EditionCard
          title="Color edition"
          foundationKey="color"
          trailing={<AppearanceToggle value={previewAppearance} onChange={onPreviewAppearanceChange} />}
          onOpenAdvanced={onOpenAdvanced}
        >
          <SettingItem>
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
                  onClick={() => {
                    setNeutralPickerOpen(false)
                    setAccentPickerOpen((open) => !open)
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={accentPickerOpen}
                  aria-label={`${t('Accent')} — ${liveAccent} — open picker`}
                  className="block h-6 w-6 rounded-full border border-line transition-[transform,border-color] duration-75 hover:border-fg-faint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                  style={{ background: liveAccent }}
                />
              </div>
              <ColorPickerPopover
                open={accentPickerOpen}
                onClose={() => setAccentPickerOpen(false)}
                anchor={accentSwatchRef}
                label="Accent"
                value={accent}
                onChange={commitAccent}
                dynamicAccentPalette
                accentHueFrom={liveAccent}
                appearance={previewAppearance}
                contained={drawerContained}
                containedRootRef={containedDrawerRootRef}
                containedDockLeft={COLOR_RAIL_WIDTH}
              />
            </div>
          </SettingItem>

          <SettingItem>
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
                  onClick={() => {
                    setAccentPickerOpen(false)
                    setNeutralPickerOpen((open) => !open)
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={neutralPickerOpen}
                  aria-label={`${t('Neutral tint')} — ${neutralChip} — open picker`}
                  className="block h-6 w-6 rounded-full border border-line transition-[transform,border-color] duration-75 hover:border-fg-faint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                  style={{ background: neutralChip }}
                />
              </div>
              <ColorPickerPopover
                open={neutralPickerOpen}
                onClose={() => setNeutralPickerOpen(false)}
                anchor={neutralSwatchRef}
                label="Neutral"
                value={liveNeutral}
                onChange={(hex) => commit('Neutral updated', (themeKey) => applyNeutral(hex, themeKey))}
                dynamicNeutralPalette
                neutralRampFrom={liveAccent}
                appearance={previewAppearance}
                contained={drawerContained}
                containedRootRef={containedDrawerRootRef}
                containedDockLeft={COLOR_RAIL_WIDTH}
              />
            </div>
          </SettingItem>

        </EditionCard>
        )}

        {/* The theme's semantic colour roles, grouped exactly as the Semantics
            table groups them. Scroll past the Edition card and you are editing
            the same tokens, from the same projection — the card is the fast way
            to move the whole system, this is the precise way to move one role. */}
        {foundation === 'color' && (
          <SemanticTokenGroups
            previewTheme={previewTheme}
            previewAppearance={previewAppearance}
            stackGap={QUICK_RAIL_STACK_GAP}
            onEditingChange={setSemanticDrawerOpen}
            colorPickerOpen={colorPickerOpen}
            containedRootRef={containedDrawerRootRef}
            onOpenPrimitiveFamily={onOpenPrimitiveFamily}
            onOpenInVariables={onOpenInVariables}
          />
        )}

        {foundation === 'typography' && (
        <EditionCard title="Text edition" foundationKey="typography" onOpenAdvanced={onOpenAdvanced}>
          <SettingItem label="Font family">
            <Menu
              ariaLabel="Font family"
              value={typography.fontFamily}
              render={(value) => ({ fontFamily: fontStack(value) })}
              // A family picked in Advanced type (or via the wider Google list)
              // is prepended under its own eyebrow rather than being silently
              // absent — the menu must be able to show what is CURRENTLY set.
              options={(FONT_PRESETS.some((item) => item.value === typography.fontFamily)
                ? FONT_PRESETS.map((font) => ({ value: font.value, label: font.label, group: font.category }))
                : [
                    { value: typography.fontFamily, label: typography.fontFamily, group: 'In this theme' },
                    ...FONT_PRESETS.map((font) => ({ value: font.value, label: font.label, group: font.category })),
                  ])}
              onChange={(value) => commit('Typeface updated', (themeKey) => { loadGoogleFont(value); setTypography(themeKey, { ...typography, fontFamily: value }) })}
            />
          </SettingItem>

          <SettingItem label="Text scale" hint="Grades every label, body style, and heading together.">
            <TypeScaleCard
              sizes={typography.sizes ?? {}}
              onScrubStart={() => beginScrub('Type scale updated')}
              onScrubEnd={endScrub}
              onScrub={(i) => applyScrub('Type scale updated', (themeKey) => {
                const { sizes: nextSizes, lineHeights } = buildTypeScale(TYPE_SCALE_MODES[i].factor)
                setTypography(themeKey, { ...typography, sizes: nextSizes, lineHeights })
              })}
            />
          </SettingItem>
        </EditionCard>
        )}

        {foundation === 'radius' && (
        <EditionCard title="Radius edition" foundationKey="radius" onOpenAdvanced={onOpenAdvanced}>
          <SettingItem label="Radius" hint="Boxes, fields and selectors round independently. Regrade the underlying scale in Variables.">
            <RadiusCard
              radius={radius}
              radiusRoles={foundations.radiusRoles}
              onRoles={(next) => applyScrub('Radius updated', (themeKey) => setRadiusRoles(themeKey, next))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {foundation === 'shadow' && (
        <EditionCard title="Shadow edition" foundationKey="shadow" onOpenAdvanced={onOpenAdvanced}>
          <SettingItem label="Shadow" hint="Grades the complete elevation ramp used by cards, menus, modals, and toasts.">
            <ShadowCard
              shadows={shadows}
              onChange={(value) => commit('Shadow depth updated', (themeKey) => setShadows(themeKey, value))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {foundation === 'sizes' && (
        <EditionCard title="Size edition" foundationKey="sizes" onOpenAdvanced={onOpenAdvanced}>
          <SettingItem label="Fields" hint="Base size for buttons, inputs, selects, and tabs.">
            <BaseUnitCard
              ariaLabel="Fields base size in pixels"
              kind="field"
              steps={SIZE_STEPS}
              values={sizes}
              base={inferSizeBase(sizes) ?? null}
              onScrubStart={() => beginScrub('Field sizes updated')}
              onScrubEnd={endScrub}
              onChange={(base) => applyScrub('Field sizes updated', (themeKey) => setSizes(themeKey, buildSizesFromBase(base)))}
            />
          </SettingItem>

          <SettingItem label="Selectors" hint="Base size for checkbox, radio, and switch controls.">
            <BaseUnitCard
              ariaLabel="Selector base size in pixels"
              kind="selector"
              steps={SELECTOR_STEPS}
              values={selector}
              base={inferSelectorBase(selector) ?? null}
              onScrubStart={() => beginScrub('Selector sizes updated')}
              onScrubEnd={endScrub}
              onChange={(base) => applyScrub('Selector sizes updated', (themeKey) => setSelector(themeKey, buildSelectorsFromBase(base)))}
            />
          </SettingItem>

          <SettingItem label="Containers" hint="Inner padding of cards, panels, alerts, and other boxed surfaces.">
            <ContainerInsetCard
              stepIndex={insetSurfaceStepIndex(spacingRoles)}
              spacing={spacing}
              onScrubStart={() => beginScrub('Container padding updated')}
              onScrubEnd={endScrub}
              onChange={(index) => applyScrub('Container padding updated', (themeKey) => setContainerInset(themeKey, index))}
            />
          </SettingItem>
        </EditionCard>
        )}

        {foundation === 'stroke' && (
        <EditionCard title="Stroke edition" foundationKey="stroke" onOpenAdvanced={onOpenAdvanced}>
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
                className="mt-2"
              />
              <div className="mt-1 flex justify-between text-micro tabular-nums text-fg-faint" aria-hidden>
                {STROKE_SM_STOPS.map((stop) => <span key={stop}>{stop === 0 ? 'None' : stop}</span>)}
              </div>
            </div>
          </SettingItem>
        </EditionCard>
        )}

        {/* Scoped to the Sizes panel — it resets the three dials that panel
            owns (Fields · Selectors · Containers), so it has no business under
            Color or Stroke. */}
        {foundation === 'sizes' && (
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
        {/* The way BACK. Adopting a style is now one edit away, which only
            works if undoing that exploration is equally cheap — otherwise the
            first edit feels irreversible and you get the paralysis this whole
            row exists to remove. It resets to the style the theme came FROM
            (`themeOrigin`), or to the system defaults for a hand-made theme,
            and lands in the same 9s Undo as every other edit. */}
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="min-w-0">
            <p className="truncate text-mini font-medium text-fg-muted">{t('Reset theme')}</p>
            <p className="truncate text-micro text-fg-faint">{t(resetTargetLabel)}</p>
          </div>
          <button
            type="button"
            onClick={resetTheme}
            title={`Reset this theme to ${resetTargetLabel}`}
            aria-label={`Reset this theme to ${resetTargetLabel}`}
            className="h-7 w-7 flex-shrink-0 grid place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            <ResetIcon />
          </button>
        </div>
      </div>
      </ThemeRailScrollRegion>

      <AnimatePresence>
        {undo && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className={`flex-shrink-0 border-t border-line bg-app px-4 py-2 ${disabledShell}`}>
            <button type="button" onClick={restore} className="text-caption font-medium text-accent-ui hover:underline underline-offset-2">
              Undo {undo.label}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </aside>
  )
}
