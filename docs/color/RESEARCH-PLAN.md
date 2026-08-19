# Escala Tokens — Color Architecture: Diagnostic Audit & Research Plan

**Repositories audited:** `sync-ds-platform/scalable-designs` (web platform), `sync-ds-platform/scalable-designs-figma-plugin` (Figma bridge)
**Date:** 2026-08-19
**Decisions locked in this session:** faithful reimplementation of vendor algorithms · WCAG 2.1 + APCA dual readout · skill suite + one implementer agent

---

## 0. Executive summary

The platform has a **well-engineered single ramp engine** (`src/lib/colorUtils.ts`, ~48 KB, unusually well commented) and a **well-structured semantic projection layer** (`src/lib/semanticArchitectures.ts`, ~61 KB). The architecture is sound. The problem is not structure — it is **fidelity and verification**:

1. The presets named *Radix UI*, *Tailwind CSS* and *Ant Design* are **the same engine with different tuning constants**. None of them is the vendor's algorithm. Radix in particular does not build ramps parametrically at all.
2. **Material Tonal is mathematically wrong**, not merely approximate: it maps M3 tone `t` to OKLCH `L = t/100`, but M3 tone is CIE `L*`. `L* 40 ≈ OKLCH L 0.48`, not `0.40`.
3. There is **no gamut mapping**. Every value is produced by `chroma.oklch(L,C,H).hex()`, which clips per channel and shifts hue.
4. There is **no APCA**, and no enforced contrast matrix across roles × architectures × themes.
5. There are **zero tests** across ~180 KB of color logic.

None of these are visible in the UI today, which is exactly why they are dangerous: the tool currently *reports* WCAG ratios of whatever it produced, rather than *guaranteeing* what it produces.

**The research plan below closes the gap in 9 workstreams. The knowledge output becomes 3 skills + 1 optional repo-glue skill; the execution output becomes 1 implementer agent + 1 CI auditor agent.**

---

## PART 1 — Diagnostic audit

Severity: **C** critical · **H** high · **M** medium · **L** low

### C1 — Vendor presets are cosmetic, not algorithmic

**Evidence:** `src/lib/colorUtils.ts:277–300` (`SPECS`). `radix`, `tailwind`, `ant`, `default`, `lightness`, `monochromatic` are identical `AlgoSpec` shapes differing only in `lightL`, `darkL`, `lightCmul`, `darkCmul`, `hueShift`. All ten pass through the same `buildScale()`.

**Ground truth for Radix** (verified from source, `radix-ui/website · components/generate-radix-colors.tsx`, 581 lines):

```
generateRadixColors({ appearance, accent, gray, background })
  1. Convert accent + gray to OKLCH.
  2. getScaleFromColor(): compute deltaEOK from the seed to EVERY color of
     ~30 curated reference scales (tomato…gray, light + dark variants).
     Take the two closest UNIQUE scales, A and B.
     Trigonometric decision: if the triangle source-A-B has no angle > 90°,
     mix A and B proportionally to their projected distances; otherwise use A.
  3. Transpose the chosen reference progression onto the target background
     using bezier easing — lightModeEasing [0,2,0,2], darkModeEasing [1,0,1,0]
     (transposeProgressionStart / transposeProgressionEnd).
  4. Step 9 = the seed verbatim, UNLESS deltaEOK(seed, step1) * 100 < 25
     (seed too close to the page) — then fall back to reference step 9.
  5. accentContrast (text on step 9) = white if |white.contrastAPCA(step9)| >= 40,
     else black.  ← the ONLY contrast call in the whole generator, and it is APCA.
  6. Step 10 (button hover): L' = L > 0.4 ? L - 0.03/(L+0.1) : L + 0.03/(L+0.1);
     C' = L > 0.4 ? C * 0.93 : C; then hue+chroma donated by the nearest in-scale color.
  7. Steps 11–12 chroma clamped to max(C8, C9) — text desaturation guard.
  8. Alpha scales SOLVED per channel so the composite over `background` is exact,
     computed separately for sRGB and P3 (getAlphaColorSrgb / getAlphaColorP3).
  9. Output per scale: solid sRGB hex, solid P3 oklch(), alpha sRGB, alpha P3,
     plus accentSurface (step 2 at 80% light / 50% dark) and graySurface.
```

