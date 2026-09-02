# Foundations: trazos, superficies y geometría

Plan derivado de la auditoría del 2026-09-02 contra la exportación DTCG del tema
HeroUI (`tokens-reference/`), más tres bordes hardcodeados detectados en Figma
sobre la salida real del plugin.

Todo lo que sigue está **medido**, no estimado: con `wcagRatio` / `apcaLc` /
`hexToOklch` del propio repo, sobre la salida de `generateTokenJSON()` con las
rampas derivadas rellenadas como hace `useEnsureColorScales()`. Acento por
defecto `#9522e9`.

---

## La tesis

La referencia pone la **frontera del control en el relleno** — `field.border`
se publica con **alfa 0** en los dos temas y el campo se distingue por fondo
distinto de la página más `field.shadow` (negro 4 %) — y deja el trazo como
decoración pura. Escala pone la frontera **en el trazo** y le exige WCAG
1.4.11 vía `{ui:…}`.

La arquitectura de Escala es la defendible en accesibilidad. Pero se está
pagando con todo el vocabulario decorativo: **`border` usa 2 de los 6 peldaños
disponibles**, y los cuatro trazos de la referencia caben enteros dentro del
hueco que deja.

| Trazo sobre superficie, modo claro | ΔL (OKLab) |
|---|---:|
| Escala `border.subtle` · neutral.3 | 0,072 |
| HeroUI `separator` | 0,080 |
| HeroUI `border` | 0,099 |
| *neutral.4 — sin rol en claro* | *0,112* |
| HeroUI `separator-secondary` | 0,121 |
| HeroUI `separator-tertiary` | 0,151 |
| *neutral.5 — sin rol en ningún tema* | *0,156* |
| Escala `border.default` · neutral.8 | **0,352** |

No falta rampa. Falta **asignación**. Los tonos 5, 6 y 10 del neutral no los
referencia ningún rol de la proyección Categorical, en ningún tema.

---

## Fase 0 — Cerrar la fuga de literales

**Prioridad máxima, riesgo nulo, sin migración.** Es lo que se ve en Figma y
lo que rompe la garantía central del proyecto.

### 0.1 · El estado Info cae en un fallback hardcodeado

Medido en el archivo de Figma:

| Nodo | Figma muestra | Origen |
|---|---|---|
| InlineAlert Info · relleno | `#131C2A` | `code.ts:2716` fallback de `statusInfoSubtle` |
| InlineAlert Info · trazo | `#1570EF` | `code.ts:2715` fallback de `statusInfo` |

Coincidencia exacta con los literales del plugin, así que está probado, no
inferido. Causa raíz: `statusInfo` busca la variable `status/info` y
`statusInfoSubtle` busca `status/info-subtle`, pero Categorical emite
`Status/info/surface` y `Status/info/content`. **Y no existe ningún
`status.info.surface-solid`**, así que aunque se arreglara el nombre no habría
nada a lo que atar el trazo.

Esto no se arregla añadiendo un par sólido sólo a Info: `CLAUDE.md` ya deja
escrito que critical es la única severidad con par sólido y que hacerlo para
una sola "la convertiría en la segunda mejor equipada mientras warning y
success siguen sin ninguna — una decisión para las cuatro, no una adición para
info". **Se toma ahora para las cuatro.**

- Añadir `status.{warning,success,info}.surface-solid` + `.on-solid`, con la
  misma forma que critical: `{fam.solid}` / `{on:fam.solid}` en claro,
  `{fam.12}` / `{on:fam.12}` en oscuro. 41 → 47 roles.
- Añadir los nombres Categorical a las listas de búsqueda de `statusInfo*`,
  `statusWarning*` y `statusSuccess*` en `code.ts`.

### 0.2 · El alfa del trazo es un número mágico, y los dos renderizadores no coinciden

| Renderizador | Trazo del InlineAlert | Alfa efectivo |
|---|---|---:|
| Plugin Figma — `code.ts:3616` | `fillP(k.solid, 0.4)` | 40 % |
| Preview web — `specimens.tsx:1524` | `` `${c}33` `` | 20 % |

**El doble de opacidad en Figma que en el preview, sobre el mismo componente.**
Eso viola directamente la regla de que el collage "no puede desviarse de lo que
el plugin entrega". Nada lo detectó porque ninguno de los dos lee un token.

El token correcto ya existe conceptualmente: es un `{fam-a.N}`, la misma
familia alfa que `border.ring.*` usa a `{fam-a.6}` (≈40 %).

- Añadir `status.{critical,warning,success,info}.border` → `{fam-a.6}`.
- El plugin ata el trazo a esa variable y borra el `0.4`.
- `StatusSpecimen` e `InlineAlert` leen el mismo rol y borran el `33`.

### 0.3 · Barrido del resto

Superficie a auditar, contada: **119 literales hex en `code.ts`** (66 únicos),
**7 alfas literales** en llamadas a `fillP`, y en `specimens.tsx` **77 hex**,
**13 `rgba()`** y **7 sufijos de alfa** del tipo `${x}26` / `${x}33`.

