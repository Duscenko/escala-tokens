// Guided token creation — replaces "New" landing straight on a long table with
// a focused 2–4 step flow per category: name/target → value/scale → confirm
// (→ role, Color only). The category itself is picked from the SAME list as
// the Variables rail (New Token Menu below), so the two never drift. Every
// category writes through the exact store actions the Foundations editors
// use — no parallel data model.

import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore, type ThemeSources } from '../../store/useDesignStore'
import { usePreviewTokens } from '../../lib/previewTokens'
import { SPECIMENS } from './docs/specimens'
import { ColorPickerPanel } from '../ui/ColorField'
import { useApplyAccentColor } from '../../lib/colorActions'
import { detectSeedKind, solidFromSeed, generateColorScale, generateFamilyDarkScale, type SeedKind } from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { RESERVED_COLOR_KEYS, SIZES_DEFAULT, DEFAULT_THEME_SOURCES } from '../../store/useDesignStore'
import { COLOR_FAMILY_PRESETS } from './QuickFoundationsPanel'
import { RADIUS_PRESETS } from './StepRadius'
import { BASE_PRESETS, SPACING_STEPS, buildSpacingFromBase } from './Step5_Spacing'
import { FONT_PRESETS, fontStack, loadGoogleFont } from '../../lib/fonts'

export type TokenCategory = 'color' | 'typography' | 'radius' | 'spacing' | 'sizes'
type ColorRole = 'replace' | 'secondary' | 'standalone'
type Step = 1 | 2 | 3 | 4

const ButtonSpec = SPECIMENS.Button
const CardSpec = SPECIMENS.Card

const STEP_LABELS: Record<TokenCategory, string[]> = {
  color: ['Name', 'Value', 'Confirm', 'Role'],
  typography: ['Target', 'Family', 'Confirm'],
  radius: ['Style', 'Scale', 'Confirm'],
  spacing: ['Base', 'Scale', 'Confirm'],
  sizes: ['Token', 'Value', 'Confirm'],
}
const TOTAL_STEPS: Record<TokenCategory, Step> = {
  color: 4, typography: 3, radius: 3, spacing: 3, sizes: 3,
}

const WIZARD_TITLE: Record<TokenCategory, string> = {
  color: 'New color family',
  typography: 'New font family',
  radius: 'New radius scale',
  spacing: 'New spacing scale',
  sizes: 'New size token',
}

const CONFIRM_LABEL: Record<TokenCategory, string> = {
  color: 'Create family',
  typography: 'Apply font',
  radius: 'Apply radius',
  spacing: 'Apply spacing',
  sizes: 'Set size',
}

// Role assignment — Radix's "generate scale" vs "alias a role" split: the
// scale (Confirm, step 3) always gets created; THIS decides whether it also
// becomes the system's brand color, one more theme's brand, or nothing yet.
const ROLE_OPTIONS: { key: ColorRole; title: string; subtitle: string }[] = [
  { key: 'replace', title: 'Replace the active Accent', subtitle: 'Every semantic token and component using Accent updates immediately.' },
  { key: 'secondary', title: 'Add as a secondary accent', subtitle: 'Mints a new theme with this as its brand — for multi-brand or multi-tenant systems.' },
  { key: 'standalone', title: 'Save as a standalone palette', subtitle: "Just the scale, no role — assign one later from the family's row." },
]
const ROLE_CONFIRM_LABEL: Record<ColorRole, string> = {
  replace: 'Replace Accent',
  secondary: 'Create theme',
  standalone: 'Create family',
}

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 7.5l3 3 6-7" />
    </svg>
  )
}

// A selectable card — the shared "pick one" control for presets/targets/tokens.
function OptionCard({ selected, onClick, title, subtitle, icon }: {
  selected: boolean
  onClick: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${
        selected ? 'border-accent-ui bg-accent-ui/[0.06]' : 'border-line hover:border-line-strong hover:bg-elevated/40'
      }`}
    >
      {icon && <span className={`flex-shrink-0 ${selected ? 'text-accent-ui' : 'text-fg-muted'}`}>{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-medium ${selected ? 'text-fg' : 'text-fg-muted'}`}>{title}</span>
        {subtitle && <span className="block text-[11px] text-fg-faint mt-0.5 truncate">{subtitle}</span>}
      </span>
      <span className={`w-[17px] h-[17px] rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-accent-ui' : 'border-line-strong'}`}>
        {selected && <span className="w-[7px] h-[7px] rounded-full bg-accent-ui" />}
      </span>
    </button>
  )
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <p className="text-[12.5px] text-fg-muted mt-0.5">{subtitle}</p>
    </div>
  )
}

