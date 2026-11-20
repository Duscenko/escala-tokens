import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sparkline, SPARKLINE_SIZES, SPARKLINE_VARIANTS, type SparklineSize, type SparklineVariant } from '../../../src/components/escala-ui/sparkline'
import { Button } from '../../../src/components/escala-ui/button'
import { blockType } from '../../../src/components/escala-ui/blocks/shared'

/** Story args = the Figma `Sparkline` set (design-plans/sparkline-contract.md), in the panel's order: Variant · Size are its variant axes,
 *  AreaVisible · DotVisible its booleans. `data` and `fluid` are code only (the file draws one sample curve). */
interface SparklineStoryArgs {
  variant: SparklineVariant
  size: SparklineSize
  areaVisible: boolean
  dotVisible: boolean
  data: number[]
  fluid: boolean
}

/** The file's sample curve: nine points whose heights are 0 · 19 · 22 · 18 · 33 · 32 · 27 · 19 · 46 above the lowest one. */
const SAMPLE = [18, 37, 40, 36, 51, 50, 45, 37, 64]
/** The same story told the other way: down is bad. */
const FALLING = [64, 58, 60, 52, 47, 49, 38, 30, 22]
const SIZE_ORDER: SparklineSize[] = ['sm', 'default', 'lg']

const caption: React.CSSProperties = { ...blockType('body-sm'), margin: 0, color: 'var(--color-content-secondary)' }

function render({ variant, size, areaVisible, dotVisible, data, fluid }: SparklineStoryArgs) {
  return (
    <Sparkline
      variant={variant}
      size={size}
      area={areaVisible}
      dot={dotVisible}
      data={data}
      fluid={fluid}
      aria-label="Daily active users, up 7.2 % this week"
    />
  )
}

const meta: Meta<SparklineStoryArgs> = {
  title: 'Indicators/Sparkline',
  render,
  parameters: {
    docs: {
      description: {
        component:
          'A compact trend next to a value, with no axes or gridlines: a monotone line (round caps and joins) over a soft area that closes to the bottom edge, and a dot on the last point.\n\n' +
          '**Chart colours or Status colours.** `default` binds the neutral series (`Chart/series-1/solid` line and dot, `Chart/series-1/soft` area): use it when the direction carries no judgement. ' +
          '`success` and `critical` read the Status roles (`Status/<severity>/surface-solid` line and dot, `Status/<severity>/surface` area) because up is good or down is bad. `secondary` is a quiet grey (`Content/secondary` over `Surface/muted`). Never put an opacity on a chart role.\n\n' +
          '**Data.** Pass `data: number[]`, oldest first; the lowest value sits at the bottom and the highest at the top, with one dot of air above and below so nothing is clipped. Figma draws one sample curve: its shape is the Playground\'s default data.\n\n' +
          '**Size.** default 256 × 64 · sm 96 × 32 · lg 480 × 128. The line is `Stroke/focus` (2) on default and lg and a loose 1.5 on sm (finding DIM-03). The width follows the Size, or the container with `fluid`.\n\n' +
          '**Accessibility.** `role="img"` with a required `aria-label` that states the trend ("Daily active users, up 7.2 % this week"). The drawing is hidden from assistive tech: the label is the chart.\n\n' +
          '**Motion.** The line draws once on mount on `use-reveal`; new data cross-fades the old layer into the new one on `use-color`. Reduced motion is instant (it comes from the motion roles).',
      },
    },
  },
  args: {
    variant: 'default',
    size: 'default',
    areaVisible: true,
    dotVisible: true,
    data: SAMPLE,
    fluid: false,
  },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...SPARKLINE_VARIANTS], description: 'default reads the neutral chart series; secondary is grey; success · critical read the Status roles.' },
    size: { name: 'Size', control: 'select', options: [...SPARKLINE_SIZES], description: '256 × 64 (default) · 96 × 32 (sm) · 480 × 128 (lg).' },
    areaVisible: { name: 'AreaVisible', control: 'boolean' },
    dotVisible: { name: 'DotVisible', control: 'boolean' },
    data: { control: 'object', description: 'Code only: the series, oldest first.' },
    fluid: { control: 'boolean', description: 'Code only: the width follows the container.' },
  },
}
export default meta
type Story = StoryObj<SparklineStoryArgs>

export const Playground: Story = {}

/** The 12 variants as the Figma set draws them: Variant × Size, area and dot on. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
      {SPARKLINE_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'flex-end' }}>
          {SIZE_ORDER.map((size) => <div key={size}>{render({ ...args, variant, size })}</div>)}
        </div>
      ))}
    </div>
  ),
}

/** Size sm 96 × 32 · default 256 × 64 · lg 480 × 128. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'flex-end' }}>
      {SIZE_ORDER.map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-control)' }}>
          {render({ ...args, size })}
          <p style={caption}>{size}</p>
        </div>
      ))}
    </div>
  ),
}

/**
 * Chart vs Status colours. The neutral series says "here is a trend"; success and critical say "this trend is good" / "this trend is bad".
 * Choose by what the direction means: more users is good (`success`), more errors is bad (the same rising line would be `critical`).
 */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
      {SPARKLINE_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-control)' }}>
          {render({ ...args, variant, data: variant === 'critical' ? FALLING : args.data })}
          <p style={caption}>{variant === 'default' ? 'default · Chart/series-1' : variant === 'secondary' ? 'secondary · Content/secondary' : `${variant} · Status/${variant}`}</p>
        </div>
      ))}
    </div>
  ),
}

/** AreaVisible and DotVisible, off and on. The spacing stays the same: the dot's room is always kept. */
export const AreaAndDot: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
      {[[true, true], [true, false], [false, true], [false, false]].map(([areaVisible, dotVisible]) => (
        <div key={`${areaVisible}-${dotVisible}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-control)' }}>
          {render({ ...args, areaVisible, dotVisible })}
          <p style={caption}>{`area ${areaVisible ? 'on' : 'off'} · dot ${dotVisible ? 'on' : 'off'}`}</p>
        </div>
      ))}
    </div>
  ),
}

/** `fluid`: the width follows the container (here a resizable column), the height stays the Size's. */
export const Fluid: Story = {
  args: { size: 'lg', fluid: true },
  render: (args) => (
    <div style={{ width: '60%', minWidth: 160, maxWidth: '100%', resize: 'horizontal', overflow: 'auto', padding: 'var(--spacing-gap-control)', border: '1px dashed var(--color-border-default)' }}>
      {render(args)}
    </div>
  ),
}

/**
 * Motion: the line draws once on mount (`use-reveal`: Replay remounts it); a change of data cross-fades the old curve into the new one (`use-color`).
 * Under reduced motion both are instant (the roles are, nothing in the component names a duration).
 */
export const Motion: Story = {
  render: (args) => {
    const [run, setRun] = React.useState(0)
    const [rising, setRising] = React.useState(true)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-gap-control)', flexWrap: 'wrap' }}>
          <Button variant="secondary" appearance="outline" size="sm" onClick={() => setRun((n) => n + 1)}>Replay the draw</Button>
          <Button variant="secondary" appearance="outline" size="sm" onClick={() => setRising((r) => !r)}>Swap the data</Button>
        </div>
        <div key={run}>{render({ ...args, data: rising ? SAMPLE : FALLING })}</div>
      </div>
    )
  },
}
