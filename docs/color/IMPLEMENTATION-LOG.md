# Colour implementation log

The running record of [`RESEARCH-PLAN.md`](./RESEARCH-PLAN.md). One section per
phase, newest last. Do not start a second file for P2 — append here.

| Phase | Status | Token output changed? |
|---|---|---|
| **P0** — instrumentation baseline | ✅ landed 2026-08-19 | No |
| **P1** — gamut mapping wired | ✅ landed 2026-08-19 | Yes, 6.3 % of values |
| **P2 diagnostic** — both role tables audited | ✅ landed 2026-08-19 | No |
| **P1** — APCA-targeted text steps (H5) | ✅ landed 2026-08-19 | Yes, tones 11–12 only |
| **P2a** — focus ring + border intent | ✅ landed 2026-08-19 | Yes, one value |
| **P2b** — flat catalogue remapped, `intent` required | ✅ landed 2026-08-19 | Yes |
| **P2c** — four open decisions resolved | ✅ landed 2026-08-19 | Yes |
| **P3a** — Ant Design faithful port | ✅ landed 2026-08-19 | New API, existing preset untouched |
| **P3b** — Material HCT (defect C2) | ✅ landed 2026-08-19 | Yes — Tonal palettes |
| **P3c** — Radix faithful port | ✅ landed 2026-08-19 | New API, existing preset untouched |
| **P4a** — Tailwind | ✅ landed 2026-08-19 | New API, existing preset untouched |
| **P4b** — IBM Carbon + layer model | ✅ landed 2026-08-19 | New API + new architecture concept |
| **P5** — Carbon as a semantic architecture | ✅ landed 2026-08-19 | New architecture in the picker |

```bash
npm install          # vitest, tsx, apca-w3, colorparsley — all devDependencies
npm test             # 248 assertions + 3 documented defects
npm run color:report # writes reports/color-audit.json
```

---

# P0 — Colour instrumentation baseline

**Landed:** 2026-08-19 · **Behaviour change to shipped tokens: none.**

Adds the measurement layer every later phase depends on.

## Files added

| Path | What it is |
|---|---|
| `src/lib/color/apca.ts` | APCA-W3 0.1.9 (`Lc`), WCAG 2.x, intent-class thresholds. **Zero runtime dependencies.** |
| `src/lib/color/gamut.ts` | OKLab ↔ sRGB and CSS Color 4 gamut mapping. **Zero runtime dependencies.** Wired into the emit path in P1, below. |
| `src/lib/__tests__/apca.test.ts` | Frozen reference vectors + a 2 000-pair conformance fuzz against `apca-w3`, asserting divergence `< 1e-9`. |
| `src/lib/__tests__/gamut.test.ts` | Round-trip, chroma-js agreement, and a demonstration that mapping beats clipping on hue *and* lightness. |
| `src/lib/__tests__/ramps.golden.test.ts` | 124 snapshots pinning every shipping generator: 5 seeds × 10 algorithms × light/dark, plus both sliders. |
| `src/lib/__tests__/ramps.invariants.test.ts` | Structural and perceptual properties, plus three known defects as `it.fails`. |
| `src/lib/__tests__/no-duplication.test.ts` | Drift guards — see the register below. |
| `scripts/color-report.ts` | The audit: 10 seeds × 4 algorithms × 2 themes → 800 role pairs, WCAG **and** APCA. |
| `vitest.config.ts` | `environment: 'node'` — the colour layer must stay DOM-free. |

## File modified

`src/lib/colorUtils.ts` — deduplication only in P0, **no value changes**. (P1 then changed its emit path; see below.)

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

An `it.fails` assertion **passes while the defect exists** and **starts failing
the moment it is fixed** — at which point you delete the `.fails` and it becomes
a permanent guarantee. P0 shipped four; three remain.

- `DEFECT C1` — the ten "algorithms" share one lightness curve. Radix and Ant
  agree on the `L` of steps 2–8 to within 0.02, which independent algorithms
  could not do. *(Closes in P3/P4.)*
- `DEFECT H5` — step 11 is solved to WCAG 4.5:1, far below APCA body-text grade
  on a dark page. *(Closes when `lightnessForContrast` takes an APCA target.)*
- `compositeOver` collision (above). *(Waiting on a naming decision.)*
- ~~`DEFECT H6`~~ — **closed in P1.** Promoted to the `gamut guarantees` block.

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

## Staged but not wired (as of P0)

1. `gamutMapSrgb` not called from the emit path. → **wired in P1, below.**
2. `apcaLc` not called from `lightnessForContrast`. Steps 11–12 still solve to a
   WCAG target only. → still open; this is what `DEFECT H5` tracks.

---

# P1 — Gamut mapping wired into the emit path

**Landed:** 2026-08-19 · **Token output changed: yes — 6.3 % of values.**

## What changed

Every site that turns an OKLCH triple into a hex now goes through
`color/gamut.oklchToHex` (CSS Color 4 chroma-reduction) instead of
`chroma.oklch(...).hex()` (per-channel clipping). Ten sites: nine in
`colorUtils.ts`, one in `semanticArchitectures.ts`.

The bisection inside `lightnessForContrast` still runs on continuous,
un-quantised `chroma.Color` values — only the values that become tokens are
mapped. Those two call sites remain annotated `CONTINUOUS-PRECISION` and are
enforced by the duplication guard.

## The diff, measured

Across the 124-snapshot matrix (5 seeds × 10 algorithms × light/dark, 1 451
individual colour values):

| | |
|---|---|
| values changed | **92 / 1 451 (6.3 %)** |
| ΔE_OK median | 0.0024 — imperceptible |
| ΔE_OK p90 | 0.0118 |
| ΔE_OK max | 0.0519 |
| above 1 JND (0.02) | **7 values** |

Every large change is where the analysis predicted: **tone 10** (solid hover) of
the `saturation` preset (`darkCmul` 1.45) and `complementary`, for vivid seeds.

| where | before | after | ΔE_OK |
|---|---|---|---|
| amber · saturation · light · tone 10 | `#e45100` | `#ce6500` | 0.0519 |
| vivid-magenta · saturation · light · tone 10 | `#ff0028` | `#ee0048` | 0.0472 |
| vivid-magenta · saturation · dark · tone 10 | `#ff0044` | `#ff3c66` | 0.0459 |
| blue · saturation · dark · tone 10 | `#005bff` | `#246cff` | 0.0429 |

The amber case reads clearly as a correction: the old value had its red channel
clipped at maximum, dragging an amber toward red-orange. The new value holds the
amber hue and gives up chroma instead — which is what the step is for.

## New guarantees

`DEFECT H6` was deleted and replaced by a `gamut guarantees` block:

- **Every emitted step is inside sRGB.**
- **Hue drift stays within the tolerance the algorithm actually guarantees.**
  CSS Color 4 promises one JND (ΔE_OK 0.02), not exact hue — at chroma `C` that
  is `0.02 / C` radians. A flat "< 3°" would be *tighter than the spec* and fails
  on legitimate output (measured worst: 5.91° at C 0.159, against a 7.21°
  allowance). The test asserts the chroma-dependent bound instead.
  Steps below C 0.02 are skipped: `atan2` on a near-neutral colour swings by tens
  of degrees for a 1e-5 change, so hue there is noise.
- **The `saturation` worst case no longer clips** — the ~10° drift is gone.

## What this did NOT fix

The contrast audit is **byte-identical** before and after: still 498 WCAG
failures out of 800 role pairs. That is the expected and useful result — gamut
mapping is a *fidelity* fix, not an *accessibility* one. The 62.3 % failure rate
is a role→tone mapping problem, and it is what P2 addresses.

