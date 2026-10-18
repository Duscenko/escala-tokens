# Variantes exactamente como shadcn (opción A de E6)

Estado: **fase 1 en curso.** Las 6 decisiones se aceptaron tal como las recomienda este plan (2026-10-18). Decidido el 2026-10-18: los componentes usan los
nombres y valores de variante de shadcn tal cual, en el catálogo, las recetas, el
plugin y Figma. Se acepta perder Soft y Success/Warning como estilos de botón y
romper las instancias ya colocadas en archivos de Figma. **La arquitectura de
tokens no cambia** (roles Categorical, primitivos, dimensiones, `status.*`).

Supera E6 de `shadcn-component-skeleton.md` (que recomendaba B).

## Fuente

`~/Downloads/ui-main/apps/v4/registry/bases/radix/ui/*.tsx` (el mismo archivo
de donde se vendorizó `escala-ui/`). Valores leídos de sus `cva(...)` y props
tipadas, no de memoria.

## Mapa: componentes con equivalente en shadcn

| Escala hoy (clave · ejes) | shadcn (archivo · variantes) | Se pierde |
|---|---|---|
| Button · Color[Brand·Neutral·Danger·Success] × Style[Solid·Outline·Soft·Ghost] × Size[SM·MD·LG·XL] | button · `variant` default·secondary·outline·ghost·destructive·link × `size` default·xs·sm·lg·icon·icon-xs·icon-sm·icon-lg | Soft, Success, Danger outline/ghost, XL |
| Badge · Style × Color[6] × Size | badge · `variant` default·secondary·destructive·outline·ghost·link | Success/Warning/Info, Soft, Size |
| InlineAlert · Status[Info·Success·Warning·Error] | alert · `variant` default·destructive | Success/Warning/Info |
| Toggle (Switch) · On × Size[MD·SM] | switch · `size` default·sm | — (renombrar) |
| Checkbox · Checked × Size | checkbox · sin variantes | Size |
| Radio · Checked × Size | radio-group · sin variantes | Size |
| Select · Size[MD·SM·LG] | select · trigger `size` default·sm | LG |
| Input · Size[MD·SM·XS] × Type[8] | input · sin variantes | Size, Type (pasa a ejemplos de InputGroup) |
| InputOTP · Size | input-otp · sin variantes | Size |
| Avatar · Size[XS…XL] | avatar · `size` default·sm·lg | XS, XL |
| Tabs · (ninguno) | tabs · lista `variant` default·line | — (gana `line`) |
| ButtonGroup · Size | button-group · `orientation` horizontal·vertical | Size |
| Divider · Orientation | separator · `orientation` | — (renombrar) |
| Card · (ninguno) | card · `size` default·sm | — (gana `sm`) |
| Spinner · Size | spinner · sin variantes (tamaño por clase) | Size |
| Sidebar · (ninguno) | sidebar · `variant` sidebar·floating·inset, `side` left·right | — (gana) |
| Field · (ninguno) | field · `orientation` vertical·horizontal·responsive | — (gana) |
| DropdownMenu / ContextMenu · ítem `danger` | ítem `variant` default·destructive | — (renombrar) |
| Modal | dialog | — (renombrar) |
| Label, Progress, Slider, Textarea, Combobox, Command, Popover, Tooltip, Accordion, AspectRatio, ScrollArea, Breadcrumb, Pagination, InputGroup | mismo archivo, mismas props | — |

**State** (Hover · Focused · Disabled…) no es una prop en shadcn: son pseudo-clases.
Se queda **solo en Figma**, como eje, porque una variante de Figma es la única
forma de mostrar un estado allí (el kit oficial de shadcn para Figma hace lo
mismo). En código sigue siendo `forceState`, solo para la documentación.

## Decisiones abiertas (cada una con mi recomendación)

1. **Claves con nombre de shadcn.** `Toggle`→`Switch`, `Divider`→`Separator`,
   `Modal`→`Dialog`, `InlineAlert`→`Alert`, `Radio`→`RadioGroup`.
   *Recomiendo sí*: "tal cual shadcn" incluye el nombre. Cuesta una migración del
   store (`selectedComponents`) y cambia los gates y los nombres de set en Figma
   (ya aceptado que se rompen).
2. **Componentes de Escala que shadcn compone en vez de ser componentes.**
   CloseButton y FABButton → `Button size="icon"`; TextLink → `Button
   variant="link"`; InfoTooltip → `Tooltip`; CheckboxGroup / SwitchGroup →
   `Field` + Checkbox/Switch. *Recomiendo plegarlos* (−6 claves): son
   composiciones, no componentes, en el modelo de shadcn.
