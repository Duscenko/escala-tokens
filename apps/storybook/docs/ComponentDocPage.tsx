// The "Documentation" page of a FAMILY (autodocs, preview.tsx `docs.page`; design-plans/storybook-families.md): one
// per Figma page. Nothing here is written per component: the prose is the catalogue's (componentCatalogue.ts —
// description, usage, props, accessibility), the Figma link and the measured spec are the contracts
// (design-plans/<x>-contract.md), the parts and their axes are spec/storybook-families.json + the Figma inventory, and
// the playground, examples and part previews are the stories themselves.
import { Component, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { Controls, DocsContext, Markdown, Primary, Stories, useOf } from '@storybook/addon-docs/blocks'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import type { GridViewport } from '../../../src/lib/layoutTokens'
import { EscalaScope } from '../.storybook/escalaScope'
import { Prose } from '../../../src/components/configurator/docs/blocks'
import { COMPONENT_BOX_LABELS, type ComponentDef } from '../../../src/lib/componentCatalogue'
import { DocsFrame, DocsHeader, DocsLink, DocsSection } from './DocsFrame'
import { catalogueEntry, catalogueOf, familyByTitle, STORY_FAMILIES, type StoryPart } from './storyIndex'
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

/** Black · Gray · White box in one line (design-plans/component-box-classification.md), with what it locks. */
function BoxBadge({ entry }: { entry: ComponentDef }) {
  return (
    <p className="mt-4 flex flex-wrap items-center gap-2 text-caption text-fg-muted">
      <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-fg">{COMPONENT_BOX_LABELS[entry.box]}</span>
      {entry.locks.length > 0 && <span>Locked: {entry.locks.join(' · ')}</span>}
    </p>
  )
}

/** The toolbar's two modes, as the docs page sees them (and follows when they change). */
function useDocsGlobals(): { appearance: 'light' | 'dark'; viewport: GridViewport } {
  const ctx = useContext(DocsContext)
  const read = () => {
    try { return ctx.getStoryContext(ctx.storyById()).globals } catch { return {} as Record<string, unknown> }
  }
  const [globals, setGlobals] = useState<Record<string, unknown>>(read)
  useEffect(() => {
    const on = ({ globals: g }: { globals: Record<string, unknown> }) => setGlobals(g)
    ctx.channel.on(GLOBALS_UPDATED, on)
    return () => { ctx.channel.off(GLOBALS_UPDATED, on) }
  }, [ctx])
  return { appearance: (globals.theme ?? 'light') as 'light' | 'dark', viewport: (globals.dimensions ?? 'desktop') as GridViewport }
}

/** A preview that breaks never takes the Documentation page with it. */
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <p className="text-caption text-fg-faint">The preview did not render here; open the playground.</p> : this.props.children }
}

/** A part's first story (its Playground), rendered with its own render function and args, in the toolbar's modes. */
function PartRender({ part }: { part: StoryPart }) {
  const meta = part.module?.default
  const first = part.stories[0] && (part.module?.[part.stories[0].exportName] as { args?: Record<string, unknown>; render?: (a: Record<string, unknown>) => unknown } | undefined)
  const render = first?.render ?? meta?.render
  const args = { ...(meta?.args ?? {}), ...(first?.args ?? {}) }
  if (render) return <>{render(args) as ReactNode}</>
  if (meta?.component) return createElement(meta.component, args)
  return null
}