Your engine and Radix's share **nothing** except the 12-step taxonomy. Yours is generative-parametric; Radix's is **reference-transposition + nearest-neighbour**. This is the single largest fidelity gap.

**Ground truth for Ant Design** (`@ant-design/colors · src/generate.ts`): HSV, not OKLCH. `hueStep = 2°`, `saturationStep = 0.16` (light), `saturationStep2 = 0.05` (dark), `brightnessStep1 = 0.05` (light), `brightnessStep2 = 0.15` (dark), 5 light stops + 4 dark stops around the primary = 10. Hue direction **reverses for hues in 60°–240°**. Saturation clamped to `[0.06, 1.0]`. Dark theme is a table of 10 fixed mix ratios against a background color, not a recomputation.

**Ground truth for Tailwind v4:** the palette is **hand-tuned OKLCH**, not generated. There is no algorithm to port. The honest implementation is Radix-style: ship the 22 Tailwind families as reference scales and transpose the seed onto the nearest one.

**Impact:** a user who picks "Radix UI" expecting Radix-compatible output gets something that will not match `@radix-ui/colors` in any step except 9. For a tool whose value proposition is *precision*, this is a correctness and credibility issue.

---

### C2 — Material Tonal uses the wrong lightness function

**Evidence:** `src/lib/semanticArchitectures.ts:625–642` (`tonalPalette`).

```ts
const L = t / 100                                  // ← t is M3 tone = CIE L*
const cc = Math.max(0, base * Math.sin(Math.PI * (t / 100)))   // ← fabricated taper
out[t] = chroma.oklch(L, cc, h).hex()
```

Two independent errors:

- **Lightness:** M3 tone is CIE `L*` (via HCT, which is CAM16 hue + CAM16 chroma + `L*` tone). OKLab `L` is a different function. `L* = 40` corresponds to OKLCH `L ≈ 0.48`; `L* = 90` to `L ≈ 0.92`. Every tone in the palette is displaced, and the displacement is non-linear, so the M3 contrast guarantees (tone 40 on tone 100, tone 80 on tone 20, ±40–50 tone delta ⇒ ≥ 4.5:1) **do not hold**.
- **Chroma:** HCT does not taper chroma with a sine. HCT holds hue constant and takes the **maximum chroma available in sRGB at that hue and tone**, which is a jagged, hue-dependent envelope. The comment claiming this is "the same behavior HCT tonal palettes exhibit" is incorrect.

**Impact:** every `on-*` role in the Tonal architecture (`on-primary`, `on-surface`, `on-primary-container`…) is unverified. Some will fail AA.

---

### H3 — Dual source of truth for role → tone mapping

**Evidence:** `src/lib/semanticRoles.ts:75+` (`ROLE_GROUPS`) declares `content-primary → gray tone 11`. The Categorical architecture screenshot resolves `content.primary · light → {neutral.12}`. The Categorical projection lives in a *different* table (`projectCategorical`, `semanticArchitectures.ts:383`).

Two tables encoding the same concept will drift. They already disagree.

**Fix:** one canonical `RoleTable` type; every architecture is a *projection function over that table*, never a second copy of it.

---

### H4 — Role tones contradict the ramp's own documented taxonomy

`colorUtils.ts:96–107` declares the contract: `9 = Solid`, `10 = Solid hover`, `11 = low-contrast text (≈4.5:1)`, `12 = high-contrast text`. `BASE_TONE = 9`.

`semanticRoles.ts` then assigns:

