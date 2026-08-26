# Alpha primitives — resolver el dilema y añadir los neutros

Estado: propuesta. Medido 2026-08-26 contra el código actual, no contra CLAUDE.md.

## Pasada final: del primitivo al ROL (2026-08-26)

El reproche que disparó esto: *"creamos esos alphas ¿para qué, si no están en
ningún token?"*. Era correcto — 3 roles de 43 usaban alpha, y 6 de las 8
familias no las referenciaba nadie. Un audit externo aportó la lista de roles
que faltaba. **Resultado: 16 roles de 51 usan alpha, 7 de 8 familias en uso.**

### La decisión de arquitectura que evitó duplicar el sistema

El audit pedía una escala NUEVA de 5 pasos a opacidad fija (5/10/15/40/80%).
Escala ya tiene una de 12 pasos. Antes de construir la segunda, se midió si la
fija era mejor:

- Sobre página blanca, wash de hover: fijo-10% da 1.028–1.172:1 según el hue,
  resuelto da 1.038–1.248:1. Prácticamente empate.
- Sobre página oscura: fijo 1.057–1.224:1, resuelto 1.123–1.341:1. El resuelto
  es algo más fuerte y algo más consistente, pero **no lo bastante como para
  justificar 96 tokens más y un segundo esquema de numeración.**

Y el hallazgo que cerró el tema: **los 5 escalones que pedía el audit son
exactamente 5 de los 12 de Radix que ya teníamos** — 5%→`black-a-1`,
10%→`-2`, 15%→`-3`, 40%→`-6`, 80%→`-10`, todos EXACTOS. Así que se tomó la
lista de ROLES del audit (que era la parte valiosa) y se expresó con los
primitivos existentes. **Cero primitivos nuevos.**

### Roles añadidos / cambiados

| Rol | Valor | Nota |
|---|---|---|
| `action.ghost.neutral.hover` / `.pressed` | `{black-a.1/2}` ↔ `{white-a.1/2}` | Único caso que FLIPEA por apariencia |
| `action.ghost.brand.hover` / `.pressed` | `{accent-a.3/5}` | Renombrados desde `action.ghost.*` |
| `action.ghost.danger.hover` / `.pressed` | `{error-a.3/5}` | |
| `surface.selected` | `{accent.3}` → `{accent-a.3}` | Fila seleccionada: puede estar sobre página o tarjeta |
| `status.*.surface` ×4 | `{fam.3}` → `{fam-a.3}` | Banner dentro de una tarjeta conserva su tinte |
| `border.ring.default/.critical/.success` | `{fam-a.6}` | El HALO, distinto de `border.focus` (el borde sólido) |
| `border.rim-highlight` | `{white-a.1}` | El rim de elevación en dark |

`action.ghost.*` se partió por INTENCIÓN (neutral/brand/danger) porque el eje
`Color` del Button ya existe con esos tres valores — un `ghost.hover` sin
calificar sólo podía servir a uno.

**`border.ring.*` NO revierte la decisión documentada "no hay
border.focus.critical"**: esa es sobre el BORDE sólido, que sigue siendo accent
para toda severidad. El halo translúcido alrededor es otra cosa, aditiva.

### La infraestructura que lo hace robusto

`auditCurated` (`color/audit.ts`) **saltaba en silencio** cualquier fondo no
opaco (`continue`) — un agujero que habría crecido con cada rol alpha. Ahora:

- `Pairing` tiene `backdrop?` (por defecto `surface.page`): un wash se
  COMPONE contra su fondo declarado antes de medirse.
- Un fondo translúcido cuyo backdrop no resuelve **lanza**, no se salta.
- Un PRIMER PLANO translúcido lanza siempre — la tinta nunca es un wash.

Verificado: las 500 filas siguen ahí (nada se saltó) con 0 fallos, y el `bg`
registrado es el hex COMPUESTO (`#e7e4f6` para `content.primary` sobre
`surface.selected`), no el translúcido crudo.

Además se eliminaron dos hardcodes del mismo tipo que el de ButtonSpecimen:
`BorderSpecimen` construía su halo como `` `${slot.css}33` `` (sufijo hex a
mano); ahora usa `border.ring.*`.

