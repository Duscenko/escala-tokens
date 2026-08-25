// Docs — Get started (destinations) plus the token reference sheet
// (System reference + one article per foundation). The master list lives in
// `DocsRail` (owned by Configurator); this view is the article + TOC.

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { OnThisPage } from './docs/blocks'
import { FoundationArticle, OverviewArticle, foundationToc, overviewToc } from './docs/foundationArticle'
import { GetStartedArticle, getStartedToc } from './docs/getStartedArticle'
import { isGuideKey, type DocsExits } from './docs/getStarted'
import { useSystemDoc, OVERVIEW_KEY, foundationDoc } from './docs/foundationDocs'
import { ChangelogArticle, changelogToc, CHANGELOG_KEY } from './docs/changelogArticle'

export { OVERVIEW_KEY }
export { GET_STARTED_KEY } from './docs/getStarted'
export { CHANGELOG_KEY } from './docs/changelogArticle'

export default function DocsView({
  activeFoundationKey, onSelectFoundationKey, onEditFoundation, exits,
}: {
  /** Which row of the master list is open — a Get started key, OVERVIEW_KEY
   *  (the whole-system sheet), or a foundation key. */
  activeFoundationKey: string
  onSelectFoundationKey: (key: string) => void
  /** Opens Variables · <foundation> — the "Edit tokens" link on a foundation
   *  page, which is what makes this documentation OF the editor. */
  onEditFoundation: (foundationKey: string) => void
  /** Leaves Docs for Figma / Export / Save / GitHub — the Get started recipes. */
  exits: DocsExits
}) {
  const system = useSystemDoc()
  const articleRef = useRef<HTMLDivElement>(null)

  const guide = isGuideKey(activeFoundationKey)
  const isChangelog = activeFoundationKey === CHANGELOG_KEY
  const doc = !guide && !isChangelog && activeFoundationKey !== OVERVIEW_KEY
    ? foundationDoc(activeFoundationKey)
    : undefined

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 })
  }, [activeFoundationKey])

  const toc = guide
    ? getStartedToc(activeFoundationKey)
    : isChangelog
      ? changelogToc()
      : doc
        ? foundationToc(doc)
        : overviewToc()

  return (
    <div className="h-full flex min-h-0">
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
          {guide ? (
            <GetStartedArticle
              pageKey={activeFoundationKey}
              onOpen={onSelectFoundationKey}
              exits={exits}
            />
          ) : isChangelog ? (
            <ChangelogArticle />
          ) : doc ? (
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