export default function NewTokenWizard({
  category, Icon, onClose, onDone,
}: {
  category: TokenCategory
  Icon: ComponentType
  onClose: () => void
  /** Called after the write succeeds — the shell closes the wizard and lands
   *  on that foundation's table. Color passes back the family key to focus
   *  there (`accent` if it replaced the active brand, `custom-<slug>`
   *  otherwise) so the table shows what was just created, not whatever was
   *  active before. */
  onDone: (focusFamilyKey?: string) => void
}) {
  const store = useDesignStore()
  const {
    customColors, addCustomColor, themes, addTheme, colorAlgorithm, contrastShift, pageBackground, darkBackground,
    typography, setTypography, radius, setRadius, spacing: _spacing, setSpacing,
    sizes, setSizes, primaryScale, primaryColor,
  } = store
  const applyAccentColor = useApplyAccentColor()
  const tokens = usePreviewTokens('light')
  const accentColor = primaryScale[9] ?? primaryColor

  const [step, setStep] = useState<Step>(1)
  const totalSteps = TOTAL_STEPS[category]

  // ── Color ──
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState(COLOR_FAMILY_PRESETS[0].hex)
  const [seedKind, setSeedKind] = useState<SeedKind | null>(null)
  const [colorRole, setColorRole] = useState<ColorRole>('standalone')
  const colorSlug = slugify(colorName)
  const colorTaken = RESERVED_COLOR_KEYS.includes(colorSlug) || customColors.some((c) => c.key === colorSlug)
  const detectedKind = detectSeedKind(colorHex, pageBackground, darkBackground)
  const activeSeedKind: SeedKind = seedKind ?? detectedKind
  // Built once per value change and reused by both the Confirm preview and the
  // actual write, so what you see IS what gets created — and a color that
  // can't be turned into a scale (rare, but generateColorScale can throw)
  // disables Confirm instead of silently doing nothing.
  const colorScalePreview = useMemo(() => {
    try {
      const solid = solidFromSeed(colorHex, activeSeedKind, pageBackground, darkBackground)
      const scale = generateColorScale(solid, colorAlgorithm, contrastShift, pageBackground)
      const darkScale = generateFamilyDarkScale(solid, colorAlgorithm, contrastShift, darkBackground)
      return { solid, scale, darkScale }
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorHex, activeSeedKind, colorAlgorithm, contrastShift, pageBackground, darkBackground])

  // ── Typography ──
  const [fontTarget, setFontTarget] = useState<'heading' | 'body'>('body')
  const [fontFamily, setFontFamily] = useState(typography.fontFamily)

  // ── Radius ──
  const [radiusPreset, setRadiusPreset] = useState(RADIUS_PRESETS[1].label)
  const [radiusLg, setRadiusLg] = useState(pxToNum(RADIUS_PRESETS[1].values.lg))
  const radiusPreview = {
    ...tokens,
    radius: { none: '0px', sm: `${Math.round(radiusLg / 3)}px`, md: `${Math.round((radiusLg * 2) / 3)}px`, lg: `${radiusLg}px`, full: '9999px' },
  }

  // ── Spacing ──
  const [spacingBase, setSpacingBase] = useState(BASE_PRESETS[0].value)

  // ── Sizes ──
  const [sizeKey, setSizeKey] = useState<keyof typeof SIZES_DEFAULT>('md')
  const [sizeValue, setSizeValue] = useState(pxToNum(sizes.md ?? SIZES_DEFAULT.md))

  const canNext =
    category === 'color' && step === 1 ? colorName.trim().length > 0 && !colorTaken
    : category === 'color' && step === 3 ? !!colorScalePreview
    : category === 'typography' && step === 2 ? fontFamily.trim().length > 0
    : true
  const canConfirm = category === 'color' ? !!colorScalePreview : true

  function commit() {
    if (category === 'color') {
      if (!colorScalePreview) return
      if (colorRole === 'replace') {
        // No separate family — the color BECOMES the system's Accent, so
        // there's nothing else left over to also show up under Custom.
        applyAccentColor(colorScalePreview.solid, true, 'light')
        onDone('accent')
        return
      }
      addCustomColor({ key: colorSlug, label: colorName.trim(), base: colorScalePreview.solid, scale: colorScalePreview.scale, darkScale: colorScalePreview.darkScale })
      if (colorRole === 'secondary') {
        // A family only reads as "Accents" once some theme aliases its brand
        // slot to it (see familySlotFor) — so "secondary accent" mints a
        // theme for it, identical to the defaults except for that one slot.
        let themeKey = colorSlug
        let n = 2
        while (themes[themeKey]) themeKey = `${colorSlug}-${n++}`
        const sources: ThemeSources = { ...DEFAULT_THEME_SOURCES, brand: colorSlug }
        addTheme(themeKey, 'light', sources)
      }
      onDone(`custom-${colorSlug}`)
      return
    }
    if (category === 'typography') {
      loadGoogleFont(fontFamily)
      setTypography(
        fontTarget === 'heading'
          ? { ...typography, headingFontFamily: fontFamily }
          : { ...typography, fontFamily },
      )
    } else if (category === 'radius') {
      setRadius({ ...radius, ...radiusPreview.radius })
    } else if (category === 'spacing') {
      setSpacing(buildSpacingFromBase(spacingBase))
    } else if (category === 'sizes') {
      setSizes({ ...sizes, [sizeKey]: `${sizeValue}px` })
    }
    onDone()
  }

  const labels = STEP_LABELS[category]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={WIZARD_TITLE[category]}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-app border border-line shadow-2xl overflow-hidden"
      >
        {/* Stepper */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-line flex-shrink-0">
          <span className="text-fg-muted flex-shrink-0"><Icon /></span>
          <span className="text-[13px] font-semibold text-fg flex-shrink-0 truncate max-w-[7rem]">{WIZARD_TITLE[category]}</span>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {labels.map((label, i) => {
              const n = (i + 1) as Step
              const active = step === n
              const complete = step > n
              return (
                <div key={label} className="flex items-center gap-2 flex-1 last:flex-initial min-w-0">
                  <button
                    onClick={() => complete && setStep(n)}
                    disabled={!complete}
                    className={`flex items-center gap-1.5 min-w-0 ${complete ? 'cursor-pointer' : 'cursor-default'}`}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 transition-colors ${
                        complete || active ? 'bg-accent-ui text-white' : 'bg-elevated text-fg-faint'
                      }`}
                    >
                      {complete ? <CheckIcon /> : n}
                    </span>
                    <span className={`text-[11.5px] truncate hidden sm:inline ${active || complete ? 'font-medium text-fg' : 'text-fg-faint'}`}>
                      {label}
                    </span>
                  </button>
                  {i < labels.length - 1 && <span className={`h-px flex-1 min-w-2 ${complete ? 'bg-accent-ui' : 'bg-line'}`} aria-hidden />}
                </div>
              )
            })}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          {category === 'color' && step === 1 && (
            <>
              <StepHeading title="Name your color family" subtitle="This names the token rows — e.g. accent-1…12." />
              <input
                autoFocus
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canNext) setStep(2) }}
                placeholder="e.g. Teal"
                aria-label="Family name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-base font-semibold text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
              />
              {colorTaken && <p className="text-[11px] text-red-500 mt-1.5">That name is already in use.</p>}
            </>
          )}

          {category === 'color' && step === 2 && (
            <>
              <StepHeading title="Pick its value" subtitle="What you paste decides how the 1–12 scale is built." />
              <div className="flex flex-col gap-1.5 mb-3">
                <span className="text-[11px] text-fg-muted">This color is my…</span>
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated/60 border border-line">
                  {(['light', 'dark', 'alpha'] as SeedKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSeedKind(k)}
                      aria-pressed={activeSeedKind === k}
                      className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                        activeSeedKind === k ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <ColorPickerPanel value={colorHex} onChange={setColorHex} />
            </>
          )}

          {category === 'color' && step === 3 && (
            <>
              <StepHeading title="Confirm" subtitle={`"${colorName.trim()}" — ${colorSlug}-1…12`} />
              {colorScalePreview ? (
                <div className="flex rounded-xl overflow-hidden border border-line">
                  {Object.entries(colorScalePreview.scale)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([tone, hex]) => <span key={tone} className="flex-1 h-10" style={{ backgroundColor: hex }} />)}
                </div>
              ) : (
                <p className="text-[12px] text-red-500">
                  That value couldn't be turned into a scale — go back and try a different color.
                </p>
              )}
            </>
          )}

          {category === 'color' && step === 4 && (
            <>
              <StepHeading title="Assign a role" subtitle="What does this color do in your system? You can always change this later." />
              <div className="flex flex-col gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <OptionCard
                    key={r.key}
                    selected={colorRole === r.key}
                    onClick={() => setColorRole(r.key)}
                    title={r.title}
                    subtitle={r.subtitle}
                  />
                ))}
              </div>
            </>
          )}

          {category === 'typography' && step === 1 && (
            <>
              <StepHeading title="What are you setting?" subtitle="Pick which typography slot this family applies to." />
              <div className="flex flex-col gap-2">
                {(['body', 'heading'] as const).map((t) => (
                  <OptionCard
                    key={t}
                    selected={fontTarget === t}
                    onClick={() => { setFontTarget(t); setFontFamily(t === 'heading' ? (typography.headingFontFamily ?? typography.fontFamily) : typography.fontFamily) }}
                    title={t === 'heading' ? 'Heading font' : 'Body font'}
                    subtitle={t === 'heading' ? (typography.headingFontFamily ?? typography.fontFamily) : typography.fontFamily}
                  />
                ))}
              </div>
            </>
          )}

          {category === 'typography' && step === 2 && (
            <>
              <StepHeading title="Pick a family" subtitle={`Applies to the ${fontTarget} token.`} />
              <div className="rounded-xl border border-line bg-app p-4 mb-3">
                <span className="block text-[10px] uppercase tracking-widest text-fg-faint mb-1">Preview</span>
                <span className="block text-xl truncate" style={{ fontFamily: fontStack(fontFamily) }}>Ag — Sphinx of black quartz</span>
              </div>
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                {FONT_PRESETS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setFontFamily(f.value); loadGoogleFont(f.value) }}
                    aria-pressed={fontFamily === f.value}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      fontFamily === f.value ? 'bg-accent-ui/[0.08] text-fg' : 'hover:bg-elevated/50 text-fg-muted'
                    }`}
                  >
                    <span style={{ fontFamily: fontStack(f.value) }} className="text-[14.5px]">{f.label}</span>
                    <span className="text-[10px] uppercase tracking-widest text-fg-faint flex-shrink-0">{f.category}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {category === 'typography' && step === 3 && (
            <>
              <StepHeading title="Confirm" subtitle={`${fontTarget === 'heading' ? 'Heading' : 'Body'} font → ${fontFamily}`} />
              <div className="rounded-xl border border-line bg-app p-5">
                <span className="block text-2xl" style={{ fontFamily: fontStack(fontFamily) }}>Ag — Sphinx of black quartz</span>
              </div>
            </>
          )}

          {category === 'radius' && step === 1 && (
            <>
              <StepHeading title="Choose a radius style" subtitle="Every step in the ramp scales from this personality." />
              <div className="flex flex-col gap-2">
                {RADIUS_PRESETS.map((p) => (
                  <OptionCard
                    key={p.label}
                    selected={radiusPreset === p.label}
                    onClick={() => { setRadiusPreset(p.label); setRadiusLg(pxToNum(p.values.lg)) }}
                    title={p.label}
                    subtitle={p.description}
                    icon={<span className="w-4 h-4 flex-shrink-0 border-t-[1.5px] border-l-[1.5px] border-current" style={{ borderTopLeftRadius: p.values.md }} />}
                  />
                ))}
              </div>
            </>
          )}

          {category === 'radius' && step === 2 && (
            <>
              <StepHeading title="Fine-tune the scale" subtitle="Drag to grade every step from this one handle." />
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-fg-muted">Corner radius (lg)</span>
                <span className="text-[11px] font-mono text-fg">{radiusLg}px</span>
              </div>
              <input
                type="range" min={0} max={40} value={radiusLg}
                onChange={(e) => setRadiusLg(Number(e.target.value))}
                aria-label="Corner radius"
                className="w-full accent-fg cursor-pointer mb-4"
              />
              <div className="flex items-center justify-center gap-4 p-6 rounded-xl border border-line bg-app">
                <ButtonSpec t={radiusPreview} v={{ Style: 'Solid' }} />
                <div className="w-24"><CardSpec t={radiusPreview} v={{}} /></div>
              </div>
            </>
          )}

          {category === 'radius' && step === 3 && (
            <>
              <StepHeading title="Confirm" subtitle={`${radiusPreset} · lg ${radiusLg}px`} />
              <div className="flex items-center justify-center gap-4 p-6 rounded-xl border border-line bg-app">
                <ButtonSpec t={radiusPreview} v={{ Style: 'Solid' }} />
                <div className="w-24"><CardSpec t={radiusPreview} v={{}} /></div>
              </div>
            </>
          )}

          {category === 'spacing' && step === 1 && (
            <>
              <StepHeading title="Choose a base unit" subtitle="Every spacing step is a multiple of this value." />
              <div className="flex flex-col gap-2 mb-3">
                {BASE_PRESETS.map((p) => (
                  <OptionCard key={p.value} selected={spacingBase === p.value} onClick={() => setSpacingBase(p.value)} title={p.label} />
                ))}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] text-fg-faint">Custom base</span>
                <input
                  type="number" min={1} max={16} value={spacingBase}
                  onChange={(e) => setSpacingBase(Math.max(1, Math.min(16, Number(e.target.value) || 4)))}
                  aria-label="Custom base unit"
                  className="w-16 px-2 py-1 rounded-lg border border-line bg-surface text-xs text-fg outline-none focus:border-line-strong"
                />
                <span className="text-[11px] text-fg-faint">px</span>
              </div>
            </>
          )}

          {category === 'spacing' && (step === 2 || step === 3) && (
            <>
              <StepHeading
                title={step === 2 ? 'Preview the scale' : 'Confirm'}
                subtitle={step === 2 ? `${spacingBase}px base — spacing-1 through spacing-16.` : `${spacingBase}px base applied to every step.`}
              />
              <div className="flex flex-col gap-1.5">
                {SPACING_STEPS.map((s) => {
                  const px = Number(s) * spacingBase
                  const maxPx = 16 * spacingBase
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className="w-20 text-[11px] font-mono text-fg-faint flex-shrink-0">spacing-{s}</span>
                      <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent-ui/70" style={{ width: `${Math.max((px / maxPx) * 100, 2)}%` }} />
                      </div>
                      <span className="w-10 text-right text-[11px] font-mono text-fg-faint flex-shrink-0">{px}px</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {category === 'sizes' && step === 1 && (
            <>
              <StepHeading title="Which size are you setting?" subtitle="Component heights — xs through 2xl." />
              <div className="flex flex-col gap-2">
                {(Object.keys(SIZES_DEFAULT) as (keyof typeof SIZES_DEFAULT)[]).map((key) => (
                  <OptionCard
                    key={key}
                    selected={sizeKey === key}
                    onClick={() => { setSizeKey(key); setSizeValue(pxToNum(sizes[key] ?? SIZES_DEFAULT[key])) }}
                    title={`size-${key}`}
                    subtitle={sizes[key] ?? SIZES_DEFAULT[key]}
                  />
                ))}
              </div>
            </>
          )}

          {category === 'sizes' && (step === 2 || step === 3) && (
            <>
              <StepHeading
                title={step === 2 ? 'Set its height' : 'Confirm'}
                subtitle={step === 2 ? `size-${sizeKey} — drag to set the height.` : `size-${sizeKey}: ${sizes[sizeKey] ?? SIZES_DEFAULT[sizeKey]} → ${sizeValue}px`}
              />
              {step === 2 && (
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-fg-muted">Height</span>
                  <span className="text-[11px] font-mono text-fg">{sizeValue}px</span>
                </div>
              )}
              {step === 2 && (
                <input
                  type="range" min={16} max={80} value={sizeValue}
                  onChange={(e) => setSizeValue(Number(e.target.value))}
                  aria-label="Size height"
                  className="w-full accent-fg cursor-pointer mb-4"
                />
              )}
              <div className="flex items-end justify-center p-6 rounded-xl border border-line bg-app">
                <div
                  className="rounded-lg flex items-center justify-center text-[11px] font-mono px-4 flex-shrink-0"
                  style={{ height: sizeValue, minWidth: 64, backgroundColor: accentColor + '22', border: `1.5px solid ${accentColor}66`, color: accentColor }}
                >
                  {sizeValue}px
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 h-16 border-t border-line flex-shrink-0">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
            className="px-4 py-2 rounded-lg text-[13px] font-medium border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < totalSteps ? (
            <button
              onClick={() => canNext && setStep((s) => (s + 1) as Step)}
              disabled={!canNext}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold bg-accent-ui text-white disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              onClick={commit}
              disabled={!canConfirm}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold bg-accent-ui text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            >
              {category === 'color' ? ROLE_CONFIRM_LABEL[colorRole] : CONFIRM_LABEL[category]}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