### Lo que queda sin usar, y por qué

`neutral-a` es la única familia sin rol. Es deliberado: el caso "wash neutro"
lo cubren mejor `black-a`/`white-a`, que no arrastran el tinte de acento que
la rampa neutral hereda (`neutralFromBrand`). `neutral-a` tendría sentido para
glassmorphism (`surface.layer-*` translúcidas), que es un cambio mayor y
aparte.

## Implementado (2026-08-26)

- **Fase 1** — `BLACK_ALPHA_SCALE`/`WHITE_ALPHA_SCALE` en `colorUtils.ts` (12
  pasos, valores publicados `@radix-ui/colors`).
- **Fase 2** — `colors.primitiveAlpha` (tokenGenerator), `variables.css`
  (exporters.ts) y `colorFamilies()` (sectionExport.ts → CSS/Tailwind/`.MD`)
  ahora emiten las 6 familias alpha + `black-a`/`white-a`. Verificado en
  `.MD`: `### Accent-a` … `### Info-a`, `### Black-a`, `### White-a`.
- **Fase 3a** — `surface.overlay` (Categorical) pasó de `{neutral.12}` /
  `{neutral-dark.1}` (OPACO, con un `// pair with opacity.60` muerto) a
  `{black-a.8}` en ambos temas — un scrim translúcido real. `scaleLookup`
  resuelve `'black-a'`/`'white-a'`. Verificado visualmente: el "Dialog" demo
  ahora muestra un dimming real, no un bloque opaco.
- **Fase 6** — Las 6 familias alpha (antes solo Accent-Alpha) son navegables
  en Primitives, agrupadas correctamente (`homeOf`): Neutral-Alpha en
  Neutrals, Error/Success/Warning/Info-Alpha en States.
- **Botón Ghost cerrado** — `ButtonSpecimen`'s Pressed state usaba
  `color + '33'` (hex-alpha-suffix a mano, sólo válido si `color` es hex
  limpio de 6 dígitos). Reemplazado por `pressed(t, color)` =
  `tintOf(t, color, '20', 0.2)`, mismo mecanismo que `soft`/`softer` ya usan
  (`specimens.tsx`). Verificado: `getComputedStyle` da
  `rgba(149, 34, 233, 0.2)` — idéntico numéricamente al hack anterior, ahora
  vía `withAlpha`/chroma en vez de concatenación de string.
- **Fase 4 (guardia estructural, no la auditoría completa)** — `parseHex`
  (apca.ts) y `hexToLinearRgb` (gamut.ts) — las DOS únicas rutas de decode
  sRGB del proyecto — silenciaban el canal alpha de un hex de 8/4 dígitos
  (`#rrggbbaa`/`#rgba`), tratándolo como opaco sin avisar. Ahora ambas
  **lanzan** si el alpha real es <99.9%, con un mensaje que apunta a
  `compositeOver`. Esto no auditó ningún rol nuevo — convierte el riesgo
  "silencioso" en un fallo ruidoso inmediato, incluyendo para la tool MCP
  `check_contrast` (que acepta strings arbitrarios de quien la llame).
  Verificado: `npm test` (404 pasan, +7 tests nuevos), `npm run color:report`
  (0 fallos en 500 curated + 1120 flat, sin cambios), build limpio.
- **Fase 3b (reconsiderada e implementada)** — `action.ghost.hover` /
  `action.ghost.pressed`, los PRIMEROS roles Categorical respaldados por un
  alpha primitive de FAMILIA (no black/white): `{accent-a.3}` / `{accent-a.5}`.
  Un botón ghost no tiene fill propio — su hover/pressed tiene que ser un
  wash sobre lo que sea que haya debajo, que es exactamente el trabajo para
  el que se solvó el alpha twin. Requirió extender `ProjectionInput`/
  `scaleLookup` (`pageBackground`/`darkBackground` opcionales, para poder
  componer `{fam}-a` bajo demanda, kind-aware igual que `accent` ya lo es) —
  enhebrado por `tokenGenerator.ts`, `previewTokens.ts`,
  `Step3_SemanticTokens.tsx`, `docs/foundationDocs.tsx`, `sectionExport.ts` y
  `color/audit.ts`. Especimen real en `ActionSpecimen`
  (`SemanticSpecimens.tsx`) — filas "Ghost hover"/"Ghost pressed". 41 → 43
  roles. Verificado en vivo: la tabla de Semantics · Action muestra
  `ghost.hover → accent-a.3` / `ghost.pressed → accent-a.5` con swatches
  reales; el `.MD` exporta `accent.ghost.hover` con hex DISTINTO en claro
  (`#610dd51f`) y oscuro (`#ca72f81a`) — confirma que el kind-aware
  compositing funciona, no es el mismo valor copiado dos veces.

