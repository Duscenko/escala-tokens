import type { ComponentType, ReactNode } from 'react'
import LayoutSemantics from './LayoutSemantics'
import type { LayoutFamily } from '../../lib/layoutTokens'
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

export default function LayoutHub({
  family,
  mode,
  Primitives,
  Semantics,
  revealRole,
  railCollapsed = false,
  previewTheme,
  previewAppearance,
  query,
}: {
  family: LayoutFamily
  mode: LayoutTab
  Primitives: ComponentType<{ tabBar?: ReactNode; query?: string; previewTheme?: string }>
  Semantics?: ComponentType<{ family?: LayoutFamily; tabBar?: ReactNode; query?: string; revealRole?: { key: string; seq: number } | null; railCollapsed?: boolean; previewTheme?: string; previewAppearance?: ThemeAppearance }>
  revealRole?: { key: string; seq: number } | null
  railCollapsed?: boolean
  previewTheme?: string
  previewAppearance?: ThemeAppearance
  /** Workspace "Search tokens" string — threaded down so the primitive table
   *  and the semantic list drop their own search + heading bar (see
   *  `VariablesTable`'s `query` prop). */
  query?: string
}) {
  const Sem = Semantics ?? LayoutSemantics
  const heading = <LayoutTabHeading mode={mode} />

  return (
    <div className="h-full flex flex-col min-h-0">
      {mode === 'primary' ? (
        <div className="flex-1 min-h-0">
          <Primitives tabBar={heading} query={query} previewTheme={previewTheme} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <Sem family={family} tabBar={heading} query={query} revealRole={revealRole} railCollapsed={railCollapsed} previewTheme={previewTheme} previewAppearance={previewAppearance} />
        </div>
      )}
    </div>
  )
}
