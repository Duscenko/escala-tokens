# Frozen contracts

These are the seams that already have consumers (Figma plugin zips in the wild, persisted Zustand stores, Vitest color layer). Change them only with a version bump and a migration. See [`PLAN.md`](./PLAN.md) for the agent-native roadmap.

Machine-readable shape: [`tokens.schema.json`](./tokens.schema.json). Source of the payload: `src/lib/tokenGenerator.ts` (`generateTokenJSON`, `TOKEN_SCHEMA_VERSION`).

## 1. HTTP — `/api/tokens` is frozen

File: `api/tokens.ts`. Consumer: Figma plugin (`scalable-designs-figma-plugin`), including already-downloaded zips.

| Method | Behavior |
|---|---|
| `GET /api/tokens?project=<slug>` | Blob `tokens/<slug>.json` |
| `GET /api/tokens` | Most recently published blob (legacy pin) |
| `GET /api/tokens?list=1` | `{ systems: [{ project, updatedAt }] }` |
| `POST /api/tokens?project=<slug>` | Write `tokens/<slug>.json` |
| `POST /api/tokens` | Legacy key `design-tokens.json` |

Do not rename query params, change CORS (`*`), or require auth. New capabilities go to a **new** path. `/api/mcp` is that path (read-only JSON-RPC). Do not switch `@vercel/blob` to KV.

Slug must stay aligned with the configurator (`slugify(projectName)`).

## 2. Escala JSON — versioning

`schemaVersion` is the plugin handshake. The plugin logs a warning when the payload is newer than `SUPPORTED_SCHEMA_VERSION` (`code.ts`, currently **5**) and still imports.

| Version | What changed | Compatibility |
|---|---|---|
| 2 | Primitive families `brand` → `accent`, `gray` → `neutral` | Breaking names |
| 3 | Semantic keys renamed (`bg-primary` → `surface-0`, …). Flat `colors.semantic` / `semanticDark` stay for the plugin | Breaking names |
| 4 | Per-family dark primitives (`accent-dark-*`, `error-dark-*`, …) | Additive |
| 5 | `opacity` **removed** (alpha lives in `colors.primitiveAlpha`) | Older plugin already guards `if (tokens.opacity)` |
| 6 *(working tree, not on HEAD)* | Additive: `typography.roles`, `spacingRoles`, `radiusRoles`, `sizeRoles`, `stroke`, `strokeRoles`, `breakpointRoles`, `gridFrame` | Plugin v5 warns, ignores unknown keys |

Rules:

- **Additive fields do not require a bump** if an older plugin ignoring them is the correct outcome (`shadowsDark`, `gradientsDark` shipped this way).
- **Bump** when a missing field would be misread as a gap (`opacity` in v5) or when names change.
- Never rename an existing key. Add the new key, keep the old one until a major bump.
- Canonical component list field is **`atoms`**, not `components`. The plugin reads `atoms`.
- `colors.semantic` / `colors.semanticDark` stay even when `colors.themes` and `colors.architecture` ship. They are the plugin compatibility slice (light / dark).
- After bumping `TOKEN_SCHEMA_VERSION`, update this table, `tokens.schema.json`, and (if the plugin must understand the new fields) `SUPPORTED_SCHEMA_VERSION`.

`src/types/tokens.ts` is a **partial** TypeScript view, not the contract. The contract is `generateTokenJSON()`'s return value.

## 3. Persist — Zustand store

File: `src/store/useDesignStore.ts`. State is persisted in the browser.

- New fields need a **migration** (default + backfill). Do not reshape existing keys in place.
- `generateTokenJSON()` must emit every new field you add to the store that a consumer should see. Docs / Skill / CSS exporters are not automatic.
- `figmaLastPublishAt` is written by publish. Auto-sync hashes `generateTokenJSON()` so that write cannot loop.

## 4. Color layer — one implementation

Enforced by `src/lib/__tests__/no-duplication.test.ts`.

- WCAG + APCA live in `src/lib/color/apca.ts` only. `colorUtils.checkContrast` is an alias of `wcagRatio`.
- Never `chroma.contrast` on hex strings. The two surviving `chroma.contrast` sites are annotated `CONTINUOUS-PRECISION`.
- Report both metrics. APCA is directional (`foreground`, `background`). WCAG is symmetric.
- Emit via `gamut.oklchToHex`, not `chroma.oklch(…).hex()`.
- One sRGB transfer: `gamut.hexToLinearRgb`.
- Color code is **DOM-free**. Vitest is `environment: 'node'` on purpose. Do not pull jsdom into this layer.
- `*Reference.ts` files are generated (`npm run gen:radix-reference` / `gen:tailwind-reference` / `gen:carbon-reference`). Never hand-edit.
- Ramp output is snapshot-pinned. Do not `vitest -u` without reading the diff.

Skill script `/.claude/skills/color-science-core/scripts/contrast.mjs` must stay mathematically equal to `lib/color`. The duplication test pins that.

## 5. Naming — Figma vs CSS vs JSON

| World | Color role example | Rule |
|---|---|---|
| Catalogue / JSON architecture | `action.primary.default` | Dots |
| CSS | `var(--color-action-primary-default)` | Hyphens, `var()` wrapper required for Figma Dev Mode |
| Figma variable | `Action/primary/default` | Slashes. A dot in a Figma name throws and aborts import |
| Collections | `Color Primitives`, `Color Semantics`, `Typography`, `Spacing`, `Radius`, `Size`, `Grid` | Exact strings. Semantics groups: Content · Action · Surface · Status · Border |

Primitives: `scopes = []` (hidden). Semantics: targeted scopes, never `ALL_SCOPES`.

Spacing steps in Figma nest under `step/` because a variable name cannot start with a digit.

Shadows and gradients are **styles**, not variables (Figma has no type for them).

## 6. Plugin field names the configurator must keep emitting

The plugin is authoritative for component sets (`code.ts`). The web catalogue (`componentCatalogue.ts`) mirrors it.

Always emit when present in the store:

- `colors.primitive`, `colors.primitiveAlpha`, `colors.themes`, `colors.themeOrder`
- `colors.semantic`, `colors.semanticDark` (compat)
- `typography`, `spacing`, `padding`, `radius`, `sizes`, `grid`, `shadows`, `shadowsDark`, `gradients`, `gradientsDark`, `gradientAssignments`
- `icons` (library + `aiSource` + `custom`)
- `atoms`

Plugin also *reads* optional `copy` / `borders` that the configurator does not emit yet. Do not reuse those names for something else.

## 7. Agent envelope

`src/lib/aiContext.ts` — `format: agent-context/v1`, `source: escala-tokens`, scopes `global | component | variable`.

Do not invent a second front-matter dialect. Skill zip layout: `SKILL.md` at the archive root (Figma requirement), plus `references/`. Builders live in `src/lib/agentBundle/` and take `TokenJSON` — do not re-bind them to the store.

## 8. What you may add without a bump

- Extra keys on the JSON that an old plugin ignores
- New wizard formats (`WizardFormat`)
- New API paths
- New files under `docs/agent-native/`
- New Cursor rules / skills

That is the safe default for the agent-native work.
