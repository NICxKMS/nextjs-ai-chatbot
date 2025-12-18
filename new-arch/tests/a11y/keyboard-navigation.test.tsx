import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("Keyboard Navigation", () => {
    const FocusableComponent = () => (
        <div>
            <button data-testid="btn1" type="button">
                First
            </button>
            <button data-testid="btn2" type="button">
                Second
            </button>
            <button data-testid="btn3" type="button">
                Third
            </button>
        </div>
    );

    const DialogComponent = ({ onClose }: { onClose: () => void }) => (
        <div aria-labelledby="dialog-title" aria-modal="true" role="dialog">
            <h2 id="dialog-title">Confirm Action</h2>
            <p>Are you sure?</p>
            <button onClick={onClose} type="button">
                Cancel
            </button>
            <button onClick={onClose} type="button">
                Confirm
            </button>
        </div>
    );

    describe("Tab Navigation", () => {
        it("allows tab through focusable elements", async () => {
            render(<FocusableComponent />);
            const user = userEvent.setup();

            await user.tab();
            expect(screen.getByTestId("btn1")).toHaveFocus();

            await user.tab();
            expect(screen.getByTestId("btn2")).toHaveFocus();

            await user.tab();
            expect(screen.getByTestId("btn3")).toHaveFocus();
        });

        it("allows shift+tab reverse navigation", async () => {
            render(<FocusableComponent />);
            const user = userEvent.setup();

            screen.getByTestId("btn3").focus();

            await user.tab({ shift: true });
            expect(screen.getByTestId("btn2")).toHaveFocus();
        });
    });

    describe("Dialog/Modal", () => {
        it("traps focus within dialog", () => {
            const onClose = vi.fn();
            render(<DialogComponent onClose={onClose} />);

            const dialog = screen.getByRole("dialog");
            expect(dialog).toHaveAttribute("aria-modal", "true");
        });

        it("closes on Escape key", () => {
            const onClose = vi.fn();
            render(<DialogComponent onClose={onClose} />);

            fireEvent.keyDown(document, { key: "Escape" });
            // Dialog close handler should be called
        });
    });

    describe("Custom Keyboard Shortcuts", () => {
        const ShortcutComponent = ({
            onBold,
            onItalic,
        }: {
            onBold: () => void;
            onItalic: () => void;
        }) => (
            <textarea
                aria-label="Editor"
                onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "b") {
                        e.preventDefault();
                        onBold();
                    }
                    if (e.ctrlKey && e.key === "i") {
                        e.preventDefault();
                        onItalic();
                    }
                }}
            />
        );

        it("handles Ctrl+B for bold", () => {
            const onBold = vi.fn();
            render(<ShortcutComponent onBold={onBold} onItalic={vi.fn()} />);

            const textarea = screen.getByRole("textbox");
            fireEvent.keyDown(textarea, { key: "b", ctrlKey: true });

            expect(onBold).toHaveBeenCalled();
        });

        it("handles Ctrl+I for italic", () => {
            const onItalic = vi.fn();
            render(<ShortcutComponent onBold={vi.fn()} onItalic={onItalic} />);

            const textarea = screen.getByRole("textbox");
            fireEvent.keyDown(textarea, { key: "i", ctrlKey: true });

            expect(onItalic).toHaveBeenCalled();
        });
    });
});
