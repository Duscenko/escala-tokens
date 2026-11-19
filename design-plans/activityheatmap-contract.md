# Contrato · ActivityHeatmap y ActivityHeatmapCell (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, página «❖ ActivityHeatmap (PRO)» (2397:80): `ActivityHeatmapCell` (2400:57, set de 12 variantes) y
`ActivityHeatmap` (2400:58, componente suelto, 876×156). Leído con `use_figma` (solo lectura) el 2026-11-19; cada rol de abajo es el que el archivo enlaza.
El handoff (`HANDOFF-dataviz-2026-11-19.md` §3.3) pide lo mismo salvo lo señalado en «Donde el handoff y Figma difieren». **Figma manda; nada se corrige.**

## Qué es
Un año de actividad: un cuadrado por día, una columna por semana (53 semanas × 7 días, las semanas empiezan en domingo). El relleno del cuadrado es la escala secuencial del
gráfico (`Chart/sequential/0…5`): 0 = sin actividad, 5 = lo máximo. **El nivel nunca depende solo del color**: cada celda es un `gridcell` con un `aria-label` que dice
el día y la cuenta («Tuesday, March 18: 8 contributions»). El cambio de año es un SegmentedControl **fuera** del componente; el día enfocado se anuncia y lo muestra el
consumidor en una leyenda bajo la rejilla (`onFocusDay`).

## 0 · Anatomía (capa Figma → slot de código)
| Figma | Código (`data-part="ActivityHeatmap.<slot>"`) | Nota |
|---|---|---|
| `ActivityHeatmap` (VERTICAL, hug) | `root` (`data-escala="ActivityHeatmap"`) | gap `Spacing/gap-control` entre las tres filas |
| `month-labels` (876×16, sin layout, 12 textos `month` a mano) | `monthLabels` + `monthSlot` + `month` | oculto con `MonthLabelsVisible=false` |
| `body` (HORIZONTAL, gap `Spacing/gap-tight`) | `body` | |
| `day-labels` (VERTICAL, 28 de ancho, 7 `day` de 12 de alto) + `label` en Mon · Wed · Fri | `dayLabels` + `day` + `dayLabel` | oculto con `DayLabelsVisible=false` |
| `grid` (53 `week`, HORIZONTAL, gap tight) → `week` (VERTICAL, 7 `cell`, gap tight) | `grid` → `row` → `ActivityHeatmapCell` | ver «Diferencias de estructura» |
| `legend-row` (HORIZONTAL, contenido al final) → `legend` (HORIZONTAL centro, gap tight): `legend-less`, 6 `swatch`, `legend-more` | `legendRow` → `legend` → `legendLabel` + 6 `ActivityHeatmapCell` | oculto con `LegendVisible=false` |
| `ActivityHeatmapCell` (12×12) | `root` (`data-escala="ActivityHeatmapCell"`, `data-value`) | |
| `focus-ring` (rectángulo 14×14, radio 5) | `gapRing` del `root` | `Stroke/focus`, `Border/ring/default`, OUTSIDE, a 1 px de la celda |

## 1 · Propiedades → props
**ActivityHeatmap** (sin ejes; tres booleanos, en el orden del panel):

| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `LegendVisible` | BOOLEAN | `true` | `showLegend` |
| `MonthLabelsVisible` | BOOLEAN | `true` | `showMonthLabels` |
| `DayLabelsVisible` | BOOLEAN | `true` | `showDayLabels` |
| — (datos del código) | | | `data: {date, count}[]` · `thresholds` · `endDate?` · `onFocusDay` · `getCellLabel` · `forceFocusedDate` (docs) · `lessLabel` / `moreLabel` · `aria-label` |

**ActivityHeatmapCell** (dos ejes):

| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Value` 0 · 1 · 2 · 3 · 4 · 5 | VARIANT | `0` | `value` (el handoff lo llama `level`; el eje de Figma es `Value`) |
| `State` Default · Focused | VARIANT | `Default` | `:focus-visible` en vivo + `forceState` en docs |

## 2 · Geometría y roles (leídos del archivo)
| Capa | Valor | Rol | En código |
|---|---|---|---|
| Celda | 12 × 12 | **primitivo** de Dimension `12` (sin rol) | `spacing.3` (el paso de 12) — hallazgo `DIM-01`, aceptado |
| Celda, radio | 4 | `Radius/control` | `radius.control` con el tope de la caja negra (`min(radius.control, radius.sm)`), para que ningún Selectors la vuelva un punto |
| Gap celda↔celda, semana↔semana, día↔grid, `body`, `legend`, `month-labels` | 4 | `Spacing/gap-tight` | `spacing.gap-tight` |
| Gap de la raíz | 8 | `Spacing/gap-control` | `spacing.gap-control` |
| `day` (alto de fila) | 12 | primitivo `12` | `spacing.3` |
| `day-labels` (ancho) | 28 | valor crudo (HUG, hay un 28 en el archivo) | `spacing.6+spacing.1` (24 + 4) |
| Texto de `month`, `label`, `legend-less`, `legend-more` | 16 de alto | `Type/caption`, tinta `Content/secondary` | `type.caption`, `color.content.secondary` |

Medidas del archivo con todo visible: 876 × 156 = 16 (meses) + 8 + 108 (7 × 12 + 6 × 4) + 8 + 16 (leyenda); ancho 28 + 4 + 53 × 12 + 52 × 4 = 876. Sin etiquetas
de día ni de mes ni leyenda (la variante «Compact» del prototipo) queda 844 × 108.

| Valor | Relleno de la celda |
|---|---|
| 0 | `Chart/sequential/0` (sin actividad) |
| 1 · 2 · 3 · 4 · 5 | `Chart/sequential/1 … 5` |

Sin trazo, sin sombra, sin opacidad. Foco: la celda sigue igual y suma **un** anillo (`focus-ring`): rectángulo 14 × 14 (1 px mayor por lado), radio 5 (crudo: hallazgo `DIM-02`), trazo `Border/ring/default`
de `Stroke/focus` (2), alineación OUTSIDE → sin borde propio, a 1 px del cuadrado (el `gapRing` del Button: `outline` 2 px con `outline-offset` 1 px, que sigue el radio + 1).

## 3 · Datos y rejilla (código)
- `data: {date, count}[]` — fechas ISO `YYYY-MM-DD` (UTC, el mismo día en todas las zonas); un día ausente cuenta 0; fechas repetidas se suman; un `count` negativo vale 0.
- La rejilla son las 53 semanas que **terminan en la semana de `endDate`** (por defecto, la fecha más reciente de `data`; sin datos, hoy en UTC). La última columna
  llega hasta `endDate` y no pinta más (el ejemplo del archivo: 52 semanas completas + 3 días, domingo a martes).
- `thresholds` = la cuenta desde la que empieza cada nivel 1…5, ascendente (por defecto `[1, 3, 6, 10, 15]`): nivel 0 si `count = 0` o menor que el primer escalón.
- Etiquetas de mes: una en la columna que contiene el día 1 de cada mes; la primera columna se etiqueta con su propio mes solo si la siguiente etiqueta está a 3 o más columnas.
- Muestra determinista: `apps/storybook/stories/activityHeatmapSample.ts` (sin `Math.random`, sin `Date.now()`): «Figma sample» reproduce celda a celda el cuadro del archivo
  (Value → la cuenta que empieza ese nivel), y `Sparse` / `Dense` son series con semilla.

## 4 · Accesibilidad y teclado (código)
- `role="grid"` con `aria-label` (por defecto «Activity by day»), `aria-rowcount=7`, `aria-colcount=53`; 7 `role="row"` (**los días de la semana**) con `gridcell`s; cada celda con
  `aria-label` = «Tuesday, March 18: 8 contributions» (`1 contribution` en singular; `getCellLabel` para traducir) y `aria-colindex`.
- Un solo punto de Tab (tabindex itinerante): la celda enfocada por última vez (la de `endDate` al principio); las demás `tabindex=-1`.

| Tecla | Acción |
|---|---|
| Tab | entra en la rejilla en su punto de Tab y sale de ella |
| ← → | el mismo día de la semana anterior / siguiente (por semana); se detiene en los extremos; en la última columna se queda en un día que exista |
| ↑ ↓ | el día anterior / siguiente de la semana; se detiene en domingo y sábado |
| Home · End | el primer (domingo) / último (sábado) día de la semana enfocada |
| Ctrl + Home · Ctrl + End | el primer / último día de la rejilla |

- `onFocusDay(day | null)` se dispara al enfocar una celda (teclado, Tab o clic) y con `null` al salir de la rejilla.
- La leyenda, los meses y los días son decorativos (`aria-hidden`): el nombre de cada celda ya lleva la cuenta.
- Foco visible: el anillo sale con `:focus-visible` (teclado), no con el clic.

## 5 · Movimiento (código, por rol)
`ActivityHeatmapCell: { transitions: { root: { 'outline-color': 'use-focus' } } }`. **Sin animación al montar** ni al cambiar los datos; el cambio de año lo anima el consumidor
(`use-page-transition` sobre la región). El anillo es un `outline`: su estilo no se anima, así que aparece de golpe (igual que el de Button); el rol queda declarado.

## 6 · Uso
- **whenToUse:** una cifra por día durante un año (contribuciones, hábitos, sesiones). Va dentro de una tarjeta (`DashboardActivityCard`); el año se cambia con un SegmentedControl fuera.
- **whenNotToUse:** una serie continua → Sparkline; reparto de un total → SplitBar; un valor y su umbral → Gauge. Menos de unas semanas de datos → una tabla.
- **related:** ActivityHeatmapCell, SegmentedControl, Sparkline.

## Diferencias de estructura (a propósito, el aspecto es idéntico)
- Figma pone las **semanas como columnas** (`week` VERTICAL dentro de `grid` HORIZONTAL). Para ARIA una `row` es una línea de la rejilla tal como se ve, y las flechas deben seguir
  lo que ve el ojo (→ va a la derecha), así que el código pone **una fila por día de la semana** con 53 celdas, con el mismo gap y el mismo tamaño: se ve igual, y ← → (semana) / ↑ ↓ (día) son
  las flechas estándar de un `grid`. El slot `week` de Figma es el slot `row` del código.
- Los 12 `month` del archivo están colocados a mano (x = 32 + 16 × columna). El código los coloca en el ritmo de columnas de la rejilla: un hueco por semana, del ancho de una celda.

## Donde el handoff y Figma difieren
- `level` (handoff) → `Value` (Figma) → prop `value`.
- «focus ring `Border/ring/default` · `Stroke/focus`, 1 px outside»: Figma lo dibuja como rectángulo 1 px mayor con trazo de 2 px **OUTSIDE**, o sea 1 px de aire y 2 px de aro; es lo que se copia.
- El handoff lista `showLegend`, `showMonthLabels`, `showDayLabels`; Figma las llama `LegendVisible`, `MonthLabelsVisible`, `DayLabelsVisible`. Se mantienen los nombres de código del handoff
  como props y los de Figma como controles de Storybook (como `LabelVisible` ↔ `hideLabel` en TabBarItem).

## Raro (se copia igual)
- Celda 12 × 12 y fila `day` de 12: enlazadas al **primitivo** `12` de Dimension Primitives, no a un rol de `Size/*` ni de `Spacing/*` (hallazgo `DIM-01`, aceptado; en código, `spacing.3`).
- `day-labels` mide 28 (HUG) aunque sus textos miden 23 · 24 · 14: valor crudo, sin variable.
- En el componente, `week`, `grid` y `body` **recortan el contenido** (`clipsContent`): el anillo de la celda Focused, que sobresale 3 px, queda casi del todo recortado en el render del
  componente (se ve tenue en la celda de la semana 11, martes 18 de marzo). En el set de la celda el anillo se ve entero. El código no recorta: el anillo se ve entero.
- Un anillo `Focused` queda dentro del componente tal como está publicado (semana 11, día 3: «Tuesday, March 18»). La muestra de Storybook lo deja apagado por defecto (`Focused day` lo fija).
- Etiqueta de noviembre: en el archivo está en la columna 44 (x = 736); con las fechas reales (domingo 29 dic 2024 → martes 30 dic 2025) el 1 de noviembre cae en la columna 43. Los otros 11
  meses coinciden columna a columna. El código usa la fecha real.
- El prototipo «Compact» (etiquetas y leyenda ocultas, «for small cards») reduce el ejemplo a 0,8 y deja solo la rejilla (844 × 108 → 675 × 86); en código es `showDayLabels`, `showMonthLabels` y `showLegend` en `false`.
