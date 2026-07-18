// Pure exporters — generate variables.css and README.md from store state.
// Shared by ExportView (preview/download) and GitHubConnectView (repo push).

import { useDesignStore } from '../store/useDesignStore'
import { fontStack } from './fonts'
import { getIconLibrary } from './iconLibraries'
import { toneLabel, withAlpha } from './colorUtils'
import { gradientToCss, gradientSlug } from './gradients'

// Panel (surface-1: cards, panels, sections) tokens — translucent mode bakes
// alpha into the color and pairs it with --panel-blur for backdrop-filter;
// page mode swaps in the primitives page background (light themes only).
const PANEL_KEYS = ['surface-1', 'surface-1-alt']

export function buildCSS(store: ReturnType<typeof useDesignStore.getState>): string {
  const { primaryScale, grayLightScale, errorScale, warningScale, successScale, infoScale, customColors, themes, themeOrder, themeKinds, typography, spacing, padding, radius, opacity, shadows, grid, sizes, colorNaming, panelBackground, pageBackground, gradients } = store
  const semanticTokens = themes.light ?? {}
  const translucent = panelBackground === 'translucent'
  const panelValue = (key: string, hex: string, kind: 'light' | 'dark' = 'light') => {
    if (!PANEL_KEYS.includes(key)) return hex
    if (translucent) return withAlpha(hex, 0.7)
    if (panelBackground === 'page' && kind === 'light') return pageBackground
    return hex
  }
  const lines: string[] = [':root {']

  // Primitive families — names match tokens.json (`accent`/`neutral`, the
  // Figma-plugin contract) so variables.css and tokens.json stay in lockstep.
  const family = (name: string, scale: Record<number, string>) => {
    if (!Object.keys(scale).length) return
    lines.push(`\n  /* ${name.charAt(0).toUpperCase() + name.slice(1)} */`)
    Object.entries(scale)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([k, v]) => { if (v) lines.push(`  --color-${name}-${toneLabel(colorNaming, Number(k))}: ${v};`) })
  }
  lines.push('  /* Primitive scales */')
  family('accent', primaryScale)
  family('neutral', grayLightScale)
  family('error', errorScale)
  family('warning', warningScale)
  family('success', successScale)
  family('info', infoScale)
  customColors.forEach((c) => family(c.key, c.scale))

  lines.push('\n  /* Semantic tokens — light */')
  Object.entries(semanticTokens).forEach(([k, v]) => {
    if (v) lines.push(`  --color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${panelValue(k, v)};`)
  })

  lines.push('\n  /* Panel background — apply to surface-1: backdrop-filter: var(--panel-blur) */')
  lines.push(`  --panel-blur: ${translucent ? 'blur(16px)' : 'none'};`)

  lines.push('\n  /* Typography */')
  lines.push(`  --font-family-heading: ${fontStack(typography.headingFontFamily ?? typography.fontFamily)};`)
  lines.push(`  --font-family-body: ${fontStack(typography.fontFamily)};`)
  Object.entries(typography.sizes).forEach(([k, v]) => lines.push(`  --font-size-${k}: ${v};`))
  Object.entries(typography.lineHeights ?? {}).forEach(([k, v]) => lines.push(`  --line-height-${k}: ${v};`))
  Object.entries(typography.weights).forEach(([k, v]) => lines.push(`  --font-weight-${k}: ${v};`))

  lines.push('\n  /* Spacing */')
  Object.entries(spacing).forEach(([k, v]) => lines.push(`  --spacing-${k}: ${v};`))

  lines.push('\n  /* Padding — per-side surface inset */')
  Object.entries(padding).forEach(([k, v]) => lines.push(`  --padding-${k}: ${v};`))

  lines.push('\n  /* Radius */')
  Object.entries(radius).forEach(([k, v]) => lines.push(`  --radius-${k}: ${v};`))

  lines.push('\n  /* Opacity */')
  Object.entries(opacity).forEach(([k, v]) => lines.push(`  --opacity-${k}: ${v};`))

  lines.push('\n  /* Shadow */')
  Object.entries(shadows).forEach(([k, v]) => lines.push(`  --shadow-${k}: ${v};`))

  lines.push('\n  /* Grid */')
  Object.entries(grid).forEach(([k, v]) => lines.push(`  --grid-${k}: ${v};`))

  lines.push('\n  /* Sizes */')
  Object.entries(sizes).forEach(([k, v]) => lines.push(`  --size-${k}: ${v};`))

  if (gradients.length) {
    lines.push('\n  /* Gradients */')
    gradients.forEach((g) => lines.push(`  --gradient-${gradientSlug(g)}: ${gradientToCss(g)};`))
  }

  lines.push('}')

  // Non-default themes — semantic tokens only. Dark keeps the `.dark` class
  // convention (applied on <html>); extra themes use [data-theme="…"].
  themeOrder.filter((t) => t !== 'light').forEach((theme) => {
    const entries = Object.entries(themes[theme] ?? {}).filter(([, v]) => v)
    if (!entries.length) return
    const selector = theme === 'dark' ? '.dark, [data-theme="dark"]' : `[data-theme="${theme}"]`
    const kind = themeKinds?.[theme] ?? (theme === 'dark' ? 'dark' : 'light')
    lines.push(`\n${selector} {`)
    lines.push(`  /* Semantic tokens — ${theme} */`)
    entries.forEach(([k, v]) => lines.push(`  --color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${panelValue(k, v, kind)};`))
    lines.push('}')
  })

  return lines.join('\n')
}

