// Escala component: IssueCard (Figma 2228:160), 1:1 with the file. The whole card is one link, named by the issue title.
// While dragged only the edge and the shadow ease: the position follows the pointer with no transition (MOT-005).
// Appearance: recipe IssueCard (lib/recipes/pages.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const ISSUE_CARD_STATES = ['Default', 'Hover', 'Dragging'] as const
export type IssueCardState = (typeof ISSUE_CARD_STATES)[number]

export interface IssueCardProps extends Omit<React.ComponentProps<'a'>, 'title'> {
  /** Figma IssueKey. */
  issueKey: string
  /** Figma Title: the link's accessible name. */
  title: string
  /** Figma PullRequestVisible + PullRequest. */
  pullRequest?: string
  /** Figma AssigneeVisible: an Avatar `size="xs"`. */
  assignee?: React.ReactNode
  /** Figma PriorityIcon. */
  priorityIcon?: React.ReactNode
  /** The first tag: a Badge `size="sm"`. */
  tag?: React.ReactNode
  /** Figma TagSecondaryVisible: a second Badge. */
  tagSecondary?: React.ReactNode
  /** Figma CommentsVisible + Comments. */
  comments?: string
  /** Figma DueVisible + Due. */
  due?: string
  /** Pins a state for docs and previews; `Dragging` while the card is dragged. */
  forceState?: IssueCardState
}

const box = 'inline-flex shrink-0 items-center justify-center [&>svg]:size-full'

function IssueCard({ issueKey, title, pullRequest, assignee, priorityIcon, tag, tagSecondary, comments, due, forceState, className, ...props }: IssueCardProps) {
  const titleId = `${React.useId()}-title`
  return (
    <a
      data-slot="issue-card"
      data-escala="IssueCard"
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-labelledby={titleId}
      className={cn('flex w-full flex-col no-underline outline-none', className)}
      {...props}
    >
      <span data-part="IssueCard.header" className="flex w-full items-center justify-between">
        <span data-part="IssueCard.key" className="flex items-center">
          <span data-part="IssueCard.issueKey">{issueKey}</span>
          {pullRequest != null && (
            <span data-part="IssueCard.pullRequest" className="flex items-center">
              <span data-part="IssueCard.icon" aria-hidden className={box}>{glyph('git-pull-request')}</span>
              {pullRequest}
            </span>
          )}
        </span>
        {assignee}
      </span>
      <span id={titleId} data-part="IssueCard.title">{title}</span>
      <span data-part="IssueCard.meta" className="flex w-full flex-wrap items-center">
        <span data-part="IssueCard.icon" aria-hidden className={box}>{priorityIcon ?? glyph('cell-signal-high')}</span>
        {tag}
        {tagSecondary}
        {comments != null && (
          <span data-part="IssueCard.comments" className="flex items-center">
            <span data-part="IssueCard.icon" aria-hidden className={box}>{glyph('chat-circle')}</span>
            {comments}
          </span>
        )}
        {due != null && (
          <span data-part="IssueCard.due" className="flex items-center">
            <span data-part="IssueCard.icon" aria-hidden className={box}>{glyph('calendar-blank')}</span>
            {due}
          </span>
        )}
      </span>
    </a>
  )
}

export { IssueCard }
