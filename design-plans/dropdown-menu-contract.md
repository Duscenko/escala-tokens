# Contract · DropdownMenu, DropdownMenuLabel, DropdownMenuItem, DropdownMenuFooter (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ DropdownMenu": `DropdownMenu` (947:299, 3), `DropdownMenuFooter`
(949:3290, 6), `DropdownMenuItem` (947:161, 21), `DropdownMenuLabel` (947:169, 3). Read-only. Prototypes (954:2275, 960:3289) not read.
Ledger: DropdownMenu rebuild; the other three, parts. Code today: `escala-ui/dropdown-menu.tsx` (shadcn) + its recipe.

## API (panel order, variants first)
| Set | Properties |
|---|---|
| DropdownMenu | `Size` sm · default · lg (def default) · `HeaderVisible` false · `Header` SLOT (a search Input: Input size sm/default/lg, type default, placeholder "Search", magnifier icon) · `Content` SLOT (labels, items, separators) · `FooterVisible` false (+ footer) |
| DropdownMenuLabel | `Size` sm · default · lg · `Label` TEXT "Action" (uppercase via Type/caption: the text is written as is) |
| DropdownMenuItem | `Size` sm · default · lg · `State` Default · Hover · Focused · Selected · Disabled · `Variant` default · critical (was `destructive` until 2026-11-18) · `Label` "Option" · `DescriptionVisible` false / `Description` "Secondary text" · `IconLeadingVisible` false / `IconLeadingIcon` (swap) · `TrailingVisible` false / `Trailing` "⌘K" · `IndicatorVisible` true (the Selected check) · `MediaVisible` false / `Media` SLOT (Avatar image 2xs / xs) · `ControlVisible` false / `Control` SLOT (Switch xs / sm) · `IconTrailingVisible` false / `IconTrailingIcon` (CaretRight) |
| DropdownMenuFooter | `Layout` inline · stacked · `Size` default · sm · lg · `LeadingVisible` true / `Leading` SLOT ("12 of 40 selected", caption, Content/secondary) · `ActionsVisible` true / `Actions` SLOT (Clear secondary solid + Apply default solid; Button xs / sm / sm in sm / default / lg) |

## Geometry
**DropdownMenu** (VERTICAL, FIXED width 256, HUG height, clip): `Radius/overlay` 16, fill `Surface/layer-2`, stroke `Border/default` 1 INSIDE, Shadow/md
with ring and spreads (the frame clips: `0 0 0 1 ring`, `0 4 6 −1 key`, `0 2 4 −2 ambient`; same `lift: popover-md`). Children: `Header` (hidden; padding
`gap-tight` 4; one FILL Input, height 32 / 40 / 48 by size), `Content` (padding `gap-tight` 4, gap 0, FILL), `footer` (hidden, DropdownMenuFooter instance).
Height with the example: 139 (sm) · 171 (default) · 203 (lg) = Content 137 / 169 / 201 + 2 for the border: label 24 + 3 items + separator 9 + item.
**Label**: 256×24 (FIXED/HUG), padding Y `gap-tight` 4, X `gap-control` 8 (sm, default) / `inset-control` 12 (lg); text `Type/caption` `Content/secondary`, 16 high.
**Separator** inside the Content: frame with padding Y `gap-tight` 4, one horizontal `Separator` tone subtle (1px) → 9 high.
**Item** (HORIZONTAL MIN/CENTER, FIXED width 256 / FILL in the menu, HUG height, radius `Radius/control` 8): padding Y `gap-tight` 4; X `gap-control` 8 (sm, default) /
`inset-control` 12 (lg); gap: sm `gap-tight` 4, default and lg `gap-control` 8. Heights: sm 24 · default 32 · lg 40. Children in order: `icon-leading` (Icon sm 16 /
md 20 in lg, hidden), `Media` (SLOT, hidden: Avatar image 16 `2xs` in sm/default, 24 `xs` in lg), `text` (VERTICAL FILL: `label` — sm `Type/caption`, default `Type/body-sm`,
lg `Type/body-md`, `Content/primary` — and `description` `Type/caption` `Content/secondary`, hidden), `trailing` (text `Type/caption` `Content/secondary`, hidden),
`Control` (hidden SLOT, Switch xs / sm), `icon-trailing` (CaretRight, `Size/icon-sm`/`md`, `Content/secondary`, hidden), `icon-indicator` (Selected only: Check, `Content/accent`, 16 /
20, at the end).
**Focus since 2026-11-19 (DEC-2026-11-19-001, the owner): like the Button.** Focused = the highlighted fill + ONE 2 px ring (`Stroke/focus`) separated 1 px from the row
(`gapRing`), in the intent's colour: `Border/ring/default` · `Status/critical/ring`. Nothing inside the row. The Figma file still draws the old focus (described
below) and will be brought up to date; until then code rules on this point.
States (default): **Default** no fill; **Focused** (the file's old focus) fill `Surface/muted`, stroke `Border/focus` 2 INSIDE + an ABSOLUTE `focus-ring` (stroke `Border/ring/default` 2 OUTSIDE,
same radius) → 2px of outer halo; with the stroke inside, the leading icon sits at x 10 (8 + 2). **Selected** fill `Surface/selected`, check visible on the right
(the text shrinks 24: `text` 216). **Disabled** label, description and trailing `Content/disabled`. **critical**: label `Status/critical/content`; Focused: fill
`Status/critical/surface`, stroke `Status/critical/border-strong`, halo `Status/critical/border`; Disabled same as default.
**Footer**: same as PopoverFooter (256, padding 8, gap 8, top stroke `Border/subtle` INSIDE the padding: 40 / 48 / 56 inline; 96 / 112 / 128 stacked, buttons
FILL in stacked: Clear first, Apply after).

## Odd (copied as is)
- The default item `Size=default` carries `IndicatorVisible` true but the check only exists in Selected.
- In lg the Control's Switch is `Size=sm`, in sm/default `Size=xs` (selector-sm 16 high in both).
- The file's critical Focused changes the whole family (critical surface/border-strong/border); code uses `Status/critical/surface` + `Status/critical/ring` (DEC-2026-11-19-001).
- The `Header` is a real Input (Input size = the menu's size).

## Nests
Input (search), Avatar (2xs / xs, image), Switch (xs / sm), Separator (horizontal subtle), Button (xs / sm / default), CaretRight and Check icons.
