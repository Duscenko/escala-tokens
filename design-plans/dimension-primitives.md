# Dimensiones: una sola colección primitiva

Plan para reestructurar **todas las variables numéricas** (radius, spacing, size,
selector, stroke, grid, sombras y, opcionalmente, tipografía) en dos niveles,
igual que el color:

```
Dimension Primitives   (global, 1 modo, oculta al publicar)   0 · 1 · 2 · 4 … 1536 · 9999 · -1 · -4 …
        ▲ alias
Semánticos por categoría (modos por tema)    radius/scale/lg → 16 · radius/role/container → radius/scale/lg
        ▲ binding
Componentes
```

La referencia (captura de Figma, "Primitive dimension" con 44 variables) tiene una
única colección de números y las categorías sólo consumen. Es el mismo modelo que
ya tenemos para el color: `Color Primitives` → `Color Semantics` → componentes.

Todo lo de "estado actual" está **medido** el 2026-10-02 sobre `generateTokenJSON()`
con el sistema por defecto y con cada uno de los 12 System Styles adoptado.

---

## Estado actual, medido

### Seis colecciones, cada una con su propia escala

| Colección (plugin) | Escala propia | Roles | Modos por tema |
|---|---|---|---|
| Spacing | `0 1 2 3 4 5 6 8 10 12 16` + `padding/*` | `spacingRoles` | sí (`foundationsByTheme`) |
| Radius | `none xs sm md lg xl 2xl 3xl 4xl full` | `radiusRoles` | sí |
| Border | `none sm md lg` | `strokeRoles` | sí |
| Size | `xs sm md lg xl 2xl` | `sizeRoles` | sí |
| Selector | `xs sm md lg xl` | `selectorRoles` | sí |
| Grid | `columns gutter margin container breakpoint-*` + `desktop/ tablet/ mobile/` | `breakpointRoles` | sí |
| (Sombras) | strings CSS crudos → Effect Styles | — | — |

El mismo número vive repetido en varias colecciones: `16` es `spacing/4`,
`radius/md`, `font-size/text-md`, `line-height`… y no hay nada en Figma que diga
que son el mismo valor.

### Qué números produce el sistema

Unión sobre default + los 12 estilos (bases por defecto de cada estilo):

| Origen | Valores distintos | Rango |
|---|---:|---|
| spacing | 39 | 0 – 80 (incluye 3.5, 4.5, 10.5, 13.5, 17.5, 22.5) |
| radius | 10 | 0 – 64, + `9999` |
| sizes | 17 | 21 – 72 (incluye 27, 35, 49, 63) |
| selector | 8 | 12 – 28 |
| stroke | 5 | 0, 0.5, 1, 2, 4 |
| grid | 9 | 8 – 32, 640 – 1536 |
| font-size / line-height | 12 / 12 | 11 – 90 |
| geometría de sombras | ~25 | **-16 … -1**, 0 – 74 |

Unas **65 longitudes distintas** en total. Tres hallazgos que condicionan el diseño:

1. **Hay decimales y valores "raros" de verdad, no ruido.** Las bases son editables
   (`BASE_UNIT_RANGE` 3–5 en pasos de 0.5, `SPACING_BASE_PRESETS`, slider de radius
   0–40, `ScrubInput`), así que un estilo con base 3.5 produce `10.5`, `17.5`, `49`.
   **Una escala fija no puede cubrirlos**, ni hoy ni cuando el usuario arrastre un
   valor a `101px`.
2. **Los negativos sólo existen hoy en las sombras** (spread `-16 … -1`). Los
   solapes de avatar o el `-1` del subrayado de tabs están hardcodeados como
   literales en `specimens.tsx`, `SystemCollage.tsx` y `DashboardPreview.tsx`: no
   son tokens.
3. **Los componentes del plugin se atan a una mezcla.** Radius ya va por rol
   (`role/action`, `role/container`…), pero spacing, size, selector y stroke
   tienen bindings directos a peldaños (`findVar(COLLECTIONS.selector, 'xs')`,
   `findVar(COLLECTIONS.border, 'width/…')`, `findVar(COLLECTIONS.spacing, key)`).

---

## Decisiones tomadas (2026-10-02)

- **D1 → nombre = valor** (`16`, `-4`, `9999`, `3_5`).
- **D4 → una sola colección semántica con grupos** (`Dimension Semantics`); que
  Figma reconstruya los componentes es aceptable.
- D6 (tipografía) sigue abierta.

## Decisiones (con recomendación)

