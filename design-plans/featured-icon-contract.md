# Contract · FeaturedIcon (Figma to code)

Date: 2026-11-12 · Source: set `FeaturedIcon` (`1119:10857`, 144 variants), read-only. **Figma rules.**
Description: "Decorative icon in a tinted or solid shape… Hidden from assistive tech (aria-hidden)… ModalHeader nests it (Size default · lg, Shape rounded)."

## API
| Figma (panel order) | Default | React |
|---|---|---|
| `Icon` INSTANCE_SWAP | `icon/Lightning` (Outline) | `icon` (defaults to Phosphor's regular lightning bolt) |
| `Size` default · sm · lg · xl | `default` | `size` |
| `Variant` default · secondary · critical · success · warning · info | `default` | `variant` |
| `Appearance` soft · solid · gradient | `soft` | `appearance` |
| `Shape` circle · rounded | `circle` | `shape` |

## Geometry
Square 32 (sm) · 40 (default) · 48 (lg) · 56 (xl) = `Size/control-sm … xl`, centered glyph 20 (`Size/icon-md`, sm only) · 24 (`icon-lg`, the rest). circle = `Radius/full`, rounded = `Radius/action`.

## Color (identical at all sizes and shapes)
Same as Avatar: default soft `Surface/accent` + `Content/accent`; secondary soft `Surface/muted` + `Content/secondary`; critical/success/warning/info soft `Status/<s>/surface` + `content`, solid `Status/<s>/surface-solid` + `on-solid`.

## Gradient (2026-11-18, DEC-2026-11-18-003)
`Appearance=gradient` carries, in all tones, sizes and shapes: `0 4px 6px -1px Elevation/shadow-key`, `0 2px 4px -2px Elevation/shadow-ambient` and `inset 0 2px 0 Elevation/highlight` (set by hand, it does not use the 1 px `Highlight/solid` style). Stops: default `Action/primary/*`, secondary `Action/secondary/*`, statuses `Status/<s>/surface-solid*`.

## Inside overlays
In `ModalHeader` the icon is always `Shape=rounded` (`Radius/action`).

## Odd in the file
- **default·solid and secondary·solid (16 variants) are filled with a raster IMAGE** (a pasted iridescent sphere: 600×600 and 704×1408) and their icon has no painted layers. This is an oversight in the file; a photo cannot be copied. In code: default·solid = `Action/primary/default` + `Content/on-action`, secondary·solid = `Surface/inverse` + `Content/inverse` (the same as the file's Avatar solid). Notify the owner.
- xl does not enlarge the glyph (24, same as lg).
