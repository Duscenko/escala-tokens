import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { FONT_PRESETS, fontStack } from '../../lib/fonts'

const WEIGHTS = [
  { label: 'Regular',   value: 400 },
  { label: 'Medium',    value: 500 },
  { label: 'Semibold',  value: 600 },
  { label: 'Bold',      value: 700 },
  { label: 'Extrabold', value: 800 },
]

const SCALE_STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const

const DEFAULT_SIZES: Record<string, string> = {
  xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px',
}

const SPECIMEN_BODY = 'The quick brown fox jumps over the lazy dog.'
const SPECIMEN_HEADING = 'Designing at scale'

function loadGoogleFont(family: string) {
  const id = `gfont-${family.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700;800&display=swap`
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

function FontSelector({
  headingFont,
  bodyFont,
  setHeadingFont,
  setBodyFont,
}: {
  headingFont: string
  bodyFont: string
  setHeadingFont: (f: string) => void
  setBodyFont: (f: string) => void
}) {
  // One shared font list; the toggle picks which role the next click assigns.
  const [target, setTarget] = useState<'heading' | 'body'>('heading')
  const current = target === 'heading' ? headingFont : bodyFont
  const onSelect = target === 'heading' ? setHeadingFont : setBodyFont

  return (
    <div className="flex flex-col gap-4">
      {/* Target toggle + current pairing */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-line">
          {(['heading', 'body'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] ${
                target === t ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t} font
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-fg-faint">
          <span>Heading <span className="text-fg-muted">{headingFont}</span></span>
          <span>Body <span className="text-fg-muted">{bodyFont}</span></span>
        </div>
      </div>

      {/* Full-width font grid grouped by category */}
      {(['Sans-serif', 'Serif', 'Mono'] as const).map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <span className="text-[11px] text-fg-faint uppercase tracking-widest">{cat}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {FONT_PRESETS.filter((f) => f.category === cat).map((f) => {
              const isActive = current === f.value
              const otherTag =
                target === 'heading'
                  ? bodyFont === f.value ? 'B' : ''
                  : headingFont === f.value ? 'H' : ''
              return (
                <button
                  key={f.value}
                  onClick={() => onSelect(f.value)}
                  style={{ fontFamily: fontStack(f.value) }}
                  className={`relative px-3 py-2.5 rounded-lg text-sm text-left truncate transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] ${
                    isActive
                      ? 'bg-[#0088FF] text-white ring-2 ring-[#5AADFF]/30'
                      : 'bg-surface text-fg-muted border border-line hover:border-line-strong hover:text-fg'
                  }`}
                  title={f.label}
                >
                  {f.label}
                  {otherTag && !isActive && (
                    <span className="absolute top-1 right-1.5 text-[9px] font-mono text-fg-faint">{otherTag}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Step4_Typography() {
  const { typography, setTypography } = useDesignStore()
  const [activeWeights, setActiveWeights] = useState<number[]>(
    Object.values(typography.weights)
  )

  useEffect(() => {
    FONT_PRESETS.forEach((f) => loadGoogleFont(f.value))
  }, [])

  const bodyFont    = typography.fontFamily
  const headingFont = typography.headingFontFamily ?? typography.fontFamily

  function setBodyFont(family: string) {
    setTypography({ ...typography, fontFamily: family })
  }

  function setHeadingFont(family: string) {
    setTypography({ ...typography, headingFontFamily: family })
  }

  function setSize(step: string, value: string) {
    setTypography({ ...typography, sizes: { ...typography.sizes, [step]: value } })
  }

  function toggleWeight(w: number) {
    const next = activeWeights.includes(w)
      ? activeWeights.filter((x) => x !== w)
      : [...activeWeights, w].sort((a, b) => a - b)
    if (next.length === 0) return
    setActiveWeights(next)
    const newWeights: Record<string, number> = {}
    next.forEach((val) => {
      const match = WEIGHTS.find((wt) => wt.value === val)
      if (match) newWeights[match.label.toLowerCase()] = val
    })
    setTypography({ ...typography, weights: newWeights })
  }

  const medianWeight = activeWeights[Math.floor(activeWeights.length / 2)] ?? 400

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-10"
    >
      {/* ── Font selector ── */}
      <FontSelector
        headingFont={headingFont}
        bodyFont={bodyFont}
        setHeadingFont={setHeadingFont}
        setBodyFont={setBodyFont}
      />

      {/* ── Live Specimen ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${headingFont}-${bodyFont}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-surface border border-line p-6 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-faint uppercase tracking-wider">Specimen</span>
            {headingFont !== bodyFont && (
              <span className="text-xs text-fg-faint font-mono">{headingFont} / {bodyFont}</span>
            )}
            {headingFont === bodyFont && (
              <span className="text-xs text-fg-faint font-mono">{bodyFont}</span>
            )}
          </div>

          {/* Heading specimen */}
          <div className="flex flex-col gap-1 border-b border-line/60 pb-5">
            <span className="text-[10px] text-fg-faint font-mono uppercase tracking-wider mb-1">Heading</span>
            {(['2xl', 'xl'] as const).map((step) => {
              const size = typography.sizes[step] ?? DEFAULT_SIZES[step]
              return (
                <div key={step} className="flex items-baseline gap-3">
                  <span className="text-[10px] text-fg-faint font-mono w-8 flex-shrink-0">{step}</span>
                  <span
                    style={{
                      fontFamily: fontStack(headingFont),
                      fontSize: size,
                      lineHeight: 1.15,
                      fontWeight: Math.max(...activeWeights),
                    }}
                    className="text-fg truncate"
                  >
                    {SPECIMEN_HEADING}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Body specimen */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-fg-faint font-mono uppercase tracking-wider mb-1">Body</span>
            {(['lg', 'base', 'sm', 'xs'] as const).map((step) => {
              const size = typography.sizes[step] ?? DEFAULT_SIZES[step]
              return (
                <div key={step} className="flex items-baseline gap-3">
                  <span className="text-[10px] text-fg-faint font-mono w-8 flex-shrink-0">{step}</span>
                  <span
                    style={{
                      fontFamily: fontStack(bodyFont),
                      fontSize: size,
                      lineHeight: 1.5,
                      fontWeight: medianWeight,
                    }}
                    className="text-fg-muted truncate"
                  >
                    {SPECIMEN_BODY}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Type Scale ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Type Scale</label>
        <div className="grid grid-cols-3 gap-3">
          {SCALE_STEPS.map((step) => (
            <div key={step} className="flex flex-col gap-1">
              <label className="text-[11px] text-fg-faint font-mono">{step}</label>
              <div className="flex items-center gap-1.5 bg-surface border border-line rounded-lg px-3 py-2 focus-within:border-[#0088FF] transition-colors">
                <input
                  type="text"
                  value={typography.sizes[step] ?? DEFAULT_SIZES[step]}
                  onChange={(e) => setSize(step, e.target.value)}
                  className="bg-transparent text-fg text-sm font-mono w-full outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weights ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Weights</label>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map((w) => {
            const active = activeWeights.includes(w.value)
            return (
              <button
                key={w.value}
                onClick={() => toggleWeight(w.value)}
                style={{ fontFamily: fontStack(bodyFont), fontWeight: w.value }}
                className={`px-4 py-2 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] ${
                  active
                    ? 'bg-[#0088FF] text-white ring-2 ring-[#5AADFF]/30'
                    : 'bg-surface text-fg-muted border border-line hover:border-line-strong hover:text-fg'
                }`}
              >
                {w.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-fg-faint">
          Only selected weights are included in the export.
        </p>
      </div>

      {/* ── Token preview ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg bg-surface border border-line p-4"
      >
        <p className="text-xs text-fg-faint uppercase tracking-wider mb-3">Token preview</p>
        <pre className="text-xs font-mono leading-relaxed text-fg-muted overflow-x-auto">
{`:root {
  --font-family-heading: ${fontStack(headingFont)};
  --font-family-body: ${fontStack(bodyFont)};
${SCALE_STEPS.map(
  (s) => `  --font-size-${s}: ${typography.sizes[s] ?? DEFAULT_SIZES[s]};`
).join('\n')}
${Object.entries(typography.weights)
  .map(([k, v]) => `  --font-weight-${k}: ${v};`)
  .join('\n')}
}`}
        </pre>
      </motion.div>
    </motion.div>
  )
}
