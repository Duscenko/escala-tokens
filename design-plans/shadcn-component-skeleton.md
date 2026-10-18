# shadcn como esqueleto de los componentes de Escala

Estado: **fases 0–2 hechas, 3 hecha en la web; 4 hecha salvo E11.3; 5 abierta** (2026-10-18, ver "Estado actual" al final). Fuente: `~/Downloads/ui-main`
(repo `shadcn-ui/ui`, licencia MIT, registry v4).

## La decisión

Los componentes de Escala (hoy `SPECIMENS` en
`src/components/configurator/docs/specimens.tsx`, 3 222 líneas de JSX con
`style` inline leído de `PreviewTokens`) se reemplazan por componentes con el
**esqueleto de shadcn**: misma anatomía (`Card` → `CardHeader` / `CardTitle` /
`CardContent` …), `data-slot`, comportamiento y accesibilidad de Radix, `cva`
para las variantes. Objetivo: una librería más completa y alineada con el
estándar que la mayoría de equipos ya usa.

Lo que **no** cambia: los tokens. shadcn aporta el esqueleto; los valores
siguen saliendo de los roles Categorical, los modos de espaciado, el radio por
ejes, Phosphor y los System Styles.

## Lo que hay en `ui-main` y cuál tomamos

| Carpeta | Qué es | Uso |
|---|---|---|
| `apps/v4/registry/new-york-v4/ui/*.tsx` | 58 componentes con clases Tailwind escritas dentro (`bg-primary h-9 rounded-md`) | Referencia |
| `apps/v4/registry/bases/radix/ui/*.tsx` | Los mismos, pero con clases semánticas `cn-button-variant-default` | **Esta** |
| `apps/v4/registry/styles/style-*.css` | 8 estilos (nova, vega, lyra…) que dan valor a las `cn-*` con `@apply` | Modelo para los System Styles |
| `bases/base`, `bases/aria` | Mismo esqueleto sobre Base UI / React Aria | Descartado (ver E1) |

`bases/radix` es la pieza clave: separa **estructura** (el `.tsx`) de
**apariencia** (el `.css` del estilo). Es exactamente la separación que Escala
necesita: el `.tsx` es de shadcn, la hoja `cn-*` la genera Escala desde los
tokens.

---

## Escenarios

### E1 · Primitivo: Radix (recomendado), Base UI o React Aria
- **Radix**: el repo ya tiene `@radix-ui/react-slot` / `react-icons`; shadcn v4
  usa el paquete paraguas `radix-ui`. Menor riesgo.
- Base UI / Aria: mejor a11y en algunos casos, pero sería migrar dos cosas a la vez.
- **Decisión propuesta:** Radix. La carpeta `bases/radix` se copia; las otras no.

### E2 · Cómo entra el código: vendorizar, no CLI
- No ejecutar nada del zip (`pnpm`, `scripts/`, `turbo`): es contenido
  descargado. Solo se copian `.tsx` revisados.
- Destino propuesto: `src/components/escala-ui/` + `LICENSE-shadcn.md` (MIT
  exige conservar el aviso) + `UPSTREAM.md` con el commit de origen.
- Codemod al copiar: `import { cn } from "cn"` → `@/lib/utils`; iconos lucide →
  `PreviewIcon` (E7); clases de color → espacio de nombres propio (E3).
- Actualizaciones futuras: un script que compara `UPSTREAM.md` con un nuevo
  zip y lista los archivos que cambiaron. Nunca sobrescribir a ciegas.

### E3 · Choque de nombres con la UI de la app (bloqueante)
La app ya define en `src/index.css`:
- `--color-primary-foreground` (tinta del rainbow button) → `text-primary-foreground`
  de shadcn pintaría con ese valor;
- `--color-accent-ui`, `--color-accent-solid`, `--color-input-bg` → vecinos
  directos de `bg-accent`, `bg-input`.

Opciones:
1. **Prefijo propio** (recomendado): el codemod renombra `bg-primary` →
   `bg-ds-primary`, etc.; `@theme inline { --color-ds-primary: var(--ds-primary) }`.
   La UI de la plataforma y los componentes del sistema del usuario no pueden
   pisarse.
