# Embudo: anónimo → cuenta Free → Pro

Plan, no implementación. Escrito el 2026-10-07 contra `3b8c463` + cambios sin commit de la sesión.

## La decisión (del dueño, 2026-10-07)

1. **Sin login**, el usuario prueba el producto, pero **no ve completos** Variables, Code ni Docs, y
   **no puede guardar**.
2. **Con cuenta Free**, ve todo y **guarda un theme gratis**.
3. **Pro** se pide en tres momentos: **crear un segundo theme**, **añadir un segundo modo al sync**
   y **conectar el MCP**.

Motivo: que la gente se tome en serio la plataforma (deje un email) y que el pago llegue cuando ya
dependen de ella.

### Lo que esta decisión invierte (hay que actualizarlo, no convivir con ello)

| Dónde | Lo que decía | Ahora |
|---|---|---|
| `accounts-and-login.md`, decisión abierta 2 | "Login opcional; solo la nube Pro y la licencia lo exigen" | Login exigido para ver todo y para guardar |
| `pricing-and-packaging.md`, "En evaluación: cuentas" | "Free sigue anónimo"; "un login obligatorio quita a Free su mayor ventaja" | Free = cuenta gratuita; anónimo = vista previa |
| `themes-library-accounts.md`, "Quién ve qué" | "La carpeta nunca bloquea el workspace" | Sigue sin bloquear el workspace (ver abajo), pero recorta lo que se ve |
| `CLAUDE.md`, nota del tab About | "never gates or blocks the workspace" | Matizar: el workspace abre siempre; lo que se recorta es el detalle |

Lo que **no** cambia: el workspace **abre sin cuenta** y se puede editar el theme en pantalla. No
hay pantalla de login delante del Generator. Lo que se pide es la cuenta en el momento de
**profundizar** (ver todo) o de **quedarse** (guardar). Así la primera impresión sigue siendo
"abrir y usar", que es lo que ese principio protegía.

## Decidido el 2026-10-07 (respuestas a las decisiones abiertas)

1. **Modo gratis = 1 apariencia (Light O Dark, la que está en pantalla) + Desktop.** Cualquier otra
   columna (la otra apariencia, Tablet, Mobile, un 2.º theme) es Pro. Es exactamente lo que
   `freeFigmaScope` ya hace para Figma.
2. **Descargar exige cuenta (gratis), y el recorte de (1) se aplica a TODAS las descargas** (Figma,
   CSS, W3C, Tailwind, Markdown, AI…), no solo a la de Figma. Cambiar ese modo en el wizard abre el
   upgrade.
3. **Guardar Free = local exigiendo sesión.** Sin nube, sin Supabase Pro (no hay presupuesto). La
   fase 4 de accounts queda aplazada. Coste cero: solo el keepalive (cron de Vercel) para que
   Supabase Free no se pause.
4. **El muro de login sale hoy**, con el próximo push. Los muros de upgrade se activan solos el
   1-nov (fin de la promo).

## Tres niveles, una tabla

Es la única fuente de verdad: el código la lee (`lib/access.ts`, ver Arquitectura) y `/pricing`
también.

| | Anónimo | Cuenta Free | Pro |
|---|---|---|---|
| Generator: Theme (canvas + edición rápida) | Sí, sin guardar | Sí | Sí |
| Probar los 12 System Styles en Customize | Sí (solo previsualizar) | Sí | Sí |
| **Variables** | Vista parcial + "Log in to see all" | Completo | Completo |
| **Code** | Vista parcial (el fundido actual) + login | Completo | Completo |
| **Docs** del Generator | Vista parcial + login | Completo | Completo |
| **Export** (descargar archivos) | **Login** (ver decisión 2) | 1 theme, Desktop | Hasta 10 themes, 3 viewports |
| **Save theme** | Login, y al volver guarda | 1 theme guardado | Hasta 10 |
| Crear un **2.º theme** (Create, adoptar otro estilo) | Login | **Upgrade** | Sí |
| **2.º modo** en el sync a Figma | — | **Upgrade** | Sí |
| **Conectar el MCP** | Login | **Upgrade** | Sí |
| Páginas públicas `/about`, `/docs/*`, `/components`, `/pricing` | Sí | Sí | Sí |

