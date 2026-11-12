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
| secondary · solid | fill `action.secondary.default` · ink `content.on-secondary` | `.hover` | `.pressed` | **`border.strong`** |
| secondary · outline | stroke `border.control` · ink `content.primary` | + fill `action.ghost.hover` | + `action.ghost.pressed` | `border.focus` |
| secondary · ghost | ink `content.primary` | fill `action.ghost.hover` | `action.ghost.pressed` | `border.focus` |
| secondary · link | ink `content.secondary` | ink `content.primary` | ink `content.primary` | `border.focus` |
| critical · solid | fill `status.critical.surface-solid` · ink `status.critical.on-solid` | `-hover` | `-pressed` | **`status.critical.border-strong`** |
| critical · outline | stroke `status.critical.border-strong` · ink `status.critical.content` | + fill `action.ghost.hover` | + `action.ghost.pressed` | **Button: `status.critical.border-strong`** · IconButton: `border.focus` |
| critical · ghost | ink `status.critical.content` | fill `action.ghost.hover` | `action.ghost.pressed` | `border.focus` |
| critical · link | ink `status.critical.content` | + subrayado | + subrayado | `border.focus` |

Todas las variantes en foco añaden el halo `border.ring.default` fuera del borde.
Loading = Default con spinner en lugar del icono inicial.

**Lo que el código copia tal cual aunque sea incoherente** (decisión pendiente del dueño,
`button-figma-parity.md`): el foco de `secondary · solid`, `critical · solid` y
`critical · outline` (Button). Cuando Figma lo unifique, el código cambia una línea.

## No cubierto por el contrato (registrado, no bloquea)

- Las sólidas llevan en Figma una sombra del color del relleno + `Elevation/highlight`
  interior (el "top-highlight" del manual). La receta no tiene hoy un efecto ligado a un
  rol de color; se añade cuando exista ese tipo de propiedad.
- `BadgeVisible` de IconButton: el Badge es otro componente; en código, `badge` acepta
  cualquier nodo.
