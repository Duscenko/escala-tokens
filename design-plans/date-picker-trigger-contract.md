# Contrato · DatePickerTrigger (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ DatePicker (✓)`, set `DatePickerTrigger`
(`425:199`, 36 variantes), leído con `figma-read-set.js` (solo lectura). **Figma manda; nada se corrige.**
El otro set de la página, `DatePickerPopover` (`425:2276`, 4 variantes), es el siguiente elemento de la cola
y vivirá en el mismo archivo (`escala-ui/date-picker.tsx`).

> Estado: HECHO (2026-11-12). Receta, componente, catálogo, Storybook y medida cerrados. Medido en Storybook (Light y Dark, las 36 variantes): 280×32 · 40 · 48; icono x13 (x14 Focused) de 16 · 20 · 16; texto x37 · 41 (x38 · 42 Focused) y ancho 230 · 226 (228 · 224); radio 12; trazo 1 / 2 Focused; halo 2px fuera solo en Focused; foco real con Tab da el mismo borde y halo. Axe: solo `Content/subtle` sobre `Surface/input` en Dark, 3.16:1 (copiado del archivo; igual que InputTagOption).

Descripción del set: «Input-styled button that opens DatePickerPopover: leading calendar icon plus placeholder or
formatted date.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` lg · sm · default | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Disabled · Loading | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `forceState`; `aria-invalid` · `disabled` · `loading` |
| `Value` placeholder · filled | VARIANT | `placeholder` | sin prop: con `valueText` se ve el valor, sin él el placeholder |
| `PlaceholderText` | TEXT | «Select date» | `placeholderText` |
| `ValueText` | TEXT | «Nov 12, 2026» | `valueText` (un `Date` se formatea «Nov 12, 2026») |

El tablero de uso del archivo nombra las props «1:1 con código» (`placeholderText`, `valueText`): se copian.

## Geometría por tamaño (raíz horizontal MIN / centro, 280 de ancho en el archivo)

| Size | Alto | Padding X | Gap | Icono | Texto |
|---|---|---|---|---|---|
| sm | `Size/control-sm` 32 | `Spacing/inset-control` 12 | `Spacing/gap-control` 8 | 16 | `Type/body-sm` 12/18 |
| default | `Size/control-md` 40 | 12 | 8 | 20 | `Type/body-md` 14/21 |
| lg | `Size/control-lg` 48 | 12 | 8 | 16 | `Type/body-md` 14/21 |

Radio `Radius/action` (12). Trazo `Stroke/control` 1 INSIDE y **dentro del layout** (`strokesIncludedInLayout`):
el contenido empieza en x 13. Icono y spinner sin variable de tamaño (instancias 16 · 20 · 16).

## Color por estado (idéntico en los tres tamaños y en ambos Value)

| State | Fill | Stroke | Texto | Icono | Halo |
|---|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` 1 | placeholder `Content/subtle` · valor `Content/primary` | `Content/secondary` | — |
| Hover | `Surface/input` | `Border/control-hover` 1 | igual | igual | — |
| Focused | `Surface/input` | `Border/focus` **2** (dentro del layout: contenido en x 14, texto 2px más estrecho) | igual | igual | `focus-ring` rect. `Border/ring/default` 2 OUTSIDE |
| Invalid | `Surface/input` | `Status/critical/border-strong` 1 | igual | igual | **ninguno** |
| Disabled | `Surface/muted` | `Border/control` 1 | `Content/disabled` | `Content/disabled` | — |
| Loading | `Surface/input` | `Border/control` 1 | igual que Default | Spinner `Content/secondary` en lugar del icono | — |

Sin efectos (drop / inner shadow) en ninguna variante.

## Lo que el archivo hace y parece raro (se copia igual)
- La descripción y el tablero de uso hablan de «xs 32 / sm 36 / default 40»; los números reales son sm 32 · default 40 · lg 48.
- El icono mide 16 en lg (igual que en sm) y 20 en default.
- Invalid no lleva halo (los inputs sí) y Disabled rellena con `Surface/muted`, no con el lavado `action.disabled`.
- Focused engorda el trazo a 2 dentro del layout: el contenido se desplaza 1px y el texto pierde 2px de ancho.
- El Spinner es una instancia 16 · 20 · 16 con su glifo de 16 anclado arriba a la izquierda.

## Anida
`icon/calendar` (Phosphor `calendar-blank` regular) y `Spinner`.
