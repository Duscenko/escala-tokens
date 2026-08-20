// The foundation article — the same page shape a component article has, so the
// docs site reads as one thing: breadcrumb · title · Overview · Why · Usage ·
// the foundation's own sections · Ships as · prev/next, with the TOC on the
// right. Content and token bodies come from `foundationDocs.tsx`.

import { type ReactNode } from 'react'
import {
  CopyButton, DownloadSkillButton, DocHeader, DocTitle, DocSection, CodeBlock, ShipsAs, CountBadge,
  Pager, type TocEntry,
} from './blocks'
import {
  FOUNDATION_DOCS, OVERVIEW_KEY, foundationDoc, foundationMarkdown,
  type FoundationDoc, type SystemDoc,
} from './foundationDocs'

/** "Edit in Variables Generator" — the link that makes this a documentation OF
 *  the editor rather than a parallel description of it. It opens the very
 *  foundation the page documents. */
function EditPill({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-elevated text-fg-muted border border-line-strong hover:text-fg transition-colors whitespace-nowrap"
      title={`Open Variables · ${label}`}
    >
      Edit tokens
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  )
}

export function foundationToc(doc: FoundationDoc): TocEntry[] {
  return [
    { id: 'description', label: 'Overview' },
    { id: 'why', label: `Why ${doc.label.toLowerCase()} tokens` },
    { id: 'usage', label: 'Usage' },
    ...doc.sections.map((s) => ({ id: s.id, label: s.title, sub: true })),
    { id: 'ships', label: 'Ships as' },
  ]
}

export function overviewToc(): TocEntry[] {
  return [
    { id: 'description', label: 'Overview' },
    ...FOUNDATION_DOCS.map((f) => ({ id: `ov-${f.key}`, label: f.label })),
  ]
}

export function FoundationArticle({
  doc, system, onOpen, onEdit,
}: {
  doc: FoundationDoc
  system: SystemDoc
  onOpen: (key: string) => void
  /** Opens Variables · <foundation>. */
  onEdit: (foundationKey: string) => void
}) {
  const idx = FOUNDATION_DOCS.findIndex((f) => f.key === doc.key)
  const prev = FOUNDATION_DOCS[idx - 1]
  const next = FOUNDATION_DOCS[idx + 1]
  const count = doc.tokenCount(system)

  return (
    <div className="flex flex-col gap-8">
      <DocHeader
        section="Docs"
        kind="Foundations"
        title={doc.label}
        actions={
          <>
            <CopyButton text={foundationMarkdown(doc, system)} label="Copy Page" />
            <EditPill label={doc.label} onEdit={() => onEdit(doc.key)} />
          </>
        }
      />

      <DocTitle
        title={doc.label}
        eyebrow="Foundation"
        lead={doc.lead}
        meta={<CountBadge>{count} token{count === 1 ? '' : 's'}</CountBadge>}
      />

      <DocSection id="why" title={`Why ${doc.label.toLowerCase()} tokens`} description={doc.why} />

      <DocSection id="usage" title="Usage" description={doc.usage}>
        <CodeBlock file="variables.css" code={doc.usageCode} />
      </DocSection>

      {doc.sections.map((section) => (
        <DocSection key={section.id} id={section.id} title={section.title} description={section.description}>
          {section.render(system)}
        </DocSection>
      ))}

      <DocSection
        id="ships"
        title="Ships as"
        description="What these tokens are called in the three places they land. Every value on this page reads the same resolvers the export does, so the file can never disagree with what you just read."
      >
        <ShipsAs json={doc.ships.json} css={doc.ships.css} figma={doc.ships.figma} />
      </DocSection>

      <Pager
        prev={prev && { key: prev.key, label: prev.label }}
        next={next && { key: next.key, label: next.label }}
        onOpen={onOpen}
      />
    </div>
  )
}

/** The whole-system reference sheet — every foundation's sections in one
 *  column. This is what the old Design Rules page was, kept intact for the
 *  hand-off/print case the per-foundation pages don't cover. */
export function OverviewArticle({
  system, onOpen,
}: { system: SystemDoc; onOpen: (key: string) => void }) {
  const total = FOUNDATION_DOCS.reduce((n, f) => n + f.tokenCount(system), 0)

  return (
    <div className="flex flex-col gap-8">
      <DocHeader
        section="Docs"
        kind="Foundations"
        title="Overview"
        actions={<DownloadSkillButton />}
      />

      <DocTitle
        title="System reference"
        eyebrow="Foundation"
        lead="The full specification of this system, generated from your own tokens — every foundation in one column, for hand-off and print. Each section links to its own page for the why and the usage."
        meta={<CountBadge>{total} tokens</CountBadge>}
      />

      {FOUNDATION_DOCS.map((f) => (
        <section key={f.key} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-line">
            <h3 id={`ov-${f.key}`} className="text-base font-semibold text-fg scroll-mt-4 pt-4">{f.label}</h3>
            <button
              onClick={() => onOpen(f.key)}
              className="text-[11px] text-fg-faint hover:text-fg transition-colors whitespace-nowrap"
            >
              Read the {f.label.toLowerCase()} page →
            </button>
          </div>
          {f.sections.map((section) => (
            <Block key={section.id} title={section.title} description={section.description}>
              {section.render(system)}
            </Block>
          ))}
        </section>
      ))}
    </div>
  )
}

/** Overview's per-section card. Unlike the per-foundation page, these carry no
 *  TOC anchor of their own — the TOC here is one entry per FOUNDATION, or a
 *  eight-foundation sheet would produce a crowded rail nobody can scan. */
function Block({
  title, description, children,
}: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-app overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <h4 className="text-[15px] font-semibold text-fg">{title}</h4>
        {description && <p className="text-[13px] text-fg-muted mt-1 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  )
}

export { OVERVIEW_KEY, foundationDoc }
