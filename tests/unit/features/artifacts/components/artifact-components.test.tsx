// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { UIArtifact } from "@/lib/types/artifact.types"
import { createMockArtifact } from "@/tests/fixtures/artifact"

const testState = vi.hoisted(() => ({
	artifact: {
		artifactId: "artifact-1",
		title: "Test Artifact",
		kind: "text",
		content: "test content",
		status: "idle",
		isVisible: true,
		suggestions: [],
	},
	mockSetArtifact: vi.fn(),
	mockResetArtifact: vi.fn(),
	mockUseSWR: vi.fn(),
	mockUseEditor: vi.fn(),
	mockToastError: vi.fn(),
	dynamicEditorProps: [] as Array<Record<string, unknown>>,
	lastDataGridProps: null as Record<string, unknown> | null,
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}))

vi.mock("server-only", () => ({}))

vi.mock("framer-motion", async () => {
	const ReactModule = await import("react")
	type MotionProps = React.HTMLAttributes<HTMLElement> & {
		children?: React.ReactNode
	}

	const motion = new Proxy<Record<string, React.FC<MotionProps>>>(
		{},
		{
			get:
				(_target, tag) =>
				({ children, ...props }: MotionProps) =>
					ReactModule.createElement(String(tag), props, children),
		},
	)

	return {
		motion,
		AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
			ReactModule.createElement(ReactModule.Fragment, null, children),
	}
})

vi.mock("next/dynamic", async () => {
	const ReactModule = await import("react")

	return {
		default: () => {
			return ({
				children,
				...props
			}: {
				children?: React.ReactNode
				[key: string]: unknown
			}) => {
				testState.dynamicEditorProps.push(props)
				return ReactModule.createElement(
					"div",
					{ "data-testid": "dynamic-editor" },
					children,
				)
			}
		},
	}
})

vi.mock("swr", () => ({
	default: (...args: unknown[]) => testState.mockUseSWR(...args),
}))

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => testState.mockToastError(...args),
	},
}))

vi.mock("@/features/artifacts/hooks/use-artifact", () => ({
	useArtifact: () => ({
		artifact: testState.artifact,
		setArtifact: testState.mockSetArtifact,
		resetArtifact: testState.mockResetArtifact,
	}),
}))

vi.mock("@/features/artifacts/hooks/use-artifact-selector", () => ({
	useArtifactSelector: <T,>(selector: (artifact: UIArtifact) => T): T =>
		selector(testState.artifact as UIArtifact),
}))

vi.mock("@/features/chat/hooks/use-chat-session-context", () => ({
	useChatSessionContext: () => ({
		chatId: "chat-1",
	}),
}))

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: "light" }),
}))

vi.mock("react-data-grid", () => ({
	DataGrid: ({ className, ...props }: { className?: string; [key: string]: unknown }) => {
		testState.lastDataGridProps = props
		return React.createElement("div", { "data-testid": "sheet-grid", className })
	},
	renderTextEditor: vi.fn(),
}))

vi.mock("@/components/ui/tooltip", async () => {
	const ReactModule = await import("react")

	return {
		Tooltip: ({ children }: { children?: React.ReactNode }) =>
			ReactModule.createElement(ReactModule.Fragment, null, children),
		TooltipTrigger: ({ children }: { children?: React.ReactNode }) =>
			ReactModule.createElement(ReactModule.Fragment, null, children),
		TooltipContent: ({ children }: { children?: React.ReactNode }) =>
			ReactModule.createElement("div", null, children),
	}
})

vi.mock("@tiptap/extension-mathematics", () => ({
	Mathematics: {
		configure: () => ({ name: "mathematics" }),
	},
	migrateMathStrings: vi.fn(),
}))

vi.mock("@tiptap/extension-table", () => ({
	Table: {
		configure: () => ({ name: "table" }),
	},
}))

vi.mock("@tiptap/extension-table-cell", () => ({
	TableCell: { name: "table-cell" },
}))

vi.mock("@tiptap/extension-table-header", () => ({
	TableHeader: { name: "table-header" },
}))

vi.mock("@tiptap/extension-table-row", () => ({
	TableRow: { name: "table-row" },
}))

vi.mock("@tiptap/markdown", () => ({
	Markdown: { name: "markdown" },
}))

vi.mock("@tiptap/starter-kit", () => ({
	StarterKit: { name: "starter-kit" },
}))

