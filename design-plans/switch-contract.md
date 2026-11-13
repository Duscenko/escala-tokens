# Contrato · Switch (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Switch & SwitchGroup (✓)`, set `Switch`
(`405:358`, 48 variantes), leído en solo lectura. **Figma manda; nada se corrige.** Reconstruye el Switch de shadcn
(Checked True/False, Size default · sm).

Descripción: «Binary on/off control for a setting that applies immediately. Always pair it with a visible label or give it
an accessible name (role="switch" with aria-checked in code).»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Disabled | VARIANT | `Default` | `forceState` (docs); en vivo `:hover`, `:focus-visible`, `disabled` |
| `Checked` true · false | VARIANT | `false` | `checked` / `defaultChecked` (Radix) |
| `Thumb` short · long | VARIANT | `short` | `thumb` |
| `IoVisible` | BOOLEAN | false | `ioVisible` |
| `ThumbIconVisible` | BOOLEAN | false | `thumbIconVisible` |

## Geometría

| Size · Thumb | Pista | Thumb | Marca I/O (apagado · encendido) |
|---|---|---|---|
| xs · short | 28×16 (`Size/selector-sm`) | 12×12 | anillo 6 en (17,5) · barra 2×8 en (7,4) |
| xs · long | 36×16 | 16×12 | (23,5) · (9,4) |
| sm · short | 28×16 | 12×12 | (22,6) · (9,5) |
| sm · long | 36×16 | 16×12 | (28,6) · (11,5) |
| default · short | 36×20 (`Size/selector-md`) | 16×16 | anillo 8 (27,7) · barra 2×10 (11,6) |
| default · long | 44×20 | 20×16 | (35,7) · (15,6) |

Padding 2 (`spacing.0_5`), radio `Radius/full`, el thumb viaja su propio ancho (long y short). Sin sombra. Anillo con
trazo 1,5 INSIDE; icono del thumb 8 · 8 · 10 (`icon/check` encendido, `icon/close` apagado).
Focused: trazo 2 INSIDE contado en el layout (el thumb entra 2 por cada lado, recorrido −4) + halo 2 fuera.

## Color (idéntico en todos los Size y Thumb — comprobado en las 48 variantes)

| | Pista | Thumb | Marca I/O | Foco |
|---|---|---|---|---|
| apagado Default / Focused | `Surface/muted` | `Surface/input` | `Content/subtle` | `Border/focus` 2 + `Border/ring/default` 2 |
| apagado Hover | `Surface/muted-hover` | `Surface/input` | `Content/subtle` | — |
| apagado Disabled | `Surface/muted` | `Surface/input` | `Content/disabled` | — |
| encendido Default / Focused | `Action/primary/default` | `Content/on-action` | `Content/on-action` | idem |
| encendido Hover | `Action/primary/hover` | `Content/on-action` | `Content/on-action` | — |
| encendido Disabled | `Action/disabled/default` | `Surface/input` | `Surface/input` | — |

## Lo raro del archivo
- Las marcas I/O de sm y default están a una posición absoluta que NO está centrada en su mitad (xs sí): se copian tal cual.
- `thumb-icon` está oculto en las 48 variantes y sus instancias ocultas no dejan leer el relleno (solo «fills» sobrescrito;
  el maestro es `Content/primary`): se asume `Content/subtle` apagado, `Action/primary/default` encendido, `Content/disabled`
  desactivado. **Pendiente de confirmar** con el dueño si algún día se muestra.
- Sin variantes Hover/Focused distintas para el glifo.
