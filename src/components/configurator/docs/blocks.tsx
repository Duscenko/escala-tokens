// Shared documentation blocks — used by BOTH article kinds the docs site
// renders: a foundation page (`foundationDocs.tsx`) and a component page
// (`componentArticle.tsx`).
//
// They live here rather than in either article because the whole point of the
// merged docs site is that a foundation and a component read as the same kind
// of page: same breadcrumb, same Copy Page, same section headings, same code
// block, same TOC, same prev/next. Two copies of these would let the two halves
// drift apart exactly the way the old Documentation/Components split did.

import { useState, type ReactNode } from 'react'

// ── Copy ─────────────────────────────────────────────────────────────────────

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
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

// ── Page chrome ──────────────────────────────────────────────────────────────

/** Breadcrumb + page actions. `kind` is the middle crumb — "Foundations" or a
 *  component category — so both article kinds sit in the same hierarchy. */
export function DocHeader({
  kind, title, actions,
}: { kind: string; title: string; actions: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* The MIDDLE crumb is the one that drops on a narrow window, not the
          page's own name: with the rail, the master list and the TOC all
          claiming width, three crumbs plus the actions truncated to
          "Documentation / B… / B", which names nothing. The section and the
          page survive at every width; the group in between is already visible
          in the rail. */}
      <div className="flex items-center gap-1.5 text-[11px] text-fg-faint min-w-0">
        <span className="flex-shrink-0">Documentation</span>
        <span aria-hidden className="hidden lg:inline flex-shrink-0">/</span>
        <span className="hidden lg:inline truncate">{kind}</span>
        <span aria-hidden className="flex-shrink-0">/</span>
        <span className="text-fg font-medium truncate">{title}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
    </div>
  )
}

export function DocTitle({
  title, eyebrow, lead, meta,
}: { title: string; eyebrow: string; lead: string; meta?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 -mt-3">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h2 className="text-2xl font-semibold text-fg">{title}</h2>
        <span className="text-[10px] uppercase tracking-widest text-fg-faint mt-1.5">{eyebrow}</span>
        {meta && <span className="mt-1.5">{meta}</span>}
      </div>
      {/* The lead paragraph IS the "Description"/"Overview" section — it carries
          the TOC anchor rather than a second block repeating the same string. */}
      <Prose id="description" text={lead} className="text-sm text-fg-muted leading-relaxed max-w-xl scroll-mt-4" />
    </div>
  )
}

/** Prose with `inline code` spans. The foundation pages describe tokens by
 *  NAME constantly ("`sm` for a resting card"), and a paragraph that prints its
 *  own backticks reads as an unrendered markdown file. Split-on-backtick rather
 *  than a markdown dependency: this is the only formatting these strings use,
 *  and keeping it to one rule means the prose can't grow syntax the renderer
 *  silently drops. */
export function Prose({ id, text, className = '' }: { id?: string; text: string; className?: string }) {
  const parts = text.split('`')
  return (
    <p id={id} className={className}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <code key={i} className="font-mono text-[0.92em] px-1 py-0.5 rounded bg-elevated/70 border border-line text-fg">{part}</code>
          : <span key={i}>{part}</span>,
      )}
    </p>
  )
}

export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-base font-semibold text-fg scroll-mt-4">
      {children}
    </h3>
  )
}

/** A prose section: heading + optional paragraph + body. The shape every
 *  numbered section of both article kinds uses. */
export function DocSection({
  id, title, description, children,
}: { id: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <SectionHeading id={id}>{title}</SectionHeading>
      {description && <Prose text={description} className="text-[13px] text-fg-muted leading-relaxed" />}
      {children}
    </section>
  )
}

// ── Code / preview blocks ────────────────────────────────────────────────────

export function BlockChrome({ left, children }: { left: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-line bg-surface/60">
      {left}
      {children}
    </div>
  )
}

export function ViewToggle({
  view, onChange,
}: { view: 'preview' | 'code'; onChange: (v: 'preview' | 'code') => void }) {
  return (
    <div className="flex items-center gap-1">
      {(['preview', 'code'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
            view === v ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function CodePane({ code, minH = 60 }: { code: string; minH?: number }) {
  return (
    <pre
      className="px-4 py-3 text-[11px] font-mono leading-relaxed text-fg-muted overflow-x-auto whitespace-pre bg-surface/40"
      style={{ minHeight: minH }}
    >
      {code}
    </pre>
  )
}

/** A titled, copyable code block — the "Usage" snippet on every page. */
export function CodeBlock({ file, code }: { file: string; code: string }) {
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <BlockChrome left={<span className="text-[11px] font-mono text-fg-faint truncate">{file}</span>}>
        <CopyButton text={code} />
      </BlockChrome>
      <CodePane code={code} />
    </div>
  )
}

/** A specimen surface with a Preview/Code toggle. Used by the component page's
 *  per-axis Examples and by any foundation section that has code worth showing
 *  next to the specimen. */
export function PreviewCode({
  surface, code, minH = 180, children,
}: { surface?: string; code: string; minH?: number; children: ReactNode }) {
  const [view, setView] = useState<'preview' | 'code'>('preview')
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <BlockChrome left={<ViewToggle view={view} onChange={setView} />}>
        <CopyButton text={code} />
      </BlockChrome>
      {view === 'preview' ? (
        <div
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 p-8"
          style={{ minHeight: minH, backgroundColor: surface }}
        >
          {children}
        </div>
      ) : (
        <CodePane code={code} />
      )}
    </div>
  )
}

export function ExampleCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 min-w-0">
      {children}
      <span className="text-[10px] text-fg-faint">{label}</span>
    </div>
  )
}

/** The "Under the hood" card — what this page's tokens are CALLED in the three
 *  places they ship: tokens.json, variables.css, Figma. It exists because the
 *  handoff question is never "what colour is it" but "what do I type". */
export function ShipsAs({
  json, css, figma,
}: { json: string; css: string; figma: string }) {
  const rows: [string, string][] = [
    ['tokens.json', json],
    ['variables.css', css],
    ['Figma', figma],
  ]
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={`grid grid-cols-[110px_1fr] gap-4 px-4 py-2.5 items-baseline ${i ? 'border-t border-line/60' : ''}`}
        >
          <span className="text-[10px] uppercase tracking-wider text-fg-faint">{label}</span>
          <span className="text-[12px] font-mono text-fg-muted break-all">{value}</span>
        </div>
      ))}
    </div>
  )
}

/** Small count pill next to a page title ("32 tokens"). */
export function CountBadge({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-elevated/80 text-fg-faint border border-line">
      {children}
    </span>
  )
}

// ── "On this page" TOC ───────────────────────────────────────────────────────

export interface TocEntry { id: string; label: string; sub?: boolean }

export function OnThisPage({
  entries, scrollRoot,
}: { entries: TocEntry[]; scrollRoot: React.RefObject<HTMLDivElement | null> }) {
  const jump = (id: string) => {
    scrollRoot.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <nav aria-label="On this page" className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-fg-faint mb-1">On this page</span>
      {entries.map((entry) => (
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

// ── Prev / next ──────────────────────────────────────────────────────────────

export function Pager({
  prev, next, onOpen,
}: {
  prev?: { key: string; label: string }
  next?: { key: string; label: string }
  onOpen: (key: string) => void
}) {
  return (
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
  )
}
