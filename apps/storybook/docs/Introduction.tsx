// Getting started · Introduction. Every number and colour on this page is read from what Storybook holds (the store
// built from the Figma file, the story files, the Figma snapshot): nothing is typed by hand, so the page cannot drift.
import { useSystemDoc, FOUNDATION_DOCS } from '../../../src/components/configurator/docs/foundationDocs'
import { BRAND, FIGMA_FILE, brandRamp, figmaNodeUrl } from '../.storybook/escalaSystem'
import { DocsFrame, DocsLink, DocsSection } from './DocsFrame'
import { RecipeScope } from '../../../src/components/configurator/docs/skeleton/scope'
import { resolvePreviewTokens } from '../../../src/lib/previewTokens'
import { useDesignStore } from '../../../src/store/useDesignStore'
import { Button } from '../../../src/components/escala-ui/button'
import { Badge } from '../../../src/components/escala-ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator, BREADCRUMB_GLYPHS } from '../../../src/components/escala-ui/breadcrumb'
import { Stepper, StepperItem } from '../../../src/components/escala-ui/stepper'
import { STORY_COMPONENTS, STORY_FOLDERS } from './storyIndex'

const snapshot = import.meta.glob<string>('../../../spec/figma-components.json', { eager: true, import: 'exportedAt' })
const SNAPSHOT_DATE = Object.values(snapshot)[0]

/** `{accent.9}` → `accent-9`, the primitive's CSS / Figma name. */
const refName = (ref: string) => ref.replace(/[{}]/g, '').replace('.', '-')

