// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ArtifactPreview } from "@/features/artifacts/components/artifact-preview"
import {
	createDecorations,
	projectWithPositions,
	SuggestionsExtension,
	suggestionsPluginKey,
	type UISuggestion,
} from "@/features/artifacts/lib/suggestions-extension"
import type { ArtifactKind, ArtifactStatus } from "@/features/artifacts/types/artifact.types"

type SelectorState = {
	isVisible: boolean
	status: ArtifactStatus
	content: string
	title: string
	kind: ArtifactKind
}

type StoreArtifact = SelectorState & {
	artifactId: string
	boundingBox?: {
		left: number
		top: number
		width: number
		height: number
	}
}

type MockDecorationRecord = {
	kind: "inline" | "widget"
	from?: number
	to?: number
	position?: number
	attrs?: Record<string, string>
	spec: Record<string, unknown>
	toDOM?: (view: unknown) => HTMLElement
}

const testState = vi.hoisted(() => ({
	selectorState: {
		isVisible: false,
		status: "idle",
		content: "",
		title: "",
		kind: "text",
	} as SelectorState,
	setArtifact: vi.fn(),
	useSWR: vi.fn(),
	swrFetcher: null as ((url: string) => Promise<unknown>) | null,
	dynamicIndex: 0,
}))

const pmStateMocks = vi.hoisted(() => {
	class PluginKey {
		readonly key: string

		constructor(key: string) {
			this.key = key
		}

		getState(state: { pluginState?: unknown; [key: string]: unknown }): unknown {
			if ("pluginState" in state) {
				return state.pluginState
			}
			return state[this.key]
		}
	}

	type PluginSpec = {
		key: PluginKey
		state: {
			init: () => { decorations: unknown; selected: unknown }
			apply: (
				tr: { getMeta: (key: unknown) => unknown; mapping: unknown; doc: unknown },
				state: {
					decorations: { map: (mapping: unknown, doc: unknown) => unknown }
					selected: unknown
				},
			) => unknown
		}
		props: {
			decorations: (
				this: { getState: (state: unknown) => { decorations?: unknown } | undefined },
				state: unknown,
			) => unknown
		}
	}

	class Plugin {
		readonly key: PluginKey
		readonly spec: PluginSpec

		constructor(spec: PluginSpec) {
			this.key = spec.key
			this.spec = spec
		}

		getState(state: { pluginState?: unknown; [key: string]: unknown }) {
			return this.key.getState(state)
		}
	}

	return {
		Plugin,
		PluginKey,
	}
})

const pmViewMocks = vi.hoisted(() => {
	class DecorationSet {
		static empty = new DecorationSet([])

		private readonly decorations: MockDecorationRecord[]

		constructor(decorations: MockDecorationRecord[]) {
			this.decorations = decorations
		}

		static create(_doc: unknown, decorations: MockDecorationRecord[]): DecorationSet {
			return new DecorationSet(decorations)
		}

		find(): MockDecorationRecord[] {
			return this.decorations
		}

		map(): DecorationSet {
			return this
		}
	}

	const Decoration = {
		inline(
			from: number,
			to: number,
			attrs: Record<string, string>,
			spec: Record<string, unknown>,
		): MockDecorationRecord {
			return {
				kind: "inline",
				from,
				to,
				attrs,
				spec,
			}
		},
		widget(
			position: number,
			toDOM: (view: unknown) => HTMLElement,
			spec: Record<string, unknown>,
		): MockDecorationRecord {
			return {
				kind: "widget",
				position,
				toDOM,
				spec,
			}
		},
	}

	return {
		Decoration,
		DecorationSet,
	}
})

vi.mock("server-only", () => ({}))
vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get:
				(_, tag) =>
				({ children, ...p }: { children?: React.ReactNode } & Record<string, unknown>) =>
					React.createElement(String(tag), p, children),
		},
	),
	AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/dynamic", () => ({
	default: () => {
		const editorIds = ["text-editor", "code-editor", "sheet-editor", "image-editor"] as const
		const id = editorIds[testState.dynamicIndex] ?? `dynamic-editor-${testState.dynamicIndex}`
		testState.dynamicIndex += 1

		return ({
			content,
			status,
			title,
			isInline,
		}: {
			content?: string
			status?: string
			title?: string
			isInline?: boolean
		}) =>
			React.createElement("div", {
				"data-testid": id,
				"data-content": content ?? "",
				"data-status": status ?? "",
				"data-title": title ?? "",
				"data-inline": String(Boolean(isInline)),
			})
	},
}))

