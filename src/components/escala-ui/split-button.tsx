// Escala component: SplitButton — the Figma `SplitButton` set (design-plans/split-button-contract.md; 2391:2107), 1:1.
// A main action joined to a menu of related alternatives. It paints nothing of its own: it is a ButtonGroup of two
// segments (the action with its label and leading icon, and an icon-only caret) over a DropdownMenu, exactly as the
// file nests them. Radix DropdownMenu gives the behaviour (the caret is the trigger: aria-haspopup="menu" and
// aria-expanded, arrows move through the rows and loop, Escape closes and returns focus to the caret). Figma's
// variant axes are `variant` · `size` · `open`; the label, the icon and the rows are the nested items' content.
// The menu hangs below the group, aligned to its end edge, `Spacing/gap-control` away (recipe SplitButton,
// lib/recipes/splitButton.ts); at `xs` it is the DropdownMenu's `sm` (the menu has no xs). The pair never collapses.
//
// Motion: the menu grows out of the caret on `popover-enter` (the DropdownMenu's own choreography); its rows arrive one
// after another on `use-stagger-in`, each `--motion-stagger` behind the last (0 under reduced motion); the main segment
// does not scale.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { ButtonGroup, ButtonGroupItem } from './button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, type DropdownMenuSize } from './dropdown-menu'
import { usePortalContainer } from './portal-scope'

export const SPLIT_BUTTON_VARIANTS = ['default', 'secondary'] as const
export const SPLIT_BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export type SplitButtonVariant = (typeof SPLIT_BUTTON_VARIANTS)[number]
export type SplitButtonSize = (typeof SPLIT_BUTTON_SIZES)[number]

/** The DropdownMenu's Size under each SplitButton Size, as the file nests it (xs opens the `sm` menu). */
const MENU_SIZE: Record<SplitButtonSize, DropdownMenuSize> = { xs: 'sm', sm: 'sm', default: 'default', lg: 'lg' }

export interface SplitButtonProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> {
  /** Figma Variant: `default` (brand) · `secondary` (neutral), inherited from ButtonGroup. */
  variant?: SplitButtonVariant
  /** Figma Size: Size/control-xs · sm · md · lg (24 · 32 · 40 · 48). */
  size?: SplitButtonSize
  /** Figma Open: the menu is open and the caret is Active (controlled). */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** The main segment's label (the nested item's Label; the file's «Publish»). */
  children?: React.ReactNode
  /** The main segment's leading icon (the nested item's IconLeadingIcon; the file's PaperPlaneTilt). */
  leading?: React.ReactNode
  /** The caret while closed (the file's CaretDown) and while open (CaretUp). */
  caret?: React.ReactNode
  caretOpen?: React.ReactNode
  /** The caret's accessible name. Default: `<label> more actions`. */
  moreLabel?: string
  /** The menu's rows: DropdownMenuItem (and its Separator / Label). Default: the file's three. */
  menu?: React.ReactNode
  /** Runs the main action. */
  onAction?: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Draw the open menu in place (no portal, no focus steal, no Radix state, no entrance): docs, boards and previews. */
  inline?: boolean
}

/** A token's computed length, in px, where the element lives (Radix takes its offset as a number). */
function useTokenPx(container: HTMLElement | null | undefined, name: string): number {
  const [px, setPx] = React.useState(0)
  React.useEffect(() => {
    const el = container ?? (typeof document === 'undefined' ? null : document.body)
    if (!el) return
    const probe = document.createElement('span')
    probe.style.cssText = `position:absolute;visibility:hidden;width:var(${name})`
    el.appendChild(probe)
    setPx(probe.getBoundingClientRect().width)
    probe.remove()
  }, [container, name])
  return px
}

/** The file's three rows: two plain, one critical. */
const SAMPLE_MENU: React.ReactNode[] = [
  <DropdownMenuItem key="publish" iconLeading={glyph('paper-plane-tilt')}>Publish and notify</DropdownMenuItem>,
  <DropdownMenuItem key="draft" iconLeading={glyph('file-text')}>Save as draft</DropdownMenuItem>,
  <DropdownMenuItem key="delete" variant="critical" iconLeading={glyph('trash')}>Delete draft</DropdownMenuItem>,
]

/** Each row arrives behind the one before it: a fade on `use-stagger-in`, delayed by its place times `--motion-stagger`. */
function stagger(rows: React.ReactNode): React.ReactNode {
  let i = 0
  return React.Children.map(rows, (row) => {
    if (!React.isValidElement<{ style?: React.CSSProperties }>(row)) return row
    const place = i++
    return React.cloneElement(row, {
      style: {
        animation: 'motion-fade-in var(--motion-use-stagger-in) both',
        animationDelay: `calc(${place} * var(--motion-stagger, 0ms))`,
        ...row.props.style,
      },
    })
  })
}

function SplitButton({
  variant = 'default', size = 'default', open: openProp, defaultOpen = false, onOpenChange, children, leading, caret, caretOpen,
  moreLabel, menu, onAction, disabled, inline = false, className, style, ...props
}: SplitButtonProps) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const setOpen = React.useCallback((next: boolean) => {
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }, [openProp, onOpenChange])
  const container = usePortalContainer()
  // The file's 8px between the group and the menu: `Spacing/gap-control`, read where the menu lives.
  const offset = useTokenPx(container, '--spacing-gap-control')
  const name = moreLabel ?? (typeof children === 'string' ? `${children} more actions` : 'More actions')
  return (
    <div
      data-slot="split-button"
      data-escala="SplitButton"
      data-variant={variant}
      data-size={size}
      data-open={String(open)}
      className={cn('inline-flex w-fit shrink-0 items-start self-start', inline && 'relative', className)}
      style={style}
      {...props}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <ButtonGroup variant={variant} size={size} shape="rounded" orientation="horizontal">
          <ButtonGroupItem data-part="SplitButton.action" leading={leading ?? glyph('paper-plane-tilt')} aria-pressed={undefined} disabled={disabled} onClick={onAction}>
            {children ?? 'Publish'}
          </ButtonGroupItem>
          <DropdownMenuTrigger asChild>
            <ButtonGroupItem
              data-part="SplitButton.caret"
              iconOnly
              active={open}
              aria-pressed={undefined}
              aria-label={name}
              disabled={disabled}
              leading={open ? (caretOpen ?? glyph('caret-up')) : (caret ?? glyph('chevron-down'))}
            />
          </DropdownMenuTrigger>
        </ButtonGroup>
        {inline ? (
          open && (
            <DropdownMenuContent inline size={MENU_SIZE[size]} aria-label={name} className="absolute top-full right-0 z-50 max-w-none" style={{ marginTop: offset }}>
              {menu ?? SAMPLE_MENU}
            </DropdownMenuContent>
          )
        ) : (
          <DropdownMenuContent size={MENU_SIZE[size]} align="end" sideOffset={offset} loop aria-label={name}>
            {stagger(menu ?? SAMPLE_MENU)}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  )
}

export { SplitButton }
