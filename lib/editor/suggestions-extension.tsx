/**
 * TipTap Suggestions Extension
 *
 * Provides suggestion highlighting and widget rendering for the text editor.
 * Migrated from archive/oldapp/lib/editor/suggestions-extension.tsx
 *
 * @module lib/editor/suggestions-extension
 */
"use client"

import { Extension } from "@tiptap/core"
import type { Node } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import { createRoot } from "react-dom/client"
import type { ArtifactKind } from "@/features/artifact/types"
import type { StreamingSuggestion } from "@/features/chat/types"
import type { Suggestion } from "@/lib/db/schema"

/**
 * A suggestion-like type that accepts both full Suggestions and StreamingSuggestions
 */
export type SuggestionLike = Suggestion | StreamingSuggestion

/**
 * UI suggestion with position information for rendering
 * Accepts both Suggestion (from DB) and StreamingSuggestion (during streaming)
 */
export interface UISuggestion {
	id: string
	artifactId: string
	originalText: string
	suggestedText: string
	description?: string | null
	isResolved: boolean
	selectionStart: number
	selectionEnd: number
}

type Position = {
	start: number
	end: number
}

/**
 * Find the position of searchText within a ProseMirror document
 */
function findPositionsInDoc(doc: Node, searchText: string): Position | null {
	let positions: { start: number; end: number } | null = null

	doc.nodesBetween(0, doc.content.size, (node, pos) => {
		if (node.isText && node.text) {
			const index = node.text.indexOf(searchText)

			if (index !== -1) {
				positions = {
					start: pos + index,
					end: pos + index + searchText.length,
				}

				return false
			}
		}

		return true
	})

	return positions
}

/**
 * Project suggestions onto document positions
 */
export function projectWithPositions(
	doc: Node,
	suggestions: SuggestionLike[],
): UISuggestion[] {
	return suggestions.map((suggestion) => {
		const positions = findPositionsInDoc(doc, suggestion.originalText)

		if (!positions) {
			return {
				...suggestion,
				selectionStart: 0,
				selectionEnd: 0,
			}
		}

		return {
			...suggestion,
			selectionStart: positions.start,
			selectionEnd: positions.end,
		}
	})
}

/**
 * Create a suggestion widget DOM element
 *
 * Note: This creates a placeholder widget. The actual Suggestion component
 * rendering is handled separately in the features layer.
 */
export function createSuggestionWidget(
	suggestion: UISuggestion,
	view: EditorView,
	_artifactKind: ArtifactKind = "text",
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

		const decorationTransaction = state.tr
		const currentState = suggestionsPluginKey.getState(state)
		const currentDecorations = currentState?.decorations

		if (currentDecorations) {
			const newDecorations = DecorationSet.create(
				state.doc,
				currentDecorations.find().filter((decoration: Decoration) => {
					return decoration.spec.suggestionId !== suggestion.id
				}),
			)

			decorationTransaction.setMeta(suggestionsPluginKey, {
				decorations: newDecorations,
				selected: null,
			})
			dispatch(decorationTransaction)
		}

		const textTransaction = view.state.tr.replaceWith(
			suggestion.selectionStart,
			suggestion.selectionEnd,
			state.schema.text(suggestion.suggestedText),
		)

		textTransaction.setMeta("no-debounce", true)

		dispatch(textTransaction)
	}

	// Render a simple suggestion widget
	// The full Suggestion component from features layer can be used for richer UI
	root.render(
		<button
			className="cursor-pointer p-1 text-muted-foreground"
			data-suggestion-id={suggestion.id}
			data-suggestion-text={suggestion.suggestedText}
			onClick={onApply}
			type="button"
		>
			💡 {suggestion.description || "Apply suggestion"}
		</button>,
	)

	return {
		dom,
		destroy: () => {
			dom.removeEventListener("mousedown", handleMouseDown)
			// Wrapping unmount in setTimeout to avoid synchronous unmounting during render
			setTimeout(() => {
				root.unmount()
			}, 0)
		},
	}
}

/**
 * Create decoration set for suggestions
 */
export const createDecorations = (
	suggestions: UISuggestion[],
	view: EditorView,
) => {
	const decorations: Decoration[] = []

	for (const suggestion of suggestions) {
		decorations.push(
			Decoration.inline(
				suggestion.selectionStart,
				suggestion.selectionEnd,
				{
					class: "suggestion-highlight",
				},
				{
					suggestionId: suggestion.id,
					type: "highlight",
				},
			),
		)

		decorations.push(
			Decoration.widget(
				suggestion.selectionStart,
				(currentView) => {
					const { dom, destroy } = createSuggestionWidget(
						suggestion,
						currentView,
					)
					// Store destroy on DOM element for cleanup
					;(
						dom as HTMLElement & {
							__suggestionDestroy?: () => void
						}
					).__suggestionDestroy = destroy
					return dom
				},
				{
					suggestionId: suggestion.id,
					type: "widget",
					destroy: (node) => {
						const dom = node as unknown as HTMLElement & {
							__suggestionDestroy?: () => void
						}
						dom.__suggestionDestroy?.()
					},
				},
			),
		)
	}

	return DecorationSet.create(view.state.doc, decorations)
}

/**
 * Plugin key for the suggestions plugin
 */
export const suggestionsPluginKey = new PluginKey("suggestions")

/**
 * TipTap extension for rendering suggestions in the editor
 */
export const SuggestionsExtension = Extension.create({
	name: "suggestions",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: suggestionsPluginKey,
				state: {
					init() {
						return {
							decorations: DecorationSet.empty,
							selected: null,
						}
					},
					apply(tr, state) {
						const newDecorations = tr.getMeta(suggestionsPluginKey)
						if (newDecorations) {
							return newDecorations
						}

						return {
							decorations: state.decorations.map(
								tr.mapping,
								tr.doc,
							),
							selected: state.selected,
						}
					},
				},
				props: {
					decorations(state) {
						return (
							this.getState(state)?.decorations ??
							DecorationSet.empty
						)
					},
				},
			}),
		]
	},
})
