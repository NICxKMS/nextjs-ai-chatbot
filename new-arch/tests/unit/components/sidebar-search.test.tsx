import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarSearch } from "@/components/sidebar/sidebar-search";

// Top-level regex pattern
const SEARCH_PATTERN = /search/i;

vi.mock("@/components/ui/input", () => ({
    Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
    Button: ({ children, onClick }: any) => (
        <button onClick={onClick} type="button">
            {children}
        </button>
    ),
}));

describe("SidebarSearch", () => {
    it("renders search input", () => {
        render(<SidebarSearch onChange={vi.fn()} />);
        expect(screen.getByPlaceholderText(SEARCH_PATTERN)).toBeDefined();
    });

    it("calls onChange when typing", () => {
        const onChange = vi.fn();
        render(<SidebarSearch onChange={onChange} />);
        fireEvent.change(screen.getByPlaceholderText(SEARCH_PATTERN), {
            target: { value: "test" },
        });
        expect(onChange).toHaveBeenCalledWith("test");
    });

    it("shows clear button when has value", () => {
        render(<SidebarSearch onChange={vi.fn()} value="test" />);
        expect(screen.getByRole("button")).toBeDefined();
    });

    it("clears value on clear button click", () => {
        const onChange = vi.fn();
        render(<SidebarSearch onChange={onChange} value="test" />);
        fireEvent.click(screen.getByRole("button"));
        expect(onChange).toHaveBeenCalledWith("");
    });
});
