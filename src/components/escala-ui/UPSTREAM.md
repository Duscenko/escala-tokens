# escala-ui — upstream

Skeletons vendored from **shadcn/ui** (`apps/v4/registry/bases/radix/ui/`),
MIT — see `LICENSE-shadcn.md`. Source: the `ui-main` archive downloaded
2026-10-18 (no commit hash in the archive; record one on the next sync).

| File | Upstream | What changed |
|---|---|---|
| `button.tsx` | `bases/radix/ui/button.tsx` | shadcn's `variant` / `size` values verbatim (`data-variant`, `data-size`); `cn-*` classes → `data-escala` + the recipe sheet; adds `forceState`, `loading`, `recipe` |
| `badge.tsx` | `bases/radix/ui/badge.tsx` | `variant` verbatim; plus Escala's StatusBadge |
| `alert.tsx` | `bases/radix/ui/alert.tsx` | `variant` verbatim; adds `AlertIcon` for a non-svg glyph |
| `sonner.tsx` | `bases/radix/ui/sonner.tsx` | wraps the Toaster in `data-escala="Sonner"`; colours from the recipe, not CSS vars |
| `avatar.tsx` | `bases/radix/ui/avatar.tsx` | `size` verbatim |
| `spinner.tsx` | `bases/radix/ui/spinner.tsx` | Loader2 path inline (no icon placeholder) |
| `button-group.tsx` | `bases/radix/ui/button-group.tsx` | `orientation` verbatim; join classes take `!` to win over the unlayered recipe sheet |
| `input.tsx` | `bases/radix/ui/input.tsx` | the box is the `<input>` (`data-escala="Input"`); adds `forceState` |
| `field.tsx` | `bases/radix/ui/field.tsx` | all parts; FieldSet carries `data-escala="Field"` so its legend paints |
| `label.tsx` | `bases/radix/ui/label.tsx` | verbatim shape |
| `checkbox.tsx` · `switch.tsx` | `bases/radix/ui/checkbox.tsx` · `switch.tsx` | bare controls; `data-checked` True/False for the recipe; `forceState` |
| `radio-group.tsx` | `bases/radix/ui/radio-group.tsx` | verbatim shape |
| `input-otp.tsx` | `bases/radix/ui/input-otp.tsx` | `input-otp` package; wrapper `data-escala="InputOTP"` carries `aria-invalid` |
| `card.tsx` | `bases/radix/ui/card.tsx` | `cn-card-*` → `data-part="Card.*"`; `size` default · sm as `data-size` |
| `dialog.tsx` | `bases/radix/ui/dialog.tsx` | `cn-dialog-*` → `data-part="Dialog.*"`; close = `DialogClose asChild` + ghost icon-sm Button (as shadcn); `inline` renders in place (docs/previews, no portal, no focus steal); close icon is a prop |
| `separator.tsx` | `bases/radix/ui/separator.tsx` | Radix Separator, verbatim shape; `data-escala="Separator"` |
| `tabs.tsx` | `bases/radix/ui/tabs.tsx` | TabsList `variant` default · line as `data-variant` |
| `sidebar.tsx` | `bases/radix/ui/sidebar.tsx` | the parts and their props (`variant`/`side`, MenuButton `isActive`/`variant`/`size`); no SidebarProvider/collapsible/mobile sheet yet |
| `dropdown-menu.tsx` · `context-menu.tsx` | `bases/radix/ui/dropdown-menu.tsx` · `context-menu.tsx` | item `variant` default · destructive |
| `toggle-group.tsx` | `bases/radix/ui/toggle-group.tsx` (+ `toggle.tsx`'s variants) | `variant` default · outline, `size` default · sm · lg on the group as `data-variant` / `data-size`; no `spacing` prop yet |
| `native-select.tsx` | `bases/radix/ui/native-select.tsx` | the wrapper is the recipe root (State axis); chevron is a prop; adds `forceState` |
| `kbd.tsx` | `bases/radix/ui/kbd.tsx` | verbatim shape; KbdGroup spaces only |
| `skeleton.tsx` | `bases/radix/ui/skeleton.tsx` | verbatim shape |
| `empty.tsx` | `bases/radix/ui/empty.tsx` | all parts; EmptyMedia `variant` as `data-variant` on the media part; the dash is inline |
| `collapsible.tsx` | `bases/radix/ui/collapsible.tsx` | Radix Collapsible; adds the chevron to the trigger and `CollapsibleItem` (the demo's row) |
| `table.tsx` | `bases/radix/ui/table.tsx` | all parts; `border-collapse` so row hairlines draw |

Rules (design-plans/shadcn-component-skeleton.md):
- Appearance lives in the generated sheet (`lib/recipeStyles.ts`) from
  `lib/componentRecipes.ts`, never in these files. A colour class here is a bug.
- Icons arrive as children / props. No `lucide-react`.
- On an upstream update, diff the four upstream files against this table; never
  overwrite.