## Revertido: 3c (`status.*.surface` → alpha)

Propuesto en la §2 original con el argumento "un tinte sólido de estado se
vuelve ilegible sobre una tarjeta" — medido como `error.3` sobre `neutral.3`
= 1.02:1. **Ese argumento estaba mal.** 1.02:1 es una fórmula de contraste
texto-sobre-fondo; aplicada a dos SWATCHES OPACOS adyacentes no mide "esta
caja desaparece", mide "estos dos colores son parecidos en luminancia" — que
puede ser exactamente la intención (un tinte de estado discreto). Una caja
opaca no se vuelve invisible por estar cerca de otra caja pálida: cada una
pinta su propio color; no hay compositing real entre vecinos.

Verificado además cómo se usa hoy: `InlineAlertSpecimen` (el componente real
"Alert", `specimens.tsx`) ya usa `soft(t, color)` — un wash alpha genuino vía
`tintOf`/`withAlpha` — y NUNCA toca `status.*.surface`. El rol Categorical
`status.critical.surface` es un contrato de **superficie opaca pintable**
("Feedback Background Subtle"), consumido tal cual por Figma/CSS/agentes, ya
auditado (0 fallos en la matriz de 500 pares curated).

Volverlo `{error-a.3}` habría significado: (1) cambiar el contrato de un rol
`surface` de opaco a translúcido — decisión de arquitectura, no bugfix; (2)
que la guardia de la Fase 4 lance en cuanto `content` (texto sólido) se mida
contra `surface` (ahora translúcido), correctamente, porque ya no se puede
medir sin componer antes contra un fondo real que hoy no existe en ningún
sitio; (3) construir esa infraestructura de composición-antes-de-auditar
solo para este caso. Sin un beneficio real que lo sostenga, no se hizo.

**Si esto vuelve a plantearse**, el caso real que lo justificaría es
glassmorphism/superficies genuinamente translúcidas (tarjetas flotantes sobre
imagen o gradiente) — no "tinte de estado dentro de una tarjeta normal",
que ya funciona bien opaco.

**3b implementado** (ver arriba: `action.ghost.hover`/`.pressed`) — la primera
versión de esta nota lo daba por "descartado, sin consumidor real"; se
revirtió esa lectura al confirmar que `ButtonSpecimen` SÍ tiene un estilo
Ghost real, y que backearlo con `{accent-a.N}` en vez de recalcular alpha ad
hoc en cada especimen es exactamente para lo que se construyeron los
primitivos.

Pendiente: la auditoría composicional completa (sólo tiene sentido el día
que un rol alpha entre en la matriz de `Pairing`s auditados — `action.ghost.*`
no lo necesita, es una wash decorativa sin texto encima con requisito de
contraste), Fase 5 restante (el rim de `darkShadow` se evaluó y se decidió NO
tocarlo — ver nota).

---

## 1. Diagnóstico (medido, no asumido)

### 1.1 Los alpha twins existen, pero son datos muertos

`tokenGenerator.ts:211-226` emite `colors.primitiveAlpha` para **todas** las familias
(`accent-a-*`, `neutral-a-*`, `error-a-*`, `warning-a-*`, `success-a-*`, `info-a-*`, cada
custom, y sus gemelos `-dark-a-*`). Eso ya está en el payload del plugin.

Lo que **no** existe:

