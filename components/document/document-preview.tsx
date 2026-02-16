/**
 * Document Preview Component
 *
 * Preview component for displaying documents inline in chat messages.
 *
 * @module components/document/document-preview
 */

"use client"

import equal from "fast-deep-equal"
import dynamic from "next/dynamic"
import type { MouseEvent } from "react"
import { memo, useCallback, useEffect, useMemo, useRef } from "react"
import useSWR from "swr"
import {
	FileIcon,
	FullscreenIcon,
	ImageIcon,
	LoaderIcon,
} from "@/components/icons"
import { useArtifact } from "@/features/artifact/hooks/use-artifact"
import type { ArtifactKind, UIArtifact } from "@/features/artifact/types"
import { cn } from "@/lib/utils"
import { DocumentToolCall, DocumentToolResult } from "./document"
import { InlineDocumentSkeleton } from "./document-skeleton"

/**
 * Simple fetcher for SWR
 */
const fetcher = async (url: string) => {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error("Failed to fetch")
	}
	return res.json()
}

// Lazy load editors - they're only needed when viewing documents
const CodeEditor = dynamic(
	() =>
		import("@/features/artifact/components/editors/code-editor").then(
			(m) => ({ default: m.CodeEditor }),
		),
	{ ssr: false },
)

const ImageEditor = dynamic(
	() =>
		import("@/features/artifact/components/editors/image-editor").then(
			(m) => ({ default: m.ImageEditor }),
		),
	{ ssr: false },
)

const SheetEditor = dynamic(
	() =>
		import("@/features/artifact/components/editors/sheet-editor").then(
			(m) => ({ default: m.SheetEditor }),
		),
	{ ssr: false },
)

const TextEditor = dynamic(
	() =>
		import("@/features/artifact/components/editors/text-editor").then(
			(m) => ({ default: m.TextEditor }),
		),
	{ ssr: false },
)

/**
 * Document-like type for preview
 */
type DocumentLike = {
	title: string
	kind: ArtifactKind
	content: string
}

/**
 * Tool invocation arguments for document creation/update
 */
type DocumentToolArgs = {
	title?: string
	kind?: string
	id?: string
	isUpdate?: boolean
}

/**
 * Tool invocation result for document operations
 */
type DocumentToolResultData = {
	id?: string
	title?: string
	kind?: string
	success?: boolean
	error?: string
}

/**
 * Props for DocumentPreview component
 */
export type DocumentPreviewProps = {
	isReadonly: boolean
	result?: DocumentToolResultData
	args?: DocumentToolArgs
}

/**
 * DocumentPreview component - displays document preview inline in chat
 */
export function DocumentPreview({
	isReadonly,
	result,
	args,
}: DocumentPreviewProps) {
	const { artifact, setArtifact } = useArtifact()

	const { data: documents, isLoading: isDocumentsFetching } = useSWR<
		DocumentLike[]
	>(result ? `/api/document?id=${result.id}` : null, fetcher)

	const previewDocument = useMemo(() => documents?.[0], [documents])
	const hitboxRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const boundingBox = hitboxRef.current?.getBoundingClientRect()

		if (artifact.documentId && boundingBox) {
			setArtifact((currentArtifact) => ({
				...currentArtifact,
				boundingBox: {
					left: boundingBox.x,
					top: boundingBox.y,
					width: boundingBox.width,
					height: boundingBox.height,
				},
			}))
		}
	}, [artifact.documentId, setArtifact])

	if (artifact.isVisible) {
		if (result?.id && result.title && result.kind) {
			return (
				<DocumentToolResult
					isReadonly={isReadonly}
					result={{
						id: result.id,
						title: result.title,
						kind: result.kind as ArtifactKind,
					}}
					type="create"
				/>
			)
		}

		if (args?.title && args.kind) {
			return (
				<DocumentToolCall
					args={{
						title: args.title,
						kind: args.kind as ArtifactKind,
					}}
					isReadonly={isReadonly}
					type="create"
				/>
			)
		}
	}

	if (isDocumentsFetching) {
		return (
			<LoadingSkeleton
				artifactKind={(result?.kind ?? args?.kind) as ArtifactKind}
			/>
		)
	}

	const document: DocumentLike | null = previewDocument
		? previewDocument
		: artifact.status === "streaming"
			? {
					title: artifact.title,
					kind: artifact.kind,
					content: artifact.content,
				}
			: null

	if (!document) {
		return <LoadingSkeleton artifactKind={artifact.kind} />
	}

	return (
		<div className="relative w-full cursor-pointer">
			<HitboxLayer
				hitboxRef={hitboxRef}
				result={result}
				setArtifact={setArtifact}
			/>
			<DocumentHeader
				isStreaming={artifact.status === "streaming"}
				kind={document.kind}
				title={document.title}
			/>
			<DocumentContent document={document} />
		</div>
	)
}

/**
 * Loading skeleton for document preview
 */
