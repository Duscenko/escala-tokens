# Contrato · Calendar (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Calendar (✓) (D)`, set `Calendar`
(`424:4667`, 18 variantes), leído en solo lectura. **Figma manda; nada se corrige.** Sustituye al Calendar shadcn /
react-day-picker (`calendar.tsx` ya no lo importa; la dependencia sigue en `package.json`, sin uso).

Descripción del set: «Date selection panel: CalendarHeader, CalendarMonth, optional CalendarPresets (PresetsVisible) and CalendarFooter (FooterVisible). Size default (314 px) / sm (250 px), Mode single / multiple / range, Header single / multiple / plain. Date Picker wraps it with an input trigger.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Mode` single · multiple · range | VARIANT | `single` | `mode` (`data-mode`) |
| `Header` single · multiple · plain | VARIANT | `single` | `header` (`data-header`) |
| `FooterVisible` | BOOLEAN | false | `footer` |
| `PresetsVisible` | BOOLEAN | false | `presets` |

Extras de código: `value` / `defaultValue` / `onValueChange` (Date · Date[] · { from, to } según el modo), `month` /
`defaultMonth` / `onMonthChange`, `today`, `disabledDays`, `unavailableDays`, `onApply`, `variant` (se pasa a las celdas y
al riel), `children` (debajo del mes, dentro del cuerpo: el evento del día en el tablero). Sin mes ni valor muestra la
muestra del archivo (noviembre 2026, hoy el 7, 24–25 Disabled, 27 Unavailable, la selección de CalendarMonth).

## Geometría

| | default | sm |
|---|---|---|
| Raíz (sin presets ni pie) | 314×314 | 250×254 |
| Cuerpo | 312×312, padding 16 (primitiva «16» → `spacing.4`), gap 8 (`spacing.2`) | 248×252, padding 12 (`spacing.3`), gap 8 |
| Cabecera / mes | 280×32 en 17,17 · 280×240 en 17,57 | 224×28 en 13,13 · 224×192 en 13,49 |
| Presets (visibles) | 160 de ancho, alto de la columna | 140, alto de la columna |
| Pie (visible) | CalendarFooter 312×72 bajo el cuerpo | 248×56 |

- Raíz HORIZONTAL: [presets] [columna = cuerpo + pie]. Relleno `Surface/layer-1`, `Border/default` 1 px (`Stroke/divider`)
  en los cuatro lados, INSIDE; `Radius/container` (16); recorta su contenido.
- Partes: CalendarHeader `422:355`, CalendarMonth `422:1713` (Variant default), CalendarPresets `423:988` (Variant default),
  CalendarFooter `423:963`, todas al `Size` del Calendar.

## Comportamiento (código, el archivo no lo dibuja)
- single: un clic elige el día · multiple: cada clic añade o quita · range: el primer clic abre, el segundo cierra (en
  cualquier orden); un rango de un solo día se pinta Selected.
- Flechas de la cabecera: mes anterior / siguiente. Un clic en un día de otro mes cambia a ese mes.
- Presets: rangos contados desde `today` (Today, Yesterday, Last 7 days, Last 30 days, This month); se resalta el que
  coincide con el rango elegido.
- Pie: Today va al mes de hoy (y lo elige fuera de range), Clear vacía, Apply llama `onApply(value)`.
- Teclado: un solo día toma Tab (la selección, si no hoy, si no el primero del mes); ←→↑↓ mueven entre días habilitados.
  Cada día se nombra con su fecha completa y lleva `aria-pressed` si está elegido.

## Lo raro del archivo
- El cuerpo del set va atado a primitivas sueltas («16», «12», «8»), no a roles.
- En el DatePickerPopover (`425:2276`), la instancia del Calendar sobrescribe el padding del cuerpo con
  `Spacing/inset-surface` (20) en Size default: el cuerpo pasa a 320 y el panel a 322×394 · 482×394, pero el pie sigue
  midiendo 312 (queda 8 px corto por la derecha). En sm no hay override (12). Se copia tal cual (`date-picker.tsx`).
- Presets: en el set es un rectángulo fijo 160×384; en el popover se estira a la columna (392 · 308). En código se estira
  siempre a la altura de la columna (coincide con todas las instancias del archivo que lo muestran).

## Medido (Storybook, Escala Light y Dark)
Las 6 combinaciones Size × Mode del set y las 4 del popover cuadran al píxel con Figma (tamaños de raíz, cuerpo, cabecera,
mes, presets, pie). Relleno `#f5f4f6` / `#18161a` y borde `#000000@0.15` / `#ffffff@0.15`, iguales a los del archivo.
