import { vi } from "vitest";
import { mockResponses } from "./responses";

export const mockToolExecutors = {
    getWeather: vi.fn().mockResolvedValue(mockResponses.weatherTool),
    createDocument: vi.fn().mockResolvedValue(mockResponses.documentCreation),
    updateDocument: vi.fn().mockResolvedValue({ success: true }),
    searchWeb: vi.fn().mockResolvedValue([
        {
            title: "Result 1",
            url: "https://example.com/1",
            snippet: "First result",
        },
        {
            title: "Result 2",
            url: "https://example.com/2",
            snippet: "Second result",
        },
    ]),
    requestSuggestions: vi
        .fn()
        .mockResolvedValue(["Suggestion 1", "Suggestion 2", "Suggestion 3"]),
};

export function getMockToolExecutor(toolName: string) {
    return mockToolExecutors[toolName as keyof typeof mockToolExecutors];
}

export function resetAllMockTools() {
    for (const mock of Object.values(mockToolExecutors)) {
        mock.mockClear();
    }
}

// Create a mock tool with custom behavior
export function createMockTool<T>(config: {
    name: string;
    description: string;
    defaultResult: T;
}) {
    const executor = vi.fn().mockResolvedValue(config.defaultResult);

    return {
        name: config.name,
        description: config.description,
        execute: executor,
        mockResult: (result: T) => executor.mockResolvedValueOnce(result),
        mockError: (error: Error) => executor.mockRejectedValueOnce(error),
        reset: () => executor.mockClear(),
    };
}
