import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Mock components for snapshot testing
const Message = ({
    role,
    content,
}: {
    role: "user" | "assistant";
    content: string;
}) => (
    <div className={`message message-${role}`}>
        <div className="message-avatar">{role === "user" ? "👤" : "🤖"}</div>
        <div className="message-content">{content}</div>
    </div>
);

const ChatHeader = ({ title, model }: { title: string; model: string }) => (
    <header className="chat-header">
        <h1>{title}</h1>
        <span className="model-badge">{model}</span>
    </header>
);

const SidebarItem = ({
    title,
    isActive,
    timestamp,
}: {
    title: string;
    isActive: boolean;
    timestamp: Date;
}) => (
    <div className={`sidebar-item ${isActive ? "active" : ""}`}>
        <span className="title">{title}</span>
        <span className="timestamp">{timestamp.toLocaleDateString()}</span>
    </div>
);

const ModelCard = ({
    name,
    provider,
    description,
}: {
    name: string;
    provider: string;
    description: string;
}) => (
    <div className="model-card">
        <div className="model-header">
            <h3>{name}</h3>
            <span className="provider">{provider}</span>
        </div>
        <p className="description">{description}</p>
    </div>
);

const ToolbarButton = ({
    icon,
    label,
    isActive = false,
}: {
    icon: string;
    label: string;
    isActive?: boolean;
}) => (
    <button
        aria-label={label}
        className={`toolbar-btn ${isActive ? "active" : ""}`}
        data-pressed={isActive}
        type="button"
    >
        {icon}
    </button>
);

describe("Component Snapshots", () => {
    describe("Message", () => {
        it("matches snapshot for user message", () => {
            const { container } = render(
                <Message content="Hello, how can I help?" role="user" />
            );
            expect(container).toMatchSnapshot();
        });

        it("matches snapshot for assistant message", () => {
            const { container } = render(
                <Message
                    content="I'm here to assist you with any questions."
                    role="assistant"
                />
            );
            expect(container).toMatchSnapshot();
        });

        it("matches snapshot with code block", () => {
            const { container } = render(
                <Message
                    content="Here's some code:\n```javascript\nconsole.log('hello');\n```"
                    role="assistant"
                />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe("ChatHeader", () => {
        it("matches snapshot", () => {
            const { container } = render(
                <ChatHeader model="GPT-4" title="New Conversation" />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe("SidebarItem", () => {
        it("matches snapshot for inactive item", () => {
            const { container } = render(
                <SidebarItem
                    isActive={false}
                    timestamp={new Date("2024-01-15")}
                    title="Previous Chat"
                />
            );
            expect(container).toMatchSnapshot();
        });

        it("matches snapshot for active item", () => {
            const { container } = render(
                <SidebarItem
                    isActive={true}
                    timestamp={new Date("2024-01-15")}
                    title="Current Chat"
                />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe("ModelCard", () => {
        it("matches snapshot", () => {
            const { container } = render(
                <ModelCard
                    description="Most capable GPT-4 model for complex tasks"
                    name="GPT-4 Turbo"
                    provider="OpenAI"
                />
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe("ToolbarButton", () => {
        it("matches snapshot for inactive button", () => {
            const { container } = render(
                <ToolbarButton icon="B" isActive={false} label="Bold" />
            );
            expect(container).toMatchSnapshot();
        });

        it("matches snapshot for active button", () => {
            const { container } = render(
                <ToolbarButton icon="B" isActive={true} label="Bold" />
            );
            expect(container).toMatchSnapshot();
        });
    });
});
it("matches snapshot for active button", () => {
    const { container } = render(
        <ToolbarButton icon="B" isActive={true} label="Bold" />
    );
    expect(container).toMatchSnapshot();
});

it("matches snapshot for active button", () => {
    const { container } = render(
        <ToolbarButton icon="B" isActive={true} label="Bold" />
    );
    expect(container).toMatchSnapshot();
});

it("matches snapshot for active button", () => {
    const { container } = render(
        <ToolbarButton icon="B" isActive={true} label="Bold" />
    );
    expect(container).toMatchSnapshot();
});

it("matches snapshot for active button", () => {
    const { container } = render(
        <ToolbarButton icon="B" isActive={true} label="Bold" />
    );
    expect(container).toMatchSnapshot();
});
