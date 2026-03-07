// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type {
	FileUIPart,
	SourceDocumentUIPart,
	Experimental_SpeechResult as SpeechResult,
} from "ai"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mediaPlayMock = vi.fn().mockResolvedValue(undefined)
const mediaPauseMock = vi.fn()

globalThis.HTMLMediaElement.prototype.play = mediaPlayMock
globalThis.HTMLMediaElement.prototype.pause = mediaPauseMock

Object.defineProperty(globalThis.HTMLMediaElement.prototype, "duration", {
	configurable: true,
	get: vi.fn().mockReturnValue(120),
})

Object.defineProperty(globalThis.HTMLMediaElement.prototype, "currentTime", {
	configurable: true,
	get: vi.fn().mockReturnValue(0),
	set: vi.fn(),
})

Object.defineProperty(globalThis.URL, "createObjectURL", {
	configurable: true,
	writable: true,
	value: vi.fn().mockReturnValue("blob:mock-url"),
})

Object.defineProperty(globalThis.URL, "revokeObjectURL", {
	configurable: true,
	writable: true,
	value: vi.fn(),
})

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get:
				(_target, tag) =>
				({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
					React.createElement(String(tag), props, children),
		},
	),
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}))

vi.mock("nanoid", () => {
	let index = 0
	return {
		nanoid: () => `id-${++index}`,
	}
})

vi.mock("@/components/ui/button", () => ({
	Button: ({
		asChild,
		children,
		type,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) => {
		if (asChild && React.isValidElement(children)) {
			return React.cloneElement(
				children as React.ReactElement<Record<string, unknown>>,
				props,
			)
		}

		return React.createElement("button", { type: type ?? "button", ...props }, children)
	},
}))

vi.mock("@/components/ui/button-group", () => ({
	ButtonGroup: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	ButtonGroupText: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		if (asChild && React.isValidElement(children)) {
			return React.cloneElement(
				children as React.ReactElement<Record<string, unknown>>,
				props,
			)
		}
		return React.createElement("span", props, children)
	},
}))

vi.mock("@/components/ui/hover-card", () => ({
	HoverCard: ({
		children,
		openDelay,
		closeDelay,
		...props
	}: {
		children?: React.ReactNode
		openDelay?: number
		closeDelay?: number
		[key: string]: unknown
	}) =>
		React.createElement(
			"div",
			{
				"data-close-delay": closeDelay,
				"data-open-delay": openDelay,
				...props,
			},
			children,
		),
	HoverCardTrigger: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	HoverCardContent: ({
		children,
		align,
		...props
	}: {
		children?: React.ReactNode
		align?: string
		[key: string]: unknown
	}) => React.createElement("div", { "data-align": align, ...props }, children),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({
		children,
		defaultOpen,
		modal,
		onOpenChange,
		open,
		...props
	}: {
		children?: React.ReactNode
		defaultOpen?: boolean
		[key: string]: unknown
		modal?: boolean
		onOpenChange?: (open: boolean) => void
		open?: boolean
	}) => React.createElement("div", props, children),
	DropdownMenuTrigger: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		if (asChild && React.isValidElement(children)) {
			return React.cloneElement(
				children as React.ReactElement<Record<string, unknown>>,
				props,
			)
		}
		return React.createElement("button", { type: "button", ...props }, children)
	},
	DropdownMenuContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	DropdownMenuItem: ({
		children,
		onClick,
		onSelect,
		type,
		...props
	}: {
		children?: React.ReactNode
		onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
		onSelect?: (event: Event) => void
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{
				onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
					onSelect?.(event.nativeEvent)
					onClick?.(event)
				},
				type: type ?? "button",
				...props,
			},
			children,
		),
}))

vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	TooltipTrigger: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		if (asChild && React.isValidElement(children)) {
			return React.cloneElement(
				children as React.ReactElement<Record<string, unknown>>,
				props,
			)
		}
		return React.createElement("button", { type: "button", ...props }, children)
	},
	TooltipContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
}))

