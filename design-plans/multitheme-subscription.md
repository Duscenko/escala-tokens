# Multi-theme de pago único (con promoción gratis hasta el 31 de octubre)

Plan, no implementación. Escrito el 2026-10-02 contra `86c10b3`+ (working tree con el
selector de viewports en File & modes).

## Revisión (2026-10-02): pago único, no suscripción

Entra el consejo de vender un **producto digital de pago único** a través de un
**Merchant of Record** (Polar o Lemon Squeezy) en vez de un SaaS con login y suscripción.
Lo adopto como base y esto es lo que cambia respecto al borrador de abajo:

- **Producto:** "Escala Complete" (nombre a decidir), **pago único / lifetime**, no
  mensualidad. El site sigue gratis (configurar y exportar). Lo de pago: **multi-theme
  sincronizado** + pack completo (plugin, guía, skill/agent pack, plantillas de temas,
  actualizaciones, prioridad). La fase de suscripción **se pospone** hasta medir demanda
  (si la gente pide sync ilimitado).
- **Sin cuentas ni login.** Lo que la MoR entrega es una **clave de licencia** (Polar y
  Lemon la emiten y tienen API de validación). El usuario la pega una vez; el servidor la
  valida contra la API de la MoR. Esto elimina la decisión 4 del borrador (identidad):
  **clave de licencia, y punto.** Magic link / GitHub quedan fuera.
- **El límite sigue en el servidor, pero es una comprobación de clave, no de usuario:**
  `POST /api/tokens` valida `x-escala-license` (con caché corta) y, sin clave válida,
  limita a **1 tema**. Sigue sin poder saltarse desde la consola.
- **Cobrar el primer dinero no necesita infraestructura de pago propia:** checkout
  alojado de la MoR + webhook opcional. El IVA de la UE lo resuelve la MoR.
- **Riesgo propio del lifetime (importante):** el sync alojado cuesta dinero cada vez
  (Blob + funciones, y ya hubo un incidente de coste con el MCP). Un pago único no cubre
  coste infinito. Mitigación: **límites blandos** (rate limit por clave, tope de
  publicaciones/hora, 1 archivo de Figma por clave en el nivel base) y "actualizaciones
  durante 1 año" en el pack. La promo gratis hasta el 31-oct sirve además para medir el
  volumen real de publicaciones antes de fijar esos topes.
- **Meta de validación (la de tu captura):** 10–20 ventas lifetime → cubre Cursor + Vercel
  un año → se aprende la demanda → entonces se decide si se monta suscripción.

Decisiones que quedan (el resto de abajo se simplifica): **precio** (el consejo sugiere
pago único; falta la cifra), **Polar vs Lemon Squeezy**, **umbral gratis** (recomiendo
1 tema) y **hora de corte** (Europe/Paris).

## ESTADO — pendiente, retomar mañana (2026-10-03)

**Decisiones tomadas (2026-10-02):**
- Modelo: **pago único** vía **Merchant of Record**, sin cuentas ni suscripción (clave de licencia).
- Proveedor: **Polar** (licencias, descargas, Discord/GitHub integrados; 5% + 50¢ igual que Lemon, que además se está integrando en Stripe).
- Precio propuesto: **€79 pago único** (lanzamiento €59 hasta fin de año; cupón LATAM −30%), con "actualizaciones durante 1 año".
- Umbral gratis: **1 tema** (Light+Dark cuentan como uno; los viewports no cuentan).
- Corte de la promo: **2026-10-31 23:59 `Europe/Paris`**, fecha fijada en el servidor.

**Pendiente de decidir (del usuario):**
1. Confirmar precio (€79 / lanzamiento €59) — es una estimación, no un dato medido.
2. Abrir cuenta en Polar con el SIRET y **comprobar que paga a un auto-entrepreneur francés** (la búsqueda no lo confirmó).
3. Nombre y alcance de "Escala Complete" (¿sólo multi-tema o todo el pack?). Recomendación: todo.
4. Política de reembolso (p. ej. 14 días).
5. Fiscalidad micro-entreprise (seuil TVA, plafond micro-BNC): consultar al contable.

**Hecho:** este plan; el selector de **Viewports** en File & modes (plugin 0.3.2), ya commiteado.
**Sin hacer:** nada de código de pagos, banner ni bloqueo.

**Siguiente paso mañana (fase 1, no requiere cobrar):**
1. Mockup visual de los 4 estados (banner promo, fila bloqueada, popover de upgrade, estado Pro).
2. `api/entitlement.ts` con la fecha de promo en el servidor.
3. Banner con cuenta atrás en `FigmaSyncView.tsx` (tokens del acento, respeta reduced-motion).

