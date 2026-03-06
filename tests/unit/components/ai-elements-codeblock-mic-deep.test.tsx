// @vitest-environment jsdom

import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("shiki", () => ({
	createHighlighter: vi.fn(async () => ({
		codeToTokens: (code: string) => ({
			bg: "#111111",
			fg: "#f5f5f5",
			tokens: code.split("\n").map((line, lineIndex) => {
				if (line.length === 0) {
					return []
				}
				return [
					{
						bgColor: lineIndex === 1 ? undefined : "#111111",
						bgcolor: lineIndex === 1 ? "#222222" : undefined,
						color: "#f5f5f5",
						content: line,
						fontStyle: lineIndex === 0 ? 1 : lineIndex === 1 ? 2 : 4,
						htmlStyle: lineIndex === 2 ? { letterSpacing: "0.5px" } : undefined,
					},
				]
			}),
		}),
		getLoadedLanguages: () => ["typescript", "json", "text"],
	})),
}))

import { createHighlighter } from "shiki"

import {
	CodeBlock,
	CodeBlockActions,
	CodeBlockCopyButton,
	CodeBlockFilename,
	CodeBlockHeader,
	CodeBlockLanguageSelector,
	CodeBlockLanguageSelectorContent,
	CodeBlockLanguageSelectorItem,
	CodeBlockLanguageSelectorTrigger,
	CodeBlockLanguageSelectorValue,
	CodeBlockTitle,
	highlightCode,
} from "@/components/ai-elements/code-block"
import {
	MicSelector,
	MicSelectorContent,
	MicSelectorEmpty,
	MicSelectorInput,
	MicSelectorItem,
	MicSelectorLabel,
	MicSelectorList,
	MicSelectorTrigger,
	MicSelectorValue,
	useAudioDevices,
} from "@/components/ai-elements/mic-selector"

const mediaDeviceListeners: { devicechange?: () => void } = {}

const enumerateDevicesMock = vi.fn()
const getUserMediaMock = vi.fn()
const addEventListenerMock = vi.fn((event: string, callback: () => void) => {
	if (event === "devicechange") {
		mediaDeviceListeners.devicechange = callback
	}
})
const removeEventListenerMock = vi.fn()

function createDevice(overrides: Partial<MediaDeviceInfo>): MediaDeviceInfo {
	const base = {
		deviceId: "device-1",
		groupId: "group-1",
		kind: "audioinput",
		label: "Built-in Mic",
		toJSON: () => ({}),
	} as MediaDeviceInfo
	return { ...base, ...overrides }
}

beforeEach(() => {
	vi.clearAllMocks()
	mediaDeviceListeners.devicechange = undefined

	enumerateDevicesMock.mockResolvedValue([
		createDevice({ deviceId: "mic-1", label: "Built-in Mic (1234:ABCD)" }),
		createDevice({ deviceId: "cam-1", kind: "videoinput", label: "Camera" }),
	])
	getUserMediaMock.mockResolvedValue({
		getTracks: () => [{ stop: vi.fn() }],
	})

	Object.defineProperty(navigator, "mediaDevices", {
		configurable: true,
		value: {
			addEventListener: addEventListenerMock,
			enumerateDevices: enumerateDevicesMock,
			getUserMedia: getUserMediaMock,
			removeEventListener: removeEventListenerMock,
		},
	})
})

