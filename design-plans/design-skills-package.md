# Paquete de skills de diseño: lo que Escala entrega con tu design system

Estado: **decidido el alcance** (2026-10-20, ver "Decisiones" al final). Reemplaza la historia "agente + MCP en vivo"
(`live-tokens-over-static-install.md`). El MCP alojado se borró ese mismo día.

## La idea en una frase

Cuando terminas tu design system en Escala, no te llevas solo tokens: te llevas
un **paquete de skills** que enseña a cualquier agente (Claude Code, Cursor,
Figma Make, el agente de Figma) a **diseñar y construir con ese sistema**. Las
skills se escriben con los datos de tu sistema, no son genéricas.

## Por qué así y no un servidor

- **Coste cero en Vercel.** Hobby, sin ingresos que paguen un servidor por petición.
  El paquete es un zip que genera el navegador, igual que el resto de Export.
- **Funciona sin red y sin cuenta**, dentro del repo o del archivo de Figma.
- **Es el formato estándar.** `SKILL.md` con frontmatter (Agent Skills) lo leen
  Claude Code, Cursor y Figma Make. `AGENTS.md` y `llms.txt` cubren al resto.
- **El riesgo es la desactualización**, no la falta de conexión. El MCP resolvía eso
  leyendo en cada llamada; aquí se resuelve con versión + re-export fácil
  (ver "Frescura").

## Lo que ya existe (no se reescribe)

Export → AI assistant genera hoy `buildAgentProductFiles` (`lib/agentBundle/product.ts`):

| Archivo | Para qué |
|---|---|
| `AGENTS.md`, `llms.txt` | Router: qué leer y reglas duras |
| `SKILL.md` + `references/{tokens,foundations,semantic-contract}.md` | Catálogo de tokens con nombres de Figma y CSS |
| `skills/code/SKILL.md` | Implementar UI con variables semánticas |
| `skills/a11y-audit/SKILL.md` | Auditar contraste WCAG + APCA |
| `skills/migrate/SKILL.md` | Cambiar hex/px sueltos por tokens |
| `templates/component/*.tsx` | Esqueletos desde las recetas |
| `checkers/token-lint.mjs` | Lint de hex/px que ya tienen token |

Es una buena base: todo sale de un `TokenJSON` y de las recetas. Lo que falta es
(a) que sea correcto siempre, (b) skills para el **diseñador**, no solo para el
ingeniero, y (c) que se mantenga fresco.

## Para quién y qué gana cada uno

**Diseñador** (Figma, Figma Make, Claude con el MCP de Figma):
- Pedir "arma una pantalla de login" y que salga con *sus* componentes, *sus*
  roles de espaciado y *sus* radios, bindeados a variables, no con valores sueltos.
- Revisar un frame: "¿qué está desconectado del sistema?".
- Preparar un handoff donde cada capa dice qué rol usa.

**Ingeniero** (Cursor, Claude Code):
- Construir componentes y pantallas sin inventar un hex ni un px.
- Migrar código existente al sistema y verificarlo con un linter.
- Auditar accesibilidad con los mismos umbrales que usa Escala.

## Inventario propuesto

Cada skill dice de dónde sale su contenido. Ninguna se escribe a mano por sistema.

| Skill | Público | Contenido generado desde | Estado |
|---|---|---|---|
| `foundations` (SKILL.md raíz) | ambos | `TokenJSON`, `names.ts` | existe |
| `code` | ingeniero | roles + recetas | existe, **con errores** (Fase 0) |
| `a11y-audit` | ambos | `INTENT_THRESHOLDS`, pares de `color/audit.ts` | existe, **umbrales incompletos** |
| `migrate` + `token-lint` | ingeniero | `TokenJSON` | existe |
| `component-build` | ambos | `COMPONENT_RECIPES` (slots → roles), catálogo, plugin `named()` | nueva |
| `screen-compose` | ambos | roles de spacing, `GRID_STYLES`, artefactos (Login, Pricing…) | nueva |
| `design-review` | diseñador | pares fill/ink, ejes de radio, `radiusNestingReport`, escala de spacing | nueva |
| `handoff-spec` | diseñador → ingeniero | `tokenTrace` (propiedad → variable por slot) | nueva |
| `brand-extend` | ambos | qué es decisión (acento, tinte, ejes de radio) y qué se deriva | nueva |

