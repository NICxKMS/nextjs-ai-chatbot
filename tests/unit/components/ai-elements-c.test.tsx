// @vitest-environment jsdom
import { render } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}))

type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	src: string | { src: string }
	alt: string
}

vi.mock("next/image", () => ({
	default: ({ src, alt, ...props }: MockImageProps) => {
		const resolvedSrc = typeof src === "string" ? src : src.src
		return React.createElement("img", { alt, src: resolvedSrc, ...props })
	},
}))

type MockMotionProps = React.HTMLAttributes<HTMLElement> & {
	children?: React.ReactNode
}

const motionProxy = new Proxy<Record<string, React.FC<MockMotionProps>>>(
	{},
	{
		get:
			(_target, tag) =>
			({ children, ...props }: MockMotionProps) =>
				React.createElement(String(tag), props, children),
	},
)

vi.mock("framer-motion", () => ({
	motion: motionProxy,
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
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

vi.mock("@xyflow/react", () => ({
	Position: { Bottom: "bottom" },
	NodeToolbar: ({
		children,
		nodeId: _nodeId,
		...props
	}: React.HTMLAttributes<HTMLDivElement> & { nodeId?: string }) =>
		React.createElement("div", props, children),
}))

class MockMediaRecorder {
	state: "inactive" | "recording" = "inactive"

	start = vi.fn(() => {
		this.state = "recording"
	})

	stop = vi.fn(() => {
		this.state = "inactive"
	})

	addEventListener = vi.fn()

	removeEventListener = vi.fn()

	static isTypeSupported = vi.fn().mockReturnValue(true)
}

Object.defineProperty(globalThis, "MediaRecorder", {
	writable: true,
	value: MockMediaRecorder,
})

if (typeof globalThis.ResizeObserver === "undefined") {
	class MockResizeObserver {
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
		value: MockResizeObserver,
	})
}

if (!navigator.mediaDevices) {
	Object.defineProperty(navigator, "mediaDevices", {
		configurable: true,
		value: {
			getUserMedia: vi
				.fn()
				.mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream),
		},
	})
}

if (!navigator.clipboard) {
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: {
			writeText: vi.fn().mockResolvedValue(undefined),
		},
	})
}

import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources"
import { SpeechInput } from "@/components/ai-elements/speech-input"
import {
	StackTrace,
	StackTraceActions,
	StackTraceContent,
	StackTraceError,
	StackTraceErrorMessage,
	StackTraceErrorType,
	StackTraceExpandButton,
	StackTraceFrames,
	StackTraceHeader,
} from "@/components/ai-elements/stack-trace"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import {
	Task,
	TaskContent,
	TaskItem,
	TaskItemFile,
	TaskTrigger,
} from "@/components/ai-elements/task"
import { Terminal } from "@/components/ai-elements/terminal"
import {
	Test,
	TestResults,
	TestResultsContent,
	TestSuite,
	TestSuiteContent,
	TestSuiteName,
} from "@/components/ai-elements/test-results"
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool"
import { Toolbar } from "@/components/ai-elements/toolbar"
import { Transcription } from "@/components/ai-elements/transcription"
import { VoiceSelector, VoiceSelectorTrigger } from "@/components/ai-elements/voice-selector"
import {
	WebPreview,
	WebPreviewBody,
	WebPreviewConsole,
	WebPreviewNavigation,
	WebPreviewNavigationButton,
	WebPreviewUrl,
} from "@/components/ai-elements/web-preview"

describe("ai-elements batch C smoke tests", () => {
	it("Sources renders without crashing", () => {
		const { container } = render(
			<Sources>
				<SourcesTrigger count={1} />
				<SourcesContent>
					<Source href="https://example.com" title="Example source" />
				</SourcesContent>
			</Sources>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("SpeechInput renders without crashing", () => {
		const { container } = render(
			<SpeechInput
				aria-label="Speech input"
				onAudioRecorded={async () => ""}
				onTranscriptionChange={vi.fn()}
			/>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("StackTrace renders with empty frames", () => {
		const { container } = render(
			<StackTrace trace="Error: boom">
				<StackTraceHeader>
					<StackTraceError>
						<StackTraceErrorType />
						<StackTraceErrorMessage />
					</StackTraceError>
					<StackTraceActions>
						<StackTraceExpandButton />
					</StackTraceActions>
				</StackTraceHeader>
				<StackTraceContent>
					<StackTraceFrames />
				</StackTraceContent>
			</StackTrace>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("Suggestion primitives render without crashing", () => {
		const { container } = render(
			<Suggestions>
				<Suggestion suggestion="Try another approach" />
			</Suggestions>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("Task primitives render without crashing", () => {
		const { container } = render(
			<Task defaultOpen>
				<TaskTrigger title="Inspect logs" />
				<TaskContent>
					<TaskItem>Check current state</TaskItem>
					<TaskItemFile>app/page.tsx</TaskItemFile>
				</TaskContent>
			</Task>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("Terminal renders without crashing", () => {
		const { container } = render(
			<Terminal isStreaming onClear={vi.fn()} output="$ echo hello\nhello" />,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("TestResults primitives render without crashing", () => {
		const { container } = render(
			<TestResults summary={{ duration: 42, failed: 0, passed: 1, skipped: 0, total: 1 }}>
				<TestResultsContent>
					<TestSuite defaultOpen name="suite" status="passed">
						<TestSuiteName />
						<TestSuiteContent>
							<Test name="works" status="passed" />
						</TestSuiteContent>
					</TestSuite>
				</TestResultsContent>
			</TestResults>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("Tool primitives render without crashing", () => {
		const { container } = render(
			<Tool defaultOpen>
				<ToolHeader state="output-available" toolName="search" type="dynamic-tool" />
				<ToolContent>Completed</ToolContent>
			</Tool>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("Toolbar renders without crashing", () => {
		const { container } = render(<Toolbar nodeId="node-1">Toolbar actions</Toolbar>)

		expect(container.firstChild).not.toBeNull()
	})

	it("Transcription renders without crashing", () => {
		const { container } = render(<Transcription segments={[]}>{() => null}</Transcription>)

		expect(container.firstChild).not.toBeNull()
	})

	it("VoiceSelector renders without crashing", () => {
		const { container } = render(
			<VoiceSelector>
				<VoiceSelectorTrigger asChild>
					<button type="button">Open voices</button>
				</VoiceSelectorTrigger>
			</VoiceSelector>,
		)

		expect(container.firstChild).not.toBeNull()
	})

	it("WebPreview renders without crashing", () => {
		const { container } = render(
			<WebPreview defaultUrl="http://localhost">
				<WebPreviewNavigation>
					<WebPreviewNavigationButton tooltip="Back">
						<span>Back</span>
					</WebPreviewNavigationButton>
					<WebPreviewUrl />
				</WebPreviewNavigation>
				<WebPreviewBody />
				<WebPreviewConsole logs={[]} />
			</WebPreview>,
		)

		expect(container.firstChild).not.toBeNull()
	})
})
