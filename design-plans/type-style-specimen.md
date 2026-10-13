# Type card names the face and sets the glyphs in a row

Written against: a8ee3b8

## Evidence chain

- Surface: create studio, Color step, the wide type card on `CreateBoard` (`SystemCollage` desktop board, top row, second card). The same `TypeStyleSpecimen` is the narrow card in the phone carousel.
- Problem: the family name is a speck, and the glyph sample is a centred tower inside a second well. Measured on the live card (Inter, dark): the name paints at **14×10px** (`caption` / `text-xs` / 12px, weight 400, `fgMuted` `rgb(192, 209, 202)`), centred in a 173×109 column. "Regular / Medium / Heavy" sit under it at 32px and paint at 66×19. The other half is a tinted well, 173×109, holding "Aa / 123 / #&!" stacked at 52px bold and centred. The name is the only word that says which face this is, and it is the smallest thing on the card.
- Design evidence: the specimen's own comment — "the heading face as a glyph specimen on a soft well, the body face named and set at three weights." The name is required, and `typeStyleOf` is how every other line on this board gets its size (`heading-lg` is `display-md` / 36px on the body face; `heading-sm` is `display-xs` / 24px). `caption` is "Image captions and metadata" (`text-xs` / 12px). The colour card beside it is one surface: ramp blocks in the module padding, no nested well. `.impeccable.md`: labels are identifiers; hierarchy through size, not a second container.
- Owner: `TypeStyleSpecimen` in `src/components/preview/artefacts/SystemCollage.tsx`.
- Scope and affected surfaces: the wide filled card on the create board and the narrow card in the phone carousel. Both call `TypeStyleSpecimen`.
- Uncertainty: none. The 14×10 name is the rendered card, not the unscaled 12px.

## Design decision

One left-aligned column, no inner well. The family name is the title, set in the face at `heading-lg`. The glyphs sit on one line under it, in the heading face, at the same role, with a spacing gap between "Aa", "123", and "#&!". The three weights are a wrapping row at `heading-sm`, each in its own weight, in the ink — a legend under the specimen, not a second stack that buries the name.

When the heading face and the body face differ, the heading name leads at `heading-lg` in the heading face, and the body name follows at `heading-sm` in the body face. When they are the same face, only the body name is shown.

The column is `flex-1` and `justify-between`, with `gap-control` as the minimum gap, so a card stretched to the colour ramp's height keeps the name at the top and the weights at the bottom. A card that hugs its content (the phone) does not grow a hole.

## Reuse

- `typeStyleOf(t, 'heading-lg')` for the name and, with `fontFamily` set to `fontStack(heading)`, for the glyph line
- `typeStyleOf(t, 'heading-sm')` for each weight, then `fontWeight` from the existing map
- `spacingRoleOf` via the local `gap()` helper: `gap-tight` between two names, `gap-group` between glyph groups and between weight labels, `gap-control` as the column gap
- `t.neutralText` for every line
- Exemplar: `ColorStyleSpecimen` in the same file — content in the module padding, no nested well

No new primitive. `wellFill` exists only for this well; delete it with the well.

## Changes

1. `src/components/preview/artefacts/SystemCollage.tsx` — `TypeStyleSpecimen`
   - Change: replace the `1fr 1fr` grid, the tinted well, and the centred weight stack. Render a `flex flex-1 flex-col items-start justify-between` column (`minHeight: 200` stays). First block: the name or names, as in the decision, colour `neutralText`, no `text-center`. Second: one line, heading face, `heading-lg` size, `Aa`, `123`, `#&!` separated by `gap-group` (margin on the second and third, not spaces in the string). Third: a `flex flex-wrap` row of Regular, Medium, Heavy at `heading-sm` with `fontWeight` 400 / 500 / 700 from `t.typography.weights`, colour `neutralText`, `gap-group`. Drop the hardcoded `fontSize: 52`, `fontSize: 32`, `letterSpacing`, and `fgMuted`.
   - Preserve: heading glyphs vs body weights, the three weight labels and their numeric weights, `minHeight: 200`, and that the specimen still fills a stretched module.
   - Verify: on the create board the name is a title you can read (Inter paints well above the old 14×10), "Aa 123 #&!" is one line with gaps, and Regular / Medium / Heavy sit on one row in three weights. A long body name wraps; it does not overlap the glyphs.

2. Same file — `wellFill`
   - Change: delete the function. Nothing else calls it.
   - Preserve: `nestedRadius`, still used by the colour ramp.
   - Verify: no remaining reference to `wellFill`.

## Scope

- Inherit: the wide type card on the create board and the type card in the phone carousel.
- Verify: the colour card beside it is unchanged. A theme whose heading face differs from the body face shows both names, heading first.
- Exclude: the weight vocabulary (Regular / Medium / Heavy stays), the board columns, and the module chrome (`ModuleSurface`, scale, fill).

## Validation

- Product: open the create studio on Color. The type card reads as a name, then the glyphs on one line, then the three weights. The name is no longer a caption floating over the weights.
- Interface: the default Inter card (heading and body the same — one name). A system with two faces (two names). A long family name ("Plus Jakarta Sans") wrapping inside the card. Desktop board and the phone carousel. Dark chrome, the appearance on the card.
- System: sizes come from `heading-lg` and `heading-sm`. No second well, no 52px or 32px literal, no `caption` on the name.
- Repository: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

## Stop conditions

- Stop if `heading-lg` on the glyph line overflows the narrow phone card even with wrapping. Drop the glyph line to `heading-md` (`display-sm`, 30px) and leave the single name at `heading-lg`. Do not put the name back on `caption`.

## Design documentation

- None. The card uses roles the board already binds through `typeStyleOf`.
