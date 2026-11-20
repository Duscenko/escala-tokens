import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import { Toast, Toaster, showToast, toastLifetime, TOAST_APPEARANCES, TOAST_VARIANTS, type ToastAppearance, type ToastVariant } from '../../../src/components/escala-ui/toast'

/** Story args = the Figma `Toast` set (design-plans/toast-contract.md), in the panel's order and with its defaults:
 *  Title · DescriptionVisible · Description · IconVisible · ActionsVisible · CloseVisible · ProgressVisible, then
 *  Appearance · Variant. */
interface ToastStoryArgs {
  title: string
  descriptionVisible: boolean
  description: string
  iconVisible: boolean
  actionsVisible: boolean
  closeVisible: boolean
  progressVisible: boolean
  appearance: ToastAppearance
  variant: ToastVariant
}

function render({ actionsVisible, ...args }: ToastStoryArgs) {
  return <Toast {...args} actionsVisible={actionsVisible} actions={<Button variant="secondary" appearance="solid" size="sm">Undo</Button>} />
}

const meta: Meta<ToastStoryArgs> = {
  title: 'Feedback/Toast',
  render,
  args: { title: 'Title', descriptionVisible: true, description: 'Description', iconVisible: true, actionsVisible: false, closeVisible: true, progressVisible: true, appearance: 'filled', variant: 'default' },
  argTypes: {
    title: { name: 'Title', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    actionsVisible: { name: 'ActionsVisible', control: 'boolean' },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    progressVisible: { name: 'ProgressVisible', control: 'boolean' },
    appearance: { name: 'Appearance', control: 'select', options: [...TOAST_APPEARANCES] },
    variant: { name: 'Variant', control: 'select', options: [...TOAST_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<ToastStoryArgs>

/** The toast as it lives: it arrives, its bar runs out, it leaves and comes back. Hover or focus pause it; the close
 *  button dismisses it. A critical toast stays until it is closed. */
function LiveToast({ actionsVisible, progressVisible, ...args }: ToastStoryArgs) {
  const [run, setRun] = useState(0)
  const [closing, setClosing] = useState(false)
  const lifetime = toastLifetime({ ...args, actionsVisible })
  const timed = Number.isFinite(lifetime)
  useEffect(() => {
    if (!closing) return
    const again = setTimeout(() => { setClosing(false); setRun((n) => n + 1) }, 1000)
    return () => clearTimeout(again)
  }, [closing])
  return (
    <div data-toast-state={closing ? 'closing' : 'open'} style={{ display: 'contents' }}>
      <Toast
        key={`${run}-${lifetime}`}
        {...args}
        actionsVisible={actionsVisible}
        actions={<Button variant="secondary" appearance="solid" size="sm">Undo</Button>}
        progressVisible={timed && progressVisible}
        countdown={timed ? lifetime : undefined}
        onCountdownEnd={() => setClosing(true)}
        onClose={() => setClosing(true)}
      />
    </div>
  )
}

export const Playground: Story = {
  render: (args) => <LiveToast {...args} />,
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import { Toaster, showToast } from '@/components/ui/toast'

// Once, near the root of the app
<Toaster position="bottom-right" />

// Anywhere: the lifetime follows the content
showToast({ title: 'Project archived', description: 'Northwind moved to the archive' })`,
      },
    },
  },
}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {TOAST_APPEARANCES.flatMap((appearance) => TOAST_VARIANTS.map((variant) => <div key={appearance + variant}>{render({ ...args, appearance, variant, title: `${variant} · ${appearance}` })}</div>))}
    </div>
  ),
}

/** The queue: `Toaster` once, `showToast` anywhere. How long a toast stays follows its content; hover, focus or a hidden
 *  page pause the bar, and a critical toast waits to be closed. */
export const InAToaster: Story = {
  render: ({ actionsVisible, ...args }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 240, alignContent: 'flex-start' }}>
      <Toaster position="bottom-right" />
      <Button onClick={() => showToast({ ...args, actionsVisible, actions: <Button variant="secondary" appearance="solid" size="sm">Undo</Button> })}>Show toast</Button>
      <Button variant="secondary" onClick={() => showToast({ ...args, title: 'Link copied', descriptionVisible: false, variant: 'success' })}>Brief · 4 s</Button>
      <Button variant="secondary" onClick={() => showToast({ ...args, title: 'Project archived', description: 'Northwind moved to the archive' })}>Default · 6 s</Button>
      <Button variant="secondary" onClick={() => showToast({ ...args, title: 'Project archived', description: 'Northwind moved to the archive', actionsVisible: true, actions: <Button variant="secondary" appearance="solid" size="sm">Undo</Button> })}>With action · 10 s</Button>
      <Button variant="secondary" onClick={() => showToast({ ...args, title: 'Upload failed', description: 'The file is larger than 20 MB', variant: 'critical' })}>Critical · stays</Button>
    </div>
  ),
}
