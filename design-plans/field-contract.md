# Contract · Field (from Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Field (✓)`, set `Field`
(`1003:102`, 9 variants), read with `use_figma` (read-only). **Figma rules; nothing is corrected.**

> The `spec/figma-components.json` snapshot (exported earlier) has Field with 6 variants and
> `State Default|Invalid`; the live file has 9, with `Disabled`. The live file is what gets built,
> so Field stays in `pending` until the snapshot is refreshed (which drags along dozens of other
> changes from the file: a separate task).

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` → the control's `size` (Input default · sm · lg) and the link's |
| `State` Default · Invalid · Disabled | VARIANT | `Default` | `state` → `aria-invalid` / `disabled` on the control |
| `Label` | TEXT | "Email address" | `label` (a `<label htmlFor>`) |
| `RequiredVisible` | BOOLEAN | false | `required` (the `*`) |
| `TrailingVisible` | BOOLEAN | false | `trailing` (a TextLink, "Forgot password?") |
| `DescriptionVisible` + `Description` | BOOLEAN + TEXT | false · "We will never share your email." | `description` |
| `Error` | TEXT | "Enter a valid email address." | `error`, visible only with `state="Invalid"` |
| `control` (exposed instance) | — | `Input` | `children`: a control (Input, Textarea, Combobox, NumberInput, InputTag, DatePickerTrigger, InputOTP) |

Field wires up the control: `id` (if missing), `aria-describedby` (description and error), `aria-invalid`
with Invalid, `disabled` with Disabled and `size` if the control does not carry it.

## Geometry

| Layer | Layout | Value |
|---|---|---|
| root | VERTICAL, FIXED width 320 in the file (in code: the container's), HUG height | gap `Spacing/gap-control` 8, no padding |
| label-row | HORIZONTAL, centred, FILL | gap `Spacing/gap-tight` 4: label · `*` · spacer (FILL) · trailing |
| control | FILL × `Size/control-sm|md|lg` (32 · 40 · 48) | Input of that Size and State |
| description / error | FILL | — |

Total heights in the file (without description): sm 58 · default 66 · lg 74; Invalid +24 (8 + 16).

## Type and color

| Layer | Style | Default / Invalid | Disabled |
|---|---|---|---|
| label | `Type/label` | `Content/primary` | `Content/disabled` |
| `*` | `Type/label` | `Content/secondary` | `Content/disabled` |
| trailing | TextLink `Size=xs` (sm and default) · `Size=sm` (lg), Variant default | State Default | State Disabled |
| description | `Type/helper` | `Content/secondary` | `Content/disabled` |
| error | `Type/helper` | `Status/critical/content` | (hidden) |

## What the file does that looks odd (copied anyway)
- In the `Disabled` variants the label, the `*`, the trailing and the description are NOT bound to the
  properties (`Label`, `RequiredVisible`…): changing the text in Figma does not move them. In code
  they do apply: that is what the set's description says.
- `error` has no visibility property: it shows in Invalid and nowhere else. With `DescriptionVisible`
  in Invalid, description and error would show at once (the file allows it).
- The `*` sits at `y` 2 · 0 · 4 depending on Size inside a centred 18 row: layer noise; the row
  centres it in code.

## Nests
`Input` (done), `TextLink` (done).
