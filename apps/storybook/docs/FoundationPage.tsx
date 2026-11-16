// A "Variables" page: one foundation of the Figma file's system (Color, Font, Radius…). It renders the SAME
// FoundationDoc the app's Docs destination renders (FOUNDATION_DOCS: lead, why, usage, what it ships as and every
// live section), fed by the store Storybook built from the Figma file — so the values here are the ones the
// components on the other pages paint with, and no copy of the prose or the tables lives in Storybook.
import { CodeBlock, CountBadge, DocSection, Prose } from '../../../src/components/configurator/docs/blocks'
import { FOUNDATION_DOCS, useSystemDoc } from '../../../src/components/configurator/docs/foundationDocs'
import { BRAND } from '../.storybook/escalaSystem'
import { DocsFrame, DocsHeader, DocsLink, DocsSection } from './DocsFrame'

export function FoundationPage({ docKey }: { docKey: string }) {
  const doc = FOUNDATION_DOCS.find((d) => d.key === docKey)
  const system = useSystemDoc({ themeKey: BRAND })
  if (!doc) return <DocsFrame><p>No foundation “{docKey}”.</p></DocsFrame>
  const count = doc.tokenCount(system)
  const idx = FOUNDATION_DOCS.indexOf(doc)
  const next = FOUNDATION_DOCS[idx + 1]
  return (
    <DocsFrame className="flex flex-col">
      <DocsHeader eyebrow="Variables" title={doc.label} meta={<CountBadge>{`${count} token${count === 1 ? '' : 's'}`}</CountBadge>} />
      <div className="about-copy mt-4 max-w-[68ch]"><Prose text={doc.lead} /></div>

      <DocsSection title={`Why ${doc.label.toLowerCase()} tokens`} lead={<Prose text={doc.why} />} />

      <DocsSection title="Usage" lead={<Prose text={doc.usage} />}>
        <CodeBlock file="variables.css" code={doc.usageCode} />
      </DocsSection>

      <DocsSection title="Ships as">
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-body">
          <dt className="text-fg-faint">tokens.json</dt><dd className="font-mono text-caption text-fg-muted">{doc.ships.json}</dd>
          <dt className="text-fg-faint">CSS</dt><dd className="font-mono text-caption text-fg-muted">{doc.ships.css}</dd>
          <dt className="text-fg-faint">Figma</dt><dd className="font-mono text-caption text-fg-muted">{doc.ships.figma}</dd>
        </dl>
      </DocsSection>

      <div className="mt-12 flex flex-col gap-10">
        {doc.sections.map((section) => (
          <DocSection key={section.id} id={section.id} title={section.title} description={section.description}>
            {section.render(system)}
          </DocSection>
        ))}
      </div>

      {next && (
        <p className="mt-14 border-t border-line pt-4 text-body text-fg-muted">
          Next: <DocsLink href={`./?path=/docs/variables-${next.label.toLowerCase()}--documentation`}>{next.label} →</DocsLink>
        </p>
      )}
    </DocsFrame>
  )
}
