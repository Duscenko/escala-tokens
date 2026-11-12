# Contrato · Image (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `Image` (`1126:15`, 12 variantes), leído en solo lectura. **Figma manda.** Ledger: rename de `AspectRatio` (el archivo lo llama Image).
Descripción: «Photo or illustration cropped to a fixed ratio (object-fit: cover), with Surface/muted behind it while it loads. Ratio auto fills its parent… Use Shape=square inside a slot that already clips its corners.»

## API
| Figma (orden del panel) | Defecto | React |
|---|---|---|
| `Media` INSTANCE_SWAP (`media/photo-11`) | foto de stock | `src` + `alt` (o `children`) |
| `Ratio` auto · 16:9 · 4:3 · 3:2 · 1:1 · 3:4 | `auto` | `ratio` |
| `Shape` square · rounded | `square` | `shape` |

## Geometría y color
Caja con clip, relleno `Surface/muted`; radio `Radius/none` (square) o `Radius/container` (rounded). Muestra del archivo 240 ancho: auto 240×160, 16:9 240×135, 4:3 240×180, 3:2 240×160, 1:1 240×240, 3:4 240×320. El medio (instancia) llena la caja con clip. Sin trazo, sin sombra.

## Lo raro del archivo
- 3:2 y auto miden lo mismo en la muestra (240×160); auto rellena el padre.
- La foto es una imagen de stock: en código `src`; el specimen la sustituye por el degradado del sistema.
