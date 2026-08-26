# Lead "Use with AI" with the Live (MCP) connection; demote the zip to the offline fallback

Written against: `8389513` + the uncommitted working tree of 2026-08-26 (the
border/action solver work and the architecture deletion are already applied)

---

## The claim, measured

The ask is to give the Live/MCP connection more weight than the static install
"because the static install goes stale." That is now **measurably** true in a
way it wasn't a week ago, and the reason is the solver work landed this session.

Categorical's roles are no longer all pinned tones. Five of 41 resolve to a
**different primitive ref** depending on the user's accent hue — not a different
hex, a different *reference*:

| role | violet system | amber system |
| --- | --- | --- |
| `action.primary.default` | `accent.9` / `accent.9` | `accent.11` / `accent.12` |
| `action.primary.hover` | `accent.10` / `accent.12` | `accent.12` / `accent.12` |
| `action.primary.pressed` | `accent.11` / `accent.12` | `accent.12` / `accent.12` |
| `border.focus` | `accent.9` / `accent.11` | `accent.11` / `accent.9` |
| `content.on-action` | `neutral.1` / `neutral.1` | `neutral.1` / `neutral.12` |

Those are exactly the roles an agent reaches for when it writes a button or a
focus ring. A zip generated against a violet system and kept in the repo will
tell the agent `accent.9` for the primary fill after the brand moves to amber —
and `accent.9` is the tone the solver *rejected* for that system because its
label fails AA. **The stale snapshot is not merely out of date; it is out of
date in the direction that reintroduces the accessibility bug the solver
exists to prevent.**

`resolve_token` has no such failure mode: it resolves against the published
system at call time, so it returns the tone the solver actually chose.
`check_contrast` runs the same dual-metric engine (`src/lib/color/apca.ts`) the
audit does. That is the argument for the re-weighting, and it is specific
rather than a general preference for "live over static."

### What Live actually offers today (verified, not aspirational)

`TOOL_SPECS` (`src/lib/agentAccess/types.ts`) — six tools, all read-only:
`get_tokens`, `resolve_token`, `list_components`, `get_component`,
`list_icons`, `check_contrast`. The server (`api/mcp.ts`) already instructs the
agent to "prefer `resolve_token` and the component catalogue over inventing
names or hex."

So the capability is real and shipped. What is wrong is only the **framing**.

---

## What the page says today, and why it inverts the priority

`AgentInstallPanel.tsx` renders, top to bottom:

1. Client tabs (Cursor · Claude Code · Figma Make)
2. `npx @escala/cli skill …` — the static package, as the headline command
3. An `<ol>` of install steps
4. `<details>` "Unzip instead"
5. **Then** a `border-t` rule, and `McpBlock` — captioned
   **"Live tokens (optional, recommended)"**

Three things push Live down:

- **Position.** It is last, below a fold that includes a collapsed `<details>`.
- **The word "optional."** The caption literally says so. "Recommended" in the
  same breath does not undo it — a reader scanning for what they must do reads
  "optional" and stops.
- **`variant='docs'` vs `'export'` both do this**, so the Export wizard's payoff
  step (step 3, `AgentInstallPanel variant="export"`) leads with the zip too.

The Docs page around it repeats the ordering: `AiGuide`'s sections are
**Download → Install → Paste only**, and the page lead says "Install it in the
product repo. **Optionally** connect live tokens."

The Figma Make tab is a real exception and must stay one: it has no MCP path
(`{tab !== 'make' && <McpBlock … />}`), because Figma Make consumes an uploaded
zip and cannot hold a connection.

---

## Design decision

Reverse the order and the grammar in ONE component and its surrounding copy —
do not build a second panel.

**Live becomes the headline; the package becomes the offline fallback.** The
package does not disappear and is not disparaged: it is what works with no
network, in Figma Make, and before a system is ever published. It stops being
the default answer.

Concretely, the framing changes from

> Install the package. Optionally connect live tokens.

to

> Connect live tokens. Also install the package so the agent knows the names
> offline (and for Figma Make, which can only take the zip).

### Why they are still both offered, and said plainly

They answer different questions and the page should say so in one line rather
than implying one supersedes the other:

- **Live** answers *"what is this token's value right now?"* — resolved,
  contrast-checkable, never stale.
- **The package** answers *"what tokens does this system even have?"* — names,
  component catalogue, usage guidance, available with no network and inside
  Figma Make.

An agent with only the package invents values. An agent with only Live does not
know what to ask for. The recommendation is both, with Live first.

---

## Changes

