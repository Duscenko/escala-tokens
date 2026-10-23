# Audit — "creo otro brand, no hay botón de guardar y no se queda en mi cuenta"

Fecha: 2026-10-23 · Alcance: `escala-tokens` (web + `/api/account-files`) · Estado: **diagnóstico de código + sondeo a producción; no reproducido con una sesión real** (no me puedo loguear en tu cuenta).

## Síntoma reportado

1. Tengo un brand. Creo otro brand → voy al editor.
2. No hay botón de guardar, pero aparece un mensaje **amarillo** diciendo que no está guardado.
3. Si lo guardo, **no queda guardado en mi cuenta** (otro navegador / recarga no lo tiene).

## Cómo funciona hoy (resumen)

Hay **tres capas de "guardado"** distintas y la UI las mezcla:

| Capa | Dónde vive | Quién la escribe | Qué ve el usuario |
|---|---|---|---|
| Store persistido (Zustand) | `localStorage` del **origen** | cada edición | nada |
| "Biblioteca" (`savedSystems`) | mismo `localStorage` | `saveCurrentSystem()` — botón *Save brand* y luego `useAutosaveLibrary` | confetti + "Saved" **inmediato** |
| Cuenta (nube) | Vercel Blob vía `PUT /api/account-files` | `accountCloudSync.ts`, debounce 3 s + **mínimo 20 s entre escrituras** | línea de estado `AccountCloudStatus` |

Además, el estado "draft" de un brand (`sd-brand-unsaved`) y el del setup guiado (`sd-theme-setup`) viven **solo en `localStorage`** y **no viajan a la nube** (`src/lib/themeSetup.ts`).

Sondeo a producción (GET sin token, solo lectura):
- `https://www.escalatokens.com/api/account-files` → `401 {"error":"signed_out"}` ✅ (secreto y Blob configurados; si faltara `ACCOUNT_FILES_SECRET` respondería 503).
- `https://escalatokens.com/` → **200, sin redirección a `www`** ⚠️

## Hallazgos (ordenados por probabilidad de ser tu bug)

### H1 — Dos orígenes: `escalatokens.com` y `www.escalatokens.com` sirven la app por separado · **P0 infra**
El apex responde 200 en vez de redirigir a `www`. Son dos orígenes distintos ⇒ **dos `localStorage` y dos sesiones de Supabase**.
- Si te logueaste en `www` y luego abres el apex (o al revés), la app te ve como **guest** (`useAccess().guest`).
- Como guest, el footer del editor (`ThemeSaveBar` → `FooterStatus` → `UnsavedNotice` sin `onSave`) muestra **"Not saved" en amarillo** y solo un enlace "Save with an account" — **no hay botón de guardar**.
- `keepCreatedBrand` hace `if (tier === 'anon') return`: nada se escribe en la biblioteca ni en la cuenta. Lo que hiciste se queda en el `localStorage` de ese origen.
- Encaja con los tres síntomas a la vez.

### H2 — El estado "unavailable" de la sincronización es terminal · **P0 código**
`src/lib/accountCloudSync.ts` → `request()` clasifica como `unavailable` cualquier respuesta **no JSON** o 404/405/503. Eso incluye una página de error HTML de Vercel (500/502/504, timeout de la función, cold start fallido).
- `blocked()` devuelve true con `unavailable` ⇒ `schedulePush` y `pushNow` no vuelven a hacer nada **durante toda la sesión**. No hay reintento (solo `offline` reintenta).
- El usuario ve en amarillo "Not saved to your account" **sin ninguna acción** (no hay botón Reintentar).
- Cada edición sigue "guardándose" en la biblioteca local (confetti/"Saved"), pero la cuenta no recibe nada hasta recargar.

### H3 — "Saved" no significa "en tu cuenta" · **P1 código/UX**
- *Save brand* llama `saveCurrentSystem()` (local) y muestra "Saved" + confetti al instante.
- La subida espera ≥3 s de inactividad y **≥20 s desde la última escritura** (`MIN_GAP_MS`). Si recargas, cierras la pestaña o cambias de navegador en esa ventana, la cuenta no lo tiene.
- `flushAccountCloud` en `visibilitychange: hidden` usa un `fetch` normal (sin `keepalive`) que el navegador puede cortar al cerrar. No hay aviso `beforeunload` con cambios pendientes.

