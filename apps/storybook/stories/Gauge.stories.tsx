import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Gauge, GAUGE_SIZES, GAUGE_VARIANTS, type GaugeSize, type GaugeVariant } from '../../../src/components/escala-ui/gauge'
import { Button } from '../../../src/components/escala-ui/button'
import { blockType } from '../../../src/components/escala-ui/blocks/shared'

/** Story args = the Figma `Gauge` set (design-plans/gauge-contract.md), in the panel's order: Variant · Size · Value are its variant
 *  axes, ValueText · Unit · Label its TEXT properties, UnitVisible · LabelVisible its booleans. `min` / `max` are code only. */
interface GaugeStoryArgs {
  variant: GaugeVariant
  size: GaugeSize
  value: number
  valueText: string
  unit: string
  label: string
  unitVisible: boolean
  labelVisible: boolean
  min: number
  max: number
}

const VALUES = [0, 25, 50, 75, 100]
const SIZE_ORDER: GaugeSize[] = ['sm', 'default', 'lg']

function render({ variant, size, value, valueText, unit, label, unitVisible, labelVisible, min, max }: GaugeStoryArgs) {
  return (
    <Gauge
      variant={variant}
      size={size}
      value={value}
      min={min}
      max={max}
      valueText={valueText || undefined}
      unit={unitVisible ? unit : undefined}
      label={labelVisible ? label : undefined}
      aria-label="Workspace health"
    />
  )
}

const caption: React.CSSProperties = { ...blockType('body-sm'), margin: 0, color: 'var(--color-content-secondary)' }

const meta: Meta<GaugeStoryArgs> = {
  title: 'Indicators/Gauge',
  render,
  parameters: {
    docs: {
      description: {
        component:
          'One measurement against a fixed range, drawn on an open 270° arc (it starts at 135° and runs clockwise) with round ends. In the middle sit the value, its unit and a label.\n\n' +
          '**Chart colours or Status colours.** `default` fills with the neutral chart series (`Chart/series-1/solid`, its label `Chart/series-1/content`): use it for a reading with no judgement. ' +
          '`success · warning · critical` fill with `Status/<severity>/surface-solid` and label in `Status/<severity>/content`: use them only when the colour *means* good or bad. Never put an opacity on a chart role.\n\n' +
          '**Value.** Figma draws the Value axis as five samples (0 · 25 · 50 · 75 · 100); code takes any `value` between `min` and `max` (0–100 by default). ' +
          'In Figma the default Value is 0 while the default ValueText is "72": the Playground starts at 72 so the arc and the text agree, and the text follows `value` unless you type a `ValueText`.\n\n' +
          '**Accessibility.** `role="meter"` with `aria-valuenow / min / max` and an `aria-valuetext` that reads the label ("72 %, Healthy"). It is not focusable. Give it a name with `aria-label` or `aria-labelledby`.\n\n' +
          '**Motion.** A new value sweeps the fill along the arc on `use-travel-in`. Reduced motion is instant (it comes from the motion roles).',
      },
    },
  },
  args: {
    variant: 'default',
    size: 'default',
    value: 72,
    valueText: '',
    unit: '%',
    label: 'Healthy',
    unitVisible: true,
    labelVisible: true,
    min: 0,
    max: 100,
  },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...GAUGE_VARIANTS], description: 'default reads the neutral chart series; success · warning · critical read the Status roles.' },
    size: { name: 'Size', control: 'select', options: [...GAUGE_SIZES], description: '160 (default) · 128 (sm) · 192 (lg) across; the arc is 12 · 8 · 16 thick.' },
    value: { name: 'Value', control: { type: 'range', min: 0, max: 100, step: 1 }, description: 'Figma samples 0 · 25 · 50 · 75 · 100; code takes any value.' },
    valueText: { name: 'ValueText', control: 'text', description: 'The big number as written. Empty: the value itself.' },
    unit: { name: 'Unit', control: 'text', if: { arg: 'unitVisible' } },
    label: { name: 'Label', control: 'text', if: { arg: 'labelVisible' } },
    unitVisible: { name: 'UnitVisible', control: 'boolean' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    min: { control: 'number', description: 'Code only: aria-valuemin.' },
    max: { control: 'number', description: 'Code only: aria-valuemax.' },
  },
}
export default meta
type Story = StoryObj<GaugeStoryArgs>

export const Playground: Story = {}

/** The 60 variants as the Figma set draws them: Variant × Size × Value 0 · 25 · 50 · 75 · 100. The text follows each value (the file writes "72" in all of them). */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)' }}>
      {GAUGE_VARIANTS.flatMap((variant) =>
        GAUGE_SIZES.map((size) => (
          <div key={`${variant}-${size}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'center' }}>
            {VALUES.map((value) => (
              <div key={value}>{render({ ...args, variant, size, value })}</div>
            ))}
          </div>
        )),
      )}
    </div>
  ),
}

/** Size sm 128 · default 160 · lg 192. The value, unit and label step up their text styles with it. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'center' }}>
      {SIZE_ORDER.map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-gap-control)' }}>
          {render({ ...args, size })}
          <p style={caption}>{size}</p>
        </div>
      ))}
    </div>
  ),
}

/**
 * Chart vs Status colours. The neutral series (`Chart/series-1`) says "here is a number"; a severity says "this number is good / needs attention / is bad".
 * Pick the severity from the reading, not from the design: the same 72 % is `success` for health and `critical` for disk usage.
 */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
      {GAUGE_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-gap-control)' }}>
          {render({ ...args, variant })}
          <p style={caption}>{variant === 'default' ? 'default · Chart/series-1' : `${variant} · Status/${variant}`}</p>
        </div>
      ))}
    </div>
  ),
}

/**
 * Motion: a new value sweeps the fill along the arc on `use-travel-in` (the arc's dash is the value). Pick a reading and watch the fill travel
 * from where it was; the number changes with it. Under reduced motion the fill jumps (the role is instant, nothing in the component names a duration).
 */
export const Motion: Story = {
  render: (args) => {
    const [value, setValue] = React.useState(20)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-gap-control)', flexWrap: 'wrap' }}>
          {[0, 20, 55, 72, 100].map((v) => (
            <Button key={v} variant="secondary" appearance={v === value ? 'solid' : 'outline'} size="sm" onClick={() => setValue(v)}>{v}</Button>
          ))}
        </div>
        {render({ ...args, value })}
      </div>
    )
  },
}
