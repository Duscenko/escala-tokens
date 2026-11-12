# Button — el manual "de Figma a React", aplicado

Fecha: 2026-11-12 · Estado: **F1, F2, F3, F5 hechas** (noche del 12-11); **F4 planificada**
(`packages-ui-extraction.md`), sin ejecutar.
Fuente: archivo Figma `Escala Design System (Real)` (`7j5zukN5HpihGVJMmyjA20`),
página `❖ Button (✓)` (`4:2185`) y `❖ IconButton (✓)` (`627:785`). Manual:
`Manual Escala de Figma a React` (Cesar Durango, 2026-11-12).

## Decisiones del dueño (2026-11-12)

1. **Figma manda** en nombres, variantes y props — la misma regla que los tokens
   (CLAUDE.md, 2026-11-11). Supera "variants are shadcn's EXACTLY" para Button.
2. **`packages/ui` ya**: `escala-tokens` pasa a workspaces de npm; Button es el
   primer componente de `@escala/ui`.
3. **Storybook** en `apps/storybook`, args/argTypes 1:1 con Figma + test a11y.
4. **Receta, sin cva**: los estilos siguen saliendo de `src/lib/recipes/actions.ts`
   (una fuente para web y plugin). Se aparta del manual a propósito.

## Lo que dice Figma (leído, no supuesto)

| Set | Variant | Size | State | Variantes |
|---|---|---|---|---|
| `Button` | default · secondary · outline · ghost · **destructive-outline** · destructive · link | xs 24 · sm 32 · default 40 · lg 48 | Default · Hover · Pressed · Focused · Loading · Disabled | 168 |
| `IconButton` | default · secondary · outline · ghost · destructive · link | xs 24 · sm 32 · default 40 · lg 48 (cuadrado) | igual | 144 |

Frente al código hoy (`escala-ui/button.tsx`, receta `BUTTON`, catálogo):
- falta `destructive-outline`;
- `icon · icon-xs · icon-sm · icon-lg` viven en `Button.size` → pasan a `IconButton.size`
  (`default · xs · sm · lg`). Alturas ya coinciden (`size.hit/compact/control/touch`).

## Fases (parar y enseñar al final de cada una)

**F1 · Contrato.** `get_design_context` de las celdas `destructive-outline` e
IconButton para leer qué roles ligan (relleno, borde, tinta por estado). Escribir el
contrato: props, roles por estado, anatomía. Sin código.

**F2 · Receta + componente.** `destructive-outline` en `BUTTON_VARIANTS` y
`buttonPaint`; receta `ICON_BUTTON` (o `BUTTON` con `recipe="IconButton"`); 
`IconButton` en `escala-ui`; quitar `icon*` de Button con alias de compatibilidad
mientras se migran las llamadas (`grep` de `size="icon`). Catálogo: entrada
`IconButton`, axes de Button actualizados. Migración de store si algún dato
guardado nombra `size: icon*`.

**F3 · Plugin.** `recipes.ts` + gates/SPECS en `code.ts` para `destructive-outline`
e `IconButton`; `componentRecipesPluginParity` y `check-ground-truth` en verde.

**F4 · Paquete.** `package.json` raíz con `workspaces: ["packages/*", "apps/*"]`;
`packages/ui` (`@escala/ui`) exporta Button + IconButton + la hoja de recetas;
la web importa desde `@escala/ui`. Build de Vercel verificado.

**F5 · Storybook.** `apps/storybook` (Vite), carga `variables.css` + recetas;
stories `Button` e `IconButton` con argTypes Variant/Size/State 1:1, Light/Dark y
Desktop/Tablet/Mobile como toolbar; `@storybook/addon-a11y`.

## Consecuencia a decidir después

"Figma manda" alcanza a otros componentes que el código fusionó en shadcn:
CloseButton, FABButton, TextLink, Modal (→ Dialog), Toast (→ Sonner), TabMenu,
NumberInput… Cada uno se decide cuando le toque, no en este plan.

