# Themes library con cuenta: ver y guardar librerías

Plan, no implementación. Escrito el 2026-10-05. Extiende `accounts-and-login.md` (fases 2 y 4)
con los flujos concretos de la puerta **Themes** (carpeta del tab bar) y del botón **Save library**.
Nada de esto se ve en producción mientras `ACCOUNTS_LIVE` sea `false`: todo va detrás de
`accountsEnabled`, igual que `AccountControl`.

## Lo que hay hoy (medido en el repo)

- La carpeta del tab bar es `ThemesLibraryToggle` (`ThemeSwitcher.tsx`). Abre
  `themeWorkspaceTab === 'library'`: el rail `ThemeLibraryRail` + la página `ThemeLibraryPage`.
- `ThemeLibraryPage` ya mezcla **dos cosas distintas** en una pantalla:
  1. **My themes**: los themes del sistema que estás editando (store en vivo, `myThemeKeys`).
     No es algo "guardado", es lo que hay en pantalla.
  2. **Saved systems**: `savedSystems` (persist de Zustand, solo este navegador), con "Load" y un
     enlace "Manage in System library" (`SaveView`, `exportMode 'save'`).
- Se guarda desde **tres sitios con tres nombres**: `SaveSidePanel` ("Save"), el paso 3 del
  Export wizard ("Save a reusable snapshot") y, antes, el popover de Kits (retirado). En la UI
  conviven "saved system", "System library", "kit" y "snapshot" para el mismo objeto.
- `/login` siempre vuelve a `/` (`LoginPage.tsx`, `window.location.assign('/')`): no hay forma de
  volver al sitio desde donde se abrió ni de terminar una acción pendiente.

## Vocabulario (decidir primero, todo lo demás depende de esto)

Propuesta: **una sola palabra para el objeto guardado: "library"**.

| Hoy | Propuesta |
|---|---|
| Saved system · kit · snapshot | **Library** (una copia guardada del sistema con todos sus themes) |
| System library (`SaveView`) | Se fusiona en la página Themes library, sección **My libraries** |
| Save · Save a reusable snapshot | **Save library** |
| My themes | Se queda: los themes de la library que tienes abierta |

El código (`savedSystems`, `saved_systems`) no se renombra; solo el texto visible y las claves
i18n (en/es/fr).

## Quién ve qué

| | Sin cuenta | Cuenta (Free) | Cuenta Pro |
|---|---|---|---|
| Abrir la carpeta Themes, ver y editar **My themes** | Sí | Sí | Sí |
| Ver **My libraries** | Solo las de este navegador + invitación a crear cuenta | Las de su cuenta | Las de su cuenta |
| **Save library** | Abre el login; al volver, guarda | Guarda en la nube, máximo 1 | Guarda en la nube, máximo 10 |
| Abrir sus libraries en otro equipo | No | Sí | Sí |

Regla que no se toca: **la carpeta nunca bloquea el workspace.** Pedir cuenta para ver los
themes que ya están en pantalla rompería "workspace, not wizard" y "el configurador funciona sin
cuenta". Lo que pide cuenta es **guardar y recuperar**, que es justo lo que la cuenta aporta.

## Flujos

### 1. Clic en la carpeta Themes, sin cuenta

1. Se abre la página como hoy: rail a la izquierda, My themes arriba.
2. Debajo, **My libraries** en estado invitado:
   - Si hay `savedSystems` locales: se listan con la etiqueta "In this browser" y un aviso:
     "Create an account to keep these on any device."
   - Si no hay ninguno: una tarjeta vacía con **Create account** (primario) y **Log in**.
     Texto: "Save your libraries to your account and open them anywhere."
3. Los botones llevan a `/login?mode=signup&next=library` (ver flujo 5).

### 2. Clic en la carpeta Themes, con cuenta

1. Misma página. **My libraries** lista las de la cuenta (orden `updated_at desc`), con nombre,
   número de themes, fecha y **Open** (confirma "Replace what is on screen?", que ya existe).
2. En la cabecera de la página: **Save library** (primario) y, a su lado, el estado:
   "Saved 2m ago" / "Unsaved changes" / "Not saved yet". Es lo que dice si hace falta guardar.
3. Menú de cada library: Rename · Duplicate · Delete (con confirmación).

### 3. Save library: dónde va el botón

Un solo flujo y una sola acción del store; varias puertas:

1. **Cabecera de la página Themes library** (principal). Es donde se ven las libraries, así que
   es donde se guarda.