3. **Componentes solo de Escala sin equivalente** (SocialLoginButton,
   AppStoreBadge, InputStepper, InputTag, FileUpload, Dropzone, PasswordStrength,
   StatusBadge, Chip, Rating, FileFormat, Icon, AlertBanner, TabMenu,
   SegmentedControl, Stepper, Navbar). *Recomiendo conservarlos con el vocabulario
   de shadcn*: valores en minúscula (`default · sm · lg`), `destructive` en vez de
   Danger/Error, `variant` y `size` como nombres de eje.
4. **Toast.** shadcn usa Sonner: `type` default·success·info·warning·error·loading.
   *Recomiendo adoptar Sonner* (renombrar la clave a `Sonner`). Es el único sitio
   donde Success/Warning/Info siguen siendo una variante oficial de shadcn.
5. **AlertBanner.** Sin equivalente; con Alert reducido a default·destructive
   queda solo. *Recomiendo eliminarlo* (Alert cubre el caso).
6. **`statusAction`** (estilo de sistema solid/soft para botones de severidad).
   Sin Soft no tiene sentido. *Recomiendo eliminar el campo* (migración del store
   y de los 6 System Styles).

## Lo que se rompe y hay que rehacer (medido)

- **Web:** 147 usos de los valores viejos (`Style: 'Soft'`, `Color: 'Danger'`,
  `Size: 'XL'`…) en 14 archivos; los mayores son `SystemCollage` (43),
  `PreviewPanel` (30) y los artefactos (Login, OTP, Pricing, Checkout, Profile).
- **Recetas:** `lib/recipes/*.ts` (1 515 líneas) indexan por los ejes de Escala;
  se reescriben las de los componentes del mapa.
- **`escala-ui/*.tsx`:** los `.tsx` vuelven a los `cva` de shadcn tal cual; se
  borran los alias (hoy shadcn es el alias de Escala, pasa a ser al revés: sin
  alias).
- **Catálogo:** `axes` de cada entrada; `figmaSets`; claves (decisión 1–2).
- **Plugin (`../escala-figma-plugin`):** `SPECS` de cada componente del mapa
  (Button hoy son 17 variantes Color×Style×State), `BTN_COLORS`/`BTN_STYLES`,
  builders, `recipes.ts` (`recipeBindings`), `RECIPE_FIGMA_ANATOMY`, CATALOG y
  gates. Versión 0.7.0 y zip nuevo (`npm run bundle:plugin`).
- **Tests:** `componentRecipesPluginParity`, `componentRoles`, `shadcnRegistry`,
  `useIt`, `themePresets` y los snapshots que dependan de los ejes.
- **Store:** migración para claves renombradas/plegadas en `selectedComponents`
  y para quitar `statusAction`.
- **Exportación:** snippets (`docs/skeleton/snippets.ts`), registry (`/r/*.json`
  se regenera solo), MCP `get_component` (lee el catálogo), Copy context.
- **Figma de los usuarios:** las instancias de Button/Badge/Alert… colocadas con
  `Color=Brand, Style=Solid` pierden su variante al re-sincronizar. Aceptado. El
  plugin debe registrar en el Log qué sets se rehicieron.

## Fases

| Fase | Contenido | Hecho cuando |
|---|---|---|
| 0 · Decisiones | Cerrar 1–6 | ✅ aceptadas las 6 recomendaciones |
| 1 · Acciones | Button (+ plegar CloseButton, FAB, TextLink), ButtonGroup | ✅ 2026-10-18 · plugin 0.7.0 |
| 2 · Indicadores y feedback | Badge, Alert, Sonner, Avatar, Spinner; borrar AlertBanner | ✅ 2026-10-18 · plugin 0.8.0 |
| 3 · Formularios | Input, Select, Checkbox, RadioGroup, Switch, InputOTP, Field | ✅ 2026-10-18 · plugin 0.9.0 |
| 4 · Superficies y navegación | Card, Separator, Dialog, Tabs, Sidebar, menús | ídem |
| 5 · Solo-Escala | Vocabulario de shadcn en los componentes sin equivalente | Ningún eje con valores en mayúscula ni Danger/Error |
| 6 · Cierre | Migración del store, artefactos, `statusAction`, CLAUDE.md, plugin 0.7.0 | `npm test` + `npm run build` en verde, plugin construye todos los sets |

