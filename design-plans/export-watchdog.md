# Export watchdog — plan

**Goal:** no broken `variables.css`, agent context, tokens.json or plugin payload
reaches a user. When something breaks, you hear about it the same day, with the
cause named.

**Principle:** the checks are CODE, not an AI's judgement. An export is right or
wrong by measurement (same value everywhere, every alias resolves, contrast
passes). The agent's job is to run them, read the report, find the cause and
propose the fix — never to decide by eye that an export "looks fine".

---

## What exists today (2026-10-30)

| Guard | Covers | Gap |
|---|---|---|
| `npm test` (141 files) in CI on PRs + push to `main` | many parity tests (`exportGetCodeParity`, `cssCut`, `figmaCollections`, `componentRecipesPluginParity`, `agentContextAudit`, contrast matrix) | each test checks one pair; no single test walks every output for every style |
| `codeExportCoherence.test.ts` | CSS = tokens.json = context = plugin, per role | only 4 styles, only colour roles |
| Deploy | `npx vercel --prod` from a laptop | **skips CI entirely** — a red `main` can ship |
| Production | nothing | the published blobs the plugin reads are never checked (measured once: serving schema 6 / 39 roles against a codebase at 7 / 64) |
| Plugin repo | its own build | not checked against this repo's current payload |

---

## The contract — what "not broken" means

Every check below runs for **every System Style (18) + 20 random moods + edge
systems** (one brand, Light only, Dark only, 5 brands, brands sharing seeds,
custom fonts, a hand-edited role, a pinned radius role).

| # | Invariant | Outputs |
|---|---|---|
| I1 | No custom property is declared twice in one block with two values | `variables.css`, All-brands CSS, every cut |
| I2 | Every `var(--x)` resolves to a declared variable (or is a known runtime var: `--switch-from`, `--escala-disclosure-height`…, listed explicitly) | CSS, agent context |
| I3 | Every Categorical role, primitive, alpha twin, length and type role: CSS value = tokens.json value, Light and Dark | CSS ↔ JSON |
| I4 | Agent context: every scope × appearance × detail names the same hex / px as tokens.json; every CSS variable it cites exists in `variables.css`; the Escala JSON fence parses and equals `pluginPayload` | context ↔ JSON ↔ plugin |
| I5 | Plugin payload (`brand::appearance` columns, `foundationsByTheme`) = Code snapshot, value for value | plugin ↔ Code |
| I6 | One-theme CSS (Theme = Light / Dark) = that column of the Both file | CSS cuts |
| I7 | Collection cuts and All-brands CSS contain only lines of the full file, and every alias inside them resolves | `cssCut` |
| I8 | W3C export: every alias resolves inside the document, values = tokens.json | W3C |
| I9 | Contrast audit: 0 failures (WCAG + APCA, per intent) | colour |
| I10 | Size budgets: context at scope All ≤ N tokens, CSS ≤ N KB (catches a runaway loop or a duplicated block) | all |
| I11 | Golden files: the default system's `variables.css`, `tokens.json` and context are snapshot-pinned; any change shows up as a diff to read and approve | all |

---

## Phases

### Phase 1 — one audit, one command — **DONE 2026-10-30**
Built: `lib/exportAudit.ts` (I1–I8, I10), `lib/exportAuditMatrix.ts` (15 systems:
18 styles, shared seeds, 20 seeded moods, created-in-Dark, Light-only/Dark-only,
hand edits, five brands), `__tests__/exportAudit.test.ts` (+ four golden files,
I11), `npm run audit:exports` → `reports/export-audit.{md,json}`. I9 (contrast)
stays in `contrast-matrix.test.ts`. It found two more bugs on the way, both
fixed: a brand created in Dark shipped LIGHT shadows and gradients at `:root`,
and a bare-key role override landed on both Figma columns and beat the
per-theme edit. Reverting any of the five fixes turns the audit red.
The report runs inside vitest, not `tsx`: under `tsx` the store loaded twice.

