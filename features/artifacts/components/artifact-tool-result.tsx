"use client"

import { memo } from "react"

import { FileIcon, LoaderIcon, MessageIcon, PencilEditIcon } from "@/components/icons"
import { useArtifact } from "../hooks/use-artifact"
import type { ArtifactKind } from "../types/artifact.types"

// ── Helpers ──────────────────────────────────────────────────

function getActionText(
	type: "create" | "update" | "request-suggestions",
	tense: "present" | "past",
): string | null {
	switch (type) {
		case "create":
			return tense === "present" ? "Creating" : "Created"
		case "update":
			return tense === "present" ? "Updating" : "Updated"
		case "request-suggestions":
			return tense === "present" ? "Adding suggestions" : "Added suggestions to"
		default:
			return null
	}
}

function KindIcon({ type }: { type: "create" | "update" | "request-suggestions" }) {
	switch (type) {
		case "create":
			return <FileIcon />
		case "update":
			return <PencilEditIcon />
		case "request-suggestions":
			return <MessageIcon />
		default:
			return null
	}
}

// ── ArtifactToolResult — completed tool call ─────────────────

type ArtifactToolResultProps = {
	type: "create" | "update" | "request-suggestions"
	result: { id: string; title: string; kind: ArtifactKind }
}

function PureArtifactToolResult({ type, result }: ArtifactToolResultProps) {
	const { setArtifact } = useArtifact()

	return (
		<button
			className="flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border bg-background px-3 py-2 transition-colors hover:bg-muted/50"
			onClick={() => {
				setArtifact((currentArtifact) => ({
					...currentArtifact,
					artifactId: result.id,
					kind: result.kind,
					title: result.title,
					isVisible: true,
					status: "idle",
				}))
			}}
			type="button"
		>
			<div className="mt-1 text-muted-foreground">
				<KindIcon type={type} />
			</div>
			<div className="text-left text-sm">
				{`${getActionText(type, "past")} "${result.title}"`}
			</div>
		</button>
	)
}

export const ArtifactToolResult = memo(PureArtifactToolResult, () => true)

// ── ArtifactToolCall — in-progress tool call ─────────────────

type ArtifactToolCallProps = {
	type: "create" | "update" | "request-suggestions"
	args:
		| { title: string; kind: ArtifactKind }
		| { id: string; description: string }
		| { artifactId: string }
}

function PureArtifactToolCall({ type, args }: ArtifactToolCallProps) {
	return (
		<button
			className="flex w-fit cursor-pointer flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2"
			type="button"
		>
			<div className="flex flex-row items-start gap-3">
				<div className="mt-1 text-muted-foreground">
					<KindIcon type={type} />
				</div>
				<div className="text-left text-sm">
					{`${getActionText(type, "present")} ${
						type === "create" && "title" in args && args.title
							? `"${args.title}"`
							: type === "update" && "description" in args
								? `"${(args as { description: string }).description}"`
								: type === "request-suggestions"
									? "for artifact"
									: ""
					}`}
				</div>
			</div>
			<div className="mt-1 animate-spin">
				<LoaderIcon />
			</div>
		</button>
	)
}

export const ArtifactToolCall = memo(PureArtifactToolCall, () => true)
