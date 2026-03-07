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
	SuggestionsExtension,
	suggestionsPluginKey,
} from "@/features/artifacts/lib/suggestions-extension"
import type {
	ArtifactStatus,
	ArtifactSuggestion,
	EditorSaveCallback,
} from "@/features/artifacts/types/artifact.types"

// ── Props ────────────────────────────────────────────────────

type TextEditorProps = {
	content: string
	onSaveContent: EditorSaveCallback
	status: ArtifactStatus
	isCurrentVersion: boolean
	currentVersionIndex: number
	suggestions: ArtifactSuggestion[]
}

// ── Editor component ─────────────────────────────────────────

function PureTextEditor({
	content,
	onSaveContent,
	suggestions,
	status,
	isCurrentVersion,
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
			Table.configure({ resizable: true }),
			TableRow,
			TableHeader,
			TableCell,
			SuggestionsExtension,
		],
		content,
		contentType: "markdown",
		immediatelyRender: false,
		editable: isCurrentVersion,
		editorProps: {
			attributes: {
				class: "prose dark:prose-invert relative focus:outline-none",
			},
		},
		onCreate({ editor: currentEditor }) {
			migrateMathStrings(currentEditor)
		},
		onUpdate: ({ editor: currentEditor, transaction }) => {
			if (isUpdatingRef.current || transaction.getMeta("no-save")) return

			const markdown = currentEditor.getMarkdown()
			const shouldDebounce = !transaction.getMeta("no-debounce")
			onSaveContent(markdown, { debounce: shouldDebounce })
		},
	})

	// Toggle read-only based on version
	useEffect(() => {
		if (!editor) return
		editor.setEditable(isCurrentVersion)
	}, [editor, isCurrentVersion])

	// Update content when streaming or content changes externally
	useEffect(() => {
		if (!editor) return

		const currentMarkdown = editor.getMarkdown()

		if (status === "streaming") {
			isUpdatingRef.current = true
			editor.commands.setContent(content, { emitUpdate: false, contentType: "markdown" })
			migrateMathStrings(editor)
			previousContentRef.current = content
			isUpdatingRef.current = false
			return
		}

		if (currentMarkdown !== content && previousContentRef.current !== content) {
			isUpdatingRef.current = true
			editor.commands.setContent(content, { emitUpdate: false, contentType: "markdown" })
			migrateMathStrings(editor)
			previousContentRef.current = content
			isUpdatingRef.current = false
		}
	}, [content, status, editor])

	// Update suggestion decorations
	useEffect(() => {
		if (!editor?.state.doc) return

		const projected = projectWithPositions(editor.state.doc, suggestions).filter(
			(s) => s.selectionEnd > s.selectionStart,
		)

		const decorations = createDecorations(projected, editor.view)
		const tr = editor.state.tr
		tr.setMeta(suggestionsPluginKey, { decorations })
		editor.view.dispatch(tr)
	}, [suggestions, editor])

	return <EditorContent editor={editor} />
}

// ── Memo comparator ──────────────────────────────────────────

function areEqual(prevProps: TextEditorProps, nextProps: TextEditorProps): boolean {
	if (prevProps.suggestions !== nextProps.suggestions) return false
	if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) return false
	if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false
	if (prevProps.status === "streaming" && nextProps.status === "streaming") return false
	if (prevProps.content !== nextProps.content) return false
	if (prevProps.onSaveContent !== nextProps.onSaveContent) return false
	return true
}

export const TextEditor = memo(PureTextEditor, areEqual)