### D1 · Nombre de las primitivas: el VALOR, no un índice

La referencia usa índices (`1225 → 80`, `1850 → 9999`). Funciona en un sistema
cerrado, pero aquí **los valores dependen de bases editables**: si el índice
`1200` vale 72 con base 4 y otra cosa con base 4.5, el nombre ya no dice nada, y
un valor nuevo (`10.5`) no tiene hueco en una numeración fija.

**Recomendado:** el nombre ES el valor en px — `dimension/16`, `dimension/9999`,
`dimension/-4`. Agnóstico, legible y estable (`16` siempre vale 16).
- Decimales: Figma no admite `.` en nombres de variable (a confirmar en la API
  antes de implementar) → `dimension/3_5`. En CSS `--dimension-3_5`, en W3C
  `dimension["3.5"]`.
- Alternativa descartada: índice estilo referencia. Sólo la recuperaría si el
  sistema dejara de tener bases editables.

### D2 · Contenido de la escala: estándar ∪ usados

`DIMENSION_STANDARD` fijo — para que la colección se lea completa, como la
referencia — **unión** de todos los valores que algún tema realmente usa:

- Estándar: `0 0.5 1 2 3 4 6 8 10 12 14 16 20 24 28 32 36 40 48 56 64 72 80 96 128 160 …
  640 768 1024 1280 1536 9999` y negativos `-1 -2 -4 -8 -12 -16`.
- Derivados: todo px de radius/spacing/size/selector/stroke/grid/sombras (y tipo,
  si D6 sale que sí) de **todos** los temas en `foundationsByTheme`.

Es la misma regla que acabamos de arreglar en color: el plugin enlaza por
coincidencia exacta de valor, así que **cada número que use un semántico tiene
que existir como primitiva**. Un test lo garantiza (ver Tests).

### D3 · Las escalas por categoría se quedan, pero como alias filtrados

Hoy `radius/lg`, `spacing/4` o `size/md` son a la vez "escala" y "valor". Pasan a
ser **alias filtrados** de la colección global — la "categoría ya filtrada" que
describe la petición:

```
dimension/16        16            ← primitiva
radius/scale/lg     → dimension/16 ← la escala de radius sólo ve 0·4·8·16·24·32·9999
radius/role/container → radius/scale/lg
```

Se conserva la cadena de tres niveles por una razón concreta: **las bases
editables re-alias la escala**. Cambiar la base de spacing de 4 a 4.5 mueve
`spacing/scale/4` de `dimension/16` a `dimension/18`, y todos los roles que lo
miran le siguen sin tocar nada. Si los roles apuntaran directo a la primitiva,
editar la base tendría que reescribir cada rol.

### D4 · Una sola colección semántica o una por categoría

- **Recomendado: `Dimension Semantics`, una colección con grupos** (`Spacing/`,
  `Radius/`, `Stroke/`, `Size/`, `Selector/`, `Grid/`, `Shadow/`). Así es
  `Color Semantics` y así es la referencia ("Semantic dimension", 97). Los modos
  de tema se cambian **una vez** por frame, no seis.
- Coste: Figma no puede mover una variable entre colecciones, así que se recrean
  y hay que re-bindear componentes (el plugin ya lo hace con `semanticsRebuilt`).
- Alternativa: mantener las seis colecciones y sólo convertir sus valores en
  alias. Cero re-bindeo (mismo ID de variable), pero sigue habiendo seis switches
  de modo.

### D5 · Sombras: estructuradas y atadas a dimensiones

Hoy cada sombra es un string CSS. Pasan a capas (`{ x, y, blur, spread, color }`)
donde cada número es una ref a `dimension/*`, y el plugin las ata a las
propiedades del efecto (`offsetX/offsetY/radius/spread`) con
`setBoundVariableForEffect`. Los negativos de spread aparecen aquí de forma
natural.
- El color de la sombra clara puede aliasar `black-a`. El de la gemela oscura
  (`darkShadow`, alfas como `0.265`) no cae en la escalera de Radix: se queda como
  color crudo en esta fase.
- El string CSS sigue exportándose igual (`--shadow-md: …`), así que el código no
  cambia.

### D6 · ¿Tipografía dentro? — decisión abierta

`font-size` y `line-height` son longitudes y caben en la escala (11 – 90).
`letter-spacing` (em/%) y `font-weight` (400…) **no** son dimensiones y se quedan
en Typography. Propuesta: hacerlo como fase aparte cuando el resto esté estable,
porque Typography tiene su propio sistema de roles y viewports.

