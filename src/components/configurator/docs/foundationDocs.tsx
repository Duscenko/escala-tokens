// Foundation documentation — one article per foundation the Variables
// Generator edits (Color · Typography · Radius · Spacing · Shadow ·
// Grid · Sizes · Icons), rendered in the SAME docs site, with the same page
// shape, as the component articles.
//
// This replaces the old `DesignRules` single-scroll sheet. Nothing it printed
// was dropped — every one of its twelve sheets is still here, just filed under
// the foundation it documents, and the whole-system sheet survives as the
// docs site's "System reference" entry (`OVERVIEW_KEY`), after Get started.
// It still renders every foundation's sections in one column exactly as before.
//
// The rule the old sheet was built on still holds and is the reason these pages
// are worth having: every value reads the store through the SHARED resolvers
// (`sourceScaleFor` / `recToneFor` from lib/semanticRoles, `toneLabel` from
// colorUtils), never a private copy. A ramp shown here is the ramp that
// exports — if a value looks wrong on this page, it is wrong in tokens.json
// too. Semantic tables print the PRIMITIVE REFERENCE next to the hex in both
// appearances, because a hand-off reader needs to see that `content-brand` IS
// `accent-8`, not just that it happens to be #CCF57B today.

import { useMemo, type ReactNode } from 'react'
import { useItForFoundation, useItMarkdown } from './useIt'
import { useDesignStore, DEFAULT_GRAY_DARK_SCALE } from '../../../store/useDesignStore'
import {
  ROLE_GROUPS, sourceScaleFor, recToneFor, SCALE_META, baseLabelForTone,
  type Role, type GlobalScales,
} from '../../../lib/semanticRoles'
import { toneLabel, generateAlphaScale, BLACK_ALPHA_SCALE, WHITE_ALPHA_SCALE, type ColorNaming } from '../../../lib/colorUtils'
import {
  buildArchitectureView,
  CATEGORICAL_ROLE_COMMENTS,
} from '../../../lib/semanticArchitectures'
import { themeContextFromStore } from '../../../lib/tokenGenerator'
import { TYPE_SCALE_KEYS, FONT_WEIGHT_BASES } from '../../../lib/typographyStandard'
import { TYPE_ROLES, TYPE_ROLE_GROUPS, mergeTypeRoles, resolveTypeStyle, typeRolesInGroup } from '../../../lib/typeRoles'
import {
  LAYOUT_ROLE_GROUPS,
  LAYOUT_ROLES,
  RADIUS_STEPS,
  SPACING_STEPS,
  STROKE_STEPS,
  BREAKPOINT_STEPS,
  GRID_FRAME_FIELDS,
  extractBreakpoints,
  mergeGridFrame,
  mergeLayoutRoles,
  resolveGridFrame,
  resolveLayoutRole,
  breakpointMobileMax,
  type LayoutFamily,
} from '../../../lib/layoutTokens'
import { SHADOW_STEPS } from '../Step7_Shadow'
import { fontStack } from '../../../lib/fonts'
import { PHOSPHOR_LIBRARY } from '../../../lib/iconLibraries'

/** The Overview page — the whole-system reference sheet the old Design Rules
 *  view was. Not a foundation key, so it can never collide with one. Get
 *  started (`__get-started`) is the Docs landing; this is the spec. */
export const OVERVIEW_KEY = '__overview'

// ── Resolved system context ──────────────────────────────────────────────────
// Resolved ONCE per render of the docs site and handed to every section, so a
// page that shows three foundations (Overview) doesn't re-resolve 89 roles
// three times.

export interface SystemDoc {
  scales: GlobalScales
  roles: ResolvedRole[]
  /** Categorical architecture groups — same projection as the Color preview. */
  categoricalCategories?: CategoricalCategoryDoc[]
  primitiveFamilies: { label: string; scale: Record<number, string> }[]
  alphaFamilies: { label: string; scale: Record<number, string> }[]
  colorNaming: ColorNaming
  typography: ReturnType<typeof useDesignStore.getState>['typography']
  spacing: Record<string, string>
  padding: Record<string, string>
  radius: Record<string, string>
  shadows: Record<string, string>
  grid: Record<string, string>
  gridFrame: ReturnType<typeof mergeGridFrame>
  sizes: Record<string, string>
  stroke: Record<string, string>
  radiusRoles: Record<string, string>
  spacingRoles: Record<string, string>
  sizeRoles: Record<string, string>
  strokeRoles: Record<string, string>
  breakpointRoles: Record<string, string>
  iconLibrary: string
  customIcons: { name: string; svg: string }[]
  themeCount: number
}

export type ResolvedRole = {
  role: Role
  lightRef: string
  lightHex: string
  darkRef: string
  darkHex: string
}

export type ResolvedCategoricalToken = {
  id: string
  role: string
  lightRef: string
  lightHex: string
  darkRef: string
  darkHex: string
}

export type CategoricalCategoryDoc = {
  key: string
  label: string
  description: string
  tokens: ResolvedCategoricalToken[]
}

function categoricalRoleLabel(comment: string): string {
  return comment.match(/^\[ROLE: ([^\]]+)\]/)?.[1] ?? ''
}

function resolveCategoricalCategories(
  store: ReturnType<typeof useDesignStore.getState>,
): CategoricalCategoryDoc[] | undefined {
  if (store.semanticArchitecture !== 'categorical') return undefined

  const { themeNames, globalScales, resolvedPalettes } = themeContextFromStore(store)
  const modeKeys = store.themeOrder.filter((t) => store.themes[t])
  const modes = modeKeys.length ? modeKeys : themeNames.filter((t) => store.themes[t])
  if (!modes.length) return undefined

  const view = buildArchitectureView(
    'categorical',
    {
      themes: store.themes,
      themeKinds: store.themeKinds ?? {},
      themePalettes: resolvedPalettes,
      scales: globalScales,
      accent: store.primaryColor,
      pageBackground: store.pageBackground,
      darkBackground: store.darkBackground,
    },
    store.errorColor,
    store.architectureOverrides?.categorical ?? {},
    modes,
  )
  if (!view) return undefined

  const lightKey = modes.includes('light') ? 'light' : modes[0]
  const darkKey = modes.includes('dark') ? 'dark' : modes[modes.length - 1]

  return view.categories.map((cat) => ({
    key: cat.key,
    label: cat.label,
    description: cat.description,
    tokens: cat.tokens.map((tk) => {
      const id = `${cat.key}.${tk.key}`
      const l = tk.modes[lightKey]
      const d = tk.modes[darkKey]
      return {
        id,
        role: categoricalRoleLabel(CATEGORICAL_ROLE_COMMENTS[id] ?? ''),
        lightRef: l?.label ?? '',
        lightHex: l?.css ?? '',
        darkRef: d?.label ?? '',
        darkHex: d?.css ?? '',
      }
    }),
  }))
}

