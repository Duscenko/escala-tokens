import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TOKEN_SCHEMA_VERSION } from '../../lib/tokenGenerator'
import { COMPONENT_KEYS } from '../../lib/componentCatalogue'
import { FIGMA_PLUGIN_ZIP, cn } from '../../lib/utils'

// ── The corporate/about drawer (burger menu) ─────────────────────────────────
// Everything the workspace itself can't say: what Escala IS, how its three
// token tiers relate, how the Figma plugin consumes them, what the component
// docs are derived from, what shipped when, and who made it.
//
// A right-side drawer rather than a centered modal: this is reference reading
// you consult WHILE working, so it slides in beside the canvas instead of
// blocking it, and every section is collapsed by default — a list of six
// labels, not six essays. Only the section you opened it on expands.
//
// **This module owns the content, not just the drawer.** `AboutAccordion` and
// `AboutContact` are exported so the MOBILE screen (`App.tsx`'s
// `DesktopOnlyNotice`, the only thing that renders below `md`) can show the
// same sections. A phone visitor can't use the workspace — but "what is this"
// is exactly what they came for, and it used to be locked behind a burger
// button that only exists in the desktop shell. One array, two surfaces: the
// copy can't drift between them.

export type AboutSection = 'platform' | 'tokens' | 'plugin' | 'docs' | 'changelog' | 'legal'

/** The creator's contact details — the one place they're defined.
 *  `linkedin` stays null until the real profile URL is known; the row is
 *  conditional, so filling this in is the only change needed to surface it
 *  (guessing a handle risks linking to a different person). */
const CONTACT = {
  email: 'duscenko@gmail.com',
  site: 'duscenko.com',
  linkedin: null as string | null,
}

const COPYRIGHT_YEAR = 2026

/** Shown in the footer bar AND at the foot of this drawer, so the one legal
 *  line can't drift between them. */
export const COPYRIGHT_LINE = `© ${COPYRIGHT_YEAR} ${CONTACT.site}`

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

/** Inline code chip — same treatment FigmaConnectView uses for `manifest.json`. */
function C({ children }: { children: ReactNode }) {
  return <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted font-mono">{children}</code>
}

function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[12.5px] leading-relaxed text-fg-muted', className)}>{children}</p>
}

/** A token tier: name, the chain step it aliases, one honest example. */
function Tier({ n, name, detail, example }: { n: number; name: string; detail: string; example: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-4 text-[11px] font-mono tabular-nums text-fg-faint pt-[3px]">{n}</span>
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-fg">{name}</span>
        <span className="text-[12.5px] leading-relaxed text-fg-muted">{detail}</span>
        <span className="text-[11px] font-mono text-fg-faint break-all">{example}</span>
      </div>
    </div>
  )
}

/** One shipped change — date left, summary right. Dates are release dates from
 *  the project's own history, not invented milestones. */
function Entry({ date, children }: { date: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-line/60 last:border-b-0">
      {/* nowrap + room for all 10 chars: at this root font-size an ISO date
          wrapped to "2026-07-" / "29" in a narrower column. */}
      <span className="flex-shrink-0 w-[78px] text-[11px] font-mono tabular-nums whitespace-nowrap text-fg-faint pt-[2px]">{date}</span>
      <span className="min-w-0 text-[12.5px] leading-relaxed text-fg-muted">{children}</span>
    </div>
  )
}

