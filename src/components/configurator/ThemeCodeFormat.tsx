import { Fragment, type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { CONTEXT_SCOPES, useCodeArtifacts, writeClipboard, type ExportFacts } from './codeArtifacts'
import { themeDisplayName } from '../../lib/themeSources'
import { useI18n } from '../../lib/i18n'
import { CONTEXT_APPEARANCES, type ContextAppearance } from '../../lib/contextRequest'
import { brandContext } from '../../lib/contextSource'
import { ContextFilters, useContextOptions } from '../ui/ContextControls'
import type { ThemeAppearance } from '../../lib/themeModes'
import { showToast } from '../ui/Toast'
import { CHROME_CONTROL_ACTIVE, CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL, WORKSPACE_CHIP_ACTIVE } from './themeWorkspaceLayout'
import { ChromeAnchoredDropdown } from './TopNav'
import ThemeCodeScopeRail, { FormatGlyph, resolveCodeTheme, type CodeFormatKey, type CodeThemeScope } from './ThemeCodeScopeRail'
import { myThemeKeys } from './ThemeLibraryRail'

export type { CodeThemeScope }
export { resolveCodeTheme }

type Format = CodeFormatKey

const FORMATS: { key: Format; label: string; file: string }[] = [
  // CSS leads and is the default: "Get code" used to open on Agent context,
  // which is the Agent door's job (design-plans/entry-flow-set-see-ship.md).
  // The shell picks the format for the door that was pressed (`format`).
  { key: 'css', label: 'CSS', file: 'variables.css' },
  // shadcn/ui's own variables, each answered by a Categorical role (E4). An
  // output format, not an architecture: a stock shadcn project pastes it over
  // its globals.css. Components come from the registry (`/r/<name>.json`).
  { key: 'shadcn', label: 'shadcn', file: 'globals.css' },
  { key: 'agent', label: 'Agent context', file: 'references/*.md' },
  // README.md used to be a third format here. It said what Agent context says
  // in a different shape, and two markdown tabs read as "which one do I
  // paste?". It still ships where files ship: Export and GitHub.
]

const PREVIEW_LINE_LIMIT = 32


const COPY_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

export function CopyIcon({ done = false }: { done?: boolean }) {
  if (done) {
    return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3.25 8.25 3 3 6.5-6.5" /></svg>
  }
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden><rect x="5.25" y="2.25" width="7.5" height="9" rx="1.5" /><path d="M10.75 12v.75a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5H4" /></svg>
}


/** Copies the file on screen. The destinations that used to hide in this
 *  button's dropdown are the hand-off strip above the file now. */
/** What the Copy context chevron offers: the appearance to copy, the same
 *  three the Variables popover names. `buildFor` builds the paste for one of
 *  them on the spot, so a pick copies that theme without waiting a render. */
type AppearanceMenu = {
  value: ContextAppearance
  locked: ContextAppearance | null
  onPick: (appearance: ContextAppearance) => void
  buildFor: (appearance: ContextAppearance) => string
}

function CopyPageButton({ disabled, pageContent, block = false, agentContext = false, appearanceMenu }: { disabled: boolean; pageContent: string; block?: boolean; agentContext?: boolean; appearanceMenu?: AppearanceMenu }) {
  // On Agent context the file IS the context, so the button says so.
  const idle = agentContext ? 'Copy context' : 'Copy file'
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const copyText = async (text: string) => {
    if (!(await writeClipboard(text))) {
      showToast(t('Couldn’t copy — try again'))
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
    showToast(agentContext ? t('Copied the agent context. Paste it into any agent.') : t('Copied the file on this page.'))
  }
  // It sits in the file header, whose fill IS the chip's (`--chip-rest`): with
  // no edge the control had no shape, and a hovered or open half lit up as a
  // loose block. The hairline gives the hover and open fills a frame to sit in.
  const edge = 'border border-line'
  const label = (
    <>
      <CopyIcon done={copied} />
      {copied ? t('Copied') : t(idle)}
    </>
  )

  if (!appearanceMenu) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => void copyText(pageContent)}
        className={`inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-caption font-medium text-fg transition-shadow ${CHROME_CONTROL_SHELL} ${edge} ${CHROME_CONTROL_HOVER} disabled:pointer-events-none disabled:opacity-40 ${block ? 'w-full justify-center' : 'flex-shrink-0'} ${COPY_FOCUS}`}
      >
        {label}
      </button>
    )
  }

  // Split button, Export's shape: the label copies what is on screen, the
  // chevron picks which theme to copy.
  const half = `inline-flex h-full items-center transition-shadow ${CHROME_CONTROL_HOVER} disabled:pointer-events-none disabled:opacity-40 ${COPY_FOCUS}`
  return (
    <div ref={rootRef} className={`inline-flex h-8 flex-shrink-0 overflow-hidden rounded-lg text-caption font-medium text-fg ${CHROME_CONTROL_SHELL} ${edge}`}>
      <button type="button" disabled={disabled} onClick={() => void copyText(pageContent)} className={`${half} gap-2 pl-2.5 pr-2`}>
        {label}
      </button>
      <span aria-hidden className="w-px self-stretch bg-line" />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Choose the theme to copy')}
        title={t('Choose the theme to copy')}
        onClick={() => setOpen((v) => !v)}
        className={`${half} w-8 justify-center ${open ? CHROME_CONTROL_ACTIVE : ''}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4.25 6 7.75l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ChromeAnchoredDropdown
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={rootRef}
        align="right"
        gap={6}
        menuAriaLabel={t('Choose the theme to copy')}
        className="w-48 rounded-lg border border-line-strong bg-app p-1 shadow-xl"
      >
        <p className="px-2.5 pb-1 pt-1.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Theme')}</p>
        {CONTEXT_APPEARANCES.map((item) => {
          const selected = (appearanceMenu.locked ?? appearanceMenu.value) === item.key
          const off = !!appearanceMenu.locked && appearanceMenu.locked !== item.key
          return (
            <button
              key={item.key}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              disabled={off}
              title={off ? t('Free ships one theme. Pro ships Light and Dark.') : undefined}
              onClick={() => {
                setOpen(false)
                appearanceMenu.onPick(item.key)
                void copyText(appearanceMenu.buildFor(item.key))
              }}
              className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
            >
              <span className="flex-1">{t(item.label)}</span>
              {selected ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-fg"><path d="m3.25 8.25 3 3 6.5-6.5" /></svg>
              ) : null}
            </button>
          )
        })}
      </ChromeAnchoredDropdown>
    </div>
  )
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

export function CodeLine({ value, number, format }: { value: string; number: number; format: Format }) {
  // Agent context is prose (headings, paragraphs, lists) plus markdown tables,
  // not a declaration dump. `min-w-max` + `whitespace-pre` on CSS/Markdown is
  // what keeps tables and `--var:` rows intact; the same pair turns Agent
  // context into an infinitely-wide column. Wrap + a prose measure only there;
  // table rows keep the pane width so columns stay aligned.
  const wrap = format === 'agent'
  const heading = wrap && /^#{1,6}\s/.test(value)
  const table = wrap && /^\s*\|/.test(value)
  return (
    <div className={`grid grid-cols-[48px_minmax(0,1fr)] ${wrap ? 'text-caption leading-relaxed' : 'min-w-max text-body leading-[22px]'} ${heading ? 'pt-2.5' : ''}`}>
      <span aria-hidden className="select-none border-r border-line pr-3 text-right font-mono text-fg-faint/70">{number}</span>
      <code className={`px-4 font-mono text-fg-muted ${wrap ? `block min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${table ? '' : 'max-w-prose'}` : 'min-w-max whitespace-pre'}`}>{format === 'agent' ? highlightedMarkdown(value) : highlightedCss(value)}</code>
    </div>
  )
}

/**
 * Read-only companion to Export. Inspect/copy the same CSS, documentation and
 * agent contract that the existing export flow ships.
 */
function compactCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(n)
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.5 2.5 11.5 4.5 5 11H3V9l6.5-6.5Z" />
    </svg>
  )
}

/** The library page's theme header: which theme, what its export holds, and
 *  the way back into editing it. The facts read like the reference's stat row
 *  (number over an uppercase caption), the house eyebrow treatment. */
function ThemeExportHeader({ name, facts, onEdit }: { name: string; facts: ExportFacts | null; onEdit: () => void }) {
  const { t } = useI18n()
  // One line of facts under the name, not a stat row: they describe the file,
  // and the file is what this page is for — it gets the height.
  const items = facts
    ? [
        [compactCount(facts.primitives), t('primitives')],
        [compactCount(facts.tokens), t('tokens')],
        [String(facts.modes), t('modes')],
        [compactCount(facts.cssBytes), 'CSS'],
      ]
    : []
  return (
    <header className="flex flex-shrink-0 items-center justify-between gap-4 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="truncate text-title font-semibold text-fg">{name}</h2>
        {items.length ? (
          <p className="mt-0.5 truncate text-caption tabular-nums text-fg-faint">
            {items.map(([value, label], i) => (
              <Fragment key={label}>
                {i > 0 ? <span className="px-1.5 text-fg-faint/60" aria-hidden>·</span> : null}
                <span className="font-medium text-fg-muted">{value}</span> {label}
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-3 text-caption font-medium text-fg transition-shadow ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
      >
        <EditIcon />
        {t('Edit brand')}
      </button>
    </header>
  )
}

export default function ThemeCodeFormat({
  previewTheme,
  previewAppearance,
  scope = '',
  onScopeChange,
  onPreviewThemeChange,
  onBack,
  showBreadcrumb = false,
  showScopeRail = true,
  onEditTheme,
  format: formatProp,
  onFormatChange,
}: {
  /** The format the door that opened this page asked for (CSS or Agent).
   *  Controlled when given; the rail still switches, through `onFormatChange`. */
  format?: Format
  onFormatChange?: (format: Format) => void
  previewTheme: string
  /** Free keeps this appearance. Pro still ships both. */
  previewAppearance?: ThemeAppearance
  scope?: CodeThemeScope
  onScopeChange: (scope: CodeThemeScope) => void
  onPreviewThemeChange: (theme: string) => void
  onBack: () => void
  showBreadcrumb?: boolean
  /** The library page lists the themes in its own rail (the Themes library,
   *  docked in the widget panel's slot), so it hides this page's radio list.
   *  Default true keeps the standalone Get code page unchanged. */
  showScopeRail?: boolean
  /** When set, a theme header with the export's facts and an Edit button sits
   *  above the code. Edit opens the theme where it is edited (Theme preview). */
  onEditTheme?: (theme: string) => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const [localFormat, setLocalFormat] = useState<Format>(formatProp ?? 'css')
  const format = formatProp ?? localFormat
  const setFormat = (next: Format) => { setLocalFormat(next); onFormatChange?.(next) }
  const [expanded, setExpanded] = useState(false)
  const active = FORMATS.find((item) => item.key === format) ?? FORMATS[0]
  const listed = myThemeKeys(store.themeOrder, store.themes)
  const effectiveScope = resolveCodeTheme(listed, scope, previewTheme)
  const artifacts = useCodeArtifacts(effectiveScope, previewAppearance)
  // Agent context is CUT to what the person asked for — scope, theme, detail —
  // and the file on screen is exactly the paste. `all · both · full` is the
  // file this tab always showed (every references/ file, in package order).
  const defaultAppearance = previewAppearance ?? store.themeKinds[effectiveScope ?? ''] ?? 'light'
  const [ctx, setCtx] = useContextOptions('all', defaultAppearance)
  const ctxAppearance = ctx.appearance
  const agentMd = useMemo(() => {
    if (!effectiveScope) return ''
    return brandContext(store, effectiveScope, { scope: ctx.scope, detail: ctx.detail, appearance: ctxAppearance }, store.projectName)
  }, [store, effectiveScope, ctxAppearance, ctx.scope, ctx.detail])
  const content = format === 'css' ? artifacts.css : format === 'shadcn' ? artifacts.shadcn : agentMd
  const lines = useMemo(() => (effectiveScope && content ? content.split('\n') : []), [content, effectiveScope])
  const visibleLines = expanded ? lines : lines.slice(0, PREVIEW_LINE_LIMIT)
  const scopedLabel = effectiveScope
    ? themeDisplayName(effectiveScope, store.themeLabels)
    : t('Add a brand to get its code.')

  const selectFormat = (key: Format) => {
    setFormat(key)
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
      {showScopeRail && (
        <ThemeCodeScopeRail
          scope={effectiveScope}
          previewTheme={previewTheme}
          formats={FORMATS}
          format={format}
          onFormat={selectFormat}
          onScopeChange={onScopeChange}
          onPreviewThemeChange={onPreviewThemeChange}
          onBack={onBack}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {onEditTheme && effectiveScope ? (
          <ThemeExportHeader
            name={scopedLabel}
            facts={artifacts.facts}
            onEdit={() => onEditTheme(effectiveScope)}
          />
        ) : null}
        {showBreadcrumb ? (
          <header className="flex-shrink-0 border-b border-line px-5 py-3 foundation-layer-bar">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-mini text-fg-faint">
              <span>Brand</span><span aria-hidden>/</span><span>Code</span><span aria-hidden>/</span>
              <span className="font-medium text-fg">{active.label}</span>
            </nav>
          </header>
        ) : null}
        <div className="flex min-h-0 flex-1 p-3 pt-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-sm">
            {showScopeRail ? (
              <header className="flex min-h-11 flex-shrink-0 items-center gap-3 border-b border-line px-3 py-1.5">
                {/* On Agent context the bar IS the request: what to send, then
                    what it costs. The file name says nothing a reader acts on. */}
                {format === 'agent' && effectiveScope ? (
                  <div className="min-w-0 flex-1">
                    <ContextFilters
                      layout="row"
                      opts={{ ...ctx, appearance: ctxAppearance }}
                      onChange={(patch) => { setCtx(patch); setExpanded(false) }}
                      scopes={CONTEXT_SCOPES}
                      lockedAppearance={null}
                      // Theme is picked on Copy context's chevron, not here.
                      showAppearance={false}
                    />
                  </div>
                ) : (
                  <p className="min-w-0 flex-1 truncate font-mono text-caption text-fg-muted">{active.file}</p>
                )}
                {format !== 'agent' && lines.length > 0 ? (
                  <span className="flex-shrink-0 text-caption text-fg-muted">{lines.length} lines</span>
                ) : null}
                {expanded ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="flex-shrink-0 text-caption font-medium text-fg-faint transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
                  >
                    Collapse
                  </button>
                ) : null}
                <CopyPageButton
                  disabled={!effectiveScope}
                  pageContent={content}
                  agentContext={format === 'agent'}
                  appearanceMenu={format === 'agent' && effectiveScope ? {
                    value: ctx.appearance,
                    locked: null,
                    onPick: (appearance) => { setCtx({ appearance }); setExpanded(false) },
                    buildFor: (appearance) => brandContext(
                      store, effectiveScope, { scope: ctx.scope, detail: ctx.detail, appearance }, store.projectName,
                    ),
                  } : undefined}
                />
              </header>
            ) : (
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
                      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-caption font-medium transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${selected ? `${WORKSPACE_CHIP_ACTIVE} shadow-sm` : 'text-fg-faint hover:bg-surface hover:text-fg'}`}
                    >
                      <FormatGlyph format={item.key} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="min-w-0 truncate text-caption text-fg-faint">
                <span className="font-mono text-fg-muted">{active.file}</span>
                <span className="px-2 text-fg-faint/70" aria-hidden>·</span>
                <span>{scopedLabel}</span>
                {lines.length ? (
                  <>
                    <span className="px-2 text-fg-faint/70" aria-hidden>·</span>
                    <span>{lines.length} lines</span>
                  </>
                ) : null}
              </div>
              {expanded ? <button type="button" onClick={() => setExpanded(false)} className="ml-auto flex-shrink-0 text-caption font-medium text-fg-faint transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55">Collapse</button> : <span className="ml-auto" />}
              <CopyPageButton disabled={!effectiveScope} pageContent={content} agentContext={format === 'agent'} />
            </header>
            )}
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
                {effectiveScope
                  ? visibleLines.map((line, index) => <CodeLine key={`${index}-${line}`} value={line} number={index + 1} format={format} />)
                  : <p className="px-7 py-2 text-caption text-fg-faint">{t('Add a brand to get its code.')}</p>}
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
