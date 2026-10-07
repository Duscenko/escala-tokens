// Pure exporters — generate variables.css and README.md from store state.
// Shared by ExportView (preview/download) and GitHubConnectView (repo push).

import { iconSizeCssVars } from './iconSizing'
import { useDesignStore } from '../store/useDesignStore'
import { fontStack } from './fonts'
import { getIconAiSource, iconAiContext } from './iconLibraries'
import { toneLabel, withAlpha, darkShadow, generateAlphaScale, BLACK_ALPHA_SCALE, WHITE_ALPHA_SCALE } from './colorUtils'
import { resolveFamilyPages } from './colorActions'
import { mdCell } from './utils'
import { architectureLabel } from './semanticArchitectures'
import { typeRoleCssVars, TYPE_ROLES, mergeTypeRoles } from './typeRoles'
import { allLayoutRoleCssVars, LAYOUT_ROLES, mergeLayoutRoles, mergeGridFrame, extractBreakpoints, BREAKPOINT_STEPS, breakpointKey, gridFrameRootCss, gridFrameMediaCss, layoutValueCss, resolveLayoutRole, radiusRolesViewportCss, spacingRolesViewportCss, breakpointTabletMax, breakpointMobileMax, RADIUS_RESPONSIVE_STEPS, RADIUS_RESPONSIVE, type RadiusRoleViewports } from './layoutTokens'
import { gradientToCss, gradientSlug } from './gradients'
import { resolveThemeFoundations } from './themeFoundations'
import { type ThemeAppearance } from './themeModes'
import { dimensionCssVar, dimensionFromKey, dimensionScaleForStore, dimensionVar, parseDimension } from './dimensions'

// Panel (background-secondary: cards, panels, sections) tokens — translucent
// mode bakes alpha into the color and pairs it with --panel-blur for backdrop-
// filter; page mode swaps in the primitives page background (light themes only).
const PANEL_KEYS = ['background-secondary']

/** `--padding-*` is a four-sided mirror of `spacing-inset-surface`. Emit the
 *  role alias when the stored px still matches that step; keep raw px only
 *  when a side has drifted, so the leak is visible rather than silent. */
function paddingCssEntries(
  padding: Record<string, string>,
  spacing: Record<string, string>,
  spacingRoles?: Record<string, string>,
): [string, string][] {
  // The role may hold a step OR a pinned primitive — resolve through the same
  // helper everything else uses, so a pinned inset still collapses the mirror.
  const resolved = resolveLayoutRole('spacing', spacingRoles, spacing, 'inset-surface')
  return Object.entries(padding).map(([side, value]) => [
    side,
    resolved && value === resolved ? 'var(--spacing-inset-surface)' : dimensionVar(value),
  ])
}