vi.mock("@tiptap/react", async () => {
	const ReactModule = await import("react")

	return {
		EditorContent: ({ editor }: { editor: unknown }) =>
			ReactModule.createElement("div", {
				"data-testid": "text-editor-content",
				"data-editor": editor ? "present" : "missing",
			}),
		useEditor: (...args: unknown[]) => testState.mockUseEditor(...args),
	}
})

vi.mock("@tiptap/core", () => ({
	Extension: {
		create: (config: Record<string, unknown>) => config,
	},
}))

vi.mock("@tiptap/pm/state", () => {
	class MockPluginKey {
		key: string

		constructor(key: string) {
			this.key = key
		}

		getState(state: { pluginState?: unknown }): unknown {
			return state.pluginState
		}
	}

	class MockPlugin {
		spec: Record<string, unknown>

		constructor(spec: Record<string, unknown>) {
			this.spec = spec
		}

		getState(state: { pluginState?: unknown }): unknown {
			return state.pluginState
		}
	}

	return {
		Plugin: MockPlugin,
		PluginKey: MockPluginKey,
	}
})

vi.mock("@tiptap/pm/view", () => {
	type MockDecorationData = {
		type: "inline" | "widget"
		from?: number
		to?: number
		position?: number
		spec: Record<string, unknown>
	}

	class MockDecorationSet {
		static empty = new MockDecorationSet([])

		private readonly decorations: MockDecorationData[]

		constructor(decorations: MockDecorationData[]) {
			this.decorations = decorations
		}

		static create(_doc: unknown, decorations: MockDecorationData[]): MockDecorationSet {
			return new MockDecorationSet(decorations)
		}

		find(): MockDecorationData[] {
			return this.decorations
		}

		map(): MockDecorationSet {
			return this
		}
	}

	const MockDecoration = {
		inline(
			from: number,
			to: number,
			_attrs: Record<string, string>,
			spec: Record<string, unknown>,
		): MockDecorationData {
			return {
				type: "inline",
				from,
				to,
				spec,
			}
		},

		widget(
			position: number,
			_toDOM: (view: unknown) => HTMLElement,
			spec: Record<string, unknown>,
		): MockDecorationData {
			return {
				type: "widget",
				position,
				spec,
			}
		},
	}

	return {
		Decoration: MockDecoration,
		DecorationSet: MockDecorationSet,
	}
})

vi.mock("@codemirror/state", () => {
	class MockEditorState {
		private readonly value: string
		doc: { toString: () => string }
		selection: unknown

		constructor(value: string, selection: unknown) {
			this.value = value
			this.doc = {
				toString: () => this.value,
			}
			this.selection = selection
		}

		static readOnly = {
			of: () => ({ type: "readOnly" }),
		}

		static create({ doc, selection }: { doc: unknown; selection?: unknown }): MockEditorState {
			if (typeof doc === "string") {
				return new MockEditorState(doc, selection ?? null)
			}

			if (
				typeof doc === "object" &&
				doc !== null &&
				"toString" in doc &&
				typeof (doc as { toString: () => string }).toString === "function"
			) {
				return new MockEditorState(
					(doc as { toString: () => string }).toString(),
					selection ?? null,
				)
			}

			return new MockEditorState("", selection ?? null)
		}

		update({ changes }: { changes: { insert: string } }): { state: MockEditorState } {
			return {
				state: MockEditorState.create({ doc: changes.insert, selection: this.selection }),
			}
		}
	}

	const MockTransaction = {
		remote: {
			of: (value: boolean) => ({ value }),
		},
	}

	return {
		EditorState: MockEditorState,
		Transaction: MockTransaction,
	}
})

vi.mock("@codemirror/view", () => {
	class MockEditorView {
		state: { doc: { toString: () => string } }
		dom: HTMLElement

		constructor({
			state,
			parent,
		}: {
			state: { doc: { toString: () => string } }
			parent: HTMLElement
		}) {
			this.state = state
			this.dom = parent
		}

		static editable = {
			of: () => ({ type: "editable" }),
		}

		static updateListener = {
			of: (listener: unknown) => ({ listener }),
		}

		destroy(): void {
			// no-op for tests
		}

		setState(nextState: { doc: { toString: () => string } }): void {
			this.state = nextState
		}

		dispatch(transaction: { state?: { doc: { toString: () => string } } }): void {
			if (transaction.state) {
				this.state = transaction.state
			}
		}
	}

	return {
		EditorView: MockEditorView,
	}
})

