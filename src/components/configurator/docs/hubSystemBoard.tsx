// Hub Docs landing — a visual sheet of the previewed theme. Each card is one
// foundation; opening it mounts that foundation's article. Values come from
// SystemDoc (the same projection the articles use). No second token vocabulary.

import { darkShadow } from '../../../lib/colorUtils'
import { fontStack } from '../../../lib/fonts'
import { SAMPLE_GLYPHS, getIconLibrary } from '../../../lib/iconLibraries'
import { extractBreakpoints, resolveGridFrame, mergeGridFrame } from '../../../lib/layoutTokens'
import { SHADOW_STEPS } from '../../../lib/shadowTokens'
import { TYPE_ROLES, typeStyleCss } from '../../../lib/typeRoles'
import { FONT_WEIGHT_BASES } from '../../../lib/typographyStandard'
import { useI18n } from '../../../lib/i18n'
import { FOUNDATION_DOCS, type FoundationDoc, type SystemDoc } from './foundationDocs'

const RADIUS_PEEK = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const
const SPACING_PEEK = ['1', '2', '4', '6', '8', '12', '16'] as const
const TYPE_PEEK = ['display-md', 'text-xl', 'text-md', 'text-sm'] as const
const ROLE_PEEK = ['display', 'heading-md', 'body-md', 'button', 'caption'] as const
const WIDE = new Set(['color', 'typography'])

function pxOf(value: string | undefined): number {
  const n = parseFloat(value ?? '')
  return Number.isFinite(n) ? n : 0
}

function paint(system: SystemDoc, id: string, appearance: 'light' | 'dark'): string {
  for (const cat of system.categoricalCategories ?? []) {
    const hit = cat.tokens.find((token) => token.id === id)
    if (!hit) continue
    const hex = appearance === 'dark' ? hit.darkHex : hit.lightHex
    if (hex) return hex
  }
  return ''
}

