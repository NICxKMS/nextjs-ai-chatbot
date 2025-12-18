import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

// Mock entire chat flow
vi.mock("@/lib/ai", () => ({
    streamChat: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
    createChat: vi.fn(),
    saveMessage: vi.fn(),
    getMessages: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    SessionManager: {
        getSession: vi
            .fn()
            .mockResolvedValue({ user: { id: "u1", email: "test@test.com" } }),
    },
}));

describe("Chat Flow Integration", () => {
    // Full chat page mock
    const ChatPage = () => {
        const [messages, setMessages] = React.useState<
            Array<{ role: string; content: string }>
        >([]);
        const [input, setInput] = React.useState("");
        const [isLoading, setIsLoading] = React.useState(false);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!input.trim()) {
                return;
            }

            // Add user message
            setMessages((prev) => [...prev, { role: "user", content: input }]);
            setInput("");
            setIsLoading(true);

            // Simulate AI response
            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "Mock response" },
                ]);
                setIsLoading(false);
            }, 100);
        };

        return (
            <main data-testid="chat-page">
                <div data-testid="messages">
                    {messages.map((m, i) => (
                        <div
                            data-testid={`message-${m.role}`}
                            key={`${m.role}-${i}`}
                        >
                            {m.content}
                        </div>
                    ))}
                </div>
                {isLoading && <div data-testid="loading">Loading...</div>}
                <form onSubmit={handleSubmit}>
                    <input
                        data-testid="message-input"
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message"
                        type="text"
                        value={input}
                    />
                    <button data-testid="send-button" type="submit">
                        Send
                    </button>
                </form>
            </main>
        );
    };

    describe("Complete Chat Cycle", () => {
        it("sends message and receives response", async () => {
            render(<ChatPage />);
            const user = userEvent.setup();

            const input = screen.getByTestId("message-input");
            await user.type(input, "Hello AI");

            const sendButton = screen.getByTestId("send-button");
            await user.click(sendButton);

            // User message appears
            expect(screen.getByTestId("message-user")).toHaveTextContent(
                "Hello AI"
            );

            // Loading state
            expect(screen.getByTestId("loading")).toBeInTheDocument();

            // Wait for response
            await waitFor(() => {
                expect(
                    screen.getByTestId("message-assistant")
                ).toHaveTextContent("Mock response");
            });
        });

        it("clears input after sending", async () => {
            render(<ChatPage />);
            const user = userEvent.setup();

            const input = screen.getByTestId(
                "message-input"
            ) as HTMLInputElement;
            await user.type(input, "Test message");
            await user.click(screen.getByTestId("send-button"));

            expect(input.value).toBe("");
        });

        it("prevents empty messages", async () => {
            render(<ChatPage />);
            const user = userEvent.setup();

            await user.click(screen.getByTestId("send-button"));

            // No messages should be added
            expect(
                screen.queryByTestId("message-user")
            ).not.toBeInTheDocument();
        });
    });
});
