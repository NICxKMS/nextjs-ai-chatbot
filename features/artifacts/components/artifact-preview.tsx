"use client"

import dynamic from "next/dynamic"
import { memo, useCallback, useEffect, useMemo, useRef } from "react"
import useSWR from "swr"

import { CodeIcon, FileIcon, FullscreenIcon, ImageIcon, LoaderIcon } from "@/components/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { useArtifact } from "@/features/artifacts/hooks/use-artifact"
import { useArtifactSelector } from "@/features/artifacts/hooks/use-artifact-selector"
import type { ArtifactKind, ArtifactStatus } from "@/features/artifacts/types/artifact.types"
import { cn } from "@/lib/utils/cn"

// ── Lazy-loaded editors ─────────────────────────────────────
// Editors are heavy (TipTap, CodeMirror, react-data-grid) — only
// load when an artifact preview is actually rendered.

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

// ── Types ────────────────────────────────────────────────────

/** Shape returned by the artifact API (GET /api/artifact?id=<id>) */
type ArtifactVersionData = {
	id: string
	title: string
	kind: ArtifactKind
	content: string
	createdAt: string
}

/** Tool output from createArtifact / updateArtifact */
type ArtifactToolOutput = {
	id?: string
	title?: string
	kind?: string
	content?: string
	error?: string
}

type ArtifactPreviewProps = {
	result?: ArtifactToolOutput
	args?: { title?: string; kind?: string; id?: string }
}

// ── Fetcher ──────────────────────────────────────────────────

async function artifactFetcher(url: string): Promise<ArtifactVersionData[]> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
	return res.json()
}

// ── No-op save handler ──────────────────────────────────────
// Preview editors are read-only — save callback is never invoked.
// Uses the standardized EditorSaveCallback signature.

const noopSaveContent = () => {
	/* read-only preview — intentional noop */
}

// ── Kind icon mapping ───────────────────────────────────────

function KindIcon({ kind, isStreaming }: { kind: ArtifactKind; isStreaming: boolean }) {
	if (isStreaming) {
		return (
			<div className="animate-spin">
				<LoaderIcon />
			</div>
		)
	}

	switch (kind) {
		case "code":
			return <CodeIcon />
		case "image":
			return <ImageIcon />
		default:
			return <FileIcon />
	}
}

// ── Loading skeleton ────────────────────────────────────────

function PreviewSkeleton({ kind }: { kind?: ArtifactKind }) {
	return (
		<output className="block w-full" aria-label="Loading artifact preview">
			{/* Header skeleton */}
			<div className="flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700 dark:bg-muted">
				<div className="flex flex-row items-center gap-3">
					<Skeleton className="size-4" />
					<Skeleton className="h-4 w-24" />
				</div>
				<FullscreenIcon />
			</div>

			{/* Content skeleton */}
			{kind === "image" ? (
				<div className="overflow-hidden rounded-b-2xl border border-t-0 bg-muted dark:border-zinc-700">
					<Skeleton className="h-[257px] w-full rounded-none" />
				</div>
			) : (
				<div className="overflow-hidden rounded-b-2xl border border-t-0 bg-muted p-8 pt-4 dark:border-zinc-700">
					<div className="flex w-full flex-col gap-3">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-4 w-4/5" />
					</div>
				</div>
			)}
		</output>
	)
}

// ── Hitbox layer ────────────────────────────────────────────
// Transparent overlay that captures clicks and opens the full
// artifact panel with bounding box for origin animation.

