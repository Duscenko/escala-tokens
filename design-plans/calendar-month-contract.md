# Contrato · CalendarMonth (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Calendar (✓)`, set `CalendarMonth`
(`422:1713`, 12 variantes), leído con `figma-read-set.js` (adaptado) + lecturas de las celdas (solo lectura). **Figma manda; nada se corrige.**

Descripción del set: «One visible month (Sunday start, 5 weeks) of CalendarDay instances. Mode single | multiple | range × Variant default | secondary. Width = 7 day cells.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Mode` single · multiple · range | VARIANT | `single` | `mode` (`data-mode`) |
| `Variant` default · secondary | VARIANT | `default` | `variant` (`data-variant`, se pasa a cada CalendarDay) |

El set no tiene propiedades TEXT / booleanas / swap. Extras de código: `month`, `today`, `selected`, `range`, `disabledDays`, `unavailableDays`, `onDayClick` (sin ellos se pinta la muestra del archivo: noviembre de 2026).

## Geometría
Raíz: frame VERTICAL, sin relleno, trazo, efectos, padding ni gap; ancho fijo = 7 celdas del día.

| Size | Raíz | Fila de nombres (`weekdays`) | Semana (`week-N`) | Celda |
|---|---|---|---|---|
| default | 280×240 (7 × `Size/control`) | 280×40, 7 cuadros 40×40 | 280×40 × 5, gap 0 | CalendarDay 40 |
| sm | 224×192 (7 × `Size/compact`) | 224×32, 7 cuadros 32×32 | 224×32 × 5, gap 0 | CalendarDay 32 (`Size=sm`) |

- Nombres: `Su Mo Tu We Th Fr Sa` (domingo primero), `Type/caption` (11 px) en `Content/secondary`, centrados en su cuadro; igual en los dos tamaños.
- Semanas: filas HORIZONTAL de 7 instancias `CalendarDay`; noviembre 2026 empieza en domingo → 5 filas, la última con 1–5 de diciembre (`Outside`).

## Estados de las celdas por Mode (idénticos en Size y Variant; `Variant` solo se pasa a la celda)
Común: día 7 `Today`, 24 y 25 `Disabled`, 27 `Unavailable`, 1–5 dic `Outside`, el resto `Default`.
- single: 12 `Selected`.
- multiple: 4, 12, 19, 30 `Selected`.
- range: 10 `RangeStart`, 11–17 `RangeMiddle`, 18 `RangeEnd` (la fila 2 termina en 14 y la 3 sigue en 15: la banda cruza filas).
`IndicatorVisible` false en todas.

## Lo raro del archivo
- La muestra mezcla estados que no pueden coexistir en un calendario real (Today sin Selected en el 7, Unavailable y Disabled juntos): se copia como muestra; el componente la usa solo cuando no recibe datos.
- Mode no cambia la geometría ni el color propio del mes: solo qué celdas son Selected / Range*.
- Ninguna pieza tiene hover/focus propio (los tienen las celdas CalendarDay).
