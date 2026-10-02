import type { ComponentType, ReactNode } from 'react'
import LayoutSemantics from './LayoutSemantics'
import type { LayoutFamily, GridViewport } from '../../lib/layoutTokens'
import type { ThemeAppearance } from '../../lib/themeModes'

export type LayoutTab = 'primary' | 'semantics'

/** The table heading every Variables section shows in place of its own title.
 *  Exported because Shadow has no semantic layer (it is not a `LayoutFamily`)
 *  and so never passes through this hub — but its table is still the primitive
 *  list, and calling it "Shadow tokens" while its six neighbours all say
 *  "Primitive tokens" was the only place that vocabulary broke. */
export function LayoutTabHeading({ mode }: { mode: LayoutTab }) {
  return (
    <span className="text-caption font-semibold uppercase tracking-widest text-fg-muted">
      {mode === 'semantics' ? 'Semantic roles' : 'Primitive tokens'}
    </span>
  )
}

/**
 * A lengths foundation's one page: its semantic roles. There is no primitive
 * tab — every number lives in `Dimension primitives`, and these roles are
 * picked from it (see `design-plans/dimension-primitives.md`).
 */
export default function LayoutHub({
  family,
  Semantics,
  revealRole,
  railCollapsed = false,
  previewTheme,
  previewAppearance,
  previewPlatform,
  query,
}: {
  family: LayoutFamily
  Semantics?: ComponentType<{ family?: LayoutFamily; tabBar?: ReactNode; query?: string; revealRole?: { key: string; seq: number } | null; railCollapsed?: boolean; previewTheme?: string; previewAppearance?: ThemeAppearance; previewPlatform?: GridViewport }>
  revealRole?: { key: string; seq: number } | null
  railCollapsed?: boolean
  previewTheme?: string
  previewAppearance?: ThemeAppearance
  previewPlatform?: GridViewport
  /** Workspace "Search tokens" string — threaded down so the semantic list
   *  drops its own search + heading bar. */
  query?: string
}) {
  const Sem = Semantics ?? LayoutSemantics
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <Sem family={family} tabBar={<LayoutTabHeading mode="semantics" />} query={query} revealRole={revealRole} railCollapsed={railCollapsed} previewTheme={previewTheme} previewAppearance={previewAppearance} previewPlatform={previewPlatform} />
      </div>
    </div>
  )
}