export function buildMarkdown(store: ReturnType<typeof useDesignStore.getState>): string {
  const { projectName, projectDescription, primaryColor, primaryScale, customColors, themes, themeOrder, typography, spacing, padding, radius, opacity, shadows, grid, sizes, selectedComponents, iconLibrary, customIcons, githubRepo, colorNaming, panelBackground, gradients, gradientAssignments } = store
  const gradientSlugById = (id: string | null) => {
    const g = gradients.find((x) => x.id === id)
    return g ? gradientSlug(g) : null
  }
  const semanticTokens = themes.light ?? {}
  const themeCols = themeOrder.filter((t) => themes[t])
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const headingFont = typography.headingFontFamily ?? typography.fontFamily
  const lib = getIconLibrary(iconLibrary)

  return `# ${projectName} — Design System

> Generated by [Escala](https://scalable-designs.vercel.app)
${projectDescription.trim() ? `\n${projectDescription.trim()}\n` : ''}
## Overview

- **Primary color:** \`${primaryColor}\`
- **Themes:** ${themeCols.map(cap).join(', ')}
- **Panel background:** ${cap(panelBackground)}
- **Heading font:** ${headingFont}
- **Body font:** ${typography.fontFamily}
- **Icons:** ${lib?.label ?? iconLibrary}${lib?.npm ? ` (\`${lib.npm}\`)` : ''}
- **Components:** ${selectedComponents.length > 0 ? selectedComponents.join(', ') : 'none selected'}${githubRepo ? `\n- **Repository:** [${githubRepo}](https://github.com/${githubRepo})` : ''}

---

## Color Tokens

### Primitive Scale — Accent

| Token | Value |
|-------|-------|
${Object.entries(primaryScale).sort(([a],[b])=>Number(a)-Number(b)).map(([k,v])=>`| \`--color-accent-${toneLabel(colorNaming, Number(k))}\` | \`${v}\` |`).join('\n')}
${customColors.map((c)=>`
### Custom — ${c.label}

| Token | Value |
|-------|-------|
${Object.entries(c.scale).sort(([a],[b])=>Number(a)-Number(b)).map(([k,v])=>`| \`--color-${c.key}-${toneLabel(colorNaming, Number(k))}\` | \`${v}\` |`).join('\n')}`).join('\n')}

### Semantic Tokens

| Token |${themeCols.map((t)=>` ${cap(t)} |`).join('')}
|-------|${themeCols.map(()=>`-------|`).join('')}
${Object.entries(semanticTokens).filter(([,v])=>v).map(([k])=>`| \`--color-${k.replace(/([A-Z])/g,'-$1').toLowerCase()}\` |${themeCols.map((t)=>` \`${themes[t]?.[k] || '—'}\` |`).join('')}`).join('\n')}

---

## Typography

| Token | Value |
|-------|-------|
| \`--font-family-heading\` | \`${fontStack(headingFont)}\` |
| \`--font-family-body\` | \`${fontStack(typography.fontFamily)}\` |
${Object.entries(typography.sizes).map(([k,v])=>`| \`--font-size-${k}\` | \`${v}\` |`).join('\n')}
${Object.entries(typography.lineHeights ?? {}).map(([k,v])=>`| \`--line-height-${k}\` | \`${v}\` |`).join('\n')}
${Object.entries(typography.weights).map(([k,v])=>`| \`--font-weight-${k}\` | \`${v}\` |`).join('\n')}