2. Mantener los nombres de shadcn y renombrar lo de la app. Más trabajo, más riesgo.

Regla resultante: **la plataforma pinta con sus tokens (`bg-surface`, `accent-ui`),
los componentes del usuario con `--ds-*`**, igual que hoy (tema en el lienzo,
plataforma en el cromo).

### E4 · Puente de tokens: variables de shadcn ← roles Categorical
Los componentes de shadcn leen ~20 variables (`background`, `foreground`,
`card`, `popover`, `primary(+foreground)`, `secondary`, `muted`, `accent`,
`destructive`, `border`, `input`, `ring`, `chart-1…5`, `sidebar-*`, `radius`).
Escala tiene 64 roles. Se necesita **un mapa**, no una arquitectura nueva
(CLAUDE.md: la arquitectura shadcn fue borrada y no vuelve como proyección).

| Variable shadcn | Rol Escala |
|---|---|
| `--ds-background` / `--ds-foreground` | `surface.page` / `content.primary` |
| `--ds-card` / `-foreground` | `surface.layer-1` / `content.primary` |
| `--ds-popover` | `surface.layer-1` (+ sombra `lg`; Escala no tiene un rol "raised") |
| `--ds-primary` / `-foreground` | `action.primary.default` / `content.on-action` |
| `--ds-secondary` / `-foreground` | `action.secondary.default` / `content.accent` |
| `--ds-muted` / `-foreground` | `surface.layer-2` / `content.secondary` |
| `--ds-accent` (hover de menús) | `action.ghost.neutral.hover` |
| `--ds-destructive` | `status.critical.surface-solid` |
| `--ds-border` | `border.default` (decorativo) |
| `--ds-input` | `border.control` (frontera 1.4.11) |
| `--ds-ring` | `border.focus` |
| `--ds-chart-1…5` | paleta categórica CVD ya validada |

Pero shadcn **tiene menos roles que Escala**, y ahí se pierde información:
hover/pressed resueltos (`action.primary.hover`), `status.*` de warning/success/info,
`border.control-hover`, los alphas. Por eso las variantes no salen solo de esas
20 variables: la hoja `cn-*` de Escala (E5) usa **todos** los roles. Las 20
existen para que un componente de shadcn copiado tal cual funcione, y para la
exportación (E11).

Dónde se escriben: en el contenedor de cada vista previa (la tarjeta que ya
lleva `.light`/`.dark`), desde `resolvePreviewTokens`. Así cada tarjeta puede
pintar un tema distinto en la misma pantalla, como hoy.

### E5 · Apariencia: una hoja `cn-*` generada, no `@apply` a mano
`bases/radix` deja la apariencia en `.cn-button-variant-default { … }`. Escala
genera esa hoja desde los tokens:
- color → roles (`action.primary.hover` en `:hover`, `pressed` en `:active`);
- alto → `size-control` / sizes por tamaño; padding → `inset-control`;
- radio → los tres ejes (Boxes / Fields / Selectors);
- tipo → roles de tipo; sombra → rampa (y su gemelo oscuro).

Consecuencia buena: cambiar de modo de espaciado o de plataforma (Desktop ·
Tablet · Mobile) mueve los componentes sin tocar el `.tsx`, porque todo es
`var(--…)` resuelto por media query o por el contenedor.

Los 8 estilos de shadcn (nova, vega…) son el mismo concepto que los System
Styles: **fase posterior**, un System Style podrá declarar su propia hoja `cn-*`
(Neo-Brutalism con borde 2px, Material con relleno) en vez de solo overrides de rol.

### E6 · Ejes de variante: el plugin de Figma manda (crítico)
Hoy el plugin es la fuente de verdad de los ejes (`componentCatalogue.ts`
→ `axes`). shadcn y Escala no coinciden:

| | shadcn Button | Escala Button |
|---|---|---|
| Estilo | `default · secondary · outline · ghost · link · destructive` | `Style`: Solid · Outline · Soft · Ghost |
| Intención | mezclada en variant (`destructive`) | `Color`: Brand · Neutral · Danger · Success |
| Tamaño | `xs · sm · default · lg · icon…` | `Size`: SM · MD · LG · XL |
| Estado | pseudoclases | `State`: Default · Hover · Pressed · Focused · Disabled · Loading |