export const SECTIONS: { key: AboutSection; label: string; hint: string; body: ReactNode }[] = [
  {
    key: 'platform',
    label: 'What Escala is',
    hint: 'The short version',
    body: (
      <div className="flex flex-col gap-3">
        <P>
          A configurator for design token systems. You define a palette, type scale, spacing,
          radius and the rest once; Escala derives the full scales, keeps light and dark in
          step, and ships the result as <C>tokens.json</C>, <C>variables.css</C> and a
          README — plus a Figma plugin that imports all of it as real Variables.
        </P>
        <P>
          The point is <span className="text-fg">no bloat</span>: you export the tokens you
          actually chose, not a framework's opinion of a design system. Everything on screen
          derives from one payload, so the preview, the export and what lands in Figma can't
          disagree.
        </P>
      </div>
    ),
  },
  {
    key: 'tokens',
    label: 'How the tokens work',
    hint: 'Three tiers, one chain',
    body: (
      <div className="flex flex-col gap-3.5">
        <P>
          Every value resolves down a chain. Nothing holds a copy of anything above it, so
          retinting one family repaints everything that references it.
        </P>
        <div className="flex flex-col gap-3">
          <Tier
            n={1}
            name="Primitives"
            detail="Radix's model — each family is a 1–12 scale where the step means a role, not a lightness. Tone 9 is the anchor: your input hex, verbatim. Every family ships a light ramp and a dark twin."
            example="accent-9 · neutral-dark-3 · error-11"
          />
          <Tier
            n={2}
            name="Semantics"
            detail="Named roles that point AT a primitive tone, per theme. A theme is a reading of the primitives — it stores which family fills each slot, never a hex of its own."
            example="text-primary → neutral-12"
          />
          <Tier
            n={3}
            name="Components"
            detail="Created by the plugin in Figma: one variable per component property, aliasing its semantic role. Retheming a button is a one-variable change, and the whole chain stays inspectable."
            example="button/bg → action/primary → accent-9"
          />
        </div>
        <P>
          The semantic layer can be projected into four shapes — <span className="text-fg">Flat</span>{' '}
          (the full role matrix), <span className="text-fg">Categorical</span> (a grouped DTCG
          tree), <span className="text-fg">Vibrancy</span> (Apple HIG alpha layers) and{' '}
          <span className="text-fg">Tonal</span> (Material 3 tonal palettes). Contrast for text
          tones is solved against the page, targeting WCAG AA.
        </P>
      </div>
    ),
  },
  {
    key: 'plugin',
    label: 'How the Figma plugin works',
    hint: 'Import and live sync',
    body: (
      <div className="flex flex-col gap-3">
        <P>
          The plugin reads the same <C>tokens.json</C> this app exports (contract{' '}
          <span className="text-fg">schema v{TOKEN_SCHEMA_VERSION}</span>) and builds real Figma
          Variable collections: Color Primitives, Color Semantics with a mode per theme,
          Typography, Spacing, Radius, and a Components collection whose variables alias the
          semantic roles.
        </P>
        <ol className="flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-fg-muted list-decimal pl-4">
          <li>Download the plugin and unzip it.</li>
          <li>Figma desktop → <span className="text-fg">Plugins → Development → Import plugin from manifest…</span></li>
          <li>Pick the unzipped <C>manifest.json</C>, then run <span className="text-fg">Escala DS</span>.</li>
          <li>Choose what to import — variables, styles, components, documentation.</li>
        </ol>
        <P>
          It can also pull live: the plugin's Live Sync tab polls this project's endpoint, so
          publishing from here updates Figma without re-importing a file. Each design system
          publishes to its own scoped URL, so systems never overwrite each other.
        </P>
        <a
          href={FIGMA_PLUGIN_ZIP}
          download
          className="inline-flex items-center gap-1.5 self-start text-[12px] font-semibold text-accent-ui hover:underline"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 1.5v8M3.5 6.5 7 10l3.5-3.5" />
            <path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" />
          </svg>
          Download the plugin (.zip)
        </a>
      </div>
    ),
  },
  {
    key: 'docs',
    label: 'What the documentation is based on',
    hint: 'Sources of truth',
    body: (
      <div className="flex flex-col gap-3">
        <P>
          <span className="text-fg">The Figma plugin is the source of truth for the catalogue.</span>{' '}
          Each of the {COMPONENT_KEYS.length} components mirrors a plugin entry: its key is the
          plugin's gate, its variant axes mirror the plugin's spec matrix, and its category
          mirrors the plugin's divider pages. When the plugin changes, the catalogue follows —
          never the reverse.
        </P>
        <P>
          Docs pages are generated from that catalogue plus the live specimen registry, so the
          preview you interact with is the same renderer the docs embed — it reads your tokens,
          not a screenshot. Components not yet in the Figma library say so explicitly rather
          than implying a set that doesn't exist.
        </P>
        <P>
          The standards behind the defaults: <span className="text-fg">Radix Colors</span> for
          the 12-step scale model, <span className="text-fg">W3C Design Tokens (DTCG)</span> for
          the interchange format, <span className="text-fg">WCAG</span> for contrast targets,
          and Apple HIG / Material 3 for the two alternative semantic architectures.
        </P>
      </div>
    ),
  },
  {
    key: 'changelog',
    label: 'Changelog',
    hint: 'What shipped when',
    body: (
      <div className="flex flex-col">
        <Entry date="2026-07-29">
          Escala JSON export always ships the full plugin contract. Architecture-aware semantic
          preview; dark-mode tone inversions fixed across the role catalogue.
        </Entry>
        <Entry date="2026-07-29">
          Picker Color tab, and the export flow gained system identity — name, save and GitHub
          status at the payoff step.
        </Entry>
        <Entry date="2026-07-28">
          Variables-first navigation, guided token creation, sticky category preview.
        </Entry>
        <Entry date="2026-07-27">
          Radix two-scale primitives — every family ships a light ramp and a dark twin. Editable
          semantic architectures, the guided export wizard, and the top-nav workspace.
        </Entry>
        <Entry date="2026-07-20">
          Semantic architecture picker (Flat · Categorical · Vibrancy · Tonal), Save &amp; Share
          hub, import and new-system flows.
        </Entry>
        <Entry date="2026-07-18">Color became a multi-tab hub; theme-aware brand lockup.</Entry>
        <Entry date="2026-07-16">
          Dark-appearance neutral ramps, accent-derived gradients, Variables/Styles rail split.
        </Entry>
        <Entry date="2026-07-13">Gradients foundation with a full HSV picker.</Entry>
        <Entry date="2026-07-12">
          Documentation tab; catalogue expanded to {COMPONENT_KEYS.length} components.
        </Entry>
        <Entry date="2026-07-08">Interactive component playground wired to the plugin contract.</Entry>
        <Entry date="2026-07-07">
          Export normalizes semantics so every token aliases a real primitive.
        </Entry>
        <Entry date="2026-06-14">
          Figma sync pipeline — per-system scoping and theme columns.
        </Entry>
      </div>
    ),
  },
  {
    key: 'legal',
    label: 'Legal & data',
    hint: 'Ownership and storage',
    body: (
      <div className="flex flex-col gap-3">
        <P>
          {COPYRIGHT_LINE}. Escala Tokens and its source are the work of Cesar Duscenko.
          The design systems you build with it are <span className="text-fg">yours</span> —
          the tokens, scales and exported files carry no licence or attribution requirement
          from this tool.
        </P>
        <P>
          <span className="text-fg">Where your work lives:</span> your system is stored in your
          own browser (localStorage) — there are no accounts and no server-side profile. Tokens
          leave the browser only when you ask: publishing for Figma live-sync uploads the token
          payload to this project's endpoint, and connecting GitHub pushes files to the repo you
          pick. A GitHub token you provide stays in your browser and is never sent anywhere but
          GitHub.
        </P>
        <P className="text-fg-faint">
          Figma is a trademark of Figma, Inc. Radix, Material Design and Apple Human Interface
          Guidelines are referenced as public standards; this project is not affiliated with,
          endorsed by, or sponsored by any of them.
        </P>
      </div>
    ),
  },
]

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

