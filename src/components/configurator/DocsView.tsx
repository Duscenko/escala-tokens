// Documentation — a docs-site reading experience for every catalogue component
// (createui.co-style architecture): hero Preview/Code, Description, Usage,
// per-axis Examples, Accessibility, Ships in Figma, Related Components and an
// API Reference, with a catalogue sidebar and an "On this page" TOC. Every
// section derives from the ComponentDef data + SPECIMENS registry, so all 58
// components document themselves — no hand-written pages.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COMPONENTS, CATEGORIES, type ComponentDef, type VariantAxis } from '../../lib/componentCatalogue'
import { usePreviewTokens } from '../../lib/previewTokens'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { SPECIMENS, snippetFor, type AxisValues } from './docs/specimens'
import { FigmaShipList } from './ComponentDocPane'

// Categories whose components respond to pointer/keyboard — they get the
// standard keyboard-interaction table in Accessibility.
const INTERACTIVE_CATEGORIES = new Set(['Button & Actions', 'Form Controls', 'Navigation'])

const KEYBOARD_ROWS: { key: string; description: string }[] = [
  { key: 'Tab', description: 'Moves focus to the component (and between its focusable parts).' },
  { key: 'Space', description: 'Activates the focused control.' },
  { key: 'Enter', description: 'Activates the focused control.' },
]

function axisDefaults(def: ComponentDef): AxisValues {
  return Object.fromEntries(def.axes.map((a) => [a.name, a.values[0]]))
}

// ── Copy helpers ──────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg transition-colors whitespace-nowrap"
    >
      {copied ? (
        <><span className="text-emerald-500">✓</span> Copied</>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M3 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2" /></svg>
          {label}
        </>
      )}
    </button>
  )
}

// Markdown for the "Copy Page" affordance — the whole doc as portable context.
function pageMarkdown(def: ComponentDef): string {
  const lines = [
    `# ${def.label}`,
    '',
    `> ${def.description}`,
    '',
    def.usage,
    '',
  ]
  if (def.axes.length) {
    lines.push('## Variants', '', '| Variant | Options | Default |', '|---|---|---|')
    def.axes.forEach((a) => lines.push(`| ${a.name} | ${a.values.join(' · ')} | ${a.values[0]} |`))
    lines.push('')
  }
  if (def.props.length) {
    lines.push('## Props', '', '| Prop | Type | Description |', '|---|---|---|')
    def.props.forEach((p) => lines.push(`| \`${p.name}\` | \`${p.type}\` | ${p.description} |`))
    lines.push('')
  }
  lines.push('## Accessibility', '', def.accessibility)
  return lines.join('\n')
}

// ── Preview / Code tabbed block (hero + per-axis examples) ────────────────────

function PreviewCode({
  tokens,
  code,
  minH = 180,
  children,
}: {
  tokens: PreviewTokens
  code: string
  minH?: number
  children: ReactNode
}) {
  const [view, setView] = useState<'preview' | 'code'>('preview')
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface/60">
        <div className="flex items-center gap-1">
          {(['preview', 'code'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                view === v ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <CopyButton text={code} />
      </div>
      {view === 'preview' ? (
        <div
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 p-8"
          style={{ minHeight: minH, backgroundColor: tokens.surface }}
        >
          {children}
        </div>
      ) : (
        <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed text-fg-muted overflow-x-auto whitespace-pre bg-surface/40" style={{ minHeight: 60 }}>
          {code}
        </pre>
      )}
    </div>
  )
}

// One labeled cell inside an axis example row — the value name is app chrome.
function ExampleCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 min-w-0">
      {children}
      <span className="text-[10px] text-fg-faint">{label}</span>
    </div>
  )
}

// ── Doc sections ──────────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-base font-semibold text-fg scroll-mt-4">
      {children}
    </h3>
  )
}