export function buildCSS(store: ReturnType<typeof useDesignStore.getState>): string {
  const { primaryScale, grayLightScale, errorScale, warningScale, successScale, infoScale, customColors, themes, themeOrder, themeKinds, typography, spacing, padding, radius, shadows, grid, sizes, selector, stroke, radiusRoles, spacingRoles, sizeRoles, selectorRoles, strokeRoles, breakpointRoles, gridFrame, colorNaming, panelBackground, pageBackground, gradients } = store
  // First theme in order that actually has tokens. Whole-system exports stay
  // light-first; Get code remaps a dark-created theme so `:root` is dark.
  const rootKey = themeOrder.find((theme) => Object.values(themes[theme] ?? {}).some(Boolean)) ?? 'light'
  const rootKind: ThemeAppearance = themeKinds?.[rootKey] ?? (rootKey === 'dark' ? 'dark' : 'light')
  const semanticTokens = themes[rootKey] ?? themes.light ?? {}
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

  // Alpha twins — reproduces each solid tone when composited over the page
  // (see tokens.json's `colors.primitiveAlpha`). CSS is a flat namespace, so
  // the `-a-` infix disambiguates from the solid var above it, matching the
  // per-family export's own `tokenPrefix` (`accent-a`, `<custom>-a`, …).
  // Light only, same as the solid families above — this file doesn't emit a
  // dark primitive variant for those either; dark themes get their own
  // resolved values through the semantic layer.
  lines.push('\n  /* Alpha twins — reproduce a solid tone over the page, for translucent fills */')
  const alphaFamily = (name: string, scale: Record<number, string>) => {
    if (!Object.keys(scale).length) return
    const alpha = generateAlphaScale(scale, pageBackground, 'light')
    Object.entries(alpha)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([k, v]) => { if (v) lines.push(`  --color-${name}-a-${toneLabel(colorNaming, Number(k))}: ${v};`) })
  }
  alphaFamily('accent', primaryScale)
  alphaFamily('neutral', grayLightScale)
  alphaFamily('error', errorScale)
  alphaFamily('warning', warningScale)
  alphaFamily('success', successScale)
  alphaFamily('info', infoScale)
  customColors.forEach((c) => {
    const page = resolveFamilyPages(store, c.key).light
    if (!Object.keys(c.scale).length) return
    const alpha = generateAlphaScale(c.scale, page, 'light')
    Object.entries(alpha)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([k, v]) => { if (v) lines.push(`  --color-${c.key}-a-${toneLabel(colorNaming, Number(k))}: ${v};`) })
  })

  // Neutral alpha primitives — a fixed opacity ladder, not derived from any
  // family (see colorUtils' BLACK_ALPHA_SCALE/WHITE_ALPHA_SCALE). For scrims,
  // ghost-state washes and rims over a surface the token doesn't know.
  lines.push('\n  /* Neutral alpha — fixed opacity ladder for scrims, washes, rims */')
  Object.entries(BLACK_ALPHA_SCALE)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([k, v]) => lines.push(`  --color-black-a-${toneLabel(colorNaming, Number(k))}: ${v};`))
  Object.entries(WHITE_ALPHA_SCALE)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([k, v]) => lines.push(`  --color-white-a-${toneLabel(colorNaming, Number(k))}: ${v};`))

  lines.push(`\n  /* Semantic tokens — ${rootKind} */`)
  Object.entries(semanticTokens).forEach(([k, v]) => {
    if (v) lines.push(`  --color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${panelValue(k, v, rootKind)};`)
  })

  lines.push('\n  /* Panel background — apply to surface-1: backdrop-filter: var(--panel-blur) */')
  lines.push(`  --panel-blur: ${translucent ? 'blur(16px)' : 'none'};`)

  // Dimension primitives — ONE collection of numbers, named by value, no theme
  // modes. Every length below (spacing, radius, sizes, selector, stroke,
  // breakpoints) aliases it, and theme blocks only re-point the alias. See
  // design-plans/dimension-primitives.md.
  lines.push('\n  /* Dimension primitives — one value each; every length below aliases these */')
  Object.entries(dimensionScaleForStore(store, themeOrder))
    .sort(([, a], [, b]) => parseFloat(a) - parseFloat(b))
    .forEach(([k, v]) => lines.push(`  --dimension-${k}: ${v};`))

  lines.push('\n  /* Typography */')
  lines.push(`  --font-family-heading: ${fontStack(typography.headingFontFamily ?? typography.fontFamily)};`)
  lines.push(`  --font-family-body: ${fontStack(typography.fontFamily)};`)
  Object.entries(typography.sizes).forEach(([k, v]) => lines.push(`  --font-size-${k}: ${v};`))
  Object.entries(typography.lineHeights ?? {}).forEach(([k, v]) => lines.push(`  --line-height-${k}: ${v};`))
  Object.entries(typography.weights).forEach(([k, v]) => lines.push(`  --font-weight-${k}: ${v};`))
  lines.push('\n  /* Text roles — alias the primitive scale. Desktop, plus `-tablet` and `-mobile`. */')
  typeRoleCssVars(typography.roles).forEach((l) => lines.push(`  ${l}`))

  lines.push('\n  /* Spacing */')
  Object.entries(spacing).forEach(([k, v]) => lines.push(`  --spacing-${k}: ${dimensionVar(v)};`))

  lines.push('\n  /* Padding — per-side surface inset (alias of spacing-inset-surface) */')
  paddingCssEntries(padding, spacing, spacingRoles).forEach(([k, v]) => lines.push(`  --padding-${k}: ${v};`))

  lines.push('\n  /* Radius */')
  Object.entries(radius).forEach(([k, v]) => lines.push(`  --radius-${k}: ${dimensionVar(v)};`))

  lines.push('\n  /* Sizes */')
  Object.entries(sizes).forEach(([k, v]) => lines.push(`  --size-${k}: ${dimensionVar(v)};`))

  lines.push('\n  /* Selectors — checkbox / radio / switch glyph, a square not a height */')
  Object.entries(selector ?? {}).forEach(([k, v]) => lines.push(`  --selector-${k}: ${dimensionVar(v)};`))

  lines.push('\n  /* Icon sizes — scale aliases Dimension primitives; control roles follow the control heights */')
  iconSizeCssVars(sizes, typography.sizes?.['text-md']).forEach((l) => lines.push(l))

  lines.push('\n  /* Stroke — border-width / ring spread, not paint */')
  // A sub-pixel value is declared at its true weight and floored to 1px below
  // 2dppx: on a 1x display the browser rounds a hairline into an artefact (or
  // into nothing). The media query is emitted after `:root` closes, below.
  Object.entries(stroke ?? {}).forEach(([k, v]) => lines.push(`  --stroke-${k}: ${dimensionVar(v)};`))

  lines.push('\n  /* Layout roles — alias the primitive scale. Never raw px. */')
  allLayoutRoleCssVars({
    radius: mergeLayoutRoles('radius', radiusRoles),
    spacing: mergeLayoutRoles('spacing', spacingRoles),
    size: mergeLayoutRoles('size', sizeRoles),
    selector: mergeLayoutRoles('selector', selectorRoles),
    stroke: mergeLayoutRoles('stroke', strokeRoles),
    breakpoint: mergeLayoutRoles('breakpoint', breakpointRoles),
  }, { radius, spacing, size: sizes, selector: selector ?? {}, stroke: stroke ?? {}, breakpoint: extractBreakpoints(grid) }).forEach((l) => lines.push(`  ${l}`))

  lines.push('\n  /* Shadow */')
  Object.entries(shadows).forEach(([k, v]) => lines.push(`  --shadow-${k}: ${v};`))

  lines.push('\n  /* Breakpoints — primitive min-widths */')
  const bps = extractBreakpoints(grid)
  BREAKPOINT_STEPS.forEach((step) => {
    lines.push(`  --breakpoint-${step}: ${dimensionVar(bps[step])};`)
    lines.push(`  --grid-${breakpointKey(step)}: var(--breakpoint-${step});`)
  })

  lines.push('\n  /* Grid frame — desktop aliases. Tablet / mobile override below. */')
  gridFrameRootCss(gridFrame, { spacing, breakpoints: extractBreakpoints(grid) }).forEach((l) => lines.push(`  ${l}`))

  if (gradients.length) {
    lines.push('\n  /* Gradients */')
    gradients.forEach((g) => lines.push(`  --gradient-${gradientSlug(g)}: ${gradientToCss(g)};`))
  }

  lines.push('}')

  // Hairline guard. A sub-pixel border is only a hairline at 2dppx or better;
  // at 1x the browser rounds it to an artefact, so the standard-density case
  // gets 1px. Written as an override on the low-density side rather than a
  // min-resolution bump, so a UA that reports no resolution still gets a
  // border that renders.
  const hairlines = Object.entries(stroke ?? {}).filter(([, v]) => {
    const px = parseFloat(v)
    return Number.isFinite(px) && px > 0 && px < 1
  })
  if (hairlines.length) {
    lines.push('\n@media (max-resolution: 1.99dppx) {')
    lines.push('  :root {')
    hairlines.forEach(([k]) => lines.push(`    --stroke-${k}: 1px;`))
    lines.push('  }')
    lines.push('}')
  }

  // The same two viewport blocks carry the grid frame AND the radius roles
  // stepping down (RADIUS_RESPONSIVE): one media query per viewport.
  lines.push(`\n${gridFrameMediaCss(breakpointRoles, grid, gridFrame, spacing, { roles: radiusRoles, radius, viewports: store.radiusRoleViewports }, { roles: spacingRoles, spacing })}`)
  // Themes with their own foundations step their OWN radius roles down too.
  const themedRadius: { selector: string; roles?: Record<string, string>; radius: Record<string, string>; viewports?: RadiusRoleViewports; spacingRoles?: Record<string, string>; spacing: Record<string, string> }[] = []

  // Theme blocks contain semantics plus any complete foundation override.
  // Dark keeps the `.dark` convention; extra themes use data-theme.
  themeOrder.forEach((theme) => {
    const hasFoundationOverride = Boolean(store.themeFoundations?.[theme])
    if (theme === rootKey && !hasFoundationOverride) return
    const entries = Object.entries(themes[theme] ?? {}).filter(([, v]) => v)
    const kind = themeKinds?.[theme] ?? (theme === 'dark' ? 'dark' : 'light')
    const foundations = resolveThemeFoundations(store, theme)
    // A dark-kind theme also re-points the gradients that carry a dark
    // appearance — same `--gradient-<slug>` name, overridden in the same block
    // the semantic tokens are, so consuming a gradient never needs a second
    // variable name or a theme check.
    const darkGradients = kind === 'dark'
      ? gradients.filter((g) => g.stops.some((s) => s.darkColor))
      : []
    // Same treatment for elevation, and for a stronger reason: a gradient
    // merely looks different on a dark page, whereas the shadow ramp's
    // near-black colour IS the dark page — unoverridden it renders as nothing.
    // `none` is skipped because its derivation is a no-op, so the None preset
    // doesn't emit six dead declarations.
    const darkShadows = kind === 'dark'
      ? Object.entries(foundations.shadows).filter(([, v]) => v && v !== 'none')
      : []
    if (!entries.length && !darkGradients.length && !darkShadows.length && !hasFoundationOverride) return
    const themeSelector = theme === 'light'
      ? (rootKind === 'dark' ? '.light, [data-theme="light"]' : ':root, [data-theme="light"]')
      : theme === 'dark'
        ? '.dark, [data-theme="dark"]'
        : `[data-theme="${theme}"]`
    lines.push(`\n${themeSelector} {`)
    if (entries.length) {
      lines.push(`  /* Semantic tokens — ${theme} */`)
      entries.forEach(([k, v]) => {
        let next = v
        if (PANEL_KEYS.includes(k)) {
          if (foundations.panelBackground === 'translucent') next = withAlpha(v, 0.7)
          else if (foundations.panelBackground === 'page' && kind === 'light') next = pageBackground
        }
        lines.push(`  --color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${next};`)
      })
    }
    if (hasFoundationOverride) {
      lines.push(`  /* Foundations — ${theme} */`)
      lines.push(`  --font-family-heading: ${fontStack(foundations.typography.headingFontFamily ?? foundations.typography.fontFamily)};`)
      lines.push(`  --font-family-body: ${fontStack(foundations.typography.fontFamily)};`)
      Object.entries(foundations.typography.sizes).forEach(([k, v]) => lines.push(`  --font-size-${k}: ${v};`))
      Object.entries(foundations.typography.lineHeights ?? {}).forEach(([k, v]) => lines.push(`  --line-height-${k}: ${v};`))
      Object.entries(foundations.typography.weights).forEach(([k, v]) => lines.push(`  --font-weight-${k}: ${v};`))
      typeRoleCssVars(foundations.typography.roles).forEach((line) => lines.push(`  ${line}`))
      Object.entries(foundations.spacing).forEach(([k, v]) => lines.push(`  --spacing-${k}: ${dimensionVar(v)};`))
      paddingCssEntries(foundations.padding, foundations.spacing, foundations.spacingRoles)
        .forEach(([k, v]) => lines.push(`  --padding-${k}: ${v};`))
      Object.entries(foundations.radius).forEach(([k, v]) => lines.push(`  --radius-${k}: ${dimensionVar(v)};`))
      Object.entries(foundations.sizes).forEach(([k, v]) => lines.push(`  --size-${k}: ${dimensionVar(v)};`))
      Object.entries(foundations.selector).forEach(([k, v]) => lines.push(`  --selector-${k}: ${dimensionVar(v)};`))
      Object.entries(foundations.stroke).forEach(([k, v]) => lines.push(`  --stroke-${k}: ${dimensionVar(v)};`))
      allLayoutRoleCssVars({
        radius: mergeLayoutRoles('radius', foundations.radiusRoles),
        spacing: mergeLayoutRoles('spacing', foundations.spacingRoles),
        size: mergeLayoutRoles('size', foundations.sizeRoles),
        selector: mergeLayoutRoles('selector', foundations.selectorRoles),
        stroke: mergeLayoutRoles('stroke', foundations.strokeRoles),
        breakpoint: mergeLayoutRoles('breakpoint', foundations.breakpointRoles),
      }, {
        radius: foundations.radius, spacing: foundations.spacing, size: foundations.sizes,
        selector: foundations.selector, stroke: foundations.stroke, breakpoint: extractBreakpoints(foundations.grid),
      }).forEach((line) => lines.push(`  ${line}`))
      if (kind !== 'dark') Object.entries(foundations.shadows).forEach(([k, v]) => lines.push(`  --shadow-${k}: ${v};`))
      gridFrameRootCss(foundations.gridFrame, { spacing: foundations.spacing, breakpoints: extractBreakpoints(foundations.grid) }).forEach((line) => lines.push(`  ${line}`))
      themedRadius.push({ selector: themeSelector, roles: foundations.radiusRoles, radius: foundations.radius, viewports: foundations.radiusRoleViewports, spacingRoles: foundations.spacingRoles, spacing: foundations.spacing })
      lines.push(`  --panel-blur: ${foundations.panelBackground === 'translucent' ? 'blur(16px)' : 'none'};`)
    }
    if (darkGradients.length) {
      lines.push(`  /* Gradients — ${theme} */`)
      darkGradients.forEach((g) => lines.push(`  --gradient-${gradientSlug(g)}: ${gradientToCss(g, 'dark')};`))
    }
    if (darkShadows.length) {
      lines.push(`  /* Shadows — ${theme} */`)
      darkShadows.forEach(([k, v]) => lines.push(`  --shadow-${k}: ${darkShadow(v)};`))
    }
    lines.push('}')
  })

  if (themedRadius.length) {
    const bps = extractBreakpoints(grid)
    for (const [vp, max] of [['tablet', breakpointTabletMax(breakpointRoles, bps)], ['mobile', breakpointMobileMax(breakpointRoles, bps)]] as const) {
      const blocks = themedRadius
        .map((t) => ({ selector: t.selector, decls: [...radiusRolesViewportCss(vp, t.roles, t.radius, t.viewports), ...spacingRolesViewportCss(vp, t.spacingRoles, t.spacing)] }))
        .filter((b) => b.decls.length)
      if (!blocks.length) continue
      lines.push(`\n@media (max-width: ${max}) {`)
      for (const b of blocks) {
        lines.push(`  ${b.selector} {`)
        b.decls.forEach((d) => lines.push(`    ${d}`))
        lines.push('  }')
      }
      lines.push('}')
    }
  }

  return lines.join('\n')
}

