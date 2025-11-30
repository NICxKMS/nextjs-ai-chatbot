"use client";

import { Mathematics, migrateMathStrings } from "@tiptap/extension-mathematics";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { memo, useEffect, useMemo, useRef } from "react";

// import "katex/dist/katex.min.css";

import {
	createDecorations,
	projectWithPositions,
	type SuggestionLike,
	SuggestionsExtension,
	suggestionsPluginKey,
} from "@/lib/editor/suggestions-extension";

type EditorProps = {
	content: string;
	onSaveContent: (updatedContent: string, debounce: boolean) => void;
	status: "streaming" | "idle";
	isCurrentVersion: boolean;
	currentVersionIndex: number;
	suggestions: SuggestionLike[];
};

function PureEditor({
	content,
	onSaveContent,
	suggestions,
	status,
}: EditorProps) {
	const isUpdatingRef = useRef(false);
	const previousContentRef = useRef<string>(content);

	const mathematics = useMemo(
		() =>
			Mathematics.configure({
				katexOptions: {
					throwOnError: false,
					errorColor: "var(--color-muted-foreground)",
				},
			}),
		[]
	);

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
			migrateMathStrings(currentEditor);
		},
		onUpdate: ({ editor: currentEditor, transaction }) => {
			if (isUpdatingRef.current || transaction.getMeta("no-save")) {
				return;
			}

			const markdown = currentEditor.getMarkdown();
			const shouldDebounce = !transaction.getMeta("no-debounce");
			onSaveContent(markdown, shouldDebounce);
		},
	});

	// Update content when streaming or content changes externally
	useEffect(() => {
		if (!editor || !content) {
			return;
		}

		const currentMarkdown = editor.getMarkdown();

		if (status === "streaming") {
			isUpdatingRef.current = true;
			editor.commands.setContent(content, {
				emitUpdate: false,
				contentType: "markdown",
			});
			migrateMathStrings(editor);
			previousContentRef.current = content;
			isUpdatingRef.current = false;
			return;
		}

		if (
			currentMarkdown !== content &&
			previousContentRef.current !== content
		) {
			isUpdatingRef.current = true;
			editor.commands.setContent(content, {
				emitUpdate: false,
				contentType: "markdown",
			});
			migrateMathStrings(editor);
			previousContentRef.current = content;
			isUpdatingRef.current = false;
		}
	}, [content, status, editor]);

	// Update suggestions decorations
	useEffect(() => {
		if (!editor?.state.doc || !content) {
			return;
		}

		const projectedSuggestions = projectWithPositions(
			editor.state.doc,
			suggestions
		).filter(
			(suggestion) => suggestion.selectionStart && suggestion.selectionEnd
		);

		const decorations = createDecorations(
			projectedSuggestions,
			editor.view
		);

		const transaction = editor.state.tr;
		transaction.setMeta(suggestionsPluginKey, { decorations });
		editor.view.dispatch(transaction);
	}, [suggestions, content, editor]);

	return <EditorContent editor={editor} />;
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
	return (
		prevProps.suggestions === nextProps.suggestions &&
		prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
		prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
		!(
			prevProps.status === "streaming" && nextProps.status === "streaming"
		) &&
		prevProps.content === nextProps.content &&
		prevProps.onSaveContent === nextProps.onSaveContent
	);
}

export const Editor = memo(PureEditor, areEqual);
