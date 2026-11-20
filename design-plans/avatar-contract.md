# Contract · Avatar (from Figma to code)

Date: 2026-11-12 · Source: set `Avatar` (`378:2094`, 350 variants), page `❖ Avatar (✓)`, read-only.
**Figma rules.** Parts: `AvatarStatus` (377:54) and `AvatarGroup` (378:2507) — short contracts below.

Description: "User or entity avatar as an image, initials or icon in seven sizes, with an optional selection ring and presence status. Give image avatars alt text or an accessible name…"

## API
| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Type` image · initials · icon | VARIANT | `image` | `type` |
| `Size` 2xs · xs · sm · default · lg · xl · 2xl | VARIANT | `default` | `size` |
| `Shape` circle · rounded | VARIANT | `circle` | `shape` |
| `Variant` secondary · default · info · success · warning · critical | VARIANT | `secondary` | `variant` |
| `Appearance` soft · solid | VARIANT | `soft` | `appearance` |
| `RingVisible` / `StatusVisible` | BOOLEAN | false | `ringVisible` / `statusVisible` (+ `status`) |
| `Icon` / `Photo` | INSTANCE_SWAP | user (bold) / `_AvatarPhoto` | `icon` / `src` |

An `image` avatar only exists as secondary · soft (14 variants); initials and icon cross Variant × Appearance (168 each).

## Geometry
Square 16 · 24 · 32 · 40 · 48 · 56 · 64 (`Size/control-xs … xl` are 24 … 56; 2xs and 2xl are literals). Radius `Radius/full` (circle) or `Radius/control` (rounded).
Layers (all absolute except the content, which is centred): `image` (0,0, same size and radius) · `stroke` (`Border/subtle` rectangle INSIDE, **0.5px at 2xs and xs**, 1px for the rest, above the content) · `ring` (hidden: −4,−4, size+8, `Border/accent` 2px INSIDE, same radius) · `status` (AvatarStatus instance in the bottom-right corner: x = size − dot).
Dot per size: 2xs·xs·sm → xs (6) · default → sm (8) · lg → default (10) · xl·2xl → lg (12).
Initials: text `Type/avatar-2xs … 2xl` = **8 · 10 · 12(Type/label) · 14 · 16 · 18 · 20 px**, Medium, line height 100 %, WITHOUT variables (loose styles): `fontLiteral` recipe. 2xs carries a single letter ("A"), the rest two. Icon 10 · 14 · 18 · 20 (`Size/icon-md`) · 24 (`icon-lg`) · 28 · 32.

## Color (identical at every size and shape — checked across all 350 variants)
| Variant | soft: fill · ink | solid: fill · ink |
|---|---|---|
| secondary | `Surface/muted` · `Content/secondary` | `Surface/inverse` · `Content/inverse` |
| default | `Surface/accent` · `Content/accent` | `Action/primary/default` · `Content/on-action` |
| info · success · warning · critical | `Status/<s>/surface` · `Status/<s>/content` | `Status/<s>/surface-solid` · `Status/<s>/on-solid` |

## The odd bits of the file
- The `Type/avatar-*` styles are not bound to variables (literals). Recipe: `fontLiteral` prop (not a token).
- The 0.5px border at 2xs/xs is a literal: `hairline` prop.
- The photo is a stock image (`_AvatarPhoto`): in code `src`; the specimen replaces it with the system gradient.
- The `Size/control-*` variable does not exist for 2xs/2xl: scale steps are used (`spacing.4`, `size.2xl`).

# AvatarStatus (377:54, 20 variants: Status × Size)
`Status` online · busy · away · offline · do-not-disturb × `Size` xs · sm · default · lg → circle 6 · 8 · 10 · 12 (`Radius/full`), `Surface/page` stroke **OUTSIDE** 1px (xs, sm) / 2px (default, lg). Fill: `Status/success/surface-solid` · `Status/critical/surface-solid` · `Status/warning/surface-solid` · `Content/subtle` · `Status/critical/surface-solid` + `Status/critical/on-solid` bar (do-not-disturb: width = half, height 1·1·2·2, centred). Recipe: `outerStroke` + `outerStrokeWidth` props (outer stroke = spread shadow without blur: the box does not grow).

# AvatarGroup (378:2507, 14 variants: Size × Shape)
Row (HORIZONTAL, centred) of 4 `Avatar` + one `action` chip ("+3"). Each item is a `Surface/page` frame with padding 1 (2xs · xs) · 2 (sm … xl) · 3 (2xl) and the avatar's radius; the avatar measures size − 2·padding. Overlap: `Spacing/overlap-sm` (−4, 2xs), `overlap-md` (−8, sm · default); **xs −6, lg · xl −12, 2xl −16 are literals** (steps `spacing.1_5/3/4`; recipe `overlap` → `--escala-overlap`, negative margin). Chip: `Surface/inverse` + `Content/inverse`, text `Type/avatar-*` (sm: `Type/label`). Measured widths = Figma: 74 · 106 · 148 · 188 · 212 · 252 · 286.
