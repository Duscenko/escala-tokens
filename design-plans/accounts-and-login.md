# Cuentas y login (Supabase Auth)

Plan, no implementación. Escrito el 2026-10-04. Nada de código hasta decidir los puntos de
"Decisiones abiertas". Complementa `pricing-and-packaging.md`, que decía "pago único vía Polar,
clave de licencia, **sin cuentas**": este plan cambia esa última parte y explica qué sigue igual.

## Qué cambia y qué no

| | Sin cuenta | Cuenta Free | Cuenta Pro |
|---|---|---|---|
| Usar el configurador y exportar | Sí | Sí | Sí |
| Guardar sistemas y themes en la nube | No | No (visible, bloqueado, "Pro") | Sí |
| Sync alojado, MCP en vivo, varios themes | No | No | Sí |
| Ver su cuenta y comprar Pro | n/a | Sí | Sí |

- **El configurador sigue funcionando sin cuenta.** Login es opcional y nunca bloquea el
  workspace (principio "no bloat" y "workspace, not wizard").
- **Free no tiene nada alojado** (decisión de coste ya tomada). Una cuenta Free guarda un email y
  un identificador: casi cero coste. Es el embudo: ve "Guardar en la nube", sabe que es Pro y
  compra ahí mismo.
- **Hoy lo único guardado es local**: `savedSystems` (persist de Zustand) y GitHub
  (`.escala/system.json`). La nube de Escala sería una tercera vía, solo Pro; no sustituye a
  GitHub, que sigue siendo la opción durable gratuita.

## Estado actual relevante (medido en el repo)

- La licencia vive en `localStorage['sd-licence-key']` (`src/lib/licence.ts`) y el cliente la manda
  en la cabecera `x-escala-license` (`figmaSync.ts`). `api/tokens.ts` la valida contra Polar
  (`api/_licence.ts`, caché de 10 min) y deja un **sello** `escalaLicence: { until }` dentro del
  blob; `licenceGate.isServable` usa ese sello para los `GET` sin pedir clave. La promo gratuita
  acaba el 2026-10-31 23:59 (Europe/Paris).
- El plugin de Figma y el MCP **no tienen sesión de usuario**: identifican el sistema por el
  `?project=esc_…` (ID minteado) y leen el blob. Eso no debe romperse.
- `api/github-oauth.ts` ya existe, pero es para **conectar un repo** (scope de repos), no para
  identidad. Son dos cosas distintas y hay que mantenerlas separadas.
- No hay cookies propias; analytics es cookieless y solo con eventos enum (`vercel-cost-security`).
  La política de privacidad y `legal.ts` lo afirman.

## Proveedor: Supabase Auth

Métodos de entrada (sin enlace mágico):

1. **GitHub** (OAuth). Scope mínimo: solo identidad (`read:user`, `user:email`). **No** pedir
   `repo`: la conexión de repos sigue siendo el flujo existente de `GitHubConnectView`.
2. **Google** (OAuth).
3. **Email + contraseña**, con confirmación de correo y "olvidé mi contraseña".

Decisiones técnicas:

- **Región UE** para el proyecto Supabase (Frankfurt o París). Dato personal de un usuario
  francés/UE; evita transferencias fuera del EEE para la base principal.
- **SPA con PKCE**: `@supabase/supabase-js` en el cliente; la sesión (JWT + refresh) la guarda
  supabase-js en `localStorage`. No hay cookie, así que el contrato "cookieless" se mantiene,
  pero hay que **reescribir esa frase** (ver Privacidad): hay almacenamiento local de sesión,
  estrictamente necesario para el servicio, no requiere banner.
- **Un solo identificador de usuario** = `auth.users.id` (uuid). El email no es clave de nada.
- **Vincular identidades por email verificado**: si alguien entra con GitHub y luego con Google
  con el mismo email verificado, es la misma cuenta (Supabase "automatic linking"). Hay que
  exigir email verificado en todos los proveedores o se abre una vía de toma de cuenta.