/** README table for a map of lengths: Token · Value · the Dimension primitive it aliases. */
function readmeLengthTable(prefix: string, map: Record<string, string>): string {
  const rows = Object.entries(map).map(([k, v]) => {
    const n = parseDimension(v)
    return `| \`--${prefix}-${k}\` | \`${v}\` | ${n === null ? '—' : `\`${dimensionCssVar(n)}\``} |`
  })
  return ['| Token | Value | Primitive |', '|-------|-------|-----------|', ...rows].join('\n')
}

export function buildMarkdown(store: ReturnType<typeof useDesignStore.getState>): string {
  const {
    projectName, projectDescription, primaryColor, primaryScale, grayLightScale, errorScale, warningScale,
    successScale, infoScale, customColors, themes, themeOrder, typography, spacing, padding, radius,
    shadows, grid, sizes, selector, stroke, radiusRoles, spacingRoles, sizeRoles, selectorRoles, strokeRoles, breakpointRoles, gridFrame, selectedComponents, iconAiSource, customIcons, githubRepo, colorNaming, panelBackground,
    gradients, gradientAssignments,
  } = store
  const gradientSlugById = (id: string | null) => {
    const g = gradients.find((x) => x.id === id)
    return g ? gradientSlug(g) : null
  }
  const semanticTokens = themes.light ?? {}
  const themeCols = themeOrder.filter((t) => themes[t])
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  // Same 6 built-in families `buildCSS` ships (Accent · Neutral · Error ·
  // Warning · Success · Info) — this README used to print ONLY Accent plus
  // any custom colors, silently omitting the other 5 primitive scales that
  // variables.css and tokens.json both include. Someone reading the README
  // for "what primitives does this system have" would see one ramp and
  // conclude the other five didn't exist.
  const primitiveTable = (name: string, scale: Record<number, string>) =>
    Object.keys(scale).length
      ? `\n### Primitive Scale — ${cap(name)}\n\n| Token | Value |\n|-------|-------|\n${Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => `| \`--color-${name}-${toneLabel(colorNaming, Number(k))}\` | \`${v}\` |`).join('\n')}\n`
      : ''
  const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const headingFont = typography.headingFontFamily ?? typography.fontFamily
  const ai = getIconAiSource(iconAiSource)
  const iconsBlock = iconAiContext(iconAiSource)

  return `# ${projectName} — Design System

> Generated by [Escala Tokens](https://www.escalatokens.com)
${projectDescription.trim() ? `\n${projectDescription.trim()}\n` : ''}
## Overview

- **Primary color:** \`${primaryColor}\`
- **Themes:** ${themeCols.map(cap).join(', ')}
- **Semantic architecture:** ${architectureLabel(store.semanticArchitecture)}
- **Panel background:** ${cap(panelBackground)}
- **Heading font:** ${headingFont}
- **Body font:** ${typography.fontFamily}
- **Icons:** ${ai.label} — ${ai.repo}
- **Components:** ${selectedComponents.length > 0 ? selectedComponents.join(', ') : 'none selected'}${githubRepo ? `\n- **Repository:** [${githubRepo}](https://github.com/${githubRepo})` : ''}

---

## Color Tokens
${primitiveTable('accent', primaryScale)}${primitiveTable('neutral', grayLightScale)}${primitiveTable('error', errorScale)}${primitiveTable('warning', warningScale)}${primitiveTable('success', successScale)}${primitiveTable('info', infoScale)}${customColors.map((c)=>`
### Custom — ${c.label}

| Token | Value |
|-------|-------|
${Object.entries(c.scale).sort(([a],[b])=>Number(a)-Number(b)).map(([k,v])=>`| \`--color-${c.key}-${toneLabel(colorNaming, Number(k))}\` | \`${v}\` |`).join('\n')}`).join('\n')}

### Alpha (translucent) primitives

Two different contracts, both shipped:

- **\`--color-<family>-a-<tone>\`** — the alpha TWIN of a family. Solved so that
  tone _N_ reproduces the solid tone _N_ when composited over its own page.
  Use it for a tint that has to survive on top of an unknown surface (a status
  banner inside a card, a selected row, a ghost-button wash). The opacity is a
  RESULT, not a setting, so the ladder is not monotonic — \`-a-1\` is fully
  transparent by construction (tone 1 IS the page).
- **\`--color-black-a-<tone>\` / \`--color-white-a-<tone>\`** — a FIXED opacity
  ladder (5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95 %), agnostic to any
  page. Use it for scrims, neutral ghost washes and the dark-mode elevation
  rim, where the ink is genuinely black or white and the opacity IS the design
  decision.

Sixteen semantic roles resolve through these — see the Semantic Tokens table
for which. Values there may therefore be 8-digit \`#rrggbbaa\`.

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

### Text roles

| Role | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
${TYPE_ROLES.map((r) => {
  const m = mergeTypeRoles(typography.roles)[r.key]
  const fmt = (a: { family: string; size: string; weight: string }) => `${a.size} · ${a.weight} · ${a.family}`
  return `| \`text-${r.key}\` | \`${fmt(m.desktop)}\` | \`${fmt(m.tablet)}\` | \`${fmt(m.mobile)}\` |`
}).join('\n')}

