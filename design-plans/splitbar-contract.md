# Contrato · SplitBar, SplitBarSegment y SplitBarLegendItem (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, página `❖ SplitBar (PRO)` (`2397:81`): set `SplitBar` (`2401:248`), set `SplitBarSegment` (`2401:102`) y set `SplitBarLegendItem` (`2401:211`), leídos con `figma-read-set.js` (solo lectura). Este documento es lo que copian la receta, el componente y Storybook. **Figma manda; nada se corrige.** Donde el handoff (`HANDOFF-dataviz-2026-11-19.md` §3.4) y Figma difieren, gana Figma y queda anotado abajo.

Código: `src/components/escala-ui/split-bar.tsx` · recetas `src/lib/recipes/splitBar.ts` (SplitBar, SplitBarSegment, SplitBarLegendItem) · movimiento `src/lib/recipes/motion.ts` · historias `apps/storybook/stories/SplitBar*.stories.tsx` · catálogo `componentCatalogue.ts` (categoría Indicators).

## Qué es

Una sola barra que es el 100 % de algo, partida en cuotas (`SplitBarSegment`), con una leyenda (`SplitBarLegendItem`) que además apaga y enciende cada serie. Sirve para partes de un todo, hasta ocho: tráfico por fuente, gasto por equipo, almacenamiento por tipo. Una cuota que no es parte de un todo es un `ProgressLine`; una tendencia es un `Sparkline`.

**Color: Chart vs Status.** Los colores son `Chart/series-1…8` (`--color-chart-series-<n>-solid|soft|content`): categorías **sin significado** (una fuente no es mejor que otra), en el orden fijo violeta · teal · ámbar · azul · rosa · lima · magenta · naranja. Cuando el color *significa* bueno o malo (aprobado · fallido, dentro · fuera de presupuesto) se usa `Status/*`, nunca un `Chart/*`. Nunca una opacidad sobre un rol Chart. Los componentes leen solo los roles, jamás las rampas `--color-chart-<hue>-<n>`.

## API

### SplitBar (`2401:248`, componente único, 960 × 88)

| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Bar` | SLOT | seis `SplitBarSegment` | `segments: { id, label, value, series }[]` (`value` = cualquier número ≥ 0; la barra muestra cada uno como su cuota de lo que se ve; `series` 1–8) |
| `Legend` | SLOT | seis `SplitBarLegendItem` | generada de `segments` (un ítem por serie) |
| `LegendVisible` | BOOLEAN | `true` | `showLegend` |
| — | — | — | `aria-label` o `aria-labelledby` (uno obligatorio): el título del gráfico |
| — | — | — | `valueUnit`, `hiddenIds` · `defaultHiddenIds` · `onHiddenIdsChange`, `onSegmentClick`, `leaderBelow` (5), `showLegendValues`, `forceActiveId` (solo docs) |

### SplitBarSegment (`2401:102`, 16 variantes, 240 × 48)

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Series` 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 | VARIANT | `1` | `series` (`"1"`–`"8"` o `1`–`8`). Eje nuevo: **no** es `Variant` (ARC-AXIS-01) |
| `State` Default · Focused | VARIANT | `Default` | CSS `:focus-visible` + `forceState` |
| `Label` | TEXT | `"Organic search"` | `label` |
| `Value` | TEXT | `"41.6%"` | `value` |
| `LabelVisible` | BOOLEAN | `true` | `labelVisible` (la barra lo decide por ancho: `fit`) |
| `ValueVisible` | BOOLEAN | `true` | `valueVisible` (idem) |

