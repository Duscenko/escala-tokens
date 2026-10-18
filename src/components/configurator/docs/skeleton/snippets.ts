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
  Badge: (v) => {
    const style = low(v.Style) || 'soft'
    const color = low(v.Color) || 'brand'
    return `import { Badge } from "@/components/ui/badge"\n\n<Badge${style !== 'soft' ? ` variant="${style}"` : ''}${color !== 'brand' ? ` color="${color}"` : ''}${sizeProp(v)}>\n  ${v.Color ?? 'Brand'}\n</Badge>`
  },
  StatusBadge: (v) =>
    `import { StatusBadge } from "@/components/ui/badge"\n\n<StatusBadge status="${v.Status ?? 'Online'}" />`,
  Chip: (v) =>
    `import { Chip } from "@/components/ui/chip"\n\n<Chip${v.Selected === 'True' ? ' selected' : ''}${sizeProp(v)}${v.Dismissible === 'True' ? ' onRemove={remove}' : ''} onPressedChange={setSelected}>\n  Design tokens\n</Chip>`,
  Progress: () =>
    `import { Progress } from "@/components/ui/progress"\n\n<Progress label="Uploading…" value={60} />`,
  Spinner: (v) =>
    `import { Spinner } from "@/components/ui/spinner"\n\n<Spinner${sizeProp(v)} label="Loading…" />`,
  Icon: (v) =>
    `import { Icon } from "@/components/ui/icon"\n\n<Icon${sizeProp(v)}>\n  <House />\n</Icon>`,
  Rating: (v) =>
    `import { Rating } from "@/components/ui/rating"\n\n<Rating value={4}${v.Interactive === 'True' ? ' onValueChange={setScore}' : ''} star={<Star />} label="4.0 · 128 reviews" />`,
  FileFormat: (v) =>
    `import { FileFormat } from "@/components/ui/file-format"\n\n<FileFormat format="${v.Format ?? 'PDF'}" />`,
  Avatar: (v) =>
    `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"\n\n<Avatar${sizeProp(v)}>\n  <AvatarImage src={user.image} alt="Maya Duscenko" />\n  <AvatarFallback>MD</AvatarFallback>\n</Avatar>`,

  Textarea: (v) =>
    `import { TextareaField } from "@/components/ui/textarea"\n\n<TextareaField\n  label="Description"\n  hint="${v.State === 'Error' ? 'Description is required.' : 'Max 200 characters.'}"\n  maxLength={200}${v.State === 'Error' ? '\n  invalid' : ''}${v.State === 'Disabled' ? '\n  disabled' : ''}\n/>`,
  InputGroup: () =>
    `import {\n  InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton, InputGroupSeparator,\n} from "@/components/ui/input-group"\n\n<InputGroup>\n  <InputGroupAddon>https://</InputGroupAddon>\n  <InputGroupSeparator />\n  <InputGroupInput defaultValue="escala.design" />\n  <InputGroupSeparator />\n  <InputGroupButton>Copy</InputGroupButton>\n</InputGroup>`,
  InputOTP: (v) =>
    `import { InputOTP } from "@/components/ui/input-otp"\n\n<InputOTP length={6}${sizeProp(v)}${v.State === 'Error' ? ' invalid' : ''} onComplete={verify} />`,
  InputStepper: () =>
    `import { InputStepper } from "@/components/ui/input-stepper"\n\n<InputStepper defaultValue={12} min={0} max={99} />`,
  InputTag: () =>
    `import { InputTag } from "@/components/ui/input-tag"\n\n<InputTag defaultValue={["tokens", "figma"]} onValueChange={setTags} />`,
  Select: (v) =>
    `import {\n  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,\n} from "@/components/ui/select"\n\n<Select>\n  <SelectTrigger${sizeProp(v)}${v.State === 'Disabled' ? ' disabled' : ''}>\n    <SelectValue placeholder="Select an option" />\n  </SelectTrigger>\n  <SelectContent>\n    <SelectItem value="design">Design</SelectItem>\n    <SelectItem value="engineering">Engineering</SelectItem>\n  </SelectContent>\n</Select>`,
  Combobox: () =>
    `import { Combobox } from "@/components/ui/combobox"\n\n<Combobox\n  options={[{ label: "Inter", value: "inter" }, { label: "Poppins", value: "poppins" }]}\n  placeholder="Search fonts…"\n  onValueChange={setFont}\n/>`,
  Checkbox: (v) =>
    `import { Checkbox } from "@/components/ui/checkbox"\n\n<Checkbox${v.Checked === 'False' ? '' : ' defaultChecked'}${sizeProp(v)}${v.State === 'Disabled' ? ' disabled' : ''} label="Remember me" />`,
  CheckboxGroup: () =>
    `import { Checkbox, CheckboxGroup } from "@/components/ui/checkbox"\n\n<CheckboxGroup legend="Notify me about">\n  <Checkbox label="Comments on my files" defaultChecked />\n  <Checkbox label="New team members" />\n</CheckboxGroup>`,
  Radio: (v) =>
    `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"\n\n<RadioGroup${v.Checked === 'False' ? '' : ' defaultValue="monthly"'}>\n  <RadioGroupItem value="monthly" label="Monthly billing"${sizeProp(v)}${v.State === 'Disabled' ? ' disabled' : ''} />\n</RadioGroup>`,
  RadioGroup: () =>
    `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"\n\n<RadioGroup legend="Billing period" defaultValue="monthly">\n  <RadioGroupItem value="monthly" label="Monthly billing" />\n  <RadioGroupItem value="yearly" label="Yearly billing" />\n</RadioGroup>`,
  Toggle: (v) =>
    `import { Switch } from "@/components/ui/switch"\n\n<Switch${v.On === 'False' ? '' : ' defaultChecked'}${sizeProp(v)}${v.State === 'Disabled' ? ' disabled' : ''} label="Notifications" />`,
  SwitchGroup: () =>
    `import { Switch, SwitchGroup, SwitchGroupRow } from "@/components/ui/switch"\n\n<SwitchGroup legend="Notifications">\n  <SwitchGroupRow label="Email notifications">\n    <Switch defaultChecked aria-label="Email notifications" />\n  </SwitchGroupRow>\n</SwitchGroup>`,
  Slider: () =>
    `import { Slider } from "@/components/ui/slider"\n\n<Slider label="Border radius" defaultValue={60} onValueChange={setRadius} />`,
  FileUpload: () =>
    `import { FileUpload, FileUploadFile } from "@/components/ui/file-upload"\n\n<FileUpload>\n  <Button variant="outline">Upload file</Button>\n  <FileUploadFile name="brand-guide.pdf" kind="PDF" progress={80} />\n</FileUpload>`,
  Dropzone: (v) =>
    `import { Dropzone } from "@/components/ui/file-upload"\n\n<Dropzone\n  title="Click to upload or drag and drop"\n  hint="${v.State === 'Error' ? 'File exceeds the 10MB limit.' : 'SVG, PNG or PDF (max. 10MB)'}"\n  onFiles={upload}${v.State && v.State !== 'Default' ? `\n  forceState="${v.State}"` : ''}\n/>`,
  Field: () =>
    `import { Field } from "@/components/ui/label"\n\n<Field label="Workspace name" required description="Shown to your teammates.">\n  <InputField defaultValue="Acme Inc." />\n</Field>`,
  Label: (v) =>
    `import { Label } from "@/components/ui/label"\n\n<Label${v.Required === 'True' ? ' required' : ''} htmlFor="email">Email address</Label>`,
  PasswordStrength: (v) =>
    `import { PasswordStrength } from "@/components/ui/password-strength"\n\n<PasswordStrength${v.Strength ? ` strength="${v.Strength}"` : ''} value={password}>\n  <InputField type="password" value={password} onChange={onChange} />\n</PasswordStrength>`,

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
