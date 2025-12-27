/**
 * Shared UI Components - Public API
 * @module shared/ui
 *
 * Note: Several components are re-exported from @/components/ui to avoid duplication.
 * The following are re-exported: Badge, Card, Collapsible, Input, Progress, ScrollArea, Select, Separator
 */

// Re-exported from components/ui
export { Badge, type BadgeProps, badgeVariants } from "@/components/ui/badge";
export {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
export {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
export { Input } from "@/components/ui/input";
export { Progress } from "@/components/ui/progress";
export { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
} from "@/components/ui/select";
export { Separator } from "@/components/ui/separator";
export {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "./alert-dialog";
export { Avatar, AvatarFallback, AvatarImage } from "./avatar";
export { Label } from "./label";
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
} from "./sheet";
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
} from "./sidebar";
export { Skeleton } from "./skeleton";
export { Slider } from "./slider";
export { Switch } from "./switch";
export { toast } from "./toast";