---

## Dimension primitives

One collection of lengths, named by value and identical in every theme. Spacing, radius, sizes, selectors, stroke and breakpoints below all alias it — a theme changes which primitive a step points at, never a primitive's value.

${Object.entries(dimensionScaleForStore(store, themeOrder)).sort(([a], [b]) => dimensionFromKey(a) - dimensionFromKey(b)).map(([k]) => `\`--dimension-${k}\``).join(' · ')}

---

## Spacing

${readmeLengthTable('spacing', spacing)}

### Spacing roles

| Role | Aliases |
|------|---------|
${LAYOUT_ROLES.spacing.map((r) => `| \`--spacing-${r.key}\` | \`${layoutValueCss('spacing', mergeLayoutRoles('spacing', spacingRoles)[r.key], spacing)}\` |`).join('\n')}

### Padding — surface inset

| Token | Value |
|-------|-------|
${paddingCssEntries(padding, spacing, spacingRoles).map(([k,v])=>`| \`--padding-${k}\` | \`${v}\` |`).join('\n')}

---

## Border Radius

${readmeLengthTable('radius', radius)}

### Radius roles

| Role | Aliases |
|------|---------|
${LAYOUT_ROLES.radius.map((r) => `| \`--radius-${r.key}\` | \`${layoutValueCss('radius', mergeLayoutRoles('radius', radiusRoles)[r.key], radius)}\` |`).join('\n')}

