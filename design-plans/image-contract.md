# Contract · Image (from Figma to code)

Date: 2026-11-12 · Source: set `Image` (`1126:15`, 12 variants), read-only. **Figma rules.** Ledger: rename of `AspectRatio` (the file calls it Image).
Description: "Photo or illustration cropped to a fixed ratio (object-fit: cover), with Surface/muted behind it while it loads. Ratio auto fills its parent… Use Shape=square inside a slot that already clips its corners."

## API
| Figma (panel order) | Default | React |
|---|---|---|
| `Media` INSTANCE_SWAP (`media/photo-11`) | stock photo | `src` + `alt` (or `children`) |
| `Ratio` auto · 16:9 · 4:3 · 3:2 · 1:1 · 3:4 | `auto` | `ratio` |
| `Shape` square · rounded | `square` | `shape` |

## Geometry and color
Clipping box, `Surface/muted` fill; radius `Radius/none` (square) or `Radius/container` (rounded). File sample 240 wide: auto 240×160, 16:9 240×135, 4:3 240×180, 3:2 240×160, 1:1 240×240, 3:4 240×320. The media (instance) fills the clipping box. No stroke, no shadow.

## The odd bits of the file
- 3:2 and auto measure the same in the sample (240×160); auto fills the parent.
- The photo is a stock image: in code `src`; the specimen replaces it with the system gradient.