### D7 · Lo que NO es una dimensión

`grid/columns` (12) es un conteo, no una longitud: se queda como número crudo en
`Grid/`. La opacidad está retirada. Los pesos tipográficos tampoco entran.

### D8 · Modos

La primitiva tiene **un solo modo** (16 vale 16 en todos los temas). Los modos de
tema viven sólo en la colección semántica: que Core use `radius/role/container →
dimension/16` y Neo `→ dimension/0` es una diferencia de *alias*, no de valor.
Hoy cada una de las seis colecciones crea sus propios modos con
`ensureNamedModes`; eso desaparece de las primitivas.

---

## Fases

### Fase 0 · Modelo y generador (configurador) — ✅ HECHA

> **Resultado.** `lib/dimensions.ts` (puro): `DIMENSION_STANDARD`,
> `parseDimension`, `dimensionKey`/`dimensionFromKey`, `dimensionRefsOf`,
> `dimensionScaleForStore`. `tokens.json` gana `dimensions` y `dimensionRefs`
> (raíz y `foundationsByTheme.<tema>.dimensionRefs`), aditivos, sin bump.
> JSON Schema público y `CONTRACTS.md` actualizados. `dimensions.test.ts`: cada
> ref resuelve al px exacto de su mapa en el sistema por defecto y en los 12
> estilos; nombres reversibles y sin colisiones. Sistema por defecto: 53
> primitivas.
>
> **Hallazgo:** un objeto JS (y su JSON) lista siempre las claves enteras
> (`0`, `16`) antes que `-4` y `3_5`, sea cual sea el orden de inserción. El
> orden numérico lo pone el consumidor ordenando por `dimensionFromKey`; el
> plugin tendrá que hacerlo así en la fase 2.


- `lib/dimensions.ts`: `DIMENSION_STANDARD`, `dimensionKey(px)` (`3.5 → "3_5"`,
  `-4 → "-4"`), `buildDimensionLadder(store)` = estándar ∪ todos los px usados por
  cualquier tema.
- `tokens.json` gana `dimensions: { "16": "16px", … }` y, por categoría, un mapa de
  refs (`radiusRefs: { lg: "{dimension.16}" }`). **Aditivo**: los mapas actuales
  (`radius`, `spacing`…) siguen con px resueltos, así que el plugin viejo no se
  entera. Sin bump de `schemaVersion` (mismo precedente que `gradientsDark` /
  `shadowsDark`).
- Garantía de la fase: **ningún px resuelto cambia**. Test de igualdad
  byte-a-byte antes/después en los 12 estilos.

### Fase 1 · Exports de código — ✅ HECHA (CSS, W3C, cortes JSON)

> **Resultado.** `variables.css` declara la colección completa en `:root`
> (`--dimension-16: 16px;`, negativos como `--dimension--4`) y spacing / padding /
> radius / size / selector / stroke / breakpoints pasan a
> `var(--dimension-N)`, también en los bloques por tema. El guard de hairline
> sigue actuando sobre `--stroke-sm`. `sectionExport` añade a cada fragmento
> CSS sólo las primitivas que usa, y a cada corte JSON su `dimensionRefs` +
> `dimensions` usadas. El W3C del wizard emite la raíz `dimension` (o
> `dimension.tokens.json` por colección) siempre que se exporta una categoría
> numérica, con alias reales `{dimension.N}`. Tailwind sigue con valores crudos.
>
> **Cerrado después:** Markdown (`sectionExport` y el README de `exporters`)
> añade una columna **Primitive** a cada tabla de longitudes y el README una
> sección "Dimension primitives"; el `foundations.md` del agent bundle igual.
> `resolve_token` acepta `dimension.16` / `--dimension-16` y, para un token de
> layout, devuelve `aliases` con la primitiva por tema. Los nombres de
> colecciones de Figma en el bundle NO se tocaron: cambian en la fase 2.


- CSS: `--dimension-16: 16px;` → `--radius-lg: var(--dimension-16);` →
  `--radius-container: var(--radius-lg);`. Los nombres `--radius-lg`, `--spacing-4`
  siguen existiendo: nadie rompe su CSS.
- El override de hairline (`@media (max-resolution: 1.99dppx)`, `stroke 0.5 → 1px`)
  se aplica sobre `--stroke-sm`, **nunca** sobre `--dimension-0_5`: la primitiva no
  puede cambiar de valor según la pantalla.
