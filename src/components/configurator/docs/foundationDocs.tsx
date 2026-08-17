// Foundation documentation — one article per foundation the Variables
// Generator edits (Color · Typography · Radius · Spacing · Shadow ·
// Grid · Sizes · Icons), rendered in the SAME docs site, with the same page
// shape, as the component articles.
//
// This replaces the old `DesignRules` single-scroll sheet. Nothing it printed
// was dropped — every one of its twelve sheets is still here, just filed under
// the foundation it documents, and the whole-system sheet survives as the
// docs site's "Overview" entry (`OVERVIEW_KEY`), which renders every
// foundation's sections in one column exactly as before.
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
import { useDesignStore, DEFAULT_GRAY_DARK_SCALE } from '../../../store/useDesignStore'
import {
  ROLE_GROUPS, sourceScaleFor, recToneFor, SCALE_META, baseLabelForTone,
  type Role, type GlobalScales,
} from '../../../lib/semanticRoles'
import { toneLabel, type ColorNaming } from '../../../lib/colorUtils'
import { TYPE_SCALE_KEYS, FONT_WEIGHT_BASES } from '../../../lib/typographyStandard'
import { RADIUS_STEPS } from '../StepRadius'
import { SPACING_STEPS } from '../Step5_Spacing'
import { SHADOW_STEPS } from '../Step7_Shadow'
import { fontStack } from '../../../lib/fonts'
import { getIconLibrary } from '../../../lib/iconLibraries'

/** The Overview page — the whole-system reference sheet the old Design Rules
 *  view was. Not a foundation key, so it can never collide with one. */
export const OVERVIEW_KEY = '__overview'

// ── Resolved system context ──────────────────────────────────────────────────
// Resolved ONCE per render of the docs site and handed to every section, so a
// page that shows three foundations (Overview) doesn't re-resolve 89 roles
// three times.

