import { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, GRAY_LIGHT_SCALE, GRAY_DARK_SCALE } from '../../store/useDesignStore'
import { generateColorScale, isAccessible, checkContrast } from '../../lib/colorUtils'

// ── Color preset groups (Figma design system palette) ────────────────────
const PRESET_GROUPS: { label: string; colors: { label: string; hex: string }[] }[] = [
  {
    label: 'Grays',
    colors: [
      { label: 'Gray Blue',    hex: '#4e5ba6' },
      { label: 'Gray Cool',    hex: '#5d6b98' },
      { label: 'Gray Modern',  hex: '#697586' },
      { label: 'Gray Neutral', hex: '#6c737f' },
      { label: 'Gray Iron',    hex: '#70707b' },
      { label: 'Gray True',    hex: '#737373' },
      { label: 'Gray Warm',    hex: '#79716b' },
    ],
  },
  {
    label: 'Greens',
    colors: [
      { label: 'Moss',        hex: '#669f2a' },
      { label: 'Green Light', hex: '#66c61c' },
      { label: 'Green',       hex: '#16b364' },
      { label: 'Teal',        hex: '#15b79e' },
      { label: 'Cyan',        hex: '#06aed4' },
    ],
  },
  {
    label: 'Blues',
    colors: [
      { label: 'Blue Light', hex: '#0ba5ec' },
      { label: 'Blue',       hex: '#2e90fa' },
      { label: 'Blue Dark',  hex: '#2970ff' },
      { label: 'Indigo',     hex: '#6172f3' },
      { label: 'Violet',     hex: '#875bf7' },
      { label: 'Purple',     hex: '#7a5af8' },
    ],
  },
  {
    label: 'Pinks',
    colors: [
      { label: 'Fuchsia', hex: '#d444f1' },
      { label: 'Pink',    hex: '#ee46bc' },
      { label: 'Rosé',    hex: '#f63d68' },
    ],
  },
  {
    label: 'Warm',
    colors: [
      { label: 'Orange Dark', hex: '#ff4405' },
      { label: 'Orange',      hex: '#ef6820' },
      { label: 'Yellow',      hex: '#eaaa08' },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────

function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const ratio = checkContrast(fg, bg)
  const aa  = ratio >= 4.5
  const aaa = ratio >= 7
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
      aaa ? 'bg-emerald-900/60 text-emerald-400'
          : aa ? 'bg-violet-900/60 text-violet-400'
               : 'bg-neutral-800 text-neutral-500'
    }`}>
      {ratio.toFixed(1)}{aaa ? ' AAA' : aa ? ' AA' : ' ✗'}
    </span>
  )
}

function ScaleSwatch({ index, color }: { index: number; color: string }) {
  const isBase = index === 5
  const textOnSwatch = index < 6 ? '#0a0a0a' : '#ffffff'
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.8 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="flex flex-col gap-1"
    >
      <div
        className={`h-12 rounded-md relative flex items-center justify-center transition-all duration-300 ${
          isBase ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-neutral-950' : ''
        }`}
        style={{ backgroundColor: color }}
      >
        {isBase && (
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: textOnSwatch }}>
            base
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-neutral-500 text-center font-mono">{index + 1}</span>
        <ContrastBadge fg={textOnSwatch} bg={color} />
      </div>
    </motion.div>
  )
}

function CompactScale({
  scale,
  label,
  description,
  color,
  onColorChange,
  presets = [],
  accentIndex = 6,
}: {
  scale: Record<number, string>
  label: string
  description: string
  color?: string
  onColorChange?: (hex: string) => void
  presets?: string[]
  accentIndex?: number
}) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  const isEditable = !!color && !!onColorChange

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {isEditable ? (
          <div className="relative flex-shrink-0 w-12 h-12">
            <div
              className="w-full h-full rounded-xl ring-2 ring-white/10 hover:ring-white/25 cursor-pointer transition"
              style={{ backgroundColor: color }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange!(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label={`Pick ${label} base color`}
              />
            </div>
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-xl ring-1 ring-white/10 flex-shrink-0"
            style={{ backgroundColor: entries[accentIndex - 1]?.[1] ?? '#888' }}
          />
        )}

        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-semibold text-white leading-none">{label}</span>
          {isEditable ? (
            <input
              type="text"
              value={color}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onColorChange!(v)
              }}
              className="bg-neutral-900 border border-neutral-700 focus:border-violet-500
                         rounded-lg px-3 py-1.5 text-white font-mono text-xs
                         outline-none transition-colors w-28"
              aria-label={`${label} hex value`}
            />
          ) : (
            <p className="text-xs text-neutral-500 leading-snug">{description}</p>
          )}
        </div>

        {isEditable && (
          <p className="text-xs text-neutral-500 leading-snug ml-1 flex-1 min-w-[120px]">
            {description}
          </p>
        )}
      </div>

      {isEditable && presets.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-600 uppercase tracking-wider w-14 shrink-0 text-right">Presets</span>
          <div className="flex gap-1.5 flex-wrap">
            {presets.map((hex) => (
              <button
                key={hex}
                onClick={() => onColorChange!(hex)}
                title={hex}
                className={`w-5 h-5 rounded-full transition-all duration-150 hover:scale-110 ${
                  color === hex
                    ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-neutral-950 scale-110'
                    : 'ring-1 ring-white/10'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={hex}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-1">
        {entries.map(([key, c]) => {
          const isBase = Number(key) === accentIndex
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <div
                className={`h-8 rounded-sm transition-all ${
                  isBase ? 'ring-1 ring-white/30 ring-offset-1 ring-offset-neutral-950' : ''
                }`}
                style={{ backgroundColor: c }}
                title={`Tone ${key} — ${c}`}
              />
              <span className="text-[8px] text-neutral-600 text-center font-mono leading-none">
                {isBase ? '●' : key}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Collapsible section wrapper ────────────────────────────────────────────

function CollapsibleSection({
  label,
  description,
  swatchColors,
  defaultOpen = false,
  children,
}: {
  label: string
  description: string
  swatchColors?: string[]
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 group text-left w-full"
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-neutral-500 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M4 2.5L8 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <label className="text-sm text-neutral-400 uppercase tracking-wide cursor-pointer group-hover:text-neutral-300 transition-colors">
          {label}
        </label>

        {!open && swatchColors && swatchColors.length > 0 && (
          <div className="flex gap-1 flex-wrap ml-1">
            {swatchColors.map((c, i) => (
              <div key={i} className="w-4 h-4 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
      </button>

      {!open && (
        <p className="text-xs text-neutral-600 -mt-2 ml-5">{description}</p>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function Step2_ColorPalette() {
  const {
    primaryColor, primaryScale, setPrimaryColor, setPrimaryScale,
    errorColor,   errorScale,   setErrorColor,   setErrorScale,
    warningColor, warningScale, setWarningColor, setWarningScale,
    successColor, successScale, setSuccessColor, setSuccessScale,
    infoColor,    infoScale,    setInfoColor,    setInfoScale,
  } = useDesignStore()

  const regenerate = useCallback((hex: string) => {
    try {
      const scale = generateColorScale(hex)
      setPrimaryColor(hex)
      setPrimaryScale(scale)
    } catch {}
  }, [setPrimaryColor, setPrimaryScale])

  const regenerateError = useCallback((hex: string) => {
    try { setErrorColor(hex); setErrorScale(generateColorScale(hex)) } catch {}
  }, [setErrorColor, setErrorScale])

  const regenerateWarning = useCallback((hex: string) => {
    try { setWarningColor(hex); setWarningScale(generateColorScale(hex)) } catch {}
  }, [setWarningColor, setWarningScale])

  const regenerateSuccess = useCallback((hex: string) => {
    try { setSuccessColor(hex); setSuccessScale(generateColorScale(hex)) } catch {}
  }, [setSuccessColor, setSuccessScale])

  const regenerateInfo = useCallback((hex: string) => {
    try { setInfoColor(hex); setInfoScale(generateColorScale(hex)) } catch {}
  }, [setInfoColor, setInfoScale])

  useEffect(() => {
    if (Object.keys(primaryScale).length === 0) regenerate(primaryColor)
    if (Object.keys(errorScale).length   === 0) regenerateError(errorColor)
    if (Object.keys(warningScale).length === 0) regenerateWarning(warningColor)
    if (Object.keys(successScale).length === 0) regenerateSuccess(successColor)
    if (Object.keys(infoScale).length    === 0) regenerateInfo(infoColor)
  }, [])

  const scaleEntries = Object.entries(primaryScale).sort(([a], [b]) => Number(a) - Number(b))

  // Swatch previews for collapsed state
  const semanticSwatches = [errorColor, warningColor, successColor, infoColor]
  const neutralSwatches = Object.values(GRAY_LIGHT_SCALE).filter((_, i) => i % 3 === 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-10"
    >
      {/* ── Brand / Accent color ────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <label className="text-sm text-neutral-400 uppercase tracking-wide">Brand Color</label>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-14 h-14 rounded-xl cursor-pointer ring-2 ring-white/10 hover:ring-white/30 transition"
              style={{ backgroundColor: primaryColor }}
            >
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => regenerate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Pick brand color"
              />
            </div>
          </div>

          <input
            type="text"
            value={primaryColor}
            maxLength={7}
            onChange={(e) => {
              const val = e.target.value
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) regenerate(val)
            }}
            className="bg-neutral-900 border border-neutral-700 focus:border-violet-500
                       rounded-lg px-4 py-2 text-white font-mono text-sm
                       outline-none transition-colors w-36"
            placeholder="#7f56d9"
          />

          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>on dark</span>
            <ContrastBadge fg={primaryColor} bg="#0a0a0a" />
            <span>on white</span>
            <ContrastBadge fg={primaryColor} bg="#ffffff" />
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-col gap-2 mt-1">
          {PRESET_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-3">
              <span className="text-[10px] text-neutral-600 uppercase tracking-wider w-14 shrink-0 text-right">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.colors.map((preset) => (
                  <button
                    key={preset.hex}
                    onClick={() => regenerate(preset.hex)}
                    title={preset.label}
                    className={`w-6 h-6 rounded-full transition-all duration-150 hover:scale-110 ${
                      primaryColor === preset.hex
                        ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-neutral-950 scale-110'
                        : 'ring-1 ring-white/10'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    aria-label={preset.label}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Brand 12-tone scale ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {scaleEntries.length > 0 && (
          <motion.div
            key={primaryColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-400 uppercase tracking-wide">
                12-Tone Scale
              </label>
              <span className="text-xs text-neutral-600 font-mono">
                1 = lightest · 12 = darkest
              </span>
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              {scaleEntries.map(([key, color], i) => (
                <ScaleSwatch key={key} index={i} color={color} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Accessibility summary ───────────────────────────────── */}
      {scaleEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 flex gap-6 text-sm"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-neutral-500 text-xs uppercase tracking-wide">AA pass (4.5:1)</span>
            <span className="text-white font-semibold">
              {scaleEntries.filter(([, c]) => isAccessible(c, '#0a0a0a') || isAccessible(c, '#ffffff')).length}
              <span className="text-neutral-500 font-normal"> / 12 tones</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-neutral-500 text-xs uppercase tracking-wide">Base on white</span>
            <span className="text-white font-semibold">
              {checkContrast(primaryColor, '#ffffff').toFixed(2)}:1
              <span className={`ml-2 text-xs ${isAccessible(primaryColor, '#ffffff') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isAccessible(primaryColor, '#ffffff') ? '✓ AA' : '✗ fail'}
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-neutral-500 text-xs uppercase tracking-wide">Base on dark</span>
            <span className="text-white font-semibold">
              {checkContrast(primaryColor, '#0a0a0a').toFixed(2)}:1
              <span className={`ml-2 text-xs ${isAccessible(primaryColor, '#0a0a0a') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isAccessible(primaryColor, '#0a0a0a') ? '✓ AA' : '✗ fail'}
              </span>
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Semantic state scales — collapsible ─────────────────── */}
      <CollapsibleSection
        label="Semantic Scales"
        description="Error, warning, success and info colors — auto-generated, expand to customize."
        swatchColors={semanticSwatches}
        defaultOpen={false}
      >
        <div className="flex flex-col gap-5 rounded-lg border border-neutral-800/60 p-4 bg-neutral-950/40">
          {Object.keys(errorScale).length > 0 && (
            <CompactScale
              scale={errorScale}
              label="Error"
              description="Destructive actions, validation errors, removal states."
              color={errorColor}
              onColorChange={regenerateError}
              presets={['#f04438', '#d92d20', '#ef4444', '#e11d48', '#dc2626']}
            />
          )}
          {Object.keys(warningScale).length > 0 && (
            <CompactScale
              scale={warningScale}
              label="Warning"
              description="Potentially destructive or 'on-hold' actions and confirmations."
              color={warningColor}
              onColorChange={regenerateWarning}
              presets={['#f79009', '#f59e0b', '#dc6803', '#f97316', '#eab308']}
            />
          )}
          {Object.keys(successScale).length > 0 && (
            <CompactScale
              scale={successScale}
              label="Success"
              description="Positive actions, successful confirmations, positive trends."
              color={successColor}
              onColorChange={regenerateSuccess}
              presets={['#17b26a', '#079455', '#10b981', '#22c55e', '#16a34a']}
            />
          )}
          {Object.keys(infoScale).length > 0 && (
            <CompactScale
              scale={infoScale}
              label="Info"
              description="Informational messages, neutral highlights, tips and hints."
              color={infoColor}
              onColorChange={regenerateInfo}
              presets={['#2e90fa', '#3b82f6', '#0ea5e9', '#06b6d4', '#6172f3']}
            />
          )}
        </div>
      </CollapsibleSection>

      {/* ── Neutral scales — collapsible ────────────────────────── */}
      <CollapsibleSection
        label="Neutral Scales"
        description="Foundation grays for text, fields, backgrounds and dividers — fixed from the Figma DS."
        swatchColors={neutralSwatches}
        defaultOpen={false}
      >
        <div className="flex flex-col gap-5 rounded-lg border border-neutral-800/60 p-4 bg-neutral-950/40">
          <CompactScale
            scale={GRAY_LIGHT_SCALE}
            label="Gray (light mode)"
            description="Neutral gray used for text, form fields, backgrounds and dividers in light mode."
            accentIndex={7}
          />
          <CompactScale
            scale={GRAY_DARK_SCALE}
            label="Gray (dark mode)"
            description="Desaturated gray palette optimised specifically for dark mode variables."
            accentIndex={7}
          />
        </div>
      </CollapsibleSection>
    </motion.div>
  )
}
