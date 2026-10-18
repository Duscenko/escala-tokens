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
| 1 · Acciones | Button (+ plegar CloseButton, FAB, TextLink), ButtonGroup | Web + plugin + recetas + paridad en verde |
| 2 · Indicadores y feedback | Badge, Alert, Sonner, Avatar, Spinner; borrar AlertBanner | ídem |
| 3 · Formularios | Input, Select, Checkbox, RadioGroup, Switch, InputOTP, Field | ídem |
| 4 · Superficies y navegación | Card, Separator, Dialog, Tabs, Sidebar, menús | ídem |
| 5 · Solo-Escala | Vocabulario de shadcn en los componentes sin equivalente | Ningún eje con valores en mayúscula ni Danger/Error |
| 6 · Cierre | Migración del store, artefactos, `statusAction`, CLAUDE.md, plugin 0.7.0 | `npm test` + `npm run build` en verde, plugin construye todos los sets |

Cada fase es un commit en los dos repos a la vez: el test de paridad no deja
que la web y el plugin queden desalineados entre fases.
