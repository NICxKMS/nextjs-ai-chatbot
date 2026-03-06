// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

afterEach(() => {
	cleanup()
})

describe("Button", () => {
	it("renders with default variant and size", () => {
		render(<Button>Click me</Button>)

		const button = screen.getByRole("button", { name: "Click me" })
		expect(button).toBeInTheDocument()
		expect(button).toHaveAttribute("data-slot", "button")
		expect(button).toHaveAttribute("data-variant", "default")
		expect(button).toHaveAttribute("data-size", "default")
	})

	it("renders with destructive variant", () => {
		render(<Button variant="destructive">Delete</Button>)

		expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
			"data-variant",
			"destructive",
		)
	})

	it("renders as disabled when disabled prop is set", () => {
		render(<Button disabled>Disabled</Button>)

		expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled()
	})

	it("renders as child when asChild prop is used", () => {
		render(
			<Button asChild>
				<a href="/docs">Docs</a>
			</Button>,
		)

		expect(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument()
	})
})

describe("Badge", () => {
	it("renders with default variant", () => {
		render(<Badge>New</Badge>)

		const badge = screen.getByText("New")
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveAttribute("data-slot", "badge")
		expect(badge).toHaveAttribute("data-variant", "default")
	})

	it("renders with destructive variant", () => {
		render(<Badge variant="destructive">Danger</Badge>)

		expect(screen.getByText("Danger")).toHaveAttribute("data-variant", "destructive")
	})

	it("renders as child when asChild prop is used", () => {
		render(
			<Badge asChild>
				<a href="/updates">Updates</a>
			</Badge>,
		)

		expect(screen.getByRole("link", { name: "Updates" })).toBeInTheDocument()
	})
})

describe("Input", () => {
	it("renders with value and type", () => {
		render(<Input aria-label="Email" type="email" defaultValue="me@example.com" />)

		const input = screen.getByRole("textbox", { name: "Email" })
		expect(input).toHaveValue("me@example.com")
		expect(input).toHaveAttribute("type", "email")
		expect(input).toHaveAttribute("data-slot", "input")
	})

	it("calls onChange handler when value changes", () => {
		const handleChange = vi.fn()
		render(<Input aria-label="Name" defaultValue="Ada" onChange={handleChange} />)

		const input = screen.getByRole("textbox", { name: "Name" })
		fireEvent.change(input, { target: { value: "Grace" } })

		expect(handleChange).toHaveBeenCalledTimes(1)
		expect(input).toHaveValue("Grace")
	})

	it("renders as disabled when disabled prop is set", () => {
		render(<Input aria-label="Disabled input" disabled />)

		expect(screen.getByRole("textbox", { name: "Disabled input" })).toBeDisabled()
	})

	it("merges custom className", () => {
		render(<Input aria-label="Class input" className="custom-input" />)

		expect(screen.getByRole("textbox", { name: "Class input" })).toHaveClass("custom-input")
	})
})

describe("Textarea", () => {
	it("renders with initial value", () => {
		render(<Textarea aria-label="Notes" defaultValue="Initial text" />)

		const textarea = screen.getByRole("textbox", { name: "Notes" })
		expect(textarea).toHaveValue("Initial text")
		expect(textarea).toHaveAttribute("data-slot", "textarea")
	})

	it("calls onChange handler when content changes", () => {
		const handleChange = vi.fn()
		render(<Textarea aria-label="Comment" defaultValue="Hello" onChange={handleChange} />)

		const textarea = screen.getByRole("textbox", { name: "Comment" })
		fireEvent.change(textarea, { target: { value: "Updated" } })

		expect(handleChange).toHaveBeenCalledTimes(1)
		expect(textarea).toHaveValue("Updated")
	})

	it("renders as disabled when disabled prop is set", () => {
		render(<Textarea aria-label="Disabled textarea" disabled />)

		expect(screen.getByRole("textbox", { name: "Disabled textarea" })).toBeDisabled()
	})

	it("merges custom className", () => {
		render(<Textarea aria-label="Class textarea" className="custom-textarea" />)

		expect(screen.getByRole("textbox", { name: "Class textarea" })).toHaveClass(
			"custom-textarea",
		)
	})
})

