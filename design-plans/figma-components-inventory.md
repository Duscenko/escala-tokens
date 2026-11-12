# Componentes: Figma (fuente) frente al código — inventario y estrategia

Fecha: 2026-11-12 · Estado: **análisis, nada cambiado en código**.
Fuente: `Escala Design System (Real)` (`7j5zukN5HpihGVJMmyjA20`), las 54 páginas `❖`,
leídas con la Plugin API (`componentPropertyDefinitions` de cada set). Regla del dueño:
**Figma manda en componentes; la estructura de shadcn se reemplaza** (CLAUDE.md, 2026-11-12).

## 1. Cruce página por página

Leyenda: **=** existe y casa · **≠** existe pero no casa (rehacer) · **+** no existe en código ·
**→** existe con otro nombre (renombrar).

### Buttons
| Figma | Código | Diferencia |
|---|---|---|
| Button (Variant 7 × Size 4 × State 6; Label, IconLeading/Trailing) | ≠ Button | falta `destructive-outline`; quitar `icon*` de Size |
| IconButton (Variant 6 × Size 4 × State 6; Icon, BadgeVisible) | + | hoy es `Button size="icon*"` |
| SocialLoginButton (Brand 9 × Appearance white/brand × Size lg/default × State × IconOnly) | ≠ SocialLoginButton | código: Provider google/apple/github/figma, sin Appearance ni IconOnly |
| FABButton (Appearance solid/soft × Shape × Size × State × Variant inverse/default/secondary) + FABGroup | + | se fusionó en Button icon-lg |
| CloseButton (Appearance 4 × Shape 3 × Size 5 × State × Variant default/inverse) | + | hoy ghost icon-sm |
| ButtonGroup + ButtonGroupItem + ButtonGroupDivider | ≠ ButtonGroup | código: solo `orientation` (shadcn) |
| TextLink (Variant 6 × Size 4 × State 6 incl. Visited) | + | hoy Button link |

### Inputs
| Figma | Código | Diferencia |
|---|---|---|
| Field (Size × State Default/Invalid) | ≠ Field | código: `orientation` |
| Input (Type 11: phone, currency, password, url, upload, tag, copy-link, credit-card, search… × Value × State) | ≠ Input + InputGroup | código: `<input>` desnudo |
| NumberInput | → InputStepper | |
| Textarea (+ Loading) | ≠ Textarea | |
| InputOTP + InputOTPSlot (Variant outline/filled/underline × Length) | ≠ InputOTP | |
| PasswordStrength + Meter + Rule | ≠ PasswordStrength | |
| InputTag + Chip + Option (Layout inline/outside) | ≠ InputTag | |
| Combobox + Popover + Item + GroupLabel (Shape, Variant default/compact) | ≠ Combobox | |
| DatePicker (Trigger + Popover, single/range) | + | |
| Calendar + Day/Header/Month/Presets/Footer | ≠ Calendar | |
| FileUpload + Dropzone + Item | ≠ FileUpload + Dropzone | Dropzone pasa a parte de FileUpload |

### Selection controls
| Figma | Código | Diferencia |
|---|---|---|
| Checkbox + CheckboxItem + CheckboxGroup (Variant 6 colores) | ≠ Checkbox | |
| RadioGroup: Radio + RadioItem + RadioGroup + RadioCard | ≠ RadioGroup | RadioCard nuevo |
| Switch (Thumb short/long, Io) + SwitchGroup | ≠ Switch | |
| SegmentedControl + Item | = / revisar | |
| Slider + SliderThumb (Range) | ≠ Slider | |
| RatingGroup + Item (star/emoji) | → Rating | |