const PureHitboxLayer = ({
	hitboxRef,
	artifactId,
	title,
	kind,
}: {
	hitboxRef: React.RefObject<HTMLButtonElement | null>
	artifactId: string
	title: string
	kind: ArtifactKind
}) => {
	const { setArtifact } = useArtifact()

	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			const boundingBox = event.currentTarget.getBoundingClientRect()

			setArtifact((prev) =>
				prev.status === "streaming"
					? { ...prev, isVisible: true }
					: {
							...prev,
							artifactId,
							title,
							kind,
							isVisible: true,
							boundingBox: {
								left: boundingBox.x,
								top: boundingBox.y,
								width: boundingBox.width,
								height: boundingBox.height,
							},
						},
			)
		},
		[setArtifact, artifactId, title, kind],
	)

	return (
		<button
			ref={hitboxRef}
			aria-label={`Open artifact: ${title}`}
			className="absolute top-0 left-0 z-10 size-full cursor-pointer rounded-xl border-0 bg-transparent p-0"
			onClick={handleClick}
			type="button"
		>
			<div className="flex w-full items-center justify-end p-4">
				<div className="absolute top-[13px] right-[9px] rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
					<FullscreenIcon />
				</div>
			</div>
		</button>
	)
}

const HitboxLayer = memo(PureHitboxLayer)

// ── Preview header ──────────────────────────────────────────

const PurePreviewHeader = ({
	title,
	kind,
	isStreaming,
}: {
	title: string
	kind: ArtifactKind
	isStreaming: boolean
}) => (
	<div className="flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700 dark:bg-muted">
		<div className="flex flex-row items-start gap-3 sm:items-center">
			<div className="text-muted-foreground">
				<KindIcon isStreaming={isStreaming} kind={kind} />
			</div>
			<div className="-translate-y-1 font-medium sm:translate-y-0">{title}</div>
		</div>
		<div className="w-8" />
	</div>
)

const PreviewHeader = memo(PurePreviewHeader, (prev, next) => {
	return (
		prev.title === next.title &&
		prev.kind === next.kind &&
		prev.isStreaming === next.isStreaming
	)
})

// ── Preview content ─────────────────────────────────────────
// Renders a read-only mini editor for the artifact content
// based on its kind.

function PreviewContent({
	content,
	kind,
	status,
}: {
	content: string
	kind: ArtifactKind
	status: ArtifactStatus
}) {
	const containerClassName = cn(
		"h-[257px] overflow-y-scroll rounded-b-2xl border border-t-0 dark:border-zinc-700 dark:bg-muted",
		{
			"p-4 sm:px-14 sm:py-16": kind === "text",
			"p-0": kind === "code",
		},
	)

	const commonProps = {
		content: content ?? "",
		isCurrentVersion: true,
		currentVersionIndex: 0,
		status,
		suggestions: [],
	}

	return (
		<div className={containerClassName}>
			{kind === "text" ? (
				<TextEditor {...commonProps} onSaveContent={noopSaveContent} />
			) : kind === "code" ? (
				<div className="relative flex w-full flex-1">
					<div className="absolute inset-0">
						<CodeEditor {...commonProps} onSaveContent={noopSaveContent} />
					</div>
				</div>
			) : kind === "sheet" ? (
				<div className="relative flex size-full flex-1 p-4">
					<div className="absolute inset-0">
						<SheetEditor
							content={content ?? ""}
							isCurrentVersion={true}
							currentVersionIndex={0}
							onSaveContent={noopSaveContent}
							status={status}
						/>
					</div>
				</div>
			) : kind === "image" ? (
				<ImageEditor
					content={content ?? ""}
					isCurrentVersion={true}
					isInline={true}
					status={status}
					title=""
				/>
			) : null}
		</div>
	)
}

// ── Main component ──────────────────────────────────────────

