// Escala component (shadcn's `navigation-menu` in a header): logo, links, avatar.
// Appearance: recipe (Navbar).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface NavbarLink { label: string; href?: string; current?: boolean }

export interface NavbarProps extends Omit<React.ComponentProps<'header'>, 'children'> {
  links: NavbarLink[]
  /** Brand mark; defaults to a filled square. */
  logo?: React.ReactNode
  /** Right-hand slot (an avatar). */
  trailing?: React.ReactNode
}

function Navbar({ links, logo, trailing, className, ...props }: NavbarProps) {
  return (
    <header data-slot="navbar" data-escala="Navbar" className={cn('flex items-center', className)} {...props}>
      <span data-part="Navbar.logo" aria-hidden className="shrink-0">{logo}</span>
      <nav aria-label="Main" data-part="Navbar.nav" className="flex flex-1">
        {links.map((l) => (
          <a
            key={l.label} href={l.href ?? '#'} data-part="Navbar.link"
            aria-current={l.current ? 'page' : undefined}
            className="cursor-pointer no-underline"
            onClick={(e) => { if (!l.href) e.preventDefault() }}
          >
            {l.label}
          </a>
        ))}
      </nav>
      {trailing != null && <span data-part="Navbar.avatar" className="inline-flex shrink-0 items-center justify-center">{trailing}</span>}
    </header>
  )
}

export { Navbar }
