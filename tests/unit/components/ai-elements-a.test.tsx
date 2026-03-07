// @vitest-environment jsdom
import { render } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

const backgroundPropsSpy = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}))

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) =>
		React.createElement("img", { src, alt }),
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("@shikijs/twoslash", () => ({}))

vi.mock("tokenlens", () => ({
	getUsage: () => ({
		costUSD: {
			totalUSD: 0,
		},
	}),
}))

vi.mock("shiki", () => ({
	createHighlighter: vi.fn().mockResolvedValue({
		codeToTokens: () => ({
			bg: "transparent",
			fg: "inherit",
			tokens: [[{ content: "", color: "inherit" }]],
		}),
		getLoadedLanguages: () => ["json", "text", "typescript"],
	}),
}))

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get: (_target, tag) => {
				const element = typeof tag === "string" ? tag : "div"
				return ({
					animate,
					children,
					exit,
					initial,
					layout,
					layoutId,
					...props
				}: {
					animate?: unknown
					children?: React.ReactNode
					exit?: unknown
					initial?: unknown
					[key: string]: unknown
					layout?: unknown
					layoutId?: unknown
				}) => React.createElement(element, props, children)
			},
		},
	),
	AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("media-chrome/react", () => {
	const Mock = ({
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
	}

	return {
		MediaController: Mock,
		MediaControlBar: Mock,
		MediaDurationDisplay: Mock,
		MediaMuteButton: Mock,
		MediaPlayButton: Mock,
		MediaSeekBackwardButton: Mock,
		MediaSeekForwardButton: Mock,
		MediaTimeDisplay: Mock,
		MediaTimeRange: Mock,
		MediaVolumeRange: Mock,
	}
})

vi.mock("@xyflow/react", () => {
	const Mock = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children)
	const ReactFlow = ({
		children,
		deleteKeyCode,
		fitView,
		panOnDrag,
		panOnScroll,
		selectionOnDrag,
		zoomOnDoubleClick,
		...props
	}: {
		children?: React.ReactNode
		deleteKeyCode?: unknown
		fitView?: boolean
		panOnDrag?: boolean
		panOnScroll?: boolean
		selectionOnDrag?: boolean
		zoomOnDoubleClick?: boolean
		[key: string]: unknown
	}) => {
		void deleteKeyCode
		void fitView
		void panOnDrag
		void panOnScroll
		void selectionOnDrag
		void zoomOnDoubleClick
		return React.createElement("div", props, children)
	}
	const Background = ({
		children,
		bgColor,
		...props
	}: {
		children?: React.ReactNode
		bgColor?: string
		[key: string]: unknown
	}) => {
		backgroundPropsSpy({ bgColor, ...props })
		return React.createElement("div", props, children)
	}

	return {
		Background,
		BaseEdge: ({ path, ...props }: { path?: string; [key: string]: unknown }) =>
			React.createElement("path", { d: path, ...props }),
		Controls: Mock,
		Position: {
			Bottom: "bottom",
			Left: "left",
			Right: "right",
			Top: "top",
		},
		ReactFlow,
		getBezierPath: () => ["M0,0 C0,0 0,0 0,0"],
		getSimpleBezierPath: () => ["M0,0 C0,0 0,0 0,0"],
		useInternalNode: () => ({
			internals: {
				handleBounds: {
					source: [{ height: 10, position: "right", width: 10, x: 0, y: 0 }],
					target: [{ height: 10, position: "left", width: 10, x: 0, y: 0 }],
				},
				positionAbsolute: { x: 0, y: 0 },
			},
		}),
	}
})

vi.mock("@xyflow/react/dist/style.css", () => ({}))

vi.mock("use-stick-to-bottom", () => {
	const StickToBottom = ({
		children,
		initial,
		resize,
		...props
	}: {
		children?: React.ReactNode
		initial?: string
		[key: string]: unknown
		resize?: string
	}) => {
		void initial
		void resize
		return React.createElement("div", props, children)
	}

	StickToBottom.Content = ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children)

	return {
		StickToBottom,
		useStickToBottomContext: () => ({
			isAtBottom: true,
			scrollToBottom: vi.fn(),
		}),
	}
})

global.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
global.HTMLMediaElement.prototype.pause = vi.fn()

