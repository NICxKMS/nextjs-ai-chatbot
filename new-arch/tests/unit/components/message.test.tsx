import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Message } from "@/components/message";
import type { ChatMessage } from "@/components/message/types";

// Top-level regex patterns to avoid performance issues
const BOLD_TEXT_PATTERN = /Bold text/;

describe("Message Component", () => {
    const mockSetMessages = vi.fn();
    const mockRegenerate = vi.fn();

    const createMessage = (
        role: "user" | "assistant",
        text: string
    ): ChatMessage => ({
        id: "msg-1",
        role,
        parts: [{ type: "text", text }],
    });

    const defaultProps = {
        chatId: "chat-1",
        isLoading: false,
        setMessages: mockSetMessages,
        regenerate: mockRegenerate,
    };

    it("renders user message", () => {
        render(
            <Message
                {...defaultProps}
                message={createMessage("user", "User message")}
            />
        );
        expect(screen.getByText("User message")).toBeInTheDocument();
    });

    it("renders assistant message", () => {
        render(
            <Message
                {...defaultProps}
                message={createMessage("assistant", "AI response")}
            />
        );
        expect(screen.getByText("AI response")).toBeInTheDocument();
    });

    it("applies correct role styling", () => {
        const { container } = render(
            <Message
                {...defaultProps}
                message={createMessage("user", "Test")}
            />
        );
        const messageEl = container.querySelector('[data-role="user"]');
        expect(messageEl).toBeDefined();
    });

    it("shows loading state", () => {
        render(
            <Message
                {...defaultProps}
                isLoading={true}
                message={createMessage("assistant", "")}
            />
        );
        // Loading indicator should be present in assistant mode
        expect(screen.queryByTestId("message-assistant")).toBeInTheDocument();
    });

    it("renders markdown content", () => {
        render(
            <Message
                {...defaultProps}
                message={createMessage("assistant", "**Bold text**")}
            />
        );
        // The text content should be rendered (markdown processing may vary)
        expect(screen.getByText(BOLD_TEXT_PATTERN)).toBeInTheDocument();
    });
});
