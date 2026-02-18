/**
 * Artifact Panel Component
 *
 * Main artifact panel container with type-based editor selection,
 * version management, and streaming support.
 *
 * Integrates:
 * - ArtifactMessages for displaying chat messages in artifact context
 * - MultimodalInput for rich input with file attachments
 * - useSidebar for responsive layout based on sidebar state
 * - useWindowSize for responsive mobile/desktop behavior
 *
 * @module features/artifact/components/artifact-panel
 */
"use client"

import type { UseChatHelpers } from "@ai-sdk/react"
import { formatDistance } from "date-fns"
import type { Dispatch, SetStateAction } from "react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { useDebounceCallback } from "usehooks-ts"
import { DiffView } from "@/components/document/diffview"
import { useSidebar } from "@/components/ui/sidebar"
import { Toolbar } from "@/features/chat/components/toolbar"
import type { Attachment, ChatMessage, UserVote } from "@/features/chat/types"
import { MultimodalInput } from "@/features/input/components/multimodal-input"
import { useWindowSize } from "@/hooks/use-window-size"
import { AnimatePresence, motion } from "@/lib/motion"

import { getArtifact, updateArtifact } from "../actions"
import { useArtifact } from "../hooks"
import type { ArtifactKind } from "../types"
import { ArtifactActions } from "./artifact-actions"
import { ArtifactClose } from "./artifact-close"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { ArtifactMessages } from "./artifact-messages"

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
	/** Chat ID */
	chatId: string
	/** Whether the chat is read-only */
	isReadonly: boolean
	/** Current input value */
	input: string
	/** Set input value */
	setInput: Dispatch<SetStateAction<string>>
	/** Chat status from useChat */
	status: UseChatHelpers<ChatMessage>["status"]
	/** Stop generation handler */
	stop: () => void
	/** Current attachments */
	attachments: Attachment[]
	/** Set attachments */
	setAttachments: Dispatch<SetStateAction<Attachment[]>>
	/** Chat messages */
	messages: ChatMessage[]
	/** Set messages */
	setMessages: UseChatHelpers<ChatMessage>["setMessages"]
	/** Send message handler */
	sendMessage: UseChatHelpers<ChatMessage>["sendMessage"]
	/** Regenerate handler */
	regenerate: UseChatHelpers<ChatMessage>["regenerate"]
	/** User votes on messages */
	votes: UserVote[] | undefined
}

/**
 * Props for artifact renderer components
 */
interface ArtifactRendererProps {
	content: string
	isLoading: boolean
	mode: "edit" | "diff"
	onSaveContent: (content: string, debounce: boolean) => void
	status: "streaming" | "idle"
	title: string
	/** Previous content for diff mode */
	oldContent?: string | undefined
}

/**
 * Default artifact definitions for built-in artifact types.
 * In a full implementation, these would be imported from artifact renderers.
 */
const defaultArtifactRenderers: Record<
	ArtifactKind,
	{
		name: string
		component: React.ComponentType<ArtifactRendererProps>
	}
