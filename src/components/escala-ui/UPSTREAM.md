# escala-ui — upstream

Skeletons vendored from **shadcn/ui** (`apps/v4/registry/bases/radix/ui/`),
MIT — see `LICENSE-shadcn.md`. Source: the `ui-main` archive downloaded
2026-10-18 (no commit hash in the archive; record one on the next sync).

| File | Upstream | What changed |
|---|---|---|
| `button.tsx` | `bases/radix/ui/button.tsx` | shadcn's `variant` / `size` values verbatim (`data-variant`, `data-size`); `cn-*` classes → `data-escala` + the recipe sheet; adds `forceState`, `loading`, `recipe` |
| `button-group.tsx` | `bases/radix/ui/button-group.tsx` | `orientation` verbatim; join classes take `!` to win over the unlayered recipe sheet |
| `input.tsx` | `bases/radix/ui/input.tsx` | `cn-input` → `data-part="Input.value"`; `InputField` composes label · field · hint (Escala's Input anatomy, shadcn's Field pattern) |
| `card.tsx` | `bases/radix/ui/card.tsx` | `cn-card-*` → `data-part="Card.*"`; `CardLink` added |
| `dialog.tsx` | `bases/radix/ui/dialog.tsx` | `cn-dialog-*` → `data-part="Modal.*"`; `inline` renders in place (docs/previews, no portal, no focus steal); close icon is a prop |

Rules (design-plans/shadcn-component-skeleton.md):
- Appearance lives in the generated sheet (`lib/recipeStyles.ts`) from
  `lib/componentRecipes.ts`, never in these files. A colour class here is a bug.
- Icons arrive as children / props. No `lucide-react`.
- On an upstream update, diff the four upstream files against this table; never
  overwrite.
