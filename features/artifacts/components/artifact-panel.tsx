"use client"

import { formatDistance } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"
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

import { LoaderIcon } from "@/components/icons"
import { MotionProvider } from "@/components/motion-provider"
import { Badge } from "@/components/ui/badge"
import type { Artifact } from "@/lib/types/models.types"
import { cn } from "@/lib/utils/cn"

import { useArtifact } from "../hooks/use-artifact"
import { useArtifactSelector } from "../hooks/use-artifact-selector"
import type { ArtifactAction } from "../types/artifact.types"
import { ArtifactActions } from "./artifact-actions"
import { ArtifactCloseButton } from "./artifact-close-button"
import { ArtifactErrorBoundary } from "./artifact-error-boundary"
import { VersionFooter } from "./version-footer"

// ── Lazy-loaded editors ─────────────────────────────────────
// Editors are heavy (TipTap, CodeMirror, react-data-grid) — only
// load when the artifact panel is actually rendered.

const TextEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/text-editor").then((m) => ({
			default: m.TextEditor,
		})),
	{ ssr: false },
)

const CodeEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/code-editor").then((m) => ({
			default: m.CodeEditor,
		})),
	{ ssr: false },
)

const SheetEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/sheet-editor").then((m) => ({
			default: m.SheetEditor,
		})),
	{ ssr: false },
)

const ImageEditor = dynamic(
	() =>
		import("@/features/artifacts/components/editors/image-editor").then((m) => ({
			default: m.ImageEditor,
		})),
	{ ssr: false },
)

// ── SWR fetcher ─────────────────────────────────────────────

async function artifactVersionFetcher(url: string): Promise<Artifact[]> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
	return res.json()
}

function mergeArtifactVersion(versions: Artifact[] | undefined, nextVersion: Artifact): Artifact[] {
	const remainingVersions =
		versions?.filter((version) => version.createdAt !== nextVersion.createdAt) ?? []

	return [nextVersion, ...remainingVersions]
}

type SaveState = "idle" | "pending" | "error"

const DEFAULT_SAVE_ERROR_MESSAGE = "Failed to save changes. Please try again."

async function readSaveErrorMessage(response: Response): Promise<string> {
	if (typeof response.json === "function") {
		try {
			const body = (await response.json()) as {
				message?: string
				error?: string
				errorMessage?: string
			}

			for (const candidate of [body.message, body.error, body.errorMessage]) {
				if (typeof candidate === "string" && candidate.trim().length > 0) {
					return candidate
				}
			}
		} catch {
			// Fall back to the generic save error below.
		}
	}

	return DEFAULT_SAVE_ERROR_MESSAGE
}

// ── Constants ───────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 2000

/** Kind-specific actions. Empty for now — wired per handler in future tasks. */
const KIND_ACTIONS: Record<string, ArtifactAction[]> = {
	text: [],
	code: [],
	sheet: [],
	image: [],
}

// ── Kind badge label ────────────────────────────────────────

function kindLabel(kind: string): string {
	switch (kind) {
		case "text":
			return "Text"
		case "code":
			return "Code"
		case "sheet":
			return "Sheet"
		case "image":
			return "Image"
		default:
			return kind
	}
}

// ── Panel animation config ──────────────────────────────────

const SPRING_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 30 }

// ── Main component ──────────────────────────────────────────

interface ArtifactPanelProps {
	chatId: string
}

function PureArtifactPanel({ chatId }: ArtifactPanelProps) {
	const { artifact, setArtifact } = useArtifact()
	const isVisible = useArtifactSelector((s) => s.isVisible)

	// ── Focus management ──────────────────────────────────────
	// Save the element that was focused before the panel opened,
	// move focus into the panel on open, restore on close.

	const panelRef = useRef<HTMLDivElement>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (isVisible) {
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
	}, [isVisible])

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

	// ── Editor rendering ──────────────────────────────────────

	function renderEditor() {
		const commonProps = {
			content: displayContent,
			status: artifact.status,
			isCurrentVersion,
			currentVersionIndex,
		}

		switch (artifact.kind) {
			case "text":
				return (
					<TextEditor
						{...commonProps}
						onSaveContent={saveContent}
						suggestions={artifact.suggestions ?? []}
					/>
				)
			case "code":
				return <CodeEditor {...commonProps} onSaveContent={saveContent} />
			case "sheet":
				return <SheetEditor {...commonProps} onSaveContent={saveContent} />
			case "image":
				return <ImageEditor {...commonProps} title={artifact.title} />
			default:
				return (
					<div className="flex h-full items-center justify-center text-muted-foreground">
						Unsupported artifact kind: {artifact.kind}
					</div>
				)
		}
	}

	// ── Status subtitle ───────────────────────────────────────

	function renderStatus() {
		if (artifact.status === "streaming") {
			return (
				<div className="flex items-center gap-1.5 text-muted-foreground text-sm">
					<div className="animate-spin">
						<LoaderIcon size={12} />
					</div>
					Generating…
				</div>
			)
		}

		if (saveState === "pending") {
			return <div className="text-muted-foreground text-sm">Saving changes…</div>
		}

		if (saveState === "error") {
			return (
				<div className="flex items-center gap-2 text-sm">
					<div className="text-destructive">
						{saveErrorMessage ?? DEFAULT_SAVE_ERROR_MESSAGE}
					</div>
					<button
						className="cursor-pointer font-medium text-foreground underline underline-offset-4"
						onClick={() => {
							void handleSave(lastEditedContentRef.current)
						}}
						type="button"
					>
						Retry save
					</button>
				</div>
			)
		}

		if (isContentDirty) {
			return <div className="text-muted-foreground text-sm">Unsaved changes</div>
		}

		if (currentVersion) {
			return (
				<div className="text-muted-foreground text-sm">
					{`Updated ${formatDistance(new Date(currentVersion.createdAt), new Date(), { addSuffix: true })}`}
				</div>
			)
		}

		return <div className="mt-1 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
	}

	// ── Render ────────────────────────────────────────────────

	return (
		<MotionProvider>
			<AnimatePresence>
				{isVisible && (
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
						<div className="flex flex-row items-start justify-between border-b p-2">
							<div className="flex flex-row items-start gap-4">
								<ArtifactCloseButton />
								<div className="flex flex-col gap-0.5">
									<div className="flex items-center gap-2">
										<span className="font-medium">{artifact.title}</span>
										<Badge variant="secondary" className="text-xs capitalize">
											{kindLabel(artifact.kind)}
										</Badge>
									</div>
									{renderStatus()}
								</div>
							</div>

							<ArtifactActions
								actions={actions}
								currentVersionIndex={currentVersionIndex}
								handleVersionChange={handleVersionChange}
								isCurrentVersion={isCurrentVersion}
								metadata={metadata}
								mode="edit"
								setMetadata={setMetadata as Dispatch<SetStateAction<unknown>>}
							/>
						</div>

						{/* ── Editor area ────────────────────────── */}
						<div
							className={cn(
								"relative flex-1 overflow-y-auto bg-background dark:bg-muted",
								{ "p-4 sm:px-14 sm:py-8": artifact.kind === "text" },
							)}
						>
							<ArtifactErrorBoundary>{renderEditor()}</ArtifactErrorBoundary>
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