## Gramática del Button — decisión 2026-11-12: dos ejes, `Variant` × `Appearance`

Leído en Figma (State=Default, Size=default), lo que pinta cada valor de hoy:

| Hoy | Relleno | Borde | Tinta | → Variant | → Appearance |
|---|---|---|---|---|---|
| default | Action/primary/default | — | Content/on-action | default | solid |
| secondary | Action/secondary/default | — | Content/on-secondary | secondary | solid |
| outline | — | Border/control | Content/primary | secondary | outline |
| ghost | — | — | Content/primary | secondary | ghost |
| link | — | — | Content/link/default | default | link |
| destructive | Status/critical/surface-solid | — | Status/critical/on-solid | critical | solid |
| destructive-outline | — | Status/critical/border-strong | Status/critical/content | critical | outline |

`default` = la intención de marca, `secondary` = neutra, `critical` = destructiva. Outline y
ghost son neutros (`Content/primary`), así que son `secondary`, no `default`. Ningún Button
es `soft` hoy. IconButton: la misma tabla sin `destructive-outline`.

**Decidido: matriz completa (12).** Hecho en Figma el 2026-11-12
(`scripts/figma/button-variant-appearance.figma.js` + `button-docmatrix.figma.js`):
Button y IconButton tienen 288 variantes cada uno (3 × 4 × 4 tamaños × 6 estados), todas
únicas; la DocMatrix de las dos páginas está rehecha en 6 bloques; descripciones y specs
actualizadas. Foto del archivo refrescada (`be79d166` → `9cc4dd2f`).

Roles de las combinaciones nuevas (clonadas de la variante más cercana, solo cambia el color;
el estado Disabled conserva sus roles neutros):

| Nueva | Plantilla | Borde | Tinta (texto + icono) | Hover / Pressed |
|---|---|---|---|---|
| default · outline | outline | Border/accent | Content/accent | Action/ghost |
| default · ghost | ghost | — | Content/accent | Action/ghost |
| secondary · link | link | — | Content/secondary → Content/primary en hover | — |
| critical · outline (solo IconButton) | outline | Status/critical/border-strong | Status/critical/content | Action/ghost |
| critical · ghost | ghost | — | Status/critical/content | Action/ghost |
| critical · link | link | — | Status/critical/content (subrayado en Hover/Pressed) | — |

### El plugin construye un CORTE BASE, no la matriz (decisión 2026-11-12)

El plugin crea variables, hace el handoff y entrega la skill; sus componentes son una
muestra básica ligada a las variables. La biblioteca completa (288 variantes por set,
guías de uso) es el archivo de Figma que se vende. `representativeSpec` (`code.ts`)
aplica a todos los sets: `State` en reposo, `Size` por defecto, el resto de ejes
cruzados hasta 12 (por encima, cada valor una vez), más lo que anidan los compuestos
(`NESTED_DEMANDS`, `BTN_NESTED`). Medido con el mock: Full catalogue 1081 → 196
variantes, Overview 425 → 48; Button 288 → 15. Antes de este cambio el modo por defecto
también construía las 288 del Button (`FULL_SPEC_OVERRIDES` pisaba el corte en los dos
modos). Un archivo que ya tiene más variantes las conserva: un set reutilizado nunca se
poda. Red: `componentNestedVariants.test.ts`.

### Pendiente en Figma (no bloquea la F1)
- **Usage Guideline** de la página Button: el menú de variantes y la anatomía de
  propiedades siguen mostrando los 7 valores antiguos; hay que rehacerlos con dos menús.
- **Anillo de foco no unificado**: las combinaciones nuevas usan `Border/focus`; las
  antiguas `critical · solid/outline` usan `Status/critical/border-strong` y `secondary ·
  solid` usa `Border/strong`. CLAUDE.md pide un solo anillo (el foco gana al error).
- **IconButton critical · link**: hover y pressed no cambian de color (no hay texto que
  subrayar). Necesita un rol de hover o aceptar la excepción.
- **Orden del panel en IconButton**: Appearance aparece outline · ghost · link · solid.

