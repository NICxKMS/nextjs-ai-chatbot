// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
	ArrowUpIcon,
	CheckCircleFillIcon,
	ChevronDownIcon,
	CodeIcon,
	CopyIcon,
	CrossIcon,
	CrossSmallIcon,
	FileIcon,
	FullscreenIcon,
	GlobeIcon,
	ImageIcon,
	LoaderIcon,
	LockIcon,
	MessageIcon,
	MoreHorizontalIcon,
	PaperclipIcon,
	PencilEditIcon,
	PlayIcon,
	PlusIcon,
	ShareIcon,
	SidebarLeftIcon,
	SparklesIcon,
	StopIcon,
	TerminalWindowIcon,
	ThumbDownIcon,
	ThumbUpIcon,
	TrashIcon,
} from "@/components/icons"

type IconComponent = (props: { size?: number }) => JSX.Element

const ICONS: Array<{ name: string; Icon: IconComponent }> = [
	{ name: "FileIcon", Icon: FileIcon },
	{ name: "LoaderIcon", Icon: LoaderIcon },
	{ name: "PencilEditIcon", Icon: PencilEditIcon },
	{ name: "TrashIcon", Icon: TrashIcon },
	{ name: "MoreHorizontalIcon", Icon: MoreHorizontalIcon },
	{ name: "MessageIcon", Icon: MessageIcon },
	{ name: "CrossIcon", Icon: CrossIcon },
	{ name: "CrossSmallIcon", Icon: CrossSmallIcon },
	{ name: "SidebarLeftIcon", Icon: SidebarLeftIcon },
	{ name: "PlusIcon", Icon: PlusIcon },
	{ name: "CopyIcon", Icon: CopyIcon },
	{ name: "ThumbUpIcon", Icon: ThumbUpIcon },
	{ name: "ThumbDownIcon", Icon: ThumbDownIcon },
	{ name: "ChevronDownIcon", Icon: ChevronDownIcon },
	{ name: "SparklesIcon", Icon: SparklesIcon },
	{ name: "CheckCircleFillIcon", Icon: CheckCircleFillIcon },
	{ name: "GlobeIcon", Icon: GlobeIcon },
	{ name: "LockIcon", Icon: LockIcon },
	{ name: "ShareIcon", Icon: ShareIcon },
	{ name: "CodeIcon", Icon: CodeIcon },
	{ name: "PlayIcon", Icon: PlayIcon },
	{ name: "TerminalWindowIcon", Icon: TerminalWindowIcon },
	{ name: "ImageIcon", Icon: ImageIcon },
	{ name: "FullscreenIcon", Icon: FullscreenIcon },
]

describe("icons.tsx deep coverage", () => {
	it("renders every SVG icon component with the provided size", () => {
		const { container } = render(
			<div>
				{ICONS.map(({ name, Icon }) => (
					<div data-testid={`icon-${name}`} key={name}>
						<Icon size={20} />
					</div>
				))}
			</div>,
		)

		for (const { name } of ICONS) {
			expect(screen.getByTestId(`icon-${name}`)).toBeInTheDocument()
		}

		const svgs = Array.from(container.querySelectorAll("svg"))
		expect(svgs.length).toBe(ICONS.length)
		for (const svg of svgs) {
			expect(svg).toHaveAttribute("height", "20")
			expect(svg).toHaveAttribute("width", "20")
		}
	})

	it("forwards extra SVG props on icons that accept React.SVGProps", () => {
		render(
			<div>
				<ArrowUpIcon size={18} data-testid="arrow-up" style={{ opacity: 0.4 }} />
				<StopIcon size={18} data-testid="stop" style={{ opacity: 0.6 }} />
				<PaperclipIcon size={18} data-testid="paperclip" style={{ opacity: 0.8 }} />
			</div>,
		)

		expect(screen.getByTestId("arrow-up")).toHaveAttribute("width", "18")
		expect(screen.getByTestId("stop")).toHaveAttribute("width", "18")
		expect(screen.getByTestId("paperclip")).toHaveAttribute("width", "18")

		expect(screen.getByTestId("arrow-up")).toHaveAttribute(
			"style",
			expect.stringContaining("opacity: 0.4"),
		)
		expect(screen.getByTestId("stop")).toHaveAttribute(
			"style",
			expect.stringContaining("opacity: 0.6"),
		)
		expect(screen.getByTestId("paperclip")).toHaveAttribute(
			"style",
			expect.stringContaining("opacity: 0.8"),
		)
	})
})
