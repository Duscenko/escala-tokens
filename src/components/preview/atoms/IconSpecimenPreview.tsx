import { PHOSPHOR_LIBRARY } from '../../../lib/iconLibraries'
import { PhosphorIconBrowser } from '../../configurator/PhosphorIconBrowser'

// Right-panel specimen for the Icon Library foundation — the live Phosphor
// browser (with weight toggle), same one the foundation page renders, just at
// a narrower cell size.
export function IconSpecimenPreview({ libraryKey: _libraryKey }: { libraryKey: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-line bg-surface/50 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{PHOSPHOR_LIBRARY.label}</p>
          <code className="text-caption font-mono text-fg-faint truncate block">{PHOSPHOR_LIBRARY.npm}</code>
        </div>
        <span className="text-caption text-fg-faint flex-shrink-0">{PHOSPHOR_LIBRARY.count} · {PHOSPHOR_LIBRARY.style}</span>
      </div>

      <PhosphorIconBrowser glyphSize={20} cell="2.75rem" />
    </div>
  )
}