Tres caminos:
- **A. Adoptar los ejes de shadcn en todo** (catálogo + plugin + exportación).
  Alineación máxima, pero rompe las instancias ya colocadas en archivos Figma y
  pierde Soft y las intenciones Success/Warning.
- **B. Esqueleto de shadcn, matriz de Escala** (recomendado). El `.tsx` conserva
  anatomía y comportamiento de shadcn; el `cva` se **extiende** con los ejes de
  Escala (`variant` = estilo, `intent` = color, `size` = SM…XL). Los nombres
  de shadcn quedan como alias (`variant="destructive"` = Solid + Danger,
  `size="default"` = MD) para que el código de shadcn que pegue un usuario
  siga funcionando. Plugin y Figma no se rompen.
- C. Dos librerías en paralelo. Descartado: dos fuentes de verdad.

### E7 · Estado forzado para el playground y `Live`
El playground fuerza `State: Hover` sin ratón; shadcn solo conoce `:hover`.
Solución: atributo `data-force-state="hover|pressed|focus"` en el raíz del
componente y en la hoja `cn-*` `:hover, [data-force-state=hover]`. `Live`
(docs/specimens) se reduce a no hacer nada: el componente ya reacciona solo.
Los estados que no existen en el catálogo (Badge sin hover) siguen sin pintarse:
la regla "el estado sale de `COMPONENTS`" se conserva.

### E8 · Iconos: Phosphor, no lucide
shadcn importa `lucide-react` (ChevronDown, Check, X…). Codemod a
`PreviewIcon name="caret-down"` para respetar la librería elegida en Icons, el
`iconWeight` del estilo y la regla de peso <16px. Tamaños por `iconRoleOf`, no
`size-4`.

### E9 · Overlays (Dialog, Popover, Tooltip, Dropdown, Sheet, Select)
Radix los porta a `<body>`: saldrían de la tarjeta con `.dark` y las `--ds-*`,
y se pintarían con el tema equivocado. Dos modos:
- **Docs / playground / artefactos**: modo estático, abierto y en línea (como
  hoy `ModalSpecimen`). Prop `inline` que usa `forceMount` y sin `Portal`.
- **Interactivo**: `Portal container={tarjeta}` apuntando al contenedor temático.

### E10 · Cobertura: 59 de Escala vs 58 de shadcn

**Coinciden (≈30, se reemplazan):** Button, ButtonGroup, Input, InputGroup,
Textarea, InputOTP, Select, Combobox, Checkbox, Radio/RadioGroup, Toggle(Switch),
Slider, Field, Label, Badge, Progress, Spinner, Avatar, Card, Divider(Separator),
Accordion, AspectRatio, Modal(Dialog), Popover, Tooltip, ScrollArea,
Toast(Sonner), InlineAlert(Alert), Tabs, Breadcrumb, Pagination, DropdownMenu,
ContextMenu, Command, Sidebar.

**Solo Escala (~24, se reconstruyen con las mismas piezas, mismo estilo de código):**
CloseButton, FABButton, SocialLoginButton, TextLink, AppStoreBadge, InputStepper,
InputTag, FileUpload, Dropzone, PasswordStrength, StatusBadge, Chip, Rating,
FileFormat, Icon, InfoTooltip, AlertBanner, TabMenu, SegmentedControl
(≈ ToggleGroup), Stepper, Navbar, CheckboxGroup, SwitchGroup.

**Solo shadcn (candidatos nuevos, ~22):** AlertDialog, Calendar, Carousel, Chart,
Collapsible, Drawer, Sheet, HoverCard, Menubar, NavigationMenu, Resizable,
Skeleton, Table, Kbd, Empty, Item, NativeSelect, ToggleGroup, Form, Attachment,
Message/Bubble (chat). Cada uno necesita también gate + spec en el plugin.

Dependencias nuevas a medir (tamaño de bundle): `cmdk`, `input-otp`,
`react-day-picker`, `embla-carousel-react`, `recharts`, `sonner`, `vaul`,
`react-resizable-panels`. Cargarlas perezosamente en la página del componente.

