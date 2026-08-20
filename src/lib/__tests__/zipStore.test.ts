import { describe, expect, it } from 'vitest'
import { unzipStore, zipStore } from '../zipStore'

describe('zipStore', () => {
  it('writes a readable uncompressed archive', () => {
    const zip = zipStore([
      { path: 'demo/SKILL.md', data: new TextEncoder().encode('# hello') },
      { path: 'demo/tokens.md', data: new TextEncoder().encode('| a | b |') },
    ])
    expect(zip[0]).toBe(0x50)
    expect(zip[1]).toBe(0x4b)
    const files = unzipStore(zip)
    expect(files.map((f) => f.path)).toEqual(['demo/SKILL.md', 'demo/tokens.md'])
    expect(new TextDecoder().decode(files[0]!.data)).toBe('# hello')
  })
})
