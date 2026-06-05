import { useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../lib/componentCatalogue'
import { generateColorScale, accessibleSolidTone } from '../../lib/colorUtils'
import { PRESET_GROUPS } from '../../lib/brandPalette'
import { BRAND_TOKEN_TONES } from './Step3_SemanticTokens'
import ButtonDoc, { type RichDocProps } from './docs/ButtonDoc'
import type { PreviewTokens } from '../preview/ButtonPreview'

// ─── Rich-doc registry ───────────────────────────────────────────────────────
// A component is "enriched" when it has a Storybook-style doc here. The right
// panel routes to it; everything else falls back to the simple DocPanel below.
// To enrich component X: create docs/XDoc.tsx and add `X: XDoc`.
const RICH_DOCS: Record<string, ComponentType<RichDocProps>> = {
  Button: ButtonDoc,
}

// ─── Doc panel ───────────────────────────────────────────────────────────────

function DocPanel({ component, tokens }: { component: ComponentDef; tokens: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'props' | 'a11y'>('overview')

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-line">
        {(['overview', 'props', 'a11y'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px capitalize ${
              activeTab === t
                ? 'text-fg border-[#0088FF]'
                : 'text-fg-faint border-transparent hover:text-fg-muted'
            }`}
          >
            {t === 'a11y' ? 'Accessibility' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
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
                <span
                  key={v}
                  className="text-xs px-2 py-0.5 rounded-full border border-line text-fg-muted"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Props */}
      {activeTab === 'props' && (
        <div className="flex flex-col gap-0 divide-y divide-line/60">
          {component.props.map((prop) => (
            <div key={prop.name} className="py-2.5 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <code className="text-xs text-[#5AADFF] font-mono">{prop.name}</code>
                <code className="text-[10px] text-fg-faint font-mono truncate max-w-[180px]">
                  {prop.type}
                </code>
              </div>
              <p className="text-xs text-fg-faint">{prop.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Accessibility */}
      {activeTab === 'a11y' && (
        <div className="rounded-lg bg-surface border border-line p-3">
          <p className="text-xs text-fg-muted leading-relaxed">{component.accessibility}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ComponentCatalogue() {
  const {
    selectedComponents,
    toggleComponent,
    setSelectedComponents,
    semanticTokens,
    primaryColor,
    setPrimaryColor,
    setPrimaryScale,
    mergeSemanticTokens,
    errorColor,
    grayLightScale,
    radius,
    spacing,
    typography,
  } = useDesignStore()
  // Land on the Button doc by default (the flagship, fully-documented component).
  const [activeComponent, setActiveComponent] = useState<ComponentDef | null>(
    () => COMPONENTS.find((c) => c.key === 'Button') ?? null
  )
  const [brandOpen, setBrandOpen] = useState(false)

  const tokens = {
    primary: semanticTokens['text-brand-primary'] || primaryColor || '#7f56d9',
    surface: semanticTokens['bg-primary'] || '#ffffff',
    text: semanticTokens['text-primary'] || '#101828',
    border: semanticTokens['border-primary'] || '#d0d5dd',
  }

  // Resolved tokens for the live previews — fallbacks cover empty semantic tokens.
  const previewTokens: PreviewTokens = {
    surface: semanticTokens['bg-primary'] || '#ffffff',
    brandSolid: semanticTokens['bg-brand-solid'] || primaryColor || '#7f56d9',
    brandText: semanticTokens['text-brand-primary'] || primaryColor || '#7f56d9',
    onBrand: semanticTokens['text-white'] || '#ffffff',
    neutralFill: semanticTokens['bg-secondary'] || grayLightScale[3] || '#f5f5f5',
    neutralText: semanticTokens['text-primary'] || grayLightScale[11] || '#101828',
    errorColor: errorColor || '#f04438',
    disabledBg: semanticTokens['bg-disabled'] || grayLightScale[3] || '#f5f5f5',
    disabledText: semanticTokens['text-disabled'] || grayLightScale[6] || '#a4a7ae',
    radius,
    spacing,
    typography,
  }

  const ActiveRichDoc = activeComponent ? RICH_DOCS[activeComponent.key] : undefined

  function selectAll() {
    setSelectedComponents(COMPONENTS.map((c) => c.key))
  }
  function clearAll() {
    setSelectedComponents([])
  }
  // Quick brand-color edit from Components — keeps the 12-tone scale in sync
  // (same as Foundations · Color) and live-updates the previews.
  function changeBrand(hex: string) {
    const scale = generateColorScale(hex)
    setPrimaryColor(hex)
    setPrimaryScale(scale)
    // Re-derive already-mapped brand semantic tokens from the new scale so the
    // previews and export reflect the change (Step3 does this on its own when
    // mounted; here we do it inline since Step3 isn't on screen). The solid brand
    // tone is chosen adaptively so the primary button keeps white text accessible.
    const solid = accessibleSolidTone(scale)
    const updates: Record<string, string> = {}
    for (const [key, tone] of Object.entries(BRAND_TOKEN_TONES)) {
      if (!semanticTokens[key]) continue
      const t =
        key === 'bg-brand-solid' ? solid
        : key === 'bg-brand-solid_hover' ? Math.min(solid + 1, 12)
        : tone
      if (scale[t]) updates[key] = scale[t]
    }
    if (Object.keys(updates).length) mergeSemanticTokens(updates)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-fg-faint">
          {selectedComponents.length === 0
            ? 'No components in your system — add the ones you need.'
            : `${selectedComponents.length} of ${COMPONENTS.length} components included`}
        </p>
        <div className="flex items-center gap-2">
          {/* Brand color — curated picker (regenerates the scale + live-updates previews) */}
          <div className="relative">
            <button
              onClick={() => setBrandOpen((v) => !v)}
              title="Change brand color"
              aria-haspopup="true"
              aria-expanded={brandOpen}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-surface border border-line hover:border-line-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF]"
            >
              <span
                className="w-4 h-4 rounded-full ring-1 ring-line-strong flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xs font-mono text-fg-muted">{primaryColor}</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-fg-faint">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {brandOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBrandOpen(false)} />
                <div className="absolute right-0 mt-2 z-50 w-64 rounded-xl border border-line bg-app shadow-xl p-3 flex flex-col gap-2.5">
                  <p className="text-[11px] text-fg-faint leading-snug">
                    Curated brand colors — vetted for accessible scales.
                  </p>
                  {PRESET_GROUPS.map((group) => (
                    <div key={group.label} className="flex items-center gap-2.5">
                      <span className="text-[10px] text-fg-faint uppercase tracking-wider w-12 shrink-0 text-right">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.colors.map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => { changeBrand(c.hex); setBrandOpen(false) }}
                            title={c.label}
                            aria-label={c.label}
                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] ${
                              primaryColor === c.hex ? 'ring-2 ring-[#0088FF] scale-110' : 'ring-1 ring-line-strong'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={selectAll}
            className="text-xs px-2.5 py-1 rounded bg-elevated text-fg-muted hover:bg-line-strong transition border border-line-strong"
          >
            All
          </button>
          <button
            onClick={clearAll}
            className="text-xs px-2.5 py-1 rounded bg-surface text-fg-faint hover:text-fg-muted transition border border-line"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Two-column layout: list + doc panel */}
      <div className="flex gap-4">
        {/* Left: component list */}
        <div className="flex flex-col gap-4 w-56 flex-shrink-0">
          {CATEGORIES.map((cat) => {
            const catComponents = COMPONENTS.filter((c) => c.category === cat)
            if (!catComponents.length) return null
            return (
              <div key={cat} className="flex flex-col gap-1">
                <span className="text-[10px] text-fg-faint uppercase tracking-widest px-1">
                  {cat}
                </span>
                {catComponents.map((comp) => {
                  const isSelected = selectedComponents.includes(comp.key)
                  const isActive = activeComponent?.key === comp.key
                  const openDoc = () => setActiveComponent(activeComponent?.key === comp.key ? null : comp)
                  return (
                    // Row is a div (not button) so the include/remove checkbox button can nest legally.
                    <div
                      key={comp.key}
                      role="button"
                      tabIndex={0}
                      onClick={openDoc}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openDoc()
                        }
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-sm cursor-pointer transition-all ${
                        isActive
                          ? 'bg-elevated text-fg'
                          : 'text-fg-muted hover:bg-surface hover:text-fg'
                      }`}
                    >
                      <span>{comp.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleComponent(comp.key)
                        }}
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-[#0088FF]' : 'bg-elevated border border-line-strong'
                        }`}
                        aria-label={isSelected ? `Remove ${comp.label}` : `Add ${comp.label}`}
                      >
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Right: doc panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeComponent ? (
              ActiveRichDoc ? (
                <motion.div
                  key={activeComponent.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ActiveRichDoc
                    tokens={previewTokens}
                    selected={selectedComponents.includes(activeComponent.key)}
                    onToggle={() => toggleComponent(activeComponent.key)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={activeComponent.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl bg-surface border border-line p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-fg">{activeComponent.label}</h3>
                      <span className="text-[11px] text-fg-faint">{activeComponent.category}</span>
                    </div>
                    <button
                      onClick={() => toggleComponent(activeComponent.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        selectedComponents.includes(activeComponent.key)
                          ? 'bg-[#0088FF] text-white'
                          : 'bg-elevated text-fg-muted border border-line-strong hover:border-line-strong'
                      }`}
                    >
                      {selectedComponents.includes(activeComponent.key) ? '✓ Included' : 'Add'}
                    </button>
                  </div>
                  <DocPanel component={activeComponent} tokens={tokens} />
                </motion.div>
              )
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center rounded-xl border border-dashed border-line p-8"
              >
                <p className="text-sm text-fg-faint text-center">
                  Click a component to see its documentation, variants, props and accessibility notes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected summary */}
      <AnimatePresence>
        {selectedComponents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-surface border border-line p-4"
          >
            <p className="text-xs text-fg-faint uppercase tracking-wider mb-2">
              {selectedComponents.length} component{selectedComponents.length > 1 ? 's' : ''} in your system
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedComponents.map((k) => (
                <span key={k} className="text-xs px-2 py-0.5 rounded bg-[#0088FF]/15 text-[#8FC8FF] font-medium">
                  {k}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