const LoadingSkeleton = ({ artifactKind }: { artifactKind: ArtifactKind }) => (
	<div className="w-full">
		<div className="flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700 dark:bg-muted">
			<div className="flex flex-row items-center gap-3">
				<div className="text-muted-foreground">
					<div className="size-4 animate-pulse rounded-md bg-muted-foreground/20" />
				</div>
				<div className="h-4 w-24 animate-pulse rounded-lg bg-muted-foreground/20" />
			</div>
			<div>
				<FullscreenIcon />
			</div>
		</div>
		{artifactKind === "image" ? (
			<div className="overflow-y-scroll rounded-b-2xl border border-t-0 bg-muted dark:border-zinc-700">
				<div className="h-[257px] w-full animate-pulse bg-muted-foreground/20" />
			</div>
		) : (
			<div className="overflow-y-scroll rounded-b-2xl border border-t-0 bg-muted p-8 pt-4 dark:border-zinc-700">
				<InlineDocumentSkeleton />
			</div>
		)}
	</div>
)

/**
 * Props for HitboxLayer component
 */
type HitboxLayerProps = {
	hitboxRef: React.RefObject<HTMLDivElement | null>
	result: DocumentToolResultData | undefined
	setArtifact: (
		updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact),
	) => void
}

/**
 * Hitbox layer for click handling
 */
const PureHitboxLayer = ({
	hitboxRef,
	result,
	setArtifact,
}: HitboxLayerProps) => {
	const handleClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			const boundingBox = event.currentTarget.getBoundingClientRect()

			setArtifact((artifact) =>
				artifact.status === "streaming"
					? { ...artifact, isVisible: true }
					: {
							...artifact,
							title: result?.title ?? "",
							documentId: result?.id ?? "",
							kind: result?.kind as ArtifactKind,
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
		[setArtifact, result],
	)

	return (
		<div
			aria-hidden="true"
			className="absolute top-0 left-0 z-10 size-full rounded-xl"
			onClick={handleClick}
			ref={hitboxRef}
			role="presentation"
		>
			<div className="flex w-full items-center justify-end p-4">
				<div className="absolute top-[13px] right-[9px] rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
					<FullscreenIcon />
				</div>
			</div>
		</div>
	)
}

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
	if (!equal(prevProps.result, nextProps.result)) {
		return false
	}
	return true
})

/**
 * Props for DocumentHeader component
 */
type DocumentHeaderProps = {
	title: string
	kind: ArtifactKind
	isStreaming: boolean
}

/**
 * Document header with title and icon
 */
const PureDocumentHeader = ({
	title,
	kind,
	isStreaming,
}: DocumentHeaderProps) => (
	<div className="flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700 dark:bg-muted">
		<div className="flex flex-row items-start gap-3 sm:items-center">
			<div className="text-muted-foreground">
				{isStreaming ? (
					<div className="animate-spin">
						<LoaderIcon />
					</div>
				) : kind === "image" ? (
					<ImageIcon />
				) : (
					<FileIcon />
				)}
			</div>
			<div className="-translate-y-1 font-medium sm:translate-y-0">
				{title}
			</div>
		</div>
		<div className="w-8" />
	</div>
)

const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
	if (prevProps.title !== nextProps.title) {
		return false
	}
	if (prevProps.isStreaming !== nextProps.isStreaming) {
		return false
	}

	return true
})

/**
 * Document content renderer
 */
const DocumentContent = ({ document }: { document: DocumentLike }) => {
	const { artifact } = useArtifact()

	const containerClassName = cn(
		"h-[257px] overflow-y-scroll rounded-b-2xl border border-t-0 dark:border-zinc-700 dark:bg-muted",
		{
			"p-4 sm:px-14 sm:py-16": document.kind === "text",
			"p-0": document.kind === "code",
		},
	)

	const handleSaveContent = (_content: string, _debounce: boolean) => {
		// No-op for preview
	}

	return (
		<div className={containerClassName}>
			{document.kind === "text" ? (
				<TextEditor
					content={document.content ?? ""}
					onSaveContent={handleSaveContent}
					status={artifact.status}
					isCurrentVersion={true}
					currentVersionIndex={0}
					suggestions={[]}
				/>
			) : document.kind === "code" ? (
				<div className="relative flex w-full flex-1">
					<div className="absolute inset-0">
						<CodeEditor
							content={document.content ?? ""}
							onSaveContent={handleSaveContent}
							status={artifact.status}
							isCurrentVersion={true}
							currentVersionIndex={0}
							suggestions={[]}
						/>
					</div>
				</div>
			) : document.kind === "sheet" ? (
				<div className="relative flex size-full flex-1 p-4">
					<div className="absolute inset-0">
						<SheetEditor
							content={document.content ?? ""}
							onSaveContent={handleSaveContent}
							status={artifact.status}
							isCurrentVersion={true}
							currentVersionIndex={0}
						/>
					</div>
				</div>
			) : document.kind === "image" ? (
				<ImageEditor
					content={document.content ?? ""}
					currentVersionIndex={0}
					isCurrentVersion={true}
					isInline={true}
					status={artifact.status}
					title={document.title}
				/>
			) : null}
		</div>
	)
}
