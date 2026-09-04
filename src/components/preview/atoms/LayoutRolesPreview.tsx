// Spacing · Size · Stroke role specimens — catalogue components plus a
// role-resolved sample, with the same edit-to-table jump as Type / Radius.

import type { ReactNode } from 'react'
import type { PreviewTokens } from '../ButtonPreview'
import {
  radiusRoleOf,
  selectorRoleOf,
  sizeRoleOf,
  spacingRoleOf,
  strokeRoleOf,
  typeStyleOf,
} from '../../../lib/previewTokens'
import { LAYOUT_ROLE_GROUPS, LAYOUT_ROLES, type LayoutFamily } from '../../../lib/layoutTokens'
import { SPECIMENS } from '../../configurator/docs/specimens'
import { RoleEditCard } from './RoleEditCard'

const ButtonSpec = SPECIMENS.Button
const InputSpec = SPECIMENS.Input
const CardSpec = SPECIMENS.Card
const ButtonGroupSpec = SPECIMENS.ButtonGroup
const FieldSpec = SPECIMENS.Field
const ChipSpec = SPECIMENS.Chip
const CloseSpec = SPECIMENS.CloseButton
const FabSpec = SPECIMENS.FABButton
const DividerSpec = SPECIMENS.Divider

function num(v: string, fallback: number) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

function SpacingExamples({ role, t }: { role: string; t: PreviewTokens }) {
  const gap = spacingRoleOf(t, role, '8px')
  const accent = t.brandSolid ?? '#7f56d9'
  if (role === 'none' || role.startsWith('gap-')) {
    return (
      <div className="flex flex-col gap-2.5 w-full min-w-0">
        <div className="flex items-center" style={{ gap }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: accent }} />
          <span style={{ ...typeStyleOf(t, 'label'), color: t.neutralText }}>Label</span>
        </div>
        {role === 'gap-control' && <ButtonGroupSpec t={t} v={{}} />}
        {role === 'gap-group' && <FieldSpec t={t} v={{}} />}
        {role === 'gap-tight' && <ChipSpec t={t} v={{ Dismissible: 'True' }} />}
      </div>
    )
  }
  const pad = spacingRoleOf(t, role, '12px')
  return (
    <div className="flex flex-col gap-2.5 w-full min-w-0">
      <div
        style={{
          padding: pad,
          borderRadius: radiusRoleOf(t, role === 'inset-control' ? 'action' : 'container'),
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          background: t.neutralFill || t.surface,
        }}
      >
        <span style={{ ...typeStyleOf(t, 'body-sm'), color: t.neutralText }}>Inset</span>
      </div>
      {role === 'inset-control' && <ButtonSpec t={t} v={{ Style: 'Solid' }} />}
      {role === 'inset-surface' && <CardSpec t={t} v={{}} />}
    </div>
  )
}

function SizeExamples({ role, t }: { role: string; t: PreviewTokens }) {
  const h = num(sizeRoleOf(t, role, '40px'), 40)
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: h,
          padding: '0 16px',
          borderRadius: radiusRoleOf(t, 'action'),
          background: t.brandSolid,
          color: t.onBrand,
          ...typeStyleOf(t, 'button'),
        }}
      >
        {h}px
      </span>
      {role === 'compact' && <ButtonSpec t={t} v={{ Size: 'SM' }} />}
      {role === 'control' && (
        <>
          <ButtonSpec t={t} v={{ Size: 'MD' }} />
          <InputSpec t={t} v={{}} />
        </>
      )}
      {role === 'touch' && <ButtonSpec t={t} v={{ Size: 'LG' }} />}
      {role === 'hit' && <CloseSpec t={t} v={{}} />}
      {role === 'fab' && <FabSpec t={t} v={{ Size: 'LG' }} />}
    </div>
  )
}