function Swatch({ hex, size = 28 }: { hex: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-md border border-line" style={{ width: size, height: size, background: hex }} />
}

function Tier({ step, title, count, body, example }: { step: string; title: string; count: string; body: string; example: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-mini uppercase tracking-widest text-fg-faint">{step}</span>
        <span className="text-caption text-fg-faint">{count}</span>
      </div>
      <h3 className="text-strong font-semibold text-fg">{title}</h3>
      <p className="about-copy">{body}</p>
      <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 font-mono text-caption text-fg-muted">{example}</div>
    </div>
  )
}

/** The hero's picture: real components, live, in Escala Dark — never a screenshot that can go stale. */
function LiveSample() {
  const store = useDesignStore()
  const t = resolvePreviewTokens(store, BRAND, 'dark', 'desktop')
  const stop = (e: React.MouseEvent) => e.preventDefault()
  return (
    <div className="dark rounded-xl border border-line p-6" style={{ background: t.surface }}>
      <RecipeScope t={t}>
        <div className="flex flex-col gap-5">
          <Breadcrumb size="sm">
            <BreadcrumbList>
              <BreadcrumbItem href="#" onClick={stop} iconLeading={BREADCRUMB_GLYPHS.house}>Home</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem href="#" onClick={stop}>Checkout</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem current>Shipping</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Stepper size="sm" orientation="horizontal" aria-label="Checkout">
            <StepperItem status="completed" description="Your login details">Account</StepperItem>
            <StepperItem status="active" description="Where we deliver">Shipping</StepperItem>
            <StepperItem status="locked" description="Card or transfer">Payment</StepperItem>
          </Stepper>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Continue</Button>
            <Button variant="secondary" appearance="outline">Back</Button>
            <Badge variant="success">Saved</Badge>
            <Badge variant="warning">2 left</Badge>
          </div>
        </div>
      </RecipeScope>
    </div>
  )
}

export function Introduction() {
  const system = useSystemDoc({ themeKey: BRAND })
  const accent = brandRamp('light')
  const tones = Array.from({ length: 12 }, (_, i) => accent[i + 1]).filter(Boolean)
  const roles = system.categoricalCategories?.flatMap((c) => c.tokens) ?? []
  const primary = roles.find((r) => r.id === 'action.primary.default')
  const primitiveCount = [...system.primitiveFamilies, ...system.alphaFamilies].reduce((n, f) => n + Object.keys(f.scale).length, 0)

  return (
    <DocsFrame>
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid items-center gap-8 p-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <img src="./brand/escala-logo-dark.svg" alt="Escala" width={154} height={45} />
            <h1 className="text-[38px] font-semibold leading-[1.1] tracking-tight text-fg">Escala Design System</h1>
            <p className="about-copy max-w-[46ch]">
              Every component in this Storybook is the twin of a component set in the Figma file
              {' '}<DocsLink href={figmaNodeUrl()}>{FIGMA_FILE.name}</DocsLink>: same name, same properties, same values, measured.
              They paint with the file's own variables in Light and Dark, on Desktop, Tablet and Mobile.
            </p>
            {SNAPSHOT_DATE && <span className="w-fit rounded-full border border-line bg-elevated px-3 py-1 text-caption text-fg-muted">Figma snapshot · {SNAPSHOT_DATE}</span>}
          </div>
          <LiveSample />
        </div>
        {/* The accent ramp, tone 1 → 12: the brand's own primitives, not a decoration. */}
        <div className="flex h-2" aria-hidden>
          {tones.map((hex, i) => <span key={i} className="flex-1" style={{ background: hex }} />)}
        </div>
      </section>

      <DocsSection id="architecture" title="Architecture" lead={
        <p>Three tiers. Designs and components reference a role, only the role references a primitive, so re-pointing one role moves every component that reads it, in every mode at once.</p>
      }>
        <div className="grid gap-3 md:grid-cols-3">
          <Tier step="Tier 1" title="Primitives" count={`${primitiveCount} colours + Dimensions`}
            body="The raw values: twelve-step colour ramps (and their alpha twins) and the Dimension ladder. Never used in a design directly."
            example={primary ? <><Swatch hex={primary.lightHex} size={16} />{refName(primary.lightRef)} · {primary.lightHex}</> : 'accent-9'} />
          <Tier step="Tier 2" title="Semantic roles" count={`${roles.length} colour roles`}
            body="What a value is FOR: surface · content · action · status · border · elevation, and the spacing, radius, size and type roles. Each resolves per mode."
            example={<>action.primary.default</>} />
          <Tier step="Tier 3" title="Components" count={`${STORY_COMPONENTS.length} component pages`}
            body="One recipe per Figma component set: which role each part reads (fill, ink, edge, padding, radius, type), for every variant and state."
            example={<>Button · default · solid → fill</>} />
        </div>
      </DocsSection>

      <DocsSection id="toolbar" title="Reading a story" lead={
        <p>The toolbar holds the file's two mode axes. <strong className="text-fg">Color Semantics</strong> switches Escala Light and Escala Dark;
          {' '}<strong className="text-fg">Dimension Semantics · Typography</strong> switches Desktop, Tablet and Mobile. A story's controls are the
          {' '}Figma component's properties, in the same order and with the same defaults as its playground in Figma.</p>
      } />

      <DocsSection id="variables" title="Variables" lead={<p>The tokens behind every component, one page per foundation, with every value as it resolves here.</p>}>
        <div className="flex flex-wrap gap-2">
          {FOUNDATION_DOCS.map((d) => (
            <a key={d.key} href={`./?path=/docs/variables-${d.label.toLowerCase()}--documentation`} target="_top"
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-body text-fg hover:border-line-strong hover:bg-elevated">{d.label}</a>
          ))}
        </div>
      </DocsSection>

      <DocsSection id="components" title="Components" lead={<p>Grouped as in the sidebar. Each opens on its Documentation: what it is, when to use it, the playground, its variants and its Figma contract.</p>}>
        <div className="grid gap-4 md:grid-cols-2">
          {STORY_FOLDERS.map((folder) => {
            const items = STORY_COMPONENTS.filter((c) => c.folder === folder)
            return (
              <div key={folder} className="rounded-xl border border-line bg-surface p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-strong font-semibold text-fg">{folder}</h3>
                  <span className="text-caption text-fg-faint">{items.length}</span>
                </div>
                <p className="flex flex-wrap gap-x-2 gap-y-1 text-body">
                  {items.map((c, i) => (
                    <span key={c.title}><DocsLink href={c.href}>{c.name}</DocsLink>{i < items.length - 1 ? <span className="text-fg-faint"> ·</span> : null}</span>
                  ))}
                </p>
              </div>
            )
          })}
        </div>
      </DocsSection>

      <DocsSection id="links" title="Quick links">
        <ul className="flex flex-col gap-3">
          <li><DocsLink href={figmaNodeUrl()} className="text-strong font-semibold">Figma file →</DocsLink><p className="about-copy">{FIGMA_FILE.name}: the only rule for every component and variable here.</p></li>
          <li><DocsLink href="https://www.escalatokens.com" className="text-strong font-semibold">Escala generator →</DocsLink><p className="about-copy">Build your own system from the same model and export it to CSS, Figma and agents.</p></li>
          <li><DocsLink href="https://www.escalatokens.com/docs" className="text-strong font-semibold">Docs →</DocsLink><p className="about-copy">The foundations and the component catalogue on escalatokens.com.</p></li>
        </ul>
      </DocsSection>

      <footer className="mt-14 border-t border-line pt-4 text-center text-caption text-fg-faint">
        Built from the Figma file {FIGMA_FILE.name}{SNAPSHOT_DATE ? ` · snapshot ${SNAPSHOT_DATE}` : ''}
      </footer>
    </DocsFrame>
  )
}
