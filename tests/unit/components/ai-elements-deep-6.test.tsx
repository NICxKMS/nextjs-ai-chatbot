// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get: (_target, tag) => {
				return ({
					children,
					...props
				}: {
					children?: React.ReactNode
					[key: string]: unknown
				}) => React.createElement(String(tag), props, children)
			},
		},
	),
	AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}))

import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai-elements/checkpoint"
import {
	TestDuration,
	TestError,
	TestErrorMessage,
	TestErrorStack,
	TestName,
	Test as TestResult,
	TestResults,
	TestResultsContent,
	TestResultsDuration,
	TestResultsHeader,
	TestResultsProgress,
	TestResultsSummary,
	TestStatus,
	TestSuite,
	TestSuiteContent,
	TestSuiteName,
	TestSuiteStats,
} from "@/components/ai-elements/test-results"
import { Transcription, TranscriptionSegment } from "@/components/ai-elements/transcription"
import { TooltipProvider } from "@/components/ui/tooltip"

const checkpointStates = ["pending", "active", "completed", "failed"] as const

type CheckpointState = (typeof checkpointStates)[number]
type Segment = React.ComponentProps<typeof TranscriptionSegment>["segment"]

const createSegment = (text: string, startSecond: number, endSecond: number) => {
	return {
		endSecond,
		startSecond,
		text,
	} as Segment
}

function CheckpointNavigationHarness() {
	const [currentState, setCurrentState] = React.useState<CheckpointState>("pending")

	return (
		<TooltipProvider>
			<div>
				<Checkpoint data-testid="checkpoint-flow">
					{checkpointStates.map((state) => (
						<CheckpointTrigger
							aria-label={`go-${state}`}
							key={state}
							onClick={() => setCurrentState(state)}
							tooltip={`Navigate to ${state}`}
						>
							<CheckpointIcon>
								<span data-testid={`icon-${state}`}>
									{state.slice(0, 1).toUpperCase()}
								</span>
							</CheckpointIcon>
							<span>{state}</span>
						</CheckpointTrigger>
					))}
				</Checkpoint>
				<p data-testid="current-checkpoint">{currentState}</p>
			</div>
		</TooltipProvider>
	)
}

function EditableTranscriptionHarness() {
	const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
	const segments = [createSegment("Editable transcript", 0, 2)]

	return (
		<Transcription currentTime={0.5} segments={segments}>
			{(segment, index) =>
				editingIndex === index ? (
					<input
						aria-label={`edit-${index}`}
						defaultValue={segment.text}
						key={`edit-${index}`}
					/>
				) : (
					<TranscriptionSegment
						index={index}
						key={`segment-${index}`}
						onClick={() => setEditingIndex(index)}
						segment={segment}
					/>
				)
			}
		</Transcription>
	)
}

describe("checkpoint ai-element", () => {
	it("renders all checkpoint states and supports navigation between them", () => {
		render(<CheckpointNavigationHarness />)

		expect(screen.getByTestId("checkpoint-flow")).toBeInTheDocument()
		expect(screen.getByTestId("current-checkpoint")).toHaveTextContent("pending")
		expect(screen.getByTestId("icon-pending")).toHaveTextContent("P")
		expect(screen.getByTestId("icon-active")).toHaveTextContent("A")
		expect(screen.getByTestId("icon-completed")).toHaveTextContent("C")
		expect(screen.getByTestId("icon-failed")).toHaveTextContent("F")

		act(() => {
			fireEvent.click(screen.getByRole("button", { name: "go-active" }))
		})
		expect(screen.getByTestId("current-checkpoint")).toHaveTextContent("active")

		act(() => {
			fireEvent.click(screen.getByRole("button", { name: "go-completed" }))
		})
		expect(screen.getByTestId("current-checkpoint")).toHaveTextContent("completed")

		act(() => {
			fireEvent.click(screen.getByRole("button", { name: "go-failed" }))
		})
		expect(screen.getByTestId("current-checkpoint")).toHaveTextContent("failed")
	})

	it("renders separator and default icon fallback", () => {
		const { container } = render(
			<Checkpoint>
				<CheckpointIcon className="extra-icon-style" data-testid="default-icon" />
			</Checkpoint>,
		)

		const separator = container.querySelector('[data-slot="separator"]')
		expect(separator).toBeTruthy()

		const defaultIcon = screen.getByTestId("default-icon")
		expect(defaultIcon.tagName.toLowerCase()).toBe("svg")
		expect(defaultIcon).toHaveClass("size-4", "shrink-0", "extra-icon-style")
	})

	it("uses non-tooltip trigger defaults and supports click handlers", () => {
		const onClick = vi.fn()

		render(<CheckpointTrigger onClick={onClick}>no tooltip trigger</CheckpointTrigger>)

		const trigger = screen.getByRole("button", { name: "no tooltip trigger" })
		expect(trigger).toHaveAttribute("data-size", "sm")
		expect(trigger).toHaveAttribute("data-variant", "ghost")
		fireEvent.click(trigger)
		expect(onClick).toHaveBeenCalledTimes(1)
	})

	it("accepts explicit trigger variant and size when tooltip is provided", () => {
		render(
			<TooltipProvider>
				<CheckpointTrigger size="lg" tooltip="Jump to failed checkpoint" variant="outline">
					tooltip trigger
				</CheckpointTrigger>
			</TooltipProvider>,
		)

		const trigger = screen.getByRole("button", { name: "tooltip trigger" })
		expect(trigger).toHaveAttribute("data-size", "lg")
		expect(trigger).toHaveAttribute("data-variant", "outline")
	})
})

