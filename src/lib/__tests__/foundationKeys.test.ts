import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FOUNDATION_KEYS } from '../foundationKeys'

// `Configurator.tsx` pulls in the whole shell, so read its source instead of
// importing it: the FOUNDATIONS array's keys must equal FOUNDATION_KEYS, or the
// public About page and the in-app About tab would state different counts.
describe('FOUNDATION_KEYS', () => {
  it('matches Configurator FOUNDATIONS', () => {
    const src = readFileSync(new URL('../../pages/Configurator.tsx', import.meta.url), 'utf8')
    const start = src.indexOf('const FOUNDATIONS: FoundationSection[] = [')
    const block = src.slice(start, src.indexOf('\n]\n', start))
    const keys = [...block.matchAll(/^ {4}key: '([^']+)'/gm)].map((m) => m[1])
    expect(keys).toEqual([...FOUNDATION_KEYS])
  })
})
