# Contrato · Avatar (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `Avatar` (`378:2094`, 350 variantes), página `❖ Avatar (✓)`, leído en solo lectura.
**Figma manda.** Partes: `AvatarStatus` (377:54) y `AvatarGroup` (378:2507) — contratos breves abajo.

Descripción: «User or entity avatar as an image, initials or icon in seven sizes, with an optional selection ring and presence status. Give image avatars alt text or an accessible name…»

## API
| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Type` image · initials · icon | VARIANT | `image` | `type` |
| `Size` 2xs · xs · sm · default · lg · xl · 2xl | VARIANT | `default` | `size` |
| `Shape` circle · rounded | VARIANT | `circle` | `shape` |
| `Variant` secondary · default · info · success · warning · critical | VARIANT | `secondary` | `variant` |
| `Appearance` soft · solid | VARIANT | `soft` | `appearance` |
| `RingVisible` / `StatusVisible` | BOOLEAN | false | `ringVisible` / `statusVisible` (+ `status`) |
| `Icon` / `Photo` | INSTANCE_SWAP | user (bold) / `_AvatarPhoto` | `icon` / `src` |

Un avatar `image` solo existe como secondary · soft (14 variantes); initials e icon cruzan Variant × Appearance (168 cada uno).

## Geometría
Cuadrado 16 · 24 · 32 · 40 · 48 · 56 · 64 (`Size/control-xs … xl` son 24 … 56; 2xs y 2xl son literales). Radio `Radius/full` (circle) o `Radius/control` (rounded).
Capas (todas absolutas salvo el contenido, centrado): `image` (0,0, mismo tamaño y radio) · `stroke` (rectángulo `Border/subtle` INSIDE, **0.5px en 2xs y xs**, 1px el resto, sobre el contenido) · `ring` (hidden: −4,−4, tamaño+8, `Border/accent` 2px INSIDE, mismo radio) · `status` (instancia de AvatarStatus en la esquina inferior derecha: x = tamaño − punto).
Punto por tamaño: 2xs·xs·sm → xs (6) · default → sm (8) · lg → default (10) · xl·2xl → lg (12).
Iniciales: texto `Type/avatar-2xs … 2xl` = **8 · 10 · 12(Type/label) · 14 · 16 · 18 · 20 px**, Medium, interlineado 100 %, SIN variables (estilos sueltos): receta `fontLiteral`. 2xs lleva una sola letra («A»), el resto dos. Icono 10 · 14 · 18 · 20 (`Size/icon-md`) · 24 (`icon-lg`) · 28 · 32.

## Color (idéntico en todos los tamaños y formas — comprobado en las 350 variantes)
| Variant | soft: relleno · tinta | solid: relleno · tinta |
|---|---|---|
| secondary | `Surface/muted` · `Content/secondary` | `Surface/inverse` · `Content/inverse` |
| default | `Surface/accent` · `Content/accent` | `Action/primary/default` · `Content/on-action` |
| info · success · warning · critical | `Status/<s>/surface` · `Status/<s>/content` | `Status/<s>/surface-solid` · `Status/<s>/on-solid` |

## Lo raro del archivo
- Los estilos `Type/avatar-*` no están ligados a variables (literales). Receta: prop `fontLiteral` (no token).
- El borde de 0.5px en 2xs/xs es literal: prop `hairline`.
- La foto es una imagen de stock (`_AvatarPhoto`): en código `src`; el specimen la sustituye por el degradado del sistema.
- La variable `Size/control-*` no existe para 2xs/2xl: se usan peldaños (`spacing.4`, `size.2xl`).

# AvatarStatus (377:54, 20 variantes: Status × Size)
`Status` online · busy · away · offline · do-not-disturb × `Size` xs · sm · default · lg → círculo 6 · 8 · 10 · 12 (`Radius/full`), trazo `Surface/page` **OUTSIDE** 1px (xs, sm) / 2px (default, lg). Relleno: `Status/success/surface-solid` · `Status/critical/surface-solid` · `Status/warning/surface-solid` · `Content/subtle` · `Status/critical/surface-solid` + barra `Status/critical/on-solid` (do-not-disturb: ancho = mitad, alto 1·1·2·2, centrada). Receta: props `outerStroke` + `outerStrokeWidth` (trazo exterior = sombra de propagación sin blur: el cuadro no crece).

# AvatarGroup (378:2507, 14 variantes: Size × Shape)
Fila (HORIZONTAL, centrada) de 4 `Avatar` + una ficha `action` («+3»). Cada ítem es un marco `Surface/page` con padding 1 (2xs · xs) · 2 (sm … xl) · 3 (2xl) y el radio del avatar; el avatar mide tamaño − 2·padding. Solape: `Spacing/overlap-sm` (−4, 2xs), `overlap-md` (−8, sm · default); **xs −6, lg · xl −12, 2xl −16 son literales** (peldaños `spacing.1_5/3/4`; receta `overlap` → `--escala-overlap`, margen negativo). Ficha: `Surface/inverse` + `Content/inverse`, texto `Type/avatar-*` (sm: `Type/label`). Anchos medidos = Figma: 74 · 106 · 148 · 188 · 212 · 252 · 286.
