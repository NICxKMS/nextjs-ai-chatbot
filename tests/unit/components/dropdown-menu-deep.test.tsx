// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function FullCompoundMenu({ onItemSelect }: { onItemSelect: () => void }) {
	return (
		<DropdownMenu open>
			<DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<div data-testid="custom-portal-child">Portal Child</div>
			</DropdownMenuPortal>
			<DropdownMenuContent className="deep-content" data-testid="dropdown-content">
				<DropdownMenuLabel inset>Actions</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem inset onSelect={onItemSelect}>
						Profile
						<DropdownMenuShortcut>Cmd+P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuCheckboxItem checked={true}>Pinned</DropdownMenuCheckboxItem>
					<DropdownMenuRadioGroup value="alpha">
						<DropdownMenuRadioItem value="alpha">Alpha</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="beta">Beta</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuSub open>
					<DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

describe("dropdown-menu.tsx deep coverage", () => {
	it("renders all named dropdown-menu exports in a composed menu", () => {
		const onItemSelect = vi.fn()
		render(<FullCompoundMenu onItemSelect={onItemSelect} />)

		expect(screen.getByTestId("custom-portal-child")).toBeInTheDocument()
		expect(screen.getByTestId("dropdown-content")).toHaveAttribute(
			"data-slot",
			"dropdown-menu-content",
		)
		expect(screen.getByText("Actions")).toHaveAttribute("data-slot", "dropdown-menu-label")
		expect(screen.getByRole("menuitem", { name: /Profile\s*Cmd\+P/ })).toHaveAttribute(
			"data-slot",
			"dropdown-menu-item",
		)
		expect(screen.getByText("Cmd+P")).toHaveAttribute("data-slot", "dropdown-menu-shortcut")
		expect(screen.getByRole("menuitemcheckbox", { name: "Pinned" })).toHaveAttribute(
			"data-slot",
			"dropdown-menu-checkbox-item",
		)
		expect(document.querySelector('[data-slot="dropdown-menu-group"]')).toBeInTheDocument()
		expect(
			document.querySelector('[data-slot="dropdown-menu-radio-group"]'),
		).toBeInTheDocument()
		expect(screen.getByRole("menuitemradio", { name: "Alpha" })).toHaveAttribute(
			"data-slot",
			"dropdown-menu-radio-item",
		)
		expect(screen.getByText("More")).toHaveAttribute("data-slot", "dropdown-menu-sub-trigger")
		expect(screen.getByText("Delete")).toHaveAttribute("data-variant", "destructive")
		expect(
			document.querySelector('[data-slot="dropdown-menu-sub-content"]'),
		).toBeInTheDocument()
		expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).toBeInTheDocument()
	})

	it("opens and closes through trigger + Escape key", async () => {
		render(
			<DropdownMenu>
				<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>First Action</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		)

		expect(screen.queryByRole("menu")).not.toBeInTheDocument()

		const trigger = screen.getByRole("button", { name: "Actions" })
		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		await waitFor(() => {
			expect(screen.getByRole("menu")).toBeInTheDocument()
		})

		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
		await waitFor(() => {
			expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		})
	})

	it("supports item selection and basic keyboard navigation", async () => {
		const onSelect = vi.fn()

		render(
			<DropdownMenu>
				<DropdownMenuTrigger>Keyboard Menu</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem onSelect={onSelect}>First Action</DropdownMenuItem>
					<DropdownMenuItem>Second Action</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		)

		const trigger = screen.getByRole("button", { name: "Keyboard Menu" })
		trigger.focus()
		fireEvent.keyDown(trigger, { key: "Enter" })

		await waitFor(() => {
			expect(screen.getByRole("menu")).toBeInTheDocument()
		})

		fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" })
		await waitFor(() => {
			expect(document.activeElement?.getAttribute("role")).toBe("menuitem")
		})

		fireEvent.click(screen.getByRole("menuitem", { name: "First Action" }))
		expect(onSelect).toHaveBeenCalledTimes(1)
	})

	it("updates checkbox and radio state from menu interactions", async () => {
		function StatefulSelectionMenu() {
			const [checked, setChecked] = useState(false)
			const [choice, setChoice] = useState("alpha")

			return (
				<>
					<DropdownMenu open>
						<DropdownMenuTrigger>State Menu</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuCheckboxItem
								checked={checked}
								onCheckedChange={(value) => setChecked(value === true)}
							>
								Remember choice
							</DropdownMenuCheckboxItem>
							<DropdownMenuRadioGroup onValueChange={setChoice} value={choice}>
								<DropdownMenuRadioItem value="alpha">Alpha</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="beta">Beta</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					<div data-testid="checked-value">checked:{String(checked)}</div>
					<div data-testid="choice-value">choice:{choice}</div>
				</>
			)
		}

		render(<StatefulSelectionMenu />)

		expect(screen.getByTestId("checked-value")).toHaveTextContent("checked:false")
		expect(screen.getByTestId("choice-value")).toHaveTextContent("choice:alpha")

		fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Remember choice" }))
		await waitFor(() => {
			expect(screen.getByTestId("checked-value")).toHaveTextContent("checked:true")
		})

		fireEvent.click(screen.getByRole("menuitemradio", { name: "Beta" }))
		await waitFor(() => {
			expect(screen.getByTestId("choice-value")).toHaveTextContent("choice:beta")
		})
	})
})
