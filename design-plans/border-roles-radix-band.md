# Realign the Categorical `border.*` roles onto Radix's stroke band, and solve the focus ring instead of pinning it

Written against: `8389513` (plus the uncommitted working tree of 2026-08-26)

---

## Audit — measured, not asserted

Every number below was produced with the repo's own `wcagRatio` / `apcaLcAbs`
(`src/lib/color/apca.ts`) over ramps built by the repo's own generators
(`generateColorScale` / `generateDarkColorScale` / `generateFamilyDarkScale`),
each role measured against the page it actually sits on.

### What Radix itself measures (upstream tables, `src/lib/color/radixReference.ts`)

Stroke tone vs. that scale's own step 1, `WCAG / APCA Lc`:

| scale | s6 | s7 | s8 | s9 |
| --- | --- | --- | --- | --- |
| blue (light) | 1.47/22 | 1.75/32 | **2.29/44** | 3.20/58 |
| gray (light) | 1.39/19 | 1.53/24 | **1.87/35** | 3.24/59 |
| red (light) | 1.56/25 | 1.85/34 | **2.34/45** | 3.84/64 |
| gray (dark) | 1.66/0 | 2.06/11 | **3.00/20** | 3.70/26 |
| blue (dark) | 2.12/12 | 2.73/18 | **3.62/26** | 5.62/42 |

**Radix's own step 8 does not clear 3:1 in light mode** (1.87–2.38). So "follow
Radix's 6–8 band" and "satisfy WCAG 1.4.11" are not automatically the same
instruction, and any plan that pretends otherwise is wrong. Radix's band is a
*visual* register; 1.4.11 is a *floor that applies only to strokes that are the
sole identification of a control*. Both are honoured below by splitting the
roles rather than by picking one rule and overriding the other.

### What Escala currently ships

Worst case across 6 accent seeds. `band` = is the light tone inside Radix's 6–8?

| role | band | light tone | WCAG | Lc | 1.4.11 | dark tone | WCAG | Lc | 1.4.11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `border.subtle` | 3 ✗ | 3 | 1.24 | 12 | n/a (decorative) | 4 | 1.20 | 0 | n/a |
| `border.default` | 5 ✗ | 5 | 1.61 | 27 | n/a (decorative) | 5 | 1.33 | 0 | n/a |
| `border.strong` | 9 ✗ | 9 | **4.78** | 73 | pass | 6 | **1.57** | 0 | **FAIL** |
| `border.accent` | 6–8 ✓ | 8 | 1.80 | 33 | n/a (documented exception) | 8 | 2.50 | 16 | n/a |
| `border.focus` | 9 ✗ | 9 | **2.15** | 42 | **FAIL** | 11 | 11.96 | 75 | pass |
| `border.critical` | 9 ✗ | 9 | 3.76 | 64 | pass | 11 | 11.94 | 75 | pass |
| `border.warning` | 11 ✗ | 11 | **5.14** | 75 | pass | 11 | 11.94 | 75 | pass |
| `border.success` | 11 ✗ | 11 | **5.19** | 75 | pass | 11 | 11.98 | 75 | pass |

Only one of eight roles sits inside Radix's stroke band, and it is the one role
(`border.accent`) the source deliberately exempts from the contrast floor.

### Finding 1 — `border.focus` fails WCAG 1.4.11 on most accent hues

`semanticArchitectures.ts:440` pins the light focus ring to `{accent.9}` and the
comment above it claims *"Light `{accent.9}` clears both (WCAG 3.14–7.45, Lc
57–85)."* That claim does not hold. Measured across 8 accent hues:

| accent | tone 9 | WCAG | Lc | |
| --- | --- | --- | --- | --- |
| `#9522e9` purple | `#9522e9` | 5.70 | 77 | pass |
| `#e11d48` rose | `#e11d48` | 4.70 | 71 | pass |
| `#16a34a` green | `#16a34a` | 3.30 | 60 | pass |
| `#0ea5e9` sky | `#0ea5e9` | 2.77 | 53 | **fail** |
| `#06b6d4` cyan | `#06b6d4` | 2.43 | 47 | **fail** |
| `#f59e0b` amber | `#f59e0b` | 2.15 | 42 | **fail** |
| `#84cc16` lime | `#84cc16` | 1.98 | 38 | **fail** |
| `#facc15` yellow | `#facc15` | 1.53 | 24 | **fail** |

**5 of 8 hues ship a focus ring under 3:1.** The documented range was evidently
measured on cool/dark seeds only; every warm or cyan accent falls out of it.
This is the highest-severity item in the audit — a focus ring is the one border
WCAG names twice (1.4.11 *and* 2.4.7), and tone 9 is the raw brand hex, so its
luminance is entirely at the user's discretion. Pinning a tone cannot work here.