- **Correo transaccional**: el SMTP por defecto de Supabase tiene un límite muy bajo y no sirve
  para producción. Configurar **Resend** como SMTP propio, con SPF/DKIM/DMARC del dominio
  `escalatokens.com` (la misma gestión DNS que el apex/www ya documentado en
  `escala-domain-tls`). Remitente tipo `no-reply@escalatokens.com`; el alias de contacto de
  privacidad que pide `legal.ts` también debería vivir en el dominio.
- **Plantillas de correo** (confirmación, reset, cambio de email) en en/es/fr, igual que el
  resto de la app (`src/lib/i18n.tsx`).
- **Rate limit y CAPTCHA**: activar el rate limit de Auth y Turnstile/hCaptcha en registro y
  reset. *Nota*: el repo prohíbe Bot Protection de Vercel porque rompe plugin y MCP; esto es
  distinto, vive en Supabase y solo cubre el formulario de registro.

## Modelo de datos (Postgres, schema `public`)

```sql
-- 1:1 con auth.users. Se crea con un trigger on auth.users insert.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  locale      text check (locale in ('en','es','fr'))
);

-- La licencia ligada a la cuenta. Sustituye al localStorage como fuente de verdad.
create table public.licences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  key_hash     text not null unique,        -- sha256; la clave en claro NO se guarda
  key_enc      bytea,                        -- ver "Decisiones abiertas" #3
  polar_status text not null,                -- granted | revoked | disabled …
  expires_at   timestamptz,                  -- null = no caduca
  checked_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Sistemas guardados en la nube (solo Pro). snapshot = DesignSnapshot.
create table public.saved_systems (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  snapshot    jsonb not null,
  size_bytes  int  not null,
  version     int  not null default 1,       -- versión del store (migraciones)
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index on public.saved_systems (user_id, updated_at desc);

-- Slugs de sync publicados por esta cuenta (liga ?project=esc_… a un dueño).
create table public.published_projects (
  project_id  text primary key,              -- el esc_… minteado
  user_id     uuid not null references auth.users(id) on delete cascade,
  claimed_at  timestamptz not null default now()
);
```

- `snapshot` ya es JSON puro y versionado por `persist` (v80 hoy). Se guarda **tal cual** con su
  `version`, y al cargar pasa por el `migrate` existente. No inventar un segundo formato.
- Tope por sistema (p. ej. 2 MB, igual que `MAX_BODY_BYTES` de `api/tokens.ts`) y por cuenta
  (p. ej. 50 sistemas) para que un Pro no pueda inflar la base.
- `size_bytes` permite ver el coste real sin leer el jsonb.

### Reglas de acceso (RLS)

RLS **activado en todas las tablas**; sin política = sin acceso.

```sql
alter table public.profiles           enable row level security;
alter table public.licences           enable row level security;
alter table public.saved_systems      enable row level security;
alter table public.published_projects enable row level security;

create policy "own profile"  on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own systems read" on public.saved_systems
  for select using (user_id = auth.uid());
```

Puntos clave:

- **`licences` solo se lee, nunca se escribe desde el cliente.** Insertar/actualizar lo hace el
  servidor (service role) tras validar con Polar. Si el cliente pudiera escribir, cualquiera se
  daría Pro desde la consola del navegador.
