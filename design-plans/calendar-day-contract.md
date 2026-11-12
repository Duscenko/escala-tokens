# Contrato · CalendarDay (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Calendar (✓)`, set `CalendarDay`
(`421:309`, 44 variantes), leído con `figma-read-set.js` (adaptado) + un barrido de celdas (solo lectura). **Figma manda; nada se corrige.**

Descripción del set: «Calendar day cell. Size default 40 / sm 32 × State Default, Hover, Today, Selected, RangeMiddle,
RangeStart, RangeEnd, Outside, Disabled, Unavailable, Focused × Variant default | secondary. Day shape (rounded | pill |
square) is an instance override. Indicator toggles the dash under the date.»

> Estado: HECHO (2026-11-12). Medido en Storybook, Escala Light y Dark: las 44 combinaciones (caja, relleno, tinta, trazo,
> halo, banda y su posición) coinciden con los roles de la tabla; la raya (indicator) en x14 y34 12×2 como el archivo.

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `State` Default · Hover · Today · Selected · RangeMiddle · RangeStart · RangeEnd · Outside · Disabled · Unavailable · Focused | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `state` (estados de datos) + `forceState` (docs) |
| `Variant` default · secondary | VARIANT | `default` | `variant` |
| `Day` | TEXT | `"15"` | `children` |
| `IndicatorVisible` | BOOLEAN | `false` | `indicator` |
| (override de instancia) forma | — | rounded | `shape` rounded · pill · square (`data-shape`) |

## Geometría
Raíz: frame HORIZONTAL centrado, sin relleno ni trazo, `clipsContent: false`. Hijos de atrás a delante: `range-band` (absoluto, solo
en RangeMiddle/Start/End), `cell` (frame llena la raíz, `Radius/action`), `Day` (texto), `indicator-dash` (absoluto), `focus-ring`.

| Size | Caja | Texto | Raya |
|---|---|---|---|
| default | `Size/control` 40×40 | `Type/body-md` (16×21) | 12×2 en x14 y34 (= 4px del borde inferior) |
| sm | `Size/compact` 32×32 | `Type/body-sm` (13×18) | 12×2 en x10 y26 |

Banda (alto = caja): RangeMiddle toda la caja; RangeStart la mitad derecha (x = caja/2); RangeEnd la izquierda (x 0). Sin radio.
Raya: ancho `spacing.3` (12), alto `spacing.0_5` (2), sin radio.

## Color por estado × variante
| Estado | default · relleno / tinta / trazo | secondary |
|---|---|---|
| Default · Outside | sin relleno · `Content/primary` · `Content/secondary` | igual |
| Hover | `Action/ghost/hover` · `Content/primary` | igual (también `Action/ghost/hover`) |
| Today | trazo `Border/accent` 1 INSIDE · `Content/primary` | `Border/strong` 1 |
| Selected · RangeStart · RangeEnd | `Action/primary/default` · `Content/on-action` | `Surface/inverse` · `Content/inverse` |
| RangeMiddle | tinta `Content/accent`, banda `Surface/selected` | tinta `Content/primary`, banda `Surface/muted` |
| Disabled · Unavailable | tinta `Content/disabled` (idénticos) | igual |
| Focused | trazo `Border/focus` 2 INSIDE + halo `Border/ring/default` 2 OUTSIDE · `Content/primary` | `Border/strong` 2 + halo `Border/subtle` |
Raya: `Border/accent` (default) · `Border/strong` (secondary). RangeStart/End llevan además banda (`Surface/selected` · `Surface/muted`).

## Lo que el archivo hace y parece raro (se copia igual)
- Disabled y Unavailable son idénticos (ambos `Content/disabled`, sin tachado ni fondo): el código los dibuja igual y ambos desactivan el botón.
- Hover y Today/Selected no se combinan: un estado de datos fijado detiene las reglas del puntero (un día elegido no tiene hover).
- La variante secondary usa `Action/ghost/hover` en Hover pero `Border/strong` en Today/Focused y `Surface/inverse` para el día elegido.
- sm lleva `Radius/action` (12) igual que default: en un cuadrado de 32 ya es casi un círculo; se copia.
- En `Size=default, State=Default, Variant=secondary` el texto `Day` y la raya no están enlazados a sus propiedades (`componentPropertyReferences` vacío): esa variante ignoraría `Day` / `IndicatorVisible` en una instancia. El código siempre los respeta.
- `Day shape` (rounded | pill | square) no es una propiedad: es un override de instancia, y aquí es la prop `shape` (`radius.action` · `radius.pill` · `radius.none`).
- El texto mide 18×21 en el navegador contra 16×21 en Figma (la fuente de Storybook no es la del archivo); el alto coincide.

## Anida
Nada (es una hoja). Lo usan `CalendarMonth` (`422:1713`) y, a través de él, `Calendar` (`424:4667`): el Calendar de la sesión 8 debe componerlo (hoy `calendar.tsx` conserva `CalendarDayButton` de react-day-picker).
