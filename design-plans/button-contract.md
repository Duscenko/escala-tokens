# Contract · Button and IconButton (F1)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, sets `Button` (`4:5066`)
and `IconButton` (`614:785`), read with the Plugin API after moving to
`Variant` × `Appearance`. This document is what F2 (code) and F3 (plugin) copy.

## API

| Figma | React (`Button`) | React (`IconButton`) |
|---|---|---|
| `Variant` default · secondary · critical | `variant` (default `default`) | same |
| `Appearance` solid · outline · ghost · link | `appearance` (default `solid`) | same |
| `Size` default · xs · sm · lg | `size` (default `default`) | same |
| `State` Hover · Pressed · Focused | CSS (`:hover`, `:active`, `:focus-visible`); `forceState` for docs | same |
| `State` Loading · Disabled | `loading` · `disabled` | same |
| `Label` (TEXT) | `children` | — (no text: `aria-label` required) |
| `IconLeadingVisible` + `IconLeadingIcon` | `leading?: ReactNode` | — |
| `IconTrailingVisible` + `IconTrailingIcon` | `trailing?: ReactNode` | — |
| `Icon` (INSTANCE_SWAP) | — | `icon: ReactNode` |
| `BadgeVisible` | — | `badge?: ReactNode` (number or dot, top right) |
| — | `asChild` (Radix Slot, for links) | same |

Old (shadcn) values still accepted in code **only as migration aliases**,
not shown in the catalogue or docs: `variant="outline|ghost|link|destructive"`,
`size="icon|icon-xs|icon-sm|icon-lg"` (→ IconButton). They are removed when no
call remains.

## Geometry (per size)

| Size | Height / IconButton width | Padding X (Button) | Gap | Icon |
|---|---|---|---|---|
| xs | `size.hit` (Size/control-xs, 24) | `spacing.inset-control` | `spacing.gap-tight` | `icon.small` (Size/icon-sm) |
| sm | `size.compact` (control-sm, 32) | `spacing.inset-control` | `spacing.gap-control` | `icon.small` |
| default | `size.control` (control-md, 40) | `spacing.inset-action` (16 · 16 · 12) | `spacing.gap-control` | `icon.medium` |
| lg | `size.touch` (control-lg, 48) | `spacing.inset-action` (16 · 16 · 12) | `spacing.gap-control` | `icon.large` |

Common: radius `radius.action`, border `stroke.control`, focus `stroke.focus`, text
`type.button`. IconButton: padding 0, width = height.

**Changes with respect to today's code:** padding X was a ladder (spacing.2 · 3 · 4 · 5);
Figma uses `inset-action` at default and lg and `inset-control` at xs, sm and in `link` (DEC-2026-11-18-007). The xs gap was `spacing.1`; Figma has
`gap-tight`.

## Color per combination and state

Ink = text and icons (they share `currentColor`). Disabled: fill `action.disabled.default`
on the solids, border `border.control` on the outlines, ink `content.disabled`.

| Variant · Appearance | Default | Hover | Pressed | Focus |
|---|---|---|---|---|
| default · solid | fill `action.primary.default` · ink `content.on-action` (+ `text-shadow 0 1px 0` black 15 %, Button only) | `action.primary.hover` | `action.primary.pressed` | ring `border.ring.default` |
| default · outline | stroke `border.accent` · ink `content.accent` | + fill `action.ghost.hover` | + `action.ghost.pressed` | ring `border.ring.default` |
| default · ghost | ink `content.accent` | fill `action.ghost.hover` | `action.ghost.pressed` | ring `border.ring.default` |
| default · link | ink `content.link.default` | ink `content.link.hover` | ink `content.link.hover` | ring `border.ring.default` |
| secondary · solid | fill `action.secondary.default` · ink `content.on-secondary` | `.hover` | `.pressed` | ring `border.ring.neutral` |
| secondary · outline | stroke `border.control` · ink `content.primary` | + fill `action.ghost.hover` | + `action.ghost.pressed` | ring `border.ring.neutral` |
| secondary · ghost | ink `content.primary` | fill `action.ghost.hover` | `action.ghost.pressed` | ring `border.ring.neutral` |
| secondary · link | ink `content.secondary` | ink `content.primary` | ink `content.primary` | ring `border.ring.neutral` |
| critical · solid | fill `status.critical.surface-solid` · ink `status.critical.on-solid` | `-hover` | `-pressed` | ring `status.critical.ring` |
| critical · outline | stroke `status.critical.border-strong` · ink `status.critical.content` | + fill `action.ghost.hover` | + `action.ghost.pressed` | ring `status.critical.ring` |
| critical · ghost | ink `status.critical.content` | fill `action.ghost.hover` | `action.ghost.pressed` | ring `status.critical.ring` |
| critical · link | ink `status.critical.content` | + underline | + underline | ring `status.critical.ring` |

