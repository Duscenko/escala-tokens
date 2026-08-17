// Docs — the token reference sheet: Overview (the whole-system sheet) plus one
// article per foundation the Variables Generator edits, in a single
// self-contained page (master list → article → "On this page" TOC). No outer
// rail: unlike Components, Docs has only ONE group of things to list, so a
// second column dedicated to a lone "Overview" button would be a column spent
// on one row. It reaches the same width Variables Generator does by the same
// move — own its whole area under the header instead of reserving an outer
// `SectionRail` column for a single entry.
//
// This used to be HALF of `DocumentationView` (the "Foundations" branch,
// alongside a "Categories" branch feeding the same rail). Split into its own
// top-nav destination — Docs, beside Components — so token reference reading
// doesn't share a rail with the component catalogue. The article renderers
// (`docs/foundationArticle.tsx`, `docs/foundationDocs.tsx`) are unchanged and
// still the single source for what a foundation page contains.

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { OnThisPage } from './docs/blocks'
import { FoundationArticle, OverviewArticle, foundationToc, overviewToc } from './docs/foundationArticle'
import { useSystemDoc, FOUNDATION_DOCS, OVERVIEW_KEY, foundationDoc } from './docs/foundationDocs'

export { OVERVIEW_KEY }

/** The master list — Overview itself, first (mirrors a component category's
 *  first item being auto-opened), then the eight foundations, in the exact
 *  order `FOUNDATION_DOCS` defines them. */
function docsRows() {
  return [
    { key: OVERVIEW_KEY, label: 'Overview' },
    ...FOUNDATION_DOCS.map((f) => ({ key: f.key, label: f.label })),
  ]
}

export default function DocsView({
  activeFoundationKey, onSelectFoundationKey, onEditFoundation,
}: {
  /** Which row of the master list is open — OVERVIEW_KEY (the whole-system
   *  sheet) or a foundation key. */
  activeFoundationKey: string
  onSelectFoundationKey: (key: string) => void
  /** Opens Variables · <foundation> — the "Edit tokens" link on a foundation
   *  page, which is what makes this documentation OF the editor. */
  onEditFoundation: (foundationKey: string) => void
}) {
  const system = useSystemDoc()
  const articleRef = useRef<HTMLDivElement>(null)

  const doc = activeFoundationKey !== OVERVIEW_KEY ? foundationDoc(activeFoundationKey) : undefined

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 })
  }, [activeFoundationKey])

  const toc = doc ? foundationToc(doc) : overviewToc()

  return (
    <div className="h-full flex min-h-0">
      {/* Master list — Overview + the eight foundations. Shares Components'
          catalogue list's SHAPE (grouped caption, active highlight), but not
          its width any more — Components' longest label ("Social Login
          Button", 19 chars) genuinely needs more room than a foundation name
          ever does ("Border Radius", the longest here, is 13). Narrowing
          only this one to what it actually needs frees real width for the
          article/ramps beside it, which is what the previous shared `w-52`
          was costing: `w-52` resolves to 234px under this app's 18px root
          font (13rem × 18, not the 208px a 16px-root reading implies — the
          same drift `min-w-[40rem]` had on the Overview ramps, see that
          fix's comment), so this column was ~74px wider than its own
          content ever asked for. `w-[164px]` is measured, not eyeballed:
          "Border Radius" renders at 82px, +20px row padding (`px-2.5`×2) +
          24px rail padding (`p-3`×2) ≈ 126px floor; 164px leaves ~38px of
          slack for a future longer label without reopening this. */}
      <div className="w-[164px] flex-shrink-0 border-r border-line overflow-y-auto p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-faint uppercase tracking-widest px-1">Foundations</span>
          {docsRows().map((row) => {
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

      {/* Page. Remount-and-fade on `key`, NOT an AnimatePresence exit→enter
          pair — see ComponentsView's identical note; the shell's own center
          swap avoids `mode="wait"` for the same reason. */}
      <div ref={articleRef} className="flex-1 min-w-0 overflow-y-auto">
        <motion.div
          key={activeFoundationKey}
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
          ) : (
            <OverviewArticle system={system} onOpen={onSelectFoundationKey} />
          )}
        </motion.div>
      </div>

      {/* On this page — deliberately still `xl` (= 1440px under the 18px root),
          NOT the shell preview's `min-[1180px]`. Tried lowering it to match and
          measured the cost: the article drops from 972 to 756px, and the
          Overview sheet's ramps (`min-w-[40rem]` inside an `overflow-x-auto`)
          start hiding tones 11–12 behind a scroll. A TOC is navigation; the
          ramps are the content — don't trade the second for the first. */}
      <div className="hidden xl:block w-48 flex-shrink-0 border-l border-line p-5 overflow-y-auto">
        <OnThisPage entries={toc} scrollRoot={articleRef} />
      </div>
    </div>
  )
}
