import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import { OVERVIEWS } from '../../components/configurator/docs/componentOverviews'

describe('component Overview', () => {
  it('every component with variants has an Overview', () => {
    const missing = COMPONENTS.filter((c) => c.axes.length > 0 && !OVERVIEWS[c.key]).map((c) => c.key)
    expect(missing).toEqual([])
  })

  it('names only catalogue components, axes and values', () => {
    const problems: string[] = []
    for (const [key, rows] of Object.entries(OVERVIEWS)) {
      const def = COMPONENTS.find((c) => c.key === key)
      if (!def) { problems.push(`${key}: not in the catalogue`); continue }
      rows.flat().forEach((item) => {
        for (const [axis, value] of Object.entries(item.v)) {
          const a = def.axes.find((x) => x.name === axis)
          if (!a) problems.push(`${key}: no axis ${axis}`)
          else if (!a.values.includes(value)) problems.push(`${key}: ${axis} has no value ${value}`)
        }
      })
    }
    expect(problems).toEqual([])
  })
})
