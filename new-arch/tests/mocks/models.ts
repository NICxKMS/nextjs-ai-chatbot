export const mockModels = {
    "mock-gpt-4": {
        id: "mock-gpt-4",
        name: "Mock GPT-4",
        provider: "mock-openai",
        providerId: "openai",
        capabilities: {
            vision: true,
            tools: true,
            streaming: true,
        },
        contextWindow: 128_000,
        maxTokens: 4096,
    },
    "mock-claude-3": {
        id: "mock-claude-3",
        name: "Mock Claude 3",
        provider: "mock-anthropic",
        providerId: "anthropic",
        capabilities: {
            vision: true,
            tools: true,
            streaming: true,
        },
        contextWindow: 200_000,
        maxTokens: 4096,
    },
    "mock-gemini": {
        id: "mock-gemini",
        name: "Mock Gemini",
        provider: "mock-google",
        providerId: "google",
        capabilities: {
            vision: true,
            tools: true,
            streaming: true,
        },
        contextWindow: 1_000_000,
        maxTokens: 8192,
    },
} as const;

export type MockModelId = keyof typeof mockModels;

export function getMockModel(id: MockModelId) {
    return mockModels[id];
}

export function getAllMockModels() {
    return Object.values(mockModels);
}
