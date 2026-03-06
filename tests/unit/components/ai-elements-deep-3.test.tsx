// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

type MockElementProps = {
	children?: React.ReactNode
	[key: string]: unknown
}

const testState = vi.hoisted(() => {
	const state = {
		bezierPath: "M10 10 C20 20 30 30 40 40",
		carouselSelectedSnap: 0,
		carouselSelectHandler: undefined as undefined | (() => void),
		internalNodes: {} as Record<string, unknown>,
		simpleBezierPath: "M0 0 C5 5 10 10 15 15",
		usageCostUsd: 0,
	}

	const carouselApi = {
		on: vi.fn((_event: string, handler: () => void) => {
			state.carouselSelectHandler = handler
		}),
		off: vi.fn((_event: string, handler: () => void) => {
			if (state.carouselSelectHandler === handler) {
				state.carouselSelectHandler = undefined
			}
		}),
		scrollNext: vi.fn(),
		scrollPrev: vi.fn(),
		scrollSnapList: vi.fn(() => [0, 1, 2]),
		selectedScrollSnap: vi.fn(() => state.carouselSelectedSnap),
	}

	const getBezierPath = vi.fn(() => [state.bezierPath])
	const getSimpleBezierPath = vi.fn(() => [state.simpleBezierPath])
	const useInternalNode = vi.fn((nodeId: string) => state.internalNodes[nodeId] ?? null)
	const getUsageMock = vi.fn(() => ({ costUSD: { totalUSD: state.usageCostUsd } }))

	return {
		carouselApi,
		getBezierPath,
		getSimpleBezierPath,
		getUsageMock,
		state,
		useInternalNode,
	}
})

vi.mock("@/components/ui/badge", () => ({
	Badge: ({ children, variant: _variant, ...props }: MockElementProps & { variant?: string }) =>
		React.createElement("span", props, children),
}))

vi.mock("@/components/ui/carousel", () => ({
	Carousel: ({
		children,
		setApi,
		...props
	}: MockElementProps & { setApi?: (api: unknown) => void }) => {
		React.useEffect(() => {
			setApi?.(testState.carouselApi)
		}, [setApi])

		return React.createElement("div", props, children)
	},
	CarouselContent: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
	CarouselItem: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
}))

vi.mock("@/components/ui/hover-card", () => ({
	HoverCard: ({
		children,
		closeDelay: _closeDelay,
		openDelay: _openDelay,
		...props
	}: MockElementProps & { closeDelay?: number; openDelay?: number }) =>
		React.createElement("div", props, children),
	HoverCardContent: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
	HoverCardTrigger: ({
		children,
		asChild,
		...props
	}: MockElementProps & { asChild?: boolean }) =>
		asChild
			? React.createElement(React.Fragment, null, children)
			: React.createElement("div", props, children),
}))

vi.mock("@/components/ui/alert", () => ({
	Alert: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", props, children),
	AlertDescription: ({ children, ...props }: MockElementProps) =>
		React.createElement("p", props, children),
}))

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		type,
		variant: _variant,
		...props
	}: MockElementProps & { type?: string }) =>
		React.createElement("button", { ...props, type: type ?? "button" }, children),
}))

vi.mock("@/components/ui/progress", () => ({
	Progress: ({ value, ...props }: MockElementProps & { value?: number }) =>
		React.createElement("div", { "data-value": value, role: "progressbar", ...props }),
}))

vi.mock("tokenlens", () => ({
	getUsage: testState.getUsageMock,
}))

vi.mock("@xyflow/react", () => ({
	Handle: ({ type, position }: any) =>
		React.createElement("div", { "data-handle": `${type}-${position}` }),
	Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
	NodeResizer: () => null,
	BaseEdge: ({ id, path, ...props }: MockElementProps & { id?: string; path?: string }) =>
		React.createElement("path", {
			"data-path": path,
			"data-testid": `base-edge-${id ?? "unknown"}`,
			...props,
		}),
	getBezierPath: testState.getBezierPath,
	getSimpleBezierPath: testState.getSimpleBezierPath,
	useInternalNode: testState.useInternalNode,
}))

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get:
				(_, tag) =>
				({ children, ...p }: any) =>
					React.createElement(String(tag), p, children),
		},
	),
	AnimatePresence: ({ children }: any) => children,
}))

