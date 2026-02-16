/**
 * Artifact Panel Component
 *
 * Main artifact panel container with type-based editor selection,
 * version management, and streaming support.
 *
 * @module features/artifact/components/artifact-panel
 */
"use client"

import { formatDistance } from "date-fns"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { useDebounceCallback } from "usehooks-ts"

import { cn } from "@/lib/utils"

import { getArtifact, updateArtifact } from "../actions"
import { useArtifact } from "../hooks"
import type { ArtifactKind } from "../types"
import { ArtifactActions } from "./artifact-actions"
import { ArtifactClose } from "./artifact-close"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"

/**
 * Artifact version data structure
 */
interface ArtifactVersion {
	id: string
	content: string | null
	createdAt: Date
	kind: ArtifactKind
	title: string
}

/**
 * Props for internal panel state
 */
interface ArtifactPanelInternalProps {
	chatId: string
	isReadonly: boolean
}

/**
 * Default artifact definitions for built-in artifact types.
 * In a full implementation, these would be imported from artifact renderers.
 */
const defaultArtifactRenderers: Record<
	ArtifactKind,
	{
		name: string
		component: React.ComponentType<{
			content: string
			isLoading: boolean
			mode: "edit" | "diff"
			onSaveContent: (content: string, debounce: boolean) => void
			status: "streaming" | "idle"
			title: string
		}>
	}
> = {
	text: {
		name: "Text",
		component: function TextRenderer({ content, isLoading }) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}
			return (
				<div className="h-full overflow-auto p-4">
					<pre className="whitespace-pre-wrap font-mono text-sm">
						{content}
					</pre>
				</div>
			)
		},
	},
	code: {
		name: "Code",
		component: function CodeRenderer({ content, isLoading }) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}
			return (
				<div className="h-full overflow-auto p-4">
					<pre className="whitespace-pre-wrap font-mono text-sm">
						{content}
					</pre>
				</div>
			)
		},
	},
	image: {
		name: "Image",
		component: function ImageRenderer({ content, isLoading }) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}
			return (
				<div className="flex h-full items-center justify-center p-4">
					{content.startsWith("data:") ||
					content.startsWith("http") ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							alt="Artifact content"
							className="max-h-full max-w-full object-contain"
							src={content}
						/>
					) : (
						<pre className="whitespace-pre-wrap font-mono text-sm">
							{content}
						</pre>
					)}
				</div>
			)
		},
	},
	sheet: {
		name: "Sheet",
		component: function SheetRenderer({ content, isLoading }) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}
			return (
				<div className="h-full overflow-auto p-4">
					<pre className="whitespace-pre-wrap font-mono text-sm">
						{content}
					</pre>
				</div>
			)
		},
	},
}

