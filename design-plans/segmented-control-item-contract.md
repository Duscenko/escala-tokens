# Contrato · SegmentedControlItem (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `SegmentedControlItem` (`1102:5087`, 30 variantes), página `❖ SegmentedControl (✓)`, leído en
solo lectura. **Figma manda.** Parte de SegmentedControl en el ledger.

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` (del grupo si está dentro) |
| `Checked` false · true | VARIANT | `false` | `checked` (del grupo: `value`) |
| `State` Default · Hover · Pressed · Focused · Disabled | VARIANT | `Default` | `forceState` (docs); en vivo `:hover`, `:active`, `:focus-visible`, `disabled` |
| `Label` | TEXT | «Label» | `label` |
| `LabelVisible` | BOOLEAN | true | `labelVisible` (false → pide `aria-label`) |
| `IconLeadingVisible` | BOOLEAN | false | `iconLeadingVisible` |
| `IconLeadingIcon` | INSTANCE_SWAP | `icon/House` | `iconLeading` |

## Geometría
| Size | Alto | Gap | Icono |
|---|---|---|---|
| default | `Size/control-sm` 32 | `Spacing/gap-control` 8 | `Size/icon-sm` 16 |
| sm | `Size/control-xs` 24 | `Spacing/gap-tight` 4 | 16 |
| lg | `Size/control-md` 40 | 8 | `Size/icon-md` 20 |

Padding X `Spacing/inset-control` 12, Y 0, texto `Type/button`. Radio: sin marcar `Radius/action` (12), marcado `Radius/control` (8).
Focused: trazo 2 INSIDE que NO entra en el layout (hijos en la misma posición) + `focus-ring` 2 OUTSIDE.

## Color
| | relleno | tinta | efecto |
|---|---|---|---|
| sin marcar Default | — | `Content/secondary` | — |
| sin marcar Hover | `Action/ghost/hover` | `Content/primary` | — |
| sin marcar Pressed | `Action/ghost/pressed` | `Content/primary` | — |
| sin marcar Focused | — | `Content/secondary` | `Border/focus` 2 + `Border/ring/default` 2 |
| sin marcar Disabled | — | `Content/disabled` | — |
| marcado Default / Hover / Pressed | `Surface/input` | `Content/primary` | `Shadow/xs` |
| marcado Focused | `Surface/input` | `Content/primary` | foco + `Shadow/xs` |
| marcado Disabled | `Surface/input` | `Content/disabled` | ninguno |

## Lo raro del archivo
- `Shadow/xs` lleva un anillo con spread 1 en un frame que no recorta: no se pinta; solo cuenta la sombra ambiente `0 1 2`.
- El texto «Label» mide 31,5 px en el navegador y 32 en Figma (redondeo del texto): cada item 1 px más estrecho.
- Marcado + Hover / Pressed no cambian (el archivo no dibuja nada distinto).
