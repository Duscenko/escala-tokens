# Contrato · ButtonGroup (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ ButtonGroup (✓)`, tres sets
leídos con `use_figma` (solo lectura):

| Set | Nodo | Variantes | Ejes |
|---|---|---|---|
| `ButtonGroup` | `351:8921` | 100 (120 menos `pill × vertical`) | Size · Variant · Shape · Orientation + Item1…5Visible |
| `ButtonGroupItem` | `350:5337` | 400 | Size · State · Variant · IconOnly · Active + Label, iconos, LoadingVisible |
| `ButtonGroupDivider` | `351:410` | 8 | Variant · Orientation |

Los tres se construyen en `components/escala-ui/button-group.tsx`, cada uno con su receta
(`BUTTON_GROUP`, `BUTTON_GROUP_ITEM`, `BUTTON_GROUP_DIVIDER` en `recipes/actions.ts`) y su entrada de
catálogo. **Figma manda; nada se corrige.** Los items NO son instancias de `Button`: el archivo los
dibuja como un set propio (sin radio, sin borde, otra paleta por variante), así que el código también.

## API

### ButtonGroup

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · lg · xl · default | VARIANT | `default` | `size` (pasa a los items por contexto) |
| `Variant` outline · default · inverse · secondary | VARIANT | `default` | `variant` (items + divisores) |
| `Shape` rounded · pill · square | VARIANT | `rounded` | `shape` |
| `Orientation` horizontal · vertical | VARIANT | `horizontal` | `orientation` |
| `Item1Visible` … `Item5Visible` | BOOLEAN | true · true · true · false · false | los hijos: un `ButtonGroupItem` por item visible; el divisor entre dos items lo pone el grupo |

`pill × vertical` no existe en el archivo (lo dice la descripción del set): el componente lo
degrada a `rounded` y avisa en desarrollo.

### ButtonGroupItem

| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default · lg · xl | VARIANT | `default` | contexto del grupo, o `size` |
| `State` Default · Hover · Pressed · Focused · Disabled | VARIANT | `Default` | CSS + `forceState`; `disabled` |
| `Variant` outline · default · inverse · secondary | VARIANT | `default` | contexto del grupo, o `variant` |
| `IconOnly` false · true | VARIANT | `false` | `iconOnly` (necesita `aria-label`) |
| `Active` false · true | VARIANT | `false` | `active` → `aria-pressed` |
| `Label` | TEXT | "Label" | `children` |
| `IconLeadingVisible` + `IconLeadingIcon` | BOOLEAN + SWAP | false · `Plus` | `leading` |
| `IconTrailingVisible` + `IconTrailingIcon` | BOOLEAN + SWAP | false · `CaretDown` | `trailing` |
| `LoadingVisible` | BOOLEAN | false | `loading` (spinner DESPUÉS de la etiqueta, como en el archivo; `aria-busy`) |

### ButtonGroupDivider

`Variant` (defecto `default`) · `Orientation` (defecto `horizontal`). Grosor `Stroke/divider` (1px);
el eje cruzado se estira (FILL). `Orientation=horizontal` = la línea vertical entre items en fila.

## Geometría

### Grupo
Auto-layout sin gap ni padding (`Spacing/none`), HUG, `clipsContent` true. Radio por Shape:
rounded `Radius/action` (12) · pill `Radius/full` · square `Radius/none`. Sin relleno ni trazo propios.
Efecto: estilo `Shadow/xs` (`DROP_SHADOW 0 0 0 1 Elevation/shadow-ring` + `0 1 2 0 Elevation/shadow-ambient`;
el frame recorta, así que el spread SÍ se pinta).
- Horizontal: items HUG ancho / FIXED alto, divisores FIXED 1 × FILL.
- Vertical: items FILL ancho, divisores FILL × 1.
- Shape `pill`: el grupo sobrescribe el padding horizontal de cada item a `Spacing/inset-surface` (20).
- Variant `outline`: un rectángulo `border` absoluto (STRETCH) encima de todo: trazo `Border/control`
  1px INSIDE, radio = el del grupo.

### Item por tamaño

| Size | Alto | Padding X | Gap | Icono | Spinner | Texto |
|---|---|---|---|---|---|---|
| xs | `Size/control-xs` 24 | `Spacing/inset-control` 12 | `Spacing/gap-tight` 4 | `Size/icon-sm` 16 | 16 | `Type/button` |
| sm | `Size/control-sm` 32 | 12 | `gap-tight` 4 | 16 | 16 | `Type/button` |
| default | `Size/control-md` 40 | 12 | `gap-control` 8 | `Size/icon-md` 20 | 16 | `Type/button` |
| lg | `Size/control-lg` 48 | 12 | `gap-control` 8 | `Size/icon-lg` 24 | 20 | `Type/button` |
| xl | `Size/control-xl` 56 | 12 | `gap-control` 8 | 24 | 20 | `Type/button` |

IconOnly: ancho = alto (`Size/control-*`), padding 0, solo el icono líder. Sin radio (lo recorta el grupo),
sin trazo.

## Color por Variant × estado (item)

| Variant | Default | Hover | Pressed | Active (Default · Hover · Pressed) | Disabled | Tinta |
|---|---|---|---|---|---|---|
| default | `Action/primary/default` | `…/hover` | `…/pressed` | `…/pressed` (los tres) | `Surface/page` + `Action/disabled/default` | `Content/on-action` |
| secondary | `Action/secondary/default` | `…/hover` | `…/pressed` | `…/pressed` | idem | `Content/on-secondary` |
| inverse | `Surface/inverse` | + `Surface/inverse-muted` ×1 | + ×2 | + ×2 | idem | `Content/inverse` |
| outline | — | `Action/ghost/hover` | `Action/ghost/pressed` | `Surface/selected` · `Surface/selected-pressed` · `Surface/selected-pressed` | — | `Content/primary`; activo `Content/accent` |

Disabled: tinta `Content/disabled` en todas, también activo. Focused: el relleno de Default (o de Active),
más un rectángulo `focus-ring` absoluto, trazo 2px INSIDE, radio 0: default · outline
`Border/ring/default`, secondary `Border/subtle`, inverse `Surface/inverse-muted`. Sin halo exterior.

## Divisor

default `Action/primary/pressed` · secondary `Border/subtle` · inverse `Border/inverse` · outline `Border/control`.

## Lo que el archivo hace y parece raro (se copia igual)
- La visibilidad del divisor N va atada a `ItemNVisible`: si se oculta el item 1, el archivo deja un divisor
  delante del item 2. En código el divisor va solo ENTRE items, así que ese caso no se reproduce.
- Los divisores ocultos 4 y 5 de `secondary` llevan `Border/accent` (los visibles `Border/subtle`):
  una sobrescritura vieja en capas ocultas. Se copia la de los visibles.
- `Size` del grupo en orden `xs · sm · lg · xl · default`; el del item `xs · sm · default · lg · xl`.
- El ancho de un item con etiqueta no depende del Size (mismo padding 12 en todos).
- `Shape=pill` + `vertical` no existe.

## Anida
`ButtonGroupItem` y `ButtonGroupDivider` (este archivo). Iconos: `Plus`, `CaretDown` (Phosphor).
