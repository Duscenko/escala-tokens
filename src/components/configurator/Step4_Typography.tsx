import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'

// Google Fonts presets — loaded via @import in the component
const FONT_PRESETS = [
  { label: 'Inter',        value: 'Inter',        category: 'Sans-serif', specimen: 'Aa' },
  { label: 'Geist',        value: 'Geist',        category: 'Sans-serif', specimen: 'Aa' },
  { label: 'DM Sans',      value: 'DM Sans',      category: 'Sans-serif', specimen: 'Aa' },
  { label: 'Plus Jakarta', value: 'Plus Jakarta Sans', category: 'Sans-serif', specimen: 'Aa' },
  { label: 'Sora',         value: 'Sora',         category: 'Sans-serif', specimen: 'Aa' },
  { label: 'Outfit',       value: 'Outfit',       category: 'Sans-serif', specimen: 'Aa' },
  { label: 'Fraunces',     value: 'Fraunces',     category: 'Serif',     specimen: 'Aa' },
  { label: 'Playfair',     value: 'Playfair Display', category: 'Serif', specimen: 'Aa' },
  { label: 'Libre Baskerville', value: 'Libre Baskerville', category: 'Serif', specimen: 'Aa' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono', category: 'Mono', specimen: 'Aa' },
  { label: 'Fira Code',    value: 'Fira Code',    category: 'Mono',     specimen: 'Aa' },
]

const WEIGHTS = [
  { label: 'Regular',  value: 400 },
  { label: 'Medium',   value: 500 },
  { label: 'Semibold', value: 600 },
  { label: 'Bold',     value: 700 },
  { label: 'Extrabold',value: 800 },
]

const SCALE_STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const

const DEFAULT_SIZES: Record<string, string> = {
  xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px',
}

const SPECIMEN_TEXT = 'The quick brown fox jumps over the lazy dog.'

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

export default function Step4_Typography() {
  const { typography, setTypography } = useDesignStore()
  const [activeWeights, setActiveWeights] = useState<number[]>(
    Object.values(typography.weights)
  )

  // Load all fonts upfront for the picker
  useEffect(() => {
    FONT_PRESETS.forEach((f) => loadGoogleFont(f.value))
  }, [])

  function setFont(family: string) {
    setTypography({ ...typography, fontFamily: family })
  }

  function setSize(step: string, value: string) {
    setTypography({
      ...typography,
      sizes: { ...typography.sizes, [step]: value },
    })
  }

  function toggleWeight(w: number) {
    const next = activeWeights.includes(w)
      ? activeWeights.filter((x) => x !== w)
      : [...activeWeights, w].sort((a, b) => a - b)
    if (next.length === 0) return // keep at least one
    setActiveWeights(next)
    const newWeights: Record<string, number> = {}
    next.forEach((val) => {
      const match = WEIGHTS.find((wt) => wt.value === val)
      if (match) newWeights[match.label.toLowerCase()] = val
    })
    setTypography({ ...typography, weights: newWeights })
  }

  const font = typography.fontFamily

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-10"
    >
      {/* ── Font Family ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-neutral-400 uppercase tracking-wide">Font Family</label>

        {/* Category tabs */}
        {(['Sans-serif', 'Serif', 'Mono'] as const).map((cat) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <span className="text-[11px] text-neutral-600 uppercase tracking-widest">{cat}</span>
            <div className="flex flex-wrap gap-2">
              {FONT_PRESETS.filter((f) => f.category === cat).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFont(f.value)}
                  style={{ fontFamily: `'${f.value}', sans-serif` }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    font === f.value
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
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

      {/* ── Live Specimen ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={font}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 uppercase tracking-wider">Specimen</span>
            <span className="text-xs text-neutral-600 font-mono">{font}</span>
          </div>
          {/* Scale preview lines */}
          {SCALE_STEPS.slice().reverse().map((step) => {
            const size = typography.sizes[step] ?? DEFAULT_SIZES[step]
            return (
              <div key={step} className="flex items-baseline gap-3">
                <span className="text-[10px] text-neutral-600 font-mono w-8 flex-shrink-0">
                  {step}
                </span>
                <span
                  style={{
                    fontFamily: `'${font}', sans-serif`,
                    fontSize: size,
                    lineHeight: 1.3,
                    fontWeight: activeWeights[Math.floor(activeWeights.length / 2)] ?? 400,
                  }}
                  className="text-white truncate"
                >
                  {SPECIMEN_TEXT}
                </span>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* ── Type Scale ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-neutral-400 uppercase tracking-wide">Type Scale</label>
        <div className="grid grid-cols-3 gap-3">
          {SCALE_STEPS.map((step) => (
            <div key={step} className="flex flex-col gap-1">
              <label className="text-[11px] text-neutral-500 font-mono">{step}</label>
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 focus-within:border-blue-500 transition-colors">
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
                style={{
                  fontFamily: `'${font}', sans-serif`,
                  fontWeight: w.value,
                }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {w.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-neutral-600">
          Select the weights you'll actually use — unused weights won't be included in the export.
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
  --font-family: '${font}', sans-serif;
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
