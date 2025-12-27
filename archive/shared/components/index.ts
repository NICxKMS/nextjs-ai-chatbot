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

// Accessibility
export {
    type Announcement,
    type AnnouncementPoliteness,
    type AnnouncerContextValue,
    AnnouncerProvider,
    LiveRegion,
    useAnnouncer,
    useAnnouncerSafe,
} from "./announcer";
// Connection status
export type { ConnectionStatusProps } from "./connection-status";
export { ConnectionDot, ConnectionStatus } from "./connection-status";

// Empty state components
export {
    EmptyChatState,
    type EmptyChatStateProps,
    EmptyDocumentsState,
    type EmptyDocumentsStateProps,
    EmptyHistoryState,
    type EmptyHistoryStateProps,
    EmptySearchState,
    type EmptySearchStateProps,
    EmptyState,
    type EmptyStateAction,
    type EmptyStateProps,
    type EmptyStateVariant,
    InlineEmptyState,
    type InlineEmptyStateProps,
} from "./empty-state";

// Error fallback components
export {
    ErrorBoundary,
    type ErrorBoundaryProps,
    ErrorFallback,
    type ErrorFallbackProps,
    type ErrorVariant,
    InlineErrorFallback,
    type InlineErrorFallbackProps,
} from "./error-fallback";
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
// Progress components
export {
    IndeterminateProgress,
    type IndeterminateProgressProps,
    LoadingOverlay,
    type LoadingOverlayProps,
    ProgressIndicator,
    type ProgressIndicatorProps,
    type ProgressStep,
    Spinner,
    type SpinnerProps,
    SteppedProgress,
    type SteppedProgressProps,
} from "./progress";
// Retry button components
export {
    InlineRetryButton,
    type InlineRetryButtonProps,
    RetryButton,
    type RetryButtonProps,
} from "./retry-button";
// Skeleton components
export {
    Skeleton,
    SkeletonAvatar,
    type SkeletonAvatarProps,
    SkeletonButton,
    type SkeletonButtonProps,
    SkeletonCard,
    type SkeletonCardProps,
    SkeletonGroup,
    type SkeletonGroupProps,
    SkeletonInput,
    type SkeletonInputProps,
    SkeletonListItem,
    type SkeletonListItemProps,
    SkeletonMessage,
    type SkeletonMessageProps,
    type SkeletonProps,
    SkeletonText,
    type SkeletonTextProps,
} from "./skeleton";
export { ThemeProvider } from "./theme-provider";
export {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./tooltip";
