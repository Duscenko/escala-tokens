# Plan — Móvil: bento + barra Shuffle · Copy prompt · Controls

Fecha: 2026-10-25 · Alcance: `escala-tokens`, solo teléfono (debajo de `md`, 768px) · Estado: **construido** — fases 1–4 (bento, barra, Controls con candados, historial y estilo)

Sigue a `mobile-theme-sheet.md` (construido). Mismo motor, misma regla 9: en el teléfono no se edita,
**se juega**; todo control es una elección de una lista que ya existe en desktop. Cambia la forma:
la vista previa pasa a ser un **bento** que se recorre con el dedo, y la hoja plegada se sustituye por
una **barra de tres botones** siempre a mano.

Referencia: Instant Brand (copytofollow.com/toys/instant-brand). Lo que copiamos es la estructura,
no el estilo.

## Lo que hace bien la referencia

1. **La vista previa ocupa toda la pantalla.** Nada de pestañas ni carrusel: se hace scroll y ya.
2. **Tres botones flotando abajo, siempre los mismos:**
   - **Shuffle**: el más grande (≈60% del ancho), pintado con el color primario de la marca y la
     tipografía de titulares. El botón mismo es parte de la demo.
   - **Copy prompt**: copia un brief para agentes. Al tocarlo pasa a verde "Copied" y sale una
     píldora "Brand brief copied" encima de la barra.
   - **Controls**: abre la hoja con todos los ajustes. La barra sigue visible encima de la hoja.
3. **La hoja de Controls es una sola lista**, no pestañas: intro, el brief con su botón, historial
   (← Brand 1 of 1 →), un selector de "vibe", y secciones plegables (Name, Type, Colour, Look & motion).
   Cada sección tiene su propio **shuffle** y cada fila un **candado**.

## Dónde estamos hoy (Escala)

| Pieza | Hoy | Problema en el teléfono |
|---|---|---|
| Vista previa | 6 vistas (Account, Actions, Status, Forms, Cards, Navigation) con barra de iconos + swipe lateral (`MobilePreviewViews.tsx`) | Se ve una sola tarjeta a la vez; el sistema no se lee "entero" |
| Dock plegado | 164px: handle · "Theme" · Reset · Customize · 6 colores · Shuffle | Ocupa ~20% de la pantalla y mezcla cuatro acciones; Shuffle no es protagonista |
| Hoja abierta | 4 pestañas: Color · Type · Shape · Export | Cada cambio exige cambiar de pestaña; no hay candados ni historial |
| Copiar | "Copy CSS variables" escondido en Export | Lo más útil para un visitante con IA (el prompt) no existe |

Lo que ya sirve y se reutiliza tal cual:

- `nextShuffle()` + `stylePreviewFromRecipe()` (`lib/randomTheme.ts`): el Shuffle grande.
- `withAccent / withFont / withTypeScale / withRadiusPreset / withSpacingMode` (`lib/mobileTheme.ts`): las elecciones.
- `ThemeDock` (drag entre paradas, no modal, portal a `<body>`), haptics, `?remix=`, `cssVariables()`.
- `withAgentEnvelope('global', …)` (`lib/aiContext.ts`): el sobre `agent-context/v1` para el prompt.
- El evento `mobile_shuffle` ya tiene la prop `locked` (hoy siempre `'none'`).

## La propuesta

```
┌─────────────────────────────┐
│ Escala            Core  ↺   │  cabecera de About (sin cambios)
├─────────────────────────────┤
│ ┌───────────┬─────────────┐ │
│ │ Core      │ INT  Inter  │ │  1. Identidad: nombre + rampa + tipo
│ │ ▮▮▮▮▮▮▮▮▮ │ Regular…    │ │
│ ├───────────┴─────────────┤ │
│ │ [ Click me ] [ Click me]│ │  2. Acciones (2 columnas)
│ ├────────┬────────────────┤ │
│ │Published│ Verify 8 2 4 │ │  3. Estado · Formularios
│ ├────────┴────────────────┤ │
│ │  98% ▁▂▃▅▃▂  readiness  │ │  4. Tarjetas
│ └─────────────────────────┘ │
│        ( Brief copiado )    │  píldora de confirmación
│ ┌──────────────┬────┬────┐  │
│ │ ⚄  Shuffle   │ ⧉  │ ⚙  │  │  barra fija · safe-area
│ └──────────────┴────┴────┘  │
└─────────────────────────────┘
```

### 1. La vista previa: un bento vertical (luego: seis páginas de bento, ver "Vuelta de la barra")