function rampFamilies(system: SystemDoc, appearance: 'light' | 'dark') {
  const wantDark = appearance === 'dark'
  return system.primitiveFamilies
    .filter((f) => f.label.endsWith(' Dark') === wantDark && Object.keys(f.scale).length > 0)
    .map((f) => ({
      name: f.label.replace(/ Dark$/, '').replace(/^State\//, ''),
      scale: f.scale,
    }))
}

function tonesOf(scale: Record<number, string>): [number, string][] {
  return Object.entries(scale)
    .map(([tone, hex]) => [Number(tone), hex] as [number, string])
    .filter((pair) => Number.isFinite(pair[0]) && pair[1])
    .sort((a, b) => a[0] - b[0])
}

export function HubSystemBoard({
  system, appearance, onOpen,
}: {
  system: SystemDoc
  appearance: 'light' | 'dark'
  onOpen: (key: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 @min-[560px]:grid-cols-2">
      {FOUNDATION_DOCS.map((foundation) => (
        <FoundationCard
          key={foundation.key}
          foundation={foundation}
          system={system}
          appearance={appearance}
          onOpen={() => onOpen(foundation.key)}
        />
      ))}
    </div>
  )
}

function FoundationCard({
  foundation, system, appearance, onOpen,
}: {
  foundation: FoundationDoc
  system: SystemDoc
  appearance: 'light' | 'dark'
  onOpen: () => void
}) {
  const { t } = useI18n()
  const count = foundation.tokenCount(system)
  const wide = WIDE.has(foundation.key)
  return (
    <button
      type="button"
      id={`ov-${foundation.key}`}
      onClick={onOpen}
      aria-label={t('Read the {foundation} page', { foundation: t(foundation.label).toLowerCase() })}
      className={`group flex scroll-mt-4 flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${wide ? '@min-[560px]:col-span-2' : ''}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-heading font-semibold text-fg">{t(foundation.label)}</span>
        <span className="flex flex-shrink-0 items-center gap-3">
          <span className="text-caption tabular-nums text-fg-faint">
            {count === 1 ? t('{count} token', { count }) : t('{count} tokens', { count })}
          </span>
          <span className="inline-flex items-center gap-0.5 text-caption font-medium text-fg-muted transition-colors group-hover:text-fg">
            {t('See more')}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4.5 2.5 8 6 4.5 9.5" />
            </svg>
          </span>
        </span>
      </span>
      <Specimen foundation={foundation.key} system={system} appearance={appearance} />
    </button>
  )
}

function Specimen({
  foundation, system, appearance,
}: {
  foundation: string
  system: SystemDoc
  appearance: 'light' | 'dark'
}) {
  if (foundation === 'color') return <ColorSheet system={system} appearance={appearance} />
  if (foundation === 'typography') return <FontSheet system={system} />
  if (foundation === 'radius') return <RadiusSheet system={system} appearance={appearance} />
  if (foundation === 'spacing') return <SpacingSheet system={system} appearance={appearance} />
  if (foundation === 'shadow') return <ShadowSheet system={system} appearance={appearance} />
  if (foundation === 'grid') return <GridSheet system={system} appearance={appearance} />
  if (foundation === 'sizes') return <SizesSheet system={system} appearance={appearance} />
  if (foundation === 'stroke') return <StrokeSheet system={system} appearance={appearance} />
  if (foundation === 'icons') return <IconsSheet system={system} appearance={appearance} />
  return null
}

function ColorSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const families = rampFamilies(system, appearance)
  const accent = families.find((f) => f.name === 'Accent')?.scale[9] ?? ''
  const brand = paint(system, 'action.primary.default', appearance) || accent
  const onBrand = paint(system, 'content.on-action', appearance)
  const ink = paint(system, 'content.primary', appearance)
  const page = paint(system, 'surface.page', appearance)
  const statuses = [
    'status.critical.surface-solid',
    'status.warning.surface-solid',
    'status.success.surface-solid',
    'status.info.surface-solid',
  ].flatMap((id) => {
    const hex = paint(system, id, appearance)
    return hex ? [{ id, hex }] : []
  })

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {families.map((family) => {
        const tones = tonesOf(family.scale)
        return (
          <span key={family.name} className="flex min-w-0 items-center gap-3">
            <span className="w-16 flex-shrink-0 truncate text-caption text-fg-muted">{family.name}</span>
            <span className="flex min-w-0 flex-1 gap-0.5">
              {tones.map(([tone, hex]) => (
                <span
                  key={tone}
                  className="h-7 min-w-0 flex-1 rounded-[3px] ring-1 ring-black/10 dark:ring-white/10"
                  style={{ background: hex }}
                  title={`${family.name} ${tone} ${hex}`}
                />
              ))}
            </span>
          </span>
        )
      })}
      {(brand || ink || statuses.length > 0) && (
        <span className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {page && ink && (
            <span
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-caption font-medium ring-1 ring-black/10 dark:ring-white/10"
              style={{ background: page, color: ink }}
            >
              Ag
            </span>
          )}
          {brand && (
            <span
              className="inline-flex h-8 items-center rounded-lg px-3 text-caption font-semibold"
              style={{ background: brand, color: onBrand || ink || 'transparent' }}
            >
              Ag
            </span>
          )}
          {statuses.map(({ id, hex }) => (
            <span
              key={id}
              className="h-8 w-8 rounded-lg ring-1 ring-black/10 dark:ring-white/10"
              style={{ background: hex }}
              title={id}
            />
          ))}
        </span>
      )}
    </div>
  )
}

function FontSheet({ system }: { system: SystemDoc }) {
  const body = fontStack(system.typography.fontFamily)
  const heading = fontStack(system.typography.headingFontFamily ?? system.typography.fontFamily)
  const roles = ROLE_PEEK.map((key) => {
    const style = typeStyleCss(system.typography, system.typography.roles, key, { leading: true })
    const label = TYPE_ROLES.find((role) => role.key === key)?.label ?? key
    return { key, label, style }
  })
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <span className="flex items-end gap-5 overflow-hidden">
        {TYPE_PEEK.map((key) => {
          const size = system.typography.sizes?.[key] ?? ''
          const display = key.startsWith('display')
          return (
            <span key={key} className="flex flex-col gap-1">
              <span
                className="text-fg"
                style={{
                  fontFamily: display ? heading : body,
                  fontSize: size,
                  lineHeight: 1,
                  fontWeight: display ? 600 : 400,
                }}
              >
                Aa
              </span>
              <span className="text-micro font-mono text-fg-faint">{size}</span>
            </span>
          )
        })}
      </span>
      <span className="flex flex-col gap-1">
        {roles.map(({ key, label, style }) => (
          <span
            key={key}
            className="truncate text-fg"
            style={{
              fontFamily: fontStack(style.family),
              fontSize: style.size,
              lineHeight: style.lineHeight ?? 1.2,
              fontWeight: style.weight,
            }}
          >
            {label}
          </span>
        ))}
      </span>
      <span className="flex items-end gap-5">
        {FONT_WEIGHT_BASES.map((w) => (
          <span key={w.key} className="flex flex-col gap-0.5">
            <span
              className="text-[22px] leading-none text-fg"
              style={{ fontFamily: body, fontWeight: system.typography.weights?.[w.key] ?? w.weight }}
            >
              Ag
            </span>
            <span className="text-micro font-mono text-fg-faint">{system.typography.weights?.[w.key] ?? w.weight}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

function RadiusSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const edge = paint(system, 'border.control', appearance) || paint(system, 'content.primary', appearance)
  return (
    <span className="flex flex-wrap items-end gap-3">
      {RADIUS_PEEK.map((step) => {
        const value = system.radius[step]
        if (!value) return null
        return (
          <span key={step} className="flex flex-col items-center gap-1.5">
            <span
              className="h-9 w-9 bg-app"
              style={{ borderRadius: value, border: `1.5px solid ${edge || 'currentColor'}` }}
            />
            <span className="text-micro font-mono text-fg-faint">{pxOf(value) || value}</span>
          </span>
        )
      })}
    </span>
  )
}

function SpacingSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const fill = paint(system, 'action.primary.default', appearance)
    || rampFamilies(system, appearance).find((f) => f.name === 'Accent')?.scale[9]
    || 'currentColor'
  const shown = SPACING_PEEK.filter((step) => system.spacing[step])
  const max = Math.max(...shown.map((step) => pxOf(system.spacing[step])), 1)
  return (
    <span className="flex flex-col gap-1.5">
      {shown.map((step) => {
        const value = system.spacing[step]
        const px = pxOf(value)
        return (
          <span key={step} className="flex items-center gap-2">
            <span className="w-8 flex-shrink-0 text-micro font-mono tabular-nums text-fg-faint">{px}</span>
            <span className="h-2 rounded-full" style={{ width: `${(px / max) * 100}%`, background: fill }} />
          </span>
        )
      })}
    </span>
  )
}

function ShadowSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const ground = paint(system, 'surface.layer-2', appearance) || paint(system, 'surface.page', appearance)
  return (
    <span className="flex flex-wrap items-end gap-3">
      {SHADOW_STEPS.map((step) => {
        const raw = system.shadows[step]
        if (!raw) return null
        const shadow = appearance === 'dark' ? darkShadow(raw) : raw
        return (
          <span key={step} className="flex flex-col items-center gap-1.5">
            <span
              className="h-10 w-10 rounded-lg ring-1 ring-black/10 dark:ring-white/15"
              style={{ background: ground || 'var(--elevated)', boxShadow: shadow }}
            />
            <span className="text-micro font-mono text-fg-faint">{step}</span>
          </span>
        )
      })}
    </span>
  )
}

function GridSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const frame = resolveGridFrame('desktop', mergeGridFrame(system.gridFrame), system.spacing, extractBreakpoints(system.grid))
  const fill = paint(system, 'action.primary.default', appearance)
  const columns = Math.min(frame.columns, 12)
  return (
    <span className="flex flex-col gap-2">
      <span className="text-micro font-mono text-fg-faint">{frame.columns} · {frame.gutter}</span>
      <span className="flex" style={{ gap: frame.gutter }}>
        {Array.from({ length: columns }).map((_, i) => (
          <span
            key={i}
            className="h-10 min-w-0 flex-1 rounded-sm"
            style={{ background: fill ? `color-mix(in srgb, ${fill} 28%, transparent)` : 'var(--fg)' }}
          />
        ))}
      </span>
    </span>
  )
}

function SizesSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const fill = paint(system, 'content.primary', appearance) || 'currentColor'
  const steps = (['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).filter((step) => system.sizes[step])
  return (
    <span className="flex items-end gap-3">
      {steps.map((step) => {
        const px = pxOf(system.sizes[step])
        return (
          <span key={step} className="flex flex-col items-center gap-1.5">
            <span className="w-2.5 rounded-sm" style={{ height: Math.max(8, Math.min(px || 8, 56)), background: fill }} />
            <span className="text-micro font-mono text-fg-faint">{px || system.sizes[step]}</span>
          </span>
        )
      })}
    </span>
  )
}

function StrokeSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const ink = paint(system, 'content.primary', appearance) || 'currentColor'
  const steps = (['sm', 'md', 'lg'] as const).filter((step) => system.stroke[step])
  return (
    <span className="flex flex-col justify-center gap-3 py-1">
      {steps.map((step) => {
        const px = pxOf(system.stroke[step])
        return (
          <span key={step} className="flex items-center gap-3">
            <span className="w-8 flex-shrink-0 text-micro font-mono tabular-nums text-fg-faint">{px || system.stroke[step]}</span>
            <span className="min-w-0 flex-1 rounded-full" style={{ height: Math.max(px, 1), background: ink }} />
          </span>
        )
      })}
    </span>
  )
}

function IconsSheet({ system, appearance }: { system: SystemDoc; appearance: 'light' | 'dark' }) {
  const ink = paint(system, 'content.primary', appearance) || 'currentColor'
  const library = getIconLibrary(system.iconLibrary)
  return (
    <span className="flex flex-col gap-3">
      <span className="flex items-center gap-3" style={{ color: ink }}>
        {SAMPLE_GLYPHS.slice(0, 5).map((glyph) => (
          <svg key={glyph.name} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={glyph.path} />
          </svg>
        ))}
      </span>
      <span className="text-caption text-fg-muted">{library.label}</span>
    </span>
  )
}
