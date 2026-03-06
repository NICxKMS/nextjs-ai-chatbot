// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { XIcon } from "lucide-react"
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}))

type MockMotionProps = React.HTMLAttributes<HTMLElement> & {
	children?: React.ReactNode
}

const motionProxy = new Proxy<Record<string, React.FC<MockMotionProps>>>(
	{},
	{
		get: (_target, tag: string | symbol) => {
			const element = typeof tag === "string" ? tag : "div"
			return ({ children, ...props }: MockMotionProps) =>
				React.createElement(element, props, children)
		},
	},
)

vi.mock("framer-motion", () => ({
	motion: motionProxy,
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}))

global.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
global.HTMLMediaElement.prototype.pause = vi.fn()

Object.defineProperty(navigator, "mediaDevices", {
	configurable: true,
	value: { getUserMedia: vi.fn().mockResolvedValue({}) },
	writable: true,
})

import {
	Artifact,
	ArtifactAction,
	ArtifactActions,
	ArtifactClose,
	ArtifactContent,
	ArtifactDescription,
	ArtifactHeader,
	ArtifactTitle,
} from "@/components/ai-elements/artifact"
import {
	Commit,
	CommitActions,
	CommitAuthor,
	CommitAuthorAvatar,
	CommitContent,
	CommitCopyButton,
	CommitFile,
	CommitFileAdditions,
	CommitFileChanges,
	CommitFileDeletions,
	CommitFileIcon,
	CommitFileInfo,
	CommitFilePath,
	CommitFileStatus,
	CommitFiles,
	CommitHash,
	CommitHeader,
	CommitInfo,
	CommitMessage,
	CommitMetadata,
	CommitSeparator,
	CommitTimestamp,
} from "@/components/ai-elements/commit"

import {
	useVoiceSelector,
	VoiceSelector,
	VoiceSelectorAccent,
	VoiceSelectorAge,
	VoiceSelectorAttributes,
	VoiceSelectorBullet,
	VoiceSelectorContent,
	VoiceSelectorDescription,
	VoiceSelectorDialog,
	VoiceSelectorEmpty,
	VoiceSelectorGender,
	VoiceSelectorGroup,
	VoiceSelectorInput,
	VoiceSelectorItem,
	VoiceSelectorList,
	VoiceSelectorName,
	VoiceSelectorPreview,
	VoiceSelectorSeparator,
	VoiceSelectorShortcut,
	VoiceSelectorTrigger,
} from "@/components/ai-elements/voice-selector"

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard")

const setClipboard = (value: Pick<Clipboard, "writeText"> | undefined) => {
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value,
		writable: true,
	})
}

afterEach(() => {
	vi.clearAllMocks()
	vi.useRealTimers()

	if (originalClipboardDescriptor) {
		Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor)
		return
	}

	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: undefined,
		writable: true,
	})
})

