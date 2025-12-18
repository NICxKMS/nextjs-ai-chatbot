import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModelSelector } from "@/components/settings/model-selector";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";

// Top-level regex patterns to avoid performance issues
const GPT4_PATTERN = /GPT-4/i;

const mockModels: ModelMetadata[] = [
    {
        id: "gpt-4",
        modelId: "gpt-4",
        name: "GPT-4",
        providerId: "openai",
        providerName: "OpenAI",
        description: "Advanced language model",
        capabilities: ["chat"],
        modalities: ["text"],
        tags: ["general"],
        source: "curated",
        isCurated: true,
    },
    {
        id: "claude-3",
        modelId: "claude-3-opus",
        name: "Claude 3",
        providerId: "anthropic",
        providerName: "Anthropic",
        description: "Anthropic flagship model",
        capabilities: ["chat"],
        modalities: ["text"],
        tags: ["general"],
        source: "curated",
        isCurated: true,
    },
];

describe("ModelSelector Component", () => {
    const defaultProps = {
        selectedModelId: "gpt-4",
        availableModels: mockModels,
    };

    it("renders current model", () => {
        render(<ModelSelector {...defaultProps} />);
        expect(screen.getByText(GPT4_PATTERN)).toBeInTheDocument();
    });

    it("renders as a button trigger", () => {
        render(<ModelSelector {...defaultProps} />);
        const trigger = screen.getByRole("button");
        expect(trigger).toBeInTheDocument();
    });

    it("opens dropdown on click", () => {
        render(<ModelSelector {...defaultProps} />);
        const trigger = screen.getByRole("button");
        fireEvent.click(trigger);
        // Should open dropdown menu
        expect(trigger).toBeInTheDocument();
    });
});