---

# P2 diagnostic — both role tables audited

**Landed:** 2026-08-19 · **Token output changed: no.** `scripts/color-report.ts`
now audits the curated architectures alongside the flat catalogue.

## The headline

| table | pairs | WCAG fail | APCA fail |
|---|---|---|---|
| flat `ROLE_GROUPS` | 800 | **498 (62.3 %)** | 708 (88.5 %) |
| curated (Categorical + Astryx) | 560 | **135 (24.1 %)** | 333 (59.5 %) |

**This settles finding H3.** The two tables disagree, and the curated ones are
2.6× better. Categorical and Astryx both put primary text at `{neutral.12}` and
secondary at `{neutral.11}` — Radix-correct. The flat catalogue puts them at
`gray.11` and `gray.9`, where 9 is the *Solid* step, not a text step.

**The curated tables win.** P2 unifies toward them, not the other way round.

## But the sequencing changes

The curated failures cluster into three causes, and **only one of them is a
role-table problem**:

### Cause 1 — the step-11 contrast target (this is DEFECT H5)

Every one of these resolves to `.11` and fails APCA 10/10 while passing WCAG at
*exactly* 4.50:

`content.secondary` · `content.accent` · `astryx text.secondary` ·
`astryx text.accent` · `astryx icon.primary` — light and dark.

Worst dark-mode reading: `Lc 31.9`, against a body-text floor of 75.

The cause is one line in `lightnessForContrast`: step 11 is solved to WCAG 4.5
and lands there to two decimals. **Nothing is wrong with the role table** — the
roles correctly point at "the low-contrast text step". The step itself is
defined by the wrong metric.

Fixing the primitive fixes roughly **twelve semantic roles at once**, in both
architectures, without editing a single role mapping.

### Cause 2 — `border.default` is on the wrong step

`{neutral.5}` in both Categorical and Astryx. Fails **10/10 in both themes and
both architectures**: WCAG 1.56 light, 1.33 dark, against the 3:1 that WCAG
1.4.11 requires of a control boundary.

Tone 5 is *Component active* in the Radix taxonomy. Borders are 6–8. This is a
one-value fix per table, and the most clear-cut defect in the whole audit.

### Cause 3 — the ink solvers stop at WCAG

`{on:accent.solid}`, `{on:error.9}`, `{ink:error.3}` and friends solve for
WCAG 4.5 and stop. `astryx status.on-error` fails **10/10 at 3.55**;
`categorical status.critical-fg` at 3.03. Several others pass WCAG and fail
APCA. Same shape as cause 1: the solver's target metric, not the mapping.

## Revised order

The original plan put table unification (P2) before the primitive fixes (P3+).
The audit says the opposite is cheaper:

1. **H5 — retarget step 11 to APCA** — primitive-level; clears cause 1 (~12 roles).
2. **`border.default` 5 → 7** — one value per curated table; clears cause 2.
3. **Ink solvers take an APCA target** — clears cause 3.
4. **Then** unify the flat catalogue toward the curated tables, with the
   remaining failures already gone rather than being carried across.

Doing it the other way round would migrate the flat catalogue onto steps that
are themselves still mis-targeted, then fix the steps, then re-verify all 29
roles a second time.

---

# P1 — Steps 11 and 12 take an APCA target (defect H5)

**Landed:** 2026-08-19 · **Token output changed: yes — tones 11 and 12 only.**

## What changed

`lightnessForContrast` now takes a `TextContrastTarget` with **two** floors and
must clear both:

| step | WCAG | APCA |
|---|---|---|
| 11 | 4.5 (AA) | **Lc 75** (body text) |
| 12 | 12 (near-max) | **Lc 90** (preferred body text) |

The `contrastShift` slider scales both, but the APCA side is **floored** — no
slider position can take step 11 below `Lc 60` (large-text grade) or step 12
below `Lc 75`. A WCAG-only slider had no way to express that, because "3.5:1"
sounds survivable and `Lc 20` is not.

The search also now evaluates the **emitted 8-bit hex** rather than a continuous
`chroma.Color`. That deleted the separate quantisation guard loop: measuring
what ships removes the class of bug where a float clearing 4.50 rounds to a hex
at 4.49. Quantisation makes the predicate a step function, which bisection
handles fine.

## The diff, measured

221 of 1 451 values changed (15.2 %) — and **only tones 11 and 12**. Tones 1–10
are byte-identical, which is the blast radius the change should have.

| | before | after |
|---|---|---|
| tone 11 · light — mean Lc | 67.7 | **75.1** |
| tone 11 · light — below Lc 75 | **60 / 60** | **0 / 60** |
| tone 11 · **dark** — mean Lc | **32.9** | **75.2** |
| tone 11 · dark — below Lc 75 | **50 / 50** | **0 / 50** |
| tone 11 · dark — mean WCAG | 4.59 | 11.89 |
| tone 12 · dark — mean Lc | 76.7 | **90.2** |

Nothing regressed on WCAG anywhere; the compliance floor was the binding
constraint in light mode and APCA was binding in dark.

**The dark-mode number is the whole argument for the dual metric.** Step 11 was
sitting at WCAG 4.59 — comfortably "AA" — while delivering `Lc 32.9`, under half
of body-text grade. WCAG could not see it.

`DEFECT H5` is gone, replaced by three permanent assertions including one that
checks neither metric is being traded away for the other.

---

# P2a — Focus ring and border intent

**Landed:** 2026-08-19 · **Token output changed: yes — one value.**

## Focus ring: `border.active` dark, `{accent.8}` → `{accent.11}`

Measured across six seeds, accent tone vs the dark page:

| tone | WCAG | APCA | verdict |
|---|---|---|---|
| `.8` (was) | 1.97–4.00 | 9.5–28.5 | fails both |
| `.9` | 2.52–6.01 | 15.3–42.9 | fails both |
| `.10` | 3.04–7.21 | 20.2–50.1 | **WCAG only — the trap** |
| `.11` (now) | 11.83–11.90 | 75.0–75.3 | clears both |

`.10` is worth dwelling on: it satisfies the letter of WCAG 1.4.11 while
remaining hard to see. That is precisely what the dual-metric rule exists to
catch. Light mode already used `{accent.9}`, which clears both, and is unchanged.

## Border intent: reclassified to `decorative`, and a missing role

`border.default` was being audited as `ui-component` (WCAG 1.4.11, 3:1). It
failed 10/10 in both themes. But so would every alternative — **no tone in the
Radix border band reaches 3:1 against the page in either appearance**:

| tone | light WCAG | dark WCAG |
|---|---|---|
| 5 (current) | 1.56–1.63 | 1.33–1.34 |
| 6 | 1.90–2.02 | 1.57–1.58 |
| 7 | 2.32–2.56 | 1.88–1.91 |
| 8 | 2.98–3.36 | 2.34–2.39 |
| 9 | 4.21–4.97 | 3.17–3.21 |

That is structural, not a mis-pointed token: Radix steps 6–8 are **subtle
separators, not control boundaries**. Auditing `border.default` against 1.4.11
reports a failure against a job it was never given, so it is now classified
`decorative` — which makes the number truthful.

> ### ⚠️ Decision needed: the architecture has no 1.4.11-compliant border role
>
> Card edges and dividers are decorative and correctly subtle. But the visible
> boundary of a **text input, checkbox or select** is often the only indicator
> that a control is there, and 1.4.11 does apply to it. Today no token serves
> that purpose. The options are to add a `border.field` / `border.control` role
> (tone 9+ light, and higher again in dark), or to state explicitly that
> controls in this system are identified by fill rather than by stroke.
>
> This is a schema change, so it is left as a decision rather than applied.

