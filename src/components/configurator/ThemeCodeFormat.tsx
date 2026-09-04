import { Fragment, type KeyboardEvent, type ReactNode, useMemo, useState } from 'react'
import { captureSnapshot, scopeSnapshotToTheme, useDesignStore } from '../../store/useDesignStore'
import { buildCSS, buildMarkdown } from '../../lib/exporters'
import { buildSkillExport } from '../../lib/skillExport'
import { themeDisplayName } from '../../lib/themeSources'
import { useI18n } from '../../lib/i18n'
import { WORKSPACE_CHIP_ACTIVE } from './themeWorkspaceLayout'
import ThemeCodeScopeRail, { CODE_SCOPE_ALL, type CodeThemeScope } from './ThemeCodeScopeRail'
import { myThemeKeys } from './ThemeLibraryRail'

export type { CodeThemeScope }
export { CODE_SCOPE_ALL }

type Format = 'css' | 'markdown' | 'agent'

const FORMATS: { key: Format; label: string; file: string }[] = [
  { key: 'css', label: 'CSS', file: 'variables.css' },
  { key: 'markdown', label: 'Markdown', file: 'README.md' },
  { key: 'agent', label: 'Agent context', file: 'SKILL.md' },
]

const PREVIEW_LINE_LIMIT = 32

function CopyIcon({ done = false }: { done?: boolean }) {
  if (done) {
    return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3.25 8.25 3 3 6.5-6.5" /></svg>
  }
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden><rect x="5.25" y="2.25" width="7.5" height="9" rx="1.5" /><path d="M10.75 12v.75a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5H4" /></svg>
}

function highlightedMarkdown(line: string): ReactNode {
  const heading = line.match(/^(\s*)(#{1,6})(\s+)(.*)$/)
  if (heading) return <><span className="text-fg-faint">{heading[1]}{heading[2]}</span>{heading[3]}<span className="font-semibold text-fg">{heading[4]}</span></>

  const yaml = line.match(/^([a-zA-Z][\w-]*)(:)(.*)$/)
  if (yaml) return <><span className="text-accent-ui">{yaml[1]}</span><span className="text-fg-faint">{yaml[2]}</span><span>{yaml[3]}</span></>

  const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <span key={index} className="text-accent-ui">{part}</span>
    if (part.startsWith('**') && part.endsWith('**')) return <span key={index} className="font-semibold text-fg">{part}</span>
    return <Fragment key={index}>{part}</Fragment>
  })
}

