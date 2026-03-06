// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { Position } from "@xyflow/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

type MockElementProps = {
	children?: React.ReactNode
	[key: string]: unknown
}

vi.mock("motion/react", () => ({
	motion: {
		create:
			(tag: string) =>
			({ children, ...props }: MockElementProps) =>
				React.createElement(tag, props, children),
	},
}))

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get: (_target, tag) => {
				const element = typeof tag === "string" ? tag : "div"
				return ({ children, ...props }: MockElementProps) =>
					React.createElement(element, props, children)
			},
		},
	),
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}))

vi.mock("@xyflow/react", () => ({
	Handle: ({
		position,
		type,
		children,
		...props
	}: MockElementProps & { position?: string; type?: string }) =>
		React.createElement(
			"div",
			{
				"data-position": position,
				"data-testid": "xy-handle",
				"data-type": type,
				...props,
			},
			children,
		),
	NodeToolbar: ({
		position,
		nodeId: _nodeId,
		children,
		...props
	}: MockElementProps & { position?: string; nodeId?: string }) =>
		React.createElement(
			"div",
			{
				"data-position": position,
				"data-testid": "xy-node-toolbar",
				...props,
			},
			children,
		),
	Panel: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", { "data-testid": "xy-panel", ...props }, children),
	Position: {
		Top: "top",
		Bottom: "bottom",
		Left: "left",
		Right: "right",
	},
}))

vi.mock("xterm", () => ({
	Terminal: class {
		open() {
			return undefined
		}

		write() {
			return undefined
		}

		dispose() {
			return undefined
		}
	},
}))

vi.mock("@xterm/xterm", () => ({
	Terminal: class {
		open() {
			return undefined
		}

		write() {
			return undefined
		}

		dispose() {
			return undefined
		}
	},
}))

vi.mock("streamdown", () => ({
	Streamdown: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
}))

vi.mock("@streamdown/cjk", () => ({ cjk: {} }))
vi.mock("@streamdown/code", () => ({ code: {} }))
vi.mock("@streamdown/math", () => ({ math: {} }))
vi.mock("@streamdown/mermaid", () => ({ mermaid: {} }))

vi.mock("ansi-to-react", () => ({
	default: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}))

vi.mock("@/components/ai-elements/code-block", () => ({
	CodeBlock: ({ code, language }: { code: string; language: string }) =>
		React.createElement(
			"pre",
			{ "data-language": language, "data-testid": "code-block" },
			code,
		),
}))

vi.mock("@/components/ai-elements/shimmer", () => ({
	Shimmer: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("span", { "data-testid": "shimmer" }, children),
}))

if (typeof globalThis.ResizeObserver === "undefined") {
	class ResizeObserver {
		observe() {
			return undefined
		}

		unobserve() {
			return undefined
		}

		disconnect() {
			return undefined
		}
	}

	Object.defineProperty(globalThis, "ResizeObserver", {
		writable: true,
		value: ResizeObserver,
	})
}

let clipboardWriteTextMock: ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.clearAllMocks()
	vi.useRealTimers()

	clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: {
			writeText: clipboardWriteTextMock,
		},
	})
})

import { Node, NodeContent, NodeFooter, NodeHeader, NodeTitle } from "@/components/ai-elements/node"
import { Panel } from "@/components/ai-elements/panel"
import {
	Plan,
	PlanAction,
	PlanContent,
	PlanDescription,
	PlanHeader,
	PlanTitle,
	PlanTrigger,
} from "@/components/ai-elements/plan"
import {
	Queue,
	QueueItemContent,
	QueueItemDescription,
	QueueItemIndicator,
	QueueList,
	QueueSection,
	QueueSectionContent,
	QueueSectionLabel,
	QueueSectionTrigger,
} from "@/components/ai-elements/queue"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Sandbox, SandboxContent, SandboxHeader } from "@/components/ai-elements/sandbox"
import {
	SchemaDisplay,
	SchemaDisplayParameter,
	SchemaDisplayProperty,
} from "@/components/ai-elements/schema-display"
import { Snippet, SnippetCopyButton, SnippetInput } from "@/components/ai-elements/snippet"
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources"
import {
	StackTrace,
	StackTraceActions,
	StackTraceContent,
	StackTraceCopyButton,
	StackTraceError,
	StackTraceErrorMessage,
	StackTraceErrorType,
	StackTraceFrames,
	StackTraceHeader,
} from "@/components/ai-elements/stack-trace"
import { Suggestion } from "@/components/ai-elements/suggestion"
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ai-elements/task"
import {
	Terminal,
	TerminalClearButton,
	TerminalCopyButton,
	TerminalHeader,
} from "@/components/ai-elements/terminal"
import { Tool, ToolHeader, ToolOutput } from "@/components/ai-elements/tool"
import { Toolbar } from "@/components/ai-elements/toolbar"
import {
	WebPreview,
	WebPreviewBody,
	WebPreviewConsole,
	WebPreviewNavigation,
	WebPreviewUrl,
} from "@/components/ai-elements/web-preview"