### Responsive radius

Corner rounding steps down on smaller screens: every responsive token points at a static step, one smaller on Tablet and one (two from 3xl up) smaller on Mobile. The radius roles follow it in the Tablet and Mobile media queries; in Figma, Dimension Semantics carries a value per viewport mode.

| Token | Desktop | Tablet | Mobile |
|---|---|---|---|
${RADIUS_RESPONSIVE_STEPS.map((step) => `| \`${step}\` | ${(['desktop', 'tablet', 'mobile'] as const).map((vp) => { const to = RADIUS_RESPONSIVE[step][vp]; return `\`${to}\` · ${radius[to] ?? '—'}` }).join(' | ')} |`).join('\n')}

---

## Shadow

Elevation ships a dark twin: the ramp's near-black shadow colour is the dark page itself, so the light value renders as nothing there. The dark column is applied automatically under \`.dark\` — same \`--shadow-*\` name, no theme check needed.

| Token | Light | Dark |
|-------|-------|------|
${Object.entries(shadows).map(([k,v])=>`| \`--shadow-${k}\` | \`${v}\` | ${v === 'none' ? '—' : `\`${darkShadow(v)}\``} |`).join('\n')}

---

## Grid

Breakpoint primitives (min-width) plus desktop / mobile intent. Mobile max-width is \`calc(desktop − 1px)\` — never a raw 767. The layout frame aliases spacing and breakpoints.

${readmeLengthTable('breakpoint', Object.fromEntries(BREAKPOINT_STEPS.map((s) => [s, extractBreakpoints(grid)[s]])))}

### Viewport roles

| Role | Aliases | Query |
|------|---------|-------|
| \`--breakpoint-desktop\` | \`${layoutValueCss('breakpoint', mergeLayoutRoles('breakpoint', breakpointRoles).desktop, extractBreakpoints(grid))}\` | min-width |
| \`--breakpoint-mobile\` | \`calc(${layoutValueCss('breakpoint', mergeLayoutRoles('breakpoint', breakpointRoles).mobile, extractBreakpoints(grid))} - 1px)\` | max-width |

### Frame

| Token | Desktop | Mobile |
|-------|---------|--------|
${['columns', 'gutter', 'margin', 'container'].map((k) => {
  const f = mergeGridFrame(gridFrame)
  const d = f.desktop[k as 'columns']
  const m = f.mobile[k as 'columns']
  const fmt = (step: string) => k === 'columns' ? step : k === 'container' ? (step === 'none' ? 'none' : layoutValueCss('breakpoint', step, extractBreakpoints(grid))) : layoutValueCss('spacing', step, spacing)
  return `| \`--grid-${k}\` | \`${fmt(d)}\` | \`${fmt(m)}\` |`
}).join('\n')}

