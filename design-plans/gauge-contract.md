# Contrato · Gauge (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, página «❖ Gauge (PRO)» (2397:78), set `Gauge` (2398:762, 60 variantes), leído con `use_figma`
(solo lectura, `figma-read-set.js` + una segunda lectura de rellenos y posiciones) el 2026-11-19. Cada rol de abajo es el que el archivo enlaza. Construido en la
librería antes que en Storybook (`GOV-01`). **Figma manda; nada se corrige.** Plan de comportamiento: `HANDOFF-dataviz-2026-11-19.md` §3.1 (donde difiere, gana Figma y
se anota abajo).

## Qué es
Una medida frente a un rango fijo, sobre un arco abierto de 270° con extremos redondos: pista, relleno y, en el centro, el valor con su unidad y una etiqueta. El
relleno lee la serie neutra del gráfico (`Chart/series-1/solid`) o, si el color significa bueno o malo, un estado (`Status/<sev>/surface-solid`). Para completar una
tarea se usa `ProgressCircle`; para una tendencia, `Sparkline`.

## 0 · Anatomía (capa Figma → slot de código)
| Figma | Código | Nota |
|---|---|---|
| raíz (componente cuadrado, sin auto-layout, no recorta) | `root` | `role="meter"` |
| `track` (ELLIPSE, arco 135°→405°, `innerRadius` .85 · .875 · .833) | `track` | círculo SVG, trazo `currentColor`, `stroke-linecap: round` |
| `track-cap-start` · `track-cap-end` (ELLIPSE Ø 12 · 8 · 16) | — | los extremos redondos del trazo SVG (misma forma: medio grosor más allá de cada extremo) |
| `fill` (ELLIPSE, arco 135° → 135° + 270° × valor) | `arc` | el mismo círculo, con `stroke-dasharray` = el valor |
| `cap-start` · `cap-end` | — | ídem; no existen con `Value=0` (el relleno no se dibuja) |
| `content` (VERTICAL, gap `Spacing/gap-tight`, centrado) | `content` | centro 6 · 4 · 6 px por debajo del centro del lado (receta `travel`: `spacing.1_5` · `spacing.1` · `spacing.1_5`) |
| `value-row` (HORIZONTAL, baseline, gap `Spacing/gap-tight`) | `valueRow` | |
| `value` (TEXT, `ValueText`) | `value` | |
| `unit` (TEXT, `Unit`, `UnitVisible`) | `unit` | |
| `label` (TEXT, `Label`, `LabelVisible`) | `label` | |

