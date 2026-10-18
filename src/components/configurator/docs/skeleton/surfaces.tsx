import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { shadowOf } from '../../../../lib/previewTokens'
import { Button as SkButton } from '../../../escala-ui/button'
import { Card as SkCard, CardHeader as SkCardHeader, CardTitle as SkCardTitle, CardDescription as SkCardDescription, CardFooter as SkCardFooter, CardLink as SkCardLink } from '../../../escala-ui/card'
import { Dialog as SkDialog, DialogContent as SkDialogContent, DialogHeader as SkDialogHeader, DialogTitle as SkDialogTitle, DialogDescription as SkDialogDescription, DialogFooter as SkDialogFooter } from '../../../escala-ui/dialog'
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
