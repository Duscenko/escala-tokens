import { useEffect, useLayoutEffect, useCallback, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateColorScale, recommendStateColors, NAMING_SCHEMES, NEUTRAL_TINTS, DEFAULT_NEUTRAL_TINT, previewHarmony, type NeutralTint, type StateColors } from '../../lib/colorUtils'
import { useApplyAccentColor, useApplyGrayColor, useApplyPageBackground, useApplyDarkBackground } from '../../lib/colorActions'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand, STATE_PRESETS,
  BRAND_GROUPS, NEUTRAL_GROUPS, BACKGROUND_GROUPS, darkBackgroundGroups, type OptionGroup,
  usePopoverPlacement,
} from './colorControls'
import {
  INDUSTRY_GROUP_LABEL, INDUSTRY_GROUP_ORDER, hexEq, industryFromHex, packById, packsInGroup,
  sortAccentsByHue,
  type IndustryGroupId,
  type IndustryId,
} from '../../lib/industryPacks'
import { ColorAgentButton } from '../ui/shimmer-button'
import { SparkleCircleIcon } from '../ui/icons'
import { HarmonyFollows } from './HarmonyFollows'

// ── Scale settings — Contrast shift ─────────────────────────────────────────
// Drives how far every 1–12 ramp travels from the page; changing it regenerates
// all scales so the preview + export track live. Lives in a popover (gear entry
// point in the Primitives quick-edit strip).
//
// The Algorithm and Naming dropdowns that used to sit above this were REMOVED:
// the algorithm is pinned to Radix (`makeDesignDefaults`' own default, and the
// model the whole scale system is documented against), and naming is pinned to
// Radix numeric 1–12 — which store v42 already force-converts every system to,
// so the picker was offering a choice the migration immediately overrode. Both
// values still live in the store and still drive the export; they just aren't
// user-switchable while there's no infrastructure to support the alternatives.

