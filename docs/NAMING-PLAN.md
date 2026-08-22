# Plan: one name everywhere — escala-tokens

The product is **Escala Tokens**. The only public URL is **https://www.escalatokens.com**. Vercel is the host, not the brand: never put `*.vercel.app` in a README, export, CLI default, plugin placeholder, or generated file.

Do this in one coordinated pass. Do not invent a monorepo.

Canonical names (locked):

| Thing | Name |
|---|---|
| Product | Escala Tokens |
| Public site | **https://www.escalatokens.com** |
| Apex redirect | `https://escalatokens.com` → www (Vercel domain settings) |
| This git repo (GitHub + folder) | `escala-tokens` |
| Figma plugin repo + folder | `escala-figma-plugin` |
| npm app package (private) | `escala-tokens` |
| npm CLI | `@escala/cli` |
| MCP server id | `escala-tokens` |
| Zustand persist key | `escala-tokens-store` |
| Plugin zip in `public/` | `escala-figma-plugin.zip` |
| `DEFAULT_PUBLISH_ORIGIN` | `https://www.escalatokens.com` |

`sync-ds-platform` is only a local Cursor workspace wrapper. It is not a git repo and must not become one.

## What is called what today (verified 2026-08-22)

| Where | Current | Target |
|---|---|---|
| GitHub remote | `github.com/Duscenko/scalable-designs` | `github.com/Duscenko/escala-tokens` |
| This folder | `~/sync-ds-platform/scalable-designs/` | `~/sync-ds-platform/escala-tokens/` |
| Workspace wrapper | `~/sync-ds-platform/` | keep on disk — not published |
| Root `AGENTS.md` | points at `scalable-designs/` | point at `escala-tokens/` |
| Plugin folder | `~/sync-ds-platform/scalable-designs-figma-plugin/` | `~/sync-ds-platform/escala-figma-plugin/` |
| Plugin git | **none** | new repo `escala-figma-plugin` |
| `package.json` `name` | `scalable-designs` | `escala-tokens` |
| Vercel project | `scalable-designs` | may stay as the *project* name in the Vercel dashboard; users never see it |
| Custom domain | www.escalatokens.com | **the** URL. Apex should redirect to www |
| Persist key | `scalable-designs-store` | `escala-tokens-store` |
| Plugin zip | `public/scalable-designs-figma-plugin.zip` | `public/escala-figma-plugin.zip` |
| README.md | generated sample | replace (OPEN-SOURCE-PLAN P4) — links must be www |

Allowed leftovers (never user-facing):

- `https://scalable-designs.vercel.app` in `publishTrust.ts` and the plugin `allowedDomains` so a preview deploy can still POST / GET.
- Zustand migrations that mention `DS.by.MD`.
- Old git commit messages.

## Sequence

**N1 — GitHub.** Rename repository to `escala-tokens`. Description: “Design-token generator. https://www.escalatokens.com”. Topics: `design-tokens`, `figma`, `mcp`.

**N2 — Local app folder.** `mv scalable-designs escala-tokens`, then `git remote set-url origin https://github.com/Duscenko/escala-tokens.git`. Update wrapper `AGENTS.md`.

**N3 — Plugin folder + first remote.** `mv` to `escala-figma-plugin`, `git init`, push to `Duscenko/escala-figma-plugin`. Point `bundle-plugin.mjs` at the new path and zip name.

**N4 — Code identifiers** (one PR once folders match): `package.json` name, persist key, zip filename, path strings in AGENTS/CLAUDE.

**N5 — Vercel (hosting only).** Keep the project attached. In Domain settings: `www.escalatokens.com` is primary; `escalatokens.com` redirects to www. Do not send people to `*.vercel.app`. Renaming the Vercel *project* to `escala-tokens` is optional hygiene.

**N6 — Do not do.** No `packages/` split. No history rewrite. No rename of `/api/tokens`, `atoms`, or `@escala/cli`. Do not rename `sync-ds-platform` unless you just want a prettier folder.

## Success

Someone who never saw Vercel can use the product by opening **https://www.escalatokens.com**. `git remote` says `escala-tokens`. Generated README, CLI defaults, and the plugin placeholder all say www. The only `vercel.app` strings left are Origin/allowlist internals.
