import { useEffect, useState } from 'react'
import { getIconLibrary } from '../../../lib/iconLibraries'
import { useDesignStore } from '../../../store/useDesignStore'

const ICONIFY = 'https://api.iconify.design'

/** Monochrome icon via CSS mask, so it tracks currentColor in both themes. */
function MaskedIcon({ prefix, name, size = 22 }: { prefix: string; name: string; size?: number }) {
  const url = `${ICONIFY}/${prefix}/${name}.svg`
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        backgroundColor: 'currentColor',
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

// Right-panel specimen for the **Icon Library** foundation — full interactive
// browser (search + grid) so the designer can explore the set without leaving
// the preview column.
export function IconSpecimenPreview({ libraryKey }: { libraryKey: string }) {
  const lib = getIconLibrary(libraryKey)
  const prefix = lib?.iconifyPrefix ?? 'lucide'
  const { setIconLibrary } = useDesignStore()

  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState<string[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [copied, setCopied] = useState<string | null>(null)

  // Reset search when the selected library changes.
  useEffect(() => { setQuery('') }, [libraryKey])

  // Debounced search — or sample collection when query is empty.
  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setState('loading')
      try {
        let names: string[]
        if (query.trim()) {
          const res = await fetch(
            `${ICONIFY}/search?query=${encodeURIComponent(query.trim())}&prefix=${prefix}&limit=60`,
            { signal: controller.signal },
          )
          const data = await res.json()
          names = (data.icons ?? []).map((i: string) => i.split(':')[1] ?? i)
        } else {
          const res = await fetch(`${ICONIFY}/collection?prefix=${prefix}`, { signal: controller.signal })
          const data = await res.json()
          const fromCats = data.categories ? (Object.values(data.categories) as string[][]).flat() : []
          names = [...(data.uncategorized ?? []), ...fromCats].slice(0, 60)
        }
        setIcons(names)
        setState('ready')
      } catch {
        if (!controller.signal.aborted) setState('error')
      }
    }, query ? 300 : 0)
    return () => { clearTimeout(t); controller.abort() }
  }, [prefix, query])

  function copyName(name: string) {
    navigator.clipboard.writeText(name)
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Library identity + delete */}
      <div className="rounded-xl border border-line bg-surface/50 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{lib?.label ?? 'Icons'}</p>
          <code className="text-[11px] font-mono text-fg-faint truncate block">{lib?.npm}</code>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-fg-faint">{lib?.count} icons</span>
          <button
            onClick={() => setIconLibrary('lucide')}
            title="Reset to Lucide (default)"
            aria-label="Reset to Lucide"
            className="w-6 h-6 flex items-center justify-center rounded-md text-fg-faint hover:text-red-500 hover:bg-elevated/60 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M10 2 2 10M2 2l8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none" aria-hidden>
          <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${lib?.count ?? ''} icons…`}
          aria-label="Search icons"
          className="w-full bg-surface border border-line focus:border-fg rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg outline-none transition-colors"
        />
      </div>

      {/* Glyph grid */}
      <div className="rounded-xl border border-line bg-surface/40 p-4 min-h-44 text-fg-muted">
        {state === 'loading' && <p className="text-xs text-fg-faint text-center py-12">Loading icons…</p>}
        {state === 'error' && (
          <p className="text-xs text-fg-faint text-center py-12">
            Couldn&apos;t reach the icon service — check your connection.
          </p>
        )}
        {state === 'ready' && icons.length === 0 && (
          <p className="text-xs text-fg-faint text-center py-12">No icons match &ldquo;{query}&rdquo;.</p>
        )}
        {state === 'ready' && icons.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
            {icons.map((name) => (
              <button
                key={name}
                onClick={() => copyName(name)}
                title={copied === name ? 'Copied!' : `${name} — click to copy`}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
              >
                {copied === name ? (
                  <span className="w-[22px] h-[22px] flex items-center justify-center text-emerald-500 text-sm">✓</span>
                ) : (
                  <MaskedIcon prefix={prefix} name={name} size={20} />
                )}
                <span className="text-[9px] text-fg-faint truncate w-full text-center">{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-fg-faint leading-relaxed">
        Live from {lib?.label} via Iconify — click an icon to copy its name.
      </p>
    </div>
  )
}