vi.mock("@/components/ui/command", () => ({
	Command: ({
		children,
		onValueChange,
		shouldFilter,
		value,
		...props
	}: {
		children?: React.ReactNode
		onValueChange?: (value: string) => void
		shouldFilter?: boolean
		value?: string
		[key: string]: unknown
	}) => {
		void onValueChange
		void shouldFilter
		void value
		return React.createElement("div", props, children)
	},
	CommandInput: (props: React.ComponentProps<"input">) => React.createElement("input", props),
	CommandList: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	CommandGroup: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	CommandItem: ({
		children,
		onSelect,
		value,
		...props
	}: {
		children?: React.ReactNode
		onSelect?: (value: string) => void
		value?: string
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{
				"data-value": value,
				onClick: () => onSelect?.(value ?? ""),
				type: "button",
				...props,
			},
			children,
		),
	CommandEmpty: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	CommandSeparator: (props: React.ComponentProps<"hr">) => React.createElement("hr", props),
}))

vi.mock("@/components/ui/select", () => ({
	Select: ({
		children,
		defaultValue,
		onOpenChange,
		onValueChange,
		open,
		value,
		...props
	}: {
		children?: React.ReactNode
		defaultValue?: string
		onOpenChange?: (open: boolean) => void
		onValueChange?: (value: string) => void
		open?: boolean
		value?: string
		[key: string]: unknown
	}) => {
		void defaultValue
		void onOpenChange
		void onValueChange
		void open
		void value
		return React.createElement("div", props, children)
	},
	SelectTrigger: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("button", { type: "button", ...props }, children),
	SelectContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SelectItem: ({
		children,
		value,
		...props
	}: {
		children?: React.ReactNode
		value?: string
		[key: string]: unknown
	}) =>
		React.createElement("button", { "data-value": value, type: "button", ...props }, children),
	SelectValue: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("span", props, children),
}))

vi.mock("@/components/ui/spinner", () => ({
	Spinner: () => React.createElement("span", { "data-testid": "spinner" }, "loading"),
}))

vi.mock("media-chrome/react", () => ({
	MediaController: ({
		audio,
		children,
		...props
	}: {
		audio?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		void audio
		return React.createElement("div", props, children)
	},
	MediaControlBar: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	MediaPlayButton: ({ children, onClick, ...props }: React.ComponentProps<"button">) => {
		const [isPlaying, setIsPlaying] = React.useState(false)

		const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
			const controller = event.currentTarget.closest("[data-slot='audio-player']")
			const audioElement = controller?.querySelector("audio")
			if (audioElement instanceof HTMLMediaElement) {
				if (isPlaying) {
					audioElement.pause()
				} else {
					await audioElement.play()
				}
			}
			setIsPlaying((previous) => !previous)
			onClick?.(event)
		}

		return React.createElement(
			"button",
			{
				"data-playing": isPlaying ? "true" : "false",
				onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
					void handleClick(event)
				},
				type: "button",
				...props,
			},
			children ?? (isPlaying ? "Pause" : "Play"),
		)
	},
	MediaSeekBackwardButton: ({
		seekOffset = 10,
		children,
		...props
	}: React.ComponentProps<"button"> & { seekOffset?: number }) =>
		React.createElement(
			"button",
			{ "data-seek-offset": String(seekOffset), type: "button", ...props },
			children ?? "Seek backward",
		),
	MediaSeekForwardButton: ({
		seekOffset = 10,
		children,
		...props
	}: React.ComponentProps<"button"> & { seekOffset?: number }) =>
		React.createElement(
			"button",
			{ "data-seek-offset": String(seekOffset), type: "button", ...props },
			children ?? "Seek forward",
		),
	MediaTimeDisplay: ({ children, ...props }: React.ComponentProps<"span">) =>
		React.createElement("span", props, children ?? "00:00"),
	MediaDurationDisplay: ({ children, ...props }: React.ComponentProps<"span">) =>
		React.createElement("span", props, children ?? "02:00"),
	MediaMuteButton: ({ children, ...props }: React.ComponentProps<"button">) =>
		React.createElement("button", { type: "button", ...props }, children ?? "Mute"),
	MediaTimeRange: (props: React.ComponentProps<"input">) =>
		React.createElement("input", {
			"aria-label": "time-range",
			type: "range",
			...props,
		}),
	MediaVolumeRange: (props: React.ComponentProps<"input">) =>
		React.createElement("input", {
			"aria-label": "volume-range",
			type: "range",
			...props,
		}),
}))

import {
	Attachment,
	type AttachmentData,
	AttachmentEmpty,
	AttachmentHoverCard,
	AttachmentHoverCardContent,
	AttachmentHoverCardTrigger,
	AttachmentInfo,
	AttachmentPreview,
	AttachmentRemove,
	Attachments,
	getAttachmentLabel,
	getMediaCategory,
	useAttachmentContext,
	useAttachmentsContext,
} from "@/components/ai-elements/attachments"
import {
	AudioPlayer,
	AudioPlayerControlBar,
	AudioPlayerDurationDisplay,
	AudioPlayerElement,
	AudioPlayerMuteButton,
	AudioPlayerPlayButton,
	AudioPlayerSeekBackwardButton,
	AudioPlayerSeekForwardButton,
	AudioPlayerTimeDisplay,
	AudioPlayerTimeRange,
	AudioPlayerVolumeRange,
} from "@/components/ai-elements/audio-player"
import {
	LocalReferencedSourcesContext,
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuItem,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputCommand,
	PromptInputCommandEmpty,
	PromptInputCommandGroup,
	PromptInputCommandInput,
	PromptInputCommandItem,
	PromptInputCommandList,
	PromptInputCommandSeparator,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputHoverCard,
	PromptInputHoverCardContent,
	PromptInputHoverCardTrigger,
	PromptInputProvider,
	PromptInputSelect,
	PromptInputSelectContent,
	PromptInputSelectItem,
	PromptInputSelectTrigger,
	PromptInputSelectValue,
	PromptInputSubmit,
	PromptInputTab,
	PromptInputTabBody,
	PromptInputTabItem,
	PromptInputTabLabel,
	PromptInputTabsList,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
	usePromptInputController,
	usePromptInputReferencedSources,
	useProviderAttachments,
} from "@/components/ai-elements/prompt-input"

const createFile = (name: string, type: string, size = 4) =>
	new File([new Uint8Array(size)], name, { type })

