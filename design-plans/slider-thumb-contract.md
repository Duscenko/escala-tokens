# Contrato · SliderThumb (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Slider (✓)`, set `SliderThumb` (`441:75`, 30 variantes),
leído en solo lectura. **Figma manda.** Parte de Slider en el ledger.

Descripción: «Slider thumb. Size xs | sm | default × State Default, Hover, Focused, Dragging, Disabled × Variant default | secondary.
Thumb type (short | long) and shape (rounded | pill) are instance overrides.»

## API
| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Dragging · Disabled | VARIANT | `Default` | `forceState` (docs); en vivo `:hover`, `:focus-visible`, arrastre, `disabled` |
| `Variant` default · secondary | VARIANT | `default` | `variant` |

## Geometría
Cuadrado 14 · 16 · 20, radio `Radius/control` (8), relleno `Content/on-action`, trazo 2 INSIDE (`stroke.md`).

## Color
| Variant | Default | Hover | Focused (trazo 2 + halo 2 OUTSIDE) | Dragging | Disabled |
|---|---|---|---|---|---|
| default | trazo `Action/primary/default` + `Shadow/xs` | `Action/primary/hover` + `Shadow/xs` | `Border/focus` · `Border/ring/default`, sin sombra | `Action/primary/default`, sin efecto | relleno `Surface/muted`, trazo `Action/disabled/default` |
| secondary | `Content/primary` | `Content/secondary` | `Border/strong` · `Border/subtle` | `Content/primary` | idem |

## Lo raro del archivo
- Dragging dibuja un anillo de 4 px con spread sobre un frame que no recorta: no se pinta. El arrastre no se distingue del reposo salvo por la sombra ambiente, que desaparece.
- El tipo (short / long) y la forma (pill) son overrides de instancia dentro del Slider; no hay props en el set (no se copian).
- El radio 8 sobre 20 px da un cuadrado redondeado; en 14 y 16 es un círculo.
