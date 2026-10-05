# About tab closes with a FAQ, a Contact section and a site footer

Written against: `ce29788` (working tree has uncommitted About changes — the
`AboutShot`/`SHOTS` screenshot work in `AboutMenu.tsx` — re-read the file before
editing; line numbers below are approximate).

Status: IMPLEMENTED (owner approved both decisions: footer is navigation only,
socials only in the footer). Questions use `text-title`, one step above the
plan's `text-strong`, to hold their own beside the 26px heading.

## Evidence chain

- Surface: the About tab canvas — `AboutHome` in
  `src/components/configurator/AboutMenu.tsx`, rendered by
  `src/pages/Configurator.tsx` (`<AboutHome …>` ≈ line 1597) when `tab === 'about'`.
- Problem: the page ends with the shared reference accordion rendered as a
  settings-style list (leading glyph · label · grey hint) and a Contact card
  stacked directly under it (`AboutHome`, "Reference accordion + contact"
  block, ≈ lines 967–973). It reads as a drawer pasted at the foot of a
  long-form product page, and the page has no closing navigation of its own.
- Design evidence:
  - Every other section of `AboutHome` is a titled band (`border-b border-line
    px-6 py-16`, `h2 text-[26px] font-semibold leading-tight`, `Eyebrow`,
    `SectionHeader`) — the accordion block is the only one without a heading.
  - Reference: a two-column FAQ — large heading + "Read the docs ↗" on the left,
    question rows with hairline dividers and a trailing chevron on the right;
    and a footer with brand + one-line description left, link columns right.
  - Documented decision being superseded: the comment on that block says
    "No footer: Configurator's own bottom row already prints the copyright
    line." The shell's 28px colophon (`Configurator.tsx` ≈ line 2300:
    `COPYRIGHT_LINE` + `FooterLinks`) STAYS — it is the legal/colophon strip on
    every view. The new footer is NAVIGATION, so it must not repeat what
    `FooterLinks` already carries (Contact · Legal notice · Privacy · Terms ·
    MIT License) or the copyright line.
- Owner: `AboutMenu.tsx` (`AboutHome`, `useAboutSections`, `AboutAccordion`,
  `AboutContact`).
- Scope and affected surfaces: `AboutHome` only. `AboutAccordion`,
  `AboutContact` and `useAboutSections` are ALSO rendered by the About drawer
  (`AboutMenu` default export) and `AboutScaffold` (mobile `DesktopOnlyNotice`
  + the `/about` route). Those three must render exactly as today.
- Uncertainty: the five question wordings below are proposed copy — confirm
  with the owner if any reads wrong. Everything else is determined by the
  page's existing system.

## Design decision

Turn the page's tail into three deliberate bands, in this order, after the
closing CTA:

1. **FAQ band — "Good questions".** Same `border-b border-line px-6 py-16`
   band as the other sections, laid out `lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]`:
   left column = `h2` "Good questions" at the page's own h2 scale
   (`text-[26px] font-semibold leading-tight text-fg`) + a "Read the docs ↗"
   text link under it; right column = the SAME five sections from
   `useAboutSections()`, presented as questions. Reusing the hook keeps the
   rule that the reference copy cannot drift between surfaces — only the
   presentation is new.
2. **Contact band.** Its own titled band (the `Eyebrow` + `h2` pattern of
   "Start from a style"): `Eyebrow` "Contact", `h2` "Built and maintained by
   Cesar Durango", one line "Design systems and design engineering.", and ONE
   action — "Contact form" (link to `CONTACT_PATH`, `secondaryCta` style).
   The social links do NOT appear here; they live in the footer's Social
   column, so no link is printed twice on the page.
3. **Site footer.** Inside `AboutHome`'s scroll region (it is page content,
   not shell chrome): brand lockup + one-line description on the left, three
   link columns on the right — Product · AI · Social. The shell's colophon
   strip remains below it untouched.

## Reuse

- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` —
  `src/components/ui/accordion.tsx`. `AccordionItem`'s default
  `border-b border-line last:border-b-0` IS the reference's hairline divider;
  `AccordionTrigger` already draws the trailing chevron that rotates open.
- `useAboutSections()` — the five sections' content (bodies unchanged).
- `Eyebrow`, `ArrowGlyph`, `secondaryCta` (local to `AboutHome`) — exemplar:
  the "Start from a style" band and the closing CTA in `AboutHome`.
- `BrandMark` — exported from `src/components/configurator/TopNav.tsx`
  (already used by `LoginPage.tsx` for the same lockup: `<BrandMark size={28} />`
  + "Escala Tokens").
- `CONTACT` (`linkedin`, `x`, `site`) — `AboutMenu.tsx`; `CONTACT_PATH` —
  `src/lib/legal.ts`; `PRICING_PATH` — `src/lib/entitlement.ts`.
- Docs destinations: the `DocsMenuPage` keys `'mcp' | 'figma' | 'changelog' |
  'faq'` and the mapping TopNav's `onOpenDocsPage` already uses in
  `Configurator.tsx` (≈ line 1885: `mcp → GUIDE_MCP_KEY`, `figma →
  GUIDE_FIGMA_KEY`, `changelog → CHANGELOG_KEY`, otherwise `FAQ_KEY`, then
  `openDocs(…)`).
- Type roles only (`text-caption`, `text-body`, `text-ui`, `text-strong`) and
  chrome colours (`text-fg`, `text-fg-muted`, `text-fg-faint`, `border-line`)
  — no raw palette classes, no new `text-[Npx]` beyond the page's existing
  26px h2.

No new shared primitive: the FAQ presentation is a variant of the existing
`AboutAccordion`, the footer is About-only.

## Changes

1. `src/components/configurator/AboutMenu.tsx` — `useAboutSections`
   - Change: add a `question: string` field to each of the five entries,
     translated with `t()`:
     - platform → "What is Escala?"
     - tokens → "How do the tokens work?"
     - plugin → "How does the Figma plugin work?"
     - docs → "What is the documentation based on?"
     - legal → "Who owns my data, and where is it stored?"
   - Preserve: `label`, `hint`, `body` and `key` exactly as they are.
   - Verify: the drawer, mobile screen and `/about` still show the old labels.

2. `src/components/configurator/AboutMenu.tsx` — `AboutAccordion`
   - Change: add `variant?: 'list' | 'faq'` (default `'list'` = today's
     rendering, byte-identical). `'faq'`: no leading icon, no hint; trigger =
     `s.question` in `text-strong font-medium text-fg`, `py-6`, no hover fill;
     keep `AccordionItem`'s default bottom hairline (do NOT pass `border-b-0`);
     content in `text-ui leading-relaxed text-fg-muted`, `pb-6`, max width
     ~`640px`. Remove the `bleed` prop if `AboutHome` was its only caller
     (it is today — confirm with a search before deleting).
   - Preserve: Radix `type="single" collapsible`, the controlled `section` /
     `onSectionChange` contract, `data-section` attributes (the drawer's
     `scrollIntoView` relies on them, scoped to its own `bodyRef`).
   - Verify: list variant unchanged in the drawer; faq variant shows five
     questions separated by hairlines, first one open.

3. `src/components/configurator/AboutMenu.tsx` — `AboutHome`
   - Change: replace the "Reference accordion + contact" block with:
     - FAQ band (see Design decision 1). "Read the docs" calls a new prop
       `onOpenDocsPage('faq')`; render as a text link with `ArrowGlyph`
       rotated to point up-right, or a "↗" glyph, `text-ui text-fg-muted
       hover:text-fg`. Accordion: `<AboutAccordion variant="faq" section={section}
       onSectionChange={setSection} />` (default stays `'platform'`).
     - Contact band (Design decision 2), `border-b border-line px-6 py-16`,
       left-aligned, using `Eyebrow` + `h2 text-[26px]` + `p text-ui
       text-fg-muted` + `<a href={CONTACT_PATH} className={secondaryCta}>`.
     - `AboutFooter` (new local component, Design decision 3): `px-6 pt-14
       pb-16`, `grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]`.
       - Left: `BrandMark size={24}` + "Escala Tokens" (`text-strong
         font-semibold`), then `p text-body text-fg-muted max-w-[320px]`:
         "One token system for Figma, code and your AI agent."
       - Column captions in `text-caption font-medium text-fg-faint` (sentence
         case, NOT uppercase — these name a set, matching the reference),
         links in `text-body text-fg-muted hover:text-fg`, `gap-3`, each with a
         ≥24px hit area (`min-h-6 inline-flex items-center`).
       - Product: Generator (`onStart`), Components (new prop
         `onOpenComponents`), Use in Figma (`onOpenDocsPage('figma')`), Pricing
         (`PRICING_PATH`), Changelog (`onOpenDocsPage('changelog')`).
       - AI: MCP (`onOpenDocsPage('mcp')`), Connect your agent (`onLearnAI`).
       - Social: LinkedIn, X (only when `CONTACT.linkedin` / `CONTACT.x` are
         set, same guards as `AboutContact`), the site (`CONTACT.site`), and
         Source (`https://github.com/Duscenko/escala-tokens`). External links:
         `target="_blank" rel="noreferrer"`.
     - Update the `AboutHome` doc comment: the page now ends FAQ → Contact →
       footer; the content footer is navigation, the shell strip is the
       colophon, so legal links and the copyright are NOT repeated.
   - Preserve: everything above the closing CTA, the closing CTA itself,
     `useState<AboutSection | null>('platform')`.
   - Verify: no link appears twice on the page (contact form only in Contact;
     socials only in the footer; legal only in the shell strip).