2. **Paso 3 del Export wizard**: la tarjeta actual de snapshot pasa a llamarse "Save library".
   Es el momento en que el usuario piensa en conservar el trabajo.
3. **Menú de cuenta (`AccountControl`)**: "My libraries" lleva a la página; no guarda.
4. **`SaveSidePanel` / `SaveView`**: se retiran cuando My libraries cubra cargar, renombrar y
   borrar. Hasta entonces su botón llama a la misma acción.

No va en el `ThemeSwitcher` ni en el rail de iconos: son selectores, y un botón de guardar ahí
se confunde con "guardar este theme".

Comportamiento al pulsar:

- **Sin cuenta**: guarda en local como hoy (no se pierde nada) y abre el login con
  `next=library&intent=save`. Al volver con sesión, sube esa copia a la cuenta.
- **Con cuenta**: `POST /api/systems` con el JWT. Si ya existe una library con ese nombre, se
  actualiza (mismo contrato que `buildSavedSystemEntry`). Toast "Library saved" con enlace a
  verla.
- **Cuota llena** (1 en Free, 10 en Pro): la acción no falla en silencio. En Free, el popover
  ofrece **Replace my library** (sobrescribe la única que tiene) o **Upgrade to Pro**; en Pro,
  "Delete one to save another". Fila visible, nunca escondida (regla de pricing).

### 4. Primer login con libraries locales

Al entrar por primera vez con `savedSystems` en el navegador: banner en My libraries,
"N libraries are saved in this browser. Add them to your account?" → **Add all** / **Not now**.
Nunca automático: puede haber libraries de otra persona en un equipo compartido.

### 5. Volver de `/login` al sitio correcto

- `LoginPage` acepta `?next=` con una **lista cerrada** (`library`, `export`, …), nunca una URL
  libre (redirección abierta).
- `?intent=save` se guarda en `sessionStorage` antes de salir; al volver con sesión, el shell lo
  lee una vez, abre la carpeta Themes y termina el guardado. Si el login se cancela, se borra.
- OAuth (Google/GitHub) vuelve vía `redirectTo`; hay que pasar `next` en esa URL y que esté en la
  lista de Redirect URLs de Supabase (apex, `www`, localhost).

### 6. Cerrar sesión

Las libraries de la cuenta desaparecen de la lista; lo que está en pantalla se queda (es el store
local). My libraries vuelve al estado invitado.

## Otras páginas que muestran libraries guardadas

| Página | Hoy | Cambio |
|---|---|---|
| `ThemeLibraryPage` (sección Saved systems) | `savedSystems` local | Se convierte en **My libraries** (cuenta o local) |
| `SaveView` (System library) | Grid de `savedSystems`, crear/importar | Se fusiona en la página Themes library; "New" e "Import" pasan a su cabecera |
| `ExportWizard` paso 3 | "Save a reusable snapshot" | "Save library", mismo flujo 3 |
| `NewSystemModal` / `ImportSystemModal` | Lanzados desde `SaveView` | Se lanzan desde la página Themes library |
| `AccountControl` (TopNav) | Email + Log out | Añade "My libraries" |

## Datos y servidor

- Tabla `saved_systems` como en `accounts-and-login.md`; lectura (lista y carga) directa desde el navegador con RLS, escritura por `api/systems.ts`
  (escritura por servidor, RLS de solo lectura del dueño, tope **512 KB** por library).
- `GET /api/systems` (lista ligera: id, nombre, nº de themes, `updated_at`, sin snapshot) y
  `GET /api/systems/:id` (snapshot). Cargar la lista no debe traer todos los jsonb.
- **Conflictos**: guardar envía el `updated_at` que se leyó; si en el servidor es más nuevo
  (otro equipo), se pregunta "Overwrite / Save as copy". Sin esto, dos pestañas se pisan sin aviso.
- Al cargar, el snapshot pasa por el `migrate` del store (no un segundo formato).
- Un hook `useLibraries()` es la única fuente para la UI: con sesión lee la API, sin sesión lee
  `savedSystems`. Ningún componente decide eso por su cuenta.

## Estado

**Fase 1 hecha (2026-10-05)**, solo local:
- `ThemeLibraryPage`: **Save library** en la cabecera con su estado ("Not saved yet" /
  "Saved …" / "Unsaved changes"); la sección pasa a **My libraries**, con New library ·
  Import JSON · Load · Delete y la marca "On screen".
- `activeLibraryId` y `libraryMatchesSaved` en el store: el botón y el guardado usan el mismo id.
- Textos renombrados en el Export wizard (paso 3), `SaveView` y `GitHubConnectView`.
- `SaveView` y `SaveSidePanel` siguen existiendo (se retiran en la fase 4).

