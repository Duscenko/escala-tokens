# Weight stack hugs its surface

Written against: a8ee3b8

## Evidence chain

- Surface: Theme preview board, `TypeStyleSpecimen` inside `SystemCollage` (`ArtefactsView`). The selected node is the right column (`flex flex-col items-center justify-center`), 161×101. The painted box is the child span that carries Regular · Medium · Heavy.
- Problem: That span is padded with `gap-control` (8px) and `gap-group` (16px), so the `surface.layer-2` card is a panel around the words, not the size of the three-line stack.
- Design evidence: The same specimen already hugs the abbrev and the family name with `gap-tight`. Floating surfaces in `specimens.tsx` size to their content; the inset is a spacing role, not a stretched column. Rendered selection (2026-10-13) shows the column larger than the words, and the card’s own padding is the extra.
- Owner: `TypeStyleSpecimen` in `src/components/preview/artefacts/SystemCollage.tsx`.
- Scope and affected surfaces: The type tile on the brand board (`typeStyle` in `SystemCollage`), both the wide board row and the phone collage pack. Both call the same specimen.
- Uncertainty: none for the fit. The layer-2 fill and `lg` shadow stay.

## Design decision

The raised surface shrink-wraps the three lines. Its width is the longest word. Its height is the three lines. The only inset is `gap-tight` on every side, the same tight step the abbrev uses under its name, so the radius does not clip the glyphs and the box still reads as the stack.

## Reuse

- `spacingRoleOf` via the local `gap(t, 'gap-tight', '4px')`
- `overlaySurfaceStyle`, `shadowOf(t, 'lg', …)`, `radiusRoleOf(t, 'overlay', '12px')` — already on this span
- Exemplar: the abbrev block in the same function, which uses `gap-tight` and does not stretch

No new primitive. The column stays a centering grid cell. Only the surface changes size.

## Changes

1. `src/components/preview/artefacts/SystemCollage.tsx` — the weight span inside `TypeStyleSpecimen`
   - Change: set `width: 'max-content'` and `alignSelf: 'center'`. Replace padding `` `${gap(t, 'gap-control', '8px')} ${gap(t, 'gap-group', '16px')}` `` with `gap(t, 'gap-tight', '4px')` on all sides.
   - Preserve: body face only (abbrev + name), the three labels Regular · Medium · Heavy at their real weights, `surface.layer-2`, the `lg` shadow, the overlay radius, and the 32px size of the labels.
   - Verify: the card’s box is the stack plus 4px, centered in the right half. It does not grow to the column. Changing the spacing base moves that 4px with `gap-tight`.

## Scope

- Inherit: board and phone collage, because both render `TypeStyleSpecimen`.
- Verify: light and dark on the same tile (the shadow twin and the layer-2 fill). A long family name on the left must not push this card wider than its own words.
- Exclude: the create-studio step numbers, the edition icon strip, and the abbrev column.

## Validation

- Product: open a brand on Theme preview. The weight card sits on the type tile and matches the three lines.
- Interface: desktop board and the phone pack. Dark appearance (the one on screen) and light.
- System: no second surface helper. Still `overlaySurfaceStyle`.
- Repository: `npm test` is not required for this padding change. A typecheck is enough if the executor touches types; otherwise a visual check is the gate.

## Stop conditions

- Stop if the card is clipped by `ScaledModule`’s `overflow-hidden` once the padding drops. If the shadow disappears against the module edge, keep `gap-tight` and do not add a new inset.

## Design documentation

- None. This is a specimen inset, not a token-contract change.