describe("Node deep coverage", () => {
	it("renders source and target handles based on props", () => {
		const { container } = render(
			<Node handles={{ source: true, target: true }}>
				<NodeHeader>
					<NodeTitle>Node</NodeTitle>
				</NodeHeader>
				<NodeContent>Body</NodeContent>
				<NodeFooter>Footer</NodeFooter>
			</Node>,
		)

		const handles = screen.getAllByTestId("xy-handle")
		expect(handles).toHaveLength(2)
		expect(container.querySelector('[data-type="target"][data-position="left"]')).not.toBeNull()
		expect(
			container.querySelector('[data-type="source"][data-position="right"]'),
		).not.toBeNull()
	})

	it("omits handles when both source and target are disabled", () => {
		render(<Node handles={{ source: false, target: false }}>No handles</Node>)

		expect(screen.queryByTestId("xy-handle")).toBeNull()
	})
})

describe("Panel deep coverage", () => {
	it("applies base and custom classes while forwarding props", () => {
		render(
			<Panel className="custom-panel" id="panel-root" position="top-left">
				Panel body
			</Panel>,
		)

		const panel = screen.getByTestId("xy-panel")
		expect(panel.className).toContain("m-4")
		expect(panel.className).toContain("custom-panel")
		expect(panel.getAttribute("id")).toBe("panel-root")
		expect(panel.textContent).toContain("Panel body")
	})
})

describe("Plan deep coverage", () => {
	it("throws when title is rendered outside Plan context", () => {
		expect(() => render(<PlanTitle>Outside</PlanTitle>)).toThrow(
			"Plan components must be used within Plan",
		)
	})

	it("wraps title and description with shimmer when streaming", () => {
		render(
			<Plan isStreaming open>
				<PlanHeader>
					<div>
						<PlanTitle>Streaming title</PlanTitle>
						<PlanDescription>Streaming description</PlanDescription>
					</div>
				</PlanHeader>
			</Plan>,
		)

		expect(screen.getAllByTestId("shimmer")).toHaveLength(2)
	})

	it("toggles content visibility with PlanTrigger", () => {
		render(
			<Plan defaultOpen={false}>
				<PlanHeader>
					<div>
						<PlanTitle>Toggle me</PlanTitle>
						<PlanDescription>Desc</PlanDescription>
					</div>
					<PlanAction>
						<PlanTrigger />
					</PlanAction>
				</PlanHeader>
				<PlanContent>Plan body</PlanContent>
			</Plan>,
		)

		expect(screen.queryByText("Plan body")).toBeNull()
		fireEvent.click(screen.getByRole("button", { name: /toggle plan/i }))
		expect(screen.getByText("Plan body")).toBeTruthy()
	})
})

