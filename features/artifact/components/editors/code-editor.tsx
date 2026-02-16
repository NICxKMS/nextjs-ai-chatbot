/**
 * Code Editor Component
 *
 * CodeMirror-based code editor for code artifacts with syntax highlighting.
 * Migrated from archive/oldapp/components/code-editor.tsx
 *
 * @module features/artifact/components/editors/code-editor
 */
"use client"

import type { EditorState, Transaction } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { memo, useEffect, useRef, useState } from "react"

import type { Suggestion } from "@/lib/db/schema"

/**
 * Lazy-loaded CodeMirror modules type
 */
type CodeMirrorModules = {
	EditorState: typeof EditorState
	Transaction: typeof Transaction
	EditorView: typeof EditorView
	basicSetup: typeof import("codemirror").basicSetup
	javascript: typeof import("@codemirror/lang-javascript").javascript
	python: typeof import("@codemirror/lang-python").python
	oneDark: typeof import("@codemirror/theme-one-dark").oneDark
}

/**
 * Module cache to avoid reloading
 */
let codeMirrorModulesPromise: Promise<CodeMirrorModules> | null = null

/**
 * Loads CodeMirror modules dynamically for code splitting
 */
function loadCodeMirrorModules(): Promise<CodeMirrorModules> {
	if (codeMirrorModulesPromise) {
		return codeMirrorModulesPromise
	}

	codeMirrorModulesPromise = Promise.all([
		import("@codemirror/state"),
		import("@codemirror/view"),
		import("codemirror"),
		import("@codemirror/lang-javascript"),
		import("@codemirror/lang-python"),
		import("@codemirror/theme-one-dark"),
	]).then(
		([
			stateModule,
			viewModule,
			cmModule,
			jsModule,
			pythonModule,
			themeModule,
		]) => ({
			EditorState: stateModule.EditorState,
			Transaction: stateModule.Transaction,
			EditorView: viewModule.EditorView,
			basicSetup: cmModule.basicSetup,
			javascript: jsModule.javascript,
			python: pythonModule.python,
			oneDark: themeModule.oneDark,
		}),
	)

	return codeMirrorModulesPromise
}

/**
 * Props for the CodeEditor component
 */
export interface CodeEditorProps {
	/** The code content to edit */
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
	suggestions: Suggestion[]
}

/**
 * Pure editor component for memoization
 */
function PureCodeEditor({ content, onSaveContent, status }: CodeEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<EditorView | null>(null)
	const [modules, setModules] = useState<CodeMirrorModules | null>(null)

	// Load CodeMirror modules on mount
	useEffect(() => {
		loadCodeMirrorModules().then(setModules)
	}, [])

	// Initialize editor once modules are loaded
	// NOTE: we only want to run this effect once after modules load
	useEffect(() => {
		if (!modules || !containerRef.current || editorRef.current) {
			return
		}

		const { EditorState, EditorView, basicSetup, python, oneDark } = modules

		const startState = EditorState.create({
			doc: content,
			extensions: [basicSetup, python(), oneDark],
		})

		editorRef.current = new EditorView({
			state: startState,
			parent: containerRef.current,
		})

		return () => {
			if (editorRef.current) {
				editorRef.current.destroy()
				editorRef.current = null
			}
		}
	}, [modules, content])

	// Update listener when onSaveContent changes
	useEffect(() => {
		if (!modules || !editorRef.current) {
			return
		}

		const {
			EditorState,
			Transaction,
			EditorView,
			basicSetup,
			python,
			oneDark,
		} = modules

		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const transaction = update.transactions.find(
					(tr) => !tr.annotation(Transaction.remote),
				)

				if (transaction) {
					const newContent = update.state.doc.toString()
					onSaveContent(newContent, true)
				}
			}
		})

		const currentSelection = editorRef.current.state.selection

		const newState = EditorState.create({
			doc: editorRef.current.state.doc,
			extensions: [basicSetup, python(), oneDark, updateListener],
			selection: currentSelection,
		})

		editorRef.current.setState(newState)
	}, [modules, onSaveContent])

	// Sync content changes
	useEffect(() => {
		if (!modules || !editorRef.current || !content) {
			return
		}

		const { Transaction } = modules
		const currentContent = editorRef.current.state.doc.toString()

		if (status === "streaming" || currentContent !== content) {
			const transaction = editorRef.current.state.update({
				changes: {
					from: 0,
					to: currentContent.length,
					insert: content,
				},
				annotations: [Transaction.remote.of(true)],
			})

			editorRef.current.dispatch(transaction)
		}
	}, [modules, content, status])

	// Show loading skeleton while modules load
	if (!modules) {
		return (
			<div className="not-prose relative w-full pb-[calc(80dvh)] text-sm">
				<div className="animate-pulse space-y-2 p-4">
					<div className="h-4 w-3/4 rounded bg-muted" />
					<div className="h-4 w-1/2 rounded bg-muted" />
					<div className="h-4 w-5/6 rounded bg-muted" />
					<div className="h-4 w-2/3 rounded bg-muted" />
				</div>
			</div>
		)
	}

	return (
		<div
			className="not-prose relative w-full pb-[calc(80dvh)] text-sm"
			ref={containerRef}
		/>
	)
}

/**
 * Custom comparison function for memoization
 */
function areEqual(prevProps: CodeEditorProps, nextProps: CodeEditorProps) {
	if (prevProps.suggestions !== nextProps.suggestions) {
		return false
	}
	if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
		return false
	}
	if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
		return false
	}
	if (prevProps.status === "streaming" && nextProps.status === "streaming") {
		return false
	}
	if (prevProps.content !== nextProps.content) {
		return false
	}

	return true
}

/**
 * CodeMirror-based code editor for code artifacts
 *
 * Features:
 * - Syntax highlighting for Python and JavaScript
 * - OneDark theme support
 * - Line numbers via basicSetup
 * - Debounced auto-save via onSaveContent callback
 * - Streaming content updates handling
 *
 * @example
 * ```tsx
 * <CodeEditor
 *   content="print('Hello World')"
 *   onSaveContent={(code, debounce) => saveCode(code)}
 *   status="idle"
 *   isCurrentVersion={true}
 *   currentVersionIndex={0}
 *   suggestions={[]}
 * />
 * ```
 */
export const CodeEditor = memo(PureCodeEditor, areEqual)
