# P0 — Colour instrumentation baseline

**Landed:** 2026-08-19 · **Behaviour change to shipped tokens: none.**

Phase P0 of [`RESEARCH-PLAN.md`](./RESEARCH-PLAN.md). It adds the measurement
layer every later phase depends on.

## Setup

```bash
npm install          # vitest, tsx, apca-w3, colorparsley — all devDependencies
npm test             # 161 assertions + 4 documented defects
npm run color:report # writes reports/color-audit.json
```

## Files added

| Path | What it is |
|---|---|
| `src/lib/color/apca.ts` | APCA-W3 0.1.9 (`Lc`), WCAG 2.x, intent-class thresholds. **Zero runtime dependencies.** |
| `src/lib/color/gamut.ts` | OKLab ↔ sRGB and CSS Color 4 gamut mapping. **Zero runtime dependencies.** Not yet wired into `buildScale`. |
| `src/lib/__tests__/apca.test.ts` | Frozen reference vectors + a 2 000-pair conformance fuzz against `apca-w3`, asserting divergence `< 1e-9`. |
| `src/lib/__tests__/gamut.test.ts` | Round-trip, chroma-js agreement, and a demonstration that mapping beats clipping on hue *and* lightness. |
| `src/lib/__tests__/ramps.golden.test.ts` | 124 snapshots pinning every shipping generator: 5 seeds × 10 algorithms × light/dark, plus both sliders. |
| `src/lib/__tests__/ramps.invariants.test.ts` | Structural and perceptual properties, plus three known defects as `it.fails`. |
| `src/lib/__tests__/no-duplication.test.ts` | Drift guards — see the register below. |
| `scripts/color-report.ts` | The audit: 10 seeds × 4 algorithms × 2 themes → 800 role pairs, WCAG **and** APCA. |
| `vitest.config.ts` | `environment: 'node'` — the colour layer must stay DOM-free. |

## File modified

`src/lib/colorUtils.ts` — deduplication only, **no value changes**. See below.

## Duplication register

The concern is real: a colour codebase accumulates parallel implementations of
the same standard, and they drift silently. Every instance is listed here with
its status and its guard. All guards live in
`src/lib/__tests__/no-duplication.test.ts`.

### 1. WCAG contrast — **ELIMINATED**

Before P0, `colorUtils.checkContrast` wrapped `chroma.contrast` while
`color/apca.ts` implemented the same formula independently. Two implementations
of one standard.

