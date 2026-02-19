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
import { toast } from "sonner"
import useSWR, { useSWRConfig } from "swr"
import { useDebounceCallback } from "usehooks-ts"
import { VersionFooter } from "@/components"
import { DiffView } from "@/components/document/diffview"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useSidebar } from "@/components/ui/sidebar"
import type { Attachment, ChatMessage, UserVote } from "@/features/chat/types"
import { MultimodalInput } from "@/features/input/components/multimodal-input"
import { useWindowSize } from "@/hooks/use-window-size"
import type { Artifact } from "@/lib/db/schema"
import { AnimatePresence, motion } from "@/lib/motion"

import { getVersionHistory, updateArtifact } from "../actions"
import { useArtifact } from "../hooks"
import type { ArtifactKind } from "../types"
import { ArtifactActions } from "./artifact-actions"
import { ArtifactClose } from "./artifact-close"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { ArtifactMessages } from "./artifact-messages"
import { Toolbar as ArtifactToolbar } from "./toolbar"

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
		Artifact[]
	>(
		artifact.documentId !== "init" && artifact.status !== "streaming"
			? `artifact-versions-${artifact.documentId}`
			: null,
		async () => await getVersionHistory(artifact.documentId),
	)

	const [mode, setMode] = useState<"edit" | "diff">("edit")
	const [currentDocument, setCurrentDocument] = useState<Artifact | null>(
		null,
	)
	const [currentVersionIndex, setCurrentVersionIndex] = useState(-1)
	const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
	const [historyVersionIndex, setHistoryVersionIndex] = useState(-1)

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
				setCurrentDocument(mostRecentDocument)
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

			mutate<Artifact[]>(
				`artifact-versions-${artifact.documentId}`,
				async (currentDocuments) => {
					if (!currentDocuments) {
						return []
					}

					const currentDocument = currentDocuments.at(-1)
					const currentContent = currentDocument?.content ?? ""

					if (!currentDocument) {
						setIsContentDirty(false)
						return currentDocuments
					}

					if (currentContent !== updatedContent) {
						try {
							const updatedVersion = await updateArtifact(
								artifact.documentId,
								{
									content: updatedContent,
									title: artifact.title,
								},
							)

							setIsContentDirty(false)
							pendingSaveRef.current = null
							return [...currentDocuments, updatedVersion]
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
			if (!currentDocument) {
				return
			}

			if (updatedContent !== currentDocument.content) {
				setIsContentDirty(true)

				if (debounce) {
					debouncedHandleContentChange(updatedContent)
				} else {
					handleContentChange(updatedContent)
				}
			}
		},
		[currentDocument, debouncedHandleContentChange, handleContentChange],
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

	const activeContent = isCurrentVersion
		? artifact.content
		: getDocumentContentById(currentVersionIndex)

	const copyContent = useCallback(async () => {
		if (!activeContent) {
			return
		}

		await navigator.clipboard.writeText(activeContent)
		toast.success("Copied to clipboard!")
	}, [activeContent])

	const downloadContent = () => {
		if (!activeContent) {
			return
		}

		const safeTitle =
			artifact.title
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "") || `artifact-${artifact.documentId}`

		let extension = "txt"
		let mimeType = "text/plain;charset=utf-8"
		let href: string
		let objectUrl: string | null = null

		if (artifact.kind === "text") {
			extension = "md"
			mimeType = "text/markdown;charset=utf-8"
			href = URL.createObjectURL(
				new Blob([activeContent], { type: mimeType }),
			)
			objectUrl = href
		} else if (artifact.kind === "code") {
			extension = "py"
			href = URL.createObjectURL(
				new Blob([activeContent], { type: mimeType }),
			)
			objectUrl = href
		} else if (artifact.kind === "sheet") {
			extension = "csv"
			mimeType = "text/csv;charset=utf-8"
			href = URL.createObjectURL(
				new Blob([activeContent], { type: mimeType }),
			)
			objectUrl = href
		} else if (activeContent.startsWith("data:image/")) {
			extension = "png"
			href = activeContent
		} else {
			href = URL.createObjectURL(
				new Blob([activeContent], { type: mimeType }),
			)
			objectUrl = href
		}

		const anchor = document.createElement("a")
		anchor.href = href
		anchor.download = `${safeTitle}.${extension}`
		anchor.rel = "noopener noreferrer"
		document.body.append(anchor)
		anchor.click()
		anchor.remove()

		if (objectUrl) {
			URL.revokeObjectURL(objectUrl)
		}

		toast.success("Download started")
	}

	const openVersionHistory = useCallback(() => {
		if (!documents || documents.length === 0) {
			return
		}

		const initialIndex =
			currentVersionIndex >= 0
				? currentVersionIndex
				: documents.length - 1
		setHistoryVersionIndex(initialIndex)
		setIsVersionHistoryOpen(true)
	}, [currentVersionIndex, documents])

	const selectedHistoryVersion =
		historyVersionIndex >= 0 && documents
			? documents[historyVersionIndex]
			: undefined

	const previousHistoryVersion =
		historyVersionIndex > 0 && documents
			? documents[historyVersionIndex - 1]
			: undefined

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
								artifactDocumentId={artifact.documentId}
								artifactKind={artifact.kind}
								artifactStatus={artifact.status}
								artifactTitle={artifact.title}
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
						className={`fixed right-0 relative flex h-dvh flex-col overflow-y-scroll border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted ${
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
									) : currentDocument ? (
										<div className="text-muted-foreground text-sm">
											{`Updated ${formatDistance(
												new Date(
													currentDocument.createdAt,
												),
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
								contentOverride={activeContent}
								onDownload={downloadContent}
								onOpenVersionHistory={openVersionHistory}
								setMetadata={setMetadata}
							/>
						</div>

						<ArtifactToolbar
							canRedo={!isCurrentVersion}
							canUndo={currentVersionIndex > 0}
							isCurrentVersion={isCurrentVersion}
							onCopy={() => {
								void copyContent()
							}}
							onDownload={downloadContent}
							onOpenVersionHistory={openVersionHistory}
							onRedo={() => handleVersionChange("next")}
							onUndo={() => handleVersionChange("prev")}
							status={
								status === "streaming" ? "streaming" : "idle"
							}
						/>

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
						</div>

						<AnimatePresence>
							{!isCurrentVersion && documents && (
								<VersionFooter
									currentVersionIndex={currentVersionIndex}
									documents={documents}
									handleVersionChange={handleVersionChange}
								/>
							)}
						</AnimatePresence>

						<Dialog
							onOpenChange={setIsVersionHistoryOpen}
							open={isVersionHistoryOpen}
						>
							<DialogContent className="max-w-4xl">
								<DialogHeader>
									<DialogTitle>Version history</DialogTitle>
									<DialogDescription>
										Compare saved versions and jump to a
										selected version.
									</DialogDescription>
								</DialogHeader>

								{documents && documents.length > 1 ? (
									<div className="grid gap-4 md:grid-cols-[220px_1fr]">
										<div className="max-h-[360px] overflow-y-auto rounded-md border">
											{documents.map((version, index) => (
												<button
													className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted ${
														historyVersionIndex ===
														index
															? "bg-muted"
															: ""
													}`}
													key={`${version.id}-${new Date(
														version.createdAt,
													).toISOString()}`}
													onClick={() =>
														setHistoryVersionIndex(
															index,
														)
													}
													type="button"
												>
													<span className="font-medium">
														Version {index + 1}
													</span>
													<span className="text-muted-foreground text-xs">
														{formatDistance(
															new Date(
																version.createdAt,
															),
															new Date(),
															{
																addSuffix: true,
															},
														)}
													</span>
												</button>
											))}
										</div>

										<div className="max-h-[360px] overflow-y-auto rounded-md border p-2">
											{selectedHistoryVersion &&
											previousHistoryVersion ? (
												<DiffView
													newContent={
														selectedHistoryVersion.content ??
														""
													}
													oldContent={
														previousHistoryVersion.content ??
														""
													}
												/>
											) : (
												<div className="flex h-full min-h-[280px] items-center justify-center text-muted-foreground text-sm">
													Select a version after the
													first one to compare against
													its previous revision.
												</div>
											)}
										</div>
									</div>
								) : (
									<div className="text-muted-foreground text-sm">
										Version history becomes available after
										at least two saved versions.
									</div>
								)}

								<DialogFooter>
									<Button
										onClick={() =>
											setIsVersionHistoryOpen(false)
										}
										variant="outline"
									>
										Close
									</Button>
									<Button
										disabled={
											historyVersionIndex < 0 ||
											!documents?.[historyVersionIndex]
										}
										onClick={() => {
											if (historyVersionIndex >= 0) {
												setCurrentVersionIndex(
													historyVersionIndex,
												)
												setMode("edit")
											}
											setIsVersionHistoryOpen(false)
										}}
									>
										View selected version
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
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