Las páginas públicas no se tocan: son SEO y la puerta de entrada.

## Cómo se ve cada muro

### Vista parcial (Variables, Code, Docs)

**Un solo componente para los tres:** el fundido de Code (`ThemeCodeFormat.tsx`, "Show full file")
se extrae a `ui/GatedFade`. Ese fundido ya está medido: es hermano del scroller, termina en el
token exacto del fondo y no forma una barra oscura. No se dibuja tres veces.

- **Code:** sin cuenta, el botón "Show full file" pasa a ser **"Log in to see the full file"**, con
  el número de líneas. Con cuenta Free, el botón vuelve a expandir como hoy.
- **Variables:** se ve la colección activa hasta N filas (propuesta: 12, una rampa completa) y el
  fundido con **"Log in to see all N tokens"**. El rail de colecciones y grupos sigue navegable,
  así que se ve lo grande que es el sistema.
- **Docs:** se ven la cabecera y la primera sección de cada artículo. El índice "On this page" se
  ve completo, por la misma razón.

**Es un muro blando y lo asumimos.** Los valores se calculan en el navegador: quien abra las
devtools los ve. El objetivo es el embudo, no la seguridad. Los muros que deben aguantar están en
el servidor (sección siguiente).

### Login (anónimo → Free)

- Toda acción de "Log in" lleva a `/login?mode=signup&next=…` con `loginReturn.ts`, que ya existe
  y ya tiene la lista cerrada de destinos y la intención pendiente en `sessionStorage`.
- **Ampliar `LoginNext` y `LoginIntent`**:
  - destinos: `variables`, `code`, `docs` y `export`, además de `library`;
  - intenciones: `export`, `create-theme` y `connect-mcp`, además de `save-library`.

  Al volver, se termina lo que se empezó. Ejemplo: se pulsa Save, se crea la cuenta y queda guardado.
- **Lo editado sin cuenta no se pierde.** Ya vive en el store local (persist). Hacer login no
  borra nada: el theme en pantalla sigue ahí y se guarda.

### Upgrade (Free → Pro)

Un solo `UpgradePrompt` (popover o modal), siempre con la misma forma:

- qué se quería hacer ("Add a second theme");
- qué incluye Pro, en una línea;
- precio y botón **Upgrade**, que lleva al checkout de Polar con `external_customer_id = user.id`;
- **Not now**.

Regla de `pricing-and-packaging.md` que se mantiene: la fila bloqueada **se ve**, no se esconde.
El botón "Create your theme" aparece igual y es al pulsarlo cuando sale el prompt.

**Promo:** hasta el 31-oct todos son Pro (`entitlement.promo`), así que los tres muros de upgrade no
saltan antes del 1-nov. Mientras tanto, se ve una etiqueta discreta "Pro · free until Oct 31".
El muro de login sí puede salir antes.

## Dónde se hace cumplir

| Muro | Dónde | Duro / blando |
|---|---|---|
| Vista parcial Variables / Code / Docs | Cliente | Blando (asumido) |
| Export | Cliente: el archivo se genera en el navegador | Blando |
| Guardar theme (cuenta) | `api/systems`: comprueba el JWT y la cuota | **Duro** |
| 2.º theme guardado | `api/systems` cuenta los themes del snapshot (Free = 1) | **Duro** |
| 2.º theme / 2.º modo en Figma | `api/tokens` (ya: sin Pro, 402) + `freeFigmaScope` | **Duro** |
| MCP | `api/mcp` (ya exige licencia después del 31-oct) | **Duro** |
| Crear un 2.º theme en pantalla | Cliente (el store es local) | Blando: no sale del navegador sin pasar por un muro duro |

Conclusión: **crear** un segundo theme en local se puede saltar, pero ese theme **no se puede
guardar, sincronizar ni servir por MCP** sin Pro. Es suficiente.

## Arquitectura