**Estado del repo:** configuradora con commits locales sin push desde `a6cc157`
(viewports, plan); plugin con 0.3.1 y 0.3.2 sin push. Falta que pruebes el plugin 0.3.2
en Figma y luego push de ambos repos.

## La idea

`File & modes` (Figma Sync) es donde un sistema sale a Figma, y es el momento en que
alguien entiende el valor de tener **varios temas** sincronizados como columnas. Ahí se
pone el muro:

- **Gratis:** hasta N temas de My themes publicados a Figma (cada uno con su Light/Dark).
- **Pro (suscripción):** temas ilimitados (hasta el tope técnico `FIGMA_SYNC_MODE_CAP`).
- **Promoción:** hasta el **31 de octubre de 2026** todo el mundo tiene Pro, con una
  cuenta atrás visible. Después, el límite se aplica.

## Lo que existe hoy (medido) y por qué condiciona el diseño

- **No hay cuentas ni cobros.** La identidad de un sistema es el `?project=` (ID
  `esc_…`) y un *claim* por slug guardado en `localStorage` (`publishTrust`). GitHub es
  opcional y sólo para push. No hay Stripe ni nada parecido en `package.json` ni en `api/`.
- **La publicación es la puerta.** El plugin sólo lee lo que `POST /api/tokens` guardó en
  Blob. Así que el único sitio donde un límite **no se puede saltar** es ese endpoint: un
  bloqueo sólo en la UI se quita desde la consola y el payload multi-tema llega igual.
- **El payload ya dice cuántos temas lleva**: `colors.themeModes` / `themeOrder`
  (columnas `theme::appearance`). Contar temas distintos en el servidor es trivial.

## Decisiones que tienes que tomar (bloquean la implementación)

1. **Umbral.** "Más de 2 temas" puede ser: gratis = 1 tema (Light+Dark) y Pro desde el
   2.º; o gratis = 2 temas y Pro desde el 3.º. **Recomiendo gratis = 1 tema**: el valor
   de multi-tema es justo el 2.º tema (marca A / marca B, cliente / producto); con 2
   gratis casi nadie llega a pagar.
2. **Qué se cuenta.** Recomiendo **temas**, no columnas: Light y Dark de un mismo tema no
   cuentan doble (si no, "1 tema" ya sería un muro). Los viewports tampoco cuentan.
3. **Proveedor de pago** (ver la revisión de arriba: MoR + pago único). Recomiendo **Lemon Squeezy** o **Stripe Checkout + Customer
   Portal**. Lemon Squeezy hace de *merchant of record* (IVA de la UE resuelto, tú estás
   en Francia), Stripe da más control. Ninguno exige backend propio de cuentas: el
   checkout devuelve un email y un `customer_id`.
4. **Cuenta del usuario — RESUELTA:** clave de licencia de la MoR, sin cuentas. (Antes: hace falta saber *quién* pagó. Opciones, de menos a más
   trabajo: (a) **licencia por email + clave** que el usuario pega una vez (como muchos
   plugins de Figma); (b) magic link por email; (c) GitHub OAuth, que ya existe
   (`api/github-oauth.ts`) — gratis de construir, pero obliga a tener GitHub.
   **Recomiendo (a) para lanzar antes del 31** y (b) después.)
5. **Precio y periodo** (mensual / anual) y si hay plan de equipo.
6. **Qué pasa el 1 de noviembre con lo ya sincronizado.** Recomiendo **no romper nada**:
   un archivo de Figma con 3 temas sigue funcionando con los datos que ya tiene; lo que
   se bloquea es *volver a publicar* más de N temas sin Pro (el plugin conserva la
   última versión publicada). Nadie pierde trabajo.
7. **Hora de corte**: 31-oct-2026 23:59 ¿en qué zona? Recomiendo `Europe/Paris`, y que el
   servidor sea la única fuente de la fecha (nunca el reloj del navegador).

## Diseño (la parte que tiene que llamar la atención)

Todo con los tokens del chrome que ya existen: `--accent-solid` + `--accent-ink` para el
relleno, el wash `darkChromeWash` / `color-mix(var(--accent-ui) …)` del Layer 0, y los
roles de tipo `text-*`. Nada de colores nuevos.

### 1. Banner de promoción dentro de "File & modes" (hasta el 31-oct)
- Franja en la cabecera de la tarjeta, **degradado del acento** (el mismo wash de la
  toolbar, más intenso) con un brillo animado lento que respeta `prefers-reduced-motion`.
- Texto: **"Multi-theme Pro, gratis hasta el 31 de octubre"** + cuenta atrás
  ("29 días") en `tabular-nums`.
