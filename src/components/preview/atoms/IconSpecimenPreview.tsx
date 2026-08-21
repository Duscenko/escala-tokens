import { useMemo, useState } from 'react'
import { UNTITLED_LIBRARY } from '../../../lib/iconLibraries'
import { searchUntitledIcons, untitledIconSvg, copyUntitledIcon, type UntitledIcon } from '../../../lib/untitledIcons'

function UntitledGlyph({ icon, size = 20 }: { icon: UntitledIcon; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block [&>svg]:w-full [&>svg]:h-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: untitledIconSvg(icon) }}
    />
  )
}

// Right-panel specimen for the Icon Library foundation — local Untitled catalog.
export function IconSpecimenPreview({ libraryKey: _libraryKey }: { libraryKey: string }) {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<{ name: string; kind: 'svg' | 'name' } | null>(null)
  const icons = useMemo(() => searchUntitledIcons(query, 60), [query])

  async function copy(icon: UntitledIcon, kind: 'svg' | 'name') {
    await copyUntitledIcon(icon, kind)
    setCopied({ name: icon.name, kind })
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-line bg-surface/50 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{UNTITLED_LIBRARY.label}</p>
          <code className="text-[11px] font-mono text-fg-faint truncate block">{UNTITLED_LIBRARY.npm}</code>
        </div>
        <span className="text-[11px] text-fg-faint flex-shrink-0">{UNTITLED_LIBRARY.count} icons</span>
      </div>

      <div className="relative">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none" aria-hidden>
          <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${UNTITLED_LIBRARY.count} icons…`}
          aria-label="Search icons"
          className="w-full bg-surface border border-line focus:border-fg rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg outline-none transition-colors"
        />
      </div>

      <div className="rounded-xl border border-line bg-surface/40 p-4 min-h-44 text-fg-muted">
        {icons.length === 0 ? (
          <p className="text-xs text-fg-faint text-center py-12">No icons match &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
            {icons.map((icon) => {
              const justCopied = copied?.name === icon.name
              return (
              <button
                key={icon.name}
                onClick={(e) => copy(icon, e.shiftKey ? 'name' : 'svg')}
                title={justCopied
                  ? (copied.kind === 'svg' ? 'SVG copied — paste in Figma' : `${icon.name} copied`)
                  : `${icon.name} — click to copy SVG (paste in Figma). Shift-click copies the export name.`}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
              >
                {justCopied ? (
                  <span className="w-[22px] h-[22px] flex items-center justify-center text-emerald-500 text-[9px] font-semibold uppercase tracking-wide">
                    {copied.kind === 'svg' ? 'SVG' : 'OK'}
                  </span>
                ) : (
                  <UntitledGlyph icon={icon} />
                )}
                <span className="text-[9px] text-fg-faint truncate w-full text-center">{icon.name}</span>
              </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-fg-faint leading-relaxed">
        Click copies SVG — paste into Figma. Shift-click copies the export name.
      </p>
    </div>
  )
}