`checkContrast` now delegates to `wcagRatio`. Two further hex-string call sites
were converted (`lightnessForContrast`'s quantised re-check, and `readableInk`).

**Proof this was a no-op:** the two implementations were compared over 5 000
deterministic random pairs and agreed to **exactly 0.0**. All 124 golden ramp
snapshots pass unchanged. That test stays in the suite so the claim remains
checkable rather than historical.

**Two `chroma.contrast` call sites survive on purpose.** They operate on
un-quantised `chroma.Color` objects mid-bisection — a different input domain
from the 8-bit hex our module takes. Rounding inside the search loop would make
the bisection non-monotonic. Each is annotated `CONTINUOUS-PRECISION`, and the
guard test **fails on any unannotated call site**, so a new duplicate cannot
sneak back in.

### 2. OKLab conversion — **INTENTIONAL**

`color/gamut.ts` implements Ottosson's matrices natively rather than going
through chroma-js. Gamut mapping is the layer everything else gets verified
against, so it must not inherit another library's rounding. The two agree to
`1e-4`, which is chroma-js's own matrix precision — asserting tighter would be
testing chroma's rounding, not our correctness.

**Guard:** equivalence assertion across a hue sweep.

### 3. The `color-science-core` skill's `contrast.mjs` — **INTENTIONAL**

The skill (at `.claude/skills/color-science-core/`) ships a dependency-free JS
mirror of `apca.ts` + `gamut.ts`, because a portable skill cannot import from
this package.

**Guard:** the drift test imports the skill's `contrast.mjs` and asserts APCA,
WCAG and luminance agree to `< 1e-12`. Currently measured: **exactly 0** across
2 000 pairs. The guard was verified to actually bite — perturbing one APCA
constant in the skill by 0.01 fails the test with a divergence of 8.01.

### 4. `compositeOver` — **PRE-EXISTING, NOT FIXED**

Not introduced by P0. Defined twice, exported from both, with **different
signatures**:

```ts
colorUtils.compositeOver(overlayHex, backgroundHex)          // 2 args
semanticArchitectures.compositeOver(inkHex, alpha, baseHex)  // 3 args
```

Same name, same concept, incompatible call shapes. An import from the wrong
module mis-composites. Renaming one is mechanical, but which name should win
depends on which call sites you want to read well — so it is left as a decision
and recorded as an `it.fails` guard that will pass the moment it is resolved.

## The `it.fails` convention

Four assertions are marked `it.fails`. They **pass while the defect exists** and
**start failing the moment it is fixed** — at which point you delete the
`.fails` and the assertion becomes a permanent guarantee.

- `DEFECT C1` — the ten "algorithms" share one lightness curve. Radix and Ant
  agree on the `L` of steps 2–8 to within 0.02, which independent algorithms
  could not do.
- `DEFECT H5` — step 11 is solved to WCAG 4.5:1, far below APCA body-text grade
  on a dark page.
- `DEFECT H6` — the `saturation` preset pushes step 10 outside sRGB for a vivid
  seed; per-channel clipping lands it **~10° off the requested hue**.
- `compositeOver` collision (above).

## What the audit found

800 role pairs, using the **recommended tones** a fresh system generates:

| | count | share |
|---|---|---|
| WCAG 2.1 failures | 498 | 62.3 % |
| APCA failures | 708 | 88.5 % |
| Fail both | 498 | 62.3 % |
| **Pass WCAG, fail APCA** | **210** | **26.3 %** |

Failing in **40 out of 40** configurations (every seed, every algorithm):
`content-tertiary`, `content-quaternary`, `content-error`, `content-warning`,
`content-success` (light **and** dark), `content-secondary·dark`,
`content-brand·dark`. Worst single case: `content-warning·light` at 1.91:1.

`content-primary` passes WCAG at 4.50–4.57 — right on the boundary, because
`lightnessForContrast` targets exactly 4.5 — but fails APCA in all 40 cases,
worst `Lc 31.9` in dark mode.

**Two caveats.** This audits `recHexFor` (the recommended tone a new system
gets), not hand-edited tones. And it audits the flat `ROLE_GROUPS` table, not
the Categorical projection — which resolves `content.primary → neutral.12` and
is the better of the two. That divergence is finding H3, and unifying it is P2.

The intent-class table in `scripts/color-report.ts` is marked as a **proposal**.
Whether `content-tertiary` is `body-text` or `decorative` decides whether 40/40
is a bug or a documented trade-off.

## Staged but not wired

Both change emitted hex values, and P0 is a no-op release:

1. `gamutMapSrgb` is not called from `buildScale`. Wiring it is a one-line
   change at three `chroma.oklch(...).hex()` call sites.
2. `apcaLc` is not called from `lightnessForContrast`. Steps 11–12 still solve
   to a WCAG target only.

Both land in P1. The snapshots exist so that when they do, the diff is
reviewable rather than alarming.

## Where everything lives

Everything is inside this git repository. Nothing sits in the parent folder.

```
scalable-designs/
├── .claude/skills/color-science-core/   the portable colour-maths skill
│   ├── SKILL.md                         routing table
│   ├── references/                      colour-spaces · gamut · wcag2 · apca · delta-e
│   └── scripts/contrast.mjs             dependency-free CLI validator
├── docs/color/
│   ├── RESEARCH-PLAN.md                 diagnostic audit · 9 workstreams · phases
│   └── P0-BASELINE.md                   this file
├── src/lib/color/                       apca.ts · gamut.ts  (zero runtime deps)
├── src/lib/__tests__/                   the suite + __snapshots__/
├── scripts/color-report.ts              npm run color:report
├── reports/                             GITIGNORED — generated output
└── vitest.config.ts
```

`.claude/skills/` is the Claude Code project convention: the skill is versioned
with the code it documents, and any session opened in this repo picks it up
automatically. Future skills (`color-architecture-specs`, `token-contrast-audit`)
and the implementer agent (`.claude/agents/`) belong in the same tree — neither
folder is created yet, because an empty directory or a stub referencing skills
that do not exist is exactly the dead weight this layout is meant to avoid.

**`CLAUDE.md` has not been updated.** It is a large curated file, and the new
`src/lib/color/` module, the test suite, `.claude/skills/`, and the `npm test` /
`npm run color:report` scripts should be added to its Folder Structure and
Conventions sections so future sessions do not re-derive or re-duplicate them.