### H4 — Un brand recién creado (signed-in) que es "draft" no tiene botón principal de guardar · **P1 UX**
En `ThemeSaveBar`, para un draft de una cuenta con `ship` (el caso normal del editor): el botón primario se reemplaza por la fila **CSS · Figma · Agent**, y *Save brand* queda como botón pequeño dentro de la línea amarilla "Not saved". Fácil de no ver; y en la pestaña Variables (`ThemeSaveBar inactive`) el botón aparece deshabilitado.
Para un brand **ya guardado** no hay botón de guardar (autosave): si la nube está en `offline/unavailable/too-large/outdated` solo queda la línea amarilla sin acción → mismo síntoma que H2.

### H5 — El flag de draft no viaja a la nube · **P2 consistencia**
`sd-brand-unsaved` es local. En otro navegador ese brand ya no es draft: `savedBrandKeysFrom` lo cuenta como guardado, `useLibraryStatus` da `dirty` y `useAutosaveLibrary` lo archiva solo. En el navegador original sigue siendo draft hasta *Save brand*, y el barrido de drafts de Home / *Cancel* lo pueden borrar. Resultado: comportamiento distinto según el navegador.

### H6 — Límite de plan en la nube (latente) · **P2**
`FREE_CLOUD_SYSTEMS = 1`: el servidor recorta a un design system para cuentas no Pro (`trimToPlan`). Hoy no aplica porque `OPEN_BETA` ⇒ `promo` ⇒ Pro para todos, pero el día que se apague la beta, el segundo sistema queda "solo en este navegador". Hay que decidirlo antes de apagar la beta.

### H7 — Higiene: `prod.env` sin ignorar · **P1 seguridad**
`escala-tokens/prod.env` (con `BLOB_READ_WRITE_TOKEN`, `ACCOUNT_FILES_SECRET`, `VERCEL_OIDC_TOKEN`…) está sin trackear y **no** está en `.gitignore`. Un `git add .` lo publica. Añadirlo a `.gitignore`; si alguna vez salió del equipo, rotar los secretos (excepto `ACCOUNT_FILES_SECRET`, que no se puede cambiar sin perder los archivos: ver comentario en `api/account-files.ts`).

### H8 — Observabilidad casi nula
El servidor solo loguea éxitos (`evt: account_files, op: save`). Los 409/413/502 y las transiciones de estado del cliente no dejan rastro, así que no se puede saber desde Vercel qué le pasó a un usuario.

## Plan de ejecución

### Fase 0 — Confirmar la causa (30 min, antes de tocar código)
1. Tú: en el editor, anota **la URL exacta** (¿con o sin `www`?) y **el texto exacto** de la línea amarilla ("Not saved" = guest/draft · "Not saved to your account" = nube caída).
2. DevTools → Network → filtrar `account-files`: código de respuesta y `content-type` de los `GET`/`PUT`.
3. Vercel → Runtime logs de `/api/account-files` de las últimas 24 h (puedo hacerlo con el MCP de Vercel si lo autorizas): ¿hay `op: save` para tu sesión? ¿5xx?

### Fase 1 — Un solo origen (infra, P0)
1. Vercel → Domains: `escalatokens.com` → **redirect 308 a `www.escalatokens.com`** (conservando path y query). Revisar también los alias `*.vercel.app` (no deben ser una puerta de entrada para usuarios).
2. Supabase → Auth → Redirect URLs / Site URL: solo `https://www.escalatokens.com` (+ localhost para dev).
3. Riesgo: quien trabajó **como guest** en el apex pierde acceso a ese `localStorage` al redirigir. Decidir: (a) aceptarlo, o (b) un deploy previo de 1–2 semanas con un aviso en el apex "Muévete a www" + exportar. Las cuentas logueadas no pierden nada si su nube está al día.
4. Verificar: `curl -I https://escalatokens.com/` → `308` con `location: https://www.escalatokens.com/`.

