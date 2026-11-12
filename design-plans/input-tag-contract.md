# Contrato · InputTag · InputTagChip · InputTagOption (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ InputTag (✓)`: sets
`InputTag` (`390:744`, 72 variantes), `InputTagChip` (`388:235`, 40) e `InputTagOption` (`390:793`, 8),
leídos con `figma-read-set.js` (solo lectura). **Figma manda; nada se corrige.**

> Estado: HECHO (2026-11-12). Receta, componentes, catálogo, Storybook y medida cerrados. Medido en Storybook (Light): cajas 360×40 · outside filled 68 · chips 18/20/24/28/32 con anchos del archivo (+2 en Focused y critical) · placeholder 334 → 310 con Spinner · opción 240×32. Axe limpio salvo `InputTagOption.meta` (`Content/subtle` sobre `Surface/input`: 3:1 Light, 3.16:1 Dark; copiado del archivo).

## InputTagChip (`388:235`)

Descripción del set: «Removable tag chip used inside InputTag; Variant critical marks tags past the maximum.
When RemoveVisible is on, the remove control needs an accessible name such as Remove plus the label.»

### API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default · lg · xl | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Disabled | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` default · critical | VARIANT | `default` | `variant` |
| `Label` | TEXT | «Design» | `children` |
| `RemoveVisible` | BOOLEAN | true | `onRemove` presente / `removable` |

### Geometría por tamaño (raíz horizontal, centrada)

| Size | Alto | Padding X | Gap | Icono ✕ | Texto |
|---|---|---|---|---|---|
| xs | 18 (sin variable) | 6 (sin variable) | `Spacing/gap-tight` 4 | 10 | `Type/caption` |
| sm | 20 (sin variable) | `Spacing/gap-control` 8 | `Spacing/gap-tight` 4 | 12 | `Type/label` |
| default | `Size/control-xs` 24 | `Spacing/gap-control` 8 | 6 (sin variable) | 14 | `Type/label` |
| lg | 28 (sin variable) | 10 (sin variable) | 6 (sin variable) | `Size/icon-sm` 16 | `Type/body-md` |
| xl | `Size/control-sm` 32 | `Spacing/inset-control` 12 | `Spacing/gap-control` 8 | 18 (sin variable) | `Type/body-lg` |

Radio `Radius/control` en todos. El ✕ es una instancia de `icon/close` (Weight=Regular).
Trazo (solo Focused y critical): `Stroke/control` 1 INSIDE.

### Color

| Variant · State | Fill | Stroke | Tinta (texto y ✕) | Halo |
|---|---|---|---|---|
| default · Default | `Surface/muted` | — | `Content/primary` | — |
| default · Hover | `Surface/muted-hover` | — | `Content/primary` | — |
| default · Focused | `Surface/muted` | `Border/focus` | `Content/primary` | `Border/ring/default` 2 OUTSIDE (`focus-ring`) |
| critical · Default | `Status/critical/surface` | `Status/critical/border` | `Status/critical/content` | — |
| critical · Hover | `Status/critical/surface-pressed` | `Status/critical/border` | `Status/critical/content` | — |
| critical · Focused | `Status/critical/surface` | `Status/critical/border-strong` | `Status/critical/content` | `Status/critical/border` 2 OUTSIDE |
| * · Disabled | `Action/disabled/default` | — | `Content/disabled` | — |

### Lo que el archivo hace y parece raro (se copia igual)
- Alto, padding y gap de xs, sm y lg (y varios valores de default y xl) son números sin variable.
- Focused crece 2px en ancho (76 → 78): el trazo INSIDE cuenta en el layout (`strokesIncludedInLayout`).
- critical lleva trazo siempre; el chip por defecto solo lo lleva en Focused.
- El nombre accesible del ✕ lo pone el código («Remove» + etiqueta).

## InputTagOption (`390:793`)

