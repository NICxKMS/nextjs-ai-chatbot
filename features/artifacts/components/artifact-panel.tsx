"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
	type Dispatch,
	memo,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import { toast } from "sonner"
import useSWR from "swr"

import { MotionProvider } from "@/components/motion-provider"
import type { Artifact } from "@/lib/types/models.types"
import { cn } from "@/lib/utils/cn"

import { useArtifact } from "../hooks/use-artifact"
import type { ArtifactAction } from "../types/artifact.types"
import { ArtifactPanelEditor } from "./artifact-panel-editor"
import { ArtifactPanelHeader } from "./artifact-panel-header"
import {
	artifactVersionFetcher,
	DEFAULT_SAVE_ERROR_MESSAGE,
	mergeArtifactVersion,
	readSaveErrorMessage,
	SAVE_DEBOUNCE_MS,
	type SaveState,
} from "./artifact-save-utils"
import { VersionFooter } from "./version-footer"

// ── Constants ───────────────────────────────────────────────

/** Kind-specific actions. Empty for now — wired per handler in future tasks. */
const KIND_ACTIONS: Record<string, ArtifactAction[]> = {
	text: [],
	code: [],
	sheet: [],
	image: [],
}

// ── Panel animation config ──────────────────────────────────

const SPRING_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 30 }

// ── Main component ──────────────────────────────────────────

interface ArtifactPanelProps {
	chatId: string
}

