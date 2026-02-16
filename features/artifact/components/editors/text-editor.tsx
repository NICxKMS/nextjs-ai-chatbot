/**
 * Text Editor Component
 *
 * TipTap-based rich text editor for text artifacts with markdown support.
 * Migrated from archive/oldapp/components/text-editor.tsx
 *
 * @module features/artifact/components/editors/text-editor
 */
"use client"

import { Mathematics, migrateMathStrings } from "@tiptap/extension-mathematics"
import { Table } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { memo, useEffect, useMemo, useRef } from "react"

import {
	createDecorations,
	projectWithPositions,
	type SuggestionLike,
	SuggestionsExtension,
	suggestionsPluginKey,
} from "@/lib/editor/suggestions-extension"

/**
 * Props for the TextEditor component
 */
export interface TextEditorProps {
	/** The markdown content to edit */
	content: string
	/** Callback when content is saved */
	onSaveContent: (updatedContent: string, debounce: boolean) => void
	/** Current streaming status */
	status: "streaming" | "idle"
	/** Whether this is the current version */
	isCurrentVersion: boolean
	/** Index of the current version */
	currentVersionIndex: number
	/** Array of suggestions to display */
	suggestions: SuggestionLike[]
}

/**
 * Pure editor component for memoization
 */
function PureTextEditor({
	content,
	onSaveContent,
	suggestions,
	status,
}: TextEditorProps) {
	const isUpdatingRef = useRef(false)
	const previousContentRef = useRef<string>(content)

	const mathematics = useMemo(
		() =>
			Mathematics.configure({
				katexOptions: {
					throwOnError: false,
					errorColor: "var(--color-muted-foreground)",
				},
			}),
		[],
	)

	const editor = useEditor({
		extensions: [
			mathematics,
			StarterKit,
			Markdown,
			Table.configure({
				resizable: true,
			}),
			TableRow,
			TableHeader,
			TableCell,
			SuggestionsExtension,
		],
		content,
		contentType: "markdown",
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: "prose dark:prose-invert relative focus:outline-none",
			},
		},
		onCreate({ editor: currentEditor }) {
			migrateMathStrings(currentEditor)
		},
		onUpdate: ({ editor: currentEditor, transaction }) => {
			if (isUpdatingRef.current || transaction.getMeta("no-save")) {
				return
			}

			const markdown = currentEditor.getMarkdown()
			const shouldDebounce = !transaction.getMeta("no-debounce")
			onSaveContent(markdown, shouldDebounce)
		},
	})

	// Update content when streaming or content changes externally
	useEffect(() => {
		if (!editor || !content) {
			return
		}

		const currentMarkdown = editor.getMarkdown()

		if (status === "streaming") {
			isUpdatingRef.current = true
			editor.commands.setContent(content, {
				emitUpdate: false,
				contentType: "markdown",
			})
			migrateMathStrings(editor)
			previousContentRef.current = content
			isUpdatingRef.current = false
			return
		}

		if (
			currentMarkdown !== content &&
			previousContentRef.current !== content
		) {
			isUpdatingRef.current = true
			editor.commands.setContent(content, {
				emitUpdate: false,
				contentType: "markdown",
			})
			migrateMathStrings(editor)
			previousContentRef.current = content
			isUpdatingRef.current = false
		}
	}, [content, status, editor])

	// Update suggestions decorations
	useEffect(() => {
		if (!editor?.state.doc || !content) {
			return
		}

		const projectedSuggestions = projectWithPositions(
			editor.state.doc,
			suggestions,
		).filter(
			(suggestion) =>
				suggestion.selectionStart && suggestion.selectionEnd,
		)

		const decorations = createDecorations(projectedSuggestions, editor.view)

		const transaction = editor.state.tr
		transaction.setMeta(suggestionsPluginKey, { decorations })
		editor.view.dispatch(transaction)
	}, [suggestions, content, editor])

	return <EditorContent editor={editor} />
}

/**
 * Custom comparison function for memoization
 */
function areEqual(prevProps: TextEditorProps, nextProps: TextEditorProps) {
	return (
		prevProps.suggestions === nextProps.suggestions &&
		prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
		prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
		!(
			prevProps.status === "streaming" && nextProps.status === "streaming"
		) &&
		prevProps.content === nextProps.content &&
		prevProps.onSaveContent === nextProps.onSaveContent
	)
}

/**
 * TipTap-based rich text editor for text artifacts
 *
 * Features:
 * - Markdown rendering and editing
 * - Mathematics support with KaTeX
 * - Table support with resizable columns
 * - Suggestion highlighting and widgets
 * - Debounced auto-save
 *
 * @example
 * ```tsx
 * <TextEditor
 *   content="# Hello World"
 *   onSaveContent={(markdown, debounce) => saveMarkdown(markdown)}
 *   status="idle"
 *   isCurrentVersion={true}
 *   currentVersionIndex={0}
 *   suggestions={[]}
 * />
 * ```
 */
export const TextEditor = memo(PureTextEditor, areEqual)
