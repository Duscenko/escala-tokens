import { useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  COMPONENT_ICONS,
  ICON_AI_SOURCES,
  PHOSPHOR_LIBRARY,
  DEFAULT_ICON_AI_SOURCE,
  type IconAiSource,
} from '../../lib/iconLibraries'
import { PhosphorIconBrowser } from './PhosphorIconBrowser'
import { phosphorCoreBody, phosphorIconMaskUrl } from '../../lib/phosphorIcons'
import { sanitizeSvg, slugify } from '../../lib/utils'
import { HelpGlyph } from './CodeHowTo'
import { captureSnapshot, type DesignSnapshot } from '../../store/useDesignStore'
import { recordEdit } from '../../lib/editHistory'
import {
  MAX_CUSTOM_ICONS,
  MAX_CUSTOM_ICON_BYTES,
  MAX_SVG_BYTES,
  fitsIconBudget,
  formatKb,
  iconBudget,
  overIconBudget,
} from '../../lib/customIconLimits'

function CustomIcons() {
  const { customIcons, addCustomIcon, removeCustomIcons } = useDesignStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  // Selection mode: click tiles to pick, then remove them together. Removing
  // 1,000 icons one × at a time was the reported problem.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirmAll, setConfirmAll] = useState(false)
  const [help, setHelp] = useState(false)
  // The way back from a removal, in place: the Board's Undo is a tab away.
  const [undo, setUndo] = useState<{ icons: { name: string; svg: string }[]; count: number } | null>(null)
  const budget = iconBudget(customIcons)
  const over = overIconBudget(budget)

  function remove(names: string[], label: string) {
    if (!names.length) return
    const before = captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)
    setUndo({ icons: useDesignStore.getState().customIcons, count: names.length })
    removeCustomIcons(names)
    recordEdit(before, label)
    setSelected(new Set())
    setSelecting(false)
    setConfirmAll(false)
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    setUndo(null)
    // The budget is tracked HERE, across the batch: the render's `customIcons`
    // does not change while this loop runs, so reading its length let a single
    // upload of 1,173 files straight past a limit of 50.
    let b = iconBudget(useDesignStore.getState().customIcons)
    const rejected: string[] = []
    let stoppedAt: number | null = null
    const list = [...files]
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      if (file.size > MAX_SVG_BYTES * 4) { rejected.push(`${file.name} (over ${formatKb(MAX_SVG_BYTES)})`); continue }
      const clean = sanitizeSvg(await file.text())
      if (!clean) { rejected.push(`${file.name} (not a valid SVG)`); continue }
      const icons = useDesignStore.getState().customIcons
      const name = slugify(file.name.replace(/\.svg$/i, '')) || `icon-${icons.length + 1}`
      const replacing = icons.find((ic) => ic.name === name)?.svg
      const why = fitsIconBudget(b, clean, replacing)
      if (why === 'size') { rejected.push(`${file.name} (over ${formatKb(MAX_SVG_BYTES)})`); continue }
      if (why) { stoppedAt = i; break }
      addCustomIcon(name, clean)
      b = { count: b.count + (replacing === undefined ? 1 : 0), bytes: b.bytes - (replacing?.length ?? 0) + clean.length }
    }
    const notes: string[] = []
    if (stoppedAt !== null) {
      notes.push(`${(list.length - stoppedAt).toLocaleString()} not added: the beta keeps ${MAX_CUSTOM_ICONS} icons (${formatKb(MAX_CUSTOM_ICON_BYTES)}) per design system.`)
    }
    if (rejected.length) notes.push(`Skipped: ${rejected.slice(0, 5).join(', ')}${rejected.length > 5 ? ` and ${rejected.length - 5} more` : ''}.`)
    if (notes.length) setError(notes.join(' '))
    if (fileRef.current) fileRef.current.value = ''
  }

  const full = budget.count >= MAX_CUSTOM_ICONS || budget.bytes >= MAX_CUSTOM_ICON_BYTES

  return (
    <section aria-labelledby="icons-yours-heading" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 id="icons-yours-heading" className="whitespace-nowrap text-ui font-semibold text-fg">Your icons</h2>
          <span
            className={`whitespace-nowrap text-mini font-mono tabular-nums ${over ? 'text-status-warning' : 'text-fg-faint'}`}
            title={`${formatKb(budget.bytes)} of ${formatKb(MAX_CUSTOM_ICON_BYTES)}`}
          >
            {budget.count.toLocaleString()}/{MAX_CUSTOM_ICONS}
          </span>
          <button
            type="button"
            onClick={() => setHelp((v) => !v)}
            aria-expanded={help}
            aria-controls="icons-limits-help"
            aria-label="About the icon limits"
            title="About the icon limits"
            className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${help ? 'bg-elevated text-fg' : 'text-fg-faint hover:bg-elevated hover:text-fg'}`}
          >
            <HelpGlyph />
          </button>
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
        <div className="ml-auto flex items-center gap-0.5">
          {customIcons.length > 0 && (
            <button
              type="button"
              onClick={() => { setSelecting((v) => !v); setSelected(new Set()); setConfirmAll(false) }}
              aria-pressed={selecting}
              className="h-7 whitespace-nowrap rounded-lg px-1.5 text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              {selecting ? 'Done' : 'Select'}
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={full}
            title={full ? `The beta keeps ${MAX_CUSTOM_ICONS} icons (${formatKb(MAX_CUSTOM_ICON_BYTES)}) per design system` : undefined}
            aria-label="Upload SVG icons"
            className="h-7 whitespace-nowrap rounded-lg px-2 text-caption font-medium bg-fg text-app transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            Upload
          </button>
        </div>
      </div>

      {help && (
        <div id="icons-limits-help" className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface/60 p-3 text-caption leading-relaxed text-fg-muted">
          <p className="font-medium text-fg">Your icons in the beta</p>
          <p>
            Each design system keeps up to <span className="text-fg">{MAX_CUSTOM_ICONS} icons</span> and{' '}
            <span className="text-fg">{formatKb(MAX_CUSTOM_ICON_BYTES)}</span> in total, at most{' '}
            {formatKb(MAX_SVG_BYTES)} per icon. You are using {budget.count.toLocaleString()} ({formatKb(budget.bytes)}).
          </p>
          <p>
            They are for brand glyphs, logos and one-off marks. The full icon library is Phosphor ({PHOSPHOR_LIBRARY.count}), already included and not counted here.
          </p>
          <p>
            Your icons travel with the system: your account, every saved copy, and the tokens file your Figma sync reads. The limit keeps all of them fast.
          </p>
          <p>Use <span className="text-fg">Select</span> to remove several at once. A larger allowance is planned for Pro.</p>
        </div>
      )}

      {over && (
        <p className="px-1 text-caption leading-relaxed text-status-warning">
          {budget.count.toLocaleString()} icons ({formatKb(budget.bytes)}). The beta keeps {MAX_CUSTOM_ICONS} icons
          and {formatKb(MAX_CUSTOM_ICON_BYTES)} per design system — remove some to save it to your account and sync it.
        </p>
      )}

      {selecting && (() => {
        const all = customIcons.length > 0 && selected.size === customIcons.length
        const btn = 'h-6 whitespace-nowrap rounded-md px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
        const danger = `${btn} font-medium bg-status-danger-solid text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`
        return (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface/60 px-2 py-1.5">
            {confirmAll ? (
              <>
                <span className="text-caption text-fg">Remove all {customIcons.length.toLocaleString()}?</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setConfirmAll(false)} className={`${btn} text-fg-muted hover:text-fg`}>Cancel</button>
                  <button type="button" onClick={() => remove(customIcons.map((i) => i.name), 'Remove all icons')} className={danger}>
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelected(all ? new Set() : new Set(customIcons.map((i) => i.name)))}
                  className={`${btn} -ml-1 text-fg-muted hover:text-fg`}
                >
                  {all ? 'Clear' : 'Select all'}
                </button>
                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => (all ? setConfirmAll(true) : remove([...selected], `Remove ${selected.size} icons`))}
                  className={`${danger} tabular-nums`}
                >
                  {all ? `Remove all ${selected.size.toLocaleString()}` : selected.size ? `Remove ${selected.size.toLocaleString()}` : 'Remove'}
                </button>
              </>
            )}
          </div>
        )
      })()}

      {customIcons.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-dashed border-line-strong bg-surface/30 hover:bg-surface/60 transition-colors px-3 py-5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <p className="text-caption leading-relaxed text-fg-faint">
            Drop your brand glyphs, logos or one-off icons here — up to {MAX_CUSTOM_ICONS}. They're exported with your
            tokens and imported into Figma as components.
          </p>
        </button>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1 rounded-lg border border-line bg-surface/40 p-2">
          {customIcons.map((icon) => {
            const picked = selected.has(icon.name)
            const glyph = (
              <>
                <span
                  className="w-[22px] h-[22px] text-fg-muted [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
                <span className="text-micro text-fg-faint truncate w-full text-center">{icon.name}</span>
              </>
            )
            return selecting ? (
              <button
                key={icon.name}
                type="button"
                onClick={() => toggle(icon.name)}
                aria-pressed={picked}
                aria-label={`Select ${icon.name}`}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  picked ? 'bg-accent-ui/10 ring-1 ring-accent-ui' : 'hover:bg-elevated/60'
                }`}
              >
                {glyph}
              </button>
            ) : (
              <div key={icon.name} className="group relative flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-elevated/60 transition-colors">
                {glyph}
                <button
                  onClick={() => remove([icon.name], `Remove ${icon.name}`)}
                  aria-label={`Remove ${icon.name}`}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface border border-line text-fg-faint hover:text-status-danger hover:border-status-danger/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8"/></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
      {undo && (
        <p className="flex items-center gap-2 px-1 text-caption text-fg-muted" role="status">
          {undo.count === 1 ? '1 icon removed.' : `${undo.count.toLocaleString()} icons removed.`}
          <button
            type="button"
            onClick={() => { useDesignStore.setState({ customIcons: undo.icons }); setUndo(null) }}
            className="font-medium text-fg underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded-sm"
          >
            Undo
          </button>
        </p>
      )}
      {error && <p className="px-1 text-caption text-status-warning">{error}</p>}
    </section>
  )
}

