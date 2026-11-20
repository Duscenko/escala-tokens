// Escala component: SettingsSection (Figma 2224:123), 1:1 with the file. A titled group of SettingsRow; the page stacks sections.
// Appearance: recipe SettingsSection (lib/recipes/pages.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SettingsSectionProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  /** Figma Title: an h2, so the page stays navigable by headings. */
  title: React.ReactNode
  /** Figma Description. */
  description?: React.ReactNode
  /** Figma DescriptionVisible (default true). */
  descriptionVisible?: boolean
  /** Figma Content slot: SettingsRow only. */
  children?: React.ReactNode
}

function SettingsSection({ title, description, descriptionVisible = true, children, className, ...props }: SettingsSectionProps) {
  const titleId = `${React.useId()}-title`
  return (
    <section data-slot="settings-section" data-escala="SettingsSection" aria-labelledby={titleId} className={cn('flex w-full flex-col', className)} {...props}>
      <div data-part="SettingsSection.header" className="flex flex-col">
        <h2 id={titleId} data-part="SettingsSection.title">{title}</h2>
        {descriptionVisible && description != null && <p data-part="SettingsSection.description">{description}</p>}
      </div>
      <div data-part="SettingsSection.content" className="flex flex-col">{children}</div>
    </section>
  )
}

export { SettingsSection }