import {
	Confirmation,
	ConfirmationAccepted,
	ConfirmationAction,
	ConfirmationActions,
	ConfirmationRejected,
	ConfirmationRequest,
	ConfirmationTitle,
} from "@/components/ai-elements/confirmation"
import {
	Context,
	ContextCacheUsage,
	ContextContent,
	ContextContentBody,
	ContextContentFooter,
	ContextContentHeader,
	ContextInputUsage,
	ContextOutputUsage,
	ContextReasoningUsage,
	ContextTrigger,
} from "@/components/ai-elements/context"
import { Edge } from "@/components/ai-elements/edge"
import {
	InlineCitation,
	InlineCitationCard,
	InlineCitationCardBody,
	InlineCitationCardTrigger,
	InlineCitationCarousel,
	InlineCitationCarouselContent,
	InlineCitationCarouselHeader,
	InlineCitationCarouselIndex,
	InlineCitationCarouselItem,
	InlineCitationCarouselNext,
	InlineCitationCarouselPrev,
	InlineCitationQuote,
	InlineCitationSource,
	InlineCitationText,
} from "@/components/ai-elements/inline-citation"

beforeEach(() => {
	vi.clearAllMocks()
	testState.state.carouselSelectedSnap = 0
	testState.state.carouselSelectHandler = undefined
	testState.state.internalNodes = {}
	testState.state.usageCostUsd = 0
})

const renderWithContext = (
	children: React.ReactNode,
	props: Partial<React.ComponentProps<typeof Context>> = {},
) =>
	render(
		<Context maxTokens={1000} usedTokens={250} {...props}>
			{children}
		</Context>,
	)

const createUsage = (usage: Record<string, number>) =>
	usage as unknown as React.ComponentProps<typeof Context>["usage"]

const toAnimatedEdgeProps = (props: Record<string, unknown>) =>
	props as unknown as React.ComponentProps<typeof Edge.Animated>

const toTemporaryEdgeProps = (props: Record<string, unknown>) =>
	props as unknown as React.ComponentProps<typeof Edge.Temporary>

describe("InlineCitation deep coverage", () => {
	it("renders primitives, optional source fields, and quote", () => {
		render(
			<>
				<InlineCitation data-testid="inline-citation">
					<InlineCitationText>Citation text</InlineCitationText>
				</InlineCitation>
				<InlineCitationSource
					description="A concise summary"
					title="Reference title"
					url="https://example.com/docs"
				>
					<span>Extra source child</span>
				</InlineCitationSource>
				<InlineCitationQuote>Quoted evidence</InlineCitationQuote>
			</>,
		)

		expect(screen.getByTestId("inline-citation")).toBeTruthy()
		expect(screen.getByText("Citation text")).toBeTruthy()
		expect(screen.getByText("Reference title")).toBeTruthy()
		expect(screen.getByText("https://example.com/docs")).toBeTruthy()
		expect(screen.getByText("A concise summary")).toBeTruthy()
		expect(screen.getByText("Extra source child")).toBeTruthy()
		expect(screen.getByText("Quoted evidence")).toBeTruthy()
	})

	it("renders card trigger hostname with source count and unknown fallback", () => {
		const { rerender } = render(
			<InlineCitationCard>
				<InlineCitationCardTrigger
					sources={["https://docs.example.com/page-1", "https://docs.example.com/page-2"]}
				/>
				<InlineCitationCardBody>Card body</InlineCitationCardBody>
			</InlineCitationCard>,
		)

		expect(screen.getByText(/docs\.example\.com\s+\+1/)).toBeTruthy()
		expect(screen.getByText("Card body")).toBeTruthy()

		rerender(
			<InlineCitationCard>
				<InlineCitationCardTrigger sources={[]} />
			</InlineCitationCard>,
		)

		expect(screen.getByText("unknown")).toBeTruthy()
	})

	it("updates carousel index and wires previous and next handlers", async () => {
		const view = render(
			<InlineCitationCarousel>
				<InlineCitationCarouselHeader>
					<InlineCitationCarouselPrev />
					<InlineCitationCarouselIndex />
					<InlineCitationCarouselNext />
				</InlineCitationCarouselHeader>
				<InlineCitationCarouselContent>
					<InlineCitationCarouselItem>Slide</InlineCitationCarouselItem>
				</InlineCitationCarouselContent>
			</InlineCitationCarousel>,
		)

		expect(await screen.findByText("1/3")).toBeTruthy()

		fireEvent.click(screen.getByLabelText("Previous"))
		fireEvent.click(screen.getByLabelText("Next"))

		expect(testState.carouselApi.scrollPrev).toHaveBeenCalledTimes(1)
		expect(testState.carouselApi.scrollNext).toHaveBeenCalledTimes(1)

		act(() => {
			testState.state.carouselSelectedSnap = 2
			testState.state.carouselSelectHandler?.()
		})

		expect(screen.getByText("3/3")).toBeTruthy()

		const selectHandler = testState.carouselApi.on.mock.calls[0]?.[1]
		view.unmount()

		expect(testState.carouselApi.on).toHaveBeenCalledWith("select", expect.any(Function))
		expect(testState.carouselApi.off).toHaveBeenCalledWith("select", selectHandler)
	})

	it("falls back gracefully when carousel api is absent and supports custom index content", () => {
		render(
			<>
				<InlineCitationCarouselIndex />
				<InlineCitationCarouselIndex>custom index</InlineCitationCarouselIndex>
				<InlineCitationCarouselPrev />
				<InlineCitationCarouselNext />
			</>,
		)

		expect(screen.getByText("0/0")).toBeTruthy()
		expect(screen.getByText("custom index")).toBeTruthy()

		fireEvent.click(screen.getByLabelText("Previous"))
		fireEvent.click(screen.getByLabelText("Next"))

		expect(testState.carouselApi.scrollPrev).not.toHaveBeenCalled()
		expect(testState.carouselApi.scrollNext).not.toHaveBeenCalled()
	})
})