## Result

| | before P1 | after P1 + P2a |
|---|---|---|
| curated — WCAG failures | 135 (24.1 %) | **49 (8.8 %)** |
| curated — APCA failures | 333 (59.5 %) | **167 (29.8 %)** |
| flat — APCA failures | 708 (88.5 %) | 628 (78.5 %) |
| flat — pass WCAG / fail APCA | 210 (26.3 %) | 130 (16.3 %) |

The flat catalogue barely moved, because its problem is the role mapping
itself — which is P2b.

---

# ⚠️ Vibrancy dark mode is inverted (pre-existing, NOT fixed)

Found while auditing. `projectVibrancy` calls
`mode(grayDark, 'neutral-dark', pageTone: 12, inkTone: 1, …)`.

That predates the current ramp orientation. `buildScale` emits **step 1 as the
page in both appearances**. Verified by resolving the projection for
`#7f56d9`:

```
dark  rgb-neutral-dark-12   #e5e4e8   L 0.921   ← used as the PAGE
dark  rgb-neutral-dark-1    #100e13   L 0.169   ← used as the INK
```

**Vibrancy's dark mode renders a near-white page with near-black ink.**

Not fixed here, because it is not just swapping 12↔1: the companion tones
(bg2 11, bg3 10, separator 6, and the opaque fallbacks 5 and 9) were all chosen
against the old orientation and need re-deriving with design judgement. Recorded
as an `it.fails` assertion in `ramps.invariants.test.ts`.

This is the same class as finding H3 — two conventions for which end of the dark
ramp is the page — but with a visible rendering consequence.

---

# P2b — Flat catalogue remapped, `intent` made required

**Landed:** 2026-08-19 · **Token output changed: yes.**

## Result

| | before P0 | after P2b |
|---|---|---|
| flat — WCAG failures | **498 / 800 (62.3 %)** | **0 / 880 (0.0 %)** |
| flat — APCA failures | 708 (88.5 %) | **40 (4.5 %)** |
| curated — WCAG failures | 135 (24.1 %) | 49 (8.2 %) |

## The governance fix (the part that matters longest)

`Role.intent` is now a **required** field. Every role declares whether it is
`body-text`, `large-text`, `ui-component`, `decorative` or `surface`, and the
audit reads that declaration instead of guessing from the key name.

That guess is why this shipped: the report *inferred* an intent, so a role never
had to state its job, so no test could hold it to one. A new role now cannot be
added without answering the question — TypeScript will not compile until it does.

## Tone corrections

Text roles, re-derived from the taxonomy `buildScale` documents (11–12 are the
text steps; 8 is "Border hover" and 9 is "Solid"):

| role | was | now |
|---|---|---|
| `content-primary` | gray.11 | **gray.12** |
| `content-secondary` | gray.9 *(the Solid step, used as text)* | **gray.11** |
| `content-tertiary` | gray.8 | **gray.10** |
| `content-quaternary` | gray.7 | **gray.9** |
| `content-brand` / `-error` / `-warning` / `-success` | .8 | **.11** |
| `content-brand-hover` | brand.9 | **brand.12** |
| `background-*-solid` | .8 | **.9** *(9 IS the Solid)* |
| `background-brand-solid-hover` | .9 | **.10** |

`border-strong` added — the flat catalogue lacked a 1.4.11-compliant control
boundary just as the curated tables did.

## Ink solver now dual-target

`solidInkPair` took a WCAG number and stopped there. It now accepts a
`TextContrastTarget`; a bare number is promoted to "WCAG n + Lc 75", because
every caller is solving ink for a **label on a fill**. Candidates are also
ranked by `min(w/wcagTarget, lc/apcaTarget)`, so a pair that clears WCAG while
failing APCA can never outrank one closer to satisfying both — the old ranking
picked the highest WCAG ratio, which on a dark fill is the wrong choice.

---

# P2c — The four open decisions, resolved

**Landed:** 2026-08-19 · **Token output changed: yes.**

## Final state

| | P0 baseline | now |
|---|---|---|
| flat catalogue | 498 WCAG / 708 APCA failures | **0 / 0** (1 120 pairs) |
| curated architectures | 135 WCAG / 333 APCA failures | **0 / 0** (600 pairs) |

1 720 audited pairs, zero failures in either metric — and it is now a **test**
(`__tests__/contrast-matrix.test.ts`), not just a report.

## 1. The text hierarchy — two levels, and the rest named honestly

**Decision: keep four tokens, fix what they promise.** Removing
`content-tertiary` / `content-quaternary` would break every system in the field.
Widening the dark ramp to fit a third text level would change every surface
token for every user, compress dark elevation, and fight the Radix taxonomy the
system claims alignment with — Radix deliberately ships two text steps.

So the system states its ceiling instead of hiding it:

> **A token that must be SEEN resolves to step 11 or 12. Tokens at steps 9–10
> are de-emphasis only and must never carry information.**

The descriptions were the actual defect. `content-tertiary` read *"supporting /
paragraph text"* — essential content, at Lc 27 in dark. It now reads
*"NON-ESSENTIAL only — placeholder text, input hints, watermarks… use
content-secondary for anything a reader must read."* `content-secondary` picks
up captions and metadata explicitly.

A test enforces the pairing: **no role may be `decorative` while its description
promises readable text.** Downgrading an intent without correcting the wording
is how the problem would come back.

Applied uniformly: Categorical `content.subtle` joins the de-emphasis tier.

## 2. Status text on tints — the premise was stale

`tintInkRef` stopped at ~3:1 on the stated grounds that *"nothing but tone 12
clears AA on a light ramp, and tone 12 means near-black."* **Both halves were
false.**

The first predates the APCA retarget of steps 11–12. Re-measured across six
seeds, tone 12 on tone 3 clears AA *and* Lc 75 in every family and both
appearances (WCAG 10.04–13.00, Lc 84.4–88.6).

The second was never true. Tone 12 keeps 42 % of the family's chroma:
`error.12` is `#5c241d`, `warning.12` `#522c06`, `success.12` `#0c3d22`. Dark
red, dark amber, dark green. **Step-12-text-on-step-3-background is Radix's own
canonical pairing** — so this is the taxonomy's answer, not a compromise.

The solver now takes the subtlest tone clearing both, keeping the ink as light
as it legitimately can be.

## 3. Astryx status fills — solve the tone, like accent already did

`{error.9}` could not be fixed by choosing a better ink: **tone 9 of a red ramp
carries neither white nor near-black at AA** (worst 3.55). Astryx was
inconsistent with *itself* — its accent used `{accent.solid}` (solved) while its
status pinned `.9`.

`{fam.solid}` now resolves for any family, and Astryx status uses it. One
convention per table.

## 4. `border.accent` — split by name, not by tone

It is **decorative brand emphasis**, not a state indicator. Anything signalling
*selected / focused / active* conveys information, falls under WCAG 1.4.11, and
must use `border.active` — which is solved to clear both floors in both themes.

Naming the two apart is what makes the rule checkable.

## What the new test immediately caught

Adding "every foreground role names what it sits on" exposed three roles with
`contrastAgainst: null` — unauditable by construction. Giving them a reference
surfaced four real defects that had been invisible:

- **`accessibleSolidTone` was orientation-blind.** It walked UP from the anchor
  looking for a darker fill, which only holds for a light ramp. In a dark ramp
  tones get *lighter* with index, so it never passed and fell through to 12 —
  the lightest tone, the single worst choice. A teal dark solid resolved to
  `#c3ede6`: white on white at 1.27:1. It now searches **outward from the
  anchor**, which finds the deeper tone in a light ramp and the darker one in a
  dark ramp without knowing which it holds.