import { Agent } from "@/components/ai-elements/agent"
import { Artifact } from "@/components/ai-elements/artifact"
import { Attachment, Attachments } from "@/components/ai-elements/attachments"
import { AudioPlayer, AudioPlayerElement } from "@/components/ai-elements/audio-player"
import { Canvas } from "@/components/ai-elements/canvas"
import { ChainOfThought, ChainOfThoughtHeader } from "@/components/ai-elements/chain-of-thought"
import { Checkpoint } from "@/components/ai-elements/checkpoint"
import { CodeBlock } from "@/components/ai-elements/code-block"
import { Commit } from "@/components/ai-elements/commit"
import { Confirmation } from "@/components/ai-elements/confirmation"
import { Connection } from "@/components/ai-elements/connection"
import { Context, ContextTrigger } from "@/components/ai-elements/context"
import { Controls } from "@/components/ai-elements/controls"
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation"
import { Edge } from "@/components/ai-elements/edge"
import {
	EnvironmentVariable,
	EnvironmentVariables,
} from "@/components/ai-elements/environment-variables"
import { FileTree, FileTreeFile } from "@/components/ai-elements/file-tree"
import { Image } from "@/components/ai-elements/image"

const assertSmokeRender = (element: React.ReactElement) => {
	const { container } = render(element)
	expect(container).toBeDefined()
	expect(container.firstChild).not.toBeNull()
}

describe("Agent", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(<Agent>agent</Agent>)
	})
})

describe("Artifact", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(<Artifact>artifact</Artifact>)
	})
})

describe("Attachments", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<Attachments>
				<Attachment
					data={{
						filename: "note.txt",
						id: "attachment-1",
						mediaType: "text/plain",
						type: "file",
						url: "https://example.com/note.txt",
					}}
				/>
			</Attachments>,
		)
	})
})

describe("AudioPlayer", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<AudioPlayer>
				<AudioPlayerElement src="https://example.com/audio.mp3" />
			</AudioPlayer>,
		)
	})
})

describe("Canvas", () => {
	it("renders without crashing given required props", () => {
		backgroundPropsSpy.mockClear()
		assertSmokeRender(<Canvas edges={[]} nodes={[]} />)
		expect(backgroundPropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({ bgColor: "var(--sidebar)" }),
		)
	})
})

describe("ChainOfThought", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<ChainOfThought>
				<ChainOfThoughtHeader />
			</ChainOfThought>,
		)
	})
})

describe("Checkpoint", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(<Checkpoint>checkpoint</Checkpoint>)
	})
})

describe("CodeBlock", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(<CodeBlock code="const x = 1" language="typescript" />)
	})
})

describe("Commit", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(<Commit open />)
	})
})

describe("Confirmation", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<Confirmation
				approval={{ approved: true, id: "approval-1" }}
				state={"approval-responded"}
			>
				approved
			</Confirmation>,
		)
	})
})

describe("Connection", () => {
	it("renders without crashing given required props", () => {
		const connectionProps = {
			fromX: 0,
			fromY: 0,
			toX: 10,
			toY: 10,
		} as unknown as React.ComponentProps<typeof Connection>

		assertSmokeRender(
			<svg aria-label="connection preview" role="img">
				<title>Connection preview</title>
				<Connection {...connectionProps} />
			</svg>,
		)
	})
})

describe("Context", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<Context maxTokens={100} usedTokens={10}>
				<ContextTrigger />
			</Context>,
		)
	})
})

describe("Controls", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(<Controls />)
	})
})

describe("Conversation", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<Conversation>
				<ConversationContent>
					<div>message</div>
				</ConversationContent>
			</Conversation>,
		)
	})
})

describe("Edge", () => {
	it("renders without crashing given required props", () => {
		const edgeProps = {
			id: "edge-1",
			sourcePosition: "right",
			sourceX: 0,
			sourceY: 0,
			targetPosition: "left",
			targetX: 10,
			targetY: 10,
		} as unknown as React.ComponentProps<typeof Edge.Temporary>

		assertSmokeRender(
			<svg aria-label="edge preview" role="img">
				<title>Edge preview</title>
				<Edge.Temporary {...edgeProps} />
			</svg>,
		)
	})
})

describe("EnvironmentVariables", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<EnvironmentVariables>
				<EnvironmentVariable name="API_KEY" value="secret" />
			</EnvironmentVariables>,
		)
	})
})

describe("FileTree", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<FileTree>
				<FileTreeFile name="readme.md" path="/readme.md" />
			</FileTree>,
		)
	})
})

describe("Image", () => {
	it("renders without crashing given required props", () => {
		assertSmokeRender(
			<Image base64="aGVsbG8=" mediaType="image/png" uint8Array={new Uint8Array([1])} />,
		)
	})
})