| Consumidor | ¿Alpha? | Dónde |
|---|---|---|
| `tokens.json` | ✅ sí | `tokenGenerator.ts:266` |
| `variables.css` (`buildCSS`) | ❌ **no** | `exporters.ts:34-47` — `family()` sólo recorre las escalas sólidas |
| `.MD` / `buildSectionExport` | ❌ **no** | `sectionExport.ts:160-184` — `colorFamilies()` no lista ninguna familia alpha |
| Semantics (`CATEGORICAL_ROLES`) | ❌ **no** | 0 de 41 roles referencian una familia `-a` |
| Export por columna | ✅ parcial | `buildAlphaFamilyExport` existe pero sólo W3C/Escala/CSS/SCSS |

Confirmado lo que reportas: no se traza en el `.MD` y no se usa en Semantics. La UI además
sólo muestra `Accent-Alpha` (y el alpha de una custom que sea brand de un tema —
`ColorPrimitives.tsx:946,981`), mientras el export lleva seis. La tabla y el archivo ya
discrepan.

### 1.2 El alpha twin NO es una escala de opacidad

Medido sobre el accent por defecto (`#9522e9`, página blanca):

```
accent-a: 1=0%  2=6%  3=12% 4=19% 5=26% 6=37% 7=48% 8=61% 9=87% 10=84% 11=70% 12=86%
```

Dos hechos que rompen el uso que propone la auditoría:

- **El paso 1 es 0% — completamente transparente.** No es un token, es la nada.
- **No es monótona**: 9=87% → 10=84% → 11=70% → 12=86%. Subir de paso no significa subir
  de opacidad.

Es correcto por construcción: `alphaColorOver` resuelve α para que el paso N *reproduzca
exactamente el sólido N sobre su propia página*. La opacidad es un **resultado**, no un
parámetro. Pedirle a esta rampa que haga de ladder 5/10/15/40/80% es pedirle algo que su
matemática no promete.

### 1.3 Los neutros alpha no existen — y ya están hardcodeados en 4 sitios

| Sitio | Qué hace | Qué token sería |
|---|---|---|
| `colorUtils.ts:1065-1066` | `rgba(255,255,255,${rimAlpha})`, rim 3–12% del `darkShadow` | `white-a-1..2` |
| `exporters.ts:25` | `withAlpha(hex, 0.7)` para el panel translúcido | glassmorphism sin token |
| `semanticArchitectures.ts:465` | `surface.overlay: {neutral.12}` — **opaco** | `black-a-*` |
| Chrome (`index.css`, varios) | tints `/[0.06]`–`/[0.08]` | `black-a-1` / `white-a-1` |

### 1.4 Un bug vivo, no hipotético

`semanticArchitectures.ts:465` lleva el comentario `// pair with opacity.60`, y su
descripción (línea 616) dice *"Ships at alpha 0.5"*. Ambas cosas son falsas hoy:

- el valor que se exporta es un hex **opaco**;
- la fundación `opacity` **está retirada** (CLAUDE.md, "Opacity is retired") — `opacity.60`
  no existe en ningún export.

O sea: el scrim documenta un alpha que el sistema no puede entregar. Ese es el agujero más
concreto y el que justifica todo lo demás.

---

## 2. El dilema, resuelto

No hay un "alpha". Hay **dos contratos opuestos**, y confundirlos es la razón por la que el
twin nunca encontró un rol semántico:

| | Alpha twin (`accent-a-*`) | Alpha neutro (`black-a-*` / `white-a-*`) |
|---|---|---|
| Contrato | reproducir el sólido N **sobre su propia página** | oscurecer/aclarar **un fondo desconocido** |
| Anclado a | `pageBackground` / `darkBackground` | nada — es agnóstico por definición |
| Valor | derivado (resuelto) | fijo (elegido) |
| Sirve para | tintes que deben sobrevivir sobre cualquier superficie | scrims, rims, hover neutro, glass |

Ningún rol del catálogo quiere *"el mismo color que el sólido, pero translúcido"* — quiere
el sólido, **o** un lavado sobre un fondo que no conoce. Por eso `primitiveAlpha` quedó
huérfano. La respuesta no es forzar el twin en los roles: es **añadir el segundo tipo** y
darle al twin el único trabajo que sí es suyo.

### Dónde el twin SÍ es la respuesta correcta

Un tinte de estado sobre una tarjeta. Medido (error `#f04438`, neutral `#767680`, página
blanca, tarjeta = `neutral.3` = `#e8e8e9`):