The dark side is already correct (`{accent.11}` = 11.96) and its comment records
the exact search that produced it. Light simply never got the same treatment.

### Finding 2 — `border.strong` is the same role at two incompatible weights

Light `{neutral.9}` = **4.78:1**; dark `{neutral-dark.6}` = **1.57:1**. One is
heavier than the system's own low-contrast text step, the other is invisible.
`semanticArchitectures.ts:414-420` documents the dark choice honestly and offers
*"use `border.focus` when the stroke is the only control affordance"* — but a
text field's resting border **is** the only affordance, and a focus ring by
definition is not available in the resting state, so that escape hatch cannot be
taken by the very component the role exists for.

Light tone 9 is also the direct cause of the reported "colores tan marcados": it
is outside Radix's band, one step into the *solid* register.

### Finding 3 (retracted) — `border.warning` / `border.success` cannot move as far as first claimed

The first draft of this plan proposed dropping both to tone 9 on a "redundant
indicator" theory. **Re-verified on both metrics and retracted for `warning`,
narrowed for `success`:**

| role | tone 9 | tone 10 | tone 11 (current) |
| --- | --- | --- | --- |
| `border.warning` light | 2.35 / Lc 46 — WCAG fails | 2.75 / Lc 53 — **WCAG still fails** | 5.14 / 75 pass |
| `border.success` light | 2.76 / Lc 53 — WCAG fails | **3.31 / Lc 60 — pass** | 5.19 / 75 pass |

`warning` has no tone below 11 that clears WCAG in light — the current pin is
already the correct, minimal value. `success` has one step of headroom: tone
**10** passes both metrics. Both roles' own comments (`:509-510`,
*"Validation stroke for inputs in a warning/success state"*) describe the
border as the state's own boundary, not a decoration backed by a guaranteed
icon — so the 1.4.11 floor applies here the same way it applies to
`border.critical`, and neither role gets the `border.accent`-style exemption
the first draft assumed.

### Finding 4 — the neutral dark ramp has the identical blind spot `CARBON_MIN_TONE` already documents for this exact role

The first draft's dark values for the new `default`/`strong` split (tones 9/10)
were WCAG-only and re-create a bug this file already fixed once. Dual-metric,
neutral dark vs. `darkBackground`:

| tone | WCAG | Lc | |
| --- | --- | --- | --- |
| 9 | 3.21 | 21.4 | WCAG passes, APCA fails — the blind spot |
| 10 | 3.89 | 27.0 | WCAG passes, APCA fails — the blind spot |
| 11 | 11.99 | 75.2 | passes both |

