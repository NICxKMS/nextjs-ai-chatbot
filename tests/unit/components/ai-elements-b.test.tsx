// @vitest-environment jsdom
import { render } from "@testing-library/react"
import React from "react"
import { beforeAll, describe, expect, it, vi } from "vitest"

type MockElementProps = {
	children?: React.ReactNode
	[key: string]: unknown
}

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}))

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) =>
		React.createElement("img", { alt, src }),
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("react-jsx-parser", () => ({
	default: ({
		jsx,
		renderInWrapper: _renderInWrapper,
		...props
	}: {
		jsx: string
		renderInWrapper?: unknown
		[key: string]: unknown
	}) => React.createElement("div", props, jsx),
}))

vi.mock("motion/react", () => ({
	motion: {
		create:
			(tag: string) =>
			({
				children,
				animate: _animate,
				initial: _initial,
				transition: _transition,
				...props
			}: MockElementProps) =>
				React.createElement(tag, props, children),
	},
}))

vi.mock("streamdown", () => ({
	Streamdown: ({ children, plugins: _plugins, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
}))

vi.mock("@streamdown/cjk", () => ({ cjk: {} }))
vi.mock("@streamdown/code", () => ({ code: {} }))
vi.mock("@streamdown/math", () => ({ math: {} }))
vi.mock("@streamdown/mermaid", () => ({ mermaid: {} }))

vi.mock("@xyflow/react", () => ({
	Handle: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
	Panel: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
	Position: {
		Bottom: "bottom",
		Left: "left",
		Right: "right",
		Top: "top",
	},
}))

vi.mock("@rive-app/react-webgl2", () => ({
	useRive: () => ({
		rive: {},
		RiveComponent: ({ className }: { className?: string }) =>
			React.createElement("div", { className, "data-testid": "rive-component" }),
	}),
	useStateMachineInput: () => ({ value: false }),
	useViewModel: () => null,
	useViewModelInstance: () => null,
	useViewModelInstanceColor: () => null,
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

const mediaDevicesMock = {
	addEventListener: vi.fn(),
	enumerateDevices: vi.fn().mockResolvedValue([
		{
			deviceId: "mic-1",
			groupId: "group-1",
			kind: "audioinput",
			label: "Microphone (1234:5678)",
			toJSON: () => ({}),
		} as MediaDeviceInfo,
	]),
	getUserMedia: vi.fn().mockResolvedValue({
		getTracks: () => [{ stop: vi.fn() }],
	}),
	removeEventListener: vi.fn(),
}

Object.defineProperty(navigator, "mediaDevices", {
	configurable: true,
	value: mediaDevicesMock,
})

if (!navigator.clipboard) {
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: {
			writeText: vi.fn().mockResolvedValue(undefined),
		},
	})
}

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
		configurable: true,
		value: vi.fn(),
	})
})

import {
	InlineCitation,
	InlineCitationCard,
	InlineCitationCardBody,
	InlineCitationCardTrigger,
	InlineCitationText,
} from "@/components/ai-elements/inline-citation"
import { JSXPreview, JSXPreviewContent } from "@/components/ai-elements/jsx-preview"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
	MicSelector,
	MicSelectorContent,
	MicSelectorInput,
	MicSelectorList,
	MicSelectorTrigger,
} from "@/components/ai-elements/mic-selector"
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import {
	Node,
	NodeContent,
	NodeDescription,
	NodeFooter,
	NodeHeader,
	NodeTitle,
} from "@/components/ai-elements/node"
import {
	OpenIn,
	OpenInChatGPT,
	OpenInContent,
	OpenInLabel,
	OpenInTrigger,
} from "@/components/ai-elements/open-in-chat"
import { PackageInfo } from "@/components/ai-elements/package-info"
import { Panel } from "@/components/ai-elements/panel"
import { Persona } from "@/components/ai-elements/persona"
import {
	Plan,
	PlanAction,
	PlanContent,
	PlanDescription,
	PlanFooter,
	PlanHeader,
	PlanTitle,
	PlanTrigger,
} from "@/components/ai-elements/plan"
import {
	PromptInput,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
	Queue,
	QueueItem,
	QueueItemContent,
	QueueItemIndicator,
	QueueList,
	QueueSection,
	QueueSectionContent,
	QueueSectionLabel,
	QueueSectionTrigger,
} from "@/components/ai-elements/queue"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import {
	Sandbox,
	SandboxContent,
	SandboxHeader,
	SandboxTabContent,
	SandboxTabs,
	SandboxTabsBar,
	SandboxTabsList,
	SandboxTabsTrigger,
} from "@/components/ai-elements/sandbox"
import { SchemaDisplay } from "@/components/ai-elements/schema-display"
import { Shimmer } from "@/components/ai-elements/shimmer"
import {
	Snippet,
	SnippetAddon,
	SnippetCopyButton,
	SnippetInput,
	SnippetText,
} from "@/components/ai-elements/snippet"

const assertSmokeRender = (element: React.ReactElement) => {
	const { container } = render(element)
	expect(container.firstChild).not.toBeNull()
}

describe("InlineCitation", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<InlineCitation>
				<InlineCitationText>source</InlineCitationText>
				<InlineCitationCard>
					<InlineCitationCardTrigger sources={["https://example.com/reference"]} />
					<InlineCitationCardBody>Reference body</InlineCitationCardBody>
				</InlineCitationCard>
			</InlineCitation>,
		)
	})
})

