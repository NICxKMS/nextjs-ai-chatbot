/**
 * Input Feature Barrel Export
 *
 * Multimodal input handling: text composition, file attachments, and AI-suggested actions.
 *
 * @module features/input
 */

// Components
export {
	AttachmentPreview,
	type AttachmentPreviewProps,
	DEFAULT_SUGGESTED_ACTIONS,
	MultimodalInput,
	type MultimodalInputProps,
	StopButton,
	type StopButtonProps,
	SubmitButton,
	type SubmitButtonProps,
	SuggestedActions,
	type SuggestedActionsProps,
} from "./components"

// Hooks
export {
	type UseFileUploadOptions,
	type UseFileUploadReturn,
	type UseInputOptions,
	type UseInputReturn,
	useFileUpload,
	useFileValidation,
	useInput,
} from "./hooks"

// Schemas
export {
	type Attachment,
	AttachmentSchema,
	type AttachmentStatus,
	AttachmentStatusSchema,
	type AttachmentType,
	AttachmentTypeSchema,
	type InputState,
	InputStateSchema,
	type SuggestedAction,
	SuggestedActionSchema,
	type UploadConfig,
	UploadConfigSchema,
	type UploadProgress,
	UploadProgressSchema,
	type UploadResult,
	UploadResultSchema,
	validateFileSize,
	validateFileType,
	validateInput,
} from "./schemas"

// Types
export {
	type AttachmentError,
	type AttachmentPreviewProps as InputAttachmentPreviewProps,
	DEFAULT_UPLOAD_CONFIG,
	type FormatType,
	getAttachmentType,
	type InputActions,
	type InputAttachment,
	type InputState as InputStateType,
	type MultimodalInputProps as MultimodalInputPropsType,
	type SubmitButtonProps as SubmitButtonPropsType,
	type SuggestedAction as SuggestedActionType,
	type SuggestedActionsProps as SuggestedActionsPropsType,
	type SuggestionCategory,
	type ToolbarProps,
	type UploadConfig as UploadConfigType,
	type UploadProgress as UploadProgressType,
	type UploadResult as UploadResultType,
} from "./types"
