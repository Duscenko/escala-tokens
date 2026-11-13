# Combobox — contract (Figma → code)

Source: `Escala Design System (Real)` (`7j5zukN5HpihGVJMmyjA20`), page `❖ Combobox (✓) WIP`,
read read-only on 2026-11-12. Four sets, each a catalogue key, a recipe and a part of
`src/components/escala-ui/combobox.tsx`.

| Set | Node | Axes | Variants |
|---|---|---|---|
| Combobox | 413:1478 | Size sm·default·lg × State Default·Hover·Focused·Open·Invalid·Disabled·Loading × Variant default·compact × Shape rounded·pill × Value placeholder·filled | 168 |
| ComboboxPopover | 415:489 | Content list·grouped·empty × Size | 9 |
| ComboboxItem | 406:140 | Size × State Default·Focused·Selected·Disabled | 12 |
| ComboboxGroupLabel | 406:147 | Size | 3 |

## API (Figma → React)

**Combobox** — Size → `size` · State → live (pointer, keyboard, list) or `forceState`;
Invalid / Disabled / Loading → `aria-invalid` / `disabled` / `loading` · Variant → `variant`
(default fills its width, compact hugs) · Shape → `shape` · Value → derived (`value` shows the
option's label = SelectedText, else the placeholder) · IconLeadingVisible + IconLeadingIcon →
`leading` (undefined = MagnifyingGlass, null hides) · Placeholder → `placeholder` (default
"Search framework...") · ClearVisible → `clearable` · ChevronVisible → `chevron` · `options`
(with `group`, `description`, `icon`, `trailing`, `disabled`), `emptyText`, `footer`.

**ComboboxPopover** — Content → `content` · Size → `size` · FooterVisible + FooterText →
`footer` · EmptyText → `emptyText` (default "No match"). Groups: `ComboboxGroup` (a
`role="group"` named by its ComboboxGroupLabel) and `ComboboxSeparator`.

**ComboboxItem** — Label → children · DescriptionVisible + Description → `description` ·
IconLeadingVisible + IconLeadingIcon → `icon` · TrailingVisible + Trailing → `trailing` ·
IndicatorVisible → `indicator` (default on) · State → `highlighted` (Focused), `selected`,
`disabled` or `forceState`.

**ComboboxGroupLabel** — Label → children · Size → `size`.

## Geometry

Combobox (stroke laid out: content starts at padding + 1):

| Size | Height | Padding X | Gap | Glyphs | Type |
|---|---|---|---|---|---|
| sm | Size/control-sm 32 | Spacing/gap-control 8 | 6 | 14 | Type/caption |
| default | Size/control-md 40 | 10 | 6 | Size/icon-sm 16 | Type/body-sm |
| lg | Size/control-lg 48 | Spacing/inset-control 12 | Spacing/gap-control 8 | 18 | Type/body-md |

Radius/action 12 (pill: Radius/full). Default width 280 (fill), compact hugs (180 · 162 · 211
with the placeholder). Order: icon-leading · text · icon-clear · icon-chevron (Loading:
CircleNotch in its place).

Popover: 280 wide, Surface/layer-2, Border/default 1px inside, Radius/overlay 16, Shadow/md,
clips. List padding Spacing/gap-tight all sides. Separator: 1px Border/subtle line padded
gap-tight top and bottom. Empty: Spacing/inset-control all sides, centred, Type/body-sm
(sm: Type/caption), Content/secondary. Footer: min 36, padding X gap-control (lg 10),
Border/subtle TOP stroke only, Type/caption, Content/secondary. Opens 8px below the trigger.

Item: min 28 · Size/control-sm 32 · 36, Radius/control 8, padding gap-tight × 8 · 8 · 10,
gap 6 · 8 · 8, glyphs 14 · 16 · 18, label Type/caption · body-sm · body-md, description and
trailing Type/caption. Focused adds a 1px stroke the file lays out (+1 each side).

GroupLabel: min Size/control-xs 24 · 28 · 28, padding gap-tight × 8 · 8 · 10,
Type/caption · label · label, Content/secondary.

## Colour

Combobox (Size, Variant, Shape and Value do not change it — checked on all 168):

| State | Fill | Stroke | Halo (2px outside) | Inks |
|---|---|---|---|---|
| Default | Surface/input | Border/control | — | Content/primary; placeholder Content/subtle |
| Hover | Surface/input | Border/control-hover | — | idem |
| Focused, Open | Surface/input | Border/focus | Border/ring/default | idem |
| Invalid | Surface/input | Status/critical/border-strong | Status/critical/border | idem |
| Loading | Surface/input | Border/control | — | idem |
| Disabled | Action/disabled/default | Border/control | — | all Content/disabled |

Item: Default none · Focused Surface/muted + Border/focus 1px + Border/ring/default halo ·
Selected Surface/selected + Content/accent check · Disabled every ink Content/disabled.
Label Content/primary, description Content/secondary, trailing Content/subtle.

## Odd things in the file (copied, not fixed)

- The ✕ (`icon-clear`) is an empty instance with no ink; the code inks it Content/primary like
  its sibling glyphs.
- In the `Shape=pill` variants the leading / clear / chevron layers are not bound to their
  boolean properties; the code honours the props on every shape.
- Description (Content/secondary) and trailing (Content/subtle) on Surface/selected and
  Surface/muted measure under AA (3.85 · 2.13 light, 2.18 dark for trailing).
- Shadow/md carries a 1px Elevation/shadow-ring layer; the system's `shadow.md` token renders
  the key + ambient layers only (system-wide, not this component).