### Fase 2 — Sincronización robusta (`src/lib/accountCloudSync.ts`, P0)
1. `request()`: 5xx y respuestas no JSON ⇒ `offline` (reintento con backoff 30 s → 2 min → 5 min), **no** `unavailable`. Reservar `unavailable` solo para `503 {"error":"unconfigured"}` y aun así reintentar cada 5 min.
2. Exponer `retryAccountCloud()` y mostrar un botón **Reintentar** en `AccountCloudStatus` para `offline/unavailable`.
3. *Save brand* (y `keepCreatedBrand`) ⇒ `flushAccountCloud({ force: true })`: sube ya, saltándose `MIN_GAP_MS`.
4. `pagehide` además de `visibilitychange`; aviso `beforeunload` si el estado es `pending/saving/offline`.
5. Tests (Vitest, node): clasificación de respuestas de `request()` (HTML 502, 504, 503 unconfigured, 409 stale/outdated), que `unavailable` ya no bloquee para siempre, y que el flush forzado ignore el gap.

### Fase 3 — Un footer que siempre tenga salida (`ThemeSaveBar.tsx`, `AccountCloudStatus.tsx`, P1)
Regla: **nunca una línea amarilla sin una acción al lado.**
| Estado | Footer |
|---|---|
| Guest | "Not saved · Save with an account" (botón, no enlace) |
| Draft (cuenta) | **Save brand** como botón primario a ancho completo; la fila CSS·Figma·Agent debajo |
| Guardado + nube OK | ✓ "Saved to your account" |
| Guardado + nube `pending/saving` | "Saving to your account…" |
| Guardado + nube con error | "Not saved to your account · **Retry**" |
| Conflicto | el diálogo actual (`AccountCloudConflict`) |

El "Saved" del botón debe esperar a la confirmación de la nube (o decir "Saved on this browser · uploading…").

### Fase 4 — Draft consistente entre navegadores (P2, requiere decisión de producto)
Opción A (recomendada): para cuentas logueadas, **crear un brand lo guarda** (sin estado draft); el draft queda solo para guests/Random. Elimina H5 y el barrido de drafts para cuentas.
Opción B: añadir `drafts: string[]` a `CloudFiles` (campo **aditivo**; `isCloudFiles` debe aceptarlo ausente) y leerlo en `adopt()`.

### Fase 5 — Observabilidad e higiene
1. `api/account-files.ts`: loguear `stale`, `outdated`, `too_large`, `unavailable` con `revision` y tamaño (nunca el contenido ni el email).
2. `prod.env` a `.gitignore` (H7).
3. Antes de apagar `OPEN_BETA`: decidir el límite de sistemas en la nube para Free (H6) y mostrarlo en la UI antes de recortar.

### Verificación final (manual, en producción tras deploy)
1. Apex redirige a `www`.
2. Cuenta A, navegador 1: crear brand 2 → *Save brand* → la línea pasa a "Saved to your account" en <5 s.
3. Navegador 2 (o ventana privada), misma cuenta: brand 2 aparece.
4. DevTools → Network offline → editar → "Not saved to your account · Retry" → volver online → Retry → ✓.
5. `npm test` y `npm run build` en verde.

## Archivos implicados
- `src/lib/accountCloudSync.ts` — motor de sincronización (H2, H3)
- `src/components/configurator/ThemeSaveBar.tsx` — footer del editor, `UnsavedNotice` (H1, H4)
- `src/components/configurator/AccountCloudStatus.tsx` — línea de estado (H2, Fase 3)
- `src/components/configurator/ThemeLibraryPage.tsx` — `keepCreatedBrand`, studio de creación (H1, H5)
- `src/lib/themeSetup.ts`, `src/lib/libraryStatus.ts` — draft y autosave (H5)
- `src/lib/accountCloud.ts`, `api/account-files.ts` — forma del registro y límites (H6, H8)
- Vercel Domains + Supabase Auth URLs (H1)