describe("Queue deep coverage", () => {
	it("applies completed styles to indicator, content, and description", () => {
		render(
			<div>
				<QueueItemIndicator data-testid="pending-indicator" />
				<QueueItemIndicator completed data-testid="completed-indicator" />
				<QueueItemContent data-testid="pending-content">Pending</QueueItemContent>
				<QueueItemContent completed data-testid="completed-content">
					Done
				</QueueItemContent>
				<QueueItemDescription data-testid="pending-description">
					Pending description
				</QueueItemDescription>
				<QueueItemDescription completed data-testid="completed-description">
					Done description
				</QueueItemDescription>
			</div>,
		)

		expect(screen.getByTestId("pending-indicator").className).toContain(
			"border-muted-foreground/50",
		)
		expect(screen.getByTestId("completed-indicator").className).toContain(
			"bg-muted-foreground/10",
		)
		expect(screen.getByTestId("pending-content").className).toContain("text-muted-foreground")
		expect(screen.getByTestId("completed-content").className).toContain("line-through")
		expect(screen.getByTestId("completed-description").className).toContain(
			"text-muted-foreground/40",
		)
	})

	it("toggles section content from trigger interaction", () => {
		render(
			<Queue>
				<QueueSection defaultOpen={false}>
					<QueueSectionTrigger>
						<QueueSectionLabel count={1} label="task" />
					</QueueSectionTrigger>
					<QueueSectionContent>
						<QueueList>Queue entry</QueueList>
					</QueueSectionContent>
				</QueueSection>
			</Queue>,
		)

		expect(screen.queryByText("Queue entry")).toBeNull()
		fireEvent.click(screen.getByRole("button"))
		expect(screen.getByText("Queue entry")).toBeTruthy()
	})

	it("renders section label count and optional icon", () => {
		render(
			<QueueSectionLabel
				count={2}
				icon={<span data-testid="queue-icon">I</span>}
				label="jobs"
			/>,
		)

		expect(screen.getByText("2 jobs")).toBeTruthy()
		expect(screen.getByTestId("queue-icon")).toBeTruthy()
	})
})

describe("Reasoning deep coverage", () => {
	it("renders default thinking message when duration is undefined", () => {
		render(
			<Reasoning defaultOpen>
				<ReasoningTrigger />
			</Reasoning>,
		)

		expect(screen.getByText("Thought for a few seconds")).toBeTruthy()
	})

	it("renders duration-based message when duration is provided", () => {
		render(
			<Reasoning defaultOpen duration={4}>
				<ReasoningTrigger />
			</Reasoning>,
		)

		expect(screen.getByText("Thought for 4 seconds")).toBeTruthy()
	})

	it("treats zero duration as active thinking state", () => {
		render(
			<Reasoning defaultOpen duration={0}>
				<ReasoningTrigger />
			</Reasoning>,
		)

		expect(screen.getByText("Thinking...")).toBeTruthy()
	})

	it("auto-opens on stream start and auto-closes after stream ends", async () => {
		vi.useFakeTimers()

		const { rerender } = render(
			<Reasoning isStreaming={false}>
				<ReasoningTrigger />
				<ReasoningContent>Reasoning steps</ReasoningContent>
			</Reasoning>,
		)

		expect(screen.queryByText("Reasoning steps")).toBeNull()

		await act(async () => {
			rerender(
				<Reasoning isStreaming>
					<ReasoningTrigger />
					<ReasoningContent>Reasoning steps</ReasoningContent>
				</Reasoning>,
			)
		})

		expect(screen.getByText("Reasoning steps")).toBeTruthy()

		await act(async () => {
			rerender(
				<Reasoning isStreaming={false}>
					<ReasoningTrigger />
					<ReasoningContent>Reasoning steps</ReasoningContent>
				</Reasoning>,
			)
		})

		expect(screen.getByText("Reasoning steps")).toBeTruthy()

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(screen.queryByText("Reasoning steps")).toBeNull()
	})

	it("does not auto-open when explicitly default-closed", async () => {
		const { rerender } = render(
			<Reasoning defaultOpen={false} isStreaming={false}>
				<ReasoningTrigger />
				<ReasoningContent>Locked content</ReasoningContent>
			</Reasoning>,
		)

		await act(async () => {
			rerender(
				<Reasoning defaultOpen={false} isStreaming>
					<ReasoningTrigger />
					<ReasoningContent>Locked content</ReasoningContent>
				</Reasoning>,
			)
		})

		expect(screen.queryByText("Locked content")).toBeNull()
	})
})