vi.mock("swr", () => ({
	default: (key: string | null, fetcher?: (url: string) => Promise<unknown>) => {
		testState.swrFetcher = fetcher ?? null
		return testState.useSWR(key, fetcher)
	},
}))

vi.mock("@/features/artifacts/hooks/use-artifact", () => ({
	useArtifact: vi.fn().mockImplementation(() => ({
		artifact: {
			artifactId: "a1",
			kind: "text",
			content: "Hello",
			title: "Test",
			status: "idle",
			isVisible: false,
		},
		setArtifact: testState.setArtifact,
	})),
}))

vi.mock("@/features/artifacts/hooks/use-artifact-selector", () => ({
	useArtifactSelector: <T,>(selector: (state: SelectorState) => T): T => {
		return selector(testState.selectorState)
	},
}))

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		type,
		className,
	}: {
		children?: React.ReactNode
		onClick?: React.MouseEventHandler<HTMLButtonElement>
		type?: "button" | "submit" | "reset"
		className?: string
	}) => React.createElement("button", { className, onClick, type: type ?? "button" }, children),
}))

vi.mock("@tiptap/core", () => ({
	Extension: {
		create: <T extends Record<string, unknown>>(config: T) => config,
	},
}))

vi.mock("@tiptap/pm/state", () => ({
	Plugin: pmStateMocks.Plugin,
	PluginKey: pmStateMocks.PluginKey,
}))

vi.mock("@tiptap/pm/view", () => ({
	Decoration: pmViewMocks.Decoration,
	DecorationSet: pmViewMocks.DecorationSet,
}))

type DocTextNode = {
	isText: boolean
	text?: string
}

type MockDoc = {
	content: { size: number }
	nodesBetween: (
		from: number,
		to: number,
		callback: (node: DocTextNode, pos: number) => boolean | undefined,
	) => void
}

type PluginLike = {
	spec: {
		state: {
			init: () => { decorations: unknown; selected: unknown }
			apply: (
				tr: { getMeta: (key: unknown) => unknown; mapping: unknown; doc: unknown },
				state: {
					decorations: { map: (mapping: unknown, doc: unknown) => unknown }
					selected: unknown
				},
			) => unknown
		}
		props: {
			decorations: (
				this: { getState: (state: unknown) => { decorations?: unknown } | undefined },
				state: unknown,
			) => unknown
		}
	}
	getState: (state: unknown) => { decorations?: unknown } | undefined
}

function makeDoc(segments: Array<{ text: string; pos: number }>): MockDoc {
	const size = segments.reduce((max, segment) => {
		return Math.max(max, segment.pos + segment.text.length)
	}, 0)

	return {
		content: { size },
		nodesBetween: (_from, _to, callback) => {
			for (const segment of segments) {
				const shouldContinue = callback({ isText: true, text: segment.text }, segment.pos)
				if (shouldContinue === false) break
			}
		},
	}
}

function setSelectorState(next: Partial<SelectorState>) {
	testState.selectorState = {
		...testState.selectorState,
		...next,
	}
}

function makePrevArtifact(overrides: Partial<StoreArtifact> = {}): StoreArtifact {
	return {
		artifactId: "previous",
		isVisible: false,
		status: "idle",
		kind: "text",
		title: "Previous",
		content: "prev-content",
		...overrides,
	}
}

function makeRect(x: number, y: number, width: number, height: number): DOMRect {
	return {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		toJSON: () => ({}),
	} as DOMRect
}

function getWidgetDecoration(records: MockDecorationRecord[]): MockDecorationRecord {
	const widget = records.find((record) => record.kind === "widget")
	if (!widget) {
		throw new Error("Expected widget decoration")
	}
	return widget
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.unstubAllGlobals()

	setSelectorState({
		isVisible: false,
		status: "idle",
		content: "",
		title: "",
		kind: "text",
	})

	testState.swrFetcher = null
	testState.useSWR.mockReturnValue({
		data: undefined,
		isLoading: false,
	})
})