- **Solid fills pinned step 9.** Correct by taxonomy, too light to carry a label
  for a bright accent — 16 of 40 seeds failed. They now solve their tone.
- **`content-inverse` inverted to black in dark.** Right when its ink came from
  the gray ramp; wrong once the fill is solved to carry white. Pinned.
- **`border-brand` / `border-error` at tone 9 in dark** — Lc 15.3 and 37.5.
  Same finding as `border.active` and `icon.accent`: dark tones 9–10 sit below
  both floors. Moved to 11.

That is the governance argument in one paragraph: **the roles that had no
declared contrast partner were exactly the roles that were broken.** What is not
declared cannot be checked, and what cannot be checked drifts.

## The regression net

`__tests__/contrast-matrix.test.ts` runs the full matrix in CI and asserts zero
failures. It shares its engine with `npm run color:report` via
`lib/color/audit.ts` — one implementation, two consumers, per the
no-duplication rule. The report tells you *where*; the test tells you *whether*.

It also carries a canary: if a refactor silently stops resolving roles, every
assertion would pass vacuously, so the pair count itself is asserted.

---

# P3a — Ant Design, faithfully ported

**Landed:** 2026-08-19 · **Existing output unchanged** — new API alongside the
old preset, nothing swapped.

`src/lib/color/antDesign.ts`, zero runtime dependencies. Verified **byte-identical
to `@ant-design/colors` v8.0.1 across 1 500 deterministic random seeds**, light
and dark, plus a curated set covering Ant's documented hues.

## What the preset was missing

The `ant` entry in `SPECS` is the shared OKLCH engine with different chroma
multipliers. Ant's real algorithm has nothing in common with it:

| | OKLCH preset | real Ant |
|---|---|---|
| space | OKLCH | **HSV** |
| stops | 12, anchor at 9 | **10, anchor at 5** |
| hue | preserved | **rotates 2°/step, direction flips across 60°–240°** |
| dark theme | re-run against a dark page | **10 fixed mix ratios into the light palette** |

Measured hue spread across steps carrying real chroma: preset 0.31°–4.70°
(that is gamut mapping and quantisation noise, not intent), real Ant
2.90°–29.93°. A ratio of 3×–24×. No re-tuning produces that.

## Two rounding details that are load-bearing

Getting byte-identity took porting the reference's *arithmetic*, not its formulas:

1. **HSV→RGB uses the `p`/`q`/`t` form, not `c`/`x`/`m`.** Algebraically equal in
   the reals; the reference rounds `v*255`, `p`, `q`, `t` independently while the
   textbook form rounds `(component + m) * 255` once. One bit of difference —
   `#2a1966` vs `#2a1a66` for `#7f56d9`.
2. **Saturation is computed on 0–255 integers.** `66/240` is exactly `0.275`;
   `(66/255)/(240/255)` is `0.27499999999999997`. `getSaturation` subtracts 0.16
   and rounds to two decimals, so that 1e-17 lands on either side of a boundary:
   `round(11.5) = 12` vs `round(11.4999…) = 11`. A whole ramp step changes colour.

Hue is also rounded to an integer at source by the reference, before stepping.

---

# P3b — Material 3 is real HCT now (defect C2)

**Landed:** 2026-08-19 · **Token output changed: yes** — all Tonal palettes.

## The decision: depend, do not port

HCT is CAM16 hue and chroma with CIE `L*` substituted for lightness. CAM16 is
~400 lines of appearance-model maths where a transposed coefficient is invisible
in review and wrong in output. **Hand-porting it would be the least defensible
option available.** `@material/material-color-utilities` is Google's own
reference implementation; depending on it *is* the faithful choice.

Added as a runtime dependency. It is ESM with extensionless relative imports,
which Node's resolver rejects — `vitest.config.ts` inlines it so Vite transforms
it. The app build is unaffected; Vite pre-bundles dependencies anyway.

## What was wrong

```ts
const L = t / 100                                 // ← t is M3 tone = CIE L*
const cc = base * Math.sin(Math.PI * (t / 100))   // ← fabricated
```

- **Tone is CIE `L*`, not OKLab `L`.** `L* 40` ≈ OKLab `L 0.48`. The error is
  non-linear, largest in the mid tones — exactly where M3's contrast guarantees
  live. Every `on-*` role was therefore unverified.
- **HCT does not taper chroma smoothly.** It takes the maximum in-gamut chroma
  per tone: a jagged, hue-dependent envelope. A sine has no relationship to it.
  The comment claiming otherwise was wrong.

The palette parameters now come from `SchemeTonalSpot`, M3's default scheme —
primary chroma 36, secondary 16, tertiary hue+60 chroma 24, neutral 6,
neutral-variant 8. Google's numbers, not ours.

## Verification

- **Palettes reproduce `SchemeTonalSpot` exactly**, every stop, seven seeds.
- **`Hct.fromInt(emitted).tone === requested tone`** — the direct statement of
  what C2 got wrong. Revert to `L = t/100` and tone 40 comes back as ~33.
- **The contrast guarantees now hold**: every documented tone pair clears AA, and
  the full 30-role `TONAL_SCHEME` resolves with no `on-*` pair below AA or
  below `Lc 60`, across seven seeds and both themes.
- A test asserts OKLab `L` is *not* tone/100, so the trap stays documented in
  numbers rather than prose.

The role table itself needed no changes — the 30 tone assignments were correct
M3 all along. Only the palette underneath them was fabricated.

---

# P3c — Radix, faithfully ported

**Landed:** 2026-08-19 · **Existing output unchanged** — new API alongside the
old preset.

`src/lib/color/radix.ts`, zero runtime dependencies. Verified **byte-identical
to the real `generateRadixColors`** across 11 curated configurations and 300
deterministic random ones — accent scale, gray scale, both alpha scales, the
contrast ink and the background.

The comparison runs the ACTUAL upstream file
(`test-fixtures/upstream-generate-radix-colors.ts`, taken from
`radix-ui/website`) against ours in the same process. `colorjs.io`,
`bezier-easing` and `@radix-ui/colors` are devDependencies used only there.

## Radix does not generate ramps

That is the finding, and it is why no amount of retuning `SPECS.radix` could
ever have matched it:

1. Measure ΔE_OK from the seed to all **348 colours of 29 curated reference
   scales**, keep the two closest *unique* scales.
2. Decide **by trigonometry** whether the seed sits BETWEEN them — mix
   proportionally — or BEYOND one, in which case mixing would move away and the
   nearest is used alone.
3. Rewrite the mixed scale's hue to the seed's, rescale its chroma.
4. **Transpose** the resulting lightness progression onto the actual page
   through a cubic-bezier ease (`[0,2,0,2]` light, `[1,0,1,0]` dark).

The shape of a Radix scale is *inherited from hand-tuned data*, not computed.
`SPECS.radix` interpolates page → solid. They share the seed and nothing else.

Reference data is generated into `src/lib/color/radixReference.ts` (60 KB,
committed) by `npm run gen:radix-reference`. A test regenerates it and asserts
the committed file is byte-identical, so a stale table cannot survive a package
bump.

## Four things that had to be exactly right

Each was a real mismatch, found by the conformance test and traced:

1. **Radix reads the P3 scales, not the sRGB ones** (`${scale}P3`). The
   nearest-scale search runs against different numbers than the published sRGB
   values, so using those would pick different neighbours.
