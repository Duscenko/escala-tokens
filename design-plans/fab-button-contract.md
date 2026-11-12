# Contrato · FABButton (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `FABButton` (`345:868`,
100 variantes, página «❖ FABButton & FABGroup»), leído con la Plugin API (solo lectura) y
comprobado con los píxeles del render. Lo copian la receta, el componente y Storybook.
**Figma manda; nada se corrige.**

Descripción del set: «Floating action button: leading icon plus optional label. Variant default =
Action/primary, secondary = Action/secondary (soft = Surface/layer-2), inverse = Surface/inverse chip
(default appearance only). Size default is Size/control-lg (48), lg is Size/control-xl (56, the FAB
size). Width hugs content and never goes below the size role, so icon-only (LabelVisible off) stays
square; give an icon-only FAB an accessible name (aria-label).»

## API

| Figma | Tipo | Defecto | Opciones (orden del archivo) | React |
|---|---|---|---|---|
| `Appearance` | VARIANT | `solid` | solid · soft | `appearance` |
| `Shape` | VARIANT | `rounded` | rounded · pill | `shape` |
| `Size` | VARIANT | `default` | default · lg | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Pressed · Focused · Disabled | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` | VARIANT | `default` | inverse · default · secondary | `variant` |
| `Label` | TEXT | «Create» | — | `children` |
| `LabelVisible` | BOOLEAN | `true` | — | hay `children` = visible; sin `children` = solo icono |
| `IconLeadingIcon` | INSTANCE_SWAP | `Plus` | — | `icon?: ReactNode` (defecto: Phosphor `plus`) |

100 variantes: `inverse` solo existe en `solid` (2 · 2 · 2 · 5 · 3 − 20). En código `inverse · soft` se
acepta y se pinta como `inverse · solid`. Panel: ejes de variante primero, luego Label, LabelVisible,
IconLeadingIcon (orden de la API; no vi el panel del playground).

## Geometría

Raíz: horizontal, centrada, **ancho = contenido, alto fijo**, gap `Spacing/gap-control` (8), padding X
`Spacing/inset-control` (12), padding Y 0, ancho mínimo = alto, radio `Radius/action` (rounded, 12) o
`Radius/full` (pill).

| Size | Alto y ancho mínimo | Icono |
|---|---|---|
| default | `Size/control-lg` (48) → `size.touch` | `Size/icon-md` (20) → `icon.medium` |
| lg | `Size/control-xl` (56) → `size.fab` | `Size/icon-lg` (24) → `icon.large` |

`label-wrap` (columna del texto): `padding-right` `Spacing/gap-control` (8), solo si `LabelVisible`.
Texto `Type/button` (Inter semibold, 18 de alto). Medidas del archivo (default, «Create»): 100 × 48
(12 + 20 + 8 + 40 + 8 + 12); lg 104 × 56. Sin etiqueta: 44 → el mínimo la deja en 48 × 48 (cuadrada).
Sin trazo en ningún estado.

## Color por Variant, Appearance y State

Igual en los cuatro Shape × Size (medido). `fill A + B` = dos rellenos apilados, B encima (alfa propio de
la variable, no un segundo multiplicador). El texto y el icono comparten tinta.

| Variant · Appearance | Default · Focused | Hover | Pressed | Tinta | Halo del foco |
|---|---|---|---|---|---|
| default · solid | `Action/primary/default` | `…/hover` | `…/pressed` | `Content/on-action` | `Border/ring/default` |
| default · soft | `Surface/accent` | + `Surface/selected` | + `Surface/selected-pressed` | `Content/accent` | `Border/ring/default` |
| secondary · solid | `Action/secondary/default` | `…/hover` | `…/pressed` | `Content/on-secondary` | `Border/subtle` |
| secondary · soft | `Surface/layer-2` | + `Action/ghost/hover` | + `Action/ghost/pressed` | `Content/primary` | `Border/subtle` |
| inverse · solid | `Surface/inverse` | + `Surface/inverse-muted` | + `Surface/inverse-muted` ×2 | `Content/inverse` | `Surface/inverse-muted` |
| cualquiera · Disabled | `Surface/page` + `Action/disabled/default` | | | `Content/disabled` | — |

## Foco

Solo un marco `focus-ring` del tamaño de la raíz, radio del control, trazo `Stroke/focus` (2) **por
fuera** (`OUTSIDE`) en el color del halo de la tabla. **Sin borde propio dentro** (a diferencia de
Button y de TextLink). Los efectos de elevación siguen en Focused.

## Efectos (todos los estados salvo Disabled, que no tiene ninguno)

Cinco en el archivo; comprobados en los píxeles del render (`default · solid`, rounded):

| Efecto | Default · Focused | Hover | Pressed | ¿Pinta? |
|---|---|---|---|---|
| `DROP_SHADOW` `Elevation/shadow-key` | 0 12 blur 16 (spread −4) | 0 20 blur 24 (spread −4) | 0 4 blur 6 (spread −1) | sí, sin el spread |
| `DROP_SHADOW` `Elevation/shadow-ambient` | 0 4 blur 6 (spread −2) | 0 8 blur 8 (spread −4) | 0 2 blur 4 (spread −2) | sí, sin el spread |
| `DROP_SHADOW` `Elevation/shadow-ring` | 0 0 blur 0 spread 1 | igual | igual | **no** (el marco no recorta; fila 0 sobre el nodo = página) |
| `DROP_SHADOW` color del relleno | 0 0 blur 0 spread 1 | igual | igual | **no** (idem) |
| `INNER_SHADOW` `Elevation/highlight` | 0 2 blur 0 | igual | igual | sí: banda de 2 px en el borde superior |

**Ningún spread se pinta, tampoco el negativo.** El marco no recorta su contenido, así que Figma ignora
el spread de un `DROP_SHADOW` (los límites del render sí lo cuentan: 124 × 73 en Default, 140 × 89 en
Hover, 110 × 58 en Pressed, lo que engaña). Medido en los píxeles: a 1 px del borde izquierdo el render
vale 237 (`rgba(0,0,0,.065)`), que es el modelo gaussiano sin spread (245 con él); bajo el botón, 220 frente
a 219 modelado sin spread. En código la elevación son solo `offset y · blur` de la tabla, sin spread.

## Residuos conocidos

- **El halo del foco, sobre la sombra.** En el render del archivo el halo (2 px, α 0.31) se ve sobre la
  página desnuda: a los lados y debajo vale `(190,177,254)` aunque haya sombra bajo él. En CSS el halo es
  un `box-shadow` por encima de la sombra de elevación, así que esa banda sale más oscura (unas 12 a 24
  unidades en la banda inferior). Un fondo opaco detrás del halo lo igualaría, pero rompería el botón sobre
  cualquier fondo que no sea la página. No se copia.
- Los píxeles comparados (Default, Hover, Pressed): sombra debajo y a la izquierda dentro de 6 de 255.

## Lo que el archivo hace y parece raro (se copia igual)

- El relleno de Disabled son dos capas: `Surface/page` y `Action/disabled/default` encima.
- `Hover` y `Pressed` de `soft` e `inverse` apilan una capa translúcida; en `default · solid` y
  `secondary · solid` hay rol propio de hover / pressed.
- La etiqueta lleva 8 px de padding a la derecha además de los 12 de la raíz: con etiqueta, el
  contenido queda 8 px más lejos del borde derecho que del izquierdo.
- Los estados Hover y Pressed cambian solo la elevación y el relleno: el icono y el texto no se mueven.

## Anida

El icono es una instancia de `Plus / Format=Outline, Weight=Regular` (conjunto de iconos del archivo,
ya en código). No anida otros componentes. `FABGroup` vive en la misma página y es otro componente.
