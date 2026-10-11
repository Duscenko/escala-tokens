# Design system → Brand → Theme

Decided 2026-10-11. Replaces the idea of a "new mode inside a theme".

## The vocabulary

| On screen | What it is | In the code | In Figma |
|---|---|---|---|
| **Design system** | One system. Its brands share foundations and ship together. | `savedSystems`, the store on screen | one file |
| **Brand** | An accent, its neutral and states. Acme, Kids, Partner. | a theme key (`themeOrder`, `themeSources`) | — |
| **Theme** | Light or Dark of a brand. | an appearance (`ThemeAppearance`) | one mode of Color Semantics |

"Folder" and "file" are gone from Home: a folder holding files said the things inside were
independent, and they are not. "Mode" is kept for Figma only (File & modes, viewports) and
always comes with a number.

Only the words people read changed. Code identifiers, routes, the tab key (`preview`) and the
`theme::appearance` payload keys did not, so links, saved systems and the plugin keep working.

## What a brand ships

`brandThemes: Record<brand, themeId[]>` in the snapshot (store v84), with helpers in
`lib/brandThemes.ts`.

- **A list, never a boolean.** `BRAND_THEME_DEFS` is the registry (`light`, `dark`, each with
  the appearance it is built on). A third theme (High contrast, Dim) is one more entry and one
  more id. Nothing may assume the list has two members: the choices the form offers
  (`BRAND_THEME_CHOICES`) are derived from the registry.
- **No entry means every theme.** That is what every system did before the field, so the
  migration narrows nothing. The one backfill: a File & modes choice already on disk, so an
  upgrade cannot put back a column someone unticked.
- **The editor still has both themes.** The ramps are derived; this list only decides what
  leaves.

## The flow

1. **Adding a brand asks** which themes it ships: `Light + Dark · 2 themes`, `Light only ·
   1 theme`, `Dark only · 1 theme`. Same words as the plugin's "Add a brand".
   (`BrandThemesPicker` in `ThemeForm`.)
2. **It is a property of the brand**: shown on its card in Home, changed later in the
   Generator's Color edition.
3. **Sync and Export open already filled** with that answer, as a sentence over the controls:
   `3 brands · 4 themes: Acme Light + Dark · Kids Light · Partner Dark`. Checking a theme in
   File & modes writes the same property. Auto-sync cannot ask, which is why the question
   lives at creation and the answer is shown, not asked again, on the way out.
4. **Home counts real modes**: `3 brands · 4 themes in Figma`, from what each brand ships,
   never brands × 2.

## Free — rule A

Free is **one design system with one brand, shipping one theme**.

- "New design system" and "Add brand" stay visible and open the upgrade notice
  (`useNeedsProForAnotherSystem`, `useNeedsProForAnotherTheme`). Without the first gate a
  Free account could keep five one-brand systems and have multibrand in five Figma files.
- `Light + Dark` carries the PRO mark. A Free brand set to one theme ships that one; a brand
  that never chose ships the theme on screen, as before (`soleShippedAppearance`).
- The plan never rewrites the stored list (`plannedBrandThemes` reads it through the plan), so
  going Pro finds Dark still there.
- Hard limits are unchanged and on the server: hosted sync and live MCP.

## Done in the web

Model + migration, the question in the create form, the picker in Color edition, Sync
reconciliation both ways, the Figma JSON download, the summaries in Sync and Export step 3,
Home counters and card, rule A, 119 strings renamed in en/es/fr.

## Not done

- **The plugin's wording** is done in `escala-figma-plugin/src/ui.html` (23 lines): "Add a
  brand" asks "Themes this brand ships", counts themes, and says "mode" only for Figma's own
  limit. Still to do there: it is built (`dist/`) but not committed (the repo carries other
  uncommitted work), and the downloadable zip here is not refreshed (`npm run bundle:plugin`).
  The plugin does not read `brandThemes`: the web ships only the chosen columns, which is all
  it needs today.
- **`api/_pluginStudio.mjs`** is a generated bundle and still holds the old upgrade sentence.
  `node scripts/build-plugin-studio.mjs` rewrites it.
- **Prose that is not in the dictionaries**: Docs articles, the retired views, the About
  screenshots (`npm run about:shots`) and the Legal page still say "theme" for a brand.
- **Export wizard step 1** lists brands; a brand's themes are changed on the brand, not there.
- **Folders above design systems** (a client with several systems) have a free level in this
  hierarchy, the same one Figma uses. Not built.
- **A third theme.** The model takes it; the solvers, ramps and the plugin payload are still
  written for two.
