# Plan: one name everywhere — Escala Tokens

The product is **Escala Tokens**. The hosted site is **escalatokens.com**. Everything else still says something older. This plan lists every name that exists today and the one rename for each. Do it in one coordinated pass after the current work is on `main`. Do not invent a monorepo.

Canonical names (decided):

| Thing | Name |
|---|---|
| Product | Escala Tokens |
| Site | https://escalatokens.com |
| This git repo (GitHub + folder) | `escala-tokens` |
| Figma plugin repo + folder | `escala-figma-plugin` |
| npm app package (private) | `escala-tokens` |
| npm CLI | `@escala/cli` |
| MCP server id | `escala-tokens` |
| Zustand persist key | `escala-tokens-store` |
| Plugin zip in `public/` | `escala-figma-plugin.zip` |

`sync-ds-platform` is only a local workspace wrapper. It is not a git repo and must not become one.

## What is called what today (verified 2026-08-22)

| Where | Current | Target |
|---|---|---|
| GitHub remote | `github.com/Duscenko/scalable-designs` | `github.com/Duscenko/escala-tokens` |
| This folder | `~/sync-ds-platform/scalable-designs/` | `~/sync-ds-platform/escala-tokens/` |
| Workspace wrapper | `~/sync-ds-platform/` | keep — Cursor workspace root; not a git repo |
| Root `AGENTS.md` | points at `scalable-designs/` | point at `escala-tokens/` |
| Plugin folder | `~/sync-ds-platform/scalable-designs-figma-plugin/` | `~/sync-ds-platform/escala-figma-plugin/` |
| Plugin git | **none** | new repo `escala-figma-plugin` |
| `package.json` `name` | `scalable-designs` | `escala-tokens` |
| `cli/package.json` | `@escala/cli` (already correct), license MIT | keep |
| Vercel project | `scalable-designs` → `*.vercel.app` | rename project **or** leave the preview host and keep the custom domain |
| Custom domain | `escalatokens.com` | keep — this is the public URL |
| Persist key | `scalable-designs-store` | `escala-tokens-store` (wipes this-browser state; no production users) |
| Plugin zip | `public/scalable-designs-figma-plugin.zip` | `public/escala-figma-plugin.zip` + `bundle-plugin.mjs` |
| AGENTS / CLAUDE paths | `../scalable-designs-figma-plugin` | `../escala-figma-plugin` |
| Default project name | `Escala` (already migrated off `DS.by.MD`) | keep |
| README.md | generated sample (“DS.by.MD”) | replace (OPEN-SOURCE-PLAN P4) — not this rename |

Allowed leftovers (do not rename, document once):

- `https://scalable-designs.vercel.app` — old preview host. Keep in `publishTrust.ts` as an accepted `Origin` until that Vercel project name is gone.
- Zustand migrations that mention `DS.by.MD` — historical; they still run on old `localStorage`.
- Git commit messages and blob keys already written. Blob paths are `tokens/<slug>.json`, not the repo name.

## Why the local folder and GitHub differ

Git tracks the repo **inside** `scalable-designs/`. The parent `sync-ds-platform/` is just the Cursor workspace: two sibling folders (app + plugin) and a one-page `AGENTS.md`. GitHub never saw `sync-ds-platform` because that directory has no `.git`.

Renaming on GitHub does **not** rename the folder on disk. Renaming the folder on disk does **not** rename GitHub. Both have to be done, in that order, then `git remote` still works because GitHub redirects `Duscenko/scalable-designs` → `Duscenko/escala-tokens`.

## Sequence

Do not mix this with feature work. One pass, in order.

**N1 — GitHub (2 minutes).** Repo Settings → Rename repository → `escala-tokens`. Description: “Design-token generator. Hosted at escalatokens.com.” Topics: `design-tokens`, `figma`, `mcp`. GitHub serves redirects from the old URL. Do this while the repo is still private.

**N2 — Local app folder.** After N1:

```bash
cd ~/sync-ds-platform
mv scalable-designs escala-tokens
cd escala-tokens
git remote -v   # still origin …/scalable-designs.git is fine; GitHub redirects
# optional, tidy:
git remote set-url origin https://github.com/Duscenko/escala-tokens.git
```

Reopen the Cursor workspace (or `move_agent_to_root` to `~/sync-ds-platform/escala-tokens` if the conversation should live inside the repo). Update wrapper `AGENTS.md`: table path `escala-tokens/`.

**N3 — Local plugin folder + first git remote.** This is also the plugin backup (OPEN-SOURCE-PLAN P2):

```bash
cd ~/sync-ds-platform
mv scalable-designs-figma-plugin escala-figma-plugin
cd escala-figma-plugin
git init
git add .
git commit -m "Initial commit of the Escala Figma plugin."
# create empty GitHub repo Duscenko/escala-figma-plugin, then:
git remote add origin https://github.com/Duscenko/escala-figma-plugin.git
git push -u origin main
```

Point `escala-tokens/scripts/bundle-plugin.mjs` at `../escala-figma-plugin`. Rename the zip. Grep `scalable-designs-figma-plugin` and replace path strings.

**N4 — Code identifiers (one PR, after the folders match).**

- `package.json` / `package-lock.json` `name` → `escala-tokens`
- persist key `scalable-designs-store` → `escala-tokens-store`
- zip filename + any UI copy that says the old zip name
- `AGENTS.md`, `CLAUDE.md`, `llms.txt`, `CONTRACTS.md` paths
- Vercel: Project Settings → rename to `escala-tokens` **or** leave it and treat `scalable-designs.vercel.app` as a compatibility Origin only. The site users hit is `escalatokens.com` either way.

**N5 — Do not do**

- Do not create `packages/` or merge the plugin into this repo.
- Do not rewrite git history.
- Do not rename `/api/tokens`, `atoms`, or `@escala/cli`.
- Do not rename the Cursor workspace folder `sync-ds-platform` unless you want a prettier disk path. It is not published. If you rename it later, it is `mv` + reopen Cursor, nothing on GitHub.

## Success

`git remote -v` says `Duscenko/escala-tokens`. The folder next to the plugin is `escala-tokens/`. `package.json` name, persist key, MCP id, and CLI scope all say Escala. Someone who clones from GitHub does not see `scalable-designs` except in a one-line compatibility note for the old Vercel preview host.
