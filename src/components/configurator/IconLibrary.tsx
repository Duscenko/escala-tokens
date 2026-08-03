import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { ICON_LIBRARIES, SAMPLE_GLYPHS, getIconLibrary, type IconLibraryDef } from '../../lib/iconLibraries'
import { sanitizeSvg, slugify } from '../../lib/utils'

const ICONIFY = 'https://api.iconify.design'
const MAX_CUSTOM_ICONS = 50
const MAX_SVG_BYTES = 32 * 1024

// ── Live icon browser (Iconify API — one endpoint covers every library) ──────

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

function IconBrowser({ libraryKey }: { libraryKey: string }) {
  const lib = getIconLibrary(libraryKey)
  const prefix = lib?.iconifyPrefix ?? 'lucide'
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState<string[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [copied, setCopied] = useState<string | null>(null)

  // Search (debounced) or default collection sample when the query is empty.
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-fg">Browse {lib?.label ?? 'icons'}</h3>
        <div className="relative w-56">
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
      </div>

      <div className="rounded-xl border border-line bg-surface/40 p-4 min-h-44">
        {state === 'loading' && (
          <p className="text-xs text-fg-faint text-center py-12">Loading icons…</p>
        )}
        {state === 'error' && (
          <p className="text-xs text-fg-faint text-center py-12">
            Couldn't reach the icon service — check your connection and try again.
          </p>
        )}
        {state === 'ready' && icons.length === 0 && (
          <p className="text-xs text-fg-faint text-center py-12">No icons match “{query}”.</p>
        )}
        {state === 'ready' && icons.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1">
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
                  <MaskedIcon prefix={prefix} name={name} />
                )}
                <span className="text-[9px] text-fg-faint truncate w-full text-center">{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-fg-faint">
        Live from the {lib?.label} set via Iconify — click an icon to copy its name.
      </p>
    </div>
  )
}

// ── Custom icons (user-uploaded SVG assets) ──────────────────────────────────

function CustomIcons() {
  const { customIcons, addCustomIcon, removeCustomIcon } = useDesignStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    const rejected: string[] = []
    for (const file of [...files]) {
      if (customIcons.length >= MAX_CUSTOM_ICONS) { rejected.push(`${file.name} (limit of ${MAX_CUSTOM_ICONS} reached)`); break }
      if (file.size > MAX_SVG_BYTES) { rejected.push(`${file.name} (over 32 KB)`); continue }
      const raw = await file.text()
      const clean = sanitizeSvg(raw)
      if (!clean) { rejected.push(`${file.name} (not a valid SVG)`); continue }
      const name = slugify(file.name.replace(/\.svg$/i, '')) || `icon-${customIcons.length + 1}`
      addCustomIcon(name, clean)
    }
    if (rejected.length) setError(`Skipped: ${rejected.join(', ')}`)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-fg">Your icons</h3>
          <span className="text-[11px] font-mono tabular-nums text-fg-faint">{customIcons.length}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          aria-label="Upload SVG icons"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-colors"
        >
          Upload SVGs
        </button>
      </div>

      {customIcons.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border border-dashed border-line-strong bg-surface/30 hover:bg-surface/60 transition-colors p-8 text-center"
        >
          <p className="text-xs text-fg-faint">
            Drop your brand glyphs, logos or one-off icons here — they're exported with your
            tokens and imported into Figma as components.
          </p>
        </button>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1 rounded-xl border border-line bg-surface/40 p-4">
          {customIcons.map((icon) => (
            <div key={icon.name} className="group relative flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-elevated/60 transition-colors">
              <span
                className="w-[22px] h-[22px] text-fg-muted [&>svg]:w-full [&>svg]:h-full"
                // Sanitized by sanitizeSvg() before it ever reaches the store.
                dangerouslySetInnerHTML={{ __html: icon.svg }}
              />
              <span className="text-[9px] text-fg-faint truncate w-full text-center">{icon.name}</span>
              <button
                onClick={() => removeCustomIcon(icon.name)}
                aria-label={`Remove ${icon.name}`}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface border border-line text-fg-faint hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-amber-600">{error}</p>}
    </div>
  )
}

// Foundation section: pick the icon set the design system standardizes on. The
// choice is persisted (store.iconLibrary) and surfaced in tokens.json + README.
function GlyphStrip() {
  return (
    <div className="flex items-center gap-2.5 text-fg-muted">
      {SAMPLE_GLYPHS.map((g) => (
        <svg key={g.name} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={g.path} />
        </svg>
      ))}
    </div>
  )
}

function LibraryCard({ lib, selected, onSelect }: { lib: IconLibraryDef; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left rounded-xl border p-3.5 flex flex-col gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
        selected
          ? 'border-fg bg-fg/5 shadow-sm'
          : 'border-line bg-surface/40 hover:border-line-strong hover:bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-fg">{lib.label}</h3>
            <span className="text-[10px] uppercase tracking-wider text-fg-faint">{lib.style}</span>
          </div>
          <p className="text-[11px] text-fg-muted leading-snug line-clamp-2">{lib.description}</p>
        </div>
        {/* Selected check */}
        <span
          className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            selected ? 'bg-fg text-app' : 'border border-line-strong'
          }`}
        >
          {selected && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.2 4 7.2 8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <GlyphStrip />
        <code className="text-[10px] font-mono text-fg-faint truncate">{lib.npm}</code>
      </div>
    </button>
  )
}

export default function IconLibrary() {
  const { iconLibrary, setIconLibrary } = useDesignStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {ICON_LIBRARIES.map((lib) => (
          <LibraryCard
            key={lib.key}
            lib={lib}
            selected={iconLibrary === lib.key}
            onSelect={() => setIconLibrary(lib.key)}
          />
        ))}
      </div>

      <p className="text-xs text-fg-faint leading-relaxed">
        Your selection is saved with your tokens and noted in the generated <code className="font-mono text-fg-muted">tokens.json</code> and{' '}
        <code className="font-mono text-fg-muted">README.md</code>, so engineers install the same set.
      </p>

      <div className="border-t border-line pt-6">
        <IconBrowser libraryKey={iconLibrary} />
      </div>

      <div className="border-t border-line pt-6">
        <CustomIcons />
      </div>
    </motion.div>
  )
}
