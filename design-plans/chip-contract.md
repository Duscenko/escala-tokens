# Contrato · Chip (de Figma a código) — LECTURA (2026-11-12, en curso)

Fuente: set `Chip` (`390:10982`, 480 variantes). **Figma manda.** Descripción: «Compact tag for filter, selection or input values with an optional leading icon and close action. When CloseVisible is on, the close control needs an accessible name such as Remove plus the label, and the chip must be keyboard operable.»

## API (orden del panel · defectos)
`Label` TEXT `Chip` · `CloseVisible` BOOLEAN false · `IconLeadingVisible` false · `IconLeadingIcon` swap (Plus) · `Variant` info · success · default · critical (def. `default`) · `Appearance` outline · soft (def. `outline`) · `Size` xs · sm · default · lg · xl (def. `default`) · `State` Default · Hover · Focused · Selected · Disabled · Dragging · `Shape` rounded · pill (def. `rounded`).

## Geometría (medida; Default · outline · rounded)
| Size | Alto | Padding X | Gap | Texto | Icono (frame leading / close) | Radio |
|---|---|---|---|---|---|---|
| xs | 24 `Size/control-xs` | 8 `gap-control` | 4 `gap-tight` | `Type/caption` | 16 `icon-sm` | `Radius/control` |
| sm | 32 `control-sm` | 8 | 4 | `Type/label` | 16 | control |
| default | 40 `control-md` | 12 `inset-control` | 4 | `Type/label` | 20 `icon-md` | control |
| lg | 48 `control-lg` | 12 | 8 `gap-control` | `Type/body-md` | 20 | `Radius/action` |
| xl | 56 `control-xl` | 16 `gap-group` | 8 | `Type/body-lg` | 24 `icon-lg` | `Radius/container` |
Pill = `Radius/full`. Capas: `leading` (frame del icono, oculto) · `label` · `close` (frame, oculto). Outline: trazo 1px INSIDE que cuenta en el layout (53 vs 51 de ancho en default). Focused: trazo 1px + `focus-ring` abs OUTSIDE 2px `Border/ring/default` (halo).

## Color (invariante de Size y Shape)
| Variant/Appearance | Default | Hover | Focused | Selected | Disabled | Dragging |
|---|---|---|---|---|---|---|
| default · outline | trazo `Border/control`, tinta `Content/primary` | fill `Surface/muted`, trazo `Border/control-hover` | trazo `Border/focus`, ring `Border/ring/default` | fill `Surface/selected`, trazo `Border/accent`, tinta `Content/accent` | trazo `Border/subtle`, tinta `Content/disabled` | fill `Surface/layer-1`, trazo `Border/strong`, `Shadow/sm` |
| default · soft | fill `Surface/muted` | `Surface/muted-hover` | fill muted + trazo `Border/focus` + ring | selected / accent / accent (igual) | fill `Action/disabled/default`, tinta disabled | fill `Surface/muted-hover`, trazo `Border/strong`, `Shadow/sm` |
| status · outline | trazo `Status/s/border`, tinta `Status/s/content` | fill `Status/s/surface`, trazo `border-strong` | trazo `border-strong`, ring `Status/s/border` | fill `surface-pressed`, trazo `border-strong` | trazo `Border/subtle`, tinta disabled | fill `surface`, trazo `border-strong`, `Shadow/sm` |
| status · soft | fill `Status/s/surface` | fill `surface-pressed` | fill surface, trazo `border-strong`, ring `Status/s/border` | fill `surface-pressed`, trazo `border-strong` | fill `Action/disabled/default`, tinta disabled | fill `surface-pressed`, trazo `border-strong`, `Shadow/sm` |
`Shadow/sm` en Dragging = `0 0 0 1 · 0 1 3 · 0 1 2 −1` (alfas .05 / .10 / .10): los spreads no se pintan (marco sin clip) → queda `0 1 3` + `0 1 2`.

## Estado
Contrato leído; falta construir (receta, componente, catálogo, store v136, specimens, parity, story, medida).

## Actualización (construido)
Estado: receta `CHIP` (4 slots: root · leading · label · close; tres partes: geometría Size × Shape, padding +trazo Size × Appearance × State, pintura Variant × Appearance × State), componente `chip.tsx` (dos botones hermanos), catálogo con los ejes del archivo, specimen con `Interactive` opt-in para el tablero. `Dragging` = `lift: 'drag'` (`0 1 3 + 0 1 2`, sin spreads). Los callers del Chip viejo (Selected · Dismissible · sm/default) se movieron: `Dismissible` → `CloseVisible`, `Selected` → `State Selected`.