---

## Sizes

${readmeLengthTable('size', sizes)}

### Size roles

| Role | Aliases |
|------|---------|
${LAYOUT_ROLES.size.map((r) => `| \`--size-${r.key}\` | \`${layoutValueCss('size', mergeLayoutRoles('size', sizeRoles)[r.key], sizes)}\` |`).join('\n')}

---

## Selectors

The square a checkbox, radio or switch knob is drawn in — a glyph, not a control
height, so it has its own ramp. Below 24px, pair it with a transparent hit area
(\`--size-hit\`) to meet WCAG 2.2 target size; don't grow the glyph instead.

${readmeLengthTable('selector', selector ?? {})}

### Selector roles

| Role | Aliases |
|------|---------|
${LAYOUT_ROLES.selector.map((r) => `| \`--selector-${r.key}\` | \`${layoutValueCss('selector', mergeLayoutRoles('selector', selectorRoles)[r.key], selector ?? {})}\` |`).join('\n')}

---

## Stroke

Line weight — not paint. Color stays on \`border.*\`.

${readmeLengthTable('stroke', stroke ?? {})}

### Stroke roles

| Role | Aliases |
|------|---------|
${LAYOUT_ROLES.stroke.map((r) => `| \`--stroke-${r.key}\` | \`${layoutValueCss('stroke', mergeLayoutRoles('stroke', strokeRoles)[r.key], stroke ?? {})}\` |`).join('\n')}

