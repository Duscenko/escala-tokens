import { useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Step2_ColorPalette from './Step2_ColorPalette'
import Step3_SemanticTokens from './Step3_SemanticTokens'
import Step4_Typography from './Step4_Typography'
import Step5_SpacingRadius from './Step5_SpacingRadius'

// One global editor for every foundation. Each section reuses an existing,
// self-contained Step component that reads/writes the store directly. The card
// shell (sidebar + content card with a centered title) lives here so the Step
// components stay focused on their controls.
interface Section {
  key: string
  label: string
  hint: string
  title: string
  subtitle: string
  Component: ComponentType
}

const SECTIONS: Section[] = [
  {
    key: 'color',
    label: 'Color',
    hint: 'Brand, neutrals & state scales',
    title: 'Color',
    subtitle: 'Choose from the curated palette, each hue is vetted to generate an accessible scale.',
    Component: Step2_ColorPalette,
  },
  {
    key: 'semantic',
    label: 'Semantic Tokens',
    hint: 'Map scales to roles',
    title: 'Semantic Tokens',
    subtitle: 'Map each color scale to a semantic role — text, border, foreground and background.',
    Component: Step3_SemanticTokens,
  },
  {
    key: 'typography',
    label: 'Typography',
    hint: 'Fonts, sizes & weights',
    title: 'Typography',
    subtitle: 'Pair a heading and body font, then tune the size scale and weights.',
    Component: Step4_Typography,
  },
  {
    key: 'spacing',
    label: 'Spacing & Radius',
    hint: 'Spacing scale & corners',
    title: 'Spacing & Radius',
    subtitle: 'Set the base spacing unit and the corner-radius personality of your system.',
    Component: Step5_SpacingRadius,
  },
]

export default function FoundationsEditor() {
  const [active, setActive] = useState<string>(SECTIONS[0].key)
  const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0]
  const Active = section.Component

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-6 items-start"
    >
      {/* Left: section sub-nav, in a card */}
      <div className="w-60 flex-shrink-0 rounded-2xl border border-line bg-surface/60 p-3 sticky top-20">
        <span className="block text-[10px] text-fg-faint uppercase tracking-widest px-2 mb-2">
          Set Foundations
        </span>
        <div className="flex flex-col gap-1">
          {SECTIONS.map((s, i) => {
            const isActive = s.key === active
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-elevated text-fg shadow-sm'
                    : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 transition-colors ${
                    isActive ? 'bg-fg text-app' : 'bg-elevated text-fg-faint'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm leading-tight">{s.label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-fg-muted' : 'text-fg-faint'}`}>
                    {s.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: content card with centered section title + active section */}
      <div className="flex-1 min-w-0 rounded-2xl border border-line bg-transparent shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <header className="border-b border-line px-8 py-6 text-center">
              <h2 className="text-2xl font-bold text-fg">{section.title}</h2>
              <p className="text-sm text-fg-faint mt-1.5 max-w-xl mx-auto">{section.subtitle}</p>
            </header>
            <div className="p-8">
              <Active />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
