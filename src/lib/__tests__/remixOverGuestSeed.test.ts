import { beforeEach, describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { GUEST_START_STYLE, adoptPreset, adoptRemixOverGuestSeed, untouchedGuestSeed } from '../adoptPreset'
import { myThemeKeys } from '../themeLibrary'
import { themeModeKey } from '../themeModes'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { REMIX_ID_PREFIX } from '../remixLink'
import { slugify } from '../utils'

const core = THEME_STYLE_PRESETS.find((p) => p.id === GUEST_START_STYLE)!
const retro = THEME_STYLE_PRESETS.find((p) => p.id === 'retro-vintage')!
const remix = { ...retro, id: `${REMIX_ID_PREFIX}abc12345`, label: 'Random', shortLabel: 'Random' }
const initial = useDesignStore.getState()

/** The guest's automatic brand, made the way `ensureGuestBrand` makes it. */
function seedGuestBrand(): string {
  const res = adoptPreset(core, 'light', { track: false })
  if (!('key' in res)) throw new Error(res.error)
  const name = useDesignStore.getState().projectName.trim()
  if (name) useDesignStore.getState().setThemeLabel(res.key, name)
  return res.key
}

const mine = () => {
  const s = useDesignStore.getState()
  return myThemeKeys(s.themeOrder, s.themes)
}

beforeEach(() => {
  useDesignStore.setState(initial, true)
  for (const key of mine()) useDesignStore.getState().removeTheme(key)
})

describe('a phone remix over the guest\'s automatic brand', () => {
  it('recognises the untouched automatic brand', () => {
    const seed = seedGuestBrand()
    expect(untouchedGuestSeed()).toBe(seed)
  })

  it('replaces it, keeping the name it carried', () => {
    const seed = seedGuestBrand()
    const name = useDesignStore.getState().themeLabels[seed]
    const out = adoptRemixOverGuestSeed(remix, 'light')
    expect(out && 'key' in out).toBe(true)
    if (!out || !('key' in out)) return
    const s = useDesignStore.getState()
    expect(mine()).toEqual([out.key])
    expect(s.themes[seed]).toBeUndefined()
    expect(s.themeLabels[out.key]).toBe(name)
    // Keyed by the brand's name, not by the remix's "Random".
    expect(out.key).toBe(slugify(name))
    expect(s.themeOrigin?.[out.key]).toBe(remix.id)
    expect(s.themeFoundations[out.key]?.typography?.fontFamily).toBe(retro.foundations.typography?.fontFamily)
  })

  it('leaves alone a brand that was changed', () => {
    const seed = seedGuestBrand()
    useDesignStore.getState().setThemeFoundations(seed, { ...core.foundations, radiusRoles: { ...core.foundations.radiusRoles, action: '24px' } })
    expect(untouchedGuestSeed()).toBeNull()
    expect(adoptRemixOverGuestSeed(remix, 'light')).toBeNull()
    expect(mine()).toEqual([seed])
  })

  it('leaves alone a brand that was renamed', () => {
    const seed = seedGuestBrand()
    useDesignStore.getState().setThemeLabel(seed, 'My bank')
    expect(untouchedGuestSeed()).toBeNull()
  })

  it('leaves alone a brand with a hand-picked role', () => {
    const seed = seedGuestBrand()
    const s = useDesignStore.getState()
    useDesignStore.setState({
      architectureOverrides: {
        ...s.architectureOverrides,
        categorical: {
          ...(s.architectureOverrides.categorical ?? {}),
          'surface.page': { ...(s.architectureOverrides.categorical?.['surface.page'] ?? {}), [themeModeKey(seed, 'light')]: '{accent.2}' },
        },
      },
    })
    expect(untouchedGuestSeed()).toBeNull()
  })

  it('applies only to a remix, and only when the automatic brand is the only one', () => {
    seedGuestBrand()
    expect(adoptRemixOverGuestSeed(retro, 'light')).toBeNull()
    adoptPreset(retro, 'light', { track: false })
    expect(untouchedGuestSeed()).toBeNull()
  })
})