2. **colorjs's `Color.mix` interpolates in CIE Lab (D50)** — not OKLab, not the
   colours' own space. Nothing in the Radix source says so; it is a library
   default. Mixing in OKLab gave chroma errors of ~0.0003, which moved three
   dark steps by one bit. This is the only place in the codebase that needs a
   D50 space and a Bradford adaptation.
3. **colorjs gamut-maps before serialising to hex.** `toString({format:'hex'})`
   maps by default; it does not clip. Several dark steps descend from P3
   reference data and land outside sRGB — clipping them gave `#bda3ff` where
   upstream emits `#bda4ff`. Our `oklchToHex` already did CSS Color 4 mapping
   from P1, so this was a one-line fix.
4. **Ottosson's published OKLab matrices are truncated.** They are a fused form
   of the XYZ pipeline carried to 10 digits; colorjs uses the CSS Color 4 route
   at full precision. The two agree to ~1e-9 — and 1e-9 is exactly enough to
   flip an 8-bit channel at a quantisation boundary.

`gamut.ts` now uses the CSS Color 4 XYZ path at full precision. **All 124 golden
ramp snapshots passed unchanged**, so this was a no-op for existing output while
making the Radix port exact.

## What this closes

`DEFECT C1` said the ten presets are one engine wearing ten hats. Three of them
now have real implementations behind them:

| | status |
|---|---|
| Ant Design | ✅ byte-identical port (P3a) |
| Material 3 / HCT | ✅ reference library (P3b) |
| Radix | ✅ byte-identical port (P3c) |
| Tailwind | ⬜ P4 — hand-tuned data, needs transposition |
| IBM Carbon | ⬜ P4 — not yet an architecture at all |

The `it.fails` for C1 stays until the presets themselves are wired to these
implementations — the ports exist, the UI still calls the old engine. That
wiring is a product decision (naming, migration for saved systems) rather than
a technical one.

---

# P4a — Tailwind: the palette, and an honest derivation

**Landed:** 2026-08-19 · **Existing output unchanged** — new API alongside the
old preset. No new dependency: `tailwindcss` was already installed.

## Tailwind has no algorithm, and saying so is the fix

Its 26 families are hand-tuned OKLCH values; the documented way to customise is
to write your own numbers. There is nothing to port. So the module does the two
things that are actually true, and keeps them apart:

1. **`tailwindFamily(name)` / `tailwindFamilyOklch(name)`** — the real palette,
   verbatim. Asserted equal to `tailwindcss/theme.css` to the digit, all 286
   values, parsed independently of the generator.
2. **`deriveTailwindScale(seed)`** — a scale for a brand colour Tailwind does
   not ship. Snaps to the nearest family, keeps its hand-tuned **lightness curve
   exactly**, rotates every stop onto the seed's hue, scales chroma so stop 500
   lands on the seed. The returned object carries
   **`provenance: 'tailwind' | 'escala-derived'`** — a user who picked a real
   Tailwind colour gets Tailwind and is told so; anyone else is told the curve
   is borrowed and the colour is ours.

**Deliberately not done:** running Radix's reference-transposition over Tailwind
data. That would produce Tailwind-flavoured Radix wearing Tailwind's name — the
exact failure C1 describes. Tailwind stops are *absolute* (`bg-slate-50` is the
same colour in every project); it has no notion of a page, so transposing onto
one would be inventing behaviour. A test asserts `deriveTailwindScale` never
grows a `background` parameter.

## Two things the data turned out to say

**Tailwind 4.3 ships 26 families, not 22.** `mauve`, `mist`, `olive` and `taupe`
were added. The generator's stop-completeness guard caught this on the first
run — it refused to emit a table where one family had different stops than the
rest.

**33.2 % of the palette (95 of 286 stops) is outside sRGB.** Tailwind v4
publishes for P3 displays: `amber-400` is declared at chroma 0.189, which sRGB
cannot hold, and gamut mapping brings it to ~0.171. That is not a defect in
either system — but it does mean **the hex form is a lossy fallback, not the
source of truth**, which is why `tailwindFamilyOklch` exists and why the hex
assertions are bounded by one JND rather than exact.

Anything downstream that wants P3 output should read the OKLCH form.
`deriveTailwindScale` returns both.

## Deduplication done in the same pass

Porting Radix left a second `deltaEOK` in `radix.ts`, and Tailwind needed the
same nearest-family ranking. Both now come from **`src/lib/color/scaleMatch.ts`**
— `deltaEOK` delegates to the one implementation in `gamut.ts`, and `rankScales`
holds the one-entry-per-family search plus the near-identical-family demotion
(Radix's six greys, Tailwind's five neutrals).

What each architecture does *after* the ranking stays in its own module. Radix
mixes the top two by trigonometry and transposes onto the page; Tailwind rotates
one family's curve. Sharing the ranking is deduplication; sharing the rest would
be the C1 mistake again.

All 16 Radix conformance tests passed unchanged after the refactor, which is
what makes it a refactor rather than a rewrite.

---

# P4b — IBM Carbon, and the layer model

**Landed:** 2026-08-19 · **Existing output unchanged** — new API.
`@carbon/colors` and `@carbon/themes` are devDependencies used only to generate
and verify the committed table.

## Carbon is not here for its ramps

Like Tailwind, its scales are hand-tuned brand values with no generator — so
`carbonFamily()` is a lookup, verified equal to `@carbon/colors` across all 120
values, and `deriveCarbonScale()` is honestly labelled `escala-derived`
(anchored at stop **60**, where Carbon puts identity, not 500).

Carbon is here for the **layer model**, which is the one genuinely different
idea among the architectures Escala supports.

Every other architecture answers *"what colour is this token?"* with an absolute
value. Carbon answers *"what colour is this token **at this nesting depth**?"* A
card on the page and the same card inside a panel are different colours, and the
component does not know which it is — it asks for `layer`, and the depth comes
from how deeply it is wrapped. `layer01` cannot be flattened into the 12-step
model without losing what it means.

## What the data said

**Light themes ALTERNATE; dark themes ascend.**

```
white  #ffffff → #f4f4f4 → #ffffff → #f4f4f4    ← alternates
g10    #f4f4f4 → #ffffff → #f4f4f4 → #ffffff    ← alternates
g90    #262626 → #393939 → #525252 → #6f6f6f    ← ascends
g100   #161616 → #262626 → #393939 → #525252    ← ascends
```

Light themes have nowhere to go — one step lighter than white does not exist —
so they alternate. Dark themes have headroom, so they lift.

The invariant is therefore **not** "each layer is lighter than the one below".
It is **"each layer is distinguishable from the one below"**, and that is what
the test asserts. Encoding the intuitive-but-wrong version is exactly how a
derived Carbon theme would ship with two identical adjacent layers.

## A real finding in IBM's shipped tokens

Auditing text against the whole surface stack — which is only possible because
the layer model is modelled — turns up this:

| theme · token | d0 | d1 | d2 | d3 |
|---|---|---|---|---|
| g90 · `textSecondary` | 8.86 | 6.76 | 4.57 | **2.94 ✗** |
| g90 · `textHelper` | 8.86 | 6.76 | 4.57 | **2.94 ✗** |
| g100 · `textHelper` | 7.61 | 6.36 | 4.86 | **3.29 ✗** |

**The deepest layer runs out of contrast headroom.** Each layer lifts the
surface toward the text, so by depth 3 the gap has closed. `textPrimary`
survives everywhere; the softer tokens do not.

This is a property of IBM's values, not a defect in the port. It is *pinned*
rather than asserted away — the test lists exactly these three, so if IBM
changes them we find out instead of drifting silently in either direction.