- Un solo grid de **2 columnas** (`grid-cols-2`, gap del sistema). Las tarjetas grandes ocupan 2,
  las pequeñas 1. Se hace scroll normal; sin barra de iconos, sin swipe, sin `?view=`.
- Las tarjetas son las mismas piezas de `MobilePreviewViews` (componentes reales de `escala-ui`
  pintados por `RecipeScope`), reagrupadas en tiles. No se inventan componentes nuevos.
- **Orden** (lo que mejor explica un sistema, primero):
  1. **Identidad** (2 col): nombre del sistema + rampa del acento 1–12 + rampa neutral, y el
     espécimen tipográfico ("INT · Inter · Regular / Medium / Heavy"). Es el "hero" de la referencia.
  2. **Acciones** (2 col): botones primary / secondary / outline / ghost + Delete / Learn more.
  3. **Estado** (1) + **OTP** (1): badges y "Verify account".
  4. **Perfil** (2) · **Métrica con gráfico** (2) · **Segmented** (1) · **Checkboxes** (1).
  5. **Navegación** (2): stepper + paginación · **Upload** (1) · **Spinner** (1).
- Las tarjetas siguen `inert` (no se enfocan, no responden a toques), como hoy.
- Render perezoso por fila (IntersectionObserver), en lugar de "la vista y sus vecinas".
- Padding inferior del bento = alto de la barra + `env(safe-area-inset-bottom)` + 16px, para que
  la última tarjeta no quede debajo de la barra.

### 2. La barra: Shuffle · Copy prompt · Controls

Sustituye al dock plegado de 164px. Fija abajo, 16px de margen lateral, alto 64px, visible solo
mientras el bento está en pantalla (el mismo IntersectionObserver que hoy oculta el dock).

| Botón | Ancho | Pintado con | Acción |
|---|---|---|---|
| **Shuffle** | flex-1 | `action.primary` del sistema en pantalla + fuente de titulares | `shuffle()` actual, respetando candados (ver 4) |
| **Copy prompt** | 64px | `accent-ui` del chrome de Escala | Copia el brief del sistema (ver 3) |
| **Controls** | 64px | `bg-elevated` del chrome | Abre / cierra la hoja |

- Shuffle se pinta con el sistema porque es la prueba en vivo: cada toque cambia también el botón.
  El par fondo/texto viene de los tokens `action.primary.*`, ya resueltos para contraste.
- **Feedback de copiar**: el botón pasa a `status-success` con "Copiado" durante 1,6s, píldora encima
  de la barra ("Brief copiado"), `haptic('success')`, y `aria-live="polite"`. Si falla: `status-danger`,
  "No se pudo copiar", `haptic('warning')`.
- **Feedback de Shuffle**: el dado gira 90° (180ms), la vista previa hace un fundido corto (150ms).
  Con `prefers-reduced-motion`, nada se mueve.
- Iconos + etiqueta corta bajo el icono en los dos botones pequeños ("Copy prompt", "Controls"),
  como en la referencia. Todo ≥ 44×44px.
- Reset sale de la barra: pasa a la hoja (fila del historial) y al ↺ de la cabecera.

### 3. Copy prompt: el brief del sistema

Una función pura nueva, `systemBrief(input)` en `lib/mobileTheme.ts`, con tests en Node:

```
VISUAL SYSTEM BRIEF — <nombre>
Use these tokens to build UI in this system. Do not add new colours or typefaces.

Colour roles   accent #…  ·  neutral #…  ·  success / critical / warning / info #…
Type           heading <familia> · body <familia> · base <14|16|18>px
Shape          radius <Sharp|Soft|Rounded|Pill> · spacing <Compact|Quiet|Airy|Bold>
CSS            :root { --color-action-primary-default: …; … }   (cssVariables())
Open in Escala <?remix= link>
```

- Envuelto con `withAgentEnvelope('global', …)` para que salga en el formato `agent-context/v1`
  que ya usa el desktop. **No** se inventa un segundo vocabulario (regla de "Do not invent").
- Nombres de variables con guiones y `var()` (regla 7).
- Incluye el link `?remix=` ya codificado (`encodeRemix` se calcula antes del toque, como hoy).

### 4. Controls: una sola lista, con candados

La hoja usa el mismo `ThemeDock`, ahora con dos paradas: **cerrada** (fuera de pantalla) y
**abierta** (86%). La barra queda por encima de la hoja (z-index mayor) para que Shuffle se pueda
tocar con la hoja abierta y ver el cambio en los controles. "Listo" arriba a la derecha la cierra.

Contenido, de arriba a abajo:

