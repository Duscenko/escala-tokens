import type * as React from 'react'
import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import { iconOf } from '../../../../lib/previewTokens'
import { TabMenu as SkTabMenu, TabMenuItem as SkTabMenuItem, TabMenuLineItem as SkTabMenuLineItem, type TabMenuIndicator, type TabMenuItemState, type TabMenuSize, type TabMenuVariant } from '../../../escala-ui/tab-menu'
import { Badge as SkBadge } from '../../../escala-ui/badge'
import { NavItem as SkNavItem, type NavItemSize, type NavItemState } from '../../../escala-ui/nav-item'
import { Brand as SkBrand, type BrandSize } from '../../../escala-ui/brand'
import { AccountMenuTrigger as SkAccountMenuTrigger, type AccountMenuTriggerSize, type AccountMenuTriggerState } from '../../../escala-ui/account-menu-trigger'
import { SegmentedControl as SkSegmentedControl, SegmentedControlItem as SkSegmentedControlItem, type SegmentedControlItemState, type SegmentedControlSize } from '../../../escala-ui/segmented-control'
import { Breadcrumb as SkBreadcrumb, BreadcrumbEllipsis as SkBreadcrumbEllipsis, BreadcrumbItem as SkBreadcrumbItem, BreadcrumbList as SkBreadcrumbList, BreadcrumbSeparator as SkBreadcrumbSeparator, BREADCRUMB_GLYPHS, type BreadcrumbAppearance, type BreadcrumbEllipsisState, type BreadcrumbItemState, type BreadcrumbSeparatorKind, type BreadcrumbSize, type BreadcrumbVariant } from '../../../escala-ui/breadcrumb'
import { Pagination as SkPagination, PaginationScope as SkPaginationScope, PaginationEllipsis as SkPaginationEllipsis, PaginationLink as SkPaginationLink, type PaginationLinkState, type PaginationSize, type PaginationVariant } from '../../../escala-ui/pagination'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { Stepper as SkStepper, StepperIcon as SkStepperIcon, StepperIndicator as SkStepperIndicator, StepperItem as SkStepperItem, type StepperOrientation, type StepperSize, type StepperStatus } from '../../../escala-ui/stepper'
import { DropdownMenu as SkDropdownMenu, DropdownMenuContent as SkDropdownMenuContent, DropdownMenuItem as SkDropdownMenuItem, DropdownMenuLabel as SkDropdownMenuLabel, DropdownMenuFooter as SkDropdownMenuFooter, DropdownMenuSeparator as SkDropdownMenuSeparator, type DropdownMenuSize, type DropdownMenuItemState, type DropdownMenuItemVariant, type DropdownMenuFooterLayout } from '../../../escala-ui/dropdown-menu'
import { Command as SkCommand, CommandGroup as SkCommandGroup, CommandInput as SkCommandInput, CommandItem as SkCommandItem, CommandList as SkCommandList } from '../../../escala-ui/_skeleton/command'
import { Navbar as SkNavbar } from '../../../escala-ui/_skeleton/navbar'
import {
  Sidebar as SkSidebar, SidebarBrand as SkSidebarBrand, SidebarContent as SkSidebarContent, SidebarFooter as SkSidebarFooter,
  SidebarGroup as SkSidebarGroup, SidebarGroupLabel as SkSidebarGroupLabel, SidebarHeader as SkSidebarHeader,
  SidebarMenu as SkSidebarMenu, SidebarMenuButton as SkSidebarMenuButton, SidebarMenuItem as SkSidebarMenuItem, SidebarTrigger as SkSidebarTrigger,
  type SidebarMenuButtonState, type SidebarSize,
} from '../../../escala-ui/sidebar'
import { Avatar as SkAvatar } from '../../../escala-ui/avatar'
import { Button as SkButton } from '../../../escala-ui/button'
import { RecipeScope } from './scope'
import { NavigationMenu as SkNavigationMenu, NavigationMenuContent as SkNavigationMenuContent, NavigationMenuItem as SkNavigationMenuItem, NavigationMenuLink as SkNavigationMenuLink, NavigationMenuList as SkNavigationMenuList, NavigationMenuTrigger as SkNavigationMenuTrigger } from '../../../escala-ui/_skeleton/navigation-menu'

