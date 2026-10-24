# Plan — Mobile: el shuffle como la mejor explicación de Escala

Fecha: 2026-10-24 · Alcance: `escala-tokens` (solo la pantalla de teléfono, debajo de `md`) · Estado: **plan, nada implementado**

## La idea en una frase

En el teléfono no se edita: **se juega**. Cada toque de Shuffle cambia variables reales y la pantalla entera
le sigue, y cada cambio dice en voz alta qué token se movió. Cuando a alguien le guste lo que salió, lo
manda a su laptop con un link y sigue desde ahí en el editor de verdad.

> Playground en el teléfono → "me gusta este" → link → se abre en desktop con ese sistema ya cargado.

## Dónde estamos hoy

Lo que vi en producción a 375×812:

- **El primer pantallazo pide perdón.** Lo primero es la tarjeta "Optimized for desktop", luego un hueco
  y el video. El hero ("Define your foundations…") y los contadores tardan en aparecer (en mi captura
  salían `0+`, falta confirmar si es solo la animación de entrada).
- **El demo ya existe y es bueno** (`AboutInspectDemo.tsx`): una tarjeta de Core, "Tap any part", y un
  bottom sheet con los tokens reales (`traceElement`). Pero:
  - está a ~1,5 pantallas de scroll;
  - el shuffle **solo mueve el acento** (`randomAccent`), así que dos toques se ven como "el mismo
    sistema con otro azul";
  - no hay salida: nada lleva lo que el visitante armó al desktop. "Start building" solo muestra un toast.
- **El motor para algo mucho más vistoso ya está escrito**: `nextShuffle()` + `stylePreviewFromRecipe()`
  en `src/lib/randomTheme.ts` cambian acento, tipografía (pares de `FONT_VOICES`), densidad de escala,
  radio, sombras, borde y el tinte del papel, y recorren los estilos curados antes de inventar. El
  teléfono no lo usa.

Lo de mayor impacto es entonces **reusar ese motor en el teléfono**; no hace falta inventar uno nuevo.

## Regla del repo que hay que tocar (decisión tuya)

`AGENTS.md` regla 9 y `CLAUDE.md` dicen "Desktop/laptop only… About es la única excepción de lectura".
Este plan **no** construye un editor en el teléfono (ni campos libres, ni hex, ni tablas), pero sí
amplía la excepción: *About + un playground de solo shuffle/lock/pick*. Propongo dejarlo escrito así en
ambos archivos para que ningún agente lo "corrija" después.

## Los 5 pilares

### 1. El shuffle va primero

- Primer pantallazo del teléfono: **un teléfono dentro del teléfono**, pintado con el sistema activo,
  con un botón grande de Shuffle al alcance del pulgar (abajo, fijo). El "Optimized for desktop" baja
  a una línea amable junto al CTA: *"El editor completo vive en desktop. Llévate este sistema allá."*
- Shuffle = `nextShuffle()` completo (estilo + tipografía + radio + densidad + papel), no solo acento.
  Mismo mazo de sesión (`SESSION_DECK`), así los primeros toques muestran los estilos curados, que son
  los más lindos.

### 2. Cada shuffle explica qué cambió (el "recibo")

Esta es la parte que enseña, y la más importante. Después de cada toque aparece una tira con los tokens
que se movieron, en el vocabulario real:

```
action.primary.default   #3E63DD → #E5484D
font.heading             Inter → Fraunces
radius.box               8px → 16px
type.scale               default → spacious
```

- Los chips aparecen escalonados y cada uno **pulsa sobre la parte de la pantalla que pintó** (el botón
  primario, el título, las esquinas). Así se ve que una variable mueve muchos componentes.
- Tocar un chip abre el bottom sheet que ya existe, filtrado a ese token.
- Debajo, una sola línea de prueba: **"Pasa AA en claro y oscuro"**, calculada con `src/lib/color/apca.ts`
  (nunca una segunda implementación). Ese es el valor que una paleta aleatoria cualquiera no da.

### 3. Candados por eje (estilo Coolors)

Cuatro candados grandes: **Color · Tipo · Forma · Densidad**. Bloqueas lo que te gusta y el shuffle
mueve el resto. Esto enseña sin texto que un sistema de tokens son **ejes independientes**.
Implementación: `nextShuffle` devuelve una receta; los ejes bloqueados se copian de la receta anterior
antes de `stylePreviewFromRecipe`. Es lógica pura y se puede testear en Vitest (`environment: node`).

### 4. Que el *layout* cambie, no solo el color

Pediste que el usuario vea cambiar el layout de la página. Tres pantallas en carrusel horizontal,
todas pintadas por el mismo sistema:

