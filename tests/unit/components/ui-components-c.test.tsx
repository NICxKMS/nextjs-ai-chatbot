// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
	Command,
	CommandDialog,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Label } from "@/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

const emblaApiMock = {
	scrollPrev: vi.fn(),
	scrollNext: vi.fn(),
	canScrollPrev: vi.fn(() => true),
	canScrollNext: vi.fn(() => true),
	on: vi.fn(),
	off: vi.fn(),
}

const useEmblaCarouselMock = vi.fn(() => [vi.fn(), emblaApiMock] as const)

vi.mock("embla-carousel-react", () => ({
	default: () => useEmblaCarouselMock(),
}))

function mockMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: vi.fn(
			(query: string): MediaQueryList => ({
				matches,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(() => true),
			}),
		),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	Object.defineProperty(window, "innerWidth", {
		value: 1024,
		writable: true,
		configurable: true,
	})
	mockMatchMedia(false)

	if (typeof window.ResizeObserver === "undefined") {
		class ResizeObserverStub {
			observe() {
				// noop for jsdom
			}
			unobserve() {
				// noop for jsdom
			}
			disconnect() {
				// noop for jsdom
			}
		}

		Object.defineProperty(window, "ResizeObserver", {
			value: ResizeObserverStub,
			writable: true,
			configurable: true,
		})
	}
})

describe("Accordion", () => {
	it("renders accordion item and expands content", () => {
		render(
			<Accordion collapsible type="single">
				<AccordionItem value="item-1">
					<AccordionTrigger>Question</AccordionTrigger>
					<AccordionContent>Answer</AccordionContent>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText("Question")).toBeInTheDocument()
		expect(screen.queryByText("Answer")).not.toBeInTheDocument()

		fireEvent.click(screen.getByText("Question"))
		expect(screen.getByText("Answer")).toBeInTheDocument()
	})
})