describe("Sandbox deep coverage", () => {
	it("renders status badge from tool state in header", () => {
		render(
			<Sandbox defaultOpen>
				<SandboxHeader state="output-error" title="Runner" />
				<SandboxContent>Output</SandboxContent>
			</Sandbox>,
		)

		expect(screen.getByText("Runner")).toBeTruthy()
		expect(screen.getByText("Error")).toBeTruthy()
	})

	it("toggles sandbox content through header interaction", () => {
		render(
			<Sandbox defaultOpen>
				<SandboxHeader state="output-available" title="Tabs" />
				<SandboxContent>console.log(1)</SandboxContent>
			</Sandbox>,
		)

		expect(screen.getByText("console.log(1)")).toBeTruthy()

		const headerButton = screen.getAllByRole("button")[0]
		if (!headerButton) {
			throw new Error("Expected sandbox header button")
		}

		fireEvent.click(headerButton)

		expect(screen.queryByText("console.log(1)")).toBeNull()
	})
})

describe("SchemaDisplay deep coverage", () => {
	it("renders default sections conditionally from provided data", () => {
		render(
			<SchemaDisplay
				description="Create user"
				method="POST"
				parameters={[
					{
						name: "id",
						type: "string",
						location: "path",
						required: true,
						description: "User id",
					},
				]}
				path="/api/users/{id}"
			/>,
		)

		expect(screen.getByText("POST")).toBeTruthy()
		expect(screen.getByText("Parameters")).toBeTruthy()
		expect(screen.queryByText("Request Body")).toBeNull()
		expect(screen.queryByText("Response")).toBeNull()
		expect(screen.getByText("{id}")).toBeTruthy()
		expect(screen.getByText("required")).toBeTruthy()
		expect(screen.getByText("path")).toBeTruthy()
	})

	it("uses custom children instead of default generated layout", () => {
		render(
			<SchemaDisplay
				method="GET"
				parameters={[{ name: "q", type: "string" }]}
				path="/api/search"
			>
				<div>Custom schema</div>
			</SchemaDisplay>,
		)

		expect(screen.getByText("Custom schema")).toBeTruthy()
		expect(screen.queryByText("Parameters")).toBeNull()
	})

	it("renders nested and array properties for schema bodies", () => {
		render(
			<SchemaDisplayProperty
				name="payload"
				type="object"
				properties={[
					{
						name: "title",
						type: "string",
						required: true,
					},
				]}
				items={{
					name: "item",
					type: "number",
				}}
			/>,
		)

		expect(screen.getByText("payload")).toBeTruthy()
		expect(screen.getByText("title")).toBeTruthy()
		expect(screen.getByText("payload[]")).toBeTruthy()
	})

	it("renders optional badges and description for parameters", () => {
		render(
			<SchemaDisplayParameter
				description="Tenant identifier"
				location="header"
				name="x-tenant"
				required
				type="string"
			/>,
		)

		expect(screen.getByText("x-tenant")).toBeTruthy()
		expect(screen.getByText("header")).toBeTruthy()
		expect(screen.getByText("required")).toBeTruthy()
		expect(screen.getByText("Tenant identifier")).toBeTruthy()
	})
})

describe("Snippet deep coverage", () => {
	it("reads snippet code from context into the input", () => {
		render(
			<Snippet code="pnpm test:unit">
				<SnippetInput aria-label="snippet input" />
			</Snippet>,
		)

		const input = screen.getByLabelText("snippet input") as HTMLInputElement
		expect(input.value).toBe("pnpm test:unit")
		expect(input.readOnly).toBe(true)
	})

	it("copies once while copied state is active, then allows copy after timeout", async () => {
		vi.useFakeTimers()

		render(
			<Snippet code="echo hello">
				<SnippetCopyButton />
			</Snippet>,
		)

		const copyButton = screen.getByRole("button", { name: /copy/i })

		await act(async () => {
			fireEvent.click(copyButton)
		})

		await act(async () => {
			fireEvent.click(copyButton)
		})

		expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1)
		expect(clipboardWriteTextMock).toHaveBeenCalledWith("echo hello")

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		await act(async () => {
			fireEvent.click(copyButton)
		})

		expect(clipboardWriteTextMock).toHaveBeenCalledTimes(2)
	})

	it("calls onError when clipboard API is unavailable", async () => {
		const onError = vi.fn()

		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: undefined,
		})

		render(
			<Snippet code="echo fail">
				<SnippetCopyButton onError={onError} />
			</Snippet>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /copy/i }))
		})

		expect(onError).toHaveBeenCalledTimes(1)
	})
})