vi.mock("codemirror", () => ({
	basicSetup: {},
}))

vi.mock("@codemirror/lang-python", () => ({
	python: () => ({ name: "python" }),
}))

vi.mock("@codemirror/theme-one-dark", () => ({
	oneDark: { name: "oneDark" },
}))

import { migrateMathStrings } from "@tiptap/extension-mathematics"
import { ArtifactActions } from "@/features/artifacts/components/artifact-actions"
import { ArtifactCloseButton } from "@/features/artifacts/components/artifact-close-button"
import { ArtifactErrorBoundary } from "@/features/artifacts/components/artifact-error-boundary"
import { ArtifactPanel } from "@/features/artifacts/components/artifact-panel"
import { ArtifactPreview } from "@/features/artifacts/components/artifact-preview"
import { CodeEditor } from "@/features/artifacts/components/editors/code-editor"
import { ImageEditor } from "@/features/artifacts/components/editors/image-editor"
import { SheetEditor } from "@/features/artifacts/components/editors/sheet-editor"
import { TextEditor } from "@/features/artifacts/components/editors/text-editor"
import { VersionFooter } from "@/features/artifacts/components/version-footer"
import {
	createDecorations,
	projectWithPositions,
	SuggestionsExtension,
	suggestionsPluginKey,
} from "@/features/artifacts/lib/suggestions-extension"

beforeEach(() => {
	vi.clearAllMocks()
	testState.dynamicEditorProps.length = 0
	testState.lastDataGridProps = null

	testState.artifact = {
		artifactId: "artifact-1",
		title: "Test Artifact",
		kind: "text",
		content: "test content",
		status: "idle",
		isVisible: true,
		suggestions: [],
	}

	testState.mockUseSWR.mockReturnValue({
		data: undefined,
		isLoading: false,
		mutate: vi.fn(),
	})

	testState.mockUseEditor.mockReturnValue({
		setEditable: vi.fn(),
		getMarkdown: vi.fn(() => "mock-markdown"),
		commands: {
			setContent: vi.fn(),
		},
		state: {
			doc: {},
			tr: {
				setMeta: vi.fn(),
			},
		},
		view: {
			state: {
				doc: {},
			},
			dispatch: vi.fn(),
		},
	})

	if (typeof window.requestAnimationFrame !== "function") {
		window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
			callback(0)
			return 0
		}
	}
})

describe("artifact-actions.tsx", () => {
	it("renders action buttons", () => {
		render(
			<ArtifactActions
				actions={[
					{
						description: "Run action",
						icon: <span>i</span>,
						label: "Run",
						onClick: vi.fn(),
					},
				]}
				currentVersionIndex={0}
				handleVersionChange={vi.fn()}
				isCurrentVersion={true}
				metadata={null}
				mode="edit"
				setMetadata={vi.fn()}
			/>,
		)

		expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument()
	})

	it("returns null when actions are empty", () => {
		render(
			<ArtifactActions
				actions={[]}
				currentVersionIndex={0}
				handleVersionChange={vi.fn()}
				isCurrentVersion={true}
				metadata={null}
				mode="edit"
				setMetadata={vi.fn()}
			/>,
		)

		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})

	it("disables action while artifact is streaming", () => {
		testState.artifact = {
			...testState.artifact,
			status: "streaming",
		}

		render(
			<ArtifactActions
				actions={[
					{
						description: "Do work",
						icon: <span>i</span>,
						label: "Do",
						onClick: vi.fn(),
					},
				]}
				currentVersionIndex={0}
				handleVersionChange={vi.fn()}
				isCurrentVersion={true}
				metadata={null}
				mode="edit"
				setMetadata={vi.fn()}
			/>,
		)

		expect(screen.getByRole("button", { name: /do/i })).toBeDisabled()
	})

	it("shows toast when action handler throws", async () => {
		testState.artifact = {
			...testState.artifact,
			status: "idle",
		}

		render(
			<ArtifactActions
				actions={[
					{
						description: "Explode",
						icon: <span>!</span>,
						label: "Fail",
						onClick: vi.fn(async () => {
							throw new Error("boom")
						}),
					},
				]}
				currentVersionIndex={0}
				handleVersionChange={vi.fn()}
				isCurrentVersion={true}
				metadata={null}
				mode="edit"
				setMetadata={vi.fn()}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: /fail/i }))

		await waitFor(() => {
			expect(testState.mockToastError).toHaveBeenCalledWith("Failed to execute action")
		})
	})
})