function PureArtifactPanel({ chatId }: ArtifactPanelProps) {
	const { artifact, setArtifact } = useArtifact()

	// ── Focus management ──────────────────────────────────────
	// Save the element that was focused before the panel opened,
	// move focus into the panel on open, restore on close.

	const panelRef = useRef<HTMLDivElement>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (artifact.isVisible) {
			// Save the currently focused element before the panel opens
			previousFocusRef.current = document.activeElement as HTMLElement | null
			// Focus the panel container after animation frame to ensure it's mounted
			requestAnimationFrame(() => {
				panelRef.current?.focus()
			})
		} else if (previousFocusRef.current) {
			// Restore focus to the element that was focused before the panel opened
			previousFocusRef.current.focus()
			previousFocusRef.current = null
		}
	}, [artifact.isVisible])

	// ── Version data via SWR ──────────────────────────────────

	const swrKey =
		artifact.artifactId !== "init" && artifact.status !== "streaming"
			? `/api/artifact?id=${artifact.artifactId}`
			: null

	const { data: versions, mutate: mutateVersions } = useSWR<Artifact[]>(
		swrKey,
		artifactVersionFetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
		},
	)

	const panelVersions = useMemo(
		() => (versions ? [...versions].reverse() : undefined),
		[versions],
	)

	// ── Local state ───────────────────────────────────────────

	const [currentVersionIndex, setCurrentVersionIndex] = useState(-1)
	const [isContentDirty, setIsContentDirty] = useState(false)
	const [saveState, setSaveState] = useState<SaveState>("idle")
	const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
	const [metadata, setMetadata] = useState<unknown>(null)
	const lastEditedContentRef = useRef(artifact.content)

	// ── Sync version index when versions load ────────────────

	useEffect(() => {
		if (!isContentDirty && panelVersions && panelVersions.length > 0) {
			const latest = panelVersions.at(-1)
			if (latest) {
				const latestContent = latest.content ?? ""
				const latestIndex = panelVersions.length - 1

				if (currentVersionIndex !== latestIndex) {
					setCurrentVersionIndex(latestIndex)
				}

				lastEditedContentRef.current = latestContent
				if (artifact.content !== latestContent) {
					setArtifact((prev) => ({
						...prev,
						content: latestContent,
					}))
				}
			}
		}
	}, [artifact.content, currentVersionIndex, isContentDirty, panelVersions, setArtifact])

	// Reset mode to edit when streaming starts
	useEffect(() => {
		if (artifact.status === "streaming") {
			setIsContentDirty(false)
			setSaveState("idle")
			setSaveErrorMessage(null)
			lastEditedContentRef.current = artifact.content
		}
	}, [artifact.content, artifact.status])

	// ── Derived state ─────────────────────────────────────────

	const isCurrentVersion =
		panelVersions && panelVersions.length > 0
			? currentVersionIndex === panelVersions.length - 1
			: true

	const currentVersion = panelVersions?.[currentVersionIndex] ?? null

	function getContentByVersionIndex(index: number): string {
		if (!panelVersions?.[index]) return ""
		return panelVersions[index].content ?? ""
	}

	const displayContent = isCurrentVersion
		? artifact.content
		: getContentByVersionIndex(currentVersionIndex)

	// ── Version navigation ────────────────────────────────────

	const handleVersionChange = useCallback(
		(type: "next" | "prev" | "toggle" | "latest") => {
			if (!panelVersions) return

			if (type === "latest") {
				setCurrentVersionIndex(panelVersions.length - 1)
			} else if (type === "prev") {
				setCurrentVersionIndex((i) => Math.max(0, i - 1))
			} else if (type === "next") {
				setCurrentVersionIndex((i) => Math.min(panelVersions.length - 1, i + 1))
			}
			// "toggle" is a no-op — diff mode deferred to post-MVP (Wave 4: AR-8)
		},
		[panelVersions],
	)

	// ── Save logic ────────────────────────────────────────────

	const pendingSaveRef = useRef<AbortController | null>(null)
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleSave = useCallback(
		async (updatedContent: string) => {
			if (artifact.artifactId === "init") return

			lastEditedContentRef.current = updatedContent

			// Cancel any pending save to prevent race conditions
			if (pendingSaveRef.current) {
				pendingSaveRef.current.abort()
			}
			const controller = new AbortController()
			pendingSaveRef.current = controller
			setSaveState("pending")
			setSaveErrorMessage(null)

			try {
				const res = await fetch("/api/artifact", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: artifact.artifactId,
						title: artifact.title,
						content: updatedContent,
						kind: artifact.kind,
						chatId,
						mode: "save",
					}),
					signal: controller.signal,
				})

				pendingSaveRef.current = null

				if (!res.ok) {
					const message = await readSaveErrorMessage(res)
					setSaveState("error")
					setSaveErrorMessage(message)
					toast.error(message)
					return
				}

				setIsContentDirty(false)
				setSaveState("idle")
				setSaveErrorMessage(null)

				if (typeof res.json !== "function") {
					await mutateVersions()
					return
				}

				const responseBody = (await res.json()) as { artifact?: Artifact }
				if (!responseBody.artifact) {
					await mutateVersions()
					return
				}

				const savedArtifact = responseBody.artifact
				lastEditedContentRef.current = savedArtifact.content ?? updatedContent

				await mutateVersions(
					(currentVersions) => mergeArtifactVersion(currentVersions, savedArtifact),
					{ revalidate: false },
				)
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") return
				pendingSaveRef.current = null
				setSaveState("error")
				setSaveErrorMessage(DEFAULT_SAVE_ERROR_MESSAGE)
				toast.error(DEFAULT_SAVE_ERROR_MESSAGE)
			}
		},
		[artifact.artifactId, artifact.title, artifact.kind, chatId, mutateVersions],
	)

	/**
	 * Unified save callback for all artifact editors.
	 * Signature: `(content: string, options?: { debounce?: boolean }) => void`
	 * Debounce defaults to `true` when not specified.
	 */
	const saveContent = useCallback(
		(updatedContent: string, options?: { debounce?: boolean }) => {
			if (!panelVersions || panelVersions.length === 0) return

			const latestDoc = panelVersions.at(-1)
			if (!latestDoc) return

			lastEditedContentRef.current = updatedContent
			const latestContent = latestDoc.content ?? ""

			if (updatedContent === latestContent) {
				if (debounceTimerRef.current) {
					clearTimeout(debounceTimerRef.current)
					debounceTimerRef.current = null
				}

				if (pendingSaveRef.current) {
					pendingSaveRef.current.abort()
					pendingSaveRef.current = null
				}

				setIsContentDirty(false)
				setSaveState("idle")
				setSaveErrorMessage(null)
				return
			}

			setIsContentDirty(true)
			setSaveState("idle")
			setSaveErrorMessage(null)

			const shouldDebounce = options?.debounce ?? true

			if (shouldDebounce) {
				if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
				debounceTimerRef.current = setTimeout(() => {
					handleSave(updatedContent)
				}, SAVE_DEBOUNCE_MS)
			} else {
				handleSave(updatedContent)
			}
		},
		[panelVersions, handleSave],
	)

	// ── Cleanup debounce timer on unmount ─────────────────────

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
			pendingSaveRef.current?.abort()
		}
	}, [])

	// ── Actions for current kind ──────────────────────────────

	const actions = KIND_ACTIONS[artifact.kind] ?? []

	// ── Render ────────────────────────────────────────────────

	return (
		<MotionProvider>
			<AnimatePresence>
				{artifact.isVisible && (
					<motion.div
						animate={{
							opacity: 1,
							y: 0,
							x: 0,
							width: "100dvw",
							height: "100dvh",
							borderRadius: 0,
							transition: { ...SPRING_TRANSITION, duration: 0.5 },
						}}
						aria-label={`Artifact: ${artifact.title}`}
						className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-col overflow-hidden border-zinc-200 bg-background dark:border-zinc-700 dark:bg-muted"
						data-testid="artifact-panel"
						ref={panelRef}
						role="dialog"
						tabIndex={-1}
						exit={{
							opacity: 0,
							scale: 0.5,
							transition: {
								delay: 0.1,
								type: "spring",
								stiffness: 600,
								damping: 30,
							},
						}}
						initial={
							artifact.boundingBox
								? {
										opacity: 1,
										x: artifact.boundingBox.left,
										y: artifact.boundingBox.top,
										width: artifact.boundingBox.width,
										height: artifact.boundingBox.height,
										borderRadius: 50,
									}
								: { opacity: 0, scale: 0.95 }
						}
					>
						{/* ── Header ─────────────────────────────── */}
						<ArtifactPanelHeader
							artifactTitle={artifact.title}
							artifactKind={artifact.kind}
							artifactStatus={artifact.status}
							saveState={saveState}
							saveErrorMessage={saveErrorMessage}
							isContentDirty={isContentDirty}
							currentVersion={currentVersion}
							onRetrySave={() => {
								void handleSave(lastEditedContentRef.current)
							}}
							actions={actions}
							currentVersionIndex={currentVersionIndex}
							handleVersionChange={handleVersionChange}
							isCurrentVersion={isCurrentVersion}
							metadata={metadata}
							setMetadata={setMetadata as Dispatch<SetStateAction<unknown>>}
						/>

						{/* ── Editor area ────────────────────────── */}
						<div
							className={cn(
								"relative flex-1 overflow-y-auto bg-background dark:bg-muted",
								{ "p-4 sm:px-14 sm:py-8": artifact.kind === "text" },
							)}
						>
							<ArtifactPanelEditor
								kind={artifact.kind}
								content={displayContent}
								status={artifact.status}
								isCurrentVersion={isCurrentVersion}
								currentVersionIndex={currentVersionIndex}
								onSaveContent={saveContent}
								suggestions={artifact.suggestions ?? []}
								title={artifact.title}
							/>
						</div>

						{/* ── Version footer ─────────────────────── */}
						<AnimatePresence>
							{!isCurrentVersion && (
								<VersionFooter
									currentVersionIndex={currentVersionIndex}
									versions={panelVersions}
									handleVersionChange={handleVersionChange}
									onVersionRestore={mutateVersions}
								/>
							)}
						</AnimatePresence>
					</motion.div>
				)}
			</AnimatePresence>
		</MotionProvider>
	)
}

export const ArtifactPanel = memo(PureArtifactPanel)