### E11 · Exportación de código (la oportunidad grande)
Hoy `snippetFor` emite una API inventada (`<Button leadingIcon={…}>`) que nadie
puede instalar. Con el esqueleto de shadcn:
1. **Registry de Escala**: `GET /r/<componente>.json` con el formato del CLI de
   shadcn, para que un equipo haga
   `npx shadcn add https://escalatokens.com/r/button.json?project=<id>` y reciba
   el componente **ya cableado a sus tokens**.
2. **`globals.css` compatible con shadcn** en Export → Code: las 20 variables
   de E4 resueltas desde el sistema publicado (luz y oscuro). Es un formato de
   salida más, no una arquitectura (no contradice el borrado de la proyección shadcn).
3. `snippetFor`, `agentContextMarkdown` y `get_component` (MCP) pasan a hablar
   la API de shadcn + los ejes extendidos.

### E12 · Plugin de Figma
- Fase 1: el plugin no cambia (camino B mantiene ejes).
- Fase 2: alinear **anatomía** (Card con Header/Content/Footer como capas con
  nombre, `data-slot` → nombre de capa) para que Code Connect pueda mapear
  componente Figma ↔ componente de código.
- Componentes nuevos (E10) llevan gate + spec en el plugin antes que en el
  catálogo, como dice CLAUDE.md.

### E13 · Lo que se rompe y hay que rehacer
- `componentColorFields.generated.ts`: el generador recorre el grafo de
  llamadas de `specimens.tsx`. Con clases `cn-*` se deriva distinto: qué roles
  usa la hoja de cada componente. Mejor que hoy (deja de depender de que un
  helper sea `function` y no flecha).
- Tests de contraste de specimens, `componentColorFields.test.ts`,
  `useIt.test.ts` (figmaSets sigue igual).
- Llamadores de `SPECIMENS`: artefactos (Login, OTP, Pricing, Checkout,
  Profile), `SystemCollage`, `ComponentVariantsView`, `componentArticle`,
  dashboard. **Se conserva la firma `SPECIMENS[key]({ t, v, w, children })`
  como adaptador** sobre los nuevos componentes: ningún llamador cambia en la
  fase de migración.
- `previewTokens.ts` sigue siendo la fuente; solo añade la escritura de `--ds-*`.

### E14 · Fuera de alcance
- La UI de la propia plataforma (TopNav, inspector, rails) **no** se migra a
  estos componentes. Son el sistema del usuario, no el cromo de Escala.
- Base UI / React Aria (E1).
- Los 8 estilos de shadcn como System Styles (E5, fase posterior).

---

## Fases

| Fase | Contenido | Hecho cuando |
|---|---|---|
| 0 · Spike | Vendorizar Button, Input, Card, Dialog; puente E4 + hoja E5 solo para ellos; tras un flag | Se ven idénticos o mejores que los specimens actuales en los 6 System Styles, luz y oscuro, Desktop y Mobile; matriz de contraste en verde |
| 1 · Infraestructura | Codemod (E2/E3/E8), generador de hoja `cn-*`, `data-force-state`, modo `inline` de overlays, nuevo generador de color fields | Tests pasan; adaptador `SPECIMENS` en su sitio |
| 2 · Migración | Por categoría: Acciones → Formularios → Indicadores → Superficies → Feedback → Navegación | Cada categoría: specimen viejo borrado, artefactos sin cambios visuales no deseados |
| 3 · Solo-Escala | Reconstruir los ~24 componentes propios con el mismo patrón | `specimens.tsx` eliminado |
| 4 · Exportación | Registry `/r/*.json`, `globals.css` shadcn, snippets y MCP | Un `npx shadcn add` real instala un Button con los tokens del sistema |
| 5 · Nuevos + plugin | Componentes de E10 y anatomía en Figma | Gate en plugin + entrada en catálogo |

## Decisiones

**Tomadas (2026-10-18):**
1. **Ejes → camino B.** Esqueleto de shadcn; la matriz de variantes sigue siendo
   la de Escala y del plugin; los nombres de shadcn se aceptan como alias.
2. **Variables → las de Escala, y las mismas que el plugin.** Todos los
   componentes se visten con nuestras variables, y lo que pinta la web tiene que
   ser exactamente lo que el plugin enlaza en Figma. Esto resuelve E3: el
   prefijo `ds-` queda como detalle interno (solo para los alias de shadcn); el
   código de los componentes referencia **los mismos nombres de variable que
   exporta `variables.css`**, que son los mismos roles que el plugin enlaza como
   variables de Figma. Ver E15.