describe("artifact-close-button.tsx", () => {
	it("updates visibility to false when clicked", () => {
		render(<ArtifactCloseButton />)

		fireEvent.click(screen.getByTestId("artifact-close-button"))

		expect(testState.mockSetArtifact).toHaveBeenCalledTimes(1)

		const updater = testState.mockSetArtifact.mock.calls[0]?.[0] as (
			prev: UIArtifact,
		) => UIArtifact
		const updatedArtifact = updater({ ...(testState.artifact as UIArtifact), isVisible: true })
		expect(updatedArtifact.isVisible).toBe(false)
	})
})

describe("artifact-error-boundary.tsx", () => {
	it("renders child content when no error occurs", () => {
		render(
			<ArtifactErrorBoundary>
				<div>Editor content</div>
			</ArtifactErrorBoundary>,
		)

		expect(screen.getByText("Editor content")).toBeInTheDocument()
	})

	it("renders fallback UI when a child throws", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

		const ThrowingComponent = () => {
			throw new Error("test error")
		}

		render(
			<ArtifactErrorBoundary>
				<ThrowingComponent />
			</ArtifactErrorBoundary>,
		)

		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(screen.getByText("Failed to render artifact")).toBeInTheDocument()
		expect(screen.getByText("test error")).toBeInTheDocument()

		errorSpy.mockRestore()
	})
})