function PureArtifactPanel({
	chatId: _chatId,
	isReadonly: _isReadonly,
}: ArtifactPanelInternalProps) {
	const { artifact, setArtifact, metadata, setMetadata } = useArtifact()

	// Fetch artifact versions
	const { data: documents, isLoading: isDocumentsFetching } = useSWR<
		ArtifactVersion[]
	>(
		artifact.documentId !== "init" && artifact.status !== "streaming"
			? `artifact-versions-${artifact.documentId}`
			: null,
		async () => {
			const result = await getArtifact(artifact.documentId)
			if (result) {
				return [
					{
						id: result.id,
						content: result.content,
						createdAt: result.createdAt,
						kind: result.kind as ArtifactKind,
						title: result.title,
					},
				]
			}
			return []
		},
	)

	const [mode, setMode] = useState<"edit" | "diff">("edit")
	const [document, setDocument] = useState<ArtifactVersion | null>(null)
	const [currentVersionIndex, setCurrentVersionIndex] = useState(-1)

	// Automatically switch to edit mode when streaming starts
	useEffect(() => {
		if (artifact.status === "streaming") {
			setMode("edit")
		}
	}, [artifact.status])

	useEffect(() => {
		if (documents && documents.length > 0) {
			const mostRecentDocument = documents.at(-1)

			if (mostRecentDocument) {
				setDocument(mostRecentDocument)
				setCurrentVersionIndex(documents.length - 1)
				setArtifact((currentArtifact) => ({
					...currentArtifact,
					content: mostRecentDocument.content ?? "",
				}))
			}
		}
	}, [documents, setArtifact])

	const { mutate } = useSWRConfig()
	const [isContentDirty, setIsContentDirty] = useState(false)
	const pendingSaveRef = useRef<AbortController | null>(null)

	const handleContentChange = useCallback(
		(updatedContent: string) => {
			if (!artifact) {
				return
			}

			// Cancel any pending save to prevent race conditions
			if (pendingSaveRef.current) {
				pendingSaveRef.current.abort()
			}
			const abortController = new AbortController()
			pendingSaveRef.current = abortController

			mutate<ArtifactVersion[]>(
				`artifact-versions-${artifact.documentId}`,
				async (currentDocuments) => {
					if (!currentDocuments) {
						return []
					}

					const currentDocument = currentDocuments.at(-1)

					if (!currentDocument || !currentDocument.content) {
						setIsContentDirty(false)
						return currentDocuments
					}

					if (currentDocument.content !== updatedContent) {
						try {
							await updateArtifact(artifact.documentId, {
								content: updatedContent,
								title: artifact.title,
							})

							setIsContentDirty(false)
							pendingSaveRef.current = null
						} catch (error) {
							if (
								error instanceof Error &&
								error.name === "AbortError"
							) {
								return currentDocuments
							}
							setIsContentDirty(false)
							pendingSaveRef.current = null
							return currentDocuments
						}

						const newDocument = {
							...currentDocument,
							content: updatedContent,
							createdAt: new Date(),
						}

						return [...currentDocuments, newDocument]
					}
					return currentDocuments
				},
				{ revalidate: false },
			)
		},
		[artifact, mutate],
	)

	const debouncedHandleContentChange = useDebounceCallback(
		handleContentChange,
		2000,
	)

	const saveContent = useCallback(
		(updatedContent: string, debounce: boolean) => {
			if (!document) {
				return
			}

			if (updatedContent !== document.content) {
				setIsContentDirty(true)

				if (debounce) {
					debouncedHandleContentChange(updatedContent)
				} else {
					handleContentChange(updatedContent)
				}
			}
		},
		[document, debouncedHandleContentChange, handleContentChange],
	)

	function getDocumentContentById(index: number) {
		if (!documents) {
			return ""
		}
		if (!documents[index]) {
			return ""
		}
		return documents[index].content ?? ""
	}

	const handleVersionChange = (
		type: "next" | "prev" | "toggle" | "latest",
	) => {
		if (!documents) {
			return
		}

		if (type === "latest") {
			setCurrentVersionIndex(documents.length - 1)
			setMode("edit")
		}

		if (type === "toggle") {
			setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"))
		}

		if (type === "prev") {
			if (currentVersionIndex > 0) {
				setCurrentVersionIndex((index) => index - 1)
			}
		} else if (
			type === "next" &&
			currentVersionIndex < documents.length - 1
		) {
			setCurrentVersionIndex((index) => index + 1)
		}
	}

	const isCurrentVersion =
		documents && documents.length > 0
			? currentVersionIndex === documents.length - 1
			: true

	const artifactRenderer =
		defaultArtifactRenderers[artifact.kind] ?? defaultArtifactRenderers.text
	const RendererComponent = artifactRenderer.component

	if (!artifact.isVisible) {
		return null
	}

	return (
		<div
			className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
			data-testid="artifact"
		>
			{/* Left panel - chat messages */}
			<div className="relative hidden h-dvh w-[400px] shrink-0 bg-muted dark:bg-background md:block">
				<div
					className={cn(
						"absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50 transition-opacity",
						isCurrentVersion ? "opacity-0" : "opacity-100",
					)}
				/>

				<div className="flex h-full flex-col items-center justify-between">
					<div className="flex-1 overflow-auto p-4">
						<p className="text-muted-foreground text-sm">
							Chat messages would appear here
						</p>
					</div>
				</div>
			</div>

			{/* Main artifact panel */}
			<div className="fixed right-0 flex h-dvh flex-col overflow-y-scroll border-zinc-200 bg-background md:w-[calc(100dvw-400px)] md:border-l dark:border-zinc-700 dark:bg-muted">
				{/* Header */}
				<div className="flex flex-row items-start justify-between p-2">
					<div className="flex flex-row items-start gap-4">
						<ArtifactClose />

						<div className="flex flex-col">
							<div className="font-medium">{artifact.title}</div>

							{isContentDirty ? (
								<div className="text-muted-foreground text-sm">
									Saving changes...
								</div>
							) : document ? (
								<div className="text-muted-foreground text-sm">
									{`Updated ${formatDistance(
										new Date(document.createdAt),
										new Date(),
										{
											addSuffix: true,
										},
									)}`}
								</div>
							) : (
								<div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
							)}
						</div>
					</div>

					<ArtifactActions
						artifact={artifact}
						currentVersionIndex={currentVersionIndex}
						handleVersionChange={handleVersionChange}
						isCurrentVersion={isCurrentVersion}
						metadata={metadata}
						mode={mode}
						setMetadata={setMetadata}
					/>
				</div>

				{/* Content */}
				<div className="h-full max-w-full items-center overflow-y-scroll bg-background dark:bg-muted">
					<ArtifactErrorBoundary>
						<RendererComponent
							content={
								isCurrentVersion
									? artifact.content
									: getDocumentContentById(
											currentVersionIndex,
										)
							}
							isLoading={isDocumentsFetching && !artifact.content}
							mode={mode}
							onSaveContent={saveContent}
							status={artifact.status}
							title={artifact.title}
						/>
					</ArtifactErrorBoundary>
				</div>

				{/* Version footer */}
				{!isCurrentVersion && documents && (
					<div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								Version {currentVersionIndex + 1} of{" "}
								{documents.length}
							</span>
							<button
								className="text-primary text-sm hover:underline"
								onClick={() => handleVersionChange("latest")}
								type="button"
							>
								Return to latest version
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export const ArtifactPanel = memo(PureArtifactPanel, (prevProps, nextProps) => {
	if (prevProps.chatId !== nextProps.chatId) {
		return false
	}
	if (prevProps.isReadonly !== nextProps.isReadonly) {
		return false
	}
	return true
})