describe("ai-elements deep coverage batch 1: commit", () => {
	it("renders commit primitives and default branch fallbacks", () => {
		render(
			<Commit defaultOpen>
				<CommitHeader>
					<CommitInfo>
						<CommitHash>abc1234</CommitHash>
						<CommitMessage>Fix flaky parser test</CommitMessage>
						<CommitMetadata>
							<CommitAuthor>
								<CommitAuthorAvatar initials="AB" />
								<span>Ari Baker</span>
							</CommitAuthor>
							<CommitSeparator />
							<CommitTimestamp date={new Date("2026-03-05T00:00:00.000Z")} />
						</CommitMetadata>
					</CommitInfo>
					<CommitActions>
						<CommitCopyButton hash="abc1234" />
					</CommitActions>
				</CommitHeader>
				<CommitContent forceMount>
					<CommitFiles>
						<CommitFile>
							<CommitFileInfo>
								<CommitFileStatus status="added" />
								<CommitFileIcon />
								<CommitFilePath>tests/parser.test.ts</CommitFilePath>
							</CommitFileInfo>
							<CommitFileChanges>
								<CommitFileAdditions count={12} />
								<CommitFileDeletions count={3} />
							</CommitFileChanges>
						</CommitFile>
					</CommitFiles>
				</CommitContent>
			</Commit>,
		)

		expect(screen.getByText("abc1234")).toBeInTheDocument()
		expect(screen.getByText("Fix flaky parser test")).toBeInTheDocument()
		expect(screen.getByText("Ari Baker")).toBeInTheDocument()
		expect(screen.getByText("tests/parser.test.ts")).toBeInTheDocument()
		expect(screen.getByText("A")).toBeInTheDocument()
		expect(screen.getByText("12")).toBeInTheDocument()
		expect(screen.getByText("3")).toBeInTheDocument()

		const time = document.querySelector("time")
		expect(time).not.toBeNull()
		expect(time?.textContent).not.toBe("")
		expect(time?.getAttribute("datetime")).toBe("2026-03-05T00:00:00.000Z")
	})

	it("uses explicit children overrides where provided", () => {
		render(
			<div>
				<CommitSeparator>separator-token</CommitSeparator>
				<CommitTimestamp date={new Date("2026-03-05T00:00:00.000Z")}>
					custom timestamp
				</CommitTimestamp>
				<CommitFileStatus status="deleted">DEL</CommitFileStatus>
				<CommitFileAdditions count={2}>plus-custom</CommitFileAdditions>
				<CommitFileDeletions count={1}>minus-custom</CommitFileDeletions>
			</div>,
		)

		expect(screen.getByText("separator-token")).toBeInTheDocument()
		expect(screen.getByText("custom timestamp")).toBeInTheDocument()
		expect(screen.getByText("DEL")).toBeInTheDocument()
		expect(screen.getByText("plus-custom")).toBeInTheDocument()
		expect(screen.getByText("minus-custom")).toBeInTheDocument()
	})

	it("returns null for non-positive file additions and deletions", () => {
		const { container } = render(
			<>
				<CommitFileAdditions count={0} />
				<CommitFileDeletions count={-5} />
			</>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it("stops click and keydown propagation inside commit actions", () => {
		const parentClick = vi.fn()
		const parentKeyDown = vi.fn()

		render(
			// biome-ignore lint/a11y/noStaticElementInteractions: test wrapper for propagation behavior
			<div onClick={parentClick} onKeyDown={parentKeyDown}>
				<CommitActions>
					<button type="button">Inner Action</button>
				</CommitActions>
			</div>,
		)

		const actionsGroup = screen.getByRole("group")
		fireEvent.click(actionsGroup)
		fireEvent.keyDown(actionsGroup, { key: "Enter" })

		expect(parentClick).not.toHaveBeenCalled()
		expect(parentKeyDown).not.toHaveBeenCalled()
	})

	it("copies hash, blocks duplicate copy while copied, and resets after timeout", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		const onCopy = vi.fn()
		setClipboard({ writeText })

		render(<CommitCopyButton hash="deadbeef" onCopy={onCopy} timeout={200} />)

		const copyButton = screen.getByRole("button")
		fireEvent.click(copyButton)
		await waitFor(() => {
			expect(writeText).toHaveBeenCalledTimes(1)
			expect(copyButton.querySelector(".lucide-check")).not.toBeNull()
		})
		expect(onCopy).toHaveBeenCalledTimes(1)

		fireEvent.click(copyButton)
		expect(writeText).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(copyButton.querySelector(".lucide-copy")).not.toBeNull()
		})

		fireEvent.click(copyButton)

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledTimes(2)
		})

		expect(onCopy).toHaveBeenCalledTimes(2)
	})

	it("reports errors when clipboard API is unavailable", async () => {
		const onError = vi.fn()
		setClipboard(undefined)

		render(<CommitCopyButton hash="hash-1" onError={onError} />)
		fireEvent.click(screen.getByRole("button"))

		await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
		expect(onError.mock.calls[0]?.[0]?.message).toBe("Clipboard API not available")
	})

	it("reports errors when clipboard write fails", async () => {
		const writeText = vi.fn().mockRejectedValue(new Error("permission denied"))
		const onError = vi.fn()
		setClipboard({ writeText })

		render(<CommitCopyButton hash="hash-2" onError={onError} />)
		fireEvent.click(screen.getByRole("button"))

		await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
		expect(onError.mock.calls[0]?.[0]?.message).toBe("permission denied")
	})

	it("clears pending timeout on unmount", async () => {
		const clearTimeoutSpy = vi.spyOn(window, "clearTimeout")
		const writeText = vi.fn().mockResolvedValue(undefined)
		setClipboard({ writeText })

		const { unmount } = render(<CommitCopyButton hash="hash-3" timeout={4000} />)
		fireEvent.click(screen.getByRole("button"))

		await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
		unmount()

		expect(clearTimeoutSpy).toHaveBeenCalled()
		clearTimeoutSpy.mockRestore()
	})
})

