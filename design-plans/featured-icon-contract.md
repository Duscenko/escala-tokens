# Contrato · FeaturedIcon (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `FeaturedIcon` (`1119:10857`, 96 variantes), leído en solo lectura. **Figma manda.**
Descripción: «Decorative icon in a tinted or solid shape… Hidden from assistive tech (aria-hidden)… ModalHeader nests it (Size default · lg, Shape rounded).»

## API
| Figma (orden del panel) | Defecto | React |
|---|---|---|
| `Icon` INSTANCE_SWAP | `icon/Lightning` (Outline) | `icon` (por defecto el rayo regular de Phosphor) |
| `Size` default · sm · lg · xl | `default` | `size` |
| `Variant` default · secondary · critical · success · warning · info | `default` | `variant` |
| `Appearance` soft · solid | `soft` | `appearance` |
| `Shape` circle · rounded | `circle` | `shape` |

## Geometría
Cuadrado 32 (sm) · 40 (default) · 48 (lg) · 56 (xl) = `Size/control-sm … xl`, glifo centrado 20 (`Size/icon-md`, solo sm) · 24 (`icon-lg`, el resto). circle = `Radius/full`, rounded = `Radius/action`.

## Color (idéntico en todos los tamaños y formas)
Igual que Avatar: default soft `Surface/accent` + `Content/accent`; secondary soft `Surface/muted` + `Content/secondary`; critical/success/warning/info soft `Status/<s>/surface` + `content`, solid `Status/<s>/surface-solid` + `on-solid`.

## Gradient (2026-11-18, DEC-2026-11-18-003)
`Appearance=gradient` lleva, en todos los tonos, tamaños y formas: `0 4px 6px -1px Elevation/shadow-key`, `0 2px 4px -2px Elevation/shadow-ambient` e `inset 0 2px 0 Elevation/highlight`. Paradas: default `Action/primary/*`, secondary `Action/secondary/*`, estados `Status/<s>/surface-solid*`.

## Dentro de overlays
En `ModalHeader` el icono es siempre `Shape=rounded` (`Radius/action`).

## Lo raro del archivo
- **default·solid y secondary·solid (16 variantes) están rellenos con una IMAGEN raster** (una esfera iridiscente pegada: 600×600 y 704×1408) y su icono no tiene capas pintadas. Es un descuido del archivo; no se puede copiar una foto. En código: default·solid = `Action/primary/default` + `Content/on-action`, secondary·solid = `Surface/inverse` + `Content/inverse` (los mismos que el Avatar solid del archivo). Avisar al dueño.
- xl no agranda el glifo (24, igual que lg).
