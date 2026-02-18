/**
 * Artifact Components Barrel Export
 *
 * Re-exports all artifact UI components for clean imports.
 *
 * @module features/artifact/components
 */

// Re-export types used by components
export type {
	ArtifactActionsProps,
	ArtifactCloseProps,
	ArtifactErrorBoundaryProps,
	ArtifactPanelProps,
} from "../types"

// Main Components
export { ArtifactActions } from "./artifact-actions"
export { ArtifactClose } from "./artifact-close"
export { ArtifactErrorBoundary } from "./artifact-error-boundary"
export type { ArtifactMessagesProps } from "./artifact-messages"
export { ArtifactMessages } from "./artifact-messages"
export { ArtifactPanel } from "./artifact-panel"
export type {
	ConsoleOutput,
	ConsoleOutputContent,
	ConsoleProps,
} from "./console"
// Console Component
export { Console } from "./console"
export type { CodeEditorProps } from "./editors/code-editor"
export { CodeEditor } from "./editors/code-editor"
export type { ImageEditorProps } from "./editors/image-editor"
export { ImageEditor } from "./editors/image-editor"
export type { SheetEditorProps } from "./editors/sheet-editor"
export { SheetEditor } from "./editors/sheet-editor"
export type { TextEditorProps } from "./editors/text-editor"
// Editors
export { TextEditor } from "./editors/text-editor"