function highlightedCss(line: string): ReactNode {
  if (/^\s*\/\*/.test(line)) return <span className="text-fg-faint">{line}</span>

  const declaration = line.match(/^(\s*)(--[^:]+)(:)(.*?)(;?)$/)
  if (declaration) {
    return <>{declaration[1]}<span className="text-accent-ui">{declaration[2]}</span><span className="text-fg-faint">{declaration[3]}</span><span className="text-fg">{declaration[4]}</span><span className="text-fg-faint">{declaration[5]}</span></>
  }

  const rule = line.match(/^(\s*)([^{}]+)(\s*\{\s*)$/)
  if (rule) return <>{rule[1]}<span className="font-medium text-fg">{rule[2]}</span><span className="text-fg-faint">{rule[3]}</span></>
  if (/^\s*[{}]+\s*$/.test(line)) return <span className="text-fg-faint">{line}</span>
  return line
}

function CodeLine({ value, number, format }: { value: string; number: number; format: Format }) {
  // Agent context is prose (long SKILL.md paragraphs, lists, headings), not a
  // declaration dump. `min-w-max` + `whitespace-pre` on CSS/Markdown is what
  // keeps tables and `--var:` rows intact; the same pair turns Agent context
  // into an infinitely-wide column. Wrap + a prose measure only there.
  const wrap = format === 'agent'
  const heading = wrap && /^#{1,6}\s/.test(value)
  const table = wrap && /^\s*\|/.test(value)
  return (
    <div className={`grid grid-cols-[48px_minmax(0,1fr)] ${wrap ? 'text-caption leading-relaxed' : 'min-w-max text-body leading-[22px]'} ${heading ? 'pt-2.5' : ''}`}>
      <span aria-hidden className="select-none border-r border-line pr-3 text-right font-mono text-fg-faint/70">{number}</span>
      <code className={`px-4 font-mono text-fg-muted ${wrap ? `min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${table ? '' : 'max-w-prose'}` : 'min-w-max whitespace-pre'}`}>{format === 'css' ? highlightedCss(value) : highlightedMarkdown(value)}</code>
    </div>
  )
}

/**
 * Read-only companion to Export. Inspect/copy the same CSS, documentation and
 * agent contract that the existing export flow ships.
 */
export default function ThemeCodeFormat({
  previewTheme,
  scope = CODE_SCOPE_ALL,
  onScopeChange,
  onPreviewThemeChange,
  onOpenThemeLibrary,
  showBreadcrumb = false,
}: {
  previewTheme: string
  scope?: CodeThemeScope
  onScopeChange: (scope: CodeThemeScope) => void
  onPreviewThemeChange: (theme: string) => void
  onOpenThemeLibrary: () => void
  showBreadcrumb?: boolean
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const [format, setFormat] = useState<Format>('css')
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const active = FORMATS.find((item) => item.key === format) ?? FORMATS[0]
  const listed = myThemeKeys(store.themeOrder, store.themes)
  const effectiveScope = scope !== CODE_SCOPE_ALL && listed.includes(scope) ? scope : CODE_SCOPE_ALL
  const scopeToTheme = effectiveScope !== CODE_SCOPE_ALL
  // The top-level Code Format keeps documenting the complete system. Picking
  // one theme narrows to a real snapshot so CSS, Markdown and Agent context
  // remain honest consumers of the same exporter contract.
  const source = useMemo(() => (
    scopeToTheme
      ? scopeSnapshotToTheme(captureSnapshot(store), effectiveScope)
      : store
  ), [store, effectiveScope, scopeToTheme])
  const content = useMemo(() => {
    if (format === 'css') return buildCSS(source as ReturnType<typeof useDesignStore.getState>)
    if (format === 'markdown') return buildMarkdown(source as ReturnType<typeof useDesignStore.getState>)
    return buildSkillExport('hex', source).skillMd
  }, [format, source])
  const lines = useMemo(() => content.split('\n'), [content])
  const visibleLines = expanded ? lines : lines.slice(0, PREVIEW_LINE_LIMIT)
  const scopedLabel = scopeToTheme
    ? themeDisplayName(effectiveScope, store.themeLabels)
    : t('All themes')

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const selectFormat = (key: Format) => {
    setFormat(key)
    setCopied(false)
    setExpanded(false)
  }

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const current = Math.max(0, FORMATS.findIndex((item) => item.key === format))
    const next = (current + (event.key === 'ArrowRight' ? 1 : FORMATS.length - 1)) % FORMATS.length
    selectFormat(FORMATS[next].key)
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    requestAnimationFrame(() => tabs[next]?.focus())
  }

  return (
    <section className="h-full min-h-0 flex bg-app" aria-label="Code format">
      <ThemeCodeScopeRail
        scope={effectiveScope}
        previewTheme={previewTheme}
        onScopeChange={onScopeChange}
        onPreviewThemeChange={onPreviewThemeChange}
        onOpenThemeLibrary={onOpenThemeLibrary}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showBreadcrumb ? <header className="flex-shrink-0 border-b border-line px-5 py-3 foundation-layer-bar">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-mini text-fg-faint"><span>Theme preview</span><span aria-hidden>/</span><span>Code</span><span aria-hidden>/</span><span className="font-medium text-fg">{active.label}</span></nav>
      </header> : null}
      <div className="flex min-h-0 flex-1 p-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-sm">
      <header className="flex min-h-[54px] flex-shrink-0 items-center gap-4 border-b border-line px-3 foundation-layer-bar">
        <div
          className="flex h-8 flex-shrink-0 items-center gap-0.5 rounded-lg border border-line bg-tab-bar p-0.5"
          role="tablist"
          aria-label="Code format"
          onKeyDown={onTabListKeyDown}
        >
          {FORMATS.map((item) => {
            const selected = item.key === format
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectFormat(item.key)}
                className={`h-7 rounded-md px-3 text-caption font-medium transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${selected ? `${WORKSPACE_CHIP_ACTIVE} shadow-sm` : 'text-fg-faint hover:bg-surface hover:text-fg'}`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <div className="min-w-0 truncate text-caption text-fg-faint">
          <span className="font-mono text-fg-muted">{active.file}</span>
          <span className="px-2 text-fg-faint/70" aria-hidden>·</span>
          <span>{scopedLabel}</span>
          <span className="px-2 text-fg-faint/70" aria-hidden>·</span>
          <span>{lines.length} lines</span>
        </div>
        {expanded ? <button type="button" onClick={() => setExpanded(false)} className="ml-auto flex-shrink-0 text-caption font-medium text-fg-faint transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55">Collapse</button> : <span className="ml-auto" />}
        <button type="button" onClick={() => void copy()} className="inline-flex h-8 flex-shrink-0 items-center gap-2 rounded-lg border border-line bg-app px-2.5 text-caption font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55">
          <CopyIcon done={copied} /> {copied ? 'Copied' : 'Copy file'}
        </button>
      </header>
      {/* The fade + "Show full file" is a SIBLING of the scroller, inside a
          `relative` wrapper — it used to be a child of it, `absolute bottom-0`.
          Inside a scroll container that resolves against the UNSCROLLED padding
          box, so the fade rode up with the content the moment you scrolled and
          the last lines rendered past it un-faded (measured: 731px of content
          in a 663px box, so it always overflowed). Out here it is pinned to the
          panel's real bottom edge and stays there at any scroll position.

          The scroller is `bg-app` rather than `bg-app/40` for the same fix. The
          gradient has to END in the exact colour behind it, and `bg-app/40` over
          the card's `--surface` composites to rgb(20.8, 20.8, 22.6) while the
          gradient's solid stop was `--app` rgb(10,10,10) — an OKLab ΔL of 0.051
          between them, larger than most of this app's own elevation steps, so
          it read as a dark BAR across the bottom instead of a dissolve. One
          opaque token on both sides is the only way the two can't disagree. */}
      <div className="relative min-h-0 flex-1">
        <div className={`h-full bg-app py-3 ${format === 'agent' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`} role="region" aria-label={`${active.file} preview`} tabIndex={0}>
          {visibleLines.map((line, index) => <CodeLine key={`${index}-${line}`} value={line} number={index + 1} format={format} />)}
        </div>
        {!expanded && lines.length > PREVIEW_LINE_LIMIT ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-24 items-end justify-center bg-gradient-to-t from-app via-app/90 to-transparent pb-4 pt-8">
            <button type="button" onClick={() => setExpanded(true)} className="pointer-events-auto h-8 rounded-lg border border-line-strong bg-elevated px-3 text-caption font-semibold text-fg shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55">
              Show full file <span className="ml-1 font-normal text-fg-faint">{lines.length} lines</span>
            </button>
          </div>
        ) : null}
      </div>
        </div>
      </div>
      </div>
    </section>
  )
}
