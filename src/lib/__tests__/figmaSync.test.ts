import { describe, expect, it } from 'vitest'
import { syncPath, syncProjectId } from '../figmaSync'

describe('figma sync id', () => {
  it('keys /api/tokens on the file name, not a second project id', () => {
    expect(syncProjectId('theme')).toBe('theme')
    expect(syncProjectId('Nature / Organic')).toBe('nature--organic')
    expect(syncPath('theme')).toBe('/api/tokens?project=theme')
  })

  it('falls back to the editor project when the file name is empty', () => {
    expect(syncProjectId('')).toBe(syncProjectId())
    expect(syncProjectId('   ')).toBe(syncProjectId())
  })
})
