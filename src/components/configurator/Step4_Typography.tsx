import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'

const FONT_PRESETS = [
  { label: 'Inter',        value: 'Inter',             category: 'Sans-serif' },
  { label: 'Geist',        value: 'Geist',             category: 'Sans-serif' },
  { label: 'DM Sans',      value: 'DM Sans',           category: 'Sans-serif' },
  { label: 'Plus Jakarta', value: 'Plus Jakarta Sans',  category: 'Sans-serif' },
  { label: 'Sora',         value: 'Sora',              category: 'Sans-serif' },
  { label: 'Outfit',       value: 'Outfit',            category: 'Sans-serif' },
  { label: 'Fraunces',     value: 'Fraunces',          category: 'Serif'      },
  { label: 'Playfair',     value: 'Playfair Display',  category: 'Serif'      },
  { label: 'Libre Bask.',  value: 'Libre Baskerville', category: 'Serif'      },
  { label: 'JetBrains',    value: 'JetBrains Mono',    category: 'Mono'       },
  { label: 'Fira Code',    value: 'Fira Code',         category: 'Mono'       },
]

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

function FontPicker({
  selectedFont,
  onSelect,
  label,
}: {
  selectedFont: string
  onSelect: (font: string) => void
  label: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-neutral-400 uppercase tracking-wide">{label}</label>
      {(['Sans-serif', 'Serif', 'Mono'] as const).map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <span className="text-[11px] text-neutral-600 uppercase tracking-widest">{cat}</span>
          <div className="flex flex-wrap gap-2">
            {FONT_PRESETS.filter((f) => f.category === cat).map((f) => (
              <button
                key={f.value}
                onClick={() => onSelect(f.value)}
                style={{ fontFamily: `'${f.value}', sans-serif` }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedFont === f.value
                    ? 'bg-violet-600 text-white ring-2 ring-violet-400/30'
                    : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {f.label}
              </button>
            ))}
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
      {/* ── Font pickers ── */}
      <div className="grid grid-cols-2 gap-8">
        <FontPicker selectedFont={headingFont} onSelect={setHeadingFont} label="Heading Font" />
        <FontPicker selectedFont={bodyFont} onSelect={setBodyFont} label="Body Font" />
      </div>

      {/* ── Live Specimen ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${headingFont}-${bodyFont}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 uppercase tracking-wider">Specimen</span>
            {headingFont !== bodyFont && (
              <span className="text-xs text-neutral-600 font-mono">{headingFont} / {bodyFont}</span>
            )}
            {headingFont === bodyFont && (
              <span className="text-xs text-neutral-600 font-mono">{bodyFont}</span>
            )}
          </div>

          {/* Heading specimen */}
          <div className="flex flex-col gap-1 border-b border-neutral-800/60 pb-5">
            <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider mb-1">Heading</span>
            {(['2xl', 'xl'] as const).map((step) => {
              const size = typography.sizes[step] ?? DEFAULT_SIZES[step]
              return (
                <div key={step} className="flex items-baseline gap-3">
                  <span className="text-[10px] text-neutral-600 font-mono w-8 flex-shrink-0">{step}</span>
                  <span
                    style={{
                      fontFamily: `'${headingFont}', sans-serif`,
                      fontSize: size,
                      lineHeight: 1.15,
                      fontWeight: Math.max(...activeWeights),
                    }}
                    className="text-white truncate"
                  >
                    {SPECIMEN_HEADING}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Body specimen */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider mb-1">Body</span>
            {(['lg', 'base', 'sm', 'xs'] as const).map((step) => {
              const size = typography.sizes[step] ?? DEFAULT_SIZES[step]
              return (
                <div key={step} className="flex items-baseline gap-3">
                  <span className="text-[10px] text-neutral-600 font-mono w-8 flex-shrink-0">{step}</span>
                  <span
                    style={{
                      fontFamily: `'${bodyFont}', sans-serif`,
                      fontSize: size,
                      lineHeight: 1.5,
                      fontWeight: medianWeight,
                    }}
                    className="text-neutral-300 truncate"
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
        <label className="text-sm text-neutral-400 uppercase tracking-wide">Type Scale</label>
        <div className="grid grid-cols-3 gap-3">
          {SCALE_STEPS.map((step) => (
            <div key={step} className="flex flex-col gap-1">
              <label className="text-[11px] text-neutral-500 font-mono">{step}</label>
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 focus-within:border-violet-500 transition-colors">
                <input
                  type="text"
                  value={typography.sizes[step] ?? DEFAULT_SIZES[step]}
                  onChange={(e) => setSize(step, e.target.value)}
                  className="bg-transparent text-white text-sm font-mono w-full outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weights ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-neutral-400 uppercase tracking-wide">Weights</label>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map((w) => {
            const active = activeWeights.includes(w.value)
            return (
              <button
                key={w.value}
                onClick={() => toggleWeight(w.value)}
                style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: w.value }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-violet-600 text-white ring-2 ring-violet-400/30'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {w.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-neutral-600">
          Only selected weights are included in the export.
        </p>
      </div>

      {/* ── Token preview ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg bg-neutral-900 border border-neutral-800 p-4"
      >
        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Token preview</p>
        <pre className="text-xs font-mono leading-relaxed text-neutral-400 overflow-x-auto">
{`:root {
  --font-family-heading: '${headingFont}', sans-serif;
  --font-family-body: '${bodyFont}', sans-serif;
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