## 1 · Propiedades → props (orden del panel de Figma)
| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Variant` default · success · warning · critical | VARIANT | `default` | `variant` |
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `Value` 0 · 25 · 50 · 75 · 100 | VARIANT | `0` | `value` (continuo) + `min` (0) + `max` (100) |
| `ValueText` | TEXT | «72» | `valueText` (por defecto, el valor redondeado a un decimal) |
| `Unit` | TEXT | «%» | `unit` |
| `Label` | TEXT | «Healthy» | `label` |
| `UnitVisible` | BOOLEAN | `true` | se muestra si `unit` viene; en la historia es el control `unitVisible` |
| `LabelVisible` | BOOLEAN | `true` | ídem con `label` |

Solo código: `min`, `max` (`aria-valuemin` / `aria-valuemax`), `aria-label` / `aria-labelledby` (el nombre del medidor).

## 2 · Geometría por tamaño (medida en Figma, sweep del set)
| Size | Lado | Grosor del arco | `innerRadius` | Cap Ø | Valor (texto) | Unidad | Etiqueta | `content` (ancho × alto, tal como lo ve «72 % Healthy») |
|---|---|---|---|---|---|---|---|---|
| sm | 128 | 8 | .875 | 8 | `Type/heading-md` | `Type/body-sm` | `Type/body-sm` | 45 × 55 |
| default | 160 | 12 | .85 | 12 | `Type/heading-lg` | `Type/body-md` | `Type/label` | 55 × 61 |
| lg | 192 | 16 | .833 | 16 | `Type/heading-xl` | `Type/body-md` | `Type/label` | 66 × 75 |

- El archivo enlaza el lado a las primitivas de dimensión `128 · 160 · 192` (DIM-01). En código: `spacing.32` · `spacing.32 + spacing.8` · `spacing.32 + spacing.16`.
- Grosor = radio × (1 − `innerRadius`) = 12 · 8 · 16: valores sueltos sin variable (**DIM-03**, ver abajo). En código se conserva la proporción del archivo
  (`GAUGE_INNER` en `gauge.tsx`, como `ProgressCircle`).
- `content` y `value-row`: gap `Spacing/gap-tight` (4). Con la unidad, el valor y la unidad se alinean por la línea base.
- Posición de `content`: centro a x = lado / 2, y = lado / 2 + 6 · 4 · 6 = 86 · 68 · 102 (medido: `y` del frame 55,5 · 40,5 · 64,5, sin padding). El arco está abierto por
  abajo, así que el contenido baja un poco para quedar en el centro óptico.

## 3 · Arco: ángulos y posiciones
- Ángulos de Figma (sentido horario desde las 3 en punto): pista 135° → 405°; relleno 135° → 135° + 270° × (valor / rango): 202,5° · 270° · 337,5° · 405° para 25 · 50 · 75 · 100.
- Extremos del relleno a `Value=50` (default): cap-start (21,67; 126,33) y cap-end (74; 0), Ø 12 — el centro del trazo está a R − grosor / 2 = 74 del centro.
- `Value=0`: solo pista y sus dos extremos; no hay `fill` ni `cap`.

## 4 · Color por variante (invariante de Size y Value)
| Variant | Pista y sus extremos | Relleno y sus extremos | `value` | `unit` | `label` |
|---|---|---|---|---|---|
| default | `Surface/muted` | `Chart/series-1/solid` | `Content/primary` | `Content/secondary` | `Chart/series-1/content` |
| success | `Surface/muted` | `Status/success/surface-solid` | `Content/primary` | `Content/secondary` | `Status/success/content` |
| warning | `Surface/muted` | `Status/warning/surface-solid` | `Content/primary` | `Content/secondary` | `Status/warning/content` |
| critical | `Surface/muted` | `Status/critical/surface-solid` | `Content/primary` | `Content/secondary` | `Status/critical/content` |

Regla de uso: **`Chart/*` para una lectura sin juicio; `Status/*` cuando el color significa bueno o malo.** Nunca una opacidad sobre un rol de gráfico. Los componentes leen
solo los roles (`--color-chart-series-1-solid`, `--color-status-success-surface-solid`…), nunca la rampa.

Sin trazos, sin efectos, sin sombras. El raíz no recorta (`clipsContent: false`).

## 5 · Comportamiento (lo decide Storybook)
- `role="meter"` con `aria-valuenow` (acotado a `[min, max]`), `aria-valuemin`, `aria-valuemax` y `aria-valuetext`, que lee la etiqueta: «72 %, Healthy» (así lo dice la
  descripción del set). No es enfocable. Necesita un nombre accesible: `aria-label` o `aria-labelledby` (si no hay, se usa `label`).
- El valor visible es `valueText`, o el valor redondeado a un decimal. `unit` y `label` se muestran solo si vienen.

## 6 · Motion (solo roles que ya existen, `RECIPE_MOTION`)
| Momento | Rol |
|---|---|
| El valor cambia: el relleno recorre el arco (la transición es el `stroke-dasharray`) | `use-travel-in` |
| Movimiento reducido | instantáneo: sale de los propios roles, el componente no nombra ninguna duración |

Sin animación al montar (el handoff solo pide el barrido al cambiar el valor).

## 7 · Cosas del archivo copiadas tal cual / hallazgos
- **Valor de muestra incoherente.** El set trae `Value=0` por defecto, pero `ValueText` por defecto es «72» (y la etiqueta «Healthy»): con el arco vacío el centro dice 72.
  En código `value` es el dato y `valueText` se deriva de él; la historia `Playground` arranca en 72 para que arco y texto digan lo mismo, y `AllCombinations` dibuja la
  rejilla del archivo (60 variantes, Value 0 · 25 · 50 · 75 · 100) con el texto siguiendo a cada valor en lugar del «72» fijo.
- **DIM-03 · trazos de datos.** El arco de 8 · 12 · 16 no está ligado a ningún rol: salen de `innerRadius` de la elipse y del lado. No se inventa un rol `Stroke/data`.
- **DIM-01.** El lado (128 · 160 · 192) va ligado a primitivas de dimensión, no a un rol `Size/*`; se expresa con pasos de `Spacing` (128 + 32 + 32…).
- Los extremos redondos del archivo son círculos aparte (como `ProgressCircle`); el trazo SVG con `stroke-linecap: round` pinta exactamente lo mismo.
- Con `Value=100` el archivo dibuja los dos extremos del relleno sobre los de la pista: el arco redondea por ambos lados (a diferencia de `ProgressCircle`, que se cierra).
- Handoff vs Figma: el handoff pide el relleno de `Status/<sev>/surface-solid` y la etiqueta `Chart/series-1/content` o `Status/<sev>/content` — coincide. Tamaños
  sm 128 · default 160 · lg 192 — coincide. Trazo 8 · 12 · 16 — coincide (sm 8, default 12, lg 16).

## Anida
Nada: el set no contiene instancias.