describe("ai-elements deep coverage batch 1: voice-selector", () => {
	it("throws when useVoiceSelector is called outside provider", () => {
		const Probe = () => {
			useVoiceSelector()
			return <div>unreachable</div>
		}

		expect(() => render(<Probe />)).toThrowError(
			"VoiceSelector components must be used within VoiceSelector",
		)
	})

	it("updates open/value state through context handlers", () => {
		const onOpenChange = vi.fn()
		const onValueChange = vi.fn()

		const Probe = () => {
			const { open, setOpen, value, setValue } = useVoiceSelector()

			return (
				<div>
					<span data-testid="voice-open">{String(open)}</span>
					<span data-testid="voice-value">{value ?? "none"}</span>
					<button onClick={() => setOpen(!open)} type="button">
						toggle-open
					</button>
					<button onClick={() => setValue("nova")} type="button">
						set-value
					</button>
				</div>
			)
		}

		render(
			<VoiceSelector
				defaultOpen={false}
				defaultValue="alloy"
				onOpenChange={onOpenChange}
				onValueChange={onValueChange}
			>
				<Probe />
			</VoiceSelector>,
		)

		expect(screen.getByTestId("voice-open")).toHaveTextContent("false")
		expect(screen.getByTestId("voice-value")).toHaveTextContent("alloy")

		fireEvent.click(screen.getByRole("button", { name: "toggle-open" }))
		expect(onOpenChange).toHaveBeenCalledWith(true)
		expect(screen.getByTestId("voice-open")).toHaveTextContent("true")

		fireEvent.click(screen.getByRole("button", { name: "set-value" }))
		expect(onValueChange).toHaveBeenCalledWith("nova")
		expect(screen.getByTestId("voice-value")).toHaveTextContent("nova")
	})

	it("renders selector primitives with custom title", () => {
		render(
			<VoiceSelector onOpenChange={vi.fn()} open>
				<VoiceSelectorTrigger asChild>
					<button type="button">Open voices</button>
				</VoiceSelectorTrigger>
				<VoiceSelectorContent title="Team voices">
					<VoiceSelectorInput placeholder="Search voices" />
					<VoiceSelectorList>
						<VoiceSelectorEmpty>No voices found</VoiceSelectorEmpty>
						<VoiceSelectorGroup heading="Available">
							<VoiceSelectorItem value="aria">
								<VoiceSelectorName>Aria</VoiceSelectorName>
								<VoiceSelectorAttributes>
									<VoiceSelectorGender value="female">female</VoiceSelectorGender>
									<VoiceSelectorBullet data-testid="voice-bullet" />
									<VoiceSelectorAccent value="american" />
									<VoiceSelectorBullet />
									<VoiceSelectorAge>28</VoiceSelectorAge>
								</VoiceSelectorAttributes>
								<VoiceSelectorDescription>Calm and clear</VoiceSelectorDescription>
								<VoiceSelectorShortcut>enter</VoiceSelectorShortcut>
							</VoiceSelectorItem>
						</VoiceSelectorGroup>
						<VoiceSelectorSeparator />
					</VoiceSelectorList>
				</VoiceSelectorContent>
			</VoiceSelector>,
		)

		expect(screen.getByText("Team voices")).toBeInTheDocument()
		expect(screen.getByText("Aria")).toBeInTheDocument()
		expect(screen.getByText("Calm and clear")).toBeInTheDocument()
		expect(screen.getByText("enter")).toBeInTheDocument()
		expect(screen.getByTestId("voice-bullet")).not.toBeEmptyDOMElement()
	})

	it("uses default title when VoiceSelectorContent title is omitted", () => {
		render(
			<VoiceSelector onOpenChange={vi.fn()} open>
				<VoiceSelectorContent>
					<VoiceSelectorList />
				</VoiceSelectorContent>
			</VoiceSelector>,
		)

		expect(screen.getByText("Voice Selector")).toBeInTheDocument()
	})

	it("renders VoiceSelectorDialog wrapper", () => {
		render(
			<VoiceSelectorDialog onOpenChange={vi.fn()} open>
				<VoiceSelectorInput placeholder="Filter voices" />
			</VoiceSelectorDialog>,
		)

		expect(screen.getByPlaceholderText("Filter voices")).toBeInTheDocument()
	})

	it("covers all VoiceSelectorGender switch cases and children override", () => {
		render(
			<div>
				<VoiceSelectorGender data-testid="gender-male" value="male">
					male
				</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-female" value="female">
					female
				</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-transgender" value="transgender">
					transgender
				</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-androgyne" value="androgyne">
					androgyne
				</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-non-binary" value="non-binary">
					non-binary
				</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-intersex" value="intersex">
					intersex
				</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-default">default</VoiceSelectorGender>
				<VoiceSelectorGender data-testid="gender-children" value="male">
					custom-gender
				</VoiceSelectorGender>
			</div>,
		)

		const genderIds = [
			"gender-male",
			"gender-female",
			"gender-transgender",
			"gender-androgyne",
			"gender-non-binary",
			"gender-intersex",
			"gender-default",
		]

		for (const id of genderIds) {
			expect(screen.getByTestId(id)).not.toBeEmptyDOMElement()
		}

		expect(screen.getByTestId("gender-children")).toHaveTextContent("custom-gender")
	})

	it("covers all VoiceSelectorAccent switch cases with default and children branches", () => {
		const accents = [
			"american",
			"british",
			"australian",
			"canadian",
			"irish",
			"scottish",
			"indian",
			"south-african",
			"new-zealand",
			"spanish",
			"french",
			"german",
			"italian",
			"portuguese",
			"brazilian",
			"mexican",
			"argentinian",
			"japanese",
			"chinese",
			"korean",
			"russian",
			"arabic",
			"dutch",
			"swedish",
			"norwegian",
			"danish",
			"finnish",
			"polish",
			"turkish",
			"greek",
		]

		render(
			<div>
				{accents.map((accent) => (
					<VoiceSelectorAccent
						data-testid={`accent-${accent}`}
						key={accent}
						value={accent}
					/>
				))}
				<VoiceSelectorAccent data-testid="accent-default" value="unknown-accent" />
				<VoiceSelectorAccent data-testid="accent-children" value="american">
					children-accent
				</VoiceSelectorAccent>
			</div>,
		)

		for (const accent of accents) {
			expect(screen.getByTestId(`accent-${accent}`)).not.toBeEmptyDOMElement()
		}

		expect(screen.getByTestId("accent-default")).toBeEmptyDOMElement()
		expect(screen.getByTestId("accent-children")).toHaveTextContent("children-accent")
	})

	it("stops propagation and calls click/play handlers in preview default state", () => {
		const parentClick = vi.fn()
		const onClick = vi.fn()
		const onPlay = vi.fn()

		render(
			// biome-ignore lint/a11y/noStaticElementInteractions: test wrapper for propagation behavior
			<div onClick={parentClick} onKeyDown={() => undefined}>
				<VoiceSelectorPreview onClick={onClick} onPlay={onPlay} />
			</div>,
		)

		const button = screen.getByRole("button", { name: "Play preview" })
		expect(button).toBeEnabled()
		expect(button.querySelector("svg")).not.toBeNull()

		fireEvent.click(button)

		expect(parentClick).not.toHaveBeenCalled()
		expect(onClick).toHaveBeenCalledTimes(1)
		expect(onPlay).toHaveBeenCalledTimes(1)
	})

	it("renders pause icon and aria label when preview is playing", () => {
		render(<VoiceSelectorPreview playing />)

		const button = screen.getByRole("button", { name: "Pause preview" })
		expect(button.querySelector("svg")).not.toBeNull()
	})

	it("renders loading icon and disables preview when loading", () => {
		const onPlay = vi.fn()
		render(<VoiceSelectorPreview loading onPlay={onPlay} />)

		const button = screen.getByRole("button", { name: "Play preview" })
		expect(button).toBeDisabled()
		expect(screen.getByLabelText("Loading")).toBeInTheDocument()

		fireEvent.click(button)
		expect(onPlay).not.toHaveBeenCalled()
	})
})