1. **Cabecera**: "Personaliza" · vibración on/off · Listo.
2. **Brief para agentes**: vista previa en mono de 5 líneas (solo lectura) + "Copiar brief".
3. **Historial**: `←  Sistema 3 de 7  →` + "Restablecer". Los últimos 20 sistemas en memoria
   (no en localStorage: un sistema vive en el `?remix=`). ← deshace un Shuffle.
4. **Estilo** (opcional, fase 4): "Cualquier estilo (sorpréndeme)" o un estilo de
   `THEME_STYLE_PRESETS`; debajo el nombre y una línea de descripción del estilo en pantalla.
5. Secciones plegables, cada una con su chip **⚄ shuffle** a la derecha:

| Sección | Filas (todas son elecciones) | Candado |
|---|---|---|
| **Color** | Fila rápida de 6 colores (`QUICK_ACCENTS`) · todos los curados (`BRAND_SPECTRUM`) · rampa 1–12 · roles con contraste (APCA + WCAG) | Acento |
| **Tipo** | Fuente (Inter · Geist · IBM Plex Sans · DM Sans) · tamaño base 14 / 16 / 18 | Fuente · Escala |
| **Forma** | Radio (Sharp · Soft · Rounded · Pill) · Espaciado (Compact · Quiet · Airy · Bold) | Radio · Espaciado |
| **Exportar** | Copiar variables CSS · Continuar en mi laptop (`?remix=`) · Figma / Agente (explican el paso al laptop) | – |

- **Candados** = qué sobrevive a un Shuffle. Función pura `applyLocks(next, prev, locks)` en
  `lib/mobileTheme.ts`: después de `nextShuffle()`, vuelve a aplicar sobre el resultado lo bloqueado
  con los `with*` que ya existen. Tests: cada candado sobrevive a 50 shuffles con RNG fijo.
- **Shuffle de sección** = Shuffle con todas las *demás* secciones bloqueadas. No hace falta otro motor.
- Elegir algo a mano **no** lo bloquea (como en la referencia); el candado es explícito.
- Candados en la URL: `?lock=accent,font` (replace, nunca push). Viajan dentro del `?remix=`? **No**:
  el laptop no tiene candados de teléfono.
- `?sheet=color|type|shape|export` sigue funcionando: abre la hoja y hace scroll a esa sección.
- Analítica: `mobile_shuffle.locked` pasa a `'none' | 'some'`; nuevo evento `mobile_copy_prompt`.

## Lo que se va

- Barra de iconos + swipe de 6 vistas, `?view=`, `PREVIEW_VIEWS` (se conserva el contenido).
- El dock plegado de 164px y la parada "plegada".
- Las 4 pestañas de la hoja (pasan a secciones de una lista).

## Fases

1. ✅ **Bento** — `MobileBento` (en `MobilePreviewViews.tsx`) reemplaza el tablist + track en
   `MobileGenerator`. `?view=` se borra de la URL; un link viejo con `?view=` cae en la vista previa.
2. ✅ **Barra** — `ActionBar` en `MobileThemeSheet.tsx`; `systemBrief()` + tests en `lib/mobileTheme.ts`;
   estados Copiado / No se pudo copiar con píldora y `aria-live`; el dock ya no tiene parada plegada
   (cerrado = fuera de pantalla). Los 6 colores rápidos quedan arriba de la hoja abierta; Reset en su
   cabecera. Evento `mobile_copy_prompt`.
   - Visibilidad: la barra se muestra mientras el bento cruza la franja 40–60% de la pantalla, medido
     en cada scroll (un `rootMargin` de IntersectionObserver se ignora dentro de un iframe).
   - El dado es la cara del tres (en diagonal): un cuarto de giro por Shuffle se ve como giro.
3. ✅ **Controls como lista** — la hoja ("Controls") es una sola lista de grupos plegables: Color · Tipo ·
   Forma · Exportar, cada uno con su chip "shuffle" (Exportar no). Candados en Acento, Fuente, Tamaño
   base, Radio y Espaciado; viven en `?lock=` (replace). `applyLocks()` + `shuffleSection()` + tests
   en `lib/mobileTheme.ts`. `?sheet=type` abre la lista en ese grupo. `mobile_shuffle.locked` = `some`
   cuando hay candados.
   - **Cambio respecto al plan:** el shuffle de sección no es "Shuffle con lo demás bloqueado". Un
     Shuffle completo reparte estilos enteros (sombras, bordes, superficies), así que "shuffle de Tipo"
     cambiaría más que el tipo. En cambio re-elige solo las opciones de ese grupo, de las mismas listas
     curadas que muestra la hoja, y respeta los candados. Con todo el grupo bloqueado, el chip se apaga.
   - El Shuffle grande reparte todo y luego `applyLocks` repone lo bloqueado. Un estilo con un candado
     ya no es ese estilo entero: conserva el nombre, no el id.
   - La fila de 6 colores rápidos salió de la hoja: el grupo Color, primero en la lista, ya los tiene todos.
