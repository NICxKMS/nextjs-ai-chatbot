/**
 * Diff View Component
 *
 * Displays a diff view between two document versions using TipTap editor.
 *
 * @module components/document/diffview
 */

"use client"

import { Editor, Extension, Mark } from "@tiptap/core"
import { Table } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { Markdown } from "@tiptap/markdown"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { DecorationSet } from "@tiptap/pm/view"
import { EditorContent, useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { useEffect, useMemo } from "react"

import { DiffType, diffEditor } from "@/lib/editor/diff"

/**
 * Custom mark for diff highlighting
 */
const DiffMark = Mark.create({
	name: "diffMark",

	addAttributes() {
		return {
			type: {
				default: "",
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: "span[data-diff-type]",
				getAttrs: (node: string | HTMLElement) => {
					if (typeof node === "string") {
						return {}
					}
					const type = node.getAttribute("data-diff-type")
					return { type }
				},
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		const type = HTMLAttributes.type as DiffTypeValue
		let className = ""

		switch (type) {
			case DiffType.Inserted:
				className =
					"bg-green-100 text-green-700 dark:bg-green-500/70 dark:text-green-300"
				break
			case DiffType.Deleted:
				className =
					"bg-red-100 line-through text-red-600 dark:bg-red-500/70 dark:text-red-300"
				break
			default:
				className = ""
		}

		return [
			"span",
			{
				class: className,
				"data-diff-type": type,
			},
			0,
		]
	},
})

type DiffTypeValue = -1 | 0 | 1

/**
 * Extension to apply diff on content
 */
const DiffExtension = Extension.create({
	name: "diff",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("diff"),
				state: {
					init() {
						return DecorationSet.empty
					},
					apply(tr, decorations) {
						return decorations.map(tr.mapping, tr.doc)
					},
				},
			}),
		]
	},
})

/**
 * Props for DiffView component
 */
export type DiffViewProps = {
	oldContent: string
	newContent: string
}

/**
 * DiffView component - displays a diff between two document versions
 */
export const DiffView = ({ oldContent, newContent }: DiffViewProps) => {
	// Compute diff content using useMemo to avoid recalculation
	const diffContent = useMemo(() => {
		// Create temporary editors to parse markdown
		const oldEditor = new Editor({
			extensions: [
				StarterKit,
				Markdown,
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell,
				DiffMark,
			],
			content: oldContent,
			contentType: "markdown",
		})

		const newEditor = new Editor({
			extensions: [
				StarterKit,
				Markdown,
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell,
				DiffMark,
			],
			content: newContent,
			contentType: "markdown",
		})

		const oldDoc = oldEditor.state.doc
		const newDoc = newEditor.state.doc

		// Compute diff
		const diffedDoc = diffEditor(
			oldEditor.schema,
			oldDoc.toJSON() as Record<string, unknown>,
			newDoc.toJSON() as Record<string, unknown>,
		)

		// Cleanup temporary editors
		oldEditor.destroy()
		newEditor.destroy()

		return diffedDoc.toJSON() as Record<string, unknown>
	}, [oldContent, newContent])

	const editor = useEditor({
		extensions: [
			StarterKit,
			Markdown,
			Table.configure({ resizable: true }),
			TableRow,
			TableHeader,
			TableCell,
			DiffMark,
			DiffExtension,
		],
		content: diffContent,
		editable: false,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: "prose dark:prose-invert max-w-none focus:outline-none",
			},
		},
	})

	useEffect(() => {
		if (editor && diffContent) {
			editor.commands.setContent(diffContent)
		}
	}, [editor, diffContent])

	return (
		<div className="w-full rounded-lg border border-border bg-background p-4">
			<EditorContent editor={editor} />
		</div>
	)
}