4. `src/components/configurator/AboutMenu.tsx` — `AboutContact`
   - Change: remove the `card` prop and its branch if no caller passes it
     after change 3 (today only `AboutHome` does — confirm with a search).
   - Preserve: the flat rendering the drawer and `AboutScaffold` use.

5. `src/pages/Configurator.tsx`
   - Change: lift TopNav's `onOpenDocsPage` mapping into one local
     `openDocsPage = (page: DocsMenuPage) => …` and pass it to BOTH `TopNav`
     and `<AboutHome onOpenDocsPage={openDocsPage} onOpenComponents={() =>
     changeTab('components')} …>`, so the two can't map a page differently.
   - Preserve: TopNav behaviour.

6. `src/lib/i18n.tsx`
   - Change: add es + fr entries for every new string: "Good questions",
     "Read the docs", the five questions, "Built and maintained by Cesar
     Durango", "Design systems and design engineering.", "One token system for
     Figma, code and your AI agent.", "Product", "AI", "Social", "Generator",
     "Use in Figma", "Changelog", "Connect your agent", "Source" (skip any key
     that already exists — keys are the English source strings).

## Scope

- Inherit: the About tab (`AboutHome`).
- Verify: the About drawer (`AboutMenu` default export, still wired?), the
  mobile `DesktopOnlyNotice` and `/about` (`AboutScaffold`) — all must render
  the list variant and the flat contact exactly as before.
- Exclude: the shell colophon strip and `FooterLinks`; `PricingPage`'s own
  `Faq` (a separate `<details>` list — do not merge them in this change); the
  two remaining `ImagePlaceholder`s; the screenshot pipeline.

## Validation

- Product: a first-time visitor scrolls the About tab to the end and finds the
  questions, one way to contact the maker, and a footer that leads back into
  the product (Generator, Components, Docs pages, Pricing).
- Interface: dark (default) and light chrome; 1440 and 1080 wide (the
  four-column footer must not crush below `lg` — stack to brand above a
  three-column row); open/close each question (only one open at a time, first
  open on arrival); every footer link lands on its destination; es and fr
  locales (longest question still wraps cleanly).
- System: one accordion component with two variants, not a second accordion;
  no duplicated link targets on the page; no raw colour/size classes.
- Repository: `npx tsc -b` → no errors; `npx vitest run` → all pass (824 + 2
  expected fail at time of writing).

## Stop conditions

- Stop if the owner rejects superseding the documented "No footer" decision.
- Stop if `AboutAccordion`'s list variant cannot stay byte-identical for the
  drawer/mobile callers — that would widen scope to three surfaces.
- Stop if `openDocs(FAQ_KEY)` does not exist or no longer lands on a FAQ page.

## Design documentation

- After acceptance and validation: in `CLAUDE.md`, near the About-tab notes,
  record: the About tab ends FAQ ("Good questions", `AboutAccordion
  variant="faq"`, same `useAboutSections` content) → Contact band → a
  navigation footer inside the page; the shell's 28px strip stays the only
  colophon (legal + copyright), so the page footer never repeats those links,
  and socials appear only in the footer.
