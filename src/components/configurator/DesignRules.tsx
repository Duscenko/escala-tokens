// Design Rules — the printable reference sheet for the whole system, living in
// Documentation beside the component articles.
//
// It is the SAME data the Figma plugin lays out on its documentation pages, and
// the same data tokens.json ships: every section reads the store through the
// shared resolvers (`sourceScaleFor` / `recToneFor` from lib/semanticRoles,
// `toneLabel` from colorUtils), never a private copy. So a ramp shown here is
// the ramp that exports — if a value looks wrong on this page, it is wrong in
// the file too, which is exactly what makes the page worth having.
//
// Every semantic table prints the PRIMITIVE REFERENCE alongside the hex, in
// both appearances. That's the point of the sheet: a hand-off reader needs to
// see that `content-brand` IS `accent-8`, not just that it happens to be
// #CCF57B today.

import { useMemo, type ReactNode } from 'react'
import { useDesignStore, DEFAULT_GRAY_DARK_SCALE } from '../../store/useDesignStore'
import {
  ROLE_GROUPS, sourceScaleFor, recToneFor, SCALE_META, baseLabelForTone,
  type Role, type GlobalScales,
} from '../../lib/semanticRoles'
import { toneLabel } from '../../lib/colorUtils'
import { TYPE_SCALE_KEYS, FONT_WEIGHT_BASES } from '../../lib/typographyStandard'
import { RADIUS_STEPS } from './StepRadius'
import { SPACING_STEPS } from './Step5_Spacing'
import { SHADOW_STEPS } from './Step7_Shadow'
import { fontStack } from '../../lib/fonts'

// ── Page chrome ──────────────────────────────────────────────────────────────

function Sheet({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-app overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-[19px] font-semibold text-fg">{title}</h2>
        <p className="text-[13px] text-fg-muted mt-1 max-w-2xl leading-relaxed">{description}</p>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </section>
  )
}

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

// ── Semantic tables ──────────────────────────────────────────────────────────
// One row per role: name · primitive(light) · hex(light) · primitive(dark) ·
// hex(dark). The dark pair sits on a dark panel — the same trick the Figma
// sheet uses, and the same reason the Token Details dialog paints its dark
// card dark: a dark ramp's steps can only be judged on the page they ship on.

type ResolvedRole = {
  role: Role
  lightRef: string
  lightHex: string
  darkRef: string
  darkHex: string
}

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
          style={{ background: r.lightHex, color: r.role.key.startsWith('content') ? undefined : undefined }}
          title={`${r.role.key} — ${r.lightHex}`}
        >
          <span className="mix-blend-luminosity text-black/70">{r.role.key}</span>
        </span>
      ))}
    </div>
  )
}

