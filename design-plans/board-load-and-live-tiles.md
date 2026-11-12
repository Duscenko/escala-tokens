# Board: carga, tiles vivos y nueva lista (con Calendar)

Estado: **las tres fases construidas y medidas** (2026-11-12).

**Después (mismo día, pedido del owner):** fuera la tile de Unsaved changes, y con ella el
`DialogSurface`. En su sitio va Editors, rediseñada para ser visual: la cifra rueda contra
"/ 20 seats", con una rejilla de 20 asientos que se llenan con `action.primary` (los libres en
`action.secondary`) y el total. Columnas: A Create account · Profile · Checkbox — B Buttons ·
Calendar · Tabs · Notifications — C Verify · Sidebar · Editors · Stepper — D Badges · Chart ·
Team · Toasts · File upload · Input tag. Medido jugando: mediana de 4 tiles a la vez,
0 cambios de altura, 0 frames largos. Botón de pausa abajo a la derecha (`BoardPlayToggle`).

**Fase 2, como quedó:**
- **Un solo reloj** (`boardAutoplay.ts`): un timer de 100 ms para todo el board. El paso se
  calcula del tiempo desde que el board empieza a jugar, así que dos piezas con el mismo guion
  (el día del Calendar y su evento) no se separan nunca. `TileLiveContext` (lo da
  `ScaledModule`) congela los guiones de una tile fuera de pantalla o bajo el puntero.
- **Los guiones son datos**, en `boardScripts.ts` (sin dependencias pesadas, para que el
  Calendar lazy pueda importarlos): email, Editors, Calendar, readiness, followers, upload, tags.
- **`RollingNumber`**: dígitos en tiras con `--motion-use-travel-in`. El valor real va debajo,
  transparente, y da el ancho y la línea base.
- Specimens que juegan solo en el board (fuera, `null` y su valor de siempre): Input (el email
  se escribe con el campo en Focused), InputStepper, InputTag, FileUpload y Calendar. La línea
  de evento entra con Web Animations sobre el `use-stagger-in` de la marca.
- Medido 12 s jugando: entre 2 y 8 tiles cambian a la vez (mediana 5). 0 cambios de altura,
  layout shifts de 0,0004 como máximo, 0 frames largos (el peor, 25 ms). Bajo el puntero, la tile
  se congela y sigue al salir.

**Fase 3, como quedó** (20 tiles, antes 22):
- Fuera: Spinner, Indie Hackers, Credits y el switch suelto. Segmented entra en la tile de
  Tabs + Progress.
- Nuevas: **Calendar**, que es la propia tile (su root ya es una Card), con la línea de evento en
  el `footer` de react-day-picker (`children` opcional en `SkeletonCalendarSpecimen`).
  **Notifications**, con 3 filas de switch (`SkeletonSettingsList control="switch"`; el
  conductor del autoplay ya las acciona). **Editors**: Input Stepper con el total al mes.
  Elegí Input Stepper en vez de Slider: el board ya tiene una barra (Progress).
- Team: "4 members" en lugar de la etiqueta técnica `overlap-md · -8px`.
- Columnas: A Create account · Profile · Checkbox — B Buttons · Calendar · Tabs · Editors —
  C Verify · Sidebar · Unsaved · Notifications · Stepper — D Badges · Chart · Team · Toasts ·
  File upload · Input tag.
- Ancho de tile (`collageFrame`): el OTP se mide con su receta (6 × `size.control` +
  5 × `gap-control`). La regla antigua (6 × 32 + 5 × 4) se quedaba corta y solo la tapaba la
  frase de Credits; sin ella el OTP se cortaba y todo el board escalaba más grande. Se añade
  la semana del Calendar (7 × `size.compact` + su `spacing.3`).
- Medido otra vez: la ola va de 1965 a 2341 ms en frío y de 808 a 955 ms en la vuelta. Después
  del reveal solo hay shifts de valor 0. En reposo, 0.
- Sin hacer: la Cover tile con el gradient (pregunta 4 sin respuesta).

