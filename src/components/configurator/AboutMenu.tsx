import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { TOKEN_SCHEMA_VERSION } from '../../lib/tokenGenerator'
import { useI18n } from '../../lib/i18n'
import { setTheme, useTheme } from '../../lib/theme'
import { COMPONENT_KEYS } from '../../lib/componentCatalogue'
import { ALL_ROLES } from '../../lib/semanticRoles'
import { categoricalRoleCount } from '../../lib/semanticArchitectures'
import { TOOL_SPECS } from '../../lib/agentAccess/types'
import { THEME_STYLE_PRESETS } from '../../lib/themePresets'
import { PRICING_PATH } from '../../lib/entitlement'
import { CONTACT_PATH } from '../../lib/legal'
import { FOUNDATION_KEYS } from '../../lib/foundationKeys'
import { showToast } from '../ui/Toast'
import { FIGMA_PLUGIN_COMMUNITY, cn } from '../../lib/utils'
import PluginCommunityBanner from './PluginCommunityBanner'
import { AppearanceToggle, BrandMark, FigmaGlyph, LanguageMenu, TOP_NAV_H, type DocsMenuPage } from './TopNav'
import { NumberTicker } from '../ui/number-ticker'
import { RainbowButton } from '../ui/rainbow-button'
import { DiaTextReveal } from '../ui/dia-text-reveal'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'
import AgentInstallPanel from './AgentInstallPanel'
import { FooterLinks } from './FooterLinks'

// ── The corporate/about drawer (burger menu) ─────────────────────────────────
// Everything the workspace itself can't say: what Escala IS, how its three
// token tiers relate, how the Figma plugin consumes them, what the component
// docs are derived from, and who made it. "What shipped when" used to live
// here too — moved to Docs · Changelog (`docs/changelogArticle.tsx`), since
// it's documentation, not corporate/about copy, and Docs is where a returning
// user would actually look for it.
//
// A right-side drawer rather than a centered modal: this is reference reading
// you consult WHILE working, so it slides in beside the canvas instead of
// blocking it, and every section is collapsed by default — a list of five
// labels, not five essays. Only the section you opened it on expands.
//
// **This module owns the content, not just the drawer.** `AboutAccordion` and
// `AboutContact` are exported so the MOBILE screen (`App.tsx`'s
// `DesktopOnlyNotice`, the only thing that renders below `md`) can show the
// same sections. A phone visitor can't use the workspace — but "what is this"
// is exactly what they came for, and it used to be locked behind a burger
// button that only exists in the desktop shell. One array, two surfaces: the
// copy can't drift between them.

export type AboutSection = 'platform' | 'tokens' | 'plugin' | 'docs' | 'legal'

/** The creator's contact details — the one place they're defined. The public
 *  "contact" block leads with LinkedIn and X; `email` is kept only as the
 *  target for Docs' FAQ "report a bug" CTA (a prefilled mail draft), not shown
 *  as a raw address anywhere. Any of these set to null just drops its row. */
export const CONTACT = {
  site: 'duscenko.com',
  linkedin: 'https://www.linkedin.com/in/cesar-durango/' as string | null,
  x: 'https://x.com/duscenko' as string | null,
}

const COPYRIGHT_YEAR = 2026

/** Shown in the footer bar AND at the foot of About, so the one legal
 *  line can't drift. Matches LICENSE: Cesar Durango (Duscenko). */
export const COPYRIGHT_LINE = `© ${COPYRIGHT_YEAR} Cesar Durango (Duscenko)`

/** ease-out-quint — the SAME curve `AboutAccordion`'s own height animation
 *  already uses below. One easing across this file, not a bouncier one for
 *  the new hero and a different one for the accordion. */
const EASE = [0.22, 1, 0.36, 1] as const

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** Inline code chip — same treatment FigmaDownloadView uses for `manifest.json`. */
function C({ children }: { children: ReactNode }) {
  return <code className="text-caption px-1 py-0.5 rounded bg-elevated text-fg-muted font-mono">{children}</code>
}

function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-body leading-relaxed text-fg-muted', className)}>{children}</p>
}

/** A token tier: name, the chain step it aliases, one honest example. */
function Tier({ n, name, detail, example }: { n: number; name: string; detail: string; example: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-4 text-caption font-mono tabular-nums text-fg-faint pt-[3px]">{n}</span>
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-body font-medium text-fg">{name}</span>
        <span className="text-body leading-relaxed text-fg-muted">{detail}</span>
        <span className="text-caption font-mono text-fg-faint break-all">{example}</span>
      </div>
    </div>
  )
}

/** The five About sections.
 *
 *  **A HOOK, not a const array — that change is what made this page
 *  translatable at all.** It used to be a module-level `SECTIONS` const whose
 *  bodies were English JSX literals, so no `t()` could ever reach them: the
 *  chrome around the accordion spoke three languages while every word of the
 *  actual reading material stayed English. A hook runs inside a component, so
 *  it can call `useI18n`. Both consumers (`AboutAccordion` here, and
 *  `AboutScaffold`'s mobile/`/about` callers through it) are components, so
 *  nothing had to move to accommodate it. */
