# Contrato · TextLink (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `TextLink` (`358:6494`,
144 variantes), leído con la Plugin API (solo lectura). Lo copian la receta, el componente y
Storybook. **Figma manda; nada se corrige.**

Descripción del set: «Inline text link for navigation and in-flow actions. Hover and Pressed
always show the underline; UnderlineVisible controls it in the other states. Visited is a
link-only state. Variants critical, success and info use Status roles. Always give the link a
descriptive label; icon-only use needs an accessible name (aria-label).»

## API

| Figma | Tipo | Defecto | Opciones (orden del archivo) | React |
|---|---|---|---|---|
| `Size` | VARIANT | `default` | xs · sm · default · lg | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Pressed · Visited · Focused · Disabled | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` | VARIANT | `default` | inverse · success · info · default · secondary · critical | `variant` |
| `Label` | TEXT | «Inline Text Link» | — | `children` |
| `IconLeadingVisible` | BOOLEAN | `true` | — | `leading?: ReactNode` (presente = visible) |
| `IconTrailingVisible` | BOOLEAN | `true` | — | `trailing?: ReactNode` |
| `IconLeadingIcon` | INSTANCE_SWAP | `icon/plus` | — | el nodo de `leading` |
| `IconTrailingIcon` | INSTANCE_SWAP | `icon/arrow-right` | — | el nodo de `trailing` |
| `UnderlineVisible` | BOOLEAN | `true` | — | `underline?: boolean` |

144 = 4 · 6 · 6. El orden de las propiedades que no son variante es el de la API (no pude ver
el panel del playground; si difiere, se ajusta el orden de los controles de la historia).

`Visited`: el archivo lo pinta **igual que Default** en las seis variantes (no hay rol «visited»).
En código `forceState="Visited"` existe, pero `:visited` real no pinta nada: darle regla propia
haría que un enlace visitado ignorase el hover.

## Geometría por tamaño

Raíz: horizontal, items al inicio, centrados en vertical, ancho = contenido, padding X
`Spacing/gap-tight` (4) en los dos lados, padding Y 0, radio `Radius/control` (8) → `radius.control`.

| Size | Gap | Icono (marco y glifo) | Estilo del texto | Alto del texto |
|---|---|---|---|---|
| xs | `Spacing/gap-tight` (4) | `Size/icon-sm` (16) → `icon.small` | `Type/body-sm` 12 | 18 |
| sm | `Spacing/gap-tight` (4) | `Size/icon-sm` (16) | `Type/body-md` 14 | 21 |
| default | `Spacing/gap-control` (8) | `Size/icon-md` (20) → `icon.medium` | `Type/body-lg` 16 | 25 |
| lg | `Spacing/gap-control` (8) | `Size/icon-md` (20) | `Type/body-xl` 18 | 26 |

Medidas del archivo (default · Default): 177 × 25. `label-wrap` es una columna con el texto y el
subrayado; el subrayado es un rectángulo absoluto de `Stroke/divider` (1) de alto, ancho del texto,
pegado al borde inferior del texto (y = alto − 1), relleno del color del texto.

## Color por Variant y State

Igual en los cuatro tamaños (medido). Texto, subrayado e iconos comparten un solo color.

| Variant | Default · Visited · Focused | Hover · Pressed | Disabled |
|---|---|---|---|
| default | `Content/link/default` | `Content/link/hover` | `Content/disabled` |
| secondary | `Content/secondary` | `Content/primary` | `Content/disabled` |
| inverse | `Content/inverse` | `Content/inverse` | `Content/disabled` |
| critical | `Status/critical/content` | igual | `Content/disabled` |
| success | `Status/success/content` | igual | `Content/disabled` |
| info | `Status/info/content` | igual | `Content/disabled` |

Sin relleno en ningún estado.

## Subrayado

Visible en Default, Visited, Focused y Disabled según `UnderlineVisible` (defecto `true`); **en
Hover y Pressed siempre visible**, la propiedad no se aplica ahí.

**Opacidad del nodo `underline`: 0.4 en Default, Visited, Focused y Disabled; 1 en Hover y Pressed**
(medido en la API y en los píxeles del render: la fila del subrayado en Default es la tinta al 40 %
sobre la página, `(194,180,230)` frente a `#6945c1`). Es la única opacidad del archivo; en receta es
la propiedad `opacity` (valor plano, fuera de las referencias a tokens).

## Foco

Solo en `Focused`: trazo de `Stroke/focus` (2) **por dentro** + un marco `focus-ring` del tamaño de la
raíz con trazo de 2 **por fuera**.

| Variant | Borde (2, dentro) | Halo (2, fuera) |
|---|---|---|
| default | `Border/focus` | `Border/ring/default` |
| secondary | `Border/strong` | `Border/subtle` |
| inverse | `Border/inverse` | `Surface/inverse-muted` |
| critical · success · info | `Status/<x>/border-strong` | `Status/<x>/border` |

## Efectos

Ninguno.

## Lo que el archivo hace y parece raro (se copia igual)

- **El estado Focused es 4 px más grande en cada eje** (181 × 29 frente a 177 × 25): el trazo de 2 px
  cuenta dentro del layout (`strokesIncludedInLayout`) y empuja el contenido 2 px. En código el
  padding de Focused suma el trazo (`gap-tight + stroke.focus` en X, `stroke.focus` en Y), así que el
  enlace crece igual al recibir el foco. Es un salto de layout; lo dice el archivo.
- **`Type/body-xl` no es un rol**: el estilo del archivo está ligado a los primitivos de la escala
  (`size/text-xl` 18, `line-height/text-xl` 26, `letter-spacing/text-xl` −0.2, `weight/regular`), no
  a `role/body-xl/*` como los otros tres. En código la receta lo referencia como el paso `text-xl`
  de la escala, sin inventar un rol.
- Hover y Pressed pintan igual (ni siquiera cambian en critical / success / info / inverse).
- La primera lectura del set omitió la opacidad de nodo (una versión recortada del script); la detectó la
  comparación de píxeles. `figma-read-set.js` completo ya la lista.

## Anida

Los iconos son instancias de `icon/<nombre> / Weight=Regular` (conjunto de iconos del archivo, ya en
código). No anida otros componentes.
