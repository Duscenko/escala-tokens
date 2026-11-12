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
const sizeProp = (v: AxisValues) => (v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '')

export const SKELETON_SNIPPETS: Record<string, Snippet> = {
  Tabs: (v) =>
    `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"\n\n<Tabs defaultValue="overview">\n  <TabsList${v.Variant === 'line' ? ' variant="line"' : ''}>\n    <TabsTrigger value="overview">Overview</TabsTrigger>\n    <TabsTrigger value="tokens">Tokens</TabsTrigger>\n  </TabsList>\n  <TabsContent value="overview">…</TabsContent>\n</Tabs>`,
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
    `import {\n  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,\n} from "@/components/ui/dropdown-menu"\n\n<DropdownMenu>\n  <DropdownMenuTrigger asChild><Button variant="outline">Options</Button></DropdownMenuTrigger>\n  <DropdownMenuContent>\n    <DropdownMenuItem>Duplicate</DropdownMenuItem>\n    <DropdownMenuSeparator />\n    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>\n  </DropdownMenuContent>\n</DropdownMenu>`,
  ContextMenu: () =>
    `import {\n  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuShortcut,\n} from "@/components/ui/context-menu"\n\n<ContextMenu>\n  <ContextMenuTrigger>Right-click here</ContextMenuTrigger>\n  <ContextMenuContent>\n    <ContextMenuItem>Copy <ContextMenuShortcut>⌘C</ContextMenuShortcut></ContextMenuItem>\n  </ContextMenuContent>\n</ContextMenu>`,
  Command: () =>
    `import {\n  Command, CommandInput, CommandList, CommandGroup, CommandItem,\n} from "@/components/ui/command"\n\n<Command>\n  <CommandInput placeholder="Type a command…" />\n  <CommandList>\n    <CommandGroup heading="Actions">\n      <CommandItem onSelect={openColor}>Open Color foundation</CommandItem>\n    </CommandGroup>\n  </CommandList>\n</Command>`,
  Navbar: () =>
    `import { Navbar } from "@/components/ui/navbar"\n\n<Navbar\n  links={[{ label: "Home", current: true }, { label: "Tokens" }, { label: "Docs" }]}\n  trailing="MD"\n/>`,
  Sidebar: (v) =>
    `import {\n  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,\n  SidebarMenu, SidebarMenuItem, SidebarMenuButton,\n} from "@/components/ui/sidebar"\n\n<Sidebar${v.Variant && v.Variant !== 'sidebar' ? ` variant="${v.Variant}"` : ''}>\n  <SidebarContent>\n    <SidebarGroup>\n      <SidebarGroupLabel>Workspace</SidebarGroupLabel>\n      <SidebarMenu>\n        <SidebarMenuItem>\n          <SidebarMenuButton isActive><Palette /><span>Tokens</span></SidebarMenuButton>\n        </SidebarMenuItem>\n      </SidebarMenu>\n    </SidebarGroup>\n  </SidebarContent>\n</Sidebar>`,

  Alert: (v) =>
    `import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"\n\n<Alert${v.Variant === 'destructive' ? ' variant="destructive"' : ''}>\n  <${v.Variant === 'destructive' ? 'CircleAlert' : 'Info'} />\n  <AlertTitle>${v.Variant === 'destructive' ? 'Export failed' : 'Heads up'}</AlertTitle>\n  <AlertDescription>${v.Variant === 'destructive' ? 'Check the token names and try again.' : 'Semantic tokens re-derive when the accent changes.'}</AlertDescription>\n</Alert>`,
  Sonner: (v) => {
    const type = v.Type && v.Type !== 'default' ? `.${v.Type}` : ''
    return `import { Toaster } from "@/components/ui/sonner"\nimport { toast } from "sonner"\n\n// once, at the root of the app\n<Toaster />\n\n// anywhere\ntoast${type}("Changes saved", { description: "Your tokens are up to date." })`
  },

  ToggleGroup: (v) =>
    `import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"\n\n<ToggleGroup type="multiple"${v.Variant === 'outline' ? ' variant="outline"' : ''}${sizeProp(v)}>\n  <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>\n  <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>\n  <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>\n</ToggleGroup>`,
  NativeSelect: (v) =>
    `import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"\n\n<NativeSelect${sizeProp(v)}${v.State === 'Disabled' ? ' disabled' : ''} aria-label="Team">\n  <NativeSelectOption value="design">Design</NativeSelectOption>\n  <NativeSelectOption value="engineering">Engineering</NativeSelectOption>\n</NativeSelect>`,
  Kbd: () =>
    `import { Kbd, KbdGroup } from "@/components/ui/kbd"\n\n<KbdGroup>\n  <Kbd>⌘</Kbd>\n  <Kbd>K</Kbd>\n</KbdGroup>`,
  Skeleton: () =>
    `import { Skeleton } from "@/components/ui/skeleton"\n\n<div aria-busy="true" className="flex items-center gap-3">\n  <Skeleton className="size-10 rounded-full" />\n  <Skeleton className="h-3.5 w-[200px]" />\n</div>`,
  Empty: (v) =>
    `import {\n  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,\n} from "@/components/ui/empty"\n\n<Empty>\n  <EmptyHeader>\n    <EmptyMedia${v.Media === 'icon' ? ' variant="icon"' : ''}><Package /></EmptyMedia>\n    <EmptyTitle>No projects yet</EmptyTitle>\n    <EmptyDescription>Create your first project to start.</EmptyDescription>\n  </EmptyHeader>\n  <EmptyContent><Button size="sm">Create project</Button></EmptyContent>\n</Empty>`,
  Collapsible: (v) =>
    `import {\n  Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleItem,\n} from "@/components/ui/collapsible"\n\n<Collapsible${v.Open === 'True' ? ' defaultOpen' : ''}>\n  <CollapsibleTrigger>3 starred repositories</CollapsibleTrigger>\n  <CollapsibleItem>escala/tokens</CollapsibleItem>\n  <CollapsibleContent>\n    <CollapsibleItem>escala/figma-plugin</CollapsibleItem>\n  </CollapsibleContent>\n</Collapsible>`,
  Table: () =>
    `import {\n  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption,\n} from "@/components/ui/table"\n\n<Table>\n  <TableCaption>Recent invoices.</TableCaption>\n  <TableHeader>\n    <TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead></TableRow>\n  </TableHeader>\n  <TableBody>\n    <TableRow><TableCell>INV001</TableCell><TableCell>$250.00</TableCell></TableRow>\n  </TableBody>\n</Table>`,

  Toggle: (v) =>
    `import { Toggle } from "@/components/ui/toggle"\n\n<Toggle${v.Variant === 'outline' ? ' variant="outline"' : ''}${sizeProp(v)}${v.Pressed === 'True' ? ' defaultPressed' : ''} aria-label="Bold">\n  <Bold />\n</Toggle>`,
  Calendar: (v) =>
    v.Mode === 'range'
      ? `import { Calendar } from "@/components/ui/calendar"\n\nconst [range, setRange] = useState<CalendarValue>()\n\n<Calendar${v.Size === 'sm' ? ' size="sm"' : ''} mode="range"${v.Header && v.Header !== 'single' ? ` header="${v.Header}"` : ''} presets footer value={range} onValueChange={setRange} />`
      : `import { Calendar } from "@/components/ui/calendar"\n\nconst [value, setValue] = useState<CalendarValue>(new Date())\n\n<Calendar${v.Size === 'sm' ? ' size="sm"' : ''}${v.Mode === 'multiple' ? ' mode="multiple"' : ''}${v.Header && v.Header !== 'single' ? ` header="${v.Header}"` : ''} value={value} onValueChange={setValue} />`,
  AlertDialog: (v) =>
    `import {\n  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,\n  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,\n} from "@/components/ui/alert-dialog"\n\n<AlertDialog>\n  <AlertDialogTrigger asChild><Button variant="outline">Delete</Button></AlertDialogTrigger>\n  <AlertDialogContent${v.Size === 'sm' ? ' size="sm"' : ''}>\n    <AlertDialogHeader>\n      <AlertDialogTitle>Delete this project?</AlertDialogTitle>\n      <AlertDialogDescription>You can't undo this.</AlertDialogDescription>\n    </AlertDialogHeader>\n    <AlertDialogFooter>\n      <AlertDialogCancel>Cancel</AlertDialogCancel>\n      <AlertDialogAction variant="destructive">Delete</AlertDialogAction>\n    </AlertDialogFooter>\n  </AlertDialogContent>\n</AlertDialog>`,
  Sheet: (v) =>
    `import {\n  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,\n} from "@/components/ui/sheet"\n\n<Sheet>\n  <SheetTrigger asChild><Button variant="outline">Edit profile</Button></SheetTrigger>\n  <SheetContent${v.Side && v.Side !== 'right' ? ` side="${v.Side}"` : ''}>\n    <SheetHeader>\n      <SheetTitle>Edit profile</SheetTitle>\n      <SheetDescription>Make changes to your profile here.</SheetDescription>\n    </SheetHeader>\n    <SheetFooter><Button>Save changes</Button></SheetFooter>\n  </SheetContent>\n</Sheet>`,
  Drawer: (v) =>
    `import {\n  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,\n} from "@/components/ui/drawer"\n\n<Drawer${v.Direction && v.Direction !== 'bottom' ? ` direction="${v.Direction}"` : ''}>\n  <DrawerTrigger asChild><Button variant="outline">Open</Button></DrawerTrigger>\n  <DrawerContent>\n    <DrawerHeader>\n      <DrawerTitle>Move goal</DrawerTitle>\n      <DrawerDescription>Set your daily activity goal.</DrawerDescription>\n    </DrawerHeader>\n    <DrawerFooter>\n      <Button>Submit</Button>\n      <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>\n    </DrawerFooter>\n  </DrawerContent>\n</Drawer>`,
  HoverCard: () =>
    `import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"\n\n<HoverCard>\n  <HoverCardTrigger asChild><Button variant="link">@escala</Button></HoverCardTrigger>\n  <HoverCardContent>Design tokens and components for Figma and code.</HoverCardContent>\n</HoverCard>`,
  Item: (v) =>
    `import {\n  Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions,\n} from "@/components/ui/item"\n\n<Item${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''}${sizeProp(v)}>\n  <ItemMedia variant="icon"><ShieldCheck /></ItemMedia>\n  <ItemContent>\n    <ItemTitle>Two-factor authentication</ItemTitle>\n    <ItemDescription>Verify sign-ins with a code from your phone.</ItemDescription>\n  </ItemContent>\n  <ItemActions><Button size="sm" variant="outline">Enable</Button></ItemActions>\n</Item>`,
  Attachment: (v) =>
    `import {\n  Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription,\n  AttachmentActions, AttachmentAction,\n} from "@/components/ui/attachment"\n\n<Attachment${v.State && v.State !== 'done' ? ` state="${v.State}"` : ''}${sizeProp(v)}${v.Orientation === 'vertical' ? ' orientation="vertical"' : ''}>\n  <AttachmentMedia><File /></AttachmentMedia>\n  <AttachmentContent>\n    <AttachmentTitle>brand-tokens.json</AttachmentTitle>\n    <AttachmentDescription>2.4 MB</AttachmentDescription>\n  </AttachmentContent>\n  <AttachmentActions><AttachmentAction aria-label="Remove"><X /></AttachmentAction></AttachmentActions>\n</Attachment>`,
  Message: (v) =>
    `import { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter } from "@/components/ui/message"\nimport { Bubble, BubbleContent } from "@/components/ui/bubble"\n\n<Message${v.Align === 'end' ? ' align="end"' : ''}>\n  <MessageAvatar>AI</MessageAvatar>\n  <MessageContent>\n    <MessageHeader>Escala · 10:42</MessageHeader>\n    <Bubble variant="muted"><BubbleContent>Done — Boxes moved to 24px.</BubbleContent></Bubble>\n    <MessageFooter>Delivered</MessageFooter>\n  </MessageContent>\n</Message>`,
  Bubble: (v) =>
    `import { Bubble, BubbleContent } from "@/components/ui/bubble"\n\n<Bubble${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''}${v.Align === 'end' ? ' align="end"' : ''}>\n  <BubbleContent>Ship the new radius to Figma today?</BubbleContent>\n</Bubble>`,
  Resizable: (v) =>
    `import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"\n\n<ResizablePanelGroup orientation="${v.Orientation ?? 'horizontal'}">\n  <ResizablePanel defaultSize={50}>One</ResizablePanel>\n  <ResizableHandle withHandle />\n  <ResizablePanel defaultSize={50}>Two</ResizablePanel>\n</ResizablePanelGroup>`,
  Carousel: (v) =>
    `import {\n  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,\n} from "@/components/ui/carousel"\n\n<Carousel${v.Orientation === 'vertical' ? ' orientation="vertical"' : ''}>\n  <CarouselContent>\n    {slides.map((s) => <CarouselItem key={s.id}>{s.content}</CarouselItem>)}\n  </CarouselContent>\n  <CarouselPrevious />\n  <CarouselNext />\n</Carousel>`,
  Chart: (v) => {
    const kind = v.Type === 'line' ? 'Line' : v.Type === 'area' ? 'Area' : 'Bar'
    const mark = kind === 'Bar' ? `<Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />` : `<${kind} dataKey="desktop" type="monotone" stroke="var(--color-desktop)"${kind === 'Area' ? ' fill="var(--color-desktop)" fillOpacity={0.4}' : ''} />`
    return `import { ${kind}, ${kind}Chart, CartesianGrid, XAxis } from "recharts"\nimport { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"\n\nconst config = { desktop: { label: "Desktop", color: "var(--chart-1)" } } satisfies ChartConfig\n\n<ChartContainer config={config}>\n  <${kind}Chart accessibilityLayer data={data}>\n    <CartesianGrid vertical={false} />\n    <XAxis dataKey="month" tickLine={false} axisLine={false} />\n    <ChartTooltip content={<ChartTooltipContent />} />\n    ${mark}\n  </${kind}Chart>\n</ChartContainer>`
  },
  Menubar: () =>
    `import {\n  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator, MenubarShortcut,\n} from "@/components/ui/menubar"\n\n<Menubar>\n  <MenubarMenu>\n    <MenubarTrigger>File</MenubarTrigger>\n    <MenubarContent>\n      <MenubarItem>New tab <MenubarShortcut>⌘T</MenubarShortcut></MenubarItem>\n      <MenubarSeparator />\n      <MenubarItem variant="destructive">Close all</MenubarItem>\n    </MenubarContent>\n  </MenubarMenu>\n</Menubar>`,
  NavigationMenu: () =>
    `import {\n  NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger,\n  NavigationMenuContent, NavigationMenuLink,\n} from "@/components/ui/navigation-menu"\n\n<NavigationMenu>\n  <NavigationMenuList>\n    <NavigationMenuItem>\n      <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>\n      <NavigationMenuContent>\n        <NavigationMenuLink href="/docs">Introduction</NavigationMenuLink>\n      </NavigationMenuContent>\n    </NavigationMenuItem>\n  </NavigationMenuList>\n</NavigationMenu>`,

  Separator: (v) =>
    `import { Separator } from "@/components/ui/separator"\n\n<Separator${v.Orientation === 'vertical' ? ' orientation="vertical"' : ''} />`,
  Accordion: () =>
    `import {\n  Accordion, AccordionItem, AccordionTrigger, AccordionContent,\n} from "@/components/ui/accordion"\n\n<Accordion type="single" collapsible defaultValue="a">\n  <AccordionItem value="a">\n    <AccordionTrigger>What are design tokens?</AccordionTrigger>\n    <AccordionContent>Named values for color, type and spacing.</AccordionContent>\n  </AccordionItem>\n</Accordion>`,
  AspectRatio: (v) =>
    `import { AspectRatio } from "@/components/ui/aspect-ratio"\n\n<AspectRatio ratio="${v.Ratio ?? '16:9'}">\n  <img src={cover} alt="" />\n</AspectRatio>`,
  Popover: () =>
    `import {\n  Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription,\n} from "@/components/ui/popover"\n\n<Popover>\n  <PopoverTrigger asChild><Button variant="outline">Share</Button></PopoverTrigger>\n  <PopoverContent>\n    <PopoverTitle>Share this system</PopoverTitle>\n    <PopoverDescription>Anyone with the link can view tokens and docs.</PopoverDescription>\n  </PopoverContent>\n</Popover>`,
  Tooltip: () =>
    `import {\n  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,\n} from "@/components/ui/tooltip"\n\n<TooltipProvider>\n  <Tooltip>\n    <TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Copy"><Copy /></Button></TooltipTrigger>\n    <TooltipContent>Copy to clipboard</TooltipContent>\n  </Tooltip>\n</TooltipProvider>`,
  ScrollArea: () =>
    `import { ScrollArea, ScrollAreaRow } from "@/components/ui/scroll-area"\n\n<ScrollArea style={{ height: 150 }}>\n  {tokens.map((t) => <ScrollAreaRow key={t}>{t}</ScrollAreaRow>)}\n</ScrollArea>`,

  Badge: (v) =>
    `import { Badge } from "@/components/ui/badge"\n\n<Badge${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''}>Badge</Badge>`,
  StatusBadge: (v) =>
    `import { StatusBadge } from "@/components/ui/badge"\n\n<StatusBadge status="${v.Status ?? 'online'}" />`,
  Chip: (v) =>
    `import { Chip } from "@/components/ui/chip"\n\n<Chip${v.Selected === 'True' ? ' selected' : ''}${sizeProp(v)}${v.Dismissible === 'True' ? ' onRemove={remove}' : ''} onPressedChange={setSelected}>\n  Design tokens\n</Chip>`,
  Progress: () =>
    `import { Progress } from "@/components/ui/progress"\n\n<Progress label="Uploading…" value={60} />`,
  Spinner: () =>
    `import { Spinner } from "@/components/ui/spinner"\n\n<Spinner />  // size it with a class: <Spinner className="size-6" />`,
  Icon: (v) =>
    `import { Icon } from "@/components/ui/icon"\n\n<Icon${sizeProp(v)}>\n  <House />\n</Icon>`,
  Rating: (v) =>
    `import { Rating } from "@/components/ui/rating"\n\n<Rating value={4}${v.Interactive === 'True' ? ' onValueChange={setScore}' : ''} star={<Star />} starOn={<Star weight="fill" />} label="4.0 · 128 reviews" />`,
  FileFormat: (v) =>
    `import { FileFormat } from "@/components/ui/file-format"\n\n<FileFormat format="${v.Format ?? 'pdf'}" />`,
  Avatar: (v) =>
    `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"\n\n<Avatar${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}>\n  <AvatarImage src={user.image} alt="Maya Duscenko" />\n  <AvatarFallback>MD</AvatarFallback>\n</Avatar>`,

  Textarea: (v) => {
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const state = v.State === 'Invalid' ? '\n  aria-invalid' : v.State === 'Loading' ? '\n  loading' : v.State === 'Disabled' ? '\n  disabled' : ''
    return `import { Textarea } from "@/components/ui/textarea"\n\n<Textarea${size}\n  placeholder="Write a message…"${state}\n/>`
  },
  DatePickerTrigger: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.State === 'Invalid' ? ' aria-invalid' : '', v.State === 'Disabled' ? ' disabled' : '', v.State === 'Loading' ? ' loading' : ''].join('')
    return `import { DatePickerTrigger } from "@/components/ui/date-picker"\n\n<DatePickerTrigger${attrs}${v.Value === 'filled' ? ' valueText={date}' : ''} onClick={openPicker} />`
  },
  CalendarDay: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Variant === 'secondary' ? ' variant="secondary"' : '', v.State && v.State !== 'Default' && v.State !== 'Hover' && v.State !== 'Focused' ? ` state="${v.State}"` : ''].join('')
    return `import { CalendarDay } from "@/components/ui/calendar"\n\n<CalendarDay${attrs}>15</CalendarDay>`
  },
  CalendarFooter: (v) => {
    const attrs = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    return `import { CalendarFooter } from "@/components/ui/calendar"\n\n<CalendarFooter${attrs} onToday={goToToday} onClear={clear} onApply={apply} />`
  },
  CalendarPresets: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Variant === 'secondary' ? ' variant="secondary"' : ''].join('')
    return `import { CalendarPresets } from "@/components/ui/calendar"\n\n<CalendarPresets${attrs} selected={preset} onSelect={applyPreset} />`
  },
  CalendarMonth: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Mode && v.Mode !== 'single' ? ` mode="${v.Mode}"` : '', v.Variant === 'secondary' ? ' variant="secondary"' : ''].join('')
    return `import { CalendarMonth } from "@/components/ui/calendar"\n\n<CalendarMonth${attrs} month={month} selected={selected} onDayClick={pick} />`
  },
  CalendarHeader: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Header && v.Header !== 'single' ? ` header="${v.Header}"` : ''].join('')
    return `import { CalendarHeader } from "@/components/ui/calendar"\n\n<CalendarHeader${attrs} label="November 2026" onPreviousMonth={prev} onNextMonth={next} />`
  },
  DatePickerPopover: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Mode === 'range' ? ' mode="range"' : ''].join('')
    return `import { Popover, PopoverTrigger } from "@/components/ui/popover"\nimport { DatePickerPopover, DatePickerTrigger } from "@/components/ui/date-picker"\nimport { Calendar } from "@/components/ui/calendar"\n\n<Popover>\n  <PopoverTrigger asChild><DatePickerTrigger valueText={date} /></PopoverTrigger>\n  <DatePickerPopover${attrs}>\n    <Calendar${v.Size === 'sm' ? ' size="sm"' : ''} mode="${v.Mode ?? 'single'}"${v.Mode === 'range' ? ' presets' : ''} footer value={${v.Mode === 'range' ? 'range' : 'date'}} onValueChange={${v.Mode === 'range' ? 'setRange' : 'setDate'}} onApply={close} />\n  </DatePickerPopover>\n</Popover>`
  },
  InputGroup: () =>
    `import {\n  InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton, InputGroupSeparator,\n} from "@/components/ui/input-group"\n\n<InputGroup>\n  <InputGroupAddon>https://</InputGroupAddon>\n  <InputGroupSeparator />\n  <InputGroupInput defaultValue="escala.design" />\n  <InputGroupSeparator />\n  <InputGroupButton>Copy</InputGroupButton>\n</InputGroup>`,
  InputOTP: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Variant && v.Variant !== 'outline' ? ` variant="${v.Variant}"` : '', v.State === 'Invalid' ? ' aria-invalid' : '', v.State === 'Disabled' ? ' disabled' : ''].join('')
    return `import { InputOTP } from "@/components/ui/input-otp"\n\n<InputOTP length={${v.Length ?? 6}}${attrs} value={code} onChange={setCode} aria-label="Verification code" />`
  },
  InputOTPSlot: (v) =>
    `import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"\n\n<InputOTP length={4}${v.Variant && v.Variant !== 'outline' ? ` variant="${v.Variant}"` : ''} value={code} onChange={setCode}>\n  <InputOTPGroup>\n    <InputOTPSlot index={0} />\n    <InputOTPSlot index={1} />\n    <InputOTPSlot index={2} />\n    <InputOTPSlot index={3} />\n  </InputOTPGroup>\n</InputOTP>`,
  NumberInput: (v) =>
    `import { NumberInput } from "@/components/ui/number-input"\n\n<NumberInput aria-label="Quantity"${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''} defaultValue={12} min={0} max={99}${v.State === 'Disabled' ? ' disabled' : v.State === 'Invalid' ? ' aria-invalid' : ''} />`,
  InputTag: (v) => {
    const attrs = [v.Layout === 'outside' ? ' layout="outside"' : '', v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.State === 'Invalid' ? ' aria-invalid' : '', v.State === 'Disabled' ? ' disabled' : '', v.State === 'Loading' ? ' loading' : ''].join('')
    return `import { InputTag } from "@/components/ui/input-tag"\n\n<InputTag aria-label="Tags"${attrs} placeholder="Add tag…" value={tags} onValueChange={setTags} />`
  },
  InputTagChip: (v) => {
    const attrs = [v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '', v.Variant === 'critical' ? ' variant="critical"' : '', v.State === 'Disabled' ? ' disabled' : ''].join('')
    return `import { InputTagChip } from "@/components/ui/input-tag"\n\n<InputTagChip${attrs} onRemove={() => remove("Design")}>Design</InputTagChip>`
  },
  InputTagOption: (v) =>
    `import { InputTagOption } from "@/components/ui/input-tag"\n\n<InputTagOption${v.Type === 'create' ? ' type="create"' : ' meta="12"'}${v.State === 'Disabled' ? ' disabled' : ''}>${v.Type === 'create' ? 'Create “Design”' : 'Design'}</InputTagOption>`,
  Select: (v) =>
    `import {\n  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,\n} from "@/components/ui/select"\n\n<Select>\n  <SelectTrigger${v.Size === 'sm' ? ' size="sm"' : ''}${v.State === 'Disabled' ? ' disabled' : ''}>\n    <SelectValue placeholder="Select an option" />\n  </SelectTrigger>\n  <SelectContent>\n    <SelectItem value="design">Design</SelectItem>\n    <SelectItem value="engineering">Engineering</SelectItem>\n  </SelectContent>\n</Select>`,
  Combobox: () =>
    `import { Combobox } from "@/components/ui/combobox"\n\n<Combobox\n  options={[{ label: "Inter", value: "inter" }, { label: "Poppins", value: "poppins" }]}\n  placeholder="Search fonts…"\n  onValueChange={setFont}\n/>`,
  CheckboxItem: (v) =>
    `import { CheckboxItem } from "@/components/ui/checkbox"\n\n<CheckboxItem${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}${v.Placement === 'right' ? ' placement="right"' : ''}${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''}${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Invalid' ? ' invalid' : ''}\n  label="Email me product updates"\n  description="About once a month."\n  ${v.Checked === 'indeterminate' ? 'checked="indeterminate"' : v.Checked === 'true' ? 'defaultChecked' : 'defaultChecked={false}'}\n/>`,
  Checkbox: (v) =>
    `import { Checkbox } from "@/components/ui/checkbox"\n\n<Checkbox${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''} ${v.Checked === 'indeterminate' ? 'checked="indeterminate"' : v.Checked === 'false' ? 'defaultChecked={false}' : 'defaultChecked'}${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Invalid' ? ' aria-invalid' : ''} aria-label="Remember me" />`,
  RadioGroup: () =>
    `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"\nimport { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"\n\n<FieldSet>\n  <FieldLegend variant="label">Billing period</FieldLegend>\n  <RadioGroup defaultValue="monthly">\n    <Field orientation="horizontal">\n      <RadioGroupItem value="monthly" id="monthly" />\n      <FieldLabel htmlFor="monthly">Monthly billing</FieldLabel>\n    </Field>\n    <Field orientation="horizontal">\n      <RadioGroupItem value="yearly" id="yearly" />\n      <FieldLabel htmlFor="yearly">Yearly billing</FieldLabel>\n    </Field>\n  </RadioGroup>\n</FieldSet>`,
  Switch: (v) =>
    `import { Switch } from "@/components/ui/switch"\nimport { Field, FieldLabel } from "@/components/ui/field"\n\n<Field orientation="horizontal">\n  <Switch id="notifications"${v.Size === 'sm' ? ' size="sm"' : ''} defaultChecked />\n  <FieldLabel htmlFor="notifications">Notifications</FieldLabel>\n</Field>`,
  Slider: () =>
    `import { Slider } from "@/components/ui/slider"\n\n<Slider label="Border radius" defaultValue={60} onValueChange={setRadius} />`,
  FileUpload: (v) =>
    `import { FileUpload, FileUploadItem } from "@/components/ui/file-upload"\n\n<FileUpload${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}${v.Layout === 'trigger' ? ' layout="trigger"' : ''} onFiles={upload} announcement={status}>\n  <FileUploadItem status="completed" name="brand-guidelines.pdf" onRemove={remove} />\n  <FileUploadItem status="uploading" name="Q3-financial-report.pdf" progress={48} />\n</FileUpload>`,
  FileUploadItem: (v) =>
    `import { FileUploadItem } from "@/components/ui/file-upload"\n\n<FileUploadItem${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}\n  status="${v.Status ?? 'queued'}"\n  name="Q3-financial-report.pdf"${v.Status === 'uploading' ? '\n  progress={48}' : ''}\n  onRemove={remove}\n/>`,
  FileUploadDropzone: (v) =>
    `import { FileUploadDropzone } from "@/components/ui/file-upload"\n\n<FileUploadDropzone${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''}${v.State === 'Invalid' ? ' invalid' : ''}${v.State === 'Disabled' ? ' disabled' : ''}\n  accept=".pdf,.zip,image/*"\n  onFiles={upload}\n/>`,
  Field: (v) => {
    const attrs = [
      v.Size && v.Size !== 'default' ? `\n  size="${v.Size}"` : '',
      v.State && v.State !== 'Default' ? `\n  state="${v.State}"` : '',
    ].join('')
    return `import { Field } from "@/components/ui/field"\nimport { Input } from "@/components/ui/input"\nimport { TextLink } from "@/components/ui/text-link"\n\n<Field\n  label="Email address"\n  required\n  trailing={<TextLink href="/reset">Forgot password?</TextLink>}\n  description="We will never share your email."\n  error="Enter a valid email address."${attrs}\n>\n  <Input type="email" placeholder="Jane Doe" />\n</Field>`
  },
  Label: () =>
    `import { Label } from "@/components/ui/label"\n\n<Label htmlFor="email">Email address</Label>`,
  PasswordStrength: (v) =>
    `import { PasswordStrength } from "@/components/ui/password-strength"\n\n<PasswordStrength${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''} value={password} />`,
  PasswordStrengthMeter: (v) =>
    `import { PasswordStrengthMeter } from "@/components/ui/password-strength"\n\n<PasswordStrengthMeter strength={${v.Strength ?? 3}}${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''} />`,
  PasswordStrengthRule: (v) =>
    `import { PasswordStrengthRule } from "@/components/ui/password-strength"\n\n<PasswordStrengthRule met={${v.Met !== 'false'}} label="At least 8 characters" />`,

  ButtonGroup: (v) => {
    const attrs = [
      v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : '',
      v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : '',
      v.Shape && v.Shape !== 'rounded' ? ` shape="${v.Shape}"` : '',
      v.Orientation === 'vertical' ? ' orientation="vertical"' : '',
    ].join('')
    return `import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"\n\n<ButtonGroup${attrs} aria-label="Range">\n  <ButtonGroupItem>Previous</ButtonGroupItem>\n  <ButtonGroupItem active>Today</ButtonGroupItem>\n  <ButtonGroupItem>Next</ButtonGroupItem>\n</ButtonGroup>`
  },
  ButtonGroupItem: (v) =>
    `import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"\n\n<ButtonGroup${v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''}${v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''} aria-label="View">\n  <ButtonGroupItem${v.Active === 'true' ? ' active' : ''}${v.State === 'Disabled' ? ' disabled' : ''}>Label</ButtonGroupItem>\n</ButtonGroup>`,
  ButtonGroupDivider: () =>
    `// ButtonGroup draws a ButtonGroupDivider between its items by itself.\nimport { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"\n\n<ButtonGroup aria-label="Range">\n  <ButtonGroupItem>Day</ButtonGroupItem>\n  <ButtonGroupItem>Week</ButtonGroupItem>\n</ButtonGroup>`,
  SocialLoginButton: (v) =>
    `import { SocialLoginButton } from "@/components/ui/social-login-button"\n\n<SocialLoginButton provider="${v.Provider ?? 'google'}"${v.Size === 'lg' ? ' size="lg"' : ''} />`,
  AppStoreBadge: (v) =>
    `import { AppStoreBadge } from "@/components/ui/app-store-badge"\n\n<AppStoreBadge store="${v.Store ?? 'app-store'}" href={storeUrl} />`,
  Button: (v, icons) => {
    const variant = v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''
    const appearance = v.Appearance && v.Appearance !== 'solid' ? ` appearance="${v.Appearance}"` : ''
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const flags = `${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Loading' ? ' loading' : ''}`
    const lead = icons?.leading ? ` leading={<${ICON_COMPONENT[icons.leadingConcept ?? buttonLeadingConcept(v.Variant)]} />}` : ''
    const trail = icons?.trailing ? ` trailing={<${ICON_COMPONENT[ICON_SLOTS.Button.trailing]} />}` : ''
    return `import { Button } from "@/components/ui/button"\n\n<Button${variant}${appearance}${size}${flags}${lead}${trail}>\n  Button\n</Button>`
  },
  IconButton: (v, icons) => {
    const variant = v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''
    const appearance = v.Appearance && v.Appearance !== 'solid' ? ` appearance="${v.Appearance}"` : ''
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const flags = `${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Loading' ? ' loading' : ''}`
    return `import { IconButton } from "@/components/ui/icon-button"\n\n<IconButton${variant}${appearance}${size}${flags} aria-label="Home" icon={<${ICON_COMPONENT[icons?.leadingConcept ?? ICON_SLOTS.Button.leading]} />} />`
  },
  FABButton: (v) => {
    const appearance = v.Appearance && v.Appearance !== 'solid' ? ` appearance="${v.Appearance}"` : ''
    const shape = v.Shape && v.Shape !== 'rounded' ? ` shape="${v.Shape}"` : ''
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const variant = v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''
    const flags = v.State === 'Disabled' ? ' disabled' : ''
    return `import { FABButton } from "@/components/ui/fab-button"\n\n<FABButton${appearance}${shape}${size}${variant}${flags}>\n  Create\n</FABButton>`
  },
  FABGroup: (v) => {
    const layout = v.Layout && v.Layout !== 'stack' ? ` layout="${v.Layout}"` : ''
    const open = v.Open === 'true' ? ' defaultOpen' : ''
    return `import { FABGroup } from "@/components/ui/fab-group"\n\n<FABGroup${layout}${open}\n  items={[\n    { icon: <Edit />, label: "Edit" },\n    { icon: <Image />, label: "Photo" },\n    { icon: <Share />, label: "Share" },\n  ]}\n/>`
  },
  TextLink: (v) => {
    const variant = v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const flags = v.State === 'Disabled' ? ' disabled' : ''
    return `import { TextLink } from "@/components/ui/text-link"\n\n<TextLink href="/docs"${variant}${size}${flags}>\n  Inline Text Link\n</TextLink>`
  },
  CloseButton: (v) => {
    const appearance = v.Appearance && v.Appearance !== 'soft' ? ` appearance="${v.Appearance}"` : ''
    const shape = v.Shape && v.Shape !== 'pill' ? ` shape="${v.Shape}"` : ''
    const size = v.Size && v.Size !== 'default' ? ` size="${v.Size}"` : ''
    const variant = v.Variant && v.Variant !== 'default' ? ` variant="${v.Variant}"` : ''
    const flags = v.State === 'Disabled' ? ' disabled' : ''
    return `import { CloseButton } from "@/components/ui/close-button"\n\n<CloseButton${appearance}${shape}${size}${variant}${flags} aria-label="Close" />`
  },
  Input: (v, icons) => {
    const flags = `${v.State === 'Error' ? ' aria-invalid' : ''}${v.State === 'Disabled' ? ' disabled' : ''}`
    if (icons?.leading || icons?.trailing) {
      const lead = icons.leading ? `  <InputGroupAddon>\n    <${ICON_COMPONENT[ICON_SLOTS.Input.leading]} />\n  </InputGroupAddon>\n` : ''
      const trail = icons.trailing ? `  <InputGroupAddon align="inline-end">\n    <${ICON_COMPONENT[ICON_SLOTS.Input.trailing]} />\n  </InputGroupAddon>\n` : ''
      return `import {\n  InputGroup, InputGroupAddon, InputGroupInput,\n} from "@/components/ui/input-group"\n\n<InputGroup>\n  <InputGroupInput placeholder="you@company.com"${flags} />\n${lead}${trail}</InputGroup>`
    }
    return `import { Input } from "@/components/ui/input"\n\n<Input type="email" placeholder="you@company.com"${flags} />`
  },

  Card: (v) =>
    `import {\n  Card, CardHeader, CardTitle, CardDescription, CardFooter,\n} from "@/components/ui/card"\n\n<Card${v.Size === 'sm' ? ' size="sm"' : ''}>\n  <CardHeader>\n    <CardTitle>Card title</CardTitle>\n    <CardDescription>Supporting copy…</CardDescription>\n  </CardHeader>\n  <CardFooter>\n    <Button variant="link" size="sm">Learn more →</Button>\n  </CardFooter>\n</Card>`,
  Dialog: () =>
    `import {\n  Dialog, DialogContent, DialogHeader, DialogTitle,\n  DialogDescription, DialogFooter,\n} from "@/components/ui/dialog"\n\n<Dialog open={open} onOpenChange={setOpen}>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Delete project?</DialogTitle>\n      <DialogDescription>This action can't be undone.</DialogDescription>\n    </DialogHeader>\n    <DialogFooter>\n      <Button variant="outline">Cancel</Button>\n      <Button variant="destructive">Delete</Button>\n    </DialogFooter>\n  </DialogContent>\n</Dialog>`,
}
