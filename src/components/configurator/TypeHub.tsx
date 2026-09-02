import Step4_Typography from './Step4_Typography'
import TypeSemantics, { type TypeFocus } from './TypeSemantics'
import type { ThemeAppearance } from '../../lib/themeModes'

export type TypeTab = 'primary' | 'semantics'

// The workspace owns the primitive/semantic depth. This wrapper only chooses
// Typography's existing table for that depth.
export default function TypeHub({
  mode,
  onFocusChange,
  revealRole,
  railCollapsed = false,
  previewTheme,
  previewAppearance,
  query,
}: {
  mode: TypeTab
  onFocusChange?: (f: TypeFocus) => void
  revealRole?: { key: string; seq: number } | null
  railCollapsed?: boolean
  previewTheme?: string
  previewAppearance?: ThemeAppearance
  query?: string
}) {
  const heading = <span className="text-caption font-semibold uppercase tracking-widest text-fg-muted">{mode === 'semantics' ? 'Type semantics' : 'Typography primitives'}</span>

  return (
    <div className="h-full flex flex-col min-h-0">
      {mode === 'primary' ? (
        <div className="flex-1 min-h-0">
          <Step4_Typography tabBar={heading} query={query} previewTheme={previewTheme} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <TypeSemantics tabBar={heading} onFocusChange={onFocusChange} revealRole={revealRole} railCollapsed={railCollapsed} previewTheme={previewTheme} previewAppearance={previewAppearance} />
        </div>
      )}
    </div>
  )
}
