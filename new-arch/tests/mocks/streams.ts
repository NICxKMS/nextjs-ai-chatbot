import { vi } from "vitest";

export type MockStreamConfig = {
    response: string;
    delayMs?: number;
    shouldError?: boolean;
    errorMessage?: string;
    toolCalls?: Array<{
        id: string;
        name: string;
        args: Record<string, unknown>;
    }>;
};

export function createMockStream(config: MockStreamConfig) {
    const {
        response,
        delayMs = 10,
        shouldError = false,
        errorMessage,
    } = config;

    return new ReadableStream({
        async start(controller) {
            if (shouldError) {
                controller.error(new Error(errorMessage || "Mock error"));
                return;
            }

            const words = response.split(" ");
            for (const word of words) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                controller.enqueue(new TextEncoder().encode(`${word} `));
            }
            controller.close();
        },
    });
}

export function createMockLanguageModel(modelId: string) {
    return {
        modelId,
        doGenerate: vi.fn().mockImplementation(async ({ prompt }) => ({
            text: `Mock response for: ${prompt}`,
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 20 },
        })),
        doStream: vi.fn().mockImplementation(async ({ prompt }) => ({
            stream: createMockStream({ response: "Mock streaming response" }),
            rawCall: { rawPrompt: prompt, rawSettings: {} },
        })),
    };
}

// Helper for testing streaming responses
export async function collectStreamText(
    stream: ReadableStream<Uint8Array>
): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        result += decoder.decode(value);
    }

    return result;
}
