# Contrato · RatingGroupItem (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `RatingGroupItem` (`1122:195`, 60 variantes), página `❖ RatingGroup (✓)`, leído en solo lectura.
**Figma manda.** Parte de RatingGroup en el ledger.

Descripción: «One option of a RatingGroup (role="radio", aria-checked, aria-label such as "4 of 5 stars" or "Good"). Type=star fills the
Star glyph in Content/accent; Type=emoji keeps its own icon (Icon swap) and marks the choice with Surface/selected and Content/accent.
In a star group set Checked on every item up to the value; code sets aria-checked on the chosen item only.»

## API
| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` (del grupo) |
| `Type` star · emoji | VARIANT | `star` | `kind` (`type` es el atributo del botón); del grupo |
| `Checked` false · true | VARIANT | `false` | `checked` (del grupo: valor) |
| `State` Default · Hover · Pressed · Focused · Disabled | VARIANT | `Default` | `forceState` (docs); en vivo `:hover`, `:active`, `:focus-visible`, `disabled` |
| `Icon` | INSTANCE_SWAP | Star / Smiley | `icon` |

## Geometría
Cuadrado 32 · 24 · 40 (`size.compact` · `size.hit` · `size.control`), radio `Radius/action`, icono 20 · 16 · 24 (`Size/icon-md · sm · lg`) centrado.
Estrella marcada = glifo `Star` relleno (fill); sin marcar y emoji = outline. Focused: trazo 2 INSIDE + `focus-ring` 2 OUTSIDE.

## Color (idéntico en los tres tamaños — comprobado en las 60 variantes)
| Type · Checked | Default | Hover | Pressed | Focused | Disabled |
|---|---|---|---|---|---|
| star · false | tinta `Content/secondary` | `Action/ghost/hover` + `Content/primary` | `Action/ghost/pressed` + `Content/primary` | edge `Border/focus` + ring `Border/ring/default` | `Content/disabled` |
| star · true | `Content/accent` | `Action/ghost/hover` + accent | `Action/ghost/pressed` + accent | idem | `Content/disabled` |
| emoji · false | idem star false | idem | idem | idem | idem |
| emoji · true | `Surface/selected` + `Content/accent` | idem | `Surface/selected-pressed` | `Surface/selected` + foco | `Surface/selected` + `Content/disabled` |

## Lo raro del archivo
- `Checked` en estrella llena TODAS hasta el valor: el grupo marca visualmente cada item ≤ valor y `aria-checked` solo el elegido.
- Emoji Disabled conserva el relleno `Surface/selected` del marcado.