> = {
	text: {
		name: "Text",
		component: function TextRenderer({
			content,
			isLoading,
			mode,
			oldContent,
		}) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}

			// Show diff view when in diff mode with old content
			if (mode === "diff" && oldContent) {
				return (
					<div className="h-full overflow-auto p-4">
						<DiffView
							newContent={content}
							oldContent={oldContent}
						/>
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
		component: function CodeRenderer({
			content,
			isLoading,
			mode,
			oldContent,
		}) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}

			// Show diff view when in diff mode with old content
			if (mode === "diff" && oldContent) {
				return (
					<div className="h-full overflow-auto p-4">
						<DiffView
							newContent={content}
							oldContent={oldContent}
						/>
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
						// biome-ignore lint/performance/noImgElement: artifact content with dynamic src
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
		component: function SheetRenderer({
			content,
			isLoading,
			mode,
			oldContent,
		}) {
			if (isLoading) {
				return (
					<div className="flex h-full items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)
			}

			// Show diff view when in diff mode with old content
			if (mode === "diff" && oldContent) {
				return (
					<div className="h-full overflow-auto p-4">
						<DiffView
							newContent={content}
							oldContent={oldContent}
						/>
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
	chatId,
	isReadonly,
	input,
	setInput,
	status,
	stop,
	attachments,
	setAttachments,
	messages,
	setMessages,
	sendMessage,
	regenerate,
	votes,
}: ArtifactPanelInternalProps) {
	const { artifact, setArtifact, metadata, setMetadata } = useArtifact()

	// Sidebar state for responsive layout adjustments
	const { open: isSidebarOpen } = useSidebar()

	// Window size for responsive behavior
	const { width: windowWidth, isMobile } = useWindowSize()

	// Calculate panel widths accounting for sidebar state
	// Sidebar width is 256px when open
	const sidebarWidth = isSidebarOpen ? 256 : 0
	const chatPanelWidth = 400
	const effectiveWindowWidth = windowWidth ? windowWidth - sidebarWidth : null
	const artifactPanelWidth = effectiveWindowWidth
		? effectiveWindowWidth - chatPanelWidth
		: null

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
	const [isToolbarVisible, setIsToolbarVisible] = useState(false)

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
		<AnimatePresence initial={false}>
			{artifact.isVisible && (
				<motion.div
					animate={{ opacity: 1 }}
					className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
					data-testid="artifact"
					exit={{ opacity: 0, transition: { delay: 0.4 } }}
					initial={{ opacity: 1 }}
					key="artifact-panel"
				>
					{/* Left panel - chat messages */}
					<motion.div
						animate={{ width: 400, right: 0 }}
						className="relative hidden h-dvh shrink-0 bg-muted dark:bg-background md:block"
						exit={{ width: 400, right: 0 }}
						initial={{ width: 400, right: 0 }}
					>
						<AnimatePresence>
							{!isCurrentVersion && (
								<motion.div
									animate={{ opacity: 1 }}
									className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
								/>
							)}
						</AnimatePresence>

						<div className="flex h-full flex-col items-center justify-between">
							<ArtifactMessages
								artifactStatus={artifact.status}
								chatId={chatId}
								isReadonly={isReadonly}
								messages={messages}
								regenerate={regenerate}
								setMessages={setMessages}
								status={status}
								votes={votes}
							/>

							<div className="relative flex w-full flex-row items-end gap-2 px-4 pb-4">
								<MultimodalInput
									attachments={attachments}
									chatId={chatId}
									className="bg-background dark:bg-muted"
									input={input}
									messages={messages}
									sendMessage={sendMessage}
									setAttachments={setAttachments}
									setInput={setInput}
									setMessages={setMessages}
									status={status}
									stop={stop}
								/>
							</div>
						</div>
					</motion.div>

					{/* Main artifact panel */}
					<motion.div
						animate={{
							opacity: 1,
							x: 0,
							scale: 1,
							transition: {
								delay: 0.1,
								type: "spring",
								stiffness: 300,
								damping: 30,
							},
						}}
						className={`fixed right-0 flex h-dvh flex-col overflow-y-scroll border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted ${
							isMobile
								? "w-full"
								: artifactPanelWidth
									? ""
									: "md:w-[calc(100dvw-400px)]"
						}`}
						{...(!isMobile &&
							artifactPanelWidth && {
								style: { width: artifactPanelWidth },
							})}
						exit={{
							opacity: 0,
							x: 0,
							scale: 1,
							transition: { duration: 0 },
						}}
						initial={{ opacity: 0, x: 10, scale: 1 }}
					>
						{/* Header */}
						<div className="flex flex-row items-start justify-between p-2">
							<div className="flex flex-row items-start gap-4">
								<ArtifactClose />

								<div className="flex flex-col">
									<div className="font-medium">
										{artifact.title}
									</div>

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
									isLoading={
										isDocumentsFetching && !artifact.content
									}
									mode={mode}
									oldContent={
										mode === "diff" && documents
											? getDocumentContentById(
													Math.max(
														0,
														currentVersionIndex - 1,
													),
												)
											: undefined
									}
									onSaveContent={saveContent}
									status={artifact.status}
									title={artifact.title}
								/>
							</ArtifactErrorBoundary>

							{/* Toolbar for artifact-specific actions */}
							<AnimatePresence>
								{isCurrentVersion && (
									<Toolbar
										artifactKind={artifact.kind}
										isToolbarVisible={isToolbarVisible}
										sendMessage={sendMessage}
										setIsToolbarVisible={
											setIsToolbarVisible
										}
										status={
											status === "streaming"
												? "streaming"
												: status === "error"
													? "error"
													: "idle"
										}
									/>
								)}
							</AnimatePresence>
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
										onClick={() =>
											handleVersionChange("latest")
										}
										type="button"
									>
										Return to latest version
									</button>
								</div>
							</div>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export const ArtifactPanel = memo(PureArtifactPanel, (prevProps, nextProps) => {
	// Chat context props
	if (prevProps.chatId !== nextProps.chatId) return false
	if (prevProps.isReadonly !== nextProps.isReadonly) return false
	if (prevProps.input !== nextProps.input) return false
	if (prevProps.status !== nextProps.status) return false

	// Attachment comparison (shallow)
	if (prevProps.attachments.length !== nextProps.attachments.length)
		return false
	if (
		prevProps.attachments.some(
			(a, i) => a.url !== nextProps.attachments[i]?.url,
		)
	)
		return false

	// Messages comparison (length only for performance)
	if (prevProps.messages.length !== nextProps.messages.length) return false

	// Votes comparison
	if (prevProps.votes?.length !== nextProps.votes?.length) return false

	return true
})
