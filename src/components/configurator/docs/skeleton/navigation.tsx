import type * as React from 'react'
import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import { iconOf } from '../../../../lib/previewTokens'
import { Tabs as SkTabs, TabsList as SkTabsList, TabsTrigger as SkTabsTrigger, type TabsListVariant } from '../../../escala-ui/tabs'
import { TabMenu as SkTabMenu } from '../../../escala-ui/tab-menu'
import { SegmentedControl as SkSegmentedControl, SegmentedControlItem as SkSegmentedControlItem, type SegmentedControlItemState, type SegmentedControlSize } from '../../../escala-ui/segmented-control'
import { Breadcrumb as SkBreadcrumb, BreadcrumbItem as SkBreadcrumbItem, BreadcrumbLink as SkBreadcrumbLink, BreadcrumbList as SkBreadcrumbList, BreadcrumbPage as SkBreadcrumbPage, BreadcrumbSeparator as SkBreadcrumbSeparator } from '../../../escala-ui/breadcrumb'
import { Pagination as SkPagination } from '../../../escala-ui/pagination'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { Stepper as SkStepper } from '../../../escala-ui/stepper'
import { DropdownMenu as SkDropdownMenu, DropdownMenuContent as SkDropdownMenuContent, DropdownMenuItem as SkDropdownMenuItem, DropdownMenuLabel as SkDropdownMenuLabel, DropdownMenuFooter as SkDropdownMenuFooter, DropdownMenuSeparator as SkDropdownMenuSeparator, type DropdownMenuSize, type DropdownMenuItemState, type DropdownMenuItemVariant, type DropdownMenuFooterLayout } from '../../../escala-ui/dropdown-menu'
import { ContextMenu as SkContextMenu, ContextMenuContent as SkContextMenuContent, ContextMenuItem as SkContextMenuItem, ContextMenuSeparator as SkContextMenuSeparator, ContextMenuShortcut as SkContextMenuShortcut } from '../../../escala-ui/context-menu'
import { Command as SkCommand, CommandGroup as SkCommandGroup, CommandInput as SkCommandInput, CommandItem as SkCommandItem, CommandList as SkCommandList } from '../../../escala-ui/command'
import { Navbar as SkNavbar } from '../../../escala-ui/navbar'
import {
  Sidebar as SkSidebar, SidebarContent as SkSidebarContent, SidebarGroup as SkSidebarGroup, SidebarGroupLabel as SkSidebarGroupLabel,
  SidebarMenu as SkSidebarMenu, SidebarMenuButton as SkSidebarMenuButton, SidebarMenuItem as SkSidebarMenuItem, type SidebarVariant,
} from '../../../escala-ui/sidebar'
import { Button as SkButton } from '../../../escala-ui/button'
import { RecipeScope } from './scope'
import { Menubar as SkMenubar, MenubarContent as SkMenubarContent, MenubarItem as SkMenubarItem, MenubarMenu as SkMenubarMenu, MenubarSeparator as SkMenubarSeparator, MenubarShortcut as SkMenubarShortcut, MenubarTrigger as SkMenubarTrigger } from '../../../escala-ui/menubar'
import { NavigationMenu as SkNavigationMenu, NavigationMenuContent as SkNavigationMenuContent, NavigationMenuItem as SkNavigationMenuItem, NavigationMenuLink as SkNavigationMenuLink, NavigationMenuList as SkNavigationMenuList, NavigationMenuTrigger as SkNavigationMenuTrigger } from '../../../escala-ui/navigation-menu'

export function SkeletonTabsSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTabs defaultValue="overview">
        <SkTabsList variant={(v.Variant ?? 'default') as TabsListVariant}>
          {['Overview', 'Tokens', 'Usage'].map((tab) => <SkTabsTrigger key={tab} value={tab.toLowerCase()}>{tab}</SkTabsTrigger>)}
        </SkTabsList>
      </SkTabs>
    </RecipeScope>
  )
}

export function SkeletonTabMenuSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTabMenu items={['All', 'Drafts', 'Published']} fill={w === '100%'} />
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

export function SkeletonBreadcrumbSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkBreadcrumb>
        <SkBreadcrumbList>
          <SkBreadcrumbItem><SkBreadcrumbLink href="#" onClick={(e) => e.preventDefault()}>Home</SkBreadcrumbLink></SkBreadcrumbItem>
          <SkBreadcrumbSeparator><PreviewIcon concept="chevron-right" size={iconOf(12)} /></SkBreadcrumbSeparator>
          <SkBreadcrumbItem><SkBreadcrumbLink href="#" onClick={(e) => e.preventDefault()}>Library</SkBreadcrumbLink></SkBreadcrumbItem>
          <SkBreadcrumbSeparator><PreviewIcon concept="chevron-right" size={iconOf(12)} /></SkBreadcrumbSeparator>
          <SkBreadcrumbItem><SkBreadcrumbPage>Design tokens</SkBreadcrumbPage></SkBreadcrumbItem>
        </SkBreadcrumbList>
      </SkBreadcrumb>
    </RecipeScope>
  )
}