export function useAboutSections(): {
  /** `question` is the same section phrased as a FAQ — the About tab's
   *  "Good questions" band (`AboutAccordion variant="faq"`); the drawer and
   *  `AboutScaffold` keep `label` + `hint`. */
  key: AboutSection; label: string; hint: string; question: string; body: ReactNode
}[] {
  const { t } = useI18n()
  return [
  {
    key: 'platform',
    question: t('What is Escala?'),
    label: t('What Escala is'),
    hint: t('The short version'),
    body: (
      <div className="flex flex-col gap-3">
        <P>
          {t('A configurator for design token systems. You define a palette, type scale, spacing, radius and the rest once; Escala derives the full scales, keeps light and dark in step, and ships the result as')}{' '}
          <C>tokens.json</C>, <C>variables.css</C>{' '}
          {t('and a README, plus a Figma plugin that imports all of it as real Variables.')}
        </P>
        <P>
          {t('The point is')} <span className="text-fg">{t('no bloat')}</span>
          {t(": you export the tokens you actually chose, not a framework's opinion of a design system. Everything on screen derives from one payload, so the preview, the export and what lands in Figma can't disagree.")}
        </P>
        <P>
          {t('That same payload is also queryable')}{' '}
          <span className="text-fg">{t('live, by AI coding agents')}</span>{' '}
          {t('such as Cursor, Claude Code and Copilot, through a Model Context Protocol (MCP) server this project publishes. Instead of guessing a hex or a spacing value, your agent looks the real token up.')}
        </P>
      </div>
    ),
  },
  {
    key: 'tokens',
    question: t('How do the tokens work?'),
    label: t('How the tokens work'),
    hint: t('Three tiers, one chain'),
    body: (
      <div className="flex flex-col gap-3.5">
        <P>
          {t('Every value resolves down a chain. Nothing holds a copy of anything above it, so retinting one family repaints everything that references it.')}
        </P>
        <div className="flex flex-col gap-3">
          <Tier
            n={1}
            name={t('Primitives')}
            detail={t("Radix's model: each family is a 1–12 scale where the step means a role, not a lightness. Tone 9 is the anchor: your input hex, verbatim. Every family ships a light ramp and a dark twin.")}
            example="accent-9 · neutral-dark-3 · error-11"
          />
          <Tier
            n={2}
            name={t('Semantics')}
            detail={t('Named roles that point AT a primitive tone, per theme. A theme is a reading of the primitives; it stores which family fills each slot, never a hex of its own.')}
            example="text-primary → neutral-12"
          />
          <Tier
            n={3}
            name={t('Components')}
            detail={t('Created by the plugin in Figma: one variable per component property, aliasing its semantic role. Retheming a button is a one-variable change, and the whole chain stays inspectable.')}
            example="button/bg → action/primary → accent-9"
          />
        </div>
        {/* This paragraph used to advertise FOUR semantic architectures —
            Flat, Categorical, Vibrancy (Apple HIG) and Tonal (Material 3).
            Three of those no longer exist: the picker was cut to Categorical
            alone in store v50 and the projections were deleted outright in
            v57, leaving `SemanticArchitecture = 'flat' | 'categorical'`. The
            page was promising a choice the app cannot offer, and Docs · FAQ
            already answered "Why is there only one architecture?" two clicks
            away — the app contradicting itself. The role count is READ from
            the table (`categoricalRoleCount()`), never restated, because the
            other place that restated it had drifted to 39 against a real 64. */}
        <P>
          {t('The semantic layer is projected into one shape:')}{' '}
          <span className="text-fg">{t('Categorical')}</span>{' '}
          {t('— a grouped DTCG tree of {count} roles across Content, Action, Surface, Status and Border. One architecture, not a choice: every consumer (Figma, CSS, an AI agent) has to agree on what a role means. Contrast for text tones is solved against the page, targeting WCAG AA.', { count: categoricalRoleCount() })}
        </P>
      </div>
    ),
  },
  {
    key: 'plugin',
    question: t('How does the Figma plugin work?'),
    label: t('How the Figma plugin works'),
    hint: t('Import and live sync'),
    body: (
      <div className="flex flex-col gap-3">
        <P>
          {t('The plugin reads the same')} <C>tokens.json</C>{' '}
          {t('this app exports (contract')}{' '}
          <span className="text-fg">{t('schema v{version}', { version: TOKEN_SCHEMA_VERSION })}</span>
          {t(') and builds real Figma Variable collections: Color Primitives, Color Semantics with a mode per theme, Typography, Spacing, Radius, and a Components collection whose variables alias the semantic roles.')}
        </P>
        <ol className="flex flex-col gap-1.5 text-body leading-relaxed text-fg-muted list-decimal pl-4">
          <li>{t('Install Escala Tokens from Figma Community.')}</li>
          <li>{t('In the Figma desktop app, run')} <span className="text-fg">Plugins → Escala Tokens</span>.</li>
          <li>{t('Choose what to import: variables, styles, components, documentation.')}</li>
        </ol>
        <P>
          {t("It can also pull live: the plugin's Live Sync tab polls this project's endpoint, so publishing from here updates Figma without re-importing a file. Each design system publishes to its own scoped URL, so systems never overwrite each other.")}
        </P>
        <a
          href={FIGMA_PLUGIN_COMMUNITY}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-body font-semibold text-accent-ui hover:underline"
        >
          {t('Open in Figma Community')}
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </svg>
        </a>
      </div>
    ),
  },
  {
    key: 'docs',
    question: t('What is the documentation based on?'),
    label: t('What the documentation is based on'),
    hint: t('Sources of truth'),
    body: (
      <div className="flex flex-col gap-3">
        <P>
          <span className="text-fg">{t('The Figma plugin is the source of truth for the catalogue.')}</span>{' '}
          {t("Each of the {count} components mirrors a plugin entry: its key is the plugin's gate, its variant axes mirror the plugin's spec matrix, and its category mirrors the plugin's divider pages. When the plugin changes, the catalogue follows, never the reverse.", { count: COMPONENT_KEYS.length })}
        </P>
        <P>
          {t("Docs pages are generated from that catalogue plus the live specimen registry, so the preview you interact with is the same renderer the docs embed; it reads your tokens, not a screenshot. Components not yet in the Figma library say so explicitly rather than implying a set that doesn't exist.")}
        </P>
        {/* "and Apple HIG / Material 3 for the two alternative semantic
            architectures" was cut here for the same reason as above: those two
            architectures are gone, so the sentence credited standards this app
            no longer implements. */}
        <P>
          {t('The standards behind the defaults:')} <span className="text-fg">Radix Colors</span>{' '}
          {t('for the 12-step scale model,')} <span className="text-fg">W3C Design Tokens (DTCG)</span>{' '}
          {t('for the interchange format, and')} <span className="text-fg">WCAG</span>{' '}
          {t('for contrast targets.')}
        </P>
      </div>
    ),
  },
  {
    key: 'legal',
    question: t('Who owns my data, and where is it stored?'),
    label: t('Legal & data'),
    hint: t('Ownership and storage'),
    body: (
      <div className="flex flex-col gap-3">
        <P>
          {COPYRIGHT_LINE}.{' '}
          {t('Escala Tokens and its source are the work of Cesar Durango. The design systems you build with it are')}{' '}
          <span className="text-fg">{t('yours')}</span>.{' '}
          {t('The tokens, scales and exported files carry no licence or attribution requirement from this tool.')}
        </P>
        <P>
          <span className="text-fg">{t('Where your work lives:')}</span>{' '}
          {t("your system is stored in your own browser (localStorage). An account is optional: signing in only serves online saving and the Pro licence, and without one there is no server-side profile. Tokens leave the browser only when you ask: publishing for Figma live-sync uploads the token payload to this project's endpoint, and connecting GitHub pushes files to the repo you pick. A GitHub token you provide stays in your browser and is never sent anywhere but GitHub.")}
        </P>
        {/* Mirrors the privacy contract in lib/analytics.ts — change both together. */}
        <P>
          <span className="text-fg">{t("What we measure:")}</span>{' '}
          {t("anonymous, cookieless usage statistics through Vercel Web Analytics \u2014 pages visited, country, device and browser type, the referring site, and counts of actions such as exports or Figma syncs. No cookies, no advertising, no personal identifiers, nothing you type. Published tokens are readable by anyone who has the system's ID, so treat that ID like a link you share. Our host keeps short-lived request logs (including IP addresses) for security and abuse prevention.")}
        </P>
        <P>
          <a href="/privacy" className="text-fg underline underline-offset-2">{t('Read the privacy policy')}</a>
          {' · '}
          <a href="/legal" className="text-fg underline underline-offset-2">{t('Legal notice')}</a>
        </P>
        {/* Material Design and Apple HIG were dropped from this disclaimer
            with the architectures that referenced them — a trademark notice
            should name what the project actually leans on, and after v57 that
            is Figma, Radix and W3C. */}
        <P className="text-fg-faint">
          {t('Figma is a trademark of Figma, Inc. Radix Colors and the W3C Design Tokens format are referenced as public standards; this project is not affiliated with, endorsed by, or sponsored by any of them.')}
        </P>
      </div>
    ),
  },
  ]
}

