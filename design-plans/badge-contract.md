# Contract · Badge (Figma to code)

Date: 2026-11-12 · Source: `Badge` set (`383:176`, 525 variants), read-only. **Figma rules.**
Description: "Small non-interactive label for statuses, counts and categories. Variant is the severity…; Appearance is soft, solid, outline or ghost; Type is default, icon (icon only, needs an accessible name) or number. Icons are instance swaps."

## API
| Figma (panel order) | Default | React |
|---|---|---|
| `Label` TEXT | `Badge` | `children` |
| `IconLeadingVisible` / `IconTrailingVisible` BOOLEAN + `IconLeadingIcon` (CheckCircle) / `IconTrailingIcon` (X) | false | `iconLeading` / `iconTrailing` (node or `true`) |
| `Icon` INSTANCE_SWAP (Info) · `Count` TEXT (`8`) | | `icon` · `count` |
| `Appearance` soft · solid · outline · ghost | `soft` | `appearance` |
| `Shape` rounded · pill | `rounded` | `shape` |
| `Size` xs · sm · default | `default` | `size` |
| `Type` default · icon · number · dot | `default` | `type` |
| `Variant` success · warning · info · inverse · default · secondary · critical | `default` | `variant` |

91 Type·Variant·Appearance combinations × 6 (Size × Shape) = 525; **dot only exists as solid + pill** (7 × 3).

## Geometry (measured)
| Size | Height | Padding X (Type default) | Text | Glyph |
|---|---|---|---|---|
| xs | 16 | 4 (`gap-tight`) | `Type/caption` | 10 |
| sm | 20 | 8 (`gap-control`) | `Type/label` | 12 |
| default | 24 (`Size/control-xs`) | 12 (`inset-control`) | `Type/label` | 14 |
Gap 4 (`gap-tight`); radius `Radius/control` (rounded) or `Radius/full` (pill). **icon**: square (width = height), no padding. **number**: min width = height, padding 4, `count` in the size's type. **dot**: circle 6 · 8 · 10, no content. **outline**: 1px INSIDE stroke that counts in the layout (+2 width: 63 vs 61).

## Colour (identical across all sizes, shapes and Types — verified)
| Variant | soft | solid | outline (stroke · ink) | ghost (ink) |
|---|---|---|---|---|
| default | `Surface/accent` · `Content/accent` | `Action/primary/default` · `Content/on-action` | `Border/accent` · `Content/accent` | `Content/accent` |
| secondary | `Action/secondary/default` · `Content/on-secondary` | `Surface/inverse` · `Content/inverse` | `Border/control` · `Content/primary` | `Content/secondary` |
| success · warning · info · critical | `Status/<s>/surface` · `content` | `surface-solid` · `on-solid` | `Status/<s>/border` · `content` | `Status/<s>/content` |
| inverse | `Surface/inverse-muted` · `Content/inverse` | `Surface/page` · `Content/primary` | `Border/inverse` · `Content/inverse` | `Content/inverse-secondary` |
Dot: the `solid` fill of each Variant.

## Oddities in the file
- `Variant=inverse` solid paints `Surface/page` with `Content/primary` (a light plate on a dark background).
- Icons live as hidden instances (`icon-leading`, `icon-trailing`); the boolean shows them.
- StatusBadge (the presence dot) is not in the file: it stays as a separate code component.
