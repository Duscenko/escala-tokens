# Contract · FileUploadDropzone (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ FileUpload (✓)  WIP`, set
`FileUploadDropzone` (`994:472`, 15 variants), read read-only. **Figma rules; nothing is corrected.**
It is the ledger's `rename`: the code's `Dropzone` is renamed `FileUploadDropzone`.

Set description: "Drop area that opens the file picker on click and accepts dragged files; the Choose
file trigger is a Button. Keyboard users reach the trigger with Tab; set aria-disabled when disabled and
aria-invalid with a visible message in the error state."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` (`data-size`) |
| `State` Default · Hover · Dragging · Invalid · Disabled | VARIANT | `Default` | `forceState` (docs); live: `:hover`, drag, `invalid`, `disabled` |
| `Title` | TEXT | "Drag and drop files" | `title` |
| `DescriptionVisible` | BOOLEAN | true | `description={null}` hides it |
| `Description` | TEXT | "Max 10 MB each · PDF, ZIP or images" | `description` |
| `Icon` | INSTANCE_SWAP | `icon/CloudArrowUp` (Outline) | `icon` |
| `SeparatorVisible` | BOOLEAN | true | `separator` (only paints in lg) |

Code extras: `triggerLabel` (by default "Choose file"; "Choose again" in Invalid, like the file),
`accept`, `multiple`, `onFiles`, `invalid`, `disabled`.

## Geometry (strokes count in the layout: `strokesIncludedInLayout`)

| Size | Root | Direction | Padding | Gap | Icon | Title | Button |
|---|---|---|---|---|---|---|---|
| default | 480 × 60 (fixed width with no variable → `spacing.32×3+spacing.24`) | row, vertically centred | `Spacing/inset-control` 12 + stroke | `Spacing/gap-control` 8 | `Size/icon-md` 20 | `Type/label` | Button secondary · solid · **sm** (32) |
| sm | 400 × 42 (`spacing.32×3+spacing.4`) | row | `Spacing/gap-control` 8 + stroke | 8 | `Size/icon-sm` 16 | `Type/body-sm` | Button secondary · solid · **xs** (24) |
| lg | 400 × 206 | centred column | `Spacing/inset-surface` 20 + stroke | `Spacing/gap-group` 16 | `Size/icon-lg` 24 | `Type/label`, centred | Button secondary · solid · **default** (40) |

- Root: `Radius/container`, `Stroke/control` stroke INSIDE, **dashed 4·4**.
- Text: column with no gap, title + description `Type/helper`. In default the text block fills (FILL) and the button stays at the end; in lg the text hugs and is centred.
- **sm never shows a description**: the layer is hidden and is NOT bound to `DescriptionVisible`.
- Separator (lg only, `SeparatorVisible`): instance of the file's `Separator` (Label "OR", center, subtle):
  two `Border/subtle` lines of `Stroke/divider` and "OR" in `Type/label` `Content/secondary`, gap 16. The
  code Separator is not rebuilt yet, so the dropzone draws its own (`separator` · `rule` · `or`).

## Colour by state

| State | Fill | Stroke | Icon | Title | Description | Button |
|---|---|---|---|---|---|---|
| Default | `Surface/layer-1` | `Border/control` | `Content/secondary` | `Content/primary` | `Content/secondary` | Default |
| Hover | `Surface/layer-1` | `Border/control-hover` | idem | idem | idem | Default |
| Dragging | `Surface/accent` | `Border/accent` | `Content/accent` | `Content/accent` | `Content/accent` | Default |
| Invalid | `Status/critical/surface` | `Status/critical/border-strong` | `Status/critical/content` | idem | idem | Default, "Choose again" |
| Disabled | `Action/disabled/default` | `Border/control` | `Content/disabled` | idem | idem | Disabled |

The separator's "OR" stays `Content/secondary` in all states (Disabled too).

## Oddities in the file
- Invalid replaces the texts without binding them to the properties: title "Upload failed", description "The file
  exceeds the 25 MB limit."; in sm the only visible text is "The file exceeds the 25 MB limit.". Code: those
  are Invalid's default texts when `title` / `description` do not arrive.
- There is no Focused state: the focus is the button's (Tab reaches the trigger).
- The stroke is dashed 4·4; CSS `dashed` does not fix the dash length (Chrome draws its own). Accepted.
- The nested Separator is not rebuilt in code: it is drawn inside the dropzone with the same roles.
- Fixed width with no variable (480 / 400): summed spacing steps; whoever uses it can stretch it.
