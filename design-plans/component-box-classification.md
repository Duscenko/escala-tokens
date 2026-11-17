# Component box classification — Black · Gray · White box

Status: **proposal** (2026-11-17). Nothing built yet. Owner decides the open questions in §6.

## 1. The problem, measured

The generator lets a designer pick a radius per axis (Boxes · Fields · Items · Selectors,
`RADIUS_GROUPS` in `src/lib/layoutTokens.ts`). Every axis offers the whole ladder
`RADIUS_AXIS_STEPS` = none · sm · md · lg · xl · 2xl · 3xl · 4xl · **5xl (48px)**. Nothing knows that
some components carry *meaning* in their shape.

| What the user does | What breaks | Why |
|---|---|---|
| Picks the **Pill** preset (ships today) | Checkbox `xs`/`sm` (16px box) gets 8px radius = **a circle** — reads as a radio | Pill sets `selectors: 'lg'` (8px); `CHECKBOX.root.radius = 'radius.control'` (`recipes/forms.ts:903`) |
| Moves Selectors to 2xl / 3xl / 4xl / 5xl | Every checkbox is a circle | same role, no cap |
| Moves Selectors up to round the **badges** | Checkboxes round with them | `radius.control` is shared by 11 unrelated recipes (§3) |
| Moves Fields to 4xl / 5xl | `Avatar` / `FeaturedIcon` *Shape=rounded* become circles (= their *Shape=circle*); `InputOTPSlot` becomes a circle | they read `radius.action` with no cap |
| Picks **Sharp** | `SliderThumb` becomes a square | `SLIDER_THUMB.root.radius = 'radius.control'` (`forms.ts:1149`) — check against Figma, one line, don't edit Figma |
| Reads the Selectors hint "checkbox, radio, toggle, badge" | Radio and Switch never move (they are `radius.pill`) | the copy promises something the recipes don't do |

The precedent for the fix already exists: `TALL_FIELD_RADIUS = 'min(radius.action,radius.2xl)'`
(`recipes/helpers.ts:152`) caps the Textarea so a pill preset doesn't make it a stadium. The recipe
compiler already supports `min(a,b)` and `sub(a,b)`. This proposal turns that one-off into a rule.

## 2. The three classes, in Escala's own terms

What each class **locks** is expressed against Escala's foundations, so it can be checked by a test.

| Class | Locks (never follows a generator axis) | May follow the theme | Slots |
|---|---|---|---|
| **Black box** | Shape (square / circle / track), glyph size (`selector.*`), hit area, motion | Colour roles, stroke width | None — data only (checked, value, count) |
| **Gray box** | Height (`size.*`), hit area, internal padding/gap, state logic, motion | Colour, radius **within a cap**, Variant / Appearance / Size axes | Named slots only (leading / trailing icon, action) |
| **White box** | Its own frame: radius axis, padding, elevation, overlay, close affordance | Radius follows its axis freely (Boxes); nesting checked by `radiusNestingReport` | One free content area accepting any class |

Rule of composition: White ⊃ Gray ⊃ Black. A Black box never contains another component.

## 3. Audit — every contracted component (118 in `spec/contracts/index.json`)

Radius column = the role the recipe reads today. **Risk** = what an axis can do to it now.

### Black box

| Component | Radius today | Shape meaning | Risk | Action |
|---|---|---|---|---|
| **Checkbox** | `radius.control` (Selectors) | square = many | **High** — circle at Pill / ≥ 2xl | Clamp (§4.2) |
| CheckboxItem / CheckboxGroup | via Checkbox | — | inherits | — |
| RadioGroup (item) | `radius.pill` | circle = one | none | keep |
| Switch / SwitchGroup | `radius.pill` | track | none | keep |
| **SliderThumb** | `radius.control` | knob | **Medium** — square at Sharp | verify Figma; likely `radius.pill` |
| Spinner · ProgressCircle | none | ring | none | keep |
| ProgressLine · PasswordStrengthMeter | `radius.pill` | bar | none | keep |
| AvatarStatus · Badge *Type=dot* | `radius.pill` | dot | none | keep |
| StepperIcon / StepperIndicator | `radius.pill` | step marker | none | keep |
| RatingGroupItem | `radius.action` (focus box) | star glyph | low | keep |
| ScrollBar | `radius.pill` | thumb | none | keep |
| Separator · TableDropIndicator · TableResizer | none | line | none | keep |
| TooltipInfoTrigger | `radius.pill` | ⓘ | none | keep |
| Kbd | `radius.control` | key cap | low–medium | cap at `radius.md` |

