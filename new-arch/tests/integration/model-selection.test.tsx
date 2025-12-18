import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

describe("Model Selection Integration", () => {
    const models = [
        { id: "gpt-4", name: "GPT-4", provider: "openai", isPremium: true },
        {
            id: "gpt-3.5",
            name: "GPT-3.5",
            provider: "openai",
            isPremium: false,
        },
        {
            id: "claude-3",
            name: "Claude 3",
            provider: "anthropic",
            isPremium: true,
        },
    ];

    const ModelSelector = ({
        models: modelList,
        selectedId,
        onSelect,
        userTier = "free",
    }: {
        models: typeof models;
        selectedId: string;
        onSelect: (id: string) => void;
        userTier?: "free" | "pro";
    }) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const selectedModel = modelList.find((m) => m.id === selectedId);

        return (
            <div data-testid="model-selector">
                <button
                    data-expanded={isOpen}
                    data-testid="selector-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                    type="button"
                >
                    {selectedModel?.name || "Select Model"}
                </button>
                {isOpen && (
                    <div data-testid="model-list">
                        {modelList.map((model) => {
                            const isDisabled =
                                model.isPremium && userTier === "free";
                            return (
                                <div
                                    data-disabled={isDisabled}
                                    data-selected={model.id === selectedId}
                                    data-testid={`model-${model.id}`}
                                    key={model.id}
                                >
                                    <button
                                        disabled={isDisabled}
                                        onClick={() => {
                                            if (!isDisabled) {
                                                onSelect(model.id);
                                                setIsOpen(false);
                                            }
                                        }}
                                        type="button"
                                    >
                                        {model.name}
                                        {model.isPremium && <span>✨ Pro</span>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    describe("Model Selection", () => {
        it("opens dropdown on click", async () => {
            render(
                <ModelSelector
                    models={models}
                    onSelect={vi.fn()}
                    selectedId="gpt-3.5"
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByTestId("selector-trigger"));

            expect(screen.getByTestId("model-list")).toBeInTheDocument();
        });

        it("selects model and closes", async () => {
            const onSelect = vi.fn();
            render(
                <ModelSelector
                    models={models}
                    onSelect={onSelect}
                    selectedId="gpt-3.5"
                    userTier="pro"
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByTestId("selector-trigger"));
            await user.click(screen.getByText("GPT-4"));

            expect(onSelect).toHaveBeenCalledWith("gpt-4");
            expect(screen.queryByTestId("model-list")).not.toBeInTheDocument();
        });

        it("disables premium models for free users", async () => {
            render(
                <ModelSelector
                    models={models}
                    onSelect={vi.fn()}
                    selectedId="gpt-3.5"
                    userTier="free"
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByTestId("selector-trigger"));

            const gpt4Option = screen.getByTestId("model-gpt-4");
            expect(gpt4Option).toHaveAttribute("aria-disabled", "true");
        });

        it("enables premium models for pro users", async () => {
            render(
                <ModelSelector
                    models={models}
                    onSelect={vi.fn()}
                    selectedId="gpt-3.5"
                    userTier="pro"
                />
            );
            const user = userEvent.setup();

            await user.click(screen.getByTestId("selector-trigger"));

            const gpt4Option = screen.getByTestId("model-gpt-4");
            expect(gpt4Option).toHaveAttribute("aria-disabled", "false");
        });
    });
});
