import { useEffect, useMemo, useState } from 'react'
import {
  PHOSPHOR_WEIGHTS,
  copyPhosphorIcon,
  loadPhosphorWeight,
  phosphorIconSvg,
  searchPhosphorIcons,
  type PhosphorIcon,
  type PhosphorWeight,
} from '../../lib/phosphorIcons'

// The live Phosphor browser — one component, shared by the Icons foundation
// page and the right-panel specimen. Click copies the SVG (paste into Figma);
// shift-click copies the export name. The weight toggle re-renders the grid in
// any of Phosphor's six weights; each weight's glyph bodies are a lazy chunk,
// loaded on first use.

function Glyph({ body, size }: { body: string; size: number }) {
  return (
    <span
      aria-hidden
      className="inline-block [&>svg]:w-full [&>svg]:h-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: phosphorIconSvg(body) }}
    />
  )
}

function WeightToggle({
  value, onChange,
}: {
  value: PhosphorWeight
  onChange: (w: PhosphorWeight) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Icon weight">
      {PHOSPHOR_WEIGHTS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          aria-pressed={w === value}
          className={`px-2 h-6 rounded-md text-mini font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
            w === value ? 'bg-elevated text-fg shadow-sm ring-1 ring-line' : 'text-fg-faint hover:text-fg'
          }`}
        >
          {w}
        </button>
      ))}
    </div>
  )
}

export function PhosphorIconBrowser({
  glyphSize = 22,
  cell = '3.5rem',
}: {
  glyphSize?: number
  /** Min grid-cell width — the specimen panel is narrower than the foundation page. */
  cell?: string
}) {
  const [query, setQuery] = useState('')
  const [weight, setWeight] = useState<PhosphorWeight>('regular')
  const [bodies, setBodies] = useState<Record<string, string> | null>(null)
  const [copied, setCopied] = useState<{ name: string; kind: 'svg' | 'name' } | null>(null)

  const icons = useMemo(() => searchPhosphorIcons(query, 60), [query])

  useEffect(() => {
    let live = true
    loadPhosphorWeight(weight).then((map) => { if (live) setBodies(map) })
    return () => { live = false }
  }, [weight])

  async function copy(icon: PhosphorIcon, kind: 'svg' | 'name') {
    const body = bodies?.[icon.slug]
    if (!body) return
    await copyPhosphorIcon(icon, body, kind)
    setCopied({ name: icon.name, kind })
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-fg">Browse Phosphor Icons</h3>
        <div className="relative w-56">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none" aria-hidden>
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 1,500+ icons…"
            aria-label="Search icons"
            className="w-full bg-surface border border-line focus:border-fg rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg outline-none transition-colors"
          />
        </div>
      </div>

      <WeightToggle value={weight} onChange={setWeight} />

      <div className="rounded-xl border border-line bg-surface/40 p-4 min-h-44">
        {bodies === null ? (
          <p className="text-xs text-fg-faint text-center py-12">Loading {weight}…</p>
        ) : icons.length === 0 ? (
          <p className="text-xs text-fg-faint text-center py-12">No icons match “{query}”.</p>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cell}, 1fr))` }}>
            {icons.map((icon) => {
              const body = bodies[icon.slug]
              const justCopied = copied?.name === icon.name
              return (
                <button
                  key={icon.slug}
                  onClick={(e) => copy(icon, e.shiftKey ? 'name' : 'svg')}
                  title={justCopied
                    ? (copied.kind === 'svg' ? 'SVG copied — paste in Figma' : `${icon.name} copied`)
                    : `${icon.name} — click to copy SVG (paste in Figma). Shift-click copies the export name.`}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                >
                  {justCopied ? (
                    <span className="flex items-center justify-center text-status-success text-micro font-semibold uppercase tracking-wide" style={{ width: glyphSize, height: glyphSize }}>
                      {copied.kind === 'svg' ? 'SVG' : 'OK'}
                    </span>
                  ) : body ? (
                    <Glyph body={body} size={glyphSize} />
                  ) : (
                    <span style={{ width: glyphSize, height: glyphSize }} />
                  )}
                  <span className="text-micro text-fg-faint truncate w-full text-center">{icon.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <p className="text-caption text-fg-faint">
        Click copies SVG — paste into Figma. Shift-click copies the export name.
      </p>
    </div>
  )
}
