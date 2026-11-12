# Contrato · NumberInput (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ NumberInput (✓)`, set
`NumberInput` (`1107:243`, 15 variantes), leído con `use_figma` (solo lectura). **Figma manda;
nada se corrige.** Sustituye al `InputStepper` del esqueleto shadcn (renombrado: el ledger lo
tenía como `rename`).

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Disabled | VARIANT | `Default` | Hover / Focused del puntero y teclado; Invalid = `aria-invalid`; Disabled = `disabled`; `forceState` fija uno |
| `Value` | TEXT | "1" | `value` / `defaultValue` (+ `min`, `max`, `step`, `onValueChange`) |
| `decrement` / `increment` (instancias expuestas) | IconButton | `Minus` / `Plus` | `decrementIcon` / `incrementIcon` |

El valor es un `spinbutton` (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`); Arrow Up / Down
lo mueven. Los botones se llaman Decrease / Increase y no son paradas de tabulación. En el mínimo
o el máximo el botón correspondiente pasa a `State=Disabled` (lo dice la descripción del set).

## Geometría

| Size | Caja | Botones (IconButton secondary · ghost) | Valor |
|---|---|---|---|
| sm | 96 × `Size/control-sm` 32 | `Size=xs` 24 | 38 de ancho |
| default | 120 × `Size/control-md` 40 | `Size=sm` 32 | 46 |
| lg | 144 × `Size/control-lg` 48 | `Size=default` 40 | 54 |

Caja: HORIZONTAL, gap `Spacing/none`, padding X `Spacing/gap-tight` (4) con el trazo en el layout
(`strokesIncludedInLayout`: el contenido empieza en 5), radio `Radius/action`, trazo 1px INSIDE.
Ancho = 3 alturas de control (no hay token: en la receta `size.X+size.X+size.X`). Valor: FILL,
centrado, `Type/placeholder`, recorta.

## Color por estado

| State | Relleno | Trazo | Halo (2px FUERA) | Valor · botones |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` |
| Hover | `Surface/input` | `Border/control-hover` | — | idem |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | idem + cursor |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | idem |
| Disabled | `Action/disabled/default` | `Border/control` | — | `Content/disabled`, botones Disabled |

## Lo que el archivo hace y parece raro (se copia igual)
- El halo de Focused e Invalid está trazado FUERA (no a caballo del borde como el del Input).
- Invalid lleva halo siempre, sin foco.
- Disabled pinta solo `Action/disabled/default` (sin `Surface/input` debajo).
- El ancho fijo no está atado a ninguna variable.

## Anida
`IconButton` (hecho).
