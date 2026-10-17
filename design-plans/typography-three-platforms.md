# Typography across Desktop · Tablet · Mobile

Reference: Create UI's type specimen (screenshots, 2026-10-17). Goal: every text role
resolves to a deliberate value on each of the three platforms, and the export ships it.

## Where Escala is today (measured, `typeRoles.ts` + `typographyStandard.ts`)

| Role | Escala D · T · M (size/leading) | Reference D · T · M |
|---|---|---|
| display | 60/72 · 48/60 · 36/44 | 96 · 80 · 64 |
| heading-xl (h1) | 48/60 · 36/44 · 30/38 | 56 · 48 · 36 |
| heading-lg (h2) | 36/44 · **36/44** · 30/38 | 48 · 36 · 32 |
| heading-md (h3) | 30/38 · **30/38** · 24/32 | 36 · 32 · 24 |
| heading-sm (h4) | 24/32 · **24/32** · 20/30 | 32 · 24 · 20 |
| heading-xs (h5) | 20/30 · **20/30** · 18/28 | 24 · 20 · 18 |
| — (h6) | missing | 20 · 18 · 16 |

### The five gaps

1. **Tablet is mostly a copy of Desktop.** Only display and heading-xl step on tablet;
   h2–h5 hold their desktop size (bold cells). In the reference every heading steps
   on every cut, so the three columns are three real decisions.
2. **No letter-spacing at all.** The reference tightens tracking as size grows
   (display -2px, h1 -1.8/-1.6/-1.4, body-xl -0.5px) and relaxes it on smaller
   cuts. Escala ships no tracking token. The Figma plugin ALREADY reads
   `typography.letterSpacings` and binds `letter-spacing/<size>`, so the plugin
   needs no change; only the configurator does not emit it.
3. **Leading is locked to the size step.** `lineHeight` comes from the size key, so
   a role that keeps its size across cuts keeps its leading too. The reference
   opens leading on smaller screens for reading text (body-md 24 · 24 · 26,
   paragraph-md 28 · 30 · 32) while the size holds. Headings use a ratio
   (120 % → 150 % as the step gets smaller).
4. **One reading style.** The reference splits `body` (dense UI copy, tight) from
   `paragraph` (long-form, generous leading). Escala has body-lg/md/sm only.
5. **No UI, mono or utility roles.** Missing: control xs–xl (button/tab/badge
   labels, fixed every breakpoint, slight negative tracking), overline (uppercase +
   +1px), caption md/xs, numeric xs–xl (mono, tabular figures), code xs–lg (mono).
   Escala has no mono family slot.

### What the reference does that Escala already agrees with

- UI text (control, caption, overline, numeric, code) is **fixed at every
  breakpoint**. Escala's body/control roles already don't shrink on mobile.
- Weights never change across cuts.

## Plan (phased, each phase ships on its own)

### Phase 1 — DONE 2026-10-17 (store v89)
Every heading steps one rung per cut on the EXISTING ladder; display sizes kept
(Escala's calmer top end), names kept (`heading-xl…2xs`), `heading-2xs` (h6) added.
Default scale: display 60·48·36 · xl 48·36·30 · lg 36·30·24 · md 30·24·20 ·
sm 24·20·18 · xs 20·18·16 · 2xs 18·16·16. Mobile had to move too, or tablet
could not sit between desktop and mobile. Known residual: on mobile, xs and 2xs
both floor at body size (16) — the ladder has six rungs from 36 to 16 for seven
headings; a 28px or 22px primitive would remove it. `stepHeadingsPerCut` migrates
by detection; plugin `DEFAULT_TYPE_ROLES` gained `heading-2xs`.

### Phase 1 — original proposal (superseded by the above)
- Primitive scale: add the steps the reference needs and Escala lacks
  (`display-3xl` 80, `display-4xl` 96, plus 52/56/64 rungs or re-anchor the
  display ramp). Additive; nothing existing moves.
- Re-map display + heading-xl…xs to the reference D·T·M sizes, add `heading-2xs`
  (h6). Store migration by detection: a role still on the catalogue default moves,
  a hand-picked one stays (same rule as v73/v75).
- **Decision needed:** this changes every default system's heading sizes (h1 48→56,
  display 60→96). It is a visible restyle, not a no-op.

### Phase 2 — tracking + per-cut leading
- `TypeAlias` gains optional `tracking` and `leading` (px or %), defaulting to the
  values derived from the size step, so an untouched role resolves exactly as now.
- Emit `typography.letterSpacings` (plugin already consumes it), `--letter-spacing-*`,
  and `--text-<role>-letter-spacing[-tablet|-mobile]`.
- Leading per cut for reading roles (body opens +2px on mobile).

### Phase 3 — new role families
- `paragraph` xs–xl, `ui.control` xs–xl, `ui.overline` xs–md (+ uppercase),
  `ui.caption` xs–md, `numeric` xs–xl and `code` xs–lg.
- New family slot `font-family-mono` (Geist Mono default) — store field, CSS var,
  Figma variable, Font picker row.
- Existing `label` / `button` / `caption` / `helper` / `placeholder` alias into the
  new groups so no exported name disappears.
- Plugin: text styles for the new roles; numeric needs `font-variant-numeric:
  tabular-nums` (CSS only, Figma has no variable for it — note it in the style
  description).

### Phase 4 — Docs/Variables presentation
- Type page per group with the reference's row shape: specimen left, token name +
  copy, then a D/T/M line each (size · leading · tracking), and a "Fixed · every
  breakpoint" badge on groups that do not step.
- Responsive explainer card (Mobile 320–767 · Tablet 768–1279 · Desktop 1280+,
  outlined panel = current window).

## Open decisions
1. Rename headings to h1–h6 in the export (`text-heading-h1`), or keep
   `heading-xl…2xs`? Renaming breaks pinned Figma/CSS names; keeping is safer.
2. Adopt the reference's larger display sizes (96/80/64), or keep Escala's
   calmer top end and only fix the tablet column?
3. Mono family: ship Geist Mono as default, or system `ui-monospace`?