No todos son deuda — un fallback de `pair()` es una red de seguridad legítima
para un payload sin ese rol. La regla que aplicamos: **un fallback puede ser
literal; un valor que se pinta cuando el token SÍ existe, no.** El barrido
separa unos de otros y deja los primeros anotados como tales.

---

## Fase 1 — La escalera de trazos decorativos

**No bajar `border.default`. Partirlo.** Bajarlo sin más tira la garantía
1.4.11 que el solver `{ui:…}` existe para dar.

| Rol | Claro | Oscuro | Trabajo |
|---|---|---|---|
| `border.subtle` | `{neutral.3}` | `{neutral-dark.4}` | Divisiones, reglas de tabla |
| `border.default` | `{neutral.4}` | `{neutral-dark.5}` | **Nuevo sentido**: contorno decorativo |
| `border.strong` | `{neutral.5}` | `{neutral-dark.6}` | Agrupación con énfasis |
| `border.control` | `{ui:neutral.8}` | `{ui:neutral-dark.8}` | **Nuevo**: la frontera con obligación |

`border.control` hereda el solver y los valores actuales de `border.default`,
así que **la garantía de accesibilidad no se mueve ni un punto** — sólo cambia
de nombre el rol que la lleva. Lo que cambia es que ahora existen tres peldaños
decorativos donde antes había uno.

Riesgo real: todo lo que hoy apunta a `border.default` esperando una frontera
pasa a tener un trazo cuatro veces más suave. Hay que reapuntar esos consumos
a `border.control` en el mismo commit — `specimens.tsx`, el `borderDefault` /
`borderStrong` del plugin y `previewTokens`. Es un rename mecánico pero no
puede quedar a medias.

---

## Fase 2 — La frontera en el relleno

Es lo que permite que la Fase 1 no empeore nada. Hoy:

```
surface.input  →  {neutral.1}
surface.page   →  {neutral.1}   ← el mismo tono
```

El campo no tiene **ninguna** señal que no sea su borde. Por eso el borde tiene
que gritar. La referencia separa los dos (`field.background` `#ffffff` sobre
`background` `#f5f5f5`) y añade dos sombras propias del campo.

- `surface.input` deja de duplicar la página. Depende de la Fase 3: si la
  página pasa a `{neutral.2}`, el input se queda en `{neutral.1}` y la
  separación sale gratis.
- Nuevo `shadow.field` en la familia de sombras — no en `shadows` (que es
  elevación global), sino como rol propio. En oscuro es un borde de luz, que es
  exactamente el argumento que `darkShadow()` ya defiende y que aquí sólo hay
  que aplicar al campo.

---

## Fase 3 — Unificar la dirección de la elevación

| | Página | Superficie | ΔL | Dirección |
|---|---|---|---:|---|
| HeroUI claro | `#f5f5f5` | `#ffffff` | 0,030 | sube |
| HeroUI oscuro | `#060607` | `#18181b` | 0,088 | sube |
| Escala claro | `#ffffff` | `#f3f3f4` | 0,036 | **baja** |
| Escala oscuro | `#0c0e12` | `#141414` | 0,028 | sube |

Dos problemas en una tabla. La jerarquía apunta en direcciones opuestas según
el tema, y el delta de oscuro (0,028) es **tres veces menor** que el de la
referencia (0,088) — cuando debería ser mayor, no menor. El razonamiento ya
está escrito en `CLAUDE.md` para las sombras: bajo una página casi negra sólo
queda ~5 % del rango hacia abajo, así que la elevación se compra con luz. No se
está aplicando a `surface.*`.

Propuesta: `surface.page` → `{neutral.2}`, `layer-1` → `{neutral.1}`,
`layer-2` → `{neutral.2}` sobre la nueva página. La tarjeta sube en los dos
temas y el input recupera contraste sin tocar el trazo.

**Esto sí es un cambio visible.** Va detrás de un flag o de un preset, no
directo al default, y se decide viéndolo.

---

## Fase 4 — Radios concéntricos derivados

Lo que hace que un radio se lea orgánico no es su valor sino que las curvas
anidadas sean concéntricas: `interior = exterior − padding`. Si no, las curvas
no son paralelas y la esquina se ve rota aunque cada número por separado
parezca correcto.

La escalera de ratios está bien (es la de Tailwind). Lo que falta es la
relación: `radius.control` es un peldaño fijo (`sm`), no derivado.

| Preset | `lg` | `action` (2xl) | Exigido = action − 12 | `control` (sm) | Δ |
|---|---:|---:|---:|---:|---:|
| Sharp *(default)* | 8 | 16 | 4 | 4 | **0** |
| Soft | 12 | 24 | 12 | 6 | −6 |
| Rounded | 16 | 32 | 20 | 8 | −12 |
| Pill | 24 | 48 | 36 | 12 | −24 |

Cuadra sólo en el preset por defecto, **y por accidente**. En cuanto alguien
mueve el slider de redondez —que es justo el control que el producto ofrece—
la relación se rompe.

