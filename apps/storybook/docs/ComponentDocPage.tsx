// The "Documentation" page every component gets first in its sidebar folder (autodocs, preview.tsx `docs.page`).
// Nothing here is written per component: the prose is the catalogue's (componentCatalogue.ts — description, usage,
// props, accessibility), the Figma link and the measured spec are the component's contract (design-plans/<x>-contract.md),
// and the playground and examples are the stories themselves. A part with no catalogue entry (BreadcrumbItem) reads
// the component it belongs to.
import { Controls, Markdown, Primary, Stories, useOf } from '@storybook/addon-docs/blocks'
import { Prose } from '../../../src/components/configurator/docs/blocks'
import type { ComponentDef } from '../../../src/lib/componentCatalogue'
import { DocsFrame, DocsHeader, DocsLink, DocsSection } from './DocsFrame'
import { catalogueEntry, STORY_COMPONENTS, storyComponent } from './storyIndex'
import { figmaNodeUrl } from '../.storybook/escalaSystem'

const contracts = import.meta.glob<string>('../../../design-plans/*-contract.md', { eager: true, query: '?raw', import: 'default' })

/** `FABButton` → `fab-button`, `InputOTPSlot` → `input-otp-slot`: the contract file naming. */
const kebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()

/** The Figma node a contract names for a set. The contracts write it three ways: "`Button` (`4:5066`",
 *  "`Modal` (967:102", "## TableCell (1024:18323" and "`Kbd`, 1091:6". */
function figmaNode(contract: string | undefined, name: string): string | undefined {
  if (!contract) return undefined
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return contract.match(new RegExp('(?:`' + escaped + '`|##\\s+' + escaped + ')\\s*[,(]\\s*`?(\\d+:\\d+)'))?.[1]
}

/** The contract of a set: its own file, else its parent's, else whichever contract names the set with its node
 *  (IconButton lives in button-contract.md, NavItem in nav-header-contract.md). */
function contractFor(name: string, parent?: string): { file: string; text: string } | undefined {
  const all = Object.entries(contracts).map(([path, text]) => ({ file: path.split('/').pop() ?? path, text }))
  for (const key of [name, parent]) {
    if (!key) continue
    const hit = all.find((c) => c.file === `${kebab(key)}-contract.md`)
    if (hit) return hit
  }
  return all.find((c) => figmaNode(c.text, name))
}

function PropsTable({ props }: { props: ComponentDef['props'] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-body">
        <thead className="bg-surface text-caption uppercase tracking-wider text-fg-faint">
          <tr>
            <th className="px-3 py-2 font-medium">Property</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name} className="border-t border-line align-top">
              <td className="px-3 py-2 font-mono text-caption text-fg">{p.name}</td>
              <td className="px-3 py-2 font-mono text-caption text-fg-muted">{p.type}</td>
              <td className="px-3 py-2 text-fg-muted"><Prose text={p.description} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Chip({ children }: { children: string }) {
  return <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-caption text-fg-muted">{children}</span>
}

export function ComponentDocPage() {
  const resolved = useOf('meta', ['meta'])
  const title = resolved.type === 'meta' ? resolved.preparedMeta.title : ''
  const name = title.split('/').pop() ?? title
  const folder = title.split('/')[0]
  const { entry, partOf } = catalogueEntry(name)
  const owner = entry ?? partOf
  const contract = contractFor(name, partOf?.key)
  const node = figmaNode(contract?.text, name)
    ?? Object.values(contracts).map((t) => figmaNode(t, name)).find(Boolean)
    ?? (partOf ? figmaNode(contract?.text, partOf.key) : undefined)
  // Related = the set's own family first (Breadcrumb · BreadcrumbItem · BreadcrumbSeparator…); a component with no
  // family lists its catalogue category instead.
  const root = STORY_COMPONENTS.map((c) => c.name).filter((n) => name.startsWith(n)).sort((a, b) => a.length - b.length)[0] ?? name
  const family = STORY_COMPONENTS.filter((c) => c.name !== name && c.name.startsWith(root))
  const related = family.length > 0 ? family
    : STORY_COMPONENTS.filter((c) => c.name !== name && (owner ? catalogueEntry(c.name).entry?.category === owner.category : c.folder === folder)).slice(0, 10)

  return (
    <>
      <DocsFrame>
        <DocsHeader
          eyebrow={folder}
          title={entry?.label ?? name}
          meta={
            <>
              {partOf && <span>Part of <DocsLink href={storyComponent(partOf.key)?.href ?? '#'}>{partOf.label}</DocsLink> ·</span>}
              <span>Figma set <code className="font-mono text-fg">{name}</code></span>
              {node && <>· <DocsLink href={figmaNodeUrl(node)}>Open in Figma ↗</DocsLink></>}
            </>
          }
        />

        <DocsSection title="What it is" lead={
          entry ? <Prose text={entry.description} />
            : partOf ? <Prose text={`A part of ${partOf.label}, built as its own Figma component set so a designer can place and swap it alone. ${partOf.description}`} />
              : <p>A component of the Figma file, documented by its contract below.</p>
        } />

        {owner?.usage && (
          <DocsSection title="When & how to use it" lead={<Prose text={owner.usage} />} />
        )}

        <DocsSection title="Playground" lead={<p>The controls are the Figma component's properties: same names, same order and the same defaults as its playground in Figma. The toolbar switches the Color Semantics mode (Escala Light · Escala Dark) and the Dimension Semantics · Typography mode (Desktop · Tablet · Mobile).</p>} />
      </DocsFrame>

      <Primary />
      <Controls />

      <DocsFrame>
        {entry && entry.axes.length > 0 && (
          <DocsSection title="Variants" lead={<p>The Figma set's variant axes, value for value.</p>}>
            <div className="flex flex-col gap-2">
              {entry.axes.map((axis) => (
                <div key={axis.name} className="flex flex-wrap items-center gap-2">
                  <span className="w-28 shrink-0 text-body font-medium text-fg">{axis.name}</span>
                  {axis.values.map((v) => <Chip key={v}>{v}</Chip>)}
                </div>
              ))}
            </div>
          </DocsSection>
        )}

        {entry && entry.props.length > 0 && (
          <DocsSection title="Properties" lead={<p>The React API of <code className="font-mono text-fg">{name}</code>.</p>}>
            <PropsTable props={entry.props} />
          </DocsSection>
        )}

        {owner?.accessibility && (
          <DocsSection title="Accessibility" lead={<Prose text={owner.accessibility} />} />
        )}

        {related.length > 0 && (
          <DocsSection title="Related components">
            <div className="flex flex-wrap gap-2">
              {related.map((c) => (
                <a key={c.title} href={c.href} target="_top" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-body text-fg hover:border-line-strong hover:bg-elevated">
                  {c.name}
                </a>
              ))}
            </div>
          </DocsSection>
        )}
      </DocsFrame>

      <Stories title="Examples" includePrimary={false} />

      {contract && (
        <DocsFrame>
          <DocsSection title="Figma contract" lead={<p>The spec this component is built and measured against, read from the Figma file (<code className="font-mono text-fg">design-plans/{contract.file}</code>): API, geometry per size, colour per state, and what the file does that looks odd.</p>} />
        </DocsFrame>
      )}
      {contract && <ContractBody text={contract.text} />}
    </>
  )
}

/** The contract, rendered by Storybook's own Markdown block (styled by the docs theme), folded: it is the long read. */
function ContractBody({ text }: { text: string }) {
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Show the contract</summary>
      <Markdown>{text}</Markdown>
    </details>
  )
}