describe("Confirmation deep coverage", () => {
	it("throws when consumers are rendered outside Confirmation context", () => {
		expect(() => render(<ConfirmationRequest>request</ConfirmationRequest>)).toThrow(
			"Confirmation components must be used within Confirmation",
		)
	})

	it("returns null when approval is missing or state is hidden", () => {
		const { container, rerender } = render(
			<Confirmation state="approval-requested">Missing approval</Confirmation>,
		)

		expect(container.firstChild).toBeNull()

		rerender(
			<Confirmation approval={{ id: "approval-1" }} state="input-streaming">
				Streaming state
			</Confirmation>,
		)
		expect(container.firstChild).toBeNull()

		rerender(
			<Confirmation approval={{ id: "approval-1" }} state="input-available">
				Input available state
			</Confirmation>,
		)
		expect(container.firstChild).toBeNull()
	})

	it("renders request content and actions only for approval-requested state", () => {
		render(
			<Confirmation approval={{ id: "approval-2" }} state="approval-requested">
				<ConfirmationTitle>Needs approval</ConfirmationTitle>
				<ConfirmationRequest>Pending approval</ConfirmationRequest>
				<ConfirmationActions>
					<ConfirmationAction>Approve</ConfirmationAction>
				</ConfirmationActions>
				<ConfirmationAccepted>Accepted</ConfirmationAccepted>
				<ConfirmationRejected>Rejected</ConfirmationRejected>
			</Confirmation>,
		)

		expect(screen.getByText("Needs approval")).toBeTruthy()
		expect(screen.getByText("Pending approval")).toBeTruthy()
		expect(screen.getByRole("button", { name: "Approve" }).getAttribute("type")).toBe("button")
		expect(screen.queryByText("Accepted")).toBeNull()
		expect(screen.queryByText("Rejected")).toBeNull()
	})

	it.each([
		"approval-responded",
		"output-denied",
		"output-available",
	] as const)("shows accepted content for %s state when approval is true", (state) => {
		render(
			<Confirmation approval={{ approved: true, id: "approval-3" }} state={state}>
				<ConfirmationAccepted>Accepted branch</ConfirmationAccepted>
			</Confirmation>,
		)

		expect(screen.getByText("Accepted branch")).toBeTruthy()
	})

	it("hides accepted content for non-response states or rejected approvals", () => {
		const { rerender } = render(
			<Confirmation
				approval={{ approved: true, id: "approval-4" }}
				state="approval-requested"
			>
				<ConfirmationAccepted>Accepted branch</ConfirmationAccepted>
			</Confirmation>,
		)

		expect(screen.queryByText("Accepted branch")).toBeNull()

		rerender(
			<Confirmation approval={{ approved: false, id: "approval-4" }} state="output-available">
				<ConfirmationAccepted>Accepted branch</ConfirmationAccepted>
			</Confirmation>,
		)

		expect(screen.queryByText("Accepted branch")).toBeNull()
	})

	it.each([
		"approval-responded",
		"output-denied",
		"output-available",
	] as const)("shows rejected content for %s state when approval is false", (state) => {
		render(
			<Confirmation approval={{ approved: false, id: "approval-5" }} state={state}>
				<ConfirmationRejected>Rejected branch</ConfirmationRejected>
			</Confirmation>,
		)

		expect(screen.getByText("Rejected branch")).toBeTruthy()
	})

	it("hides rejected content for non-response states or approved approvals", () => {
		const { rerender } = render(
			<Confirmation
				approval={{ approved: false, id: "approval-6" }}
				state="approval-requested"
			>
				<ConfirmationRejected>Rejected branch</ConfirmationRejected>
			</Confirmation>,
		)

		expect(screen.queryByText("Rejected branch")).toBeNull()

		rerender(
			<Confirmation approval={{ approved: true, id: "approval-6" }} state="output-available">
				<ConfirmationRejected>Rejected branch</ConfirmationRejected>
			</Confirmation>,
		)

		expect(screen.queryByText("Rejected branch")).toBeNull()
	})

	it("hides request and action sections outside approval-requested", () => {
		render(
			<Confirmation approval={{ approved: true, id: "approval-7" }} state="output-available">
				<ConfirmationRequest>Request content</ConfirmationRequest>
				<ConfirmationActions>
					<ConfirmationAction>Action</ConfirmationAction>
				</ConfirmationActions>
			</Confirmation>,
		)

		expect(screen.queryByText("Request content")).toBeNull()
		expect(screen.queryByRole("button", { name: "Action" })).toBeNull()
	})
})

