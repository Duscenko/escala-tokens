/**
 * Usage snippets for the shadcn-skeleton components. They show the API a
 * product actually imports (`@/components/ui/button` …): shadcn's anatomy,
 * prop names and variant values. Nothing here names a prop the component in
 * `escala-ui/` lacks.
 */
import type { AxisValues, IconOpts } from '../specimens'
import { ICON_COMPONENT, ICON_SLOTS, INPUT_META, buttonLeadingConcept } from '../specimens'

type Snippet = (v: AxisValues, icons?: IconOpts) => string

const low = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, '-')
/** ` size="…"` only for a non-default size — keeps snippets lean. */
const sizeProp = (v: AxisValues) => (v.Size && low(v.Size) !== 'md' ? ` size="${low(v.Size)}"` : '')

export const SKELETON_SNIPPETS: Record<string, Snippet> = {
  Tabs: () =>
    `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"\n\n<Tabs defaultValue="overview">\n  <TabsList>\n    <TabsTrigger value="overview">Overview</TabsTrigger>\n    <TabsTrigger value="tokens">Tokens</TabsTrigger>\n  </TabsList>\n  <TabsContent value="overview">…</TabsContent>\n</Tabs>`,
  TabMenu: () =>
    `import { TabMenu } from "@/components/ui/tab-menu"\n\n<TabMenu items={["All", "Drafts", "Published"]} onValueChange={setView} />`,
  SegmentedControl: (v) =>
    `import { SegmentedControl } from "@/components/ui/segmented-control"\n\n<SegmentedControl options={["List", "Board", "Timeline"]}${sizeProp(v)} onValueChange={setView} />`,
  Breadcrumb: () =>
    `import {\n  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,\n} from "@/components/ui/breadcrumb"\n\n<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Design tokens</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>`,
  Pagination: () =>
    `import { Pagination } from "@/components/ui/pagination"\n\n<Pagination pages={[1, 2, 3, "…", 8]} page={page} onPageChange={setPage} />`,
  Stepper: () =>
    `import { Stepper } from "@/components/ui/stepper"\n\n<Stepper steps={["Account", "Tokens", "Publish"]} current={2} />`,
  DropdownMenu: () =>
    `import {\n  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,\n} from "@/components/ui/dropdown-menu"\n\n<DropdownMenu>\n  <DropdownMenuTrigger asChild><Button variant="outline">Options</Button></DropdownMenuTrigger>\n  <DropdownMenuContent>\n    <DropdownMenuItem>Duplicate</DropdownMenuItem>\n    <DropdownMenuSeparator />\n    <DropdownMenuItem variant="danger">Delete</DropdownMenuItem>\n  </DropdownMenuContent>\n</DropdownMenu>`,
  ContextMenu: () =>
    `import {\n  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuShortcut,\n} from "@/components/ui/context-menu"\n\n<ContextMenu>\n  <ContextMenuTrigger>Right-click here</ContextMenuTrigger>\n  <ContextMenuContent>\n    <ContextMenuItem>Copy <ContextMenuShortcut>⌘C</ContextMenuShortcut></ContextMenuItem>\n  </ContextMenuContent>\n</ContextMenu>`,
  Command: () =>
    `import {\n  Command, CommandInput, CommandList, CommandGroup, CommandItem,\n} from "@/components/ui/command"\n\n<Command>\n  <CommandInput placeholder="Type a command…" />\n  <CommandList>\n    <CommandGroup heading="Actions">\n      <CommandItem onSelect={openColor}>Open Color foundation</CommandItem>\n    </CommandGroup>\n  </CommandList>\n</Command>`,
  Navbar: () =>
    `import { Navbar } from "@/components/ui/navbar"\n\n<Navbar\n  links={[{ label: "Home", current: true }, { label: "Tokens" }, { label: "Docs" }]}\n  trailing="MD"\n/>`,
  Sidebar: () =>
    `import { Sidebar } from "@/components/ui/sidebar"\n\n<Sidebar\n  items={[{ label: "Overview", icon: <Home /> }, { label: "Tokens", icon: <Palette /> }]}\n  defaultValue="Tokens"\n  onValueChange={navigate}\n/>`,

  Alert: (v) =>
    `import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"\n\n<Alert${v.Variant === 'destructive' ? ' variant="destructive"' : ''}>\n  <${v.Variant === 'destructive' ? 'CircleAlert' : 'Info'} />\n  <AlertTitle>${v.Variant === 'destructive' ? 'Export failed' : 'Heads up'}</AlertTitle>\n  <AlertDescription>${v.Variant === 'destructive' ? 'Check the token names and try again.' : 'Semantic tokens re-derive when the accent changes.'}</AlertDescription>\n</Alert>`,
  Sonner: (v) => {
    const type = v.Type && v.Type !== 'default' ? `.${v.Type}` : ''
    return `import { Toaster } from "@/components/ui/sonner"\nimport { toast } from "sonner"\n\n// once, at the root of the app\n<Toaster />\n\n// anywhere\ntoast${type}("Changes saved", { description: "Your tokens are up to date." })`
  },

  Divider: (v) =>
    `import { Separator } from "@/components/ui/separator"\n\n<Separator${v.Orientation === 'Vertical' ? ' orientation="vertical"' : ''} />`,
  Accordion: () =>
    `import {\n  Accordion, AccordionItem, AccordionTrigger, AccordionContent,\n} from "@/components/ui/accordion"\n\n<Accordion type="single" collapsible defaultValue="a">\n  <AccordionItem value="a">\n    <AccordionTrigger>What are design tokens?</AccordionTrigger>\n    <AccordionContent>Named values for color, type and spacing.</AccordionContent>\n  </AccordionItem>\n</Accordion>`,
  AspectRatio: (v) =>
    `import { AspectRatio } from "@/components/ui/aspect-ratio"\n\n<AspectRatio ratio="${v.Ratio ?? '16:9'}">\n  <img src={cover} alt="" />\n</AspectRatio>`,
  Popover: () =>
    `import {\n  Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription,\n} from "@/components/ui/popover"\n\n<Popover>\n  <PopoverTrigger asChild><Button variant="outline">Share</Button></PopoverTrigger>\n  <PopoverContent>\n    <PopoverTitle>Share this system</PopoverTitle>\n    <PopoverDescription>Anyone with the link can view tokens and docs.</PopoverDescription>\n  </PopoverContent>\n</Popover>`,
  Tooltip: () =>
    `import {\n  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,\n} from "@/components/ui/tooltip"\n\n<TooltipProvider>\n  <Tooltip>\n    <TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy /></Button></TooltipTrigger>\n    <TooltipContent>Copy to clipboard</TooltipContent>\n  </Tooltip>\n</TooltipProvider>`,
  InfoTooltip: () =>
    `import { InfoTooltip, TooltipProvider } from "@/components/ui/tooltip"\n\n<TooltipProvider>\n  <InfoTooltip content="Applies to new projects only." icon={<Info />}>\n    Default visibility\n  </InfoTooltip>\n</TooltipProvider>`,
  ScrollArea: () =>
    `import { ScrollArea, ScrollAreaRow } from "@/components/ui/scroll-area"\n\n<ScrollArea style={{ height: 150 }}>\n  {tokens.map((t) => <ScrollAreaRow key={t}>{t}</ScrollAreaRow>)}\n</ScrollArea>`,

  Badge: (v) =>
    `import { Badge } from "@/components/ui/badge"\n\n<Badge${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''}>Badge</Badge>`,
  StatusBadge: (v) =>
    `import { StatusBadge } from "@/components/ui/badge"\n\n<StatusBadge status="${v.Status ?? 'Online'}" />`,
  Chip: (v) =>
    `import { Chip } from "@/components/ui/chip"\n\n<Chip${v.Selected === 'True' ? ' selected' : ''}${sizeProp(v)}${v.Dismissible === 'True' ? ' onRemove={remove}' : ''} onPressedChange={setSelected}>\n  Design tokens\n</Chip>`,
  Progress: () =>
    `import { Progress } from "@/components/ui/progress"\n\n<Progress label="Uploading…" value={60} />`,
  Spinner: () =>
    `import { Spinner } from "@/components/ui/spinner"\n\n<Spinner />  // size it with a class: <Spinner className="size-6" />`,
  Icon: (v) =>
    `import { Icon } from "@/components/ui/icon"\n\n<Icon${sizeProp(v)}>\n  <House />\n</Icon>`,
  Rating: (v) =>
    `import { Rating } from "@/components/ui/rating"\n\n<Rating value={4}${v.Interactive === 'True' ? ' onValueChange={setScore}' : ''} star={<Star />} label="4.0 · 128 reviews" />`,
  FileFormat: (v) =>
    `import { FileFormat } from "@/components/ui/file-format"\n\n<FileFormat format="${v.Format ?? 'PDF'}" />`,
  Avatar: (v) =>
    `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"\n\n<Avatar${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}>\n  <AvatarImage src={user.image} alt="Maya Duscenko" />\n  <AvatarFallback>MD</AvatarFallback>\n</Avatar>`,

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
    `import { Button } from "@/components/ui/button"\nimport { ButtonGroup } from "@/components/ui/button-group"\n\n<ButtonGroup${v.Orientation === 'vertical' ? ' orientation="vertical"' : ''} aria-label="Range">\n  <Button variant="outline">Day</Button>\n  <Button variant="outline">Week</Button>\n  <Button variant="outline">Month</Button>\n</ButtonGroup>`,
  SocialLoginButton: (v) =>
    `import { SocialLoginButton } from "@/components/ui/social-login-button"\n\n<SocialLoginButton provider="${v.Provider ?? 'Google'}"${v.Size === 'LG' ? ' size="lg"' : ''} />`,
  AppStoreBadge: (v) =>
    `import { AppStoreBadge } from "@/components/ui/app-store-badge"\n\n<AppStoreBadge store="${v.Store ?? 'App Store'}" href={storeUrl} />`,
  Button: (v, icons) => {
    const variant = v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const iconOnly = (v.Size ?? '').startsWith('icon')
    const flags = `${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Loading' ? ' loading' : ''}`
    if (iconOnly) {
      return `import { Button } from "@/components/ui/button"\n\n<Button${variant}${size}${flags} aria-label="Add">\n  <${ICON_COMPONENT[icons?.leadingConcept ?? ICON_SLOTS.Button.leading]} />\n</Button>`
    }
    const lead = icons?.leading ? `  <${ICON_COMPONENT[icons.leadingConcept ?? buttonLeadingConcept(v.Variant)]} />\n` : ''
    const trail = icons?.trailing ? `\n  <${ICON_COMPONENT[ICON_SLOTS.Button.trailing]} />` : ''
    return `import { Button } from "@/components/ui/button"\n\n<Button${variant}${size}${flags}>\n${lead}  Button${trail}\n</Button>`
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
    `import {\n  Dialog, DialogContent, DialogHeader, DialogTitle,\n  DialogDescription, DialogFooter,\n} from "@/components/ui/dialog"\n\n<Dialog open={open} onOpenChange={setOpen}>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Delete project?</DialogTitle>\n      <DialogDescription>This action can't be undone.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter>\n      <Button variant="outline">Cancel</Button>\n      <Button variant="destructive">Delete</Button>\n    </DialogFooter>\n  </DialogContent>\n</Dialog>`,
}
