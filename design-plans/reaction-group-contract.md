# Contrato · ReactionGroup, ReactionGroupTrigger y ReactionGroupPopover (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, página «❖ ReactionGroup (PRO)» (2381:42): `ReactionGroup` (2381:169, componente suelto),
`ReactionGroupTrigger` (2381:124, 25 variantes) y `ReactionGroupPopover` (2381:130, componente suelto). Prototipo: 2383:114. Leído con `use_figma` (solo lectura) el
2026-11-19; cada rol de abajo es el que el archivo enlaza. Construidos en la librería antes que en Storybook (excepción del dueño; `STG-001`, EXC-2026-11-19-002).
Referencia de comportamiento: uiarc.dev Reactions. El nombre va en singular, como `ButtonGroup`.

## Qué es
Un reconocimiento ligero bajo una publicación o un comentario: una fila de píldoras de reacción que salta de línea, un botón que abre el selector y una línea de
resumen opcional. **Las píldoras son el `Chip` que ya existe** (`appearance="outline"`, `shape="pill"`, icono = la reacción, etiqueta = el recuento, `Selected` cuando
has reaccionado): no hay componente de píldora nuevo.

## 0 · Anatomía (capa Figma → slot de código)
| Figma | Código | Nota |
|---|---|---|
| `ReactionGroup` raíz (VERTICAL, gap `Spacing/gap-control`) | `root` | `role="group"`, `aria-label` «Reactions» |
| `Content` (SLOT, HORIZONTAL WRAP, gap y row-gap `Spacing/gap-control`) | `content` | las píldoras y el trigger |
| `reaction` (instancia Chip) | `item` + `Chip` | `item` es un envoltorio sin pintura: lleva la entrada, la salida y el viaje |
| `add` (instancia ReactionGroupTrigger) | `item` + `ReactionGroupTrigger` | siempre el último |
| `summary` (TEXT, `Type/body-sm`, `Content/secondary`) | `summary` | |
| — | `digit` | cada cifra del recuento (solo código: rueda al cambiar) |
| `ReactionGroupTrigger` raíz + `icon` (Smiley) + `focus-ring` | `root` · `icon` · `gapRing` | |
| `ReactionGroupPopover` raíz + `Content` (SLOT) + `option` ×6 (IconButton) | `root` · `content` | `role="toolbar"` |

## 1 · Propiedades → props
| Figma | React |
|---|---|
| ReactionGroup `Content` SLOT | `value` / `defaultValue` (`{ id, count, reacted }[]`) + `options` (`{ id, label, icon }[]`) |
| ReactionGroup `Summary` TEXT «27 reactions · You reacted with Celebrate and Like» | `summary` (si se omite, se escribe a partir del valor, con ese mismo formato) |
| ReactionGroup `SummaryVisible` BOOLEAN true | `summaryVisible` |
| Trigger `Size` default · xs · sm · lg · xl | `size` |
| Trigger `State` Default · Hover · Focused · Open · Disabled | `:hover` · `:focus-visible` · `aria-expanded` (Open) · `disabled`; `forceState` fija uno en docs |
| Popover `Content` SLOT | `options`; `onSelect(id)` |

Solo código: `onValueChange(next, { id, reacted, count })`, `label`, `size` (el tamaño de Chip de la fila), `open` / `defaultOpen` / `onOpenChange`, `disabled`.

## 2 · Geometría
| Pieza | Medido en Figma | Roles |
|---|---|---|
| Trigger xs · sm · default · lg · xl | 24 · 32 · 40 · 48 · 56 (cuadrado) | `Size/control-xs … xl`, `Radius/full`, trazo `Stroke/control` INSIDE |
| Icono del trigger | 16 · 16 · 20 · 20 · 24 | `Size/icon-sm · sm · md · md · lg` |
| Popover | 238 × 58 (el trazo ocupa sitio: 212 + 2×12 + 2×1) | padding `Spacing/inset-control`, gap `Spacing/gap-tight`, `Radius/overlay`, trazo `Stroke/divider` |
| Opciones | 6 × IconButton 32 (`secondary` · `ghost` · `sm`), radio `Radius/action` | concéntrico: overlay 24 − 12 = 12 |
| Fila | píldoras de 40 de alto, 8 entre ellas y entre líneas; resumen 8 debajo (18 de alto) | `Spacing/gap-control` |
| Selector respecto al trigger | arriba, a 8 px (solo código) | `Spacing/gap-control` |

## 3 · Color por estado (ReactionGroupTrigger; igual en los 5 tamaños)
| State | Relleno | Trazo | Icono | Anillo |
|---|---|---|---|---|
| Default | — | `Border/control` | `Content/secondary` | — |
| Hover | `Surface/muted` | `Border/control-hover` | `Content/primary` | — |
| Focused | — | `Border/control` | `Content/secondary` | `Border/ring/default`, `Stroke/focus`, 1 px de hueco, por fuera |
| Open | `Surface/selected` | `Border/accent` | `Content/accent` | — |
| Disabled | — | `Border/subtle` | `Content/disabled` | — |

Popover: `Surface/layer-2` + `Border/default` + `Shadow/md`. Píldora que has marcado: el `State=Selected` de Chip (`Surface/selected` + `Border/accent` + `Content/accent`).

## 4 · Comportamiento (lo decide Storybook)
- Cada píldora es un botón de alternancia (`aria-pressed`); su nombre accesible es «{reacción}, {n} reactions{, you reacted}» (`Chip.toggleLabel`, prop nueva).
- Un recuento que llega a 0 quita la píldora; el foco pasa a la píldora vecina o, si no queda ninguna, al trigger.
- Trigger: `aria-label="Add reaction"`, `aria-haspopup`, `aria-expanded`.
- Selector: Radix Popover, `role="toolbar"`, tabindex itinerante; flechas mueven y dan la vuelta, Home / End saltan, Escape cierra y devuelve el foco al trigger. Elegir
  una opción la alterna y cierra.
- Una región `role="status"` anuncia cada cambio («You reacted with Love. 1 reaction.»).

## 5 · Motion (solo roles que ya existen, `RECIPE_MOTION`)
| Momento | Rol |
|---|---|
| Las píldoras entran (solo el primer render), una tras otra | `use-stagger-in`, cada una `--motion-stagger` detrás de la anterior |
| Una píldora nueva llega; las vecinas hacen sitio (FLIP) | `use-travel-in` |
| Una píldora se va | `use-travel-out` |
| El recuento cambia: las cifras que cambian ruedan en el sentido del cambio | `use-toggle` |
| Pulsar una píldora | `use-press` (Chip no tiene `Pressed` en Figma: es solo movimiento) |
| El selector abre / cierra | `popover-enter` / `popover-exit` |
| El resalte entre opciones | `use-hover` (el de IconButton) |

Movimiento reducido: sale de los tokens (los roles se acortan y `--motion-stagger` es 0). Ningún archivo de componente nombra una duración ni una curva.

## 6 · Cosas del archivo copiadas tal cual / decisiones
- El trigger se queda en su familia; pasará a `IconButton Shape=pill` cuando aparezca un segundo consumidor (decidido).
- Chip no gana estado `Pressed`: la respuesta a la pulsación es movimiento (decidido). Chip sí gana `use-press` para todos sus usos.
- Phosphor no tiene «smiley-plus»: el icono es `Smiley`.
- El ancho de «13» sale 63 px en el navegador y 64 en Figma (métrica de Inter, ±1 px).
- La página trae además `ActionButton` y `SplitButton` (nuevos en el archivo, fuera de este encargo): anotados como pendientes en `spec/figma-components.status.json`.