---

## Spacing

| Token | Value |
|-------|-------|
${Object.entries(spacing).map(([k,v])=>`| \`--spacing-${k}\` | \`${v}\` |`).join('\n')}

### Padding — surface inset

| Token | Value |
|-------|-------|
${Object.entries(padding).map(([k,v])=>`| \`--padding-${k}\` | \`${v}\` |`).join('\n')}

---

## Border Radius

| Token | Value |
|-------|-------|
${Object.entries(radius).map(([k,v])=>`| \`--radius-${k}\` | \`${v}\` |`).join('\n')}

---

## Opacity

| Token | Value |
|-------|-------|
${Object.entries(opacity).map(([k,v])=>`| \`--opacity-${k}\` | \`${v}\` |`).join('\n')}

---

## Shadow

| Token | Value |
|-------|-------|
${Object.entries(shadows).map(([k,v])=>`| \`--shadow-${k}\` | \`${v}\` |`).join('\n')}

---

## Grid

| Token | Value |
|-------|-------|
${Object.entries(grid).map(([k,v])=>`| \`--grid-${k}\` | \`${v}\` |`).join('\n')}

---

## Sizes

| Token | Value |
|-------|-------|
${Object.entries(sizes).map(([k,v])=>`| \`--size-${k}\` | \`${v}\` |`).join('\n')}

---

## Gradients

${gradients.length
  ? `| Token | Type | Value |
|-------|------|-------|
${gradients.map((g)=>`| \`--gradient-${gradientSlug(g)}\` | ${g.type} | \`${gradientToCss(g)}\` |`).join('\n')}

Assigned surfaces: ${[
    gradientSlugById(gradientAssignments.cover) ? `card cover → \`--gradient-${gradientSlugById(gradientAssignments.cover)}\`` : null,
    gradientSlugById(gradientAssignments.avatar) ? `avatars → \`--gradient-${gradientSlugById(gradientAssignments.avatar)}\`` : null,
  ].filter(Boolean).join(', ') || '_none_'}.`
  : '_No gradients defined._'}

---

## Icons

- **Library:** ${lib?.label ?? iconLibrary}
- **Package:** \`${lib?.npm ?? '—'}\`${lib?.site ? `\n- **Site:** ${lib.site}` : ''}${customIcons.length ? `\n- **Custom icons:** ${customIcons.map((i) => `\`${i.name}\``).join(', ')} (SVGs embedded in \`tokens.json\`)` : ''}

---

## Components

${selectedComponents.length > 0
  ? selectedComponents.map((c: string) => `- \`${c}\``).join('\n')
  : '_No components selected._'}

---

## Using these tokens

**In code** — import \`variables.css\` and reference the custom properties:

\`\`\`css
.card {
  background: var(--color-surface-1);
  backdrop-filter: var(--panel-blur);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-4);
}
\`\`\`

Dark mode applies via the \`.dark\` class on \`<html>\`${themeCols.length > 2 ? `; extra themes (${themeCols.filter((t)=>t!=='light'&&t!=='dark').map(cap).join(', ')}) via \`data-theme="<name>"\`` : ''}.

**In Figma** — install the Escala DS plugin and import \`tokens.json\` (or point its Live Sync tab at your published endpoint). Primitives, semantic themes and typography land as Figma Variables.

**Never hardcode values** — if a color, size or shadow isn't a token here, it doesn't belong in the product. Extend this system first, then use the token.

---

*Token namespace: \`${slug}\`*
`
}

