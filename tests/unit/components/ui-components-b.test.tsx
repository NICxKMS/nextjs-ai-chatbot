// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
} from "@/components/ui/avatar"
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "@/components/ui/input-group"
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
		configurable: true,
		value: vi.fn(),
	})

	vi.stubGlobal(
		"ResizeObserver",
		class ResizeObserver {
			observe = vi.fn()
			unobserve = vi.fn()
			disconnect = vi.fn()
		},
	)
})

afterEach(() => {
	cleanup()
})

describe("Dialog", () => {
	it("renders dialog content when open", () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogTitle>Test Title</DialogTitle>
					<DialogDescription>Dialog content</DialogDescription>
				</DialogContent>
			</Dialog>,
		)

		expect(screen.getByText("Test Title")).toBeInTheDocument()
		expect(screen.getByText("Dialog content")).toBeInTheDocument()
	})
})

describe("DropdownMenu", () => {
	it("renders menu content when open", () => {
		render(
			<DropdownMenu open>
				<DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem>Profile</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		)

		expect(screen.getByText("Actions")).toBeInTheDocument()
		expect(screen.getByRole("menuitem", { name: "Profile" })).toBeInTheDocument()
	})
})

describe("Select", () => {
	it("renders trigger and items when open", () => {
		render(
			<Select defaultValue="apple" open>
				<SelectTrigger aria-label="Fruit">
					<SelectValue placeholder="Pick a fruit" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Fruits</SelectLabel>
						<SelectItem value="apple">Apple</SelectItem>
						<SelectItem value="banana">Banana</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>,
		)

		expect(screen.getByLabelText("Fruit")).toBeInTheDocument()
		expect(screen.getByText("Fruits")).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument()
	})
})

describe("Tabs", () => {
	it("renders tabs and shows active tab content", () => {
		render(
			<Tabs defaultValue="tab1">
				<TabsList>
					<TabsTrigger value="tab1">Tab 1</TabsTrigger>
					<TabsTrigger value="tab2">Tab 2</TabsTrigger>
				</TabsList>
				<TabsContent value="tab1">Content 1</TabsContent>
				<TabsContent value="tab2">Content 2</TabsContent>
			</Tabs>,
		)

		expect(screen.getByText("Content 1")).toBeVisible()
	})
})

describe("Tooltip", () => {
	it("renders tooltip content when open", () => {
		render(
			<TooltipProvider>
				<Tooltip open>
					<TooltipTrigger asChild>
						<button type="button">Hover me</button>
					</TooltipTrigger>
					<TooltipContent>Tooltip body</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		)

		expect(screen.getByRole("tooltip")).toHaveTextContent("Tooltip body")
	})
})

describe("Card", () => {
	it("renders composed card sections", () => {
		render(
			<Card>
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
					<CardDescription>Card description</CardDescription>
					<CardAction>
						<button type="button">Edit</button>
					</CardAction>
				</CardHeader>
				<CardContent>Card body</CardContent>
				<CardFooter>Card footer</CardFooter>
			</Card>,
		)

		expect(screen.getByText("Card Title")).toBeInTheDocument()
		expect(screen.getByText("Card body")).toBeInTheDocument()
		expect(screen.getByText("Card footer")).toBeInTheDocument()
	})
})

describe("Avatar", () => {
	it("renders avatar group and count", () => {
		render(
			<AvatarGroup>
				<Avatar>
					<AvatarFallback>AL</AvatarFallback>
					<AvatarBadge data-testid="avatar-badge" />
				</Avatar>
				<Avatar>
					<AvatarFallback>BO</AvatarFallback>
				</Avatar>
				<AvatarGroupCount>+2</AvatarGroupCount>
			</AvatarGroup>,
		)

		expect(screen.getByText("AL")).toBeInTheDocument()
		expect(screen.getByText("BO")).toBeInTheDocument()
		expect(screen.getByText("+2")).toBeInTheDocument()
		expect(screen.getByTestId("avatar-badge")).toBeInTheDocument()
	})
})

describe("InputGroup", () => {
	it("renders input and textarea group compositions", () => {
		render(
			<>
				<InputGroup>
					<InputGroupAddon>
						<InputGroupText>@</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput placeholder="Username" />
					<InputGroupAddon align="inline-end">
						<InputGroupButton>Go</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup>
					<InputGroupTextarea placeholder="Message" />
				</InputGroup>
			</>,
		)

		expect(screen.getByPlaceholderText("Username")).toBeInTheDocument()
		expect(screen.getByPlaceholderText("Message")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument()
	})

	it("focuses textarea controls when an addon is clicked", () => {
		render(
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>Message</InputGroupText>
				</InputGroupAddon>
				<InputGroupTextarea placeholder="Message" />
			</InputGroup>,
		)

		const textarea = screen.getByPlaceholderText("Message")
		fireEvent.click(screen.getByText("Message"))

		expect(textarea).toHaveFocus()
	})
})