### Data display
| Figma | Código | Diferencia |
|---|---|---|
| Avatar (Type × Size 7 × Shape × Variant 6 × Appearance) + AvatarGroup + AvatarStatus | ≠ Avatar | |
| FeaturedIcon | + | |
| Image (Ratio 6 × Shape) | → AspectRatio | |
| Badge (Appearance 4 × Shape × Size × Type 4 × Variant 7) | ≠ Badge (+ StatusBadge) | |
| Chip (Variant × Appearance × Size 5 × State × Shape) | ≠ Chip | |
| Kbd | = / revisar | |
| Accordion + AccordionItem (Variant 6) | ≠ Accordion | |
| Table + 13 partes (Header, Row, Head, Cell, Media/Trend cells, Empty, Loading…) | ≠ Table | |

### Feedback · Overlays · Navigation · Layout
| Figma | Código | Diferencia |
|---|---|---|
| Alert (Variant 6 × Appearance 4 × Layout × Size) | ≠ Alert | código: default/destructive |
| Toast (Appearance 4 × Variant 6) | → Sonner | |
| ProgressLine + ProgressCircle | → Progress (+ Spinner) | |
| Modal + ModalHeader + ModalFooter | → Dialog (+ AlertDialog, Sheet, Drawer) | |
| Popover + PopoverFooter | ≠ Popover | |
| DropdownMenu + Footer + Item + Label | ≠ DropdownMenu | |
| Tooltip: TooltipInfoTrigger + TooltipContent | ≠ Tooltip | |
| Breadcrumb + Item + Ellipsis + Separator | ≠ Breadcrumb | |
| TabMenu + Item + LineItem | ≠ TabMenu (+ Tabs) | |
| NavItem · Brand · AccountMenuTrigger | + | |
| Sidebar + MenuButton + Group + GroupLabel + Brand | ≠ Sidebar | |
| Pagination + Link + Ellipsis | ≠ Pagination | |
| Stepper + Item + Indicator + Icon | ≠ Stepper | |
| Separator (Tone, Variant dashed, Align con label) | ≠ Separator | |
| ScrollArea + ScrollBar | ≠ ScrollArea | |

### Blocks (composiciones, sin lógica nueva)
Auth (12 pantallas) · Overlay (15 diálogos) · HeaderNavigation (5) · SidebarNavigation (2) ·
Marketing (6). En código no existen como bloques.

### Solo en código (Figma no los documenta)
ToggleGroup · Toggle · AppStoreBadge · Select · NativeSelect · Label · Spinner · FileFormat ·
**Card** · Collapsible · AlertDialog · Sheet · Drawer · HoverCard · Item · Attachment · Message ·
Bubble · Resizable · Carousel · Chart · Skeleton · Empty · Tabs · Menubar · NavigationMenu ·
ContextMenu · Command · Navbar. (Icon vive en la página `★ Icon`, no en `❖`.)

**Resumen:** de 54 páginas, ~2 casan, ~35 hay que rehacer, ~8 renombrar, ~10 son nuevas.
~29 componentes del código no tienen página en Figma.

## 2. Gramática de ejes que Figma ya usa (y sus incoherencias)

Casi todo el archivo habla un mismo idioma, y conviene congelarlo como API pública:

| Eje | Valores |
|---|---|
| `Variant` (intención) | default · secondary · inverse · critical · success · warning · info |
| `Appearance` | solid · soft · outline · ghost |
| `Shape` | rounded · pill · square · circle |
| `Size` | 2xs · xs · sm · default · lg · xl · 2xl |
| `State` | Default · Hover · Pressed · Focused · Disabled (+ Loading, Invalid, Selected…) |

Pero hay excepciones que, copiadas tal cual, quedan como API pública incoherente:
- **Button** mete apariencia en `Variant` (outline, ghost, link, destructive-outline) y dice
  `destructive`; el resto separa `Appearance` y dice `critical`. DropdownMenuItem también dice
  `destructive`.
- **Toast** `Appearance` usa `filled` donde el resto usa `solid`.
- **Accordion** `Variant` compone dos ejes en uno (`ghost-underline`, `outline-rounded`…).
- **Separator** usa `Tone` (default/subtle/strong) y `Variant` para dashed.
- **Checkbox/Radio** tienen `Variant` con colores; **Tooltip** con `inverse`, `critical`, `info`.