describe("artifact-preview.tsx deep coverage", () => {
	it("renders text preview from fetched versions", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a1",
					title: "Fetched Text",
					kind: "text",
					content: "Text body",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		render(<ArtifactPreview result={{ id: "a1", kind: "text", title: "Ignored" }} />)

		expect(screen.getByText("Fetched Text")).toBeInTheDocument()
		expect(screen.getByTestId("text-editor")).toHaveAttribute("data-content", "Text body")
		expect(
			screen.getByRole("button", { name: /open artifact: fetched text/i }),
		).toBeInTheDocument()
	})

	it("renders code preview content", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a2",
					title: "Fetched Code",
					kind: "code",
					content: "console.log('hi')",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		render(<ArtifactPreview result={{ id: "a2", kind: "code", title: "Code" }} />)

		expect(screen.getByText("Fetched Code")).toBeInTheDocument()
		expect(screen.getByTestId("code-editor")).toHaveAttribute(
			"data-content",
			"console.log('hi')",
		)
	})

	it("renders image preview content", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a3",
					title: "Fetched Image",
					kind: "image",
					content: "https://image.example/a3.png",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		render(<ArtifactPreview result={{ id: "a3", kind: "image", title: "Image" }} />)

		expect(screen.getByTestId("image-editor")).toHaveAttribute(
			"data-content",
			"https://image.example/a3.png",
		)
		expect(screen.getByTestId("image-editor")).toHaveAttribute("data-inline", "true")
	})

	it("renders sheet preview content", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a4",
					title: "Fetched Sheet",
					kind: "sheet",
					content: "col1,col2",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		render(<ArtifactPreview result={{ id: "a4", kind: "sheet", title: "Sheet" }} />)

		expect(screen.getByTestId("sheet-editor")).toHaveAttribute("data-content", "col1,col2")
	})

	it("shows loading skeleton while versions are loading", () => {
		testState.useSWR.mockReturnValue({
			data: undefined,
			isLoading: true,
		})

		render(<ArtifactPreview result={{ id: "a5", kind: "image", title: "Loading" }} />)

		expect(screen.getByLabelText("Loading artifact preview")).toBeInTheDocument()
	})

	it("shows fallback skeleton when no content can be resolved", () => {
		testState.useSWR.mockReturnValue({
			data: undefined,
			isLoading: false,
		})

		render(
			<ArtifactPreview
				result={{
					error: "tool failure",
					kind: "text",
					title: "Broken artifact",
				}}
			/>,
		)

		expect(screen.getByLabelText("Loading artifact preview")).toBeInTheDocument()
	})

	it("uses streaming store content when API versions are unavailable", () => {
		setSelectorState({
			status: "streaming",
			content: "Live stream content",
			title: "Live Title",
			kind: "text",
		})

		testState.useSWR.mockReturnValue({
			data: undefined,
			isLoading: false,
		})

		render(<ArtifactPreview args={{ id: "stream-1" }} />)

		expect(screen.getByText("Live Title")).toBeInTheDocument()
		expect(screen.getByTestId("text-editor")).toHaveAttribute(
			"data-content",
			"Live stream content",
		)
	})

	it("renders compact result card when artifact panel is already visible", () => {
		setSelectorState({ isVisible: true, status: "idle" })

		render(<ArtifactPreview result={{ id: "a6", kind: "code", title: "Compiled" }} />)

		const button = screen.getByRole("button", { name: /created/i })
		expect(button).toHaveTextContent("Compiled")

		const rectSpy = vi
			.spyOn(button, "getBoundingClientRect")
			.mockReturnValue(makeRect(10, 20, 90, 40))

		fireEvent.click(button)
		expect(testState.setArtifact).toHaveBeenCalledTimes(1)

		const updater = testState.setArtifact.mock.calls[0]?.[0] as (
			prev: StoreArtifact,
		) => StoreArtifact
		const updated = updater(makePrevArtifact({ status: "idle" }))
		expect(updated.artifactId).toBe("a6")
		expect(updated.kind).toBe("code")
		expect(updated.title).toBe("Compiled")
		expect(updated.isVisible).toBe(true)
		expect(updated.boundingBox).toEqual({
			left: 10,
			top: 20,
			width: 90,
			height: 40,
		})

		rectSpy.mockRestore()
	})

	it("renders compact call card and ignores click when artifact id is missing", () => {
		setSelectorState({ isVisible: true, status: "idle" })

		render(<ArtifactPreview args={{ kind: "sheet", title: "Queued" }} />)

		const button = screen.getByRole("button", { name: /creating/i })
		fireEvent.click(button)

		expect(testState.setArtifact).not.toHaveBeenCalled()
	})

	it("applies hitbox click updater for idle artifacts", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a7",
					title: "Clickable",
					kind: "text",
					content: "clickable content",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		render(<ArtifactPreview result={{ id: "a7", kind: "text", title: "Fallback" }} />)

		const button = screen.getByRole("button", { name: /open artifact: clickable/i })
		const rectSpy = vi
			.spyOn(button, "getBoundingClientRect")
			.mockReturnValue(makeRect(12, 34, 200, 75))

		testState.setArtifact.mockClear()
		fireEvent.click(button)

		expect(testState.setArtifact).toHaveBeenCalledTimes(1)
		const updater = testState.setArtifact.mock.calls[0]?.[0] as (
			prev: StoreArtifact,
		) => StoreArtifact
		const updated = updater(makePrevArtifact({ status: "idle" }))

		expect(updated.artifactId).toBe("a7")
		expect(updated.title).toBe("Clickable")
		expect(updated.kind).toBe("text")
		expect(updated.isVisible).toBe(true)
		expect(updated.boundingBox).toEqual({
			left: 12,
			top: 34,
			width: 200,
			height: 75,
		})

		rectSpy.mockRestore()
	})

	it("keeps existing streaming artifact fields on hitbox click", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a8",
					title: "Streaming Click",
					kind: "text",
					content: "streaming content",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		render(<ArtifactPreview result={{ id: "a8", kind: "text", title: "Streaming" }} />)

		const button = screen.getByRole("button", { name: /open artifact: streaming click/i })
		testState.setArtifact.mockClear()
		fireEvent.click(button)

		const updater = testState.setArtifact.mock.calls[0]?.[0] as (
			prev: StoreArtifact,
		) => StoreArtifact
		const updated = updater(
			makePrevArtifact({
				artifactId: "old-id",
				content: "still-streaming",
				kind: "image",
				status: "streaming",
				title: "Old",
			}),
		)

		expect(updated.artifactId).toBe("old-id")
		expect(updated.title).toBe("Old")
		expect(updated.kind).toBe("image")
		expect(updated.content).toBe("still-streaming")
		expect(updated.isVisible).toBe(true)
	})

	it("updates bounding box in effect when artifact id is present", () => {
		testState.useSWR.mockReturnValue({
			data: [
				{
					id: "a9",
					title: "Bounds",
					kind: "text",
					content: "bounds content",
					createdAt: new Date().toISOString(),
				},
			],
			isLoading: false,
		})

		const rectSpy = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockReturnValue(makeRect(1, 2, 3, 4))

		render(<ArtifactPreview result={{ id: "a9", kind: "text", title: "Bounds" }} />)

		expect(testState.setArtifact).toHaveBeenCalled()
		const updater = testState.setArtifact.mock.calls[0]?.[0] as (
			prev: StoreArtifact,
		) => StoreArtifact
		const updated = updater(makePrevArtifact())

		expect(updated.boundingBox).toEqual({
			left: 1,
			top: 2,
			width: 3,
			height: 4,
		})

		rectSpy.mockRestore()
	})

	it("uses artifact fetcher for success and failed responses", async () => {
		testState.useSWR.mockReturnValue({
			data: undefined,
			isLoading: true,
		})

		render(<ArtifactPreview result={{ id: "fetch-1", kind: "text", title: "Fetcher" }} />)

		if (!testState.swrFetcher) {
			throw new Error("Expected SWR fetcher to be captured")
		}

		const fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)

		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: vi.fn().mockResolvedValue([
				{
					id: "fetch-1",
					title: "Fetched",
					kind: "text",
					content: "ok",
					createdAt: new Date().toISOString(),
				},
			]),
		})

		await expect(testState.swrFetcher("/api/artifact?id=fetch-1")).resolves.toEqual([
			{
				id: "fetch-1",
				title: "Fetched",
				kind: "text",
				content: "ok",
				createdAt: expect.any(String),
			},
		])

		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 503,
			json: vi.fn(),
		})

		await expect(testState.swrFetcher("/api/artifact?id=fetch-1")).rejects.toThrow(
			"Artifact fetch failed: 503",
		)
	})
})