Hay un segundo choque que ya falla en el default: una tarjeta (`container`, 24)
dentro de un modal (`overlay`, 32) con `inset-surface` 20 exige un interior de
12. A 24 la curva interior sobresale de la exterior.

- `resolveNestedRadius(outer, inset)` = `max(0, outer − inset)`, y
  `radius.control` pasa a derivarse en vez de aliasar un peldaño.
- El rol sigue siendo editable: quien quiera romper la concentricidad puede,
  pero el default la respeta y la UI dice cuándo se está rompiendo.

**Nota de nombres, aparte:** el preset por defecto se llama "Sharp" y renderiza
botones de 16 px y modales de 32 px. La etiqueta describe la primitiva `lg`, no
el resultado. Quien mueve ese control lee una palabra que no corresponde a lo
que ve.

---

## Fase 5 — Cerrar el hueco 10 → 11 de la rampa

Es la causa raíz de casi todo lo anterior, y **la única fase con migración
real**. Va la última a propósito.

**Rampa clara — el tono 11 es más claro que el 10:**

| Tono | Hex | L | ΔL |
|---:|---|---:|---:|
| 9 | `#6c737f` | 0,5537 | −0,094 |
| 10 | `#606670` | 0,5086 | −0,045 |
| 11 | `#696f77` | 0,5393 | **+0,031** ← se aclara |
| 12 | `#34363b` | 0,3329 | **−0,206** ← 6,7× el paso medio |

**Rampa oscura — un agujero de 0,300 donde el paso medio es 0,045:**

| Tono | Hex | L | C | ΔL |
|---:|---|---:|---:|---:|
| 1 · página | `#0c0e12` | 0,1634 | 0,0091 | — |
| 2 | `#141414` | 0,1913 | **0,0000** | 0,028 |
| 10 | `#6d7075` | 0,5442 | 0,0086 | 0,045 |
| 11 | `#c9ccd0` | 0,8440 | 0,0065 | **0,300** |

Dos defectos, una causa: los tonos 1–10 los dibuja la curva de `buildScale` y
los tonos 11–12 los resuelve `lightnessForContrast` por búsqueda de contraste.
**Dos generadores en peldaños contiguos que no se consultan.** Esa es,
literalmente, la parte "no definida matemáticamente".

Y el croma: la página oscura vale 0,0091 y el tono 2 vale **exactamente 0**. La
página está tintada y la primera superficie que se apoya en ella es gris puro.
Es la discontinuidad que `chromaLink` corrige en `tinted`/`vivid` — y el
default va en `subtle`, donde el enlace vale 0. `CLAUDE.md` ya lo documenta
como brecha conocida y deliberada; esta fase es donde se decide.

Consecuencia visible: en oscuro no existe ningún tono para un trazo de peso
medio, y por eso `border.default` acaba resolviendo a `#c9ccd0` — **el mismo
hex que `content.secondary`**. El borde de un input pesa lo mismo que el texto
que hay dentro.

**Coste:** mueve `__snapshots__/ramps.golden.test.ts.snap` y el neutral de todo
sistema guardado. Necesita migración de store y una decisión explícita, no un
cambio de default silencioso.

---

## Vocabulario que falta, para la plataforma

Escala vende "la mejor forma de sacar foundations". Estos son tokens que la
referencia publica y que hoy no tenemos ninguna forma de exportar:

| Token de la referencia | Qué resuelve | En Escala |
|---|---|---|
| `field.shadow` / `shadow-2` | Frontera del control sin trazo | No existe (Fase 2) |
| `separator` ×3 | Divisiones, separadas de `border` | Sólo `border.subtle` (Fase 1) |
| `backdrop` vs `overlay` | El velo y el panel son cosas distintas | **Colisión de nombre**: `surface.overlay` es el velo, `radius.overlay` es el panel |
| `ring-offset-width` | Halo separado del trazo de foco | Hay `stroke.focus`, falta el offset |
| `disabled-opacity` | Un dial, no un color por rol | Sólo `content.disabled` |
| `surface-*-foreground` | Empareja tinta con cada nivel | `content.primary` global |
| `border-width-control` | Sliders sin trazo | No existe |

Un detalle de la referencia que merece copiarse tal cual: **sus alfas suaves
son más bajos en oscuro** — 0,12 frente a 0,15 en claro, 0,16 frente a 0,20 en
hover. Un lavado de color rinde más sobre página oscura. Escala usa el mismo
peldaño alfa (tono 3) en los dos temas.

---

## Orden y dependencias

```
F0  literales + status.*.border + pares sólidos    ← sin migración, empieza ya
 └─ F1  escalera de trazos (border.control)        ← rename mecánico, atómico
     └─ F2  frontera en el relleno                 ← depende de F3 para el tono
         └─ F3  dirección de la elevación          ← visible, detrás de decisión
F4  radios concéntricos                            ← independiente, en paralelo
F5  hueco 10→11 de la rampa                        ← migración, va la última
```

F0 y F4 no dependen de nada y no cambian ningún valor exportado que hoy sea
correcto. F3 y F5 cambian lo que ve un sistema ya guardado y necesitan
decisión explícita antes de tocarlas.