describe("test-results ai-element", () => {
	it("handles empty results and passing-only summaries", () => {
		const { container, rerender } = render(<TestResults data-testid="results-empty" />)

		expect(screen.getByTestId("results-empty")).toBeInTheDocument()
		expect(screen.queryByText(/passed/i)).toBeNull()
		expect(container.querySelector('[data-slot="badge"]')).toBeNull()

		rerender(
			<TestResults
				summary={{
					failed: 0,
					passed: 3,
					skipped: 0,
					total: 3,
					duration: 250,
				}}
			/>,
		)

		expect(screen.getByText("3 passed")).toBeInTheDocument()
		expect(screen.queryByText("1 failed")).toBeNull()
		expect(screen.queryByText("1 skipped")).toBeNull()
		expect(screen.getByText("250ms")).toBeInTheDocument()
	})

	it("renders failing, skipped, and mixed summary states", () => {
		render(
			<TestResults
				summary={{
					failed: 1,
					passed: 2,
					skipped: 1,
					total: 4,
					duration: 1750,
				}}
			/>,
		)

		expect(screen.getByText("2 passed")).toBeInTheDocument()
		expect(screen.getByText("1 failed")).toBeInTheDocument()
		expect(screen.getByText("1 skipped")).toBeInTheDocument()
		expect(screen.getByText("1.75s")).toBeInTheDocument()
	})

	it("supports custom test-results children and custom summary/duration content", () => {
		const { rerender } = render(
			<TestResults
				summary={{
					failed: 2,
					passed: 4,
					skipped: 0,
					total: 6,
					duration: 1200,
				}}
			>
				<div data-testid="custom-results">custom body</div>
			</TestResults>,
		)

		expect(screen.getByTestId("custom-results")).toHaveTextContent("custom body")
		expect(screen.queryByText("4 passed")).toBeNull()

		rerender(
			<TestResults summary={{ failed: 0, passed: 1, skipped: 0, total: 1, duration: 1800 }}>
				<TestResultsHeader>
					<TestResultsSummary>
						<span data-testid="custom-summary">Summary Override</span>
					</TestResultsSummary>
					<TestResultsDuration>
						<span data-testid="custom-duration">about two seconds</span>
					</TestResultsDuration>
				</TestResultsHeader>
			</TestResults>,
		)

		expect(screen.getByTestId("custom-summary")).toHaveTextContent("Summary Override")
		expect(screen.getByTestId("custom-duration")).toHaveTextContent("about two seconds")
	})

	it("returns null when summary or duration context is missing", () => {
		const noSummary = render(<TestResultsSummary />)
		expect(noSummary.container.firstChild).toBeNull()

		const { rerender } = render(
			<TestResults summary={{ failed: 0, passed: 1, skipped: 0, total: 1 }}>
				<TestResultsHeader>
					<TestResultsDuration data-testid="duration" />
				</TestResultsHeader>
			</TestResults>,
		)

		expect(screen.queryByTestId("duration")).toBeNull()

		rerender(
			<TestResults summary={{ failed: 0, passed: 1, skipped: 0, total: 1, duration: 0 }}>
				<TestResultsHeader>
					<TestResultsDuration data-testid="duration" />
				</TestResultsHeader>
			</TestResults>,
		)

		expect(screen.queryByTestId("duration")).toBeNull()
	})

	it("renders progress metrics and supports custom progress content", () => {
		const noSummary = render(<TestResultsProgress />)
		expect(noSummary.container.firstChild).toBeNull()

		const { container, rerender } = render(
			<TestResults summary={{ failed: 1, passed: 2, skipped: 1, total: 4 }}>
				<TestResultsProgress />
			</TestResults>,
		)

		expect(screen.getByText("2/4 tests passed")).toBeInTheDocument()
		expect(screen.getByText("50%")).toBeInTheDocument()
		expect(container.querySelector('div[style*="width: 50%"]')).toBeTruthy()
		expect(container.querySelector('div[style*="width: 25%"]')).toBeTruthy()

		rerender(
			<TestResults summary={{ failed: 1, passed: 2, skipped: 1, total: 4 }}>
				<TestResultsProgress>
					<span data-testid="custom-progress">custom progress</span>
				</TestResultsProgress>
			</TestResults>,
		)

		expect(screen.getByTestId("custom-progress")).toHaveTextContent("custom progress")
	})

	it("renders suite stats across passing, failing, and skipped combinations", () => {
		const { rerender } = render(<TestSuiteStats failed={1} passed={2} skipped={1} />)

		expect(screen.getByText("2 passed")).toBeInTheDocument()
		expect(screen.getByText("1 failed")).toBeInTheDocument()
		expect(screen.getByText("1 skipped")).toBeInTheDocument()

		rerender(<TestSuiteStats />)
		expect(screen.queryByText("2 passed")).toBeNull()
		expect(screen.queryByText("1 failed")).toBeNull()
		expect(screen.queryByText("1 skipped")).toBeNull()

		rerender(
			<TestSuiteStats failed={3} passed={5} skipped={0}>
				<span data-testid="custom-suite-stats">Custom Stats</span>
			</TestSuiteStats>,
		)

		expect(screen.getByTestId("custom-suite-stats")).toHaveTextContent("Custom Stats")
	})

	it("supports expandable suite details and nested failing test output", () => {
		render(
			<TestResults summary={{ failed: 1, passed: 2, skipped: 1, total: 4, duration: 2400 }}>
				<TestResultsContent>
					<TestSuite name="integration suite" status="failed">
						<TestSuiteName />
						<TestSuiteContent>
							<TestResult duration={8} name="passes quickly" status="passed" />
							<TestResult name="currently running" status="running" />
							<TestResult name="was skipped" status="skipped" />
							<TestResult duration={77} name="fails loudly" status="failed">
								<TestStatus data-testid="failed-status" />
								<TestName />
								<TestDuration>manual</TestDuration>
								<TestError>
									<TestErrorMessage>expected true to be false</TestErrorMessage>
									<TestErrorStack>stack-line-1</TestErrorStack>
								</TestError>
							</TestResult>
						</TestSuiteContent>
					</TestSuite>
				</TestResultsContent>
			</TestResults>,
		)

		expect(screen.queryByText("expected true to be false")).toBeNull()

		fireEvent.click(screen.getByRole("button", { name: "integration suite" }))

		expect(screen.getByText("passes quickly")).toBeInTheDocument()
		expect(screen.getByText("8ms")).toBeInTheDocument()
		expect(screen.getByText("currently running")).toBeInTheDocument()
		expect(screen.getByText("was skipped")).toBeInTheDocument()
		expect(screen.getByText("fails loudly")).toBeInTheDocument()
		expect(screen.getByText("manual")).toBeInTheDocument()
		expect(screen.getByText("expected true to be false")).toBeInTheDocument()
		expect(screen.getByText("stack-line-1")).toBeInTheDocument()
		expect(screen.getByTestId("failed-status")).toHaveClass("text-red-600")
	})

	it("maps all individual status styles and name/duration fallbacks", () => {
		render(
			<div>
				<TestResult name="passed case" status="passed">
					<TestStatus data-testid="status-passed" />
					<TestName data-testid="name-passed" />
				</TestResult>
				<TestResult name="failed case" status="failed">
					<TestStatus data-testid="status-failed" />
					<TestName data-testid="name-failed">override failed name</TestName>
					<TestDuration data-testid="duration-missing" />
				</TestResult>
				<TestResult duration={22} name="running case" status="running">
					<TestStatus data-testid="status-running" />
					<TestDuration data-testid="duration-running" />
				</TestResult>
				<TestResult duration={13} name="skipped case" status="skipped">
					<TestStatus data-testid="status-skipped" />
					<TestDuration>custom duration</TestDuration>
				</TestResult>
			</div>,
		)

		expect(screen.getByTestId("status-passed")).toHaveClass("text-green-600")
		expect(screen.getByTestId("status-failed")).toHaveClass("text-red-600")
		expect(screen.getByTestId("status-running")).toHaveClass("text-blue-600")
		expect(screen.getByTestId("status-skipped")).toHaveClass("text-yellow-600")
		expect(screen.getByTestId("name-passed")).toHaveTextContent("passed case")
		expect(screen.getByTestId("name-failed")).toHaveTextContent("override failed name")
		expect(screen.queryByTestId("duration-missing")).toBeNull()
		expect(screen.getByTestId("duration-running")).toHaveTextContent("22ms")
		expect(screen.getByText("custom duration")).toBeInTheDocument()
	})

	it("supports overriding suite trigger content", () => {
		render(
			<TestSuite defaultOpen name="original suite" status="passed">
				<TestSuiteName>Custom Suite Label</TestSuiteName>
			</TestSuite>,
		)

		expect(screen.getByRole("button", { name: "Custom Suite Label" })).toBeInTheDocument()
	})
})

