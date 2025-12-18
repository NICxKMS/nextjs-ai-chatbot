import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, expect, it } from "vitest";

expect.extend(toHaveNoViolations);

// Mock components for a11y testing
const MockChat = () => (
    <main aria-label="Chat conversation">
        <div aria-label="Messages" aria-live="polite" role="log">
            <article aria-label="User message">
                <p>Hello, how can I help?</p>
            </article>
        </div>
        <form aria-label="Message input">
            <label className="sr-only" htmlFor="message-input">
                Type a message
            </label>
            <textarea id="message-input" placeholder="Type a message..." />
            <button aria-label="Send message" type="submit">
                Send
            </button>
        </form>
    </main>
);

const MockSidebar = () => (
    <nav aria-label="Chat history">
        <h2 className="sr-only" id="sidebar-heading">
            Chat History
        </h2>
        <button aria-label="Create new chat" type="button">
            New Chat
        </button>
        <ul aria-labelledby="sidebar-heading">
            <li>
                <a aria-current="page" href="/chat/1">
                    Current Chat
                </a>
            </li>
            <li>
                <a href="/chat/2">Previous Chat</a>
            </li>
        </ul>
    </nav>
);

const MockModelSelector = () => (
    <div
        aria-expanded="false"
        aria-label="Select AI model"
        role="combobox"
        tabIndex={0}
    >
        <button
            aria-haspopup="listbox"
            aria-label="GPT-4, click to change"
            type="button"
        >
            GPT-4
        </button>
    </div>
);

const MockToolbar = () => (
    <div aria-label="Formatting tools" role="toolbar">
        <button aria-label="Bold text" aria-pressed="false" type="button">
            B
        </button>
        <button aria-label="Italic text" aria-pressed="false" type="button">
            I
        </button>
        <button aria-label="Attach file" type="button">
            📎
        </button>
    </div>
);

describe("Accessibility Tests", () => {
    describe("Chat Component", () => {
        it("has no accessibility violations", async () => {
            const { container } = render(<MockChat />);
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it("has proper ARIA roles", () => {
            const { container } = render(<MockChat />);
            expect(
                container.querySelector('[role="main"]')
            ).toBeInTheDocument();
            expect(container.querySelector('[role="log"]')).toBeInTheDocument();
            expect(
                container.querySelector('[role="form"]')
            ).toBeInTheDocument();
        });

        it("has accessible form controls", () => {
            const { container } = render(<MockChat />);
            const input = container.querySelector("textarea");
            expect(input).toHaveAttribute("id");
            const label = container.querySelector(`label[for="${input?.id}"]`);
            expect(label).toBeInTheDocument();
        });

        it("uses aria-live for messages", () => {
            const { container } = render(<MockChat />);
            expect(container.querySelector("[aria-live]")).toBeInTheDocument();
        });
    });

    describe("Sidebar Component", () => {
        it("has no accessibility violations", async () => {
            const { container } = render(<MockSidebar />);
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it("has navigation landmark", () => {
            const { container } = render(<MockSidebar />);
            expect(
                container.querySelector('[role="navigation"]')
            ).toBeInTheDocument();
        });

        it("indicates current page", () => {
            const { container } = render(<MockSidebar />);
            expect(
                container.querySelector('[aria-current="page"]')
            ).toBeInTheDocument();
        });

        it("has labeled list", () => {
            const { container } = render(<MockSidebar />);
            const list = container.querySelector("ul");
            expect(list).toHaveAttribute("aria-labelledby");
        });
    });

    describe("Model Selector Component", () => {
        it("has no accessibility violations", async () => {
            const { container } = render(<MockModelSelector />);
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it("has combobox role", () => {
            const { container } = render(<MockModelSelector />);
            expect(
                container.querySelector('[role="combobox"]')
            ).toBeInTheDocument();
        });

        it("has haspopup attribute", () => {
            const { container } = render(<MockModelSelector />);
            expect(
                container.querySelector('[aria-haspopup="listbox"]')
            ).toBeInTheDocument();
        });
    });

    describe("Toolbar Component", () => {
        it("has no accessibility violations", async () => {
            const { container } = render(<MockToolbar />);
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it("has toolbar role", () => {
            const { container } = render(<MockToolbar />);
            expect(
                container.querySelector('[role="toolbar"]')
            ).toBeInTheDocument();
        });

        it("buttons have accessible labels", () => {
            const { container } = render(<MockToolbar />);
            const buttons = container.querySelectorAll("button");
            for (const button of buttons) {
                expect(button).toHaveAttribute("aria-label");
            }
        });

        it("toggle buttons have aria-pressed", () => {
            const { container } = render(<MockToolbar />);
            const toggleButtons = container.querySelectorAll("[aria-pressed]");
            expect(toggleButtons.length).toBeGreaterThan(0);
        });
    });
});
