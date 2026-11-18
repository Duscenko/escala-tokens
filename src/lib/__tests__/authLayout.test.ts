import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AUTH_BLOCKS, AuthSignIn, AuthSignInPasskey, AuthSignUp, AuthSplit, authPlacement, type AuthPlacement } from '../../components/escala-ui/blocks/auth'

// `layout="inline"` exists only on a plain container: this line must not compile.
// @ts-expect-error a card is always stacked
const cardInline: AuthPlacement = { container: 'card', layout: 'inline' }
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('Auth blocks · Layout', () => {
  it('a card is always stacked', () => {
    expect(cardInline.container).toBe('card')
    expect(authPlacement('card', 'inline')).toEqual({ container: 'card', layout: 'stacked' })
    expect(authPlacement('plain', 'inline')).toEqual({ container: 'plain', layout: 'inline' })
  })

  it('every block takes the layout and draws its header large and horizontal', () => {
    for (const [name, Block] of Object.entries(AUTH_BLOCKS)) {
      const out = html(createElement(Block, { container: 'plain', layout: 'inline' }))
      expect(out, name).toContain('data-layout="inline"')
      expect(out, name).toContain('data-escala="ModalHeader" data-size="lg" data-align="horizontal"')
    }
  })

  it('stacked stays the default', () => {
    for (const [name, Block] of Object.entries(AUTH_BLOCKS)) expect(html(createElement(Block)), name).toContain('data-layout="stacked"')
  })

  it('inline cascades lg to the controls and default to the choices', () => {
    const out = html(createElement(AuthSignIn, { container: 'plain', layout: 'inline' }))
    expect(out).toContain('data-escala="Input" data-size="lg"')
    expect(out).not.toMatch(/data-escala="Checkbox[^"]*"[^>]*data-size="sm"/)
  })

  it('header icons: SignUp is gradient, every icon is rounded', () => {
    expect(html(createElement(AuthSignUp))).toContain('data-appearance="gradient" data-shape="rounded"')
    for (const [name, Block] of Object.entries(AUTH_BLOCKS)) expect(html(createElement(Block)), name).not.toContain('data-shape="circle"')
  })
})

describe('AuthSignInPasskey and AuthSplit', () => {
  it('the passkey block hides its header icon and aligns left', () => {
    const out = html(createElement(AuthSignInPasskey))
    expect(out).toContain('data-align="vertical-left"')
    expect(out).not.toContain('data-escala="FeaturedIcon"')
  })
  it('a block in the split aligns left with no icon', () => {
    const out = html(createElement(AuthSplit, null, createElement(AuthSignIn, { container: 'plain' })))
    expect(out).toContain('data-size="default" data-align="vertical-left"')
    expect((out.match(/data-escala="FeaturedIcon"/g) ?? []).length).toBe(1)
  })
})