### SplitBarLegendItem (`2401:211`, 32 variantes, 156 × 24)

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Series` 1–8 | VARIANT | `1` | `series` |
| `Checked` true · false | VARIANT | `true` | `checked` + `onCheckedChange` (`aria-pressed`) |
| `State` Default · Focused | VARIANT | `Default` | CSS `:focus-visible` + `forceState` |
| `Label` | TEXT | `"Organic search"` | `label` |
| `Value` | TEXT | `"41.6%"` | `value` |
| `ValueVisible` | BOOLEAN | `true` | `valueVisible` |

## Geometría

**SplitBar** (VERTICAL, `FIXED`/`HUG`, no recorta): hueco `Spacing/gap-group` (16) entre `Bar` y `Legend`. `Bar`: HORIZONTAL, hueco 0, `FILL`/`HUG`, **recorta** (`clipsContent`), radio `Radius/action` (12). `Legend`: HORIZONTAL con wrap, hueco `Spacing/gap-group` (16), recorta, `FILL`/`HUG`.

**SplitBarSegment**: HORIZONTAL MIN/CENTER, alto `Size/control-lg` (48), ancho = su cuota del 100 % (240 por defecto), relleno horizontal `Spacing/inset-control` (12, vertical 0), hueco `Spacing/gap-control` (8), no recorta. Texto: `label` `Type/body-sm`, `value` `Type/label`, ambos HUG.
Borde: un solo trazo en el lado **derecho**, `INSIDE`, de ancho `Stroke/focus` (2) y color `Chart/series-<n>/solid`.

**SplitBarLegendItem**: HORIZONTAL MIN/CENTER, alto `Size/control-xs` (24), ancho HUG (156 por defecto), relleno horizontal `Spacing/gap-tight` (4), hueco `Spacing/gap-control` (8), radio `Radius/control` (4). `swatch`: rectángulo 12 × 12 (las dos dimensiones atadas a la primitiva de Dimension `12`, **DIM-01**), radio `Radius/control`. `label` `Type/body-sm`, `value` `Type/label`.

## Color por combinación y estado

### SplitBarSegment

| Series | fill | stroke (borde derecho) | ink (`label`, `value`) |
|---|---|---|---|
| 1…8 | `Chart/series-<n>/soft` | `Chart/series-<n>/solid` | `Chart/series-<n>/content` |

Los 16 colores salen de los roles de los 30 `Chart/*` (`Chart/series-1…8/{solid,soft,content}`), Light y Dark. El estado **no cambia ningún color**: no hay Hover (comportamiento, abajo).

| State | Anillo |
|---|---|
| Default | ninguno |
| Focused | `focus-ring`: rectángulo 240 × 48 en (0, 0), **`INSIDE`**, `Stroke/focus` (2) en los cuatro lados, `Border/ring/neutral`, sin radio (la barra recorta). Código: `ring` = outline 2 px con offset −2 px |

### SplitBarLegendItem

| Checked | swatch | label | value |
|---|---|---|---|
| true | `Chart/series-<n>/solid` | `Content/secondary` | `Content/primary` |
| false | `Surface/muted` | `Content/disabled` | `Content/disabled` |

| State | Anillo |
|---|---|
| Default | ninguno |
| Focused | `focus-ring`: rectángulo 158 × 26 en (−1, −1), radio **5** (= `Radius/control` + 1), `Stroke/focus` (2), `Border/ring/neutral`, **`OUTSIDE`**. Es el anillo del Button: 2 px a 1 px del borde (`gapRing`) |

Sin relleno, sin borde, sin efectos en ninguna variante del legend.

## Efectos
Ninguno en los tres sets.

## Instancias dentro de la barra (lo que Figma dibuja y el código decide por ancho)

El `SplitBar` de la página muestra seis segmentos de 960 px (399 · 238 · 183 · 95 · 30 · 26 de ancho):
- los de 399, 238 y 183 llevan `Label` y `Value`;
- el de 95 (9,9 %) lleva **solo el valor** (`LabelVisible=false`);
- los de 30 (3,1 %) y 26 (1,5 %) no llevan texto (`LabelVisible=false`, `ValueVisible=false`) y **su relleno horizontal es 0** (en el original quedan a 26 px mínimo).
Código: la barra mide el texto natural y decide `fit` por segmento: `full` (etiqueta + valor) si cabe, `value` si solo cabe el valor, `none` si no cabe nada; en `none` el relleno cae a 0 (`data-fit="none"`). El ancho es siempre la cuota real: `width` en porcentaje (el relleno y el borde no la deforman).

## Comportamiento (lo decide el código, el handoff §3.4)

- **Raíz** `role="group"` nombrado por el título del gráfico. Cada segmento es un `<button>` con `aria-label` "Organic search, 41.6%, 41,300 sessions" (etiqueta, cuota, valor + `valueUnit`); el texto visible va `aria-hidden`. Cada legend es un `<button aria-pressed>`.
- **Sin color Hover.** Pasar el puntero o enfocar un segmento lo **ensancha** (`width` hasta la cuota que necesita su texto, máximo 60 % de la barra) y los demás ceden; transición `use-hover`. `forceActiveId` lo fija para docs.
- **Etiquetas**: dentro si caben; solo el valor si es estrecho; **bajo 5 %** (`leaderBelow`) el texto sale de la barra y va en una llamada bajo ella con línea guía (`Chart/series-<n>/solid`, `Stroke/divider`, fila de `Size/control-xs`). Figma lo llama "consumer layout": es solo código y se anota como adición.
- **Apagar una serie** (legend): las demás se reparten al 100 % — los que crecen con `use-travel-in`, los que encogen con `use-travel-out`. La última serie visible no se puede apagar. Los porcentajes que se leen son los de lo que se ve (el de una serie apagada se queda con su cuota del total completo, en `Content/disabled`). Un segmento apagado queda `aria-hidden`, fuera del orden de tabulación y sin borde.
- **Movimiento reducido**: lo decide la fundación, no el componente: los roles de movimiento caen al `fade` del sistema (`--motion-duration-fade`, 160 ms en Standard), sin recorrido. El handoff pedía "instantáneo"; la regla de la fundación manda y queda anotado.
- **Teclado**: Tab recorre segmentos y luego legend; Enter o Espacio pulsan (un segmento llama a `onSegmentClick`, un legend apaga o enciende su serie). Sin flechas: no es un tablist.

## Lo que el archivo hace y parece raro (se copia igual)

- **`Stroke/focus` como ancho del borde del segmento.** Figma ata el trazo derecho del segmento (2 px) a `Stroke/focus`, que es el ancho del anillo de foco. Se copia igual y queda como candidato **DIM-03** (no se inventa un rol `Stroke/data`).
- **Los dos anillos de foco son distintos**: el del segmento va **dentro** (INSIDE, sin hueco) y el del legend va **fuera** con hueco de 1 px (OUTSIDE, radio 5). Se copian los dos.
- **Swatch 12 × 12 atado a la primitiva `12`**, no a un rol (DIM-01, Aceptado).
- Los segmentos estrechos del `SplitBar` de la página tienen **relleno 0** y ancho 26–30; en código el relleno cae a 0 y el ancho es proporcional (más fino).
- El legend del `SplitBar` de la página muestra los valores del conjunto completo; en código los valores son los de lo que se ve (ver Comportamiento).
- No hay variantes Hover ni Pressed en ningún set, ni color de hover.
- El set `SplitBar` es un componente único (sin ejes); `Bar` y `Legend` son slots.
- `ValueVisible` y `LabelVisible` de los segmentos son booleanos de Figma; el código los decide por ancho dentro de la barra (`fit`) y los expone en el segmento suelto.
- Los tres sets aún no están en `spec/figma-components.json` (el inventario generado es anterior a la página): las familias van con `page: "SplitBar (PRO)"` en `storybook-families.json` y no hay entrada en `figma-components.status.json` que quitar.

## Anida
Ninguno de otros componentes del archivo: `SplitBar` anida `SplitBarSegment` y `SplitBarLegendItem` (se construyen antes). Sus textos usan los estilos `Type/body-sm` y `Type/label`.

## Accesibilidad (documentación)
- Nombre del gráfico: `aria-label` o `aria-labelledby` obligatorio (uno de los dos) en la raíz `role="group"`.
- Segmentos y legend son botones nativos: foco con Tab, Enter/Espacio. Anillos de foco visibles (2 px) en ambos.
- El color no es el único separador: cada segmento tiene un borde `Chart/series-<n>/solid` y el legend repite etiqueta y valor en texto.
- Contraste, medido (WCAG 2.x, hex resueltos de Figma): `Chart/series-n/solid` sobre `Surface/page` ≥ 3 : 1 en las 8 series, Light y Dark (borde, swatch). Texto `Chart/series-n/content` sobre su propio `soft` (lo que dibuja el segmento): **Dark 6,3–8,0 : 1 (todas pasan 4,5)**; **Light 4,31 · 4,40 · 4,46 · 4,30 en las series 2 · 3 · 4 · 6 (bajo 4,5)**, 4,71 · 4,79 · 4,82 · 4,56 en 1 · 5 · 7 · 8. Es lo que el archivo hace (los roles Chart se validaron contra la página, no contra `/soft`): se copia y se anota como hallazgo candidato **COL-CHART-01**. El legend en estado apagado usa `Content/disabled` sobre la página: 3,58 : 1 en Light y 4,29 : 1 en Dark (**COL-CHART-02**; el botón no está `disabled`, así que axe lo exige). Las historias excluyen del panel a11y solo esos elementos, con el motivo.