function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

/** Contact row — a link with its glyph, kept flat (no card) so the block reads
 *  as a signature rather than a promo panel. */
function ContactRow({ icon, label, href }: { icon: ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') || href.startsWith('/') ? undefined : '_blank'}
      rel={href.startsWith('mailto:') || href.startsWith('/') ? undefined : 'noreferrer'}
      className="flex items-center gap-2.5 px-2 h-8 -mx-2 rounded-lg text-body text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
    >
      <span className="text-fg-faint flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  )
}

/** One glyph per section, in the exact fixed order `SECTIONS` renders them —
 *  a plain object literal keyed by `AboutSection` so a missing entry is a
 *  TypeScript error, not a silently blank icon. Hand-drawn inline, same
 *  weight/size as `MailIcon`/`GlobeIcon` above: no icon package pulled in for
 *  five glyphs already this cheap to draw. */
function InfoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </svg>
  )
}
function LayersGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
    </svg>
  )
}
function DocGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 2.5h7l4 4V21H7z" />
      <path d="M14 2.5V7h4M9.5 12h6M9.5 16h6" />
    </svg>
  )
}
function ScaleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3v18M7 21h10M5 7h6M13 7h6" />
      <path d="M5 7 2.5 12a2.5 2.5 0 0 0 5 0L5 7ZM19 7l-2.5 5a2.5 2.5 0 0 0 5 0L19 7Z" />
    </svg>
  )
}
const SECTION_ICONS: Record<AboutSection, ComponentType<{ className?: string }>> = {
  platform: InfoGlyph,
  tokens: LayersGlyph,
  plugin: FigmaGlyph,
  docs: DocGlyph,
  legal: ScaleGlyph,
}

/** The five collapsible sections, on Radix's own `Accordion` primitive
 *  (`ui/accordion.tsx`) instead of a hand-rolled `motion.div` height
 *  animation. Shared by the About tab, the `/about` route and the mobile
 *  screen, so none of them can carry a stale copy of another's wording —
 *  `pad` is the one thing that differs per caller: the drawer sits flush
 *  inside a 440px sheet, the mobile page needs the same gutter its own
 *  header uses, and the About tab passes `px-0` because its own band already
 *  has one.
 *
 *  A leading icon per section (`SECTION_ICONS`) replaced an earlier
 *  monospace `01…06` index — same slot, a glyph instead of a number.
 *  The body used to cap at 500px measured width so paragraphs didn't run
 *  the full band's ~780px — reverted for the About tab specifically (see
 *  `bleed`), which is wide enough that the cap read as unused whitespace
 *  rather than a readability aid; the other two callers are already
 *  narrower than 500px in practice, so nothing there was relying on it. */
export function AboutAccordion({
  section, onSectionChange, pad = 'px-5', variant = 'list',
}: {
  section: AboutSection | null
  onSectionChange: (s: AboutSection | null) => void
  pad?: string
  /** `'list'` (default) is the drawer / mobile / `/about` rendering: glyph ·
   *  label · hint. `'faq'` is the About tab's "Good questions" band: the same
   *  sections phrased as questions, no glyph or hint, a hairline between rows
   *  (`AccordionItem`'s own `border-b`) and roomier type — one component, two
   *  presentations, so the copy still can't drift between surfaces. */
  variant?: 'list' | 'faq'
}) {
  const sections = useAboutSections()
  const faq = variant === 'faq'
  return (
    <Accordion
      type="single"
      collapsible
      value={section ?? ''}
      onValueChange={(v) => onSectionChange((v || null) as AboutSection | null)}
    >
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.key]
        return (
          <AccordionItem key={s.key} value={s.key} data-section={s.key}>
            {faq ? (
              <>
                <AccordionTrigger className="items-center py-6 [&>svg]:translate-y-0">
                  <span className="flex-1 min-w-0 text-title font-medium leading-snug text-fg">{s.question}</span>
                </AccordionTrigger>
                <AccordionContent className="max-w-[640px] pb-6 text-ui leading-relaxed text-fg-muted">
                  {s.body}
                </AccordionContent>
              </>
            ) : (
              <>
                <AccordionTrigger className={`${pad} hover:bg-elevated/40`}>
                  <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 text-fg-faint" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-ui font-medium text-fg leading-tight">{s.label}</span>
                    <span className="block text-caption text-fg-faint leading-tight mt-1">{s.hint}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className={pad}>
                  {s.body}
                </AccordionContent>
              </>
            )}
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

/** Contact — always open. It's four lines, and hiding the author behind a
 *  disclosure in an "about" menu would be perverse. Used flat by the drawer
 *  and `AboutScaffold`; the About tab has its own Contact band (`AboutHome`)
 *  with the socials moved to its footer. */
export function AboutContact({ pad = 'px-5' }: { pad?: string }) {
  const { t } = useI18n()
  const body = (
    <>
      <span className="text-caption font-semibold uppercase tracking-widest text-fg-faint">{t('Contact')}</span>
      <P>
        {t('Built and maintained by')} <span className="text-fg">Cesar Durango</span>,{' '}
        {t('design systems and design engineering.')}
      </P>
      <div className="flex flex-col mt-0.5">
        <ContactRow icon={<MailIcon />} label={t('Contact form')} href="/contact" />
        {CONTACT.linkedin && (
          <ContactRow icon={<LinkedInIcon />} label="LinkedIn" href={CONTACT.linkedin} />
        )}
        {CONTACT.x && (
          <ContactRow icon={<XIcon />} label="X" href={CONTACT.x} />
        )}
        <ContactRow icon={<GlobeIcon />} label={CONTACT.site} href={`https://${CONTACT.site}`} />
      </div>
    </>
  )

  return (
    <div className={`${pad} py-4 flex flex-col gap-2`}>
      {body}
    </div>
  )
}

/** A dashed-outline empty box — where a real screenshot goes once the user
 *  drops one in. Deliberately not generated art: swap the contents of this
 *  element for a real `<img src="…" className="w-full h-full object-cover
 *  rounded-2xl" />` (same className on the wrapper minus the dashed border)
 *  when the screenshot is ready. */
function ImagePlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-elevated/30 text-fg-faint',
        className,
      )}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="text-caption font-medium text-center px-4">{label}</span>
    </div>
  )
}