| Role | Assigned | Taxonomy says | Problem |
|---|---|---|---|
| `background-brand-solid` | `brand.8` | 9 = Solid | Off by one; 8 is "Border hover" |
| `background-brand-solid-hover` | `brand.9` | 10 = Solid hover | Off by one |
| `background-*-solid` (error/warning/success) | `.8` | 9 | Off by one |
| `content-brand` | `brand.8` | 11 = text | **Border step used as text** — will fail AA |
| `content-error` / `warning` / `success` | `.8` | 11 | Same |
| `content-secondary` | `gray.9` | 11 | **Solid step used as text** — ~3:1 at best |
| `content-tertiary` | `gray.8` | 11 | Below 3:1 |
| `content-quaternary` | `gray.7` | 11 | Decorative-grade contrast on body text |
| `content-primary` | `gray.11` | 11 | ✅ correct |

This is a **systematic off-by-one plus a text/fill role confusion**. `content-secondary` through `content-quaternary` are the roles most likely to be shipping inaccessible text today. Note that the Categorical architecture resolving to `{neutral.12}` suggests the *other* table already corrects part of this — which is precisely why H3 must be fixed first.

---

### H5 — No APCA anywhere in the codebase

**Evidence:** 18 contrast call sites across 4 files, all `chroma.contrast` (WCAG 2.x) or `checkContrast`, which wraps it. `colorUtils.ts:653–664`.

Consequences:
- You cannot reproduce Radix's `accentContrast` decision without `contrastAPCA` (threshold `|Lc| ≥ 40`).
- WCAG 2.x is a luminance ratio with a known dark-mode failure mode: it systematically overrates light-on-dark pairs. Your dark ramps are tuned against a metric that does not describe what users see.
- `lightnessForContrast()` (`colorUtils.ts:126–160`) binary-searches to a WCAG target. Under APCA the same search would land on different lightness values.

---

### H6 — No gamut mapping; sRGB clipping shifts hue

**Evidence:** every ramp value is emitted via `chroma.oklch(L, C, H).hex()`. `chroma-js` clips each RGB channel to `[0,255]` independently. For any `(L,C,H)` outside sRGB — routine for vivid brands at steps 8–10 — clipping moves the color **off the requested hue** and changes its lightness.

The CSS Color 4 gamut-mapping algorithm is: hold `L` and `H`, binary-search `C` downward, accept when the clipped result is within `deltaEOK ≤ 0.02` of the reduced color. This preserves hue and perceived lightness; clipping does not.

**Testable symptom:** generate a ramp from `#ff0055` or `#00ff88` and check hue monotonicity across steps 7–10. Expect visible hue drift.

---

### M7 — No wide-gamut output, and alpha scales likely inexact

Radix ships four representations per scale (solid sRGB, solid P3, alpha sRGB, alpha P3) because **alpha blending differs between sRGB and P3**. Escala emits sRGB hex only. `generateAlphaScale` (`colorUtils.ts:614`) should be audited against Radix's `getAlphaColorSrgb`, which *solves* for the alpha value that composites exactly onto the given background rather than approximating it.

This matters directly for the Contextual Vibrancy architecture, whose entire premise is alpha labels over materials.

---

### M8 — `contrastAgainst` is metadata, not enforcement

`Role.contrastAgainst` is populated for the 11 `content-*` roles and `null` for all 20 `background-*` and 8 `border-*` roles. Nothing consumes it as an assertion. There is no matrix that says: *for every architecture × every theme × every legitimate foreground/background pair, contrast ≥ threshold for that pair's intent class.*

---

### M9 — Zero tests

No `vitest`, `jest`, `*.test.ts` or `*.spec.ts` anywhere in `scalable-designs`. ~180 KB of color mathematics with no regression net. **This blocks every other fix**: you cannot port Radix without a way to prove you did not break the existing ramps.

---

### L10 — IBM Carbon is a stated reference but not an implemented architecture

`ARCHITECTURE_OPTIONS` ships `astryx`, `shadcn`, `categorical`, `vibrancy`, `tonal`. No Carbon. Either add it (`@carbon/colors` 10-step scale + `@carbon/themes` layer model: `background`, `layer-01/02/03`, `field-01/02/03`, paired `border-strong-0N`) or drop it from the positioning.

