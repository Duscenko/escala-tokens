# Colour role map — from one colour to every element it paints

Status (2026-10-31): phases 1–2 BUILT. `lib/colorRoleMap.ts` + `colorRoleMap.test.ts`
(the partition holds for the default system and all 18 System Styles, both
themes); `ColorRoleMapView.tsx` on the board, driven by `mappedColour` in
`ThemePreviewHub` (the rail's ramp toggle is controlled by it; it and the
Contrast grid exclude each other; Esc folds both). Layout is container-query
driven: four columns from a 56rem board, chip rows over the roles below it.
Simplifications vs. the text below: rule 4 needed no `themeSources` lookup —
refs always name the SLOT family, so brand-private families map for free; and
roles + Application share one row (two columns from a 30rem roles column).
Phase 3 BUILT (same day): `MapWires` draws colour → group → role from a 56rem
board (`litPairs`, a new optional prop, lights an exact path; `wireKey` lives
in `dashboard/mapWireKey.ts`). Role → Application is a connector the row draws
itself — an SVG wire would sit under the row's fill. Hover reads both ways:
a group lights its roles, a role its path, a component EVERY role that paints
it (the component moves to the front of each row, so "+N" never hides it).
Rows animate opacity only, since the wires measure them.
First finding the map surfaced: `status.warning.surface` / `surface-pressed`
are read by no component recipe.
Phase 4 BUILT (same day): the map's data, focus and group filter moved to the
hub (`useColorRoleMap`, `MapFocus` with a fourth kind, `tone`), so ONE focus
drives both sides. The open ramp shows a dot under every step a role reads
(filled = the solid, ring = only its alpha twin; `toneLegend`), steps nothing
reads have faded labels, hovering a step lights its roles on the board, and
any focus on the board rings the steps it reads (`tonesOfRoles`). Tested both
ways in `colorRoleMap.test.ts`.
Second finding: in Dark, the default brand's anchor (accent 9, the brand hex
itself) is read by NO role — `brandSolidPair` lands the primary button on 8.
Next: phase 5 (in-place on the real board — motion skill first, reference
https://token-galaxy.vercel.app/).

## Layout revision (2026-10-31, owner)

The narrow-board layout (Primitive and Groups as chip rows over stacked
roles) is GONE: the owner did not want the map vertical. The graph keeps its
four columns at every width (`min-w-[56rem]`) and a narrower board scrolls
sideways; wires draw at every width. Container queries removed.

## Phase 5 — on the board (BUILT 2026-10-31)

Built as designed below, with two corrections found in the browser:
- **A mask, not an even-odd clip-path.** Two lit parts that overlap without
  one containing the other (a card and the component filling it) refilled
  each other's hole in an even-odd path, so lit tiles showed blurred. The
  scrim is now a luminance `mask-image` (`holesMask`): holes union.
- **It waits for the board to settle** (`SETTLE_MS`, 280ms): the board's
  scaled tiles measure themselves after mount, and spotlighting earlier drew
  outlines where parts were a frame before.
- A focus that lights nothing (a ramp step only a pressed state reads) says
  so in a pill — a bare scrim read as broken.
Files: `lib/colorSpotlight.ts` (pure: `litSlots`, `outermostRects`,
`holesMask`, tested), `ColorSpotlight.tsx` (overlay, sibling of the board),
`MapViewSwitch` in `ColorRoleMapView.tsx`, `mapView` + `spotlight` in the hub.

### The design, as written before building

**Studied:** token-galaxy ("DS Universe"). Its Component level picks a zone
and does a FOCUS PULL: the rest of the component blurs and recedes, the zone
keeps a thin selection outline with corner handles (Figma's), and a leader
line runs out to a callout card (token, CSS var, alias chain). Its Usage level
is a wired graph — which our map already is. Motion skill loaded:
emil-design-eng (Emil Kowalski): ease-out for entering, exits faster than
entries, nothing from scale(0), transitions over keyframes for anything
retargeted by hover, under 300ms, opacity/transform only, reduced motion =
fades kept, movement dropped.

**What it is:** a second view of the same map — `Map · On the board` in the
map's header. "On the board" draws the real bento board and spotlights every
element that paints with the colour; everything else recedes behind a
blurred, dimmed scrim. Same focus as the map: hovering a step of the rail's
ramp narrows the spotlight to the roles on that tone.

**Finding the elements — no new data.** Every component on the board carries
`data-escala` (its recipe) and `data-part="Key.slot"` on its slots;
`traceElement` turns one into its colour roles per slot, the inspector's own
source. An element lights when a slot reads a role of the colour (any state —
a hover role is still where the colour lands). The slot's own node is lit when
it has one (a Badge's label), else the root. Tiles that are not recipe
components (the ramp swatches, the type specimen) are not traced.

**Drawing it — one scrim with holes.** An absolute layer over the board
content: `clip-path: path(evenodd, …)` = the board minus a rounded hole per lit
element (radius = the element's own, scaled), with `backdrop-filter: blur()`
and a page-tinted veil. One layer, so nesting needs no per-element filters; a
hole inside another hole is dropped (evenodd would re-fill it). Over each hole,
a selection outline with four corner handles. Pointing at a lit element draws
a leader line to a callout: the component, then each role it reads from this
colour with its primitive (`action.primary.default · accent.8`).

**Motion:** scrim fades in (240ms, ease-out `cubic-bezier(.23,1,.32,1)`);
outlines enter from scale .98 + opacity, staggered 25ms, capped at 300ms
total; exits 120ms. Hover changes (ramp step, callout) are transitions, not
keyframes, and the callout fades 150ms — instant when moving between lit
elements. Reduced motion: no blur, no scale, fades only.

## The ask

The Color card's rows (Accent · Neutral · Success · Critical · Warning · Info)
now have a sliders toggle that shows the role's ramp under it. Pressing it
should also show **where that colour goes**: the colour → the semantic groups
that read it → the roles → the elements that paint with those roles. The
reference mockup is a four-column graph on the board:
`Primitive · Semantic/groups · Semantic/roles · Application`.

## What already exists (and must be reused, not forked)

| Need | Source today |
|---|---|
| Every Categorical role, resolved per theme, with the primitive it reads (`accent.12`, `accent-a.3`, `black-a.8`) | `resolveSystemRoles(store, brand)` → `RoleEntry.modes[mode].label` (`lib/systemDashboard.ts`) |
| Groups (Content · Action · Surface · Status · Border) | `RoleEntry.category` / `categoryLabel` — the same `buildArchitectureView` the Variables table renders |
| Which components read a role, and which slot · property | `tokenMapping()` / `componentsByRole()` — from the recipes (`COMPONENT_RECIPES`), the same source the inspector traces |
| Wires between nodes | `dashboard/MapWires.tsx` (measures `data-wire` nodes, draws cubics, staged draw-in) |
| A role-first map (pick a role → its primitives and components) | `dashboard/ColorVariableMap.tsx`, in System · Docs · Color |

The new view is the same data read the OTHER way round — **primitive first**.
It gets its own pure builder, and `ColorVariableMap` keeps working off the
same rows, so the two maps can never disagree.

## The scoping rule (the heart of it)

A role **belongs to a colour** when the primitive it resolves to, in the theme
on screen, is one of that colour's families:

| Row | Families it owns |
|---|---|
| Accent | `accent`, `accent-a` |
| Neutral | `neutral`, `neutral-dark`, `neutral-a` |
| Success · Critical · Warning · Info | `success*`, `error*`, `warning*`, `info*` (solid + `-a` twin) |
| — | `black-a`, `white-a`: the fixed ladders. No row owns them. They show under Neutral as a separate "Fixed alpha" band, since that is what they replace (washes, scrims). |

Rules that follow from that:

1. **Scoped per theme, not per role.** `border.focus` and the
   `action.primary.*` states are SOLVED (`{ui:…}`, `{step:…}`,
   `brandSolidPair`), so the same role can read `accent.9` in Light and
   `accent.11` in Dark. The map follows the board's appearance. A role whose
   tone differs between themes gets a small `Light 9 · Dark 11` marker, so
   that difference is visible instead of surprising.
2. **Every role lands in exactly one colour per theme.** The six colours plus
   the fixed ladders partition the 73 roles. A test asserts it, so a new role
   can never fall outside the map. A role resolved to a literal (`transparent`)
   is listed under "Not from a ramp".
3. **A hand-edited role says so** (`RoleEntry.edited`). So does a role whose
   tone is solved, not pinned (`solved`, read from the ref marker). A solved
   tone moves when the hue moves. A pinned one doesn't.
4. **Brand-private families count.** A System Style's `core--minimalist-error`
   is that brand's Critical. Ownership goes through `themeSources[brand][slot]`,
   not the family's name. Otherwise every adopted style would map to nothing.

## The view

**Trigger.** The sliders toggle on a row does two things at once: it opens the
ramp in the rail (done) and turns the board into the map for that colour.
Closing the ramp, pressing Esc or opening another row's ramp moves the map
along. The map is a state of the board (`mappedRole`), **not a third tab**
beside Theme · Components, because a map only means something for one chosen
colour. The board header reads "Accent · where it's used" with ✕ to go back.

**Columns** (as in the mockup):

1. **Primitive.** The six colours, the mapped one lit. A click here switches
   the map AND the open ramp: one selection, two places.
2. **Groups.** Content · Action · Surface · Status · Border. Each shows how many
   of its roles this colour feeds. A group with none is dimmed, not hidden, so
   the five read the same for every colour. Click a group to filter column 3.
3. **Roles.** `role id` + the tone chip (`accent.12`) + the markers from the
   rules above. Hovering lights its wires both ways.
4. **Application.** The components that read the role. Each card shows its
   label and what the role paints (`root background`, `label text`) — the
   recipe's slot · property, the same words the inspector uses.

**The ramp in the rail becomes the map's legend.** Under each step a dot shows
whether any role reads that tone. Tones nothing reads are dimmed. Hovering a
step highlights the roles on that tone. This makes "scope variables" concrete:
you see at a glance that Accent ships 12 tones and the system uses 5 of them.

**Actions from the map:**
- Click a role → the same re-point flow the inspector already has
  (`onPickRole` → Token Details). The map redraws when it lands.
- Click a component → its page (`onOpenComponent`).
- "Open in Variables" on a role → `onOpenRoleInVariables`.

## Data contract — `lib/colorRoleMap.ts` (pure, DOM-free)

```ts
buildColorRoleMap(roles: SystemRoles, sources: ThemeSources, colour: ColorRoleId, mode: string): {
  colour: ColorRoleId
  families: string[]                       // the families it owns in this theme
  tones: Record<number, string[]>          // tone → role ids reading it
  groups: { key; label; roles: MappedRole[] }[]  // all five, possibly empty
}
MappedRole = { id; tone; family; css; solved; edited; otherTheme?: { mode; tone };
               components: { key; label; paints: string[] }[] }
```

Built from `resolveSystemRoles` + `tokenMapping`. Nothing is resolved twice.

Tests (`colorRoleMap.test.ts`):
- partition: across the six colours + fixed + literal, every role appears
  exactly once, in each theme of Core and of every System Style;
- every component listed for a role reads it in its recipe, and none is missing;
- brand-private families map to their slot (a System Style's Critical isn't empty);
- the `tones` index agrees with the roles' own labels.

## Phases

1. `colorRoleMap.ts` + tests. No UI.
2. Board map, static: four columns, counts, markers, dimmed empty groups.
   Toggle ↔ `mappedRole` lifted to the hub (the ramp's `rampOpen` becomes that
   state, so the two can't disagree).
3. Wires (`MapWires`), hover both ways, group filter, the actions.
4. The ramp as legend: usage dots, dimmed unused tones, step hover ↔ roles.
5. In-place mode (optional, see question 2): on the real bento board, dim
   everything that doesn't paint with this colour.

## Decisions (owner, 2026-10-31)

1. **The map replaces the board** while a colour is mapped.
2. **Application = component cards first** (phases 2–3). The in-place mode
   is phase 5.
3. **Fixed ladders** (`black-a` / `white-a`) sit under Neutral, as a "Fixed
   alpha" band.

**Phase 5 brief, from the owner:** lighting the real board needs a motion
skill brought in first (load or install one before building it). The motion
reference is https://token-galaxy.vercel.app/ — study it before designing the
in-place reveal.