describe("artifact-panel.tsx", () => {
	it("renders artifact panel with title", () => {
		testState.artifact = {
			...testState.artifact,
			title: "Panel Artifact",
			kind: "text",
			content: "panel content",
			isVisible: true,
		}

		testState.mockUseSWR.mockReturnValue({
			data: [createMockArtifact({ content: "panel content", title: "Panel Artifact" })],
			isLoading: false,
			mutate: vi.fn(),
		})

		render(<ArtifactPanel />)

		expect(screen.getByTestId("artifact-panel")).toBeInTheDocument()
		expect(screen.getByText("Panel Artifact")).toBeInTheDocument()
	})

	it("returns null when artifact is hidden and idle", () => {
		testState.artifact = {
			...testState.artifact,
			isVisible: false,
			status: "idle",
		}

		render(<ArtifactPanel />)

		expect(screen.queryByTestId("artifact-panel")).not.toBeInTheDocument()
	})

	it("renders unsupported artifact fallback for unknown kinds", () => {
		testState.artifact = {
			...testState.artifact,
			kind: "unknown" as UIArtifact["kind"],
			isVisible: true,
		}

		render(<ArtifactPanel />)

		expect(screen.getByText(/unsupported artifact kind/i)).toBeInTheDocument()
	})

	it("syncs artifact content to latest version when versions load", () => {
		const older = createMockArtifact({
			content: "older content",
			createdAt: new Date("2026-01-01T00:00:00Z"),
			id: "artifact-v1",
			title: "Panel Artifact",
		})
		const latest = createMockArtifact({
			content: "latest content",
			createdAt: new Date("2026-01-02T00:00:00Z"),
			id: "artifact-v2",
			title: "Panel Artifact",
		})

		testState.artifact = {
			...testState.artifact,
			content: "older content",
			kind: "text",
			title: "Panel Artifact",
		}

		testState.mockUseSWR.mockReturnValue({
			data: [latest, older],
			isLoading: false,
			mutate: vi.fn(),
		})

		render(<ArtifactPanel />)

		expect(testState.mockSetArtifact).toHaveBeenCalled()
		const updater = testState.mockSetArtifact.mock.calls.at(-1)?.[0] as
			| ((prev: UIArtifact) => UIArtifact)
			| undefined

		if (!updater) {
			throw new Error("Expected setArtifact updater to be called")
		}

		const updated = updater(testState.artifact as UIArtifact)
		expect(updated.content).toBe("latest content")
	})

	it("disables eager artifact revalidation for mutable editor state", () => {
		testState.mockUseSWR.mockReturnValue({
			data: [createMockArtifact()],
			isLoading: false,
			mutate: vi.fn(),
		})

		render(<ArtifactPanel />)

		expect(testState.mockUseSWR).toHaveBeenCalledWith(
			expect.anything(),
			expect.any(Function),
			expect.objectContaining({
				revalidateOnFocus: false,
				revalidateOnReconnect: false,
			}),
		)
	})

	it("saves content through editor callbacks and mutates versions", async () => {
		const version = createMockArtifact({
			content: "initial",
			createdAt: new Date("2026-01-02T00:00:00Z"),
			id: "artifact-v2",
			title: "Panel Artifact",
		})
		const mutate = vi.fn().mockResolvedValue(undefined)
		const fetchMock = vi.fn().mockResolvedValue({ ok: true })
		const originalFetch = globalThis.fetch
		globalThis.fetch = fetchMock as unknown as typeof fetch

		testState.artifact = {
			...testState.artifact,
			content: "initial",
			kind: "text",
			title: "Panel Artifact",
		}

		testState.mockUseSWR.mockReturnValue({
			data: [version],
			isLoading: false,
			mutate,
		})

		try {
			render(<ArtifactPanel />)

			const editorProps = testState.dynamicEditorProps.at(-1) as
				| {
						onSaveContent?: (
							content: string,
							options?: { debounce?: boolean },
						) => Promise<void>
				  }
				| undefined

			if (!editorProps?.onSaveContent) {
				throw new Error("Expected dynamic editor to receive onSaveContent")
			}

			await editorProps.onSaveContent("updated content", { debounce: false })

			expect(fetchMock).toHaveBeenCalledWith(
				"/api/artifact",
				expect.objectContaining({
					method: "POST",
				}),
			)

			const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string }
			expect(requestInit.body).toBeDefined()
			if (!requestInit.body) {
				throw new Error("Expected request body")
			}

			const payload = JSON.parse(requestInit.body) as {
				content: string
				mode: string
			}
			expect(payload.mode).toBe("save")
			expect(payload.content).toBe("updated content")
			expect(mutate).toHaveBeenCalled()
		} finally {
			globalThis.fetch = originalFetch
		}
	})

	it("keeps the dirty state when a save request fails", async () => {
		const version = createMockArtifact({
			content: "initial",
			createdAt: new Date("2026-01-02T00:00:00Z"),
			id: "artifact-v2",
			title: "Panel Artifact",
		})
		const mutate = vi.fn().mockResolvedValue(undefined)
		const fetchMock = vi.fn().mockResolvedValue({ ok: false })
		const originalFetch = globalThis.fetch
		globalThis.fetch = fetchMock as unknown as typeof fetch

		testState.artifact = {
			...testState.artifact,
			content: "initial",
			kind: "text",
			title: "Panel Artifact",
		}

		testState.mockUseSWR.mockReturnValue({
			data: [version],
			isLoading: false,
			mutate,
		})

		try {
			render(<ArtifactPanel />)

			const editorProps = testState.dynamicEditorProps.at(-1) as
				| {
						onSaveContent?: (
							content: string,
							options?: { debounce?: boolean },
						) => Promise<void>
				  }
				| undefined

			if (!editorProps?.onSaveContent) {
				throw new Error("Expected dynamic editor to receive onSaveContent")
			}

			await editorProps.onSaveContent("updated content", { debounce: false })

			await waitFor(() => {
				expect(screen.getByText("Saving changes…")).toBeInTheDocument()
			})
			expect(mutate).not.toHaveBeenCalled()
		} finally {
			globalThis.fetch = originalFetch
		}
	})
})

describe("artifact-preview.tsx", () => {
	it("renders preview header and open artifact hitbox", () => {
		testState.artifact = {
			...testState.artifact,
			isVisible: false,
			status: "idle",
		}

		testState.mockUseSWR.mockReturnValue({
			data: [
				{
					id: "artifact-1",
					title: "Preview Artifact",
					kind: "text",
					content: "preview content",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
			mutate: vi.fn(),
		})

		render(
			<ArtifactPreview
				result={{
					id: "artifact-1",
					title: "Preview Artifact",
					kind: "text",
				}}
			/>,
		)

		expect(screen.getByText("Preview Artifact")).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /open artifact: preview artifact/i }),
		).toBeInTheDocument()
	})
})

describe("version-footer.tsx", () => {
	it("renders version metadata and actions", () => {
		const versions = [
			createMockArtifact({ id: "v1", createdAt: new Date("2026-01-01T00:00:00Z") }),
			createMockArtifact({ id: "v2", createdAt: new Date("2026-01-02T00:00:00Z") }),
		]

		render(
			<VersionFooter
				currentVersionIndex={0}
				handleVersionChange={vi.fn()}
				onVersionRestore={vi.fn()}
				versions={versions}
			/>,
		)

		expect(screen.getByText("Version 1 of 2")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
		expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Restore this version" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Back to latest version" })).toBeInTheDocument()
	})
})