### Gray box

| Component | Radius today | Risk | Action |
|---|---|---|---|
| Button · IconButton · CloseButton · SocialLoginButton · FABButton · ButtonGroup(+Item/Divider) | `radius.action` / Shape axis | none — pill is a legitimate button | keep; Shape axis stays a Figma decision |
| TextLink | `radius.control` (focus outline) | low | follows Selectors by accident → move to cap |
| Input · NumberInput · Combobox · DatePickerTrigger · InputTag | `radius.action` | none | keep |
| Input inner adornment (`forms.ts:67`) | `radius.control` | low | must stay concentric with the field: `sub(radius.action, inset)` |
| Textarea | `TALL_FIELD_RADIUS` | none (already capped) | the model to copy |
| **InputOTPSlot** | `radius.action` | **Medium** — circle slot at 4xl/5xl | cap `min(radius.action, radius.xl)` |
| InputTagChip | `radius.control` | low | — |
| InputTagOption · ComboboxItem · DropdownMenuItem · CalendarDay · PaginationLink · CalendarHeader / Presets | `radius.action` / row radius | none | keep |
| Badge (*rounded*) · Chip | `radius.control` / `radius.action` | low — the reason users raise Selectors | decouple from Checkbox (§4.4) |
| **Avatar · FeaturedIcon** *Shape=rounded* | `radius.action` | **Medium** — becomes identical to *Shape=circle* | cap `min(radius.action, radius.xl)` so the two shapes stay distinct |
| Slider (track, range, value tooltip) | `radius.control` | low | track is a bar → `radius.pill` (verify Figma) |
| TabMenu(+Items) · SegmentedControl(+Item) · NavItem · SidebarMenuButton · AccountMenuTrigger · Breadcrumb(+Item/Ellipsis/Separator) · Pagination · Stepper(+Item) | `radius.action` / `radius.item` / `radius.control` | low | keep; Breadcrumb's `control` follows the §4.4 split |
| TooltipContent | `radius.action` | low (one-line pill acceptable) | keep |
| Toast · Alert | `radius.overlay` / `radius.container` | none | Gray: message + one action slot; position & motion locked |
| Field · Label · FileUploadItem · PasswordStrengthRule · TableCell / Head / Row / Media / Trend / Caption / Empty / Loading / LoadMore | various | none | keep |
| Brand · SidebarBrand | — | none | logo slot only |

### White box

| Component | Radius today | Notes |
|---|---|---|
| Card | `radius.container` | free content |
| Modal (+Header/Footer = Gray parts) | `radius.overlay` | header, overlay, ✕ locked; body free |
| Sheet · Popover (+Footer) · DatePickerPopover · ComboboxPopover · DropdownMenu | `radius.overlay` | frame locked, list rows Gray |
| Accordion (+Item) | `radius.container` / none | trigger row = Gray, panel = White |
| Image | `radius.container` / none | — |
| ScrollArea · Table · FileUpload(+Dropzone) · PasswordStrength · Calendar(Month/Footer) · Sidebar(+Group/Label) · CheckboxGroup · SwitchGroup | `radius.container` | layout frames |
| Blocks (`blocks/*.contract.json`) | — | compositions, always White |

## 4. Strategy — five layers, cheapest first

### 4.1 Classification as data (source: catalogue → contracts)
- Add `box: 'black' | 'gray' | 'white'` and `locks: ('shape'|'size'|'hit'|'radius'|'motion')[]` to each
  entry in `src/lib/componentCatalogue.ts`.
- `npm run gen:contracts` copies it into `spec/contracts/<Key>.json` and `index.json` → agents, the agent
  package and Storybook docs read it for free. No new surface (CLAUDE.md "Do not bring back").
- Storybook docs page shows a one-line badge: *Black box — shape is fixed by convention*.

### 4.2 Shape guard in the recipe (code owns compilation)
- A Black box part that carries meaning reads `min(<axis role>, <cap>)`, like `TALL_FIELD_RADIUS`.
  New helper constants in `recipes/helpers.ts`, e.g. `SELECTOR_SQUARE_RADIUS`.
- Checkbox proposal: ≤ 25 % of its side → `default` (20px) `min(radius.control, radius.md)` = 6;
  `xs`/`sm` (16px) `min(radius.control, radius.sm)` = 4. Sharp still gives 0.
- The guard sits in the recipe, so web, Storybook, CSS export and the plugin (parity test) all get it.
- Figma keeps binding `Radius/control`; Figma has no `min()`, so the file isn't touched. The plugin's
  base cut gets the clamped px.

