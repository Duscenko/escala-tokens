# Name field uses the inspector eyebrow

Written against: dc0fd3f

## Evidence chain

- Surface: create studio, Color step, inspector identity band (`ThemeIdentityBar` portaled into the host in `ThemeLibraryPage`).
- Problem: with a value, "Design system name" sits on the field's top border, scaled down, on a `--nav` patch that cuts a notch out of the stroke. The control directly under it, "Themes this brand ships", labels itself with an eyebrow above the control and leaves the control's edge whole.
- Design evidence: `BrandThemesPicker` caption `text-mini font-semibold uppercase tracking-widest text-fg-faint`, and the same class on the accent section title in `ThemePanel` ("Dark theme · accent"). `.impeccable.md` principle 2: a label is an identifier, not a treatment of its own.
- Owner: `ThemeIdentityBar` in `src/components/configurator/ThemePanel.tsx`.
- Scope and affected surfaces: every `ThemeIdentityBar` that receives `caption` (the create Color step, first brand and the only brand). `MintedThemeIdentity` passes no caption and stays a single field.
- Uncertainty: none. The 60px host (`INSPECTOR_TABS_H`) fits an eyebrow plus the existing `h-8` field.

## Design decision

The caption is the same eyebrow the themes picker uses, stacked above the field. The field keeps its current box: `h-8`, `rounded-lg`, `border-line`, `bg-surface`, `hover:border-line-strong`, `focus:border-fg`. The floating scale, the `--nav` fill, and the notch shadow go away. The band stays 60px tall so it still lines up with the canvas header.

## Reuse

- Eyebrow: `text-mini font-semibold uppercase tracking-widest text-fg-faint`
- Exemplar: `src/components/configurator/BrandThemesPicker.tsx` (the "Themes this brand ships" caption)
- Field: the existing `ThemeIdentityBar` input classes, minus `peer` and the transparent placeholder that existed only to drive the float

No new primitive. The eyebrow already lives on this column.

## Changes

1. `src/components/configurator/ThemePanel.tsx` — `ThemeIdentityBar`
   - Change: when `caption` is set, render it as a `<p>` with the eyebrow classes, in a `flex flex-col gap-1` above the input. The row of field and optional Light/Dark pills aligns to the end of that column so the pills stay on the field, not on the caption. Drop the absolute `<span>`, the `placeholder=" "` trick, and the `peer-*` float rules. Placeholder falls back to the `placeholder` prop or `t('Name')` only when there is no caption. `aria-label` stays the caption.
   - Preserve: the value, Enter to submit, locked state, `showAppearance`, close button, and the no-caption layout `MintedThemeIdentity` uses.
   - Verify: filled ("escala") shows DESIGN SYSTEM NAME above a continuous border. Empty shows the same eyebrow and an empty field. Focus turns the border `border-fg` and does not move the caption. The step nav under the band does not shift.

## Scope

- Inherit: the create Color step, both "Design system name" and "Brand name".
- Verify: a later step (`MintedThemeIdentity`) still shows one field and the Light/Dark pills, with no eyebrow.
- Exclude: the step nav, the canvas header, and the themes picker.

## Validation

- Product: open the create studio on Color. The name reads as a caption over a field, the same way "Themes this brand ships" reads over its control.
- Interface: empty, filled, focused, and a long Spanish caption ("Nombre del design system") that truncates instead of wrapping the 60px band. Desktop only.
- System: one caption treatment on this column. No second floating-label pattern.
- Repository: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

## Stop conditions

- Stop if the eyebrow plus the `h-8` field exceeds `INSPECTOR_TABS_H` and the band would grow. Do not shrink the type or the field to force it.

## Design documentation

- None. The eyebrow is an existing class, not a new rule.
