import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { shadowOf } from '../../../../lib/previewTokens'
import { Button as SkButton } from '../../../escala-ui/button'
import { Card as SkCard, CardHeader as SkCardHeader, CardTitle as SkCardTitle, CardDescription as SkCardDescription, CardFooter as SkCardFooter, CardLink as SkCardLink } from '../../../escala-ui/card'
import { Dialog as SkDialog, DialogContent as SkDialogContent, DialogHeader as SkDialogHeader, DialogTitle as SkDialogTitle, DialogDescription as SkDialogDescription, DialogFooter as SkDialogFooter } from '../../../escala-ui/dialog'
import { Separator as SkSeparator } from '../../../escala-ui/separator'
import { Accordion as SkAccordion, AccordionContent as SkAccordionContent, AccordionItem as SkAccordionItem, AccordionTrigger as SkAccordionTrigger } from '../../../escala-ui/accordion'
import { AspectRatio as SkAspectRatio, type RatioName } from '../../../escala-ui/aspect-ratio'
import { Popover as SkPopover, PopoverContent as SkPopoverContent, PopoverDescription as SkPopoverDescription, PopoverTitle as SkPopoverTitle } from '../../../escala-ui/popover'
import { InfoTooltip as SkInfoTooltip, Tooltip as SkTooltip, TooltipContent as SkTooltipContent, TooltipProvider as SkTooltipProvider } from '../../../escala-ui/tooltip'
import { ScrollArea as SkScrollArea, ScrollAreaRow as SkScrollAreaRow } from '../../../escala-ui/scroll-area'
import { iconOf } from '../../../../lib/previewTokens'
import { RecipeScope } from './scope'

export function SkeletonCardSpecimen({ t, w, children, elev }: SpecimenProps) {
  const shadow = elev === false ? 'none' : elev ? shadowOf(t, elev, 'none') : undefined
  return (
    <RecipeScope t={t}>
      <SkCard style={{ width: w ?? 280, boxShadow: shadow }}>
        {children ?? (
          <>
            <SkCardHeader>
              <SkCardTitle>Card title</SkCardTitle>
              <SkCardDescription>Supporting copy that explains the grouped content inside this surface.</SkCardDescription>
            </SkCardHeader>
            <SkCardFooter>
              <SkCardLink>Learn more →</SkCardLink>
            </SkCardFooter>
          </>
        )}
      </SkCard>
    </RecipeScope>
  )
}

export function SkeletonModalSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <RecipeScope t={t}>
      <SkDialog open modal={false}>
        <SkDialogContent inline style={{ width: 320 }} closeIcon={<PreviewIcon concept="close" size={16} />}>
          <SkDialogHeader>
            <SkDialogTitle>Delete project?</SkDialogTitle>
            <SkDialogDescription>This action can't be undone. All tokens in this project will be removed.</SkDialogDescription>
          </SkDialogHeader>
          <SkDialogFooter>
            <SkButton variant="outline" intent="brand" size="sm">Cancel</SkButton>
            <SkButton variant="solid" intent="danger" size="sm">Delete</SkButton>
          </SkDialogFooter>
        </SkDialogContent>
      </SkDialog>
    </RecipeScope>
  )
}

export function SkeletonDividerSpecimen({ t, v, w }: SpecimenProps) {
  const horizontal = (v.Orientation ?? 'Horizontal') === 'Horizontal'
  return (
    <RecipeScope t={t}>
      <SkSeparator orientation={horizontal ? 'horizontal' : 'vertical'} style={horizontal ? { width: w ?? 220 } : undefined} />
    </RecipeScope>
  )
}

export function SkeletonAccordionSpecimen({ t }: SpecimenProps) {
  const rows = ['What are design tokens?', 'How does Figma sync work?', 'Can I export CSS?']
  return (
    <RecipeScope t={t}>
      <SkAccordion type="single" collapsible defaultValue="item-0" style={{ width: 320 }}>
        {rows.map((q, i) => (
          <SkAccordionItem key={q} value={`item-${i}`}>
            <SkAccordionTrigger icon={<PreviewIcon concept="chevron" size={iconOf(13)} />}>{q}</SkAccordionTrigger>
            <SkAccordionContent>Named values for color, type and spacing that keep every surface consistent.</SkAccordionContent>
          </SkAccordionItem>
        ))}
      </SkAccordion>
    </RecipeScope>
  )
}

const RATIO_WIDTH: Record<string, number> = { '16:9': 240, '4:3': 200, '1:1': 140 }

export function SkeletonAspectRatioSpecimen({ t, v }: SpecimenProps) {
  const ratio = (v.Ratio ?? '16:9') as RatioName
  return <RecipeScope t={t}><SkAspectRatio ratio={ratio} style={{ width: RATIO_WIDTH[ratio] }}>{ratio}</SkAspectRatio></RecipeScope>
}

export function SkeletonPopoverSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div className="flex flex-col items-center" style={{ gap: 'var(--spacing-2)' }}>
        <SkPopover>
          <SkPopoverContent inline style={{ width: 260 }}>
            <SkPopoverTitle>Share this system</SkPopoverTitle>
            <SkPopoverDescription>Anyone with the link can view tokens and docs.</SkPopoverDescription>
            <SkButton size="sm" style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-1)' }}>Copy link</SkButton>
          </SkPopoverContent>
        </SkPopover>
        <SkButton variant="outline" size="sm" style={{ marginTop: 'var(--spacing-1_5)' }}>Share</SkButton>
      </div>
    </RecipeScope>
  )
}

export function SkeletonTooltipSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTooltipProvider>
        <SkTooltip>
          <SkTooltipContent inline>Copy to clipboard</SkTooltipContent>
        </SkTooltip>
      </SkTooltipProvider>
    </RecipeScope>
  )
}

export function SkeletonInfoTooltipSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTooltipProvider>
        <SkInfoTooltip inline content="Applies to new projects only." icon={<PreviewIcon concept="info" size={iconOf(14)} />}>
          Default visibility
        </SkInfoTooltip>
      </SkTooltipProvider>
    </RecipeScope>
  )
}

export function SkeletonScrollAreaSpecimen({ t }: SpecimenProps) {
  const rows = ['Accent / 500', 'Accent / 600', 'Neutral / 100', 'Neutral / 200', 'Success / 500', 'Warning / 500', 'Error / 500']
  return (
    <RecipeScope t={t}>
      <SkScrollArea style={{ width: 240, height: 150 }}>
        {rows.map((r) => <SkScrollAreaRow key={r}>{r}</SkScrollAreaRow>)}
      </SkScrollArea>
    </RecipeScope>
  )
}
