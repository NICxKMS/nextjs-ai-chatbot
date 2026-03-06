// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { Tool } from "ai"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get: (_target, tag) => {
				const element = typeof tag === "string" ? tag : "div"
				return ({
					children,
					...props
				}: {
					children?: React.ReactNode
					[key: string]: unknown
				}) => React.createElement(element, props, children)
			},
		},
	),
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}))

vi.mock("shiki", () => ({
	createHighlighter: vi.fn().mockResolvedValue({
		codeToTokens: (code: string) => ({
			bg: "transparent",
			fg: "inherit",
			tokens: code.split("\n").map((line) => [{ color: "inherit", content: line }]),
		}),
		getLoadedLanguages: () => ["json", "text", "typescript"],
	}),
}))

import {
	Agent,
	AgentContent,
	AgentHeader,
	AgentInstructions,
	AgentOutput,
	AgentTool,
	AgentTools,
} from "@/components/ai-elements/agent"
import { SpeechInput } from "@/components/ai-elements/speech-input"

const originalMediaRecorderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder")
const originalMediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices")
const originalSpeechRecognitionDescriptor = Object.getOwnPropertyDescriptor(
	window,
	"SpeechRecognition",
)
const originalWebkitSpeechRecognitionDescriptor = Object.getOwnPropertyDescriptor(
	window,
	"webkitSpeechRecognition",
)

let mediaRecorderInstances: MockMediaRecorder[] = []
let speechRecognitionInstances: MockSpeechRecognition[] = []

class MockMediaRecorder extends EventTarget {
	stream: MediaStream
	state: "inactive" | "recording" = "inactive"

	constructor(stream: MediaStream) {
		super()
		this.stream = stream
		mediaRecorderInstances.push(this)
	}

	start = vi.fn(() => {
		this.state = "recording"
	})

	stop = vi.fn(() => {
		this.state = "inactive"
		this.dispatchEvent(new Event("stop"))
	})

	static isTypeSupported = vi.fn().mockReturnValue(true)
}

class MockSpeechRecognition extends EventTarget {
	continuous = false
	interimResults = false
	lang = ""
	onstart = null
	onend = null
	onresult = null
	onerror = null

	constructor() {
		super()
		speechRecognitionInstances.push(this)
	}

	start = vi.fn(() => {
		this.dispatchEvent(new Event("start"))
	})

	stop = vi.fn(() => {
		this.dispatchEvent(new Event("end"))
	})
}

const restoreDescriptor = (
	target: object,
	key: string,
	descriptor: PropertyDescriptor | undefined,
) => {
	if (descriptor) {
		Object.defineProperty(target, key, descriptor)
		return
	}

	Reflect.deleteProperty(target as unknown as Record<PropertyKey, unknown>, key)
}

const setMediaRecorderAvailability = (enabled: boolean) => {
	if (enabled) {
		Object.defineProperty(globalThis, "MediaRecorder", {
			configurable: true,
			writable: true,
			value: MockMediaRecorder,
		})
		return
	}

	Reflect.deleteProperty(globalThis as unknown as Record<PropertyKey, unknown>, "MediaRecorder")
}

const setSpeechRecognitionAvailability = (enabled: boolean) => {
	if (enabled) {
		Object.defineProperty(window, "SpeechRecognition", {
			configurable: true,
			writable: true,
			value: MockSpeechRecognition,
		})
	} else {
		Reflect.deleteProperty(
			window as unknown as Record<PropertyKey, unknown>,
			"SpeechRecognition",
		)
	}

	Reflect.deleteProperty(
		window as unknown as Record<PropertyKey, unknown>,
		"webkitSpeechRecognition",
	)
}

const createMediaStreamMock = () => {
	const trackStop = vi.fn()

	const stream = {
		getTracks: () => [{ stop: trackStop }],
	} as unknown as MediaStream

	return { stream, trackStop }
}

const setMediaDevicesMock = (impl: () => Promise<MediaStream>) => {
	const getUserMedia = vi.fn(impl)

	Object.defineProperty(navigator, "mediaDevices", {
		configurable: true,
		writable: true,
		value: {
			getUserMedia,
		},
	})

	return getUserMedia
}

const getLatestRecorder = () => {
	const recorder = mediaRecorderInstances.at(-1)
	expect(recorder).toBeDefined()
	return recorder as MockMediaRecorder
}

const getLatestRecognition = () => {
	const recognition = speechRecognitionInstances.at(-1)
	expect(recognition).toBeDefined()
	return recognition as MockSpeechRecognition
}

