/**
 * Input Feature Types
 *
 * Type definitions for multimodal input, file uploads, and suggested actions.
 *
 * @module features/input/types
 */

import type { Attachment } from "@/features/chat/types"

// =============================================================================
// Attachment Types
// =============================================================================

/**
 * Attachment type classification
 */
export type AttachmentType = "image" | "document" | "code" | "audio" | "video"

/**
 * Attachment upload status
 */
export type AttachmentStatus = "uploading" | "processing" | "ready" | "error"

/**
 * Extended attachment with upload metadata
 */
export interface InputAttachment extends Attachment {
	/** Unique identifier */
	id: string
	/** Attachment type classification */
	type: AttachmentType
	/** Upload status */
	status: AttachmentStatus
	/** Upload progress (0-100) */
	uploadProgress?: number
	/** Preview URL for images */
	previewUrl?: string
}

/**
 * Attachment error information
 */
export interface AttachmentError {
	/** Attachment ID that failed */
	attachmentId: string
	/** Error code */
	code: string
	/** Error message */
	message: string
}

// =============================================================================
// Upload Configuration
// =============================================================================

/**
 * File upload configuration
 */
export interface UploadConfig {
	/** Maximum file size in bytes */
	maxFileSize: number
	/** Maximum number of files */
	maxFiles: number
	/** Allowed MIME types */
	allowedTypes: string[]
	/** Upload endpoint URL */
	uploadEndpoint: string
}

/**
 * Default upload configuration
 */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
	maxFileSize: 10 * 1024 * 1024, // 10MB
	maxFiles: 5,
	allowedTypes: [
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"application/pdf",
		"text/plain",
		"text/markdown",
	],
	uploadEndpoint: "/api/files/upload",
}

// =============================================================================
// Input State Types
// =============================================================================

/**
 * Input state
 */
export interface InputState {
	/** Current input value */
	value: string
	/** Attached files */
	attachments: InputAttachment[]
	/** Whether submission is in progress */
	isSubmitting: boolean
	/** Whether file upload is in progress */
	isUploading: boolean
}

/**
 * Input actions
 */
export interface InputActions {
	/** Set input value */
	setValue: (value: string) => void
	/** Add a file attachment */
	addAttachment: (file: File) => Promise<void>
	/** Remove an attachment by ID */
	removeAttachment: (id: string) => void
	/** Clear all attachments */
	clearAttachments: () => void
	/** Submit the input */
	submit: () => Promise<void>
	/** Clear the input */
	clear: () => void
}

// =============================================================================
// Suggested Actions Types
// =============================================================================

/**
 * Suggested action for user prompts
 */
export interface SuggestedAction {
	/** Unique identifier */
	id: string
	/** Display label */
	label: string
	/** Optional description */
	description?: string
	/** Prompt to insert */
	prompt: string
	/** Optional icon name */
	icon?: string
	/** Action category */
	category: SuggestionCategory
}

/**
 * Suggestion category
 */
export type SuggestionCategory = "continue" | "clarify" | "explore" | "task"

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * MultimodalInput component props
 */
export interface MultimodalInputProps {
	/** Chat ID */
	chatId: string
	/** Placeholder text */
	placeholder?: string
	/** Whether input is disabled */
	disabled?: boolean
	/** Whether to auto-focus */
	autoFocus?: boolean
	/** Submit handler */
	onSubmit: (content: string, attachments: Attachment[]) => Promise<void>
	/** Suggested actions to display */
	suggestedActions?: SuggestedAction[]
	/** Upload configuration override */
	uploadConfig?: Partial<UploadConfig>
	/** Additional class names */
	className?: string
}

/**
 * SubmitButton component props
 */
export interface SubmitButtonProps {
	/** Whether submission is in progress */
	isSubmitting: boolean
	/** Whether button is disabled */
	isDisabled: boolean
	/** Whether there is content to submit */
	hasContent: boolean
	/** Click handler */
	onClick: () => void
}

/**
 * AttachmentPreview component props
 */
export interface AttachmentPreviewProps {
	/** Attachment to preview */
	attachment: InputAttachment
	/** Remove handler */
	onRemove: (id: string) => void
	/** Whether to show upload progress */
	showProgress?: boolean
}

/**
 * SuggestedActions component props
 */
export interface SuggestedActionsProps {
	/** Actions to display */
	actions: SuggestedAction[]
	/** Selection handler */
	onSelect: (action: SuggestedAction) => void
	/** Whether actions are disabled */
	disabled?: boolean
	/** Maximum visible actions */
	maxVisible?: number
}

/**
 * Toolbar component props
 */
export interface ToolbarProps {
	/** Format handler */
	onFormat: (format: FormatType) => void
	/** Attach file handler */
	onAttach: () => void
	/** Whether toolbar is disabled */
	disabled?: boolean
}

/**
 * Format type for text formatting
 */
export type FormatType = "bold" | "italic" | "code" | "link" | "list"

// =============================================================================
// Upload Result Types
// =============================================================================

/**
 * Upload result
 */
export interface UploadResult {
	/** Whether upload succeeded */
	success: boolean
	/** Uploaded attachment (if successful) */
	attachment?: InputAttachment
	/** Error message (if failed) */
	error?: string
}

/**
 * Upload progress information
 */
export interface UploadProgress {
	/** Bytes loaded */
	loaded: number
	/** Total bytes */
	total: number
	/** Progress percentage */
	percentage: number
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get attachment type from MIME type
 */
export function getAttachmentType(mimeType: string): AttachmentType {
	if (mimeType.startsWith("image/")) return "image"
	if (mimeType.startsWith("audio/")) return "audio"
	if (mimeType.startsWith("video/")) return "video"
	if (
		mimeType.includes("javascript") ||
		mimeType.includes("typescript") ||
		mimeType.includes("json") ||
		mimeType.includes("html") ||
		mimeType.includes("css")
	) {
		return "code"
	}
	return "document"
}