## 3. Traducción de propiedades Figma → React (una regla para todos)

| Figma | React |
|---|---|
| eje VARIANT (`Variant`, `Size`, `Appearance`, `Shape`…) | prop del mismo nombre en camelCase, mismos valores |
| `State=Hover/Pressed/Focused` | no es prop: CSS (`:hover`, `:active`, `:focus-visible`); `forceState` solo para docs/Storybook |
| `State=Disabled/Loading/Invalid` | `disabled` · `loading` · `invalid` (booleanos) |
| `Label: TEXT` | `children` |
| `XVisible: BOOLEAN` + `XIcon: INSTANCE_SWAP` | un solo `x?: ReactNode` (presente = visible) |
| `Content: SLOT` | `children` o subcomponentes (`ModalHeader`, `ModalFooter`) |
| Set hijo (`ButtonGroupItem`, `TableRow`) | subcomponente exportado con el mismo nombre |

## 4. Recomendaciones (pendientes de aprobación)

1. **Limpiar la gramática en Figma antes de escribir código.** Lo que copie el código queda
   como API pública; renombrar después rompe a quien la use. Primero el Button: o adopta
   `Variant` (intención) × `Appearance` como el resto, o se documenta por qué es la excepción.
   `destructive` → `critical`, `filled` → `solid` en Toast.
2. **Congelar el archivo como inventario versionado** (`spec/figma-components.json`, como ya
   existe `spec/figma-variables.txt`) y un test que compare catálogo ↔ inventario. Cada
   componente reconstruido pasa de rojo a verde; nadie puede reintroducir un hueco.
3. **Los 29 componentes que solo existen en código se congelan**: siguen funcionando, no se
   les añade nada, y entran o salen cuando Figma los documente.
4. **El plugin sigue al código por familias**: hoy construye en el archivo del usuario los
   sets con nombres de shadcn. Cada familia reconstruida cambia receta + componente + builder
   del plugin a la vez, con el test de paridad en verde.
5. **Orden**: Buttons → Inputs → Selection → Data display → Feedback → Overlays → Navigation →
   Layout → Blocks (los bloques al final: solo componen piezas ya existentes).

## 5. Red de seguridad (fase 0, hecha 2026-11-12)

| Pieza | Archivo |
|---|---|
| Script de lectura (solo lectura, corre en Figma) | `scripts/figma/components-inventory.figma.js` |
| Guardado con checksum (rechaza copias que no son lo que Figma devolvió) | `scripts/figma/save-inventory.mjs` · `npm run figma:inventory:check` |
| Foto del archivo (generada, nunca a mano) | `spec/figma-components.json` — 54 páginas, 156 sets, checksum `be79d166` |
| Libro de deuda (a mano) | `spec/figma-components.status.json` — `pending` (rebuild 33 · new 11 · part 64 · rename 8 · block 40) + `codeOnly` (32 congelados) |
| Test en CI (`npm test`) | `src/lib/__tests__/figmaComponentsParity.test.ts` |

**Refrescar la foto después de cambiar Figma:**
1. Ejecutar `scripts/figma/components-inventory.figma.js` en el archivo (MCP `use_figma`,
   o la consola de plugins). Devuelve `{ checksum, json }`.
2. Guardar `json` en un archivo y correr
   `node scripts/figma/save-inventory.mjs <archivo> <checksum>`.
3. `git diff spec/figma-components.json` es el cambio de Figma, legible en el PR.
   Añadir valores/componentes = menor. Renombrar/quitar = mayor: alias de compatibilidad.
4. `npm test`: el test dice qué componentes dejaron de casar o qué entradas sobran.

**Qué compara hoy:** nombre del set y ejes de variante (valores, sin orden). Las
propiedades no-variante (`Label`, `IconLeadingVisible`…) se traducen a React con la regla
del §3 y se comprobarán cuando cada familia se reconstruya. Changesets llega con
`packages/ui` (F4 del plan del Button): hoy no hay paquete que versionar.
