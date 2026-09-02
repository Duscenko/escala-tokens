import { useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  ICON_AI_SOURCES,
  PHOSPHOR_LIBRARY,
  DEFAULT_ICON_AI_SOURCE,
  type IconAiSource,
} from '../../lib/iconLibraries'
import { PhosphorIconBrowser } from './PhosphorIconBrowser'
import { sanitizeSvg, slugify } from '../../lib/utils'

const MAX_CUSTOM_ICONS = 50
const MAX_SVG_BYTES = 32 * 1024

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
          <span className="text-caption font-mono tabular-nums text-fg-faint">{customIcons.length}</span>
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
                dangerouslySetInnerHTML={{ __html: icon.svg }}
              />
              <span className="text-micro text-fg-faint truncate w-full text-center">{icon.name}</span>
              <button
                onClick={() => removeCustomIcon(icon.name)}
                aria-label={`Remove ${icon.name}`}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface border border-line text-fg-faint hover:text-status-danger hover:border-status-danger/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-status-warning">{error}</p>}
    </div>
  )
}

function AiSourceRow({ source, selected, onSelect }: { source: IconAiSource; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left rounded-xl border p-3.5 flex flex-col gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
        selected
          ? 'border-fg bg-fg/5 shadow-sm'
          : 'border-line bg-surface/40 hover:border-line-strong hover:bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-fg">{source.label}</h3>
            {source.default ? (
              <span className="text-mini uppercase tracking-wider text-fg-faint">Default</span>
            ) : null}
          </div>
          <p className="text-caption text-fg-muted leading-snug mt-0.5">{source.description}</p>
        </div>
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
      <code className="text-mini font-mono text-fg-faint truncate">{source.repo.replace('https://github.com/', '')}</code>
    </button>
  )
}

export default function IconLibrary() {
  const { iconAiSource, setIconAiSource } = useDesignStore()
  const selectedSource = iconAiSource ?? DEFAULT_ICON_AI_SOURCE

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-line bg-surface/40 p-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-fg">{PHOSPHOR_LIBRARY.label}</h2>
          <span className="text-mini uppercase tracking-wider text-fg-faint">{PHOSPHOR_LIBRARY.style} · {PHOSPHOR_LIBRARY.count}</span>
        </div>
        <p className="text-body text-fg-muted leading-relaxed">{PHOSPHOR_LIBRARY.description}</p>
        <p className="text-caption text-fg-faint">
          <code className="font-mono text-fg-muted">npm i {PHOSPHOR_LIBRARY.npm}</code>
          {' · '}
          <a href={PHOSPHOR_LIBRARY.repo} target="_blank" rel="noreferrer" className="hover:text-fg-muted underline-offset-2 hover:underline">
            GitHub
          </a>
        </p>
      </div>

      <div className="border-t border-line pt-6">
        <PhosphorIconBrowser />
      </div>

      <div className="border-t border-line pt-6 flex flex-col gap-3">
        <div>
          <h3 className="text-base font-semibold text-fg">For AI-generated UI</h3>
          <p className="text-body text-fg-muted leading-relaxed mt-1">
            Escala previews Phosphor above. Pick the icon family a model should install when it generates screens — the choice is written into your Skill and README.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ICON_AI_SOURCES.map((source) => (
            <AiSourceRow
              key={source.key}
              source={source}
              selected={selectedSource === source.key}
              onSelect={() => setIconAiSource(source.key)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-6">
        <CustomIcons />
      </div>
    </div>
  )
}