```
status tone 3 sólido : #fee5e2 sobre la tarjeta → contraste 1.02:1  (más CLARO que la tarjeta)
status tone 3 alpha  : #f7260d1f (12%) → compone a #ead1cf          (la tarjeta se enrojece)
```

El tinte sólido va en la **dirección equivocada** sobre una superficie elevada: aclara donde
debería colorear, y a 1.02:1 desaparece. El alpha compone y mantiene el matiz. Ése es el
caso de uso real de la rampa que ya tenemos.

---

## 3. Plan

### Fase 0 — Decisión de nomenclatura (bloqueante)

**Recomendación: 12 pasos `black-a-1..12` / `white-a-1..12`, con los valores publicados de
Radix `blackA`/`whiteA`.** No los 5 pasos de la auditoría.

Motivos:

1. **Una sola gramática.** El sufijo `-a` ya existe (`accent-a-*`) y `refToView`
   (`semanticArchitectures.ts:747`) ya acepta guiones en el nombre de familia:
   `/^\{([a-z-]+)\.(\d+)\}$/` resuelve `{black-a.5}` sin tocar el regex. Un ladder de 5
   pasos introduce un segundo esquema de numeración en un sistema que ya migró todo a
   Radix 1–12 (store v42).
2. **No se pierde nada de la auditoría.** Sus 5 niveles caen dentro de los 12:
   5%→`a1`, 10%→`a2`, 15%→`a3`, 40%→`a7`, 80%→`a11`.
3. Radix ya usa exactamente `blackA`/`whiteA` para overlays, ghost states y scrims — es el
   mismo modelo del que ya viene el resto del color layer.

**Decisión pendiente del owner:** ¿12 pasos Radix, o los 5 de la auditoría? Todo lo que
sigue asume 12.

### Fase 1 — Los primitivos neutros

- `colorUtils.ts`: `BLACK_ALPHA_SCALE` / `WHITE_ALPHA_SCALE` como constantes (valores Radix).
  **No** son familias con base hex — no tienen `base`, no se retintan, no se editan.
- `tokenGenerator.ts`: emitirlos dentro de `primitiveAlpha` (`black-a-1..12`,
  `white-a-1..12`). Es **aditivo** → el plugin los ignora si no los conoce.
- Store: **ninguna migración.** Son constantes, no estado — misma decisión que
  `DEFAULT_GRAY_DARK_SCALE`. No entran en `DesignSnapshot`.

### Fase 2 — Cerrar las tres fugas del export (esto es lo que arregla "no se traza")

Independiente de la Fase 1, y probablemente lo primero que quieras ver:

1. `exporters.ts` → `buildCSS`: emitir `--color-<fam>-a-<tone>` junto a los sólidos, y el
   bloque `white-a`/`black-a`. Es un `family()` paralelo, no un exportador nuevo.
2. `sectionExport.ts` → `colorFamilies()`: añadir las familias alpha, respetando
   `opts.families` (una exportación scoped a Accent debe llevar `accent` **y** `accent-a`,
   nunca la de otra familia).
3. Markdown: una tabla de alphas por familia. Aquí sale a la luz el paso 1 = 0% — hay que
   decidir si se emite o se omite. **Recomendación: emitirlo** (el export nunca ha mentido
   sobre lo que hay) y describirlo por lo que es.

### Fase 3 — Semantics

Roles nuevos en `CATEGORICAL_ROLES` (41 → ~50), en dos grupos:

**a) Corregir el scrim (el bug de §1.4):**
```
surface.overlay   light {black-a.11}   dark {black-a.11}
```
Elimina el `{neutral.12}` opaco, el comentario `// pair with opacity.60` muerto y la
descripción que promete un alpha inexistente.

**b) Ghost / hover neutro y de marca:**
```
action.ghost.neutral.hover     light {black-a.2}   dark {white-a.2}
action.ghost.neutral.pressed   light {black-a.3}   dark {white-a.3}
action.ghost.brand.hover       {accent-a.3}
action.ghost.danger.hover      {error-a.3}
surface.selected               {accent-a.3}
```