1. `src/components/configurator/AgentInstallPanel.tsx` — reorder + recaption
   - Change: move `McpBlock` **above** `ClientInstall` for the `cursor` and
     `claude` tabs. Recaption it from "Live tokens (optional, recommended)" to
     a heading that states what it is and why it leads — e.g. **"Live tokens —
     start here"** with the one-line reason (resolved values, not a snapshot).
     Drop the word "optional" from this component entirely.
   - Change: give the package block its own heading, since it is no longer the
     implicit subject — e.g. **"Offline package"** — with the one-line reason
     (names + catalogue with no network; required for Figma Make).
   - Change: the `border-t` separator currently sits above `McpBlock`; it moves
     to sit above the package block instead, so the rule still separates the
     two and the first thing under the tabs is the Live command.
   - Preserve: the Figma Make tab's copy and its `tab !== 'make'` guard — Make
     genuinely has no live path, and the page must not imply otherwise.
   - Preserve: every command string comes from `lib/agentInstall.ts`
     (`cliMcpInitCommand`, `cliSkillCommand`, `mcpCursorConfig`, …). Do not
     inline a command; that module exists so a path in Docs cannot drift from
     what the CLI parses.
   - Preserve: the `<details>` escape hatches ("Unzip instead", "Paste JSON
     instead · VS Code"). Demoting the package is not the same as hiding the
     manual route.
   - Verify: on Docs → Use with AI and on Export step 3, the first command
     under the tabs is `npx @escala/cli mcp init …`.

2. `src/components/configurator/AgentInstallPanel.tsx` — the `variant='export'`
   intro paragraph
   - Change: it currently reads "This teaches the agent your token names… The
     system must be published (Sync). Or unzip the file you just downloaded."
     Lead with the connection instead, keeping the publish precondition (which
     Live needs too — it reads the published system).
   - Verify: the wizard's payoff step reads as "connect, then optionally keep
     the package," not the reverse.

3. `src/components/configurator/docs/getStartedArticle.tsx` — `AiGuide` sections
   - Change: reorder to **Connect (live) → Package (offline) → Paste only**.
     Today it is Download → Install → Paste only, and `Download` exists mainly
     to send the reader to Export for the zip — which is now the second option,
     so the Export exit belongs inside the package section rather than being
     the page's opening move.
   - Change: `TITLE[GUIDE_AI_KEY].lead` — currently "…Install it in the product
     repo. **Optionally** connect live tokens." Invert it.
   - Preserve: the `Paste only` section verbatim. "Copy context to Agents" is a
     genuinely different mode (no files, no restart, one-off chat) and its
     framing is already correct.
   - Verify: the page's own TOC (`getStartedToc`) matches the new section
     order — it is a hand-written array keyed on the same ids, so it must be
     updated in the same edit or the jump links point at the wrong headings.

4. `src/components/configurator/docs/getStartedArticle.tsx` — the Copy-Page
   markdown for `GUIDE_AI_KEY`
   - Change: the same reordering in the markdown branch (currently: skill
     command, then unzip paths, then "Then optionally connect live tokens").
     This string is what "Copy Page" hands to an agent, so an agent reading it
     should also be told to connect first.
   - Preserve: the closing line "The guide teaches names. The live connection
     looks up values (`resolve_token`, `check_contrast`). Use both." — it is
     already the correct summary; it just currently arrives after the ordering
     has implied the opposite.
   - Verify: Copy Page output leads with `cliMcpInitCommand`.

5. `src/components/configurator/docs/getStarted.ts` — the AI destination hint
   - Change: `DestinationRow` for AI reads "One zip into Cursor or Claude so
     the agent stops inventing hex. Optional live lookup." Invert.
   - Verify: the Get-started landing's AI row leads with the connection.

6. `CLAUDE.md`
   - Change: record the re-weighting and, more importantly, **why** — the
     five solver-driven roles above are the evidence, and they are the thing a
     future reader needs in order not to quietly re-promote the zip.

---

## Explicitly NOT in this plan

- **No new MCP tools.** The six that exist carry the argument.
- **No removal of the package path.** It is the only option for Figma Make, the
  only option offline, and the only thing that carries the component catalogue
  and usage prose. Demotion, not deletion.
- **No change to `lib/agentInstall.ts` command builders.** This is a framing
  change; the commands are already correct and already single-sourced.
- **No change to "Copy context to Agents."** Different mode, already framed
  correctly as the no-install one-off.
- **No change to `useIt.ts`'s `AI_NOTE`.** It already points at this guide and
  already names the MCP precondition; it inherits the fix rather than needing
  one.

---

## Validation

- **Product:** Docs → Get started → Use with AI. The first thing under the
  client tabs must be the `mcp init` command. Switch to Figma Make: no live
  block appears and the copy does not promise one.
- **Interface:** Export wizard → destination **AI assistant** → step 3. Same
  ordering, since both surfaces render `AgentInstallPanel`.
- **Content:** grep the repo for the word "optional" applied to live tokens —
  it should survive only where it is true (Figma Make has no live path; Paste
  only is genuinely an alternative).
- **System:** confirm no command string was inlined during the reorder — every
  `CodeBlock` in the panel still takes its `code` from a `lib/agentInstall.ts`
  helper.
- **Repository:**
  - `npm test` → unchanged (this is copy + JSX order; no resolver touched)
  - `npm run build` → clean
  - Copy Page on the AI guide → the pasted markdown leads with the connection

---

## Stop conditions

- Stop if reordering `McpBlock` above `ClientInstall` makes the `variant='export'`
  step-3 panel taller than the wizard's scroll area comfortably shows — the
  wizard's payoff step already carries the Save card and the summary. If so the
  fix is to collapse the package block into a `<details>` there (export variant
  only), not to put Live back underneath.
- Stop if any surface other than these two renders `AgentInstallPanel` with an
  assumption about its internal order.
