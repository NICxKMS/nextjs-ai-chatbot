import type { ReactNode } from "react"

import type {
	ArtifactStatus,
	ArtifactSuggestion,
	EditorSaveCallback,
} from "../types/artifact.types"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { CodeEditor, ImageEditor, SheetEditor, TextEditor } from "./editors/lazy"

const ARTIFACT_EDITOR_CRASH_COOKIE = "e2e-artifact-editor-crash"

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

function ArtifactEditorCrashGate({ children }: { children: ReactNode }) {
	if (
		process.env.NODE_ENV !== "production" &&
		typeof document !== "undefined" &&
		document.cookie.split("; ").includes(`${ARTIFACT_EDITOR_CRASH_COOKIE}=1`)
	) {
		throw new Error("E2E artifact editor crash")
	}

	return children
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
					<ArtifactEditorCrashGate>
						<TextEditor
							{...commonProps}
							onSaveContent={onSaveContent}
							suggestions={suggestions}
						/>
					</ArtifactEditorCrashGate>
				</ArtifactErrorBoundary>
			)
		case "code":
			return (
				<ArtifactErrorBoundary>
					<ArtifactEditorCrashGate>
						<CodeEditor {...commonProps} onSaveContent={onSaveContent} />
					</ArtifactEditorCrashGate>
				</ArtifactErrorBoundary>
			)
		case "sheet":
			return (
				<ArtifactErrorBoundary>
					<ArtifactEditorCrashGate>
						<SheetEditor {...commonProps} onSaveContent={onSaveContent} />
					</ArtifactEditorCrashGate>
				</ArtifactErrorBoundary>
			)
		case "image":
			return (
				<ArtifactErrorBoundary>
					<ArtifactEditorCrashGate>
						<ImageEditor {...commonProps} title={title} />
					</ArtifactEditorCrashGate>
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
