# Storybook — playbook (what worked, 2026-11-12 → 11-17)

Everything learned running `apps/storybook` and publishing it as `escala-storybook`, distilled from the
Storybook sessions. Per-component lessons stay in `lessons.md`; this file is the infrastructure, the
publishing and the way of working that the owner approved. Read it before touching `.storybook/`,
the families manifest, the docs pages, or before publishing.

## 1. How it is built (Storybook 10.6.4)

- **Scripts live in the root `package.json`**, not in `apps/storybook`: `npm run storybook` (:6006),
  `npm run build-storybook` (→ `apps/storybook/storybook-static`), `npm run typecheck:storybook`.
- **Tailwind** reaches `src/` only through `apps/storybook/.storybook/storybook.css` (`@source`).
- **Paint = the Figma file's system**: `escalaSystem.ts` (`buildStudioTokens` + `applyFigmaFilePalette`).
  The palette is a snapshot (`src/lib/figmaFilePalette.generated.ts`) generated from the plugin's
  inventory `../escala-figma-plugin/spec/figma-variables.txt` → `npm run gen:figma-palette`. Never
  hand-edit it. It drifts: when in doubt compare every live Color Semantics role (Light and Dark) and the
  shadows with Storybook, then align + regenerate skill and goldens + DEC.
- **Never apply `applyFigmaFilePalette` to the web's defaults.** Storybook is the Escala reference;
  "Storybook with my brand" is parked for the beta.
- **Toolbar globals: `theme` (light/dark) and `dimensions` (desktop/tablet/mobile).** Never name a
  global `viewport`: it collides with Storybook's viewport addon (emulated 1280×1024, every story cut,
  two "Desktop" buttons). `dimensions` really changes tokens (a heading goes 26 → 21 → 18px).
- **Docs pages read globals** with `DocsContext.getStoryContext(ctx.storyById()).globals` and stay live by
  listening to `GLOBALS_UPDATED` on `ctx.channel`.
- **Portals inherit the scope**: anything mounted on `<body>` (Modal, Popover, Sheet, Combobox list)
  goes through `portal-scope.ts` (`usePortalContainer()`), or it renders unstyled / in the wrong theme.
- **A role a story reads must exist in the Storybook scope**; a missing one (`spacing.inset-section`)
  drops the value silently. `blockRefsProvided.test.ts` guards blocks — keep it green when a block reads a new role.
- **Docs layer** (owner-approved): `escalaTheme.ts` + `manager.ts` + `apps/storybook/docs/`
  (`Introduction`, `FoundationPage`, `ComponentDocPage`, `DocsFrame`, `storyIndex`). The Variables pages
  reuse the web's foundation renderer (no copied prose); each component's Documentation is generated
  from catalogue + contracts + stories, never written by hand. Logo trap: `escala-logo-dark.svg` is the
  WHITE-text logo (for dark backgrounds).
- **`main.ts` / `manager.ts` changes need a cold restart** (HMR does not reload them).

## 2. Families, titles, sidebar

- **One Figma page = one family = one sidebar entry = one Documentation page.** Manifest:
  `spec/storybook-families.json` (each set is `root` or `part`); plan: `design-plans/storybook-families.md`.
- **Titles are never typed.** `node scripts/storybook/apply-families.mjs` writes the static `title:` and
  `tags` into every story file; idempotent, re-run it freely. It also maps old story ids to new ones.
- CSF files sharing a `title` merge into one node, each part keeps its own Playground. Parts carry
  `tags: ['!autodocs','part']`; `main.ts` hides them by default
  (`tags: { part: { defaultFilterSelection: 'exclude' } }`). The family page shows them in **Anatomy**
  with "Open playground".
- Figma has parts but no root set (DatePicker, Tooltip) → a composed root story until a real one exists.
- Story id = `toId(title, storyNameFromExport(name))` from `storybook/internal/csf`. Docs ids end in
  `--documentation`: take them from `index.json`, never guess.
- **Retitling conflicts with other branches** on `title:` → take either side and re-run the script.
  After a retitle, check the scripts in `scripts/storybook-checks/` still hit real ids (`axe.mjs` was
  silently skipping one).
