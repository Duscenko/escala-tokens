// Escala blocks · Marketing. The Figma page `Marketing` (1066:2): HeroHeader, FAQSection, PricingCard, PricingSection,
// ContactSection, Footer. Escala-ui components and role tokens (CSS variables) only. `Layout=desktop · mobile` is a viewport
// switch of the same anatomy (columns stack on mobile) and is never animated.
//
// Motion (contract in marketing.contract.json): sections that reveal several cards or items together (PricingSection)
// stagger in ONCE on `use-stagger-in` (the `--motion-stagger` step); the hero headline rises once on `use-reveal`, never
// on scroll again; everything else has none.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { Accordion, AccordionItem } from '../accordion'
import { Badge } from '../badge'
import { Brand } from '../brand'
import { Button } from '../button'
import { CheckboxItem } from '../checkbox'
import { Field } from '../field'
import { FeaturedIcon } from '../featured-icon'
import { IconButton } from '../icon-button'
import { Image } from '../image'
import { Input } from '../input'
import { Separator } from '../separator'
import { Textarea } from '../textarea'
import { TextLink } from '../text-link'
import { boxedGlyph } from './shared'
import { glyph } from '../../../lib/icons'

export const MARKETING_LAYOUTS = ['desktop', 'mobile'] as const
export type MarketingLayout = (typeof MARKETING_LAYOUTS)[number]
export const FAQ_STYLES = ['split', 'centered'] as const
export type FaqStyle = (typeof FAQ_STYLES)[number]

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = (role: string): React.CSSProperties => ({
  fontFamily: `var(--text-${role}-font-family)`, fontSize: `var(--text-${role}-font-size)`, lineHeight: `var(--text-${role}-line-height)`,
  fontWeight: `var(--text-${role}-font-weight)`, letterSpacing: `var(--text-${role}-letter-spacing)`,
})
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`
const secondary: React.CSSProperties = { color: v('color.content.secondary') }

interface Common { layout?: MarketingLayout; style?: React.CSSProperties; className?: string }
const SECTION = (layout: MarketingLayout): React.CSSProperties => ({
  display: 'flex', flexDirection: layout === 'mobile' ? 'column' : 'row', gap: v('spacing.gap-section'), width: '100%',
  padding: `${v('spacing.inset-section')} ${v('spacing.inset-page')}`, background: v('color.surface.page'), color: v('color.content.primary'), boxSizing: 'border-box',
})

/** Mounts low and transparent and settles once on a motion role (a reveal), and at a stagger step when `index` is given. */
function Reveal({ role, index = 0, children, style }: { role: 'use-reveal' | 'use-stagger-in'; index?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const [on, setOn] = React.useState(false)
  // A timer, not requestAnimationFrame: a hidden tab never ticks a frame and the content would stay transparent.
  React.useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id) }, [])
  return (
    <div style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'var(--motion-transform-enter, none)', transition: `opacity ${motion(role)}, transform ${motion(role)}`, transitionDelay: `calc(${index} * var(--motion-stagger, 0s))`, ...style }}>
      {children}
    </div>
  )
}

/** Figma `HeroHeader`. */
export function HeroHeader({ layout = 'desktop', badgeVisible = true, formVisible = true, headline = 'Stories worth watching, shot with taste', body = 'I shoot indie-style videos for creators, founders and anyone with something to say.', media, style, className }: Common & { badgeVisible?: boolean; formVisible?: boolean; headline?: string; body?: string; media?: React.ReactNode }) {
  const mobile = layout === 'mobile'
  return (
    <section data-block="HeroHeader" data-layout={layout} className={className} style={{ ...SECTION(layout), alignItems: mobile ? 'stretch' : 'center', ...style }}>
      <div data-part="copy" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), flex: 1 }}>
        {badgeVisible && <div><Badge appearance="soft" shape="pill" iconTrailing={boxedGlyph("caret-right", "icon.small")}>New demo reel released</Badge></div>}
        <Reveal role="use-reveal"><h1 style={{ margin: 0, ...type('display-lg') }}>{headline}</h1></Reveal>
        <p style={{ margin: 0, ...type('body-lg'), ...secondary }}>{body}</p>
        {formVisible && (
          <form data-part="form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: v('spacing.gap-control') }}>
            <div style={{ flex: 1 }}><Input type="email" placeholder="Your email address" aria-label="Email address" /></div>
            <Button type="submit">Sign up</Button>
          </form>
        )}
      </div>
      <div data-part="media" style={{ flex: 1, overflow: 'hidden', borderRadius: v('radius.container') }}>{media ?? <Image ratio={mobile ? '4:3' : '3:4'} alt="" />}</div>
    </section>
  )
}

const FAQS: [string, string][] = [
  ['What is Escala?', 'A design system whose tokens, components and blocks stay in sync from Figma to code.'],
  ['Can I use my own brand colours?', 'Yes. Pick an accent and every role is solved for contrast in Light and Dark.'],
  ['Is there a free plan?', 'Escala is in open beta: everything is available while pricing is being decided.'],
  ['How do I sync with Figma?', 'Publish from the configurator, then run the plugin and paste the sync link.'],
]

/** Figma `FAQSection` (Style split · centered × Layout). */
export function FAQSection({ layout = 'desktop', faqStyle = 'split', badgeVisible = true, heading = 'Frequently asked questions', body = 'Get answers to commonly asked questions.', style, className }: Common & { faqStyle?: FaqStyle; badgeVisible?: boolean; heading?: string; body?: string }) {
  const split = faqStyle === 'split' && layout === 'desktop'
  return (
    <section data-block="FAQSection" data-layout={layout} data-style={faqStyle} className={className} style={{ ...SECTION(layout), flexDirection: split ? 'row' : 'column', alignItems: split ? 'flex-start' : 'stretch', ...style }}>
      <div data-part="intro" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), alignItems: faqStyle === 'centered' ? 'center' : 'flex-start', textAlign: faqStyle === 'centered' ? 'center' : 'start', flex: split ? '0 0 auto' : undefined, width: split ? 'calc(var(--spacing-32) * 3 + var(--spacing-16))' : undefined }}>
        {badgeVisible && <Badge size="xs" appearance="soft" shape="pill">FAQs</Badge>}
        <h2 style={{ margin: 0, ...type('display-sm') }}>{heading}</h2>
        <p style={{ margin: 0, ...type('body-md'), ...secondary }}>{body}</p>
      </div>
      <Accordion variant="ghost-underline" style={{ flex: 1 }}>
        {FAQS.map(([q, a], i) => <AccordionItem key={q} value={`faq-${i}`} label={q} iconVisible={false}>{a}</AccordionItem>)}
      </Accordion>
    </section>
  )
}

/** Figma `PricingCard`. */
export function PricingCard({ planName = 'Basic plan', price = '$10/mth', billing = 'Billed annually.', features = ['Access to all basic features', 'Basic reporting and analytics', 'Up to 10 individual users', '20 GB individual data', 'Basic chat and email support'], cta = 'Get started', style }: { planName?: string; price?: string; billing?: string; features?: string[]; cta?: string; style?: React.CSSProperties }) {
  return (
    <article data-block="PricingCard" aria-label={planName} style={{ display: 'flex', flexDirection: 'column', background: v('color.surface.layer-1'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'), overflow: 'hidden', minWidth: 0, ...style }}>
      <div data-part="body" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), padding: v('spacing.inset-surface') }}>
        <FeaturedIcon icon={glyph('sparkle')} />
        <div data-part="heading" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-tight') }}>
          <span style={{ ...type('heading-xs') }}>{planName}</span>
          <span style={{ ...type('display-sm') }}>{price}</span>
          <span style={{ ...type('body-sm'), ...secondary }}>{billing}</span>
        </div>
        <ul data-part="features" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), margin: 0, padding: 0, listStyle: 'none' }}>
          {features.map((f) => <li key={f} style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control'), ...type('body-sm') }}>{boxedGlyph('check')}{f}</li>)}
        </ul>
      </div>
      <div data-part="footer" style={{ padding: v('spacing.inset-surface'), borderTop: `${v('stroke.divider')} solid ${v('color.border.subtle')}` }}><Button style={{ width: '100%' }}>{cta}</Button></div>
    </article>
  )
}

const PLANS = [{ planName: 'Basic plan', price: '$10/mth' }, { planName: 'Business plan', price: '$20/mth' }, { planName: 'Enterprise plan', price: '$40/mth' }]

/** Figma `PricingSection`. The cards stagger in once. */
export function PricingSection({ layout = 'desktop', eyebrow = 'Pricing', heading = 'Simple, transparent pricing', body = 'We believe Escala should be accessible to every team, no matter the size.', style, className }: Common & { eyebrow?: string; heading?: string; body?: string }) {
  return (
    <section data-block="PricingSection" data-layout={layout} className={className} style={{ ...SECTION(layout), flexDirection: 'column', ...style }}>
      <div data-part="intro" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), alignItems: 'center', textAlign: 'center' }}>
        <span style={{ ...type('label'), color: v('color.content.accent') }}>{eyebrow}</span>
        <h2 style={{ margin: 0, ...type('display-sm') }}>{heading}</h2>
        <p style={{ margin: 0, ...type('body-md'), ...secondary }}>{body}</p>
      </div>
      <div data-part="plans" style={{ display: 'flex', flexDirection: layout === 'mobile' ? 'column' : 'row', gap: v('spacing.gap-group') }}>
        {PLANS.map((plan, i) => <Reveal key={plan.planName} role="use-stagger-in" index={i} style={{ flex: 1, minWidth: 0 }}><PricingCard {...plan} style={{ height: '100%' }} /></Reveal>)}
      </div>
    </section>
  )
}

const SERVICES = [['Website design', 'UX design', 'User research'], ['Content creation', 'Strategy & consulting', 'Other']]

/** Figma `ContactSection`. */
export function ContactSection({ layout = 'desktop', media, style, className }: Common & { media?: React.ReactNode }) {
  const mobile = layout === 'mobile'
  return (
    <section data-block="ContactSection" data-layout={layout} className={className} style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', width: '100%', background: v('color.surface.page'), color: v('color.content.primary'), ...style }}>
      <div data-part="media" style={{ flex: 1, overflow: 'hidden' }}>{media ?? <Image ratio="auto" alt="" style={{ height: '100%', minHeight: mobile ? 'calc(var(--spacing-32) * 2)' : undefined }} />}</div>
      <form data-part="form-area" onSubmit={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: v('spacing.gap-section'), padding: `${v('spacing.inset-section')} ${v('spacing.inset-page')}` }}>
        <div data-part="intro" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>
          <h2 style={{ margin: 0, ...type('display-sm') }}>Let’s level up your brand, together</h2>
          <p style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: v('spacing.gap-tight'), ...type('body-lg'), ...secondary }}>You can reach us anytime via <TextLink href="mailto:hi@escala.design" size="lg">hi@escala.design</TextLink></p>
        </div>
        <div data-part="form" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>
          <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: v('spacing.gap-group') }}>
            <div style={{ flex: 1 }}><Field label="First name" required><Input placeholder="Ada" /></Field></div>
            <div style={{ flex: 1 }}><Field label="Last name" required><Input placeholder="Lovelace" /></Field></div>
          </div>
          <Field label="Email" required><Input type="email" placeholder="you@company.com" /></Field>
          <Field label="Company"><Input placeholder="Company name" /></Field>
          <Field label="Message"><Textarea placeholder="Leave us a message…" /></Field>
          <div data-part="services" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control') }}>
            <span style={type('label')}>Services</span>
            <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: v('spacing.gap-group') }}>
              {SERVICES.map((column, i) => <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control') }}>{column.map((s) => <CheckboxItem key={s} size="xs" label={s} />)}</div>)}
            </div>
          </div>
          <Button type="submit">Get started</Button>
        </div>
      </form>
    </section>
  )
}

const FOOTER_LINKS: [string, string[]][] = [['Product', ['Overview', 'Components', 'Blocks', 'Pricing']], ['Company', ['About', 'Blog', 'Careers', 'Contact']], ['Resources', ['Docs', 'Changelog', 'Community', 'Support']]]

/** Figma `Footer`. */
export function Footer({ layout = 'desktop', newsletterVisible = true, links, style, className }: Common & { newsletterVisible?: boolean; links?: React.ReactNode }) {
  const mobile = layout === 'mobile'
  return (
    <footer data-block="Footer" data-layout={layout} className={className} style={{ ...SECTION(layout), flexDirection: 'column', ...style }}>
      <div data-part="top" style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: v('spacing.gap-section'), justifyContent: 'space-between' }}>
        <div data-part="brand-column" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), maxWidth: 'calc(var(--spacing-32) * 2 + var(--spacing-24))' }}>
          <Brand versionVisible={false} />
          <p style={{ margin: 0, ...type('body-sm'), ...secondary }}>Design tokens and components that stay in sync from Figma to code.</p>
          <div style={{ display: 'flex', gap: v('spacing.gap-tight') }}>{['X', 'GitHub', 'Slack', 'LinkedIn'].map((n) => <IconButton key={n} size="sm" variant="secondary" appearance="ghost" aria-label={n} icon={boxedGlyph('dot')} />)}</div>
        </div>
        {links ?? (
          <nav data-part="links" aria-label="Footer" style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: v('spacing.gap-section') }}>
            {FOOTER_LINKS.map(([heading, items]) => (
              <div key={heading} style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>
                <span style={type('label')}>{heading}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control') }}>{items.map((l) => <TextLink key={l} href="#" size="sm" variant="secondary" underline={false}>{l}</TextLink>)}</div>
              </div>
            ))}
          </nav>
        )}
        {newsletterVisible && (
          <form data-part="newsletter" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), maxWidth: 'calc(var(--spacing-32) * 2 + var(--spacing-24) + var(--spacing-8))' }}>
            <span style={type('label')}>Stay up to date</span>
            <span style={{ ...type('body-sm'), ...secondary }}>Release notes once a month, no spam.</span>
            <div style={{ display: 'flex', gap: v('spacing.gap-control') }}><div style={{ flex: 1 }}><Input size="sm" type="email" placeholder="you@company.com" aria-label="Email address" /></div><Button size="sm" type="submit">Subscribe</Button></div>
          </form>
        )}
      </div>
      <Separator />
      <div data-part="bottom" style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: v('spacing.gap-section'), justifyContent: 'space-between', ...type('caption'), ...secondary }}>
        <span>© 2026 Escala. All rights reserved.</span>
        <span style={{ display: 'flex', gap: v('spacing.gap-group') }}><TextLink href="#" size="xs" variant="secondary" underline={false}>Privacy</TextLink><TextLink href="#" size="xs" variant="secondary" underline={false}>Terms</TextLink></span>
      </div>
    </footer>
  )
}

export const MARKETING_BLOCKS = { HeroHeader, FAQSection, PricingCard, PricingSection, ContactSection, Footer } as const
