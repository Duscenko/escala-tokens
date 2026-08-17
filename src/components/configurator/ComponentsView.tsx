// Components — the component catalogue: rail categories (owned by
// `Configurator`'s outer `SectionRail`) → a master list of that category's
// components → one canonical page per component, with an "On this page" TOC.
//
// This used to be HALF of `DocumentationView` (the "Categories" branch,
// alongside a "Foundations" branch). The two were split back into separate
// top-nav destinations — Components and Docs — so a designer reaching for the
// component catalogue doesn't land in a rail that also lists token
// foundations, and vice versa. The article renderer itself
// (`docs/componentArticle.tsx`) is unchanged and still the single source for
// what a component page contains.

import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../lib/componentCatalogue'
import { usePreviewTokens } from '../../lib/previewTokens'
import { OnThisPage } from './docs/blocks'
import { ComponentArticle, componentToc } from './docs/componentArticle'

function CatalogueCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M2 5.2 4 7.2 8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ComponentsView({
  previewTheme = 'light', category, search = '', active, onSelect,
}: {
  previewTheme?: string
  /** Active rail entry — a component category name, owned by Configurator's
   *  outer `SectionRail`. */
  category: string
  /** Current value of the CenterHeader search box. This view never renders the
   *  input itself — it sits on the header's line, next to the title. */
  search?: string
  active: ComponentDef | null
  onSelect: (c: ComponentDef) => void
}) {
  const tokens = usePreviewTokens(previewTheme)
  const selectedComponents = useDesignStore((s) => s.selectedComponents)
  const toggleComponent = useDesignStore((s) => s.toggleComponent)
  const articleRef = useRef<HTMLDivElement>(null)

  const def = active ?? COMPONENTS[0]

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 })
  }, [def.key])

  // Picking a CATEGORY opens its first component, unless the open one already
  // belongs to it.
  useEffect(() => {
    if (def.category === category) return
    const first = COMPONENTS.find((c) => c.category === category)
    if (first) onSelect(first)
  }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase()
  const groups = useMemo(() => {
    // No search → only the category picked in the rail; searching spans every
    // category, so nothing stays hidden behind the filter.
    return CATEGORIES
      .filter((cat) => (q ? true : cat === category))
      .map((cat) => ({
        cat,
        items: COMPONENTS.filter(
          (c) => c.category === cat && (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [q, category])

  const toc = componentToc(def)

  return (
    <div className="h-full flex min-h-0">
      {/* Master list — grouped by category, with the catalogue's include
          checkboxes. */}
      <div className="w-52 flex-shrink-0 border-r border-line overflow-y-auto p-3 flex flex-col gap-3">
        {groups.length === 0 && (
          <p className="text-[11px] text-fg-faint px-1 pt-1 leading-relaxed">No components match “{search.trim()}”.</p>
        )}
        {groups.map(({ cat, items }) => (
          <div key={cat} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-fg-faint uppercase tracking-widest px-1">{cat}</span>
            {items.map((comp) => {
              const isSelected = selectedComponents.includes(comp.key)
              const isActive = comp.key === def.key
              return (
                <div
                  key={comp.key}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect(comp)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(comp)
                    }
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${
                    isActive
                      ? 'bg-surface shadow-sm text-fg border border-line'
                      : 'text-fg-muted hover:bg-elevated/40 hover:text-fg border border-transparent'
                  }`}
                >
                  <span className="truncate">{comp.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComponent(comp.key)
                    }}
                    className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-fg text-app' : 'bg-elevated border border-line-strong'
                    }`}
                    aria-label={isSelected ? `Remove ${comp.label} from the system` : `Add ${comp.label} to the system`}
                  >
                    {isSelected && <CatalogueCheck />}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Page. Remount-and-fade on `key`, NOT an AnimatePresence exit→enter
          pair: `mode="wait"` holds the outgoing article until its exit
          completes, and that never resolved when this pattern was first tried
          here — the view re-rendered with the new page while the DOM kept the
          old one indefinitely. The shell's own center swap avoids it for the
          same reason. */}
      <div ref={articleRef} className="flex-1 min-w-0 overflow-y-auto">
        <motion.div
          key={def.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="max-w-4xl mx-auto px-6 lg:px-10 py-8"
        >
          <ComponentArticle def={def} tokens={tokens} onOpen={onSelect} />
        </motion.div>
      </div>

      {/* On this page — stays on `xl` (1440px here, see DocsView's note). This
          column has the tightest budget in the app (rail + master list +
          article + TOC), so it's the last one that should drop its threshold. */}
      <div className="hidden xl:block w-48 flex-shrink-0 border-l border-line p-5 overflow-y-auto">
        <OnThisPage entries={toc} scrollRoot={articleRef} />
      </div>
    </div>
  )
}