| Pantalla | Qué hace visible |
|---|---|
| Plan / pricing (la tarjeta actual) | acento, radio de caja, sombras |
| Login / formulario | radio de campos vs. botones (los 3 ejes de radio), alto de controles, foco |
| Dashboard / lista | densidad: spacing y escala tipográfica que respiran o se aprietan |

- Un control de **Claro / Oscuro** (el sistema ya resuelve ambos).
- Un dial de **Densidad** (los 5 modos de `TYPE_SCALE_MODES`) que reacomoda el layout en vivo; es lo que
  más se siente como "cambié una variable y la página se rehízo".
- Fase 3: **"Pintar esta página"**, que aplica el sistema al propio About (CTAs, títulos, acentos). El
  mensaje sería "esta web también es tokens". Hay que acotarlo a zonas seguras para no romper la
  legibilidad del chrome.

### 5. El puente al desktop (donde convierte)

- **"Me gusta este"** guarda la receta en una tira de favoritos (máx. 5, `localStorage` con try/catch;
  es comodidad del visitante, no persistencia real).
- **"Seguir en mi laptop"** genera un link `https://www.escalatokens.com/?remix=<receta>`:
  - la receta es compacta y determinista: id de estilo + acento + par tipográfico + modo de escala +
    radio + ejes. **No es un project id**, así que no toca `/api/tokens` (regla 1) ni el protocolo
    `project`/`section`. Se documenta como un parámetro nuevo en `workspaceLink.ts`;
  - se manda con `navigator.share` (hoja nativa: AirDrop, WhatsApp, mail a ti mismo) o se copia. No
    hace falta backend ni cuenta.
- **En desktop**, `?remix=` abre el Configurator con esa receta como *try-on* (`stylePreview`) y un
  banner: *"Esto lo armaste en tu teléfono. Ajústalo, expórtalo, llévalo a Figma."* con
  "Adoptar como mi sistema" como acción principal. No escribe nada en el store hasta que adopta, igual
  que los estilos hoy.
- Flujo inverso (fase 3): en el About de desktop, un QR "Pruébalo en tu teléfono".
- Fase 3: imagen OG del link compartido (una tarjeta con el sistema pintado). Así cada link que se
  comparte también es publicidad.

## Interacción y sensación

- Pulgar primero: Shuffle abajo a la derecha, 56px; candados en una fila de 44px mínimo.
- Gestos opcionales: deslizar arriba sobre el escenario = shuffle; "agitar para shuffle" solo detrás de
  un botón explícito (iOS pide permiso para `DeviceMotion`). Vibración corta en Android.
- Transición: los tokens cambian como variables CSS con 250–300 ms en color y radio; la tipografía hace
  crossfade. `useReducedMotion` lo apaga.
- **Fuentes**: precargar las fuentes de la *siguiente* receta (`loadGoogleFont`) mientras el usuario mira
  la actual, para que el shuffle en 4G no muestre el salto de fuente.
- Sigue montándose **solo debajo de `md`** (`useIsPhone`), como hoy.

## Medición

Nuevos eventos en `src/lib/analytics.ts`, solo enums (contrato de privacidad):

| Evento | Props |
|---|---|
| `mobile_shuffle` | `locked: 'none' \| 'some'`, `n: '1' \| '2-5' \| '6+'` (en bucket, con throttle) |
| `mobile_keep` | — |
| `mobile_handoff` | `via: 'share' \| 'copy'` |
| `remix_open` | `adopted: 'yes' \| 'no'` (desktop) |

El embudo a mirar: visita en teléfono → ≥1 shuffle → handoff → `remix_open` → `export` / `figma_publish`.
Meta inicial: que ≥40% de las visitas en teléfono haga shuffle y ≥8% de esas haga handoff.

## Fases

| Fase | Contenido | Tamaño |
|---|---|---|
| **F0 · Arreglar el primer pantallazo** | Reordenar la pantalla del teléfono (playground arriba, aviso abajo), confirmar lo de hero/contadores, shuffle completo con `nextShuffle`, eventos de analytics | 1–2 días |
| **F1 · Enseñar** | Recibo de tokens con pulso sobre las partes, badge de contraste, candados por eje (+ tests), claro/oscuro | 2–3 días |
| **F2 · Convertir** | Receta serializable + `?remix=`, `navigator.share`, banner + "Adoptar" en desktop, favoritos | 2–3 días |
| **F3 · Wow** | Carrusel de 3 pantallas + dial de densidad, "Pintar esta página", gestos, imagen OG, QR inverso | 3–5 días |

F0 + F1 ya cambian cómo se entiende el producto. F2 es lo que mueve gente al desktop, y se puede
adelantar a F1 si lo que más importa es convertir.

## Archivos que se tocan

