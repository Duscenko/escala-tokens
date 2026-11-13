# Contrato · CloseButton (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `CloseButton` (`337:2762`,
600 variantes), leído con `figma-read-set.js` (solo lectura). Este documento es lo que copian la
receta, el componente y Storybook. **Figma manda; nada se corrige.**

Descripción del set en el archivo: «Dismiss control for alerts, toasts, dialogs and tags.
Icon-only: always provide an accessible name (aria-label="Close").»

## API

| Figma (orden del panel) | Tipo | Defecto | Opciones (orden del archivo) | React |
|---|---|---|---|---|
| `Appearance` | VARIANT | `soft` | solid · outline · soft · ghost | `appearance` |
| `Shape` | VARIANT | `pill` | rounded · pill · square | `shape` |
| `Size` | VARIANT | `default` | sm · lg · xl · xs · default | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Pressed · Focused · Disabled | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` | VARIANT | `default` | default · inverse | `variant` |

Sin propiedades booleanas, de texto ni de intercambio: el glifo es fijo (`icon/X`, Style=Outline).
En código el glifo viene dentro (Phosphor `x`) y `icon?: ReactNode` deja a un sistema con otra
librería ponerle el suyo (como el `closeIcon` del Dialog). `aria-label` por defecto «Close».
No hay `Loading` (el archivo no lo tiene). Appearance × Shape × Size × State × Variant =
4 · 3 · 5 · 5 · 2 = 600 variantes.

## Geometría por tamaño

Ancho = alto (cuadrado). Sin padding, sin gap. Layout horizontal centrado.

| Size | Alto / ancho | Icono |
|---|---|---|
| xs | `Size/control-xs` (24) → `size.hit` | `Size/icon-sm` (16) → `icon.small` |
| sm | `Size/control-sm` (32) → `size.compact` | `Size/icon-sm` (16) → `icon.small` |
| default | `Size/control-md` (40) → `size.control` | `Size/icon-md` (20) → `icon.medium` |
| lg | `Size/control-lg` (48) → `size.touch` | `Size/icon-lg` (24) → `icon.large` |
| xl | `Size/control-xl` (56) → `size.fab` | `Size/icon-lg` (24) → `icon.large` |

Radio por `Shape`: rounded `Radius/action` (12) → `radius.action` · pill `Radius/full` →
`radius.pill` · square `Radius/none` → `radius.none`. Idéntico en los cinco tamaños.

Trazo: **solo `outline`** tiene trazo: `Stroke/control` (1) por dentro. Solid, soft y ghost no
tienen (en CSS `stroke.none`). El padding no existe, así que no hay nada que descontar.

## Color por combinación y estado

El color es **idéntico en las 15 combinaciones de Shape × Size** (medido: una sola firma por
Appearance · Variant · State). `fill A + B` = dos rellenos apilados: `A` abajo, `B` encima
(`fills[0]` es el de abajo en la API); `B` es una variable con alfa propio (el `opacity` que la API
devuelve en el relleno es el alfa de la variable, no un segundo multiplicador).

### Variant = default

| Appearance | Default | Hover | Pressed | Focused | Disabled |
|---|---|---|---|---|---|
| soft | fill `Action/secondary/default` · ink `Content/on-secondary` | fill `Action/secondary/hover` | fill `Action/secondary/pressed` | como Default + halo `Border/subtle` | fill `Action/disabled/default` · ink `Content/disabled` |
| solid | fill `Surface/inverse` · ink `Content/inverse` | fill `Surface/inverse` + `Surface/inverse-muted` | `Surface/inverse` + `Surface/inverse-muted` ×2 | como Default + halo `Border/subtle` | `Action/disabled/default` · `Content/disabled` |
| outline | stroke `Border/control` (1) · ink `Content/primary` | + fill `Action/ghost/hover` | + fill `Action/ghost/pressed` | stroke `Border/strong` (2, por dentro) + halo `Border/subtle` | stroke `Border/control` · ink `Content/disabled` |
| ghost | ink `Content/secondary` | fill `Action/ghost/hover` · ink `Content/primary` | fill `Action/ghost/pressed` · ink `Content/primary` | stroke `Border/strong` (2) + halo `Border/subtle` · ink `Content/secondary` | ink `Content/disabled` |

### Variant = inverse

| Appearance | Default | Hover | Pressed | Focused | Disabled |
|---|---|---|---|---|---|
| soft | fill `Surface/inverse-muted` · ink `Content/inverse` | `Surface/inverse-muted` ×2 | `Surface/inverse-muted` ×3 | como Default + halo `Surface/inverse-muted` | `Action/disabled/default` · `Content/disabled` |
| solid | fill `Surface/page` · ink `Content/primary` | `Surface/page` + `Action/ghost/hover` | `Surface/page` + `Action/ghost/pressed` | como Default + halo `Surface/inverse-muted` | `Action/disabled/default` · `Content/disabled` |
| outline | stroke `Border/inverse` (1) · ink `Content/inverse` | + fill `Surface/inverse-muted` | + fill `Surface/inverse-muted` ×2 | stroke `Border/inverse` (2) + halo `Surface/inverse-muted` | stroke `Border/control` · ink `Content/disabled` |
| ghost | ink `Content/inverse-secondary` | fill `Surface/inverse-muted` · ink `Content/inverse` | fill `Surface/inverse-muted` ×2 · ink `Content/inverse` | stroke `Border/inverse` (2) + halo `Surface/inverse-muted` · ink `Content/inverse-secondary` | ink `Content/disabled` |

## Foco

Un marco hijo `focus-ring` del tamaño del control, radio del control, sin relleno, trazo de
`Stroke/focus` (2) **por fuera** (`OUTSIDE`), de color el halo de la tabla. Solo en `Focused`.
- `soft` y `solid`: **solo halo**, sin borde propio (el control no tiene trazo en Focused).
- `outline` y `ghost`: además el propio control lleva un trazo de 2 px **por dentro** en el color del
  borde de la tabla (outline: reemplaza el trazo de 1 px).

Distinto de Button (`Border/focus` + `Border/ring/default` en todas) y de IconButton (borde
`Border/strong` + halo en dos sólidos): el código copia cada set por separado.

## Efectos

Ninguno. Ni sombra ni brillo superior (a diferencia de Button / IconButton sólidos): ningún
`effects` en ninguna variante de la muestra.

## Lo que el archivo hace y parece raro (se copia igual)

- Los estados Hover y Pressed se dibujan **apilando** el mismo relleno con alfa (`Surface/inverse-muted`
  dos o tres veces), no con un rol hover / pressed propio. Es lo que pide el archivo; en receta son
  `overlay` y `overlay2` encima de `fill`.
- Las opciones de `Size` están en orden `sm · lg · xl · xs · default`; el menú de Storybook las
  muestra así.
- `Variant=inverse · Disabled · outline` usa `Border/control`, no `Border/inverse`.
- `solid · default` no tiene hover propio de rol: aclara su propio relleno oscuro con un velo claro
  (`inverse-muted` es blanco en Light, negro en Dark).

## Anida

El icono es una instancia de `icon/X / Style=Outline` (el conjunto de iconos del archivo, ya en el
código como `close`). No anida otros componentes.