**And the same WCAG blind spot shows up again**: `g90 textSecondary` at depth 0
reads WCAG 8.86 — comfortably AAA — at `Lc 69`, below the 75 body text needs.

## Alpha tokens

Carbon mixes hex and `rgba()` — **25 of the white theme's 235 tokens** are alpha,
including `textPlaceholder` and `overlay`. Measuring those strings directly
throws, so `resolveCarbonInk(theme, token, surface)` composites them over the
surface first, which is what they actually render as.

## Where P4 leaves DEFECT C1

| architecture | status |
|---|---|
| Ant Design | ✅ byte-identical port |
| Material 3 / HCT | ✅ reference library |
| Radix | ✅ byte-identical port |
| Tailwind | ✅ exact palette + labelled derivation |
| IBM Carbon | ✅ exact palette + themes + layer model |

All five have real implementations. The `it.fails` for C1 **stays** — the ports
exist, the UI still calls the old parametric engine. Wiring them up is a product
decision (what the presets are called now that they are faithful, and what
happens to saved systems whose "Radix UI" ramp changes for real), not a
technical one.

---

# P5 — Carbon as a real semantic architecture

**Landed:** 2026-08-19 · **Existing architectures unchanged** — `carbon` is new
in the picker.

Porting the palette was only half of "aligned to the architecture". The
semantic layer had to be Carbon's too, so `SemanticArchitecture` now includes
`'carbon'` with its own projection, view and export path.

## What makes it Carbon and not a re-skin

**Four themes, not light/dark.** `White · Gray 10 · Gray 90 · Gray 100` are the
modes. `g10` is not "light with a tweak" — it is the theme whose page sits one
step off white *so that layers can alternate downward*. Like Vibrancy and Tonal,
Carbon ignores `themeOrder`: its modes are part of the contract, so adding a
theme cannot extend them.

**Surfaces resolve by nesting depth.** 42 tokens across Layer · Field · Text ·
Icon · Border · Interactive · Support, with `layer-01/02/03`, `field-01/02/03`
and `border-subtle-00…03` — `border-subtle` keeping the depth-0 entry that only
it has.

**Token keys are Carbon's own**, kebab-cased for export (`layer-01`,
`border-subtle-00`, `text-on-color`), so a Carbon codebase consumes the output
without a rename step. That is the point of shipping an architecture rather than
an approximation of one.

**The layer progression follows Carbon's shape**, verified against
`@carbon/themes`:

```
white  page → +1 → page → +1     alternates
g10    page → −1 → page → −1     alternates the other way
g90    page → +1 → +2 → +3       ascends
g100   page → +1 → +2 → +3       ascends
```

## Three of IBM's decisions worth mirroring

1. **The focus ring is not the brand colour in dark.** Carbon ships
   `focus: #ffffff` for g90/g100 while the light themes use blue-60. That is the
   WCAG 1.4.11 trap this codebase kept measuring — a mid-brand stroke reads
   2.52:1 at Lc 15 on a dark page — and IBM solved it by going to the extreme.
   Mirrored: `{neutral-dark.12}` in dark, `{accent.solid}` in light.
2. **`interactive` goes LIGHTER in dark**, not darker (blue-50 where light uses
   blue-60), for the same reason.
3. **`link-primary` goes lighter still** (blue-40).

## Two failures the audit caught while wiring it

Both real, both fixed:

- **`border-interactive` / `focus` at 2.84:1** on the `g10` page. `g10`'s
  background is one step in from the page, so an `{accent.9}` ring that clears
  3:1 against the page does not clear it there. Fixed by adopting Carbon's own
  values (above), which is both more faithful and more accessible.
- **`text-on-color` at 1.58:1** in dark. The ink was being solved against
  `{accent.solid}` while `interactive` had become a *light* accent — solving ink
  for the wrong fill. Now solved per mode against whatever `interactive`
  actually is.

## One measured ceiling

`text-on-color` on `interactive` in the dark themes reaches **WCAG 7.53 at
Lc 68.1** — AAA on the compliance metric, just under APCA body grade. A light
accent fill cannot carry body-grade ink; that is a property of the fill, not a
solver failure. Classified `large-text` (button labels are bold, which APCA's
Bronze table treats accordingly) with the measurement recorded.

For scale: **IBM's own dark `textOnColor` is `#ffffff` on blue-50 — about
3.1:1.** The generated token is better than the reference it is modelled on, and
still honestly classified.

## Result

| | pairs | WCAG fail | APCA fail |
|---|---|---|---|
| flat catalogue | 1 120 | **0** | **0** |
| curated architectures (now incl. Carbon) | 1 440 | **0** | **0** |

2 560 audited pairs, zero failures in either metric, enforced in CI.

# P6 — Astryx and shadcn held to their published contracts

The instruction was *"en caso de IBM debe ser tal cual ibm carbon lo hace y lo
mismo con los otros"* — each architecture must match its vendor's contract, not
resemble it. P4b/P5 did that for Carbon. This does it for the two architectures
whose contracts are published as **token names**, where "close enough" is
invisible until a consumer copies our output into a real shadcn or Astryx app
and half the variables are missing.

## Astryx — the naming was already right; tokens were missing

Read from `@astryxdesign/core` (`defineTheme`). The finding that mattered is a
negative one: our grouped names (`--color-text-primary`, `--color-background-body`)
**are** Astryx's canonical layer, with the short aliases sitting on top. No
rename was needed, which is worth recording because renaming would have broken
every saved system for no gain.

What was genuinely absent:

| added | why it is not optional |
|---|---|
| `background.card` | the single most-used surface in the contract |
| `background.error-inverted` | the light-on-dark error surface pair |
| `utility.*` — `overlay`, `overlay-hover`, `overlay-pressed`, `skeleton`, `track`, `neutral`, `on-dark`, `on-light` | an entire group. Without it every modal, loading state and slider in a consuming app has no token to reach for. |

## shadcn — three defects, one of them a whole token family

Contract taken from the published theming variables.

1. **`destructive.fill` was `{error.9}`** — a raw ramp step, where every other
   fill in the architecture resolves a *solved* solid. Now `{error.solid}`, and
   `destructive.foreground` was added: the contract has always had it, and
   without it a destructive button's label is whatever the consumer guesses.
   Now measured — ≥ 4.5:1 on the fill in both modes.

2. **`border.ring` was `{neutral.6}`**, reading **1.90:1** light and **1.57:1**
   dark against the page. `--ring` is a focus indicator, so WCAG 1.4.11 applies
   at 3:1 and this failed it in both modes. Now `{accent.solid}` / `{accent.11}`,
   which is also what the focus ring *means*: brand, not chrome.

3. **`--chart-1` … `--chart-5` did not exist at all.** Five variables of the
   published contract, absent. Any shadcn chart block fed by an Escala theme
   rendered on framework defaults.

## The chart palette, and why the offsets look arbitrary

Categorical colour encodes **identity**, so the governing constraint is that
adjacent slots stay separable — including under colour-vision deficiency, which
affects roughly 8% of men.

The obvious construction is five hues 72° apart. It **does not pass**: it puts
amber beside green at **ΔE 6.4 under a deutan simulation**, inside the 6–8 band
that is legal only alongside a second encoding (direct labels, gaps, texture) —
and a shadcn chart guarantees none of those.

A search over offsets landed on `[0, 70, 160, 230, 300]` at fixed L 0.62 /
C 0.15 (fixed, because rank is not identity — no series may read as more
important than another):

```
#8c71d7  #cd597c  #a38300  #00a16d  #0092d1
worst adjacent pair   ΔE 9.0 protan · 15.3 normal vision   → clears the 8.0 target
every slot            ≥ 3:1 against the surface, light AND dark
```

