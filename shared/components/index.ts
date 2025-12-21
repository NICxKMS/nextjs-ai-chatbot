/**
 * Shared Components - Public API
 * @module shared/components
 *
 * Note: DropdownMenu and Textarea are re-exported from @/components/ui to avoid duplication.
 */

// Re-exported from components/ui (to avoid duplication)
export {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export { Textarea } from "@/components/ui/textarea";

// Custom shared components
export {
    ArrowUpIcon,
    CheckCircleFillIcon,
    ChevronDownIcon,
    GlobeIcon,
    LockIcon,
    StopIcon,
    SummarizeIcon,
    WarningIcon,
} from "./icons";
export { ThemeProvider } from "./theme-provider";
export {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./tooltip";
