// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FileIcon, LoaderIcon, SidebarLeftIcon } from "@/components/icons"

const iconComponents = [
	["FileIcon", FileIcon],
	["LoaderIcon", LoaderIcon],
	["SidebarLeftIcon", SidebarLeftIcon],
] as const

describe("icons", () => {
	it.each(iconComponents)("renders %s without crashing", (_iconName, IconComponent) => {
		const { container } = render(<IconComponent size={20} />)
		const svg = container.querySelector("svg")

		expect(svg).toBeTruthy()
		expect(svg).toHaveAttribute("width", "20")
	})
})
