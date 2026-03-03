"use client"

import { Extension } from "@tiptap/core"
import type { Node } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import { createRoot } from "react-dom/client"

import { CrossIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import type { ArtifactSuggestion } from "@/lib/types/artifact.types"

// ── Types ────────────────────────────────────────────────────

export interface UISuggestion extends ArtifactSuggestion {
	id: string
	selectionStart: number
	selectionEnd: number
}

type Position = { start: number; end: number }

// ── Helpers ──────────────────────────────────────────────────

function findPositionInDoc(doc: Node, searchText: string): Position | null {
	let result: Position | null = null

	doc.nodesBetween(0, doc.content.size, (node, pos) => {
		if (node.isText && node.text) {
			const index = node.text.indexOf(searchText)
			if (index !== -1) {
				result = { start: pos + index, end: pos + index + searchText.length }
				return false
			}
		}
		return true
	})

	return result
}

export function projectWithPositions(doc: Node, suggestions: ArtifactSuggestion[]): UISuggestion[] {
	return suggestions.map((suggestion, index) => {
		const position = findPositionInDoc(doc, suggestion.originalText)
		return {
			...suggestion,
			id: `suggestion-${index}`,
			selectionStart: position?.start ?? 0,
			selectionEnd: position?.end ?? 0,
		}
	})
}

// ── Suggestion widget ────────────────────────────────────────

function SuggestionWidget({
	suggestion,
	onApply,
	onDismiss,
}: {
	suggestion: UISuggestion
	onApply: () => void
	onDismiss: () => void
}) {
	return (
		<span className="relative inline-block">
			<span className="absolute -right-12 top-0 z-50 flex w-56 flex-col gap-2 rounded-xl border bg-background p-3 font-sans text-sm shadow-xl md:-right-16">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-4 rounded-full bg-muted-foreground/25" />
						<span className="font-medium">Assistant</span>
					</div>
					<button
						className="cursor-pointer text-muted-foreground"
						onClick={onDismiss}
						title="Dismiss suggestion"
						type="button"
					>
						<CrossIcon size={12} />
					</button>
				</div>
				<p className="text-muted-foreground">{suggestion.description}</p>
				<Button
					className="w-fit rounded-full px-3 py-1.5"
					onClick={onApply}
					size="sm"
					variant="outline"
				>
					Apply
				</Button>
			</span>
		</span>
	)
}

function createSuggestionWidget(
	suggestion: UISuggestion,
	view: EditorView,
): { dom: HTMLElement; destroy: () => void } {
	const dom = document.createElement("span")
	const root = createRoot(dom)

	const handleMouseDown = (event: MouseEvent) => {
		event.preventDefault()
		view.dom.blur()
	}

	dom.addEventListener("mousedown", handleMouseDown)

	const onApply = () => {
		const { state, dispatch } = view
		// Remove decoration for this suggestion
		const currentState = suggestionsPluginKey.getState(state)
		if (currentState?.decorations) {
			const remaining = DecorationSet.create(
				state.doc,
				currentState.decorations
					.find()
					.filter((d: Decoration) => d.spec.suggestionId !== suggestion.id),
			)
			dispatch(
				state.tr.setMeta(suggestionsPluginKey, { decorations: remaining, selected: null }),
			)
		}
		// Replace text
		const tr = view.state.tr.replaceWith(
			suggestion.selectionStart,
			suggestion.selectionEnd,
			state.schema.text(suggestion.suggestedText),
		)
		tr.setMeta("no-debounce", true)
		dispatch(tr)
	}

	const onDismiss = () => {
		const { state, dispatch } = view
		const currentState = suggestionsPluginKey.getState(state)
		if (currentState?.decorations) {
			const remaining = DecorationSet.create(
				state.doc,
				currentState.decorations
					.find()
					.filter((d: Decoration) => d.spec.suggestionId !== suggestion.id),
			)
			dispatch(
				state.tr.setMeta(suggestionsPluginKey, { decorations: remaining, selected: null }),
			)
		}
	}

	root.render(
		<SuggestionWidget suggestion={suggestion} onApply={onApply} onDismiss={onDismiss} />,
	)

	return {
		dom,
		destroy: () => {
			dom.removeEventListener("mousedown", handleMouseDown)
			setTimeout(() => root.unmount(), 0)
		},
	}
}

// ── Decorations ──────────────────────────────────────────────

export function createDecorations(suggestions: UISuggestion[], view: EditorView): DecorationSet {
	const decorations: Decoration[] = []

	for (const suggestion of suggestions) {
		if (!suggestion.selectionStart && !suggestion.selectionEnd) continue

		decorations.push(
			Decoration.inline(
				suggestion.selectionStart,
				suggestion.selectionEnd,
				{ class: "suggestion-highlight" },
				{ suggestionId: suggestion.id, type: "highlight" },
			),
		)
		decorations.push(
			Decoration.widget(
				suggestion.selectionStart,
				(currentView) => {
					const { dom, destroy } = createSuggestionWidget(suggestion, currentView)
					;(dom as HTMLElement & { __destroy?: () => void }).__destroy = destroy
					return dom
				},
				{
					suggestionId: suggestion.id,
					type: "widget",
					destroy: (node: globalThis.Node) => {
						;(node as unknown as { __destroy?: () => void }).__destroy?.()
					},
				},
			),
		)
	}

	return DecorationSet.create(view.state.doc, decorations)
}

// ── Plugin key + Extension ───────────────────────────────────

export const suggestionsPluginKey = new PluginKey("suggestions")

export const SuggestionsExtension = Extension.create({
	name: "suggestions",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: suggestionsPluginKey,
				state: {
					init() {
						return { decorations: DecorationSet.empty, selected: null }
					},
					apply(tr, state) {
						const meta = tr.getMeta(suggestionsPluginKey)
						if (meta) return meta
						return {
							decorations: state.decorations.map(tr.mapping, tr.doc),
							selected: state.selected,
						}
					},
				},
				props: {
					decorations(state) {
						return this.getState(state)?.decorations ?? DecorationSet.empty
					},
				},
			}),
		]
	},
})