/** A real capture of the generator (public/about/*.webp, made by
 *  `npm run about:shots` — re-run it when the interface changes, so this guide
 *  never drifts). Dark chrome, 2×, already cropped to the slot's ratio; the
 *  `width`/`height` attributes reserve that space so nothing shifts as they
 *  load, and everything is lazy because the page is long. */
function AboutShot({ shot, className, ratio }: {
  shot: AboutShotSpec
  className?: string
  /** Force a slot ratio (e.g. one row of cards mixing 16:10 and 4:3 shots);
   *  the picture keeps its top edge and gives up the bottom. */
  ratio?: string
}) {
  const { t } = useI18n()
  const [w, h] = shot.size
  return (
    <img
      src={`/about/${shot.file}.webp`}
      alt={t(shot.alt)}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('block w-full select-none rounded-xl border border-line object-cover object-top', className)}
      style={{ aspectRatio: ratio ?? `${w} / ${h}` }}
    />
  )
}

type AboutShotSpec = { file: string; size: [number, number]; alt: string }

/** Every screenshot the About page shows. `size` is the stored file's own
 *  pixel size (what `about:shots` prints); the alt text is the translatable
 *  description a screen reader gets in place of the picture. */
const SHOTS = {
  styles: { file: 'system-styles', size: [1200, 900], alt: 'The theme sheet with a System Style selected, showing its palette, font, radius and icon weight' },
  primitives: { file: 'primitives', size: [1360, 850], alt: 'The Primitives table: one accent family with a dark and a light column, step 9 marked as the anchor' },
  semantics: { file: 'semantics', size: [1360, 850], alt: 'The Semantics table with Token Details open on a role, showing the ramp it can point at' },
  contrast: { file: 'contrast', size: [1200, 900], alt: 'The contrast grid: every pair of the twelve accent steps measured with APCA' },
  type: { file: 'type', size: [1360, 850], alt: 'The Font edition panel: body and heading font and a five-step text scale slider' },
  radius: { file: 'radius', size: [1360, 850], alt: 'The Radius edition panel with Fields at the roundest step while Boxes keep theirs' },
  spacing: { file: 'spacing', size: [1200, 900], alt: 'The Spacing responsive table with the Mobile platform selected' },
  components: { file: 'components', size: [1360, 850], alt: 'The Button page in Components: a live playground with colour, style, size and state controls' },
  docs: { file: 'docs', size: [1360, 850], alt: 'The Color documentation page, built from the system\'s own accent ramps' },
  code: { file: 'code', size: [1360, 850], alt: 'The Code tab: the theme\'s variables.css with CSS, Markdown and Agent context views' },
  figma: { file: 'figma', size: [1360, 850], alt: 'The Figma sync page: themes and viewports to ship, the file name and the ID to paste in the plugin' },
} satisfies Record<string, AboutShotSpec>

/** One number in the stats row, real counts, imported/derived, never typed
 *  by hand (see the callers below). `NumberTicker` (magicui) drives the
 *  count-up itself; `delay` staggers it roughly in step with the parent's
 *  own `statsContainer` stagger, so the digits and the fade/rise motion read
 *  as one movement, not two unrelated animations layered on top of each
 *  other. Falls back to the plain final value under reduced motion, and
 *  still lifts a couple px on hover, the same "this responds to you" cue
 *  the CTA button and the feature cards give — a real number shouldn't be
 *  the one inert thing on an otherwise interactive page. */
function Stat({ value, label, delay = 0 }: { value: number; label: string; delay?: number }) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <motion.div
      variants={statsItem}
      whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.15, ease: EASE } }}
      className="flex flex-col gap-0.5"
    >
      <span className="text-display font-semibold text-fg tabular-nums inline-flex items-baseline">
        {reduceMotion ? (
          value
        ) : (
          <NumberTicker value={value} delay={delay} className="text-display font-semibold text-fg tabular-nums" />
        )}
        +
      </span>
      <span className="text-caption text-fg-muted leading-snug">{label}</span>
    </motion.div>
  )
}

/** `</>` — the "Code" tile's mark. Kept local (matches `MailIcon`/`GlobeIcon`
 *  above): one glyph, no reason to pull in an icon package for it. */
/** Hero stagger — the ONE choreographed moment this page gets (see the
 *  `animate` note on `AboutHome` below): mark → eyebrow → headline → CTA,
 *  each fading/rising in ~70ms after the last. `hidden`/`show` are picked up
 *  automatically by any `motion.*` child that doesn't declare its own
 *  initial/animate, so nothing but the outer container needs to know about
 *  reduced motion. */
const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
}
const heroItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

/** The stats row's own small stagger — starts while the hero's is still
 *  settling (`delayChildren`), so the two read as one continuous beat
 *  rather than a second, disconnected animation kicking in after a pause. */
const statsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
}
const statsItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

/** A small mono eyebrow chip — names a section without competing with its
 *  headline. Section numbers ("01 · Foundations") give the long page a spine. */
function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Plain concatenation, NOT `cn`: tailwind-merge reads the custom
    // `text-mini` size as a colour and drops it in favour of `text-fg-muted`
    // (same trap FooterLinks documents).
    <span
      className={`inline-flex items-center rounded-md border border-line-strong bg-elevated/40 px-2 py-0.5 font-mono text-mini font-medium uppercase tracking-widest text-fg-muted ${className ?? ''}`}
    >
      {children}
    </span>
  )
}

/** Centered section opener: eyebrow · headline · one-line lead. */
function SectionHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="max-w-[640px] text-[26px] font-semibold leading-tight text-fg">{title}</h2>
      <p className="max-w-[560px] text-ui leading-relaxed text-fg-muted">{lead}</p>
    </div>
  )
}

/** One feature tile: a media slot on top (a placeholder until a real
 *  screenshot is dropped in) and title + one or two sentences below. */
