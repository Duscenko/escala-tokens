# Scalable Designs — Project Context for Claude Code

This file is the source of truth for Claude Code CLI. Read it before making any change.

---

## What this is

A web configurator that lets product designers build a minimal, custom design token system — no bloat, only what they choose. The output is a `tokens.json`, `variables.css`, and `README.md` that sync directly into Figma via a companion plugin.

**Live URL:** https://scalable-designs.vercel.app
**Stack:** React + Vite + TypeScript + Tailwind CSS v4 + Zustand + Framer Motion + Radix UI

---

## Navigation model — Hub (foundations-first)

The app is **NOT a linear wizard**. It's a hub: the design system ("Apollo") ships
complete. The intended flow is **pick your tokens first (Foundations), then see them
reflected in the components** — so Foundations is the landing view.

```
HEADER (persistent)   editable project name + namespace slug · [Foundations] [Components] [Export]

Foundations (home)    → one global editor with 4 sections: Color · Semantic · Typography · Spacing & Radius
Components             → component catalogue: every component included by default; remove what you don't need; view docs/previews
Export                → tokens.json / variables.css / README + Publish to /api/tokens
```

- **Entry point = Foundations.** The header toggle is ordered `[Foundations] [Components]`, and the default `view` is `'foundations'`.
- **Foundations is a single global editor** (`FoundationsEditor.tsx`) that composes the four foundation section components (`Step2_ColorPalette` … `Step5_SpacingRadius`, reused as-is). A "Components →" link jumps forward to the catalogue.
- **Components ship complete.** All components are selected by default (`selectedComponents` defaults to every key); toggling a checkbox *removes* one.
- **View state is local** (`useState` in `Configurator.tsx`), not persisted — every reload lands on Foundations.

**Important:** This replaced the old linear 7-step wizard (and `currentStep`). Do NOT re-introduce a step counter, progress bar, or Continue/Back wizard nav. The old Style Direction and Atom Selector remain removed.

---

## Folder Structure

```
src/
├── components/
│   ├── configurator/       ← ComponentCatalogue, FoundationsEditor, ExportView + Step2…Step5 (foundation sections)
│   ├── ui/                 ← Shared primitives (Button, Input, Badge...)
│   └── preview/            ← Preview cards (ButtonPreview...)
├── store/
│   └── useDesignStore.ts   ← Single Zustand store with persist middleware (version 3)
├── lib/
│   ├── colorUtils.ts          ← generateColorScale, checkContrast, isAccessible (chroma-js)
│   ├── componentCatalogue.ts  ← ComponentDef type, COMPONENTS array, CATEGORIES, COMPONENT_KEYS (pure data)
│   ├── tokenGenerator.ts      ← generateTokenJSON(), downloadTokenJSON()
│   └── utils.ts               ← cn() + slugify() helpers
├── types/
│   └── tokens.ts           ← TypeScript types for DesignTokens, ColorScale, etc.
└── pages/
    └── Configurator.tsx    ← Hub shell: persistent header + view switch (components/foundations/export)
api/
└── tokens.ts               ← Vercel serverless: GET returns Blob, POST saves to Blob
```

---

## State Shape (useDesignStore)

Key fields — always use the store, never local state for cross-view data:

| Field | Type | Edited in |
|-------|------|-----------|
| `projectName` | string (default `"Apollo"`) | Header |
| `primaryColor` | string (hex) | Foundations · Color |
| `primaryScale` | Record<number, string> | Foundations · Color |
| `grayLightScale` | ColorScale | Foundations · Color |
| `errorColor/Scale`, `warningColor/Scale`, `successColor/Scale`, `infoColor/Scale` | ColorScale | Foundations · Color |
| `semanticTokens` | Record<string, string> | Foundations · Semantic |
| `typography` | { fontFamily, headingFontFamily, sizes, weights } | Foundations · Typography |
| `spacing` | Record<string, string> | Foundations · Spacing & Radius |
| `radius` | Record<string, string> | Foundations · Spacing & Radius |
| `selectedComponents` | string[] (defaults to **all** `COMPONENT_KEYS`) | Components |

**Removed fields:** `styleDirection`, `selectedAtoms`, `currentStep` — do not re-add these. Nav state (`view`) is local `useState` in `Configurator.tsx`, not store.

Store uses `persist` middleware with `version: 3`. If you add fields, bump the version and add a migrate function.

---

## Component Catalogue

`src/lib/componentCatalogue.ts` contains the `COMPONENTS` array of component definitions (16 today; pure data — imported by both the store and the catalogue UI). `ComponentCatalogue.tsx` renders them. Each definition has:

