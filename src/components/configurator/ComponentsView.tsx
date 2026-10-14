// Components — the component catalogue: categories + rows live in the
// right-hand directory (`ComponentsRail`, owned by Configurator); this view is
// the page card's body — the category's avatar strip over the article.
//
// This used to be HALF of `DocumentationView` (the "Categories" branch,
// alongside a "Foundations" branch). The two were split back into separate
// top-nav destinations — Components and Docs — so a designer reaching for the
// component catalogue doesn't land in a rail that also lists token
// foundations, and vice versa. The article renderer itself
// (`docs/componentArticle.tsx`) is unchanged and still the single source for
// what a component page contains.

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { COMPONENTS, type ComponentDef } from '../../lib/componentCatalogue'
import { usePreviewTokens } from '../../lib/previewTokens'
import { useDesignStore } from '../../store/useDesignStore'
import type { ThemeAppearance } from '../../lib/themeModes'
import { ComponentArticle } from './docs/componentArticle'
import { ComponentAvatarStrip } from './docs/ComponentAvatars'

export default function ComponentsView({
  previewTheme = 'light', active, onSelect, onInspectRole, actionsSlot,
}: {
  previewTheme?: string
  active: ComponentDef | null
  onSelect: (c: ComponentDef) => void
  /** A role named on the open component. Opens that token in Variables. */
  onInspectRole?: (roleId: string) => void
  /** Header node the article's "Copy context to Agents" portals into. */
  actionsSlot?: HTMLElement | null
}) {
  const tokens = usePreviewTokens(previewTheme)
  const themeKind = useDesignStore((s) => s.themeKinds[previewTheme])
  const appearance: ThemeAppearance = themeKind === 'dark' ? 'dark' : 'light'
  const articleRef = useRef<HTMLDivElement>(null)

  const def = active ?? COMPONENTS[0]

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 })
  }, [def.key])

  return (
    <div className="h-full flex min-h-0">
      {/* Page. Remount-and-fade on `key`, NOT an AnimatePresence exit→enter
          pair: `mode="wait"` holds the outgoing article until its exit
          completes, and that never resolved when this pattern was first tried
          here — the view re-rendered with the new page while the DOM kept the
          old one indefinitely. The shell's own center swap avoids it for the
          same reason. The avatar row stays outside that remount so switching
          components in the same category does not rebuild the series. */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <ComponentAvatarStrip
          category={def.category}
          activeKey={def.key}
          tokens={tokens}
          onSelect={onSelect}
        />
        <div ref={articleRef} className="flex-1 min-h-0 overflow-y-auto">
          <motion.div
            key={def.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="max-w-4xl mx-auto px-6 lg:px-10 py-8"
          >
            <ComponentArticle
              def={def}
              tokens={tokens}
              onOpen={onSelect}
              appearance={appearance}
              previewTheme={previewTheme}
              onInspectRole={onInspectRole}
              actionsSlot={actionsSlot}
            />
          </motion.div>
        </div>
      </div>

    </div>
  )
}
