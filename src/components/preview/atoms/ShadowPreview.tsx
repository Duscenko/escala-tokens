// Shadow foundation specimen — the elevation ramp, and the ramp doing its job
// on real surfaces.
//
// Shadow had been sitting on the generic Button/Badge/Switch/Form fallback,
// which shows elevation only incidentally (one `xs` on a button) — you could
// not compare two steps, which is the entire question this foundation asks.
//
// Two blocks:
//  · **Elevation** — every step on an identical surface, same colour as the
//    page behind it, so the SHADOW is the only thing separating them. That's
//    the honest test: add a border and you're judging the border.
//  · **In context** — the catalogue's own Card (`sm`), DropdownMenu (`lg`) and
//    Modal (`2xl`) renderers, which already resolve those steps through
//    `shadowOf`. Real components rather than hand-rolled markup, same rule the
//    Color collage follows, so this can't drift from what the plugin ships.
//
// Dark is handled upstream, not here: `resolvePreviewTokens` swaps in
// `darkShadowMap()` for a dark-kind theme, so `t.shadows` is already the dark
// twin by the time it reaches this file (see `darkShadow`'s note for why a
// single value cannot serve both appearances).

import { type ReactNode } from 'react'
import { radiusOf, shadowOf } from '../../../lib/previewTokens'
import { SPECIMENS } from '../../configurator/docs/specimens'
import type { PreviewTokens } from '../ButtonPreview'

const MONO = 'ui-monospace, monospace'
const STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const

const CardSpec = SPECIMENS.Card
const MenuSpec = SPECIMENS.DropdownMenu
const ModalSpec = SPECIMENS.Modal

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-fg-faint px-0.5">{title}</span>
      {children}
    </section>
  )
}

export function ShadowPreview({ tokens: t }: { tokens: PreviewTokens }) {
  const r = radiusOf(t, 'lg', '12px')

  return (
    <>
      <Group title="Elevation">
        {/* Generous vertical rhythm on purpose: at `2xl` the ramp throws a
            48px blur, and tiles packed tighter than that bleed into each
            other — you'd be judging the overlap, not the step. */}
        <div
          className="flex flex-col gap-5 px-4 py-5 min-w-0"
          style={{ background: t.surface, borderRadius: 14 }}
        >
          {STEPS.map((step) => (
            <div
              key={step}
              className="flex items-center px-3.5 min-w-0"
              style={{
                height: 44,
                // Same fill as the surface behind it — no border, so the only
                // thing lifting this tile off the page is the shadow itself.
                background: t.surface,
                borderRadius: r,
                boxShadow: shadowOf(t, step, 'none'),
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 11, color: t.neutralText }}>{step}</span>
              <span
                style={{ fontFamily: MONO, fontSize: 10, color: t.placeholderText || t.fgMuted }}
                className="ml-auto"
              >
                shadow-{step}
              </span>
            </div>
          ))}
        </div>
      </Group>

      {/* The catalogue renderers, each already bound to a different step —
          elevation only means something relative to the thing it lifts. */}
      <Group title="In context">
        <div className="flex flex-col gap-4 min-w-0">
          <CardSpec t={t} v={{}} />
          <MenuSpec t={t} v={{}} />
          <ModalSpec t={t} v={{}} />
        </div>
      </Group>
    </>
  )
}
