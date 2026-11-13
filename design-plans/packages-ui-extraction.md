# F4 · Extraer `@escala/ui` a `packages/ui` — plan medido

Fecha: 2026-11-12 · Estado: **plan, no ejecutado** (decisión del dueño, ver "Por qué no
se hizo de noche"). Viene de `button-figma-parity.md` (F4).

## Lo que se midió

| Pregunta | Respuesta |
|---|---|
| ¿De qué dependen los componentes (`src/components/escala-ui`, 74 archivos)? | Casi solo de `lib/utils` (`cn`, 69 imports). Excepciones: 1 import de `components/ui/icons`, 1 de `lib/previewTokens` |
| ¿Quién los importa en la app? | 17 archivos (configurator, docs, preview) por ruta relativa |
| ¿El plugin importa componentes o el motor de recetas? | **No.** El plugin lee la tabla de recetas serializada (`tokens.json → componentRecipes`) con su propio `recipes.ts`. Importa de `escala-tokens/src/lib` solo color, motion, w3cTree, github y repoExport |
| ¿El motor de recetas (`componentRecipes` → `recipeStyles`) es ligero? | **No.** `recipeStyles` arrastra `previewTokens` (y con él el store). No debe ir al paquete |
| ¿Quién más lee la carpeta? | `npm run gen:registry-sources` (registro shadcn), `agentContextAudit` y `shadcnRegistry` (tests), los contratos y design skills del paquete de agentes |

## Forma propuesta del paquete

```
packages/ui/                      @escala/ui (private, sin publicar)
  package.json                    exports: "." → src/index.ts, "./recipes.css"
  src/
    index.ts                      Button, IconButton, … (export por componente)
    components/*.tsx              ← src/components/escala-ui/*.tsx (git mv)
    lib/utils.ts                  cn() (copiado; la app sigue con el suyo)
  recipes.css                     GENERADO por scripts/gen-ui-css.ts desde
                                  lib/recipeStyles (RECIPE_CSS) — sin valores,
                                  solo var(--…)
```

Un consumidor del paquete pone dos cosas: `variables.css` de su marca (lo que ya
exporta Escala) y `@escala/ui/recipes.css`. Es exactamente lo que hoy entrega el
registro shadcn, pero empaquetado.

**El motor de recetas se queda en la app** (`src/lib`): es la fuente del CSS, del
plugin y del contexto para agentes. El paquete recibe su salida (`recipes.css`), no el
motor. Un test compara `recipes.css` con `RECIPE_CSS` para que no se desincronicen.

## Pasos (una tarde, con la otra sesión parada)

1. `package.json` raíz: `"workspaces": ["packages/*"]`; `npm install` (enlaza
   `node_modules/@escala/ui`). Comprobar que `npm ci` en Vercel sigue igual.
2. `git mv src/components/escala-ui packages/ui/src/components` (conserva el
   historial); `@/lib/utils` → `../lib/utils` dentro del paquete; los 2 imports
   externos (`ui/icons`, `previewTokens`) se resuelven o se quedan en la app.
3. Los 17 consumidores: `../../escala-ui/button` → `@escala/ui` (un `sed` y `tsc`).
4. `gen-registry-sources`, `agentContextAudit`, `shadcnRegistry`, contratos y design
   skills: cambiar la ruta de la carpeta (una constante cada uno).
5. `scripts/gen-ui-css.ts` + test de paridad `recipes.css` ↔ `RECIPE_CSS`.
6. Storybook importa de `@escala/ui` en lugar de rutas relativas.
7. `npm test`, `npm run build`, `npm run build-storybook`, `check-ground-truth` en el
   plugin. Un commit por paso.

## Por qué no se hizo de noche

- **La otra sesión edita ahora mismo los consumidores** (configurator, preview): el
  paso 3 reescribe sus líneas de import con trabajo suyo sin commitear → conflictos o
  pisar su trabajo.
- **Toca el despliegue** (lockfile, workspaces en Vercel): mejor con alguien mirando.
- No bloquea nada: Button e IconButton ya tienen API, receta, plugin y Storybook; la
  extracción es mover, no rediseñar.