/** The Figma TabMenu (984:1830) in place: Overview selected, Activity, Members with its count and Settings. */
export function SkeletonTabMenuSpecimen({ t, v, w }: SpecimenProps) {
  const variant = (v.Variant ?? 'horizontal-line') as TabMenuVariant
  const Item = variant.endsWith('line') ? SkTabMenuLineItem : SkTabMenuItem
  const fill = w === '100%'
  return (
    <RecipeScope t={t}>
      <SkTabMenu variant={variant} size={(v.Size ?? 'default') as TabMenuSize} defaultValue="Overview" fill={fill} style={variant.startsWith('vertical') ? { width: 224 } : undefined}>
        <Item>Overview</Item>
        <Item>Activity</Item>
        {!fill && <Item trailing={<SkBadge appearance="soft" shape="pill" size="xs" type="number" variant="secondary" count={8} />}>Members</Item>}
        <Item>Settings</Item>
      </SkTabMenu>
    </RecipeScope>
  )
}

/** A lone item: it sits in a TabMenu so it keeps its context. */
export function SkeletonTabMenuItemSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTabMenu variant="horizontal-button" size={(v.Size ?? 'default') as TabMenuSize}>
        <SkTabMenuItem forceState={(v.State ?? 'Default') as TabMenuItemState} disabled={v.State === 'Disabled'}>Overview</SkTabMenuItem>
      </SkTabMenu>
    </RecipeScope>
  )
}

export function SkeletonTabMenuLineItemSpecimen({ t, v }: SpecimenProps) {
  const indicator = (v.Indicator ?? 'bottom') as TabMenuIndicator
  return (
    <RecipeScope t={t}>
      <SkTabMenu variant={indicator === 'left' ? 'vertical-line' : 'horizontal-line'} size={(v.Size ?? 'default') as TabMenuSize} style={indicator === 'left' ? { width: 120 } : undefined}>
        <SkTabMenuLineItem indicator={indicator} forceState={(v.State ?? 'Default') as TabMenuItemState} disabled={v.State === 'Disabled'}>Overview</SkTabMenuLineItem>
      </SkTabMenu>
    </RecipeScope>
  )
}

export function SkeletonNavItemSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkNavItem href="#" onClick={(e) => e.preventDefault()} size={(v.Size ?? 'default') as NavItemSize} forceState={(v.State ?? 'Default') as NavItemState} disabled={v.State === 'Disabled'}>Overview</SkNavItem>
    </RecipeScope>
  )
}

export function SkeletonBrandSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkBrand size={(v.Size ?? 'default') as BrandSize} /></RecipeScope>
}

export function SkeletonAccountMenuTriggerSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkAccountMenuTrigger size={(v.Size ?? 'default') as AccountMenuTriggerSize} forceState={(v.State ?? 'Default') as AccountMenuTriggerState} />
    </RecipeScope>
  )
}

export function SkeletonSegmentedControlSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkSegmentedControl options={['List', 'Board', 'Timeline']} size={(v.Size ?? 'default') as SegmentedControlSize} />
    </RecipeScope>
  )
}

/** One Figma segment on its own (the overview and the docs playground). */
export function SkeletonSegmentedControlItemSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkSegmentedControlItem
        size={(v.Size ?? 'default') as SegmentedControlSize}
        checked={v.Checked === 'true'}
        forceState={(v.State ?? 'Default') as SegmentedControlItemState}
        label="Week"
      />
    </RecipeScope>
  )
}

/** The Figma Breadcrumb (402:7814) in place: Home · Projects · Escala · the current page. */
export function SkeletonBreadcrumbSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkBreadcrumb appearance={(v.Appearance ?? 'ghost') as BreadcrumbAppearance} separator={(v.Separator ?? 'chevron') as BreadcrumbSeparatorKind} size={(v.Size ?? 'default') as BreadcrumbSize}>
        <SkBreadcrumbList>
          <SkBreadcrumbItem href="#" onClick={(e) => e.preventDefault()} iconLeading={BREADCRUMB_GLYPHS.house}>Home</SkBreadcrumbItem>
          <SkBreadcrumbSeparator />
          <SkBreadcrumbItem href="#" onClick={(e) => e.preventDefault()}>Projects</SkBreadcrumbItem>
          <SkBreadcrumbSeparator />
          <SkBreadcrumbItem href="#" onClick={(e) => e.preventDefault()}>Escala</SkBreadcrumbItem>
          <SkBreadcrumbSeparator />
          <SkBreadcrumbItem current>Breadcrumb</SkBreadcrumbItem>
        </SkBreadcrumbList>
      </SkBreadcrumb>
    </RecipeScope>
  )
}