describe("ai-elements deep coverage batch 1: artifact", () => {
	it("renders artifact container primitives", () => {
		render(
			<Artifact>
				<ArtifactHeader>
					<div>
						<ArtifactTitle>Execution Log</ArtifactTitle>
						<ArtifactDescription>Latest pipeline output</ArtifactDescription>
					</div>
					<ArtifactActions>
						<ArtifactClose />
					</ArtifactActions>
				</ArtifactHeader>
				<ArtifactContent>log line 1</ArtifactContent>
			</Artifact>,
		)

		expect(screen.getByText("Execution Log")).toBeInTheDocument()
		expect(screen.getByText("Latest pipeline output")).toBeInTheDocument()
		expect(screen.getByText("log line 1")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
	})

	it("renders close button default icon and custom children", () => {
		const { rerender } = render(<ArtifactClose />)

		const defaultClose = screen.getByRole("button", { name: "Close" })
		expect(defaultClose.querySelector("svg")).not.toBeNull()

		rerender(
			<ArtifactClose>
				<span>dismiss-action</span>
			</ArtifactClose>,
		)

		expect(screen.getByText("dismiss-action")).toBeInTheDocument()
	})

	it("renders ArtifactAction without tooltip using children and label", () => {
		render(
			<ArtifactAction label="Download artifact">
				<span>download-icon</span>
			</ArtifactAction>,
		)

		expect(screen.getByRole("button", { name: /Download artifact/i })).toBeInTheDocument()
		expect(screen.getByText("download-icon")).toBeInTheDocument()
	})

	it("renders ArtifactAction with tooltip and icon", () => {
		render(<ArtifactAction icon={XIcon} tooltip="Copy artifact" />)

		const button = screen.getByRole("button", { name: "Copy artifact" })
		expect(button.querySelector("svg")).not.toBeNull()
	})

	it("prefers label over tooltip for screen-reader text", () => {
		render(<ArtifactAction label="Pin artifact" tooltip="Pin this artifact" />)

		expect(screen.getByRole("button", { name: "Pin artifact" })).toBeInTheDocument()
	})
})