function AiSourceRow({ source, selected, onSelect }: { source: IconAiSource; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left rounded-lg border px-3 py-2.5 flex flex-col gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
        selected
          ? 'border-fg bg-fg/5 shadow-sm'
          : 'border-line bg-surface/40 hover:border-line-strong hover:bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-body font-semibold text-fg">{source.label}</h3>
            {source.default ? (
              <span className="text-mini uppercase tracking-wider text-fg-faint">Default</span>
            ) : null}
          </div>
          <p className="text-caption text-fg-muted leading-snug mt-0.5 line-clamp-2">{source.description}</p>
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

/** The generic icons components embed (close, check, eye…) — the same list the
 *  Figma plugin builds as `icon/<name>` components (`lib/componentIcons.json`). */
function ComponentIconSet() {
  const groups = [...new Set(COMPONENT_ICONS.map((i) => i.group))]
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-fg">Component icons</h3>
        <p className="text-body text-fg-muted leading-relaxed mt-1">
          {COMPONENT_ICONS.length} Phosphor glyphs the components use: a dialog's close, a password's eye, a select's chevron. The Figma plugin ships them as <code className="font-mono text-fg-muted">icon/&lt;name&gt;</code> components, embedded in the components that need them.
        </p>
      </div>
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-fg-faint">{group}</span>
          <ul className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
            {COMPONENT_ICONS.filter((i) => i.group === group).map((icon) => {
              const body = phosphorCoreBody(icon.slug)
              const mask = body ? phosphorIconMaskUrl(body) : undefined
              return (
                <li
                  key={icon.name}
                  title={`${icon.use} · Phosphor ${icon.component}`}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-surface/40 px-2 py-2.5"
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 bg-fg"
                    style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat' }}
                  />
                  <span className="text-caption text-fg-muted truncate max-w-full">{icon.name}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function IconLibrary() {
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
        <ComponentIconSet />
      </div>

      <div className="border-t border-line pt-6">
        <PhosphorIconBrowser />
      </div>
    </div>
  )
}

/**
 * The Icons page's settings, in the inspector beside it (where every other
 * foundation lists its groups): which family a model installs, and the user's
 * own SVGs. The page keeps what is browsed — Phosphor and the component set.
 */
export function IconLibraryPanel() {
  const { iconAiSource, setIconAiSource } = useDesignStore()
  const selectedSource = iconAiSource ?? DEFAULT_ICON_AI_SOURCE

  return (
    <div className="flex flex-col">
      <section aria-labelledby="icons-ai-heading" className="flex flex-col gap-2">
        <div className="px-1">
          <h2 id="icons-ai-heading" className="text-ui font-semibold text-fg">For AI-generated UI</h2>
          <p className="mt-1 text-caption leading-relaxed text-fg-faint">
            The icon family a model installs when it generates screens. Written into your Skill and README.
          </p>
        </div>
        <div className="flex flex-col gap-1.5" role="group" aria-label="Icon family for AI-generated UI">
          {ICON_AI_SOURCES.map((source) => (
            <AiSourceRow
              key={source.key}
              source={source}
              selected={selectedSource === source.key}
              onSelect={() => setIconAiSource(source.key)}
            />
          ))}
        </div>
      </section>
      <div className="my-3 h-px bg-line" aria-hidden />
      <CustomIcons />
    </div>
  )
}
