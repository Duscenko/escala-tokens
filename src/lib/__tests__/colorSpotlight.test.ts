import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../previewTokens'
import type { PreviewTokens } from '../../components/preview/ButtonPreview'
import { traceRecipe } from '../tokenTrace'
import { holesMask, litSlots, outermostRects } from '../colorSpotlight'

const t = resolvePreviewTokens(useDesignStore.getState() as never, 'light') as PreviewTokens

describe('litSlots', () => {
  it('lights the default Button root with the accent fill', () => {
    const trace = traceRecipe(t, 'Button', { Variant: 'default', Size: 'default' })!
    const lit = litSlots(trace, new Set(['action.primary.default', 'action.primary.hover']))
    // Only the slot that reads the colour, with only the colour's roles —
    // the label ink (`content.on-action`) is Neutral's, not Accent's.
    expect(lit).toEqual([{ slot: 'root', roles: [{ id: 'action.primary.default' }] }])
  })

  it('names a state role with its state', () => {
    const trace = {
      component: 'Button', axes: {},
      slots: [{ slot: 'root', rows: [
        { key: 'a', slot: 'root', prop: 'fill', label: 'Background', kind: 'color', ref: 'color.action.primary.default', cssVar: '', value: '' },
        { key: 'b', slot: 'root', state: 'hover', prop: 'fill', label: 'Background', kind: 'color', ref: 'color.action.primary.hover', cssVar: '', value: '' },
      ] }],
    } as Parameters<typeof litSlots>[0]
    expect(litSlots(trace, new Set(['action.primary.default', 'action.primary.hover']))[0].roles)
      .toEqual([{ id: 'action.primary.default' }, { id: 'action.primary.hover', state: 'hover' }])
  })

  it('lights nothing a component does not read', () => {
    const trace = traceRecipe(t, 'Button', { Variant: 'default', Size: 'default' })!
    expect(litSlots(trace, new Set(['status.critical.surface']))).toEqual([])
  })
})

describe('outermostRects', () => {
  it('drops a rect inside another, keeps siblings and one of two equal rects', () => {
    const outer = { x: 0, y: 0, w: 100, h: 40, r: 8 }
    const inner = { x: 10, y: 10, w: 30, h: 10, r: 0 }
    const side = { x: 120, y: 0, w: 20, h: 20, r: 4 }
    const twin = { ...outer }
    expect(outermostRects([outer, inner, side])).toEqual([outer, side])
    expect(outermostRects([outer, twin])).toHaveLength(1)
  })
})

describe('holesMask', () => {
  it('is a white box with one black rounded hole per rect, sized to the board', () => {
    const svg = decodeURIComponent(holesMask(200, 100, [{ x: 10, y: 10, w: 50, h: 20, r: 4 }, { x: 80, y: 10, w: 20, h: 20, r: 0 }]))
    expect(svg).toContain("width='200' height='100'")
    expect(svg.match(/fill='black'/g)).toHaveLength(2)
    expect(svg).toContain("rx='4'")
    // A radius larger than the rect is capped to half its side.
    expect(decodeURIComponent(holesMask(10, 10, [{ x: 0, y: 0, w: 4, h: 4, r: 99 }]))).toContain("rx='2'")
  })
})
