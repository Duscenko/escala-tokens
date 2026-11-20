// Escala component: BoardColumn (Figma 2228:161), 1:1 with the file. One status lane: a tray of IssueCard, labelled by its title and count.
// Appearance: recipe BoardColumn (lib/recipes/pages.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { Button } from './button'
import { IconButton } from './icon-button'

export interface BoardColumnProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  /** Figma Title. */
  title: string
  /** Figma Count. */
  count: number | string
  /** Figma StatusIcon. */
  statusIcon?: React.ReactNode
  /** Figma NewIssueVisible (default true). */
  newIssueVisible?: boolean
  /** The add action in the header and the New issue action at the foot. */
  onNewIssue?: () => void
  /** Figma Content slot: IssueCard. */
  children?: React.ReactNode
}

function BoardColumn({ title, count, statusIcon, newIssueVisible = true, onNewIssue, children, className, ...props }: BoardColumnProps) {
  const add = <span data-part="BoardColumn.addIcon" aria-hidden className="inline-flex [&>svg]:size-full">{glyph('plus')}</span>
  return (
    <section data-slot="board-column" data-escala="BoardColumn" aria-label={`${title}, ${count}`} className={cn('flex w-full flex-col', className)} {...props}>
      <div data-part="BoardColumn.header" className="flex w-full items-center ps-(--spacing-gap-tight)">
        <span data-part="BoardColumn.statusIcon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{statusIcon ?? glyph('circle-dashed')}</span>
        <span data-part="BoardColumn.title">{title}</span>
        <span data-part="BoardColumn.count">{count}</span>
        <span className="flex-1" />
        <IconButton variant="secondary" appearance="ghost" size="xs" icon={add} aria-label={`Add issue to ${title}`} onClick={onNewIssue} />
      </div>
      <ul data-part="BoardColumn.content" className="m-0 flex list-none flex-col p-0">
        {React.Children.map(children, (child) => (child == null ? null : <li>{child}</li>))}
      </ul>
      {newIssueVisible && <Button variant="secondary" appearance="ghost" size="sm" leading={add} className="self-start" onClick={onNewIssue}>New issue</Button>}
    </section>
  )
}

export { BoardColumn }