Notas:
- **`component-build`** es la de más valor: las recetas ya dicen qué rol usa cada slot
  de cada componente, y el plugin ya nombra las capas como los slots. La skill solo
  tiene que contarlo: "un Button `default` es `root` = `action.primary.default`,
  `label` = `content.on-action`, radio = `radius.action`…".
- **`design-review`** convierte en instrucciones las reglas que el sistema ya mide:
  un fill sin su ink, un radio fuera de su eje, un gap fuera de la escala, un borde
  de campo que no es `border.control`.
- **`brand-extend`** evita el error más caro: que el agente edite tokens a mano. Le
  enseña qué se cambia en Escala (y se reexporta) y qué nunca se toca.

## Reglas del paquete

1. **Generado, nunca escrito a mano por sistema.** Cada línea sale de un builder que
   ya existe. Si `buildCSS` renombra una variable, la skill la renombra.
2. **Un test de deriva por skill.** Todo nombre de rol, variable o capa que cite una
   skill tiene que existir en el `TokenJSON` / las recetas / el plugin. Es lo que
   hoy falló (ver Fase 0).
3. **Una marca, una apariencia por defecto**, como el resto de pastes
   (`contextSource.brandContext`). Multi-marca solo si se pide.
4. **Nada de servidor.** Si algo necesita red, no va en el paquete.

## Frescura (lo que el MCP resolvía)

- **Sello de versión** en `AGENTS.md`: `schemaVersion`, fecha y un hash del
  `TokenJSON`. `token-lint` puede comparar el hash con `variables.css` del repo y
  avisar "el paquete es de otra versión del sistema".
- **Push a GitHub con el paquete.** El push (directo a api.github.com, coste cero)
  ya escribe `tokens.json`, `variables.css` y `.escala/system.json`. Añadir
  `.claude/skills/<sistema>/` y `.cursor/skills/<sistema>/` hace que cada push
  actualice las skills en el repo del producto, sin unzip.
- **Re-export en un clic** desde el Code tab (hoy hay que pasar por el wizard).

## Fases

**Fase 0 — corregir lo que ya se envía** — ✅ HECHA (2026-10-20)
- `AGENTS.md` regla 3 y `skills/code` construyen los nombres con `figmaSemanticName`: campo =
  `Surface/input` + `Border/control` (hover `Border/control-hover`), nunca `Border/strong`.
- `skills/a11y-audit`: los umbrales salen de `INTENT_THRESHOLDS` (incluye `action-label` y
  `control-boundary`); la tabla de pares sale de `CURATED_PAIRINGS` (`color/audit.ts`) filtrada a
  los roles que el payload trae, más el par `on-solid`/`surface-solid` de cada severidad
  (`shippedPairings` en `productSkills.ts`). `Surface/0` ya no aparece.
- Test (`agentContextAudit.test.ts` → "design skills cite only names the system ships"): todo
  nombre semántico de Figma en `AGENTS.md` y `skills/*/SKILL.md` es un rol de
  `colors.architecture.tokens`. Con el texto anterior fallaba (`Surface/0`).
- Encontrado de paso, NO corregido (fuera de `agentBundle/`): `CURATED_PAIRINGS` escribe
  `status.critical-on-solid` (guion en vez de punto), así que el audit no mide ese par. Por eso
  `shippedPairings` lo añade desde los roles.

Plan original de la Fase 0:
- `AGENTS.md` regla 3 y `skills/code`: el borde de un input es `Border/control`, no
  `Border/strong`.
- `skills/a11y-audit`: `Surface/0` no existe; usar `Surface/page`. Añadir el umbral
  `action-label` (WCAG 4.5 / Lc 60).
