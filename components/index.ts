/**
 * Components - Root Barrel Export
 *
 * Re-exports all component modules for convenient imports.
 * This file provides a single entry point for all UI components.
 *
 * Architecture:
 * - components/ui/ - shadcn/ui primitives
 * - components/ai-elements/ - AI element primitives (read-only SDK)
 * - components/ai/ - Project wrappers for AI elements
 * - components/document/ - Document-related components
 * - components/settings/ - Settings components
 * - Root components - App-level components (sidebar, auth, icons, etc.)
 *
 * @module components
 */

// =============================================================================
// UI Components (shadcn/ui primitives)
// =============================================================================

export * from "./ui"

// =============================================================================
// AI Element Primitives (read-only SDK)
// =============================================================================

export * from "./ai-elements"

// =============================================================================
// AI Wrappers (project-specific compositions)
// =============================================================================

export * from "./ai"

// =============================================================================
// Document Components
// =============================================================================

export * from "./document"

// =============================================================================
// Settings Components
// =============================================================================

export * from "./settings"

// =============================================================================
// Root Components (App-level)
// =============================================================================

// Sidebar components
export { AppSidebar } from "./app-sidebar"
// Auth components
export { AuthForm } from "./auth-form"
// Icons (named exports for each icon)
// Note: Use `export * from "./icons"` for all icons, or import directly from "./icons"
export {
	ArrowUpIcon,
	BotIcon,
	CheckCircleFillIcon,
	ChevronDownIcon,
	CodeIcon,
	CopyIcon,
	CrossIcon,
	DownloadIcon,
	EyeIcon,
	FileIcon,
	FullscreenIcon,
	GlobeIcon,
	ImageIcon,
	LoaderIcon,
	LockIcon,
	MessageIcon,
	MoreHorizontalIcon,
	MoreIcon,
	PencilEditIcon,
	PlayIcon,
	PlusIcon,
	RedoIcon,
	ShareIcon,
	SidebarLeftIcon,
	SparklesIcon,
	StopIcon,
	SummarizeIcon,
	ThumbDownIcon,
	ThumbUpIcon,
	TrashIcon,
	UndoIcon,
	UserIcon,
	WarningIcon,
} from "./icons"
export { SidebarToggle } from "./sidebar-toggle"
export { SidebarUserNav } from "./sidebar-user-nav"
// Theme components
export { ThemeProvider } from "./theme-provider"
// Toast notification
export { toast } from "./toast"
// Version footer
export { VersionFooter } from "./version-footer"
