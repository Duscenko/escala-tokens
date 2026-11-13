# Contrato · DropdownMenu, DropdownMenuLabel, DropdownMenuItem, DropdownMenuFooter (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ DropdownMenu»: `DropdownMenu` (947:299, 3), `DropdownMenuFooter`
(949:3290, 6), `DropdownMenuItem` (947:161, 21), `DropdownMenuLabel` (947:169, 3). Solo lectura. Prototipos (954:2275, 960:3289) sin leer.
Ledger: DropdownMenu rebuild; las otras tres, parts. Código hoy: `escala-ui/dropdown-menu.tsx` (shadcn) + su receta.

## API (orden del panel, variantes primero)
| Set | Propiedades |
|---|---|
| DropdownMenu | `Size` sm · default · lg (def default) · `HeaderVisible` false · `Header` SLOT (un Input de búsqueda: Input size sm/default/lg, type default, placeholder "Search", icono lupa) · `Content` SLOT (labels, items, separadores) · `FooterVisible` false (+ footer) |
| DropdownMenuLabel | `Size` sm · default · lg · `Label` TEXT "Action" (mayúsculas por Type/caption: el texto se escribe tal cual) |
| DropdownMenuItem | `Size` sm · default · lg · `State` Default · Focused · Selected · Disabled · `Variant` default · destructive · `Label` "Option" · `DescriptionVisible` false / `Description` "Secondary text" · `IconLeadingVisible` false / `IconLeadingIcon` (swap) · `TrailingVisible` false / `Trailing` "⌘K" · `IndicatorVisible` true (el check de Selected) · `MediaVisible` false / `Media` SLOT (Avatar image 2xs / xs) · `ControlVisible` false / `Control` SLOT (Switch xs / sm) · `IconTrailingVisible` false / `IconTrailingIcon` (CaretRight) |
| DropdownMenuFooter | `Layout` inline · stacked · `Size` default · sm · lg · `LeadingVisible` true / `Leading` SLOT ("12 of 40 selected", caption, Content/secondary) · `ActionsVisible` true / `Actions` SLOT (Clear secondary solid + Apply default solid; Button xs / sm / sm en sm / default / lg) |

## Geometría
**DropdownMenu** (VERTICAL, ancho FIJO 256, alto HUG, clip): `Radius/overlay` 16, fill `Surface/layer-2`, trazo `Border/default` 1 INSIDE, Shadow/md
con ring y spreads (el frame clipa: `0 0 0 1 ring`, `0 4 6 −1 key`, `0 2 4 −2 ambient`; mismo `lift: popover-md`). Hijos: `Header` (oculto; padding
`gap-tight` 4; un Input FILL, alto 32 / 40 / 48 según size), `Content` (padding `gap-tight` 4, gap 0, FILL), `footer` (oculto, instancia DropdownMenuFooter).
Alto con el ejemplo: 139 (sm) · 171 (default) · 203 (lg) = Content 137 / 169 / 201 + 2 de borde: label 24 + 3 items + separador 9 + item.
**Label**: 256×24 (FIXED/HUG), padding Y `gap-tight` 4, X `gap-control` 8 (sm, default) / `inset-control` 12 (lg); texto `Type/caption` `Content/secondary`, 16 alto.
**Separator** dentro del Content: frame con padding Y `gap-tight` 4, un `Separator` horizontal tone subtle (1px) → 9 de alto.
**Item** (HORIZONTAL MIN/CENTER, ancho FIXED 256 / FILL en el menú, alto HUG, radio `Radius/control` 8): padding Y `gap-tight` 4; X `gap-control` 8 (sm, default) /
`inset-control` 12 (lg); gap: sm `gap-tight` 4, default y lg `gap-control` 8. Altos: sm 24 · default 32 · lg 40. Hijos en orden: `icon-leading` (Icon sm 16 /
md 20 en lg, oculto), `Media` (SLOT, oculto: Avatar image 16 `2xs` en sm/default, 24 `xs` en lg), `text` (VERTICAL FILL: `label` — sm `Type/caption`, default `Type/body-sm`,
lg `Type/body-md`, `Content/primary` — y `description` `Type/caption` `Content/secondary`, oculto), `trailing` (texto `Type/caption` `Content/secondary`, oculto),
`Control` (SLOT oculto, Switch xs / sm), `icon-trailing` (CaretRight, `Size/icon-sm`/`md`, `Content/secondary`, oculto), `icon-indicator` (solo Selected: Check, `Content/accent`, 16 /
20, al final).
Estados (default): **Default** sin relleno; **Focused** fill `Surface/muted`, trazo `Border/focus` 2 INSIDE + un `focus-ring` ABSOLUTE (stroke `Border/ring/default` 2 OUTSIDE,
mismo radio) → 2px de halo exterior; con el trazo dentro, el icono leading queda en x 10 (8 + 2). **Selected** fill `Surface/selected`, check visible a la derecha
(el texto se reduce 24: `text` 216). **Disabled** label, description y trailing `Content/disabled`. **destructive**: label `Status/critical/content`; Focused: fill
`Status/critical/surface`, trazo `Status/critical/border-strong`, halo `Status/critical/border`; Disabled igual que el default.
**Footer**: igual que PopoverFooter (256, padding 8, gap 8, trazo superior `Border/subtle` DENTRO del padding: 40 / 48 / 56 inline; 96 / 112 / 128 stacked, botones
FILL en stacked: Clear primero, Apply después).

## Raro (se copia igual)
- El item default `Size=default` lleva `IndicatorVisible` true pero el check solo existe en Selected.
- En lg el Switch del Control es `Size=sm`, en sm/default `Size=xs` (selector-sm 16 de alto en ambos).
- El Focused destructive cambia la familia entera (surface/border-strong/border críticos).
- El `Header` es un Input real (Input size = size del menú).

## Anida
Input (search), Avatar (2xs / xs, image), Switch (xs / sm), Separator (horizontal subtle), Button (xs / sm / default), iconos CaretRight y Check.