- Test: todo nombre de Figma citado en `productContext` / `productSkills` existe en
  el `TokenJSON` generado (extender `agentContextAudit.test.ts`).

**Fase 1 — Figma (diseñador)** — ✅ HECHA (2026-10-20), en `agentBundle/productDesignSkills.ts`
+ `agentBundle/figmaRefs.ts`, conectada en `buildAgentProductFiles`:
- `skills/component-build/SKILL.md` (reglas + índice) y `skills/component-build/components/<Key>.md`
  por componente (`atoms`, o `ESSENTIAL_COMPONENT_KEYS`): propiedades de variante, capas (= slots
  de la receta; un estado de datos es sufijo, `item-highlighted`), "Every variant" y "By variant"
  con capa · propiedad · variable o estilo · colección · CSS.
- `figmaRefsFor` traduce una referencia de receta como lo hace el plugin: `color.*` →
  `Color Semantics`; un rol de dimensión → `Dimension Semantics` `<Grupo>/role/<rol>`; un paso suelto
  → la `Dimension Primitive` de ese px; `type.*` → estilo `Type/<rol>`; `shadow.*` → `Shadow/<paso>`;
  `icon.*` → `Icon/role/<rol>`. Una suma no tiene variable única y se dice. Lo que el sistema no
  publica sale como "not published", nunca inventado.
- `skills/design-review/SKILL.md`: valores desconectados, pares fill/ink (de `inkPairings`),
  ejes de radio Boxes/Fields/Selectors (`RADIUS_GROUPS` + px actuales), escala de spacing y roles,
  borde de campo = `Border/control` (lista de componentes derivada de las recetas), plantilla de
  hallazgos.
- `skills/handoff-spec/SKILL.md`: cómo escribir el spec, plantilla, y las tablas Figma → CSS para
  color, longitudes (roles + iconos), estilos de texto y sombra.
- `AGENTS.md` y `llms.txt` enrutan a las tres.
- Tests: todo nombre que bindean las skills existe en el payload (con los 59 componentes, 0 "not
  published"), y paridad capas ↔ receta ↔ plugin (`slotMatchesLayer`, `recipeLayerSlots` del
  plugin cuando el repo hermano está).
- Pendiente de esta fase: nada en el paquete; la UI de Export todavía no dice "Design skills"
  (Fase 4).

Plan original de la Fase 1:
- `component-build` para Figma: desde `COMPONENT_RECIPES`, una sección por componente
  seleccionado (`atoms`): qué variable va en cada capa nombrada como su slot.
- `design-review`: cómo revisar un frame contra el sistema (valores sueltos, pares
  fill/ink, ejes de radio, gaps fuera de escala, borde de campo = `Border/control`).
- `handoff-spec`: la capa → variable que un ingeniero necesita.
- Test de paridad: cada slot citado existe en la receta y en el plugin.

**Fase 2 — código (ingeniero)**
- `component-build` en React sobre `components/escala-ui/`.
- `screen-compose`: patrones de pantalla desde los artefactos; espaciado por rol,
  grid por estilo.

**Fase 3 — frescura**
- Sello de versión + aviso en `token-lint`.
- El push a GitHub escribe las skills.

**Fase 4 — producto**
- About y Pricing presentan "Design skills" como parte de lo que te llevas, en Free.
- `brand-extend`.

## Decisiones (dueño, 2026-10-20)

1. **Todo Free, para todo el mundo.** El paquete completo, incluidas las skills de
   diseño, va en Free. Supera "Skill solo en pago" de `pricing-and-packaging.md`.
2. **Nombre visible: "Design skills".** Es un nombre de producto: no se traduce
   (es/fr dicen "Design skills" también). El zip conserva su nombre de archivo
   (`<sistema>-agent-bundle.zip`) para no romper el comando de instalación.
3. **Figma primero, luego código.** La Fase 1 se reordena: primero las skills que
   sirven al diseñador dentro de Figma (`component-build` para Figma con capas
   nombradas como los slots, `design-review` de un frame, `handoff-spec`); después
   su lado de código (`component-build` en React, `screen-compose`).