const createFileAttachment = (
	overrides: Partial<FileUIPart & { id: string }> = {},
): AttachmentData =>
	({
		filename: "notes.txt",
		id: "file-1",
		mediaType: "text/plain",
		type: "file",
		url: "https://example.com/notes.txt",
		...overrides,
	}) as AttachmentData

const createSourceAttachment = (
	overrides: Partial<SourceDocumentUIPart & { id: string }> = {},
): AttachmentData =>
	({
		filename: "source.md",
		id: "source-1",
		title: "Docs",
		type: "source-document",
		url: "https://example.com/docs",
		...overrides,
	}) as AttachmentData

const createSourceDocument = (
	overrides: Partial<SourceDocumentUIPart> = {},
): SourceDocumentUIPart =>
	({
		filename: "knowledge.md",
		title: "Knowledge Base",
		type: "source-document",
		url: "https://example.com/knowledge",
		...overrides,
	}) as SourceDocumentUIPart

const AttachmentCountProbe = () => {
	const attachments = usePromptInputAttachments()
	return React.createElement("span", { "data-testid": "file-count" }, attachments.files.length)
}

const AttachmentActionsProbe = () => {
	const attachments = usePromptInputAttachments()
	return (
		<div>
			<span data-testid="file-count">{attachments.files.length}</span>
			<button
				onClick={() => {
					const latest = attachments.files.at(-1)
					if (latest) {
						attachments.remove(latest.id)
					}
				}}
				type="button"
			>
				remove-last
			</button>
			<button onClick={attachments.clear} type="button">
				clear-files
			</button>
		</div>
	)
}

const ReferencedSourcesProbe = () => {
	const sources = usePromptInputReferencedSources()

	return (
		<div>
			<span data-testid="source-count">{sources.sources.length}</span>
			<button onClick={() => sources.add(createSourceDocument())} type="button">
				add-source
			</button>
			<button
				onClick={() =>
					sources.add([
						createSourceDocument({ filename: "source-a.md" }),
						createSourceDocument({ filename: "source-b.md" }),
					])
				}
				type="button"
			>
				add-multiple
			</button>
			<button
				onClick={() => {
					const first = sources.sources.at(0)
					if (first) {
						sources.remove(first.id)
					}
				}}
				type="button"
			>
				remove-source
			</button>
			<button onClick={sources.clear} type="button">
				clear-sources
			</button>
		</div>
	)
}

const ProviderControllerProbe = () => {
	const controller = usePromptInputController()
	return (
		<div>
			<span data-testid="provider-file-count">{controller.attachments.files.length}</span>
			<span data-testid="provider-text">{controller.textInput.value}</span>
			<button onClick={() => controller.attachments.openFileDialog()} type="button">
				provider-open-dialog
			</button>
		</div>
	)
}

const ProviderAttachmentsProbe = () => {
	const providerAttachments = useProviderAttachments()
	return (
		<div>
			<span data-testid="provider-hook-file-count">{providerAttachments.files.length}</span>
			<button
				onClick={() => providerAttachments.add([createFile("provider.txt", "text/plain")])}
				type="button"
			>
				provider-add
			</button>
		</div>
	)
}

const PromptInputAttachmentsProbe = () => {
	const attachments = usePromptInputAttachments()
	return (
		<div>
			<span data-testid="provider-fallback-count">{attachments.files.length}</span>
			<button
				onClick={() => attachments.add([createFile("fallback.txt", "text/plain")])}
				type="button"
			>
				fallback-add
			</button>
		</div>
	)
}

const AttachmentContextProbe = () => {
	useAttachmentContext()
	return <div>unreachable</div>
}

const AttachmentsContextProbe = () => {
	const { variant } = useAttachmentsContext()
	return <div data-testid="attachments-variant">{variant}</div>
}

const PromptInputControllerHookProbe = () => {
	usePromptInputController()
	return <div>unreachable</div>
}

const ProviderAttachmentsHookProbe = () => {
	useProviderAttachments()
	return <div>unreachable</div>
}

const PromptInputAttachmentsHookProbe = () => {
	usePromptInputAttachments()
	return <div>unreachable</div>
}

