"use client"

import type { EditorState, Transaction } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { CrossSmallIcon, LoaderIcon, PlayIcon, TerminalWindowIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import type {
	ArtifactStatus,
	ArtifactSuggestion,
	EditorSaveCallback,
} from "@/features/artifacts/types/artifact.types"
import { cn } from "@/lib/utils/cn"

// ── CodeMirror lazy-loaded modules ──────────────────────────
// Singleton cache prevents re-initialization across renders.

type CodeMirrorModules = {
	EditorState: typeof EditorState
	Transaction: typeof Transaction
	EditorView: typeof EditorView
	basicSetup: typeof import("codemirror").basicSetup
	python: typeof import("@codemirror/lang-python").python
	oneDark: typeof import("@codemirror/theme-one-dark").oneDark
}

let codeMirrorModulesPromise: Promise<CodeMirrorModules> | null = null

function loadCodeMirrorModules(): Promise<CodeMirrorModules> {
	if (codeMirrorModulesPromise) {
		return codeMirrorModulesPromise
	}

	codeMirrorModulesPromise = Promise.all([
		import("@codemirror/state"),
		import("@codemirror/view"),
		import("codemirror"),
		import("@codemirror/lang-python"),
		import("@codemirror/theme-one-dark"),
	]).then(([stateModule, viewModule, cmModule, pythonModule, themeModule]) => ({
		EditorState: stateModule.EditorState,
		Transaction: stateModule.Transaction,
		EditorView: viewModule.EditorView,
		basicSetup: cmModule.basicSetup,
		python: pythonModule.python,
		oneDark: themeModule.oneDark,
	}))

	return codeMirrorModulesPromise
}

// ── Pyodide script loading ──────────────────────────────────
// On-demand CDN loading — only loads when user executes code.

const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"

type LoadPyodideFn = (options: { indexURL: string }) => Promise<PyodideInstance>

type PyodideInstance = {
	setStdout: (config: { batched: (output: string) => void }) => void
	loadPackagesFromImports: (
		code: string,
		options: { messageCallback: (message: string) => void },
	) => Promise<void>
	runPythonAsync: (code: string) => Promise<unknown>
}

let pyodideScriptPromise: Promise<void> | null = null

function loadPyodideScript(): Promise<void> {
	if (pyodideScriptPromise) {
		return pyodideScriptPromise
	}

	const win = window as unknown as { loadPyodide?: LoadPyodideFn }
	if (typeof win.loadPyodide === "function") {
		return Promise.resolve()
	}

	pyodideScriptPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script")
		script.src = PYODIDE_CDN_URL
		script.async = true
		script.onload = () => resolve()
		script.onerror = () => reject(new Error("Failed to load Pyodide"))
		document.head.appendChild(script)
	})

	return pyodideScriptPromise
}

// ── Matplotlib output handler ───────────────────────────────

const MATPLOTLIB_SETUP = `
import io
import base64
from matplotlib import pyplot as plt

plt.clf()
plt.close('all')
plt.switch_backend('agg')

def setup_matplotlib_output():
    def custom_show():
        if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
            print("Warning: Plot size too large, reducing quality")
            plt.gcf().set_dpi(100)

        png_buf = io.BytesIO()
        plt.savefig(png_buf, format='png')
        png_buf.seek(0)
        png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
        print(f'data:image/png;base64,{png_base64}')
        png_buf.close()

        plt.clf()
        plt.close('all')

    plt.show = custom_show
`

function needsMatplotlib(code: string): boolean {
	return code.includes("matplotlib") || code.includes("plt.")
}

// ── Console types + component ───────────────────────────────

type ConsoleOutputContent = {
	type: "text" | "image"
	value: string
}

type ConsoleOutput = {
	id: string
	status: "in_progress" | "loading_packages" | "completed" | "failed"
	contents: ConsoleOutputContent[]
}

const CONSOLE_MIN_HEIGHT = 100
const CONSOLE_MAX_HEIGHT = 800