---

### Also worth noting (not defects)

- `buildScale`'s gamma reshaping of `BG_WEIGHTS` (`colorUtils.ts:193–199`) is a genuinely good design: `w' = w^γ` preserves both endpoints by construction and is monotonic. Keep it.
- The comment discipline in `colorUtils.ts` and `semanticRoles.ts` is excellent and should become the model for the skill's reference docs — it already reads like a spec.
- `recDarkTone`'s identity-by-default with an explicit `inverts` list is the right model. Preserve it through any refactor.

---

## PART 2 — Research plan

Nine workstreams. Each produces the **same three artifacts**, which is what makes them mechanically consumable by a skill and an agent:

| Artifact | Format | Purpose |
|---|---|---|
| `SPEC.md` | Prose + pseudocode + constants table | Human + agent reference |
| `invariants.ts` | Executable assertions | What must always hold |
| `fixtures.json` | `seed → expected output` pairs, captured from the vendor's own tool | Regression proof |

### WS-0 — Instrumentation baseline *(prerequisite, blocks everything)*

- Add `vitest`. No behavior change.
- Snapshot every currently-shipping ramp for a fixed seed set (10 brand hues × 4 algorithms × 2 appearances) into golden files.
- Add a `pnpm color:report` script that dumps every architecture × theme × role as a table with WCAG + APCA columns.
- **Exit criterion:** you can refactor `colorUtils.ts` and see exactly what changed.

### WS-1 — Color science core

Ground truth to codify:
- Spaces: sRGB ↔ linear-RGB ↔ CIEXYZ ↔ CIELAB(`L*`) ↔ OKLab/OKLCH ↔ CAM16/HCT. Explicit note that OKLab `L` ≠ `L*/100`.
- **Gamut mapping:** CSS Color 4 algorithm (hold `L`,`H`; binary-search `C`; `deltaEOK ≤ 0.02`). Replaces naive clipping.
- **WCAG 2.1:** `(L₁+0.05)/(L₂+0.05)`, relative luminance formula, thresholds 3:1 / 4.5:1 / 7:1 and their applicability (normal text, large text ≥ 18.66px bold or 24px, non-text UI components per 1.4.11).
- **APCA:** the `Lc` polynomial (soft-clamp, black-point, exponents for normal/reverse polarity), the Bronze-level lookup table (font size × weight → minimum `Lc`), and the rule that APCA is directional (`text on bg` ≠ `bg on text`).
- **ΔE:** `deltaEOK` (used by Radix for nearest-scale), CIEDE2000 (reference only).
- Deliverable: a runnable validator — `contrast(fg, bg) → { wcag, apcaLc, passes: {...} }`.

**Primary sources:** CSS Color 4 spec · WCAG 2.1 §1.4.3/1.4.6/1.4.11 · apcacontrast.com + the APCA-W3 reference implementation · Björn Ottosson's OKLab post · `color-js/color.js`.

### WS-2 — Radix *(ground truth already captured this session)*

Port `generateRadixColors` faithfully. Decisions needed:
- Ship the ~30 reference scales (light + dark + gray variants) as data — ~720 colors. Acceptable bundle cost.
- `colorjs.io` vs. extending `chroma-js`: Radix depends on `Color.deltaEOK`, `contrastAPCA` and bezier easing. Recommend adding `colorjs.io` for the Radix path specifically rather than reimplementing.
- Escala already lets the user set the page background — good, `generateRadixColors` requires it.
- **Fixtures:** capture 20 seeds from `radix-ui.com/colors/custom` and assert byte-identical hex.

### WS-3 — Material 3 / HCT

- Port from `material-foundation/material-color-utilities` (TS reference): `Cam16`, `Hct`, `TonalPalette`, `DynamicColor`, `ContrastCurve`, `ToneDeltaPair`, the six built-in scheme variants (Tonal Spot, Vibrant, Expressive, Fidelity, Content, Neutral).
- Replace `tonalPalette()` entirely. The current sine taper and `L = t/100` both go.
- Verify the M3 contrast guarantees hold on the ported implementation before mapping any role.
- Keep the existing `TONAL_SCHEME` role table — the 30 role→tone assignments in `semanticArchitectures.ts:657–689` **are correct M3**; only the palette generator underneath is wrong.

### WS-4 — Ant Design

- Port `@ant-design/colors · generate.ts` verbatim (constants listed in C1 above). It is ~80 lines. Low effort, exact fidelity.
- Note the 10-stop output does not map onto a 12-step Radix taxonomy. Decide: expose Ant as a *primitive ramp shape only*, or define an explicit 10→12 interpolation and document it as Escala's own extension.

### WS-5 — Tailwind v4

- Confirm there is no algorithm. Capture the 22 families × 11 stops as reference data.
- Implement as Radix-style transposition onto the nearest Tailwind family (reuse WS-2's `getScaleFromColor`).
- This is the honest and the highest-fidelity option simultaneously.

### WS-6 — IBM Carbon

- `@carbon/colors`: 10-step scales (`10`…`100`) per family.
- `@carbon/themes`: the four themes (White, Gray 10, Gray 90, Gray 100) and the **layer model** — `background`, `layer-01/02/03`, `field-01/02/03`, `border-subtle-0N`, `border-strong-0N`. The layer index is a *contextual* token set, which is architecturally different from every other system you support and is the interesting thing to model.
- Verify (do not assume) any "N steps apart passes AA" heuristic — IBM's docs do not state it in the color usage page; derive it empirically from the actual scale values.

### WS-7 — Semantic layer unification *(depends on WS-1)*

- Collapse `ROLE_GROUPS` and the per-architecture projection tables into **one canonical role table + N projection functions**. Fixes H3.
- Re-derive every tone assignment from the taxonomy, fixing H4. Every assignment must carry a **stated intent class**: `body-text` / `large-text` / `ui-component` / `decorative` / `surface`.
- Build the **contrast matrix**: for every architecture × theme × (foreground role, background role) legal pair, assert against the intent class threshold in both WCAG and APCA. Ship it as a test, and surface it in the UI as the badge you already render.

### WS-8 — Escala's own architectures

Categorical, Astryx, shadcn/ui and Contextual Vibrancy are yours (or third-party mappings) rather than generative algorithms. They still need written invariants — otherwise the agent has nothing to check against. For each: role list, step mapping, what must hold in dark mode, what may be overridden by the user.

Vibrancy specifically needs WS-1's alpha compositing math (M7) since its premise is alpha over materials.

---

## PART 3 — Skill vs. agent split

### The boundary rule

> **Skill** = knowledge and procedure that is true *regardless of your repository*. Stable, versioned, no side effects.
> **Agent** = execution that must *read or write repository state*. Stateful, produces diffs.
> **Neither** = product judgement (which architectures to ship, what the default should be). That stays with you.

Applying it: the Radix algorithm is a skill. *Porting the Radix algorithm into `colorUtils.ts` without breaking the other nine presets* is an agent.

### Skill 1 — `color-science-core`

The one you stop re-explaining. Loaded by everything else.

```
color-science-core/
├── SKILL.md                    # ~150 lines: when to use, the decision tree,
│                               #   pointers into references/
├── references/
│   ├── color-spaces.md         # sRGB · CIELAB · OKLab/OKLCH · CAM16/HCT
│   │                           #   + the L* vs OKLab-L trap (C2)
│   ├── gamut-mapping.md        # CSS Color 4 algorithm, why clipping is wrong (H6)
│   ├── wcag2.md                # formula, thresholds, applicability, known limits
│   ├── apca.md                 # Lc polynomial, Bronze lookup table, directionality
│   └── delta-e.md              # deltaEOK, CIEDE2000
└── scripts/
    ├── contrast.ts             # contrast(fg,bg) → { wcag, apcaLc, passes }
    └── gamut-map.ts            # cssGamutMap(oklch) → sRGB-safe OKLCH