Original scope:
- `src/lib/exportAudit.ts` (pure, DOM-free): `auditExports(store) → { pass, findings[] }`,
  each finding `{ invariant, brand, appearance, token, expected, got, output }`.
  The scratch audit from 2026-10-30 is the starting point.
- `src/lib/__tests__/exportAudit.test.ts`: runs it over the full matrix above and
  fails on any finding. `codeExportCoherence.test.ts` folds into it.
- `npm run audit:exports` writes `reports/export-audit.{json,md}` (gitignored) —
  the file a person or an agent reads.
- Golden snapshots (I11) for the default system.

**Done when** the audit is green on `main` and fails on each of the three bugs
fixed in `5528c27` when they are reverted one by one.

### Phase 2 — nothing ships red (≈ half a day)
- Add `npm run audit:exports` to the CI `test` job.
- **Put the audit in the Vercel build** (`build` script): a deploy whose exports
  break fails to build, however it was started — CLI, Git or dashboard. Cost:
  ~20 s per build.
- Branch protection on `main`: CI must pass to merge.

**Done when** a `vercel --prod` from a branch with a broken export fails.

### Phase 3 — watch production (≈ 1 day)
- A **canary system** (`escala-canary`, one brand per System Style family)
  published from production after each deploy.
- A GitHub Action on a cron (daily) + after each deploy:
  1. fetches `/api/tokens?project=escala-canary` from `www` and the apex;
  2. checks `schemaVersion` = `TOKEN_SCHEMA_VERSION` on `main`, and runs I3–I5
     and I8 on the published JSON (the renderers work from JSON);
  3. checks the production build is the commit on `main` (`vercel ls --prod`).
- On failure: opens (or updates) a GitHub issue labelled `export-broken` with the
  report; closes it when green again. GitHub emails you.

### Phase 4 — the agent (≈ half a day)
- **Project skill** `.claude/skills/export-watchdog/SKILL.md`: what the contract
  is, how to run the audit, how to read a finding, which file owns which output
  (`exporters.ts` → CSS, `contextRequest.ts` / `contextSource.ts` → context,
  `tokenGenerator.ts` → JSON, `themeMint.ts` → families…). Any session touching
  export code runs it before finishing.
- **Scheduled cloud agent** (Claude routine, daily, and whenever the
  `export-broken` issue opens): runs the audit on `main`, reads the report,
  bisects to the commit that broke it, writes the diagnosis on the issue and
  opens a **draft PR** with the fix and a regression test. It never merges,
  never deploys, never republishes.
- Optional: a push notification to you when the issue opens.

### Phase 5 — the plugin (≈ half a day)
- The plugin repo's CI imports `reports/golden/tokens.json` from this repo and
  runs `importVariables` + `recipeBindings` on it (headless): every role binds a
  variable, no fallback hex is used, no layer is left unbound.
- `bundle:plugin` refuses to zip when that check is red.

---

## Cost: €0, by design
- **GitHub Actions** (CI, daily cron, issues, email): free — the repo is public,
  and public repos get unlimited minutes on standard runners.
- **Vercel Hobby**: the audit in the build adds time, not money. Hobby is free and
  stops (it does not bill) when a limit is reached. The canary adds one Blob write
  per deploy and one read per day — far inside the free tier.
- **The cloud agent (phase 4)** runs on your Claude plan's usage, not a new bill.
  It is optional: phases 1–3 alone already block and report every break, for free.
- Nothing here needs a new paid service. Slack is optional, and its free plan is enough.

## Decisions for you
1. **Notification channel:** GitHub issue (email) by default. Slack or a push
   notification can be added; Slack needs that connector authorised.
2. **Audit inside the Vercel build** (recommended): slower deploys (~20 s), but
   it is the only way to stop a laptop deploy from shipping a broken export.
3. **Can the agent open PRs on its own** (recommended: draft PRs only), or only
   report?

## Not in scope
- Judging design quality (whether a colour is pretty). The watchdog checks
  coherence and accessibility, not taste.
- Users' private published systems: listing is disabled and stays disabled; the
  canary stands in for them.