function PartCard({ part, globals }: { part: StoryPart; globals: ReturnType<typeof useDocsGlobals> }) {
  const own = catalogueOf(part.set)
  const axes = Object.entries(part.figma?.axes ?? {})
  return (
    <div id={`part-${part.set}`} className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-mono text-strong font-semibold text-fg">{part.set}</h3>
        <span className="text-caption text-fg-faint">
          {part.figma?.variants ? `${part.figma.variants} variant${part.figma.variants === 1 ? '' : 's'} in Figma` : 'Not in the Figma snapshot yet'}
        </span>
      </div>
      {part.missing ? (
        <p className="px-4 py-3 text-body text-fg-muted">No story yet: {part.missing}.</p>
      ) : (
        <>
          <div className="max-h-[420px] overflow-auto border-b border-line">
            <PreviewBoundary>
              <EscalaScope appearance={globals.appearance} viewport={globals.viewport} padding={24} stage stageMinHeight={160}>
                <PartRender part={part} />
              </EscalaScope>
            </PreviewBoundary>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3">
            {own && <Prose className="text-body text-fg-muted" text={own.description} />}
            {axes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {axes.map(([axis, values]) => (
                  <div key={axis} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-24 shrink-0 text-caption font-medium text-fg-muted">{axis}</span>
                    {values.split('|').map((v) => <Chip key={v}>{v}</Chip>)}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {part.stories.map((s, i) => (
                <a key={s.id} href={s.href} target="_top"
                  className={i === 0
                    ? 'rounded-lg bg-accent-solid px-3 py-1.5 text-body font-medium text-accent-ink'
                    : 'rounded-lg border border-line bg-app px-3 py-1.5 text-body text-fg hover:border-line-strong hover:bg-elevated'}>
                  {i === 0 ? 'Open playground' : s.name.replace(`${part.set} · `, '')}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ComponentDocPage() {
  const resolved = useOf('meta', ['meta'])
  const title = resolved.type === 'meta' ? resolved.preparedMeta.title : ''
  const family = familyByTitle(title)
  const globals = useDocsGlobals()
  const name = family?.id ?? title.split('/').pop() ?? title
  const folder = title.split('/')[0]
  const entry = family ? catalogueEntry(family) : undefined
  // A composed family (DatePicker, Tooltip) reads a part's catalogue entry for its prose, never for its name.
  const ownEntry = entry && entry.key === (family?.root ?? name)
  const label = ownEntry ? entry.label : name
  const rootSet = family?.root ?? undefined
  const parts = family?.parts ?? []
  const contract = contractFor(rootSet ?? name, entry?.key)
    ?? parts.map((p) => contractFor(p.set)).find(Boolean)
  const node = figmaNode(contract?.text, rootSet ?? name)
    ?? Object.values(contracts).map((t) => figmaNode(t, rootSet ?? name)).find(Boolean)
    ?? parts.map((p) => figmaNode(contract?.text, p.set)).find(Boolean)
  // Related = the families of the same catalogue category (or folder), never the family's own parts: those are Anatomy.
  const related = STORY_FAMILIES.filter((f) => f.id !== name && (entry ? catalogueEntry(f)?.category === entry.category : f.folder === folder)).slice(0, 10)

  return (
    <>
      <DocsFrame>
        <DocsHeader
          eyebrow={folder}
          title={label}
          meta={
            <>
              {rootSet ? <span>Figma set <code className="font-mono text-fg">{rootSet}</code></span>
                : <span>Composed from {parts.map((p) => p.set).join(' + ')}</span>}
              {parts.length > 0 && <span>· <DocsLink href="#anatomy">{parts.length} part{parts.length === 1 ? '' : 's'}</DocsLink></span>}
              {node && <>· <DocsLink href={figmaNodeUrl(node)}>Open in Figma ↗</DocsLink></>}
            </>
          }
        />
        {entry && ownEntry && <BoxBadge entry={entry} />}

        {/* The playground is what a reader opens this page for: the description in one paragraph, then the component. */}
        <div className="mt-6 mb-5 max-w-[64ch] text-body leading-relaxed text-fg-muted">
          {entry ? <Prose text={ownEntry ? entry.description : `${name} is ${parts.map((p) => p.set).join(' + ')} placed together. ${entry.description}`} />
            : <p>A component of the Figma file, documented by its contract below.</p>}
        </div>
        <p className="mb-2 text-caption text-fg-faint">
          {rootSet
            ? 'Playground: the controls are the Figma component’s properties, same names, order and defaults.'
            : `Playground: the Figma page has no ${name} set of its own, so this puts its parts together as a designer places them.`}
          {' '}The toolbar switches Escala Light · Dark and Desktop · Tablet · Mobile.
        </p>
      </DocsFrame>

      <Primary />
      <Controls />

      <DocsFrame>
        {entry?.usage && (
          <DocsSection title="When & how to use it" lead={<Prose text={entry.usage} />} />
        )}

        {entry && entry.axes.length > 0 && entry.key === rootSet && (
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
          <DocsSection title="Properties" lead={<p>The React API of <code className="font-mono text-fg">{entry.key}</code>.</p>}>
            <PropsTable props={entry.props} />
          </DocsSection>
        )}

        {parts.length > 0 && (
          <DocsSection id="anatomy" title="Anatomy" lead={<p>
            The parts of {label}. Each is its own Figma component set, so a designer can place and swap it alone,
            and each has its own playground here with the set's properties as controls. They live inside this entry of the
            sidebar, hidden by default: tick <strong className="text-fg">part</strong> in the sidebar's tag filter to list them.
          </p>}>
            <div className="flex flex-col gap-4">
              {parts.map((p) => <PartCard key={p.set} part={p} globals={globals} />)}
            </div>
          </DocsSection>
        )}

        {entry?.accessibility && (
          <DocsSection title="Accessibility" lead={<Prose text={entry.accessibility} />} />
        )}

        {related.length > 0 && (
          <DocsSection title="Related components">
            <div className="flex flex-wrap gap-2">
              {related.map((f) => (
                <a key={f.title} href={f.href} target="_top" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-body text-fg hover:border-line-strong hover:bg-elevated">
                  {f.id}
                </a>
              ))}
            </div>
          </DocsSection>
        )}
      </DocsFrame>

      <Stories title="Examples" includePrimary={false} />

      {contract && (
        <DocsFrame>
          <DocsSection title="Figma contract" lead={<p>The spec this family is built and measured against, read from the Figma file (<code className="font-mono text-fg">design-plans/{contract.file}</code>): API, geometry per size, colour per state, and what the file does that looks odd.</p>} />
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