/** Renders the contents of a single console output entry. Extracted to allow biome-ignore at the map level. */
function ConsoleOutputContents({
	outputId,
	contents,
}: {
	outputId: string
	contents: ConsoleOutputContent[]
}) {
	const items = contents.map((content, i) =>
		content.type === "image" ? (
			// biome-ignore lint/suspicious/noArrayIndexKey: console outputs are append-only, never reordered
			<picture key={`${outputId}-img-${i}`}>
				<img
					alt="Generated console output"
					className="h-auto w-full max-w-md rounded-md object-contain"
					height={300}
					src={content.value}
					style={{ aspectRatio: "4/3" }}
					width={400}
				/>
			</picture>
		) : (
			// biome-ignore lint/suspicious/noArrayIndexKey: console outputs are append-only, never reordered
			<div className="w-full whitespace-pre-line break-words" key={`${outputId}-txt-${i}`}>
				{content.value}
			</div>
		),
	)

	return (
		<div className="flex w-full flex-col gap-2 overflow-x-scroll text-zinc-900 dark:text-zinc-50">
			{items}
		</div>
	)
}

function Console({ outputs, onClear }: { outputs: ConsoleOutput[]; onClear: () => void }) {
	const [height, setHeight] = useState(300)
	const [isResizing, setIsResizing] = useState(false)
	const consoleEndRef = useRef<HTMLDivElement>(null)

	const startResizing = useCallback(() => {
		setIsResizing(true)
	}, [])

	const stopResizing = useCallback(() => {
		setIsResizing(false)
	}, [])

	const resize = useCallback(
		(e: MouseEvent) => {
			if (isResizing) {
				const newHeight = window.innerHeight - e.clientY
				if (newHeight >= CONSOLE_MIN_HEIGHT && newHeight <= CONSOLE_MAX_HEIGHT) {
					setHeight(newHeight)
				}
			}
		},
		[isResizing],
	)

	useEffect(() => {
		window.addEventListener("mousemove", resize)
		window.addEventListener("mouseup", stopResizing)
		return () => {
			window.removeEventListener("mousemove", resize)
			window.removeEventListener("mouseup", stopResizing)
		}
	}, [resize, stopResizing])

	// biome-ignore lint/correctness/useExhaustiveDependencies: outputs needed to trigger scroll on new output
	useEffect(() => {
		consoleEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [outputs])

	if (outputs.length === 0) return null

	return (
		<>
			<div
				aria-label="Resize console"
				aria-orientation="horizontal"
				aria-valuemax={CONSOLE_MAX_HEIGHT}
				aria-valuemin={CONSOLE_MIN_HEIGHT}
				aria-valuenow={height}
				className="fixed z-50 h-2 w-full cursor-ns-resize"
				onKeyDown={(e) => {
					if (e.key === "ArrowUp") {
						setHeight((prev) => Math.min(prev + 10, CONSOLE_MAX_HEIGHT))
					} else if (e.key === "ArrowDown") {
						setHeight((prev) => Math.max(prev - 10, CONSOLE_MIN_HEIGHT))
					}
				}}
				onMouseDown={startResizing}
				role="slider"
				style={{ bottom: height - 4 }}
				tabIndex={0}
			/>

			<div
				className={cn(
					"fixed bottom-0 z-40 flex w-full flex-col overflow-x-hidden overflow-y-scroll border-t bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
					{ "select-none": isResizing },
				)}
				style={{ height }}
			>
				<div className="sticky top-0 z-50 flex h-fit w-full flex-row items-center justify-between border-b bg-muted px-2 py-1 dark:border-zinc-700">
					<div className="flex flex-row items-center gap-3 pl-2 text-sm text-zinc-800 dark:text-zinc-50">
						<div className="text-muted-foreground">
							<TerminalWindowIcon />
						</div>
						<div>Console</div>
					</div>
					<Button
						className="size-fit p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
						onClick={onClear}
						size="icon"
						variant="ghost"
					>
						<CrossSmallIcon />
					</Button>
				</div>

				<div>
					{outputs.map((output, index) => (
						<div
							className="flex flex-row border-b bg-zinc-50 px-4 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
							key={output.id}
						>
							<div
								className={cn("w-12 shrink-0", {
									"text-muted-foreground":
										output.status === "in_progress" ||
										output.status === "loading_packages",
									"text-emerald-500": output.status === "completed",
									"text-red-400": output.status === "failed",
								})}
							>
								[{index + 1}]
							</div>
							{output.status === "in_progress" ||
							output.status === "loading_packages" ? (
								<div className="flex flex-row gap-2">
									<div className="mt-0.5 mb-auto size-fit self-center">
										<LoaderIcon size={16} />
									</div>
									<div className="text-muted-foreground">
										{output.status === "in_progress"
											? "Initializing..."
											: output.contents.map((c) =>
													c.type === "text" ? c.value : null,
												)}
									</div>
								</div>
							) : (
								<ConsoleOutputContents
									outputId={output.id}
									contents={output.contents}
								/>
							)}
						</div>
					))}
					<div ref={consoleEndRef} />
				</div>
			</div>
		</>
	)
}

// ── Code Editor props ───────────────────────────────────────

type CodeEditorProps = {
	content: string
	onSaveContent: EditorSaveCallback
	status: ArtifactStatus
	isCurrentVersion: boolean
	currentVersionIndex: number
	suggestions: ArtifactSuggestion[]
}

// ── Run ID generator ────────────────────────────────────────

let runIdCounter = 0
function generateRunId(): string {
	runIdCounter += 1
	return `run-${Date.now()}-${runIdCounter}`
}

// ── Pure code editor (unwrapped for memo) ───────────────────

function PureCodeEditor({ content, onSaveContent, status, isCurrentVersion }: CodeEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<EditorView | null>(null)
	const [modules, setModules] = useState<CodeMirrorModules | null>(null)
	const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])
	const [isRunning, setIsRunning] = useState(false)

	// Load CodeMirror modules on mount
	useEffect(() => {
		loadCodeMirrorModules().then(setModules)
	}, [])

	// Initialize editor once modules are loaded
	// biome-ignore lint/correctness/useExhaustiveDependencies: initialize editor once when modules load; content synced via separate effect
	useEffect(() => {
		if (!modules || !containerRef.current || editorRef.current) return

		const { EditorState: CMState, EditorView: CMView, basicSetup, python, oneDark } = modules

		const extensions = [basicSetup, python(), oneDark]

		if (!isCurrentVersion) {
			extensions.push(CMView.editable.of(false))
			extensions.push(CMState.readOnly.of(true))
		}

		const startState = CMState.create({
			doc: content,
			extensions,
		})

		editorRef.current = new CMView({
			state: startState,
			parent: containerRef.current,
		})

		return () => {
			if (editorRef.current) {
				editorRef.current.destroy()
				editorRef.current = null
			}
		}
	}, [modules])

	// Reconfigure update listener when onSaveContent changes
	useEffect(() => {
		if (!modules || !editorRef.current) return

		const {
			EditorState: CMState,
			Transaction: CMTx,
			EditorView: CMView,
			basicSetup,
			python,
			oneDark,
		} = modules

		const extensions = [basicSetup, python(), oneDark]

		if (!isCurrentVersion) {
			extensions.push(CMView.editable.of(false))
			extensions.push(CMState.readOnly.of(true))
		} else {
			const updateListener = CMView.updateListener.of((update) => {
				if (update.docChanged) {
					const userTransaction = update.transactions.find(
						(tr) => !tr.annotation(CMTx.remote),
					)
					if (userTransaction) {
						const newContent = update.state.doc.toString()
						onSaveContent(newContent, { debounce: true })
					}
				}
			})
			extensions.push(updateListener)
		}

		const currentSelection = editorRef.current.state.selection

		const newState = CMState.create({
			doc: editorRef.current.state.doc,
			extensions,
			selection: currentSelection,
		})

		editorRef.current.setState(newState)
	}, [modules, onSaveContent, isCurrentVersion])

	// Sync streaming content via EditorView.dispatch
	useEffect(() => {
		if (!modules || !editorRef.current || !content) return

		const { Transaction: CMTx } = modules
		const currentContent = editorRef.current.state.doc.toString()

		if (status === "streaming" || currentContent !== content) {
			const transaction = editorRef.current.state.update({
				changes: {
					from: 0,
					to: currentContent.length,
					insert: content,
				},
				annotations: [CMTx.remote.of(true)],
			})

			editorRef.current.dispatch(transaction)
		}
	}, [modules, content, status])

	// ── Pyodide execution ──────────────────────────────────

	const handleRunCode = useCallback(async () => {
		if (!editorRef.current || isRunning) return

		const code = editorRef.current.state.doc.toString()
		if (!code.trim()) return

		const runId = generateRunId()
		const outputContent: ConsoleOutputContent[] = []

		setIsRunning(true)
		setConsoleOutputs((prev) => [...prev, { id: runId, contents: [], status: "in_progress" }])

		try {
			await loadPyodideScript()

			const win = window as unknown as { loadPyodide: LoadPyodideFn }
			const pyodide = await win.loadPyodide({ indexURL: PYODIDE_INDEX_URL })

			pyodide.setStdout({
				batched: (output: string) => {
					outputContent.push({
						type: output.startsWith("data:image/png;base64") ? "image" : "text",
						value: output,
					})
				},
			})

			await pyodide.loadPackagesFromImports(code, {
				messageCallback: (message: string) => {
					setConsoleOutputs((prev) =>
						prev.map((o) =>
							o.id === runId
								? {
										...o,
										contents: [{ type: "text", value: message }],
										status: "loading_packages",
									}
								: o,
						),
					)
				},
			})

			if (needsMatplotlib(code)) {
				await pyodide.runPythonAsync(MATPLOTLIB_SETUP)
				await pyodide.runPythonAsync("setup_matplotlib_output()")
			}

			await pyodide.runPythonAsync(code)

			setConsoleOutputs((prev) =>
				prev.map((o) =>
					o.id === runId ? { ...o, contents: outputContent, status: "completed" } : o,
				),
			)
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error"
			setConsoleOutputs((prev) =>
				prev.map((o) =>
					o.id === runId
						? { ...o, contents: [{ type: "text", value: message }], status: "failed" }
						: o,
				),
			)
		} finally {
			setIsRunning(false)
		}
	}, [isRunning])

	const clearConsole = useCallback(() => {
		setConsoleOutputs([])
	}, [])

	// Loading skeleton while CodeMirror modules load
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
		<div className="relative flex flex-col">
			{isCurrentVersion && (
				<div className="absolute top-2 right-2 z-10">
					<Button
						aria-label="Run code"
						className="gap-1.5"
						disabled={isRunning || status === "streaming"}
						onClick={handleRunCode}
						size="sm"
						variant="outline"
					>
						{isRunning ? <LoaderIcon size={16} /> : <PlayIcon size={16} />}
						Run
					</Button>
				</div>
			)}

			<div
				className="not-prose relative w-full pb-[calc(80dvh)] text-sm"
				ref={containerRef}
			/>

			<Console outputs={consoleOutputs} onClear={clearConsole} />
		</div>
	)
}

// ── Memo comparator ─────────────────────────────────────────

function areEqual(prevProps: CodeEditorProps, nextProps: CodeEditorProps): boolean {
	if (prevProps.suggestions !== nextProps.suggestions) return false
	if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) return false
	if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false
	if (prevProps.status === "streaming" && nextProps.status === "streaming") return false
	if (prevProps.content !== nextProps.content) return false
	return true
}

export const CodeEditor = memo(PureCodeEditor, areEqual)
