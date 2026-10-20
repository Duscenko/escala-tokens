# Custom font families

Let a design system ADD a font family the built-in list does not carry.

## Phase 1 — done (2026-10-20)

Two sources, nothing uploaded to Escala:

| Source | Stored | Preview | Code export |
|---|---|---|---|
| Google Fonts, any family by name | `{ family, kind: 'google', spec?, category }` | `<link>` to css2 | `@import` css2 |
| Stylesheet URL from an allowed provider | `{ family, kind: 'css', url, category }` | `<link>` to the URL | `@import` the URL |

- **Model:** `fontSources: FontSource[]` in `DesignSnapshot` (store v101), rules in
  `src/lib/customFonts.ts` (pure, tested by `customFonts.test.ts`). The token value is still the
  family NAME in `typography.fontFamily` / `headingFontFamily`, so Figma, W3C and the plugin read
  what they always read. `fontSources` is in `NOT_DESIGN` (adding a font stamps no theme).
- **Allowed hosts:** `fonts.googleapis.com`, `use.typekit.net` (Adobe Fonts), `api.fontshare.com`,
  `fonts.bunny.net`. https only, no credentials, no port. A stylesheet can restyle the app and any
  URL can track who opens it, so it is a list, not "any https".
- **Google weights:** `spec` = `wght@400;500;600;700` when Google accepts it, absent otherwise (the
  family's default weight) — a static family lacking a requested weight can make Google refuse the
  whole URL, which would break an `@import`.
- **Checks use a `<link>` probe, not `fetch`:** Google's 400 carries no CORS header, so `fetch`
  only throws and cannot tell "no such family" from "offline". A probe that times out adds anyway.
- **Who:** `useFontAccess()` (`lib/access.ts`) — a signed-in account (`!guest`) whose system on
  screen has a saved copy (`useLibraryStatus() !== 'none'`). Guests see "Sign in to add a font";
  unsaved systems see the button disabled with "Save your design system to add fonts." A font
  already added is part of the system and usable by anyone who opens it.
- **UI:** `AddFontDialog` / `AddFontButton` (`components/configurator/AddFontDialog.tsx`), at the
  foot of the inspector's Body / Display pickers (`PickerField` `footer`) and of Variables · Type's
  family picker. Added families list first ("Added to this system"). Max 12 per system.
- **Export:** `buildCSS` prepends `@import` for added families a theme actually uses and gives them
  their own generic fallback (`fontStack(family, category)`); `tokens.json` adds
  `typography.sources` (with `href`) only when there are some — every other system's export is
  byte-identical.

Not changed: Variables · Type's free-text "Use “X”" Google entry (open to everyone, pre-existing).

## Phase 2 — not built

Upload `.woff2` files to Blob per account. Needs: magic-byte validation, ~500 KB/file cap,
licence confirmation, metered Blob writes (Hobby), `@font-face` in the export and the files in the
GitHub push / zip. Figma still renders only fonts installed locally — the plugin warns as today.
