# Scalable Designs — Project Context for Claude Code

This file is the source of truth for Claude Code CLI. Read it before making any change.

---

## What this is

A web configurator that lets product designers build a minimal, custom design token system — no bloat, only what they choose. The output is a `tokens.json`, `variables.css`, and `README.md` that sync directly into Figma via a companion plugin.

**Live URL:** https://scalable-designs.vercel.app
**Stack:** React + Vite + TypeScript + Tailwind CSS v4 + Zustand + Framer Motion + Radix UI

---

## 7-Step Flow

```
Step 1  Project Name       → sets the token namespace slug
Step 2  Color Palette      → brand color + 12-tone scale (chroma-js) + semantic state colors
Step 3  Semantic Tokens    → maps scale tones to design roles (text, bg, border, fg)
Step 4  Typography         → font family (Google Fonts), type scale, weights
Step 5  Spacing & Radius   → spacing scale (base unit), radius presets + fine-tune
Step 6  Components         → component catalogue: select + view generated docs
Step 7  Export             → tokens.json / variables.css / README + Publish to /api/tokens
```

**Important:** Step 6 (Style Direction) and the old Step 7 (Atom Selector) were deliberately removed. Do NOT re-introduce them. The new Step 6 is a component catalogue with selection + auto-generated documentation.

---

## Folder Structure

```
src/
├── components/
│   ├── configurator/       ← One file per step: Step1_ProjectName.tsx … Step6_Components.tsx
│   ├── ui/                 ← Shared primitives (Button, Input, Badge...)
│   └── preview/            ← Preview cards (future)
├── store/
│   └── useDesignStore.ts   ← Single Zustand store with persist middleware (version 2)
├── lib/
│   ├── colorUtils.ts       ← generateColorScale, checkContrast, isAccessible (chroma-js)
│   ├── tokenGenerator.ts   ← generateTokenJSON(), downloadTokenJSON()
│   └── utils.ts            ← cn() helper (clsx + tailwind-merge)
├── types/
│   └── tokens.ts           ← TypeScript types for DesignTokens, ColorScale, etc.
└── pages/
    └── Configurator.tsx    ← Step router, progress bar, navigation
api/
└── tokens.ts               ← Vercel serverless: GET returns Blob, POST saves to Blob
```

---

## State Shape (useDesignStore)

Key fields — always use the store, never local state for cross-step data:

| Field | Type | Step |
|-------|------|------|
| `projectName` | string | 1 |
| `primaryColor` | string (hex) | 2 |
| `primaryScale` | Record<number, string> | 2 |
| `grayLightScale` | ColorScale | 2 |
| `errorColor/Scale`, `warningColor/Scale`, `successColor/Scale`, `infoColor/Scale` | ColorScale | 2 |
| `semanticTokens` | Record<string, string> | 3 |
| `typography` | { fontFamily, headingFontFamily, sizes, weights } | 4 |
| `spacing` | Record<string, string> | 5 |
| `radius` | Record<string, string> | 5 |
| `selectedComponents` | string[] | 6 |
| `currentStep` | number | all |

**Removed fields:** `styleDirection`, `selectedAtoms` — do not re-add these.

Store uses `persist` middleware with `version: 2`. If you add fields, bump the version and add a migrate function.

---

## Component Catalogue (Step 6)

`Step6_Components.tsx` contains a `COMPONENTS` array with 15 component definitions. Each has:

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

**To add a new component:** append to the `COMPONENTS` array in `Step6_Components.tsx`. The UI renders it automatically. No other file needs to change.

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
3. **Progressive disclosure** — steps are linear. Don't add branching logic or skip-ahead navigation (except back to completed steps).
4. **Accessibility** — all interactive elements need keyboard support and ARIA. The component docs we generate should model this.
5. **Dark UI** — the configurator runs on `bg-neutral-950`. Tailwind dark classes only, no light mode.

---

## Conventions

- Component files: `PascalCase.tsx`
- Step files: `StepN_Name.tsx` where N is the step number
- Store actions: `set` prefix (`setProjectName`, `setTypography`)
- CSS: Tailwind utility classes only — no `style` tags, no CSS modules
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

- [ ] Step 6: Add live component previews rendered with user tokens (not just docs)
- [ ] Step 6: "Copy usage snippet" button per component
- [ ] Step 7 Export: Generate per-component CSS with token references
- [ ] Plugin: TextStyle creation for typography tokens
- [ ] Plugin: Two-way sync — read Figma Variables → update configurator
- [ ] Plugin: Diff view before import (show what changed)
- [ ] Add dark/light mode toggle for the token preview in Step 3