This is the *exact* gap `CARBON_MIN_TONE`'s `border-strong-01` comment already
proved for Carbon's own dark ramp: **"there is nothing between Lc 27 and Lc
75"** on a dark neutral ramp's stroke band, and a dark control boundary is
either below the `ui-component` floor or all the way at the text tone. `border.focus`'s
own comment rejects tone `.10` as accent for the identical reason ("satisfies
the letter of 1.4.11 while remaining hard to see"). Pinning `default`'s dark
twin to 9 would repeat that mistake for neutral. Floor is 11, matching
`CARBON_MIN_TONE['border-strong-01'].dark` exactly — this is not a new
number, it is the value this codebase already proved for the same problem on
a sibling architecture.

### Not findings — verified deliberate

- **`border.accent` at 1.80 / 2.50** — `semanticArchitectures.ts:421-428`
  explicitly scopes it to decoration and forbids state use, naming
  `border.active` for that. Correct as written.
- **`border.subtle` / `border.default` under 3:1** — decorative by declared
  intent (`:407-409`, `:507`), no floor applies.
- **`border.critical` at error.9 (light) / error.11 (dark)`** — already
  correct: light 3.76/64 passes both; dark error.9 is 5.14 WCAG but **Lc
  37.6 — fails APCA**, error.10 is 44.2 — still short of the Lc 45 floor,
  error.11 is the first to clear both (11.94/75.0). The current pin is
  already sitting on the right tone.

---

## Design decision

Stop asking one tone to satisfy two different rules, and stop pinning tones that
depend on a user-supplied hue.

1. **Split the stroke roles by *what the stroke has to do*, not by weight** —
   decoration (no floor, Radix 3–6) vs. control boundary (3:1, Radix 7–8). Once
   the control boundary is a named role at tone 8, the requested change
   ("inputs should use `default`, not `strong`") becomes both what the user
   asked for *and* the accessible choice, rather than a trade between them.
2. **Solve the focus ring's tone instead of pinning it**, with the same walk-the-
   ramp mechanism the repo already uses for solids (`accessibleSolidTone`,
   `solidInkPair`). A role whose value depends on a hue the user picks cannot be
   a constant.

### Target

Every cell below is dual-metric verified (WCAG ≥3.0 **and** APCA Lc ≥45 — the
`ui-component` intent, `INTENT_THRESHOLDS['ui-component']` in
`src/lib/color/apca.ts`), not WCAG alone.

| role | today (L/D) | proposed (L/D) | measured (L/D) | why |
| --- | --- | --- | --- | --- |
| `border.subtle` | 3 / 4 | *unchanged* | 1.24/12 · 1.20/0 | hairline dividers; no floor |
| `border.default` | 5 / 5 | **8 / 11** | **3.26/60 · 11.99/75** | becomes the control boundary — what inputs bind to |
| `border.strong` | 9 / 6 | **9 / 12** | 4.78/73 · 15.19/90 | emphasis, one step past `default` in both themes |
| `border.focus` | 9 / 11 | **solved / 11** | ≥3:1 & Lc≥45, all hues | see mechanism below |
| `border.warning` | 11 / 11 | *unchanged* | 5.14/75 · 11.94/75 | already the minimum tone that clears WCAG (Finding 3) |
| `border.success` | 11 / 11 | **10 / 10** | 3.31/60 · 8.22/56 | one step lighter, still clears both metrics |
| `border.critical` | 9 / 11 | *unchanged* | 3.76/64 · 11.94/75 | already the minimum tone that clears both (Finding 3) |
| `border.accent` | 8 / 8 | *unchanged* | 1.80/33 · 2.50/16 | documented decorative exception |

`border.default` light drops from 4.78 → **3.26** — the visible "less marked"
result the user asked for, landing inside Radix's band (step 8) instead of
one step into the solid register (step 9).

**Dark does NOT get the same relief, and that is not a shortcut taken by this
plan — it is Finding 4.** `border.default`/`border.strong` land on 11/12 in
dark, not 8/9 mirrored from light, because 9 and 10 are the exact WCAG-passes-
APCA-fails blind spot `CARBON_MIN_TONE` already proved for the sibling
architecture's identical role. Shipping 9 there would be strictly worse than
today's `strong` (which is already broken at dark tone 6) while *looking*
fixed on a WCAG-only check. See *Stop conditions* — narrowing that
gap is a ramp-generator change and is explicitly out of scope here.

---

## Reuse

- `accessibleSolidTone` (`src/lib/colorUtils.ts`) — the existing walk-the-ramp
  search. The focus-ring solver is the same shape against a different target
  (page contrast ≥3:1 + APCA Lc ≥45, rather than white-ink-on-fill).
- `solidInkPair` (`src/lib/colorUtils.ts`) — exemplar for a *solved* value that
  still exports as a plain `{family.tone}` ref.
- `curatedRefs` / `projectCurated` (`src/lib/semanticArchitectures.ts`) — the
  existing marker-substitution point (`{accent.solid}`, `{on:…}`, `{ink:…}`).
  The focus ring becomes a **fourth marker** resolved in that one module, so the
  exported contract stays plain `{accent.N}` and `refToView`'s grammar is
  untouched.
- Exemplar for the whole pattern: `semanticArchitectures.ts`
  `status.*-fg` / `{ink:…}`, which solves a tone per theme against a real hex
  and is documented at length in `CLAUDE.md`.

No new primitive. Every proposed value is an existing tone of an existing ramp.

---

## Changes

1. `src/lib/semanticArchitectures.ts` — `CATEGORICAL_ROLES`, `group: 'border'`
   - Change: repoint `default` to `{neutral.8}` / `{neutral-dark.11}` and
     `strong` to `{neutral.9}` / `{neutral-dark.12}`. Repoint `success`'s
     light AND dark to tone 10 of its family. Leave `warning` and `critical`
     untouched — both are already sitting on the minimum passing tone.
   - Change: replace `focus`'s light `{accent.9}` with a new marker
     `{focus:accent}`, resolved in `curatedRefs` by walking the accent ramp up
     from 9 to the first tone clearing 3:1 **and** APCA Lc 45 against the page,
     returning the ramp's argmax if nothing clears — the same no-fixed-fallback
     rule `solidInkPair` follows.
   - Preserve: `subtle`, `accent`, `warning`, `critical` verbatim, including
     their comments. Preserve dark `focus` at `{accent.11}` and the measured
     table above it.
   - Verify: `border.default` resolves 3.26/60 (light) · 11.99/75 (dark);
     `border.strong` resolves 4.78/73 · 15.19/90; `border.success` resolves
     3.31/60 · 8.22/56; `border.focus` clears both floors on all 8 seeded
     hues; no ref named `focus:` escapes the module.

2. `src/lib/semanticArchitectures.ts` — `CATEGORICAL_ROLE_COMMENTS`
   - Change: rewrite the `border.default` and `border.strong` entries so the
     `[ROLE: …]` line states the new split (boundary vs. emphasis) and cites the
     measured ratio. Delete the stale *"use border.focus when the stroke is the
     only control affordance"* sentence from `border.strong` — the escape hatch
     it offers is not takeable.
   - Preserve: the `[ROLE: …]` prefix format `categoricalRoleLabel` parses.
   - Verify: the Semantics table's Role column renders the new text.

3. `src/components/preview/atoms/SemanticSpecimens.tsx` — `BorderSpecimen`
   - Change: the `Inputs` section binds `border.default` (currently `strong`).
     Move the emphasis demonstration into a new row that names `border.strong`
     so the role stays visible in the specimen.
   - Preserve: `Separators` on `subtle` / `default` — but re-check the second
     separator now that `default` is a boundary tone; if a 3.26:1 divider reads
     as heavy, that row moves to `subtle` and the section loses one row rather
     than mislabelling the token.
   - Verify: the panel's Inputs · Default field shows `border.default` and
     renders visibly lighter than today's stroke.

4. `CLAUDE.md`
   - Change: record the split, the two measured tables, and the rule that a
     hue-dependent role must be solved rather than pinned.
   - Verify: no surviving sentence claims `{accent.9}` clears 3:1 in light.

---

## Scope

- **Inherit:** every Categorical consumer — the Semantics table, `BorderSpecimen`,
  `resolvePreviewTokens`' `archTokens`, and the `colors.architecture` export.
  All are projections of `CATEGORICAL_ROLES`, so they move together.
- **Verify:** `ContrastFlag` in the preview (should report *fewer* flags, never
  more); the W3C export's alias targets (tones must exist in the shipped ramp);
  `sectionExport`'s Categorical Markdown tables (`Primitive · light/dark`
  columns must show the new tones).
- **Exclude:**
  - The **flat** role catalogue. Flat roles are materialised into
    `themes[theme]`, so repointing them needs a `clearSemantics` migration (the
    v43 precedent). Out of scope; track separately.
  - **Astryx / shadcn** border groups (`:630`, `:695`). They are ports of
    published contracts — `CLAUDE.md` states a vendor architecture matches its
    published contract, not a resemblance. Changing them would be a defect.
  - The **ramp generator**. The dark stroke-band compression is real but fixing
    it moves `__snapshots__/ramps.golden.test.ts.snap` and every system's dark
    neutral. Separate decision.
  - `border.accent`, `border.subtle` — verified deliberate.

---

## Validation

- **Product:** open Variables → Color → Semantics → Border with an **amber**
  accent (`#f59e0b`, one of the failing hues). The focused field's ring must
  clear 3:1 against the page; today it measures 2.15.
- **Interface:** the Border specimen in light *and* dark, at accent `#9522e9`
  (passing today) and `#facc15` (worst today, 1.53) — the purple case must not
  regress while the yellow case is fixed.
- **System:** confirm the focus solver lives in `curatedRefs` beside the three
  existing markers and did not become a second, parallel resolver; confirm
  exported refs are still plain `{family.tone}`.
- **Repository:**
  - `npm test` → 429 pass, 3 expected-fail (unchanged; no golden ramp moves —
    this plan changes *which tone a role points at*, never the ramps)
  - `npm run build` → clean (`tsc -b` typechecks tests too)
  - `npm run color:report` → the border rows' WCAG column improves; capture the
    before/after in the commit message

---

## Stop conditions

- Stop if `border.default`/`border.strong` landing on `{neutral-dark.11}`/`.12`
  reads as indistinguishable from body text in the Border specimen. That would
  mean the honest fix is the dark ramp's stroke-band spacing (see Finding 4),
  not the role — a generator change, out of scope here and needing its own
  decision.
- Stop if any consumer outside Categorical turns out to read these role keys
  directly rather than through `buildArchitectureView`.

---

## Design documentation

After acceptance and validation, record in `CLAUDE.md`, in the Semantics
section beside the existing `{accent.solid}` / `{on:…}` / `{ink:…}` note:

- The border split: decoration (`subtle`, `accent`) has no floor; the control
  boundary (`default`) targets 3:1 and lands in Radix's band at tone 8/9;
  `strong` is emphasis above it.
- **The rule worth generalising:** a role whose value depends on a
  user-supplied hue cannot be a pinned tone. `border.focus` shipped a documented
  contrast range that was false for 5 of 8 accent hues precisely because it was
  pinned. Any future role measured against the page must be solved.
- The measured focus-ring table, so the next person does not re-derive it.
