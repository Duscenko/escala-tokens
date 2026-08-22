# Escala — agent router

A desktop token configurator. Designers pick tokens; the app emits `tokens.json`, CSS, W3C, a Figma Skill zip, and syncs to a companion plugin.

**Do not invent token names, hex, or px when a token exists.** Prefer semantic roles over primitive ramps. Bind paints to semantics only.

## Read this, then stop

| Need | File |
|---|---|
| What not to break | `docs/agent-native/CONTRACTS.md` |
| Payload shape | `docs/agent-native/tokens.schema.json` |
| Five-layer roadmap | `docs/agent-native/PLAN.md` |
| Deep product / nav / backlog | `CLAUDE.md` (do not treat as a system prompt) |
| Brand / user | `.impeccable.md` |
| Color math | `.claude/skills/color-science-core/SKILL.md` |
| Agent copy envelope | `src/lib/aiContext.ts` (`agent-context/v1`) |
| Skill zip builder | `src/lib/skillExport.ts` |

Load `CLAUDE.md` only for the section you need (nav, store, export, plugin). Do not paste the whole file into context.

## Hard rules

1. **`/api/tokens` is frozen.** New HTTP goes to a new path. CORS `*` and Blob stay.
2. **Additive schema only.** `TOKEN_SCHEMA_VERSION` is `5` on `main`; working tree may be `6`. Never rename keys. Canonical component field is `atoms`.
3. **One contrast implementation** — `src/lib/color/apca.ts`. Never `chroma.contrast` on hex. Never emit via channel clipping (`gamut.oklchToHex`).
4. **Color layer is DOM-free.** Vitest is `environment: 'node'`. `npm run build` typechecks tests (`tsconfig.test.json`); a green `npm test` does not.
5. **Store is persisted.** New Zustand fields need a migration. Emit them from `generateTokenJSON()` if consumers should see them.
6. **`*Reference.ts` is generated** (`npm run gen:*`). Do not hand-edit.
7. **Figma names use `/`, CSS uses hyphens + `var()`, JSON architecture uses dots.** `action.primary.default` → `Action/primary/default` → `var(--color-action-primary-default)`.
8. **Plugin lives in** `../scalable-designs-figma-plugin`. `code.ts` is authoritative for component sets; `componentCatalogue.ts` mirrors it.
9. **Desktop/laptop only.** Do not build phone editor layouts. `DesktopOnlyNotice` + About is the one reading-surface exception.
10. **No `console.log` in production.** TypeScript strict. No `any` unless forced.

## Where code lives

```
src/store/useDesignStore.ts     state + persist
src/lib/tokenGenerator.ts       store → Escala JSON
src/lib/exportWizard.ts         w3c | escala | md | skill
src/lib/skillExport.ts          Agent Skill zip (store-bound today)
src/lib/color/                  ramps, APCA, gamut, CVD
src/lib/componentCatalogue.ts   58 components (props, a11y)
api/tokens.ts                   publish / fetch Blob
```

## Commands

```bash
npm test                 # Vitest, node env — run before build
npm run build            # tsc -b && vite
npm run color:report     # reports/color-audit.json (gitignored)
npm run bundle:plugin    # refresh public/scalable-designs-figma-plugin.zip
```

Plugin: `cd ../scalable-designs-figma-plugin && npm run build`.

## Do not invent

- A second token vocabulary (no parallel “primary-500” beside `action.primary.default`)
- A second WCAG/APCA implementation in a skill, MCP tool, or checker
- `components` as the export field name
- Style Dictionary / Terrazzo as the pipeline
- Storybook, phone configurator, or a rewrite of `CLAUDE.md` into this file