const dispatchRecorderChunk = (recorder: MockMediaRecorder, blob: Blob) => {
	const event = new Event("dataavailable") as Event & { data: Blob }
	event.data = blob
	recorder.dispatchEvent(event)
}

const dispatchSpeechResult = (
	recognition: MockSpeechRecognition,
	segments: Array<{ isFinal: boolean; transcript: string }>,
	resultIndex = 0,
) => {
	const results = segments.map((segment) => ({
		0: { confidence: 1, transcript: segment.transcript },
		isFinal: segment.isFinal,
		length: 1,
		item: (index: number) =>
			index === 0 ? { confidence: 1, transcript: segment.transcript } : undefined,
	}))

	const event = new Event("result") as Event & {
		resultIndex: number
		results: typeof results
	}

	event.resultIndex = resultIndex
	event.results = results

	recognition.dispatchEvent(event)
}

const createDeferred = <T,>() => {
	let resolve!: (value: T) => void
	let reject!: (reason?: unknown) => void

	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})

	return { promise, reject, resolve }
}

beforeEach(() => {
	mediaRecorderInstances = []
	speechRecognitionInstances = []

	setSpeechRecognitionAvailability(false)
	setMediaRecorderAvailability(true)
	setMediaDevicesMock(async () => createMediaStreamMock().stream)
})

afterEach(() => {
	vi.clearAllMocks()

	restoreDescriptor(globalThis, "MediaRecorder", originalMediaRecorderDescriptor)
	restoreDescriptor(navigator, "mediaDevices", originalMediaDevicesDescriptor)
	restoreDescriptor(window, "SpeechRecognition", originalSpeechRecognitionDescriptor)
	restoreDescriptor(window, "webkitSpeechRecognition", originalWebkitSpeechRecognitionDescriptor)
})

describe("agent.tsx deep coverage", () => {
	it("renders base sections with and without optional header model", () => {
		render(
			<Agent data-testid="agent-root">
				<AgentHeader model="gpt-5.3" name="Execution Agent" />
				<AgentHeader name="Fallback Agent" />
				<AgentContent>
					<AgentInstructions>Plan, execute, and summarize.</AgentInstructions>
					<AgentOutput schema="type Result = { done: boolean }" />
				</AgentContent>
			</Agent>,
		)

		expect(screen.getByTestId("agent-root")).toBeInTheDocument()
		expect(screen.getByText("Execution Agent")).toBeInTheDocument()
		expect(screen.getByText("gpt-5.3")).toBeInTheDocument()
		expect(screen.getByText("Fallback Agent")).toBeInTheDocument()
		expect(screen.getByText("Instructions")).toBeInTheDocument()
		expect(screen.getByText("Output Schema")).toBeInTheDocument()
		expect(screen.getByText("type Result = { done: boolean }")).toBeInTheDocument()
	})

	it("renders an empty tools section", () => {
		render(<AgentTools collapsible type="single" />)

		expect(screen.getByText("Tools")).toBeInTheDocument()
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})

	it("selects schema sources, supports fallback descriptions, and toggles accordion content", async () => {
		const toolUsingJsonSchema = {
			description: "Search Workspace",
			inputSchema: {
				type: "object",
				properties: { fallbackOnly: { type: "boolean" } },
			},
			jsonSchema: {
				type: "object",
				properties: { query: { type: "string" } },
			},
		} as unknown as Tool

		const toolUsingInputSchema = {
			inputSchema: {
				type: "object",
				properties: { id: { type: "string" } },
			},
		} as unknown as Tool

		render(
			<AgentTools collapsible type="single">
				<AgentTool tool={toolUsingJsonSchema} value="tool-json" />
				<AgentTool tool={toolUsingInputSchema} value="tool-input" />
			</AgentTools>,
		)

		expect(screen.getByRole("button", { name: "Search Workspace" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "No description" })).toBeInTheDocument()
		expect(screen.queryByText(/"query"/)).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Search Workspace" }))

		expect(await screen.findByText(/"query"/)).toBeInTheDocument()
		expect(screen.queryByText(/"fallbackOnly"/)).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "No description" }))

		expect(await screen.findByText(/"id"/)).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "No description" }))

		await waitFor(() => {
			expect(screen.queryByText(/"id"/)).not.toBeInTheDocument()
		})
	})
})

