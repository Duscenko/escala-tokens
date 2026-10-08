# Pricing y empaquetado: Free / Design / Complete

Plan y auditoría, no implementación. Escrito el 2026-10-03. Sustituye la parte de
"qué se vende" de `multitheme-subscription.md` (allí siguen valiendo la arquitectura de
licencia, la promo y el enforcement en `api/tokens.ts`).

## Decisiones ya tomadas

- **Actualizado el 2026-10-04:** `escala-tokens` (configurador), el CLI y el servidor MCP siguen
  **públicos y MIT**. `escala-figma-plugin` pasó a **privado y propietario** ("todos los derechos
  reservados", `UNLICENSED`): es la parte que se vende con Pro. Lo publicado antes en GitHub bajo
  MIT sigue siendo MIT para quien ya lo clonó; esto protege lo que venga a partir de ahora. El
  plugin compilado se sigue distribuyendo (zip en escalatokens.com y Figma Community), así que su
  JavaScript es legible: privado oculta la fuente y el historial, no el binario. El README y la
  FAQ de `/pricing` (en/es/fr) ya lo dicen así.
- **Pago único** vía Polar (Merchant of Record), clave de licencia, sin cuentas.
- **Free no tiene nada alojado**: se descarga el `tokens.json` y se carga a mano en el plugin.
  El sync alojado y el MCP en vivo son de pago, porque son lo que cuesta dinero (Live Sync
  hace un `GET` cada 10 s por plugin abierto; el MCP ya pausó el proyecto una vez).
- **Multi-tema sigue siendo el gancho**: Free = 1 tema, pago = hasta 10.
- **Modos de plataforma** (Desktop · Tablet · Mobile) son de pago.
- **Teams no aparece** en la tabla por ahora.

## El referente: Create UI (createui.co/pricing, leído 2026-10-03)

- Cuatro columnas: **Free Code $0 · Design $99 · Code $199 · Complete $249**, todas con
  "50 % OFF · LIMITED TIME" (precio tachado al doble). Pestaña aparte Individual / Teams.
- "Pay once. Use forever." Actualizaciones futuras incluidas. Un seat por compra.
- **Divide por PERSONA, no por uso**: el diseñador compra Figma, el dev compra código, quien
  hace ambas cosas compra Complete. Free es para devs (componentes React del core).
- Tabla agrupada en bloques: Access · Design · Development · AI Native · Customization ·
  License & Support. Free recibe "Basic" en docs y AI context (Design.md); MCP y Skill solo
  en pago.
- Bajo la tabla: cifras grandes (18.500 variantes, 950 variables, 3.200 iconos, 20 temas),
  testimonios y un FAQ (pago único o suscripción, updates, uso en proyectos de clientes,
  probar antes de comprar, Teams).

**Qué copiar:** la división por persona, los bloques de la tabla, "pago único + updates", el
FAQ y las cifras. **Qué no copiar:** el "50 % OFF" permanente (un precio tachado que nunca
sube es un patrón engañoso; y la normativa francesa/UE de precios de referencia exige que el
precio tachado sea uno que se cobró de verdad). Nuestra promo tiene fecha real: úsala.

**Diferencia de posicionamiento:** Create UI vende *su* sistema con 20 temas. Escala genera
*tu* sistema. La página de pricing tiene que abrir con eso, no con "tantos componentes".

## Inventario real de Escala (medido en el repo)

| Activo | Estado |
|---|---|
| Configurador (todas las foundations, temas ilimitados) | hecho, MIT |
| Exports: `tokens.json`, CSS, W3C, Tailwind, Markdown | hecho, MIT |
| Catálogo de componentes | **58 claves** en `componentCatalogue.ts` con specimen y snippet (CLAUDE.md dice 59: está desfasado) |
| Componentes en Figma | los construye el plugin (MIT) a partir de `atoms` del payload |
| System Styles (temas prediseñados) | **12** en `themePresets.ts` |
| Modos de plataforma | Desktop · Tablet · Mobile (`figmaViewports`, plugin 0.3.2) |
| MCP en vivo | 6 herramientas, lee el Blob publicado |
| Skill zip offline + CLI `@escala/cli` | hecho; la CLI **no está en npm** |
| **Librería de código (React) con los tokens de Escala** | **en construcción, fuera de este repo** |
| Pago, licencia, entitlement, `/pricing` | **nada construido** |

## Dos productos, no uno (aclarado el 2026-10-03)

> **Escala** es un **generador de tokens y variables con arquitectura agnóstica**. La
> **librería** (Figma ahora, código después) es **otro recurso**: una librería profesional
> **conectada a los tokens que Escala genera**. Se venden por separado y se complementan.

Esto corrige la tabla anterior, que mezclaba ambos y obligaba a decidir qué parte del plugin
era "gratis" para no competir con el archivo de Figma de pago. Con dos productos esa tensión
desaparece: el plugin y sus componentes generados son parte del **generador** (andamiaje que
ya consume tus variables); la **librería** es el producto pulido por encima.

La conexión es el gancho de venta cruzada: la librería lee las variables de Escala, así que
cambia de marca, de tema o de plataforma sin tocar un componente. Un usuario Free de Escala
puede usarla con 1 tema; para varios temas o modos de plataforma necesita Escala Pro.

### Producto 1: Escala (generador)

| | **Free** | **Pro** (pago único) |
|---|---|---|
| Configurador web, temas ilimitados al editar | ✓ | ✓ |
| Exports de código (CSS, W3C, Tailwind, MD), GitHub, CLI | ✓ | ✓ |
| Plugin de Figma (open source), carga manual del `tokens.json` | ✓ | ✓ |
| Skill zip / contexto offline para agentes | ✓ | ✓ |
| Documentación generada (páginas de doc en Figma, README del sistema) | — | ✓ |
| Temas en Figma | **1** (Light + Dark) | **hasta 10** |
| Modos de plataforma (Desktop · Tablet · Mobile) | solo Desktop | ✓ los 3 |
| Sync automático alojado (Live Sync + auto-publish) | — | ✓ |
| MCP en vivo contra tu sistema publicado | — | ✓ |
| System Styles prediseñados (los 12) | ✓ | ✓ |
| Sync alojado, MCP y actualizaciones | — | **12 meses** incluidos |
| Soporte | comunidad (GitHub) | email |

### Producto 2: Escala Library (librería conectada a los tokens)

Se vende aparte. Dos entregas, la segunda cuando exista:

| | **Library · Figma** | **Library · Code** (próximamente) |
|---|---|---|
| Qué es | archivo de Figma profesional (auto layout, variantes, guías de uso, bloques y plantillas) enlazado a las variables de Escala | librería React con las mismas variables como CSS vars |
| Requiere | Escala (Free o Pro) | Escala (Free o Pro) |
| Se distribuye | descarga con clave de licencia (Polar) | registry privado con clave de licencia |
| Licencia | de uso, una persona | de uso, una persona |

Un **bundle "Complete"** (Escala Pro + Library Figma + Library Code) aparece cuando la parte de
código exista. Hasta entonces la columna Complete se muestra como "próximamente".

Por qué este reparto funciona:

- **El generador gana por sí solo** (sync, multi-tema, MCP) sin depender de la librería.
- **La librería no compite con el plugin**: el plugin genera andamiaje; la librería es el
  trabajo de diseño pulido. Quien compra la librería sigue necesitando los tokens.
- **Cada producto tiene su público**: el que quiere un sistema propio (Escala) y el que quiere
  componentes ya hechos que sigan su sistema (Library).

Notas de las tablas:

- **"Hasta 10" son temas, no columnas.** Hoy `FIGMA_SYNC_MODE_CAP = 10` cuenta *columnas*
  (tema × apariencia). Para vender 10 temas con Light + Dark el tope tiene que pasar a 20, y
  el límite de Figma por plan (Starter 1 modo por colección, Professional 4) recorta antes que
  nosotros: decirlo en el FAQ.
- **Solo Desktop en Free** encaja con Figma Starter (1 modo por colección).
- **Las cifras de la cabecera** deben ser medidas: 58 componentes, 12 estilos, N variables
  (contarlas desde `generateTokenJSON()`), N variantes (sumar los ejes de `COMPONENTS`). Las
  de la librería de Figma salen de su propio archivo, no del catálogo.

## Auditoría: dónde un límite es duro y dónde es blando

Este es el hallazgo principal. Con el configurador en MIT, **solo es límite duro lo que corre en
el servidor o lo que se distribuye fuera de los repos públicos.** Desde el 2026-10-04 el plugin
ya no es uno de esos repos públicos (ver Decisiones).

| Límite | Dónde se aplica | Tipo |
|---|---|---|
| Sync alojado, temas sincronizados, MCP en vivo | `api/tokens.ts`, `api/mcp.ts` | **duro** |
| Library (Figma y código) | distribución privada con clave de licencia | **duro** |
| 1 tema / solo Desktop en la carga manual | wizard de Export (Escala JSON) | **blando**: se quita editando el JSON o con un fork del configurador (MIT). Ya no con un fork del plugin, que es privado |
| System Styles en Free | configurador | **blando** |

Los límites blandos están bien como empujón: un usuario normal no hace fork para ahorrarse la
compra, y quien lo hace no era cliente. Pero **el valor que justifica el precio tiene que estar
en el lado duro**: sync alojado y MCP en vivo (Escala Pro) y la Library (archivo de Figma y código).

## Lo que falta (por prioridad)

### Bloqueante para cobrar
1. **Cuenta en Polar** y comprobar que paga a un auto-entrepreneur francés (pendiente del plan
   anterior).
2. **Licencia comercial (EULA) para la Library.** Si vive en un repo MIT público, es gratis
   por definición. El archivo de Figma y el código van fuera de los repos públicos, con licencia
   comercial. Es lo único cerrado, y está bien porque es material nuevo.
3. **Canal de distribución de la Library**: Figma por descarga con clave (Polar); código por registry privado tipo shadcn (`/r/{name}`
   con la clave de licencia en la cabecera) o npm privado. Recomiendo el registry: ya usáis
   `components.json` y es como lo hacen Create UI y Magic UI.
4. **`api/entitlement.ts` + validación de la clave contra Polar**, y `402` en
   `POST /api/tokens` y `/api/mcp` sin licencia pasado el corte.
5. **`GET /api/tokens` también devuelve `402`** para slugs sin licencia después del corte; si
   no, los plugins de la promo siguen haciendo un `GET` cada 10 s sin pagar.
6. **Términos de venta, reembolso (14 días) y página Legal** actualizada (Polar procesa el
   pago; nada de cookies nuevas, ver el contrato de analytics).

### Producto
7. **Ruta `/pricing`** (pública, compartible, legible en móvil, como `/about`): hero con el
   posicionamiento, tabla, cuenta atrás de la promo, cifras medidas y FAQ. Entradas: banner de
   File & modes, popover de fila bloqueada, About y footer. No es una quinta pestaña.
8. **Límites blandos en el wizard**: Escala JSON con 1 tema y solo Desktop cuando no hay
   licencia. Mostrar el candado + popover, nunca esconder la fila.
9. **Los 4 estados de UI** del plan anterior (banner promo, fila bloqueada, licencia, activo).
10. **Subir `FIGMA_SYNC_MODE_CAP` a 20** si se venden 10 temas.
11. **Publicar `@escala/cli` en npm**: Library · Code prometerá instalación por CLI y hoy no existe
    fuera del repo.

### Medición
12. Eventos de analytics (enum, sin texto libre): vista de `/pricing`, clic en upgrade, licencia
    activada. La meta sigue siendo 10–20 ventas para validar.
13. Contar variables y variantes reales para las cifras de la página.

## Precio (decidido el 2026-10-03)

| Fechas | Escala Pro |
|---|---|
| hasta el 7-oct 23:59 (París) | gratis para todos (promo) — **cerrada el 8-oct** |
| 8-oct – 15-nov | **$45** (techo barato de los primeros meses) |
| desde el 16-nov | **$69** |

- **USD**, pago único, 12 meses de sync/MCP/actualizaciones incluidos.
- **Actualizado el 2026-10-08.** El techo de los primeros meses es más barato a propósito
  ($45, luego $69). Si el producto crece, el precio sube; no es una rebaja sobre $79.
- **En Polar es el PRECIO BASE, no un descuento**: $45 hasta el 15-nov (ya puesto en Polar),
  se edita a $69 el 16-nov. Se comunica como un precio que SUBE en una fecha, nunca tachado.
- **Sin Black Friday para Pro este año**: caería 12 días después del lanzamiento (castiga a
  quien compró) y su precio de referencia legal sería $59.
- **Cupón LATAM desde el 16-nov**: 25 % sobre $79 = $59, repartido en comunidades. Nada de
  cupones durante el lanzamiento (no se apilan con $59).
- Fuente única en el código: `src/lib/entitlement.ts` (`PRO_LAUNCH_PRICE_USD`,
  `PRO_PRICE_USD`, `PRO_LAUNCH_ENDS_AT`); `/pricing` cambia sola de $59 a $79.
- Library · Figma y Complete: a decidir.

## Decidido el 2026-10-03

- **Complete en "próximamente"** hasta que la parte de código esté lista.
- **Dos productos**: Escala (generador de tokens/variables, arquitectura agnóstica) y Escala
  Library (Figma ahora, código después), conectada a los tokens que Escala genera.
- **La Library de Figma ya existe** como archivo aparte; la de código está por hacer.

## Estado de la implementación (2026-10-03)

| Pieza | Estado |
|---|---|
| Producto, beneficio de licencia (prefijo ESCALA, 1 año) y enlace de pago en Polar | hecho (a mano en el panel) |
| `/pricing`, promo, precio $59→$79 | hecho |
| `api/license.ts` + `lib/licence.ts` (clave en localStorage, validación vía Polar sin API key) | hecho |
| Modal de pegar clave + estado "Pro activo" en File & modes | hecho |
| **Bloqueo en servidor desde el 1-nov**: `POST /api/tokens` exige clave válida; `GET /api/tokens` y MCP solo sirven blobs con sello de licencia vigente | hecho (`lib/licenceGate.ts`, `api/_licence.ts`, 15 tests) |
| Auto-sync no reintenta tras un 402 | hecho |
| Límite blando de 1 tema + solo Desktop en el JSON para Figma sin Pro (Export wizard › Figma, y Save › tokens.json) | hecho (`lib/freeFigmaScope.ts`; solo la carga a Figma, no CSS/W3C/AI/GitHub) |
| Plugin: mensaje del 402 | hecho sin tocar el plugin: ya imprime `HTTP 402 — <error del servidor>` |
| Account Review de Polar | **aprobado** (producto en el catálogo) |
| Plugin: pausar el polling de Live Sync tras un 402 | opcional. Cada poll de un plugin viejo sigue costando una lectura de blob aunque responda 402; un plugin nuevo podría parar al primer 402 |
| Producto de renovación (la clave caduca a los 12 meses) | pendiente, antes de oct-2027 |

**Decisión (2026-10-03): Free no tiene sync alojado.** Sin clave válida, `POST /api/tokens`
da 402; los blobs publicados durante la promo dejan de servirse el 1-nov hasta que su dueño
vuelva a publicar con clave. Esto sustituye al estado 2 del mockup ("primera fila libre, el
resto con candado"): en su lugar la pantalla de sync muestra "Hosted sync is part of Escala
Pro" con *I have a key* / *See pricing*. El plugin y lo ya importado en Figma siguen
funcionando; solo se detiene el sync alojado.

**El sello de licencia** (`escalaLicence: { until }`) lo escribe SOLO el servidor dentro del
blob al publicar con clave. Se borra cualquier sello que venga del cliente (si no, un POST
durante la promo se declararía "licenciado para siempre") y se quita antes de servir.

## Decidido el 2026-10-03 (segunda ronda)

- **Free no incluye la documentación generada** (páginas de documentación en Figma, README
  del sistema). Es de pago. Ojo: el plugin MIT construye esas páginas desde el payload, así que
  en la carga manual es un límite blando, como los temas.
- **No se ofrece "uso comercial / trabajo para clientes" como característica** ni hay FAQ
  sobre ello: el autor es una sola persona y no quiere compromisos con agencias. (El código
  sigue siendo MIT, lo que eso permite no cambia; simplemente no se vende ni se promete.)
- **Precios en USD.**
- **Diseños del mockup aprobados** (lienzo "Escala pricing & paywall").

## Qué incluye el pago único: 12 meses de servicio, el resto para siempre

Todo lo que corre en tu máquina es tuyo para siempre; lo que corre en tu servidor se incluye
12 meses.

| | Después de 12 meses |
|---|---|
| Configurador, exports, plugin, carga manual, lo ya sincronizado en Figma | siguen funcionando |
| Temas (hasta 10) y modos de plataforma en la carga manual | siguen (límite blando) |
| Sync alojado, MCP en vivo | se detienen salvo renovación |
| Actualizaciones del plugin y de la Library | las versiones ya descargadas son tuyas; las nuevas requieren renovación |

- **Por qué 12 meses y no de por vida:** el sync cuesta cada mes (poll cada 10 s por plugin,
  el MCP ya pausó el proyecto una vez) y un pago único no cubre un coste sin fin. Y avanza
  rápido: es honesto vender un año de producto vivo.
- **Renovación opcional y más barata** (hipótesis: $29/año, a validar). Nada se rompe si no
  renuevas: vuelves al nivel Free, con tus archivos intactos.
- **El texto de venta lo dice con todas las letras**: "Pago único. Incluye 12 meses de sync,
  MCP y actualizaciones." Nunca "para siempre" a secas: en Francia/UE la duración tiene que
  estar clara antes de pagar. No copiar el "Pay once. Use forever" de Create UI, que es
  válido para ellos porque su producto es un archivo, no un servicio alojado.
- **Implementación:** la clave de licencia de Polar lleva fecha de caducidad (comprobar en su
  documentación que lo soporta antes de decidir); `api/entitlement.ts` la lee, y el cliente
  muestra "caduca el …" con aviso 30 días antes.
- **Meta de validación (10–20 ventas)** pasa a medirse también en renovaciones al mes 12.

## System Styles en Free: los 12

Hay 12 (Core, Cupertino/Glass, Material, Nature, Retro, Neo-Brutalism, Editorial, Terminal,
Enterprise, Playful, Luxury, Swiss). Recomiendo **dejarlos todos en Free**:

- **El muro ya está en otro sitio.** Free envía 1 tema a Figma. Limitar también los estilos
  es un segundo muro sobre lo mismo y deja a la gente "a medias" justo en lo más vistoso.
- **Los estilos son la demo del producto.** Probar Neo-Brutalism o Terminal en vivo es lo que
  convence de que el generador vale. Capar a 1 quita el motivo para quedarse.
- **Coste cero para ti:** corren en el navegador.
- **Pro sigue teniendo algo claro**: usar varios a la vez (hasta 10 temas), los 3 modos de
  plataforma, el sync y el MCP.

Alternativa si quisieras una fila más en Pro: 6 en Free y 12 en Pro. No la recomiendo: son 12
en total, y 6 de 12 se nota como recorte, no como valor extra.

## Qué hacer con el código de componentes que ya está a la vista

Hoy hay tres cosas públicas y MIT, y ninguna es la librería de pago:

| Qué | Dónde | Qué es en realidad |
|---|---|---|
| Snippets de uso (`<Button color="brand" …>`) | `snippetFor()` en `docs/specimens.tsx`, mostrados en Components | **documentación de una API**, no implementación. Importan de `@/components/ui/<x>`, que hoy no existe en ningún sitio |
| Specimens (renderers de preview) | `docs/specimens.tsx` (~3.000 líneas) | dibujan el preview con estilos inline desde `PreviewTokens`; no son componentes de producción (sin API tipada, sin Tailwind/Radix) |
| Componentes en Figma generados | `code.ts` del plugin | stubs con variantes, construidos por código |

Recomendación:

1. **No retirar nada.** Lo publicado bajo MIT no se puede recuperar, y no hace falta.
2. **Los snippets se quedan públicos: son la documentación de la librería de pago.** Es el
   modelo de Create UI y shadcn: la doc y la API se ven, la implementación se compra. Un
   snippet sin el componente no sirve de nada. Cuando la librería exista, `snippetFor()` tiene
   que reflejar su API real (props, nombres, ruta de import); hoy describe una API que nadie
   ha escrito.
3. **La librería de código se escribe nueva, en un repo privado**, no se extrae de
   `specimens.tsx`. Como autor puedes licenciar comercialmente tu propio código nuevo; lo que
   ya es MIT sigue siéndolo. Escribirla aparte evita la confusión de "esto ya estaba en el repo
   público".
4. **El plugin no compite con la Library.** El plugin genera andamiaje (stubs de variantes
   enlazados a tus variables) como parte del generador; la Library de Figma es el trabajo
   profesional por encima. Por eso el plugin no necesita capar sus componentes.
5. **El archivo de Figma se distribuye fuera del repo** (descarga desde Polar o enlace de
   Figma Community de pago), así que es un límite duro sin tocar nada del código MIT.

## Decisiones que te tocan

1. ~~Sync de por vida o 1 año~~ **Decidido: 12 meses** (ver "Qué incluye el pago único").
2. ~~System Styles en Free~~ **Decidido: los 12 en Free** (ver abajo).
3. ¿Library · Figma se vende desde el lanzamiento junto a Escala Pro, o después? Si el archivo
   ya está listo, venderlo desde el día uno da el segundo producto sin esperar al código.
4. ¿La Library de Figma funciona con Escala Free (1 tema) o exige Pro? Recomiendo que funcione
   con Free: baja la barrera de entrada y el tema/modo extra empuja a Pro.
5. Precio de Library · Figma (necesito ver el archivo o su alcance).
6. Nombre: "Escala Library", "Escala UI" u otro.

## Recordatorios con fecha

| Cuándo | Qué | Quién |
|---|---|---|
| **Antes del 31-oct** | **Compra de prueba real** en Polar (y reembólsala): comprobar que la clave llega por correo, que se activa en la app y que publicar con ella funciona. Todo lo anterior se probó con Polar simulado | tú |
| Antes del 31-oct | Abrir `https://www.escalatokens.com/api/entitlement` ya desplegado y ver que `now` es la hora del servidor | tú |
| Antes del 31-oct | Regla de Firewall de Vercel para `/api/license` (ver "Vulnerabilidades"): el límite en memoria no basta en serverless | tú |
| 24-oct | Mensaje: "queda una semana gratis" | tú |
| **31-oct 23:59 (París)** | Termina la promo. Es automático: desde ese segundo `POST`/`GET /api/tokens` y el MCP exigen licencia | automático |
| 1-nov | Se abren las ventas a $59: el botón "Get Pro" de `/pricing` pasa solo al checkout de Polar. Mensaje de apertura | tú |
| 13-nov | Mensaje: "quedan 2 días a $59" | tú |
| **16-nov** | **Cambiar el precio del producto en Polar de `45.00` a `69.00`.** La web cambia sola, Polar NO. Si se olvida, la web dice $69 y el checkout cobra $45: un desajuste de precio anunciado/cobrado | **tú, manual** |
| 16-nov | Empieza el cupón LATAM (25 % sobre $79 = $59), solo repartido en comunidades | tú |
| **Sep-2027** | **Crear el producto "Escala Pro · renovación"** en Polar. Las primeras claves (compradas el 1-nov-2026) caducan el 1-nov-2027 y no hay forma de renovar | tú |
| Oct-2027 | Aviso a los compradores de que su año termina (la app ya muestra "Active until…") | tú |

## Vulnerabilidades y riesgos abiertos (revisados el 2026-10-03)

Ordenados por lo que más duele. Ninguno bloquea el lanzamiento; todos son decisiones tomadas
a sabiendas.

1. **Una clave se puede compartir.** No hay límite de activaciones (decidido: menos código).
   Una clave sirve a todo un equipo. *Si se ve abuso*: activar "Limit Activations" en el
   beneficio de Polar y enviar `activation_id` desde `api/license.ts`/`api/tokens.ts`; o
   atar cada clave a N slugs publicados. Señal para vigilar: muchas publicaciones distintas
   con una misma clave en los logs (`evt: license`).
2. **Un reembolso no corta el sync alojado.** El sello de licencia guarda la caducidad de la
   clave, no su estado. Un cliente reembolsado sigue sirviendo su blob hasta la fecha de
   caducidad (hasta 12 meses). Se acepta mientras los reembolsos sean raros. *Arreglo
   futuro*: webhook de Polar (`benefit_grant.revoked`) que borre el sello, o acortar el sello
   a 30 días renovables en cada publicación (cuesta: quien deja de publicar pierde el sync).
3. **Los blobs publicados son públicos por diseño** (`access: 'public'`). La puerta es
   `/api/tokens`, pero quien conozca la URL directa del Blob la lee sin pasar por ella, y el
   plugin acepta cualquier URL. Un cliente Pro podría repartir esa URL. Mismo orden de
   riesgo que el punto 1. No se puede cerrar sin pasar a Blob privado (ya dio problemas, ver
   `writeClaim`).
4. **Adivinar claves en `/api/license`.** El limitador es en memoria y por instancia, y en
   serverless hay varias; el límite real tiene que ser una regla de Firewall de Vercel
   (como la de `/api/contact`). Las claves llevan un UUID, así que adivinar una es
   impracticable, pero cada intento le cuesta una llamada a Polar. *Acción*: crear la regla.
5. **El límite de 1 tema / Desktop en la carga manual es blando.** El exportador del
   configurador es MIT; se quita editando el JSON o con un fork del configurador. El plugin ya es
   privado (2026-10-04), así que esa vía se cerró, pero su JavaScript compilado sigue siendo
   legible. Es una decisión (ver más arriba): el valor de pago está en el servidor.
6. **Polar caído = no se puede publicar** (responde 503 "reintenta", nunca "paga"). Leer no
   se ve afectado: el sello viaja en el blob. La clave se cachea 10 min en memoria.
7. **Plugins ya instalados siguen consultando tras un 402.** Un plugin con Live Sync abierto
   hace una petición cada 10 s y cada una lee el blob aunque responda 402. Un plugin nuevo
   podría pausarse al primer 402 (toca el otro repo y refrescar `public/escala-figma-plugin.zip`).
8. **La clave vive en `localStorage`** (`sd-licence-key`), con el mismo riesgo que el token de
   GitHub: un XSS la leería. Hoy no hay forma conocida (las SVG subidas se sanean). No va en
   el store ni en ningún export.
9. **Fechas fijas en el código** (`PROMO_ENDS_AT`, `PRO_LAUNCH_ENDS_AT`, en `lib/entitlement.ts`).
   Están en +01:00 porque ambas caen después del cambio de hora del 25-oct. Si alguna se
   mueve a una fecha en horario de verano hay que cambiar el desfase a +02:00. El test de
   `entitlement.test.ts` fija los instantes UTC y avisaría.
10. **El producto de renovación no existe** (ver recordatorios): hasta que se cree, una clave
    caducada solo se puede reemplazar comprando otra.
11. **Reembolsos y desistimiento UE.** No hay política publicada. Polar actúa como merchant of
    record, pero la página no la menciona. Decidir y publicar antes de vender (el plan
    proponía 14 días).
12. **Library (Figma/código) no está construida.** `/pricing` la muestra como "Coming soon"
    sin precio; no vender nada de ella hasta que exista.

## En evaluación: cuentas y login (2026-10-04)

Inclinación del dueño: **a favor del login**. El producto aún tiene muy poco reconocimiento, el
lanzamiento propio es en una semana, y lo hecho hasta ahora es un MVP beta, no un producto cerrado.

Descartado en la misma conversación: **limitar Free a una descarga de JSON cada 48 h.** La
descarga se genera en el navegador (no pasa por el servidor), así que sin cuentas solo se puede
contar por IP o `localStorage`, y se salta con incógnito o un fork del configurador. Y castiga el
momento que vende el producto: iterar un sistema es exportar 10–15 veces en una tarde. Free se
limita por capacidad (1 tema, solo Desktop), no por frecuencia.

| A favor de cuentas | En contra |
|---|---|
| Las librerías de Pro se guardan en el servidor, no en el `localStorage` de un navegador | Auth, base de datos, recuperación de acceso y soporte, para una sola persona |
| Cierra los riesgos 1 (claves compartidas), 2 (reembolso no corta), 3 (blobs públicos) y 8 (clave en `localStorage`) | RGPD: política de privacidad, borrado de cuenta, qué datos se guardan |
| Permite avisar de la renovación de los 12 meses | Un login obligatorio quita a Free su mayor ventaja: abrir y usar |
| Abre equipos, historial de versiones y colaboración | Poco margen antes del lanzamiento |

Forma propuesta si se hace: **login solo para Pro, sin contraseñas** — enlace mágico al email con
el que se compró en Polar (Polar ya sabe quién pagó). Free sigue anónimo. Las librerías y la
licencia se atan a la cuenta. Proveedor y base de datos: por decidir (Marketplace de Vercel).