- W3C: raíz `dimension` con `$type: "dimension"` y alias reales `{dimension.16}`,
  como ya hacemos con el color. Misma regla que el color: si las primitivas no van
  en el export, se resuelven a valor para no dejar refs colgando (`w3cTreeFor`).
- Markdown / `sectionExport` / Tailwind / agent bundle / MCP (`resolve_token`
  devuelve la cadena `rol → escala → dimension → px`).

### Fase 2 · Plugin de Figma — ✅ CÓDIGO HECHO (v0.3.0), sin probar en Figma

> **Resultado.** `Dimension Primitives` (un modo, oculta al publicar, scopes
> vacíos, nombres = valor; si Figma rechazara un nombre se guarda bajo
> `value/<n>` en vez de perder el valor) y `Dimension Semantics` (un juego de
> modos por tema para todos los grupos `Spacing/` `Radius/` `Stroke/` `Size/`
> `Selector/` `Grid/`). Cada peldaño es alias de una primitiva y cada rol alias
> de un peldaño. La escala de primitivas también se deriva de las longitudes del
> payload, así que funciona con una configuradora sin desplegar.
> Las seis colecciones antiguas se eliminan en el import y se levanta
> `foundationsRebuilt` para redibujar componentes; si Figma se niega (librería
> publicada) se avisa una vez y no se reintenta.
> Los ~45 puntos de lectura (`findVar(COLLECTIONS.radius, 'role/action')`) NO
> cambiaron: `findVar` traduce la colección antigua a su grupo. `closestSpacing`
> sigue el alias hasta el número. `borderWidthVar` buscaba `width/*`, nombres
> v5 que un payload v6 nunca crea — ahora prueba `role/control` y `sm` primero.
> Descripciones: el plugin las lee con la clave antigua (`Radius` →
> `role/action`) si no hay nueva. `DOCS_REV` 12 fuerza la reconstrucción de la
> documentación. En la configuradora, agent bundle, `agentContext`, skill y
> `resolve_token` nombran ya `Dimension Semantics → Radius/lg`.
>
> **Falta:** importar en un archivo de Figma real y revisar el log y los
> bindings. No hay forma de ejecutar el sandbox del plugin desde aquí.


- Nueva colección `Dimension Primitives`: un modo, oculta al publicar, scopes
  vacíos (igual que `Color Primitives`). Nombres según D1, orden numérico,
  negativos primero.
- Colección(es) semántica(s) según D4: escala por categoría como alias + roles.
  Los scopes viven aquí (`CORNER_RADIUS`, `GAP`, `STROKE_FLOAT`, `WIDTH_HEIGHT`).
- **Re-bindear lo que hoy apunta a peldaños** a roles: spacing (`key`), size
  (`key`), selector (`xs/sm/md`), stroke (`width/*`). Radius ya va por rol.
- Migración de archivos existentes: si se elige D4-recomendado, borrar las seis
  colecciones viejas y reconstruir componentes; si se elige la alternativa,
  convertir el valor de cada variable existente en alias (conserva el ID y los
  bindings).
- `pruneVars` sobre `Dimension Primitives` para que un valor que ya nadie usa
  desaparezca en el siguiente sync.

### Fase 3 · Sombras como variables (D5)

Parser de strings CSS a capas en `lib/`, generador de refs, Effect Styles atados
en el plugin. Va después de la fase 2 porque necesita la colección primitiva.

### Fase 4 · Negativos como tokens

Roles semánticos para lo que hoy son literales: solape de avatares
(`spacing/role/overlap-*`), subrayado de tab (`-1`), offsets de badge. Sustituir
los literales en `specimens.tsx`, `SystemCollage.tsx`, `DashboardPreview.tsx` y en
el plugin.

### Fase 5 · Editor — ✅ HECHA (modelo de color: rol → primitiva)

