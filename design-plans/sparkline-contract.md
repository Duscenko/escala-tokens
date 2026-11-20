# Contrato · Sparkline (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, página «❖ Sparkline (PRO)» (2397:79), set `Sparkline` (2399:90, 12 variantes), leído con `use_figma`
(solo lectura, barrido de un eje + lectura completa de las rutas de la curva) el 2026-11-19. Cada rol de abajo es el que el archivo enlaza. Construido en la librería
antes que en Storybook (`GOV-01`). **Figma manda; nada se corrige.** Plan de comportamiento: `HANDOFF-dataviz-2026-11-19.md` §3.2.

## Qué es
Una tendencia compacta junto a un valor, sin ejes ni rejilla: una línea suave (curva monótona, extremos y uniones redondos) sobre un área suave que cierra contra el borde
inferior y un punto en el último dato. `default` usa la serie neutra del gráfico; `success` y `critical` usan roles de estado porque llevan significado (subir es bueno / bajar
es malo); `secondary` es una tendencia gris y discreta.

## 0 · Anatomía (capa Figma → slot de código)
| Figma | Código | Nota |
|---|---|---|
| raíz (componente, sin auto-layout, no recorta, sin relleno ni trazo) | `root` | `role="img"`, `aria-label` obligatorio |
| — (cada capa de datos) | `layer` | solo código: cada serie dibujada vive en su capa para fundirse con la siguiente al cambiar los datos |
| `area` (VECTOR, `AreaVisible`) | `area` | ruta de la curva + dos líneas hasta el borde inferior; relleno `currentColor` |
| `line` (VECTOR, trazo CENTER, cap y join ROUND) | `line` | ruta de la curva, trazo `currentColor` |
| `dot` (ELLIPSE, `DotVisible`) | `dot` | `<span>` redondo centrado en el último punto |

## 1 · Propiedades → props (orden del panel de Figma)
| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Variant` default · secondary · success · critical | VARIANT | `default` | `variant` |
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `AreaVisible` | BOOLEAN | `true` | `area` |
| `DotVisible` | BOOLEAN | `true` | `dot` |

Solo código: `data: number[]` (la serie; el archivo dibuja una curva de muestra de 9 puntos), `aria-label` (obligatorio), `fluid` (el ancho sigue al contenedor).

## 2 · Geometría por tamaño (medida en Figma)
| Size | Raíz | Punto Ø | Trazo de la línea | Inset horizontal | Aire vertical medido |
|---|---|---|---|---|---|
| sm | 96 × 32 | 4 | **1,5** (valor suelto, sin variable) | 2 | 3,12 |
| default | 256 × 64 | 6 | `Stroke/focus` (2) | 3 | 5,32 |
| lg | 480 × 128 | 8 | `Stroke/focus` (2) | 4 | 8,80 |

- Ancho: el archivo lo enlaza a las primitivas `96 · 256 · 480` y el alto a `32 · 64 · 128` (DIM-01); en código, pasos de `Spacing` (`spacing.24` · `spacing.32 + spacing.32` ·
  `spacing.32 × 3 + spacing.24`; `spacing.8` · `spacing.16` · `spacing.32`). El ancho es fijo por Size; con `fluid` sigue al contenedor (la altura se queda).
- Línea y área empiezan a medio punto del borde izquierdo (x = Ø / 2) y terminan a medio punto del derecho; el punto está centrado en el último dato (`dot` x = ancho − Ø,
  y = y del último punto − Ø / 2).
- Vertical: la muestra del archivo deja 5,32 · 3,12 · 8,80 px por encima del máximo y por debajo del mínimo; son valores a mano (≈ un punto de diámetro ±0,9 px). En código el
  aire vertical es exactamente un diámetro de punto, para que ni la línea ni el punto se recorten nunca. Escala: el mínimo de los datos al fondo, el máximo arriba (`data`
  constante → recta a media altura).
- El `area` cierra contra el borde inferior del componente (su caja mide 58,68 de alto, 5,32 + 58,68 = 64). Sin trazo.
- Curva: Bézier monótona cúbica (Fritsch–Carlson, `curveMonotoneX` de d3) entre los puntos, repartidos a la misma distancia en x. El archivo trae una curva a mano con
  tiradores más cortos en los extremos; el resultado visual es el mismo sin repetir esas ondulaciones.

## 3 · Color por variante (invariante de Size)
| Variant | `area` | `line` | `dot` |
|---|---|---|---|
| default | `Chart/series-1/soft` | `Chart/series-1/solid` | `Chart/series-1/solid` |
| secondary | `Surface/muted` | `Content/secondary` | `Content/secondary` |
| success | `Status/success/surface` | `Status/success/surface-solid` | `Status/success/surface-solid` |
| critical | `Status/critical/surface` | `Status/critical/surface-solid` | `Status/critical/surface-solid` |

Regla de uso: **`Chart/*` para una serie sin juicio; `Status/*` cuando el color significa bueno o malo.** Nunca una opacidad sobre un rol de gráfico. Los componentes leen
solo los roles (`--color-chart-series-1-soft`, `--color-status-critical-surface`…).
Sin efectos, sin sombras, sin relleno en la raíz.

## 4 · Comportamiento (lo decide Storybook)
- `role="img"` con `aria-label` que dice la tendencia («Daily active users, up 7.2 % this week»); el dibujo (`layer`) es `aria-hidden`. El componente no tiene texto propio.
- No es enfocable ni interactivo.

## 5 · Motion (solo roles que ya existen, `RECIPE_MOTION`)
| Momento | Rol |
|---|---|
| Al montar, una sola vez: la línea se dibuja (su `stroke-dashoffset`); el área y el punto aparecen con ella | `use-reveal` |
| Cambian los datos: la capa vieja se funde hacia fuera y la nueva hacia dentro | `use-color` |
| Movimiento reducido | instantáneo: sale de los propios roles |

## 6 · Cosas del archivo copiadas tal cual / hallazgos
- **DIM-03 · trazos de datos.** La línea está ligada a `Stroke/focus` (el ancho del aro de foco, 2 px) en default y lg, y a un 1,5 suelto en sm. Se copia tal cual: `strokeWidth:
  stroke.focus` y, en sm, la propiedad de receta `hairline: '1.5'`. No se inventa un rol `Stroke/data`.
- **DIM-01.** Raíz ligada a primitivas de dimensión, no a un rol `Size/*`.
- El `area` no tiene trazo y su caja es más alta que la de la línea (llega al borde inferior).
- La curva de muestra del archivo tiene 9 puntos con alturas relativas 0 · 19 · 22 · 18 · 33 · 32 · 27 · 19 · 46 (sobre 46); la historia usa esos datos (sumados a una base)
  para parecerse al archivo.
- Handoff vs Figma: el handoff dice «line width as Figma binds it (`Stroke/focus`, 1.5 on sm)» — coincide. «width fluid» — el archivo tiene anchos fijos por Size; `fluid`
  es una adición solo de código.

## Anida
Nada: el set no contiene instancias.
