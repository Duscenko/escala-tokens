/**
 * Components move from the system's motion tokens (design-plans/motion-foundation.md,
 * phase 2): every recipe names motion ROLES and CHOREOGRAPHIES, the generated
 * sheet reads them as custom properties, and nothing in `escala-ui` hardcodes
 * a duration any more.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPONENT_RECIPES } from '../componentRecipes'
import { RECIPE_MOTION } from '../recipes/motion'
import { RECIPE_CSS, playedKeyframes, recipeCssVars, recipeMotionCss, slotName } from '../recipeStyles'
import {
  MOTION_KEYFRAMES, MOTION_PRESETS, MOTION_ROLES, defaultMotionSettings, motionChoreographies, motionCssVars,
  motionRootCss, motionSettingsFromTokens, motionTokens, type MotionPresetKey,
} from '../motion'

const ROLES = new Set<string>(MOTION_ROLES)
const CHOREOGRAPHIES = motionChoreographies(defaultMotionSettings())

describe('recipe motion', () => {
  it('every recipe it names exists, and every slot it times is one of that recipe\'s slots', () => {
    for (const [key, m] of Object.entries(RECIPE_MOTION)) {
      const recipe = COMPONENT_RECIPES[key]
      expect(recipe, key).toBeDefined()
      for (const slotKey of Object.keys(m.transitions ?? {})) {
        expect(recipe.slots, `${key}.${slotKey}`).toContain(slotName(slotKey))
      }
      for (const c of [m.enter, m.exit]) if (c?.slot) expect(recipe.slots, `${key} ${c.name}`).toContain(c.slot)
    }
  })

  it('every transition reads a motion ROLE, never a raw duration', () => {
    for (const [key, m] of Object.entries(RECIPE_MOTION)) {
      for (const props of Object.values(m.transitions ?? {})) {
        for (const role of Object.values(props)) expect(ROLES.has(role), `${key}: ${role}`).toBe(true)
      }
    }
  })

  it('every choreography a recipe plays exists and lists that component', () => {
    for (const [key, m] of Object.entries(RECIPE_MOTION)) {
      for (const c of [m.enter, m.exit]) {
        if (!c) continue
        expect(CHOREOGRAPHIES[c.name], `${key}: ${c.name}`).toBeDefined()
        expect(CHOREOGRAPHIES[c.name].components, `${key}: ${c.name}`).toContain(key)
      }
    }
  })

  it('every track slot of a played choreography is a slot of the recipe playing it', () => {
    for (const [key, m] of Object.entries(RECIPE_MOTION)) {
      for (const c of [m.enter, m.exit]) {
        if (!c) continue
        for (const t of CHOREOGRAPHIES[c.name].tracks ?? []) {
          if (t.slot) expect(COMPONENT_RECIPES[key].slots, `${key} ${c.name}`).toContain(t.slot)
        }
      }
    }
  })

  it('every keyframe the sheet plays is defined', () => {
    for (const name of playedKeyframes()) expect(MOTION_KEYFRAMES[name], name).toBeDefined()
    expect(RECIPE_CSS).toContain('@keyframes motion-pop')
  })

  it('every --motion-* the sheet reads is answered by a preview scope, in every preset, full and reduced', () => {
    const read = recipeCssVars().filter((v) => v.startsWith('--motion-'))
    expect(read.length).toBeGreaterThan(10)
    for (const key of Object.keys(MOTION_PRESETS) as MotionPresetKey[]) {
      for (const reduced of [false, true]) {
        const vars = motionCssVars(MOTION_PRESETS[key].settings, { reduced })
        expect(read.filter((v) => !(v in vars)), `${key}${reduced ? ' reduced' : ''}`).toEqual([])
      }
    }
  })

  it('variables.css answers the same properties (a product gets what the preview gets)', () => {
    const root = motionRootCss(defaultMotionSettings()).join('\n')
    const missing = recipeCssVars().filter((v) => v.startsWith('--motion-') && !root.includes(`${v}:`))
    expect(missing).toEqual([])
  })

  it('a transition keeps a fallback, so a component outside any motion scope still eases', () => {
    for (const recipe of Object.values(COMPONENT_RECIPES)) {
      for (const m of recipeMotionCss(recipe).matchAll(/var\(--motion-use-[a-z-]+(,?)/g)) expect(m[1], recipe.key).toBe(',')
    }
  })

  it('a preview drawn in place (`data-inline`) never plays a choreography', () => {
    let checked = 0
    for (const m of RECIPE_CSS.matchAll(/([^{}]+)\{\s*animation(?:-name)?:/g)) {
      for (const sel of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
        expect(sel, sel).toContain(':not([data-inline])')
        checked++
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('tokens.json round-trips to the same settings (the registry reads them back)', () => {
    for (const key of Object.keys(MOTION_PRESETS) as MotionPresetKey[]) {
      const settings = MOTION_PRESETS[key].settings
      const back = motionSettingsFromTokens(JSON.parse(JSON.stringify(motionTokens(settings))))
      expect(back, key).toEqual(settings)
    }
  })
})

describe('escala-ui hardcodes no motion', () => {
  const dir = join(__dirname, '../../components/escala-ui')
  // A loop keyed to its own library keyframes (spinner, skeleton, the OTP
  // caret) and framer-motion's sliding pill keep their own timing.
  const LOOPS = /animate-(spin|pulse)/
  it('no Tailwind duration / ease / transition-* utility in any component file', () => {
    const offenders: string[] = []
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
      const src = readFileSync(join(dir, file), 'utf8')
      for (const m of src.matchAll(/\b(duration-\d+|ease-(in|out|in-out|linear)|transition-(all|colors|transform|opacity|shadow|\[[^\]]*\]))\b/g)) {
        if (!LOOPS.test(m[0])) offenders.push(`${file}: ${m[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