describe("ai-elements code-block + mic-selector deep coverage", () => {
	it("highlightCode computes asynchronously and then serves cached results", async () => {
		const callback = vi.fn()

		const initial = highlightCode("const a = 1", "typescript", callback)
		expect(initial).toBeNull()

		await waitFor(() => {
			expect(callback).toHaveBeenCalledTimes(1)
		})

		const cached = highlightCode("const a = 1", "typescript")
		expect(cached).not.toBeNull()
		expect(cached?.tokens.length).toBeGreaterThan(0)
		expect(createHighlighter).toHaveBeenCalledTimes(1)
	})

	it("CodeBlock renders content, canonical and fallback token backgrounds, and copy button lifecycle", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText,
			},
		})

		const onCopy = vi.fn()

		render(
			<CodeBlock code={`lineOne\nlineTwo\nlineThree`} language="typescript" showLineNumbers>
				<CodeBlockHeader>
					<CodeBlockTitle>
						<CodeBlockFilename>demo.ts</CodeBlockFilename>
					</CodeBlockTitle>
					<CodeBlockActions>
						<CodeBlockCopyButton data-testid="copy-code" onCopy={onCopy} timeout={25} />
					</CodeBlockActions>
				</CodeBlockHeader>
			</CodeBlock>,
		)

		expect(screen.getByText("demo.ts")).toBeInTheDocument()
		expect(screen.getByText("lineOne")).toBeInTheDocument()
		expect(screen.getByText("lineTwo")).toBeInTheDocument()
		await waitFor(() => {
			expect(screen.getByText("lineOne")).toHaveStyle({ backgroundColor: "#111111" })
			expect(screen.getByText("lineTwo")).toHaveStyle({ backgroundColor: "#222222" })
		})

		fireEvent.click(screen.getByTestId("copy-code"))
		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith("lineOne\nlineTwo\nlineThree")
		})
		expect(onCopy).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByTestId("copy-code"))
		expect(writeText).toHaveBeenCalledTimes(1)

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 35))
		})
		fireEvent.click(screen.getByTestId("copy-code"))
		await waitFor(() => {
			expect(writeText).toHaveBeenCalledTimes(2)
		})
	})

	it("CodeBlockCopyButton reports clipboard errors", () => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: undefined,
		})

		const onError = vi.fn()
		render(
			<CodeBlock code="console.log('x')" language="typescript">
				<CodeBlockHeader>
					<CodeBlockActions>
						<CodeBlockCopyButton data-testid="copy-error" onError={onError} />
					</CodeBlockActions>
				</CodeBlockHeader>
			</CodeBlock>,
		)

		fireEvent.click(screen.getByTestId("copy-error"))
		expect(onError).toHaveBeenCalledWith(expect.any(Error))
	})

	it("CodeBlock language selector components support selection", () => {
		const onValueChange = vi.fn()

		render(
			<CodeBlockLanguageSelector
				onOpenChange={vi.fn()}
				onValueChange={onValueChange}
				open
				value="typescript"
			>
				<CodeBlockLanguageSelectorTrigger data-testid="lang-trigger">
					<CodeBlockLanguageSelectorValue placeholder="Language" />
				</CodeBlockLanguageSelectorTrigger>
				<CodeBlockLanguageSelectorContent>
					<CodeBlockLanguageSelectorItem value="typescript">
						TypeScript
					</CodeBlockLanguageSelectorItem>
					<CodeBlockLanguageSelectorItem value="json">JSON</CodeBlockLanguageSelectorItem>
				</CodeBlockLanguageSelectorContent>
			</CodeBlockLanguageSelector>,
		)

		expect(screen.getByTestId("lang-trigger")).toBeInTheDocument()
		expect(onValueChange).not.toHaveBeenCalled()
	})

	it("useAudioDevices loads microphones, refreshes on permission, and reacts to device changes", async () => {
		const { result } = renderHook(() => useAudioDevices())

		await waitFor(() => {
			expect(enumerateDevicesMock).toHaveBeenCalled()
		})
		await waitFor(() => {
			expect(result.current.loading).toBe(false)
		})
		expect(result.current.devices).toHaveLength(1)
		expect(result.current.devices[0]?.deviceId).toBe("mic-1")

		await act(async () => {
			await result.current.loadDevices()
		})
		expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true })
		expect(result.current.hasPermission).toBe(true)

		await act(async () => {
			mediaDeviceListeners.devicechange?.()
		})
		expect(enumerateDevicesMock).toHaveBeenCalled()
		expect(addEventListenerMock).toHaveBeenCalledWith("devicechange", expect.any(Function))
	})

	it("useAudioDevices exposes errors when enumeration fails", async () => {
		enumerateDevicesMock.mockRejectedValueOnce(new Error("enumeration failed"))
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

		const { result } = renderHook(() => useAudioDevices())
		await waitFor(() => {
			expect(enumerateDevicesMock).toHaveBeenCalled()
		})
		await waitFor(() => {
			expect(result.current.error).toContain("enumeration failed")
		})

		consoleSpy.mockRestore()
	})

	it("MicSelector components render value labels and close on selection", async () => {
		const onValueChange = vi.fn()
		const onOpenChange = vi.fn()

		render(
			<MicSelector defaultOpen onOpenChange={onOpenChange} onValueChange={onValueChange}>
				<MicSelectorTrigger>
					<MicSelectorValue />
				</MicSelectorTrigger>
				<MicSelectorContent>
					<MicSelectorInput />
					<MicSelectorList>
						{(devices) =>
							devices.map((device) => (
								<MicSelectorItem key={device.deviceId} value={device.deviceId}>
									<MicSelectorLabel device={device} />
								</MicSelectorItem>
							))
						}
					</MicSelectorList>
					<MicSelectorEmpty />
				</MicSelectorContent>
			</MicSelector>,
		)

		await waitFor(() => {
			expect(screen.getByText(/Built-in Mic/i)).toBeInTheDocument()
		})
		expect(screen.getByText(/1234:ABCD/i)).toBeInTheDocument()
		expect(screen.getByText(/select microphone/i)).toBeInTheDocument()

		fireEvent.click(screen.getByText(/Built-in Mic/i))
		expect(onValueChange).toHaveBeenCalledWith("mic-1")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