/** Contact row — a link with its glyph, kept flat (no card) so the block reads
 *  as a signature rather than a promo panel. */
function ContactRow({ icon, label, href }: { icon: ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
      className="flex items-center gap-2.5 px-2 h-8 -mx-2 rounded-lg text-[12.5px] text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
    >
      <span className="text-fg-faint flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  )
}

/** The six collapsible sections. Shared by the desktop drawer and the mobile
 *  screen, so neither can carry a stale copy of the other's wording. Only the
 *  padding differs, hence `pad` — the drawer sits flush inside a 440px sheet,
 *  the mobile page needs the same gutter its own header uses. */
export function AboutAccordion({
  section, onSectionChange, pad = 'px-5',
}: {
  section: AboutSection | null
  onSectionChange: (s: AboutSection | null) => void
  pad?: string
}) {
  return (
    <>
      {SECTIONS.map((s) => {
        const open = section === s.key
        return (
          <div key={s.key} data-section={s.key} className="border-b border-line">
            <button
              onClick={() => onSectionChange(open ? null : s.key)}
              aria-expanded={open}
              className={`w-full flex items-center gap-3 ${pad} py-3.5 text-left hover:bg-elevated/40 transition-colors`}
            >
              <span className={`flex-shrink-0 ${open ? 'text-accent-ui' : 'text-fg-faint'}`}>
                <Chevron open={open} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13px] ${open ? 'font-semibold text-fg' : 'font-medium text-fg'}`}>
                  {s.label}
                </span>
                {!open && <span className="block text-[11.5px] text-fg-faint truncate">{s.hint}</span>}
              </span>
            </button>
            {/* Height animation needs overflow-hidden; nothing in here opens
                a popover, so the clipping is harmless (see CLAUDE.md's note
                on animated-height containers that DO hold popovers). */}
            <motion.div
              initial={false}
              animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className={`${pad} pb-5 pl-[44px]`}>{s.body}</div>
            </motion.div>
          </div>
        )
      })}
    </>
  )
}

/** Contact — always open. It's four lines, and hiding the author behind a
 *  disclosure in an "about" menu would be perverse. */
export function AboutContact({ pad = 'px-5' }: { pad?: string }) {
  return (
    <div className={`${pad} py-4 flex flex-col gap-2`}>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Contact</span>
      <P>
        Built and maintained by <span className="text-fg">Cesar Duscenko</span> —
        design systems and design engineering.
      </P>
      <div className="flex flex-col mt-0.5">
        <ContactRow icon={<MailIcon />} label={CONTACT.email} href={`mailto:${CONTACT.email}`} />
        <ContactRow icon={<GlobeIcon />} label={CONTACT.site} href={`https://${CONTACT.site}`} />
        {CONTACT.linkedin && (
          <ContactRow icon={<LinkedInIcon />} label="LinkedIn" href={CONTACT.linkedin} />
        )}
      </div>
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
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Opening straight at a section must SHOW that section, not just expand it
  // below the fold — Legal & data is the last of six rows.
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
      aria-label="About Escala Tokens"
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] h-full flex flex-col bg-app border-l border-line shadow-2xl"
      >
        {/* Header — matches the shell's own 72px brand row, so the drawer reads
            as an extension of the chrome rather than a floating sheet. */}
        <div className="flex items-center justify-between gap-3 px-5 h-[72px] flex-shrink-0 border-b border-line">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-fg leading-tight">Escala Tokens</div>
            <div className="text-[11.5px] text-fg-faint leading-tight">
              Design token infrastructure · schema v{TOKEN_SCHEMA_VERSION}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
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

        <div className="flex-shrink-0 px-5 py-3 border-t border-line">
          <p className="text-[11px] text-fg-faint">
            {COPYRIGHT_LINE} · All rights reserved. Figma is a trademark of Figma, Inc.
          </p>
        </div>
      </motion.aside>
    </motion.div>
  )
}