```

**Trigger description:** *"Color mathematics reference — contrast (WCAG 2.1 and APCA), color space conversion, gamut mapping, perceptual distance. Use when computing, validating or debugging any color value, contrast ratio or accessibility threshold."*

### Skill 2 — `color-architecture-specs`

The router skill. `SKILL.md` is a **table**, not prose — this is what keeps it cheap to load.

```
color-architecture-specs/
├── SKILL.md                    # routing table: architecture → file → one-line summary
├── references/
│   ├── radix.md                # generate-radix-colors.tsx, fully specified
│   ├── material-hct.md         # HCT, TonalPalette, DynamicColor, ContrastCurve
│   ├── ant-design.md           # HSV generate(), all constants
│   ├── tailwind.md             # hand-tuned; transposition strategy
│   ├── carbon.md               # 10-step + layer model
│   ├── categorical.md          # Escala's own
│   ├── astryx.md
│   ├── shadcn-ui.md
│   └── vibrancy.md
└── fixtures/
    └── <arch>.json             # seed → expected output, from the vendor's own tool
```

Each reference follows a fixed template — this uniformity is what lets the agent consume them mechanically:

```markdown
## Provenance          — source repo, file, commit, licence
## Color space         — and why
## Step taxonomy       — N steps, what each one is FOR
## Generation algorithm— pseudocode + constants table
## Contrast model      — which metric, which targets, at which steps
## Role mapping        — semantic role → step, with intent class
## Invariants          — what must ALWAYS hold (assertable)
## Divergences         — where Escala deliberately differs, and why
## Fixtures            — pointer to fixtures/<arch>.json
```

**Trigger description:** *"Reference specifications for design-system color architectures — Radix, Material 3 (HCT), Ant Design, Tailwind, IBM Carbon, shadcn/ui, Astryx, Categorical, Contextual Vibrancy. Use when implementing, auditing or comparing a color ramp or semantic token architecture."*

### Skill 3 — `token-contrast-audit`

The **procedure**, not the knowledge. Given a token set, produce a verdict.

```
token-contrast-audit/
├── SKILL.md                    # the audit procedure, step by step
├── references/
│   ├── intent-classes.md       # body-text / large-text / ui-component /
│   │                           #   decorative / surface → thresholds
│   └── report-format.md        # the output contract
└── scripts/
    ├── build-matrix.ts         # tokens.json → legal (fg,bg) pair list
    └── audit.ts                # matrix → report (WCAG + APCA, per intent class)
