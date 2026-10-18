import type * as React from 'react'
import { useEffect, useId } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { shadowOf } from '../../../../lib/previewTokens'
import { Button as SkButton } from '../../../escala-ui/button'
import { type CardSize, Card as SkCard, CardHeader as SkCardHeader, CardTitle as SkCardTitle, CardDescription as SkCardDescription, CardFooter as SkCardFooter } from '../../../escala-ui/card'
import { Dialog as SkDialog, DialogContent as SkDialogContent, DialogHeader as SkDialogHeader, DialogTitle as SkDialogTitle, DialogDescription as SkDialogDescription, DialogFooter as SkDialogFooter } from '../../../escala-ui/dialog'
import { Separator as SkSeparator } from '../../../escala-ui/separator'
import { Accordion as SkAccordion, AccordionContent as SkAccordionContent, AccordionItem as SkAccordionItem, AccordionTrigger as SkAccordionTrigger } from '../../../escala-ui/accordion'
import { AspectRatio as SkAspectRatio, type RatioName } from '../../../escala-ui/aspect-ratio'
import { Popover as SkPopover, PopoverContent as SkPopoverContent, PopoverDescription as SkPopoverDescription, PopoverTitle as SkPopoverTitle } from '../../../escala-ui/popover'
import { InfoTooltip as SkInfoTooltip, Tooltip as SkTooltip, TooltipContent as SkTooltipContent, TooltipProvider as SkTooltipProvider } from '../../../escala-ui/tooltip'
import { ScrollArea as SkScrollArea, ScrollAreaRow as SkScrollAreaRow } from '../../../escala-ui/scroll-area'
import { iconOf } from '../../../../lib/previewTokens'
import { Alert as SkAlert, AlertDescription as SkAlertDescription, AlertIcon as SkAlertIcon, AlertTitle as SkAlertTitle, type AlertVariant } from '../../../escala-ui/alert'
import { Toaster as SkToaster, toast, type SonnerType } from '../../../escala-ui/sonner'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { RecipeScope } from './scope'

export function SkeletonCardSpecimen({ t, v, w, children, elev }: SpecimenProps) {
  const shadow = elev === false ? 'none' : elev ? shadowOf(t, elev, 'none') : undefined
  return (
    <RecipeScope t={t}>
      <SkCard size={(v.Size ?? 'default') as CardSize} style={{ width: w ?? 280, boxShadow: shadow }}>
        {children ?? (
          <>
            <SkCardHeader>
              <SkCardTitle>Card title</SkCardTitle>
              <SkCardDescription>Supporting copy that explains the grouped content inside this surface.</SkCardDescription>
            </SkCardHeader>
            <SkCardFooter>
              <SkButton variant="link" size="sm" style={{ paddingInline: 0 }}>Learn more →</SkButton>
            </SkCardFooter>
          </>
        )}
      </SkCard>
    </RecipeScope>
  )
}

export function SkeletonDialogSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <RecipeScope t={t}>
      <SkDialog open modal={false}>
        <SkDialogContent inline style={{ width: 320 }} closeIcon={<PreviewIcon concept="close" size={16} />}>
          <SkDialogHeader>
            <SkDialogTitle>Delete project?</SkDialogTitle>
            <SkDialogDescription>This action can't be undone. All tokens in this project will be removed.</SkDialogDescription>
          </SkDialogHeader>
          <SkDialogFooter>
            <SkButton variant="outline" size="sm">Cancel</SkButton>
            <SkButton variant="destructive" size="sm">Delete</SkButton>
          </SkDialogFooter>
        </SkDialogContent>
      </SkDialog>
    </RecipeScope>
  )
}

export function SkeletonSeparatorSpecimen({ t, v, w }: SpecimenProps) {
  const horizontal = (v.Orientation ?? 'horizontal') === 'horizontal'
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

// ── Feedback ──────────────────────────────────────────────────────────────

export function SkeletonAlertSpecimen({ t, v, w, children }: SpecimenProps) {
  const variant = (v.Variant ?? 'default') as AlertVariant
  const destructive = variant === 'destructive'
  return (
    <RecipeScope t={t}>
      <SkAlert variant={variant} style={{ width: w ?? 320, maxWidth: '100%' }}>
        <SkAlertIcon><PreviewIcon concept={destructive ? 'error' : 'info'} size={iconOf(15)} /></SkAlertIcon>
        {children ?? (
          <>
            <SkAlertTitle>{destructive ? 'Export failed' : 'Heads up'}</SkAlertTitle>
            <SkAlertDescription>{destructive ? 'Check the token names and try again.' : 'Semantic tokens re-derive when the accent changes.'}</SkAlertDescription>
          </>
        )}
      </SkAlert>
    </RecipeScope>
  )
}

const SONNER_COPY: Record<SonnerType, [string, string]> = {
  default: ['Event created', 'Sunday, 3 November at 9:00'],
  success: ['Changes saved', 'Your tokens are up to date.'],
  info: ['A new version is available', 'Reload to get the latest.'],
  warning: ['Storage almost full', '90% of your plan is in use.'],
  error: ['Something went wrong', 'The tokens were not published.'],
  loading: ['Publishing…', 'Sending your tokens to Figma.'],
}

/**
 * The real Sonner toaster, drawn in place: one Toaster per specimen (its own
 * `id`, so a toast lands only here), its list taken out of the viewport corner
 * and laid in the flow at the front toast's height. The toast never expires.
 */
export function SkeletonSonnerSpecimen({ t, v, w, children }: SpecimenProps) {
  const id = useId()
  const type = (v.Type ?? 'default') as SonnerType
  const [title, description] = SONNER_COPY[type] ?? SONNER_COPY.default
  const message = typeof children === 'string' ? children : title
  useEffect(() => {
    const opts = { id: `${id}-toast`, toasterId: id, description, duration: Infinity, action: type === 'default' ? { label: 'Undo', onClick: () => undefined } : undefined }
    if (type === 'default') toast(message, opts)
    else toast[type](message, opts)
    return () => { toast.dismiss(`${id}-toast`) }
  }, [id, type, message, description])
  const icon = (concept: 'success' | 'info' | 'warning' | 'error') => <PreviewIcon concept={concept} size={iconOf(16)} />
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 356, maxWidth: '100%' }}>
        <SkToaster
          id={id}
          offset={0}
          mobileOffset={0}
          icons={{ success: icon('success'), info: icon('info'), warning: icon('warning'), error: icon('error'), loading: <SkSpinner /> }}
          style={{ position: 'relative', inset: 'auto', transform: 'none', width: '100%', height: 'var(--front-toast-height)', '--width': '100%' } as React.CSSProperties}
        />
      </div>
    </RecipeScope>
  )
}
