# Contract · Accordion + AccordionItem (Figma to code) — READ (2026-11-12)

Source: `AccordionItem` (`451:188`, 18 variants: Variant × State) and `Accordion` (`451:375`, 6 variants: Variant). **Figma rules.**

## AccordionItem — API
`IconVisible` BOOLEAN true · `Icon` swap (House) · `Label` TEXT `Accordion title` · `Content` TEXT `Accordion content goes here. Add supporting detail for this section.` · `Variant` ghost-default · ghost-underline · ghost-rounded · outline-rounded · outline-sharp · filled-rounded (default ghost-default) · `State` Closed · Open · Disabled (default Closed).
Description: "trigger (optional icon, label, chevron that flips when open) and collapsible content."

## Structure (480 wide, vertical auto-layout, FILL horizontal)
`root` (V, gap 0, no padding) → `trigger` (H MIN/CENTER, gap `Spacing/gap-group` 16, padding Y `inset-surface` 20, X 0 or 20 depending on the variant; height 60) with `icon` (20, `Size/icon-md`, ink `Content/secondary`) · `label` (`Type/label`, `Content/primary`, fills) · `chevron` (20 frame, `CaretDown` caret 20 `Content/secondary`; rotates when open) → `content` (V, gap `gap-tight` 4, padding bottom 20, X 0/20; hidden in Closed and Disabled) with `content text` (`Type/body-md`, `Content/secondary`).
Measurements: ghost-default Closed 480×60 / Open 480×101 (content 41 = 21 of text + 20 padding) ; ghost-rounded Open 480×122 (content 62 = 42 of text at 440 wide + 20) .
## Variants (everything else the same)
| Variant | Radius | Fill | Stroke | Padding X trigger / content |
|---|---|---|---|---|
| ghost-default | 0 | — | — | 0 / 0 |
| ghost-underline | 0 | — | bottom only 1px `Border/default` INSIDE (height +1: 61 / 102) | 0 / 0 |
| ghost-rounded | `Radius/container` (16) | Closed: —; Open: `Surface/layer-1` (Figma 450:78, 2026-11-20) | — | 20 / 20 |
| outline-rounded | container | `Surface/layer-1` (Figma 450:98, 2026-11-20) | 1px INSIDE: Closed `Border/default`, Open `Border/strong`, Disabled `Border/subtle` (height +2: 62 / 124; trigger 478 wide) | 20 / 20 |
| outline-sharp | `Radius/none` | `Surface/layer-1` | same as outline-rounded | 20 / 20 |
| filled-rounded | container | `Surface/muted` (always) | — | 20 / 20 |
| card | `Radius/none` | — | bottom only 1px (`Stroke/divider`) `Border/subtle` INSIDE, every state | `inset-surface` / `inset-surface` |
Disabled: icon, label and caret `Content/disabled` (the content is still `Content/secondary` but hidden). No hover/focus/pressed states in the file.

### card (Figma `2121:2677` Closed · `2121:2696` Open · `2121:2713` Disabled; read 2026-11-20)
A denser item, everything else as above: trigger padding Y `Spacing/inset-control` (12), gap `gap-group`; the glyph sits in an
`icon-box` (`Size/control-sm` 32 square, `Radius/action`, fill `Surface/muted`; Disabled `Action/disabled/default`) holding the 20
glyph; label `Type/label`; content padding X `inset-surface`, bottom `inset-control`, a horizontal row (gap `gap-group`) of an
`icon-offset` (`Size/control-sm` wide) and the text in `Type/body-sm`, `Content/secondary`. Heights: Closed 57 (56 + the 1px rule),
Open 119. Odd but copied: IconVisible hides only the icon box, so the content stays indented by the offset. The set also has a
`BadgeVisible` property (a hidden `Badge` soft/pill/sm) on every variant that code does not build yet.

## Accordion — API and structure
Only `Variant` (7 values). `card` (`2121:2730`): the Accordion is the frame — `Surface/layer-2`, 1px `Border/default` INSIDE (`Stroke/divider`), `Radius/container`, clips content, gap `Spacing/none`; items are 478 wide and the last one drops its bottom rule (an instance override in the file). Stack of 3 `AccordionItem` with the same Variant; the first Open, the others Closed; items open/closed independently (type multiple). Gap: `Spacing/none` (0) in ghost-default and ghost-underline; `Spacing/gap-control` (8) in ghost-rounded, outline-rounded, outline-sharp, filled-rounded. Width 480 (FILL). Sample texts: "What is Escala?" / "Escala is a design system with tokens, components and docs that stay in sync between Figma and code."; "How do design tokens sync?" / "Variables map to CSS custom properties through a token pipeline."; "Can I customize the theme?" / "Yes. Swap variable modes for color, shape and density." Sample icons: `107:1965` in the Accordion's items.
Hover/focus: none in the file.

## Status
Built: ACCORDION (gap) + ACCORDION_ITEM (root · trigger · icon · label · chevron · content) recipes, `accordion.tsx` (Radix multiple; the Accordion carries the value and the Variant in a context, the item computes Open / Disabled), catalogue, store v136, specimens, story. About's `ui/accordion` (shadcn) is left untouched.