export interface SystemDoc {
  scales: GlobalScales
  roles: ResolvedRole[]
  primitiveFamilies: { label: string; scale: Record<number, string> }[]
  colorNaming: ColorNaming
  typography: ReturnType<typeof useDesignStore.getState>['typography']
  spacing: Record<string, string>
  padding: Record<string, string>
  radius: Record<string, string>
  shadows: Record<string, string>
  grid: Record<string, string>
  sizes: Record<string, string>
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

export function useSystemDoc(): SystemDoc {
  const {
    primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale,
    customColors, colorNaming, typography, spacing, padding, radius,
    shadows, grid, sizes, iconLibrary, customIcons, themeOrder,
  } = useDesignStore()

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

  return {
    scales, roles, primitiveFamilies, colorNaming, typography, spacing, padding,
    radius, shadows, grid, sizes, iconLibrary, customIcons,
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

/** A value cell — swatch + monospace text, the shape both the ref and hex
 *  columns use so the four columns of a semantic table read as one grid. */
function ValueCell({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="flex items-center gap-2 min-w-0 px-2 h-7 rounded-md border border-line bg-surface">
      <Swatch hex={hex} />
      <span className="truncate text-[11px] font-mono text-fg-muted">{label}</span>
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
      <div className="min-w-[42rem]">
        {/* Column captions. The dark pair is a single visual block, so its two
            captions sit inside the dark panel with the cells they label. */}
        <div className="grid items-end gap-x-3 pb-2" style={{ gridTemplateColumns: '13rem 1fr 1fr 1fr 1fr' }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Token names</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Primitives · light</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Hex · light</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint pl-3">Primitives · dark</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Hex · dark</span>
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
                  <span className="truncate text-[12px] text-fg" title={r.role.key}>{r.role.key}</span>
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
          className="flex-1 min-w-[8rem] px-3 py-2.5 text-[11px] text-center truncate"
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

/** A flat key · value strip — used where a foundation's tokens are a plain map
 *  (grid settings, surface padding) and a chart would add nothing. */
function KeyValues({ entries }: { entries: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-mono text-fg-muted">
      {entries.map(([key, value]) => (
        <span key={key}>{key} <span className="text-fg-faint">{value}</span></span>
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
    lead: 'Two layers: twelve-step primitive ramps that hold the raw values, and semantic roles that name what each value is FOR. Designs reference the roles; only the roles reference the ramps.',
    why: 'A hex in a component is a decision nobody can revisit. A role — `background-brand-solid` — is a decision you can re-point once and have the whole system follow, in every theme at once. It is also the only way light and dark can be the same design rather than two hand-tuned ones: a role resolves to its own ramp per appearance, so `content-primary` means "the readable ink on this page" in both, and neither is a copy of the other.',
    usage: 'Reach for a semantic role first — `surface-*` for page and card levels, `action-*` for control fills, `status-*` for feedback, `text-*` / `icon-*` for ink, `border-*` for edges. Use a primitive directly only when you are defining a new role. Steps are ordered by ROLE, not lightness: 1–2 page background · 3–5 component · 6–8 border · 9 the solid (your brand hex, verbatim) · 10 solid hover · 11–12 accessible text.',
    usageCode: `/* semantic — what it is FOR */
background: var(--color-background-brand-solid);
color:      var(--color-content-on-brand);

/* primitive — only when defining a role */
--color-accent-9: #9522e9;`,
    ships: {
      json: 'colors.primitive · colors.semantic · colors.semanticDark · colors.themes',
      css: '--color-<role>  ·  --color-<family>-<tone>',
      figma: 'Variable collection "Color", one mode per theme',
    },
    tokenCount: (c) => c.roles.length + c.primitiveFamilies.reduce((n, f) => n + Object.keys(f.scale).length, 0),
    sections: [
      {
        id: 'primitives',
        title: 'Primitives',
        description: 'The raw color ramps — unopinionated source values that every semantic token aliases. Never used directly in designs.',
        render: (c) => (
          <div className="flex flex-col gap-5">
            {c.primitiveFamilies.map((fam) => (
              <div key={fam.label} className="flex flex-col gap-1.5">
                <span className="text-[11px] text-fg-muted">{fam.label}</span>
                <div className="overflow-x-auto">
                  {/* `min-w-[640px]`, not `min-w-[40rem]` — `:root` sets an
                      18px base font (see CLAUDE.md's "Root font-size" note),
                      so `rem` here silently meant 720px, not the 640px the
                      Tailwind class name implies. That's 80px wider than the
                      article's own content column ever needed to be: at a
                      typical 1280px window this forced every ramp to scroll
                      even though 640px fits inside the actual ~683px
                      available. Reported as "the ramps don't [get to] resize"
                      — they were pinned to a floor nobody intended. Literal
                      px sidesteps the root-size trap the same way the
                      preview-panel breakpoint fix already does elsewhere. */}
                  <div className="flex gap-1.5 min-w-[640px]">
                    {Object.entries(fam.scale)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([tone, hex]) => (
                        <div key={tone} className="flex-1 min-w-0 flex flex-col items-center gap-1">
                          <span
                            className="w-full h-11 rounded-lg ring-1 ring-black/10 dark:ring-white/15"
                            style={{ background: hex }}
                            title={hex}
                          />
                          <span className="text-[9px] font-mono tabular-nums text-fg-faint">
                            {toneLabel(c.colorNaming, Number(tone))}
                          </span>
                          <span className="text-[8px] font-mono text-fg-faint/80 truncate max-w-full">
                            {hex.toUpperCase()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'brand',
        title: 'Brand colors',
        description: 'Primary colors establish the core brand identity of the interface, from weakest tints to strongest emphasis levels — used for primary actions, focus states and recognizable visual consistency across the product.',
        render: (c) => <RoleGroup rows={c.roles.filter((r) => r.role.scale === 'brand')} />,
      },
      {
        id: 'state-error',
        title: 'State · Error',
        description: 'Error state colors provide clear visual signaling for failures, invalid inputs and critical system feedback, ensuring immediate recognition and strong contrast across all themes.',
        render: (c) => <RoleGroup rows={c.roles.filter((r) => r.role.scale === 'error')} />,
      },
      {
        id: 'state-success',
        title: 'State · Success',
        description: 'Success state colors communicate positive outcomes, confirmations and completed actions, delivering reassuring feedback with clarity and consistency across the interface.',
        render: (c) => <RoleGroup rows={c.roles.filter((r) => r.role.scale === 'success')} />,
      },
      {
        id: 'state-warning',
        title: 'State · Warning',
        description: 'Warning state colors highlight caution, pending risks and notices that need attention without signaling failure, staying legible across all themes.',
        render: (c) => <RoleGroup rows={c.roles.filter((r) => r.role.scale === 'warning')} />,
      },
      {
        id: 'state-info',
        title: 'State · Info',
        description: 'Informational state colors carry neutral, non-urgent messaging — hints, tips and passive system notices.',
        render: (c) => <RoleGroup rows={c.roles.filter((r) => r.role.scale === 'info')} />,
      },
      {
        id: 'border',
        title: 'Border',
        description: 'Border colors define edges, dividers and outlines with consistent contrast across themes, from subtle separators to strong emphasis strokes.',
        render: (c) => <RoleGroup rows={borderRows(c)} />,
      },
      {
        id: 'other',
        title: 'Other roles',
        description: 'Remaining semantic roles that fall outside the standard categories.',
        render: (c) => <RoleGroup rows={otherRows(c)} />,
      },
    ],
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  {
    key: 'typography',
    label: 'Typography',
    lead: 'A paired heading and body family, a size ramp from caption to display, a matching line-height per step, and four weights. Sizes and line-heights travel together — picking a step gives you both.',
    why: 'Type is the layer where "close enough" compounds fastest: a 15px here and a 17px there read as sloppiness long before anyone can name why. A fixed ramp makes the size a CHOICE FROM A SET rather than a number someone typed, and pairing each size with its line-height means vertical rhythm survives a copy change.',
    usage: 'Use `display-*` for page-level statements only, `text-*` for everything else. Never set a raw px size — if the ramp has no step that fits, the ramp is what needs editing, in Variables · Typography.',
    usageCode: `font-family: var(--font-family-heading);
font-size:   var(--text-display-sm);
line-height: var(--leading-display-sm);
font-weight: var(--font-weight-semibold);`,
    ships: {
      json: 'typography.fontFamily · .headingFontFamily · .sizes · .lineHeights · .weights',
      css: '--text-*  ·  --leading-*  ·  --font-weight-*  ·  --font-family-*',
      figma: 'Text styles + a "Typography" variable collection',
    },
    tokenCount: (c) => TYPE_SCALE_KEYS.length * 2 + FONT_WEIGHT_BASES.length + 2,
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
                <span className="w-32 flex-shrink-0 text-[10px] font-mono text-fg-faint">{label}</span>
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
                    <span className="w-32 flex-shrink-0 text-[10px] font-mono text-fg-faint">
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
                  <span className="text-[10px] font-mono text-fg-faint">
                    {w.key} · {c.typography.weights?.[w.key] ?? w.weight}
                  </span>
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
    label: 'Border Radius',
    lead: 'One ramp from sharp to pill. Radius is the fastest-read personality signal in an interface — sharp corners say precision, generous ones say approachable — so the system fixes it once rather than per component.',
    why: 'Radius drifts more than any other value because it is invisible in isolation: a 6px card next to an 8px button looks fine alone and wrong together. Tokenising it means the personality is a single decision, and changing it re-shapes every component at once instead of becoming a find-and-replace.',
    usage: 'Match the step to the size of the thing: `sm` for inline chips and inputs, `md` for buttons and cards, `lg` for panels and modals, `full` for pills and avatars. A nested corner should be a step smaller than its parent, not equal to it.',
    usageCode: `border-radius: var(--radius-md);

/* nesting: child one step below parent */
.card   { border-radius: var(--radius-lg); }
.card >  .thumb { border-radius: var(--radius-md); }`,
    ships: {
      json: 'radius',
      css: '--radius-*',
      figma: 'Number variables, bound to every component set\'s corner radius',
    },
    tokenCount: () => RADIUS_STEPS.length,
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
                <span className="text-[10px] font-mono text-fg-faint">
                  {step} · {c.radius[step] ?? '—'}
                </span>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  // ── Spacing ────────────────────────────────────────────────────────────────
  {
    key: 'spacing',
    label: 'Spacing',
    lead: 'One scale grown from a base unit, driving every margin, padding and gap — plus a per-side surface padding for padded surfaces (cards, panels, the sign-up card).',
    why: 'Spacing is what makes a layout read as deliberate. A scale removes the middle values that cause trouble: with 8 and 12 available and nothing between, nobody ships an 11. It also makes density adjustable as ONE decision — move the base unit and the whole interface breathes differently without a single component being touched.',
    usage: 'Use the scale for gaps between things and for internal padding. Larger jumps between groups than within them is what creates hierarchy — the ramp below is ordered so neighbouring steps are safely distinguishable.',
    usageCode: `gap:     var(--spacing-3);
padding: var(--padding-top) var(--padding-right)
         var(--padding-bottom) var(--padding-left);`,
    ships: {
      json: 'spacing · padding',
      css: '--spacing-*  ·  --padding-top|right|bottom|left',
      figma: 'Number variables, bound to auto-layout gaps and padding',
    },
    tokenCount: (c) => SPACING_STEPS.length + Object.keys(c.padding ?? {}).length,
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
                    <span className="w-24 flex-shrink-0 text-[10px] font-mono text-fg-faint">
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
                <span className="text-[10px] font-mono text-fg-faint">shadow-{step}</span>
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
                <code className="text-[11px] font-mono text-fg">{step}</code>
                <code className="text-[11px] font-mono text-fg-muted break-all">{c.shadows[step] ?? 'none'}</code>
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
    lead: 'The layout frame: column count, gutter, page margin, max container width, and the breakpoints those switch at.',
    why: 'A grid is the contract that lets two people lay out two different screens and have them line up. Tokenising it means "the container" is a value both design and code read, rather than a number that was right in the mockup and approximated in the build.',
    usage: 'Lay out against columns and gutters, not fixed widths. The container caps the readable width; the margin is what protects content from the viewport edge below that cap.',
    usageCode: `max-width: var(--grid-container);
padding-inline: var(--grid-margin);
gap: var(--grid-gutter);

@media (min-width: var(--grid-breakpoint-md)) { … }`,
    ships: {
      json: 'grid',
      css: '--grid-*',
      figma: 'Layout grid styles + number variables',
    },
    tokenCount: (c) => Object.keys(c.grid).length,
    sections: [
      {
        id: 'layout',
        title: 'Layout',
        description: 'Columns, gutter, margin and container — the frame every page is composed on.',
        render: (c) => (
          <div className="flex flex-col gap-4">
            <KeyValues entries={Object.entries(c.grid).filter(([k]) => !k.startsWith('breakpoint'))} />
            {/* Column overlay — the frame drawn, not just listed. */}
            <div
              className="rounded-xl border border-line overflow-hidden flex"
              style={{ gap: c.grid.gutter ?? '24px', padding: c.grid.margin ?? '32px' }}
            >
              {Array.from({ length: Math.min(Number(c.grid.columns) || 12, 12) }).map((_, i) => (
                <span key={i} className="flex-1 h-20 rounded bg-accent-ui/[0.14] border border-accent-ui/30" />
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'breakpoints',
        title: 'Breakpoints',
        description: 'Where the layout re-flows. Named, so a media query in code and a frame in Figma mean the same width.',
        render: (c) => <KeyValues entries={Object.entries(c.grid).filter(([k]) => k.startsWith('breakpoint'))} />,
      },
    ],
  },

  // ── Sizes ──────────────────────────────────────────────────────────────────
  {
    key: 'sizes',
    label: 'Sizes',
    lead: 'The component height scale — one ramp shared by buttons, inputs, selects and every other control, so a row of mixed controls lines up without anyone measuring.',
    why: 'Control height is the value most likely to be set per component and then never reconciled. One ramp means "medium" is the same 40px everywhere, which is what lets a button sit next to an input without a one-pixel step, and it makes density a single edit rather than a sweep.',
    usage: 'Pick the step from the density of the surface, not the importance of the control — everything in one row shares a step. `xs`–`sm` for dense tables and toolbars, `md` as the default, `lg`–`2xl` for marketing and touch-first surfaces.',
    usageCode: `height: var(--size-md);

/* every control in a row shares one step */
.toolbar .btn,
.toolbar .input { height: var(--size-sm); }`,
    ships: {
      json: 'sizes',
      css: '--size-*',
      figma: 'Number variables, bound to each component set\'s height',
    },
    tokenCount: (c) => Object.keys(c.sizes).length,
    sections: [
      {
        id: 'scale',
        title: 'Scale',
        description: 'Each bar is rendered at its live token height.',
        render: (c) => (
          <div className="flex flex-col gap-2">
            {Object.entries(c.sizes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-24 flex-shrink-0 text-[10px] font-mono text-fg-faint">{key} · {value}</span>
                <span
                  className="rounded-lg border border-accent-ui/50 bg-accent-ui/[0.08] flex items-center px-3 text-[10px] font-mono text-fg-muted"
                  style={{ height: parseFloat(value) || 24, minWidth: 140 }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
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
    usageCode: `import { Search } from "lucide-react"

<Search size={16} strokeWidth={2} />`,
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
        render: (c) => {
          const lib = getIconLibrary(c.iconLibrary)
          return (
            <KeyValues entries={[
              ['library', c.iconLibrary],
              ['name', lib?.label ?? c.iconLibrary],
              ['npm', lib?.npm ?? '—'],
              ['iconify', lib?.iconifyPrefix ?? '—'],
            ]} />
          )
        },
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
                  <span className="text-[10px] font-mono text-fg-faint truncate max-w-full">{icon.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-fg-faint leading-relaxed">
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
    '## Ships as',
    '',
    '| Target | Name |',
    '|---|---|',
    `| tokens.json | \`${doc.ships.json}\` |`,
    `| variables.css | \`${doc.ships.css}\` |`,
    `| Figma | ${doc.ships.figma} |`,
    '',
    `${doc.tokenCount(c)} tokens · ${doc.sections.length} section${doc.sections.length === 1 ? '' : 's'}: ${doc.sections.map((s) => s.title).join(' · ')}`,
  ]
  return lines.join('\n')
}
