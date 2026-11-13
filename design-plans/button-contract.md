# Contrato · Button e IconButton (F1)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, sets `Button` (`4:5066`)
e `IconButton` (`614:785`), leídos con la Plugin API después de pasar a
`Variant` × `Appearance`. Este documento es lo que la F2 (código) y la F3 (plugin) copian.

## API

| Figma | React (`Button`) | React (`IconButton`) |
|---|---|---|
| `Variant` default · secondary · critical | `variant` (default `default`) | igual |
| `Appearance` solid · outline · ghost · link | `appearance` (default `solid`) | igual |
| `Size` default · xs · sm · lg | `size` (default `default`) | igual |
| `State` Hover · Pressed · Focused | CSS (`:hover`, `:active`, `:focus-visible`); `forceState` para docs | igual |
| `State` Loading · Disabled | `loading` · `disabled` | igual |
| `Label` (TEXT) | `children` | — (sin texto: `aria-label` obligatorio) |
| `IconLeadingVisible` + `IconLeadingIcon` | `leading?: ReactNode` | — |
| `IconTrailingVisible` + `IconTrailingIcon` | `trailing?: ReactNode` | — |
| `Icon` (INSTANCE_SWAP) | — | `icon: ReactNode` |
| `BadgeVisible` | — | `badge?: ReactNode` (número o punto, arriba a la derecha) |
| — | `asChild` (Radix Slot, para enlaces) | igual |

Valores antiguos (shadcn) que se siguen aceptando en código **solo como alias de
migración**, sin aparecer en catálogo ni docs: `variant="outline|ghost|link|destructive"`,
`size="icon|icon-xs|icon-sm|icon-lg"` (→ IconButton). Se quitan cuando no quede ninguna
llamada.

## Geometría (por tamaño)

| Size | Alto / ancho IconButton | Padding X (Button) | Gap | Icono |
|---|---|---|---|---|
| xs | `size.hit` (Size/control-xs, 24) | `spacing.inset-control` | `spacing.gap-tight` | `icon.small` (Size/icon-sm) |
| sm | `size.compact` (control-sm, 32) | `spacing.inset-control` | `spacing.gap-control` | `icon.small` |
| default | `size.control` (control-md, 40) | `spacing.inset-control` | `spacing.gap-control` | `icon.medium` |
| lg | `size.touch` (control-lg, 48) | `spacing.inset-control` | `spacing.gap-control` | `icon.large` |

Común: radio `radius.action`, borde `stroke.control`, foco `stroke.focus`, texto
`type.button`. IconButton: padding 0, ancho = alto.

**Cambia respecto al código de hoy:** el padding X era una escalera (spacing.2 · 3 · 4 · 5);
Figma usa `inset-control` en los cuatro tamaños. El gap de xs era `spacing.1`; Figma
`gap-tight`.

## Color por combinación y estado

Ink = texto e iconos (comparten `currentColor`). Disabled: relleno `action.disabled.default`
en las sólidas, borde `border.control` en las outline, ink `content.disabled`.

| Variant · Appearance | Default | Hover | Pressed | Foco (borde) |
|---|---|---|---|---|
| default · solid | fill `action.primary.default` · ink `content.on-action` | `action.primary.hover` | `action.primary.pressed` | `border.focus` |
| default · outline | stroke `border.accent` · ink `content.accent` | + fill `action.ghost.hover` | + `action.ghost.pressed` | `border.focus` |
| default · ghost | ink `content.accent` | fill `action.ghost.hover` | `action.ghost.pressed` | `border.focus` |
| default · link | ink `content.link.default` | ink `content.link.hover` | ink `content.link.hover` | `border.focus` |
| secondary · solid | fill `action.secondary.default` · ink `content.on-secondary` | `.hover` | `.pressed` | Button `border.focus` · IconButton **`border.strong`** + halo `border.subtle` |
| secondary · outline | stroke `border.control` · ink `content.primary` | + fill `action.ghost.hover` | + `action.ghost.pressed` | `border.focus` |
| secondary · ghost | ink `content.primary` | fill `action.ghost.hover` | `action.ghost.pressed` | `border.focus` |
| secondary · link | ink `content.secondary` | ink `content.primary` | ink `content.primary` | `border.focus` |
| critical · solid | fill `status.critical.surface-solid` · ink `status.critical.on-solid` | `-hover` | `-pressed` | Button `border.focus` · IconButton **`status.critical.border-strong`** + halo `status.critical.border` |
| critical · outline | stroke `status.critical.border-strong` · ink `status.critical.content` | + fill `action.ghost.hover` | + `action.ghost.pressed` | `border.focus` |
| critical · ghost | ink `status.critical.content` | fill `action.ghost.hover` | `action.ghost.pressed` | `border.focus` |
| critical · link | ink `status.critical.content` | + subrayado | + subrayado | `border.focus` |

Todas las variantes en foco añaden el halo `border.ring.default` fuera del borde, salvo las
dos de IconButton marcadas arriba. Así está en el archivo (2026-11-12) y así lo copia el código.
Loading = Default con spinner en lugar del icono inicial.

**Regla:** el código copia el archivo tal cual; Figma no se edita para hacerlo coherente.

## No cubierto por el contrato (registrado, no bloquea)

- ~~Las sólidas llevan en Figma … `Elevation/highlight` interior~~ **Hecho (2026-11-12):**
  propiedad de receta `highlight` (`color.elevation.highlight`, `inset 0 2px 0 0`) en todo
  estado sólido salvo Disabled, compuesta con el foco. La "sombra del color del relleno"
  de Figma es `DROP_SHADOW 0 0 0` con spread 1 sobre un frame que no recorta contenido: Figma
  ignora el spread ahí y no pinta nada (medido en los píxeles del render). No se copia.
- **Trazo solo en `outline`** (2026-11-13): solid, ghost y link no tienen trazo en el archivo; en CSS
  llevan `stroke.none`, para que el brillo superior empiece en el borde como en Figma.
- **Trazo por dentro (2026-11-12):** Figma dibuja el trazo dentro del marco; CSS lo pone
  fuera del padding. El padding de la receta descuenta el borde (`--escala-stroke-width`,
  `recipeStyles.ts`), así que el Button por defecto mide 119 × 40 como en Figma.
- **Paleta (decisión del dueño, 2026-11-12: manda Figma).** La paleta del archivo está
  curada: para el mismo acento, 99 de 120 pasos sólidos y la mayoría de los alfas difieren
  del generador (no es solo el tono 11, `#6945c1` frente a `#7252c9`). Se usa como DATOS:
  `src/lib/figmaFilePalette.generated.ts` (`npm run gen:figma-palette`, desde el inventario
  del plugin) y `applyFigmaFilePalette(brand)`, que fija rampas y alfas de la marca
  (`CustomColor.alpha` / `darkAlpha`, `pinnedOrSolvedAlpha`). Storybook la usa: los 166
  roles × modo de Color Semantics coinciden con el archivo (`figmaFilePalette.test.ts`).
- **Foco (decisión del dueño: tal cual Figma).** Button / Checkbox / Switch: borde
  `border.focus` de 2 px por dentro y halo `border.ring` de 2 px por fuera. Campos (Input
  4:10640): el borde de 1 px se queda y el halo de 2 px lo monta (1 encima, 1 fuera), con
  `outline` + `outline-offset` negativo.
- `BadgeVisible` de IconButton: el Badge es otro componente; en código, `badge` acepta
  cualquier nodo.