describe("suggestions-extension.tsx deep coverage", () => {
	it("projects positions and falls back to zero range when text is missing", () => {
		const doc = makeDoc([{ text: "hello world", pos: 0 }])

		const projected = projectWithPositions(
			doc as unknown as Parameters<typeof projectWithPositions>[0],
			[
				{
					originalText: "world",
					suggestedText: "earth",
					description: "Replace world with earth",
				},
				{
					originalText: "missing",
					suggestedText: "found",
					description: "Fallback path",
				},
			],
		)

		expect(projected).toHaveLength(2)
		expect(projected[0]).toMatchObject({
			id: "suggestion-0",
			selectionStart: 6,
			selectionEnd: 11,
		})
		expect(projected[1]).toMatchObject({
			id: "suggestion-1",
			selectionStart: 0,
			selectionEnd: 0,
		})
	})

	it("skips decoration creation when suggestion has no selected range", () => {
		const zeroRangeSuggestion: UISuggestion = {
			id: "suggestion-0",
			originalText: "none",
			suggestedText: "none",
			description: "No range",
			selectionStart: 0,
			selectionEnd: 0,
		}

		const decorations = createDecorations([zeroRangeSuggestion], {
			state: { doc: makeDoc([{ text: "hello", pos: 0 }]) },
		} as Parameters<typeof createDecorations>[1])

		expect(decorations.find()).toHaveLength(0)
	})

	it("creates both highlight and widget decorations", () => {
		const suggestion: UISuggestion = {
			id: "suggestion-0",
			originalText: "world",
			suggestedText: "earth",
			description: "Replace world",
			selectionStart: 6,
			selectionEnd: 11,
		}

		const decorations = createDecorations([suggestion], {
			state: { doc: makeDoc([{ text: "hello world", pos: 0 }]) },
		} as Parameters<typeof createDecorations>[1])

		const records = decorations.find() as MockDecorationRecord[]
		expect(records).toHaveLength(2)
		expect(records[0]).toMatchObject({
			kind: "inline",
			from: 6,
			to: 11,
			spec: {
				suggestionId: "suggestion-0",
				type: "highlight",
			},
		})
		expect(records[1]).toMatchObject({
			kind: "widget",
			position: 6,
			spec: {
				suggestionId: "suggestion-0",
				type: "widget",
			},
		})
	})

	it("initializes suggestions plugin and applies transaction state", () => {
		const extension = SuggestionsExtension as unknown as {
			name: string
			addProseMirrorPlugins: () => PluginLike[]
		}

		expect(extension.name).toBe("suggestions")
		expect((suggestionsPluginKey as unknown as { key: string }).key).toBe("suggestions")

		const [plugin] = extension.addProseMirrorPlugins()
		if (!plugin) {
			throw new Error("Expected suggestions plugin")
		}

		const initialState = plugin.spec.state.init() as {
			decorations: { map: (mapping: unknown, doc: unknown) => unknown }
			selected: unknown
		}
		expect(initialState).toEqual({
			decorations: pmViewMocks.DecorationSet.empty,
			selected: null,
		})

		const metaState = { decorations: pmViewMocks.DecorationSet.empty, selected: "selected" }
		const withMeta = plugin.spec.state.apply(
			{
				getMeta: vi.fn().mockReturnValue(metaState),
				mapping: {},
				doc: {},
			},
			initialState,
		)
		expect(withMeta).toBe(metaState)

		const mapDecorations = vi.fn().mockReturnValue("mapped-decorations")
		const withoutMeta = plugin.spec.state.apply(
			{
				getMeta: vi.fn().mockReturnValue(undefined),
				mapping: { source: "mapping" },
				doc: { source: "doc" },
			},
			{
				decorations: { map: mapDecorations },
				selected: "kept-selection",
			},
		) as { decorations: unknown; selected: unknown }

		expect(mapDecorations).toHaveBeenCalledWith({ source: "mapping" }, { source: "doc" })
		expect(withoutMeta).toEqual({
			decorations: "mapped-decorations",
			selected: "kept-selection",
		})

		const fromState = plugin.spec.props.decorations.call(plugin, {
			pluginState: { decorations: pmViewMocks.DecorationSet.empty },
		})
		expect(fromState).toBe(pmViewMocks.DecorationSet.empty)

		const fallback = plugin.spec.props.decorations.call(plugin, {})
		expect(fallback).toBe(pmViewMocks.DecorationSet.empty)
	})

	it("applies suggestion replacement and clears suggestion decorations", async () => {
		const suggestion: UISuggestion = {
			id: "suggestion-0",
			originalText: "world",
			suggestedText: "earth",
			description: "Replace world",
			selectionStart: 6,
			selectionEnd: 11,
		}

		const decorations = createDecorations([suggestion], {
			state: { doc: makeDoc([{ text: "hello world", pos: 0 }]) },
		} as Parameters<typeof createDecorations>[1])
		const records = decorations.find() as MockDecorationRecord[]
		const widget = getWidgetDecoration(records)

		const replaceTransaction = {
			setMeta: vi.fn(function withNoDebounce(
				this: { setMeta: unknown },
				_key: string,
				_value: true,
			) {
				return this
			}),
		}

		const transaction = {
			setMeta: vi.fn(function withPluginMeta(
				this: { setMeta: unknown; replaceWith: unknown },
				_key: unknown,
				_value: unknown,
			) {
				return this
			}),
			replaceWith: vi.fn(
				(_start: number, _end: number, _textNode: unknown) => replaceTransaction,
			),
		}

		const view = {
			state: {
				doc: makeDoc([{ text: "hello world", pos: 0 }]),
				schema: {
					text: (value: string) => ({ text: value, type: "text" }),
				},
				tr: transaction,
				pluginState: {
					decorations,
					selected: suggestion.id,
				},
			},
			dispatch: vi.fn(),
			dom: {
				blur: vi.fn(),
			},
		}

		const widgetDom = widget.toDOM?.(view)
		if (!widgetDom) {
			throw new Error("Expected widget DOM")
		}

		document.body.appendChild(widgetDom)

		const applyButton = await within(widgetDom).findByRole("button", { name: /apply/i })

		fireEvent.click(applyButton)

		expect(transaction.setMeta).toHaveBeenCalledTimes(1)
		const metaState = transaction.setMeta.mock.calls[0]?.[1] as {
			decorations: { find: () => MockDecorationRecord[] }
			selected: null
		}
		expect(metaState.selected).toBeNull()
		expect(metaState.decorations.find()).toHaveLength(0)

		expect(transaction.replaceWith).toHaveBeenCalledWith(6, 11, { text: "earth", type: "text" })
		expect(replaceTransaction.setMeta).toHaveBeenCalledWith("no-debounce", true)
		expect(view.dispatch).toHaveBeenCalledTimes(2)
		expect(view.dispatch.mock.calls[0]?.[0]).toBe(transaction)
		expect(view.dispatch.mock.calls[1]?.[0]).toBe(replaceTransaction)
	})

	it("dismisses suggestion and handles mousedown + widget destroy", async () => {
		const suggestion: UISuggestion = {
			id: "suggestion-dismiss",
			originalText: "alpha",
			suggestedText: "beta",
			description: "Dismiss this",
			selectionStart: 1,
			selectionEnd: 6,
		}

		const decorations = createDecorations([suggestion], {
			state: { doc: makeDoc([{ text: " alpha ", pos: 0 }]) },
		} as Parameters<typeof createDecorations>[1])
		const records = decorations.find() as MockDecorationRecord[]
		const widget = getWidgetDecoration(records)

		const transaction = {
			setMeta: vi.fn(function withPluginMeta(this: { setMeta: unknown }) {
				return this
			}),
			replaceWith: vi.fn(),
		}

		const view = {
			state: {
				doc: makeDoc([{ text: " alpha ", pos: 0 }]),
				schema: {
					text: (value: string) => ({ text: value, type: "text" }),
				},
				tr: transaction,
				pluginState: {
					decorations,
					selected: suggestion.id,
				},
			},
			dispatch: vi.fn(),
			dom: {
				blur: vi.fn(),
			},
		}

		const widgetDom = widget.toDOM?.(view)
		if (!widgetDom) {
			throw new Error("Expected widget DOM")
		}

		document.body.appendChild(widgetDom)

		const mouseDownEvent = new MouseEvent("mousedown", {
			bubbles: true,
			cancelable: true,
		})
		widgetDom.dispatchEvent(mouseDownEvent)
		expect(mouseDownEvent.defaultPrevented).toBe(true)
		expect(view.dom.blur).toHaveBeenCalledTimes(1)

		const dismissButton = await within(widgetDom).findByTitle("Dismiss suggestion")

		fireEvent.click(dismissButton)
		expect(transaction.setMeta).toHaveBeenCalledTimes(1)
		expect(view.dispatch).toHaveBeenCalledTimes(1)

		const destroy = widget.spec.destroy as ((node: Node) => void) | undefined
		if (!destroy) {
			throw new Error("Expected widget destroy handler")
		}

		vi.useFakeTimers()
		try {
			act(() => {
				destroy(widgetDom)
				vi.runAllTimers()
			})
		} finally {
			vi.useRealTimers()
		}
	})
})
