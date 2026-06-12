import { useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import type { ComponentDef } from '../../lib/componentCatalogue'
import { usePreviewTokens } from '../../lib/previewTokens'
import ButtonDoc, { type RichDocProps } from './docs/ButtonDoc'

// ─── Rich-doc registry ───────────────────────────────────────────────────────
// A component is "enriched" when it has a Storybook-style doc here. To enrich
// component X: create docs/XDoc.tsx and add `X: XDoc`.
const RICH_DOCS: Record<string, ComponentType<RichDocProps>> = {
  Button: ButtonDoc,
}

// ─── Simple fallback doc (overview / props / a11y) ───────────────────────────
function DocPanel({ component }: { component: ComponentDef }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'props' | 'a11y'>('overview')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-0 border-b border-line">
        {(['overview', 'props', 'a11y'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px ${
              activeTab === t ? 'text-fg border-[#0088FF]' : 'text-fg-faint border-transparent hover:text-fg-muted'
            }`}
          >
            {t === 'a11y' ? 'Accessibility' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-muted leading-relaxed">{component.description}</p>
          <div className="rounded-lg bg-surface border border-line p-3">
            <p className="text-[10px] text-fg-faint uppercase tracking-wider mb-1.5">When to use</p>
            <p className="text-xs text-fg-muted leading-relaxed">{component.usage}</p>
          </div>
          <div>
            <p className="text-[10px] text-fg-faint uppercase tracking-wider mb-2">Variants</p>
            <div className="flex flex-wrap gap-1.5">
              {component.variants.map((v) => (
                <span key={v} className="text-xs px-2 py-0.5 rounded-full border border-line text-fg-muted">
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'props' && (
        <div className="flex flex-col gap-0 divide-y divide-line/60">
          {component.props.map((prop) => (
            <div key={prop.name} className="py-2.5 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <code className="text-xs text-[#5AADFF] font-mono">{prop.name}</code>
                <code className="text-[10px] text-fg-faint font-mono truncate max-w-[180px]">{prop.type}</code>
              </div>
              <p className="text-xs text-fg-faint">{prop.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'a11y' && (
        <div className="rounded-lg bg-surface border border-line p-3">
          <p className="text-xs text-fg-muted leading-relaxed">{component.accessibility}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ComponentDocPane({ component }: { component: ComponentDef | null }) {
  const { selectedComponents, toggleComponent } = useDesignStore()
  const tokens = usePreviewTokens()

  if (!component) {
    return (
      <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-line p-8">
        <p className="text-sm text-fg-faint text-center max-w-xs">
          Pick a component from the left to read its documentation, variants, props and accessibility notes.
        </p>
      </div>
    )
  }

  const Rich = RICH_DOCS[component.key]
  const selected = selectedComponents.includes(component.key)

  return (
    <AnimatePresence mode="wait">
      {Rich ? (
        <motion.div key={component.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <Rich tokens={tokens} selected={selected} onToggle={() => toggleComponent(component.key)} />
        </motion.div>
      ) : (
        <motion.div
          key={component.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-fg">{component.label}</h2>
              <span className="text-[10px] uppercase tracking-widest text-fg-faint">{component.category}</span>
            </div>
            <button
              onClick={() => toggleComponent(component.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                selected ? 'bg-[#0088FF] text-white' : 'bg-elevated text-fg-muted border border-line-strong hover:border-line-strong'
              }`}
            >
              {selected ? '✓ Added to system' : 'Add to system'}
            </button>
          </div>
          <DocPanel component={component} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