- Insignia **PRO** en `bg-accent-solid text-accent-ink`.
- Secundario: "Después: 1 tema gratis, el resto con Pro · Ver planes".

### 2. Fila de tema bloqueada (después del 31, sin Pro)
- El primer tema funciona igual. Del 2.º en adelante: la fila sigue visible y legible
  (no se oculta: ocultar es esconder valor), con un candado y la insignia **PRO**.
- Al pulsar no pasa "nada" silencioso: se abre un **popover de upgrade** anclado a la fila,
  con una mini-vista de lo que obtienes (las columnas del tema en Figma: `Core Light ·
  Core Dark · Brand B Light · …`), el precio y un CTA sólido "Desbloquear multi-theme".
- El contador de la cabecera pasa de "2 of 10" a "1 of 1 · Pro: 10".

### 3. Pantalla de checkout / licencia
- Modal de dos pasos: elegir plan (mensual / anual con ahorro destacado) → checkout del
  proveedor (ventana del proveedor) → al volver, "Pro activo" con confetti sutil (o un
  pulso del acento; respeta reduced-motion).
- Si el usuario ya pagó en otro navegador: "¿Ya tienes Pro? Pega tu clave".

### 4. Estado Pro
- Insignia **PRO** discreta junto a "File & modes" y en el menú Workspace settings; nada
  más. El usuario que paga no tiene que ver publicidad.

Antes de implementar, un mockup visual (artifact) de los 4 estados para validar.

## Arquitectura

| Pieza | Dónde | Qué hace |
|---|---|---|
| Fecha de promoción | `api/entitlement.ts` (nuevo) | Fuente única: `PROMO_ENDS_AT`; el cliente la pide, nunca la calcula |
| Webhook del proveedor | `api/billing-webhook.ts` (nuevo) | Verifica firma; guarda `{licenseKey → status, plan, renewsAt}` en Blob o KV del Marketplace |
| Entitlement | `api/entitlement.ts` | `GET ?key=` → `{ pro, promo, promoEndsAt, maxThemes }` |
| **Enforcement** | `api/tokens.ts` (POST) | Cuenta temas distintos del payload; si `> maxThemes` sin Pro → `402` con `{ reason: 'pro-required', maxThemes }` |
| Cliente | `lib/entitlement.ts` + store global (fuera de `DesignSnapshot`, como `pluginBuildSeen`) | Guarda la clave, refresca el estado, decide qué filas se bloquean |
| UI | `FigmaSyncView.tsx` | Banner, filas bloqueadas, popover, modal |
| Auto-sync | `useAutoFigmaSync` | Un `402` no reintenta en bucle: estado "Pro required" visible, una vez |
| Plugin | sin cambios obligatorios | Lee el último blob válido; opcional: mostrar "Pro" en el log |

**Regla:** el servidor decide. La UI sólo **anticipa** lo que el servidor va a contestar,
para que el usuario no se entere por un error.

## Fases

1. **Antes del 31-oct (lo mínimo para lanzar la promo):** banner + cuenta atrás +
   `api/entitlement.ts` devolviendo `promo: true` para todos. Sin cobros todavía. Mide
   cuántos usan multi-tema (evento de analytics ya existente, sin cookies).
2. **Cobro (pago único):** producto en Polar/Lemon + checkout alojado + clave de licencia + modal "pega tu clave". Sin suscripción ni portal de cliente.
3. **Enforcement:** `POST /api/tokens` devuelve `402` sin Pro pasado el corte; filas
   bloqueadas + popover; auto-sync que no entra en bucle.
4. **Más adelante, sólo si hay demanda:** suscripción para sync ilimitado, plan de equipo, magic link.

## Riesgos

- **Bloquear sólo en la UI** = cualquiera lo salta. Por eso el enforcement es en
  `api/tokens.ts` desde la fase 3.
- **Romper archivos de Figma existentes** el 1-nov: evitado porque sólo se bloquea
  re-publicar, nunca lo ya publicado.
- **Reloj del cliente** manipulable: la fecha de corte la da el servidor.
- **Auto-sync en bucle** contra un `402` (el mismo tipo de bucle que ya costó dinero con el
  MCP, ver `vercel-cost-security`): el cliente debe parar al primer `402`.
- **IVA/facturación UE**: resuelto si el proveedor es *merchant of record*.

## Validación

- Con promo activa: 5 temas publican; banner con cuenta atrás correcta.
- Pasado el corte sin Pro: 1 tema publica; el 2.º muestra candado; un POST forzado con
  3 temas devuelve `402`; el blob anterior queda intacto.
- Con Pro: 10 columnas publican; sin banner de upgrade.
- Auto-sync tras un `402`: un único estado de error, ningún reintento.
