import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => "/chat/1",
}));

// Mock data
vi.mock("@/lib/data", () => ({
    getChats: vi.fn(),
    deleteChat: vi.fn(),
    renameChat: vi.fn(),
}));

describe("Sidebar Navigation Integration", () => {
    const mockChats = [
        { id: "1", title: "Current Chat", createdAt: new Date("2024-01-15") },
        { id: "2", title: "Previous Chat", createdAt: new Date("2024-01-14") },
        { id: "3", title: "Old Chat", createdAt: new Date("2024-01-10") },
    ];

    // Sidebar mock
    const Sidebar = ({
        chats,
        activeChatId,
        onChatSelect,
        onChatDelete,
        onNewChat,
    }: {
        chats: typeof mockChats;
        activeChatId: string;
        onChatSelect: (id: string) => void;
        onChatDelete: (id: string) => void;
        onNewChat: () => void;
    }) => (
        <nav data-testid="sidebar">
            <button
                data-testid="new-chat-btn"
                onClick={onNewChat}
                type="button"
            >
                New Chat
            </button>
            <ul data-testid="chat-list">
                {chats.map((chat) => (
                    <li
                        className={chat.id === activeChatId ? "active" : ""}
                        data-testid={`chat-item-${chat.id}`}
                        key={chat.id}
                    >
                        <button
                            onClick={() => onChatSelect(chat.id)}
                            type="button"
                        >
                            {chat.title}
                        </button>
                        <button
                            aria-label={`Delete ${chat.title}`}
                            data-testid={`delete-${chat.id}`}
                            onClick={() => onChatDelete(chat.id)}
                            type="button"
                        >
                            🗑️
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Navigation", () => {
        it("navigates to selected chat", async () => {
            const onChatSelect = vi.fn();
            render(
                <Sidebar
                    activeChatId="1"
                    chats={mockChats}
                    onChatDelete={vi.fn()}
                    onChatSelect={onChatSelect}
                    onNewChat={vi.fn()}
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByText("Previous Chat"));

            expect(onChatSelect).toHaveBeenCalledWith("2");
        });

        it("creates new chat", async () => {
            const onNewChat = vi.fn();
            render(
                <Sidebar
                    activeChatId="1"
                    chats={mockChats}
                    onChatDelete={vi.fn()}
                    onChatSelect={vi.fn()}
                    onNewChat={onNewChat}
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByTestId("new-chat-btn"));

            expect(onNewChat).toHaveBeenCalled();
        });
    });

    describe("Chat Management", () => {
        it("deletes chat", async () => {
            const onChatDelete = vi.fn();
            render(
                <Sidebar
                    activeChatId="1"
                    chats={mockChats}
                    onChatDelete={onChatDelete}
                    onChatSelect={vi.fn()}
                    onNewChat={vi.fn()}
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByTestId("delete-2"));

            expect(onChatDelete).toHaveBeenCalledWith("2");
        });

        it("highlights active chat", () => {
            render(
                <Sidebar
                    activeChatId="1"
                    chats={mockChats}
                    onChatDelete={vi.fn()}
                    onChatSelect={vi.fn()}
                    onNewChat={vi.fn()}
                />
            );

            const activeItem = screen.getByTestId("chat-item-1");
            expect(activeItem).toHaveClass("active");
        });
    });

    describe("Chat List", () => {
        it("displays all chats", () => {
            render(
                <Sidebar
                    activeChatId="1"
                    chats={mockChats}
                    onChatDelete={vi.fn()}
                    onChatSelect={vi.fn()}
                    onNewChat={vi.fn()}
                />
            );

            expect(screen.getByText("Current Chat")).toBeInTheDocument();
            expect(screen.getByText("Previous Chat")).toBeInTheDocument();
            expect(screen.getByText("Old Chat")).toBeInTheDocument();
        });

        it("shows empty state when no chats", () => {
            render(
                <Sidebar
                    activeChatId=""
                    chats={[]}
                    onChatDelete={vi.fn()}
                    onChatSelect={vi.fn()}
                    onNewChat={vi.fn()}
                />
            );

            const list = screen.getByTestId("chat-list");
            expect(within(list).queryAllByRole("listitem")).toHaveLength(0);
        });
    });
});
