// Documentation — ONE docs site for the whole system, the createui.co model:
// a single rail with two groups, **Foundations** (every foundation the
// Variables Generator edits) and **Categories** (the component catalogue), both
// opening the same shape of article with the same "On this page" TOC.
//
// It absorbed three former destinations:
//   • Documentation  (DocsView)         — the component catalogue, documented twice
//   • Components     (ComponentDocPane) — the same catalogue, configured
//   • Design Rules   (DesignRules)      — the foundations, as one un-navigable scroll
// so a designer no longer has to know which of three places holds the thing
// they want to read about a system they configure in a fourth.
//
// The rail key is EITHER the Overview sentinel or a component category name —
// `isFoundationKey()` is the only place that distinction is made. Individual
// foundations ('color', 'shadow', …) are NOT rail keys: they're rows in the
// Overview entry's own master list, exactly mirroring how a component
// category's rail entry opens a master list of ITS items. A new foundation is
// one entry in `FOUNDATION_DOCS` and nothing else — the rail, the master list,
// the TOC and prev/next all derive from it.

import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../lib/componentCatalogue'
import { usePreviewTokens } from '../../lib/previewTokens'
import { OnThisPage } from './docs/blocks'
import { ComponentArticle, componentToc } from './docs/componentArticle'
import {
  FoundationArticle, OverviewArticle, foundationToc, overviewToc,
} from './docs/foundationArticle'
import {
  useSystemDoc, FOUNDATION_DOCS, FOUNDATION_KEYS, OVERVIEW_KEY, foundationDoc,
} from './docs/foundationDocs'

export { OVERVIEW_KEY }

/** Every rail key the Foundations group owns — Overview plus the foundations.
 *  Anything else is a component category. */
export function isFoundationKey(key: string | undefined): boolean {
  return key === OVERVIEW_KEY || (!!key && FOUNDATION_KEYS.includes(key))
}

/** The rail groups this view expects. Foundations is a SINGLE entry —
 *  "Overview" — exactly the shape a component category has (one rail button
 *  that opens a master list of its items), not one button per foundation.
 *  Categories come from the component catalogue. `Configurator` supplies the
 *  icons. */
export function docRailGroups(
  foundationIcon: (key: string) => React.ComponentType | undefined,
  categoryIcon: (cat: string) => React.ComponentType | undefined,
) {
  return [
    {
      label: 'Foundations',
      items: [
        { key: OVERVIEW_KEY, label: 'Overview', Icon: foundationIcon(OVERVIEW_KEY) },
      ],
    },
    {
      label: 'Categories',
      items: CATEGORIES.map((cat) => ({ key: cat, label: cat, Icon: categoryIcon(cat) })),
    },
  ]
}

/** Overview's own master list — Overview itself, first (mirrors a category's
 *  first item being auto-opened), then the nine foundations, in the exact
 *  order `FOUNDATION_DOCS` defines them. */
function overviewRows() {
  return [
    { key: OVERVIEW_KEY, label: 'Overview' },
    ...FOUNDATION_DOCS.map((f) => ({ key: f.key, label: f.label })),
  ]
}

function CatalogueCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M2 5.2 4 7.2 8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function DocumentationView({
  previewTheme = 'light', railKey, search = '', active, onSelect, onEditFoundation,
  activeFoundationKey, onSelectFoundationKey,
}: {
  previewTheme?: string
  /** Active rail entry — OVERVIEW_KEY, or a category name. */
  railKey: string
  /** Current value of the CenterHeader search box. This view never renders the
   *  input itself — it sits on the header's line, next to the title. */
  search?: string
  /** Active component, for the component half. */
  active: ComponentDef | null
  onSelect: (c: ComponentDef) => void
  /** Opens Variables · <foundation> — the "Edit tokens" link on a foundation
   *  page, which is what makes this documentation OF the editor. */
  onEditFoundation: (foundationKey: string) => void
  /** Which row of Overview's OWN master list is open — OVERVIEW_KEY (the
   *  whole-system sheet) or a foundation key. Lifted to `Configurator`, same
   *  as `active`/`onSelect` for components, so it survives leaving and
   *  returning to the Documentation tab instead of resetting every visit. */
  activeFoundationKey: string
  onSelectFoundationKey: (key: string) => void
}) {
  const tokens = usePreviewTokens(previewTheme)
  const system = useSystemDoc()
  const selectedComponents = useDesignStore((s) => s.selectedComponents)
  const toggleComponent = useDesignStore((s) => s.toggleComponent)
  const articleRef = useRef<HTMLDivElement>(null)

  const onFoundation = isFoundationKey(railKey)
  const def = active ?? COMPONENTS[0]
  const doc = onFoundation && activeFoundationKey !== OVERVIEW_KEY ? foundationDoc(activeFoundationKey) : undefined

  // Which page is on screen — also the remount key, so switching pages always
  // starts the reader at the top.
  const pageKey = onFoundation ? activeFoundationKey : def.key

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 })
  }, [pageKey])

  // Picking a component CATEGORY opens its first component, unless the open one
  // already belongs to it. Foundation keys are left alone — they have no list.
  useEffect(() => {
    if (onFoundation) return
    if (def.category === railKey) return
    const first = COMPONENTS.find((c) => c.category === railKey)
    if (first) onSelect(first)
  }, [railKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase()
  const groups = useMemo(() => {
    // No search → only the category picked in the rail; searching spans every
    // category, so nothing stays hidden behind the filter.
    return CATEGORIES
      .filter((cat) => (q ? true : cat === railKey))
      .map((cat) => ({
        cat,
        items: COMPONENTS.filter(
          (c) => c.category === cat && (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [q, railKey])

  const toc = onFoundation
    ? (doc ? foundationToc(doc) : overviewToc())
    : componentToc(def)

  return (
    <div className="h-full flex min-h-0">
      {/* Master list — Overview's own second column when browsing Foundations,
          the catalogue's (with its include checkboxes) when browsing a
          Category. Same column, same width, same row shape — a foundation
          used to have no list at all (it "was one page"), which is exactly
          the asymmetry this fixes: Overview now opens a list of its nine
          foundations the same way a category opens a list of its components. */}
      {onFoundation ? (
        <div className="w-52 flex-shrink-0 border-r border-line overflow-y-auto p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-fg-faint uppercase tracking-widest px-1">Foundations</span>
            {overviewRows().map((row) => {
              const isActive = row.key === activeFoundationKey
              return (
                <div
                  key={row.key}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelectFoundationKey(row.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectFoundationKey(row.key)
                    }
                  }}
                  className={`flex items-center px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${
                    isActive
                      ? 'bg-surface shadow-sm text-fg border border-line'
                      : 'text-fg-muted hover:bg-elevated/40 hover:text-fg border border-transparent'
                  }`}
                >
                  <span className="truncate">{row.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
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
      )}

      {/* Page. Remount-and-fade on `key`, NOT an AnimatePresence exit→enter
          pair: `mode="wait"` holds the outgoing article until its exit
          completes, and here that never resolved — the view re-rendered with
          the new page while the DOM kept the old one indefinitely. The shell's
          own center swap avoids it for the same reason. */}
      <div ref={articleRef} className="flex-1 min-w-0 overflow-y-auto">
        <motion.div
          key={pageKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="max-w-4xl mx-auto px-6 lg:px-10 py-8"
        >
          {doc ? (
            <FoundationArticle
              doc={doc}
              system={system}
              onOpen={onSelectFoundationKey}
              onEdit={onEditFoundation}
            />
          ) : onFoundation ? (
            <OverviewArticle system={system} onOpen={onSelectFoundationKey} />
          ) : (
            <ComponentArticle def={def} tokens={tokens} onOpen={onSelect} />
          )}
        </motion.div>
      </div>

      {/* On this page */}
      <div className="hidden xl:block w-48 flex-shrink-0 border-l border-line p-5 overflow-y-auto">
        <OnThisPage entries={toc} scrollRoot={articleRef} />
      </div>
    </div>
  )
}