- Result that was approved ("súper bien"): 110 sidebar entries → 51, 161 docs pages → 102.

## 3. Playground and stories

- Copy `story-template.tsx`; controls in **Figma's panel order and defaults**.
- **The Playground is a stage, never cut**: centred, min-height, `margin:auto` on a flex child of a flex
  column so wide content overflows instead of clipping. Matrices and Blocks keep page layout. The
  Documentation page opens ON the Playground (it used to start ~750px down).
- **Play functions** lock interactions in place (DatePicker "Opens the calendar", Calendar
  `RangeSelection`). Use them for any open/close/select behaviour.
- **Sometimes the story is broken, not the component**: an inline `<a>` wrapper 19.5px tall
  (→ `inline-flex`), a `flex-wrap` nav collapsing one item per line in the narrow centred canvas
  (→ `inline-flex flex-nowrap`). The centred canvas exposes narrow-width bugs — good, fix them.
- Focus halos clipped by a scroll body → `halo-bleed.ts` (padding + equal negative margin).
- A CSS rule on `data-part="X.label"` needs the label wrapped in its own `<span data-part=…>`.
- a11y panel: exclude only the one story whose low contrast is intentional (copied from Figma, reported),
  keep the list of known axe findings.

## 4. Guards that must stay green

| Guard | Catches |
|---|---|
| `src/lib/__tests__/storybookFamilies.test.ts` | a Figma set without a family, a title ≠ manifest, colliding story ids |
| `npm run check:story-parity` + `.github/workflows/story-parity.yml` | an `escala-ui` component (`data-escala`) without a story (left red on purpose, no allowlist) |
| `storybookLinks.test.ts` (`src/lib/storybookLinks.ts`) | a catalogue page, part or block whose Storybook link points to a missing docs id |
| `platformCatalogue.test.ts` · `platformBlocks.test.ts` | the platform's Components list drifting from the families manifest; a block story without `blocks/blockRegistry.tsx` entry |
| `colorDocs.test.ts` | Docs · Color prose/columns stale (both columns built like the export, `brand::light` / `brand::dark`) |
| `scripts/storybook-checks/*.mjs` (headless Chromium vs :6006) | focus-halo, docs-stage, axe, motion, pickers… Prove a check by running it WITHOUT the fix first (focus-halo: 16 fails → 116/116) |

Also: `npm run gen:registry-sources` when `escala-ui` changes; read the golden diff before `vitest -u`;
`spec/figma-components.json` saves only if its checksum matches (`save-inventory.mjs`).

## 5. Verify in the browser — measure, never by eye

- `preview_start` name **`Storybook`** (:6006). For a second server that must not disturb the owner's:
  **`Storybook (port 6016)`** in `.claude/launch.json`; from a worktree
  `npx storybook dev -p 6007 -c apps/storybook/.storybook --no-open --ci`.
- **Stale content?** Another session/worktree may hold 6006, or the branch changed under the server:
  restart it from the right checkout and hard-reload (⌘⇧R).
- URLs:
  - iframe: `localhost:6006/iframe.html?id=<id>&args=variant:secondary&globals=theme:dark&viewMode=story`
  - story: `?path=/story/<id>--playground` · docs: `?path=/docs/<id>--documentation&globals=theme:dark`
- `scripts/storybook-measure.js` / `getComputedStyle` + box positions → a Figma-vs-Storybook table.
  1–2px from Inter's metrics is acceptable.
- **Focus: real Tab key** (click the page, press Tab). `element.focus()` does not set `:focus-visible`.
- **Interactivity sweep** for a release: every Playground, change controls, click and type inside, in
  Light/Desktop, Dark/Mobile and a 640px canvas.
- Screenshot traps: a hidden/background pane freezes animations and mid-fade frames — retake before
  calling it a bug. A zero-size pane → `resize_window` first. Radix scrollbar thumbs appear only after a
  rendered frame; don't hack them, screenshot.

## 6. Publish (Vercel project `escala-storybook`)