3. **Exportación (E11) → sí, ahora.** El registry y el `globals.css` se
   construyeron el 2026-10-18 (ver "Fase 4" en Estado actual).

**Pendientes:**
4. **Nuevos componentes (E10):** ¿cuáles del grupo "solo shadcn" entran primero?

---

## E15 · Una sola receta por componente, compartida web ↔ plugin

### El problema hoy (medido en el código)
Cada componente tiene **dos recetas escritas a mano** que no se leen entre sí:
- la web, en `specimens.tsx` (`ButtonSpecimen`);
- el plugin, en `escala-figma-plugin/src/code.ts` (`buildButton`, ~6 000
  líneas de builders).

Y ya divergen. En `buildButton`:
- *Pressed* en Danger/Success es la fill de reposo **al 88 % de opacidad**
  ("Danger/Success have no pressed tone yet"), mientras la web usa otro valor;
- *Hover* de Outline es `soft` **al 60 %**, de Soft **al 80 %** — números que no
  son variables y que la web no conoce;
- el padding de Outline se corrige a mano (`padH − 1`).

CLAUDE.md ya documenta un caso igual: el borde de InlineAlert estaba al 40 % en
Figma y al 20 % en la vista previa. Mientras haya dos recetas, la promesa
"lo que ves es lo que se exporta" depende de que alguien las mantenga a mano iguales.

### La solución
Un archivo de datos puro, **`src/lib/componentRecipes.ts`**: por componente, por
combinación de ejes, por slot (raíz, label, icono, borde, anillo de foco…),
qué token usa cada propiedad:

```ts
Button: {
  slots: ['root', 'label', 'icon'],
  base: { height: 'size.control.{Size}', radius: 'radius.action',
          paddingX: 'spacing.inset-control', gap: 'spacing.gap-control' },
  variants: {
    'Style=Solid,Color=Brand': {
      root:  { fill: 'action.primary.default' },
      label: { fill: 'content.on-action' },
      ':hover':   { root: { fill: 'action.primary.hover' } },
      ':pressed': { root: { fill: 'action.primary.pressed' } },
    },
    'Style=Solid,Color=Danger': {
      root:  { fill: 'status.critical.surface-solid' },
      label: { fill: 'status.critical.on-solid' },
      …
    },
  },
}
```

Tres lectores, **una fuente**:
1. **Web:** un generador convierte la receta en la hoja `cn-*` (E5)
   (`.cn-button-variant-solid.cn-button-intent-brand { background: var(--…) }`)
   con los nombres exactos que emite `variables.css`. Los `.tsx` de shadcn
   solo ponen las clases.
2. **Plugin:** la receta viaja en `tokens.json` (`componentRecipes`, clave
   aditiva, sin bump de `schemaVersion`, el mismo precedente que `shadowsDark`).
   Cada `buildX` deja de decidir colores: lee el slot y hace `setBoundVariable`
   con la variable de Figma de ese rol. La geometría de Figma (auto layout,
   capas, propiedades de instancia) sigue en el plugin.
3. **Agentes / Docs:** `get_component`, el contexto de agente y el bloque
   "Use it" leen la misma receta, y `componentColorFields.generated.ts`
   desaparece: qué tokens usa un componente es la receta, sin analizar el
   grafo de llamadas.

### Reglas
- **Prohibido un número suelto en una receta.** Ni `0.88` ni `0.6`: si falta un
  estado (pressed de Danger), se **añade el rol** (`status.critical.pressed`
  resuelto con el mismo solver que `action.primary.pressed`), no una opacidad.
  Los huecos actuales se listan y se cierran en la fase 1.
- **Un test de paridad:** para cada componente y combinación de ejes, la lista
  de (slot, propiedad, rol) que la web genera es igual a la que el plugin
  enlaza. El plugin exporta su lista desde un modo seco (`dryRun`) que no toca
  Figma; el test la compara con la receta.
- **Un cambio de receta republica.** Al cambiar la receta cambia `tokens.json`,
  así que el auto-sync ya lo empuja a Figma; no hace falta un camino nuevo.