## `src/lib/color/cvd.ts` — the check had to move into the repository

The offsets were found using an external validator. That is fine for finding
them and useless for keeping them: **a check that only runs on one machine is
not a guard.** The next person to "tidy" the offsets into an even split would
have seen a green suite.

So the simulation is now a first-class module — Machado, Oliveira & Fernandes
(2009) at severity 1.0, ~40 lines of matrix arithmetic, zero dependencies —
alongside `validateCategorical()`, which returns a report rather than throwing
so the same function can back both a CI assertion and a future UI panel.

Ported, then **verified against the external validator**: identical state and
identical ΔE to one decimal on every check, in both modes, for both the tuned
and the rejected palettes.

Two details that keep it honest:

- It reuses `gamut.hexToLinearRgb` rather than restating the sRGB transfer
  function. `hexToOklch` was refactored onto the same helper, so there is
  exactly one sRGB decode in the codebase — and a drift guard in
  `no-duplication.test.ts` fails the build if `cvd.ts` ever grows its own.
- `chartPalette(accent, offsets?)` takes the offsets as a parameter **only** so
  `shadcn.test.ts` can run the rejected even split through the real generator.
  The decision stays executable instead of becoming a comment nobody trusts.

## The research packages are NOT dependencies

`@astryxdesign/core` and `shadcn` were installed in the harness to read their
published contracts. Neither is imported by any source or test file, so neither
was added to `package.json`. The contract they revealed lives in the code and in
the tests; the packages themselves would have been dead weight.

## Verification

| | |
|---|---|
| suite | **269 passing**, 3 `it.fails` (the documented open defects) |
| new tests | `shadcn.test.ts` 9 · `cvd.test.ts` 10 |
| audit | 2 560 pairs, **0 WCAG / 0 APCA failures** — unchanged |
| duplication guard | extended: one sRGB transfer function, enforced |

## P6b — `npm run build` typechecks the tests (it did not before)

Running `tsc -b` against the repository surfaced something the 269 green tests
could not: **the build was broken, and had been since P0.**

`tsconfig.app.json` includes `src`, and the suite lives at
`src/lib/__tests__/`. So the *application* project was compiling test files with
`types: ["vite/client"]` — no `node`, no `vitest`. `readFileSync`, `__dirname`
and every `import ... from 'vitest'` failed to resolve. `npm test` never noticed
because vitest transpiles without typechecking.

### The split

A new `tsconfig.test.json`, referenced from `tsconfig.json` so `tsc -b` runs it
as part of the same build:

| project | includes | `types` |
|---|---|---|
| `tsconfig.app.json` | `src`, **excluding** tests | `vite/client` |
| `tsconfig.test.json` | tests + `scripts/**` + `types/**` | `node` |
| `tsconfig.node.json` | `vite.config.ts` | `node` |

Two consequences worth stating:

- **The app can no longer reach Node globals.** Had tests and `src` shared one
  project, `types: ["node"]` would have put `fs` and `process` in scope for
  browser code — the compiler would have stopped catching the class of mistake
  it is best at catching.
- **`scripts/` is typechecked at all now.** The four reference generators were
  in no project whatsoever.

Every other compiler option in the test project **mirrors the app project
exactly**. That is deliberate: the test project pulls `src/lib/**` in as a
dependency graph, so a stricter setting there would judge application code by
rules the application build does not apply.

### What the typecheck then caught that 269 tests did not

Three pieces of genuinely dead code, all of them mine:

| | |
|---|---|
| `STATUS_INK_TARGET` + its 24-line rationale | orphaned by the P2c dual-metric rewrite of `tintInkRef`. The reasoning is preserved in this log; keeping it in source described behaviour the code no longer had. |
| `CARBON_MODE_LABEL` | written and never wired, so the Carbon table showed raw keys — a column literally headed `g90`. Now live via `architectureModeLabel()`, and the UI's three duplicate label expressions collapse into one `archModeLabel` helper. |
| `oklchToHexClipped` in `radix.ts` | imported, unused. The comment explaining *why not to use it* was the part worth keeping; it stays. |

Plus `Finding` / `CuratedFinding`, imported by `color-report.ts` and never
referenced.

### And one real bug, in code the suite does not reach

`PreviewTokens.architecture` in `components/preview/ButtonPreview.tsx` restated
the architecture union by hand:

```ts
architecture?: 'flat' | 'astryx' | 'shadcn' | 'categorical' | 'vibrancy' | 'tonal'
```

`'carbon'` is missing. It has been missing since P5, and every test passed the
whole time because the suite covers `src/lib/`, not the preview components.

Now `architecture?: SemanticArchitecture`, imported. The fix is one line; the
finding is the point — a hand-copied union is a duplication the type system
cannot police, and this one silently made Carbon unpreviewable.

### Two type shims, deliberately narrow

`types/vendor.d.ts` declares `apca-w3` and `colorparsley` — the conformance
test's two devDependencies, neither of which ships types and neither of which
has a `@types/` package. Only the functions actually called are declared, typed
as they actually behave. A blanket `declare module` would have silenced the
compiler and *also* silenced a signature change on the next upgrade, which is
the one thing a conformance test exists to notice.

`test-fixtures/upstream-generate-radix-colors.ts` took a `@ts-nocheck` header.
It is upstream's file, and it predates `strict` — it reads colorjs's nullable
OKLCH components without narrowing. Editing the body to satisfy the compiler
would make it no longer upstream's algorithm, which is the only thing it is
there to be. The modification is disclosed in the file and in `radix.test.ts`.

### Before this lands

`npm install` — `vitest`, `apca-w3`, `@carbon/*`, `@radix-ui/colors`,
`colorjs.io`, `bezier-easing` and `@material/material-color-utilities` are in
`package.json` from earlier phases but were never installed locally, so both
`npm test` and `npm run build` need them present.

# P7 — Carbon reviewed, and rebuilt as a generated architecture

*"necesito que sea alineada a las arquitecturas, en caso de IBM debe ser tal
cual ibm carbon lo hace"* — so the review asked one question: **is what we ship
Carbon, or something that resembles Carbon?**

## The review

IBM's white theme carries **235 string tokens**. 130 are out of scope for a
colour layer and are excluded with the reason recorded in the generator:
`syntax*` (88 — a code-editor theme), `ai*` and `chat*` (42 — product-surface
gradients and shadows), `colorScheme` (a string) and `shadow` (an elevation
value Escala models separately).

That leaves **103 core UI tokens**. Escala shipped **42**.

| | |
|---|---|
| captured in the reference but never projected | 20 — `layer-active-*`, `layer-selected-*`, `field-hover-*`, `background-hover/active/inverse`, `link-secondary`, `link-visited`, `focus-inverse`, `overlay`, all four `support-*-inverse` |
| never captured at all | 41 — `layer-accent-*` (9), `layer-background-*`, `border-tile-*`, `border-subtle-selected-*`, `link-*-hover`, `link-inverse-*`, `support-caution-*`, `skeleton-*`, `toggle-off`, `focus-inset`, `icon-interactive`, `text-on-color-disabled`, `background-brand`, `background-selected*` |

And one outright defect in what WAS shipped: **`field-01/02/03` were inverted.**
IBM's white theme has `field01 = layer01 = gray-10`; ours had `field-01` one step
lighter than `layer-01`. An input rendered lighter than the surface it sits in.

## The fix is structural: stop hand-writing the table

The 42 tokens were a hand-authored tone table. That is why 61 were missing —
nothing connected the table to IBM's list, so tokens could only be added by
someone remembering to.

