// Escala component: the store badge. The artwork is the STORE's (black with
// white type, as Apple and Google require), so ink and fill are literal
// (brand-artwork.tsx); geometry comes from the AppStoreBadge recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { STORE_BADGE_EDGE, STORE_BADGE_FILL, STORE_BADGE_INK, StoreGlyph } from './brand-artwork'

export type Store = 'app-store' | 'google-play'

export interface AppStoreBadgeProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  store: Store
}

function AppStoreBadge({ store, className, style, ...props }: AppStoreBadgeProps) {
  const play = store === 'google-play'
  return (
    <a
      data-slot="app-store-badge"
      data-escala="AppStoreBadge"
      data-store={store}
      aria-label={play ? 'Get it on Google Play' : 'Download on the App Store'}
      className={cn('inline-flex items-center no-underline', className)}
      style={{ background: STORE_BADGE_FILL, color: STORE_BADGE_INK, border: `1px solid ${STORE_BADGE_EDGE}`, ...style }}
      {...props}
    >
      <StoreGlyph play={play} />
      <span className="flex flex-col" style={{ lineHeight: 1.15 }}>
        <span data-part="AppStoreBadge.eyebrow" style={{ opacity: 0.8 }}>{play ? 'GET IT ON' : 'Download on the'}</span>
        <span data-part="AppStoreBadge.name">{play ? 'Google Play' : 'App Store'}</span>
      </span>
    </a>
  )
}

export { AppStoreBadge }
