import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import type { StyleDirection } from '../../types/tokens'

const STYLES: {
  key: StyleDirection
  label: string
  tagline: string
  description: string
  traits: string[]
}[] = [
  {
    key: 'brutalist',
    label: 'Brutalist',
    tagline: 'Raw. Precise. Unapologetic.',
    description: 'Hard edges, high contrast, monospace type, no decorative shadows. Inspired by Swiss grid and developer tools.',
    traits: ['No border radius', 'Heavy borders', 'Mono typography', 'Max contrast'],
  },
  {
    key: 'organic',
    label: 'Organic',
    tagline: 'Warm. Fluid. Human.',
    description: 'Generous radius, soft shadows, variable fonts, earthy tones. Feels handcrafted and approachable.',
    traits: ['Large radius', 'Soft shadows', 'Humanist type', 'Warm palette'],
  },
  {
    key: 'material',
    label: 'Material',
    tagline: 'Structured. Elevated. Familiar.',
    description: 'Layered surfaces, consistent elevation, clear hierarchy. Follows established design system conventions.',
    traits: ['Elevation system', 'Defined grid', 'Neutral base', 'Icon-forward'],
  },
]

// Mini UI previews — rendered with the user's own tokens
function BrutalistPreview({
  primary,
  surface,
  text,
  border,
}: {
  primary: string
  surface: string
  text: string
  border: string
}) {
  return (
    <div
      className="p-3 flex flex-col gap-2 font-mono text-[11px]"
      style={{ backgroundColor: surface || '#111', border: `2px solid ${border || '#fff'}` }}
    >
      <div
        className="font-bold tracking-tight"
        style={{ color: text || '#fff', fontSize: 13 }}
      >
        DASHBOARD
      </div>
      <div
        className="h-px w-full"
        style={{ backgroundColor: border || '#fff' }}
      />
      <div className="flex gap-1">
        <div
          className="px-2 py-1 text-[10px] font-bold"
          style={{
            backgroundColor: primary || '#3b82f6',
            color: '#000',
            border: `1.5px solid ${primary || '#3b82f6'}`,
          }}
        >
          ACTION
        </div>
        <div
          className="px-2 py-1 text-[10px] font-bold"
          style={{
            backgroundColor: 'transparent',
            color: text || '#fff',
            border: `1.5px solid ${border || '#fff'}`,
          }}
        >
          CANCEL
        </div>
      </div>
      <div
        className="px-2 py-1 text-[10px]"
        style={{
          backgroundColor: 'transparent',
          color: text || '#666',
          border: `1px solid ${border || '#333'}`,
        }}
      >
        input field_
      </div>
    </div>
  )
}

function OrganicPreview({
  primary,
  surface,
  text,
  border,
}: {
  primary: string
  surface: string
  text: string
  border: string
}) {
  return (
    <div
      className="p-3 flex flex-col gap-2 text-[11px]"
      style={{
        backgroundColor: surface || '#1a1a1a',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        border: `1px solid ${border || '#333'}`,
      }}
    >
      <div
        className="font-semibold"
        style={{ color: text || '#fff', fontSize: 13, fontFamily: 'Georgia, serif' }}
      >
        Welcome back
      </div>
      <div className="flex gap-1.5">
        <div
          className="px-3 py-1.5 text-[10px] font-medium"
          style={{
            backgroundColor: primary || '#3b82f6',
            color: '#fff',
            borderRadius: 999,
            boxShadow: `0 2px 8px ${primary || '#3b82f6'}55`,
          }}
        >
          Continue
        </div>
        <div
          className="px-3 py-1.5 text-[10px]"
          style={{
            backgroundColor: 'transparent',
            color: text || '#aaa',
            borderRadius: 999,
            border: `1px solid ${border || '#333'}`,
          }}
        >
          Skip
        </div>
      </div>
      <div
        className="px-3 py-1.5 text-[10px]"
        style={{
          backgroundColor: border ? border + '22' : '#ffffff11',
          color: text || '#666',
          borderRadius: 12,
          border: `1px solid ${border || '#333'}`,
        }}
      >
        Search for anything…
      </div>
    </div>
  )
}

function MaterialPreview({
  primary,
  surface,
  text,
  border,
}: {
  primary: string
  surface: string
  text: string
  border: string
}) {
  return (
    <div
      className="p-3 flex flex-col gap-2 text-[11px]"
      style={{
        backgroundColor: surface || '#1e1e1e',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)',
        border: `1px solid ${border || '#2a2a2a'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div style={{ color: text || '#fff', fontSize: 12, fontWeight: 500 }}>
          Overview
        </div>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{ backgroundColor: primary || '#3b82f6', color: '#fff' }}
        >
          3
        </div>
      </div>
      <div
        className="h-px w-full"
        style={{ backgroundColor: border || '#2a2a2a' }}
      />
      {['Analytics', 'Reports', 'Settings'].map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-2 px-1.5 py-1 rounded"
          style={{
            backgroundColor: i === 0 ? (primary || '#3b82f6') + '22' : 'transparent',
            color: i === 0 ? primary || '#3b82f6' : text || '#aaa',
            borderRadius: 4,
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: i === 0 ? primary || '#3b82f6' : border || '#555' }}
          />
          {item}
        </div>
      ))}
    </div>
  )
}

const PREVIEW_MAP = {
  brutalist: BrutalistPreview,
  organic: OrganicPreview,
  material: MaterialPreview,
}

export default function Step6_StyleDirection() {
  const { styleDirection, setStyleDirection, semanticTokens, primaryColor } = useDesignStore()

  const tokens = {
    primary: semanticTokens.primary || primaryColor || '#3B82F6',
    surface: semanticTokens.surface || '#1a1a1a',
    text: semanticTokens.text || '#ffffff',
    border: semanticTokens.border || '#333333',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-neutral-500">
        Choose a visual direction. This influences component shapes, shadow usage, and spacing density in your exported system.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {STYLES.map((style, i) => {
          const isSelected = styleDirection === style.key
          const Preview = PREVIEW_MAP[style.key]

          return (
            <motion.button
              key={style.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setStyleDirection(style.key)}
              className={`text-left rounded-xl p-4 flex flex-col gap-4 transition-all ${
                isSelected
                  ? 'bg-neutral-800 ring-2 ring-violet-500/60 border border-violet-500/20'
                  : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-600'
              }`}
            >
              {/* Mini preview */}
              <div className="pointer-events-none select-none overflow-hidden rounded-lg">
                <Preview {...tokens} />
              </div>

              {/* Label */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-white' : 'text-neutral-300'
                    }`}
                  >
                    {style.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 italic">{style.tagline}</p>
              </div>

              {/* Traits */}
              <div className="flex flex-wrap gap-1">
                {style.traits.map((t) => (
                  <span
                    key={t}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isSelected
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Description panel */}
      {styleDirection && (
        <motion.div
          key={styleDirection}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 flex items-start gap-3"
        >
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: tokens.primary }}
          />
          <div>
            <p className="text-sm font-medium text-white mb-1">
              {STYLES.find((s) => s.key === styleDirection)?.label}
            </p>
            <p className="text-sm text-neutral-400">
              {STYLES.find((s) => s.key === styleDirection)?.description}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