**Fase 1, como quedó** (`boardReveal.ts`, `ScaledModule` y `SystemCollage` en
`SystemCollage.tsx`, `preloadHeavySpecimens` en `specimens.tsx`). Medido con Chromium
headless contra el dev server, 1440×900, preset Standard:
- **Frío:** el board aparece con skeleton en cada tile. La ola va de 2138 a 2512 ms, en bandas
  de ~50 ms, y acaba en 2646 ms. Todos los layout shifts (el Chart crece 75 → 201 px cuando
  llega Recharts y las tiles de relleno se reajustan) ocurren **antes** del primer reveal.
- **Vuelta al Board:** ola corta de 755 a 909 ms, sin layout shifts.
- **En reposo, con el autoplay:** cero shifts con valor.
- **Reduced motion:** fundido de 120 ms, todo a la vez, sin transform.
- La ola arranca cuando el board entero está quieto (librería cargada y ninguna tile cambia de
  tamaño en 140 ms, tope de 1,5 s), no tile a tile. Un primer intento tile a tile revelaba los
  22 tiles en el mismo frame.
- Queda: en frío, el skeleton cambia de tamaño mientras carga (CLS 0,097 en dev, todo antes del
  reveal). Hay que medirlo en un build de producción antes de tocarlo.
Archivos: `src/components/preview/artefacts/SystemCollage.tsx` (tiles, `ScaledModule`,
`boardColumns`), `boardAutoplay.ts` (conductor + `useAutoplayStep`),
`ThemePreviewHub.tsx` → `ArtefactsView` (el `#generator-board`).

Referente: grabación del bento "split the bill" (frames en el scratchpad de la sesión),
el bento de vuelos y la card "Build color systems in seconds".

---

## 1 · Lo que hace hoy (medido, no supuesto)

Medido en el navegador: salir a Variables y volver a Board (remonta los 22 tiles),
con `MutationObserver` sobre la opacidad de cada tile y `PerformanceObserver('layout-shift')`.

| | Hoy | Referente |
|---|---|---|
| Primer frame | **Lienzo vacío ~380 ms** (en frío). Cada tile está a `opacity: 0` hasta que su propia medición de altura llega (`ScaledModule`, línea ~557). | Los marcos de las tiles ya están ahí, como bloques grises (skeleton). |
| Aparición | **Los 22 tiles aparecen en el mismo frame**, de 0 a 1 sin transición: un corte, no una entrada. En caliente ya están visibles al primer frame: no hay entrada ninguna. | Las tiles se llenan en ola: el contenido sustituye al bloque, unas antes que otras. |
| Después de aterrizar | Un salto de **76 px** de dos tiles a ~1,4 s (una tile encoge 45 px) y un shift del inspector a ~440 ms (CLS 0,013). | Nada se mueve de sitio una vez colocado. |
| Vida | `useBoardConductor`: **un solo acto cada 720 ms en todo el board** (hover/press de un botón, un switch, una pestaña). Más `PlayedButton` (2 botones) y `DialogSurface` (Unsaved changes). | Casi todas las tiles cuentan algo a la vez, cada una a su ritmo: cambia el **contenido**, no solo el estado. |

Lo que el referente hace y nosotros no, frame a frame:
- **Números que ruedan** dígito a dígito ($35 → $36 → $30 → $24; 47:10 → 47:12).
- **Texto que se escribe solo** ("Maya", "Pizza night at Maya's", "Tacos for 4").
- **Secuencias**: checks que se marcan en orden, anillo 1/4 → 4/4, "Step 2 of 3".
- **Calendario**: el día seleccionado se mueve y la línea de evento debajo cambia.
- **Botón** Sending → Sent (lo tenemos en 2 tiles), chips que se activan, slider que se desliza, dropdown que se abre.
- Nunca se mueve TODO a la vez: 3–5 tiles cambiando en cualquier momento.

---

## 2 · Fase 1 — La carga (el momento principal)