/** A lone item: it sits in a list so the markup stays valid. */
export function SkeletonBreadcrumbItemSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <ol className="m-0 flex list-none p-0">
        <SkBreadcrumbItem
          href="#"
          onClick={(e) => e.preventDefault()}
          variant={(v.Variant ?? 'default') as BreadcrumbVariant}
          appearance={(v.Appearance ?? 'ghost') as BreadcrumbAppearance}
          size={(v.Size ?? 'default') as BreadcrumbSize}
          forceState={(v.State ?? 'Default') as BreadcrumbItemState}
          disabled={v.State === 'Disabled'}
        >Label</SkBreadcrumbItem>
      </ol>
    </RecipeScope>
  )
}

export function SkeletonBreadcrumbEllipsisSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <ol className="m-0 flex list-none p-0">
        <SkBreadcrumbEllipsis
          variant={(v.Variant ?? 'default') as BreadcrumbVariant}
          appearance={(v.Appearance ?? 'ghost') as BreadcrumbAppearance}
          size={(v.Size ?? 'default') as BreadcrumbSize}
          forceState={(v.State ?? 'Default') as BreadcrumbEllipsisState}
          disabled={v.State === 'Disabled'}
        />
      </ol>
    </RecipeScope>
  )
}

export function SkeletonBreadcrumbSeparatorSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <ol className="m-0 flex list-none p-0">
        <SkBreadcrumbSeparator variant={(v.Variant ?? 'chevron') as BreadcrumbSeparatorKind} size={(v.Size ?? 'default') as BreadcrumbSize} />
      </ol>
    </RecipeScope>
  )
}

/** The Figma Pagination (989:714) in place: Previous, 1, 2 (current), 3, …, 10, Next. */
export function SkeletonPaginationSpecimen({ t, v }: SpecimenProps) {
  const [page, setPage] = useState(2)
  return (
    <RecipeScope t={t}>
      <SkPagination size={(v.Size ?? 'default') as PaginationSize} variant={(v.Variant ?? 'compact-grouped') as PaginationVariant} pages={[1, 2, 3, '…', 10]} page={page} onPageChange={setPage} />
    </RecipeScope>
  )
}

/** A lone link: it sits in a compact Pagination so it keeps its context. */
export function SkeletonPaginationLinkSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkPaginationScope size={(v.Size ?? 'default') as PaginationSize}>
        <SkPaginationLink active={v.Active === 'true'} forceState={(v.State ?? 'Default') as PaginationLinkState} disabled={v.State === 'Disabled'}>1</SkPaginationLink>
      </SkPaginationScope>
    </RecipeScope>
  )
}

export function SkeletonPaginationEllipsisSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkPaginationEllipsis size={(v.Size ?? 'default') as PaginationSize} /></RecipeScope>
}

/** The Figma Stepper (994:3222) in place: Account (completed), Shipping (active), Payment and Review (locked). */
export function SkeletonStepperSpecimen({ t, v, w }: SpecimenProps) {
  const step = useAutoplayStep(4, 2400)
  const current = step == null ? 2 : step + 1
  const orientation = (v.Orientation ?? (w ? 'horizontal' : 'vertical')) as StepperOrientation
  const items = [['Account', 'Your login details'], ['Shipping', 'Where we deliver'], ['Payment', 'Card or transfer'], ['Review', 'Confirm your order']]
  return (
    <RecipeScope t={t}>
      <SkStepper aria-label="Checkout" size={(v.Size ?? 'default') as StepperSize} orientation={orientation} width={w ?? (orientation === 'vertical' ? 320 : undefined)}>
        {items.map(([title, description], i) => (
          <SkStepperItem key={title} status={i + 1 < current ? 'completed' : i + 1 === current ? 'active' : 'locked'} description={description}>{title}</SkStepperItem>
        ))}
      </SkStepper>
    </RecipeScope>
  )
}