export function ColorControls({
  contrastShift,
  onShift,
  neutralTint,
  onTint,
  tintPreview,
  linkNeutral,
  onLinkNeutral,
  linkedNeutralPreview,
  linkStates,
  onLinkStates,
  linkedStatesPreview,
  accentHex,
  onPickAccent,
  appearance = 'light',
}: {
  contrastShift: number
  onShift: (n: number) => void
  /** Omit both to hide the tint block (hosts that don't own the system Base). */
  neutralTint?: NeutralTint
  onTint?: (t: NeutralTint) => void
  /** Page hex each level would produce, for the swatch. Caller computes it so
   *  this stays presentational (no store reads), same as the rest of the file. */
  tintPreview?: (t: NeutralTint) => string
  /** Accent↔Neutral link. Omit both to hide the harmony block. */
  linkNeutral?: boolean
  onLinkNeutral?: (v: boolean) => void
  /** The hex the neutral becomes while linked — so the toggle can SHOW its
   *  consequence instead of describing it. */
  linkedNeutralPreview?: string
  /** Accent↔States link — the SAME contract as linkNeutral, for the four
   *  status primitives. Used to be a one-shot "match states" button instead of
   *  a toggle (a state colour read as a more deliberate brand decision than a
   *  grey); now mirrors the neutral link exactly, so both harmonize by default
   *  and both un-harmonize the same way — editing one by hand unlinks it. */
  linkStates?: boolean
  onLinkStates?: (v: boolean) => void
  /** The four hexes the states become while linked, keyed by role — so the
   *  toggle can SHOW its consequence instead of describing it. */
  linkedStatesPreview?: StateColors
  /** Current accent — drives industry detection. Omit with `onPickAccent` to
   *  hide the field guide (hosts that only expose contrast). */
  accentHex?: string
  onPickAccent?: (hex: string) => void
  /** Previewed appearance — rings the matching Neutral page in HarmonyFollows. */
  appearance?: 'light' | 'dark'
}) {
  const fill = ((contrastShift + 1) / 2) * 100 // −1…1 → 0…100%
  const derived = accentHex && neutralTint ? previewHarmony(accentHex, neutralTint) : null

  return (
    <div className="flex flex-col gap-5">
      {accentHex && onPickAccent && (
        <ScaleGuide
          accentHex={accentHex}
          onPickAccent={onPickAccent}
          linkNeutral={linkNeutral}
          onLinkNeutral={onLinkNeutral}
          linkStates={linkStates}
          onLinkStates={onLinkStates}
          tint={neutralTint}
          appearance={appearance}
        />
      )}

      {/* Harmony — the accent↔neutral and accent↔states links. Lives HERE, in
          the scale-settings popover, rather than inline in the quick-edit
          strip: a control that only renders while Accent is active shifts the
          ramp beside it 52px right on that one family, which is exactly why
          both were removed from the strip. The gear is always present, and
          this sits next to Neutral tint — the setting that decides how much
          accent hue a linked neutral even carries. */}
      {linkNeutral !== undefined && onLinkNeutral && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Harmony</span>
          <button
            type="button"
            onClick={() => onLinkNeutral(!linkNeutral)}
            aria-pressed={linkNeutral}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
              linkNeutral ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'
            }`}
          >
            <span aria-hidden className="flex items-center gap-px flex-shrink-0">
              <span
                className={`w-4 h-4 rounded-l ring-1 ring-black/10 ${appearance === 'light' ? 'ring-2 ring-fg z-[1]' : ''}`}
                style={{ background: derived?.pageLight ?? linkedNeutralPreview ?? 'transparent' }}
              />
              <span
                className={`w-4 h-4 rounded-r ring-1 ring-black/10 ${appearance === 'dark' ? 'ring-2 ring-fg z-[1]' : ''}`}
                style={{ background: derived?.pageDark ?? 'transparent' }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-fg">Neutral follows the accent</span>
              <span className="block text-[11px] text-fg-faint leading-snug">
                {linkNeutral
                  ? 'Light and dark pages re-derived on every accent change. Edit by hand to unlink.'
                  : 'The neutral is set by hand and keeps its own colour.'}
              </span>
            </span>
          </button>
          {onLinkStates && (
            <button
              type="button"
              onClick={() => onLinkStates(!linkStates)}
              aria-pressed={linkStates}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                linkStates ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'
              }`}
            >
              <span aria-hidden className="flex -space-x-1 flex-shrink-0">
                {(['error', 'warning', 'success', 'info'] as const).map((k) => (
                  <span
                    key={k}
                    className="w-4 h-4 rounded-full ring-1 ring-black/10"
                    style={{ background: derived?.states[k] ?? linkedStatesPreview?.[k] ?? 'transparent' }}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] text-fg">States follow the accent</span>
                <span className="block text-[11px] text-fg-faint leading-snug">
                  {linkStates
                    ? 'Error · Warning · Success · Info pick up the accent chroma. Hue stays put in light and dark.'
                    : 'Error · Warning · Success · Info are set by hand and keep their own colour.'}
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* Neutral tint — how much of the Neutral's colour reaches the page.
          Discrete levels, not a slider: this is Radix's "pick a gray family"
          decision (Gray · Mauve · Slate · Sage · Sand), and a free 0–1 value
          would let a system land on a tint nobody chose deliberately. It sits
          ABOVE contrast shift because it moves the page, which every other
          value in the modal is then computed against. */}
      {neutralTint && onTint && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Neutral tint</span>
          <div className="grid grid-cols-2 gap-1.5">
            {NEUTRAL_TINTS.map((t) => {
              const active = t.key === neutralTint
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onTint(t.key)}
                  title={t.hint}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg border text-left transition-colors ${
                    active ? 'border-accent-ui bg-accent-ui/[0.08] text-fg' : 'border-line text-fg-muted hover:border-line-strong'
                  }`}
                >
                  <span
                    aria-hidden
                    className="w-4 h-4 rounded flex-shrink-0 ring-1 ring-black/10"
                    style={{ background: tintPreview?.(t.key) ?? 'transparent' }}
                  />
                  <span className="min-w-0 truncate text-[11px]">{t.label}</span>
                </button>
              )
            })}
          </div>
          <span className="text-[10px] text-fg-faint leading-snug">
            How much of the Neutral's colour reaches the page. Every ramp grows out of it.
          </span>
        </div>
      )}

      {/* Contrast shift */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Contrast shift</span>
          <button
            type="button"
            onClick={() => onShift(0)}
            disabled={contrastShift === 0}
            className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-fg disabled:opacity-40 disabled:hover:text-fg-faint transition-colors"
          >
            Reset
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" /></svg>
          </button>
        </div>
        <span className="text-lg font-bold text-fg tabular-nums leading-none">{contrastShift.toFixed(2)}</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={contrastShift}
          onChange={(e) => onShift(Number(e.target.value))}
          aria-label="Contrast shift"
          className="sd-slider mt-1"
          style={{ ['--sd-fill' as string]: `${fill}%` }}
        />
      </div>
    </div>
  )
}

// Field + four accents. Not a chatbot — a terse recommendation sitting above
// the Harmony toggles. Groups collapse so Market / Work / Life scan fast.
function ScaleGuide({
  accentHex,
  onPickAccent,
  linkNeutral,
  onLinkNeutral,
  linkStates,
  onLinkStates,
  tint,
  appearance = 'light',
}: {
  accentHex: string
  onPickAccent: (hex: string) => void
  linkNeutral?: boolean
  onLinkNeutral?: (v: boolean) => void
  linkStates?: boolean
  onLinkStates?: (v: boolean) => void
  tint?: NeutralTint
  appearance?: 'light' | 'dark'
}) {
  const detected = industryFromHex(accentHex)
  const [browse, setBrowse] = useState<IndustryId | null>(null)
  const [hoverHex, setHoverHex] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<IndustryGroupId>>(
    () => new Set([packById(detected).group]),
  )
  const prevHex = useRef(accentHex)
  useEffect(() => {
    if (hexEq(prevHex.current, accentHex)) return
    prevHex.current = accentHex
    setBrowse((b) => {
      if (b && packById(b).accents.some((a) => hexEq(a.hex, accentHex))) return b
      return null
    })
    setOpenGroups(new Set([packById(industryFromHex(accentHex)).group]))
  }, [accentHex])
  const field = browse ?? detected
  const pack = packById(field)
  const canLink = Boolean(onLinkNeutral && onLinkStates)
  const bothLinked = Boolean(linkNeutral && linkStates)

  useEffect(() => {
    const g = pack.group
    setOpenGroups((prev) => (prev.has(g) ? prev : new Set(prev).add(g)))
  }, [pack.group])

  function toggleGroup(group: IndustryGroupId) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Industry</span>
        {canLink && !bothLinked && (
          <button
            type="button"
            onClick={() => {
              if (!linkNeutral) onLinkNeutral?.(true)
              if (!linkStates) onLinkStates?.(true)
            }}
            className="text-[11px] text-accent-ui hover:text-fg underline underline-offset-2 transition-colors"
          >
            Link Neutral & States
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Industry" className="flex flex-col gap-1.5">
        {INDUSTRY_GROUP_ORDER.map((group) => {
          const open = openGroups.has(group)
          const rows = packsInGroup(group)
          const activeInGroup = rows.some((p) => p.id === field)
          return (
            <div
              key={group}
              className={`rounded-lg border transition-colors ${
                open ? 'border-line/80 bg-surface/40' : 'border-line/50'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-elevated/40 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-inset"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`flex-shrink-0 text-fg-faint transition-transform duration-200 ease-out ${
                    open ? 'rotate-90' : ''
                  }`}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                <span className="flex-1 min-w-0 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
                  {INDUSTRY_GROUP_LABEL[group]}
                </span>
                {!open && activeInGroup && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" aria-hidden />
                )}
                <span className="text-[10px] tabular-nums text-fg-faint">{rows.length}</span>
              </button>
              {open && (
                <div className="flex flex-col gap-0.5 px-1 pb-1.5">
                  {rows.map((p) => {
                    const active = p.id === field
                    const accents = sortAccentsByHue(p.accents)
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 pl-2 pr-1.5 h-8 rounded-lg border transition-colors ${
                          active ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-transparent hover:border-line'
                        }`}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setBrowse(p.id)}
                          className={`flex-1 min-w-0 text-left text-[12px] truncate ${
                            active ? 'text-fg' : 'text-fg-muted'
                          }`}
                        >
                          {p.label}
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {accents.map((a) => {
                            const swatchOn = hexEq(a.hex, accentHex)
                            return (
                              <button
                                key={a.hex + a.label}
                                type="button"
                                title={a.label}
                                aria-label={`${p.label} — ${a.label}`}
                                aria-pressed={swatchOn}
                                onClick={() => {
                                  setBrowse(p.id)
                                  onPickAccent(a.hex)
                                }}
                                onMouseEnter={() => setHoverHex(a.hex)}
                                onMouseLeave={() => setHoverHex(null)}
                                onFocus={() => setHoverHex(a.hex)}
                                onBlur={() => setHoverHex(null)}
                                className={`w-4 h-4 rounded-full transition-transform ${
                                  swatchOn ? 'ring-2 ring-fg scale-110' : 'ring-1 ring-black/15 hover:scale-110'
                                }`}
                                style={{ background: a.hex }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-1.5 px-0.5">
        <HarmonyFollows
          accentHex={hoverHex ?? accentHex}
          tint={tint ?? DEFAULT_NEUTRAL_TINT}
          appearance={appearance}
        />
        <p className="text-[11px] text-fg-faint leading-snug">{pack.theory}</p>
      </div>
    </div>
  )
}

const SCALE_SETTINGS_W = 360

// Anchored popover for the scale settings — no backdrop; Esc/click-outside to
// dismiss. Portaled to `document.body` and `position: fixed` off the gear's
// measured rect: the Color hub (and Picker Color) wrap this trigger in
// `overflow-hidden` ancestors, so `absolute top-full` was clipping the panel
// with no way to scroll the rest. Same fix as the family export menu.
export function ScaleSettingsModal({
  open,
  onClose,
  children,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  anchorRef: RefObject<HTMLElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const place = usePopoverPlacement(anchorRef, open, { prefer: 480, max: 640 })
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const r = anchorRef.current?.getBoundingClientRect()
      if (r) setRect(r)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (typeof document === 'undefined') return null

  const panel = open && rect
    ? (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          role="dialog"
          aria-label="Color Agent"
          style={{
            position: 'fixed',
            left: Math.min(Math.max(8, rect.right - SCALE_SETTINGS_W), window.innerWidth - SCALE_SETTINGS_W - 8),
            ...(place.up ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
            maxHeight: place.max,
            width: SCALE_SETTINGS_W,
          }}
          className="z-50 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 flex-shrink-0 border-b border-line/60">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-fg">Color Agent</h3>
              <p className="text-[11px] text-fg-faint mt-0.5 truncate">Industry packs, harmony, tint</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin px-5 pb-5 flex flex-col gap-6">
            {children}
          </div>
        </motion.div>
      )
    : null

  return createPortal(
    <AnimatePresence>{panel}</AnimatePresence>,
    document.body,
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step2_ColorPalette({ previewTheme = 'light' }: { previewTheme?: string }) {
  const {
    primaryColor, primaryScale,
    errorColor,   errorScale,   setErrorColor,   setErrorScale,
    warningColor, warningScale, setWarningColor, setWarningScale,
    successColor, successScale, setSuccessColor, setSuccessScale,
    infoColor,    infoScale,    setInfoColor,    setInfoScale,
    grayBaseColor, grayLightScale, grayDarkScale,
    customColors, updateCustomColor, removeCustomColor,
    colorAlgorithm, contrastShift, colorNaming, setContrastShift, neutralTint,
    pageBackground, darkBackground, themeKinds,
  } = useDesignStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsAnchorRef = useRef<HTMLDivElement>(null)
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  const applyPageBackground = useApplyPageBackground()
  const applyDarkBackground = useApplyDarkBackground()

  // Mirrors Home: previewing a dark theme means you're editing the DARK page
  // background (accent-derived presets) and looking at the dark neutral ramp.
  const darkPreview = (themeKinds[previewTheme] ?? 'light') === 'dark'

  // Saved customs surface in both dropdowns ahead of the Tested presets.
  const savedGroup: OptionGroup | null = customColors.length
    ? {
        label: 'Saved',
        options: customColors.map((c) => ({ label: c.label, hex: c.base })),
        onRemove: (hex) => {
          const match = customColors.find((c) => c.base.toLowerCase() === hex.toLowerCase())
          if (match) removeCustomColor(match.key)
        },
      }
    : null
  const brandGroups = savedGroup ? [savedGroup, ...BRAND_GROUPS] : BRAND_GROUPS
  const neutralGroups = savedGroup ? [savedGroup, ...NEUTRAL_GROUPS] : NEUTRAL_GROUPS

  // When ON, the neutral scale auto-derives from the brand color. Default ON.
  const [linked, setLinked] = useState(true)
  // When ON, the state colors are recommended from (harmonized with) the brand.
  const [statesLinked, setStatesLinked] = useState(true)

  // Tone labels shown above the brand scale, per the active naming scheme.
  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  const regenerate = useCallback((hex: string) => {
    applyAccentColor(hex, linked)
  }, [applyAccentColor, linked])

  const regenerateError = useCallback((hex: string) => {
    try { setErrorColor(hex); setErrorScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setErrorColor, setErrorScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateWarning = useCallback((hex: string) => {
    try { setWarningColor(hex); setWarningScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setWarningColor, setWarningScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateSuccess = useCallback((hex: string) => {
    try { setSuccessColor(hex); setSuccessScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setSuccessColor, setSuccessScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateInfo = useCallback((hex: string) => {
    try { setInfoColor(hex); setInfoScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setInfoColor, setInfoScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateGray = applyGrayColor

  function toggleLink() {
    const next = !linked
    setLinked(next)
    if (next) regenerateGray(neutralFromBrand(primaryColor, neutralTint))
  }

  // Recommend harmonized state colors from a brand hex, then regenerate scales.
  function applyStateRecommendations(brandHex: string) {
    const rec = recommendStateColors(brandHex)
    regenerateError(rec.error)
    regenerateWarning(rec.warning)
    regenerateSuccess(rec.success)
    regenerateInfo(rec.info)
  }

  // Brand change → regenerate the brand (+ linked neutral) and, when state
  // colors are linked, re-recommend them so they harmonize with the new brand.
  function changeBrand(hex: string) {
    regenerate(hex)
    if (statesLinked) applyStateRecommendations(hex)
  }

  function toggleStatesLink() {
    const next = !statesLinked
    setStatesLinked(next)
    if (next) applyStateRecommendations(primaryColor)
  }

  useEffect(() => {
    if (Object.keys(primaryScale).length    === 0) regenerate(primaryColor)
    if (Object.keys(errorScale).length       === 0) regenerateError(errorColor)
    if (Object.keys(warningScale).length     === 0) regenerateWarning(warningColor)
    if (Object.keys(successScale).length     === 0) regenerateSuccess(successColor)
    if (Object.keys(infoScale).length        === 0) regenerateInfo(infoColor)
    if (Object.keys(grayLightScale).length   === 0) regenerateGray(grayBaseColor)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Algorithm / contrast-shift change → rebuild every ramp from its base color
  // (brand · neutral · state · custom families). Skips the initial mount so it
  // doesn't clobber freshly-seeded scales. Background changes regenerate via
  // useApplyPageBackground (shared with Home's picker) — not this effect, so
  // the pipeline runs even when this section isn't mounted.
  const algoMounted = useRef(false)
  useEffect(() => {
    if (!algoMounted.current) { algoMounted.current = true; return }
    regenerate(primaryColor)
    if (!linked) regenerateGray(grayBaseColor)
    if (statesLinked) {
      regenerateError(errorColor)
      regenerateWarning(warningColor)
      regenerateSuccess(successColor)
      regenerateInfo(infoColor)
    }
    customColors.forEach((c) =>
      updateCustomColor(c.key, { scale: generateColorScale(c.base, colorAlgorithm, contrastShift, pageBackground) }),
    )
  }, [colorAlgorithm, contrastShift]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      <section className="-mx-8 -mt-8 px-8 pt-8 pb-8 flex flex-col gap-5 border-b border-line">
        {/* Primitives header — the scale-settings entry point */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg">Primitives</h3>
          <div className="flex items-center gap-2">
            <div ref={settingsAnchorRef} className="relative">
              <ColorAgentButton
                active={settingsOpen}
                onClick={() => setSettingsOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                aria-label="Color Agent"
                title="Color Agent"
              >
                <SparkleCircleIcon />
              </ColorAgentButton>
              <ScaleSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} anchorRef={settingsAnchorRef}>
                <ColorControls contrastShift={contrastShift} onShift={setContrastShift} />
              </ScaleSettingsModal>
            </div>
          </div>
        </div>

        {/* Accent · link/info · Neutral · Background */}
        <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-3 items-end">
          <ColorSelect label="Accent Color" value={primaryColor} groups={brandGroups} onChange={changeBrand} allowCustom />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your accent color." />
            <LinkToggle active={linked} onClick={toggleLink} />
          </div>
          <ColorSelect label="Neutral" value={grayBaseColor} groups={neutralGroups} onChange={regenerateGray} allowCustom />
          <ColorSelect
            label={darkPreview ? 'Background (dark)' : 'Background'}
            value={darkPreview ? darkBackground : pageBackground}
            groups={darkPreview ? darkBackgroundGroups(primaryColor) : BACKGROUND_GROUPS}
            onChange={darkPreview ? applyDarkBackground : applyPageBackground}
            allowCustom
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <ScaleRow scale={primaryScale} labels={namingLabels} />
          <ScaleRow scale={darkPreview ? grayDarkScale : grayLightScale} showNumbers={false} />
        </div>
      </section>

      {/* ── State colors — compact pills (Error · Success · Warning · info) ── */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-fg">State colors</h3>
        <div className="flex items-center gap-3">
          <LinkToggle active={statesLinked} onClick={toggleStatesLink} accentColor={primaryScale[7] ?? primaryColor} />
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            <ColorSelect variant="pill" label="Error" value={errorColor} onChange={regenerateError} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.error }]} />
            <ColorSelect variant="pill" label="Success" value={successColor} onChange={regenerateSuccess} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.success }]} />
            <ColorSelect variant="pill" label="Warning" value={warningColor} onChange={regenerateWarning} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.warning }]} />
            <ColorSelect variant="pill" label="Info" value={infoColor} onChange={regenerateInfo} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.info }]} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