4. ✅ **Historial y estilo** — arriba de la lista de Controls:
   - *(Retirado después: ver "Ajustes del dueño".)* `← Sistema 3 de 7 →`. Un Shuffle, un shuffle de sección, elegir un estilo o Restablecer AÑADEN un
     paso; una elección suelta (un color, una fuente) REEMPLAZA el paso en pantalla. En ambos casos los
     pasos por delante se descartan, como un deshacer. Máximo 20, solo en memoria. Helpers
     `historyStart/Push/Replace/Step` + tests en `lib/mobileTheme.ts`.
   - Selector de estilo: "Cualquier estilo (sorpréndeme)" o uno de los `THEME_STYLE_PRESETS`. Elegir uno
     lo aplica entero (los candados siguen valiendo) y desde ahí cada Shuffle se queda dentro: nueva
     opción `scaffold` en `RandomThemeInput` (aditiva) que fija el esqueleto y salta el mazo de estilos.
     Debajo: nombre del sistema, la descripción del estilo y "Shuffle se queda en {estilo}".
   - Restablecer salió de la cabecera de la hoja y vive junto al nombre.

Cada fase se publica sola: después de la 1 el dock actual sigue funcionando sobre el bento.

## Vuelta de la barra de iconos (2026-10-25, después de la fase 4)

Pedido del dueño: rescatar la barra de iconos para deslizar fácil. La vista previa vuelve a ser **seis
páginas con scroll horizontal** (Account · Actions · Status · Forms · Cards · Navigation) bajo una barra
sticky, y **cada página es un bento** de 2 columnas con sus tiles:

| Página | Tiles |
|---|---|
| Account | Identidad (nombre, rampas, tipo) · login |
| Actions | Botones · Selección · Uptime + Ajustes |
| Status | Badges + Presencia · Filtros · Alertas |
| Forms | Verificación · Plan (radio, slider, select) |
| Cards | Perfil · Checklist |
| Navigation | Tabs · Checkout (stepper + paginación) |

- `?view=` vuelve (página por defecto `account`, no se escribe). Tocar un icono desliza; deslizar
  mueve la barra (un tick háptico al cruzar). Flechas / Inicio / Fin en la barra (tablist WAI-ARIA).
- Pulido: una sola píldora que se desliza al icono elegido (sin movimiento con `prefers-reduced-motion`),
  contador `2/6` junto al nombre de la página, y Uptime sin el "98%" repetido.
- Render perezoso por página: la de pantalla, sus vecinas y las ya vistas.

## Dock y Controls en el lenguaje del desktop (2026-10-25)

Pedido del dueño: nada flotando, y Controls igual al panel derecho del desktop.

- **Dock "Theme" acoplado abajo** (vuelve la parada plegada, medida, ~150px): handle · Theme + nombre ·
  **Controls** (la puerta "Edit" del desktop, con su glifo de sliders) y debajo **Shuffle** (pintado
  por el sistema) + **Copy prompt** (botón `SHIP_BUTTON`). La barra flotante desapareció.
- **Controls** abre el mismo dock (86%) con el panel por páginas, las piezas del rail
  (`ThemeQuickSettingsRail`) a tamaño táctil:
  - **Edit {nombre}** (`PageHeader`): historial en la píldora del desktop (← n de N →), Restablecer,
    y la lista `EditRow` — Color · Font · Radius · Spacing · Style — con `FoundationGlyph`, valor actual
    (y candado si lo hay) y chevron. Abajo, **CSS · Figma · Agent** (`SHIP_BUTTON`) abren Export.
  - Sub-páginas con flecha atrás y su shuffle (el "Random tweak" del desktop, borde cónico):
    Color (swatches, rampa, contraste) · Font (filas de familia + **stepper de puntos** para tamaño
    base) · Radius (stepper Sharp/Soft/Rounded/Pill + esquinas en px) · Spacing (stepper de 4 modos) ·
    Style (filas con descripción, "Cualquier estilo" primero) · Export.
  - `DotSlider` se exporta desde el rail y se usa tal cual (`h-11` en el teléfono). Un sistema sin
    preset de radio (Core) asienta la píldora en el más cercano, con una nota.
