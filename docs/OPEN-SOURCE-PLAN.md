# Plan: open-source Escala Tokens on GitHub

Goal: a public repo that a design engineer can land on, understand in 30 seconds, run locally in two commands, and contribute to — with [escalatokens.com](https://escalatokens.com) clearly positioned as the hosted instance of *this* code, not a separate product.

This plan is written against the repo as it actually is today, not as `AGENTS.md` describes it.

## Starting state (verified 2026-08-22)

| Fact | Detail |
|---|---|
| Remote | `github.com/Duscenko/scalable-designs` · branch `main` · 12 commits |
| Uncommitted | All of P0–P3 (20 modified, 11 untracked) — Get started, wizard destinations, Install panel, CLI |
| License | **None** |
| README | Not a project README — it is **generated sample output** (“DS.by.MD — Design System”) |
| Figma plugin | `../scalable-designs-figma-plugin` is **not a git repo**. Source exists only on this machine |
| Plugin binary | `public/scalable-designs-figma-plugin.zip` is committed without its source |
| Secrets in tracked files | None found (only a `ghp_…` input placeholder) |
| `POST /api/tokens` | **No auth**, `allowOverwrite: true`, caller-controlled slug |
| CI | `.github/workflows/ci.yml` — `npm test` + `npm run eval` + `npm run build` |
| Icons | `src/generated/untitled-icons.ts` gitignored on purpose (Untitled UI: use yes, redistribute no) |

## The five things blocking a public launch

**1. The front door is an artifact.** `README.md` is a design system the app once generated. It advertises Lucide (the app ships Untitled UI now), points at `scalable-designs.vercel.app`, and never says what the project is. Anyone landing on the repo learns nothing about Escala.

**2. Two names, three URLs.** Repo `scalable-designs`, product “Escala Tokens”, npm package `scalable-designs`, CLI `@escala/cli`, plugin zip `scalable-designs-figma-plugin.zip`, logo assets `escala-ds-logo/`. `llms.txt` cites both `escalatokens.com` and `scalable-designs.vercel.app` in the same list.

**3. The plugin has no source history.** The app repo ships a zip built from a folder that is not under version control anywhere. Publishing a binary whose source nobody can read or audit is the one thing that will get called out immediately — and if this laptop dies, the source is gone. This is a backup problem before it is an open-source problem.

**4. Anyone can overwrite anyone’s tokens.** `POST /api/tokens?project=<slug>` takes no credential and overwrites the blob at that slug. Today that is obscurity-protected. The moment the repo is public and the endpoint is documented, a stranger can overwrite the system behind any slug they can guess. `CONTRACTS.md` freezes this endpoint, so the fix has to be additive.

**5. Internal notes are tracked.** `CLAUDE.md` (~2,400 lines of product reasoning and backlog), `.impeccable.md` (brand/user positioning), `.claude/settings.local.json` (local paths, tmp dirs, MCP server UUIDs), `.claude/launch.json`, `.cursor/rules/`. None of it is secret; all of it is *internal voice* on a public repo. Decide per file: keep, rewrite, or untrack.

## Repo layout

Keep **one repo** for the app + CLI. Add a **second repo** for the plugin.

| Repo | Contents | Why |
|---|---|---|
| `escala-tokens` (this one) | Configurator, token engine, `api/`, `src/cli/`, docs | One install, one CI, one issue tracker. The CLI is 200 lines over `agentBundle/` — splitting it buys nothing |
| `escala-figma-plugin` | The plugin source that currently has no history | Figma plugins have their own review/publish cycle. It also unblocks the “binary without source” problem |

`public/scalable-designs-figma-plugin.zip` stays committed (Vercel does not build the plugin) but the README must link to the plugin repo next to the download, and `scripts/bundle-plugin.mjs` should name it.

Do **not** create a monorepo, a `packages/` split, or a second token pipeline.

## Front door

Replace `README.md` entirely. The generated sample moves to `examples/generated-system/README.md` — it is genuinely useful as “here is what the output looks like”, just not as the repo’s first impression.

New README, in order:

1. **One line + screenshot.** What it is: a design-token generator whose output is one payload that Figma, CSS, and coding agents all read.
2. **Try it** — [escalatokens.com](https://escalatokens.com), the hosted instance. Say plainly: *the site runs this repo; nothing is held back.*
3. **What you get** — Figma variables via the plugin, `variables.css`, W3C DTCG JSON, an agent package, and a live MCP endpoint.
4. **Install** — `npm i && npm run dev`. Note that `postinstall` generates the icon catalog from the pinned `@untitledui/icons` and that the generated file is intentionally gitignored.
5. **Use the published system** — `npx @escala/cli skill --from <slug>` / `mcp init`, pointing at escalatokens.com by default.
6. **Architecture** — the five-line map from `AGENTS.md`, linking `CONTRACTS.md`.
7. **Deploy your own** — Vercel + `BLOB_READ_WRITE_TOKEN`, and what changes if you self-host (your own origin in the MCP snippet).
8. **License + credits** — Untitled UI icons, Radix/Tailwind/Carbon reference data, APCA.

Every user-facing URL is `https://www.escalatokens.com`. `scalable-designs.vercel.app` survives only as an Origin/allowlist leftover so preview deploys still work.

## Community files

| File | Content |
|---|---|
| `LICENSE` | Decision below |
| `CONTRIBUTING.md` | `npm test` before `npm run build` (build typechecks tests, a green test run does not). Do not hand-edit `*Reference.ts`. Do not `vitest -u` without reading the ramp diff. Color layer stays DOM-free |
| `SECURITY.md` | Where to report. Must state the `/api/tokens` trust model in plain words |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1, verbatim |
| `.github/ISSUE_TEMPLATE/` | Bug (with “which export destination”), feature, token-math report |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist: tests, no new contrast implementation, schema additive |
| `docs/ARCHITECTURE.md` | Promote the map out of `CLAUDE.md` so contributors are not told to read a 2,400-line file |

`AGENTS.md` stays as-is — it is a genuine differentiator for an agent-native project, and it reads well publicly.

## Persistence (decided 2026-08-22)

No user login. Git is the durable save; `/api/tokens` is a Figma live-sync cache.

- Push writes `.escala/system.json` (editor snapshot + publish claim) next to `tokens.json`.
- Another machine restores by connecting the same repo.
- GitLab is the same pattern later, not a blocker.
- `@escala/cli` stays a consumer installer, not an editor store.

## Security, before the repo goes public

Chosen model (additive, GET stays public):

- **POST** — same-origin (`Origin` must match this deployment). First write to a slug issues a claim; later writes need `Authorization: Bearer`. Claim lives in `localStorage` and `.escala/system.json`.
- **`?list=1`** — query param kept, response is `{ systems: [], listing: false }`.
- **Bare GET/POST `/api/tokens`** — `400`. No global latest blob; `?project=` is required. Plugin field starts empty.
- **`SECURITY.md`** matches this. No accounts.

This is *not* a vault. It stops opportunistic overwrite and directory listing. A targeted attacker who already has the claim, or who publishes first to an unused slug from the hosted origin, still wins that slug.

## CI

Current CI runs test + eval + build. Add:

- `npm run lint` (the config exists, CI never calls it)
- `npm run build:cli` so a broken CLI bundle fails the PR
- A job that runs `npx tsx src/cli/main.ts --help` — a smoke test that the bin actually starts
- Dependabot or Renovate, weekly, grouped

## What we will not do

- No rewrite of the git history. It is 12 honest commits and contains no secrets.
- No monorepo, no `packages/` split, no second token pipeline.
- No renaming of `/api/tokens`, `/api/mcp`, or `atoms`.
- No public roadmap promising features that do not exist. `@escala/cli` is not on npm until it is published.
- No Discord before there are contributors. Issues and Discussions first.

## Phases

**P1 — Land the current work.** Commit P0–P3 while the repo is still private. A public repo whose first commit is 30 files is unreviewable.

**P2 — Rescue the plugin.** `git init` the plugin folder, first commit, push to `escala-figma-plugin`. This is a backup, not a launch step — do it regardless of everything else here.

**P3 — Decide.** License (MIT, Duscenko), repo name (`escala-tokens`, not yet renamed), `/api/tokens` trust model (GET public, POST origin+claim, git as save). Settled 2026-08-22; rename is a GitHub setting, not a code change.

**P4 — Hygiene.** New README, sample moved to `examples/`, LICENSE, CONTRIBUTING, SECURITY, CoC, templates, `docs/ARCHITECTURE.md`, URL cleanup, decide on `.impeccable.md` / `.claude/` / `.cursor/`.

**P5 — Harden.** Implement the chosen write-endpoint model. Extend CI.

**P6 — Publish.** Flip to public. Publish `@escala/cli` to npm (requires owning the `@escala` scope). Add the repo link to escalatokens.com and the GitHub description/topics.

**P7 — Announce.** Only once a stranger can clone, `npm i`, `npm run dev`, and reach a working configurator without asking you anything.

## Success

Someone who has never met you can: understand the project from the README, run it locally on the first try, see that escalatokens.com is this code deployed, and open a PR that CI can judge. If the front page is still a generated token table, this plan failed.