> **Decisión final del usuario:** no hay colección ni pestaña `Scale`. Cada
> foundation de longitudes (Radius · Spacing · Grid · Sizes · Stroke) tiene UNA
> colección, `<X> semantics`, que son sus roles; y cada rol **elige directamente
> una Dimension primitive**, igual que un rol de color elige un tono de rampa.
> La única colección de números es `Dimensions › Dimension primitives`
> (de sólo lectura, con "Used by", los valores fijados incluidos).
>
> **Modelo de datos.** Un rol guarda un **paso** de su escala (`lg`, `5`; lo que
> guardaba antes y lo que guarda un rol sin tocar, que sigue a la rampa) **o una
> primitiva fijada** (`dimension-20`, `dimension-3_5`; la elige el editor y NO se
> mueve cuando cambia la rampa). Sin migración: un sistema guardado sigue siendo
> válido. Lo mismo vale para los campos gutter / margin / container del marco
> de Grid y los cortes `breakpointRoles`. `layoutTokens.ts` concentra la lógica
> (`roleDimensionPx`, `dimensionRoleValue`, `roleValuePx`, `layoutValueCss`,
> `rolePrimitiveName`, `breakpointRolePx`); `mergeLayoutRoles` acepta ambas formas
> y repara las mal formadas; `resolveLayoutRole` resuelve ambas.
>
> **Exports.** Todo rol alias la primitiva DIRECTAMENTE, esté guardado como paso o
> fijado: CSS (`--radius-container: var(--dimension-16)`, `--breakpoint-mobile:
> calc(var(--dimension-640) - 1px)`, `--grid-gutter: var(--dimension-24)`), W3C
> (`{dimension.16}`), Markdown, agent context, docs y plugin (`Radius/role/container`
> → primitiva, no → `Radius/lg`). Los pasos de la rampa siguen existiendo como
> tokens (`--radius-lg`, `Radius/lg`) pero ningún rol pasa por ellos. La escala de
> primitivas incluye los valores fijados aunque la rampa ya no los use.
>
> **UI.** `LayoutHub` ya no tiene modo "primitives"; `VariableSelect` /
> `DimensionSelect` (≥ 0, con `none` para el container de Grid). Los controles
> globales (preset y roundness de Radius, base unit de Spacing) pasaron al rail de
> la página de roles (`LayoutRailControls`, slot `controls` de `SemanticGroupRail`):
> regradúan la rampa, así que mueven los roles que siguen a un paso y NO los
> fijados (verificado: roundness 16 → 8 movió `action` y `overlay`, `container`
> fijado a `dimension-20` no se movió). Se eliminaron `StepRadius`, `Step5_Spacing`,
> `Step9_Sizes`, `StepStroke` y `Step8_Grid`; `FoundationSection.Component` es
> opcional.
>
> **Pérdida consciente (la eligió el usuario):** ya no hay forma de editar un
> paso suelto de la rampa (`radius-lg = 20px`) ni los breakpoints `sm…2xl`, el
> `padding` por lados o las columnas base; se cambian eligiendo otra primitiva en
> el rol (o con preset / roundness / base unit). Un valor que no esté en la escala
> estándar sólo aparece si algún rol o paso lo usa.


- Variables: la tabla de cada categoría muestra el chip de alias (`→ 16`), igual
  que los tokens de color muestran su primitiva.
- Una vista de sólo lectura de `Dimension Primitives` en el rail, como la de
  primitivas de color, con "usado por" en cada valor.
- Docs: página de la colección y actualización de "Use it".

### Fase 6 · Tipografía (si D6 sale que sí)

---

## Tests que hacen falta

1. **Cobertura de la escala**: cada px de cada categoría, en cada tema, existe
   como clave de `dimensions`. Es el análogo exacto de
   `semanticPrimitiveLink.test.ts` y evita el mismo fallo (valor suelto en Figma).
2. **Sin cambio visual**: el px resuelto de cada rol y cada escala es idéntico
   antes y después, en los 12 estilos.
3. **Primitivas sin modos**: `dimensions` no varía por tema.
4. Nombres: `dimensionKey` es reversible y no produce colisiones (`3_5` ≠ `35`).

---

## Riesgos

- **La escala crece con cada valor arrastrado.** Es el precio de nombrar por valor
  con bases editables. Mitigación: `pruneVars` en el plugin y el "usado por" en el
  editor, para que se vea qué valores sobran.
- **Re-bindeo en archivos publicados como librería**: Figma no deja borrar una
  variable que otro archivo consume. Es el mismo caso que ya gestiona
  `FILE_SEM_ORDER_STUCK_KEY` para `Color Semantics`; hay que reutilizar esa lógica.
- **Nombres en Figma**: confirmar en la API qué caracteres se aceptan (`.`, `-` al
  inicio) antes de fijar D1.

---

## Orden y dependencias

```
F0 (modelo) ──► F1 (código)
     │
     └────────► F2 (plugin) ──► F3 (sombras)
                     │
                     └────────► F4 (negativos)
F5 (editor) en paralelo a F2
F6 (tipografía) al final, si se aprueba
```

Para arrancar sólo hace falta decidir **D1** (nombres por valor o por índice) y
**D4** (una colección semántica o seis). El resto del plan no cambia según lo que
se elija en D6.