export function SkeletonPaginationSpecimen({ t }: SpecimenProps) {
  const [page, setPage] = useState(2)
  return <RecipeScope t={t}><SkPagination pages={[1, 2, 3, '…', 8]} page={page} onPageChange={setPage}
    prevIcon={<PreviewIcon concept="chevron-left" size={iconOf(13)} />}
    nextIcon={<PreviewIcon concept="chevron-right" size={iconOf(13)} />} /></RecipeScope>
}

export function SkeletonStepperSpecimen({ t, w }: SpecimenProps) {
  const step = useAutoplayStep(3, 2400)
  return (
    <RecipeScope t={t}>
      <SkStepper steps={['Account', 'Tokens', 'Publish']} current={step == null ? 2 : step + 1} width={w} doneIcon={<PreviewIcon concept="check" size={iconOf(12)} />} />
    </RecipeScope>
  )
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

export function SkeletonContextMenuSpecimen({ t, w, elev }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkContextMenu>
        <SkContextMenuContent inline style={{ width: w ?? 210, boxShadow: elev === false ? 'none' : undefined }}>
          <SkContextMenuItem highlighted>Copy<SkContextMenuShortcut>⌘C</SkContextMenuShortcut></SkContextMenuItem>
          <SkContextMenuItem>Paste<SkContextMenuShortcut>⌘V</SkContextMenuShortcut></SkContextMenuItem>
          <SkContextMenuItem>Select all<SkContextMenuShortcut>⌘A</SkContextMenuShortcut></SkContextMenuItem>
          <SkContextMenuSeparator />
          <SkContextMenuItem>Inspect tokens</SkContextMenuItem>
        </SkContextMenuContent>
      </SkContextMenu>
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

export function SkeletonSidebarSpecimen({ t, v, w }: SpecimenProps) {
  const items = [
    { label: 'Overview', icon: <PreviewIcon concept="home" size={iconOf(15)} /> },
    { label: 'Tokens', icon: <PreviewIcon concept="palette" size={iconOf(15)} /> },
    { label: 'Components', icon: <PreviewIcon concept="box" size={iconOf(15)} /> },
    { label: 'Settings', icon: <PreviewIcon concept="settings" size={iconOf(15)} /> },
  ]
  return <SidebarDemo t={t} items={items} variant={(v.Variant ?? 'sidebar') as SidebarVariant} w={w} />
}

function SidebarDemo({ t, items, variant, w }: { t: SpecimenProps['t']; items: { label: string; icon: React.ReactNode }[]; variant: SidebarVariant; w?: number | string }) {
  const [active, setActive] = useState('Tokens')
  return (
    <RecipeScope t={t}>
      <SkSidebar variant={variant} style={{ width: w ?? 220 }}>
        <SkSidebarContent>
          <SkSidebarGroup>
            <SkSidebarGroupLabel>Workspace</SkSidebarGroupLabel>
            <SkSidebarMenu>
              {items.map((item) => (
                <SkSidebarMenuItem key={item.label}>
                  <SkSidebarMenuButton isActive={item.label === active} onClick={() => setActive(item.label)}>
                    {item.icon}
                    <span>{item.label}</span>
                  </SkSidebarMenuButton>
                </SkSidebarMenuItem>
              ))}
            </SkSidebarMenu>
          </SkSidebarGroup>
        </SkSidebarContent>
      </SkSidebar>
    </RecipeScope>
  )
}

/** The bar with File open: its panel drawn in place under the trigger. */
export function SkeletonMenubarSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div className="flex flex-col items-start" style={{ gap: 'var(--spacing-1_5)' }}>
        <SkMenubar>
          {['File', 'Edit', 'View'].map((m, i) => (
            <SkMenubarMenu key={m}><SkMenubarTrigger active={i === 0}>{m}</SkMenubarTrigger></SkMenubarMenu>
          ))}
        </SkMenubar>
        <SkMenubarContent inline style={{ width: 220 }}>
          <SkMenubarItem highlighted>New tab<SkMenubarShortcut>⌘T</SkMenubarShortcut></SkMenubarItem>
          <SkMenubarItem>New window<SkMenubarShortcut>⌘N</SkMenubarShortcut></SkMenubarItem>
          <SkMenubarSeparator />
          <SkMenubarItem>Share</SkMenubarItem>
          <SkMenubarItem variant="destructive">Close all</SkMenubarItem>
        </SkMenubarContent>
      </div>
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