/** A lone item: it sits in a Stepper so it keeps its context. */
export function SkeletonStepperItemSpecimen({ t, v }: SpecimenProps) {
  const orientation = (v.Orientation ?? 'vertical') as StepperOrientation
  return (
    <RecipeScope t={t}>
      <SkStepper aria-label="Step" size={(v.Size ?? 'default') as StepperSize} orientation={orientation} width={orientation === 'vertical' ? 320 : 200}>
        <SkStepperItem status={(v.Status ?? 'active') as StepperStatus} disabled={v.State === 'Disabled'} description="Short description of the step" lineVisible>Step title</SkStepperItem>
      </SkStepper>
    </RecipeScope>
  )
}

export function SkeletonStepperIndicatorSpecimen({ t, v }: SpecimenProps) {
  const orientation = (v.Orientation ?? 'vertical') as StepperOrientation
  return (
    <RecipeScope t={t}>
      <div style={orientation === 'vertical' ? { height: 96 } : { width: 200 }} className="flex">
        <SkStepperIndicator size={(v.Size ?? 'default') as StepperSize} status={(v.Status ?? 'active') as StepperStatus} orientation={orientation} disabled={v.State === 'Disabled'} className={orientation === 'horizontal' ? 'w-full' : undefined} />
      </div>
    </RecipeScope>
  )
}

export function SkeletonStepperIconSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkStepperIcon size={(v.Size ?? 'default') as StepperSize} status={(v.Status ?? 'active') as StepperStatus} disabled={v.State === 'Disabled'} /></RecipeScope>
}

/** The Figma DropdownMenu (947:299) in place: a label, three rows (Profile focused), a rule and a destructive row. */
export function SkeletonDropdownMenuSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as DropdownMenuSize
  const px = size === 'lg' ? 20 : 16
  const icon = (concept: 'user' | 'file' | 'settings' | 'sign-out') => <PreviewIcon concept={concept} size={px} />
  return (
    <RecipeScope t={t}>
      <SkDropdownMenu>
        <SkDropdownMenuContent inline size={size}>
          <SkDropdownMenuLabel>My account</SkDropdownMenuLabel>
          <SkDropdownMenuItem highlighted iconLeading={icon('user')} trailing="⇧⌘P">Profile</SkDropdownMenuItem>
          <SkDropdownMenuItem iconLeading={icon('file')} trailing="⌘B">Billing</SkDropdownMenuItem>
          <SkDropdownMenuItem iconLeading={icon('settings')} trailing="⌘S">Settings</SkDropdownMenuItem>
          <SkDropdownMenuSeparator />
          <SkDropdownMenuItem variant="destructive" iconLeading={icon('sign-out')} trailing="⇧⌘Q">Log out</SkDropdownMenuItem>
        </SkDropdownMenuContent>
      </SkDropdownMenu>
    </RecipeScope>
  )
}

/** The Figma DropdownMenuLabel (947:169) on its own, 256 wide. */
export function SkeletonDropdownMenuLabelSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as DropdownMenuSize
  return (
    <RecipeScope t={t}>
      <div style={{ width: 256 }}><SkDropdownMenuLabel size={size}>Action</SkDropdownMenuLabel></div>
    </RecipeScope>
  )
}

/** The Figma DropdownMenuItem (947:161) on its own, 256 wide, with the file's default content (leading icon, shortcut). */
export function SkeletonDropdownMenuItemSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as DropdownMenuSize
  const state = (v.State ?? 'Default') as DropdownMenuItemState
  return (
    <RecipeScope t={t}>
      <SkDropdownMenu>
        <SkDropdownMenuContent inline size={size} className="[&>[data-part='DropdownMenu.content']]:!p-0" style={{ border: 0, boxShadow: 'none', background: 'transparent' }}>
          <SkDropdownMenuItem
            forceState={state}
            variant={(v.Variant ?? 'default') as DropdownMenuItemVariant}
            checked={state === 'Selected' ? true : undefined}
            disabled={state === 'Disabled'}
            iconLeading={<PreviewIcon concept="home" size={size === 'lg' ? 20 : 16} />}
            trailing="⌘K"
          >
            Option
          </SkDropdownMenuItem>
        </SkDropdownMenuContent>
      </SkDropdownMenu>
    </RecipeScope>
  )
}