- `src/components/configurator/AboutInspectDemo.tsx`: escenario, recibo, candados, carrusel
- `src/components/configurator/AboutMenu.tsx` / `AboutHome`: orden de la pantalla del teléfono
- `src/lib/randomTheme.ts`: candados por eje y receta serializable (lógica pura + tests)
- `src/lib/workspaceLink.ts`: documentar `remix`
- `src/App.tsx` / `Configurator.tsx`: leer `?remix=` y mostrar el banner
- `src/lib/analytics.ts`: eventos nuevos
- `src/lib/i18n.tsx`: copy ES/EN
- `AGENTS.md` regla 9 + `CLAUDE.md`: ampliar la excepción

## Decisiones (2026-10-24)

1. **Regla 9 ampliada**: About + playground de shuffle (sin campos libres, tablas ni export). Escrito en
   `AGENTS.md` y `CLAUDE.md`.
2. **`?remix=` no pide cuenta.** Se abre y se prueba sin login; la cuenta se pide más tarde, en desktop,
   cuando quiera guardar o exportar (como el resto de la beta).
3. **"Pintar esta página": sí.** Entra en F3, acotado a zonas seguras del About.

## Estado

- **F0 hecho, sin commit** (2026-10-24): el playground va justo después del hero (en el teléfono el CTA
  "Try it here" baja hasta él), el shuffle reparte un sistema completo con `nextShuffle` usando un mazo
  propio, el aviso "Optimized for desktop" bajó debajo del playground y se agregó el evento
  `mobile_shuffle` (hitos 1 · 2 · 6).
- **F1 hecho, sin commit** (2026-10-24):
  - **Candados** Color · Tipo · Forma · Densidad (`src/lib/shuffleLocks.ts`, con tests). Cada clave de
    foundation pertenece a un eje por tipo, así que una foundation nueva no compila hasta asignarle un
    eje. Uno queda siempre libre. Un estilo que sale con algún candado puesto ya no es ese estilo
    entero y se llama "Random".
  - **Recibo** (`src/lib/playgroundReceipt.ts`, con tests): compara el trace de las 6 partes antes y
    después del shuffle, muestra 4 líneas (una de cada tipo primero, el cambio más grande primero) y
    hace pulsar las partes que leen cada token. Tocar una línea abre el inspector en ese token.
  - **Contraste**: la misma auditoría del dashboard (`auditResolvedRoles` + `CURATED_PAIRINGS.categorical`
    + `contrastSummary`) en claro y oscuro, con 52 pares. Si algo falla lo dice y lista cada par con su
    mínimo. Ejemplo: Cupertino / Glass tiene `border.control` en 1.24:1 frente a un mínimo de 1.4.
  - Claro/oscuro en el escenario queda para después.
- **F2 hecho, sin commit** (2026-10-24):
  - `src/lib/remixLink.ts` (con tests): el sistema viaja como `?remix=1.<base64url>`, que contiene
    el estilo base más un JSON merge patch comprimido con deflate. Un estilo entero ocupa unos 40
    caracteres; un look aleatorio, entre 290 y 720. Al decodificar se valida todo: solo campos
    conocidos, fuentes del catálogo, valores sin `;{}<>` y un tamaño máximo. Si algo no pasa, devuelve null.
  - Teléfono: "Continue on my laptop" abre la hoja nativa de compartir (o copia el link). El código
    se calcula antes del toque porque Safari rechaza una hoja de compartir que espera una promesa.
    Un `?remix=` abierto en el teléfono carga ese sistema en el playground.
  - Desktop: un `?remix=` se abre como try-on en el board (`stylePreview`) con un banner. No pide
    cuenta para mirarlo. Quedarlo es el botón Add brand del board.
  - Un look modificado viaja con su propio id (`remix-<hash>`, etiqueta "Random"). Así Add brand no
    reabre un estilo que la persona ya tiene. Analytics: `mobile_handoff`, `remix_open`, y
    `style_adopt` agrupa los remix como `remix`.
  - **Sin cuenta para quedárselo (2026-10-24):** todo visitante sin cuenta ya tiene un Core
    automático (`ensureGuestBrand`). Si ese Core es su única marca y nadie lo ha tocado (mismas
    foundations, acento, tinte y receta de roles, y el nombre que se le dio), Add brand en un remix lo
    reemplaza y conserva el nombre. Si lo cambió, lo renombró o tiene otra marca, se pide cuenta como
    siempre (`adoptRemixOverGuestSeed` en `adoptPreset.ts`, con tests).
  - Favoritos y la imagen OG siguen pendientes.
- El hero "en blanco" y los contadores en `0+` eran la animación de entrada vista en un panel sin foco.
  No es un bug de layout.
- Pendiente aparte: en el teléfono el shell de desktop sigue montado (oculto con `hidden md:block`), y
  su pestaña About monta una segunda copia invisible del playground. Ya pasaba antes de F0.
