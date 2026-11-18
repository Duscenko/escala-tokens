// Escala component: SettingsRow (Figma 2225:89), 1:1 with the file.
// A row saves on change, with no submit: its title names the control and its description describes it.
// Appearance: recipe SettingsRow (lib/recipes/pages.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const SETTINGS_ROW_LAYOUTS = ['inline', 'stacked'] as const
export type SettingsRowLayout = (typeof SETTINGS_ROW_LAYOUTS)[number]

export interface SettingsRowProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Layout: the control on the right, or under the text at full width. */
  layout?: SettingsRowLayout
  /** Figma Title: the control's accessible name. */
  title: React.ReactNode
  /** Figma Description. */
  description?: React.ReactNode
  /** Figma DescriptionVisible (default true). */
  descriptionVisible?: boolean
  /** Figma Control slot: one control. */
  control: React.ReactElement<{ 'aria-labelledby'?: string; 'aria-describedby'?: string }>
}

function SettingsRow({ layout = 'inline', title, description, descriptionVisible = true, control, className, ...props }: SettingsRowProps) {
  const id = React.useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const described = descriptionVisible && description != null
  return (
    <div
      data-slot="settings-row"
      data-escala="SettingsRow"
      data-layout={layout}
      className={cn('flex w-full', layout === 'inline' ? 'flex-row items-center' : 'flex-col', className)}
      {...props}
    >
      <div data-part="SettingsRow.text" className="flex min-w-0 flex-1 flex-col">
        <span id={titleId} data-part="SettingsRow.title">{title}</span>
        {described && <span id={descriptionId} data-part="SettingsRow.description">{description}</span>}
      </div>
      <div data-part="SettingsRow.control" className={cn('flex items-center', layout === 'stacked' && 'w-full')}>
        {React.cloneElement(control, { 'aria-labelledby': titleId, 'aria-describedby': described ? descriptionId : undefined })}
      </div>
    </div>
  )
}

export { SettingsRow }
