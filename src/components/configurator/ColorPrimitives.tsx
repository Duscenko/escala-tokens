// Primary Color — the Color hub's "Primitives" tab: a Figma-style families
// table (Accent · Neutral · State · custom families) listing every tone as a
// token row with editable light/dark values, eye toggles on the theme
// columns and a per-row picker. The family nav on the left doubles as the
// promoted DEFINE surface Picker Color used to own — a quick-edit strip above
// the table (hex field, "match states" wand, scale, algorithm settings) edits
// whichever family is active, so palette definition and usage now live on one
// screen. The nav groups families under a THEME folder (see BASE_FOLDER) —
// families are created by Semantics' "+ Theme", not from this rail. Token
// names in the table are the EXACT exported names
// (tokenGenerator's flattenScale prefixes: accent/neutral/error/success/
// warning/info/<slug>), so the table, the semantic sources and tokens.json
// never disagree.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, makeDesignDefaults } from '../../store/useDesignStore'
import type { ColorScale } from '../../types/tokens'
import {
  NAMING_SCHEMES, BASE_TONE, generateColorScale, generateAlphaScale,
  generateDarkColorScale, generateFamilyDarkScale, backgroundFromBase,
  neutralFromBrand, recommendStateColors,
} from '../../lib/colorUtils'
import {
  useApplyAccentColor, useApplyGrayColor, useApplyStateColor, useEnsureColorScales,
} from '../../lib/colorActions'
import {
  SWATCH, CHECKER, ScaleRow, usePopoverPlacement, TokenDetailsModal, DeleteThemeModal,
  curatedPaletteFor, RailToggle, COLOR_RAIL_WIDTH, COLOR_RAIL_COLLAPSED_WIDTH,
} from './colorControls'
import { ColorPickerPanel } from '../ui/ColorField'
import { SlidersIcon, PaletteIcon } from '../ui/icons'
import { themesUsingFamily, FAMILY_SLOTS } from '../../lib/themeSources'
import { ColorControls, ScaleSettingsModal } from './Step2_ColorPalette'
import { buildFamilyExport, buildAlphaFamilyExport, ALPHA_EXPORT_FORMATS, WIZARD_FORMATS, type WizardFormat, type WizardFile } from '../../lib/exportWizard'

// ── Family groups ───────────────────────────────────────────────────────────
// The second nav level, inside each theme folder. Which group a family lands
// in is DERIVED from `themeSources` — a custom family reads as "Accents"
// precisely because its theme's `brand` slot points at it (see `homeOf`).
//
// There is no "+ Add family" control here any more: minting a family from this
// rail meant also deciding which theme slot should reference it (or inventing a
// theme to hold it), which was too much flow for a nav header. Families are
// created where that decision is already being made — Semantics' "+ Theme",
// which asks for the accent/neutral/status colours it needs and files the
// families it mints under that theme's folder automatically.
export const FAMILY_GROUPS = ['Accents', 'Neutrals', 'States', 'Custom'] as const
export type FamilyGroup = (typeof FAMILY_GROUPS)[number]

/** Rendered width of the family-edit popover's `w-64` (16rem at this app's
 *  18px root = 288px). Used only to clamp it inside a narrow viewport. */
const EDIT_POPOVER_W = 288

// ── Small icons (mirroring the Alias table's visual language) ────────────────

function EyeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
    </svg>
  )
}

// ── Radix role bands — which tones (1-12) serve which purpose. Drives the
// families table's group captions; the tone NUMBER always means this,
// independent of whatever the active naming scheme displays for it. ────────
const TONE_BANDS: { max: number; label: string }[] = [
  { max: 2, label: 'Backgrounds' },
  { max: 5, label: 'Interactive components' },
  { max: 8, label: 'Borders' },
  { max: 10, label: 'Solid colors' },
  { max: 12, label: 'Accessible text' },
]
function toneBand(tone: number): string {
  return TONE_BANDS.find((b) => tone <= b.max)?.label ?? ''
}

// What a step is FOR — the Token Details dialog's Description, mirroring the
// role descriptions Semantics shows in the same slot. Keyed off the tone
// number (like TONE_BANDS), so it holds under any naming scheme.
const TONE_DESCRIPTIONS: { max: number; text: string }[] = [
  { max: 2,  text: 'App background. Step 1 is the page itself; step 2 is a subtle surface on top of it.' },
  { max: 5,  text: 'Interactive component fills — 3 at rest, 4 on hover, 5 while active.' },
  { max: 8,  text: 'Borders — 6 subtle, 7 the default, 8 on hover or focus.' },
  { max: 10, text: 'Solid fills. Step 9 is the anchor — the family’s own colour, verbatim — and 10 is its hover.' },
  { max: 12, text: 'Accessible text on the page — 11 clears WCAG AA (≈4.5:1), 12 is the high-contrast step.' },
]
function toneDescription(tone: number): string {
  return TONE_DESCRIPTIONS.find((b) => tone <= b.max)?.text ?? ''
}

// The alpha tone the family NAV previews. Not the anchor (step 9 composites to
// a near-opaque overlay, so it reads as a plain solid chip and defeats the
// point); a mid interactive step is unmistakably translucent while still
// carrying the family's hue.
const ALPHA_NAV_TONE = 5

/** A family's chip in the nav. An alpha family gets the checkerboard treatment
 *  its table cells already use (see AlphaHexCell) instead of a solid chip of
 *  its base — the two families sat side by side under Accents looking
 *  identical, so nothing on screen said which one was the translucent ramp. */
function FamilySwatch({ family, dark, onClick }: {
  family: Family
  dark: boolean
  /** Same "the colour chip itself opens the picker" rule as the quick-edit
   *  strip's `HexCell` swatch — a chip that looks clickable and only the
   *  neighbouring pencil actually works reads as broken, and most people reach
   *  for the colour first. Omitted for alpha families: nothing to edit (an
   *  alpha ramp is derived, see AlphaHexCell), so the chip stays a plain
   *  swatch there, same as the pencil already being withheld for them. */
  onClick?: () => void
}) {
  if (!family.isAlpha) {
    return onClick ? (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={`Edit ${family.label} color`}
        title={`Edit ${family.label} — ${family.base}`}
        className={`${SWATCH} flex-shrink-0 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg`}
        style={{ backgroundColor: family.base }}
      />
    ) : (
      <span className={SWATCH} style={{ backgroundColor: family.base }} />
    )
  }
  const value = (dark ? family.dark : family.light)[ALPHA_NAV_TONE] ?? family.base
  return (
    <span
      className={`${SWATCH} relative overflow-hidden`}
      style={{ ...CHECKER, backgroundSize: '5px 5px' }}
      title={`${family.label} — a translucent ramp (${value})`}
    >
      <span className="absolute inset-0" style={{ backgroundColor: value }} />
    </span>
  )
}


// ── Per-column quick export ─────────────────────────────────────────────────
// The icon sits in the light and dark column headers, so what it exports is
// unambiguous: THIS family, THIS appearance. Picking a format copies the
// result to the clipboard — the glyph is the app's copy/export mark and the
// whole point is pasting one ramp into code or an AI prompt; the guided
// wizard (Export pill) is still the way to get files on disk.
//
// It is NOT a second exporter: `buildFamilyExport` assembles a normal
// WizardSelection and runs it through `buildWizardExport`, so this output is
// byte-identical to running the wizard scoped the same way.
// 304 fit one label + one trailing icon. Copy moved from "click the label" to
// its own icon (matching download instead of hiding behind a whole-row click
// no one could see was clickable) needs a second w-10 cell + divider — widened
// to keep the label from truncating under two dedicated action columns.
const EXPORT_MENU_W = 420

// This popover's own shorthand for the format list — NOT a rename of
// `WIZARD_FORMATS` itself, which still reads "W3C Design Tokens" everywhere
// else (the full wizard has room for the whole name; this compact menu
// doesn't once a row carries two action icons). `badge` mirrors Escala JSON's
// "Figma plugin" pill: W3C's flat $value/$type tree is what Figma's OWN
// "Import variables" accepts with no plugin in the loop, same as Escala JSON
// needs the Escala plugin specifically — two different "gets into Figma"
// paths, each worth flagging the same way.
const MENU_FORMAT_LABEL: Partial<Record<WizardFormat, string>> = { w3c: 'W3C Design' }
const MENU_FORMAT_BADGE: Partial<Record<WizardFormat, string>> = { w3c: 'Figma native', escala: 'Figma plugin' }

