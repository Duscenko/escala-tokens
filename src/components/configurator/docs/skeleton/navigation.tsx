import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import { iconOf } from '../../../../lib/previewTokens'
import { Tabs as SkTabs, TabsList as SkTabsList, TabsTrigger as SkTabsTrigger } from '../../../escala-ui/tabs'
import { TabMenu as SkTabMenu } from '../../../escala-ui/tab-menu'
import { SegmentedControl as SkSegmentedControl } from '../../../escala-ui/segmented-control'
import { Breadcrumb as SkBreadcrumb, BreadcrumbItem as SkBreadcrumbItem, BreadcrumbLink as SkBreadcrumbLink, BreadcrumbList as SkBreadcrumbList, BreadcrumbPage as SkBreadcrumbPage, BreadcrumbSeparator as SkBreadcrumbSeparator } from '../../../escala-ui/breadcrumb'
import { Pagination as SkPagination } from '../../../escala-ui/pagination'
import { Stepper as SkStepper } from '../../../escala-ui/stepper'
import { DropdownMenu as SkDropdownMenu, DropdownMenuContent as SkDropdownMenuContent, DropdownMenuItem as SkDropdownMenuItem, DropdownMenuSeparator as SkDropdownMenuSeparator } from '../../../escala-ui/dropdown-menu'
import { ContextMenu as SkContextMenu, ContextMenuContent as SkContextMenuContent, ContextMenuItem as SkContextMenuItem, ContextMenuSeparator as SkContextMenuSeparator, ContextMenuShortcut as SkContextMenuShortcut } from '../../../escala-ui/context-menu'
import { Command as SkCommand, CommandGroup as SkCommandGroup, CommandInput as SkCommandInput, CommandItem as SkCommandItem, CommandList as SkCommandList } from '../../../escala-ui/command'
import { Navbar as SkNavbar } from '../../../escala-ui/navbar'
import { Sidebar as SkSidebar } from '../../../escala-ui/sidebar'
import { Button as SkButton } from '../../../escala-ui/button'
import { RecipeScope, lower } from './scope'

export function SkeletonTabsSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTabs defaultValue="overview">
        <SkTabsList>
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
      <SkSegmentedControl options={['List', 'Board', 'Timeline']} size={lower(v.Size, 'MD') as 'md'} />
    </RecipeScope>
  )
}

export function SkeletonBreadcrumbSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkBreadcrumb>
        <SkBreadcrumbList>
          <SkBreadcrumbItem><SkBreadcrumbLink href="#" onClick={(e) => e.preventDefault()}>Home</SkBreadcrumbLink></SkBreadcrumbItem>
          <SkBreadcrumbSeparator />
          <SkBreadcrumbItem><SkBreadcrumbLink href="#" onClick={(e) => e.preventDefault()}>Library</SkBreadcrumbLink></SkBreadcrumbItem>
          <SkBreadcrumbSeparator />
          <SkBreadcrumbItem><SkBreadcrumbPage>Design tokens</SkBreadcrumbPage></SkBreadcrumbItem>
        </SkBreadcrumbList>
      </SkBreadcrumb>
    </RecipeScope>
  )
}

export function SkeletonPaginationSpecimen({ t }: SpecimenProps) {
  const [page, setPage] = useState(2)
  return <RecipeScope t={t}><SkPagination pages={[1, 2, 3, '…', 8]} page={page} onPageChange={setPage} /></RecipeScope>
}

export function SkeletonStepperSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkStepper steps={['Account', 'Tokens', 'Publish']} current={2} width={w} doneIcon={<PreviewIcon concept="check" size={iconOf(12)} />} />
    </RecipeScope>
  )
}

export function SkeletonDropdownMenuSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div className="flex flex-col items-start" style={{ gap: 'var(--spacing-1_5)' }}>
        <SkButton variant="outline" size="sm">
          Options
          <PreviewIcon concept="chevron" size={iconOf(11)} />
        </SkButton>
        <SkDropdownMenu>
          <SkDropdownMenuContent inline style={{ width: 210 }}>
            <SkDropdownMenuItem highlighted>Duplicate</SkDropdownMenuItem>
            <SkDropdownMenuItem>Rename</SkDropdownMenuItem>
            <SkDropdownMenuItem>Export tokens</SkDropdownMenuItem>
            <SkDropdownMenuSeparator />
            <SkDropdownMenuItem variant="danger">Delete</SkDropdownMenuItem>
          </SkDropdownMenuContent>
        </SkDropdownMenu>
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

export function SkeletonSidebarSpecimen({ t, w }: SpecimenProps) {
  const items = [
    { label: 'Overview', icon: <PreviewIcon concept="home" size={iconOf(15)} /> },
    { label: 'Tokens', icon: <PreviewIcon concept="palette" size={iconOf(15)} /> },
    { label: 'Components', icon: <PreviewIcon concept="box" size={iconOf(15)} /> },
    { label: 'Settings', icon: <PreviewIcon concept="settings" size={iconOf(15)} /> },
  ]
  return <RecipeScope t={t}><SkSidebar items={items} defaultValue="Tokens" style={{ width: w ?? 200 }} /></RecipeScope>
}