describe("Edge deep coverage", () => {
	it("renders Temporary edge with simple bezier path and dashed stroke", () => {
		const edgeProps = toTemporaryEdgeProps({
			id: "temp-edge",
			sourcePosition: "right",
			sourceX: 10,
			sourceY: 20,
			targetPosition: "left",
			targetX: 30,
			targetY: 40,
		})

		const { container } = render(
			<svg>
				<title>Temporary edge</title>
				<Edge.Temporary {...edgeProps} />
			</svg>,
		)

		expect(testState.getSimpleBezierPath).toHaveBeenCalledWith({
			sourcePosition: "right",
			sourceX: 10,
			sourceY: 20,
			targetPosition: "left",
			targetX: 30,
			targetY: 40,
		})

		const edge = container.querySelector('[data-testid="base-edge-temp-edge"]')
		expect(edge).toBeTruthy()
		expect(edge?.getAttribute("data-path")).toBe(testState.state.simpleBezierPath)
		expect(edge?.getAttribute("style") ?? "").toContain("stroke-dasharray: 5, 5")
	})

	it("returns null for Animated when either node is missing", () => {
		testState.state.internalNodes = {}
		const edgeProps = toAnimatedEdgeProps({
			id: "animated-edge",
			source: "source",
			sourcePosition: "right",
			sourceX: 0,
			sourceY: 0,
			target: "target",
			targetPosition: "left",
			targetX: 0,
			targetY: 0,
		})

		const { container } = render(
			<svg>
				<title>Animated edge missing nodes</title>
				<Edge.Animated {...edgeProps} />
			</svg>,
		)

		expect(container.querySelector('[data-testid="base-edge-animated-edge"]')).toBeNull()
		expect(container.querySelector("circle")).toBeNull()
	})

	it("renders Animated edge and computes coordinates from source/target handles", () => {
		testState.state.internalNodes = {
			source: {
				internals: {
					handleBounds: {
						source: [{ height: 8, position: "right", width: 10, x: 5, y: 6 }],
					},
					positionAbsolute: { x: 100, y: 200 },
				},
			},
			target: {
				internals: {
					handleBounds: {
						target: [{ height: 6, position: "left", width: 12, x: 1, y: 2 }],
					},
					positionAbsolute: { x: 300, y: 400 },
				},
			},
		}

		const edgeProps = toAnimatedEdgeProps({
			id: "animated-edge",
			markerEnd: "url(#marker)",
			source: "source",
			sourcePosition: "right",
			sourceX: 0,
			sourceY: 0,
			target: "target",
			targetPosition: "left",
			targetX: 0,
			targetY: 0,
		})

		const { container } = render(
			<svg>
				<title>Animated edge with handles</title>
				<Edge.Animated {...edgeProps} />
			</svg>,
		)

		expect(testState.getBezierPath).toHaveBeenCalledWith({
			sourcePosition: "right",
			sourceX: 115,
			sourceY: 210,
			targetPosition: "left",
			targetX: 301,
			targetY: 405,
		})

		expect(container.querySelector('[data-testid="base-edge-animated-edge"]')).toBeTruthy()
		expect(container.querySelector("circle")).toBeTruthy()
		expect(container.querySelector("animateMotion")?.getAttribute("path")).toBe(
			testState.state.bezierPath,
		)
	})

	it("falls back to zero coordinates when matching handles are not found", () => {
		testState.state.internalNodes = {
			source: {
				internals: {
					handleBounds: {
						source: [{ height: 8, position: "top", width: 10, x: 5, y: 6 }],
					},
					positionAbsolute: { x: 10, y: 20 },
				},
			},
			target: {
				internals: {
					handleBounds: {
						target: [{ height: 6, position: "bottom", width: 12, x: 1, y: 2 }],
					},
					positionAbsolute: { x: 30, y: 40 },
				},
			},
		}

		const edgeProps = toAnimatedEdgeProps({
			id: "animated-zero",
			source: "source",
			sourcePosition: "right",
			sourceX: 0,
			sourceY: 0,
			target: "target",
			targetPosition: "left",
			targetX: 0,
			targetY: 0,
		})

		render(
			<svg>
				<title>Animated edge fallback handles</title>
				<Edge.Animated {...edgeProps} />
			</svg>,
		)

		expect(testState.getBezierPath).toHaveBeenCalledWith(
			expect.objectContaining({ sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 }),
		)
	})
})