```

**Trigger description:** *"Audit a generated design-token set for contrast and accessibility compliance across themes. Use when validating tokens.json, reviewing a semantic architecture, or before a design-system release."*

### Skill 4 — `escala-token-schema` *(optional, repo-specific)*

Your DTCG export format, `TOKEN_SCHEMA_VERSION = 5`, the `{scale.tone}` reference syntax, Figma Variables collection/mode mapping, naming conventions, the plugin's payload contract. Strictly speaking this is repo glue rather than portable knowledge — but it is the thing an agent needs most often and re-derives most expensively. **Recommendation: build it, but only after WS-7 stabilises the schema.**

---

### Agent 1 — `escala-color-implementer`

```yaml
name: escala-color-implementer
description: >
  Implements or refactors a color-generation architecture inside the Escala
  platform. Ports vendor algorithms faithfully, writes fixtures and tests,
  and produces a reviewable diff. Never changes more than one architecture
  per invocation.
model: opus
isolation: worktree
tools: Read, Edit, Write, Bash, Grep, Glob
```

**Operating contract (put this in the agent's system prompt):**

1. Read `color-architecture-specs/references/<arch>.md` and `color-science-core` **before touching code**.
2. Work on **exactly one** architecture per invocation.
3. Land behind a feature flag; the existing preset stays reachable until fixtures pass.
4. Every change ships with: fixture file, `invariants.ts` assertions, and a passing `vitest` run.
5. Golden-file diff against WS-0 baselines must be **explained line by line** — an unexplained ramp change is a regression.
6. Output: a diff summary + the contrast-matrix delta (how many pairs improved / regressed).

**Do not give this agent the ability to decide *which* architecture to build, or to change the semantic role table.** Role assignments are product decisions (see H4) — surface them, do not auto-fix them.

### Agent 2 — `escala-color-auditor` *(read-only, CI-suitable)*

```yaml
name: escala-color-auditor
description: >
  Read-only. Runs the full contrast matrix over the current build across every
  architecture × theme × role pair and reports regressions against the last
  accepted baseline.
