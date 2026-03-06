// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

function clearSidebarCookie() {
	// biome-ignore lint/suspicious/noDocumentCookie: test setup needs deterministic cookie state
	document.cookie = "sidebar_state=;max-age=0;path=/"
}

function mockMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: vi.fn((query: string): MediaQueryList => {
			return {
				matches,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(() => true),
			}
		}),
	})
}

function setViewport(width: number) {
	Object.defineProperty(window, "innerWidth", {
		value: width,
		writable: true,
		configurable: true,
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	clearSidebarCookie()
	setViewport(1200)
	mockMatchMedia(false)
})

describe("sidebar.tsx deep coverage", () => {
	it("throws when useSidebar is used outside SidebarProvider", () => {
		function InvalidConsumer() {
			useSidebar()
			return null
		}

		expect(() => render(<InvalidConsumer />)).toThrow(
			/useSidebar must be used within a <SidebarProvider \/>/i,
		)
	})

	it("hydrates from cookie and persists state changes via trigger, rail, and keyboard shortcut", async () => {
		// biome-ignore lint/suspicious/noDocumentCookie: test controls hydration cookie
		document.cookie = "sidebar_state=false;path=/"
		const triggerClick = vi.fn()

		const { container } = render(
			<SidebarProvider defaultOpen initialIsMobile={false}>
				<Sidebar>
					<SidebarHeader>
						<SidebarTrigger onClick={triggerClick} />
					</SidebarHeader>
					<SidebarContent>Links</SidebarContent>
					<SidebarRail />
				</Sidebar>
			</SidebarProvider>,
		)

		await waitFor(() => {
			expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument()
		})

		const trigger = container.querySelector('[data-sidebar="trigger"]')
		expect(trigger).toBeInTheDocument()
		if (!trigger) {
			throw new Error("Expected sidebar trigger to exist")
		}

		fireEvent.click(trigger)
		expect(triggerClick).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(container.querySelector('[data-state="expanded"]')).toBeInTheDocument()
		})
		expect(document.cookie).toContain("sidebar_state=true")

		fireEvent.click(screen.getByTitle("Toggle Sidebar"))
		await waitFor(() => {
			expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument()
		})
		expect(document.cookie).toContain("sidebar_state=false")

		fireEvent.keyDown(window, {
			key: "b",
			ctrlKey: true,
		})
		await waitFor(() => {
			expect(container.querySelector('[data-state="expanded"]')).toBeInTheDocument()
		})
	})

	it("uses controlled mode by delegating state changes to onOpenChange", async () => {
		const onOpenChange = vi.fn()

		const { container } = render(
			<SidebarProvider initialIsMobile={false} onOpenChange={onOpenChange} open={false}>
				<Sidebar>
					<SidebarHeader>
						<SidebarTrigger />
					</SidebarHeader>
					<SidebarContent>Controlled</SidebarContent>
				</Sidebar>
			</SidebarProvider>,
		)

		expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }))
		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it("renders mobile sheet layout and toggles with SidebarTrigger", async () => {
		setViewport(375)
		mockMatchMedia(true)

		render(
			<SidebarProvider initialIsMobile={true}>
				<SidebarTrigger />
				<Sidebar side="right">
					<SidebarContent>Mobile Links</SidebarContent>
				</Sidebar>
			</SidebarProvider>,
		)

		expect(screen.queryByText("Mobile Links")).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }))

		await waitFor(() => {
			expect(screen.getByText("Mobile Links")).toBeInTheDocument()
		})
		expect(document.querySelector('[data-mobile="true"]')).toBeInTheDocument()
	})

	it("renders non-collapsible sidebar and all sidebar primitives", () => {
		render(
			<TooltipProvider>
				<SidebarProvider defaultOpen initialIsMobile={false}>
					<Sidebar collapsible="none" side="left" variant="floating">
						<SidebarHeader>
							<SidebarInput aria-label="Sidebar search" placeholder="Search" />
							<SidebarSeparator />
						</SidebarHeader>

						<SidebarContent>
							<SidebarGroup>
								<SidebarGroupLabel asChild>
									<span>Projects</span>
								</SidebarGroupLabel>
								<SidebarGroupAction asChild>
									<button type="button">Add</button>
								</SidebarGroupAction>

								<SidebarGroupContent>
									<SidebarMenu>
										<SidebarMenuItem>
											<SidebarMenuButton
												isActive
												tooltip="Project one tooltip"
											>
												<span>Project One</span>
											</SidebarMenuButton>
											<SidebarMenuAction showOnHover>
												<span>Action</span>
											</SidebarMenuAction>
											<SidebarMenuBadge>8</SidebarMenuBadge>
										</SidebarMenuItem>

										<SidebarMenuSkeleton index={3} showIcon />

										<SidebarMenuSub>
											<SidebarMenuSubItem>
												<SidebarMenuSubButton isActive size="sm">
													<span>Sub item</span>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										</SidebarMenuSub>
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						</SidebarContent>

						<SidebarFooter>
							<span>Footer</span>
						</SidebarFooter>
					</Sidebar>

					<SidebarInset>
						<div>Main content</div>
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>,
		)

		expect(screen.getByLabelText("Sidebar search")).toBeInTheDocument()
		expect(screen.getByText("Projects")).toBeInTheDocument()
		expect(screen.getByText("Project One")).toBeInTheDocument()
		expect(screen.getByText("Action")).toBeInTheDocument()
		expect(screen.getByText("8")).toBeInTheDocument()
		expect(screen.getByText("Sub item")).toBeInTheDocument()
		expect(screen.getByText("Footer")).toBeInTheDocument()
		expect(screen.getByText("Main content")).toBeInTheDocument()

		const skeletonText = document.querySelector('[data-sidebar="menu-skeleton-text"]')
		expect(skeletonText).toHaveAttribute("style", expect.stringContaining("--skeleton-width"))
		expect(document.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeInTheDocument()
	})
})