### 4.3 Guard in the generator (prevent, don't only repair)
- Selectors axis ladder → `none · xs · sm · md` (0–6px) instead of the full `RADIUS_AXIS_STEPS`.
  Per-axis ladders: `RADIUS_AXIS_LADDER[group.key]`.
- Pill preset: `selectors: 'lg'` → `'md'`. Store migration only re-maps systems that sit exactly on the
  old preset (version bump, append-only).
- Fix the Selectors hint copy: "checkbox, badge, kbd" (radio/switch never move).
- Direct edit of `radius.control` in Variables: allowed (it's the user's system), but an inline note
  "Checkbox is capped at 6px — it stays a square" so the cap is never a surprise.

### 4.4 Untangle the overloaded role (needs the owner + Figma first)
`radius.control` drives Checkbox **and** Kbd, TextLink focus, BreadcrumbItem/Ellipsis, Slider track,
SliderThumb, Input adornment, InputTagChip, Badge rounded, TableMediaCell. Raising it for badges
rounds checkboxes. Figma owns the names (hard rule 2: never invent), so this is a **finding for the
Figma file**, not a code change: either the badge/chip/kbd family moves to an existing role
(`Radius/item`), or the file adds one. Until then 4.2 makes it harmless.

### 4.5 Enforce it with a test
`src/lib/__tests__/componentBoxGuard.test.ts`:
- For every `RADIUS_ROLE_PRESETS` entry **and** every step of every axis, resolve each Black box
  recipe and assert: Checkbox radius / side ≤ 0.3; Radio, Switch, dot, thumb = `full`.
- Gray box: `height`, `hit`, padding resolve to the same token at every radius pick.
- Gray box *Shape=rounded* vs *Shape=circle* never resolve to the same px (Avatar, FeaturedIcon).
- White box: `radiusNestingReport` clean at every preset.
- Every catalogue entry has a `box` (no unclassified component can ship).

## 5. Order of work

1. **4.2 Checkbox clamp + 4.5 test** — fixes the live bug, one PR, small.
2. **4.3 generator ladder + Pill preset + hint copy** — store version bump.
3. **4.1 `box` in catalogue → contracts → Storybook badge.**
4. Remaining Gray caps: InputOTPSlot, Avatar/FeaturedIcon rounded, Kbd.
5. **4.4** — raise with the owner on the Figma experiment page (before/after), then follow the file.

## 6. Open questions for the owner

1. Checkbox cap: 25 % of the side (6 / 4px) — or a single `radius.sm` (4px) for every size?
2. SliderThumb and Slider track on `radius.control` — is that what the Figma file binds, or a code drift?
3. Does Switch ever need a square variant (some brands ship them)? If yes it becomes a Figma Shape axis, never an axis of the generator.
4. Badge *Shape=rounded*: keep it on the Selectors axis (DaisyUI) or move it to Items?

**Figma answer to Q2 (read from the library, 2026-11-17).** Not a drift: the file binds `Radius/control`
on SliderThumb (the set root, 14 / 16 / 20 px, so today a 4 px-rounded square, not a circle) and on
Slider's `track`, `fill`, `thumb` and `tooltip`. `SLIDER_THUMB` and `SLIDER` in `recipes/forms.ts` read
the same role, so code is the twin. Consequence: Slider sits on the Selectors axis too and rounds with it
(harmless: a thumb may become a circle). The same scan lists every set that binds `Radius/control`
(≈45, in five jobs: checkbox family · tag family · text focus rings · Slider · media) and the
before / after for §4.4 is on the `🧪 Experiments` page:
[board](https://www.figma.com/design/7j5zukN5HpihGVJMmyjA20/?node-id=2059-172) ·
[Checkbox today vs cap](https://www.figma.com/design/7j5zukN5HpihGVJMmyjA20/?node-id=2059-12) ·
[proposal, not applied](https://www.figma.com/design/7j5zukN5HpihGVJMmyjA20/?node-id=2059-126) ·
[inventory](https://www.figma.com/design/7j5zukN5HpihGVJMmyjA20/?node-id=2059-165).
Finding `FIG-002:Radius/control-overloaded` (Open, waits for the owner).

**§4.4 decided (2026-11-17, DEC-2026-11-17-002).** Owner chose option (a): Badge `Shape=rounded`, Kbd and
InputTagChip moved to `Radius/item` in the Figma file, and the recipes followed. Q4 is answered too: the
rounded Badge now lives on the Items axis. `Radius/control` keeps Checkbox, Slider, link focus rings and media.