- Las anatomías de shadcn (`CardHeader` / `CardContent` …) dan los nombres de
  los slots, y esos nombres pasan a ser los nombres de capa en Figma (E12).

### Efecto en las fases
- **Fase 0** añade: la receta de Button/Input/Card/Dialog + el test de paridad
  sobre esos cuatro, y `buildButton` leyendo la receta.
- **Fase 2** (migración por categoría) se hace **en los dos repos a la vez**:
  una categoría está terminada cuando su specimen web y sus `buildX` del plugin
  leen la misma receta y el test de paridad pasa.

---

## Estado de la fase 0 (2026-10-18)

**Hecho, tras el flag `?skeleton=shadcn`** (se recuerda por navegador; `?skeleton=legacy` lo apaga):
- `lib/componentRecipes.ts`: receta de Button, Input, Card y Modal. Solo referencias
  a tokens, sin números. Viaja en `tokens.json` como `componentRecipes`.
- `lib/recipeStyles.ts` (receta → hoja con `var(--…)`) y `lib/recipeVars.ts`
  (el tema previsualizado → variables en el contenedor).
- `components/escala-ui/`: button, input, card y dialog con el esqueleto de
  `bases/radix` de shadcn (licencia MIT y `UPSTREAM.md` incluidos). Los alias de
  shadcn (`variant="destructive"`, `size="default"`) funcionan.
- 9 roles nuevos para que no haga falta ninguna opacidad: `status.*.surface-solid-hover`
  y `-pressed` (las cuatro severidades) y `surface.selected-pressed`. 63 → 72 roles.
- `variables.css` emite ahora las variables de los roles Categorical
  (`--color-action-primary-default`, …), en `:root` y en cada bloque de tema. Antes
  no existían, aunque el bundle de agentes ya las recomendaba.
- Plugin: `buildButton` pinta desde `componentRecipes` cuando el payload la trae
  (relleno, borde, tinta y anillo). Sin receta construye exactamente como antes.
- `componentRecipes.test.ts`: cobertura de todas las combinaciones de ejes del
  catálogo, solo referencias, roles reales resueltos en claro y oscuro, estados
  sólidos distintos y `tokens.json` idéntico a lo que lee la web.

**Medido en el navegador** (Cupertino / Glass): el Button nuevo coincide con el
legado en fondo, tinta, alto, radio y tipografía; los 13 casos de color × estilo ×
estado pintan exactamente el rol de la receta. Diferencia esperada: el padding X
pasa de 18 a 16 px porque ahora sale de un paso de espaciado.

**Pendiente:**
- Plugin: la geometría (alto, padding, radio) del Button sigue en el plugin; Input,
  Card y Modal aún no leen la receta. El test de paridad del lado del plugin
  (`dryRun`) no existe: hoy la paridad se garantiza porque los dos leen la misma
  tabla, no porque un test compare lo que el plugin enlaza.
- El plugin no está empaquetado en `public/escala-figma-plugin.zip`
  (`npm run bundle:plugin`) ni tiene nueva versión.
- No revisado: el tablero de artefactos del Generador con el flag encendido, y los
  seis System Styles uno a uno.
- Los vars de un overlay porteado (`Modal.overlay`) solo existen si `variables.css`
  está en `:root`; en la vista previa el diálogo va siempre `inline`.

---

## Estado actual (2026-10-18, cierre de la migración)

**Web — hecho.**
- Los 59 componentes del catálogo se pintan con un componente de `components/escala-ui/`
  (esqueleto de shadcn, Radix donde shadcn lo usa) y su receta en `lib/recipes/*.ts`.
  `specimens.tsx` es solo el registro y los helpers compartidos (3 222 → ~590 líneas).
- El flag `?skeleton` y los specimens viejos ya no existen: una sola render por componente.
- El generador AST de "color fields" se borró: inspector, mapa de tokens y contexto de
  agentes leen la receta (`componentRoles.test.ts`).

