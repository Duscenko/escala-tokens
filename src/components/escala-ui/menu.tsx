// A menu panel drawn in place — no Radix, no portal, no positioning. The docs
// and previews use it to SHOW a menu open; products use DropdownMenu /
// ContextMenu, which paint the same recipe parts. Appearance: the recipes
// (DropdownMenu, ContextMenu), chosen with `recipe`.
import * as React from 'react'
import { cn } from '../../lib/utils'

export type MenuRecipe = 'DropdownMenu' | 'ContextMenu'
const Ctx = React.createContext<MenuRecipe>('DropdownMenu')

export function MenuPanel({ recipe = 'DropdownMenu', className, ...props }: React.ComponentProps<'div'> & { recipe?: MenuRecipe }) {
  return (
    <Ctx.Provider value={recipe}>
      <div role="menu" data-slot="menu-panel" data-escala={recipe} className={cn('overflow-hidden', className)} {...props} />
    </Ctx.Provider>
  )
}

export function MenuPanelItem({
  danger, highlighted, shortcut, className, children, ...props
}: React.ComponentProps<'div'> & { danger?: boolean; highlighted?: boolean; shortcut?: React.ReactNode }) {
  const recipe = React.useContext(Ctx)
  return (
    <div
      role="menuitem"
      data-part={`${recipe}.item`}
      data-variant={danger ? 'danger' : undefined}
      data-highlighted={highlighted ? '' : undefined}
      className={cn('flex cursor-pointer items-center justify-between', className)}
      {...props}
    >
      {children}
      {shortcut != null && <span data-part={`${recipe}.shortcut`}>{shortcut}</span>}
    </div>
  )
}

export function MenuPanelSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  const recipe = React.useContext(Ctx)
  return <div role="separator" data-part={`${recipe}.separator`} className={cn('my-1', className)} {...props} />
}