**Focus, the same on every appearance (owner's decision, 2026-11-17):** the button keeps its Default look
and gains ONE 2 px ring (`stroke.focus`), 1 px outside the border with the page showing in the gap and radius + 1,
in the intent's color: `border.ring.default` (accent) · `border.ring.neutral` (neutral, new role) ·
`status.critical.ring` (critical), all three at Alpha/06 of their family, each mode in its twin. Nothing inside.
Figma: the `focus-ring` layer (absolute, STRETCH) is 1 px larger than the button on each side, OUTSIDE stroke.
CSS: `outline: 2px solid <ring>; outline-offset: 1px`.
Loading = Default with a spinner in place of the leading icon.

**Rule:** code copies the file as is; Figma is not edited to make it coherent.

## Solids, Create UI style (2026-11-17, owner's decision)

Button 4:5066 and IconButton 614:785, `Appearance = solid`, all three intents:
- **No outer stroke in any state** (before: 1 px in the Pressed tone). The fill is the control.
- Top highlight `elevation.highlight` (style `Highlight/solid`: 1 px, inset; it was 2 px until 2026-11-19) in every state except Disabled.
- **Focus:** see above — a ring separated by 1 px, the same as the other appearances (recipe `gapRing`).
- The Button label carries `text-shadow 0 1px 0.5px Elevation/shadow-ambient` (`Shadow/text-2xs`, 5 % in Light; it was black 15 % with no token until 2026-11-19; recipe `textShadow`,
  the label is `<span data-part="Button.label">`). Disabled, flat. IconButton has no label.
- Primary in Dark: fill Dark/09 → Hover 10 → Pressed 08 (goes up on hover, down on press); the light label
  is judged by PERCEIVED contrast (APCA Lc ≥ 60, intent `action-label-perceived`), not by WCAG 4.5.
  Measured: Default 4.1:1 and Hover 3.4:1 in WCAG — **intentional**; strict WCAG is left for a future
  High contrast mode. If the hue does not reach (green, yellow, orange) it takes dark ink. Light does not change.
- Verified in Storybook (Dark and Light) with `getComputedStyle`; see `lessons.md`.

## Not covered by the contract (recorded, does not block)

- ~~In Figma the solids carry … an inner `Elevation/highlight`~~ **Done (2026-11-12):**
  recipe property `highlight` (`color.elevation.highlight`, `inset 0 1px 0 0` since 2026-11-19) in every solid
  state except Disabled, composed with the focus. Figma's "fill-colored shadow"
  is a `DROP_SHADOW 0 0 0` with spread 1 on a frame that does not clip content: Figma
  ignores the spread there and paints nothing (measured in the render's pixels). It is not copied.
- **Stroke only on `outline`** (2026-11-13): solid, ghost and link have no stroke in the file; in CSS
  they carry `stroke.none`, so that the top highlight starts at the edge as in Figma.
- **Stroke inside (2026-11-12):** Figma draws the stroke inside the frame; CSS puts it
  outside the padding. The recipe's padding subtracts the border (`--escala-stroke-width`,
  `recipeStyles.ts`), so the default Button measures 119 × 40 as in Figma.
- **Palette (owner's decision, 2026-11-12: Figma rules).** The file's palette is
  curated: for the same accent, 99 of 120 solid steps and most of the alphas differ
  from the generator (it is not just tone 11, `#6945c1` versus `#7252c9`). It is used as DATA:
  `src/lib/figmaFilePalette.generated.ts` (`npm run gen:figma-palette`, from the plugin's
  inventory) and `applyFigmaFilePalette(brand)`, which fixes the brand's ramps and alphas
  (`CustomColor.alpha` / `darkAlpha`, `pinnedOrSolvedAlpha`). Storybook uses it: the 166
  roles × mode of Color Semantics match the file (`figmaFilePalette.test.ts`).
- **Focus (owner's decision: exactly as Figma).** Button / IconButton: see "Focus, the same on every
  appearance" above (2026-11-17). Checkbox / Switch: 2 px `border.focus` border inside and 2 px
  `border.ring` halo outside. Fields (Input
  4:10640): the 1 px border stays and the 2 px halo is layered on it (1 over, 1 outside), with
  `outline` + negative `outline-offset`.
- IconButton's `BadgeVisible`: the Badge is another component; in code, `badge` accepts
  any node.
