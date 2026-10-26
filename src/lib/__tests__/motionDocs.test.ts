// Docs · Motion (phase 5 of design-plans/motion-foundation.md): the page is a
// foundation like the others, counts what the export counts, and its Copy
// context cuts the Motion section of the agent context.
import { describe, expect, it } from 'vitest'
import { FOUNDATION_DOCS } from '../../components/configurator/docs/foundationDocs'
import { motionTokenTotal } from '../../components/configurator/docs/MotionDoc'
import { FOUNDATION_KEYS } from '../foundationKeys'
import { buildSystemContext } from '../contextRequest'
import { generateTokenJSON } from '../tokenGenerator'
import { collectionMeta } from '../exportWizard'
import { motionPresetPatch } from '../motion'
import type { TokenJSON } from '../agentBundle/types'

describe('Docs · Motion', () => {
  it('is a foundation page, keyed like the Generator foundation', () => {
    const doc = FOUNDATION_DOCS.find((d) => d.key === 'motion')
    expect(doc).toBeTruthy()
    expect(FOUNDATION_KEYS).toContain('motion')
    expect(doc!.sections.map((s) => s.id)).toEqual(['preset', 'durations', 'easings', 'roles', 'transforms', 'choreographies'])
  })

  it('counts the same tokens as Export’s Motion collection', () => {
    const motion = collectionMeta().find((c) => c.key === 'motion')
    expect(motionTokenTotal(motionPresetPatch('standard'))).toBe(motion?.count)
  })

  it('Copy context on the page cuts the Motion section', () => {
    const json = generateTokenJSON() as unknown as TokenJSON
    const md = buildSystemContext(json, { scope: 'motion', detail: 'tokens' })
    expect(md).toContain('## Motion')
    expect(md).toContain('var(--motion-use-hover)')
    expect(md).not.toContain('## Typography')
  })
})
