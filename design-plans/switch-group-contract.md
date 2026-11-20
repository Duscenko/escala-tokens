# Contract · SwitchGroup (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Switch & SwitchGroup (✓)`, set `SwitchGroup`
(`405:2153`, 24 variants), read-only. **Figma rules.** Part of Switch in the ledger.

Description: "Switch with label, optional description and footer helper text; Placement sets which side the switch sits on,
Invalid shows critical helper text and Loading replaces the switch with a spinner. Always associate the label with the
switch (htmlFor or aria-labelledby in code)."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Label` | TEXT | "Email notifications" | `label` |
| `Description` / `DescriptionVisible` | TEXT / BOOLEAN | "Receive a summary of activity in your inbox." / true | `description` (absent = hidden) |
| `Footer` / `FooterVisible` | TEXT / BOOLEAN | "Changes apply immediately." / true | `footer` (absent = hidden) |
| `Size` xs · sm · default | VARIANT | `default` | `size` (passed to the Switch) |
| `State` Default · Disabled · Invalid · Loading | VARIANT | `Default` | `disabled`, `invalid`, `loading` (`forceState` docs) |
| `Placement` left · right | VARIANT | `left` | `placement` |

The sample's switch is an on Switch (Checked=true, Thumb short, Default; Disabled → Disabled, Invalid → Default).

## Geometry
Sample row of 360 (`spacing.32+32+24+2`), gap `Spacing/gap-group` 16 between the switch and the text, the switch at the top (y 0).
Text column with gap 2. Height 54 · 59 · 68 (xs · sm · default).

| Piece | xs | sm | default |
|---|---|---|---|
| label | `Type/label` | `Type/body-md` | `Type/body-lg` |
| description | `Type/caption` | `Type/body-sm` | `Type/body-md` |
| footer | `Type/helper` | `Type/helper` | `Type/body-sm` |
| spinner (Loading) | 14×14 | 16×16 | 20×20 |

## Colour
label `Content/primary`, description `Content/secondary`, footer `Content/subtle`. Disabled: all three `Content/disabled`.
Invalid: footer `Status/critical/content` with the text "Enable at least one channel to continue.".

## Oddities in the file
- The footer in `Content/subtle` measures 3:1 (axe fails in Light and Dark): copied.
- Invalid does not mark the switch (it stays Default); only the footer changes.
- Loading keeps label, description and footer normal; only the control is swapped for a Spinner (its ink was not read).
