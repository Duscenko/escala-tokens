// Token Details for the three length kinds the inspector traces but the
// geometry drawer never edited: SPACING, STROKE and SHADOW.
//
// A recipe references two different things under one namespace, and the
// drawer treats them differently on purpose:
//  · a ROLE (`spacing.gap-control`, `stroke.control`) is an alias — picking a
//    value re-points it, exactly what Variables · Spacing / Stroke semantics
//    writes. Every component that reads the role follows.
//  · a PRIMITIVE STEP (`spacing.2`, `stroke.md`, `shadow.lg`) is a value of the
//    scale itself. Spacing steps are graded from the base unit, so the honest
//    edit is the base unit (it rescales every step — the drawer says so);
//    stroke and shadow steps are edited directly, like their Variables tables.

import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { captureSnapshot, SHADOW_DEFAULT, useDesignStore, type DesignSnapshot } from '../../store/useDesignStore'
import { recordEdit } from '../../lib/editHistory'
import { TokenDetailsModal } from './colorControls'
import { QUICK_SETTINGS_ID } from './ThemeQuickSettingsRail'
import { stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import VariableSelect from '../ui/VariableSelect'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import { resolveThemeFoundations, type ThemeFoundationOverride } from '../../lib/themeFoundations'
import {
  buildSpacingFromBase,
  mergeLayoutRoles,
  roleDimensionPx,
  spacingRefStep,
  LAYOUT_ROLES,
  SPACING_BASE_PRESETS,
  SPACING_DEFAULT_BASE,
  SPACING_RESPONSIVE,
  SPACING_RESPONSIVE_FAMILIES,
  SPACING_RESPONSIVE_KEYS,
  SPACING_STEPS,
  STROKE_STANDARD,
  STROKE_STEPS,
  type GridViewport,
} from '../../lib/layoutTokens'
import { SHADOW_PRESETS, SHADOW_STEPS, matchShadowPreset } from '../../lib/shadowTokens'

export type LayoutTokenKind = 'spacing' | 'stroke' | 'shadow'

export function layoutTokenKind(id: string | null): LayoutTokenKind | null {
  if (!id) return null
  if (id.startsWith('spacing.')) return 'spacing'
  if (id.startsWith('stroke.')) return 'stroke'
  if (id.startsWith('shadow.')) return 'shadow'
  return null
}

const PLATFORM_LABEL: Record<GridViewport, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }
const FAMILY_LABEL: Record<string, string> = { component: 'Component', section: 'Section', layout: 'Layout' }
const stepLabel = (step: string) => step.replace('_', '.')
const px = (v: string | undefined) => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : null
}

const STROKE_DESCRIPTIONS: Record<string, string> = {
  none: 'No border.', sm: 'Hairline — dividers and control borders.', md: 'Focus rings and emphasis.', lg: 'Heavy rules.',
}
const SHADOW_DESCRIPTIONS: Record<string, string> = {
  xs: 'Resting controls.', sm: 'Cards at rest.', md: 'Raised cards, hover.', lg: 'Popovers and menus.', xl: 'Floating panels.', '2xl': 'Dialogs and sheets.',
}

/** The `shadow-xs` swatch the drawer shows above the field. */
function ShadowSwatch({ value }: { value: string }) {
  return (
    <div className="flex h-16 items-center justify-center rounded-lg border border-line/60 bg-app">
      <div className="h-8 w-16 rounded-md bg-surface" style={{ boxShadow: value }} />
    </div>
  )
}

