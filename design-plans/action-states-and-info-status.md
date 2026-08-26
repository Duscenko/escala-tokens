# Solve `action.primary` hover/pressed from the resolved solid, and give Info its status roles

Written against: `8389513` + the uncommitted working tree of 2026-08-26 (the
`border.*` realignment from `design-plans/border-roles-radix-band.md` is
already applied)

Origin: an external audit of the token system raised three items. All three
were re-measured against the repo's own `wcagRatio` / `apcaLcAbs`
(`src/lib/color/apca.ts`) over ramps from the repo's own generators before
anything below was written. **Two are confirmed and one is materially worse
than reported; one is already fixed and one is a decision, not a defect.**

---

## Verification summary

| # | External claim | Verdict |
| --- | --- | --- |
| 1 | Primary button hover fails WCAG AA in light | **Confirmed — and much worse.** 8/12 hues fail in light; in dark the *pressed* state measures APCA Lc 0–24 on **all 12** |
| 2 | Info primitives are orphaned | **Confirmed.** Full 12+12 ramp generated, referenced zero times by Categorical |
| 3a | Ensure `border.critical`/`warning` clear 3:1 | **Already true** — fixed earlier today; all status borders clear WCAG 3:1 *and* APCA Lc 45 in both themes |
| 3b | Consider a `border.focus.critical` alias | **Real gap, ambiguous correction** — presented as a decision below, not implemented |

---

## Finding 1 — hover/pressed are pinned tones written for a solid that is no longer always tone 9

### Root cause

`action.primary.default` is **solved** (`{accent.solid}` → `solidInkPair`,
which walks the ramp until the label clears WCAG 4.5 + APCA Lc 75). Its
siblings are **pinned**:

```
{ group: 'action', key: 'primary.hover',   light: '{accent.10}', dark: '{accent.10}' },
{ group: 'action', key: 'primary.pressed', light: '{accent.11}', dark: '{accent.6}'  },
```

Those tones encode "one and two steps past tone 9". The moment the solver
moves the default off 9 — which it does for every warm or low-luminance hue —
hover and pressed are no longer relative to anything. The file's own comment
already flagged this as a "known, accepted simplification… for the **rare**
accent whose solid lands above tone 9". Measured, it is not rare.

### Light — 8 of 12 hues ship a hover under WCAG AA

Ink is `content.on-action`, itself solved against the **default** fill and then
reused verbatim on hover/pressed.

| hue | solid | default | hover (t10) | pressed (t11) | |
| --- | --- | --- | --- | --- | --- |
| violet | 9 | 5.70 | 6.80 | 5.16 | ok |
| rose | 9 | 4.70 | 5.63 | 5.24 | ok |
| blue | 9 | 5.17 | 6.23 | 5.13 | ok |
| slate | 9 | 4.76 | 5.75 | 5.09 | ok |
| green | **11** | 5.18 | **3.96** | 5.18 | **fails** |
| sky | **11** | 5.16 | **3.31** | 5.16 | **fails** |
| orange | **11** | 5.18 | **3.32** | 5.18 | **fails** |
| teal | **11** | 5.20 | **2.95** | 5.20 | **fails** |
| cyan | **11** | 5.15 | **2.89** | 5.15 | **fails** |
| amber | **11** | 5.14 | **2.51** | 5.14 | **fails** |
| lime | **11** | 5.14 | **2.34** | 5.14 | **fails** |
| yellow | **11** | 5.11 | **1.78** | 5.11 | **fails** |

**A second defect in the same table, which the external audit did not name:**
every hue whose solid resolves to 11 has `pressed` pinned to 11 as well — the
*same tone as its default*. Those 8 hues have **no pressed state at all**.

### Dark — the pressed state is invisible on every hue

Measured against `darkBackground`, WCAG / APCA Lc:

| hue | solid | default | hover (t10) | pressed (t6) |
| --- | --- | --- | --- | --- |
| violet | 11 | 11.97 / 76 | **4.21 / 33** | **1.61 / 0** |
| rose | 11 | 11.96 / 76 | 5.01 / **39** | **1.76 / 9** |
| blue | 11 | 11.98 / 76 | 4.58 / **35** | **1.69 / 7** |
| green | 11 | 11.99 / 76 | 6.93 / **50** | **2.09 / 12** |
| sky | 11 | 12.01 / 76 | 8.23 / **58** | **2.29 / 15** |
| amber | 11 | 11.99 / 76 | 10.52 / **69** | **2.65 / 18** |
| lime | 11 | 11.95 / 76 | 11.35 / **73** | **2.81 / 20** |
| yellow | 9 | 12.61 / 79 | 14.36 / 86 | **3.29 / 24** |
| teal | 11 | 11.92 / 76 | 9.05 / **62** | **2.44 / 16** |