Descripción: «Suggestion row in the InputTag dropdown, either an existing option or a create-new action. Render as
a listbox option with aria-selected and arrow-key navigation.»

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Type` option · create | VARIANT | `option` | `type` |
| `State` Default · Hover · Focused · Disabled | VARIANT | `Default` | CSS + `forceState`; `data-disabled` |
| `Label` | TEXT | «Design» (create: «Create “Design”») | `children` |
| `Meta` | TEXT | «12» | `meta` |
| `BadgeVisible` | BOOLEAN | true | `badge` (el punto) |
| `MetaVisible` | BOOLEAN | true | `meta` presente |

Un solo tamaño: 240×32 (ancho sin variable), fila horizontal MIN/centro, gap `Spacing/gap-control` 8, padding X
`Spacing/gap-control` 8, alto `Size/control-sm` 32, radio `Radius/control`, texto `Type/body-md`.
Hijos option: `badge` (círculo 8×8, `Status/success/content`), `label`, `meta` (`Type/caption`, `Content/subtle`).
Hijos create: `icon` (instancia `icon/plus`, 14×14, `Content/primary`), `label`.

| State | Fill | Stroke | Tinta |
|---|---|---|---|
| Default | `Surface/input` | `Border/control` 1 INSIDE | label `Content/primary` |
| Hover | `Surface/muted-hover` | — | `Content/primary` |
| Focused | `Surface/muted-hover` | `Border/focus` 1 INSIDE + `focus-ring` `Border/ring/default` 2 OUTSIDE | `Content/primary` |
| Disabled | `Action/disabled/default` | `Border/control` 1 INSIDE | label, meta, badge e icono `Content/disabled` |

Raro: la fila lleva fill y borde de CAMPO (`Surface/input` + `Border/control`) en reposo, no de fila de menú; Hover
quita el trazo.

## InputTag (`390:744`)

Descripción: «Multi-value text field that turns entries into removable tag chips, inline or stacked outside the
field. Keep a visible label, announce added and removed tags to screen readers and expose the error text through
aria-describedby.»

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Layout` inline · outside | VARIANT | `inline` | `layout` |
| `Size` sm · default · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Disabled · Loading | VARIANT | `Default` | CSS (`:hover`, `:focus-within`) + `forceState`; `aria-invalid`; `disabled`; `loading` |
| `Value` placeholder · filled | VARIANT | `placeholder` | ninguno: `value` con o sin tags |
| `Placeholder` | TEXT | «Add tag…» | `placeholder` |

El ancho (360) no tiene variable: lo pone quien lo usa.

### Layout inline (la raíz es la caja)

Horizontal WRAP, MIN/centro, gap y gap de fila `Spacing/gap-tight` 4, padding Y `Spacing/gap-tight` 4 y X
`Spacing/gap-control` 8, radio `Radius/action`, trazo `Stroke/control` 1 INSIDE **dentro del layout**
(`strokesIncludedInLayout`). El alto es un MÍNIMO sin variable: 32 · 40 · 48 (sm · default · lg).
La tipografía del texto es `Type/placeholder`.

| Size | min-alto | Chip que anida |
|---|---|---|
| sm | 32 | `InputTagChip` Size=xs (18) |
| default | 40 | `InputTagChip` Size=sm (20) |
| lg | 48 | `InputTagChip` Size=default (24) |

### Layout outside (la caja y los chips por separado)

Raíz vertical, gap `Spacing/gap-control` 8, sin fill ni trazo. Hijo `field`: horizontal, centrado, alto
`Size/control-sm|md|lg` (32 · 40 · 48) FIJO, padding X `Spacing/inset-control` 12, gap `Spacing/gap-control`,
radio `Radius/action`, mismo fill, trazo y halo que la caja inline; el placeholder crece (grow 1). Debajo
`tags`: horizontal WRAP, gap `Spacing/gap-tight` 4, ancho completo; **solo existe con Value=filled**
(alto = el del chip: 18 · 20 · 24, mismos chips que inline).

### Color por State (idéntico en inline y en el `field` de outside)

| State | Fill | Stroke | Halo (2px OUTSIDE, `focus-ring`) | Texto |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | placeholder `Content/subtle` |
| Hover | `Surface/input` | `Border/control-hover` | — | `Content/subtle` |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | `Content/subtle` + caret 1×14 `Content/primary` |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | `Content/subtle` |
| Disabled | `Action/disabled/default` | `Border/control` | — | `Content/disabled`; los chips son State=Disabled |
| Loading | `Surface/input` | `Border/control` | — | sin placeholder: instancia `Spinner` 16×16 (con tags, los chips son State=Disabled) |

En outside el spinner va dentro del `field`, a la derecha del placeholder (que se estrecha 334 → 310).

### Lo que el archivo hace y parece raro (se copia igual)
- Con Value=filled el placeholder SIGUE dibujado detrás de los chips («Add tag…» al final): en código el `<input>`
  conserva su `placeholder` aunque haya tags (el viejo componente lo quitaba).
- El halo es un hijo `focus-ring` con trazo 2 OUTSIDE (no una sombra): es el mismo halo de campo que el Input.
- Invalid también dibuja halo (`Status/critical/border`), como el Input.
- Loading pinta los chips como Disabled y reemplaza el placeholder por el Spinner.
- El alto inline es un mínimo (crece al envolver); en outside el alto del campo es fijo.
- El chip default usa gap 6 y padding 10 en lg: números sin variable (ver el chip).

## Anida
`InputTagChip` (los tags), `Spinner` (Loading), y el chip nombra `icon/close`. `InputTagOption` es la fila del
desplegable que acompaña al campo (se construye como pieza propia, no dentro del campo).