describe("ButtonGroup", () => {
	it("renders a button group with children", () => {
		render(
			<ButtonGroup aria-label="Actions">
				<Button>First</Button>
				<Button>Second</Button>
			</ButtonGroup>,
		)

		const group = screen.getByRole("group", { name: "Actions" })
		expect(group).toBeInTheDocument()
		expect(group).toHaveAttribute("data-slot", "button-group")
	})

	it("applies vertical orientation attribute", () => {
		render(<ButtonGroup aria-label="Vertical actions" orientation="vertical" />)

		expect(screen.getByRole("group", { name: "Vertical actions" })).toHaveAttribute(
			"data-orientation",
			"vertical",
		)
	})

	it("renders button group text as a div by default", () => {
		render(<ButtonGroupText>Filter</ButtonGroupText>)

		const text = screen.getByText("Filter")
		expect(text.tagName).toBe("DIV")
	})

	it("renders button group text as child when asChild prop is used", () => {
		render(
			<ButtonGroupText asChild>
				<a href="/filters">Filters</a>
			</ButtonGroupText>,
		)

		expect(screen.getByRole("link", { name: "Filters" })).toBeInTheDocument()
	})

	it("renders button group separator with default vertical orientation", () => {
		render(<ButtonGroupSeparator data-testid="group-separator" />)

		const separator = screen.getByTestId("group-separator")
		expect(separator).toHaveAttribute("data-slot", "button-group-separator")
		expect(separator).toHaveAttribute("data-orientation", "vertical")
	})
})

describe("Alert", () => {
	it("renders with default variant", () => {
		render(<Alert>Saved successfully</Alert>)

		const alert = screen.getByRole("alert")
		expect(alert).toBeInTheDocument()
		expect(alert).toHaveAttribute("data-slot", "alert")
	})

	it("renders with destructive variant styles", () => {
		render(<Alert variant="destructive">Something failed</Alert>)

		expect(screen.getByRole("alert")).toHaveClass("text-destructive")
	})

	it("renders alert title and description slots", () => {
		render(
			<Alert>
				<AlertTitle>Heads up</AlertTitle>
				<AlertDescription>Try again in a moment.</AlertDescription>
			</Alert>,
		)

		expect(screen.getByText("Heads up")).toHaveAttribute("data-slot", "alert-title")
		expect(screen.getByText("Try again in a moment.")).toHaveAttribute(
			"data-slot",
			"alert-description",
		)
	})

	it("merges custom className", () => {
		render(<Alert className="custom-alert">Custom</Alert>)

		expect(screen.getByRole("alert")).toHaveClass("custom-alert")
	})
})

describe("Spinner", () => {
	it("renders without crashing", () => {
		render(<Spinner />)

		expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
	})

	it("applies default spinner class", () => {
		render(<Spinner />)

		expect(screen.getByRole("status", { name: "Loading" })).toHaveClass("animate-spin")
	})

	it("accepts custom props", () => {
		render(<Spinner aria-label="Busy" className="custom-spinner" />)

		const spinner = screen.getByRole("status", { name: "Busy" })
		expect(spinner).toHaveClass("custom-spinner")
	})
})

describe("Skeleton", () => {
	it("renders without crashing", () => {
		render(<Skeleton data-testid="skeleton" />)

		expect(screen.getByTestId("skeleton")).toBeInTheDocument()
	})

	it("applies default and custom classes", () => {
		render(<Skeleton data-testid="skeleton" className="h-4 w-full" />)

		const skeleton = screen.getByTestId("skeleton")
		expect(skeleton).toHaveClass("animate-pulse")
		expect(skeleton).toHaveClass("h-4")
		expect(skeleton).toHaveClass("w-full")
	})

	it("renders children", () => {
		render(
			<Skeleton>
				<span>Loading label</span>
			</Skeleton>,
		)

		expect(screen.getByText("Loading label")).toBeInTheDocument()
	})
})