export default function DesignRules() {
  const store = useDesignStore()
  const {
    primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale,
    customColors, colorNaming, typography, spacing, padding, radius,
    opacity, shadows, grid, sizes, iconLibrary,
  } = store

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
  const resolved: ResolvedRole[] = useMemo(
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

  const byScale = (...want: Role['scale'][]) =>
    resolved.filter((r) => want.includes(r.role.scale))
  const brandRows = byScale('brand')
  const stateRows = (s: Role['scale']) => byScale(s)
  const borderRows = resolved.filter((r) => r.role.key.startsWith('border-') && r.role.scale === 'gray')
  const otherRows = resolved.filter(
    (r) => !brandRows.includes(r) && r.role.scale !== 'error' && r.role.scale !== 'warning' &&
      r.role.scale !== 'success' && r.role.scale !== 'info' && !borderRows.includes(r),
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

  const bodyStack = fontStack(typography.fontFamily)
  const headingStack = fontStack(typography.headingFontFamily ?? typography.fontFamily)
  const maxSpacing = Math.max(...SPACING_STEPS.map((s) => parseFloat(spacing[s] ?? '0') || 0), 1)

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-8">
      <header>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-ui">Reference</span>
        <h1 className="text-[26px] font-semibold text-fg mt-1">Design Rules</h1>
        <p className="text-[14px] text-fg-muted mt-2 max-w-2xl leading-relaxed">
          The full specification of this system, generated from your own tokens. Every value below is the value
          that ships in <code className="font-mono text-[13px] text-fg">tokens.json</code> and syncs to Figma —
          this page and the export read the same resolvers, so they can never disagree.
        </p>
      </header>

      {/* ── 01 · Primitives ── */}
      <Sheet
        title="Primitives"
        description="The raw color ramps — unopinionated source values that every semantic token aliases. Never used directly in designs."
      >
        <div className="flex flex-col gap-5">
          {primitiveFamilies.map((fam) => (
            <div key={fam.label} className="flex flex-col gap-1.5">
              <span className="text-[11px] text-fg-muted">{fam.label}</span>
              <div className="overflow-x-auto">
                <div className="flex gap-1.5 min-w-[40rem]">
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
                          {toneLabel(colorNaming, Number(tone))}
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
      </Sheet>

      {/* ── 02 · Brand ── */}
      <Sheet
        title="Brand Colors"
        description="Primary colors establish the core brand identity of the interface, from weakest tints to strongest emphasis levels — used for primary actions, focus states and recognizable visual consistency across the product."
      >
        <RoleBand rows={brandRows} />
        <RoleTable rows={brandRows} />
      </Sheet>

      {/* ── 03 · States ── */}
      {([
        ['State Error', 'error', 'Error state colors provide clear visual signaling for failures, invalid inputs and critical system feedback, ensuring immediate recognition and strong contrast across all themes.'],
        ['State Success', 'success', 'Success state colors communicate positive outcomes, confirmations and completed actions, delivering reassuring feedback with clarity and consistency across the interface.'],
        ['State Warning', 'warning', 'Warning state colors highlight caution, pending risks and notices that need attention without signaling failure, staying legible across all themes.'],
        ['State Info', 'info', 'Informational state colors carry neutral, non-urgent messaging — hints, tips and passive system notices.'],
      ] as const).map(([title, scale, description]) => {
        const rows = stateRows(scale)
        if (!rows.length) return null
        return (
          <Sheet key={scale} title={title} description={description}>
            <RoleBand rows={rows} />
            <RoleTable rows={rows} />
          </Sheet>
        )
      })}

      {/* ── 04 · Foundations (border + everything neutral) ── */}
      <Sheet
        title="Border"
        description="Border colors define edges, dividers and outlines with consistent contrast across themes, from subtle separators to strong emphasis strokes."
      >
        <RoleBand rows={borderRows} />
        <RoleTable rows={borderRows} />
      </Sheet>

      <Sheet
        title="Other"
        description="Remaining semantic roles that fall outside the standard categories."
      >
        <RoleBand rows={otherRows} />
        <RoleTable rows={otherRows} />
      </Sheet>

      {/* ── 05 · Typography ── */}
      <Sheet
        title="Typography"
        description={`Family "${typography.fontFamily}" — sizes, weights and line-heights bound to the Typography variables.`}
      >
        <div className="flex flex-col gap-3">
          {TYPE_SCALE_KEYS.map((key) => {
            const size = typography.sizes?.[key] ?? ''
            const lh = typography.lineHeights?.[key] ?? ''
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
          <div className="flex flex-wrap items-end gap-8 pt-4 mt-2 border-t border-line">
            {FONT_WEIGHT_BASES.map((w) => (
              <div key={w.key} className="flex flex-col gap-1">
                <span
                  className="text-[30px] leading-none text-fg"
                  style={{ fontFamily: headingStack, fontWeight: typography.weights?.[w.key] ?? w.weight }}
                >
                  Ag
                </span>
                <span className="text-[10px] font-mono text-fg-faint">
                  {w.key} · {typography.weights?.[w.key] ?? w.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* ── 06 · Spacing ── */}
      <Sheet
        title="Spacing"
        description="Spacing scale — bar widths are bound to the Spacing variables. Surface padding is the per-side inset padded surfaces use."
      >
        <div className="flex flex-col gap-2">
          {SPACING_STEPS.map((step) => {
            const value = spacing[step] ?? ''
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
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3 mt-1 border-t border-line text-[11px] font-mono text-fg-muted">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <span key={side}>padding-{side} <span className="text-fg-faint">{padding?.[side] ?? '—'}</span></span>
            ))}
          </div>
        </div>
      </Sheet>

      {/* ── 07 · Radius ── */}
      <Sheet
        title="Border Radius"
        description="Corner radii — each specimen's corners are bound to the Radius variables."
      >
        <div className="flex flex-wrap items-end gap-5">
          {RADIUS_STEPS.map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <span
                className="w-14 h-14 border-2 border-accent-ui/60 bg-accent-ui/[0.08]"
                style={{ borderRadius: radius[step] ?? '0px' }}
              />
              <span className="text-[10px] font-mono text-fg-faint">
                {step} · {radius[step] ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </Sheet>

      {/* ── 08 · Opacity ── */}
      <Sheet
        title="Opacity"
        description="Opacity steps — layer opacity bound to the Opacity variables."
      >
        <div className="flex flex-wrap gap-3">
          {Object.entries(opacity).map(([key, value]) => {
            const n = parseFloat(value)
            const alpha = Number.isNaN(n) ? 1 : value.includes('%') || n > 1 ? Math.min(n / 100, 1) : n
            return (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <span className="w-16 h-10 rounded-lg bg-accent-ui" style={{ opacity: alpha }} />
                <span className="text-[10px] font-mono text-fg-faint">{key} · {value}</span>
              </div>
            )
          })}
        </div>
      </Sheet>

      {/* ── 09 · Shadows ── */}
      <Sheet
        title="Shadows"
        description="Elevation levels — matching Effect Styles are created under Styles."
      >
        <div className="flex flex-wrap gap-6 py-2">
          {SHADOW_STEPS.map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <span
                className="w-24 h-14 rounded-xl bg-surface border border-line/40"
                style={{ boxShadow: shadows[step] ?? 'none' }}
              />
              <span className="text-[10px] font-mono text-fg-faint">shadow-{step}</span>
            </div>
          ))}
        </div>
      </Sheet>

      {/* ── 10 · Grid & Sizes ── */}
      <Sheet
        title="Grid & Sizes"
        description="Layout grid settings and component height scale."
      >
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-mono text-fg-muted pb-5 mb-5 border-b border-line">
          {Object.entries(grid).map(([key, value]) => (
            <span key={key}>{key} <span className="text-fg-faint">{value}</span></span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Object.entries(sizes).map(([key, value]) => (
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
      </Sheet>

      {/* ── 11 · Icons ── */}
      <Sheet
        title="Icons"
        description="The icon set this system standardizes on — engineers install the same package."
      >
        <p className="text-[13px] font-mono text-fg-muted">{iconLibrary}</p>
      </Sheet>
    </div>
  )
}