**Plugin — hecho (0.6.0).**
- **Un solo paso aplica la receta a todos los componentes** (`applyRecipe` en `code.ts`,
  llamado después de cada `build` y antes de `fitRadii`). Lee `recipeBindings`
  (`escala-figma-plugin/src/recipes.ts`): pintura (`fill`, `stroke`, `text`, `ring`) y
  geometría (`paddingX/Y`, `gap`, `radius`, `strokeWidth`, `strokeTop/BottomWidth`,
  `height`, `minHeight`, `width`). Una longitud se resuelve con `dimensionRefPx` y se
  enlaza a la variable del rol (o al primitivo de Dimensión de ese px). Lo que no se
  resuelve conserva el px del builder; nada se adivina.
- **La anatomía es el nombre de capa.** Cada builder nombra sus capas como los slots de
  la receta (`track`, `indicator`, `title`, `item`…). Reglas de nombre:
  - `icon-leading` es el slot `icon` (raíz antes del guion);
  - un estado de datos del web es un sufijo: `item[data-highlighted]` → `item-highlighted`,
    `cell[data-active="true"]` → `cell-active`, `node[data-state="done"]` → `node-done`,
    `link[aria-current="page"]` → `link-page`. La capa recibe primero el slot base y luego
    el cualificado;
  - los pseudo-estados (`:hover`) no tienen capa: en Figma un estado es su propia variante.
  - Un pozo de icono (`makeIconSlot`) lleva `pluginData glyph=1`: se tinta con la tinta del
    slot que lo contiene, se llame como se llame (`close`).
- **Diferencias documentadas, no huecos:** `RECIPE_FIGMA_ANATOMY` en `recipes.ts` dice qué
  partes no dibuja Figma y por qué (el Textarea de Figma es solo la caja; el `pill` que
  se desliza en TabMenu / SegmentedControl / Pagination / Sidebar es el relleno del ítem
  seleccionado; ButtonGroup e InputStepper separan con bordes; Card sin cuerpo; Avatar sin
  foto; flecha de Popover / Tooltip) y cuándo la raíz del web es una capa interior
  (Combobox → `trigger`).
- Builders reconstruidos para coincidir con el web: FileUpload (botón + fila de archivo con
  progreso; antes era una zona de soltar), Progress (cabecera label · value + track),
  Card (header · footer con enlace), Modal (header, footer, close en la esquina),
  InlineAlert (título + descripción), AlertBanner (una línea, sin estilo Solid: el web no
  lo tiene), Toast (chip inverso con acción y cierre), Spinner (el anillo es el
  componente), Badge (punto de estado con propiedad on/off), Dropzone (pozo de icono +
  enlace), InputGroup (separadores y botón ghost), Tabs (subrayado = borde inferior del
  trigger), Command (el borde bajo la búsqueda es de la fila).
- Una capa de slot ausente en TODAS las variantes se reporta una vez en el Log
  ("recipe slot … has no layer").

**Tests de paridad (`componentRecipesPluginParity.test.ts`).**
- `recipeBindings` == receta del web, slot a slot, para cada combinación de ejes del catálogo.
- Cada longitud que aplica el plugin se resuelve contra el `tokens.json` real.
- Cada builder nombra una capa para cada slot de su receta (`anatomyGaps`, análisis del
  fuente de `code.ts`), y cada diferencia de `RECIPE_FIGMA_ANATOMY` nombra slots reales.
- Lo que NO prueba: que Figma acepte cada `setBoundVariable` (eso solo se ve en Figma) ni
  la geometría que el builder decide fuera de la receta (alineación, anchos de ejemplo).

**Fase 4 · Exportación — hecho (2026-10-18, E11.1 y E11.2).**
- **Registry**: `GET /r/<item>.json?project=<id>[&brand=<tema>]` (rewrite en `vercel.json` →
  `api/registry.ts`; en `vite dev` lo sirve `devRegistry` en `vite.config.ts`, y
  `?project=dev` usa el sistema por defecto). `/r/registry.json` es el índice; `/r/theme.json`
  instala solo las variables de shadcn. Mismas puertas que `GET /api/tokens` (404 · 410 · 402
  de licencia · rate limit): lee el mismo Blob.
- **Un ítem por ARCHIVO de `components/escala-ui/`** (53), no por clave del catálogo:
  `dialog` lleva el Modal, `button` lleva Button + CloseButton + FABButton. Las 59 claves
  tienen ítem (`registryItemFor`, test).
