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
    key: 'ios26',
    label: 'iOS 26',
    tagline: 'Liquid Glass. Depth. Clarity.',
    description: 'Translucent Liquid Glass surfaces, concentric radii, floating pill controls and SF-style typography. Apple’s iOS 26 design language — light, layered and alive.',
    traits: ['Liquid Glass', 'Concentric radii', 'SF typography', 'Floating controls'],
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

// SF-style system font stack used across the iOS 26 specimens
const SF = '-apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'

// Mini UI previews — rendered with the user's own tokens
// iOS 26 "Liquid Glass": a colourful wallpaper with a floating frosted-glass
// panel on top, so you can see the tint refract through the translucent surface.
function IOSPreview({ primary }: { primary: string }) {
  const tint = primary || '#3b82f6'
  return (
    <div
      className="relative p-3 overflow-hidden"
      style={{
        fontFamily: SF,
        borderRadius: 20,
        background: `linear-gradient(140deg, ${tint} 0%, ${tint}aa 55%, #ffffff33 100%)`,
      }}
    >
      {/* Refraction orbs behind the glass */}
      <div className="absolute -top-3 -left-2 w-16 h-16 rounded-full" style={{ background: '#ffffff66', filter: 'blur(14px)' }} />
      <div className="absolute -bottom-4 right-2 w-16 h-16 rounded-full" style={{ background: `${tint}`, filter: 'blur(16px)', opacity: 0.7 }} />

      {/* Floating Liquid Glass panel */}
      <div
        className="relative flex flex-col gap-2 p-2.5"
        style={{
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.16)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.55)',
        }}
      >
        <div
          className="font-semibold tracking-tight"
          style={{ color: '#fff', fontSize: 15, textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
        >
          Today
        </div>
        <div className="flex gap-1.5">
          <div
            className="px-3 py-1 text-[10px] font-semibold"
            style={{
              color: '#fff',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.28)',
              border: '1px solid rgba(255,255,255,0.45)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            Continue
          </div>
          <div
            className="px-3 py-1 text-[10px] font-medium"
            style={{
              color: '#fff',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            Skip
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px]"
          style={{
            color: 'rgba(255,255,255,0.85)',
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.22)',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 8L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Search
        </div>
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
  ios26: IOSPreview,
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