describe("Sources deep coverage", () => {
	it("renders default trigger text with source count", () => {
		render(
			<Sources>
				<SourcesTrigger count={3} />
			</Sources>,
		)

		expect(screen.getByText("Used 3 sources")).toBeTruthy()
	})

	it("uses custom children for trigger and source link", () => {
		render(
			<Sources>
				<SourcesTrigger count={1}>Open references</SourcesTrigger>
				<SourcesContent>
					<Source href="https://example.com" title="Example title">
						Custom source row
					</Source>
				</SourcesContent>
			</Sources>,
		)

		expect(screen.getByText("Open references")).toBeTruthy()
		expect(screen.queryByText("Used 1 sources")).toBeNull()

		fireEvent.click(screen.getByRole("button", { name: "Open references" }))

		expect(screen.getByText("Custom source row")).toBeTruthy()
		const link = screen.getByRole("link")
		expect(link.getAttribute("target")).toBe("_blank")
		expect(link.getAttribute("rel")).toContain("noreferrer")
	})
})

describe("StackTrace deep coverage", () => {
	it("parses stack frames, filters internal frames, and forwards file click details", () => {
		const onFilePathClick = vi.fn()
		const trace = [
			"TypeError: boom",
			"at doWork (/app/main.ts:12:8)",
			"at runInternal (node:internal/process/task_queues:95:5)",
		].join("\n")

		render(
			<StackTrace defaultOpen onFilePathClick={onFilePathClick} trace={trace}>
				<StackTraceHeader>
					<StackTraceError>
						<StackTraceErrorType />
						<StackTraceErrorMessage />
					</StackTraceError>
					<StackTraceActions />
				</StackTraceHeader>
				<StackTraceContent>
					<StackTraceFrames showInternalFrames={false} />
				</StackTraceContent>
			</StackTrace>,
		)

		expect(screen.getByText("TypeError")).toBeTruthy()
		expect(screen.getByText("boom")).toBeTruthy()
		expect(screen.queryByText(/node:internal/)).toBeNull()

		const fileButton = screen.getByRole("button", {
			name: "/app/main.ts:12:8",
		})
		fireEvent.click(fileButton)

		expect(onFilePathClick).toHaveBeenCalledWith("/app/main.ts", 12, 8)
	})

	it("copies raw trace through StackTraceCopyButton", async () => {
		const trace = "Error: copy me"
		const onCopy = vi.fn()

		render(
			<StackTrace defaultOpen trace={trace}>
				<StackTraceHeader>
					<StackTraceError>
						<StackTraceErrorMessage />
					</StackTraceError>
					<StackTraceActions>
						<StackTraceCopyButton onCopy={onCopy} />
					</StackTraceActions>
				</StackTraceHeader>
			</StackTrace>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole("button"))
		})

		expect(clipboardWriteTextMock).toHaveBeenCalledWith(trace)
		expect(onCopy).toHaveBeenCalledTimes(1)
	})

	it("shows fallback text for unparseable frames and empty frame states", () => {
		const { rerender } = render(
			<StackTrace defaultOpen trace={"Error: unknown\nat mystery frame"}>
				<StackTraceContent>
					<StackTraceFrames />
				</StackTraceContent>
			</StackTrace>,
		)

		expect(screen.getByText("mystery frame")).toBeTruthy()

		rerender(
			<StackTrace defaultOpen trace="Error: no frames">
				<StackTraceContent>
					<StackTraceFrames />
				</StackTraceContent>
			</StackTrace>,
		)

		expect(screen.getByText("No stack frames")).toBeTruthy()
	})
})

