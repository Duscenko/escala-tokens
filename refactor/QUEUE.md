# Escala refactor queue — Storybook + web (from Figma v0.11.0 / v0.11.1)

Source of truth: the Figma file `Escala Design System (Real)` (7j5zukN5HpihGVJMmyjA20).
Every touched component set carries a **Development** annotation with a "Refactor in code" line.
Plan: "Escala Reuse & Composition Audit — Nov 2026".

Legend: `- [ ]` todo · `- [x]` done (append commit hash) · `- [!]` blocked (append reason; the loop stops)

## Project commands (filled in by the first iteration, do not guess)
- lint: `npm run lint`
- typecheck: `npx tsc -b` and `npm run typecheck:storybook`
- test: `npm test`
- storybook build: `npm run build-storybook`
- web build: `npm run build`

## Phase A — shared foundations (code twins of Figma decisions)
- [x] A1 Create `src/lib/icons.ts`: one module that exports every glyph used by `escala-ui` (Phosphor, same names as Figma `icon/*`, loading = `SpinnerGap`). Replace the check path inlined in checkbox, combobox, dropdown-menu, password-strength, stepper, switch. (10cf4c0)
- [x] A2 Replace the remaining inline `<svg>` glyphs in `src/components/escala-ui` with imports from `src/lib/icons.ts` (≤ 8 files per iteration; re-add this task with the files left if not finished). (f13ee92; geometry svgs left inline: arrows, spinners, grips, brand art)
- [x] A3 State order: in the `state` union types and Storybook `argTypes.state.options`, use Default · Hover · Focused · Current|Selected · Disabled for NavItem, TabMenuItem, TabMenuLineItem, DropdownMenuItem, ComboboxItem, SidebarMenuButton (`isActive` → `Current`). (3ea4008; Sidebar full rebuild is C1)

## Phase B — one anatomy, one recipe
- [x] B1 `listItemRecipe(size, state, variant)` in `src/lib/recipes`, used by DropdownMenuItem, ComboboxItem and SidebarMenuButton. Delete `comboboxItemPaint`. Fill on `[data-highlighted]`, ring (`border.focus` + `border.ring.default`) only on `:focus-visible`. Trailing ink `content.secondary`. Story: hover a row → no ring. (62e3370)
- [x] B2 `groupLabelRecipe(size)` used by DropdownMenuLabel, SidebarGroupLabel, ComboboxGroupLabel: `type.caption`, 24 px row, `content.secondary`, lg padding `spacing.inset-control`. Remove `spacing.6+spacing.1`. (a96143b)
- [x] B3 `optionPaint` (InputTagOption): hover/focused `surface.muted`, label `type.body-sm`. (ac1cbc6)

## Phase C — parity gaps
- [x] C1 Rebuild Sidebar from the Figma contract (Sidebar, SidebarGroup, SidebarGroupLabel, SidebarMenuButton with `collapsed`, `trend`, Badge in `trailing`, SidebarBrand). Button radius `radius.control`, padding through roles. Stories for each part. (89772e5)
- [x] C2 Add the missing RadioGroup story. (f7c453d)
- [x] C3 Command: render shortcuts with `Kbd`, not a local `kbd`. (977cf34)

## Phase D — legacy and guardrails
- [x] D1 Move the shadcn skeletons with no story to `src/components/escala-ui/_skeleton/` (sidebar old version, tabs, toggle-group, toggle, context-menu, menubar, command, select, native-select, alert-dialog, sheet, drawer, hover-card, navbar, navigation-menu, label). Add an ESLint `no-restricted-imports` rule: `_skeleton/` may only be imported from the configurator. (bfcbc6d; `label` left in place: field.tsx imports it)
- [ ] D2 Recipe lint (extend the recipe test): fail on `spacing.<number>` in `paddingX`, `paddingY`, `gap` when a role exists, and on a second paint function for a shape `listItemRecipe` or `groupLabelRecipe` already covers.
- [ ] D3 Parity check (GitHub Action on PRs to `main`): every `data-escala` name under `escala-ui` (excluding `_skeleton/`) has a story; list names with no story as a failing check.

## Phase E — web (configurator / platform)
- [ ] E1 Inventory every import of `_skeleton/` in the configurator and previews; write the list into this file under E2–E5 as one task per component.
- [ ] E2 Tabs → TabMenu
- [ ] E3 ToggleGroup → SegmentedControl
- [ ] E4 ContextMenu / Menubar → DropdownMenu
- [ ] E5 Select / NativeSelect → Combobox
- [ ] E6 Delete each skeleton that has no importer left; final parity check passes.