function ColumnExportMenu({ family, label, appearance, isAlpha, scale }: {
  family: string
  label: string
  appearance: 'light' | 'dark'
  /** Routes through `buildAlphaFamilyExport` (reads `colors.primitiveAlpha`)
   *  instead of the solid-primitive pipeline, and narrows the offered formats
   *  to `ALPHA_EXPORT_FORMATS` — Tailwind/Markdown have no alpha concept in
   *  `sectionExport` and would silently export nothing or the solid twin. */
  isAlpha?: boolean
  /** The actual alpha hex map for THIS column — `buildAlphaFamilyExport` can't
   *  re-derive it, since alpha values are solved against a page (see
   *  `alphaColorOver`) and aren't stored anywhere the export pipeline reads
   *  from independently. Ignored when `isAlpha` is false. */
  scale?: Record<number, string>
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<WizardFormat | null>(null)
  const [downloaded, setDownloaded] = useState<WizardFormat | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const place = usePopoverPlacement(ref, open)

  // The header lives inside the table's `overflow-auto` column, so an
  // absolutely-positioned panel is CLIPPED at that container's bottom edge
  // (measured: a ~340px menu overflows on any normal window height). Same
  // problem — and same fix — as the family picker below: portal it to <body>
  // and position `fixed` off the button's measured rect, re-measured on scroll
  // (capture, so the table's own scroll counts) and resize.
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!open) { setRect(null); return }
    const measure = () => { const r = ref.current?.getBoundingClientRect(); if (r) setRect(r) }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  // One call site for "give me this format's files", branching to whichever
  // builder actually knows how to read this family's values — the split
  // exists at the DATA layer (see `buildAlphaFamilyExport`'s own comment for
  // why), not duplicated here in `copy`/`downloadOne`.
  const buildFiles = (format: WizardFormat): WizardFile[] =>
    isAlpha && scale ? buildAlphaFamilyExport(family, scale, format) : buildFamilyExport(family, appearance, format)

  function copy(format: WizardFormat) {
    const files = buildFiles(format)
    navigator.clipboard.writeText(
      files.map((f) => (files.length > 1 ? `/* ${f.name} */\n${f.content}` : f.content)).join('\n\n'),
    )
    setCopied(format)
    setTimeout(() => { setCopied(null); setOpen(false) }, 900)
  }

  // Same `buildFiles` call as `copy` — a download is the identical scoped
  // output, just saved instead of put on the clipboard, so the two can never
  // disagree about what "this format, this ramp" means. Doesn't close the
  // popover (unlike `copy`): downloading is the slower action of the two, and
  // someone comparing formats will likely want a second one right after —
  // closing on them would undo the point of leaving it open.
  function downloadOne(format: WizardFormat) {
    const files = buildFiles(format)
    for (const f of files) {
      const mime = f.name.endsWith('.json') ? 'application/json' : f.name.endsWith('.css') || f.name.endsWith('.scss') ? 'text/css' : 'text/plain'
      const url = URL.createObjectURL(new Blob([f.content], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = f.name
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloaded(format)
    setTimeout(() => setDownloaded(null), 900)
  }

  const panel = open && rect
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            // `dialog`, not `menu` — a menu's children must be menuitems, and
            // each row is now a `group` of two independent buttons (copy,
            // download) rather than one activatable item.
            role="dialog"
            aria-label={`Export ${label} — ${appearance}`}
            style={{
              position: 'fixed',
              // Right-aligned to the icon, clamped so a column near either
              // viewport edge still shows the whole panel.
              left: Math.min(Math.max(8, rect.right - EXPORT_MENU_W), window.innerWidth - EXPORT_MENU_W - 8),
              ...(place.up ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
              maxHeight: place.max,
              width: EXPORT_MENU_W,
            }}
            className="z-50 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden normal-case tracking-normal"
          >
            <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2 flex-shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Format</span>
              <span className="text-[11px] font-normal text-fg-faint truncate">{label} · {appearance}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 pb-3 flex flex-col gap-1.5">
              {(isAlpha ? WIZARD_FORMATS.filter((f) => ALPHA_EXPORT_FORMATS.includes(f.key)) : WIZARD_FORMATS).map((f) => {
                const copyDone = copied === f.key
                const downloadDone = downloaded === f.key
                const badge = MENU_FORMAT_BADGE[f.key]
                return (
                  // Copy and download are two EQUAL actions now, so both get a
                  // dedicated icon in their own cell — the label used to double
                  // as the copy button (click anywhere on it), which read as
                  // one action with an unrelated icon bolted on rather than two
                  // choices. The label itself is plain text now, not a control.
                  <div
                    key={f.key}
                    role="group"
                    aria-label={`${MENU_FORMAT_LABEL[f.key] ?? f.label} — ${label} ${appearance}`}
                    className={`flex items-stretch rounded-xl border transition-colors ${
                      copyDone || downloadDone ? 'border-emerald-500/60 bg-emerald-500/[0.08]' : 'border-line hover:border-line-strong'
                    }`}
                  >
                    <div className="flex-1 min-w-0 px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-fg">{MENU_FORMAT_LABEL[f.key] ?? f.label}</span>
                        {badge && (
                          <span className="px-1.5 py-[1px] rounded-full bg-accent-ui/15 text-accent-ui text-[9px] font-semibold uppercase tracking-wide flex-shrink-0">
                            {badge}
                          </span>
                        )}
                        {(copyDone || downloadDone) && (
                          <span className="ml-auto text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                            {copyDone ? 'Copied' : 'Downloaded'}
                          </span>
                        )}
                      </span>
                      <span className="block text-[11.5px] font-normal text-fg-faint truncate">
                        {/* Escala JSON is a whole-document contract — say so here
                            rather than let it read as family-scoped like the rest. */}
                        {f.key === 'escala' ? 'The whole tokens.json — not scoped to this ramp' : f.hint}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(f.key)}
                      aria-label={`Copy ${label} — ${appearance} as ${MENU_FORMAT_LABEL[f.key] ?? f.label}`}
                      title={`Copy as ${MENU_FORMAT_LABEL[f.key] ?? f.label}`}
                      className="flex-shrink-0 w-10 flex items-center justify-center border-l border-line text-fg-faint hover:text-fg hover:bg-elevated/40 transition-colors"
                    >
                      {copyDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 15C4.06812 15 3.60218 15 3.23463 14.8478C2.74458 14.6448 2.35523 14.2554 2.15224 13.7654C2 13.3978 2 12.9319 2 12V5.2C2 4.0799 2 3.51984 2.21799 3.09202C2.40973 2.71569 2.71569 2.40973 3.09202 2.21799C3.51984 2 4.0799 2 5.2 2H12C12.9319 2 13.3978 2 13.7654 2.15224C14.2554 2.35523 14.6448 2.74458 14.8478 3.23463C15 3.60218 15 4.06812 15 5M12.2 22H18.8C19.9201 22 20.4802 22 20.908 21.782C21.2843 21.5903 21.5903 21.2843 21.782 20.908C22 20.4802 22 19.9201 22 18.8V12.2C22 11.0799 22 10.5198 21.782 10.092C21.5903 9.71569 21.2843 9.40973 20.908 9.21799C20.4802 9 19.9201 9 18.8 9H12.2C11.0799 9 10.5198 9 10.092 9.21799C9.71569 9.40973 9.40973 9.71569 9.21799 10.092C9 10.5198 9 11.0799 9 12.2V18.8C9 19.9201 9 20.4802 9.21799 20.908C9.40973 21.2843 9.71569 21.5903 10.092 21.782C10.5198 22 11.0799 22 12.2 22Z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadOne(f.key)}
                      aria-label={`Download ${label} — ${appearance} as ${MENU_FORMAT_LABEL[f.key] ?? f.label}`}
                      title={`Download as ${MENU_FORMAT_LABEL[f.key] ?? f.label}`}
                      className="flex-shrink-0 w-10 flex items-center justify-center rounded-r-xl border-l border-line text-fg-faint hover:text-fg hover:bg-elevated/40 transition-colors"
                    >
                      {downloadDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M21 15V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V15M17 10L12 15M12 15L7 10M12 15V3" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )
    : null

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Export the ${label} family — ${appearance}`}
        title={`Copy the ${appearance} ${label} ramp in any format`}
        className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
          open ? 'bg-elevated text-fg' : 'text-fg-faint hover:text-fg hover:bg-elevated'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.7914 12.6074C21.0355 12.3981 21.1575 12.2935 21.2023 12.169C21.2415 12.0598 21.2415 11.9402 21.2023 11.831C21.1575 11.7065 21.0355 11.6018 20.7914 11.3926L12.3206 4.13196C11.9004 3.77176 11.6903 3.59166 11.5124 3.58725C11.3578 3.58342 11.2101 3.65134 11.1124 3.77122C11 3.90915 11 4.18589 11 4.73936V9.03462C8.86532 9.40807 6.91159 10.4897 5.45971 12.1139C3.87682 13.8845 3.00123 16.1759 3 18.551V19.1629C4.04934 17.8989 5.35951 16.8765 6.84076 16.1659C8.1467 15.5394 9.55842 15.1683 11 15.0705V19.2606C11 19.8141 11 20.0908 11.1124 20.2288C11.2101 20.3486 11.3578 20.4166 11.5124 20.4127C11.6903 20.4083 11.9004 20.2282 12.3206 19.868L20.7914 12.6074Z" />
        </svg>
      </button>
      {panel}
    </div>
  )
}

// ── Editable hex cell (swatch + live hex field, draft pattern) ───────────────

function HexCell({ value, onChange, ariaLabel, onSwatchClick, swatchLabel }: {
  value: string
  onChange: (hex: string) => void
  ariaLabel: string
  /** When set, the swatch becomes a button opening the same picker the trailing
   *  chevron does. A colour chip that looks clickable and isn't reads as broken,
   *  and the swatch is the part users aim at first; the hex text stays directly
   *  editable either way. Omitted in the table cells, which have no picker to
   *  open — there the swatch is a readout of the value beside it. */
  onSwatchClick?: () => void
  swatchLabel?: string
}) {
  const [draft, setDraft] = useState(value.replace(/^#/, '').toUpperCase())
  const [focused, setFocused] = useState(false)
  const [copied, setCopied] = useState(false)

  // Track outside changes (accent swap regenerates the ramp) unless mid-type.
  useEffect(() => { if (!focused) setDraft(value.replace(/^#/, '').toUpperCase()) }, [value, focused])

  function handle(raw: string) {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setDraft(cleaned.toUpperCase())
    if (cleaned.length === 6) onChange(`#${cleaned.toLowerCase()}`)
  }

  function copy() {
    navigator.clipboard.writeText(`#${value.replace(/^#/, '').toLowerCase()}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 900)
  }

  return (
    // `group/hex` scopes the hover to THIS cell, not the whole row (the row
    // itself is `group` for its own trailing "expand tone" button) — hovering
    // the dark column shouldn't reveal a copy icon on the light one.
    <div className="group/hex flex items-center gap-2 min-w-0">
      {onSwatchClick ? (
        <button
          type="button"
          onClick={onSwatchClick}
          aria-haspopup="dialog"
          aria-label={swatchLabel ?? 'Open color picker'}
          title={swatchLabel ?? 'Open color picker'}
          className={`${SWATCH} transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg`}
          style={{ backgroundColor: value }}
        />
      ) : (
        <span className={SWATCH} style={{ backgroundColor: value }} />
      )}
      <input
        value={draft}
        onChange={(e) => handle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        spellCheck={false}
        aria-label={ariaLabel}
        className="flex-1 min-w-0 bg-app text-[12px] font-mono tabular-nums text-fg rounded-md border border-transparent hover:border-line focus:border-fg px-1.5 py-1 outline-none transition-colors"
      />
      {/* Hidden until the cell is hovered/focused — a copy icon sitting there
          permanently on every one of the 12×2 rows would out-noise the hex
          text it's next to. `focus-visible` keeps it reachable without a mouse. */}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy ${ariaLabel}`}
        title={copied ? 'Copied' : 'Copy hex value'}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-fg-faint hover:text-fg hover:bg-elevated opacity-0 group-hover/hex:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        {copied ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ── Read-only alpha cell — an alpha value is SOLVED against the page it
// renders on (see colorUtils' alphaColorOver), never independently editable,
// so this has no input, just the swatch (over a checkerboard, so the
// translucency itself stays legible instead of reading as a flat, wrong-
// looking color) and the hex as static text. ──
function AlphaHexCell({ value, solid, solidName }: { value: string; solid?: string; solidName?: string }) {
  // Split swatch when the solid twin is known: the LEFT half is the raw alpha
  // over the checkerboard (so the translucency is unmistakable), the RIGHT half
  // is the solid tone it composites to. Side by side they read as one fact —
  // "this alpha IS accent-3" — which a lone faint chip never communicated; the
  // checkerboard proved it was translucent but not WHICH tone it reproduced.
  const title = solid && solidName
    ? `${value} — the alpha that renders as ${solidName} (${solid}) over its page. Derived, not directly editable.`
    : `${value} — derived, not directly editable`
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`${SWATCH} relative overflow-hidden flex-shrink-0`} style={{ ...CHECKER, backgroundSize: '6px 6px' }} title={title}>
        <span className={`absolute inset-y-0 left-0 ${solid ? 'right-1/2' : 'right-0'}`} style={{ backgroundColor: value }} />
        {solid && <span className="absolute inset-y-0 left-1/2 right-0" style={{ backgroundColor: solid }} />}
      </span>
      <span className="w-full min-w-0 truncate text-[12px] font-mono tabular-nums text-fg-muted px-1.5 py-1" title={title}>
        {value.replace(/^#/, '').toUpperCase()}
      </span>
    </div>
  )
}

// ── Family model — every primitive ramp the system carries ───────────────────

interface Family {
  key: string
  label: string
  /** Export prefix — the token name is `<tokenPrefix>-<toneLabel>`, matching tokenGenerator. */
  tokenPrefix: string
  base: string
  light: ColorScale
  dark: ColorScale
  setLight: (s: ColorScale) => void
  setDark: (s: ColorScale) => void
  /** Custom-family key — removable from the nav. */
  customKey?: string
  /** Derived alpha twin (e.g. Accent-Alpha) — solved from another family
   *  against the page it renders on, never independently set. Cells render
   *  read-only, over a checkerboard so the translucency stays legible instead
   *  of reading as a flat (and page-appearance-dependent) wrong color. */
  isAlpha?: boolean
  /** For an alpha twin of a CUSTOM family: the family key it derives from, so
   *  it files into the same theme folder as its solid instead of drifting into
   *  "Custom" on its own. */
  alphaOf?: string
  /** For an alpha twin: the SOLID ramp it reproduces when composited over its
   *  page. Rendered beside the translucent value so a row reads as "this alpha
   *  IS that solid" rather than an unrelated faint colour. */
  solidLight?: ColorScale
  solidDark?: ColorScale
}

// ── Theme folders ───────────────────────────────────────────────────────────
// The nav is two levels: a THEME folder, then that theme's Accents/Neutrals/
// States. Every family has exactly one home theme, so nothing is duplicated:
//
//  · The globals (accent, neutral, the four states) belong to `BASE_FOLDER` —
//    labelled "Theme 1" rather than a theme's name because BOTH built-in modes
//    (light + dark) read them; they're one palette seen two ways, not two.
//  · A custom family belongs to the FIRST theme in `themeOrder` whose sources
//    reference it — i.e. the theme that minted it when it was added in
//    Semantics. A theme that reuses a global for a slot doesn't re-home it.
//  · Anything no theme references falls to `CUSTOM_FOLDER`.
const BASE_FOLDER = '__base'
const CUSTOM_FOLDER = '__custom'

export default function ColorPrimitives({
  previewTheme = 'light',
  onPreviewThemeChange,
  focusFamilyKey,
  tabBar,
  railCollapsed = false,
  onToggleRail,
}: {
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** External request to switch the active family (e.g. NewTokenWizard just
   *  created it) — a family key (`custom-<slug>`), re-applied whenever it
   *  changes to a new value. */
  focusFamilyKey?: string | null
  /** The Primitives/Semantics/Gradients tab pill bar, rendered by ColorHub —
   *  passed down instead of pre-wrapped so it can share a row with "Groups"
   *  (matches the Figma reference: same line, 198px nav-aligned left portion
   *  + tabs/search on the right) instead of sitting in its own full-width row. */
  tabBar?: ReactNode
  /** Collapses this view's own 198px left column (accent-color cell · Groups
   *  header · family nav) to a swatch strip, handing the width to the token
   *  table. LIFTED to `Configurator`, not local state, for one reason: the
   *  TopNav brand block's right border is what continues this column's divider
   *  up through the header (`brandWidth`), so if the column could shrink
   *  without the shell knowing, that divider would stop at the header and
   *  restart one row down — two unrelated rules instead of one. */
  railCollapsed?: boolean
  onToggleRail?: () => void
}) {
  const store = useDesignStore()
  const {
    primaryColor, primaryScale, setPrimaryScale,
    primaryDarkScale, setPrimaryDarkScale,
    grayBaseColor, grayLightScale, grayDarkScale, setGrayLightScale, setGrayDarkScale,
    errorColor, errorScale, errorDarkScale, setErrorScale, setErrorDarkScale,
    warningColor, warningScale, warningDarkScale, setWarningScale, setWarningDarkScale,
    successColor, successScale, successDarkScale, setSuccessScale, setSuccessDarkScale,
    infoColor, infoScale, infoDarkScale, setInfoScale, setInfoDarkScale,
    customColors, updateCustomColor, removeCustomColor,
    removeTheme,
    pageBackground, darkBackground, themeKinds, themeSources, themeOrder,
    colorAlgorithm, colorNaming, contrastShift, neutralTint,
    linkNeutralToAccent, setLinkNeutralToAccent,
    linkStatesToAccent, setLinkStatesToAccent,
    setContrastShift, setNeutralTint,
  } = store
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  const applyStateColor = useApplyStateColor()

  // Seed any ramp that's still empty (a fresh system may land here straight
  // from Home's "Start setting tokens" CTA).
  useEnsureColorScales()

  const darkPreview = (themeKinds[previewTheme] ?? 'light') === 'dark'

  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  // Retinting Accent cascades to Neutral only while the link is on — the flag
  // now lives in the STORE (`linkNeutralToAccent`), not as local state in a
  // popover. This used to be hardcoded `false` with a comment pointing at
  // Picker Color as the place "move both together" lives; Picker Color was
  // retired and the behaviour went with it, so the neutral silently stopped
  // tracking the accent everywhere. The toggle is in the scale-settings gear,
  // beside Neutral tint — the setting that decides how much accent hue the
  // linked neutral even carries.
  const changeAccent = (hex: string) => applyAccentColor(hex, linkNeutralToAccent, previewTheme)

  // Harmonize the four state colours with the accent. `recommendStateColors`
  // blends only CHROMA — each state keeps its canonical lightness and hue,
  // because the hue IS the semantics (a red that drifts toward a green accent
  // stops reading as an error). So this makes the set share the accent's
  // saturation character without touching what any of them mean. Used both for
  // the toggle's swatch preview and to actually apply the link — same value,
  // so the preview can never promise something the click doesn't deliver.
  const stateRecommendation = useMemo(() => recommendStateColors(primaryColor), [primaryColor])
  const changeNeutral = (hex: string) => applyGrayColor(hex, previewTheme)

  // ── Families table state ──
  const [activeFamily, setActiveFamily] = useState('accent')
  const [query, setQuery] = useState('')
  // Which tone's Token Details dialog is open, and which appearance that
  // dialog is currently editing. Rows used to expand INLINE here while the
  // identical job on the Semantics tab opened a dialog — same hub, same "edit
  // one token's value" task, two different interactions. Primitives now opens
  // the SAME shared TokenDetailsModal, so there's one thing to learn.
  const [expandedTone, setExpandedTone] = useState<number | null>(null)
  const [detailMode, setDetailMode] = useState<'light' | 'dark'>('light')
  const reduce = useReducedMotion() ?? false
  /** The tones table's scroll container — the Token Details dialog's anchor. */
  const tableRef = useRef<HTMLDivElement>(null)

  // Scale-settings gear (algorithm/naming/contrast shift) — promoted from
  // Picker Color into the quick-edit strip below.
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Theme folder pending deletion. The rail's per-family trash is LOCKED while
  // a theme references that family ("remove the theme first") — and until now
  // the only place to remove a theme was Semantics' column header, which is a
  // different tab. So a custom family created by "+ Theme" was, in practice,
  // undeletable from the screen that shows it. This is that missing exit:
  // deleting the theme frees its families into Custom, where the existing
  // per-family trash already works. Nothing about the colours is destroyed —
  // only the theme and the semantic values mapped to it.
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null)

  // A family created elsewhere (NewTokenWizard) requests focus — switch to it
  // so the table actually shows the family + names the user just picked,
  // instead of silently staying on whatever was active before.
  useEffect(() => {
    if (focusFamilyKey) setActiveFamily(focusFamilyKey)
  }, [focusFamilyKey])

  /** Families some theme reads as its brand — those get an alpha twin. */
  const brandFamilyKeys = useMemo(() => {
    const s = new Set<string>()
    Object.values(themeSources).forEach((refs) => { if (refs?.brand) s.add(refs.brand) })
    return s
  }, [themeSources])

  // A no-op setter for derived families (Accent-Alpha) — never actually
  // invoked since every edit affordance (pencil, per-row expand) is guarded
  // off for `isAlpha` families below; it exists only to satisfy `Family`'s
  // shape without special-casing every call site that expects a setter.
  const noopSet = useCallback((_s: ColorScale) => {}, [])

  // EVERY family carries both scales (the Radix two-scale model) — the light
  // column edits the light ramp, the dark column its own dark twin.
  const families: Family[] = useMemo(() => [
    { key: 'accent',  label: 'Accent',  tokenPrefix: 'accent',  base: primaryColor,  light: primaryScale,   dark: primaryDarkScale, setLight: setPrimaryScale,   setDark: setPrimaryDarkScale },
    {
      key: 'accent-alpha', label: 'Accent-Alpha', tokenPrefix: 'accent-a', base: primaryColor,
      // Solved against each appearance's own page — see colorUtils'
      // alphaColorOver — never independently set, so both scales are derived
      // live rather than stored.
      light: generateAlphaScale(primaryScale, pageBackground, 'light'),
      dark: generateAlphaScale(primaryDarkScale, darkBackground, 'dark'),
      setLight: noopSet, setDark: noopSet, isAlpha: true,
      solidLight: primaryScale, solidDark: primaryDarkScale,
    },
    { key: 'neutral', label: 'Neutral', tokenPrefix: 'neutral', base: grayBaseColor, light: grayLightScale, dark: grayDarkScale,    setLight: setGrayLightScale, setDark: setGrayDarkScale },
    { key: 'error',   label: 'Error',   tokenPrefix: 'error',   base: errorColor,    light: errorScale,     dark: errorDarkScale,   setLight: setErrorScale,     setDark: setErrorDarkScale },
    { key: 'success', label: 'Success', tokenPrefix: 'success', base: successColor,  light: successScale,   dark: successDarkScale, setLight: setSuccessScale,   setDark: setSuccessDarkScale },
    { key: 'warning', label: 'Warning', tokenPrefix: 'warning', base: warningColor,  light: warningScale,   dark: warningDarkScale, setLight: setWarningScale,   setDark: setWarningDarkScale },
    { key: 'info',    label: 'Info',    tokenPrefix: 'info',    base: infoColor,     light: infoScale,      dark: infoDarkScale,    setLight: setInfoScale,      setDark: setInfoDarkScale },
    // A custom family that some theme reads as its BRAND gets an alpha twin
    // right after it, exactly like the global Accent does — a theme's accent
    // needs its overlay ramp as much as the default one. Built adjacent so the
    // pair stays together in the Accents group. These are real exported tokens
    // (`tokenGenerator` already emits `<key>-a*` for every custom family), not
    // a display-only row.
    ...customColors.flatMap((c): Family[] => {
      const solid: Family = {
        key: `custom-${c.key}`,
        label: c.label,
        tokenPrefix: c.key,
        base: c.base,
        light: c.scale,
        dark: c.darkScale ?? c.scale,
        setLight: (s: ColorScale) => updateCustomColor(c.key, { scale: s }),
        setDark: (s: ColorScale) => updateCustomColor(c.key, { darkScale: s }),
        customKey: c.key,
      }
      if (!brandFamilyKeys.has(c.key)) return [solid]
      return [solid, {
        key: `custom-${c.key}-alpha`,
        label: `${c.label}-Alpha`,
        tokenPrefix: `${c.key}-a`,
        base: c.base,
        light: generateAlphaScale(c.scale, pageBackground, 'light'),
        dark: generateAlphaScale(c.darkScale ?? c.scale, darkBackground, 'dark'),
        setLight: noopSet, setDark: noopSet, isAlpha: true, alphaOf: c.key,
        solidLight: c.scale, solidDark: c.darkScale ?? c.scale,
      }]
    }),
  ], [
    brandFamilyKeys,
    primaryColor, primaryScale, setPrimaryScale,
    primaryDarkScale, setPrimaryDarkScale,
    pageBackground, darkBackground, noopSet,
    grayBaseColor, grayLightScale, grayDarkScale, setGrayLightScale, setGrayDarkScale,
    primaryDarkScale, setPrimaryDarkScale,
    errorColor, errorScale, errorDarkScale, setErrorScale, setErrorDarkScale,
    successColor, successScale, successDarkScale, setSuccessScale, setSuccessDarkScale,
    warningColor, warningScale, warningDarkScale, setWarningScale, setWarningDarkScale,
    infoColor, infoScale, infoDarkScale, setInfoScale, setInfoDarkScale,
    customColors, updateCustomColor,
  ])

  const family = families.find((f) => f.key === activeFamily) ?? families[0]

  // ── Folders (Figma-style collections) ──
  // The nav groups families by the ROLE they serve, not by insertion order:
  // Accents (the brand + every custom family a theme reads as its accent),
  // Neutrals (base + theme neutrals), States (the four intents + custom status
  // families) and Custom for free-standing families no theme references yet.
  // States stays here too — this rail is EVERY color primitive's usage table
  // (Backgrounds/Interactive/Borders/Solid/Text bands), and Error/Success/
  // Warning/Info are primitives same as Accent/Neutral; Picker Color showing
  // their full scale for quick editing doesn't remove them from usage.
  // Derived from `themeSources`, so a family minted by "Add theme" files
  // itself under the right folder with zero bookkeeping.
  /** A family's home folder + the group it sits in there. See BASE_FOLDER. */
  const homeOf = useCallback(
    (f: Family): { folder: string; group: FamilyGroup } => {
      // Globals — one palette, read by both built-in modes.
      if (f.key === 'accent' || f.key === 'accent-alpha') return { folder: BASE_FOLDER, group: 'Accents' }
      if (f.key === 'neutral') return { folder: BASE_FOLDER, group: 'Neutrals' }
      const custKey = f.customKey ?? f.alphaOf
      if (!custKey) return { folder: BASE_FOLDER, group: 'States' }
      // Custom family — homed to the first theme that references it, under the
      // group matching the SLOT it fills there (brand → Accents, gray →
      // Neutrals, any status slot → States).
      for (const theme of themeOrder) {
        const refs = themeSources[theme]
        if (!refs) continue
        for (const slot of FAMILY_SLOTS) {
          if (refs[slot] !== custKey) continue
          return {
            folder: theme,
            group: slot === 'brand' ? 'Accents' : slot === 'gray' ? 'Neutrals' : 'States',
          }
        }
      }
      return { folder: CUSTOM_FOLDER, group: 'Custom' }
    },
    [themeOrder, themeSources],
  )

  const navFolders = useMemo(() => {
    const byFolder = new Map<string, Map<FamilyGroup, Family[]>>()
    families.forEach((f) => {
      const { folder, group } = homeOf(f)
      if (!byFolder.has(folder)) byFolder.set(folder, new Map())
      const groups = byFolder.get(folder)!
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)!.push(f)
    })
    // Base first, then themes in the user's own column order, Custom last.
    const order = [BASE_FOLDER, ...themeOrder.filter((t) => t !== BASE_FOLDER), CUSTOM_FOLDER]
    return order
      .filter((k) => byFolder.has(k))
      .map((k) => ({
        key: k,
        label:
          k === BASE_FOLDER ? 'Theme 1'
          : k === CUSTOM_FOLDER ? 'Custom'
          : k.charAt(0).toUpperCase() + k.slice(1),
        groups: FAMILY_GROUPS
          .map((label) => ({ label, items: byFolder.get(k)!.get(label) ?? [] }))
          .filter((g) => g.items.length > 0),
      }))
  }, [families, homeOf, themeOrder])

  // Collapsed nav sections. Keys are a whole folder's own key, or
  // `<folder>/<group>` for one of its Accents/Neutrals/States groups, so the
  // two levels collapse independently.
  //
  // Fresh-mount default: every THEME folder (not Base, not Custom) starts
  // collapsed. `homeOf` above homes a "+ Theme"-minted family under its own
  // theme's folder — so a system with two or three extra themes used to load
  // Primitives with every one of them, plus their own Accents/Neutrals/States
  // groups, already expanded: a wall of ramps before you'd picked which theme
  // to even look at. Base (the globals every system starts with) and Custom
  // stay open, since those are what a fresh system — or one with no extra
  // themes yet — actually wants visible on first look. This is a LAZY
  // initializer, not an effect: `navFolders` is already computed by the time
  // render reaches this line, so the very first paint is already collapsed —
  // no expand-then-snap-shut flash.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const collapsed = new Set<string>()
    navFolders.forEach((folder) => {
      if (folder.key !== BASE_FOLDER && folder.key !== CUSTOM_FOLDER) collapsed.add(folder.key)
    })
    return collapsed
  })
  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const q = query.trim().toLowerCase()
  const tones = Array.from({ length: 12 }, (_, i) => i + 1)
  const rowName = (tone: number) => `${family.tokenPrefix}-${namingLabels[tone - 1] ?? tone}`
  // The SOLID token an alpha row reproduces — `accent-a-3` → `accent-3`. The
  // alpha prefix is the solid's plus "-a" (see the alpha families above), so
  // dropping that suffix recovers the solid's exported name exactly.
  const solidRowName = (tone: number) =>
    `${family.tokenPrefix.replace(/-a$/, '')}-${namingLabels[tone - 1] ?? tone}`
  const visibleTones = q ? tones.filter((tone) => rowName(tone).toLowerCase().includes(q)) : tones

  const setTone = (scale: ColorScale, setter: (s: ColorScale) => void, tone: number, hex: string) =>
    setter({ ...scale, [tone]: hex })

  // ── Per-family colour editing ──
  // The nav used to be selection-only: to retint a family you had to go back up
  // to the quick bar and know which control owned it. Each row now carries a
  // pencil that opens the picker for THAT family, routed to whichever applier
  // owns it.
  const [editFamily, setEditFamily] = useState<string | null>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const editPopRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const editPlace = usePopoverPlacement(navRef, editFamily, { side: true })

  // The picker is 256px wide but the nav column is 198px AND scrolls
  // (`overflow-y-auto`), with two more `overflow:hidden` wrappers above it from
  // the folder/group collapse animations. An absolutely-positioned popover
  // inside that stack gets CLIPPED on its right edge and top — which is exactly
  // the bug: the state pickers rendered as a sliver inside the rail's mask.
  //
  // No arrangement of z-index fixes an overflow clip, so the popover is
  // portaled to <body> and positioned `fixed` off a measured rect instead.
  //
  // That rect is the NAV's, not the clicked row's. Anchoring per-row put every
  // family's picker somewhere different — and worse, the rows sit low enough
  // that the placement hook flipped most of them ABOVE their row, where a
  // ~520px panel ran off the top of the window: measured at 833px tall, Error
  // opened at y=9 (jammed against the viewport edge, overlapping TopNav) while
  // Success opened at y=46 and Info at y=119. Same control, four positions,
  // one of them clipped. Anchoring to the nav gives every family ONE position,
  // and it's beside the column rather than over it, so the family list stays
  // readable while you edit — the same "dock the picker next to the column,
  // not on top of it" move the quick-edit strip's popover makes.
  // Re-measured on scroll (capture phase, so an ancestor's scroll counts) and
  // on resize.
  const [navRect, setNavRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!editFamily) { setNavRect(null); return }
    const measure = () => {
      const r = navRef.current?.getBoundingClientRect()
      if (r) setNavRect(r)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [editFamily])

  useEffect(() => {
    if (!editFamily) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      // Both the anchor row AND the portaled popover count as "inside" — the
      // popover is no longer a DOM descendant of the row, so checking only the
      // row would close the picker on its own clicks.
      if (editRef.current?.contains(t) || editPopRef.current?.contains(t)) return
      setEditFamily(null)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setEditFamily(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [editFamily])

  // Same picker, opened from the quick-edit strip's own hex field (its
  // dropdown chevron) instead of the nav row's pencil — same edit, second
  // entry point, own popover instance so it anchors where it's clicked.
  const [stripEditOpen, setStripEditOpen] = useState(false)
  const stripEditRef = useRef<HTMLDivElement>(null)
  const stripEditPlace = usePopoverPlacement(stripEditRef, stripEditOpen, { side: true })
  useEffect(() => {
    if (!stripEditOpen) return
    function onDown(e: MouseEvent) {
      if (stripEditRef.current && !stripEditRef.current.contains(e.target as Node)) setStripEditOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setStripEditOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [stripEditOpen])

  // ── Reset a family to its factory colour ──
  // Read from `makeDesignDefaults()` — the SAME factory a brand-new system is
  // seeded from — rather than a hardcoded hex table here, so "reset" can never
  // drift from what "default" actually means. Built once per mount: the factory
  // also builds gradients and ramps, which there's no reason to redo per render.
  const factory = useMemo(() => makeDesignDefaults(), [])
  /** The factory base for a family, or null when there ISN'T one — a custom
   *  family was invented by the user, so there's no default to return it to,
   *  and an alpha twin is solved from its solid rather than set. Those two get
   *  no button at all instead of a dead one. */
  const defaultBaseFor = (f: Family): string | null => {
    if (f.isAlpha || f.customKey) return null
    switch (f.key) {
      case 'accent': return factory.primaryColor
      case 'neutral': return factory.grayBaseColor
      case 'error': return factory.errorColor
      case 'warning': return factory.warningColor
      case 'success': return factory.successColor
      case 'info': return factory.infoColor
      default: return null
    }
  }

  const changeFamilyBase = (f: Family, hex: string) => {
    // Derived (Accent-Alpha) — nothing to set independently.
    if (f.isAlpha) return
    if (f.customKey) {
      try {
        updateCustomColor(f.customKey, { base: hex, scale: generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground) })
      } catch { /* invalid hex — ignore */ }
      return
    }
    if (f.key === 'accent') return changeAccent(hex)
    if (f.key === 'neutral') return changeNeutral(hex)
    applyStateColor(f.key as 'error' | 'warning' | 'success' | 'info', hex)
  }

  // Built here rather than inline in the nav so it renders ONCE, outside every
  // clipping ancestor. `left` docks it just past the nav's right border, still
  // clamped to the viewport so the panel can't hang off-screen on a narrow
  // window. That clamp used to subtract a literal 256 for "the `w-64` panel" —
  // wrong here, because this app's root font-size is 18px, so `w-64` (16rem)
  // measures 288. `EDIT_POPOVER_W` is that measured width; keep the two in
  // step if the class changes.
  const editingFamily = editFamily ? families.find((f) => f.key === editFamily) ?? null : null
  const editPortal = editingFamily && navRect
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={editPopRef}
            key={editingFamily.key}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            role="dialog"
            aria-label={`Edit ${editingFamily.label} color`}
            style={{
              position: 'fixed',
              left: Math.min(navRect.right + 8, window.innerWidth - EDIT_POPOVER_W - 12),
              // Top-aligned with the nav in the normal case; `up` only fires on
              // a window too short to fit the panel below the nav's own top,
              // and then it bottom-aligns instead of running off-screen.
              ...(editPlace.up
                ? { bottom: window.innerHeight - navRect.bottom }
                : { top: navRect.top }),
              maxHeight: editPlace.max,
            }}
            className="z-50 w-64 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 flex-shrink-0">
              <span className={SWATCH} style={{ backgroundColor: editingFamily.base }} />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{editingFamily.label}</span>
              <span className="text-[11px] font-mono tabular-nums text-fg-faint flex-shrink-0">{editingFamily.base.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
              <ColorPickerPanel
                value={editingFamily.base}
                onChange={(hex) => changeFamilyBase(editingFamily, hex)}
                suggestions
                palette={curatedPaletteFor(editingFamily.key)}
              />
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )
    : null

  // ── Token Details dialog (one tone of the active family) ──
  // "Reset" means: put this tone back to what the generator produces for the
  // family's own base — the primitives' equivalent of Semantics' "reset to
  // the recommended tone". Computed from the SAME generators the family was
  // built with (neutral has its own dark builder), so a reset can't disagree
  // with what editing the family colour would produce.
  const standardScales = useMemo(() => {
    try {
      // "Reset to standard" has to reproduce what the APPLIERS produce, so the
      // neutral's two ramps take the tint exactly the way `useApplyGrayColor`
      // passes it — otherwise Reset would quietly hand back the untinted curve
      // and read as a bug the moment the tint is Tinted/Vivid.
      const isNeutral = family.key === 'neutral'
      return {
        light: generateColorScale(family.base, colorAlgorithm, contrastShift, pageBackground, 'light', isNeutral ? neutralTint : undefined),
        dark: isNeutral
          ? generateDarkColorScale(family.base, colorAlgorithm, contrastShift, darkBackground, neutralTint)
          : generateFamilyDarkScale(family.base, colorAlgorithm, contrastShift, darkBackground),
      }
    } catch {
      return null
    }
  }, [family.base, family.key, colorAlgorithm, contrastShift, pageBackground, darkBackground, neutralTint])

  const detailsModal = !family.isAlpha && expandedTone != null ? (() => {
    const tone = expandedTone
    const name = rowName(tone)
    const modes = [
      { key: 'light' as const, value: family.light[tone] ?? '#ffffff', std: standardScales?.light[tone], set: (hex: string) => setTone(family.light, family.setLight, tone, hex) },
      { key: 'dark' as const, value: family.dark[tone] ?? '#000000', std: standardScales?.dark[tone], set: (hex: string) => setTone(family.dark, family.setDark, tone, hex) },
    ]
    const modified = modes.some((m) => m.std && m.value.toLowerCase() !== m.std.toLowerCase())
    return (
      <TokenDetailsModal
        key={`${family.key}-${tone}`}
        name={name}
        // Matches what `exporters.ts` actually emits for a primitive
        // (`--color-accent-9`), so the chip is copy-pasteable as-is.
        cssVarName={`color-${name}`}
        description={toneDescription(tone)}
        onReset={() => modes.forEach((m) => { if (m.std) m.set(m.std) })}
        resetDisabled={!modified}
        onClose={() => setExpandedTone(null)}
        reduce={reduce}
        anchorRef={tableRef}
        initialOpenKey={detailMode}
        // One collapsible card per appearance, first open — the same shape
        // Semantics' modes use. Collapsed peers are what make stacking full
        // HSV pickers affordable here: only the mode you opened is tall.
        sections={modes.map((m) => ({
          key: m.key,
          label: m.key,
          kind: m.key,
          content: <ColorPickerPanel value={m.value} onChange={m.set} />,
        }))}
      />
    )
  })() : null

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: 'minmax(9rem,1.1fr) repeat(2, minmax(8.5rem,1fr)) 2.75rem',
  }

  return (
    // No enter animation on the tab panel itself. The three Color tabs now
    // share an identical three-row chrome, and `centerKey` (Configurator) is
    // `f-color` for all of them — so the OUTER fade only fires when you switch
    // foundations, which is what should animate. Animating here too made the
    // rail, strip and header fade+slide 12px on every tab click even though
    // they render in the same place: the chrome appeared to jump while only
    // the content had actually changed.
    <div className="h-full flex flex-col">
      {/* ── "Groups" shares a row with the tab pill bar + search — same line,
          per the Figma reference — instead of each owning a separate row.
          MOVED ABOVE the quick-edit strip (was row 2, now row 1) — reported as
          wanting "Groups" over the accent-color cell and the tab bar/search
          over the ramp, i.e. the nav's own header sits directly above the nav
          it labels, and the strip that EDITS a family sits directly above the
          table it edits, instead of the two being interleaved. The 198px left
          portion still shares the same column every row in this view uses,
          just one row earlier now. `border-line` (full strength, not the
          `/60` this row used when it sat second) — this is now the row
          directly above the nav + table, the same boundary weight the OTHER
          row carried when IT was last. ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line">
        <div
          className={`flex-shrink-0 flex items-center h-[52px] border-r border-line transition-[width] duration-200 ${
            railCollapsed ? 'justify-center px-0' : 'justify-between px-4'
          }`}
          style={{ width: railCollapsed ? COLOR_RAIL_COLLAPSED_WIDTH : COLOR_RAIL_WIDTH }}
        >
          {!railCollapsed && <span className="text-[13px] font-semibold text-fg">Groups</span>}
          <RailToggle collapsed={railCollapsed} onClick={onToggleRail} />
        </div>
        {/* items-stretch + no left padding: the active tab's tint has to reach
            this cell's top, bottom and left edge to read as a block rather than
            a floating pill (see ColorHub's tabBar). The search re-centers
            itself with `self-center` since it shouldn't stretch. */}
        {/* Same edge rule as the strip row's gear below: pr-3 (12px)
            clearance, not flush. */}
        <div className="flex-1 min-w-0 flex items-stretch gap-3 pr-3">
          <div className="flex-1 min-w-0">{tabBar}</div>
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
              <button onClick={() => setQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick-edit strip — FULL WIDTH, matching the icon-toolbar row's
          width above it (not indented to just the table column). Promoted
          from Picker Color: names + edits whichever family is active in the
          nav, with a wand to re-harmonize Neutral + States off Accent and
          the scale-settings gear. Read-only for Accent-Alpha (see
          AlphaHexCell) — an alpha value is solved against its page, never
          independently set.
          The 198px/flex-1 split — and that `border-r` — is the SAME one
          the Groups row above and the nav column below use; lining all three
          up is what makes the left edge read as one continuous column
          instead of the accent field floating unaligned above it.
          `border-line/60` (the lighter weight, not the full-strength one this
          row used when it sat first) — it now sits between two header-ish
          rows (Groups above, the nav + table below), so a lighter divider
          here and a full-strength one just below it is what keeps the
          "chrome vs. content" boundary reading as the stronger line. ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        {/* Collapsed, this cell keeps ONLY the active family's swatch — still
            the picker trigger (`onSwatchClick` below does the same job), so
            the one action this cell owns survives the collapse. The label and
            the hex field are what go: at 56px neither fits, and both are
            recoverable in one click. */}
        <div
          className={`flex-shrink-0 border-r border-line flex flex-col justify-center transition-[width] duration-200 ${
            railCollapsed ? 'items-center px-0 py-5' : 'gap-1.5 px-4 py-5'
          }`}
          style={{ width: railCollapsed ? COLOR_RAIL_COLLAPSED_WIDTH : COLOR_RAIL_WIDTH }}
        >
          {railCollapsed ? (
            <div ref={stripEditRef} className="relative">
              <FamilySwatch
                family={family}
                dark={darkPreview}
                onClick={family.isAlpha ? undefined : () => setStripEditOpen((o) => !o)}
              />
              <AnimatePresence>
                {stripEditOpen && !family.isAlpha && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                    role="dialog"
                    aria-label={`Edit ${family.label} color`}
                    style={{ maxHeight: stripEditPlace.max }}
                    className={`absolute left-full ml-4 z-30 w-64 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden ${
                      stripEditPlace.up ? 'bottom-0' : 'top-0'
                    }`}
                  >
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                      <ColorPickerPanel
                        value={family.base}
                        onChange={(hex) => changeFamilyBase(family, hex)}
                        suggestions
                        palette={curatedPaletteFor(family.key)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
          <>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">{family.label} color</span>
          {family.isAlpha ? (
            <div className="w-full h-9 px-2.5 rounded-[13px] border border-line-strong bg-surface flex items-center">
              <AlphaHexCell
                value={(darkPreview ? family.dark[BASE_TONE] : family.light[BASE_TONE]) ?? '#000000'}
                solid={(darkPreview ? family.solidDark : family.solidLight)?.[BASE_TONE]}
                solidName={solidRowName(BASE_TONE)}
              />
            </div>
          ) : (
            <div ref={stripEditRef} className="relative w-full">
              <div className="h-9 pl-2.5 pr-1.5 rounded-[13px] border border-line-strong bg-surface flex items-center gap-1">
                {/* No separate chevron any more — the swatch itself opens this
                    same popover (onSwatchClick), so a second trigger doing the
                    identical thing was redundant. The hex text stays directly
                    editable either way. */}
                <div className="flex-1 min-w-0">
                  <HexCell
                    value={family.base}
                    onChange={(hex) => changeFamilyBase(family, hex)}
                    ariaLabel={`${family.label} base color`}
                    onSwatchClick={() => setStripEditOpen((o) => !o)}
                    swatchLabel={`Open color picker for ${family.label}`}
                  />
                </div>
                {/* Reset to the factory colour. Trailing edge of the pill —
                    the slot `pr-1.5`/`gap-1` already reserved, and the same
                    place the token tables put their per-row reset, so the
                    gesture is the one already learned there.
                    Routed through `changeFamilyBase`, NOT a direct setter: a
                    reset has to cascade exactly like a hand-edit (the neutral
                    and states links, the page derived from the base), or the
                    two would drift into different results for the same value.
                    Disabled at the default rather than hidden — a control that
                    vanishes once used reads as broken; disabled says "nothing
                    to undo". */}
                {(() => {
                  const def = defaultBaseFor(family)
                  if (!def) return null
                  const atDefault = family.base.toLowerCase() === def.toLowerCase()
                  return (
                    <button
                      type="button"
                      onClick={() => changeFamilyBase(family, def)}
                      disabled={atDefault}
                      aria-label={`Reset ${family.label} to the default color`}
                      title={atDefault ? `${family.label} is at its default (${def})` : `Reset to default (${def})`}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-fg-faint hover:text-fg hover:bg-elevated disabled:opacity-25 disabled:hover:text-fg-faint disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
                      </svg>
                    </button>
                  )
                })()}
              </div>
              <AnimatePresence>
                {stripEditOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                    role="dialog"
                    aria-label={`Edit ${family.label} color`}
                    style={{ maxHeight: stripEditPlace.max }}
                    // Docked to the RIGHT of the 198px column, not under the
                    // field. Opening downward put a ~540px panel straight over
                    // the family nav and the first rows of the token table —
                    // i.e. over the ramp this picker is editing, so you
                    // couldn't watch the thing you were changing. `left-full
                    // ml-4` lands its left edge on the column's own `border-r`
                    // (the field is inset by the row's `px-4`), so it opens
                    // into the canvas gutter and the table stays readable.
                    className={`absolute left-full ml-4 z-30 w-64 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden ${
                      stripEditPlace.up ? 'bottom-0' : 'top-0'
                    }`}
                  >
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                      <ColorPickerPanel
                        value={family.base}
                        onChange={(hex) => changeFamilyBase(family, hex)}
                        suggestions
                        palette={curatedPaletteFor(family.key)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          </>
          )}
        </div>

        {/* No states-link toggle here either, same reason as the wand it
            replaced: it only rendered while Accent was active, so the ramp
            beside it started 52px further right on that ONE family and every
            other family's ramp read as misaligned against it. The strip is the
            same shape for every family now — both links live in the gear's
            Harmony section instead (recommendStateColors / neutralFromBrand). */}
        {/* pr-3 (12px), not the old px-6/lg:px-8 (24-32px) and not flush
            either: the gear needs SOME clearance from the edge — sitting
            dead flush like the table's trailing icon column (which has a
            fixed-width cell to center within) reads as clipped for a
            free-floating button with no such cell. 12px is the minimum gap
            that still avoids that. */}
        <div className="flex-1 min-w-0 flex items-center gap-4 pl-6 lg:pl-8 pr-3 py-5 flex-wrap">
        <div className="flex-1 min-w-[10rem]">
          <ScaleRow
            scale={darkPreview ? family.dark : family.light}
            labels={namingLabels}
            ariaLabel={`${family.label} scale`}
            joined
            numbersInside
            checkerboard={family.isAlpha}
          />
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-label="Contrast — how far every ramp travels from the page"
            title="Contrast"
            className={`w-9 h-9 rounded-[13px] flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
              settingsOpen ? 'bg-elevated border-line-strong text-fg' : 'border-line-strong bg-surface text-fg-muted hover:text-fg hover:border-fg-faint'
            }`}
          >
            <SlidersIcon />
          </button>
          <ScaleSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
            <ColorControls
              contrastShift={contrastShift}
              onShift={setContrastShift}
              neutralTint={neutralTint}
              // Writing the level is only half of it: the page is DERIVED from
              // the Neutral, so the tint has to re-run the same applier a base
              // change does — one code path for "the base moved", whether the
              // hex changed or how much of it survives. It reads the level from
              // the store, hence the write first.
              //
              // `fromLink` is TRUE here even though the user clicked: this is a
              // recompute, not a hand-picked neutral, so it must not unlink.
              // And while linked the base itself moves — `brandSat` is a
              // per-tint value, so the derived neutral changes with the level.
              onTint={(t) => {
                setNeutralTint(t)
                applyGrayColor(linkNeutralToAccent ? neutralFromBrand(primaryColor, t) : grayBaseColor, previewTheme, true)
              }}
              tintPreview={(t) => backgroundFromBase(grayBaseColor, darkPreview ? 'dark' : 'light', t)}
              linkNeutral={linkNeutralToAccent}
              // Turning it ON derives immediately — a link that only takes
              // effect on the NEXT accent edit reads as broken.
              onLinkNeutral={(v) => {
                setLinkNeutralToAccent(v)
                if (v) applyGrayColor(neutralFromBrand(primaryColor, neutralTint), previewTheme, true)
              }}
              linkedNeutralPreview={neutralFromBrand(primaryColor, neutralTint)}
              linkStates={linkStatesToAccent}
              // Same immediate-derive contract as onLinkNeutral above, and the
              // same `fromLink: true` reasoning `useApplyGrayColor` already
              // documents: this is a recompute the link triggered, not a
              // hand-picked state, so it must not itself unlink.
              onLinkStates={(v) => {
                setLinkStatesToAccent(v)
                if (v) {
                  applyStateColor('error', stateRecommendation.error, true)
                  applyStateColor('warning', stateRecommendation.warning, true)
                  applyStateColor('success', stateRecommendation.success, true)
                  applyStateColor('info', stateRecommendation.info, true)
                }
              }}
              linkedStatesPreview={stateRecommendation}
            />
          </ScaleSettingsModal>
        </div>
        </div>
      </div>

      {/* ── nav + table, filling the remaining height ── */}
      <div className="flex-1 min-h-0 flex items-stretch">
      <nav
        ref={navRef}
        aria-label="Color families"
        className="flex-shrink-0 h-full overflow-y-auto border-r border-line py-1.5 px-2 flex flex-col bg-app transition-[width] duration-200"
        style={{ width: railCollapsed ? COLOR_RAIL_COLLAPSED_WIDTH : COLOR_RAIL_WIDTH }}
      >
        {/* Collapsed: swatches only, grouped by a hairline instead of a text
            header. The grouping is the one thing the folder labels carry that
            the chips can't, so it survives as a rule rather than being dropped
            outright. Each row is ONE button that selects the family (a 40×32
            target, where the bare 18px swatch would not be) — editing a colour
            stays behind the expanded state and the row-1 swatch, so a click
            here can't mean two things depending on where in the chip it lands. */}
        {railCollapsed ? (
          navFolders.flatMap((folder) => folder.groups).map((group, gi, all) => (
            <div key={`${group.label}-${gi}`} className="flex flex-col items-center gap-0.5">
              {gi > 0 && <span className="w-6 h-px bg-line my-1.5 flex-shrink-0" aria-hidden />}
              {group.items.map((f) => {
                const isActive = family.key === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => { setActiveFamily(f.key); setExpandedTone(null) }}
                    aria-current={isActive}
                    title={`${f.label}${f.isAlpha ? '' : ` — ${f.base}`}`}
                    aria-label={f.label}
                    className={`w-10 h-8 flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                      isActive ? 'bg-elevated shadow-sm' : 'hover:bg-elevated/50'
                    }`}
                  >
                    <FamilySwatch family={f} dark={darkPreview} />
                  </button>
                )
              })}
            </div>
          ))
        ) : (
        navFolders.map((folder) => {
          const folderCollapsed = collapsedGroups.has(folder.key)
          return (
          <div key={folder.key} className="flex flex-col">
            {/* Theme folder — the outer level. Its Accents/Neutrals/States sit
                inside it, so a second theme's families never mix with the
                base palette's. */}
            {/* A THEME folder (not Base, not Custom) can be deleted from here
                — see `themeToDelete`. The trash is hover-only so the rail stays
                quiet, but it's always reachable by keyboard.
                No `pr-*` on this wrapper: a reserved right gutter for the trash
                button used to sit here unconditionally, so on Theme 1/Custom
                (which never render it) the folder's own chevron landed ~7px
                left of its child groups' chevrons — the base folder and its
                Accents/Neutrals/States rows read as two different right edges
                in one tree. Both the folder button and the group button below
                already carry their own `px-2.5`, so with no extra wrapper
                padding their trailing chevrons share the exact same inset
                from the nav's edge. When the trash button DOES render, `gap-1`
                alone separates it from the label — same flush-right pattern
                every other trailing icon in this nav already uses. */}
            <div className="group/folder flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleGroup(folder.key)}
              aria-expanded={!folderCollapsed}
              className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-muted hover:text-fg transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
              </svg>
              <span className="flex-1 text-left truncate">{folder.label}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`flex-shrink-0 transition-transform ${folderCollapsed ? '-rotate-90' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {folder.key !== BASE_FOLDER && folder.key !== CUSTOM_FOLDER && themeOrder.length > 1 && (
              <button
                type="button"
                onClick={() => setThemeToDelete(folder.key)}
                aria-label={`Delete theme ${folder.label}`}
                title={`Delete the ${folder.label} theme — its color families stay, and move to Custom`}
                className="mt-1.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-fg-faint hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/folder:opacity-100 focus-visible:opacity-100 transition-all"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            )}
            </div>
            <AnimatePresence initial={false}>
              {!folderCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
        {folder.groups.map((group) => {
          const groupKey = `${folder.key}/${group.label}`
          const collapsed = collapsedGroups.has(groupKey)
          // The Custom folder's only group IS "Custom" — a second header
          // repeating the folder's own name adds a level without adding
          // information, so it renders its families directly.
          const hideHeader = folder.key === CUSTOM_FOLDER
          return (
            <div key={groupKey} className="flex flex-col gap-0.5 pl-2">
            {!hideHeader && (
            <button
              type="button"
              onClick={() => toggleGroup(groupKey)}
              aria-expanded={!collapsed}
              className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint hover:text-fg-muted transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
              </svg>
              <span className="flex-1 text-left">{group.label}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`flex-shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            )}
            <AnimatePresence initial={false}>
              {(!collapsed || hideHeader) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
            {group.items.map((f) => {
              const isActive = family.key === f.key
              return (
                <div key={f.key} className="relative group/fam" ref={editFamily === f.key ? editRef : undefined}>
                  {/* Was one `<button>` wrapping the swatch + label — the swatch
                      is now its own button (opens the picker directly, see
                      `FamilySwatch`), and a button can't nest another button.
                      Split into two siblings sharing the same row styling
                      instead: the swatch button, then the label as the
                      "select this family" trigger. */}
                  <div
                    aria-current={isActive}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${f.customKey ? 'pr-12' : 'pr-7'} ${
                      isActive ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                    }`}
                  >
                    <FamilySwatch
                      family={f}
                      dark={darkPreview}
                      onClick={() => { setActiveFamily(f.key); setEditFamily((k) => (k === f.key ? null : f.key)) }}
                    />
                    <button
                      type="button"
                      onClick={() => { setActiveFamily(f.key); setExpandedTone(null) }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <span className="block truncate text-[13px] font-medium">{f.label}</span>
                    </button>
                  </div>
                  {/* Edit — stays visible on the active row so the affordance is
                      findable without hunting for it on hover. Not offered for
                      Accent-Alpha: it's derived (see AlphaHexCell), nothing to
                      retint independently. */}
                  {!f.isAlpha && (
                    <button
                      onClick={() => { setActiveFamily(f.key); setEditFamily((k) => (k === f.key ? null : f.key)) }}
                      aria-haspopup="dialog"
                      aria-expanded={editFamily === f.key}
                      aria-label={`Edit ${f.label} color`}
                      title={`Edit ${f.label} — ${f.base}`}
                      className={`absolute ${f.customKey ? 'right-7' : 'right-1.5'} top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-elevated transition-all ${
                        isActive || editFamily === f.key ? 'opacity-100' : 'opacity-0 group-hover/fam:opacity-100 focus-visible:opacity-100'
                      }`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}
                  {f.customKey && (() => {
                    // A theme resolves THROUGH its families, so one in use can't
                    // be deleted — say so on the control instead of leaving a
                    // button that silently does nothing.
                    const usedBy = themesUsingFamily(f.customKey, themeSources)
                    return (
                      <button
                        onClick={() => {
                          if (usedBy.length) return
                          removeCustomColor(f.customKey!)
                          if (isActive) setActiveFamily('accent')
                        }}
                        disabled={usedBy.length > 0}
                        aria-label={usedBy.length ? `${f.label} is used by ${usedBy.join(', ')}` : `Remove ${f.label}`}
                        title={
                          usedBy.length
                            ? `In use by ${usedBy.length === 1 ? 'theme' : 'themes'} ${usedBy.join(', ')} — remove the ${usedBy.length === 1 ? 'theme' : 'themes'} first`
                            : `Remove ${f.label}`
                        }
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                          usedBy.length
                            ? 'text-fg-faint opacity-0 group-hover/fam:opacity-60 cursor-not-allowed'
                            : 'text-fg-faint hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/fam:opacity-100'
                        }`}
                      >
                        {usedBy.length ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                        ) : (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8" /></svg>
                        )}
                      </button>
                    )
                  })()}
                  <AnimatePresence>
                    {/* The picker itself is NOT rendered here — it's portaled
                        to <body> once, below. See `editPortal`. */}
                  </AnimatePresence>
                </div>
              )
            })}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          )
        })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )
        })
        )}
          </nav>

          <div ref={tableRef} className="flex-1 min-w-0 h-full overflow-auto">
            <div className="min-w-[24rem]">
              {/* Column header — light/dark eye toggles drive the preview theme.
                  Sticky so it survives scrolling the tone rows below: without
                  it, scrolling past row 1 hides the eye toggles, the per-column
                  export icon and the settings gear — the only way back to any
                  of them was scrolling back up. `z-10` keeps it above the row
                  content (band captions included); `bg-app` (already set) is
                  what keeps rows from showing through underneath it. */}
              <div className="sticky top-0 z-10 grid items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint" style={gridStyle}>
                <span className="pl-4 py-3 border-r border-line">Token name</span>
                {(['light', 'dark'] as const).map((col) => {
                  const isPreviewed = previewTheme === col
                  return (
                    <span key={col} className={`flex items-center px-1.5 py-2 border-r border-line min-w-0 ${isPreviewed ? 'bg-accent-ui/[0.06]' : ''}`}>
                      <button
                        onClick={() => onPreviewThemeChange?.(col)}
                        aria-pressed={isPreviewed}
                        title={isPreviewed ? `${col} — shown in preview` : `Show ${col} in the preview`}
                        className={`flex items-center gap-1.5 flex-1 min-w-0 px-1.5 py-1 rounded-md transition-colors ${
                          isPreviewed ? 'text-accent-ui' : 'text-fg-faint hover:text-fg-muted hover:bg-elevated/50'
                        }`}
                      >
                        <EyeIcon active={isPreviewed} />
                        <span className="truncate">{col}</span>
                      </button>
                      {/* Export lives per COLUMN, not per table: an icon here
                          can only mean "this family, this appearance", which
                          is exactly the scope a ramp is useful in. Offered on
                          alpha families too now — `ColumnExportMenu` routes
                          them through `buildAlphaFamilyExport` (reads
                          `colors.primitiveAlpha`) instead of the solid-primitive
                          pipeline, and narrows the format list to what that
                          builder can produce correctly (see
                          `ALPHA_EXPORT_FORMATS`). */}
                      <ColumnExportMenu
                        family={family.tokenPrefix}
                        label={family.label}
                        appearance={col}
                        isAlpha={family.isAlpha}
                        scale={col === 'light' ? family.light : family.dark}
                      />
                    </span>
                  )
                })}
                <span className="flex items-center justify-center py-3 text-fg-faint" aria-hidden>
                  <SlidersIcon />
                </span>
              </div>

              {visibleTones.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
              ) : (
                visibleTones.map((tone, i) => {
                  const name = rowName(tone)
                  const expanded = expandedTone === tone
                  const isEven = i % 2 === 1
                  // Radix role-ordering: a step means the same thing in both
                  // appearances (1–2 app background … 9 solid … 11–12 text), so
                  // the dark column reads the SAME step of the family's dark
                  // ramp. `accent-25` is the subtlest background either way —
                  // near-white in light, near-black in dark. No inversion: that
                  // was the workaround for colours not having a dark ramp.
                  const darkTone = tone
                  // A new role band starts here — caption it, so the 12 rows
                  // read as 5 grouped ranges (Radix's own breakdown) instead of
                  // an undifferentiated list. Keyed off the TONE, not the
                  // active naming scheme's label, so it holds regardless of
                  // whether the row name reads accent-9 or accent-700.
                  const band = toneBand(tone)
                  const newBand = i === 0 || band !== toneBand(visibleTones[i - 1])
                  return (
                    <div key={tone}>
                      {newBand && (
                        <div className="px-4 pt-3 pb-1 border-t border-line/40 bg-surface/60">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">{band}</span>
                        </div>
                      )}
                      <div
                        className={`grid items-stretch group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
                          newBand ? '' : 'border-t border-line/40'
                        } ${isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}`}
                        style={gridStyle}
                      >
                        <div className="flex items-center gap-2 py-2.5 pl-4 pr-3 min-w-0 border-r border-line text-fg-faint">
                          <PaletteIcon size={14} />
                          <code className="font-mono text-[12px] text-fg-muted truncate">{name}</code>
                          {tone === BASE_TONE && (
                            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-elevated text-fg-faint flex-shrink-0">anchor</span>
                          )}
                        </div>
                        <div className="flex items-center px-2.5 py-1.5 border-r border-line min-w-0">
                          {family.isAlpha ? (
                            <AlphaHexCell
                              value={family.light[tone] ?? '#00000000'}
                              solid={family.solidLight?.[tone]}
                              solidName={solidRowName(tone)}
                            />
                          ) : (
                            <HexCell
                              value={family.light[tone] ?? '#ffffff'}
                              onChange={(hex) => setTone(family.light, family.setLight, tone, hex)}
                              ariaLabel={`${name} light value`}
                            />
                          )}
                        </div>
                        <div className="flex items-center px-2.5 py-1.5 border-r border-line min-w-0">
                          {family.isAlpha ? (
                            <AlphaHexCell
                              value={family.dark[darkTone] ?? '#00000000'}
                              solid={family.solidDark?.[darkTone]}
                              solidName={solidRowName(darkTone)}
                            />
                          ) : (
                            <HexCell
                              value={family.dark[darkTone] ?? '#000000'}
                              onChange={(hex) => setTone(family.dark, family.setDark, darkTone, hex)}
                              ariaLabel={`${name} dark value`}
                            />
                          )}
                        </div>
                        {family.isAlpha ? (
                          // Derived, not editable — see AlphaHexCell.
                          <div aria-hidden className="flex items-center justify-center w-full h-full text-fg-faint/40">
                            <SlidersIcon />
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setDetailMode(darkPreview ? 'dark' : 'light')
                              setExpandedTone((cur) => (cur === tone ? null : tone))
                            }}
                            aria-haspopup="dialog"
                            aria-expanded={expanded}
                            aria-label={`Open token details for ${name}`}
                            title="Token details"
                            className={`flex items-center justify-center w-full h-full transition-colors ${
                              expanded ? 'text-accent-ui' : 'text-fg-faint hover:text-fg'
                            }`}
                          >
                            <SlidersIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      {/* Per-family colour picker — portaled out of the nav so the rail's
          scroll mask can't clip it (see `editRect`). Rendered once for
          whichever family is being edited, not per row. */}
      {editPortal}

      {/* Token Details — the SAME dialog Semantics' rows open (see
          colorControls' TokenDetailsModal), not an inline row expansion. */}
      <AnimatePresence>{detailsModal}</AnimatePresence>

      {/* Same confirmation Semantics' column header uses (shared from
          colorControls) — one destructive action, one warning. */}
      <AnimatePresence>
        {themeToDelete && (
          <DeleteThemeModal
            key="delete-theme"
            name={themeToDelete.charAt(0).toUpperCase() + themeToDelete.slice(1)}
            isPreviewed={previewTheme === themeToDelete}
            onCancel={() => setThemeToDelete(null)}
            onConfirm={() => {
              // Re-point the preview before the column disappears, exactly as
              // Semantics' deleteTheme does.
              if (previewTheme === themeToDelete) {
                const next = themeOrder.find((t) => t !== themeToDelete)
                if (next) onPreviewThemeChange?.(next)
              }
              removeTheme(themeToDelete)
              setThemeToDelete(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