describe("speech-input.tsx deep coverage", () => {
	it("stays disabled when no speech input APIs are available", () => {
		setSpeechRecognitionAvailability(false)
		setMediaRecorderAvailability(false)
		Reflect.deleteProperty(navigator as unknown as Record<PropertyKey, unknown>, "mediaDevices")

		render(<SpeechInput aria-label="speech input" />)

		expect(screen.getByRole("button", { name: "speech input" })).toBeDisabled()
	})

	it("runs speech recognition start/result/stop lifecycle", async () => {
		setSpeechRecognitionAvailability(true)

		const onTranscriptionChange = vi.fn()
		const { container } = render(
			<SpeechInput
				aria-label="speech input"
				lang="en-US"
				onTranscriptionChange={onTranscriptionChange}
			/>,
		)

		const button = screen.getByRole("button", { name: "speech input" })

		await waitFor(() => {
			expect(button).not.toBeDisabled()
		})

		const recognition = getLatestRecognition()
		expect(recognition.continuous).toBe(true)
		expect(recognition.interimResults).toBe(true)
		expect(recognition.lang).toBe("en-US")

		fireEvent.click(button)
		expect(recognition.start).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(3)
		})

		act(() => {
			dispatchSpeechResult(recognition, [
				{ isFinal: false, transcript: "draft " },
				{ isFinal: true, transcript: "hello" },
				{ isFinal: true, transcript: " world" },
			])
		})

		expect(onTranscriptionChange).toHaveBeenCalledWith("hello world")

		act(() => {
			dispatchSpeechResult(recognition, [{ isFinal: false, transcript: "ignored" }])
		})

		expect(onTranscriptionChange).toHaveBeenCalledTimes(1)

		fireEvent.click(button)
		expect(recognition.stop).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(0)
		})
	})

	it("handles recognition errors and cleanup on unmount", async () => {
		setSpeechRecognitionAvailability(true)

		const { container, unmount } = render(
			<SpeechInput aria-label="speech input" onTranscriptionChange={vi.fn()} />,
		)

		const button = screen.getByRole("button", { name: "speech input" })

		await waitFor(() => {
			expect(button).not.toBeDisabled()
		})

		const recognition = getLatestRecognition()

		fireEvent.click(button)

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(3)
		})

		act(() => {
			recognition.dispatchEvent(new Event("error"))
		})

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(0)
		})

		unmount()

		expect(recognition.stop).toHaveBeenCalled()
	})

	it("disables media recorder mode when onAudioRecorded is not provided", () => {
		setSpeechRecognitionAvailability(false)
		setMediaRecorderAvailability(true)

		render(<SpeechInput aria-label="speech input" />)

		expect(screen.getByRole("button", { name: "speech input" })).toBeDisabled()
	})

	it("records audio, stops recording, and emits transcription for non-empty audio", async () => {
		setSpeechRecognitionAvailability(false)

		const { stream, trackStop } = createMediaStreamMock()
		const getUserMedia = setMediaDevicesMock(async () => stream)
		const onAudioRecorded = vi
			.fn<(audioBlob: Blob) => Promise<string>>()
			.mockResolvedValue("audio transcript")
		const onTranscriptionChange = vi.fn()

		const { container } = render(
			<SpeechInput
				aria-label="speech input"
				onAudioRecorded={onAudioRecorded}
				onTranscriptionChange={onTranscriptionChange}
			/>,
		)

		const button = screen.getByRole("button", { name: "speech input" })
		expect(button).not.toBeDisabled()

		fireEvent.click(button)

		await waitFor(() => {
			expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
		})

		const recorder = getLatestRecorder()
		expect(recorder.start).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(3)
		})

		act(() => {
			dispatchRecorderChunk(recorder, new Blob(["audio"], { type: "audio/webm" }))
		})

		fireEvent.click(button)
		expect(recorder.stop).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(onAudioRecorded).toHaveBeenCalledTimes(1)
		})

		expect(onAudioRecorded.mock.calls[0]?.[0]).toBeInstanceOf(Blob)

		await waitFor(() => {
			expect(onTranscriptionChange).toHaveBeenCalledWith("audio transcript")
		})

		expect(trackStop).toHaveBeenCalled()

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(0)
		})
	})

	it("shows processing spinner while transcription is pending", async () => {
		setSpeechRecognitionAvailability(false)

		const { stream } = createMediaStreamMock()
		setMediaDevicesMock(async () => stream)

		const deferred = createDeferred<string>()
		const onAudioRecorded = vi.fn(() => deferred.promise)

		render(
			<SpeechInput
				aria-label="speech input"
				onAudioRecorded={onAudioRecorded}
				onTranscriptionChange={vi.fn()}
			/>,
		)

		const button = screen.getByRole("button", { name: "speech input" })

		fireEvent.click(button)
		await waitFor(() => {
			expect(mediaRecorderInstances.length).toBe(1)
		})

		const recorder = getLatestRecorder()

		act(() => {
			dispatchRecorderChunk(recorder, new Blob(["audio"], { type: "audio/webm" }))
		})

		fireEvent.click(button)

		await waitFor(() => {
			expect(onAudioRecorded).toHaveBeenCalledTimes(1)
		})

		expect(screen.getByLabelText("Loading")).toBeInTheDocument()
		expect(button).toBeDisabled()

		await act(async () => {
			deferred.resolve("done")
			await deferred.promise
		})

		await waitFor(() => {
			expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument()
		})

		expect(button).not.toBeDisabled()
	})

	it("handles microphone permission denial without entering listening state", async () => {
		setSpeechRecognitionAvailability(false)

		const getUserMedia = setMediaDevicesMock(async () => {
			throw new Error("permission denied")
		})

		const { container } = render(
			<SpeechInput aria-label="speech input" onAudioRecorded={vi.fn(async () => "")} />,
		)

		fireEvent.click(screen.getByRole("button", { name: "speech input" }))

		await waitFor(() => {
			expect(getUserMedia).toHaveBeenCalledTimes(1)
		})

		expect(mediaRecorderInstances).toHaveLength(0)
		expect(container.querySelectorAll(".animate-ping").length).toBe(0)
	})

	it("stops tracks when the media recorder emits an error event", async () => {
		setSpeechRecognitionAvailability(false)

		const { stream, trackStop } = createMediaStreamMock()
		setMediaDevicesMock(async () => stream)

		const { container } = render(
			<SpeechInput aria-label="speech input" onAudioRecorded={vi.fn(async () => "")} />,
		)

		fireEvent.click(screen.getByRole("button", { name: "speech input" }))
		await waitFor(() => {
			expect(mediaRecorderInstances.length).toBe(1)
		})

		const recorder = getLatestRecorder()

		act(() => {
			recorder.dispatchEvent(new Event("error"))
		})

		await waitFor(() => {
			expect(trackStop).toHaveBeenCalled()
		})

		await waitFor(() => {
			expect(container.querySelectorAll(".animate-ping").length).toBe(0)
		})
	})

	it("skips transcription for empty audio and recovers from callback errors", async () => {
		setSpeechRecognitionAvailability(false)

		const { stream } = createMediaStreamMock()
		setMediaDevicesMock(async () => stream)

		const onAudioRecorded = vi
			.fn<(audioBlob: Blob) => Promise<string>>()
			.mockRejectedValue(new Error("transcription failure"))

		const onTranscriptionChange = vi.fn()

		render(
			<SpeechInput
				aria-label="speech input"
				onAudioRecorded={onAudioRecorded}
				onTranscriptionChange={onTranscriptionChange}
			/>,
		)

		const button = screen.getByRole("button", { name: "speech input" })

		fireEvent.click(button)
		await waitFor(() => {
			expect(mediaRecorderInstances.length).toBe(1)
		})

		const recorderA = getLatestRecorder()

		act(() => {
			dispatchRecorderChunk(recorderA, new Blob([]))
		})

		fireEvent.click(button)

		await waitFor(() => {
			expect(recorderA.stop).toHaveBeenCalledTimes(1)
		})

		expect(onAudioRecorded).not.toHaveBeenCalled()

		fireEvent.click(button)
		await waitFor(() => {
			expect(mediaRecorderInstances.length).toBe(2)
		})

		const recorderB = getLatestRecorder()

		act(() => {
			dispatchRecorderChunk(recorderB, new Blob(["audio"], { type: "audio/webm" }))
		})

		fireEvent.click(button)

		await waitFor(() => {
			expect(onAudioRecorded).toHaveBeenCalledTimes(1)
		})

		await waitFor(() => {
			expect(button).not.toBeDisabled()
		})

		expect(onTranscriptionChange).not.toHaveBeenCalled()
	})

	it("stops an active media recorder during unmount cleanup", async () => {
		setSpeechRecognitionAvailability(false)

		const { stream } = createMediaStreamMock()
		setMediaDevicesMock(async () => stream)

		const { unmount } = render(
			<SpeechInput aria-label="speech input" onAudioRecorded={vi.fn(async () => "")} />,
		)

		fireEvent.click(screen.getByRole("button", { name: "speech input" }))
		await waitFor(() => {
			expect(mediaRecorderInstances.length).toBe(1)
		})

		const recorder = getLatestRecorder()

		await waitFor(() => {
			expect(recorder.start).toHaveBeenCalledTimes(1)
		})

		unmount()

		expect(recorder.stop).toHaveBeenCalled()
	})
})