model: sonnet
tools: Read, Bash, Grep, Glob
```

Wire it to a GitHub Action on PRs touching `src/lib/color*` or `src/lib/semantic*`. This is where DesignOps value compounds: a token PR that degrades contrast fails CI rather than shipping.

### What stays with you

- Which architectures Escala ships and which it drops.
- Whether Ant's 10 stops get interpolated to 12 or exposed as-is.
- The intent class of each semantic role (`content-tertiary` — is it body text or decorative? That answer determines whether H4 is a bug or a documented trade-off).
- Whether "Radix UI" is renamed once it becomes faithful, and how existing users' saved systems migrate.

---

## PART 4 — Execution sequence

| Phase | Workstreams | Output | Gate |
|---|---|---|---|
| **P0** | WS-0 | vitest + golden files + `color:report` | Refactors become verifiable |
| **P1** | WS-1 → Skill 1 | `color-science-core` skill + validator | APCA and gamut mapping available everywhere |
| **P2** | WS-7 | Unified role table + contrast matrix | H3, H4, M8 closed. **Highest user-visible impact.** |
| **P3** | WS-2 → `radix.md`; WS-3 → `material-hct.md` | Skill 2 (2 of 9 refs) + agent ports both | C1 (partial), C2 closed |
| **P4** | WS-4, WS-5, WS-6, WS-8 | Skill 2 complete (9 refs) | C1 closed; Carbon added |
| **P5** | WS-1 + WS-7 → Skill 3; Agent 2 in CI | `token-contrast-audit` + GitHub Action | Regressions blocked at PR |
| **P6** | Skill 4 | `escala-token-schema` | Agent handoff cost drops |

**Recommended start: P0 and P2.** P2 (the semantic layer) affects every token every user exports today, and it does not depend on any vendor port. The Radix and Material ports are more interesting but affect only users who select those presets.

---

## Appendix — Files to instrument first

| File | Size | Why |
|---|---|---|
| `src/lib/colorUtils.ts` | 48 KB | Ramp engine, all contrast math, `SPECS` |
| `src/lib/semanticArchitectures.ts` | 61 KB | 5 projections, tonal palette, alpha compositing |
| `src/lib/semanticRoles.ts` | 19 KB | Canonical role table (to become *the* table) |
| `src/lib/tokenGenerator.ts` | 13 KB | DTCG export, `TOKEN_SCHEMA_VERSION = 5` |
| `src/lib/colorActions.ts` | 25 KB | Store mutations that regenerate scales |
| `src/store/useDesignStore.ts` | 102 KB | State shape; where regeneration is triggered |

---

## Sources

- [Radix Colors — custom palettes](https://www.radix-ui.com/colors/docs/overview/custom-palettes)
- [Radix Colors — understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Radix Colors — composing a palette](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
- `radix-ui/website · components/generate-radix-colors.tsx` (read directly, 581 lines)
- [ant-design/ant-design-colors](https://github.com/ant-design/ant-design-colors) · `src/generate.ts` (read directly)
- [Ant Design — Colors](https://ant.design/docs/spec/colors/)
- [APCA Contrast Calculator](https://apcacontrast.com/)
- [Carbon Design System — color usage](https://carbondesignsystem.com/elements/color/usage/)
- [Material 3 — how the color system works](https://m3.material.io/styles/color/system/how-the-system-works) *(JS-gated; port from `material-foundation/material-color-utilities` instead)*
