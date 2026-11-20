# Contrato · TabBar y TabBarItem (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, página «❖ TabBar» (2354:42): `TabBarItem` (2354:84, 5 variantes) y `TabBar` (2354:124, componente
suelto). Leído con `use_figma` (solo lectura) el 2026-11-19; cada rol de abajo es el que el archivo enlaza. Contexto: «IssueBoardPage · Proposal v2 · view navigation» (2343:4187).
Construidos en la librería antes que en Storybook (desviación de proceso aprobada por el dueño; hallazgo `STG-001` abierto hasta aprobar la historia).

## Qué es
Navegación inferior de una app móvil: de 3 a 5 destinos de primer nivel, siempre visibles. **No es un tablist**: cada item es un enlace que cambia de página, con la semántica de
NavItem (`State=Current` ↔ `aria-current="page"`). Las vistas dentro de una página siguen siendo TabMenu.

## 0 · Anatomía (capa Figma → slot de código)
| Figma | Código | Nota |
|---|---|---|
| raíz (VERTICAL, centro) | `root` | el enlace (`<a>`; `asChild` para el del router) |
| `indicator` (píldora, HORIZONTAL, hug) | `indicator` | lleva el relleno del estado y el anillo de foco |
| `icon` (instancia Phosphor, swap) | `icon` | |
| `Media` (SLOT) | `media` | p. ej. `<Avatar size="xs" />` (24), en la caja del icono |
| `badge` (Badge expuesto, absoluto) | `badge` | Badge `Type=number · Variant=critical · Appearance=solid · Size=xs · Shape=pill` |
| `focus-ring` (rectángulo absoluto) | `gapRing` del `indicator` | 2 px, 1 px fuera del indicador (50×34 sobre 48×32), radio `Radius/full` |
| `label` (TEXT) | `label` | |

## 1 · Propiedades → props
| Figma | React |
|---|---|
| `State` Default · Hover · Focused · Current · Disabled (def Default; **un solo eje, sin Size**) | `current` · `disabled` · `:hover` · `:focus-visible`; `forceState` fija uno en docs |
| `Label` TEXT «Home» | `children` |
| `LabelVisible` BOOLEAN true | `hideLabel` (inverso); oculta, exige `aria-label` |
| `Icon` INSTANCE_SWAP (House) · `IconVisible` true | `icon` (ReactNode Phosphor), se pinta si no hay `media` |
| `Media` SLOT · `MediaVisible` false | `media` (ReactNode) |
| `BadgeVisible` false | `badge` (number · string; sin pintar si es `undefined`) |
| — | `href` / `asChild` |

TabBar: sin ejes; `Content` (SLOT) → `children` (3 a 5 TabBarItem, cada uno FILL, exactamente uno Current); `aria-label` del landmark.

## 2 · Geometría y roles (leídos del archivo)
TabBarItem raíz: VERTICAL, centro/centro, gap `Spacing/gap-tight` (4), padding Y `Spacing/gap-tight`, X `Spacing/none`, alto mínimo `Size/target-min`, texto `Type/caption`.
Ancho 80 FIXED en el set; FILL dentro del TabBar.
`indicator`: HORIZONTAL centro, padding X `Spacing/inset-control` (12), Y `Spacing/gap-tight`, gap `Spacing/none`, radio `Radius/full` (`radius.pill` en código); 48×32.
`icon`: `Size/icon-lg` (24) → `icon.large`. `Media`: la misma caja.
`badge`: absoluto en el indicador, x 24 · y 0 (16×16), restricción horizontal MAX → borde derecho a 8 del indicador = arriba a la derecha del icono. En código:
`top: 0` y `left: 50%` del indicador (la línea central del icono, que es x 24 en 48); sin px libres.

| State | Relleno del `indicator` | Tinta de icono y label | Foco |
|---|---|---|---|
| Default | ninguno | `Content/secondary` | — |
| Hover | `Surface/muted` | `Content/primary` | — |
| Focused | ninguno | `Content/secondary` | `focus-ring` `Border/ring/default`, `Stroke/focus`, OUTSIDE, 1 px fuera |
| Current | `Surface/selected` | `Content/accent` | — |
| Disabled | ninguno | `Content/disabled` | — |

Sin opacidad en ningún estado; sin hex ni px.

TabBar: HORIZONTAL, gap `Spacing/none`, padding `Spacing/gap-tight` en los cuatro lados, relleno `Surface/page`, trazo `Border/subtle` solo arriba, peso `Stroke/divider`, INSIDE
(el archivo lo incluye en el layout: 390×69 = 4 + 60 + 4 + 1). Ancho FIXED 390 en el ejemplo; en código llena el ancho.

## 7 · Comportamiento (código)
- `<nav aria-label="…">` con una lista (`<ul>`/`<li>`) de enlaces. Orden de Tab natural; sin tabindex itinerante ni flechas (no es un tablist).
- Current = `aria-current="page"`. Disabled = `aria-disabled="true"`, `tabIndex=-1`, sin `href` activo.
- Etiqueta oculta: el texto sigue en el nombre accesible (`aria-label` obligatorio).
- El Badge es decorativo dentro del nombre: el número entra en el nombre accesible del enlace (p. ej. «Inbox, 3»), que el llamador da con `aria-label` cuando lo necesite.

## 8 · Movimiento (código, por rol)
TabBarItem: `{ transitions: { indicator: FILL, icon: FILL, label: FILL } }` (`use-hover` para color y fondo, igual que NavItem). Pasar a Current usa la misma transición.
Sin animación de montaje. TabBar: `motion: none`. El prototipo de Figma ya copia: Default→Hover `use-hover` (100 ms), clic→Current `use-toggle` (360 ms).

## 9 · Uso
- **whenToUse:** destinos de primer nivel de una app móvil, de 3 a 5, siempre visibles abajo.
- **whenNotToUse:** vistas o filtros dentro de una página → TabMenu; navegación de escritorio → Sidebar / NavItem.
- **related:** NavItem, TabMenu, Badge, Avatar.

## Raro (se copia igual)
- La altura del Badge xs está enlazada a un primitivo de Dimension (`16`), no a un rol: hallazgo existente del Badge que el TabBarItem hereda.
- El trazo superior del TabBar cuenta en el layout (69 de alto), así que en CSS es un `border-top` normal.