export function useSystemDoc(): SystemDoc {
  const store = useDesignStore()
  const {
    primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale,
    customColors, colorNaming, typography, spacing, padding, radius,
    shadows, grid, gridFrame, sizes, stroke, radiusRoles, spacingRoles, sizeRoles, strokeRoles, breakpointRoles,
    iconLibrary, customIcons, themeOrder, pageBackground,
  } = store

  const categoricalCategories = useMemo(
    () => resolveCategoricalCategories(store),
    [store],
  )

  const scales: GlobalScales = useMemo(() => ({
    gray: grayLightScale,
    grayDark: grayDarkScale ?? DEFAULT_GRAY_DARK_SCALE,
    dark: {
      gray: grayDarkScale ?? DEFAULT_GRAY_DARK_SCALE,
      brand: primaryDarkScale,
      error: errorDarkScale,
      warning: warningDarkScale,
      success: successDarkScale,
      info: infoDarkScale,
    },
    brand: primaryScale,
    error: errorScale,
    warning: warningScale,
    success: successScale,
    info: infoScale,
  }), [
    grayLightScale, grayDarkScale, primaryScale, primaryDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale,
  ])

  // Resolve every role once, through the SAME functions the export uses.
  const roles: ResolvedRole[] = useMemo(
    () => ROLE_GROUPS.flatMap((g) => g.roles).map((role) => {
      const ref = (kind: 'light' | 'dark') => {
        const scale = sourceScaleFor(role, kind, scales)
        const tone = recToneFor(role, kind, scale)
        const eff = kind === 'dark' && role.darkScale ? role.darkScale : role.scale
        // `base` is the theme-independent white/black pair — it has no numbered
        // ramp, so it names the colour instead of a tone.
        const name = eff === 'base'
          ? `base-${baseLabelForTone(tone)}`
          // `-dark` matches tokenGenerator's dark prefixes exactly
          // (`neutral-dark-*`, `accent-dark-*`…), so a ref printed here is
          // greppable in the exported file.
          : `${SCALE_META[eff].label}${kind === 'dark' ? '-dark' : ''}-${toneLabel(colorNaming, tone)}`
        return { name, hex: scale[tone] ?? '' }
      }
      const l = ref('light')
      const d = ref('dark')
      return { role, lightRef: l.name, lightHex: l.hex, darkRef: d.name, darkHex: d.hex }
    }),
    [scales, colorNaming],
  )

  // Primitives — every family that carries values, light ramp then dark twin,
  // named exactly as tokenGenerator's flattenScale prefixes them.
  const primitiveFamilies = useMemo(() => {
    const out: { label: string; scale: Record<number, string> }[] = [
      { label: 'Accent', scale: primaryScale },
      { label: 'Neutral', scale: grayLightScale },
      { label: 'State/Error', scale: errorScale },
      { label: 'State/Warning', scale: warningScale },
      { label: 'State/Success', scale: successScale },
      { label: 'State/Info', scale: infoScale },
      { label: 'Neutral Dark', scale: grayDarkScale ?? DEFAULT_GRAY_DARK_SCALE },
      { label: 'Accent Dark', scale: primaryDarkScale },
      { label: 'State/Error Dark', scale: errorDarkScale },
      { label: 'State/Warning Dark', scale: warningDarkScale },
      { label: 'State/Success Dark', scale: successDarkScale },
      { label: 'State/Info Dark', scale: infoDarkScale },
    ]
    customColors.forEach((c) => {
      out.push({ label: c.label, scale: c.scale })
      if (c.darkScale && Object.keys(c.darkScale).length) out.push({ label: `${c.label} Dark`, scale: c.darkScale })
    })
    return out.filter((f) => f.scale && Object.keys(f.scale).length)
  }, [primaryScale, primaryDarkScale, grayLightScale, grayDarkScale, errorScale, errorDarkScale,
      warningScale, warningDarkScale, successScale, successDarkScale, infoScale, infoDarkScale, customColors])

  // Alpha primitives — the OTHER half of the colour layer, and the one that
  // had no documentation at all while sixteen semantic roles resolved through
  // it. Two contracts, kept visually apart because they are not the same kind
  // of thing: a family's twin is SOLVED against its page, black/white is a
  // FIXED ladder. Built here (not in `primitiveFamilies`) so the doc can say
  // that out loud instead of listing eight more ramps that look identical.
  const alphaFamilies = useMemo(() => {
    const twin = (label: string, scale: Record<number, string>, bg: string, appearance: 'light' | 'dark') =>
      ({ label, scale: generateAlphaScale(scale, bg, appearance) })
    const out = [
      twin('Accent', primaryScale, pageBackground, 'light'),
      twin('Neutral', grayLightScale, pageBackground, 'light'),
      twin('State/Error', errorScale, pageBackground, 'light'),
      twin('State/Warning', warningScale, pageBackground, 'light'),
      twin('State/Success', successScale, pageBackground, 'light'),
      twin('State/Info', infoScale, pageBackground, 'light'),
    ]
    return out.filter((f) => Object.keys(f.scale).length)
  }, [primaryScale, grayLightScale, errorScale, warningScale, successScale, infoScale, pageBackground])

  return {
    scales, roles, categoricalCategories, primitiveFamilies, alphaFamilies, colorNaming, typography, spacing, padding,
    radius, shadows, grid, gridFrame, sizes, stroke,
    radiusRoles, spacingRoles, sizeRoles, strokeRoles, breakpointRoles,
    iconLibrary, customIcons,
    themeCount: themeOrder.length,
  }
}

// ── Table primitives (moved verbatim from the old Design Rules sheet) ────────

function Swatch({ hex, className = '' }: { hex: string; className?: string }) {
  return (
    <span
      className={`w-[18px] h-[18px] rounded-[5px] flex-shrink-0 ring-1 ring-black/10 dark:ring-white/15 ${className}`}
      style={{ background: hex || 'transparent' }}
      aria-hidden
    />
  )
}

/** One family's 1–12 ramp — swatch, tone number, hex.
 *
 *  **It sizes itself off its CONTAINER, not the viewport.** This block renders
 *  in two columns that differ by ~350px: the Docs article (756–972px) and the
 *  preview aside's Documentation tab (a 400px column, ~336px of content). A
 *  single fixed floor can't serve both — `min-w-[640px]` is exactly right in
 *  the article and forces two screens of horizontal scrolling in the panel,
 *  which is what "the ramps don't have to be this big" reported.
 *
 *  A container query is what lets ONE renderer serve both, which matters more
 *  than it looks: CLAUDE.md's rule for the panel is that the doc bodies are
 *  reused verbatim rather than forked into a "narrow variant", and a fork is
 *  precisely the thing that drifts once someone edits one copy.
 *
 *  What the compact form drops, and why that's the right shed:
 *  · **The hex label goes, the swatch and tone number stay.** A hex at 8px
 *    needs ~44px; twelve of those plus gaps needs the 640px floor. The ramp's
 *    JOB here is to show the curve and let you name a step — the swatch carries
 *    the curve, the number names the step, and the hex is still one hover away
 *    on the swatch's `title` (already there, not added for this).
 *  · **`h-8`/`gap-1`, which is not an invented density** — it's exactly
 *    `ScaleRow`'s, the compact ramp the Color hub already uses everywhere. So
 *    the panel's ramps read as the same object the editor shows, one column
 *    over, rather than as a shrunken version of the article's.
 *
 *  **640px is the threshold because 640px is what the full form needs** — it is
 *  the same number as the floor below it, not a second tuned constant. Literal
 *  px in both, deliberately: `:root` is 18px here, so a `rem`-based container
 *  breakpoint (`@2xl` = 42rem) would silently mean 756px (see CLAUDE.md's
 *  "Root font-size" note — this file's own floor was already once bitten by
 *  exactly that, `min-w-[40rem]` meaning 720px). */
