import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from '../../../src/components/escala-ui/button'
import { Input } from '../../../src/components/escala-ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuFooter, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DROPDOWN_MENU_SIZES, type DropdownMenuSize,
} from '../../../src/components/escala-ui/dropdown-menu'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

/** Story args = the Figma `DropdownMenu` set (design-plans/dropdown-menu-contract.md), in the panel's order and with its
 *  defaults: Size (the variant axis), HeaderVisible · FooterVisible. Content is the file's example (a label, three rows and a
 *  destructive one). */
interface DropdownMenuStoryArgs {
  size: DropdownMenuSize
  headerVisible: boolean
  footerVisible: boolean
}

function menu({ size, headerVisible, footerVisible }: DropdownMenuStoryArgs) {
  const px = size === 'lg' ? 20 : 16
  const btn = size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'sm'
  return (
    <DropdownMenu>
      <DropdownMenuContent
        inline
        size={size}
        header={headerVisible ? <Input size={size} placeholder="Search" aria-label="Search" /> : undefined}
        footer={footerVisible ? (
          <DropdownMenuFooter leading="12 of 40 selected">
            <Button variant="secondary" appearance="solid" size={btn}>Clear</Button>
            <Button variant="default" appearance="solid" size={btn}>Apply</Button>
          </DropdownMenuFooter>
        ) : undefined}
      >
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuItem highlighted iconLeading={<PreviewIcon concept="user" size={px} />} trailing="⇧⌘P">Profile</DropdownMenuItem>
        <DropdownMenuItem iconLeading={<PreviewIcon concept="file" size={px} />} trailing="⌘B">Billing</DropdownMenuItem>
        <DropdownMenuItem iconLeading={<PreviewIcon concept="settings" size={px} />} trailing="⌘S">Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" iconLeading={<PreviewIcon concept="sign-out" size={px} />} trailing="⇧⌘Q">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const meta: Meta<DropdownMenuStoryArgs> = {
  title: 'Navigation/DropdownMenu',
  render: menu,
  args: { size: 'default', headerVisible: false, footerVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...DROPDOWN_MENU_SIZES] },
    headerVisible: { name: 'HeaderVisible', control: 'boolean' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<DropdownMenuStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {DROPDOWN_MENU_SIZES.map((size) => <div key={size}>{menu({ ...args, size })}</div>)}
    </div>
  ),
}

/** The real thing: a trigger, arrow keys, typeahead, Escape; a selectable row is a menuitemcheckbox. */
export const WithTrigger: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true)
    return (
      <div style={{ padding: 40 }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="secondary">Options</Button></DropdownMenuTrigger>
          <DropdownMenuContent size={args.size}>
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuItem checked={checked} onCheckedChange={setChecked}>Show grid</DropdownMenuItem>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  },
}