describe("Suggestion deep coverage", () => {
	it("passes suggestion text to onClick callback", () => {
		const onClick = vi.fn()

		render(<Suggestion onClick={onClick} suggestion="Try this" />)

		fireEvent.click(screen.getByRole("button", { name: "Try this" }))
		expect(onClick).toHaveBeenCalledWith("Try this")
	})

	it("renders custom children instead of fallback suggestion text", () => {
		render(<Suggestion suggestion="Hidden suggestion">Custom label</Suggestion>)

		expect(screen.getByText("Custom label")).toBeTruthy()
		expect(screen.queryByText("Hidden suggestion")).toBeNull()
	})
})

describe("Task deep coverage", () => {
	it("is open by default and shows content immediately", () => {
		render(
			<Task>
				<TaskTrigger title="Inspect task" />
				<TaskContent>
					<TaskItem>Initial content</TaskItem>
				</TaskContent>
			</Task>,
		)

		expect(screen.getByText("Initial content")).toBeTruthy()
	})

	it("opens content when trigger is clicked from closed state", () => {
		render(
			<Task defaultOpen={false}>
				<TaskTrigger title="Open task" />
				<TaskContent>
					<TaskItem>Hidden item</TaskItem>
				</TaskContent>
			</Task>,
		)

		expect(screen.queryByText("Hidden item")).toBeNull()
		fireEvent.click(screen.getByText("Open task"))
		expect(screen.getByText("Hidden item")).toBeTruthy()
	})

	it("supports custom trigger children", () => {
		render(
			<Task>
				<TaskTrigger title="Unused title">
					<button type="button">Custom trigger</button>
				</TaskTrigger>
			</Task>,
		)

		expect(screen.getByRole("button", { name: "Custom trigger" })).toBeTruthy()
		expect(screen.queryByText("Unused title")).toBeNull()
	})
})

describe("Terminal deep coverage", () => {
	it("renders clear action and streaming cursor when active", () => {
		const onClear = vi.fn()

		render(<Terminal isStreaming onClear={onClear} output="$ echo hi\nhi" />)

		const buttons = screen.getAllByRole("button")
		expect(buttons).toHaveLength(2)

		const clearButton = buttons[1]
		if (!clearButton) {
			throw new Error("Expected clear button")
		}

		fireEvent.click(clearButton)
		expect(onClear).toHaveBeenCalledTimes(1)
		expect(document.querySelector("span.animate-pulse.bg-zinc-100")).not.toBeNull()
	})

	it("hides streaming status and clear action when not streaming and onClear is missing", () => {
		render(<Terminal isStreaming={false} output="done" />)

		expect(screen.getAllByRole("button")).toHaveLength(1)
		expect(document.querySelector("span.animate-pulse.bg-zinc-100")).toBeNull()
		expect(screen.queryByTestId("shimmer")).toBeNull()
	})

	it("copies terminal output through TerminalCopyButton", async () => {
		const onCopy = vi.fn()

		render(
			<Terminal output="build complete">
				<TerminalHeader>
					<TerminalCopyButton onCopy={onCopy} />
				</TerminalHeader>
			</Terminal>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole("button"))
		})

		expect(clipboardWriteTextMock).toHaveBeenCalledWith("build complete")
		expect(onCopy).toHaveBeenCalledTimes(1)
	})

	it("returns null for TerminalClearButton when no onClear handler exists", () => {
		render(
			<Terminal output="noop">
				<TerminalHeader>
					<TerminalClearButton />
				</TerminalHeader>
			</Terminal>,
		)

		expect(screen.queryByRole("button")).toBeNull()
	})
})