Objetivo: nunca un lienzo vacío, nunca un corte, nunca un salto después de aterrizar.

**1a. Skeleton desde el primer frame.** Cada tile pinta su marco a la altura reservada
con barras del **`Skeleton` del catálogo** dentro (ya existe en `COMPONENTS`), con los tokens
de la marca. El estado de carga del board lo pinta el propio sistema del usuario.
- La altura reservada sale de una caché por clave de tile (`Map` en módulo + `sessionStorage`)
  con la última altura medida para ese tema y viewport. Sin caché: altura típica por tile.
- Las tiles con chunk lazy (Chart, Calendar) piden su `import()` al montar el board,
  y el skeleton guarda su sitio mientras llega: no se cuelan después.

**1b. Ola de entrada.** Cuando el board está listo (todas medidas, o un tope de 600 ms),
cada tile cruza de skeleton a contenido en diagonal (columna + fila), ~35 ms entre tiles,
**total ≤ 500 ms**. Solo `opacity` + `translateY(6px→0)` + `scale(.985→1)`. Sin blur.
- **Con el motion de la marca** (`--motion-*`, rol `use-emphasis-in` / la choreography de
  entrada): Snappy carga rápido, Calm despacio. La carga pasa a ser otra muestra del preset
  del toolbar ("Expressive"). *Decisión del owner, ver §6.*
- Volver al Board en la misma sesión: entrada corta (fade 180 ms, sin skeleton, stagger a la mitad).
- Cambiar de tema/estilo (Random, System Style): sin re-entrada; el contenido cambia en sitio.

**1c. Cero saltos tras aterrizar.** Localizar las dos tiles del salto de 76 px a ~1,4 s
(una encoge 45 px: autoplay que cambia la altura o un chunk tardío) y fijarlas. Un tile que
juega no puede cambiar su altura: lo que juega se anima dentro de su caja.

**Reduced motion:** skeleton → contenido con un fundido simple, sin transform ni stagger.

---

## 3 · Fase 2 — Tiles vivos (la capa de historia)

Hoy hay un director que toca una cosa cada 720 ms. Pasa a ser **un guion por tile**
movido por **un solo reloj compartido** (un intervalo/rAF para todo el board, no veinte),
con fases desfasadas para que no se muevan al unísono.

- Cada guion es una lista corta de pasos (6–10 s por vuelta) que cambia el contenido real
  de componentes reales del catálogo.
- Densidad: **3–5 tiles cambiando a la vez**, el resto quietos.
- Se conserva lo que ya funciona: pausa en la tile bajo el puntero, apagado con el inspector,
  apagado con la pestaña oculta, vuelta al estado por defecto al parar. **Nuevo:** apagado por
  tile fuera de pantalla (`IntersectionObserver`).

Dos primitivas nuevas, ambas leen `--motion-*`:
- **`RollingNumber`**: cada dígito se desliza en vertical, `tabular-nums`, ancho fijo (no mueve el layout).
- **`TypedText`**: escribe y borra con caret; ancho reservado.

Guiones propuestos:

| Tile | Lo que juega |
|---|---|
| Create account | el email se escribe → Get Started → loading → Welcome (ya hace la parte del botón) |
| Verify account | los 6 dígitos del OTP entran uno a uno → Resend parpadea |
| **Calendar** (nuevo) | el día seleccionado salta por la semana; la línea de evento cambia ("Design review · Thu 10:00") |
| Chart | la métrica rueda 92 → 98 %, el badge +6 % entra |
| Profile | Followers rueda 12.4K → 12.5K |
| Checkbox list | los checks se marcan en orden y se reinician |
| Stepper | 1 → 2 → 3 con la línea de progreso |
| Tabs + Progress | la pestaña cambia y Progress sube 0 → 100 % |
| Input tag | se escribe "figma", entra como chip, sale |
| File upload | 0 → 100 % → check → reinicio |
| Toasts | success entra, error se apila, se descartan |
| Unsaved changes | ya abre/cierra como diálogo (se queda) |
| Buttons | hover/press del director actual (se queda) |

