# Contract · Stepper, StepperItem, StepperIndicator and StepperIcon (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Stepper (✓) WIP": `Stepper` (994:3222, 8 variants), `StepperItem` (994:1904, 56), `StepperIndicator` (994:850, 56),
`StepperIcon` (994:569, 28). Read-only. Ledger: Stepper `rebuild`, the other three `part`.

## API (variants first, then the rest of the panel)
- Stepper: `Size` default · xs · sm · lg (def default) · `Orientation` vertical · horizontal (def vertical) · `Content` (StepperItem slot).
- StepperItem: `Size` · `Status` active · completed · error · locked (def active) · `State` Default · Disabled · `Orientation` · `Title` "Step title" · `Description` "Short description of the step" · `DescriptionVisible` true.
- StepperIndicator: `Size` · `Status` · `State` · `Orientation` · `LineVisible` true.
- StepperIcon: `Size` · `Status` · `State` · `Label` "1" · `LabelVisible` true · `IconVisible` false · `Icon` (def user).
Description: ordered list of steps (`ol` with an accessible name); a single item `aria-current="step"`; disabled ones `aria-disabled`; the last item hides its line; completed / error announce "Completed" / "Error" (sr-only).

## Geometry
- Vertical Stepper: VERTICAL with no gap, STRETCH items (320 wide in the example, 4 × 62 = 248). Horizontal: HORIZONTAL Content gap `Spacing/gap-tight` (4), items `grow 1` (880 → 217 each).
- Vertical StepperItem: HORIZONTAL gap `Spacing/gap-control` (8), [indicator (STRETCH), content (grow, VERTICAL gap 4, bottom padding `Spacing/gap-section` 24)]; height 62 = 18 + 4 + 16 + 24.
  Horizontal: VERTICAL gap 8, [indicator STRETCH, content STRETCH no padding]; height 86 · 70 · 78 · 94 (= marker 40 · 24 · 32 · 48 + 8 + 38).
  Title `Type/label`, description `Type/helper`.
- StepperIndicator: vertical VERTICAL centre gap `gap-tight` (4) [icon, line grow]; horizontal HORIZONTAL centre gap 4. The line is a rectangle `Stroke/divider` (1) wide (vertical) or high (horizontal).
- StepperIcon: circle (`Radius/full`) `Size/control-md|xs|sm|lg` (40 · 24 · 32 · 48), centred; label `Type/label` (default and lg) or `Type/caption` (xs and sm); icon `Size/icon-md|sm|sm|lg`. completed → Check, error → Warning (automatic, no label).

## Colour (Size changes nothing)
- StepperIcon: active fill `Action/primary/default` and ink `Content/on-action`; completed `Surface/accent` and `Content/accent`; error `Status/critical/surface-solid` and `Status/critical/on-solid`; locked `Surface/muted` and `Content/secondary`;
  Disabled (completed · error · locked) `Action/disabled/default` and `Content/disabled`.
- Line: active and locked `Border/default`; completed `Border/accent`; error `Status/critical/border`; Disabled `Border/subtle`.
- Title: active and completed `Content/primary`; error `Status/critical/content`; locked `Content/secondary`; Disabled `Content/disabled`. Description `Content/secondary` (Disabled `Content/disabled`).

## Odd (copied as is)
- A locked step's marker carries the number on `Surface/muted`, not a padlock.
- The 24 bottom padding of the vertical content is kept on the last item too (the vertical Stepper measures 4 × 62).
- The three Disabled variants lose the state colour (completed and error look the same).

## Fix 2026-11-14 (measured in Storybook against Figma)
- **The connector line was stuck to the indicator's edge** (x 0 in vertical, y 0 in horizontal) instead of centred under / beside the marker:
  it carried `self-stretch` with a fixed 1px thickness. Figma: `counterAxisAlignItems CENTER` → x 19.5 (vertical, marker 40) and y 19.5 (horizontal).
  Now `self-center`; it grows on the main axis (`grow 1`).
- Measured afterwards, the 8 Stepper variants match Figma: vertical 320×248 (items 62), line @19.5 · 11.5 · 15.5 · 23.5 (default · xs · sm · lg),
  content @48 · 32 · 40 · 56; horizontal 880 × 86 · 70 · 78 · 94, items 217 at 0 · 221 · 442 · 663, line @44,19.5 of 173 (default),
  content @0,48; glyph 20 · 16 · 16 · 24 centred.