- **El código instalado es el MISMO componente**: `npm run gen:registry-sources` copia
  `escala-ui/` a `lib/registry/escalaUiSources.generated.ts` con un codemod
  (`escalaUiTransform.ts`): `../../lib/utils` → `@/lib/utils`, `./x` →
  `@/components/ui/x` + `registryDependencies` a `/r/x.json` del mismo sistema, los glifos de
  `ui/icons` se incrustan, `iconOf(N)` se resuelve. Otro import relativo LANZA. Un test falla
  si el generado no coincide con los componentes.
- **La apariencia es la receta**: `recipeCss` → campo `css` del ítem (`@layer components`).
  Un selector repetido en la receta (base + estado Default) recibe `:where(*)` en vez de
  fusionarse, para no moverlo en la cascada.
- **Los valores van en `css` (`:root` / `.dark`), NO en `cssVars`**: medido con el CLI real,
  `cssVars` los copia a `@theme inline` (`--color-color-action-…`, `--shadow-lg:
  var(--shadow-lg)`), que renombra la escala de sombras/radios de Tailwind. Los nombres son
  los de `variables.css` (`cssVarOf`); `.dark` solo lleva lo que cambia (colores, sombras).
  Resueltos desde `tokens.json` por `lib/registry/systemValues.ts` (`resolveToken` para
  longitudes, `colors.architecture` para roles, `typography.roles` para tipos). Solo la
  lectura Desktop: el escalón tablet/móvil sigue en `variables.css`.
- **`globals.css` de shadcn** (`lib/shadcnGlobals.ts`, `SHADCN_ROLE_MAP`): Export → Code →
  pestaña **shadcn**. Tabla E4 con dos cambios medidos: `--input` → `border.strong` (ya no
  existe `border.control`; `strong` ES la frontera de control) y `--accent` →
  `action.ghost.hover` (el `ghost.neutral` del plan no existe en el payload). Añadidos
  `popover/accent/destructive-foreground`, `sidebar-*` y `--radius` = `radius.action`;
  `chart-1…5` = `chartPalette` (movido a `lib/chartPalette.ts`) sobre el tono del primario.
- **Probado con el CLI real** (`npx shadcn@latest add`, Vite + Tailwind v4 en limpio): Button,
  Input, Card y Dialog se instalan y pintan con el sistema (primario `#2c67dc`, alto 40px =
  `size.control`, radio 8px = `radius.action`, claro y oscuro); los 53 ítems juntos instalan
  y pasan `tsc --strict`. Nota: el `utils` actual de shadcn instala el paquete npm `cn`.
- Tests: `shadcnRegistry.test.ts` (forma del ítem, cada variable que lee la receta tiene
  valor para cada ítem, mapa E4 claro/oscuro, selección de marca, generado sincronizado).
- Módulos que importa la API llevan imports `.js` (Node ESM en Vercel): `componentRecipes`,
  `recipes/*`, `recipeStyles`, `fontStack.ts` (extraído de `fonts.ts`), `chartPalette.ts`.

**Abierto.**
- **MCP archivado (decidido 2026-10-18): E11.3 NO se hace por ahora.** El MCP hospedado está
  pausado (410) y no se toca; `get_component` sigue con la API vieja hasta reactivarlo.
  (`snippetFor` / `agentContextMarkdown` sí podrían migrar aparte, sin tocar el MCP.)
- **Fase 4 · Exportación — lo que falta:** probar el registry contra un sistema publicado
  real en producción tras el deploy (en local se probó con `?project=dev`).
- **Fase 5 · Nuevos:** los ~22 de "solo shadcn" (Calendar, Sheet, Table…). Cada uno
  necesita gate + spec en el plugin antes que entrada en el catálogo. Decisión 4 pendiente.
- `font` y `shadow` de la receta siguen en el builder (estilos de texto y de efecto son
  objetos propios de Figma); `paint` / `strokeTop` (partes de un vector) también.
- Comprobar en Figma un sync completo con 0.6.0: el Log debe salir sin "recipe slot … has no
  layer". Las instancias ya colocadas pierden overrides de las capas renombradas (pasa en
  cada reconstrucción de todos modos: el plugin recrea los hijos).