---

## 4 · Fase 3 — La lista de tiles

Hoy: 2 hero (Color, Type) + 20 tiles en 4 columnas. Varias tiles ocupan sitio sin enseñar
nada del sistema:

| Tile | Propuesta | Por qué |
|---|---|---|
| Spinner (sola) | **quitar** | relleno; el spinner ya sale en el loading de los botones |
| Toggle (un switch solo) | **fusionar** en una tile "Notifications" con 2–3 filas de switch | un switch aislado no se lee como interfaz |
| Indie Hackers (community card) | **sustituir por Calendar** | no enseña nada que otra tile no enseñe |
| Credits ("2 credits left") | fusionar con Profile o quitar | CTA suelta, poco sistema |
| Team (`overlap-md · -8px`) | quedarse, quitar la etiqueta técnica | la etiqueta de dev rompe la ficción de pantalla real |
| Segmented (solo) | fusionar con Tabs + Progress | dos controles de selección en tiles separadas |
| **Calendar** | **nueva** | pedida; enseña radius de control, estado seleccionado, acento |
| **Slider / Input Stepper** | nueva (una de las dos) | número que cambia con el control; casa con `RollingNumber` |
| **Cover** (opcional, 2 columnas) | nueva | la card "Build color systems in seconds": titular display sobre el **gradient** del sistema. Los gradients no salen en el board hoy |

Columnas propuestas (se reequilibran a ojo y `fillLast` sigue cerrando cada columna a la misma línea):

- A: Create account · **Calendar** · Profile
- B: Buttons · **Slider / Stepper** · Tabs + Segmented + Progress · Input tag · Checkbox
- C: Verify · Sidebar · Unsaved changes · **Notifications** · Stepper
- D: Badges · Chart · Team · Toasts · File upload

Calendar, detalles: un solo mes (fijo, no la fecha de hoy, para que no cambie entre sesiones);
cabe en una columna (7 × 32 px + padding < ancho fuente); chunk de `react-day-picker`
precargado al montar el board (§1a).

---

## 5 · Verificación

- `layout-shift`: CLS < 0,05 en la carga y **cero shifts en reposo** (el método de la nota del
  board en CLAUDE.md).
- Primer frame con skeleton visible en frío; ola completa ≤ 500 ms después de "listo".
- 60 fps con el board jugando (Performance panel); un solo timer activo para todos los guiones.
- Reduced motion: board quieto, entrada sin transform.
- Inspector: al activarlo todo vuelve al estado por defecto y se queda quieto.
- Tests (Vitest, sin DOM): el reloj compartido y el reparto de fases (puro), la caché de alturas.

---

## 6 · Decisiones del owner

Respondidas 2026-11-12:
1. **Motion de la marca para la carga: sí.**
2. **Quitar Spinner, Indie Hackers, Credits; fusionar Toggle y Segmented: sí.**
3. Slider o Input Stepper: respondió "sí" — **pendiente de elegir uno** en la Fase 3.
4. Cover tile / tercera imagen: **sin respuesta**.
5. **3–5 tiles moviéndose a la vez: sí.**
6. **Empezar por la Fase 1.**

Preguntas originales:

1. **¿La carga usa el motion de la marca** (cambia con el preset del toolbar) **o uno fijo del chrome?**
   Recomiendo el de la marca: el board es el lienzo de la marca y así el preset se ve también al cargar.
2. **Tiles a quitar:** ¿de acuerdo con quitar Spinner, Indie Hackers y Credits, y fusionar Toggle y Segmented?
3. **Slider o Input Stepper** para la tile numérica nueva.
4. **¿Cover tile** con el gradient (la tercera imagen) o esa imagen era para About?
5. **Densidad:** ¿3–5 tiles moviéndose a la vez está bien, o más tranquilo?

Orden propuesto: Fase 1 (carga) → Fase 3 (lista + Calendar) → Fase 2 (guiones), porque los
guiones dependen de qué tiles quedan.