describe("JSXPreview", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<JSXPreview jsx="<div>Hello</div>">
				<JSXPreviewContent />
			</JSXPreview>,
		)
	})
})

describe("Message", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Message from="assistant">
				<MessageContent>Hello from assistant</MessageContent>
			</Message>,
		)
	})
})

describe("MicSelector", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<MicSelector>
				<MicSelectorTrigger>Select mic</MicSelectorTrigger>
				<MicSelectorContent>
					<MicSelectorInput />
					<MicSelectorList>
						{(devices) =>
							devices.map((device) => <div key={device.deviceId}>{device.label}</div>)
						}
					</MicSelectorList>
				</MicSelectorContent>
			</MicSelector>,
		)
	})
})

describe("ModelSelector", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<ModelSelector open>
				<ModelSelectorTrigger asChild>
					<button type="button">Open model selector</button>
				</ModelSelectorTrigger>
				<ModelSelectorContent>
					<ModelSelectorInput placeholder="Search models" />
					<ModelSelectorList>
						<ModelSelectorGroup heading="Popular">
							<ModelSelectorItem value="gpt-4o">GPT-4o</ModelSelectorItem>
						</ModelSelectorGroup>
					</ModelSelectorList>
				</ModelSelectorContent>
			</ModelSelector>,
		)
	})
})

describe("Node", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Node handles={{ source: true, target: true }}>
				<NodeHeader>
					<NodeTitle>Node title</NodeTitle>
					<NodeDescription>Node description</NodeDescription>
				</NodeHeader>
				<NodeContent>Node content</NodeContent>
				<NodeFooter>Node footer</NodeFooter>
			</Node>,
		)
	})
})

describe("OpenIn", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<OpenIn open query="Write a migration plan">
				<OpenInTrigger asChild>
					<button type="button">Open in chat</button>
				</OpenInTrigger>
				<OpenInContent>
					<OpenInLabel>Destinations</OpenInLabel>
					<OpenInChatGPT />
				</OpenInContent>
			</OpenIn>,
		)
	})
})

describe("PackageInfo", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<PackageInfo
				changeType="major"
				currentVersion="15.0.0"
				name="next"
				newVersion="16.0.0"
			/>,
		)
	})
})

describe("Panel", () => {
	it("renders without crashing", () => {
		assertSmokeRender(<Panel position="top-left">Panel content</Panel>)
	})
})

describe("Persona", () => {
	it("renders without crashing", () => {
		assertSmokeRender(<Persona state="idle" />)
	})
})

describe("Plan", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Plan open>
				<PlanHeader>
					<div>
						<PlanTitle>Build smoke tests</PlanTitle>
						<PlanDescription>Cover ai-elements batch B</PlanDescription>
					</div>
					<PlanAction>
						<PlanTrigger />
					</PlanAction>
				</PlanHeader>
				<PlanContent>Body</PlanContent>
				<PlanFooter>Footer</PlanFooter>
			</Plan>,
		)
	})
})

describe("PromptInput", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<PromptInput onSubmit={vi.fn()}>
				<PromptInputBody>
					<PromptInputTextarea aria-label="Prompt" />
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<PromptInputButton>Action</PromptInputButton>
					</PromptInputTools>
					<PromptInputSubmit />
				</PromptInputFooter>
			</PromptInput>,
		)
	})
})

describe("Queue", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Queue>
				<QueueSection defaultOpen>
					<QueueSectionTrigger>
						<QueueSectionLabel count={1} label="task" />
					</QueueSectionTrigger>
					<QueueSectionContent>
						<QueueList>
							<QueueItem>
								<div className="flex items-start gap-2">
									<QueueItemIndicator />
									<QueueItemContent>Write tests</QueueItemContent>
								</div>
							</QueueItem>
						</QueueList>
					</QueueSectionContent>
				</QueueSection>
			</Queue>,
		)
	})
})

describe("Reasoning", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Reasoning>
				<ReasoningTrigger />
				<ReasoningContent>Thinking steps</ReasoningContent>
			</Reasoning>,
		)
	})
})

describe("Sandbox", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Sandbox defaultOpen>
				<SandboxHeader state="output-available" title="Sandbox" />
				<SandboxContent>
					<SandboxTabs defaultValue="code">
						<SandboxTabsBar>
							<SandboxTabsList>
								<SandboxTabsTrigger value="code">Code</SandboxTabsTrigger>
							</SandboxTabsList>
						</SandboxTabsBar>
						<SandboxTabContent value="code">console.log(1)</SandboxTabContent>
					</SandboxTabs>
				</SandboxContent>
			</Sandbox>,
		)
	})
})

describe("SchemaDisplay", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<SchemaDisplay
				description="Get a user by id"
				method="GET"
				parameters={[
					{
						description: "User id",
						location: "path",
						name: "id",
						required: true,
						type: "string",
					},
				]}
				path="/api/users/{id}"
			/>,
		)
	})
})

describe("Shimmer", () => {
	it("renders without crashing", () => {
		assertSmokeRender(<Shimmer>Loading content</Shimmer>)
	})
})

describe("Snippet", () => {
	it("renders without crashing", () => {
		assertSmokeRender(
			<Snippet code="pnpm test:unit">
				<SnippetAddon>
					<SnippetText>$</SnippetText>
				</SnippetAddon>
				<SnippetInput />
				<SnippetAddon align="inline-end">
					<SnippetCopyButton />
				</SnippetAddon>
			</Snippet>,
		)
	})
})