- **`saved_systems` también se escribe por el servidor**, no por RLS directa, porque la
  condición "es Pro" no se puede expresar fiablemente en una política sin una función
  `security definer` que lea `licences`. Dos opciones (decisión abierta #4): endpoint
  `api/systems.ts` (consistente con el resto de `api/`), o política de insert con
  `exists(select 1 from licences where user_id = auth.uid() and (expires_at is null or expires_at > now()) and polar_status='granted')`.
  Recomiendo el **endpoint**: ya tenemos validación de tamaño, rate limit y `_blob.ts`; y evita
  exponer el service role al navegador.
- **El service role key nunca llega al cliente** ni a una variable `VITE_*`. Solo en env de
  Vercel para `api/`.
- Tests de RLS con dos usuarios: A no lee/modifica/borra nada de B (obligatorio antes de
  producción).

## Licencia atada a la cuenta

Flujo (reemplaza "pegar clave y guardarla en localStorage"):

1. Usuario con cuenta Free pulsa **Comprar Pro** → checkout de Polar (hoy `src/lib/polar.ts`).
   Para ayudar a casar, pasar `customer_email` y `external_customer_id = user.id` en el checkout
   cuando haya sesión; **no depender de ello** (puede comprar con otro email).
2. Polar le entrega la clave. Vuelve a Escala, **Cuenta → Activar licencia**, la pega **una vez**.
3. `POST /api/account/licence` (con el JWT de Supabase en `Authorization: Bearer`):
   - verifica el JWT (supabase `auth.getUser(token)`),
   - valida la clave contra Polar con el `checkLicenceKey` existente,
   - guarda `key_hash`, `expires_at`, estado en `licences` bajo `user_id`,
   - **una clave pertenece a una sola cuenta** (`key_hash unique`): una segunda cuenta que la
     pegue recibe error claro. Sin esto se revende una clave a N cuentas.
4. A partir de ahí, el servidor decide "es Pro" mirando `licences` por `user_id`, **no** una
   cabecera que manda el navegador. Se borra `sd-licence-key` del navegador en cuanto la cuenta
   la tenga (migración suave: si hay clave local y sesión, ofrecer "asociar a tu cuenta").
5. **Revalidación**: la caducidad (12 meses de sync/MCP/updates) y las revocaciones/reembolsos de
   Polar deben reflejarse. Opciones: revalidar al usar (caché 10 min, como hoy) y/o webhook de
   Polar → `api/polar-webhook.ts` que actualiza `licences.polar_status`. Recomiendo webhook
   (verificando la firma) **además** de la revalidación perezosa.
6. **Cerrar el riesgo de la clave en el navegador**: la clave en claro no vuelve a viajar después
   de la activación. Guardar solo su hash (y, si se necesita revalidar contra Polar sin pedirla
   otra vez, cifrada; ver decisión #3).

### Lo que NO se rompe: plugin de Figma y MCP

- Siguen leyendo/escribiendo por `?project=esc_…` + el sello `escalaLicence` del blob. Un plugin
  no puede hacer login de usuario.
- Lo que cambia es **quién puede publicar** (`POST /api/tokens`): hoy es "origin + claim por slug
  + clave en cabecera". Con cuentas: "origin + claim + **JWT de una cuenta Pro**", y el
  `published_projects` liga el `esc_…` a esa cuenta. Se mantiene un periodo de compatibilidad con
  la cabecera `x-escala-license` (clientes viejos) y luego se retira.
- El sello del blob se genera con la caducidad de `licences.expires_at`, igual que hoy con la
  clave; `licenceGate.isServable` no cambia.
- **Qué pasa si la licencia caduca**: se conserva la cuenta y los `saved_systems` en solo
  lectura/exportación durante un plazo (decisión #5); no se borra nada de golpe.

## UI

- **Barra superior (`TopNav`)**: `Log in` junto a Export (patrón Create UI). Con sesión, un
  avatar/inicial con menú: Cuenta · Licencia · Cerrar sesión. Aplica la regla del repo: el
  acento de la plataforma es el violeta de Escala, no el del theme; usar `--accent-solid` /
  `--accent-ink`, nada de `text-white` fijo.
- **Modal de login** (no una ruta a pantalla completa): GitHub · Google · email/contraseña,
  "Olvidé mi contraseña", enlace a Privacy/Terms. Estados de error accesibles, foco atrapado,
  `Esc` cierra. Dark por defecto, solo desktop (regla de plataforma); el contenido de cuenta no
  entra en `DesktopOnlyNotice`.
- **Vista de Cuenta** (nuevo `exportMode`/ruta, como `SaveView`): email y método de entrada,
  plan (Free/Pro, caducidad), **Activar licencia**, **Comprar Pro** (precio de
  `entitlementAt`: $59→$79 el 16 nov), mis sistemas en la nube (Pro), **Exportar mis datos** y
  **Eliminar cuenta**.
- **Free con cuenta**: ve **"Guardar en la nube · Pro"** en `SaveSidePanel`/Kits y en el wizard de
  Export (paso 3, card de snapshot). Fila bloqueada con candado + popover que lleva a comprar,
  **nunca escondida** (regla ya fijada en pricing, punto 8).
- Sin cuenta: `Guardar en la nube` abre el login y, tras entrar, muestra el estado Free.
- **i18n** en/es/fr desde el inicio (claves = frases en inglés, ver `i18n-key-conventions`).
- **Analytics** (enum, sin texto libre): `login_opened`, `login_succeeded{provider}`,
  `licence_activated`, `upgrade_clicked`. Nunca el email ni el id.

## Seguridad

- Verificar el JWT en cada endpoint de `api/` que use la cuenta; no confiar en un `user_id` del
  body.
- Los endpoints nuevos de `api/` pasan por `originAllowed` + `rateLimited` (como `license.ts`);
  añadir regla de Firewall para `/api/account/*`, `/api/systems` y `/api/polar-webhook` (la
  recomendación pendiente para `/api/license` sigue en pie).
- Redirect URLs de OAuth en Supabase: lista cerrada (`escalatokens.com`, `www`, localhost de dev).
  Es la clave de **apex vs www** (`escala-domain-tls`): registrar ambos o el callback falla.
- `jsonb` de usuario = no confiable: se valida con tope de tamaño y se pasa por `migrate`;
  nunca se `eval`a ni se inserta como HTML (los SVG de `customIcons` ya pasan por
  `sanitizeSvg`).
- Webhook de Polar: verificar firma, idempotente, responde 2xx rápido.
- Borrado de cuenta: cascada por `on delete cascade`; también limpiar `published_projects` y el
  sello de los blobs asociados.

## Coste y operación

Cifras de memoria; **verificar en las páginas de precios antes de contratar**:

- Supabase **capa gratuita** al empezar. Dos motivos para pasar a **Pro (~25 USD/mes)** en cuanto
  haya clientes que pagan: (1) la capa gratuita **pausa** el proyecto tras días de inactividad
  (el MCP ya se pausó una vez en Vercel; una base con los sistemas de quien pagó no puede
  pausarse), (2) sin **copias de seguridad** automáticas no es responsable guardar datos de
  clientes de pago.
- Resend: capa gratuita al principio; escalar solo si se supera.
- Disparador concreto: **pasar a Pro de Supabase antes de que `licences` o `saved_systems`
  contengan datos de un cliente que pagó.** Es decir, antes de activar la primera licencia real.
- Presupuesto de Vercel: los endpoints nuevos suman invocaciones; mantener el tope de $20 y la
  regla de rate limit existente.
- Monitorizar el crecimiento de `saved_systems.size_bytes` (límite de DB de la capa que toque).

## Privacidad y legal (RGPD, Francia/CNIL)

Hoy el sitio afirma: sin cuentas, sin cookies, sin datos personales salvo el formulario de
contacto. Esto deja de ser cierto y hay que actualizarlo **antes** de abrir el login:

- **Nuevos datos personales**: email, identificador de proveedor (GitHub/Google), hash de
  contraseña (lo gestiona Supabase), IP en logs de auth, clave de licencia (hash), contenido
  de sistemas guardados.
- **Base legal**: ejecución del contrato (cuenta y servicio) para casi todo; interés legítimo
  para seguridad/antifraude. Sin marketing salvo consentimiento explícito aparte.
- **Encargados del tratamiento nuevos** en `LEGAL` / Privacy: Supabase (UE), Resend (envío de
  correo; revisar ubicación y DPA), Polar (ya es Merchant of Record, ya procesa el pago),
  GitHub/Google como proveedores de identidad. Firmar/aceptar el **DPA** de cada uno.
- **Almacenamiento local de sesión**: reescribir "sin cookies" a "sin cookies de seguimiento;
  la sesión usa almacenamiento local estrictamente necesario". Estrictamente necesario ⇒ sin
  banner de consentimiento; **no** añadir nada de tracking ahí (el contrato de analytics sigue).
- **Derechos**: acceso/portabilidad (botón "Exportar mis datos" → JSON), rectificación,
  **supresión** (botón "Eliminar cuenta", ya existe el tema `delete` en el formulario de
  contacto como alternativa), plazo de respuesta de 1 mes.
- **Conservación**: definir plazos (cuenta activa; tras eliminar, borrado inmediato salvo
  facturas, que guarda Polar como MoR). Logs de auth: lo que dicte Supabase.
- **Editor profesional**: al cobrar, `legal.ts` pide `siret` y `address` (domiciliación). El
  login y la compra hacen urgente rellenarlos; ya estaba previsto en ese archivo.
- **Términos de uso/venta** y reembolso (14 días) siguen siendo bloqueantes de
  `pricing-and-packaging.md` (punto 6); la cuenta añade una cláusula de uso aceptable y de
  qué pasa al caducar.
- Subir `LEGAL.updated`, traducir en/es/fr, y la sección "Legal & data" de About (que refleja
  este contrato).

## Actualización 2026-10-04: free tier y consistencia legal

### Supabase gratis: factible para 100–200 cuentas
Cifras de memoria, verificar antes de decidir: 50.000 usuarios activos/mes, 500 MB de base, 5 GB
de transferencia. Con 200 cuentas y pocos sistemas guardados (solo Pro) sobra por órdenes de
magnitud. Lo que sí muerde en free no es el tamaño:
1. **Pausa por inactividad** (~7 días sin actividad). Mitigación: un cron de Vercel que haga una
   consulta trivial cada pocos días (`api/keepalive.ts`), y que no cuente como dato personal.
2. **Sin backups automáticos.** Mitigación: `pg_dump` semanal desde un GitHub Action a un sitio
   privado cifrado. Solo hace falta para datos de pago: con la regla "Free no guarda nada", antes
   de la primera licencia real se pasa a Pro (~25 USD/mes) o se mantiene este dump.
3. SMTP propio (Resend) igualmente: el correo por defecto de Supabase no sirve ni para 200 cuentas.

Recomendación: empezar en free, con keepalive, y pasar a Pro al activar la primera licencia.

### Consistencia MIT / términos (auditado en el repo)
Estado actual, correcto: `LICENSE` MIT y `package.json` MIT en este repo (configurador, CLI, MCP);
plugin `UNLICENSED` propietario; README, FAQ de /pricing y Legal ya dicen "MIT salvo el plugin".

Lo que el login ROMPERÍA si no se corrige a la vez:
- **No existe página de Términos** (solo Legal y Privacy). Hace falta una única fuente que separe
  cuatro cosas: (1) el código = MIT, haz fork y aloja el tuyo; (2) el **servicio alojado**
  (cuenta, nube, sync, MCP) = Términos de servicio; (3) el plugin = licencia propietaria;
  (4) tus sistemas y tokens = tuyos, sin atribución.
- `README.md` y `SECURITY.md` dicen "no accounts, claim-on-first-publish": hay que reescribirlos.
- Legal y Privacy dicen "sin cuentas / sin cookies" (en en/es/fr).
- `NOTICE`: añadir `@supabase/supabase-js` (MIT) y lo que traiga.
- El SQL, las políticas RLS y el cliente van en el repo público (MIT). **Ningún secreto**: URL y
  anon key son públicas por diseño; el service role solo en Vercel.
- Regla de redacción: la licencia MIT cubre el CÓDIGO, nunca el servicio. Quien aloja su propio
  configurador no recibe cuenta, nube ni Pro de escalatokens.com; los Términos lo dicen.
- Una sola fuente de verdad para esos textos (`src/lib/legal.ts`), como ya hace con el editor.

## Fases

1. **Decidir** los puntos abiertos (abajo). Crear proyecto Supabase (región UE), dominios,
   Resend + DNS. Sin código en el repo todavía.
2. **Auth mínima**: cliente supabase-js, modal de login, sesión, `TopNav`, vista de Cuenta vacía.
   Sin Pro. Se puede desplegar: el producto sigue igual para quien no entre.
3. **Licencia por cuenta**: tablas `profiles`/`licences`, `api/account/licence`, migración de la
   clave de localStorage, webhook de Polar, `api/tokens.ts` acepta JWT.
   **Aquí hay que estar ya en Supabase Pro.**
4. **Nube Pro**: `saved_systems` + `api/systems`, UI de "Guardar en la nube", estados Free
   bloqueado, cuota.
5. **Legal y privacidad** (puede ir en paralelo desde la fase 2, **debe** estar antes de abrir
   el registro al público).
6. **Retirar** la cabecera `x-escala-license` y el `sd-licence-key` tras un periodo de gracia.

Cada fase con tests: RLS con dos usuarios, `interpretValidation` y `licenceGate` (ya
existen), webhook con firmas válidas/inválidas, y el e2e de "Free ve el candado, Pro guarda y
recarga".

## Decisiones abiertas

1. **¿Se permite login con GitHub solo para identidad** (recomendado) o se unifica con la
   conexión de repos existente? Unificar mezcla scopes y permisos; separar cuesta un clic más.
2. **Login obligatorio para algo** o siempre opcional. Propuesta: opcional; solo la nube Pro y la
   licencia lo exigen.
3. **¿Guardar la clave de licencia cifrada o solo su hash?** Solo hash es lo más seguro pero
   obliga a que el usuario la pegue otra vez para revalidar si falla el webhook. Con el webhook
   y la caducidad de `licences.expires_at` suele bastar el hash.
4. **Endpoint `api/systems` vs RLS directa** para guardar sistemas (recomendado: endpoint).
5. **¿Qué ocurre al caducar o reembolsar?** Propuesta: sistemas en solo lectura + exportar 90
   días, luego aviso por correo y borrado si no se renueva. Hay que fijarlo en los Términos.
6. **Una licencia por cuenta o varias** (un usuario que compra para dos personas). Propuesta:
   una clave = una cuenta; "Teams" sigue fuera de alcance.
7. **Migración de quienes ya tienen clave en localStorage** el 31 oct: ¿asociación automática al
   primer login o paso explícito? Propuesta: banner "Asocia tu licencia a una cuenta".
8. **Dónde empieza el coste**: confirmar que el disparador "Supabase Pro antes de la primera
   licencia real" cabe en el calendario de `pricing-launch-dates` (promo hasta el 31 oct,
   ventas el 1 nov).
9. **Resend y SPF/DKIM**: ¿quién toca el DNS del dominio? Hay que coordinarlo con el apex/www.

## Riesgos

- **Toma de cuenta** por vincular identidades sin email verificado (mitigación: exigirlo).
- **Reventa de clave** a varias cuentas (mitigación: `key_hash unique`, una cuenta por clave).
- **Pérdida de acceso** de plugins si el cambio de `api/tokens.ts` rompe el claim existente
  (mitigación: compatibilidad con cabecera + claim por slug durante la transición, test con el
  plugin real).
- **Proyecto Supabase pausado** (capa gratuita) con datos de pago (mitigación: Pro antes).
- **Promesa de privacidad desfasada** si se despliega el login antes de actualizar Privacy
  (mitigación: fase 5 antes de abrir registro; el texto actual sería falso).
- **Corte del 31 oct**: el login no debe retrasar ni complicar el enforcement ya hecho; las
  fases 2–4 son aditivas y el sello del blob se mantiene.

## Checklist legal al lanzar el login (2026-10-04)

Hecho: página `/terms` (en/es/fr), enlaces en footer y Aviso legal, sitemap, README. Las cláusulas
de cuenta existen pero están apagadas tras `ACCOUNTS_LIVE` (`src/lib/legal.ts`).

Al activar el login, **en el mismo cambio**:
- [ ] `ACCOUNTS_LIVE = true` y subir `LEGAL.updated`.
- [ ] Reescribir "no accounts" en `SECURITY.md`, el copy de About → Legal & data y la clave i18n
      "your system is stored in your own browser… there are no accounts…" (en/es/fr).
- [ ] Aviso legal y Privacy: la sesión de cuenta sigue en `localStorage` (la cláusula de cuenta
      ya lo dice). Hay una cookie HttpOnly `sd_licence` para la clave Pro; no es de seguimiento.
- [ ] `NOTICE`: `@supabase/supabase-js`.
- [ ] Rellenar `siret` y `address` en `LEGAL` si ya se cobra como actividad profesional.
- [ ] Revisión por alguien con criterio legal de `/terms` (límite de responsabilidad, 12 meses de
      servicio, reembolso 14 días, derecho de desistimiento en contenido digital).
