// Escala component: Brand — the Figma set of the same name (design-plans/nav-header-contract.md; 1098:42), 1:1.
// The product logo, its name and an optional version Badge. `sm` in app headers, `default` in marketing headers and footers.
// Wrap it in a link with an accessible name (« Escala home »); the Logo slot takes an Avatar or an SVG mark.
// Appearance: recipe Brand (lib/componentRecipes.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Avatar } from './avatar'
import { Badge } from './badge'

export const BRAND_SIZES = ['default', 'sm'] as const
export type BrandSize = (typeof BRAND_SIZES)[number]

// Phosphor regular `stack`: the file's default logo glyph.
const STACK = 'M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z'

export interface BrandProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Figma Size: logo 32 · 24 and name `heading-sm` · `heading-xs`. */
  size?: BrandSize
  /** Figma Name. */
  name?: string
  /** Figma VersionVisible (default true). */
  versionVisible?: boolean
  /** The version text the Badge shows. */
  version?: string
  /** Figma Logo slot: an Avatar or an SVG mark. Defaults to the file's solid stack mark. */
  logo?: React.ReactNode
}

function Brand({ size = 'default', name = 'Escala', versionVisible = true, version = 'v1.1', logo, className, ...props }: BrandProps) {
  return (
    <span data-slot="brand" data-escala="Brand" data-size={size} className={cn('inline-flex items-center', className)} {...props}>
      <span data-part="Brand.logo" className="inline-flex shrink-0 items-center">
        {logo ?? (
          <Avatar type="icon" size={size === 'sm' ? 'xs' : 'sm'} shape="rounded" variant="default" appearance="solid" icon={<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={STACK} /></svg>} />
        )}
      </span>
      <span data-part="Brand.name">{name}</span>
      {versionVisible && (
        <span data-part="Brand.version" className="inline-flex shrink-0 items-center">
          <Badge appearance="soft" shape="rounded" size="xs" type="default" variant="secondary">{version}</Badge>
        </span>
      )}
    </span>
  )
}

export { Brand }