describe("AlertDialog", () => {
	it("opens and renders alert dialog content", async () => {
		render(
			<AlertDialog>
				<AlertDialogTrigger>Open alert</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogTitle>Delete item</AlertDialogTitle>
					<AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction>Confirm</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>,
		)

		fireEvent.click(screen.getByText("Open alert"))

		expect(await screen.findByText("Delete item")).toBeInTheDocument()
		expect(screen.getByText("This cannot be undone.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument()
	})

	it("closes when cancel is clicked", async () => {
		render(
			<AlertDialog>
				<AlertDialogTrigger>Open alert</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogTitle>Delete item</AlertDialogTitle>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>,
		)

		fireEvent.click(screen.getByText("Open alert"))
		expect(await screen.findByText("Delete item")).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

		await waitFor(() => {
			expect(screen.queryByText("Delete item")).not.toBeInTheDocument()
		})
	})
})

describe("Collapsible", () => {
	it("toggles content when trigger is clicked", () => {
		render(
			<Collapsible>
				<CollapsibleTrigger>Toggle details</CollapsibleTrigger>
				<CollapsibleContent>Hidden details</CollapsibleContent>
			</Collapsible>,
		)

		expect(screen.queryByText("Hidden details")).not.toBeInTheDocument()
		fireEvent.click(screen.getByText("Toggle details"))
		expect(screen.getByText("Hidden details")).toBeInTheDocument()
	})

	it("renders content when defaultOpen is true", () => {
		render(
			<Collapsible defaultOpen>
				<CollapsibleTrigger>Toggle details</CollapsibleTrigger>
				<CollapsibleContent>Always visible initially</CollapsibleContent>
			</Collapsible>,
		)

		expect(screen.getByText("Always visible initially")).toBeInTheDocument()
	})
})

describe("Command", () => {
	it("renders command input and list items", () => {
		render(
			<Command>
				<CommandInput placeholder="Search commands" />
				<CommandList>
					<CommandGroup heading="General">
						<CommandItem>
							Open settings
							<CommandShortcut>Ctrl+S</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
				</CommandList>
			</Command>,
		)

		expect(screen.getByPlaceholderText("Search commands")).toBeInTheDocument()
		expect(screen.getByText("Open settings")).toBeInTheDocument()
		expect(screen.getByText("Ctrl+S")).toBeInTheDocument()
	})

	it("renders command dialog content when open", () => {
		render(
			<CommandDialog onOpenChange={vi.fn()} open>
				<CommandInput placeholder="Search palette" />
				<CommandList>
					<CommandItem>New chat</CommandItem>
				</CommandList>
			</CommandDialog>,
		)

		expect(screen.getByText("Command Palette")).toBeInTheDocument()
		expect(screen.getByText("Search for a command to run...")).toBeInTheDocument()
		expect(screen.getByText("New chat")).toBeInTheDocument()
	})
})

describe("HoverCard", () => {
	it("renders hover card content when open is controlled", () => {
		render(
			<HoverCard open>
				<HoverCardTrigger>Profile</HoverCardTrigger>
				<HoverCardContent>Profile details</HoverCardContent>
			</HoverCard>,
		)

		expect(screen.getByText("Profile")).toBeInTheDocument()
		expect(screen.getByText("Profile details")).toBeInTheDocument()
	})
})

describe("Label", () => {
	it("associates with an input via htmlFor and id", () => {
		render(
			<div>
				<Label htmlFor="name">Name</Label>
				<input id="name" />
			</div>,
		)

		const label = screen.getByText("Name")
		const input = screen.getByRole("textbox")

		expect(label).toHaveAttribute("for", "name")
		expect(input).toHaveAttribute("id", "name")
	})
})

describe("Popover", () => {
	it("renders popover content when open", () => {
		render(
			<Popover open>
				<PopoverTrigger>Open popover</PopoverTrigger>
				<PopoverContent>
					<PopoverHeader>
						<PopoverTitle>Notifications</PopoverTitle>
						<PopoverDescription>No new messages</PopoverDescription>
					</PopoverHeader>
				</PopoverContent>
			</Popover>,
		)

		expect(screen.getByText("Open popover")).toBeInTheDocument()
		expect(screen.getByText("Notifications")).toBeInTheDocument()
		expect(screen.getByText("No new messages")).toBeInTheDocument()
	})
})

describe("Progress", () => {
	it("renders a progressbar with the provided value", () => {
		const { container } = render(<Progress value={50} />)
		const indicator = container.querySelector('[data-slot="progress-indicator"]')

		expect(screen.getByRole("progressbar")).toBeInTheDocument()
		expect(indicator).toHaveStyle({ transform: "translateX(-50%)" })
	})
})

describe("ScrollArea", () => {
	it("renders root, viewport, and content", () => {
		const { container } = render(
			<ScrollArea className="h-20 w-20">
				<div>Scrollable content</div>
			</ScrollArea>,
		)

		expect(screen.getByText("Scrollable content")).toBeInTheDocument()
		expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument()
	})
})

describe("Separator", () => {
	it("renders a vertical separator when orientation is vertical", () => {
		render(<Separator decorative={false} orientation="vertical" />)

		const separator = screen.getByRole("separator")
		expect(separator).toHaveAttribute("data-orientation", "vertical")
	})
})

describe("Sheet", () => {
	it("opens and renders sheet content", async () => {
		render(
			<Sheet>
				<SheetTrigger>Open sheet</SheetTrigger>
				<SheetContent>
					<SheetTitle>Sheet title</SheetTitle>
					<SheetDescription>Sheet details</SheetDescription>
				</SheetContent>
			</Sheet>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Open sheet" }))

		expect(await screen.findByText("Sheet title")).toBeInTheDocument()
		expect(screen.getByText("Sheet details")).toBeInTheDocument()
	})

	it("closes when close button is clicked", async () => {
		render(
			<Sheet>
				<SheetTrigger>Open details sheet</SheetTrigger>
				<SheetContent>
					<SheetTitle>Sheet title</SheetTitle>
				</SheetContent>
			</Sheet>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Open details sheet" }))
		expect(await screen.findByText("Sheet title")).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Close" }))

		await waitFor(() => {
			expect(screen.queryByText("Sheet title")).not.toBeInTheDocument()
		})
	})
})

describe("Sidebar", () => {
	it("renders without crashing", () => {
		const { container } = render(
			<SidebarProvider initialIsMobile={false}>
				<Sidebar>
					<SidebarContent>Sidebar body</SidebarContent>
				</Sidebar>
			</SidebarProvider>,
		)

		expect(container).toBeDefined()
		expect(container.querySelector('[data-sidebar="sidebar"]')).toBeInTheDocument()
	})

	it("toggles collapsed state via sidebar trigger", async () => {
		const { container } = render(
			<SidebarProvider defaultOpen initialIsMobile={false}>
				<Sidebar>
					<SidebarHeader>
						<SidebarTrigger />
					</SidebarHeader>
					<SidebarContent>Links</SidebarContent>
				</Sidebar>
			</SidebarProvider>,
		)

		expect(container.querySelector('[data-state="expanded"]')).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }))

		await waitFor(() => {
			expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument()
		})
	})
})

describe("Slider", () => {
	it("renders as a range input and updates value", () => {
		render(<Slider defaultValue={50} max={100} min={0} />)
		const slider = screen.getByRole("slider") as HTMLInputElement

		expect(slider.type).toBe("range")
		expect(slider.value).toBe("50")

		fireEvent.change(slider, { target: { value: "75" } })
		expect(slider.value).toBe("75")
	})
})

describe("Switch", () => {
	it("toggles checked state on click", () => {
		render(<Switch aria-label="Airplane mode" />)
		const switchElement = screen.getByRole("switch", { name: "Airplane mode" })

		expect(switchElement).toHaveAttribute("data-state", "unchecked")
		fireEvent.click(switchElement)
		expect(switchElement).toHaveAttribute("data-state", "checked")
	})

	it("supports small size variant", () => {
		render(<Switch aria-label="Compact mode" size="sm" />)

		expect(screen.getByRole("switch", { name: "Compact mode" })).toHaveAttribute(
			"data-size",
			"sm",
		)
	})
})

describe("Carousel", () => {
	it("renders slides, navigation controls, and exposes api", async () => {
		const setApi = vi.fn()

		render(
			<Carousel setApi={setApi}>
				<CarouselContent>
					<CarouselItem>Slide 1</CarouselItem>
					<CarouselItem>Slide 2</CarouselItem>
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>,
		)

		expect(screen.getByText("Slide 1")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument()

		await waitFor(() => {
			expect(setApi).toHaveBeenCalledWith(emblaApiMock)
		})
	})

	it("handles ArrowLeft and ArrowRight keyboard navigation", () => {
		const { container } = render(
			<Carousel>
				<CarouselContent>
					<CarouselItem>Slide 1</CarouselItem>
				</CarouselContent>
			</Carousel>,
		)
		const carousel = container.querySelector('[data-slot="carousel"]')

		if (!carousel) {
			throw new Error("Expected carousel root element")
		}

		fireEvent.keyDown(carousel, { key: "ArrowLeft" })
		fireEvent.keyDown(carousel, { key: "ArrowRight" })

		expect(emblaApiMock.scrollPrev).toHaveBeenCalledTimes(1)
		expect(emblaApiMock.scrollNext).toHaveBeenCalledTimes(1)
	})
})