function AxisExample({ def, axis, tokens }: { def: ComponentDef; axis: VariantAxis; tokens: PreviewTokens }) {
  const Specimen = SPECIMENS[def.key]
  const defaults = axisDefaults(def)
  const code = axis.values
    .map((value) => snippetFor(def, { ...defaults, [axis.name]: value }))
    .join('\n\n')
  return (
    <div className="flex flex-col gap-2.5">
      <h4 id={`axis-${axis.name.toLowerCase()}`} className="text-sm font-semibold text-fg scroll-mt-4">{axis.name}</h4>
      <p className="text-xs text-fg-muted leading-relaxed">
        <code className="font-mono text-[11px]">{axis.name}</code> has {axis.values.length} option{axis.values.length === 1 ? '' : 's'} —{' '}
        {axis.values.join(' · ')}. Defaults to <code className="font-mono text-[11px]">{axis.values[0]}</code>; each option maps 1:1 to
        the Figma variant axis the plugin generates.
      </p>
      <PreviewCode tokens={tokens} code={code}>
        {Specimen
          ? axis.values.map((value) => (
              <ExampleCell key={value} label={value}>
                {Specimen({ t: tokens, v: { ...defaults, [axis.name]: value } })}
              </ExampleCell>
            ))
          : <span className="text-xs text-fg-faint">No live preview for this component yet.</span>}
      </PreviewCode>
    </div>
  )
}