describe("Tool deep coverage", () => {
	it("derives default header titles for tool-invocation and dynamic-tool", () => {
		const { rerender } = render(
			<Tool>
				<ToolHeader state="output-available" type="tool-invocation" />
			</Tool>,
		)

		expect(screen.getByText("invocation")).toBeTruthy()
		expect(screen.getByText("Completed")).toBeTruthy()

		rerender(
			<Tool>
				<ToolHeader state="input-streaming" toolName="web-search" type="dynamic-tool" />
			</Tool>,
		)

		expect(screen.getByText("web-search")).toBeTruthy()
		expect(screen.getByText("Pending")).toBeTruthy()
	})

	it("returns null when ToolOutput has no output or error", () => {
		const noValue = undefined as unknown as never
		const { container } = render(<ToolOutput errorText={noValue} output={noValue} />)

		expect(container.firstChild).toBeNull()
	})

	it("renders result and error branches with proper headings", () => {
		const noValue = undefined as unknown as never
		const { rerender } = render(
			<ToolOutput errorText={noValue} output={{ ok: true, value: 1 } as unknown as never} />,
		)

		expect(screen.getByText("Result")).toBeTruthy()
		expect(screen.getByTestId("code-block").textContent).toContain('"ok": true')

		rerender(
			<ToolOutput
				errorText={"failed" as unknown as never}
				output={"raw error payload" as unknown as never}
			/>,
		)

		expect(screen.getByText("Error")).toBeTruthy()
		expect(screen.getByText("failed")).toBeTruthy()
	})
})

describe("Toolbar deep coverage", () => {
	it("uses Bottom position by default", () => {
		render(<Toolbar nodeId="node-1">Tools</Toolbar>)

		const toolbar = screen.getByTestId("xy-node-toolbar")
		expect(toolbar.getAttribute("data-position")).toBe("bottom")
		expect(toolbar.textContent).toContain("Tools")
	})

	it("allows explicit position override through forwarded props", () => {
		render(
			<Toolbar className="toolbar-custom" nodeId="node-2" position={Position.Top}>
				Actions
			</Toolbar>,
		)

		const toolbar = screen.getByTestId("xy-node-toolbar")
		expect(toolbar.getAttribute("data-position")).toBe("top")
		expect(toolbar.className).toContain("toolbar-custom")
	})
})

describe("WebPreview deep coverage", () => {
	it("updates URL on Enter and forwards onUrlChange callback", () => {
		const onUrlChange = vi.fn()

		render(
			<WebPreview defaultUrl="https://initial.test" onUrlChange={onUrlChange}>
				<WebPreviewNavigation>
					<WebPreviewUrl aria-label="preview url" />
				</WebPreviewNavigation>
				<WebPreviewBody data-testid="preview-frame" />
			</WebPreview>,
		)

		const input = screen.getByLabelText("preview url") as HTMLInputElement
		expect(input.value).toBe("https://initial.test")

		fireEvent.change(input, { target: { value: "https://next.test" } })
		fireEvent.keyDown(input, { key: "Enter" })

		expect(onUrlChange).toHaveBeenCalledWith("https://next.test")
		expect(screen.getByTestId("preview-frame").getAttribute("src")).toBe("https://next.test")
	})

	it("prefers explicit iframe src over context URL", () => {
		render(
			<WebPreview defaultUrl="https://context.test">
				<WebPreviewBody data-testid="preview-frame" src="https://explicit.test" />
			</WebPreview>,
		)

		expect(screen.getByTestId("preview-frame").getAttribute("src")).toBe(
			"https://explicit.test",
		)
	})

	it("renders empty console state", () => {
		render(
			<WebPreview>
				<WebPreviewConsole logs={[]} />
			</WebPreview>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Console" }))
		expect(screen.getByText("No console output")).toBeTruthy()
	})

	it("renders populated console logs with level styling", () => {
		render(
			<WebPreview>
				<WebPreviewConsole
					logs={[
						{
							level: "error",
							message: "network failed",
							timestamp: new Date("2024-01-01T00:00:00.000Z"),
						},
						{
							level: "warn",
							message: "slow response",
							timestamp: new Date("2024-01-01T00:00:01.000Z"),
						},
						{
							level: "log",
							message: "loaded",
							timestamp: new Date("2024-01-01T00:00:02.000Z"),
						},
					]}
				/>
			</WebPreview>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Console" }))

		const errorRow = screen.getByText(/network failed/)
		const warnRow = screen.getByText(/slow response/)
		const logRow = screen.getByText(/loaded/)

		expect(errorRow.className).toContain("text-destructive")
		expect(warnRow.className).toContain("text-yellow-600")
		expect(logRow.className).toContain("text-foreground")
	})
})
