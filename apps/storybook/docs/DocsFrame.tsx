// The frame every Escala documentation page in Storybook sits in: the app's dark chrome (its CSS variables, so the
// Docs destination's own blocks — DocSection, CodeBlock, the foundation specimens — render exactly as on escalatokens.com),
// the i18n provider those blocks read, and Storybook's `Unstyled` so the docs theme's typography resets stay out.
import type { ReactNode } from 'react'
import { Unstyled } from '@storybook/addon-docs/blocks'
import { I18nProvider } from '../../../src/lib/i18n'
import { cn } from '../../../src/lib/utils'
import { chromeAccent } from '../../../src/lib/colorUtils'
import { brandRamp } from '../.storybook/escalaSystem'

/** The dark chrome's page (chromeTheme.generated.css `.dark` --app = surface.page). */
const DARK_PAGE = '#131416'

export function DocsFrame({ children, className }: { children: ReactNode; className?: string }) {
  // The chrome accent the app derives (`chromeAccent`): the brand's dark ramp walked up until it reads 4.5:1 on the
  // page. `--accent-ui`'s dark value is scoped to `:root.dark` in index.css, which a docs iframe never has.
  const accent = chromeAccent(brandRamp('dark'), DARK_PAGE, '#cec5ff')
  return (
    <Unstyled>
      <I18nProvider>
        <div className={cn('dark text-fg', className)} style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', ['--accent-ui' as string]: accent }}>{children}</div>
      </I18nProvider>
    </Unstyled>
  )
}

/** A page section: title over a hairline, the shape of the WA DS pages. */
export function DocsSection({ id, title, lead, children }: { id?: string; title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <section id={id} className="mt-12 flex flex-col gap-3 scroll-mt-6">
      <h2 className="border-b border-line pb-2 text-heading font-semibold text-fg">{title}</h2>
      {lead && <div className="about-copy max-w-[68ch]">{lead}</div>}
      {children}
    </section>
  )
}

/** The header of a documentation page: an accent bar, the name and one line under it. */
export function DocsHeader({ eyebrow, title, meta }: { eyebrow?: string; title: string; meta?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1.5 border-l-[3px] border-accent-ui pl-4">
      {eyebrow && <span className="text-mini uppercase tracking-widest text-fg-faint">{eyebrow}</span>}
      <h1 className="text-display font-semibold leading-tight text-fg">{title}</h1>
      {meta && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-fg-muted">{meta}</div>}
    </header>
  )
}

/** A link that leaves the docs iframe for another Storybook page (or another site). */
export function DocsLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const external = /^https?:/.test(href)
  return (
    <a href={href} target={external ? '_blank' : '_top'} rel={external ? 'noreferrer' : undefined}
      className={cn('text-accent-ui underline-offset-4 hover:underline', className)}>
      {children}
    </a>
  )
}