const PromptInputReferencedSourcesHookProbe = () => {
	usePromptInputReferencedSources()
	return <div>unreachable</div>
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe("attachments.tsx", () => {
	it("computes media categories and labels for files and source documents", () => {
		expect(getMediaCategory(createSourceAttachment())).toBe("source")
		expect(getMediaCategory(createFileAttachment({ mediaType: "image/png" }))).toBe("image")
		expect(getMediaCategory(createFileAttachment({ mediaType: "video/mp4" }))).toBe("video")
		expect(getMediaCategory(createFileAttachment({ mediaType: "audio/mpeg" }))).toBe("audio")
		expect(getMediaCategory(createFileAttachment({ mediaType: "application/pdf" }))).toBe(
			"document",
		)
		expect(getMediaCategory(createFileAttachment({ mediaType: "unknown/type" }))).toBe(
			"unknown",
		)

		expect(getAttachmentLabel(createSourceAttachment({ title: "Primary source" }))).toBe(
			"Primary source",
		)
		expect(
			getAttachmentLabel(createSourceAttachment({ title: "", filename: "fallback.md" })),
		).toBe("fallback.md")
		expect(getAttachmentLabel(createSourceAttachment({ title: "", filename: "" }))).toBe(
			"Source",
		)
		expect(
			getAttachmentLabel(
				createFileAttachment({ filename: "" as string, mediaType: "image/png" }),
			),
		).toBe("Image")
		expect(
			getAttachmentLabel(
				createFileAttachment({ filename: "" as string, mediaType: "audio/mpeg" }),
			),
		).toBe("Attachment")
	})

	it("uses default attachments context outside provider and guards attachment context", () => {
		render(<AttachmentsContextProbe />)
		expect(screen.getByTestId("attachments-variant")).toHaveTextContent("grid")
		expect(() => render(<AttachmentContextProbe />)).toThrow(
			"Attachment components must be used within <Attachment>",
		)
	})

	it("renders attachment variants, previews, metadata, and remove interactions", () => {
		const onRemove = vi.fn()
		const onParentClick = vi.fn()

		const { container, rerender } = render(
			<Attachments data-testid="attachments-root" variant="inline">
				<Attachment
					data={createFileAttachment({
						filename: "photo.png",
						id: "img-1",
						mediaType: "image/png",
						url: "https://example.com/photo.png",
					})}
					onClick={onParentClick}
					onRemove={onRemove}
				>
					<AttachmentPreview />
					<AttachmentInfo showMediaType />
					<AttachmentRemove label="Delete attachment" />
				</Attachment>
			</Attachments>,
		)

		expect(screen.getByTestId("attachments-root").className).toContain("flex-wrap")
		expect(screen.getByRole("img", { name: "photo.png" })).toBeInTheDocument()
		expect(screen.getByText("photo.png")).toBeInTheDocument()
		expect(screen.getByText("image/png")).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Delete attachment" }))
		expect(onRemove).toHaveBeenCalledTimes(1)
		expect(onParentClick).not.toHaveBeenCalled()

		rerender(
			<Attachments variant="grid">
				<Attachment
					data={createFileAttachment({
						filename: "clip.mp4",
						id: "video-1",
						mediaType: "video/mp4",
						url: "https://example.com/clip.mp4",
					})}
				>
					<AttachmentPreview />
					<AttachmentInfo showMediaType />
				</Attachment>
			</Attachments>,
		)

		expect(container.querySelector("video")).toBeInTheDocument()
		expect(screen.queryByText("clip.mp4")).not.toBeInTheDocument()
	})

	it("supports fallback preview icons, hover card defaults, and empty states", () => {
		const { container } = render(
			<div>
				<Attachments variant="list">
					<Attachment
						data={createFileAttachment({
							filename: "archive.bin",
							id: "unknown-1",
							mediaType: "application/octet-stream",
							url: "",
						})}
					>
						<AttachmentPreview
							fallbackIcon={<span data-testid="custom-fallback">fallback-icon</span>}
						/>
						<AttachmentInfo />
						<AttachmentRemove label="No-op remove" />
					</Attachment>
				</Attachments>

				<AttachmentHoverCard data-testid="hover-card">
					<AttachmentHoverCardTrigger>Hover trigger</AttachmentHoverCardTrigger>
					<AttachmentHoverCardContent data-testid="hover-content">
						Hover content
					</AttachmentHoverCardContent>
				</AttachmentHoverCard>

				<AttachmentEmpty data-testid="attachment-empty" />
			</div>,
		)

		expect(screen.getByTestId("custom-fallback")).toBeInTheDocument()
		expect(screen.getByText("archive.bin")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "No-op remove" })).not.toBeInTheDocument()

		expect(screen.getByTestId("hover-card")).toHaveAttribute("data-open-delay", "0")
		expect(screen.getByTestId("hover-card")).toHaveAttribute("data-close-delay", "0")
		expect(screen.getByTestId("hover-content")).toHaveAttribute("data-align", "start")
		expect(screen.getByTestId("hover-content").className).toContain("w-auto p-2")

		expect(screen.getByTestId("attachment-empty")).toHaveTextContent("No attachments")
		expect(container.querySelector("[data-testid='attachment-empty']")?.className).toContain(
			"text-muted-foreground",
		)
	})
})