Cada fase es un commit en los dos repos a la vez: el test de paridad no deja
que la web y el plugin queden desalineados entre fases.

## Fase 1 — hecha (2026-10-18)

- **Button**: `variant` default·secondary·outline·ghost·destructive·link, `size`
  default·xs·sm·lg·icon·icon-xs·icon-sm·icon-lg, `data-variant` / `data-size` como
  shadcn. Alturas: los roles de Size de Escala (hit 24 · compact 32 · control 40 ·
  touch 48), no los px de shadcn — los nombres son de shadcn, las longitudes del
  sistema. `destructive` es el suave de shadcn v4 (`status.critical.surface`).
  Disabled es un rol, no opacidad.
- **Plegados**: CloseButton → `Button variant="ghost" size="icon-sm"`, FABButton →
  `size="icon-lg"` (se pierde la píldora y la sombra), TextLink → `variant="link"`
  (en prosa: `SkeletonInlineLinkSpecimen`, sin alto ni padding). Store v91 los
  quita de `selectedComponents`. Catálogo y plugin: 56 claves.
- **ButtonGroup**: `orientation` horizontal·vertical; hijos son Buttons; las uniones
  usan las clases de shadcn con `!` (la hoja de recetas no tiene capa).
- **Plugin 0.7.0**: SPECS Button Variant×Size×State (18 en Overview, 288 en
  catálogo completo); los sets viejos (`Button Close`, `Button FAB`, `Text Link`)
  quedan aparcados en "not in this import" para no romper instancias enlazadas.
- `agentContext`: la tabla de Size lee la altura de la receta (antes suponía
  Size = paso de la escala).

## Fase 2 — hecha (2026-10-18)

- **Badge**: `variant` default·secondary·destructive·outline·ghost·link; sin tamaño
  ni punto (el punto de presencia es StatusBadge). Los colores Success/Warning/Info
  de la Badge desaparecen.
- **Alert** (era InlineAlert): `variant` default·destructive; `bg-card` + hairline,
  el icono es el primer hijo (`<svg>` o `AlertIcon`), `AlertAction` arriba a la
  derecha. **AlertBanner borrado.**
- **Sonner** (era Toast): el `Toaster` real del paquete `sonner@2.0.8`, como shadcn.
  Tipo default·success·info·warning·error·loading, distinguido por el icono. La
  receta pinta el DOM de Sonner (`ComponentRecipe.dom`: raíz y partes por sus
  atributos, con más especificidad que la hoja de Sonner). En la documentación
  cada espécimen monta su propio Toaster (`id` + `toasterId`) en el flujo.
- **Avatar**: `size` default·sm·lg (32 · 24 · 40). El relleno opcional con
  gradiente del collage pasa a `v.Fill` (no es un eje del catálogo).
- **Spinner**: el glifo Loader2 que gira, `size-4` por clase, sin variantes.
- `tokenInspector.resolveVariantRoles` lee la receta en vez de una copia a mano
  de la lógica de pintura. Store v92 renombra/quita las claves. Plugin 0.8.0.

## Fase 3 — hecha (2026-10-18)

- **Input**: el `<input>` desnudo de shadcn (la caja ES el input). Sin Size ni Type;
  State solo en Figma. Etiqueta y ayuda vienen de Field; iconos de InputGroup.
  `InputField` (compuesto de Escala) borrado. El espécimen, si recibe `v.Type`
  (clave opt-in, no eje), compone Field · FieldLabel · Input · FieldDescription.
- **Checkbox** y **Switch** (era Toggle): solo el control, sin `label`; Switch con
  `size` default·sm. Eje `Checked` (Switch dejó `On`).
- **RadioGroup**: RadioGroup + RadioGroupItem; el ítem marcado se rellena con el
  primario y lleva el punto (como shadcn v4). `Radio` (un solo radio) desaparece.
- **Field**: `orientation` vertical·horizontal·responsive y todas sus partes, en su
  propio `field.tsx` (como shadcn); **Label** sin `required`.
- **Select**: `size` default·sm. **InputOTP**: el paquete `input-otp@1.4.2`
  (InputOTPGroup · InputOTPSlot), sin tamaños.
- **CheckboxGroup / SwitchGroup borrados**: son FieldSet + FieldLegend + FieldGroup
  de Fields horizontales (`SkeletonSettingsList` para las pantallas).
- Store v93. Plugin 0.9.0.