**c) Tintes de estado que sobreviven sobre una tarjeta** — reapuntar `status.*.surface` de
`{fam.3}` a `{fam-a.3}` (§2). **Esto sí mueve valores existentes**, así que va aparte del
resto y necesita su propia decisión.

`scaleLookup` (`semanticArchitectures.ts:778-786`) necesita entradas para las familias
alpha; `refToView` no necesita cambios.

### Fase 4 — Auditoría de contraste (no opcional)

CLAUDE.md exige que *todo* rol declare intent class y sea auditable. Un rol alpha **no se
puede medir sin componer primero**. `contrast-matrix.test.ts` y `color/audit.ts` necesitan
un paso de composición contra un backdrop declarado. Sin esto, cada rol alpha que se añada
es un agujero silencioso en la matriz.

Esto es trabajo real y es la parte que más fácil se subestima.

### Fase 5 — Consumir los tokens en el propio código

Reemplazar los hardcodes de §1.3 por los primitivos nuevos, uno por uno, no en bloque.

**El rim de `darkShadow` — evaluado, decidido NO tocarlo.** Su alpha es
`round2(min(0.12, max(0.03, 0.03 + 0.35·maxAlpha)))` — una función CONTINUA del
peso de la sombra que compone: un preset de sombra más fuerte saca un rim más
fuerte. Fijarlo a `white-a-1`/`white-a-2` (un paso discreto de 12) sería
cambiar de una escala continua bien razonada y documentada a una más pobre,
para ganar exactamente nada — no hay ningún consumidor esperando que el rim
sea uno de los 12 pasos Radix. Además movería el snapshot dorado
(`ramps.golden.test.ts.snap`) sin una razón que lo justifique. Se deja como
está.

`exporters.ts:25` (`panelValue`, translúcido al 70%) y los tints de chrome
(`/[0.06]-[0.08]`) tampoco son candidatos: ambos auto-tiñen SU PROPIO color
(la superficie, el acento) a una opacidad fija — no son un lavado neutro
agnóstico al fondo, que es específicamente lo que `black-a`/`white-a`
resuelven. Forzarlos ahí sería el mismo error de categoría que 3c.

### Fase 6 — UI

- Mostrar las 6 familias alpha en el nav de Primitives (hoy sólo Accent), o justificar por
  qué no. Ahora mismo la tabla y `tokens.json` discrepan.
- `black-a`/`white-a` no encajan en ningún folder actual (`Accents`/`Neutrals`/`States`/
  `Custom`) — no tienen base ni se retintan. Probablemente un folder `Overlays`,
  read-only, con checkerboard.

---

## 4. Orden sugerido y coste

| Fase | Riesgo | Notas |
|---|---|---|
| 2 — cerrar fugas del export | bajo | Aditivo. Arregla la queja original ya. |
| 1 — primitivos neutros | bajo | Constantes. Sin migración. |
| 3a — arreglar `surface.overlay` | medio | Corrige un bug documentado. Mueve un valor. |
| 3b — ghost/selected | bajo | Roles nuevos, no toca ninguno existente. |
| 4 — auditoría composicional | **alto** | Bloquea 3c honestamente. |
| 3c — `status.*.surface` → alpha | medio | Mueve valores vivos. Después de 4. |
| 5 — consumir en el código | medio | Mueve snapshots de sombra. |
| 6 — UI | bajo | |

`TOKEN_SCHEMA_VERSION`: **sin bump.** Todo es aditivo bajo `primitiveAlpha`, que ya existe
— mismo precedente que `gradientsDark`/`shadowsDark`.

---

## 5. Lo que este plan NO hace

- **No adopta el ladder de 5 pasos** sin decisión explícita (Fase 0).
- **No convierte el alpha twin en escala de opacidad.** Su rampa no es monótona (§1.2); es
  un reproductor del sólido, y ése es el trabajo que se le da en 3c.
- **No resucita la fundación `opacity`.** Sigue retirada; `surface.overlay` deja de
  depender de ella en vez de traerla de vuelta.
- **No toca el catálogo flat.** Está materializado en `themes[theme]` y necesitaría una
  migración estilo `clearSemantics` (precedente v43) — misma exclusión que hizo el pase de
  `border-roles-radix-band.md`.