describe("prompt-input.tsx", () => {
	it("throws helpful errors for hooks used outside their providers", () => {
		expect(() => render(<PromptInputControllerHookProbe />)).toThrow(
			"Wrap your component inside <PromptInputProvider> to use usePromptInputController().",
		)
		expect(() => render(<ProviderAttachmentsHookProbe />)).toThrow(
			"Wrap your component inside <PromptInputProvider> to use useProviderAttachments().",
		)
		expect(() => render(<PromptInputAttachmentsHookProbe />)).toThrow(
			"usePromptInputAttachments must be used within a PromptInput or PromptInputProvider",
		)
		expect(() => render(<PromptInputReferencedSourcesHookProbe />)).toThrow(
			"usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider",
		)
	})

	it("exposes provider attachments in both provider hooks and fallback hook path", () => {
		render(
			<PromptInputProvider>
				<ProviderAttachmentsProbe />
				<PromptInputAttachmentsProbe />
			</PromptInputProvider>,
		)

		expect(screen.getByTestId("provider-hook-file-count")).toHaveTextContent("0")
		expect(screen.getByTestId("provider-fallback-count")).toHaveTextContent("0")

		fireEvent.click(screen.getByRole("button", { name: "provider-add" }))
		expect(screen.getByTestId("provider-hook-file-count")).toHaveTextContent("1")

		fireEvent.click(screen.getByRole("button", { name: "fallback-add" }))
		expect(screen.getByTestId("provider-fallback-count")).toHaveTextContent("2")
	})

	it("handles local attachment validation for accept, size, and file count constraints", () => {
		const onError = vi.fn()

		render(
			<PromptInput
				accept="image/*"
				data-testid="prompt-form"
				maxFiles={1}
				maxFileSize={3}
				onError={onError}
				onSubmit={vi.fn()}
			>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<AttachmentCountProbe />
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const fileInput = screen.getByLabelText("Upload files") as HTMLInputElement

		fireEvent.change(fileInput, {
			target: { files: [createFile("notes.txt", "text/plain", 2)] },
		})
		expect(onError).toHaveBeenCalledWith({
			code: "accept",
			message: "No files match the accepted types.",
		})
		expect(screen.getByTestId("file-count")).toHaveTextContent("0")

		fireEvent.change(fileInput, {
			target: { files: [createFile("photo.png", "image/png", 5)] },
		})
		expect(onError).toHaveBeenCalledWith({
			code: "max_file_size",
			message: "All files exceed the maximum size.",
		})
		expect(screen.getByTestId("file-count")).toHaveTextContent("0")

		fireEvent.change(fileInput, {
			target: {
				files: [
					createFile("photo-a.png", "image/png", 2),
					createFile("photo-b.png", "image/png", 2),
				],
			},
		})
		expect(onError).toHaveBeenCalledWith({
			code: "max_files",
			message: "Too many files. Some were not added.",
		})
		expect(screen.getByTestId("file-count")).toHaveTextContent("1")
		expect(fileInput.value).toBe("")
	})

	it("supports local attachment interactions via drop, paste, backspace remove, and clear", () => {
		const onSubmit = vi.fn()
		const { container } = render(
			<PromptInput data-testid="prompt-form" onSubmit={onSubmit}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Prompt text" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<AttachmentActionsProbe />
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const form = screen.getByTestId("prompt-form")
		const firstDropEvent = new Event("drop", { bubbles: true, cancelable: true }) as DragEvent
		Object.defineProperty(firstDropEvent, "dataTransfer", {
			value: {
				files: [createFile("drop-a.txt", "text/plain")],
				types: ["Files"],
			},
		})
		fireEvent(form, firstDropEvent)
		expect(screen.getByTestId("file-count")).toHaveTextContent("1")

		const textArea = screen.getByLabelText("Prompt text")
		const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent
		Object.defineProperty(pasteEvent, "clipboardData", {
			value: {
				items: [
					{
						getAsFile: () => createFile("paste-a.txt", "text/plain"),
						kind: "file",
					},
				],
			},
		})
		fireEvent(textArea, pasteEvent)
		expect(screen.getByTestId("file-count")).toHaveTextContent("2")

		fireEvent.keyDown(textArea, { key: "Backspace" })
		expect(screen.getByTestId("file-count")).toHaveTextContent("1")

		fireEvent.click(screen.getByRole("button", { name: "clear-files" }))
		expect(screen.getByTestId("file-count")).toHaveTextContent("0")

		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()
		expect(container.querySelector("form")).toBeInTheDocument()
	})

	it("handles global drop mode by listening on document", async () => {
		render(
			<PromptInput globalDrop onSubmit={vi.fn()}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Global prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<AttachmentCountProbe />
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const dispatchGlobalDrop = () => {
			const globalDropEvent = new Event("drop", {
				bubbles: true,
				cancelable: true,
			}) as DragEvent
			Object.defineProperty(globalDropEvent, "dataTransfer", {
				value: {
					files: [createFile("global-drop.txt", "text/plain")],
					types: ["Files"],
				},
			})
			document.dispatchEvent(globalDropEvent)
		}

		await waitFor(() => {
			dispatchGlobalDrop()
			expect(screen.getByTestId("file-count")).toHaveTextContent("1")
		})
	})

	it("submits on Enter when enabled, but respects disabled and prevented key handlers", async () => {
		const onSubmitEnabled = vi.fn()
		render(
			<PromptInput data-testid="enabled-form" onSubmit={onSubmitEnabled}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Enabled prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools />
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const enabledTextArea = screen.getByLabelText("Enabled prompt")
		fireEvent.change(enabledTextArea, { target: { value: "submit now" } })
		fireEvent.keyDown(enabledTextArea, { key: "Enter" })

		await waitFor(() => {
			expect(onSubmitEnabled).toHaveBeenCalledTimes(1)
		})

		const onSubmitDisabled = vi.fn()
		render(
			<PromptInput data-testid="disabled-form" onSubmit={onSubmitDisabled}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Disabled prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools />
					<PromptInputSubmit disabled />
				</PromptInputFooter>
			</PromptInput>,
		)

		const disabledTextArea = screen.getByLabelText("Disabled prompt")
		fireEvent.change(disabledTextArea, { target: { value: "should not submit" } })
		fireEvent.keyDown(disabledTextArea, { key: "Enter" })
		fireEvent.keyDown(disabledTextArea, { key: "Enter", shiftKey: true })
		expect(onSubmitDisabled).not.toHaveBeenCalled()

		const onSubmitPrevented = vi.fn()
		render(
			<PromptInput data-testid="prevented-form" onSubmit={onSubmitPrevented}>
				<PromptInputBody>
					<PromptInputTextarea
						aria-label="Prevented prompt"
						onKeyDown={(event) => event.preventDefault()}
					/>
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools />
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const preventedTextArea = screen.getByLabelText("Prevented prompt")
		fireEvent.change(preventedTextArea, { target: { value: "blocked" } })
		fireEvent.keyDown(preventedTextArea, { key: "Enter" })
		expect(onSubmitPrevented).not.toHaveBeenCalled()
	})

	it("converts blob attachments to data URLs on successful submit", async () => {
		const fileReaderOriginal = globalThis.FileReader
		class MockFileReader {
			result: string | ArrayBuffer | null = "data:text/plain;base64,Zm9v"
			onerror: null | (() => void) = null
			onloadend: null | (() => void) = null

			readAsDataURL() {
				this.onloadend?.()
			}
		}
		Object.defineProperty(globalThis, "FileReader", {
			configurable: true,
			writable: true,
			value: MockFileReader,
		})

		const originalFetch = globalThis.fetch
		const fetchMock = vi.fn().mockResolvedValue({
			blob: vi.fn().mockResolvedValue(new Blob(["file"], { type: "text/plain" })),
		})
		Object.defineProperty(globalThis, "fetch", {
			configurable: true,
			writable: true,
			value: fetchMock,
		})

		const onSubmit = vi.fn()
		render(
			<PromptInput data-testid="submit-form" onSubmit={onSubmit}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Submit prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<AttachmentCountProbe />
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const fileInput = screen.getByLabelText("Upload files") as HTMLInputElement
		const textArea = screen.getByLabelText("Submit prompt") as HTMLTextAreaElement
		const form = screen.getByTestId("submit-form")

		fireEvent.change(fileInput, { target: { files: [createFile("blob.txt", "text/plain")] } })
		fireEvent.change(textArea, { target: { value: "convert this" } })
		fireEvent.submit(form)

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})

		const firstMessage = onSubmit.mock.calls[0]?.[0] as {
			files: FileUIPart[]
			text: string
		}
		expect(firstMessage.text).toBe("convert this")
		expect(firstMessage.files[0]?.url).toBe("data:text/plain;base64,Zm9v")
		expect(screen.getByTestId("file-count")).toHaveTextContent("0")
		expect(textArea.value).toBe("")

		Object.defineProperty(globalThis, "fetch", {
			configurable: true,
			writable: true,
			value: originalFetch,
		})
		Object.defineProperty(globalThis, "FileReader", {
			configurable: true,
			writable: true,
			value: fileReaderOriginal,
		})
	})

	it("retains inputs when conversion or submit fails", async () => {
		const originalFetch = globalThis.fetch
		const fetchRejectMock = vi.fn().mockRejectedValue(new Error("network"))
		Object.defineProperty(globalThis, "fetch", {
			configurable: true,
			writable: true,
			value: fetchRejectMock,
		})

		const onSubmit = vi.fn().mockRejectedValue(new Error("submit failed"))

		render(
			<PromptInput data-testid="failed-submit-form" onSubmit={onSubmit}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Failure prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<AttachmentCountProbe />
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const fileInput = screen.getByLabelText("Upload files") as HTMLInputElement
		const textArea = screen.getByLabelText("Failure prompt") as HTMLTextAreaElement
		const form = screen.getByTestId("failed-submit-form")

		fireEvent.change(fileInput, { target: { files: [createFile("failed.txt", "text/plain")] } })
		fireEvent.change(textArea, { target: { value: "keep me" } })
		fireEvent.submit(form)

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})

		const failureMessage = onSubmit.mock.calls[0]?.[0] as {
			files: FileUIPart[]
			text: string
		}
		expect(failureMessage.files[0]?.url).toBe("blob:mock-url")
		expect(screen.getByTestId("file-count")).toHaveTextContent("1")

		Object.defineProperty(globalThis, "fetch", {
			configurable: true,
			writable: true,
			value: originalFetch,
		})
	})

	it("supports provider-controlled text, provider file dialog opening, and successful cleanup", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(
			<PromptInputProvider initialInput="seed prompt">
				<ProviderControllerProbe />
				<PromptInput data-testid="provider-form" onSubmit={onSubmit}>
					<PromptInputBody>
						<PromptInputTextarea aria-label="Provider prompt" />
					</PromptInputBody>
					<PromptInputFooter>
						<PromptInputTools>
							<AttachmentCountProbe />
						</PromptInputTools>
						<PromptInputSubmit />
					</PromptInputFooter>
				</PromptInput>
			</PromptInputProvider>,
		)

		const textArea = screen.getByLabelText("Provider prompt") as HTMLTextAreaElement
		expect(textArea.value).toBe("seed prompt")

		fireEvent.change(textArea, { target: { value: "provider message" } })
		expect(screen.getByTestId("provider-text")).toHaveTextContent("provider message")

		const fileInput = screen.getByLabelText("Upload files") as HTMLInputElement
		const fileInputClick = vi.spyOn(fileInput, "click")
		fireEvent.click(screen.getByRole("button", { name: "provider-open-dialog" }))
		expect(fileInputClick).toHaveBeenCalledTimes(1)

		fireEvent.change(fileInput, {
			target: { files: [createFile("provider-file.txt", "text/plain")] },
		})
		expect(screen.getByTestId("provider-file-count")).toHaveTextContent("1")

		fireEvent.submit(screen.getByTestId("provider-form"))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})

		expect(screen.getByTestId("provider-file-count")).toHaveTextContent("0")
		expect(screen.getByTestId("provider-text")).toHaveTextContent("")
		expect(textArea.value).toBe("")
	})

	it("opens file dialog from PromptInputActionAddAttachments and manages referenced sources", () => {
		render(
			<PromptInput data-testid="action-form" onSubmit={vi.fn()}>
				<PromptInputHeader>
					<PromptInputActionAddAttachments label="Attach files" />
				</PromptInputHeader>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Action prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<ReferencedSourcesProbe />
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)

		const input = screen.getByLabelText("Upload files") as HTMLInputElement
		const clickSpy = vi.spyOn(input, "click")

		fireEvent.click(screen.getByRole("button", { name: "Attach files" }))
		expect(clickSpy).toHaveBeenCalledTimes(1)

		expect(screen.getByTestId("source-count")).toHaveTextContent("0")
		fireEvent.click(screen.getByRole("button", { name: "add-source" }))
		expect(screen.getByTestId("source-count")).toHaveTextContent("1")
		fireEvent.click(screen.getByRole("button", { name: "add-multiple" }))
		expect(screen.getByTestId("source-count")).toHaveTextContent("3")
		fireEvent.click(screen.getByRole("button", { name: "remove-source" }))
		expect(screen.getByTestId("source-count")).toHaveTextContent("2")
		fireEvent.click(screen.getByRole("button", { name: "clear-sources" }))
		expect(screen.getByTestId("source-count")).toHaveTextContent("0")
	})

	it("renders action, select, hover, tabs, command, and submit wrappers with expected defaults", () => {
		const stopMock = vi.fn()
		const clickMock = vi.fn()

		render(
			<div>
				<PromptInputActionMenu>
					<PromptInputActionMenuTrigger
						tooltip={{ content: "More", shortcut: "Ctrl+K", side: "bottom" }}
					>
						Menu trigger
					</PromptInputActionMenuTrigger>
					<PromptInputActionMenuContent data-testid="action-content">
						<PromptInputActionMenuItem>Attach image</PromptInputActionMenuItem>
					</PromptInputActionMenuContent>
				</PromptInputActionMenu>

				<PromptInputButton data-testid="single-child-button">Single</PromptInputButton>
				<PromptInputButton data-testid="multi-child-button">
					<span>One</span>
					<span>Two</span>
				</PromptInputButton>

				<PromptInputHoverCard data-testid="prompt-hover">
					<PromptInputHoverCardTrigger>Hover me</PromptInputHoverCardTrigger>
					<PromptInputHoverCardContent data-testid="prompt-hover-content">
						Details
					</PromptInputHoverCardContent>
				</PromptInputHoverCard>

				<PromptInputSelect>
					<PromptInputSelectTrigger>Model</PromptInputSelectTrigger>
					<PromptInputSelectContent>
						<PromptInputSelectItem value="gpt-5">GPT-5</PromptInputSelectItem>
						<PromptInputSelectValue>Selected</PromptInputSelectValue>
					</PromptInputSelectContent>
				</PromptInputSelect>

				<PromptInputTabsList>
					<PromptInputTab>
						<PromptInputTabLabel>Tab title</PromptInputTabLabel>
						<PromptInputTabBody>
							<PromptInputTabItem>Tab item</PromptInputTabItem>
						</PromptInputTabBody>
					</PromptInputTab>
				</PromptInputTabsList>

				<PromptInputCommand>
					<PromptInputCommandInput aria-label="Command input" />
					<PromptInputCommandList>
						<PromptInputCommandEmpty>No matches</PromptInputCommandEmpty>
						<PromptInputCommandGroup>
							<PromptInputCommandItem>Item 1</PromptInputCommandItem>
						</PromptInputCommandGroup>
						<PromptInputCommandSeparator />
					</PromptInputCommandList>
				</PromptInputCommand>

				<PromptInputSubmit onClick={clickMock} status="streaming" />
				<PromptInputSubmit onStop={stopMock} status="streaming" />
				<PromptInputSubmit status="submitted" />
				<PromptInputSubmit status="error" />
			</div>,
		)

		expect(screen.getByText("Ctrl+K")).toBeInTheDocument()
		expect(screen.getByTestId("single-child-button")).toHaveAttribute("data-size", "icon-sm")
		expect(screen.getByTestId("multi-child-button")).toHaveAttribute("data-size", "sm")
		expect(screen.getByTestId("prompt-hover")).toHaveAttribute("data-open-delay", "0")
		expect(screen.getByTestId("prompt-hover")).toHaveAttribute("data-close-delay", "0")
		expect(screen.getByTestId("prompt-hover-content")).toHaveAttribute("data-align", "start")
		expect(screen.getByText("No matches")).toBeInTheDocument()
		const stopButtons = screen.getAllByRole("button", { name: "Stop" })
		const submitWhileStreaming = stopButtons[0]
		const stopWithHandler = stopButtons[1]
		if (!submitWhileStreaming || !stopWithHandler) {
			throw new Error("Expected stop buttons to render")
		}
		expect(stopWithHandler).toHaveAttribute("type", "button")
		expect(screen.getByTestId("spinner")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument()

		fireEvent.click(stopWithHandler)
		expect(stopMock).toHaveBeenCalledTimes(1)

		fireEvent.click(submitWhileStreaming)
		expect(clickMock).toHaveBeenCalledTimes(1)
	})

	it("can provide referenced sources context from a manual provider", () => {
		render(
			<LocalReferencedSourcesContext.Provider
				value={{
					add: vi.fn(),
					clear: vi.fn(),
					remove: vi.fn(),
					sources: [],
				}}
			>
				<PromptInputReferencedSourcesHookProbe />
			</LocalReferencedSourcesContext.Provider>,
		)

		expect(screen.getByText("unreachable")).toBeInTheDocument()
	})
})

describe("audio-player.tsx", () => {
	it("renders controller with default and custom styles", () => {
		render(
			<AudioPlayer
				data-testid="audio-player"
				style={
					{
						"--media-primary-color": "tomato",
					} as React.CSSProperties
				}
			>
				<AudioPlayerElement data-testid="audio-src" src="https://example.com/audio.mp3" />
			</AudioPlayer>,
		)

		const player = screen.getByTestId("audio-player")
		expect(player).toHaveAttribute("data-slot", "audio-player")
		expect(player).toHaveStyle("--media-primary-color: tomato")
		expect(player).toHaveStyle("--media-button-icon-height: 1rem")
		expect(screen.getByTestId("audio-src")).toHaveAttribute(
			"src",
			"https://example.com/audio.mp3",
		)
	})

	it("builds data URL src from speech payload and forwards media events", () => {
		const loadedData = vi.fn()
		const errored = vi.fn()
		const speechAudioData: SpeechResult["audio"] = {
			base64: "YXVkaW8=",
			format: "mp3",
			mediaType: "audio/mpeg",
			uint8Array: new Uint8Array([1, 2, 3]),
		}

		render(
			<AudioPlayerElement
				data={speechAudioData}
				data-testid="audio-data"
				onError={errored}
				onLoadedData={loadedData}
			/>,
		)

		const audio = screen.getByTestId("audio-data")
		expect(audio).toHaveAttribute("src", "data:audio/mpeg;base64,YXVkaW8=")

		fireEvent(audio, new Event("loadeddata"))
		fireEvent(audio, new Event("error"))
		expect(loadedData).toHaveBeenCalledTimes(1)
		expect(errored).toHaveBeenCalledTimes(1)
	})

	it("renders controls, applies seek defaults/overrides, and supports play pause timeline and volume", async () => {
		const onTimeInput = vi.fn()
		const onVolumeInput = vi.fn()

		const { container } = render(
			<AudioPlayer>
				<AudioPlayerElement src="https://example.com/control.mp3" />
				<AudioPlayerControlBar>
					<AudioPlayerPlayButton />
					<AudioPlayerSeekBackwardButton />
					<AudioPlayerSeekForwardButton seekOffset={30} />
					<AudioPlayerTimeDisplay />
					<AudioPlayerTimeRange onInput={onTimeInput} />
					<AudioPlayerDurationDisplay />
					<AudioPlayerMuteButton />
					<AudioPlayerVolumeRange onInput={onVolumeInput} />
				</AudioPlayerControlBar>
			</AudioPlayer>,
		)

		const playButton = container.querySelector(
			"[data-slot='audio-player-play-button']",
		) as HTMLButtonElement
		const backwardButton = container.querySelector(
			"[data-slot='audio-player-seek-backward-button']",
		) as HTMLButtonElement
		const forwardButton = container.querySelector(
			"[data-slot='audio-player-seek-forward-button']",
		) as HTMLButtonElement
		const timeRange = container.querySelector(
			"[data-slot='audio-player-time-range']",
		) as HTMLInputElement
		const volumeRange = container.querySelector(
			"[data-slot='audio-player-volume-range']",
		) as HTMLInputElement

		expect(backwardButton).toHaveAttribute("data-seek-offset", "10")
		expect(forwardButton).toHaveAttribute("data-seek-offset", "30")

		await act(async () => {
			fireEvent.click(playButton)
		})
		await act(async () => {
			fireEvent.click(playButton)
		})

		expect(mediaPlayMock).toHaveBeenCalledTimes(1)
		expect(mediaPauseMock).toHaveBeenCalledTimes(1)

		fireEvent.input(timeRange, { target: { value: "50" } })
		fireEvent.input(volumeRange, { target: { value: "80" } })
		expect(onTimeInput).toHaveBeenCalledTimes(1)
		expect(onVolumeInput).toHaveBeenCalledTimes(1)

		expect(
			container.querySelector("[data-slot='audio-player-control-bar']"),
		).toBeInTheDocument()
		expect(
			container.querySelector("[data-slot='audio-player-duration-display']"),
		).toBeInTheDocument()
		expect(
			container.querySelector("[data-slot='audio-player-time-display']"),
		).toBeInTheDocument()
		expect(
			container.querySelector("[data-slot='audio-player-mute-button']"),
		).toBeInTheDocument()
	})
})