**Fase 2 hecha (2026-10-05)**, `src/lib/loginReturn.ts`:
- `/login?next=library&mode=signup`: `next` sale de una lista cerrada (cualquier otro valor
  vuelve a `/`); `mode=signup` abre en Create account.
- El destino y la acción pendiente (`save-library`) se guardan en `sessionStorage` (30 min),
  **nunca en la URL**: así un enlace compartido no dispara nada y OAuth vuelve al `/login` de
  siempre, **sin tocar las Redirect URLs de Supabase**. Una confirmación de email abierta en
  otra pestaña cae en "You are logged in" (no hay sessionStorage allí); no se pierde nada.
- Al volver con sesión, `/login` redirige a `/?section=library`, y la página termina el
  guardado pendiente una sola vez (`takeLoginIntent`).
- Sin cuenta, My libraries muestra la tarjeta "Create an account…" (Log in · Create account) y,
  tras guardar, el estado ofrece "Keep it in your account". Guardar **no** redirige solo: guarda
  en local y deja el enlace (se cambió respecto al flujo 3, que proponía abrir el login).
- Pendiente de probar de punta a punta con un login real (los tests cubren la parte de
  almacenamiento y la lista cerrada).

## Fases

1. **Vocabulario + página única**: renombrar textos (en/es/fr), mover crear/importar/borrar de
   `SaveView` a la página Themes library, botón Save library en su cabecera con el estado
   guardado/no guardado. Solo local. Desplegable con `ACCOUNTS_LIVE=false`.
2. **Retorno de login**: `next` + `intent` en `/login`, lista cerrada, `sessionStorage`.
3. **Libraries en la cuenta**: tabla, RLS, `api/systems`, `useLibraries()`, estado invitado,
   banner de importación local, control de conflictos.
4. **Cuota y Pro** (según la decisión 1), y retirar `SaveView`/`SaveSidePanel`.

Tests: RLS con dos usuarios; `next` rechaza valores fuera de la lista; guardar sin sesión
conserva la copia local y la sube al volver; conflicto de `updated_at`; carga de un snapshot
viejo pasa por `migrate`.

## Decisiones abiertas

1. **DECIDIDO (2026-10-05): Free guarda 1 library en la nube; Pro, 10.** (Primero se decidió 2; bajado a 1 el mismo día.) Corrige `accounts-and-login.md`
   ("Free no guarda nada"). Coste medido y razonado:
   - **Tamaño**: `JSON.stringify(makeDesignDefaults())` = **20 KB**. Un sistema real con varios
     themes y familias propias: estimado 50–300 KB (verificar con datos reales).
   - **Dónde cuesta**: las libraries viven en **Supabase**, no en Vercel. 100 cuentas Free × 1
     × 300 KB ≈ **30 MB** de los 500 MB del plan gratuito.
   - **El riesgo es el tope, no la media**: con el tope de 2 MB por library del plan de cuentas,
     100 Free × 2 × 2 MB = 400 MB, y un solo Pro con 50 × 2 MB = 100 MB. **Bajar el tope a
     512 KB por library** (un sistema real no se acerca) y limitar Pro a 10 libraries.
   - **Vercel**: lista y carga se leen **directo de Supabase desde el navegador** con RLS (solo
     filas propias), sin pasar por una función de Vercel: coste cero en Vercel. Solo **guardar**
     va por `api/systems` (valida cuota y tamaño): ~100 usuarios × unas 10 guardadas/día ≈
     30.000 invocaciones/mes, muy dentro de lo incluido en Vercel Pro. Mantener `rateLimited`
     y la regla de Firewall para `/api/systems`.
   - **Contrapartida**: hay datos de usuarios gratis en un proyecto sin backups, así que el
     `pg_dump` semanal del plan de cuentas va **antes de abrir el registro**.
2. **¿Se pide cuenta para ver la página, o solo para guardar/recuperar?** Recomiendo lo segundo
   (este plan). Bloquear la carpeta entera esconde My themes, que no necesita cuenta.
3. **¿Las libraries locales siguen existiendo con sesión?** Recomiendo que no se muestren mezcladas:
   con sesión, la lista es la de la cuenta y lo local solo aparece en el banner de importación.
4. **Nombre**: ¿"library" para la copia guardada? Choca un poco con "Themes library" (la página).
   Alternativa: la página se llama "Libraries" y sus secciones "Open now" (My themes) y "Saved".