/** Same ramp, on a CHECKERBOARD — an alpha swatch painted on a flat backdrop
 *  silently reads as whatever that backdrop makes it, which is exactly the
 *  misreading these tokens exist to prevent. The checkerboard has no "wrong
 *  theme" to break against. Same `CHECKER` treatment `AlphaHexCell` uses in
 *  the Primitives table, so the two surfaces agree on what "translucent"
 *  looks like. */
function AlphaRamp({ scale, naming }: { scale: Record<number, string>; naming: ColorNaming }) {
  return (
    <div className="@container">
      <div className="overflow-x-auto">
        <div className="flex gap-1.5 min-w-[640px] @max-[640px]:gap-1 @max-[640px]:min-w-0">
          {Object.entries(scale)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([tone, hex]) => (
              <div key={tone} className="flex-1 min-w-0 flex flex-col items-center gap-1 @max-[640px]:gap-0.5">
                <span
                  className="w-full h-11 rounded-lg ring-1 ring-black/10 dark:ring-white/15 relative overflow-hidden @max-[640px]:h-8 @max-[640px]:rounded-md"
                  style={{
                    backgroundImage: 'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
                    backgroundSize: '10px 10px',
                  }}
                  title={hex}
                >
                  <span className="absolute inset-0" style={{ background: hex }} />
                </span>
                <span className="text-micro font-mono tabular-nums text-fg-faint">
                  {toneLabel(naming, Number(tone))}
                </span>
                <span className="text-nano font-mono text-fg-faint/80 truncate max-w-full @max-[640px]:hidden">
                  {hex.toUpperCase()}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function PrimitiveRamp({ scale, naming }: { scale: Record<number, string>; naming: ColorNaming }) {
  return (
    <div className="@container">
      <div className="overflow-x-auto">
        <div className="flex gap-1.5 min-w-[640px] @max-[640px]:gap-1 @max-[640px]:min-w-0">
          {Object.entries(scale)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([tone, hex]) => (
              <div key={tone} className="flex-1 min-w-0 flex flex-col items-center gap-1 @max-[640px]:gap-0.5">
                <span
                  className="w-full h-11 rounded-lg ring-1 ring-black/10 dark:ring-white/15 @max-[640px]:h-8 @max-[640px]:rounded-md"
                  style={{ background: hex }}
                  title={hex}
                />
                <span className="text-micro font-mono tabular-nums text-fg-faint">
                  {toneLabel(naming, Number(tone))}
                </span>
                <span className="text-nano font-mono text-fg-faint/80 truncate max-w-full @max-[640px]:hidden">
                  {hex.toUpperCase()}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

/** A value cell — swatch + monospace text, the shape both the ref and hex
 *  columns use so the four columns of a semantic table read as one grid. */
function ValueCell({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="flex items-center gap-2 min-w-0 px-2 h-7 rounded-md border border-line bg-surface">
      <Swatch hex={hex} />
      <span className="truncate text-caption font-mono text-fg-muted">{label}</span>
    </span>
  )
}

// One row per role: name · primitive(light) · hex(light) · primitive(dark) ·
// hex(dark). The dark pair sits on a dark panel — the same trick the Figma
// sheet uses, and the same reason the Token Details dialog paints its dark
// card dark: a dark ramp's steps can only be judged on the page they ship on.
function RoleTable({ rows }: { rows: ResolvedRole[] }) {
  if (!rows.length) return null
  return (
    <div className="overflow-x-auto">
      {/* 672px, not `42rem` — the SAME root-font-size trap the primitive ramp's
          floor was already fixed for (`:root` is 18px, so `42rem` silently
          meant 756px, not the 672 the class name implies). Provably inert in
          the Docs article, whose column never drops below 756px, so the floor
          was never the binding constraint there; it only ever bound in the
          preview aside's Documentation tab, where it was quietly demanding an
          extra 84px of horizontal scrolling nobody asked for.
          The table still scrolls sideways in that column and that's correct —
          five real columns of tabular data can't reflow to 363px the way a
          ramp can (see `PrimitiveRamp`), and scrolling wide tables inside their
          own container is this codebase's documented answer. */}
      <div className="min-w-[672px]">
        {/* Column captions. The dark pair is a single visual block, so its two
            captions sit inside the dark panel with the cells they label. */}
        <div className="grid items-end gap-x-3 pb-2" style={{ gridTemplateColumns: '13rem 1fr 1fr 1fr 1fr' }}>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Token names</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Primitives · light</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Hex · light</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint pl-3">Primitives · dark</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Hex · dark</span>
        </div>
        <div className="relative">
          {/* The dark panel spans the last two columns for every row at once —
              one surface, not a dark background per cell. */}
          <div
            className="dark absolute inset-y-0 rounded-xl bg-app"
            style={{ left: 'calc(13rem + (100% - 13rem - 0.75rem * 4) / 4 * 2 + 0.75rem * 2)', right: 0 }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-1.5 py-2">
            {rows.map((r) => (
              <div key={r.role.key} className="grid items-center gap-x-3" style={{ gridTemplateColumns: '13rem 1fr 1fr 1fr 1fr' }}>
                <span className="flex items-center gap-2 min-w-0">
                  <Swatch hex={r.lightHex} />
                  <span className="truncate text-body text-fg" title={r.role.key}>{r.role.key}</span>
                </span>
                <ValueCell hex={r.lightHex} label={r.lightRef} />
                <ValueCell hex={r.lightHex} label={r.lightHex.toUpperCase() || '—'} />
                <span className="dark pl-3"><ValueCell hex={r.darkHex} label={r.darkRef} /></span>
                <span className="dark"><ValueCell hex={r.darkHex} label={r.darkHex.toUpperCase() || '—'} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The colour band above each table — every role's fill, laid out edge to edge,
 *  so the group reads as a palette before it reads as a list. */
function RoleBand({ rows }: { rows: ResolvedRole[] }) {
  if (!rows.length) return null
  return (
    <div className="flex flex-wrap rounded-xl overflow-hidden border border-line mb-5">
      {rows.map((r) => (
        <span
          key={r.role.key}
          className="flex-1 min-w-[8rem] px-3 py-2.5 text-caption text-center truncate"
          style={{ background: r.lightHex }}
          title={`${r.role.key} — ${r.lightHex}`}
        >
          <span className="mix-blend-luminosity text-black/70">{r.role.key}</span>
        </span>
      ))}
    </div>
  )
}

function RoleGroup({ rows }: { rows: ResolvedRole[] }) {
  if (!rows.length) return null
  return (
    <>
      <RoleBand rows={rows} />
      <RoleTable rows={rows} />
    </>
  )
}

function CategoricalRoleBand({ rows }: { rows: ResolvedCategoricalToken[] }) {
  if (!rows.length) return null
  return (
    <div className="flex flex-wrap rounded-xl overflow-hidden border border-line mb-5">
      {rows.map((r) => (
        <span
          key={r.id}
          className="flex-1 min-w-[8rem] px-3 py-2.5 text-caption text-center truncate"
          style={{ background: r.lightHex }}
          title={`${r.id} — ${r.lightHex}`}
        >
          <span className="mix-blend-luminosity text-black/70">{r.id}</span>
        </span>
      ))}
    </div>
  )
}

function CategoricalRoleTable({ rows }: { rows: ResolvedCategoricalToken[] }) {
  if (!rows.length) return null
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[672px]">
        <div className="grid items-end gap-x-3 pb-2" style={{ gridTemplateColumns: '13rem 1fr 1fr 1fr 1fr' }}>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Token names</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Primitives · light</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Hex · light</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint pl-3">Primitives · dark</span>
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Hex · dark</span>
        </div>
        <div className="relative">
          <div
            className="dark absolute inset-y-0 rounded-xl bg-app"
            style={{ left: 'calc(13rem + (100% - 13rem - 0.75rem * 4) / 4 * 2 + 0.75rem * 2)', right: 0 }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-1.5 py-2">
            {rows.map((r) => (
              <div key={r.id} className="grid items-center gap-x-3" style={{ gridTemplateColumns: '13rem 1fr 1fr 1fr 1fr' }}>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <Swatch hex={r.lightHex} />
                    <span className="truncate text-body text-fg" title={r.id}>{r.id}</span>
                  </span>
                  {r.role && <span className="text-mini text-fg-faint truncate pl-[26px]" title={r.role}>{r.role}</span>}
                </span>
                <ValueCell hex={r.lightHex} label={r.lightRef} />
                <ValueCell hex={r.lightHex} label={r.lightHex.toUpperCase() || '—'} />
                <span className="dark pl-3"><ValueCell hex={r.darkHex} label={r.darkRef} /></span>
                <span className="dark"><ValueCell hex={r.darkHex} label={r.darkHex.toUpperCase() || '—'} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoricalRoleGroup({ rows }: { rows: ResolvedCategoricalToken[] }) {
  if (!rows.length) return null
  return (
    <>
      <CategoricalRoleBand rows={rows} />
      <CategoricalRoleTable rows={rows} />
    </>
  )
}

function renderCategoricalCategory(categoryKey: string, flatRows: (c: SystemDoc) => ResolvedRole[]) {
  return (c: SystemDoc) => {
    const cat = c.categoricalCategories?.find((x) => x.key === categoryKey)
    if (cat?.tokens.length) return <CategoricalRoleGroup rows={cat.tokens} />
    const rows = flatRows(c)
    return rows.length ? <RoleGroup rows={rows} /> : null
  }
}

/** A flat key · value strip — used where a foundation's tokens are a plain map
 *  (grid settings, surface padding) and a chart would add nothing. */
function KeyValues({ entries }: { entries: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-caption font-mono text-fg-muted">
      {entries.map(([key, value]) => (
        <span key={key}>{key} <span className="text-fg-faint">{value}</span></span>
      ))}
    </div>
  )
}

function LayoutRolesBlock({
  family,
  primitives,
  roles,
}: {
  family: LayoutFamily
  primitives: Record<string, string>
  roles?: Record<string, string>
}) {
  const map = mergeLayoutRoles(family, roles)
  return (
    <div className="flex flex-col gap-5">
      {LAYOUT_ROLE_GROUPS[family].map((g) => (
        <div key={g.id} className="flex flex-col gap-2">
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{g.label}</span>
          {LAYOUT_ROLES[family].filter((r) => r.group === g.id).map((role) => {
            const step = map[role.key]
            const live = family === 'breakpoint' && role.key === 'mobile'
              ? `calc(${family}-${step} − 1px) · ${breakpointMobileMax(map, primitives)}`
              : `${family}-${step} · ${resolveLayoutRole(family, map, primitives, role.key) || '—'}`
            return (
              <div key={role.key} className="flex items-baseline gap-4 min-w-0">
                <span className="w-44 flex-shrink-0 text-mini font-mono text-fg-faint">
                  {family}-{role.key}
                </span>
                <span className="flex-1 min-w-0 text-body text-fg truncate">
                  {role.description}
                </span>
                <span className="flex-shrink-0 text-mini font-mono text-fg-faint">
                  → {live}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Foundation definitions ───────────────────────────────────────────────────

export interface DocSection {
  id: string
  title: string
  /** Optional prose above the specimen. */
  description?: string
  render: (c: SystemDoc) => ReactNode
}

export interface FoundationDoc {
  /** Matches the `FOUNDATIONS` key in Configurator, so "Edit in Variables
   *  Generator" can open the very editor this page documents. */
  key: string
  label: string
  /** Lead paragraph — what this foundation is. */
  lead: string
  /** "Why <x> tokens" — why it is a token layer at all, not a hardcoded value. */
  why: string
  /** "Usage" — how to reach for it in practice. */
  usage: string
  /** The snippet under Usage. */
  usageCode: string
  ships: { json: string; css: string; figma: string }
  tokenCount: (c: SystemDoc) => number
  sections: DocSection[]
}

export const FOUNDATION_DOCS: FoundationDoc[] = [
  // ── Color ──────────────────────────────────────────────────────────────────
  {
    key: 'color',
    label: 'Color',
    lead: 'Two layers: twelve-step primitive ramps that hold the raw values, and a categorical semantic contract that names what each value is FOR — grouped as Content, Action, Surface, Status and Border with nested role ids like `content.primary` and `action.primary.default`. Designs reference the roles; only the roles reference the ramps.',
    why: 'A hex in a component is a decision nobody can revisit. A role — `action.primary.default` — is a decision you can re-point once and have the whole system follow, in every theme at once. It is also the only way light and dark can be the same design rather than two hand-tuned ones: a role resolves to its own ramp per appearance, so `content.primary` means "the readable ink on this page" in both, and neither is a copy of the other.',
    usage: 'Reach for a categorical semantic role first — `surface.*` for page and card levels, `action.*` for control fills, `status.*` for feedback, `content.*` for ink, `border.*` for edges. Use a primitive directly only when you are defining a new role. Steps are ordered by ROLE, not lightness: 1–2 page background · 3–5 component · 6–8 border · 9 the solid (your brand hex, verbatim) · 10 solid hover · 11–12 accessible text. Sixteen roles resolve to a TRANSLUCENT primitive instead of a solid tone — see Alpha below — so a semantic value can be 8-digit `#rrggbbaa`.',
    usageCode: `/* semantic — what it is FOR */
background: var(--color-action-primary-default);
color:      var(--color-content-on-action);

/* primitive — only when defining a role */
--color-accent-9: #9522e9;`,
    ships: {
      json: 'colors.primitive · colors.primitiveAlpha · colors.architecture (categorical) · colors.themes',
      css: '--color-<group>-<role>  ·  --color-<family>-<tone>  ·  --color-<family>-a-<tone>  ·  --color-black-a-<tone> / -white-a-',
      figma: 'Variable collection "Color", one mode per theme',
    },
    tokenCount: (c) => {
      const semantic = c.categoricalCategories
        ? c.categoricalCategories.reduce((n, cat) => n + cat.tokens.length, 0)
        : c.roles.length
      return semantic + c.primitiveFamilies.reduce((n, f) => n + Object.keys(f.scale).length, 0)
    },
    sections: [
      {
        id: 'primitives',
        title: 'Primitives',
        description: 'The raw color ramps — unopinionated source values that every semantic token aliases. Never used directly in designs.',
        render: (c) => (
          <div className="flex flex-col gap-5">
            {c.primitiveFamilies.map((fam) => (
              <div key={fam.label} className="flex flex-col gap-1.5">
                <span className="text-caption text-fg-muted">{fam.label}</span>
                <PrimitiveRamp scale={fam.scale} naming={c.colorNaming} />
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'alpha',
        title: 'Alpha',
        description: 'Translucent primitives — for anything painted ON TOP of a surface the token cannot know in advance. Two different contracts, deliberately not merged: a family TWIN is solved so tone N reproduces the solid tone N over its own page (the opacity is a result, so the ladder is not monotonic and tone 1 is fully transparent); black/white is a fixed opacity ladder — 5 to 95 % — for scrims, neutral washes and the dark-mode elevation rim, where the ink really is black or white and the opacity IS the decision.',
        render: (c) => (
          <div className="flex flex-col gap-5">
            {c.alphaFamilies.map((fam) => (
              <div key={fam.label} className="flex flex-col gap-1.5">
                <span className="text-caption text-fg-muted">{fam.label} <span className="text-fg-faint">— twin, solved vs the page</span></span>
                <AlphaRamp scale={fam.scale} naming={c.colorNaming} />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-fg-muted">Black <span className="text-fg-faint">— fixed ladder</span></span>
              <AlphaRamp scale={BLACK_ALPHA_SCALE} naming={c.colorNaming} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-fg-muted">White <span className="text-fg-faint">— fixed ladder</span></span>
              <AlphaRamp scale={WHITE_ALPHA_SCALE} naming={c.colorNaming} />
            </div>
          </div>
        ),
      },
      {
        id: 'content',
        title: 'Content',
        description: 'Text & icon ink — primary to inverse. Every token here must maintain readable contrast against the surface backgrounds it sits on.',
        render: renderCategoricalCategory('content', (c) => c.roles.filter((r) => r.role.key.startsWith('content-') || r.role.key.startsWith('text-') || r.role.key.startsWith('icon-'))),
      },
      {
        id: 'action',
        title: 'Action',
        description: 'Interactive element fills — primary and secondary buttons, disabled states, and the accent-tinted secondary fill.',
        render: renderCategoricalCategory('action', (c) => c.roles.filter((r) => r.role.key.startsWith('action-') || r.role.key.startsWith('background-brand-'))),
      },
      {
        id: 'surface',
        title: 'Surface',
        description: 'Page and layer backgrounds — from the root canvas through elevated panels, inputs, selection, overlays and accent washes.',
        render: renderCategoricalCategory('surface', (c) => c.roles.filter((r) => r.role.key.startsWith('surface-') || r.role.key.startsWith('bg-'))),
      },
      {
        id: 'status',
        title: 'Status',
        description: 'Feedback fg/bg pairs per severity — critical, warning and success, each with subtle surface, solid fill and on-solid ink.',
        render: renderCategoricalCategory('status', (c) => c.roles.filter((r) => ['error', 'warning', 'success', 'info'].includes(r.role.scale))),
      },
      {
        id: 'border',
        title: 'Border',
        description: 'Strokes, focus rings and severity borders — from subtle dividers through component boundaries to validation states.',
        render: renderCategoricalCategory('border', borderRows),
      },
    ],
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  {
    key: 'typography',
    label: 'Typography',
    lead: 'Two layers, same idea as Color. Primitives are the scale — display/body families, eleven sizes with matching line-heights, four weights. Semantics are named text styles (label, placeholder, heading, body, button) that alias those primitives, with a Desktop mapping and a Mobile mapping. Components reference the role; the role points at the scale.',
    why: 'A 15px here and a 17px there read as sloppiness long before anyone can name why. A fixed ramp makes size a CHOICE FROM A SET. Pairing each size with its line-height keeps vertical rhythm. Roles — `text-label`, `text-placeholder` — are the decision you can re-point once: mobile is one step down, not a second hardcoded px in every component.',
    usage: 'Reach for a text role first (`text-label`, `text-body-md`, `text-heading-lg`). Use a primitive (`text-sm`, `semibold`) only when defining a new role. Desktop CSS is `var(--text-label-font-size)`; mobile is `var(--text-label-font-size-mobile)` at `max-width: var(--breakpoint-mobile)`. Both alias primitives — never a raw px.',
    usageCode: `/* semantic — what it is FOR */
font-family: var(--text-label-font-family);
font-size:   var(--text-label-font-size);
font-weight: var(--text-label-font-weight);
line-height: var(--text-label-line-height);

@media (max-width: var(--breakpoint-mobile)) {
  font-size:   var(--text-label-font-size-mobile);
  line-height: var(--text-label-line-height-mobile);
}

/* primitive — only when defining a role */
--font-size-text-sm: 14px;`,
    ships: {
      json: 'typography.fontFamily · .sizes · .weights · .roles (desktop/mobile aliases)',
      css: '--text-{role}-font-size  ·  --text-{role}-font-size-mobile  ·  --font-size-*',
      figma: 'Text styles {project}/Type/{role} with Desktop · Mobile + a Typography variable collection',
    },
    tokenCount: (c) => TYPE_SCALE_KEYS.length * 2 + FONT_WEIGHT_BASES.length + 2 + TYPE_ROLES.length,
    sections: [
      {
        id: 'families',
        title: 'Families',
        description: 'The two stacks every text token resolves through.',
        render: (c) => (
          <div className="flex flex-col gap-3">
            {([
              ['Heading', c.typography.headingFontFamily ?? c.typography.fontFamily],
              ['Body', c.typography.fontFamily],
            ] as const).map(([label, family]) => (
              <div key={label} className="flex items-baseline gap-4 min-w-0">
                <span className="w-32 flex-shrink-0 text-mini font-mono text-fg-faint">{label}</span>
                <span className="flex-1 min-w-0 truncate text-[22px] text-fg" style={{ fontFamily: fontStack(family) }}>
                  {family}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'scale',
        title: 'Size scale',
        description: 'Every step, rendered at its own size and line-height. The label is the token name you type.',
        render: (c) => {
          const bodyStack = fontStack(c.typography.fontFamily)
          const headingStack = fontStack(c.typography.headingFontFamily ?? c.typography.fontFamily)
          return (
            <div className="flex flex-col gap-3">
              {TYPE_SCALE_KEYS.map((key) => {
                const size = c.typography.sizes?.[key] ?? ''
                const lh = c.typography.lineHeights?.[key] ?? ''
                const display = key.startsWith('display')
                return (
                  <div key={key} className="flex items-baseline gap-4 min-w-0">
                    <span className="w-32 flex-shrink-0 text-mini font-mono text-fg-faint">
                      {key} · {size}
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate text-fg"
                      style={{
                        fontFamily: display ? headingStack : bodyStack,
                        fontSize: size,
                        lineHeight: lh,
                        fontWeight: display ? 600 : 400,
                      }}
                    >
                      Almost before we knew it, we had left the ground.
                    </span>
                  </div>
                )
              })}
            </div>
          )
        },
      },
      {
        id: 'weights',
        title: 'Weights',
        description: 'Four weights, no more — a fifth is a decision nobody can apply consistently.',
        render: (c) => {
          const headingStack = fontStack(c.typography.headingFontFamily ?? c.typography.fontFamily)
          return (
            <div className="flex flex-wrap items-end gap-8">
              {FONT_WEIGHT_BASES.map((w) => (
                <div key={w.key} className="flex flex-col gap-1">
                  <span
                    className="text-[30px] leading-none text-fg"
                    style={{ fontFamily: headingStack, fontWeight: c.typography.weights?.[w.key] ?? w.weight }}
                  >
                    Ag
                  </span>
                  <span className="text-mini font-mono text-fg-faint">
                    {w.key} · {c.typography.weights?.[w.key] ?? w.weight}
                  </span>
                </div>
              ))}
            </div>
          )
        },
      },
      {
        id: 'roles',
        title: 'Text roles',
        description: 'Semantic styles alias the primitive scale. Desktop and Mobile are two mappings of the same role — Color’s light/dark, for type.',
        render: (c) => {
          const roles = mergeTypeRoles(c.typography.roles)
          return (
            <div className="flex flex-col gap-5">
              {TYPE_ROLE_GROUPS.map((g) => (
                <div key={g.id} className="flex flex-col gap-2">
                  <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{g.label}</span>
                  {typeRolesInGroup(g.id).map((role) => {
                    const style = resolveTypeStyle(roles[role.key].desktop, c.typography)
                    return (
                      <div key={role.key} className="flex items-baseline gap-4 min-w-0">
                        <span className="w-36 flex-shrink-0 text-mini font-mono text-fg-faint">
                          text-{role.key}
                        </span>
                        <span
                          className="flex-1 min-w-0 truncate text-fg"
                          style={{
                            fontFamily: fontStack(style.family),
                            fontSize: style.size,
                            lineHeight: style.lineHeight,
                            fontWeight: style.weight,
                          }}
                        >
                          {role.description}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        },
      },
    ],
  },

  // ── Radius ─────────────────────────────────────────────────────────────────
  {
    key: 'radius',
    label: 'Border radius',
    lead: 'Two layers: a 7-step primitive ramp (none → full) that holds the raw px, and intent aliases — control, action, container, overlay, pill — that only ever point at a step. Components bind the alias; the ramp is the personality.',
    why: 'Radius drifts more than any other value because it is invisible in isolation: a 6px card next to an 8px button looks fine alone and wrong together. Tokenising the ramp once, then naming what each corner is FOR, means a personality change is one slider and a nested checkbox never copies a modal’s rounding.',
    usage: 'Reach for a semantic first: `radius-action` for buttons and inputs, `radius-container` for cards, `radius-overlay` for modals, `radius-pill` for badges, `radius-control` for nested chrome. A nested corner should alias a smaller step than its parent — that is what `control` (xs) under `action` (md) is for. Do not invent a new px on a component.',
    usageCode: `border-radius: var(--radius-action);

.card   { border-radius: var(--radius-container); }
.card > .thumb { border-radius: var(--radius-control); }
.modal  { border-radius: var(--radius-overlay); }
.badge  { border-radius: var(--radius-pill); }`,
    ships: {
      json: 'radius · radiusRoles',
      css: '--radius-*  (steps + aliases)',
      figma: 'Number variables, bound to every component set\'s corner radius',
    },
    tokenCount: () => RADIUS_STEPS.length + LAYOUT_ROLES.radius.length,
    sections: [
      {
        id: 'scale',
        title: 'Scale',
        description: 'Each specimen\'s corners are bound to the live Radius variables.',
        render: (c) => (
          <div className="flex flex-wrap items-end gap-5">
            {RADIUS_STEPS.map((step) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <span
                  className="w-14 h-14 border-2 border-accent-ui/60 bg-accent-ui/[0.08]"
                  style={{ borderRadius: c.radius[step] ?? '0px' }}
                />
                <span className="text-mini font-mono text-fg-faint">
                  {step} · {c.radius[step] ?? '—'}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'roles',
        title: 'Radius roles',
        description: 'Intent aliases. Each one points at a primitive step — never a new px.',
        render: (c) => (
          <LayoutRolesBlock family="radius" primitives={c.radius} roles={c.radiusRoles} />
        ),
      },
    ],
  },

  // ── Spacing ────────────────────────────────────────────────────────────────
  {
    key: 'spacing',
    label: 'Spacing',
    lead: 'Two layers: a 4px-grid primitive scale (0–16, including step 5 = 20px) and intent aliases for gaps and insets. Surface padding aliases `spacing-inset-surface` — not a raw 20px collection.',
    why: 'Spacing is what makes a layout read as deliberate. A scale removes the middle values that cause trouble: with 8 and 12 available and nothing between, nobody ships an 11. Semantics then name the job — gap between siblings vs inset inside a surface — so a card never copies a button’s padding by accident.',
    usage: 'Reach for a semantic first: `spacing-gap-control` between related controls, `spacing-gap-section` between blocks, `spacing-inset-control` inside a button, `spacing-inset-surface` inside a card. Use a primitive step only when you are defining a new role.',
    usageCode: `gap:     var(--spacing-gap-group);
padding: var(--spacing-inset-surface);

.btn  { gap: var(--spacing-gap-tight); padding-inline: var(--spacing-inset-control); }
.page { padding: var(--spacing-inset-page); }`,
    ships: {
      json: 'spacing · spacingRoles · padding',
      css: '--spacing-*  (steps + aliases)  ·  --padding-top|right|bottom|left',
      figma: 'Number variables, bound to auto-layout gaps and padding',
    },
    tokenCount: (c) => SPACING_STEPS.length + LAYOUT_ROLES.spacing.length + Object.keys(c.padding ?? {}).length,
    sections: [
      {
        id: 'scale',
        title: 'Scale',
        description: 'Bar widths are bound to the live Spacing variables.',
        render: (c) => {
          const maxSpacing = Math.max(...SPACING_STEPS.map((s) => parseFloat(c.spacing[s] ?? '0') || 0), 1)
          return (
            <div className="flex flex-col gap-2">
              {SPACING_STEPS.map((step) => {
                const value = c.spacing[step] ?? ''
                const px = parseFloat(value) || 0
                return (
                  <div key={step} className="flex items-center gap-4">
                    <span className="w-24 flex-shrink-0 text-mini font-mono text-fg-faint">
                      {step} · {value}
                    </span>
                    <span className="h-2.5 rounded-full bg-accent-ui" style={{ width: `${(px / maxSpacing) * 100}%` }} />
                  </div>
                )
              })}
            </div>
          )
        },
      },
      {
        id: 'surface-padding',
        title: 'Surface padding',
        description: 'The per-side inset padded surfaces use. Four values, so a surface can breathe more at the top than the sides.',
        render: (c) => (
          <KeyValues entries={(['top', 'right', 'bottom', 'left'] as const).map((s) => [`padding-${s}`, c.padding?.[s] ?? '—'])} />
        ),
      },
      {
        id: 'roles',
        title: 'Spacing roles',
        description: 'Gap vs inset. Aliases of primitive steps — surface padding resolves to step 5 (20px on the 4px grid).',
        render: (c) => (
          <LayoutRolesBlock family="spacing" primitives={c.spacing} roles={c.spacingRoles} />
        ),
      },
    ],
  },

  // ── Shadow ─────────────────────────────────────────────────────────────────
  {
    key: 'shadow',
    label: 'Shadow',
    lead: 'A six-step elevation ramp, from a hairline lift to a floating dialog. Each step is a complete box-shadow — geometry and tint together — not a blur radius you assemble yourself.',
    why: 'Elevation is a ranking, and a ranking only works if every rung is used for one thing. Shipping whole shadows rather than parts is what keeps that true: two people composing their own from the same blur and spread will not agree on the tint, and a shadow that is a few percent off reads as a different surface rather than the same one.',
    usage: 'Map the step to how far the thing is from the page, not to how important it feels: `xs` for a resting card, `md` for a raised menu, `xl`–`2xl` for modals and popovers. Raise on interaction by moving one step, never two.',
    usageCode: `box-shadow: var(--shadow-md);

.card         { box-shadow: var(--shadow-xs); }
.card:hover   { box-shadow: var(--shadow-sm); }`,
    ships: {
      json: 'shadows',
      css: '--shadow-*',
      figma: 'Effect styles, one per step',
    },
    tokenCount: () => SHADOW_STEPS.length,
    sections: [
      {
        id: 'elevation',
        title: 'Elevation',
        description: 'Each specimen carries the live token. Matching Effect Styles are created under Styles in Figma.',
        render: (c) => (
          <div className="flex flex-wrap gap-6 py-2">
            {SHADOW_STEPS.map((step) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <span
                  className="w-24 h-14 rounded-xl bg-surface border border-line/40"
                  style={{ boxShadow: c.shadows[step] ?? 'none' }}
                />
                <span className="text-mini font-mono text-fg-faint">shadow-{step}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'values',
        title: 'Values',
        description: 'The exact CSS each step ships — copy one to check it against an implementation.',
        render: (c) => (
          <div className="rounded-xl border border-line overflow-hidden">
            {SHADOW_STEPS.map((step, i) => (
              <div
                key={step}
                className={`grid grid-cols-[80px_1fr] gap-4 px-4 py-2.5 items-baseline ${i ? 'border-t border-line/60' : ''}`}
              >
                <code className="text-caption font-mono text-fg">{step}</code>
                <code className="text-caption font-mono text-fg-muted break-all">{c.shadows[step] ?? 'none'}</code>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  // ── Grid ───────────────────────────────────────────────────────────────────
  {
    key: 'grid',
    label: 'Grid',
    lead: 'Two layers, same idea as Type. Primitives are the Tailwind min-width ramp (sm–2xl). Semantics name the cut desktop and mobile share, plus a layout frame recipe per viewport — 12-col desktop, 4-col mobile. Components bind `--grid-*` and `--breakpoint-desktop` / `--breakpoint-mobile`; they never invent a 767.',
    why: 'A grid is the contract that lets two people lay out two different screens and have them line up. Tokenising the cut as well as the frame means Type mobile and the 4-col recipe switch at the same width — not a hardcoded 767 in type and a 768 in the plugin.',
    usage: 'Lay out against `--grid-columns`, `--grid-gutter`, `--grid-margin`, `--grid-container`. Query the viewport with `--breakpoint-desktop` (min-width) and `--breakpoint-mobile` (max-width = primitive − 1px). `@media` itself must use the resolved px — custom properties are not valid there.',
    usageCode: `max-width: var(--grid-container);
padding-inline: var(--grid-margin);
gap: var(--grid-gutter);
grid-template-columns: repeat(var(--grid-columns), 1fr);

@media (max-width: var(--breakpoint-mobile)) { /* 4-col recipe already on :root */ }`,
    ships: {
      json: 'grid · breakpointRoles · gridFrame',
      css: '--breakpoint-*  ·  --breakpoint-desktop/mobile  ·  --grid-*',
      figma: 'Layout grid styles + number variables',
    },
    tokenCount: (c) => BREAKPOINT_STEPS.length + LAYOUT_ROLES.breakpoint.length + GRID_FRAME_FIELDS.length * 2,
    sections: [
      {
        id: 'layout',
        title: 'Frame',
        description: 'Desktop is 12 columns with a container cap. Mobile is 4 columns, fluid. Gutter and margin alias spacing steps.',
        render: (c) => {
          const bps = extractBreakpoints(c.grid)
          const frame = mergeGridFrame(c.gridFrame)
          const desktop = resolveGridFrame('desktop', frame, c.spacing, bps)
          const mobile = resolveGridFrame('mobile', frame, c.spacing, bps)
          return (
            <div className="flex flex-col gap-5">
              {([
                ['Desktop', desktop],
                ['Mobile', mobile],
              ] as const).map(([label, f]) => (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{label}</span>
                    <span className="text-mini font-mono text-fg-faint">
                      {f.columns} col · {f.gutter} gutter · {f.margin} margin · {f.container === 'none' ? 'fluid' : f.container}
                    </span>
                  </div>
                  <div
                    className="rounded-xl border border-line overflow-hidden flex"
                    style={{ gap: f.gutter, padding: f.margin }}
                  >
                    {Array.from({ length: Math.min(f.columns, 12) }).map((_, i) => (
                      <span key={i} className="flex-1 h-16 rounded bg-accent-ui/[0.14] border border-accent-ui/30" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        },
      },
      {
        id: 'breakpoints',
        title: 'Breakpoint primitives',
        description: 'Min-widths. Semantics alias these — never a raw 767.',
        render: (c) => <KeyValues entries={BREAKPOINT_STEPS.map((s) => [s, extractBreakpoints(c.grid)[s]])} />,
      },
      {
        id: 'roles',
        title: 'Viewport roles',
        description: 'Desktop is min-width of the chosen step. Mobile is that step minus 1px, so the two ranges never overlap.',
        render: (c) => (
          <LayoutRolesBlock family="breakpoint" primitives={extractBreakpoints(c.grid)} roles={c.breakpointRoles} />
        ),
      },
    ],
  },

  // ── Sizes ──────────────────────────────────────────────────────────────────
  {
    key: 'sizes',
    label: 'Sizes',
    lead: 'Two layers: an 8px control-height ramp (xs–2xl) and intent aliases — compact, control, touch, hit, fab. Touch is `lg` (48px); 44px is not a step.',
    why: 'Control height is the value most likely to be set per component and then never reconciled. One ramp means "medium" is the same 40px everywhere. Semantics then name density and job, so a toolbar compact never copies a marketing CTA, and a close-button hit area is a named token rather than a magic 24.',
    usage: 'Reach for a semantic first: `size-control` as the default, `size-compact` in dense tables, `size-touch` for mobile CTAs, `size-hit` for icon-only chrome, `size-fab` for floating actions. Size axis SM/MD/LG maps onto `size-sm` / `size-md` / `size-lg` honestly.',
    usageCode: `height: var(--size-control);

.toolbar .btn { height: var(--size-compact); }
.cta          { height: var(--size-touch); }
.close        { width: var(--size-hit); height: var(--size-hit); }`,
    ships: {
      json: 'sizes · sizeRoles',
      css: '--size-*  (steps + aliases)',
      figma: 'Number variables, bound to each component set\'s height',
    },
    tokenCount: (c) => Object.keys(c.sizes).length + LAYOUT_ROLES.size.length,
    sections: [
      {
        id: 'scale',
        title: 'Scale',
        description: 'Each bar is rendered at its live token height.',
        render: (c) => (
          <div className="flex flex-col gap-2">
            {Object.entries(c.sizes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-24 flex-shrink-0 text-mini font-mono text-fg-faint">{key} · {value}</span>
                <span
                  className="rounded-lg border border-accent-ui/50 bg-accent-ui/[0.08] flex items-center px-3 text-mini font-mono text-fg-muted"
                  style={{ height: parseFloat(value) || 24, minWidth: 140 }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'roles',
        title: 'Size roles',
        description: 'Density and job. Touch is lg (48px) so it covers iOS HIG 44 without a 44px step.',
        render: (c) => (
          <LayoutRolesBlock family="size" primitives={c.sizes} roles={c.sizeRoles} />
        ),
      },
    ],
  },

  // ── Stroke ─────────────────────────────────────────────────────────────────
  {
    key: 'stroke',
    label: 'Stroke',
    lead: 'Line weight — not paint. A 4-step primitive ramp (none · sm · md · lg = 0 / 1 / 2 / 4px) and intent aliases for divider, control border, and focus-ring spread. Color stays on `border.*`.',
    why: 'Border width and focus-ring spread used to be leftover 1px / 1.5px / 2px / 3px in components. That is four answers to "how thick is a line." One even grid plus named jobs means an outline button and an input share `stroke-control`, and the focus ring is a WCAG 2.4.13 2px spread (`stroke-focus`) whose paint is still `border.focus`.',
    usage: 'Compose width and color: `border: var(--stroke-control) solid var(--color-border-strong)`. Dividers use `stroke-divider`. Focus: `box-shadow: 0 0 0 var(--stroke-focus) …border.focus…`. Never put a hex in a stroke token.',
    usageCode: `border: var(--stroke-control) solid var(--color-border-strong);

.hr { border-top: var(--stroke-divider) solid var(--color-border-subtle); }

.input:focus {
  box-shadow: 0 0 0 var(--stroke-focus)
    color-mix(in srgb, var(--color-border-focus) 15%, transparent);
}`,
    ships: {
      json: 'stroke · strokeRoles',
      css: '--stroke-*  (steps + aliases)',
      figma: 'Number variables for border-width and focus-ring spread',
    },
    tokenCount: () => STROKE_STEPS.length + LAYOUT_ROLES.stroke.length,
    sections: [
      {
        id: 'scale',
        title: 'Scale',
        description: 'Hairline weights. `none` is 0 — a real step, so a border can be turned off without a magic 0px.',
        render: (c) => (
          <div className="flex flex-col gap-3">
            {STROKE_STEPS.map((step) => {
              const value = c.stroke[step] ?? '0px'
              const px = parseFloat(value) || 0
              return (
                <div key={step} className="flex items-center gap-4">
                  <span className="w-28 flex-shrink-0 text-mini font-mono text-fg-faint">
                    {step} · {value}
                  </span>
                  <span className="flex-1 h-6 flex items-center">
                    <span className="w-full rounded-full bg-accent-ui" style={{ height: Math.max(px, 1), opacity: step === 'none' ? 0.2 : 0.85 }} />
                  </span>
                </div>
              )
            })}
          </div>
        ),
      },
      {
        id: 'roles',
        title: 'Stroke roles',
        description: 'Divider, control, focus. Paint is a Color semantic; these tokens are width only.',
        render: (c) => (
          <LayoutRolesBlock family="stroke" primitives={c.stroke} roles={c.strokeRoles} />
        ),
      },
    ],
  },

  // ── Icons ──────────────────────────────────────────────────────────────────
  {
    key: 'icons',
    label: 'Icons',
    lead: 'The icon set this system standardizes on, plus any custom SVGs uploaded alongside it. One library, so stroke weight, corner treatment and optical size stay consistent across the product.',
    why: 'Mixed icon sets are visible from across the room even when nobody can say why: two libraries almost never share a stroke weight or a grid. Naming the library as a token means engineers install the same package the design references, and every preview in this app re-renders through it the moment it changes.',
    usage: 'Use the library\'s own glyph names. Upload a custom SVG only for marks the library genuinely lacks (a product logo, a domain-specific symbol) — every custom icon is one more thing that has to be redrawn if the library ever changes.',
    usageCode: `import SearchLg from "@untitledui/icons/SearchLg"

<SearchLg size={16} />`,
    ships: {
      json: 'icons.library · icons.name · icons.package · icons.custom[]',
      css: '—  (icons ship as a package reference, not a variable)',
      figma: 'Custom SVGs imported as components',
    },
    tokenCount: (c) => 1 + (c.customIcons?.length ?? 0),
    sections: [
      {
        id: 'library',
        title: 'Library',
        description: 'The set every preview, component doc and export references.',
        render: () => (
            <KeyValues entries={[
              ['library', PHOSPHOR_LIBRARY.key],
              ['name', PHOSPHOR_LIBRARY.label],
              ['npm', PHOSPHOR_LIBRARY.npm],
              ['repo', PHOSPHOR_LIBRARY.repo],
            ]} />
          ),
      },
      {
        id: 'custom',
        title: 'Custom icons',
        description: 'Uploaded SVGs, sanitized on import and exported under `icons.custom`.',
        render: (c) => (
          c.customIcons?.length ? (
            <div className="flex flex-wrap gap-3">
              {c.customIcons.map((icon) => (
                <div key={icon.name} className="flex flex-col items-center gap-1.5 w-20">
                  <span
                    className="w-12 h-12 rounded-lg border border-line bg-surface flex items-center justify-center text-fg [&_svg]:w-6 [&_svg]:h-6"
                    dangerouslySetInnerHTML={{ __html: icon.svg }}
                  />
                  <span className="text-mini font-mono text-fg-faint truncate max-w-full">{icon.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ui text-fg-faint leading-relaxed">
              None yet — upload one in Variables · Icons and it ships in <code className="font-mono">tokens.json</code>.
            </p>
          )
        ),
      },
    ],
  },
]

// Row selectors shared by the Color page's Border/Other sections. They mirror
// the old sheet's partition exactly: Border is the gray-scale `border-*` roles,
// Other is whatever no earlier section claimed — so no role can be silently
// dropped from the reference by adding a new group above.
function borderRows(c: SystemDoc) {
  return c.roles.filter((r) => r.role.key.startsWith('border-') && r.role.scale === 'gray')
}
function otherRows(c: SystemDoc) {
  const claimed = new Set<string>()
  c.roles.forEach((r) => {
    if (['brand', 'error', 'warning', 'success', 'info'].includes(r.role.scale)) claimed.add(r.role.key)
  })
  borderRows(c).forEach((r) => claimed.add(r.role.key))
  return c.roles.filter((r) => !claimed.has(r.role.key))
}

export const FOUNDATION_KEYS = FOUNDATION_DOCS.map((f) => f.key)

export function foundationDoc(key: string): FoundationDoc | undefined {
  return FOUNDATION_DOCS.find((f) => f.key === key)
}

/** Markdown for "Copy Page" — the same portable-context affordance the
 *  component pages carry. Values are resolved, so the copy is a real spec. */
export function foundationMarkdown(doc: FoundationDoc, c: SystemDoc): string {
  const lines = [
    `# ${doc.label}`,
    '',
    `> ${doc.lead}`,
    '',
    `## Why ${doc.label.toLowerCase()} tokens`,
    '',
    doc.why,
    '',
    '## Usage',
    '',
    doc.usage,
    '',
    '```css',
    doc.usageCode,
    '```',
    '',
  ]

  if (doc.key === 'color' && c.categoricalCategories?.length) {
    lines.push('## Semantic roles (Categorical)', '')
    for (const cat of c.categoricalCategories) {
      lines.push(`### ${cat.label}`, '')
      if (cat.description) lines.push(cat.description, '')
      lines.push(
        '| Token | Role | Primitive · light | Hex · light | Primitive · dark | Hex · dark |',
        '|---|---|---|---|---|---|',
        ...cat.tokens.map((t) =>
          `| \`${t.id}\` | ${t.role} | \`${t.lightRef}\` | \`${t.lightHex.toUpperCase() || '—'}\` | \`${t.darkRef}\` | \`${t.darkHex.toUpperCase() || '—'}\` |`,
        ),
        '',
      )
    }
  }

  // The SAME descriptor the page renders — second of the three outputs, so a
  // pasted spec can't name a destination the page doesn't show. See `useIt.ts`.
  lines.push(
    useItMarkdown(useItForFoundation(doc)),
    '',
    `${doc.tokenCount(c)} tokens · ${doc.sections.length} section${doc.sections.length === 1 ? '' : 's'}: ${doc.sections.map((s) => s.title).join(' · ')}`,
  )
  return lines.join('\n')
}