- **hover** clears WCAG on 11/12 but fails the APCA Lc 75 body-text bar on
  11/12 — the WCAG-passes/APCA-fails blind spot this codebase already
  documents twice (`border.focus`'s tone-`.10` note, `CARBON_MIN_TONE`).
- **pressed** at `{accent.6}` measures **Lc 0–24 across every hue**. The label
  is not low-contrast, it is absent. That tone was chosen "by eye" when the
  solid was assumed to be 9; with the solid at 11 it sits five steps away and
  the solved ink no longer applies to it at all.

### Why the audit's proposed fix is not the right one

> *"Considera… usar `accent.12` para hover/pressed"*

That fixes the warm hues and **breaks the cool ones**. For violet/rose/blue/slate
the solid is 9, hover 10 and pressed 11 are already correct, and tone 12 is the
ramp's high-contrast **text** step — jumping there is both a visible over-jump
and a role confusion. The tones cannot be re-pinned; they have to become
**relative to the resolved solid**, which is the same "solve, don't pin" rule
already applied to `{accent.solid}`, `{on:…}`, `{ink:…}` and (earlier today)
`{focus:…}`.

### Two negative results worth recording

Both were measured specifically to test cheaper alternatives; both failed, and
recording them stops the next person re-deriving them.

1. **The anchor cannot be kept by flipping to a darker ink.** Even with *pure
   black* (darker than any tone the neutral ramp produces — `{neutral.12}`
   resolves to `#34363b`), tone 9 misses the Lc 75 bar for most warm hues:
   amber 62.2, lime 66.1, teal 55.7. Only yellow clears (79.4). The solver
   walking to 11 is **correct**, not the bug.
2. **Relaxing the label target does not buy headroom.** Re-running the solve at
   APCA Lc 60 (the APCA bar for ~16px/600 text, rather than the Lc 75 body-copy
   bar) moves exactly one hue in light (yellow 11→9) and leaves green, sky,
   amber, teal at 11 — the WCAG 4.5 bar is co-binding. So the collapse below is
   a genuine property of the ramp, not a tuning choice, and this plan does **not**
   propose changing the target.

---

## Design decision

Derive `primary.hover` and `primary.pressed` from the **resolved** solid tone
rather than pinning them, in both themes, and re-solve each through
`solidInkPair` so the state's own fill is verified against the same ink the
default already solved for.

New marker, resolved in `curatedRefs` beside the four that exist:

```
{step:<fam>+<n>}  →  {<fam>.<tone>}
```

…where `tone` = `solidInkPair(ramp, inks, min(solidTone + n, 12)).tone`, i.e.
"start `n` steps past the solved solid and take the first tone that still
carries the label".

| role | today (L/D) | proposed (L/D) | violet (solid 9) | amber (solid 11) |
| --- | --- | --- | --- | --- |
| `primary.default` | `{accent.solid}` | *unchanged* | 9 | 11 |
| `primary.hover` | `{accent.10}` / `{accent.10}` | `{step:accent+1}` | **10** — identical to today | **12** |
| `primary.pressed` | `{accent.11}` / `{accent.6}` | `{step:accent+2}` | **11** — identical to today | **12** |

**For every hue whose solid already resolved to 9, the output is byte-identical
to today.** This is a fix for the hues that were broken, not a restyle of the
ones that worked.

### The residual, stated rather than hidden

When the solid resolves to 11 there is exactly one step of headroom, so hover
and pressed both land on 12 — a real pressed state (distinct from default,
legible label) but not distinct from hover. Negative result 2 above shows no
target change recovers the third step. The honest options if that matters
later are a non-colour pressed signal (inset shadow, scale) or a different
ramp, both outside a token-value change. **This is still strictly better than
today**, where those hues have a pressed state identical to the default in
light and an invisible label in dark.

### Dark `pressed` loses its hand-tuned recess, deliberately

`{accent.6}`'s comment records it was "measured by eye… `{accent.11}` read as a
hover-again, not as 'down'". That observation was made against a solid of 9;
against the actual solid of 11 the same tone measures Lc 0–24. A tone that
cannot carry its own label is not a pressed state regardless of how it reads as
a shape. The eye-measurement should be re-taken after this lands — see
*Validation*.

---

## Finding 2 — Info has a full ramp and no semantic roles

`infoColor` / `infoScale` / `infoDarkScale` are seeded, generated, exported to
`tokens.json` and resolvable through `scaleLookup`'s `info` family. Measured on
the live system: `#3690f5`, 12 light steps + 12 dark steps.

Categorical's `status` group ships `critical.*`, `warning.*`, `success.*` — and
references `info` **zero times**. A designer editing the Info primitive sees no
semantic token move.

### Target — mirror the existing severities exactly

| role | light | dark | measured (border-grade, vs page) |
| --- | --- | --- | --- |
| `status.info.surface` | `{info.3}` | `{info.3}` | tint, matches `critical.surface` |
| `status.info.content` | `{ink:info.3}` | `{ink:info.3}` | solved on its own tint — the `{ink:…}` rule, not a pinned 11 |

Note this uses **`{ink:info.3}`**, matching how `status.*-fg` is solved
elsewhere in this codebase, rather than the audit's suggested pinned `info.11`.
Pinning is what `{ink:…}` exists to replace: re-point the `-surface` and a
pinned ink stops tracking it.

`status.info.surface-solid` / `on-solid` are **not** proposed. `critical` is the
only severity that carries a solid pair today (for destructive buttons and
badges); adding one for info alone would make info the second-most-equipped
severity while warning and success still have none. If solid pairs are wanted,
that is one change across all four severities, not an info-only addition.

### Consequence to handle

`categorical.test.ts` asserts `roleIds` has length **39** and that
`CATEGORICAL_ROLE_COMMENTS` has no stale or missing entries. Adding 2 roles
makes it 41 and requires 2 new `[ROLE: …]` comments. The plugin contract is
unaffected — `colors.architecture` is an additive map keyed by role id.

---

## Finding 3 — one half is already done, the other is a decision

### 3a — already fixed, earlier today

The audit asks to "ensure `border.critical` or `border.warning` have enough
contrast (3:1 minimum for UI elements) to act alone". Measured against the
page, both themes, dual-metric:

| role | light | dark | |
| --- | --- | --- | --- |
| `border.critical` | 3.76 / Lc 64 | 11.94 / Lc 75 | passes |
| `border.warning` | 5.14 / Lc 75 | 11.94 / Lc 75 | passes |
| `border.success` | 3.31 / Lc 60 | 8.22 / Lc 56 | passes |

All three clear WCAG 1.4.11's 3:1 **and** APCA Lc 45 in both themes. The audit
is describing the state before `design-plans/border-roles-radix-band.md` landed.
**No change required.**

### 3b — `border.focus.critical`: a decision, not a defect

There is genuinely no defined answer for "an input in an error state that also
has keyboard focus". Today it gets `border.focus` (the accent ring), which does
not contradict any documented rule but does mean the error colour is dropped at
exactly the moment the user is interacting with the field.

Two defensible answers, and the evidence does not select between them — which
is why this plan does **not** implement either:

- **(a) Focus wins.** The ring stays accent; the error stays conveyed by the
  field border, icon and message. This is what Material and Carbon do, WCAG
  requires no error-coloured ring, and it costs nothing.
- **(b) Add `border.focus.critical`** = `{focus:error}` (the same solver
  `border.focus` now uses, pointed at the error family). Two more roles if
  warning/success are to be symmetric — see the same "one change across all
  severities, not one" argument as Finding 2.

**Recommendation: (a)**, recorded as an explicit exception in
`CATEGORICAL_ROLE_COMMENTS['border.focus']` so the next audit does not re-raise
it as an omission. Implement (b) only if you want the error ring.

---

## Reuse

- `solidInkPair(ramp, inks, start)` — **already takes a `start` parameter**;
  the `{step:…}` marker is that parameter, not new maths.
- `curatedRefs`'s existing memoised `solidToneFor(fam)` — the resolved solid is
  already computed once per family per theme; `{step:…}` reads it.
- `tintInkRef` / `{ink:…}` — the exemplar for Finding 2's `status.info.content`.
- `focusRingRef` / `{focus:…}` — the exemplar for the whole "solve, don't pin"
  shape, added earlier today.

No new primitive, no new maths, no new module. Every value is an existing tone
of an existing ramp reached through an existing solver.

---

## Changes

1. `src/lib/semanticArchitectures.ts` — new `{step:<fam>+<n>}` marker
   - Change: add a `solidStepRef(fam, offset, look)` helper beside
     `focusRingRef`; register `.replace(/\{step:([a-z-]+)\+(\d+)\}/g, …)` in
     `curatedRefs`'s chain. Clamp `start` to 12 **before** calling
     `solidInkPair` — with `start > 12` its loop never runs and it returns the
     out-of-range `start` verbatim, which would emit `{accent.13}`.
   - Preserve: the resolved output is a plain `{family.tone}`; no `step:` ref
     may escape the module.
   - Verify: violet resolves hover→`accent.10`, pressed→`accent.11` (identical
     to today); amber resolves both to `accent.12`.

2. `src/lib/semanticArchitectures.ts` — `CATEGORICAL_ROLES`, `group: 'action'`
   - Change: `primary.hover` → `{step:accent+1}` both themes;
     `primary.pressed` → `{step:accent+2}` both themes.
   - Preserve: `primary.default`, `secondary.*`, `disabled` verbatim.
   - Verify: no hue in the 12-hue set ships a hover or pressed whose label
     misses WCAG 4.5 + APCA Lc 75.

3. `src/lib/semanticArchitectures.ts` — `CATEGORICAL_ROLES`, `group: 'status'`
   - Change: add `info.surface` = `{info.3}` and `info.content` =
     `{ink:info.3}`, both themes, placed with the other severities.
   - Verify: both resolve to real `info.*` refs; the Semantics table shows an
     Info row that moves when the Info primitive is retinted.

4. `src/lib/semanticArchitectures.ts` — `CATEGORICAL_ROLE_COMMENTS`
   - Change: `[ROLE: …]` entries for the two new info roles. Rewrite
     `action.primary.hover` / `.pressed` to state they are derived from the
     resolved solid and cite the measured failures they replace. Append the
     3b decision to `border.focus`.
   - Preserve: the `[ROLE: …]` prefix `categoricalRoleLabel` parses.

5. `src/lib/__tests__/categorical.test.ts`
   - Change: 39 → 41 roles. Add a test asserting hover/pressed clear both
     floors across a hue set that includes at least one solid-at-9 hue
     (violet, proving no regression) and one solid-at-11 hue (amber, proving
     the fix).
   - Verify: `npm test` green.

6. `CLAUDE.md`
   - Change: record the marker, the two negative results, the hover/pressed
     collapse residual, the Info addition, and the 3b decision.

---

## Scope

- **Inherit:** the Semantics table, `ActionSpecimen`/`StatusSpecimen`,
  `resolvePreviewTokens`' `archTokens`, and the `colors.architecture` export —
  all projections of `CATEGORICAL_ROLES`.
- **Verify:** `ContrastFlag` (fewer flags, never more); the W3C export's alias
  targets; `sectionExport`'s Categorical Markdown columns; the `39` count
  assertion and the stale-comment assertion in `categorical.test.ts`.
- **Exclude:**
  - **Astryx / shadcn** action + status groups. Ports of published contracts;
    changing them is a defect, not a fix.
  - The **flat** catalogue — materialised into `themes[theme]`, needs a
    `clearSemantics`-style migration (v43 precedent).
  - `status.*.surface-solid` for warning/success/info — one decision across all
    four severities, not an info-only addition.
  - Any change to `solidInkPair`'s Lc 75 target — negative result 2 shows it
    does not deliver the headroom it looks like it would.

---

## Validation

- **Product:** Variables → Color → Semantics → Action with accent `#f59e0b`
  (amber, solid resolves to 11). Hover and pressed must both differ from the
  default and carry a legible label; today pressed is identical to the default.
  Then switch to dark and confirm the pressed label is visible at all — today
  it measures Lc 0–24 for every hue.
- **Interface:** the Action specimen in light and dark at `#9522e9` (must be
  pixel-identical to today) and `#facc15` (worst case today, hover 1.78:1).
  Re-take the by-eye judgement the old dark `{accent.6}` comment recorded.
- **System:** confirm `{step:…}` resolves inside `curatedRefs` beside the other
  markers rather than becoming a parallel resolver, and that exported refs stay
  plain `{family.tone}`.
- **Repository:**
  - `npm test` → green, with the role count moved 39 → 41 deliberately
  - `npm run build` → clean (`tsc -b` typechecks tests too)
  - `npm run color:report` → action rows improve; capture before/after

---

## Stop conditions

- Stop if `{step:accent+1}` changes ANY value for a hue whose solid resolves to
  9. That would mean the offset is being applied to the wrong base and the
  "identical for the working hues" guarantee is broken.
- Stop if the dark pressed state, re-judged by eye at `{step:accent+2}`, reads
  as a second hover rather than as "down". The measurement says the old tone 6
  is illegible, but if the replacement is not perceivable *as pressed*, the
  answer is a non-colour signal, not another tone — and that is a component
  change, out of scope here.
- Stop if adding the Info roles turns out to require a `schemaVersion` bump
  (it should not — `colors.architecture` is an additive keyed map).

---

## Design documentation

After acceptance and validation, record in `CLAUDE.md` beside the existing
`{accent.solid}` / `{on:…}` / `{ink:…}` / `{focus:…}` note:

- `{step:<fam>+<n>}` and the rule it enforces: **a state derived from a solved
  value must itself be solved.** `primary.hover`/`.pressed` were pinned
  relative to an assumption (`solid == 9`) that the solver invalidates for
  8 of 12 hues — the same class of defect as `border.focus`'s pinned tone,
  found by a different route.
- The two negative results (pure-black ink does not save the anchor; Lc 60 does
  not buy headroom), so neither is re-attempted.
- The hover/pressed collapse at solid 11 as a known, measured ramp constraint.
- The 3b decision: focus wins over error state on a focused invalid input, by
  choice, not by omission.