```ts
interface ComponentDef {
  key: string         // unique ID — matches export key in tokens.json
  label: string       // display name
  category: string    // Action | Form | Display | Layout | Overlay | Navigation | Feedback
  description: string // one-liner
  usage: string       // when to use / when not to use
  variants: string[]  // visual variant names
  props: { name, type, description }[]
  accessibility: string
}
```

**To add a new component:** append to the `COMPONENTS` array in `src/lib/componentCatalogue.ts`. The UI renders it automatically, and it's included by default. No other file needs to change.

**To enrich docs:** edit the `props`, `variants`, `usage`, or `accessibility` fields for any component.

---

## Token Export Format

```json
{
  "project": "my-system",
  "colors": {
    "primitive": { "1": "#f5f0ff", ... "12": "#1a0a3d" },
    "semantic": { "text-primary": "#101828", "bg-primary": "#ffffff", ... }
  },
  "typography": {
    "fontFamily": "Inter",
    "sizes": { "xs": "12px", "sm": "14px", ... },
    "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }
  },
  "spacing": { "1": "4px", "2": "8px", ... },
  "radius": { "none": "0px", "sm": "4px", "md": "8px", "lg": "12px", "full": "9999px" },
  "components": ["Button", "Input", "Badge", ...]
}
```

`tokenGenerator.ts` generates this. If you add fields to the store, also add them to `generateTokenJSON()`.

---

## API — /api/tokens

- `GET /api/tokens` → returns stored tokens from Vercel Blob
- `POST /api/tokens` → saves tokens to Vercel Blob (key: `design-tokens.json`)
- CORS headers allow `*` — required for Figma plugin to fetch cross-origin
- Uses `@vercel/blob` (free tier, 1GB). Do NOT switch to KV — it requires paid plan.

---

## Figma Plugin

Lives at `../scalable-designs-figma-plugin/`. Separate project, separate `package.json`.

```
src/
├── code.ts    ← Figma Plugin API sandbox (importVariables, importStyles, importComponents)
└── ui.html    ← Self-contained plugin UI (Import tab, Live Sync tab, Log tab)
```

Build with `npm run build` (esbuild). Load in Figma via manifest.json.

**Live sync URL for plugin:** `https://scalable-designs.vercel.app/api/tokens`

---

## Design Principles

1. **No bloat** — every feature should earn its place. If it doesn't help the designer configure tokens, it doesn't belong.
2. **Tokens first** — all visual choices (colors, radius, spacing) come from the store. Never hardcode design values in components.
3. **Hub, not wizard** — components/foundations/export live behind a persistent header (see Navigation model). Don't add a linear step counter, progress bar, or Continue/Back nav.
4. **Accessibility** — all interactive elements need keyboard support and ARIA. The component docs we generate should model this.
5. **Light & dark** — both themes are supported; **light is the default**. Use the semantic color utilities (`bg-app`/`bg-surface`/`bg-elevated`, `text-fg`/`text-fg-muted`/`text-fg-faint`, `border-line`/`border-line-strong`) defined in `src/index.css` — NOT raw `neutral-*`. Dark mode = the `.dark` class on `<html>` (toggled in the header, persisted as `localStorage['sd-theme']`, applied pre-paint by the inline script in `index.html`). Keep `text-white` only on colored/accent fills (e.g. on `bg-violet-600`); the user's token colors/previews are theme-independent.

---

## Conventions

- Component files: `PascalCase.tsx`
- Step files: `StepN_Name.tsx` where N is the step number
- Store actions: `set` prefix (`setProjectName`, `setTypography`)
- CSS: Tailwind utility classes only — no `style` tags, no CSS modules. For chrome colors use the semantic theme utilities (`bg-app`, `bg-surface`, `text-fg`, `border-line`…), never raw `neutral-*`.
- Animations: Framer Motion (`motion.div`, `AnimatePresence`) for transitions between states
- No `console.log` in production code
- TypeScript strict mode — no `any` unless absolutely necessary

---

## Deploy

```bash
# Configurator
cd ~/sync-ds-platform/scalable-designs
npm run build          # verify
npx vercel --prod      # deploy

# Plugin (after code changes)
cd ~/sync-ds-platform/scalable-designs-figma-plugin
npm run build          # outputs dist/code.js + dist/ui.html
# Reload in Figma: Plugins → Development → Scalable Designs Sync → ⟳
```

---

## What's next (backlog)

- [ ] Components: Add live component previews rendered with user tokens (not just docs)
- [ ] Components: "Copy usage snippet" button per component
- [ ] Export: Generate per-component CSS with token references
- [ ] Plugin: TextStyle creation for typography tokens
- [ ] Plugin: Two-way sync — read Figma Variables → update configurator
- [ ] Plugin: Diff view before import (show what changed)
- [ ] Add dark/light mode toggle for the token preview in Foundations · Semantic
