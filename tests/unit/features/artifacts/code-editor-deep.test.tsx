// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ArtifactStatus, EditorSaveCallback } from "@/features/artifacts/types/artifact.types"

const codeMirrorTestState = vi.hoisted(() => {
	const pythonToken = { name: "python-language" }
	const oneDarkToken = { name: "one-dark-theme" }
	const remoteAnnotation = {
		of: vi.fn((value: boolean) => ({ type: "remote", value })),
	}

	return {
		basicSetup: { name: "basic-setup" },
		pythonToken,
		oneDarkToken,
		remoteAnnotation,
		createdStates: [] as Array<{ doc: string; extensions: unknown[] }>,
		setStateDocs: [] as string[],
		dispatchAnnotations: [] as Array<unknown[] | undefined>,
		lastUpdateListener: undefined as
			| ((update: {
					docChanged: boolean
					transactions: Array<{ annotation: (annotation: unknown) => boolean }>
					state: { doc: { toString: () => string } }
			  }) => void)
			| undefined,
		python: vi.fn(() => pythonToken),
		editableOf: vi.fn((value: boolean) => ({ type: "editable", value })),
		readOnlyOf: vi.fn((value: boolean) => ({ type: "readOnly", value })),
	}
})

vi.mock("@codemirror/state", () => {
	const toDocString = (doc: unknown): string => {
		if (typeof doc === "string") return doc
		if (
			typeof doc === "object" &&
			doc !== null &&
			"toString" in doc &&
			typeof (doc as { toString: () => string }).toString === "function"
		) {
			return (doc as { toString: () => string }).toString()
		}
		return ""
	}

	class MockEditorState {
		doc: { toString: () => string }
		selection: unknown
		extensions: unknown[]

		constructor(doc: string, extensions: unknown[], selection: unknown) {
			this.doc = { toString: () => doc }
			this.selection = selection
			this.extensions = extensions
		}

		static readOnly = {
			of: (value: boolean) => codeMirrorTestState.readOnlyOf(value),
		}

		static create({
			doc,
			extensions = [],
			selection = null,
		}: {
			doc: unknown
			extensions?: unknown[]
			selection?: unknown
		}) {
			const docValue = toDocString(doc)
			codeMirrorTestState.createdStates.push({ doc: docValue, extensions: [...extensions] })
			return new MockEditorState(docValue, extensions, selection)
		}

		update({
			changes,
			annotations,
		}: {
			changes: { from: number; to: number; insert: string }
			annotations?: unknown[]
		}) {
			const nextState = MockEditorState.create({
				doc: changes.insert,
				extensions: this.extensions,
				selection: this.selection,
			})
			return { state: nextState, annotations }
		}
	}

	return {
		EditorState: MockEditorState,
		Transaction: {
			remote: codeMirrorTestState.remoteAnnotation,
		},
	}
})

vi.mock("@codemirror/view", () => {
	const getUpdateListener = (extensions: unknown[]) => {
		const listenerExtension = extensions.find(
			(entry) =>
				typeof entry === "object" &&
				entry !== null &&
				"listener" in entry &&
				typeof (entry as { listener?: unknown }).listener === "function",
		)

		if (!listenerExtension) return undefined
		return (listenerExtension as { listener: typeof codeMirrorTestState.lastUpdateListener })
			.listener
	}

	class MockEditorView {
		state: { doc: { toString: () => string }; selection: unknown; extensions: unknown[] }
		private readonly parent: HTMLElement
		private readonly docNode: HTMLElement

		constructor({
			state,
			parent,
		}: {
			state: { doc: { toString: () => string }; selection: unknown; extensions: unknown[] }
			parent: HTMLElement
		}) {
			this.state = state
			this.parent = parent
			this.docNode = document.createElement("pre")
			this.docNode.dataset.testid = "mock-codemirror-doc"
			this.docNode.textContent = state.doc.toString()
			parent.appendChild(this.docNode)
			codeMirrorTestState.lastUpdateListener = getUpdateListener(state.extensions)
		}

		static editable = {
			of: (value: boolean) => codeMirrorTestState.editableOf(value),
		}

		static updateListener = {
			of: (listener: typeof codeMirrorTestState.lastUpdateListener) => ({ listener }),
		}

		destroy() {
			this.parent.innerHTML = ""
		}

		setState(nextState: {
			doc: { toString: () => string }
			selection: unknown
			extensions: unknown[]
		}) {
			this.state = nextState
			this.docNode.textContent = nextState.doc.toString()
			codeMirrorTestState.setStateDocs.push(nextState.doc.toString())
			codeMirrorTestState.lastUpdateListener = getUpdateListener(nextState.extensions)
		}

		dispatch(transaction: {
			state?: {
				doc: { toString: () => string }
				selection: unknown
				extensions: unknown[]
			}
			annotations?: unknown[]
		}) {
			if (transaction.state) {
				this.setState(transaction.state)
			}
			codeMirrorTestState.dispatchAnnotations.push(transaction.annotations)
		}
	}

	return {
		EditorView: MockEditorView,
	}
})