describe("Context deep coverage", () => {
	it("throws when context consumers are rendered without Context provider", () => {
		expect(() => render(<ContextTrigger />)).toThrow(
			"Context components must be used within Context",
		)
	})

	it("renders default trigger with formatted percent and icon", () => {
		renderWithContext(<ContextTrigger />, { maxTokens: 100, usedTokens: 25 })

		expect(screen.getByText("25%")).toBeTruthy()
		expect(screen.getByLabelText("Model context usage")).toBeTruthy()
	})

	it("renders custom trigger children when provided", () => {
		renderWithContext(
			<ContextTrigger>
				<button type="button">Custom trigger</button>
			</ContextTrigger>,
		)

		expect(screen.getByRole("button", { name: "Custom trigger" })).toBeTruthy()
		expect(screen.queryByLabelText("Model context usage")).toBeNull()
	})

	it("renders content wrappers with default header information and progress", () => {
		renderWithContext(
			<ContextContent data-testid="content" className="content-extra">
				<ContextContentHeader />
				<ContextContentBody className="body-extra">Body content</ContextContentBody>
			</ContextContent>,
			{ maxTokens: 3000, usedTokens: 1500 },
		)

		expect(screen.getByText("50%")).toBeTruthy()
		expect(screen.getByText(/1\.5K/)).toBeTruthy()
		expect(screen.getByText(/3K/)).toBeTruthy()
		expect(screen.getByRole("progressbar").getAttribute("data-value")).toBe("50")
		expect(screen.getByTestId("content").className).toContain("content-extra")
		expect(screen.getByText("Body content").className).toContain("body-extra")
	})

	it("renders custom content header children when provided", () => {
		renderWithContext(<ContextContentHeader>Custom header</ContextContentHeader>)

		expect(screen.getByText("Custom header")).toBeTruthy()
		expect(screen.queryByRole("progressbar")).toBeNull()
	})

	it("renders footer total cost with model usage and falls back to zero without modelId", () => {
		testState.state.usageCostUsd = 1.25
		const { rerender } = renderWithContext(<ContextContentFooter />, {
			modelId: "gpt-test",
			usage: createUsage({ inputTokens: 1200, outputTokens: 300 }),
		})

		expect(screen.getByText("Total cost")).toBeTruthy()
		expect(screen.getByText("$1.25")).toBeTruthy()
		expect(testState.getUsageMock).toHaveBeenCalledWith({
			modelId: "gpt-test",
			usage: { input: 1200, output: 300 },
		})

		testState.getUsageMock.mockClear()
		rerender(
			<Context
				maxTokens={1000}
				usedTokens={250}
				usage={createUsage({ inputTokens: 10, outputTokens: 5 })}
			>
				<ContextContentFooter />
			</Context>,
		)

		expect(screen.getByText("$0.00")).toBeTruthy()
		expect(testState.getUsageMock).not.toHaveBeenCalled()
	})

	it("renders custom footer children when provided", () => {
		renderWithContext(
			<ContextContentFooter>
				<span>Custom footer</span>
			</ContextContentFooter>,
		)

		expect(screen.getByText("Custom footer")).toBeTruthy()
		expect(screen.queryByText("Total cost")).toBeNull()
	})

	it("covers input usage branches for children, empty, and valued states", () => {
		const { rerender } = renderWithContext(
			<ContextInputUsage>Custom input usage</ContextInputUsage>,
		)
		expect(screen.getByText("Custom input usage")).toBeTruthy()

		rerender(
			<Context maxTokens={1000} usedTokens={250} usage={createUsage({ inputTokens: 0 })}>
				<ContextInputUsage />
			</Context>,
		)
		expect(screen.queryByText("Input")).toBeNull()

		testState.state.usageCostUsd = 2.5
		rerender(
			<Context
				maxTokens={1000}
				modelId="gpt-input"
				usedTokens={250}
				usage={createUsage({ inputTokens: 3200 })}
			>
				<ContextInputUsage />
			</Context>,
		)

		expect(screen.getByText("Input")).toBeTruthy()
		expect(screen.getByText(/3\.2K/)).toBeTruthy()
		expect(screen.getByText(/\$2\.50/)).toBeTruthy()
		expect(testState.getUsageMock).toHaveBeenCalledWith({
			modelId: "gpt-input",
			usage: { input: 3200, output: 0 },
		})
	})

	it("covers output usage branches for children, empty, and model-less values", () => {
		const { rerender } = renderWithContext(
			<ContextOutputUsage>Custom output usage</ContextOutputUsage>,
		)
		expect(screen.getByText("Custom output usage")).toBeTruthy()

		rerender(
			<Context maxTokens={1000} usedTokens={250} usage={createUsage({ outputTokens: 0 })}>
				<ContextOutputUsage />
			</Context>,
		)
		expect(screen.queryByText("Output")).toBeNull()

		testState.getUsageMock.mockClear()
		rerender(
			<Context maxTokens={1000} usedTokens={250} usage={createUsage({ outputTokens: 1400 })}>
				<ContextOutputUsage />
			</Context>,
		)

		expect(screen.getByText("Output")).toBeTruthy()
		expect(screen.getByText(/1\.4K/)).toBeTruthy()
		expect(screen.getByText(/\$0\.00/)).toBeTruthy()
		expect(testState.getUsageMock).not.toHaveBeenCalled()
	})

	it("covers reasoning usage branches for children, empty, and valued states", () => {
		const { rerender } = renderWithContext(
			<ContextReasoningUsage>Custom reasoning usage</ContextReasoningUsage>,
		)
		expect(screen.getByText("Custom reasoning usage")).toBeTruthy()

		rerender(
			<Context maxTokens={1000} usedTokens={250} usage={createUsage({ reasoningTokens: 0 })}>
				<ContextReasoningUsage />
			</Context>,
		)
		expect(screen.queryByText("Reasoning")).toBeNull()

		testState.state.usageCostUsd = 0.75
		rerender(
			<Context
				maxTokens={1000}
				modelId="gpt-reason"
				usedTokens={250}
				usage={createUsage({ reasoningTokens: 900 })}
			>
				<ContextReasoningUsage />
			</Context>,
		)

		expect(screen.getByText("Reasoning")).toBeTruthy()
		expect(screen.getByText(/900/)).toBeTruthy()
		expect(screen.getByText(/\$0\.75/)).toBeTruthy()
		expect(testState.getUsageMock).toHaveBeenCalledWith({
			modelId: "gpt-reason",
			usage: { reasoningTokens: 900 },
		})
	})

	it("covers cache usage branches for children, empty, and valued states", () => {
		const { rerender } = renderWithContext(
			<ContextCacheUsage>Custom cache usage</ContextCacheUsage>,
		)
		expect(screen.getByText("Custom cache usage")).toBeTruthy()

		rerender(
			<Context
				maxTokens={1000}
				usedTokens={250}
				usage={createUsage({ cachedInputTokens: 0 })}
			>
				<ContextCacheUsage />
			</Context>,
		)
		expect(screen.queryByText("Cache")).toBeNull()

		testState.state.usageCostUsd = 0.5
		rerender(
			<Context
				maxTokens={1000}
				modelId="gpt-cache"
				usedTokens={250}
				usage={createUsage({ cachedInputTokens: 1500 })}
			>
				<ContextCacheUsage />
			</Context>,
		)

		expect(screen.getByText("Cache")).toBeTruthy()
		expect(screen.getByText(/1\.5K/)).toBeTruthy()
		expect(screen.getByText(/\$0\.50/)).toBeTruthy()
		expect(testState.getUsageMock).toHaveBeenCalledWith({
			modelId: "gpt-cache",
			usage: { cacheReads: 1500, input: 0, output: 0 },
		})
	})
})