function KeyboardTable() {
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[100px_1fr] gap-4 px-4 py-2 border-b border-line bg-surface/60 text-[10px] uppercase tracking-wider text-fg-faint">
        <span>Key</span>
        <span>Description</span>
      </div>
      <div className="divide-y divide-line/60">
        {KEYBOARD_ROWS.map((row) => (
          <div key={row.key} className="grid grid-cols-[100px_1fr] gap-4 px-4 py-2.5 items-center">
            <kbd className="justify-self-start text-[10px] font-mono px-1.5 py-0.5 rounded border border-line-strong bg-elevated text-fg-muted">
              {row.key}
            </kbd>
            <span className="text-xs text-fg-muted leading-relaxed">{row.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApiPropsTable({ def }: { def: ComponentDef }) {
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-4 px-4 py-2 border-b border-line bg-surface/60 text-[10px] uppercase tracking-wider text-fg-faint">
        <span>Prop</span>
        <span>Type</span>
        <span>Description</span>
      </div>
      <div className="divide-y divide-line/60">
        {def.props.map((prop) => (
          <div key={prop.name} className="grid grid-cols-[1fr_1fr_1.6fr] gap-4 px-4 py-2.5 items-start">
            <code className="text-xs text-[#5AADFF] font-mono break-all">{prop.name}</code>
            <code className="text-[10px] text-fg-faint font-mono break-all" title={prop.type}>{prop.type}</code>
            <p className="text-xs text-fg-muted leading-snug">{prop.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApiVariantsTable({ def }: { def: ComponentDef }) {
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 px-4 py-2 border-b border-line bg-surface/60 text-[10px] uppercase tracking-wider text-fg-faint">
        <span>Variant</span>
        <span>Options</span>
        <span>Default</span>
      </div>
      <div className="divide-y divide-line/60">
        {def.axes.map((axis) => (
          <div key={axis.name} className="grid grid-cols-[1fr_2fr_1fr] gap-4 px-4 py-2.5 items-start">
            <code className="text-xs text-[#5AADFF] font-mono">{axis.name}</code>
            <div className="flex flex-wrap gap-1">
              {axis.values.map((v) => (
                <code key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-elevated/80 border border-line text-fg-muted">
                  "{v}"
                </code>
              ))}
            </div>
            <code className="text-[10px] font-mono text-fg-muted">"{axis.values[0]}"</code>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelatedComponents({ def, onOpen }: { def: ComponentDef; onOpen: (key: string) => void }) {
  const related = COMPONENTS.filter((c) => c.category === def.category && c.key !== def.key).slice(0, 4)
  if (!related.length) return null
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading id="related">Related Components</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {related.map((c) => (
          <button
            key={c.key}
            onClick={() => onOpen(c.key)}
            className="text-left rounded-xl border border-line bg-surface/40 p-4 hover:border-line-strong transition-colors"
          >
            <p className="text-xs font-semibold text-fg">{c.label}</p>
            <p className="text-[11px] text-fg-faint leading-relaxed mt-1 line-clamp-2">{c.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── "On this page" TOC (right rail) ───────────────────────────────────────────

interface TocEntry { id: string; label: string; sub?: boolean }

function tocFor(def: ComponentDef): TocEntry[] {
  const entries: TocEntry[] = [
    { id: 'description', label: 'Description' },
    { id: 'usage', label: 'Usage' },
  ]
  if (def.axes.length) {
    entries.push({ id: 'examples', label: 'Examples' })
    def.axes.forEach((a) => entries.push({ id: `axis-${a.name.toLowerCase()}`, label: a.name, sub: true }))
  }
  entries.push(
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'figma', label: 'Figma' },
    { id: 'related', label: 'Related Components' },
    { id: 'api', label: 'API Reference' },
  )
  return entries
}

function OnThisPage({ def, scrollRoot }: { def: ComponentDef; scrollRoot: React.RefObject<HTMLDivElement | null> }) {
  const jump = (id: string) => {
    scrollRoot.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <nav aria-label="On this page" className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-fg-faint mb-1">On this page</span>
      {tocFor(def).map((entry) => (
        <button
          key={entry.id}
          onClick={() => jump(entry.id)}
          className={`text-left text-[12px] py-0.5 transition-colors text-fg-muted hover:text-fg ${entry.sub ? 'pl-3' : ''}`}
        >
          {entry.label}
        </button>
      ))}
    </nav>
  )
}

// ── The doc article ───────────────────────────────────────────────────────────

function DocArticle({
  def,
  tokens,
  onOpen,
}: {
  def: ComponentDef
  tokens: PreviewTokens
  onOpen: (key: string) => void
}) {
  const Specimen = SPECIMENS[def.key]
  const defaults = axisDefaults(def)
  const heroCode = snippetFor(def, defaults)
  const usageCode = `import { ${def.key.replace(/\s+/g, '')} } from "@/components/ui/${def.key.toLowerCase().replace(/\s+/g, '-')}"\n\n${heroCode}`
  const idx = COMPONENTS.findIndex((c) => c.key === def.key)
  const prev = COMPONENTS[idx - 1]
  const next = COMPONENTS[idx + 1]

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb + Copy Page */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
          <span>Home</span>
          <span aria-hidden>/</span>
          <span>Docs</span>
          <span aria-hidden>/</span>
          <span className="text-fg font-medium">{def.label}</span>
        </div>
        <CopyButton text={pageMarkdown(def)} label="Copy Page" />
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5 -mt-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-semibold text-fg">{def.label}</h2>
          <span className="text-[10px] uppercase tracking-widest text-fg-faint mt-1.5">{def.category}</span>
        </div>
        <p className="text-sm text-fg-muted leading-relaxed max-w-xl">{def.description}</p>
      </div>

      {/* Hero preview */}
      <PreviewCode tokens={tokens} code={heroCode} minH={240}>
        {Specimen
          ? Specimen({ t: tokens, v: defaults })
          : <span className="text-xs text-fg-faint">No live preview for this component yet.</span>}
      </PreviewCode>

      {/* Description */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading id="description">Description</SectionHeading>
        <p className="text-[13px] text-fg-muted leading-relaxed">{def.description}</p>
        <p className="text-[13px] text-fg-muted leading-relaxed">{def.usage}</p>
      </section>

      {/* Usage */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading id="usage">Usage</SectionHeading>
        <div className="rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface/60">
            <span className="text-[11px] font-mono text-fg-faint">{def.key.toLowerCase().replace(/\s+/g, '-')}.tsx</span>
            <CopyButton text={usageCode} />
          </div>
          <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed text-fg-muted overflow-x-auto whitespace-pre bg-surface/40">{usageCode}</pre>
        </div>
      </section>

      {/* Examples — one block per variant axis */}
      {def.axes.length > 0 && (
        <section className="flex flex-col gap-5">
          <SectionHeading id="examples">Examples</SectionHeading>
          {def.axes.map((axis) => (
            <AxisExample key={axis.name} def={def} axis={axis} tokens={tokens} />
          ))}
        </section>
      )}

      {/* Accessibility */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading id="accessibility">Accessibility</SectionHeading>
        {INTERACTIVE_CATEGORIES.has(def.category) && <KeyboardTable />}
        <p className="text-[13px] text-fg-muted leading-relaxed">{def.accessibility}</p>
      </section>

      {/* Ships in Figma */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading id="figma">Figma</SectionHeading>
        <FigmaShipList component={def} />
      </section>

      {/* Related */}
      <RelatedComponents def={def} onOpen={onOpen} />

      {/* API Reference */}
      <section className="flex flex-col gap-3">
        <SectionHeading id="api">API Reference</SectionHeading>
        {def.props.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-wider text-fg-faint">Props</p>
            <ApiPropsTable def={def} />
          </>
        )}
        {def.axes.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-wider text-fg-faint mt-1">Variants</p>
            <ApiVariantsTable def={def} />
          </>
        )}
      </section>

      {/* Prev / next pagination */}
      <div className="flex items-stretch justify-between gap-3 pt-2 border-t border-line">
        {prev ? (
          <button
            onClick={() => onOpen(prev.key)}
            className="flex flex-col items-start gap-0.5 rounded-xl border border-line px-4 py-2.5 hover:border-line-strong transition-colors"
          >
            <span className="text-[10px] text-fg-faint">← Previous</span>
            <span className="text-xs font-medium text-fg">{prev.label}</span>
          </button>
        ) : <span />}
        {next ? (
          <button
            onClick={() => onOpen(next.key)}
            className="flex flex-col items-end gap-0.5 rounded-xl border border-line px-4 py-2.5 hover:border-line-strong transition-colors"
          >
            <span className="text-[10px] text-fg-faint">Next →</span>
            <span className="text-xs font-medium text-fg">{next.label}</span>
          </button>
        ) : <span />}
      </div>
    </div>
  )
}

// ── Shell: catalogue sidebar · article · TOC ──────────────────────────────────

export default function DocsView({ previewTheme = 'light', category }: { previewTheme?: string; category?: string }) {
  const tokens = usePreviewTokens(previewTheme)
  const [activeKey, setActiveKey] = useState('Button')
  const [search, setSearch] = useState('')
  const articleRef = useRef<HTMLDivElement>(null)

  const def = COMPONENTS.find((c) => c.key === activeKey) ?? COMPONENTS[0]

  // New component → read from the top.
  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 })
  }, [activeKey])

  // Follow the shared category rail: when it changes, open that category's first
  // component (unless the current article already belongs to it). Keeps the
  // Documentation catalogue in sync with the Components filter for consistency.
  useEffect(() => {
    if (!category) return
    const cur = COMPONENTS.find((c) => c.key === activeKey)
    if (cur && cur.category === category) return
    const first = COMPONENTS.find((c) => c.category === category)
    if (first) setActiveKey(first.key)
  }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase()
  const matches = (c: ComponentDef) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)

  return (
    <div className="h-full flex min-h-0">
      {/* Catalogue sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-line overflow-y-auto p-3 flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components"
          aria-label="Search components"
          className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[12px] text-fg outline-none focus:border-line-strong placeholder:text-fg-faint"
        />
        {CATEGORIES
          // No search → only the category picked in the shared rail; searching
          // spans every category (mirrors the Components master list).
          .filter((cat) => q || !category ? true : cat === category)
          .map((cat) => {
          const items = COMPONENTS.filter((c) => c.category === cat && matches(c))
          if (!items.length) return null
          return (
            <div key={cat} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-fg-faint uppercase tracking-widest px-1">{cat}</span>
              {items.map((comp) => (
                <button
                  key={comp.key}
                  onClick={() => setActiveKey(comp.key)}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-all ${
                    comp.key === def.key
                      ? 'bg-surface shadow-sm text-fg border border-line'
                      : 'text-fg-muted hover:bg-elevated/40 hover:text-fg border border-transparent'
                  }`}
                >
                  {comp.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* Article */}
      <div ref={articleRef} className="flex-1 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={def.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="max-w-3xl mx-auto px-6 lg:px-10 py-8"
          >
            <DocArticle def={def} tokens={tokens} onOpen={setActiveKey} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* On this page */}
      <div className="hidden xl:block w-48 flex-shrink-0 border-l border-line p-5 overflow-y-auto">
        <OnThisPage def={def} scrollRoot={articleRef} />
      </div>
    </div>
  )
}