export default function LayoutTokenDetails({
  kind,
  tokenId,
  previewTheme,
  previewViewport,
  stylePreview,
  onClose,
  onOpenInVariables,
  backLabel,
}: {
  kind: LayoutTokenKind
  tokenId: string
  previewTheme: string
  previewViewport: GridViewport
  stylePreview?: StylePreview | null
  onClose: () => void
  onOpenInVariables?: (tokenId: string) => void
  backLabel?: string | null
}) {
  const reduce = useReducedMotion() ?? false
  const key = tokenId.slice(kind.length + 1)
  const { foundations: liveFoundations, patch } = useThemeFoundations(previewTheme)
  const live = useDesignStore()
  const overlay = useMemo(
    () => (stylePreview ? stylePreviewStore(live, stylePreview, previewTheme) : null),
    [stylePreview, live, previewTheme],
  )
  const foundations = overlay ? resolveThemeFoundations(overlay, previewTheme) : liveFoundations
  const viewport = previewViewport
  const locked = !!stylePreview

  const write = (partial: ThemeFoundationOverride, label: string) => {
    // A try-on is an overlay; writing the live theme would leak onto the
    // committed brand (same rule as the geometry drawer).
    if (locked) return
    recordEdit(captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot), label)
    patch(partial)
    const state = useDesignStore.getState()
    if (Object.keys(state.themes).length !== 1) return
    if (partial.spacing) state.setSpacing(partial.spacing)
    if (partial.padding) state.setPadding(partial.padding)
    if (partial.spacingRoles) state.setSpacingRoles(partial.spacingRoles)
    if (partial.stroke) state.setStroke(partial.stroke)
    if (partial.strokeRoles) state.setStrokeRoles(partial.strokeRoles)
    if (partial.shadows) state.setShadows(partial.shadows)
  }

  const spacingRole = kind === 'spacing' ? LAYOUT_ROLES.spacing.find((role) => role.key === key) : undefined
  const strokeRole = kind === 'stroke' ? LAYOUT_ROLES.stroke.find((role) => role.key === key) : undefined
  const spacing = foundations.spacing
  const stroke = { ...STROKE_STANDARD, ...foundations.stroke } as Record<string, string>
  const shadows = foundations.shadows

  const spacingPx = (value: string): number | null => {
    const pinned = roleDimensionPx(value, true)
    if (pinned !== null) return pinned
    return px(spacing[spacingRefStep(value, viewport)])
  }

  let description = ''
  let cssVarName = `${kind}-${key}`
  let resetDisabled = true
  let onReset = () => {}
  let content: React.ReactNode = null

  if (spacingRole) {
    const roles = mergeLayoutRoles('spacing', foundations.spacingRoles)
    const value = roles[key] ?? spacingRole.primitive
    description = spacingRole.description
    resetDisabled = value === spacingRole.primitive
    onReset = () => write({ spacingRoles: { ...roles, [key]: spacingRole.primitive } }, `Reset ${tokenId}`)
    const pinned = roleDimensionPx(value, true) !== null
    content = (
      <div className="flex flex-col gap-2 px-3 py-3">
        <VariableSelect
          ariaLabel={`${tokenId} token`}
          value={value}
          onChange={(next) => write({ spacingRoles: { ...roles, [key]: next } }, `${tokenId} → ${next}`)}
        >
          {SPACING_RESPONSIVE_FAMILIES.map((family) => (
            <optgroup key={family} label={`Responsive · ${FAMILY_LABEL[family]}`}>
              {SPACING_RESPONSIVE_KEYS.filter((k) => k.startsWith(`${family}-`)).map((k) => (
                <option key={k} value={k}>
                  {`${k}  ·  ${(['desktop', 'tablet', 'mobile'] as const).map((vp) => px(spacing[SPACING_RESPONSIVE[k][vp]]) ?? '—').join(' / ')}`}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="Fixed">
            {SPACING_STEPS.map((s) => (
              <option key={s} value={s}>{`space-${stepLabel(s)}  ·  ${px(spacing[s]) ?? '—'}px`}</option>
            ))}
            {pinned && <option value={value}>{`pinned · ${roleDimensionPx(value, true)}px`}</option>}
          </optgroup>
        </VariableSelect>
        <p className="m-0 text-nano text-fg-faint">
          {PLATFORM_LABEL[viewport]}: {spacingPx(value) ?? '—'}px. A responsive token steps down per platform; a fixed step holds everywhere.
        </p>
      </div>
    )
  } else if (kind === 'spacing') {
    const base = px(spacing['1']) ?? SPACING_DEFAULT_BASE
    cssVarName = `spacing-${key}`
    description = `Primitive step of the spacing scale (${stepLabel(key)} × base unit). Components pin it directly; the base unit rescales every step.`
    resetDisabled = base === SPACING_DEFAULT_BASE
    const applyBase = (n: number) => {
      const next = buildSpacingFromBase(n)
      const inset = next['5']
      write({ spacing: next, padding: { top: inset, right: inset, bottom: inset, left: inset } }, `Spacing base → ${n}px`)
    }
    onReset = () => applyBase(SPACING_DEFAULT_BASE)
    content = (
      <div className="flex flex-col gap-2 px-3 py-3">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-ui text-fg">space-{stepLabel(key)}</span>
          <span className="font-mono text-ui tabular-nums text-fg">{spacing[key] ?? '—'}</span>
        </div>
        <span className="text-nano text-fg-faint">Base unit</span>
        <VariableSelect ariaLabel="Spacing base unit" value={String(base)} onChange={(v) => applyBase(Number(v))}>
          {SPACING_BASE_PRESETS.map((p) => (
            <option key={p.value} value={String(p.value)}>{p.label.replace(/\s+/g, ' ')}</option>
          ))}
          {!SPACING_BASE_PRESETS.some((p) => p.value === base) && <option value={String(base)}>{base}px (custom)</option>}
        </VariableSelect>
        <p className="m-0 text-nano text-fg-faint">Changes every spacing step, so every gap and inset in the system moves with it.</p>
      </div>
    )
  } else if (strokeRole) {
    const roles = mergeLayoutRoles('stroke', foundations.strokeRoles)
    const value = roles[key] ?? strokeRole.primitive
    description = strokeRole.description
    resetDisabled = value === strokeRole.primitive
    onReset = () => write({ strokeRoles: { ...roles, [key]: strokeRole.primitive } }, `Reset ${tokenId}`)
    content = (
      <div className="px-3 py-3">
        <VariableSelect
          ariaLabel={`${tokenId} primitive`}
          value={value}
          onChange={(next) => write({ strokeRoles: { ...roles, [key]: next } }, `${tokenId} → ${next}`)}
        >
          {STROKE_STEPS.map((s) => <option key={s} value={s}>{`stroke-${s}  ·  ${stroke[s] ?? '—'}`}</option>)}
          {!(STROKE_STEPS as readonly string[]).includes(value) && <option value={value}>{`pinned · ${roleDimensionPx(value) ?? value}px`}</option>}
        </VariableSelect>
      </div>
    )
  } else if (kind === 'stroke') {
    const value = stroke[key] ?? '1px'
    const standard = (STROKE_STANDARD as Record<string, string>)[key]
    description = STROKE_DESCRIPTIONS[key] ?? 'Stroke primitive.'
    resetDisabled = !standard || value === standard
    onReset = () => standard && write({ stroke: { ...stroke, [key]: standard } }, `Reset ${tokenId}`)
    content = (
      <div className="px-3 py-3">
        <VariableSelect
          ariaLabel={`${tokenId} width`}
          value={value}
          onChange={(next) => write({ stroke: { ...stroke, [key]: next } }, `${tokenId} → ${next}`)}
        >
          {['0px', '0.5px', '1px', '1.5px', '2px', '3px', '4px', '6px', '8px'].concat(
            ['0px', '0.5px', '1px', '1.5px', '2px', '3px', '4px', '6px', '8px'].includes(value) ? [] : [value],
          ).map((v) => <option key={v} value={v}>{v}</option>)}
        </VariableSelect>
      </div>
    )
  } else if (kind === 'shadow') {
    const value = shadows[key] ?? 'none'
    const standard = SHADOW_DEFAULT[key]
    const preset = matchShadowPreset(shadows)
    description = `${SHADOW_DESCRIPTIONS[key] ?? 'Elevation step.'} The dark theme derives its own twin from this value.`
    resetDisabled = !standard || value === standard
    onReset = () => standard && write({ shadows: { ...shadows, [key]: standard } }, `Reset ${tokenId}`)
    content = (
      <div className="flex flex-col gap-2 px-3 py-3">
        <ShadowSwatch value={value} />
        <span className="text-nano text-fg-faint">Value</span>
        <textarea
          key={value}
          defaultValue={value}
          aria-label={`${tokenId} value`}
          rows={3}
          spellCheck={false}
          disabled={locked}
          onBlur={(e) => {
            const next = e.currentTarget.value.trim() || 'none'
            if (next !== value) write({ shadows: { ...shadows, [key]: next } }, `${tokenId} → ${next}`)
          }}
          className="w-full resize-none rounded-lg border border-line bg-app px-2 py-1.5 font-mono text-nano text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        />
        <span className="text-nano text-fg-faint">Ramp preset</span>
        <VariableSelect
          ariaLabel="Shadow preset"
          value={preset ?? ''}
          onChange={(label) => {
            const hit = SHADOW_PRESETS.find((p) => p.label === label)
            if (hit) write({ shadows: { ...hit.values } }, `Shadow preset → ${label}`)
          }}
        >
          {!preset && <option value="">Custom</option>}
          {SHADOW_PRESETS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
        </VariableSelect>
        <p className="m-0 text-nano text-fg-faint">A preset replaces all {SHADOW_STEPS.length} steps.</p>
      </div>
    )
  }

  if (!content) return null

  return (
    <AnimatePresence>
      <TokenDetailsModal
        key={tokenId}
        name={tokenId}
        cssVarName={cssVarName}
        description={locked ? `${description} Add the style to My themes to edit it.` : description}
        dockToSelector={`#${QUICK_SETTINGS_ID}`}
        coverAnchor
        inInspector
        backLabel={backLabel}
        onOpenInTable={onOpenInVariables ? () => onOpenInVariables(tokenId) : undefined}
        onReset={onReset}
        resetDisabled={resetDisabled || locked}
        onClose={onClose}
        reduce={reduce}
        initialOpenKey={viewport}
        sections={[{ key: viewport, label: PLATFORM_LABEL[viewport], content }]}
      />
    </AnimatePresence>
  )
}
