# Contrato · InputOTP · InputOTPSlot (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ InputOTP`: sets `InputOTP`
(`416:994`, 135 variantes) e `InputOTPSlot` (`416:108`, 54 variantes), leídos en solo lectura.
**Figma manda; nada se corrige.**

## API

### InputOTP
| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` sm · default · lg | VARIANT | `default` | `size` |
| `Length` 4 · 6 · 8 | VARIANT | `4` | `length` (= `maxLength`) |
| `State` Empty · Typing · Filled · Invalid · Disabled | VARIANT | `Empty` | el código (`value`), `aria-invalid`, `disabled`; `forceState` dibuja la variante del archivo |
| `Variant` outline · filled · underline | VARIANT | `outline` | `variant` |

### InputOTPSlot
| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Size` sm · default · lg | VARIANT | `default` | `size` (dentro de InputOTP, el suyo) |
| `State` Default · Filled · Typing · Focused · Invalid · Disabled | VARIANT | `Default` | del contexto `input-otp`: con dígito Filled; activo vacío Typing (caret); activo con dígito Focused; `forceState` |
| `Variant` outline · filled · underline | VARIANT | `outline` | `variant` |
| `Digit` | TEXT | `"7"` | `digit` (fuera de InputOTP) |

## Geometría

| Size | Slot (ancho × alto) | Dígito | Caret |
|---|---|---|---|
| sm | `Size/control-sm` 32 × `Size/control-md` 40 | `Type/body-md` | 1 × 18 |
| default | `Size/control-md` 40 × `Size/control-lg` 48 | `Type/body-lg` | 1 × 20 |
| lg | `Size/control-lg` 48 × `Size/control-xl` 56 | `Type/body-xl` | 1 × 22 |

Fila: horizontal, `Spacing/gap-control` 8. Length 6 y 8: separador 8×2 (`Content/subtle`; `Content/disabled`
en Disabled) entre las dos mitades, con el mismo gap a cada lado. Radio `Radius/action`; underline `Radius/none`.
Trazo INSIDE `Stroke/control`; Typing / Focused `Stroke/focus` (2). underline: sólo el borde inferior.

## Color

| Variant · State | Fill | Stroke | Halo (2px OUTSIDE) | Dígito |
|---|---|---|---|---|
| outline · Default / Filled | `Surface/input` | `Border/control` | — | `Content/primary` |
| filled · Default / Filled | `Surface/muted` | `Border/subtle` | — | `Content/primary` |
| underline · Default / Filled | `Surface/page` | `Border/control` (abajo) | — | `Content/primary` |
| · Typing / Focused | (igual) | `Border/focus` 2px (underline: abajo) | `Border/ring/default` | caret / dígito `Content/primary` |
| · Invalid | (igual) | `Status/critical/border-strong` | — | `Content/primary` |
| outline · Disabled | `Surface/muted` | `Border/control` | — | `Content/disabled` |
| filled · Disabled | `Surface/muted` | `Border/subtle` | — | `Content/disabled` |
| underline · Disabled | `Surface/muted` | `Border/control` (abajo) | — | `Content/disabled` |

Estados de InputOTP → slots: Empty todos Default; Typing la primera mitad Filled, el slot siguiente Typing, el resto
Default; Filled / Invalid / Disabled todos en ese estado.

## Lo que el archivo hace y parece raro
- En los slots `filled` y `underline` el texto del dígito NO está ligado a la propiedad `Digit`: siempre muestra
  "7" (la página de prototipo pinta "7777777"). En código el dígito es el valor tecleado en las tres variantes.
- Invalid no tiene halo (sólo el borde rojo), a diferencia de Input / Textarea.
- El halo de foco del underline es un rectángulo completo alrededor del slot, aunque el borde sea sólo inferior.
- Separador, caret y su altura sin variable.

## Anida
InputOTP anida InputOTPSlot (mismo archivo `input-otp.tsx`, `FILE_OF`).