function StrokeExamples({ role, t }: { role: string; t: PreviewTokens }) {
  if (role === 'divider') return <DividerSpec t={t} v={{}} />
  if (role === 'focus') {
    return (
      <>
        <InputSpec t={t} v={{ State: 'Focused' }} />
        <ButtonSpec t={t} v={{ Style: 'Outline', State: 'Focused' }} />
      </>
    )
  }
  return (
    <>
      <ButtonSpec t={t} v={{ Style: 'Outline' }} />
      <InputSpec t={t} v={{}} />
      <CardSpec t={t} v={{}} />
    </>
  )
}

function Swatch({ family, role, t }: { family: LayoutFamily; role: string; t: PreviewTokens }) {
  const accent = t.brandSolid ?? '#7f56d9'
  if (family === 'spacing') {
    const px = num(spacingRoleOf(t, role, '8px'), 8)
    return (
      <span
        className="flex-shrink-0 mt-0.5 rounded-sm"
        style={{ width: 22, height: Math.max(4, Math.min(px, 22)), background: accent, opacity: 0.7 }}
        aria-hidden
      />
    )
  }
  if (family === 'selector') {
    const px = num(selectorRoleOf(t, role, '18px'), 18)
    return (
      <span
        className="flex-shrink-0 mt-0.5 rounded-sm"
        style={{
          width: Math.max(8, Math.min(px, 22)),
          height: Math.max(8, Math.min(px, 22)),
          background: accent + '33',
          border: `1.5px solid ${accent}66`,
        }}
        aria-hidden
      />
    )
  }
  if (family === 'size') {
    const px = num(sizeRoleOf(t, role, '40px'), 40)
    return (
      <span
        className="flex-shrink-0 mt-0.5 rounded"
        style={{
          width: 22,
          height: Math.max(8, Math.min(px / 2.4, 22)),
          background: accent + '33',
          border: `1.5px solid ${accent}66`,
        }}
        aria-hidden
      />
    )
  }
  const px = num(strokeRoleOf(t, role, '1px'), 1)
  return (
    <span className="flex-shrink-0 mt-1 w-[22px] flex items-center" aria-hidden>
      <span className="w-full rounded-full" style={{ height: Math.max(px, 1), background: accent }} />
    </span>
  )
}

function SelectorExamples({ role, t }: { role: string; t: PreviewTokens }) {
  const px = num(selectorRoleOf(t, role, '18px'), 18)
  const accent = t.brandSolid ?? '#7f56d9'
  return (
    <span
      style={{
        display: 'inline-flex',
        width: px,
        height: px,
        borderRadius: 4,
        background: accent + '22',
        border: `1.5px solid ${accent}66`,
      }}
      aria-hidden
    />
  )
}

const EXAMPLES: Record<'spacing' | 'size' | 'stroke' | 'selector', (role: string, t: PreviewTokens) => ReactNode> = {
  spacing: (role, t) => <SpacingExamples role={role} t={t} />,
  size: (role, t) => <SizeExamples role={role} t={t} />,
  stroke: (role, t) => <StrokeExamples role={role} t={t} />,
  selector: (role, t) => <SelectorExamples role={role} t={t} />,
}

export function LayoutRolesPreview({
  family,
  tokens,
  onEditRole,
}: {
  family: 'spacing' | 'size' | 'stroke' | 'selector'
  tokens: PreviewTokens
  onEditRole?: (key: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {LAYOUT_ROLE_GROUPS[family].map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{g.label}</span>
          {LAYOUT_ROLES[family].filter((r) => r.group === g.id).map((role) => (
            <RoleEditCard
              key={role.key}
              tokens={tokens}
              token={`${family}-${role.key}`}
              label={role.label}
              swatch={<Swatch family={family} role={role.key} t={tokens} />}
              onEdit={onEditRole ? () => onEditRole(role.key) : undefined}
            >
              {EXAMPLES[family](role.key, tokens)}
            </RoleEditCard>
          ))}
        </section>
      ))}
    </div>
  )
}