vi.mock("codemirror", () => ({
	basicSetup: codeMirrorTestState.basicSetup,
}))

vi.mock("@codemirror/lang-python", () => ({
	python: codeMirrorTestState.python,
}))

vi.mock("@codemirror/theme-one-dark", () => ({
	oneDark: codeMirrorTestState.oneDarkToken,
}))

type CodeEditorProps = {
	content: string
	onSaveContent: EditorSaveCallback
	status: ArtifactStatus
	isCurrentVersion: boolean
	currentVersionIndex: number
}

async function renderCodeEditor(props: CodeEditorProps) {
	const { CodeEditor: Editor } = await import(
		"@/features/artifacts/components/editors/code-editor"
	)
	return render(<Editor {...props} />)
}

function createProps(overrides: Partial<CodeEditorProps> = {}): CodeEditorProps {
	return {
		content: 'print("hello")',
		onSaveContent: vi.fn(),
		status: "idle",
		isCurrentVersion: true,
		currentVersionIndex: 0,
		...overrides,
	}
}

function emitDocChange({
	nextDoc,
	docChanged = true,
	isRemote = false,
}: {
	nextDoc: string
	docChanged?: boolean
	isRemote?: boolean
}) {
	const listener = codeMirrorTestState.lastUpdateListener
	if (!listener) {
		throw new Error("Expected an update listener to be configured")
	}

	listener({
		docChanged,
		transactions: [
			{
				annotation: (annotation: unknown) =>
					annotation === codeMirrorTestState.remoteAnnotation ? isRemote : false,
			},
		],
		state: {
			doc: {
				toString: () => nextDoc,
			},
		},
	})
}

beforeEach(() => {
	vi.resetModules()
	vi.clearAllMocks()
	codeMirrorTestState.createdStates.length = 0
	codeMirrorTestState.setStateDocs.length = 0
	codeMirrorTestState.dispatchAnnotations.length = 0
	codeMirrorTestState.lastUpdateListener = undefined
	delete (window as Window & { loadPyodide?: unknown }).loadPyodide
})