---

## Gradients

${gradients.length
  ? `| Token | Type | Light | Dark |
|-------|------|-------|------|
${gradients.map((g)=>`| \`--gradient-${gradientSlug(g)}\` | ${g.type} | \`${gradientToCss(g)}\` | ${g.stops.some((s)=>s.darkColor) ? `\`${gradientToCss(g, 'dark')}\`` : '—'} |`).join('\n')}

Assigned surfaces: ${[
    gradientSlugById(gradientAssignments.cover) ? `card cover → \`--gradient-${gradientSlugById(gradientAssignments.cover)}\`` : null,
    gradientSlugById(gradientAssignments.avatar) ? `avatars → \`--gradient-${gradientSlugById(gradientAssignments.avatar)}\`` : null,
  ].filter(Boolean).join(', ') || '_none_'}.`
  : '_No gradients defined._'}

---

${iconsBlock.markdown}${customIcons.length ? `\n- **Custom icons:** ${customIcons.map((i) => `\`${i.name}\``).join(', ')} (SVGs embedded in \`tokens.json\`)` : ''}

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
  border: var(--stroke-control) solid var(--color-border-default);
  border-radius: var(--radius-container);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-inset-surface);
}
\`\`\`

Dark mode applies via the \`.dark\` class on \`<html>\`${themeCols.length > 2 ? `; extra themes (${themeCols.filter((t)=>t!=='light'&&t!=='dark').map(cap).join(', ')}) via \`data-theme="<name>"\`` : ''}.

**In Figma** — install the Escala DS plugin and import \`tokens.json\` (or point its Live Sync tab at your published endpoint). Primitives, semantic themes and typography land as Figma Variables.

**Never hardcode values** — if a color, size or shadow isn't a token here, it doesn't belong in the product. Extend this system first, then use the token.

---

*Token namespace: \`${slug}\`*
`
}