describe("code-editor.tsx", () => {
	it("renders run button once mocked CodeMirror modules load", async () => {
		render(
			<CodeEditor
				content={'print("hello")'}
				currentVersionIndex={0}
				isCurrentVersion={true}
				onSaveContent={vi.fn()}
				suggestions={[]}
				status="idle"
			/>,
		)

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /run code/i })).toBeInTheDocument()
		})
	})
})

describe("image-editor.tsx", () => {
	it("renders streaming placeholder when image content is empty", () => {
		render(
			<ImageEditor
				content=""
				isCurrentVersion={true}
				status="streaming"
				title="Generated Image"
			/>,
		)

		expect(screen.getByLabelText("Loading image: Generated Image")).toBeInTheDocument()
		expect(screen.getByText(/Generating image/i)).toBeInTheDocument()
	})

	it("reveals image after load and shows fallback when loading fails", () => {
		render(
			<ImageEditor
				content="https://example.com/generated.png"
				isCurrentVersion={true}
				status="idle"
				title="Generated Image"
			/>,
		)

		const image = screen.getByRole("img", { name: "Generated Image" })
		expect(image).toHaveClass("opacity-0")

		fireEvent.load(image)
		expect(image).toHaveClass("opacity-100")

		fireEvent.error(image)
		expect(screen.getByRole("alert")).toHaveTextContent(/failed to load image/i)
	})
})

describe("sheet-editor.tsx", () => {
	it("renders mocked data grid", () => {
		render(
			<SheetEditor
				content="a,b"
				currentVersionIndex={0}
				isCurrentVersion={true}
				onSaveContent={vi.fn()}
				status="idle"
			/>,
		)

		expect(screen.getByTestId("sheet-grid")).toBeInTheDocument()
	})

	it("saves CSV and selects editable cells in current version mode", () => {
		const onSaveContent = vi.fn()

		render(
			<SheetEditor
				content="a,b"
				currentVersionIndex={0}
				isCurrentVersion={true}
				onSaveContent={onSaveContent}
				status="idle"
			/>,
		)

		const props = testState.lastDataGridProps as {
			onRowsChange?: (rows: Array<Record<string, string | number>>) => void
			onCellClick?: (args: {
				column: { key: string }
				selectCell: (open: boolean) => void
			}) => void
		} | null

		expect(props?.onRowsChange).toBeTypeOf("function")
		props?.onRowsChange?.([{ id: 0, rowNumber: 1, "0": "Name", "1": "Value" }])
		expect(onSaveContent).toHaveBeenCalledWith(expect.stringContaining("Name,Value"), {
			debounce: false,
		})

		const selectCell = vi.fn()
		props?.onCellClick?.({ column: { key: "1" }, selectCell })
		expect(selectCell).toHaveBeenCalledWith(true)
	})

	it("keeps row edits disabled in read-only mode", () => {
		render(
			<SheetEditor
				content="x,y"
				currentVersionIndex={0}
				isCurrentVersion={false}
				onSaveContent={vi.fn()}
				status="idle"
			/>,
		)

		const props = testState.lastDataGridProps as {
			onRowsChange?: unknown
			onCellClick?: (args: {
				column: { key: string }
				selectCell: (open: boolean) => void
			}) => void
		} | null

		expect(props?.onRowsChange).toBeUndefined()
		const selectCell = vi.fn()
		props?.onCellClick?.({ column: { key: "1" }, selectCell })
		expect(selectCell).not.toHaveBeenCalled()
	})
})