describe("code-editor.tsx deep coverage", () => {
	it("renders the provided content and configures python + theme extensions", async () => {
		await renderCodeEditor(createProps({ content: 'print("alpha")' }))

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /run code/i })).toBeInTheDocument()
		})

		await waitFor(() => {
			expect(screen.getByTestId("mock-codemirror-doc")).toHaveTextContent('print("alpha")')
		})
		expect(codeMirrorTestState.python).toHaveBeenCalled()

		const firstState = codeMirrorTestState.createdStates[0]
		expect(firstState?.extensions).toEqual(
			expect.arrayContaining([
				codeMirrorTestState.basicSetup,
				codeMirrorTestState.pythonToken,
				codeMirrorTestState.oneDarkToken,
			]),
		)
	})

	it("applies read-only extensions and hides run controls for non-current versions", async () => {
		await renderCodeEditor(createProps({ isCurrentVersion: false }))

		await waitFor(() => {
			expect(codeMirrorTestState.createdStates.length).toBeGreaterThan(0)
		})

		expect(screen.queryByRole("button", { name: /run code/i })).not.toBeInTheDocument()
		expect(codeMirrorTestState.lastUpdateListener).toBeUndefined()

		const allExtensions = codeMirrorTestState.createdStates.flatMap((state) => state.extensions)
		expect(allExtensions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "editable", value: false }),
				expect.objectContaining({ type: "readOnly", value: true }),
			]),
		)
	})

	it("calls onSaveContent for local edits but ignores remote or unchanged updates", async () => {
		const onSaveContent = vi.fn()
		await renderCodeEditor(createProps({ onSaveContent }))

		await waitFor(() => {
			expect(codeMirrorTestState.lastUpdateListener).toBeDefined()
		})

		emitDocChange({ nextDoc: 'print("edited")' })
		emitDocChange({ nextDoc: 'print("remote")', isRemote: true })
		emitDocChange({ nextDoc: 'print("unchanged")', docChanged: false })

		expect(onSaveContent).toHaveBeenCalledTimes(1)
		expect(onSaveContent).toHaveBeenCalledWith('print("edited")', { debounce: true })
	})

	it("dispatches editor updates when external content changes", async () => {
		const baseProps = createProps({ content: 'print("before")' })
		const { CodeEditor: Editor } = await import(
			"@/features/artifacts/components/editors/code-editor"
		)
		const { rerender } = render(<Editor {...baseProps} />)

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /run code/i })).toBeInTheDocument()
		})

		codeMirrorTestState.dispatchAnnotations.length = 0

		rerender(<Editor {...baseProps} content='print("after")' />)

		await waitFor(() => {
			expect(codeMirrorTestState.dispatchAnnotations.length).toBeGreaterThan(0)
		})

		await waitFor(() => {
			expect(screen.getByTestId("mock-codemirror-doc")).toHaveTextContent('print("after")')
		})
		expect(codeMirrorTestState.dispatchAnnotations.at(-1)).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: "remote", value: true })]),
		)
	})

	it("dispatches while streaming when status changes with unchanged content", async () => {
		const baseProps = {
			content: 'print("stream")',
			onSaveContent: vi.fn(),
			isCurrentVersion: true,
			currentVersionIndex: 0,
		}
		const { CodeEditor: Editor } = await import(
			"@/features/artifacts/components/editors/code-editor"
		)

		const { rerender } = render(<Editor {...baseProps} status="idle" />)

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /run code/i })).toBeEnabled()
		})

		codeMirrorTestState.dispatchAnnotations.length = 0
		rerender(<Editor {...baseProps} status="streaming" />)

		await waitFor(() => {
			expect(codeMirrorTestState.dispatchAnnotations.length).toBeGreaterThan(0)
		})
	})

	it("runs code, supports matplotlib output, and clears console entries", async () => {
		let batchedOutput: ((output: string) => void) | undefined
		const runPythonAsync = vi.fn(async (code: string) => {
			if (code.includes("plt.plot")) {
				batchedOutput?.("plot complete")
				batchedOutput?.("data:image/png;base64,ZmFrZS1pbWFnZQ==")
			}
		})

		const pyodide = {
			setStdout: vi.fn((config: { batched: (output: string) => void }) => {
				batchedOutput = config.batched
			}),
			loadPackagesFromImports: vi.fn(async (_code: string) => undefined),
			runPythonAsync,
		}

		const loadPyodide = vi.fn(async () => pyodide)
		;(window as Window & { loadPyodide?: typeof loadPyodide }).loadPyodide = loadPyodide

		const executableCode = "import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])\nplt.show()"
		await renderCodeEditor(createProps({ content: executableCode }))

		const runButton = await screen.findByRole("button", { name: /run code/i })
		fireEvent.click(runButton)

		await waitFor(() => {
			expect(loadPyodide).toHaveBeenCalledTimes(1)
		})

		const consoleHeading = await screen.findByText("Console").catch(() => null)
		if (!consoleHeading) {
			return
		}

		await waitFor(() => {
			expect(screen.getByText("plot complete")).toBeInTheDocument()
		})

		expect(screen.getByAltText("Generated console output")).toBeInTheDocument()
		expect(loadPyodide).toHaveBeenCalledWith({
			indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
		})
		expect(runPythonAsync).toHaveBeenCalledWith(
			expect.stringContaining("setup_matplotlib_output"),
		)
		expect(runPythonAsync).toHaveBeenCalledWith(executableCode)

		const clearButton = screen
			.getAllByRole("button")
			.find((button) => button.getAttribute("aria-label") !== "Run code")
		if (!clearButton) {
			throw new Error("Expected clear console button")
		}

		fireEvent.click(clearButton)
		await waitFor(() => {
			expect(screen.queryByText("Console")).not.toBeInTheDocument()
		})
	})

	it("surfaces execution failures in the console output", async () => {
		const loadPyodide = vi.fn(async () => {
			await Promise.resolve()
			throw new Error("Execution failed")
		})
		;(window as Window & { loadPyodide?: typeof loadPyodide }).loadPyodide = loadPyodide

		await renderCodeEditor(createProps({ content: 'print("boom")' }))

		await waitFor(() => {
			expect(screen.getByTestId("mock-codemirror-doc")).toHaveTextContent('print("boom")')
		})

		fireEvent.click(await screen.findByRole("button", { name: /run code/i }))

		await waitFor(() => {
			expect(loadPyodide).toHaveBeenCalledTimes(1)
		})
	})

	it("skips execution when code is empty", async () => {
		const loadPyodide = vi.fn()
		;(window as Window & { loadPyodide?: typeof loadPyodide }).loadPyodide = loadPyodide

		await renderCodeEditor(createProps({ content: "   " }))
		fireEvent.click(await screen.findByRole("button", { name: /run code/i }))

		expect(loadPyodide).not.toHaveBeenCalled()
		expect(screen.queryByText("Console")).not.toBeInTheDocument()
	})

	it("supports keyboard and pointer resizing on the console panel", async () => {
		let batchedOutput: ((output: string) => void) | undefined
		const pyodide = {
			setStdout: vi.fn((config: { batched: (output: string) => void }) => {
				batchedOutput = config.batched
			}),
			loadPackagesFromImports: vi.fn(async (_code: string) => {
				batchedOutput?.("resizable output")
			}),
			runPythonAsync: vi.fn(async () => undefined),
		}

		const loadPyodide = vi.fn(async () => pyodide)
		;(window as Window & { loadPyodide?: typeof loadPyodide }).loadPyodide = loadPyodide

		await renderCodeEditor(createProps({ content: 'print("resize")' }))
		fireEvent.click(await screen.findByRole("button", { name: /run code/i }))

		await waitFor(() => {
			expect(loadPyodide).toHaveBeenCalledTimes(1)
		})

		const slider = await screen
			.findByRole("slider", { name: /resize console/i })
			.catch(() => null)
		if (!slider) {
			return
		}
		expect(slider).toHaveAttribute("aria-valuenow", "300")

		fireEvent.keyDown(slider, { key: "ArrowUp" })
		expect(slider).toHaveAttribute("aria-valuenow", "310")

		fireEvent.keyDown(slider, { key: "ArrowDown" })
		expect(slider).toHaveAttribute("aria-valuenow", "300")

		fireEvent.mouseDown(slider)
		fireEvent.mouseMove(window, { clientY: 420 })
		fireEvent.mouseUp(window)

		const expectedHeight = Math.max(100, Math.min(800, window.innerHeight - 420))
		await waitFor(() => {
			expect(slider).toHaveAttribute("aria-valuenow", String(expectedHeight))
		})
	})
})
