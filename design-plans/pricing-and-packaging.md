# Pricing y empaquetado: Free / Design / Complete

Plan y auditoría, no implementación. Escrito el 2026-10-03. Sustituye la parte de
"qué se vende" de `multitheme-subscription.md` (allí siguen valiendo la arquitectura de
licencia, la promo y el enforcement en `api/tokens.ts`).

## Decisiones ya tomadas

- Los dos repos actuales (`escala-tokens`, `escala-figma-plugin`) siguen **públicos y MIT**.
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

Este es el hallazgo principal. Con todo el código actual en MIT, **solo es límite duro lo que
corre en el servidor o lo que se distribuye fuera de los repos públicos.**

| Límite | Dónde se aplica | Tipo |
|---|---|---|
| Sync alojado, temas sincronizados, MCP en vivo | `api/tokens.ts`, `api/mcp.ts` | **duro** |
| Library (Figma y código) | distribución privada con clave de licencia | **duro** |
| 1 tema / solo Desktop en la carga manual | wizard de Export (Escala JSON) | **blando**: se quita editando el JSON o con un fork |
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
| hasta el 31-oct | gratis para todos (promo) |
| 1–15 nov | **$59** (precio de lanzamiento) |
| desde el 16-nov | **$79** |

- **USD**, pago único, 12 meses de sync/MCP/actualizaciones incluidos.
- **En Polar es el PRECIO BASE, no un descuento**: $59 hasta el 15-nov, se edita a $79 el
  16-nov. Escala Pro nunca se ha vendido a $79, y las reglas de precios de la UE/Francia
  toman como referencia de una rebaja el precio más bajo cobrado en los 30 días anteriores;
  un descuento "$79 → $59" sería una rebaja sobre un precio nunca cobrado. Se comunica como
  un precio que SUBE en una fecha, nunca tachado.
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