describe("transcription ai-element", () => {
	it("renders loading and empty transcription states with no segments", () => {
		const { container } = render(
			<Transcription data-testid="transcription-empty" segments={[]}>
				{(segment, index) => (
					<TranscriptionSegment
						index={index}
						key={`${segment.text}-${index}`}
						segment={segment}
					/>
				)}
			</Transcription>,
		)

		expect(screen.getByTestId("transcription-empty")).toHaveAttribute(
			"data-slot",
			"transcription",
		)
		expect(container.querySelectorAll('[data-slot="transcription-segment"]').length).toBe(0)
	})

	it("filters out empty segments in partial transcription output", () => {
		const segments = [
			createSegment("first chunk", 0, 1),
			createSegment("   ", 1, 2),
			createSegment("\n", 2, 3),
			createSegment("second chunk", 3, 4),
		]

		render(
			<Transcription segments={segments}>
				{(segment, index) => (
					<span data-testid="transcript-piece" key={`${segment.text}-${index}`}>
						{segment.text}
					</span>
				)}
			</Transcription>,
		)

		const pieces = screen.getAllByTestId("transcript-piece")
		expect(pieces).toHaveLength(2)
		expect(screen.getByText("first chunk")).toBeInTheDocument()
		expect(screen.getByText("second chunk")).toBeInTheDocument()
	})

	it("handles partial and complete transcription timing with seek interactions", () => {
		const onSeek = vi.fn()
		const onSegmentClick = vi.fn()
		const segments = [
			createSegment("intro", 0, 1),
			createSegment("middle", 1, 2),
			createSegment("outro", 2, 3),
		]

		const { rerender } = render(
			<Transcription currentTime={1.5} onSeek={onSeek} segments={segments}>
				{(segment, index) => (
					<TranscriptionSegment
						index={index}
						key={`${segment.text}-${index}`}
						onClick={onSegmentClick}
						segment={segment}
					/>
				)}
			</Transcription>,
		)

		const intro = screen.getByRole("button", { name: "intro" })
		const middle = screen.getByRole("button", { name: "middle" })
		const outro = screen.getByRole("button", { name: "outro" })

		expect(intro).toHaveAttribute("data-active", "false")
		expect(intro).toHaveClass("text-muted-foreground", "cursor-pointer")
		expect(middle).toHaveAttribute("data-active", "true")
		expect(middle).toHaveClass("text-primary", "cursor-pointer")
		expect(outro).toHaveAttribute("data-active", "false")
		expect(outro).toHaveClass("text-muted-foreground/60", "cursor-pointer")

		act(() => {
			fireEvent.click(middle)
		})
		expect(onSeek).toHaveBeenCalledWith(1)
		expect(onSegmentClick).toHaveBeenCalledTimes(1)

		rerender(
			<Transcription currentTime={10} onSeek={onSeek} segments={segments}>
				{(segment, index) => (
					<TranscriptionSegment
						index={index}
						key={`${segment.text}-${index}`}
						onClick={onSegmentClick}
						segment={segment}
					/>
				)}
			</Transcription>,
		)

		expect(screen.getByRole("button", { name: "intro" })).toHaveClass("text-muted-foreground")
		expect(screen.getByRole("button", { name: "middle" })).toHaveClass("text-muted-foreground")
		expect(screen.getByRole("button", { name: "outro" })).toHaveClass("text-muted-foreground")
	})

	it("supports editing mode and cursor-default behavior when seeking is disabled", () => {
		render(<EditableTranscriptionHarness />)

		const segment = screen.getByRole("button", { name: "Editable transcript" })
		expect(segment).toHaveClass("cursor-default")
		expect(segment).not.toHaveClass("cursor-pointer")

		act(() => {
			fireEvent.click(segment)
		})

		expect(screen.getByRole("textbox", { name: "edit-0" })).toBeInTheDocument()
	})

	it("throws when TranscriptionSegment is rendered outside Transcription", () => {
		expect(() => {
			render(<TranscriptionSegment index={0} segment={createSegment("orphan", 0, 1)} />)
		}).toThrow("Transcription components must be used within Transcription")
	})
})
