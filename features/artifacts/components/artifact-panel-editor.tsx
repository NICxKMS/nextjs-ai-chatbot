import type {
	ArtifactStatus,
	ArtifactSuggestion,
	EditorSaveCallback,
} from "../types/artifact.types"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { CodeEditor, ImageEditor, SheetEditor, TextEditor } from "./editors/lazy"

// ── Types ────────────────────────────────────────────────────

interface ArtifactPanelEditorProps {
	kind: string
	content: string
	status: ArtifactStatus
	isCurrentVersion: boolean
	currentVersionIndex: number
	onSaveContent: EditorSaveCallback
	suggestions: ArtifactSuggestion[]
	title: string
}

// ── Component ────────────────────────────────────────────────

export function ArtifactPanelEditor({
	kind,
	content,
	status,
	isCurrentVersion,
	currentVersionIndex,
	onSaveContent,
	suggestions,
	title,
}: ArtifactPanelEditorProps) {
	const commonProps = {
		content,
		status,
		isCurrentVersion,
		currentVersionIndex,
	}

	switch (kind) {
		case "text":
			return (
				<ArtifactErrorBoundary>
					<TextEditor
						{...commonProps}
						onSaveContent={onSaveContent}
						suggestions={suggestions}
					/>
				</ArtifactErrorBoundary>
			)
		case "code":
			return (
				<ArtifactErrorBoundary>
					<CodeEditor {...commonProps} onSaveContent={onSaveContent} />
				</ArtifactErrorBoundary>
			)
		case "sheet":
			return (
				<ArtifactErrorBoundary>
					<SheetEditor {...commonProps} onSaveContent={onSaveContent} />
				</ArtifactErrorBoundary>
			)
		case "image":
			return (
				<ArtifactErrorBoundary>
					<ImageEditor {...commonProps} title={title} />
				</ArtifactErrorBoundary>
			)
		default:
			return (
				<div className="flex h-full items-center justify-center text-muted-foreground">
					Unsupported artifact kind: {kind}
				</div>
			)
	}
}