function ShowcaseCard({ title, body, media }: {
  title: string
  body: string
  media: AboutShotSpec
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-elevated/20 transition-colors hover:border-line-strong">
      <div className="p-2">
        {/* One ratio for every card, so a row of 16:10 and 4:3 shots lines up. */}
        <AboutShot shot={media} ratio="16 / 10" />
      </div>
      <div className="flex flex-col gap-1.5 px-4 pb-4 pt-2">
        <h3 className="text-strong font-semibold text-fg">{title}</h3>
        <p className="text-body leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  )
}

/** One destination of the system — what the tokens become (Components ·
 *  Docs · Code · Figma). A large real capture on one side, the claim, up to
 *  three facts and an optional action on the other; `flip` alternates the
 *  sides so four in a row read as a sequence, not a stack. */
function FeatureSection({ eyebrow, title, body, points, media, flip = false, action, children }: {
  eyebrow: string
  title: string
  body: string
  points: string[]
  media: AboutShotSpec
  flip?: boolean
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-10 border-b border-line px-6 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <AboutShot shot={media} className={cn('rounded-2xl', flip && 'lg:order-2')} />
        <div className="flex flex-col gap-3">
          <Eyebrow className="self-start">{eyebrow}</Eyebrow>
          <h2 className="text-[26px] font-semibold leading-tight text-fg">{title}</h2>
          <p className="text-ui leading-relaxed text-fg-muted">{body}</p>
          <ul className="mt-1 flex flex-col gap-2">
            {points.map((point) => (
              <li key={point} className="flex gap-2.5 text-body leading-relaxed text-fg-muted">
                <CheckGlyph />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {action}
        </div>
      </div>
      {children}
    </section>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] flex-shrink-0 text-accent-ui" aria-hidden>
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}

function ArrowGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const FOOTER_LINK =
  'inline-flex min-h-6 items-center self-start rounded text-body text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

type FooterItem = { label: string; onClick?: () => void; href?: string; external?: boolean }

function FooterColumn({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <span className="text-caption font-medium text-fg-faint">{title}</span>
      {items.map((item) => item.href ? (
        <a
          key={item.label}
          href={item.href}
          className={FOOTER_LINK}
          {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {item.label}
        </a>
      ) : (
        <button key={item.label} type="button" onClick={item.onClick} className={FOOTER_LINK}>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

/** The About tab's own footer: brand + one line, then Product · AI · Social.
 *  Navigation only — legal links and the copyright are the shell strip's job. */
function AboutFooter({ onStart, onLearnAI, onOpenDocsPage, onOpenComponents }: {
  onStart: () => void
  onLearnAI: () => void
  onOpenDocsPage: (page: DocsMenuPage) => void
  onOpenComponents: () => void
}) {
  const { t } = useI18n()
  const social: FooterItem[] = [
    ...(CONTACT.linkedin ? [{ label: 'LinkedIn', href: CONTACT.linkedin, external: true }] : []),
    ...(CONTACT.x ? [{ label: 'X', href: CONTACT.x, external: true }] : []),
    { label: CONTACT.site, href: `https://${CONTACT.site}`, external: true },
    // No "Source": the colophon strip (`FooterLinks`) already carries it, and
    // nothing in that strip is repeated here.
  ]
  return (
    <footer className="grid grid-cols-2 gap-10 px-6 pb-16 pt-14 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
      <div className="col-span-2 flex flex-col gap-3 sm:col-span-3 lg:col-span-1">
        <span className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-strong font-semibold text-fg">Escala Tokens</span>
        </span>
        <p className="max-w-[320px] text-body leading-relaxed text-fg-muted">
          {t('One token system for Figma, code and your AI agent.')}
        </p>
      </div>
      <FooterColumn
        title={t('Product')}
        items={[
          { label: t('Generator'), onClick: onStart },
          { label: t('Components'), onClick: onOpenComponents },
          { label: t('Use in Figma'), onClick: () => onOpenDocsPage('figma') },
          { label: t('Pricing'), href: PRICING_PATH },
          { label: t('Changelog'), onClick: () => onOpenDocsPage('changelog') },
        ]}
      />
      <FooterColumn
        title={t('AI')}
        items={[
          { label: 'MCP', onClick: () => onOpenDocsPage('mcp') },
          { label: t('Connect your agent'), onClick: onLearnAI },
        ]}
      />
      <FooterColumn title={t('Social')} items={social} />
    </footer>
  )
}

/** The About TAB's canvas — the workspace's landing surface for new visitors
 *  (see `Configurator.tsx`'s `hasOnboarded()` gate). Embedded in the
 *  flex-1/min-h-0 center column like any other tab's body, so it owns its own
 *  scroll region rather than reusing `AboutScaffold`'s `min-h-screen` wrapper.
 *  Its CTA is an in-app action (`onStart`), not a link: this IS the app.
 *
 *  Long-form product page, one section per job: hero → proof (stats) → start
 *  from a style → Color → the other foundations → hand-off (Figma · agent ·
 *  code) → closing CTA → "Good questions" (the shared reference sections as a
 *  FAQ, `AboutAccordion variant="faq"`) → a Contact band → a navigation footer.
 *  Same `useAboutSections` content as every other About surface, so the
 *  reference copy can't drift. The footer is navigation only: the shell's 28px
 *  strip stays the one colophon (copyright + legal links), and the socials
 *  appear once, in the footer.
 *
 *  The pictures are REAL captures of the generator (`SHOTS` → public/about/,
 *  made by `npm run about:shots`) — the page is a guide, so it must show the
 *  product as it is. Re-run the script when the interface changes; never fill
 *  a slot with generated art. The hand-off diagram and the closing band's
 *  background are not screenshots, so their slots are HIDDEN until the
 *  artwork exists (comments mark where they go) — a visible placeholder never
 *  ships.
 *
 *  Copy rule: every claim on this page must be true of the code today. Counts
 *  are imported (`THEME_STYLE_PRESETS.length`, `COMPONENT_KEYS.length`, …),
 *  never typed. */
export function AboutHome({
  onStart, onLearnAI, onOpenDocsPage, onOpenComponents,
  foundationCount = FOUNDATION_KEYS.length, scroll = true, videoTapToPlay = false,
}: {
  onStart: () => void
  /** Docs' focused pages — the SAME mapping TopNav's Docs menu uses
   *  (`Configurator`'s `openDocsPage`). The FAQ's "Read the docs" and the
   *  footer's Docs links go through it. */
  onOpenDocsPage: (page: DocsMenuPage) => void
  /** The Components destination (footer link). */
  onOpenComponents: () => void
  /** Opens Docs → Get started → "Use in code" (its Connect section is the
   *  agent guide). `Configurator.tsx` wires this to `openDocs(GUIDE_CODE_KEY)`. */
  onLearnAI: () => void
  /** Defaults to `FOUNDATION_KEYS.length`, the list a test keeps equal to
   *  `Configurator`'s `FOUNDATIONS`, so the public page states the same count. */
  foundationCount?: number
  /** `true` in the shell (the tab owns its scroll region); the public page
   *  (phone, `/about`) scrolls the document instead. */
  scroll?: boolean
  /** The phone screen: no autoplay (see `DemoVideo`). */
  videoTapToPlay?: boolean
}) {
  const { t } = useI18n()
  // Ids, not literals: the public copy and the in-app tab can both be in the DOM.
  const uid = useId()
  const faqId = `${uid}-faq`
  const contactId = `${uid}-contact`
  const [section, setSection] = useState<AboutSection | null>('platform')
  const reduceMotion = useReducedMotion() ?? false

  const secondaryCta =
    'inline-flex h-10 items-center gap-1.5 rounded-[13px] border border-line-strong px-5 text-ui font-semibold text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

  return (
    <div className={scroll ? 'h-full overflow-y-auto' : undefined}>
      <div className="mx-auto flex max-w-[1080px] flex-col">
        {/* ── Hero — the one staggered entrance this page gets. ── */}
        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={heroContainer}
          className="flex flex-col items-center gap-4 px-6 pt-16 pb-10 text-center"
        >
          <motion.div variants={heroItem}>
            <Eyebrow>{t('For Figma, code, and your AI agent')}</Eyebrow>
          </motion.div>
          <motion.div variants={heroItem} className="flex max-w-[640px] flex-col gap-3">
            <h1>
              <DiaTextReveal
                text={t('Define your foundations before you prompt.')}
                textColor="var(--fg)"
                colors={['#22d3ee', '#818cf8', '#f472b6', '#34d399']}
                className="text-[30px] font-semibold leading-[1.1] tracking-tight sm:text-[38px]"
              />
            </h1>
            <p className="text-ui leading-relaxed text-fg-muted">
              {t('Escala is where you set your design tokens once, then hand them to Figma, your code and any AI agent as one contract, so nothing invents its own colors, spacing or radius.')}
            </p>
          </motion.div>
          <motion.div variants={heroItem} className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <RainbowButton
              type="button"
              onClick={onStart}
              className="h-10 px-5 rounded-[13px] gap-1.5 text-ui font-semibold"
            >
              {t('Start building')}
              <ArrowGlyph />
            </RainbowButton>
            <button type="button" onClick={onLearnAI} className={secondaryCta}>
              {t('Connect your agent')}
            </button>
          </motion.div>
        </motion.div>

        <div className="px-6">
          <DemoVideo className="mb-14" tapToPlay={videoTapToPlay} />
        </div>

        {/* ── Proof — real counts, imported, never typed ── */}
        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={statsContainer}
          className="mx-6 grid grid-cols-2 gap-6 border-b border-line pb-14 sm:grid-cols-4"
        >
          <Stat value={foundationCount} label={t('Foundations you configure')} delay={0} />
          <Stat value={COMPONENT_KEYS.length} label={t('Components in the catalogue')} delay={0.08} />
          <Stat value={ALL_ROLES.length} label={t('Semantic roles')} delay={0.16} />
          <Stat value={TOOL_SPECS.length} label={t('MCP tools your agent can call')} delay={0.24} />
        </motion.div>

        {/* ── Start from a style — split: media left, copy right ── */}
        <div className="grid items-center gap-10 border-b border-line px-6 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <AboutShot shot={SHOTS.styles} className="rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Eyebrow className="self-start">{t('Start from a style')}</Eyebrow>
            <h2 className="text-[26px] font-semibold leading-tight text-fg">
              {t('Pick a System Style. Every foundation follows.')}
            </h2>
            <p className="text-ui leading-relaxed text-fg-muted">
              {t('{count} curated styles set colour, type, radius, shadows and icons in one move. Try one on, keep what fits, change the rest. Nothing is applied until you add it to your system.', { count: THEME_STYLE_PRESETS.length })}
            </p>
          </div>
        </div>

        {/* ── 01 · Foundations — what you set ── */}
        <section className="flex flex-col gap-10 border-b border-line px-6 py-16">
          <SectionHeader
            eyebrow={t('01 · Foundations')}
            title={t('One accent in. A whole system out.')}
            lead={t('Colour, type, radius and spacing from the same settings, checked for contrast in light and dark.')}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <ShowcaseCard
              title={t('Ramps in both appearances')}
              body={t('Every family ships a light ramp and a dark twin. Step 9 is always your exact brand colour.')}
              media={SHOTS.primitives}
            />
            <ShowcaseCard
              title={t('Roles solved for contrast')}
              body={t('Buttons, borders and status colours pick the tone that clears WCAG AA on the surface they sit on, in every theme.')}
              media={SHOTS.semantics}
            />
            <ShowcaseCard
              title={t('WCAG and APCA, side by side')}
              body={t('Every pair is measured both ways, so a colour that passes on paper but reads poorly still shows up.')}
              media={SHOTS.contrast}
            />
            <ShowcaseCard
              title={t('A type scale with a density dial')}
              body={t('Five densities from compact to spacious. Sizes and line heights move together, so the rhythm holds.')}
              media={SHOTS.type}
            />
            <ShowcaseCard
              title={t('Radius on three axes')}
              body={t('Boxes, fields and selectors round independently, so a pill button never turns your cards into stadiums.')}
              media={SHOTS.radius}
            />
            <ShowcaseCard
              title={t('Spacing that tightens on mobile')}
              body={t('Component, section and layout tokens step down per viewport, all from one base unit.')}
              media={SHOTS.spacing}
            />
          </div>
        </section>

        {/* ── 02–05 · What the tokens become. Figma goes last on purpose: it
            is where Pro comes in, and it hands straight to the closing CTA. ── */}
        <FeatureSection
          eyebrow={t('02 · Components')}
          title={t('A component catalogue, painted with your tokens.')}
          body={t('{count} components, each on one page: a live playground, every variant the Figma library ships, and the snippet for exactly what is on screen.', { count: COMPONENT_KEYS.length })}
          points={[
            t('Change colour, style, size and state, and see the real variant'),
            t('Usage, accessibility and API reference beside the preview'),
            t('Copy the page as context for your AI agent'),
          ]}
          media={SHOTS.components}
          action={(
            <button type="button" onClick={onOpenComponents} className="mt-2 inline-flex items-center gap-1 self-start rounded text-body font-semibold text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg">
              {t('Browse components')}
              <ArrowGlyph size={10} />
            </button>
          )}
        />

        <FeatureSection
          flip
          eyebrow={t('03 · Docs')}
          title={t('Documentation written from your own values.')}
          body={t('Every foundation gets a reference page built from your ramps, roles and scales. Change a token and its page changes with it, so the spec never goes stale.')}
          points={[
            t('Primitives, semantic roles and usage for each foundation'),
            t('A Use it block on every page: Figma, code and AI'),
            t('One click copies the page as context for an agent'),
          ]}
          media={SHOTS.docs}
        />

        <FeatureSection
          eyebrow={t('04 · Code and agents')}
          title={t('Real files for your repo. Live tokens for your agent.')}
          body={t('Each theme as variables.css, Markdown and agent context, plus W3C JSON and Tailwind from Export. Push it to GitHub, or let an agent read the published system over MCP.')}
          points={[
            t('CSS variables with light and dark in one file'),
            t('W3C design tokens that keep their aliases'),
            t('{count} MCP tools that resolve tokens when your agent asks', { count: TOOL_SPECS.length }),
          ]}
          media={SHOTS.code}
          action={(
            <button type="button" onClick={onLearnAI} className="mt-2 inline-flex items-center gap-1 self-start rounded text-body font-semibold text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg">
              {t('See how to connect')}
              <ArrowGlyph size={10} />
            </button>
          )}
        >
          {/* The real "Connect your agent" widget — same component Docs and the
              Export wizard use, every string from `agentInstall.ts`. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-elevated/20 p-4">
            <span className="text-ui font-semibold text-fg">{t('Connect your agent')}</span>
            <AgentInstallPanel variant="about" />
          </div>
        </FeatureSection>

        <FeatureSection
          flip
          eyebrow={t('05 · Sync with Figma')}
          title={t('Your system in Figma, one mode per theme and viewport.')}
          body={t('Sign in from the Escala plugin. Your folders show up there — press Sync and variables, text styles, effect styles, grids and components land in your file, with Light and Dark per theme and Desktop, Tablet and Mobile for every length.')}
          points={[
            t('Sign in once. Sync starts the file, Pause stops it'),
            t('Pick which themes and viewports ship'),
            t('Live sync republishes as you edit, with Pro'),
          ]}
          media={SHOTS.figma}
          action={(
            <a href={FIGMA_PLUGIN_COMMUNITY} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 self-start rounded text-body font-semibold text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg">
              {t('Get the plugin')}
              <ArrowGlyph size={10} />
            </a>
          )}
        />

        {/* ── Closing CTA — a background slot behind the copy ── */}
        <div className="px-6 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-line">
            {/* Background slot (image or video, `absolute inset-0 h-full w-full
                object-cover`) is hidden until the media exists. */}
            <div className="relative flex flex-col items-center gap-4 bg-elevated/20 px-6 py-16 text-center">
              <Eyebrow>{t('Get started')}</Eyebrow>
              <h2 className="max-w-[560px] text-[26px] font-semibold leading-tight text-fg">
                {t('Your own token system. Free to build. Pro when it has to stay in sync.')}
              </h2>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <RainbowButton
                  type="button"
                  onClick={onStart}
                  className="h-10 px-5 rounded-[13px] gap-1.5 text-ui font-semibold"
                >
                  {t('Start building')}
                  <ArrowGlyph />
                </RainbowButton>
                <a href={PRICING_PATH} className={secondaryCta}>{t('See pricing')}</a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Good questions — the shared reference sections, phrased as a
            FAQ (same `useAboutSections` content as the drawer, mobile and
            /about; only the presentation differs). ── */}
        <section aria-labelledby={faqId} className="grid gap-10 border-b border-line px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="flex flex-col items-start gap-4">
            <h2 id={faqId} className="text-[26px] font-semibold leading-tight text-fg">{t('Good questions')}</h2>
            <button
              type="button"
              onClick={() => onOpenDocsPage('faq')}
              className="inline-flex items-center gap-1.5 rounded text-ui font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              {t('Read the docs')}
              <span aria-hidden className="inline-flex -rotate-45"><ArrowGlyph /></span>
            </button>
          </div>
          <AboutAccordion variant="faq" section={section} onSectionChange={setSection} />
        </section>

        {/* ── Contact — the maker and one way to reach him. The socials are NOT
            here: they live once, in the footer's Social column. ── */}
        <section aria-labelledby={contactId} className="flex flex-col items-start gap-3 border-b border-line px-6 py-16">
          <Eyebrow>{t('Contact')}</Eyebrow>
          <h2 id={contactId} className="text-[26px] font-semibold leading-tight text-fg">
            {t('Built and maintained by Cesar Durango')}
          </h2>
          <p className="text-ui leading-relaxed text-fg-muted">{t('Design systems and design engineering.')}</p>
          <a href={CONTACT_PATH} className={`${secondaryCta} mt-2`}>
            {t('Contact form')}
            <ArrowGlyph />
          </a>
        </section>

        {/* ── Footer — NAVIGATION back into the product. The shell's 28px strip
            under every view stays the only colophon (copyright · Contact ·
            Legal · Privacy · Terms · MIT), so none of that is repeated here. ── */}
        <AboutFooter onStart={onStart} onLearnAI={onLearnAI} onOpenDocsPage={onOpenDocsPage} onOpenComponents={onOpenComponents} />
      </div>
    </div>
  )
}

/** Full-page rendering of the same five sections — no drawer, no burger button.
 *  Used by App.tsx for two surfaces that both need the ENTIRE "what is this"
 *  story with no workspace behind it: the mobile screen (there's no adaptive
 *  layout to fall back to) and the `/about` route (a real, shareable,
 *  crawlable URL — the drawer has neither). One scaffold, one content array;
 *  only the lead text and outer visibility differ per caller. */
/**
 * The workspace demo clip. Shared by the About tab's hero and `AboutScaffold`
 * (the mobile notice + the `/about` route) so the ratio below is stated once.
 *
 * The frame is sized to the clip's real ratio (1878x1078, square pixels,
 * display_aspect_ratio 939:539, measured via ffprobe) rather than a 16:9
 * guess. Autoplay requires muted + playsInline (Safari/iOS policy).
 *
 * `tapToPlay` is what `AboutScaffold` needs, and NOT a style preference:
 * that screen is `md:hidden`, which is `display: none`, not an unmount — so
 * on a desktop it sits in the DOM behind the real app. Measured: an
 * autoplaying copy there fetched and decoded the whole 4.5 MB clip on every
 * desktop load, for a screen nobody sees. `preload="none"` means the file is
 * not touched until someone presses play, so the cost lands only on the
 * visitor who asked for it. It also sidesteps iOS Low Power Mode, which
 * refuses muted autoplay and would otherwise leave a phone — the one device
 * that cannot run the app — staring at a frozen frame with no way to start
 * it. The poster is a real frame of the workspace, so the placeholder shows
 * the product rather than a black box.
 *
 * The desktop hero keeps autoplay and no controls: it is a passive backdrop
 * on a screen where the app itself is one click away.
 */
export function DemoVideo({ className, tapToPlay }: { className?: string; tapToPlay?: boolean }) {
  const { t } = useI18n()
  return (
    <video
      src="/video/inspector-lr.mp4"
      className={cn('w-full h-auto rounded-2xl object-cover', className)}
      style={{ aspectRatio: '1920 / 928' }}
      poster={tapToPlay ? '/video/video-realise-poster.jpg' : undefined}
      preload={tapToPlay ? 'none' : undefined}
      autoPlay={!tapToPlay}
      controls={tapToPlay}
      muted
      loop
      playsInline
      aria-label={t('Escala Tokens workspace demo')}
    />
  )
}

/**
 * "Open it on a laptop" said as a picture: a dim phone, a wave of chevrons
 * travelling right, a lit laptop. It exists because the two callers of
 * `AboutScaffold` are in opposite situations — `/about` HAS a workspace to
 * send you to and renders the `ctaHref` link, while the mobile notice has
 * nowhere to go (that's the whole point of the screen) and had nothing in
 * that slot at all. A dead button would be worse than the gap; a direction
 * is the honest thing to put there.
 *
 * No visible label, deliberately: the paragraph directly above already says
 * "Open it there to configure and export your system", and a caption under
 * the glyph would be that sentence a second time in smaller type. The words
 * live in `aria-label` instead, so the meaning still reaches a screen reader
 * that gets nothing from a moving chevron.
 *
 * The accent is spent on the DESTINATION only — the phone you're holding is
 * `fg-faint`, the laptop is `accent-ui` — so the colour itself points. Motion
 * is a fade wave rather than a slide: no layout to measure, nothing to
 * reflow, and it reads as direction at 14px where a travelling arrow just
 * reads as a flicker. Honours `useReducedMotion` (the chevrons settle at a
 * static ramp, which still reads left-to-right).
 */
function DesktopHandoffHint() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const stroke = {
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }

  return (
    <div
      className="mt-1 flex items-center gap-2.5"
      role="img"
      aria-label={t('Open Escala Tokens on a laptop or desktop')}
    >
      {/* the device you're on */}
      <svg width="15" height="15" viewBox="0 0 24 24" className="text-fg-faint" aria-hidden>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" {...stroke} />
        <path d="M10.75 18.25h2.5" {...stroke} />
      </svg>

      {/* the direction */}
      <span className="flex items-center gap-[3px] text-accent-ui" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.svg
            key={i}
            width="7" height="10" viewBox="0 0 7 10"
            style={reduce ? { opacity: 0.35 + i * 0.25 } : undefined}
            animate={reduce ? undefined : { opacity: [0.18, 1, 0.18] }}
            transition={reduce ? undefined : {
              duration: 1.5, repeat: Infinity, repeatDelay: 0.35,
              delay: i * 0.16, ease: 'easeInOut',
            }}
          >
            <path d="M1.6 1.4 5.1 5l-3.5 3.6" {...stroke} />
          </motion.svg>
        ))}
      </span>

      {/* where it opens */}
      <span className="relative flex items-center justify-center text-accent-ui">
        {!reduce && (
          <motion.span
            className="absolute h-7 w-7 rounded-full bg-accent-ui blur-md"
            aria-hidden
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.35, delay: 0.55, ease: 'easeInOut' }}
          />
        )}
        <svg width="22" height="22" viewBox="0 0 24 24" className="relative" aria-hidden>
          <rect x="3.25" y="4.5" width="17.5" height="12" rx="2" {...stroke} />
          <path d="M1.75 19.5h20.5" {...stroke} />
        </svg>
      </span>
    </div>
  )
}

/** The About page OUTSIDE the shell — the phone screen (`DesktopOnlyNotice`)
 *  and the `/about` route. It renders the SAME `AboutHome` the in-app tab does,
 *  so phone and desktop read one page, not two versions of it; only the frame
 *  differs: a slim top bar (brand · language · appearance, since `TopNav` lives
 *  in the shell), an optional notice (the phone: "open it on a laptop"), and
 *  the colophon the shell would otherwise print. Links that open the workspace
 *  in the shell go to the public pages instead (`/docs/*`, `/components`). */
export function AboutScaffold({
  wrapperClassName, notice,
}: {
  /** e.g. `md:hidden` for the mobile-only caller; omitted = always visible. */
  wrapperClassName?: string
  /** The phone screen's lead: the app needs a laptop, everything else is here. */
  notice?: { heading: string; subheading: string }
}) {
  const { t } = useI18n()
  const theme = useTheme()
  const go = (href: string) => window.location.assign(href)
  // "Start building" opens the workspace — which only exists from `md` up.
  const start = () => {
    if (window.matchMedia('(min-width: 768px)').matches) go('/')
    else showToast(t('Escala opens on a laptop or desktop screen.'))
  }

  return (
    <div className={cn('min-h-screen flex flex-col bg-app text-fg', wrapperClassName)}>
      <PluginCommunityBanner />
      {/* Appearance and language, the two chrome preferences that mean
          something here. They live in `TopNav` for everyone else, and `TopNav`
          is inside the desktop shell — same components, not copies. */}
      <div className="flex h-14 items-center justify-between gap-3 border-b border-line px-4">
        <a href="/about" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">
          <BrandMark size={24} />
          <span className="text-ui font-semibold text-fg">Escala Tokens</span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <AppearanceToggle value={theme} onChange={setTheme} />
        </div>
      </div>

      {notice && (
        <div className="px-6 pt-6">
          <div className="mx-auto flex max-w-[1080px] flex-col items-start gap-2 rounded-2xl border border-line bg-elevated/30 p-4">
            <h2 className="text-ui font-semibold text-fg">{notice.heading}</h2>
            <p className="text-body leading-relaxed text-fg-muted">{notice.subheading}</p>
            <DesktopHandoffHint />
          </div>
        </div>
      )}

      <AboutHome
        scroll={false}
        videoTapToPlay={Boolean(notice)}
        onStart={start}
        onLearnAI={() => go('/docs/mcp')}
        onOpenDocsPage={(page) => go(`/docs/${page}`)}
        onOpenComponents={() => go('/components')}
      />

      <footer className="mt-auto flex flex-col gap-2 border-t border-line px-5 py-4">
        {/* Same links as the desktop shell's footer — off the shell this is
            the only door to Contact / Legal / Privacy. Wraps on a narrow
            screen; each link keeps a 24px target (WCAG 2.2). */}
        <FooterLinks className="flex-wrap -mx-0.5 gap-x-3 gap-y-0" linkClassName="min-h-6" />
        <p className="text-caption text-fg-faint">
          {COPYRIGHT_LINE} · {t('Figma is a trademark of Figma, Inc.')}
        </p>
      </footer>
    </div>
  )
}

export default function AboutMenu({
  section,
  onSectionChange,
  onClose,
}: {
  /** The expanded section, or null for "all collapsed". Owned by the shell so
   *  a future entry point can open this drawer straight at a given section. */
  section: AboutSection | null
  onSectionChange: (s: AboutSection | null) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Opening straight at a section must SHOW that section, not just expand it
  // below the fold — Legal & data is the last of five rows.
  useEffect(() => {
    if (!section || !bodyRef.current) return
    const el = bodyRef.current.querySelector(`[data-section="${section}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [section])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={t('About Escala Tokens')}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.24, ease: EASE }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] h-full flex flex-col bg-app border-l border-line shadow-2xl"
      >
        {/* Header — matches the shell's own brand row, so the drawer reads
            as an extension of the chrome rather than a floating sheet. */}
        <div
          className="flex items-center justify-between gap-3 px-4 flex-shrink-0 border-b border-line"
          style={{ height: TOP_NAV_H }}
        >
          <div className="min-w-0 truncate text-ui font-semibold text-fg">Escala Tokens</div>
          <button
            onClick={onClose}
            aria-label={t('Close menu')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors flex-shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto">
          <AboutAccordion section={section} onSectionChange={onSectionChange} />
          <AboutContact />
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t border-line flex items-center justify-between gap-3">
          <p className="text-caption text-fg-faint truncate">
            {COPYRIGHT_LINE} · {t('Figma is a trademark of Figma, Inc.')}
          </p>
          {/* The one shareable link to this content — the drawer itself has no
              URL, so anyone asked "what is this?" gets /about instead. */}
          <a
            href="/about"
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 text-caption font-semibold text-accent-ui hover:underline"
          >
            {t('Full page')} ↗
          </a>
        </div>
      </motion.aside>
    </motion.div>
  )
}