- **`lib/access.ts`** (nuevo): `useAccess()` devuelve `tier: 'anon' | 'free' | 'pro'` combinando
  `useAuth()` (sesión de Supabase) y `useEntitlement()` (promo o licencia). Además expone
  `can(feature)` y `gate(feature)`, este último con lo que hay que mostrar: `login`, `upgrade` u
  `ok`. Las características son una lista cerrada (`'variables.full'`, `'code.full'`,
  `'docs.full'`, `'export'`, `'save'`, `'theme.second'`, `'sync.secondMode'`, `'mcp'`). Ningún
  componente decide el nivel por su cuenta.
- **`ui/GatedFade`**: el fundido con su botón; recibe `gate` y las líneas o filas ocultas.
- **`UpgradePrompt`** y **`LoginPrompt`** (este último es solo un enlace con intención; no hay modal
  de login en la app).
- **Pro por cuenta**: hoy Pro es una clave de Polar en `localStorage`. Para que "Upgrade" funcione
  con la cuenta, hace falta la fase 3 de `accounts-and-login.md` (`licences` por `user_id`,
  webhook de Polar). Hasta entonces, la clave local sigue valiendo y `useAccess` la combina con la
  sesión.
- **Nube Free**: `api/systems` + tabla `saved_systems` es la fase 4 de `accounts-and-login.md`, que
  todavía no está hecha. Hoy guardar es local (`savedSystems`).

## Fases

**F0. Decisiones y documentos** (sin código)
- Responder las decisiones abiertas (abajo).
- Actualizar las cuatro notas de la tabla "Lo que invierte" para que no se contradigan.

**F1. Base**
- `lib/access.ts` + tests: tabla de niveles × características.
- `ui/GatedFade` extraído de Code, sin cambio visual.
- `UpgradePrompt` y `LoginPrompt`.
- Ampliar `loginReturn.ts`.

**F2. Muro de login (anónimo)**, desplegable antes del 31-oct
- Code: el botón pasa a ser de login.
- Variables: tope de filas.
- Docs: primera sección.
- Export: pide login.
- Save theme: login y al volver guarda.
- Customize: sin cuenta, My themes no se ve. El primer sistema se añade en local y abre la edición rápida; Variables, Code y Docs piden la cuenta en un diálogo.

**F3. Guardar con cuenta Free**
- *Opción rápida*: con sesión, guardar sigue siendo local (como hoy), solo que exige estar logueado.
- *Opción completa*: `api/systems` + `saved_systems` con cuota Free = 1 library de 1 theme (fase 4
  de accounts). Ver decisión 5.

**F4. Muros de upgrade (Pro)**, activos solos desde el 1-nov
- 2.º theme: "Create your theme", adoptar un segundo estilo en Customize, "Duplicate".
- 2.º modo en File & modes: depende de la decisión 1.
- MCP: `AgentInstallPanel`, pestañas MCP / PROMPT.
- Checkout de Polar con el `user.id`. Si se quiere que Pro viaje con la cuenta, necesita la fase 3
  de accounts.

**F5. Medición, textos y pruebas**
- Eventos del embudo dentro del contrato de analítica sin cookies (ver memoria de Vercel), solo
  conteos: muro visto → login iniciado → cuenta creada → primer guardado → upgrade visto → checkout.
- Textos en/es/fr.
- Prueba de punta a punta con un login real; `loginReturn` está pendiente de esa prueba desde la
  fase 2 de `themes-library-accounts.md`.

## Decisiones abiertas (te tocan)

1. **"Segundo modo al sync"**: ¿qué es un modo aquí?
   - (a) un segundo **theme** como columna de Figma;
   - (b) un segundo **viewport** (Tablet o Mobile);
   - (c) Light y Dark por separado.

   Hoy Free = 1 theme + solo Desktop, y Light/Dark cuentan como uno. Recomiendo **(a) y (b)
   detrás de Pro, (c) gratis**: un theme sin su versión oscura es la mitad de un theme.
2. **Export sin cuenta.** Si se puede exportar sin login, la vista parcial de Code no frena a nadie:
   el archivo completo sale en un clic. Recomiendo **Export detrás del login** (gratis con cuenta).