/** The Figma DropdownMenuFooter (949:3290) on its own, 256 wide. */
export function SkeletonDropdownMenuFooterSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as DropdownMenuSize
  const layout = (v.Layout ?? 'inline') as DropdownMenuFooterLayout
  const btn = size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'sm'
  return (
    <RecipeScope t={t}>
      <div style={{ width: 256 }}>
        <SkDropdownMenuFooter size={size} layout={layout} leading="12 of 40 selected">
          <SkButton variant="secondary" appearance="solid" size={btn}>Clear</SkButton>
          <SkButton variant="default" appearance="solid" size={btn}>Apply</SkButton>
        </SkDropdownMenuFooter>
      </div>
    </RecipeScope>
  )
}

export function SkeletonCommandSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkCommand style={{ width: 320 }}>
        <SkCommandInput icon={<PreviewIcon concept="search" size={iconOf(14)} />} shortcut="⌘K" placeholder="Type a command…" />
        <SkCommandList>
          <SkCommandGroup heading="Actions">
            <SkCommandItem highlighted>Open Color foundation</SkCommandItem>
            <SkCommandItem>Publish tokens to Figma</SkCommandItem>
            <SkCommandItem>Export variables.css</SkCommandItem>
          </SkCommandGroup>
        </SkCommandList>
      </SkCommand>
    </RecipeScope>
  )
}

export function SkeletonNavbarSpecimen({ t }: SpecimenProps) {
  const links = ['Home', 'Tokens', 'Components', 'Docs'].map((label, i) => ({ label, current: i === 0 }))
  return <RecipeScope t={t}><SkNavbar links={links} trailing="MD" style={{ width: 420 }} /></RecipeScope>
}

const SIDEBAR_ITEMS = [
  { label: 'Overview', concept: 'home' as const },
  { label: 'Tokens', concept: 'palette' as const },
  { label: 'Components', concept: 'box' as const },
  { label: 'Settings', concept: 'settings' as const },
]
const sidebarIconPx = (size: SidebarSize) => (size === 'lg' ? 20 : 16)

/** The Figma Sidebar (982:1003): brand + trigger, two groups, a footer. `Collapsed` is the 48px rail. */
export function SkeletonSidebarSpecimen({ t, v, w }: SpecimenProps) {
  const collapsed = v.Collapsed === 'true'
  const [active, setActive] = useState('Tokens')
  return (
    <RecipeScope t={t}>
      <SkSidebar collapsed={collapsed} style={{ height: 420, ...(w != null && !collapsed ? { width: w } : null) }}>
        <SkSidebarHeader>
          <SkSidebarBrand logo={<SkAvatar type="initials" size="sm" shape="rounded" variant="default" appearance="solid">E</SkAvatar>} title="Escala" subtitle="Design system" />
          <SkSidebarTrigger />
        </SkSidebarHeader>
        <SkSidebarContent>
          <SkSidebarGroup>
            <SkSidebarGroupLabel>Platform</SkSidebarGroupLabel>
            <SkSidebarMenu>
              {SIDEBAR_ITEMS.map((item) => (
                <SkSidebarMenuItem key={item.label}>
                  <SkSidebarMenuButton
                    icon={<PreviewIcon concept={item.concept} size={16} />}
                    state={item.label === active ? 'Current' : undefined}
                    onClick={() => setActive(item.label)}
                  >
                    {item.label}
                  </SkSidebarMenuButton>
                </SkSidebarMenuItem>
              ))}
            </SkSidebarMenu>
          </SkSidebarGroup>
        </SkSidebarContent>
        <SkSidebarFooter>
          <SkSidebarMenuButton icon={<PreviewIcon concept="settings" size={16} />}>Settings</SkSidebarMenuButton>
        </SkSidebarFooter>
      </SkSidebar>
    </RecipeScope>
  )
}

/** The Figma SidebarMenuButton (980:368) on its own: 256 wide, 32 when collapsed. */
export function SkeletonSidebarMenuButtonSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as SidebarSize
  const collapsed = v.Collapsed === 'true'
  return (
    <RecipeScope t={t}>
      <SkSidebar collapsed={collapsed} className="!h-auto !w-auto !border-0 !bg-transparent">
        <SkSidebarGroup size={size}>
          <SkSidebarMenu>
            <SkSidebarMenuItem style={{ width: collapsed ? undefined : 256 }}>
              <SkSidebarMenuButton
                state={(v.State ?? 'Default') as SidebarMenuButtonState}
                icon={<PreviewIcon concept="home" size={sidebarIconPx(size)} />}
              >
                Dashboard
              </SkSidebarMenuButton>
            </SkSidebarMenuItem>
          </SkSidebarMenu>
        </SkSidebarGroup>
      </SkSidebar>
    </RecipeScope>
  )
}

