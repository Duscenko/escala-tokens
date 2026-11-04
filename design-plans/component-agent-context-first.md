# Component page: "Copy context to Agents" first, no Code tab

**DONE 2026-11-04.** Revised by the owner before building: the Code tab is REMOVED
(it confused people), not moved after Agent context. Header button removed.

Owner's call (2026-11-04): on every component page the agent context matters more
than the code. Users understand "copy this for my agent" far better than a
`<Button>Button</Button>` snippet, which says almost nothing on its own. Today the
context lives in a split button in the page header (it wraps onto two lines),
while the hero panel's only copy action is an icon that copies the snippet.

## Today (measured)

- Hero panel (`ComponentCatalogueHero`, `docs/componentArticle.tsx`): tabs
  **Preview · Code** (`ViewToggle`, `docs/blocks.tsx`), file name, then
  `InspectSwitch` (Preview only) and an icon-only `CopyButton` that copies the
  **snippet** on BOTH tabs.
- Header: `CopyAgentContextButton` → `AIContextButton scope="component"` with
  Theme · Detail filters, built by `componentContext(...)`. Portaled into
  `actionsSlot` on the Components destination. Its label wraps to two lines.
- The "Use it" block's AI tab carries the same brief (`agentBrief`).
- One hero for all 73 components, so a change here covers the catalogue at once.

## Plan

### 1. Panel tabs: Preview · Agent context · Code
- `ViewToggle` takes the list of views; the hero passes
  `['preview', 'agent', 'code']`. `PreviewCode` (Examples) keeps Preview · Code.
- Default stays **Preview** (the specimen is the page's subject).
- **Agent context** tab: renders the exact string the button copies
  (`componentContext(def, heroCode, previewTheme, appearance, tokens, opts)`),
  in the same `CodePane` scroll style as Code, plus a one-line caption above it:
  "Paste this into Cursor, Claude Code or any agent. It names the real tokens."
  Shows the "≈ N tokens" size (`contextSize`) so the cost is visible.
- File label per tab: `button.tsx` on Code, `button.context.md` on Agent context,
  nothing on Preview.

### 2. The panel's copy action follows the tab, and leads with the agent
- Replace the icon-only snippet copy with a labelled **Copy context** button
  (agent glyph + text, the `raised-control` style) on Preview and Agent context.
  It copies the agent brief with the current Theme · Detail prefs.
- On the Code tab the same slot copies the snippet ("Copy code"), as today.
- The ⌄ filters (Theme · Detail) move with it: the split button is
  `AIContextButton` with `filters`, so the hero renders that component instead of
  a bare `CopyButton` — no second copy path, same `sd-context-prefs`.

### 3. Header
- Remove the header's `CopyAgentContextButton` on component pages (it becomes a
  second door to the same action, two rows above it). Keep **Edit Color**.
- If the header must keep something, fix the label wrap (`whitespace-nowrap`)
  and shorten to "Copy context". Decision for the owner: remove (recommended) or keep.

### 4. Use it block
- The AI tab already shows the brief. Leave it, but make its copy call the same
  builder so the two can't drift (they already share `agentBrief`).

### 5. Copy + i18n + rule
- New strings in es/fr (`Agent context`, `Copy context`, `Copy code`, the caption).
- CLAUDE.md note: "On a component page the agent context is the first copy
  action; Code is a tab after it. Don't put the snippet back as the panel's
  default copy."

### 6. Verify
- `npm test` (agentContextAudit, useIt tests: the AI tab and the panel must
  name the same figmaSets / brief).
- Browser: Button, Dialog, Input, Sidebar pages — tab order, copy result on each
  tab, filters persist, header no longer duplicates, dark + light.

## Out of scope
- Rewriting the brief's content (`agentContextMarkdown`). Only placement changes.
- The Examples blocks' Preview · Code toggles.