- `?sheet=` ahora nombra páginas: `edit · color · type · radius · spacing · style · export`; el viejo
  `shape` abre Radius. El shuffle de sección separa Radius y Spacing.
- Al cambiar de página el foco va al título; entrada con un deslizamiento corto (sin movimiento con
  `prefers-reduced-motion`).

## Ajustes del dueño (2026-10-25, tarde)

- **Sin historial en el teléfono**: la fila ← n de N → y Restablecer salieron de Edit, y con ellas el
  estado y los helpers `history*` (y sus tests). La lista Edit empieza directo en Color.
- **Hero del teléfono**: el video demo va dentro del hero, justo encima de "Try it here"; ya no se
  repite más abajo (en desktop sigue en su lugar).
- **Sin tarjeta "Optimized for desktop"** bajo el playground: el aviso de laptop llega cuando hace
  falta (el toast de Start building, el hand-off de Export). `DesktopHandoffHint` se borró.

- **Mockup de teléfono**: cada página se dibuja a 390px (ancho de un teléfono real) dentro de un
  marco (`Device` en `MobilePreviewViews.tsx`: bisel con superficies del chrome, isla y barra de
  inicio) y se escala para caber entera — ancho y alto — en `min(58dvh, 560px)`. Así la barra de
  iconos, la página completa y el dock entran en una pantalla, sin scroll.
  - Ajuste: la página se escala al **ancho** del teléfono (≈0.8, no ≈0.4), y el teléfono es **tan
    alto como su página**: sin scroll dentro del teléfono, un solo scroll (el de la página). Entre
    páginas el alto cambia con una transición corta (sin ella con `prefers-reduced-motion`).
- **Arranque en Cupertino / Glass** (antes Core). Core sale en el primer Shuffle.
- **Botones del dock estilo Apple**: Shuffle, Copy prompt y Controls son píldoras rellenas
  (`rounded-full`; Shuffle con el primario del sistema, los otros en `bg-fg/8`, Controls abierto en
  `bg-fg`), sin bordes.

- **El home toma el sistema**: después del primer Shuffle (o de cualquier elección), las variables del
  chrome en `<html>` (`--app`, `--surface`, `--elevated`, `--fg*`, `--line*`, `--accent-*`, el CTA
  `--rainbow-*`, `--nav`…) y la tipografía pasan a los roles del sistema (`chromeFromRoles` en
  `lib/mobileTheme.ts`, con tests; el mapeo es el que documenta `index.css`). Toda la página —hero,
  "Try it here", header, dock— se ve en el sistema. El botón de apariencia sigue funcionando (resuelve
  los roles de ese modo). Al salir de la página, el chrome vuelve a ser el de Escala. Solo teléfono.

## Decisiones abiertas (dueño)

- [ ] ¿Shuffle pintado con el sistema (recomendado) o con el acento de Escala?
- [ ] ¿Selector de estilo/vibe en la fase 4, o fuera?
- [ ] ¿El brief en inglés siempre (lo leen agentes) aunque la UI esté traducida? Recomendado: sí.
- [ ] Al actualizar, cambiar el texto de la regla 9 en `AGENTS.md`: "Theme sheet" → "barra + Controls".

## Checklist de terminado

Accesibilidad (bloquea):

- [ ] Los tres botones ≥ 44×44px, con nombre accesible; Shuffle anuncia el nombre del sistema nuevo (`aria-live`).
- [ ] "Copiado" / "No se pudo copiar" se anuncian (`aria-live="polite"`).
- [ ] Candados: `aria-pressed` y etiqueta "Bloquear fuente", etc.
- [ ] Secciones plegables: `button` con `aria-expanded` + `aria-controls`.
- [ ] La hoja cerrada no tiene foco escondido; Esc la cierra; abrir no roba el foco al cargar.
- [ ] Reduced motion: sin giro, sin fundido, la hoja salta.
- [ ] Contraste del botón Shuffle comprobado con `evaluate()` en todos los estilos curados.

Producto:

- [ ] Desktop no renderiza nada de esto (`useIsPhone`).
- [ ] La barra nunca tapa contenido: la última tarjeta del bento queda por encima.
- [ ] La barra se esconde al pasar el bento; el resto de About se lee sin ella.
- [ ] Cada candado sobrevive al Shuffle grande y al de sección.
- [ ] El brief pega bien en un LLM (probado con uno) y su link `?remix=` abre el mismo sistema en desktop.
- [ ] `npm test`, typecheck de app y tests en verde.
- [ ] Probado en un iPhone real (Safari, safe-area, portapapeles, haptics).