describe("text-editor.tsx", () => {
	it("renders editor content with mocked tiptap editor", () => {
		render(
			<TextEditor
				content="Initial markdown"
				currentVersionIndex={0}
				isCurrentVersion={true}
				onSaveContent={vi.fn()}
				suggestions={[]}
				status="idle"
			/>,
		)

		expect(screen.getByTestId("text-editor-content")).toBeInTheDocument()
		expect(testState.mockUseEditor).toHaveBeenCalledTimes(1)
	})

	it("toggles editable mode and updates content during streaming", () => {
		const editor = {
			setEditable: vi.fn(),
			getMarkdown: vi.fn(() => "existing"),
			commands: {
				setContent: vi.fn(),
			},
			state: {
				doc: {},
				tr: {
					setMeta: vi.fn(),
				},
			},
			view: {
				state: {
					doc: {},
				},
				dispatch: vi.fn(),
			},
		}

		testState.mockUseEditor.mockReturnValue(editor)

		const { rerender } = render(
			<TextEditor
				content="existing"
				currentVersionIndex={0}
				isCurrentVersion={false}
				onSaveContent={vi.fn()}
				suggestions={[]}
				status="idle"
			/>,
		)

		expect(editor.setEditable).toHaveBeenCalledWith(false)

		rerender(
			<TextEditor
				content="stream update"
				currentVersionIndex={0}
				isCurrentVersion={false}
				onSaveContent={vi.fn()}
				suggestions={[]}
				status="streaming"
			/>,
		)

		expect(editor.commands.setContent).toHaveBeenCalledWith("stream update", {
			contentType: "markdown",
			emitUpdate: false,
		})
		expect(migrateMathStrings).toHaveBeenCalled()
	})

	it("calls onSaveContent from the editor onUpdate callback when allowed", () => {
		const onSaveContent = vi.fn()

		render(
			<TextEditor
				content="initial"
				currentVersionIndex={0}
				isCurrentVersion={true}
				onSaveContent={onSaveContent}
				suggestions={[]}
				status="idle"
			/>,
		)

		const options = testState.mockUseEditor.mock.calls[0]?.[0] as
			| {
					onUpdate?: (payload: {
						editor: { getMarkdown: () => string }
						transaction: { getMeta: (key: string) => unknown }
					}) => void
			  }
			| undefined

		if (!options?.onUpdate) {
			throw new Error("Expected onUpdate callback")
		}

		options.onUpdate({
			editor: {
				getMarkdown: () => "saved markdown",
			},
			transaction: {
				getMeta: (key: string) => {
					if (key === "no-save") return false
					if (key === "no-debounce") return true
					return undefined
				},
			},
		})

		expect(onSaveContent).toHaveBeenCalledWith("saved markdown", { debounce: false })

		options.onUpdate({
			editor: {
				getMarkdown: () => "ignored",
			},
			transaction: {
				getMeta: (key: string) => key === "no-save",
			},
		})

		expect(onSaveContent).toHaveBeenCalledTimes(1)
	})
})

describe("suggestions-extension.tsx", () => {
	it("projects suggestion ranges from doc text", () => {
		const fakeDoc = {
			content: { size: 11 },
			nodesBetween: (
				_from: number,
				_to: number,
				callback: (
					node: { isText: boolean; text?: string },
					pos: number,
				) => boolean | undefined,
			) => {
				callback({ isText: true, text: "hello world" }, 0)
			},
		}

		const projected = projectWithPositions(
			fakeDoc as unknown as Parameters<typeof projectWithPositions>[0],
			[
				{
					originalText: "world",
					suggestedText: "earth",
					description: "Replace world with earth",
				},
			],
		)

		expect(projected).toHaveLength(1)
		expect(projected[0]?.id).toBe("suggestion-0")
		expect(projected[0]?.selectionStart).toBe(6)
		expect(projected[0]?.selectionEnd).toBe(11)
	})

	it("creates highlight and widget decorations for a projected suggestion", () => {
		const fakeDoc = {
			content: { size: 11 },
			nodesBetween: (
				_from: number,
				_to: number,
				callback: (
					node: { isText: boolean; text?: string },
					pos: number,
				) => boolean | undefined,
			) => {
				callback({ isText: true, text: "hello world" }, 0)
			},
		}

		const [projected] = projectWithPositions(
			fakeDoc as unknown as Parameters<typeof projectWithPositions>[0],
			[
				{
					originalText: "world",
					suggestedText: "earth",
					description: "Replace world with earth",
				},
			],
		)

		if (!projected) {
			throw new Error("Expected projected suggestion")
		}

		const decorations = createDecorations([projected], {
			state: { doc: fakeDoc },
		} as unknown as Parameters<typeof createDecorations>[1])

		expect(decorations.find()).toHaveLength(2)
		expect((SuggestionsExtension as { name?: string }).name).toBe("suggestions")
		expect((suggestionsPluginKey as { key?: string }).key).toBe("suggestions")
	})
})
