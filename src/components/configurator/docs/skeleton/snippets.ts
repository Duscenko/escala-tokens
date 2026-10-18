/**
 * Usage snippets for the shadcn-skeleton components. They show the API a
 * product actually imports (`@/components/ui/button` …): shadcn's anatomy and
 * prop names, plus Escala's axes (`variant` = style, `intent` = colour,
 * `size`). Nothing here names a prop the component in `escala-ui/` lacks.
 */
import type { AxisValues, IconOpts } from '../specimens'
import { ICON_COMPONENT, ICON_SLOTS, INPUT_META, buttonLeadingConcept } from '../specimens'

type Snippet = (v: AxisValues, icons?: IconOpts) => string

const low = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, '-')
/** ` size="…"` only for a non-default size — keeps snippets lean. */
const sizeProp = (v: AxisValues) => (v.Size && low(v.Size) !== 'md' ? ` size="${low(v.Size)}"` : '')

export const SKELETON_SNIPPETS: Record<string, Snippet> = {
  ButtonGroup: (v) =>
    `import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"\n\n<ButtonGroup${sizeProp(v)}>\n  <ButtonGroupItem>Day</ButtonGroupItem>\n  <ButtonGroupItem selected>Week</ButtonGroupItem>\n  <ButtonGroupItem>Month</ButtonGroupItem>\n</ButtonGroup>`,
  CloseButton: (v) =>
    `import { CloseButton } from "@/components/ui/button"\n\n<CloseButton${v.Size === 'SM' ? ' size="sm"' : ''} onClick={dismiss}>\n  <X />\n</CloseButton>`,
  FABButton: (v) =>
    `import { FABButton } from "@/components/ui/button"\n\n<FABButton${v.Size === 'LG' ? ' size="lg"' : ''} aria-label="New item">\n  <Plus />\n</FABButton>`,
  SocialLoginButton: (v) =>
    `import { SocialLoginButton } from "@/components/ui/social-login-button"\n\n<SocialLoginButton provider="${v.Provider ?? 'Google'}"${v.Size === 'LG' ? ' size="lg"' : ''} />`,
  TextLink: (v) =>
    `import { TextLink } from "@/components/ui/link"\n\n<TextLink href="/docs/tokens"${v.State === 'Disabled' ? ' aria-disabled' : ''}>\n  design tokens guide ↗\n</TextLink>`,
  AppStoreBadge: (v) =>
    `import { AppStoreBadge } from "@/components/ui/app-store-badge"\n\n<AppStoreBadge store="${v.Store ?? 'App Store'}" href={storeUrl} />`,
  Button: (v, icons) => {
    const style = low(v.Style) || 'solid'
    const variant = style !== 'solid' ? ` variant="${style}"` : ''
    // `outline` and `ghost` default to neutral (as in shadcn); solid and soft to brand.
    const defaultIntent = style === 'outline' || style === 'ghost' ? 'neutral' : 'brand'
    const intent = (low(v.Color) || 'brand') !== defaultIntent ? ` intent="${low(v.Color) || 'brand'}"` : ''
    const flags = `${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Loading' ? ' loading' : ''}`
    const lead = icons?.leading ? `  <${ICON_COMPONENT[icons.leadingConcept ?? buttonLeadingConcept(v.Color)]} />\n` : ''
    const trail = icons?.trailing ? `\n  <${ICON_COMPONENT[ICON_SLOTS.Button.trailing]} />` : ''
    return `import { Button } from "@/components/ui/button"\n\n<Button${variant}${intent}${sizeProp(v)}${flags}>\n${lead}  Button${trail}\n</Button>`
  },
  Input: (v, icons) => {
    const type = ({ 'default': 'text', 'e-mail': 'email', 'password': 'password', 'search': 'search', 'phone-number': 'tel', 'website': 'url' } as Record<string, string>)[low(v.Type)] ?? 'text'
    const label = INPUT_META[v.Type ?? 'Default']?.label ?? 'Name'
    const extras = [
      sizeProp(v).trim(),
      v.State === 'Error' ? 'invalid' : '',
      v.State === 'Disabled' ? 'disabled' : '',
      icons?.leading ? `leading={<${ICON_COMPONENT[ICON_SLOTS.Input.leading]} />}` : '',
      icons?.trailing ? `trailing={<${ICON_COMPONENT[ICON_SLOTS.Input.trailing]} />}` : '',
    ].filter(Boolean)
    const hint = v.State === 'Error' ? 'This field is required.' : 'This is a hint text.'
    return `import { InputField } from "@/components/ui/input"\n\n<InputField\n  type="${type}"\n  label="${label}"\n  hint="${hint}"${extras.map((e) => `\n  ${e}`).join('')}\n/>`
  },
  Card: () =>
    `import {\n  Card, CardHeader, CardTitle, CardDescription, CardFooter, CardLink,\n} from "@/components/ui/card"\n\n<Card>\n  <CardHeader>\n    <CardTitle>Card title</CardTitle>\n    <CardDescription>Supporting copy…</CardDescription>\n  </CardHeader>\n  <CardFooter>\n    <CardLink href="#">Learn more →</CardLink>\n  </CardFooter>\n</Card>`,
  Modal: () =>
    `import {\n  Dialog, DialogContent, DialogHeader, DialogTitle,\n  DialogDescription, DialogFooter,\n} from "@/components/ui/dialog"\n\n<Dialog open={open} onOpenChange={setOpen}>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Delete project?</DialogTitle>\n      <DialogDescription>This action can't be undone.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter>\n      <Button variant="outline">Cancel</Button>\n      <Button intent="danger">Delete</Button>\n    </DialogFooter>\n  </DialogContent>\n</Dialog>`,
}
