/**
 * UI Components Barrel Export
 *
 * Re-exports all shadcn/ui components for convenient imports.
 * @module components/ui
 */

// Alert component
export { Alert, AlertDescription, type AlertProps, AlertTitle } from "./alert"

// Alert dialog component
export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./alert-dialog"

// Avatar component
export { Avatar, AvatarFallback, AvatarImage } from "./avatar"

// Badge component
export { Badge, type BadgeProps, badgeVariants } from "./badge"

// Button component
export { Button, type ButtonProps, buttonVariants } from "./button"

// Card component
export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card"

// Carousel component
export {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "./carousel"

// Collapsible component
export {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./collapsible"

// Command component
export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./command"

// Dialog component
export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "./dialog"

// Dropdown menu component
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./dropdown-menu"

// Hover card component
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"

// Input component
export { Input } from "./input"

// Input group component
export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "./input-group"

// Label component
export { Label } from "./label"

// Progress component
export { Progress } from "./progress"

// Scroll area component
export { ScrollArea, ScrollBar } from "./scroll-area"

// Select component
export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select"

// Separator component
export { Separator } from "./separator"

// Sheet component
export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
} from "./sheet"

// Sidebar component
export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from "./sidebar"

// Skeleton component
export { Skeleton } from "./skeleton"

// Slider component
export { Slider } from "./slider"

// Switch component
export { Switch } from "./switch"

// Textarea component
export { Textarea } from "./textarea"

// Tooltip component
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip"