- **Own project, separate from the web (`scalable-designs`).** Config: `apps/storybook/vercel.json`
  (Root Directory `apps/storybook`, install `cd ../.. && npm ci`, build `cd ../.. && npm run
  build-storybook`, output `storybook-static`, framework null). The dedicated `vercel.json` matters: the
  root one builds the platform (`dist`), sets `X-Frame-Options: DENY` (breaks Storybook's iframe) and
  its `api/` would create billable functions. Build ≈ 2 min.
- **Git-connected**: push a branch → preview; **merge to `main` → production for web AND Storybook**
  (https://escala-storybook.vercel.app). No manual deploy needed in the normal path.
- **Preview URL for the owner**: the branch alias
  `escala-storybook-git-<branch>-cesar-duscenkos-projects.vercel.app` (always the branch's latest; hash
  URLs confused the owner). To wait for it: `gh api repos/Duscenko/escala-tokens/commits/<sha>/statuses`,
  context `Vercel – escala-storybook`, read `target_url` — or run `gh pr checks <n> --watch` in the
  background. Ending the turn while waiting on CI means nothing merges.
- **CLI deploy (only if needed)**: set `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` of `escala-storybook` in the
  env so the repo's `.vercel` link (→ `scalable-designs`) stays untouched; `--prod` only with the owner's yes.
- **Check a deploy**: compare the deployed `index.json` with the local build (same entry count), then
  open a real story and a docs page.
- **Before saying "published"**, check `origin`: once `origin/main` had 0 stories while local was 91
  commits ahead.
- Traps: a domain bound to a non-main branch is a preview behind login (protection is off for
  `escala-storybook` only); a prod build "Canceled from the Vercel Dashboard" → verify the live site,
  "Redeploy" from `main` for a clean record; `gh pr merge` can stop at the local checkout step and leave
  the remote branch — delete it.

## 7. Figma ↔ Storybook links

- Every PUBLIC link (About, /figma-kit, each component's Figma button, Storybook) goes to the **Preview
  library `X736U9ffkni3gg6rmvEEnJ`** — one constant in `src/lib/figmaKit.ts`, no `m=dev`. Per-component
  pages via `src/lib/figmaPreviewPages.ts` (from `spec/figma-components.json`; page ids are the same in
  Real and Preview; `codeOnly` parts fall back to the cover).
- `spec/contracts/` keeps pointing to the Real file (`7j5zukN5HpihGVJMmyjA20`): it is for agents.
- The platform links each component/block stage to Storybook (`StorybookLinkButton`, URL derived from
  the families manifest; a part opens its family).

## 8. Working with the owner

- **Spanish**, short, visual: a before/after table, a zoomed screenshot next to Figma, and **one link per
  fixed point**, checked in Light AND Dark. When they are lost: one latest link + a short "where we are".
- **Consistency across the matrix**: "No podemos crearle a un botón una cosa y a los otros otra." Show
  every intent × appearance in both themes before asking for approval.
- Figma is read-only; proposals go on a "🧪 … experiment" page with node links, the library only after
  approval. Order: **Figma approved → skills aligned → Storybook**.
- Ship = one commit per component with contract, lesson, goldens, plugin bundle and stories; checks
  `npx tsc -b`, `npm test`, `npm run typecheck:storybook`, `npm run build-storybook`. Re-run
  `npm run gen:escala-skill` when roles move.
- Push, merge and production deploy need the owner's yes unless the brief pre-approves it. The owner wants
  everything in `main`, no open branches; keep an unmerged branch as an `archive/*` tag before deleting.

## 9. Sessions, worktrees, PRs

- Shared folder: commit only your own hunks, never `git stash` (a skipped `stash push` + `stash pop`
  applied an old stash). Before editing shared files (`preview.tsx`, `main.ts`) read the parallel
  session's new commits; merge only after it reports green.
- A new worktree starts from `main` and lacks unmerged commits: tell it, cherry-pick only what it needs.
- PR stack ahead of `main`: base the new PR on the stack's tip; to ship, retarget to `main` and merge the
  top one.
- A nested `claude -p` loop fails ("Not logged in"): the desktop login is not shared with the CLI. Run the
  queue inside the session. Hand off before context runs out with a gitignored `HANDOFF.md`.
- Briefs that mention `packages/ui/...` are stale: the real paths are `src/components/escala-ui` and
  `design-plans/`.
