import type { Meta, StoryObj } from '@storybook/react-vite'
import { Fragment } from 'react'
import { ScrollArea, SCROLL_AREA_ORIENTATIONS, SCROLL_AREA_SIZES, SCROLL_APPEARANCES, type ScrollAppearance, type ScrollAreaOrientation, type ScrollAreaSize } from '../../../src/components/escala-ui/scroll-area'
import { Separator } from '../../../src/components/escala-ui/separator'

/** Story args = the Figma `ScrollArea` set (design-plans/scroll-area-contract.md), in the panel's order and with its defaults:
 *  Size · Orientation · Appearance (variant axes), then FadeVisible and Content. */
interface ScrollAreaStoryArgs {
  size: ScrollAreaSize
  orientation: ScrollAreaOrientation
  appearance: ScrollAppearance
  fadeVisible: boolean
}

const TAGS = ['v1.2.0-beta.50', 'v1.2.0-beta.49', 'v1.2.0-beta.48', 'v1.2.0-beta.47', 'v1.2.0-beta.46', 'v1.2.0-beta.45', 'v1.2.0-beta.44', 'v1.2.0-beta.43', 'v1.2.0-beta.42', 'v1.2.0-beta.41']
const PROJECTS = ['Q4 Campaign · Draft · 128 files · Updated 2 h ago · Owner Maya Chen', 'Brand refresh · Review · 64 files · Updated yesterday · Owner Julien Roux', 'Onboarding flow · Live · 32 files · Updated 3 d ago · Owner Marta Ruiz', 'Pricing page · Draft · 18 files · Updated 5 d ago · Owner Leo Martin', 'Design tokens v2 · Live · 240 files · Updated 1 w ago · Owner Ana Lucía']
const PHOTOS: [string, string][] = [['linear-gradient(135deg,#c6b7bf,#e8cec0)', 'Photo by Ana Lucía'], ['linear-gradient(135deg,#b9b6c9,#dec6c6)', 'Photo by Marta Ruiz'], ['linear-gradient(135deg,#b9b5c7,#dfc3bf)', 'Photo by Julien Roux'], ['linear-gradient(135deg,#aeb9b9,#d0d8cb)', 'Photo by Inès Haddad'], ['linear-gradient(135deg,#c6b7bf,#e8cec0)', 'Photo by Leo Martin']]
const text = (font: string): React.CSSProperties => ({ margin: 0, font: `var(--type-${font})`, color: 'var(--color-content-primary)' })

function Area({ size, orientation, appearance, fadeVisible, label }: ScrollAreaStoryArgs & { label?: string }) {
  const frame = orientation === 'horizontal' ? { width: 384, height: 248 } : orientation === 'both' ? { width: 288, height: 288 } : { width: 192, height: 288 }
  return (
    <ScrollArea aria-label={label ?? 'Scrollable content'} size={size} orientation={orientation} appearance={appearance} fadeVisible={fadeVisible} style={frame}>
      {orientation === 'horizontal' ? (
        <div style={{ display: 'flex', gap: 'var(--spacing-gap-control)' }}>
          {PHOTOS.map(([bg, caption]) => (
            <figure key={caption} style={{ margin: 0, width: 144, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-control)' }}>
              <div style={{ height: 176, background: bg, borderRadius: 'var(--radius-control)' }} />
              <figcaption style={{ font: 'var(--type-caption)', color: 'var(--color-content-secondary)' }}>{caption}</figcaption>
            </figure>
          ))}
        </div>
      ) : orientation === 'both' ? (
        <>
          <p style={{ ...text('label'), whiteSpace: 'nowrap' }}>Recent projects</p>
          {PROJECTS.map((r) => <p key={r} style={{ ...text('body-sm'), whiteSpace: 'nowrap' }}>{r}</p>)}
        </>
      ) : (
        <>
          <p style={text('label')}>Tags</p>
          {TAGS.map((tag) => <Fragment key={tag}><p style={text('body-sm')}>{tag}</p><Separator tone="subtle" /></Fragment>)}
        </>
      )}
    </ScrollArea>
  )
}

const meta: Meta<ScrollAreaStoryArgs> = {
  title: 'Content & Surfaces/ScrollArea',
  render: (a) => <Area {...a} />,
  args: { size: 'default', orientation: 'vertical', appearance: 'filled', fadeVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SCROLL_AREA_SIZES] },
    orientation: { name: 'Orientation', control: 'select', options: [...SCROLL_AREA_ORIENTATIONS] },
    appearance: { name: 'Appearance', control: 'select', options: [...SCROLL_APPEARANCES] },
    fadeVisible: { name: 'FadeVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ScrollAreaStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SCROLL_AREA_ORIENTATIONS.flatMap((orientation) => SCROLL_APPEARANCES.map((appearance) => <Area key={orientation + appearance} {...a} orientation={orientation} appearance={appearance} label={`${orientation} ${appearance}`} />))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SCROLL_AREA_SIZES.map((size) => <Area key={size} {...a} size={size} label={`Size ${size}`} />)}
    </div>
  ),
}