function PureArtifactPreview({ result, args }: ArtifactPreviewProps) {
	const artifactIsVisible = useArtifactSelector((s) => s.isVisible)
	const artifactStatus = useArtifactSelector((s) => s.status)
	const artifactContent = useArtifactSelector((s) => s.content)
	const artifactTitle = useArtifactSelector((s) => s.title)
	const artifactKind = useArtifactSelector((s) => s.kind)

	const hitboxRef = useRef<HTMLButtonElement>(null)
	const { setArtifact } = useArtifact()

	const artifactId = result?.id ?? args?.id
	const kind = (result?.kind ?? args?.kind ?? "text") as ArtifactKind
	const title = result?.title ?? args?.title ?? ""

	// Fetch artifact versions from API when we have a result with an ID
	const { data: versions, isLoading } = useSWR<ArtifactVersionData[]>(
		result?.id ? `/api/artifact?id=${result.id}` : null,
		artifactFetcher,
	)

	const latestVersion = useMemo(() => versions?.[0], [versions])

	// Update bounding box reference when the store's artifactId matches
	useEffect(() => {
		const boundingBox = hitboxRef.current?.getBoundingClientRect()
		if (artifactId && boundingBox) {
			setArtifact((current) => ({
				...current,
				boundingBox: {
					left: boundingBox.x,
					top: boundingBox.y,
					width: boundingBox.width,
					height: boundingBox.height,
				},
			}))
		}
	}, [artifactId, setArtifact])

	// If the artifact panel is already visible, show a compact result card
	if (artifactIsVisible) {
		if (result?.id && result.title && result.kind) {
			return (
				<CompactToolResult
					artifactId={result.id}
					kind={result.kind as ArtifactKind}
					title={result.title}
					type="result"
				/>
			)
		}
		if (args?.title && args.kind) {
			return (
				<CompactToolResult
					kind={args.kind as ArtifactKind}
					title={args.title}
					type="call"
				/>
			)
		}
	}

	// Show skeleton while fetching
	if (isLoading) {
		return <PreviewSkeleton kind={kind} />
	}

	// Resolve content — from fetched data OR streaming store state
	const resolvedContent = latestVersion
		? latestVersion.content
		: artifactStatus === "streaming"
			? artifactContent
			: null

	const resolvedTitle = latestVersion ? latestVersion.title : title || artifactTitle
	const resolvedKind = latestVersion ? latestVersion.kind : kind || artifactKind

	// Still loading/no content — show skeleton
	if (!resolvedContent && resolvedContent !== "") {
		return <PreviewSkeleton kind={resolvedKind} />
	}

	return (
		<div className="relative w-full cursor-pointer">
			{artifactId && (
				<HitboxLayer
					artifactId={artifactId}
					hitboxRef={hitboxRef}
					kind={resolvedKind}
					title={resolvedTitle}
				/>
			)}
			<PreviewHeader
				isStreaming={artifactStatus === "streaming"}
				kind={resolvedKind}
				title={resolvedTitle}
			/>
			<PreviewContent content={resolvedContent} kind={resolvedKind} status={artifactStatus} />
		</div>
	)
}

// ── Compact tool card ───────────────────────────────────────
// Shown when the artifact panel is already open — a minimal
// clickable card instead of the full mini-editor preview.

function CompactToolResult({
	artifactId,
	title,
	kind,
	type,
}: {
	artifactId?: string
	title: string
	kind: ArtifactKind
	type: "call" | "result"
}) {
	const { setArtifact } = useArtifact()

	const actionLabel = type === "result" ? "Created" : "Creating"
	const icon = kind === "image" ? <ImageIcon /> : kind === "code" ? <CodeIcon /> : <FileIcon />

	return (
		<button
			className="flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border bg-background px-3 py-2"
			onClick={(event) => {
				if (!artifactId) return
				const rect = event.currentTarget.getBoundingClientRect()
				setArtifact((prev) =>
					prev.status === "streaming"
						? { ...prev, isVisible: true }
						: {
								...prev,
								artifactId,
								kind,
								title,
								content: "",
								isVisible: true,
								boundingBox: {
									left: rect.x,
									top: rect.y,
									width: rect.width,
									height: rect.height,
								},
							},
				)
			}}
			type="button"
		>
			<div className="mt-1 text-muted-foreground">{icon}</div>
			<div className="text-left">
				{type === "call" ? (
					<>
						{actionLabel} &ldquo;{title}&rdquo;
						<span className="ml-2 inline-block animate-spin">
							<LoaderIcon />
						</span>
					</>
				) : (
					<>
						{actionLabel} &ldquo;{title}&rdquo;
					</>
				)}
			</div>
		</button>
	)
}

export const ArtifactPreview = memo(PureArtifactPreview)
ArtifactPreview.displayName = "ArtifactPreview"
