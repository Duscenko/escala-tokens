# Contrato · Textarea (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `Textarea` (`394:152`, 36 variantes),
leído con `figma-read-set.js` (solo lectura). Este documento es lo que copian la receta, el componente
y Storybook. **Figma manda; nada se corrige.**

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` sm · default · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Loading · Disabled | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `aria-invalid` · `loading` · `disabled`; `forceState` |
| `Value` placeholder · filled | VARIANT | `placeholder` | sin prop: el valor vacío muestra `::placeholder` |
| `Placeholder` | TEXT | `"Write a message…"` | `placeholder` |
| `Text` | TEXT | `"Tell us about the project: goals, timeline…"` | `value` / `defaultValue` |
| `ResizeGlyphVisible` | BOOLEAN | `false` | `resizeGlyph` (el glifo arrastra la caja en vertical) |

Etiqueta, ayuda y error los pone `Field` (envuelve el `<textarea>`: `id`, `aria-describedby`, `aria-invalid`, `disabled`).

## Geometría por tamaño

Ancho 360 en el archivo (sin variable); en código `w-full`, la story fija 360. Trazo `Stroke/control` INSIDE
y **`strokesIncludedInLayout`**: el texto empieza en padding + trazo.

| Size | Alto (sin variable) | Padding Y · X | Texto | Glifo esquina | Texto empieza en |
|---|---|---|---|---|---|
| sm | 72 (`size.compact+size.control`) | 6 · `Spacing/gap-control` 8 | `Type/body-sm` | 14 | 9, 7 |
| default | 96 (`size.touch×2`) | `Spacing/gap-control` 8 · `Spacing/inset-control` 12 | `Type/body-md` | 16 | 13, 9 |
| lg | 128 (`size.2xl×2`) | `Spacing/inset-control` 12 · `Spacing/gap-group` 16 | `Type/body-lg` | 18 | 17, 13 |

Radio `Radius/action`. Invalid y Loading: padding derecho **36** (sin variable) en los tres tamaños.
Glifo de esquina absoluto en (ancho − padX − glifo, padY). Glifo de redimensionar: 8×8, a 6 px del borde
inferior derecho, trazo 1.5 redondeado, `M 8 0 L 0 8 M 8 4 L 4 8`.

## Color por estado

| State | Fill | Stroke | Halo (2px OUTSIDE) | Texto · placeholder · grip | Esquina |
|---|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` · `Content/subtle` · `Content/subtle` | — |
| Hover | `Surface/input` | `Border/control-hover` | — | igual | — |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | igual | — |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | igual | icon/warning `Status/critical/content` |
| Loading | `Surface/input` | `Border/control` | — | igual | Spinner `Content/secondary` |
| Disabled | `Action/disabled/default` | `Border/control` | — | `Content/disabled` (los tres) | — |

## Lo que el archivo hace y parece raro (se copia igual)
- El Spinner de Loading es una instancia de 14 · 16 · 18 cuyo glifo queda fijo a 16 px arriba a la izquierda
  (el frame interno `icon-spinner` está anclado MIN): en sm desborda 2 px, en lg queda descentrado 1 px.
- En lg, el glifo de esquina (18) queda a 3 px del texto (padding derecho 36 fijo).
- Alturas, padding sm 6, padding derecho 36 y tamaños de glifo sin variable.

## Anida
Spinner (glifo), icon/warning (Phosphor regular).