`gen-carbon-reference.ts` now also emits **`CARBON_TOKENS`**: every core token,
in every theme, as **the palette stop IBM chose** rather than as a hex.

```ts
'text-secondary':  { family: 'gray',  stop: 70, exact: true,  raw: '#525252' }
'text-placeholder':{ family: 'gray',  stop: 40, exact: false, raw: 'rgba(22, 22, 22, 0.4)' }
'support-warning': { family: 'yellow',stop: 30, exact: true,  raw: '#f1c21b' }
```

The architecture is generated from that. **The token list and the per-theme
stop are IBM's by construction.** The only thing Escala supplies is one
documented stop → ramp-tone mapping. `carbon.test.ts` reads the expected key
set out of the reference table, so a missing token is now a test failure rather
than a gap a user finds.

`exact: false` marks the values that are not literal palette entries — IBM's
off-ladder hover hexes, and the `rgba()` tokens, which are composited over that
theme's `layer01` and snapped to the nearest stop. IBM's literal value is kept
alongside so the snap stays checkable.

## Four things the translation had to get right

**1. Chromatic stops are relative, not absolute.** Carbon's ramps are not
lightness-aligned with each other: `blue-60` is IBM Blue, but the equivalent
saturated step of the yellow ramp is `yellow-30`, because a yellow dark enough
to sit at stop 60 has stopped being yellow. Mapping absolute stops through one
table put `supportWarning` on a pale tint where IBM has a vivid signal colour.
Each family now declares its anchor and the ladder is indexed by distance from
it.

**2. Blue is two families here.** IBM's brand IS blue, so `interactive`,
`linkPrimary` and `supportInfo` are all blue stops. Escala carries `accent` and
`info` separately; without an explicit split every info token came out
brand-coloured.

**3. Visited links needed a hue Escala does not have.** Carbon distinguishes
them with purple. Dropping the tokens would be incomplete and folding them into
the accent would be wrong, so they are emitted on the accent hue **rotated by
+33° in OKLCH — the measured angle between Carbon's own `purple-60` and its own
`blue-60`.** IBM's relationship, the user's starting hue. Same technique as
`chartPalette`.

**4. Inverse tokens run backwards.** `linkInverse`, `focusInverse` and the
`support*Inverse` pairs are painted on the inverse bar, which is dark in a light
theme and light in a dark one, so they need their own ladder. Without it the
**teal seed produced `link-inverse` at 1.00:1** — `{accent.solid}` on a dark ramp
is solved to carry ink, which for teal is the pale `#c3ede6`, painted onto a
near-white bar. Same colour, invisible link.

## What the expanded audit then caught

The Carbon pairing list went from 24 to 47 pairs, and the curated audit from
1 440 to **2 440 pairs**. Every one of the following was invisible before.

| finding | measured | resolution |
|---|---|---|
| `border-strong-*` under 1.4.11 | 2.69–2.96 light, 1.79–2.84 dark | floored at tone 9 / 11 |
| `toggle-off` — same `gray-50`, same job | 2.69 / 1.79 | same floor |
| `text-on-color` pinned to white | **2.09:1** on the brand fill | solved with `{on:…}` against whatever `interactive` resolves to |
| links at the solid | 4.29:1 at Lc 63.5 | floored at tone 12 |
| `text-error` at the solid | 4.72 at Lc 67.9 | floored at tone 12 |
| `link-inverse` on the inverse bar | 1.00 (teal), then Lc 56.9 | its own ladder, anchored at tone 3 / 5 |

**2 560 → 3 560 audited pairs, still 0 WCAG and 0 APCA failures.**

## Two measurements worth keeping

**The text steps are solved with zero headroom.** `{accent.11}` lands on
**Lc 75.1** against the page — the body-text threshold, exactly. Carbon is the
only architecture with a *second* surface, and one step in is enough to spend
it: the same colour reads **Lc 68.0 on the g10 page** and **Lc 74.6 on g90**.
That is the layer model doing precisely the job it was added for, and it is why
Carbon's links floor at 12 rather than 11.

**There is nothing between Lc 27 and Lc 75 on a dark neutral ramp.** Measured
against every layer a border can sit on:

```
tone  9  →  WCAG 2.39–3.17  ·  Lc 17.8–21.2
tone 10  →  WCAG 2.89–3.84  ·  Lc 23.4–26.7
tone 11  →  WCAG 9.01–11.95 ·  Lc 72.0–75.3
```

A Radix dark ramp jumps straight from its border steps to its text steps, so a
dark control boundary is either below the Lc 45 the `ui-component` intent needs,
or it is bright. **Tone 10 passes WCAG and fails APCA** — exactly the blind spot
the dual metric exists to expose, and the reason that floor is 11 and not the 10
WCAG alone would have accepted.

## One loss, asserted rather than hidden

Carbon's neutral ladder is denser at the far end than a 12-step Radix ramp:
`gray-80`, `gray-90` and `gray-100` are three distinct values in IBM's light
themes, and there is only ONE step at that end here. So `background-inverse`
and `text-primary` come out identical. Widening the ramp would change every
other architecture, so the collapse is **asserted in the test suite** — if the
ramp ever grows a step, that test is what says so.

## Result

| | tokens | themes | pairs audited |
|---|---|---|---|
| before | 42 | 4 | 1 440 (all architectures) |
| after | **103** | 4 | **2 440 (all architectures)** |

Suite: **275 passing**, 3 `it.fails`. Carbon's own file: 32 tests.

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
│   └── IMPLEMENTATION-LOG.md            this file — one section per phase
├── src/lib/color/                       the colour layer, zero runtime deps
│   ├── apca.ts                          APCA-W3 0.1.9 + WCAG 2.1 + intent classes
│   ├── gamut.ts                         OKLCH ↔ sRGB, CSS Color 4 gamut mapping
│   ├── cvd.ts                           CVD simulation + categorical validation
│   ├── scaleMatch.ts                    shared ΔE_OK scale ranking
│   ├── audit.ts                         the contrast-matrix engine
│   ├── antDesign.ts · radix.ts          faithful vendor ports
│   ├── tailwind.ts · carbon.ts          vendor palettes + honest derivations
│   └── *Reference.ts                    GENERATED — regenerate, never hand-edit
├── src/lib/__tests__/                   the suite + __snapshots__/
├── scripts/
│   ├── color-report.ts                  npm run color:report
│   └── gen-*-reference.ts               npm run gen:*-reference
├── reports/                             GITIGNORED — generated output
└── vitest.config.ts
```

`.claude/skills/` is the Claude Code project convention: the skill is versioned
with the code it documents, and any session opened in this repo picks it up
automatically. Future skills (`color-architecture-specs`, `token-contrast-audit`)
and the implementer agent (`.claude/agents/`) belong in the same tree — neither
folder is created yet, because an empty directory or a stub referencing skills
that do not exist is exactly the dead weight this layout is meant to avoid.

`CLAUDE.md` carries the same folder structure plus the colour-layer
non-negotiables under Conventions, so a future session does not re-derive or
re-duplicate any of it.

## Still open — decisions, not bugs

| | |
|---|---|
| **DEFECT C1** | the vendor ports exist and are byte-exact, but the UI still calls the parametric engine. Wiring them needs a naming scheme and a migration for saved systems — a product decision. |
| **`compositeOver`** | defined in two modules with different signatures. Mechanical to fix; the better name depends on which call sites should read well. |
| **Vibrancy dark mode** | inverted. Pre-existing, documented, untouched. |

Each is an `it.fails` in the suite, so none of them can be forgotten.
