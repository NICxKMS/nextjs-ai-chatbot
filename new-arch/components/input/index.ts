// Main component

// Sub-components
export { AttachmentPreview } from "./attachment-preview";
// Hooks
export { useFileUpload } from "./hooks/use-file-upload";
export { usePasteHandler } from "./hooks/use-paste-handler";
export { MultimodalInput } from "./multimodal-input";
export { StopButton, SubmitButton } from "./submit-button";
export { SuggestedActions } from "./suggested-actions";

// Types
export type {
    Attachment,
    AttachmentPreviewProps,
    AttachmentsButtonProps,
    ChatStatus,
    MultimodalInputProps,
    StopButtonProps,
    SubmitButtonProps,
    SuggestedActionsProps,
    UploadResult,
    UseFileUploadReturn,
    UsePasteHandlerReturn,
} from "./types";
