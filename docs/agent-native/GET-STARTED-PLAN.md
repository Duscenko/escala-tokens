# Plan: Get started — explain destinations, not file formats

The configurator already does the hard part (foundations → one `TokenJSON`). Export then offers five *formats*. Markdown, Skill, and Agent bundle are the same job wearing three names, and none of them is an **install**. Create UI’s docs ([createui.co/docs](https://createui.co/docs), plus [skill](https://createui.co/docs/skill), [mcp](https://createui.co/docs/mcp), [cli](https://createui.co/docs/cli)) work because they answer: *what you get, then how it lands in your repo / agent*. Steal that shape. Do not steal their product: they ship a component CLI; we ship **this system’s tokens**.

## What’s wrong today

The user path is: set foundations → Export → pick a format.

| What we show | What they hear |
|---|---|
| W3C Design Tokens | “JSON for tools” — OK |
| Escala JSON | “For our Figma plugin” — OK if the plugin link stays |
| Markdown | “A README?” |
| Skill | “A Figma MCP zip?” — jargon, and the only install hint is a footnote (`.cursor/skills`) |
| Agent bundle | “Skill plus more files?” — no Cursor/Claude/MCP install |

Three extra problems:

1. **Choice paralysis.** Markdown, Skill, and Agent bundle are all “give an AI the system.” One job, three radios.
2. **No install surface.** MCP already lives at `GET/POST /api/mcp`. The agent bundle zip already contains `AGENTS.md` + `SKILL.md`. Nothing in the UI says “paste this into Cursor” or “unzip here.”
3. **Copy context is a fourth AI path** (`Copy context to Agents`) that never meets Export. Paste vs install vs MCP look like three products.

Create UI’s move: one sentence per capability, then a **command**. We don’t have `pnpm dlx @escala/cli` yet — until we do, the “command” is unzip + a copied JSON snippet. That’s enough if it’s on a dedicated page, not a format hint.

## The job the user actually has

After foundations, they want **one system in the place they work**:

| Job | Destination | What they should click |
|---|---|---|
| Design in Figma | Plugin + Escala JSON (sync already publishes `/api/tokens`) | **Figma** |
| Implement in code | CSS (`variables.css` / Save) and/or W3C | **Code** |
| Generate / audit with an agent | Full context + live token query | **AI** (one path) |

CSS already lives in Save / GitHub, not the wizard — keep it there, but **name it** on the Get started page so Export isn’t the only door.

## Target information architecture

### A. Docs: “Get started” (Create UI intro + install)

In-app **Docs**, first article (today the overview is token theory). Three blocks, same tone as Create UI “What you get” / “Start”:

**What you configured**

- A token system (primitives hidden, semantics public).
- Light/dark (and extra themes) as modes.
- Optional components (`atoms`) for Figma.

**Where it goes**

1. **Figma** — install the Escala plugin, keep Sync on. Plugin reads the same JSON the wizard can download.
2. **Code** — `variables.css` (Save / GitHub) or W3C JSON for Style Dictionary / Tokens Studio.
3. **AI** — install the package into Cursor/Claude, optionally connect MCP so the agent can `resolve_token` without guessing.

**Start** — three cards, not five formats:

- Use in Figma  
- Use in code  
- Use with AI  

Each card is a short article (below). This is the createui.co/docs pattern: intro → installation-shaped guides.

### B. Export wizard: destinations, not formats

**Step 2 becomes “Where is this going?”** (max three choices). Internally we still call `buildWizardExport`; we stop exposing Skill vs Markdown vs Agent bundle as peers.

| Radio (user-facing) | Under the hood | Default |
|---|---|---|
| **Figma** | Escala JSON (+ plugin download, as today) | Recommended for designers |
| **Code / other tools** | W3C (structure single vs per-collection stays here) | |
| **AI assistant** | `agent-bundle` zip | Recommended for Cursor/Claude |

Markdown and Skill **leave the radio list**.

- Markdown: already in Save (`README.md`) and in “Copy context to Agents.” Don’t make it a competing export.
- Skill zip: a **secondary** control inside AI — “Figma Make only (smaller zip).” Power users; not a third philosophy.

After download on **AI**, don’t end on a file name. Show **Install** (next section).

Figma path already expands the plugin zip — keep that. Code path keeps W3C badges. AI path gets the install panel Create UI puts on `/docs/skill` and `/docs/mcp`.

### C. Install: Skill + MCP (the missing UI)

This is the hole. The files exist; the **recipe** does not.

**1. Agent package (the zip)**

After “AI assistant” download:

1. Unzip. Folder name = skill `name` (already in `SKILL.md` front matter).
2. Pick the agent (tabs, like Create UI `--client`):

| Agent | Where to put the folder |
|---|---|
| Cursor | `.cursor/skills/<name>/` in the **product** repo (the app they are building, not Escala) |
| Claude Code | `.claude/skills/<name>/` |
| Figma Make | Upload the zip as-is (Skill-only zip if they chose the smaller one) |

Copy-paste the path. One sentence: *This teaches the agent your token names. It does not replace Figma.*

**2. MCP (live tokens)**

Same panel, second block: “Also connect live tokens (optional, recommended).”

Prefilled snippet using **this** project’s sync URL (same slug as Figma Sync):

```json
{
  "mcpServers": {
    "escala-tokens": {
      "url": "https://escalatokens.com/api/mcp"
    }
  }
}
```

Plus: “Cursor: project `.cursor/mcp.json`. Restart Cursor.”  
Claude / VS Code variants in a disclosure, same as [createui.co/docs/mcp](https://createui.co/docs/mcp).

Explain in one line: *Skill = static names. MCP = ask the published system `resolve_token` / `check_contrast`.* They work together; Create UI says the same.

The CLI is `@escala/cli`. Primary install is `npx @escala/cli skill` / `mcp init`. Unzip and pasted JSON stay as fallbacks when the system is not published.

**3. Paste-only (no install)**

Keep **Copy context to Agents** on Docs / foundation pages. Label it: “Paste into chat (no install).” That’s the junior-friendly path. Export/AI is “put it in the repo so every chat has it.”

### D. CLI

Create UI’s `skill` / `mcp init` commands are why their docs feel finished. Ours wrap what we already generate — published Blob + `buildAgentProductFiles`, not a second pipeline:

```
npx @escala/cli skill --from <published-slug> --client cursor
npx @escala/cli mcp init --client cursor --url https://escalatokens.com/api/mcp
```

Source: `src/lib/cliInstall.ts`. Package: `cli/package.json` (`@escala/cli`). Unzip remains the fallback when the system is not published.

## Copy rules (kill jargon in the UI)

| Don’t say | Say |
|---|---|
| Skill / Agent bundle / Markdown | AI assistant / “Full context for Cursor & Claude” |
| W3C Design Tokens | Code & other tools (W3C JSON) |
| Escala JSON | Figma (Escala plugin) |
| `SKILL.md` as the product name | “The guide your agent reads” |
| MCP as a format | “Live connection so the agent can look up tokens” |

Hints stay one line. Details live in the install panel and Docs articles, not in five radio subtitles.

## What we will not do in this pass

- No sixth format.
- No second Skill generator (`buildAgentSkillFiles` stays the Figma slice inside the AI zip).
- Don’t move CSS into the wizard (Save/GitHub already own it) — only **link** it from Get started.
- Don’t add axe or a live LLM to install.
- Don’t change `/api/tokens` or `/api/mcp` contracts.

## Implementation phases (safe)

**P0 — Copy and Docs only (no wizard surgery)** — landed 2026-08-22.  
In-app Docs landing is **Get started** (Figma / Code / AI). System reference is the old Overview sheet. AI article: unzip table + MCP JSON + “Copy context.” Wizard radios unchanged until P1.

**P1 — Wizard destinations** — landed 2026-08-22.  
Three radios (Figma / Code / AI). Default Figma = `escala`. AI = `agent-bundle`; Skill is nested “Figma Make only.” Markdown left `WIZARD_DESTINATIONS` (still in `FAMILY_FORMAT_OPTIONS` and `buildSectionExport` for Save/Copy).

**P2 — Shared Install panel** — landed 2026-08-22.  
`AgentInstallPanel` is the recipe: Cursor / Claude / Figma Make tabs + MCP JSON (`publishOrigin()` + `syncProjectId()`, same host/slug as Figma Sync). Wizard step 3 (AI destination) and Docs → Use with AI both render it. P3 replaced the “CLI coming” line with real `npx` commands.

**P3 — CLI** — landed 2026-08-22.  
`@escala/cli`: `skill --from <slug>` fetches the published Blob and writes `buildAgentProductFiles` into `.cursor/skills/…` or `.claude/skills/…`. `mcp init` merges the live-token JSON. Wizard + Docs print the same command strings (`cliSkillCommand` / `cliMcpInitCommand`). Unzip remains the fallback. No second token pipeline. Do not change `/api/tokens` or `/api/mcp`.

## Success

A new user can answer without reading `CLAUDE.md`:

1. Figma → plugin + Sync.  
2. Code → CSS from Save, or W3C from Export.  
3. Cursor → `npx @escala/cli skill --from <slug>` and `mcp init`, or unzip into `.cursor/skills/…`.

If they still have to choose between Markdown, Skill, and Agent bundle, this plan failed.
