import { createMockLanguageModel } from "./streams";

export type MockProvider = {
    id: string;
    name: string;
    getModel: (modelId: string) => ReturnType<typeof createMockLanguageModel>;
};

export const mockProviders: Record<string, MockProvider> = {
    "mock-openai": {
        id: "mock-openai",
        name: "Mock OpenAI",
        getModel: (modelId) => createMockLanguageModel(modelId),
    },
    "mock-anthropic": {
        id: "mock-anthropic",
        name: "Mock Anthropic",
        getModel: (modelId) => createMockLanguageModel(modelId),
    },
    "mock-google": {
        id: "mock-google",
        name: "Mock Google",
        getModel: (modelId) => createMockLanguageModel(modelId),
    },
};

export function getMockProvider(providerId: string): MockProvider {
    const provider = mockProviders[providerId];
    if (!provider) {
        throw new Error(`Mock provider not found: ${providerId}`);
    }
    return provider;
}