3. **Cuánto se ve sin cuenta**: 12 filas en Variables y la primera sección en Docs, ¿o menos?
4. **¿Las páginas públicas** (`/docs/*`, `/components`) **siguen completas?** Recomiendo que sí:
   SEO, y explican el producto sin tocar el Generator.
5. **Guardar Free: local con login (rápido) o nube (`api/systems`)**. La nube es lo que da sentido
   a la cuenta ("ábrelo en otro equipo"), pero es la fase 4 de accounts y requiere Supabase Pro
   antes de la primera licencia real.
6. **¿Anónimo puede adoptar otro System Style?** Resuelto (2026-10-09): el primer sistema se
   añade en local ("Add design system" abre solo la edición rápida). Variables, Code y Docs
   abren un diálogo de registro encima del previsualizador. Al volver de `/login` se abre
   ese tema (`themes/<key>`). Descargar sí, con la cuenta. Sync alojado y un segundo tema
   siguen pidiendo Pro.
7. **Calendario**: ¿el muro de login sale antes del 31-oct (durante la promo) o el 1-nov junto con
   los de upgrade? Recomiendo **antes**: así medimos el embudo de login sin mezclarlo con el precio.

## Riesgos

- **Rebote en la primera visita.** Si el muro aparece demasiado pronto, se pierde a quien solo
  venía a mirar. Por eso el canvas y la edición rápida quedan abiertos. Medir la tasa de rebote
  antes y después.
- **MIT.** Cualquiera puede ejecutar el configurador en local sin muros. Es aceptable: se vende la
  comodidad, la nube y el sync alojado, no el código.
- **Supabase Free se pausa** por inactividad. Con login obligatorio para guardar, una pausa rompe el
  embudo. Hace falta el cron de keepalive o Supabase Pro antes de abrir el muro.
- **RGPD**: el registro de cuentas pasa a ser masivo. Antes de F2 tiene que estar el checklist legal
  de `accounts-and-login.md` (SIRET, términos revisados).
- **Coherencia del texto**: README, About y `/pricing` dicen hoy "free, no account". Hay que
  cambiarlo en F2, en el mismo commit que el muro.

## Estado (2026-10-07)

**Hecho: el muro de login (F1 + F2) y guardar con sesión (F3 rápida).**
- `lib/access.ts` (`useAccess`: anon / free / pro; `goToLogin(intent)`) y `ui/LoginWall` (fundido + tarjeta, bloquea la rueda).
- Variables, Code y Docs (en el Generator): parcial + "Create a free account".
- Pide login: Export (pill y wizard), Copy page de Code y de Docs (solo dentro del Generator), el menú de exportar por rampa de Primitives, **Sync now** a Figma, Save theme (panel Theme) y Save library.
- Customize: My themes oculto. El primer "Add design system" abre la edición rápida sin salir;
  Variables, Code y Docs piden la cuenta en un diálogo. Un segundo tema sigue en Pro.
- `loginReturn`: destino `workspace` que vuelve a la MISMA sección (validada contra la gramática de `workspaceLink`, sin redirección abierta) + intenciones `export` y `save-library`, que el shell termina al volver.
- Textos del login actualizados ("Free. An account lets you…").

**Pendiente, antes del 1-nov:**
1. Recorte de TODAS las descargas a 1 modo + Desktop sin Pro. Hoy solo el JSON de Figma pasa por `freeFigmaScope`; CSS, W3C, Tailwind y Markdown se construyen desde el store (`sectionExport`) y hay que acotarlos por apariencia. Hasta el 31-oct todos son Pro (promo), así que no afecta a nadie todavía.
2. Muros de upgrade (2.º theme, 2.º modo, MCP) con `UpgradePrompt`.
3. Keepalive de Supabase (cron de Vercel) para que el plan Free no se pause.
4. Auto-sync a Figma (`useAutoFigmaSync`) no pasa por `publishFigmaNow`: un invitado con auto-sync activado de antes seguiría publicando.
5. Prueba de punta a punta con un login real (crear cuenta → volver → la acción pendiente se completa).