/** The Figma SidebarGroup (982:292): the label over four rows; Size cascades. */
export function SkeletonSidebarGroupSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as SidebarSize
  const collapsed = v.Collapsed === 'true'
  return (
    <RecipeScope t={t}>
      <SkSidebar collapsed={collapsed} className="!h-auto !w-auto !border-0 !bg-transparent">
        <SkSidebarGroup size={size} style={{ width: collapsed ? undefined : 256 }}>
          <SkSidebarGroupLabel>Platform</SkSidebarGroupLabel>
          <SkSidebarMenu>
            {SIDEBAR_ITEMS.map((item, i) => (
              <SkSidebarMenuItem key={item.label}>
                <SkSidebarMenuButton icon={<PreviewIcon concept={item.concept} size={sidebarIconPx(size)} />} state={i === 0 ? 'Current' : undefined}>
                  {item.label}
                </SkSidebarMenuButton>
              </SkSidebarMenuItem>
            ))}
          </SkSidebarMenu>
        </SkSidebarGroup>
      </SkSidebar>
    </RecipeScope>
  )
}

/** The Figma SidebarGroupLabel (980:390) on its own, 256 wide. */
export function SkeletonSidebarGroupLabelSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as SidebarSize
  return (
    <RecipeScope t={t}>
      <div style={{ width: 256 }}><SkSidebarGroupLabel size={size}>Platform</SkSidebarGroupLabel></div>
    </RecipeScope>
  )
}

/** The Figma SidebarBrand (980:419); Collapsed shows the logo only. */
export function SkeletonSidebarBrandSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkSidebar collapsed={v.Collapsed === 'true'} className="!h-auto !w-auto !border-0 !bg-transparent">
        <SkSidebarBrand logo={<SkAvatar type="initials" size="sm" shape="rounded" variant="default" appearance="solid">E</SkAvatar>} title="Escala" subtitle="Design system" />
      </SkSidebar>
    </RecipeScope>
  )
}

/** The first panel starts open so the viewport shows; hover moves it. */
export function SkeletonNavigationMenuSpecimen({ t }: SpecimenProps) {
  const links = [
    ['Introduction', 'What Escala is and how the tokens work.'],
    ['Installation', 'Add the registry and the variables.'],
    ['Figma', 'Sync the system into a file.'],
  ]
  return (
    <RecipeScope t={t}>
      <div style={{ minHeight: 280, width: 420, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <SkNavigationMenu defaultValue="start">
          <SkNavigationMenuList>
            <SkNavigationMenuItem value="start">
              <SkNavigationMenuTrigger icon={<PreviewIcon concept="chevron" size={iconOf(11)} />}>Getting started</SkNavigationMenuTrigger>
              <SkNavigationMenuContent>
                <ul className="m-0 grid list-none p-0" style={{ width: 300 }}>
                  {links.map(([title, body]) => (
                    <li key={title}>
                      <SkNavigationMenuLink href="#" onClick={(e) => e.preventDefault()}>
                        <span style={{ fontWeight: 600 }}>{title}</span>
                        <span style={{ color: 'var(--color-content-secondary)' }}>{body}</span>
                      </SkNavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </SkNavigationMenuContent>
            </SkNavigationMenuItem>
            <SkNavigationMenuItem value="components">
              <SkNavigationMenuTrigger icon={<PreviewIcon concept="chevron" size={iconOf(11)} />}>Components</SkNavigationMenuTrigger>
              <SkNavigationMenuContent>
                <ul className="m-0 grid list-none p-0" style={{ width: 240 }}>
                  {['Button', 'Card', 'Dialog'].map((c) => (
                    <li key={c}><SkNavigationMenuLink href="#" onClick={(e) => e.preventDefault()}>{c}</SkNavigationMenuLink></li>
                  ))}
                </ul>
              </SkNavigationMenuContent>
            </SkNavigationMenuItem>
          </SkNavigationMenuList>
        </SkNavigationMenu>
      </div>
    </RecipeScope>
  )
}
