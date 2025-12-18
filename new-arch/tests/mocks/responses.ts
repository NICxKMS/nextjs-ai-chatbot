export const mockResponses = {
    greeting: "Hello! How can I help you today?",
    codeGeneration: `Here's a simple function:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\``,
    weatherTool: {
        location: "San Francisco",
        temperature: 72,
        conditions: "sunny",
        humidity: 45,
    },
    documentCreation: {
        id: "mock-doc-123",
        title: "Generated Document",
        content: "This is mock generated content.",
    },
    error: {
        rateLimited: "Rate limit exceeded. Please try again later.",
        modelUnavailable: "The model is currently unavailable.",
        invalidRequest: "Invalid request format.",
    },
};

export type MockResponseType = keyof typeof mockResponses;

export function getMockResponse(type: MockResponseType) {
    return mockResponses[type];
}

// Predefined conversation scenarios
export const mockConversations = {
    simple: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: mockResponses.greeting },
    ],
    withCode: [
        { role: "user", content: "Write a greeting function" },
        { role: "assistant", content: mockResponses.codeGeneration },
    ],
    withTool: [
        { role: "user", content: "What is the weather in San Francisco?" },
        {
            role: "assistant",
            content: "",
            toolCalls: [
                {
                    id: "call_123",
                    name: "getWeather",
                    args: { city: "San Francisco" },
                },
            ],
        },
        {
            role: "tool",
            content: JSON.stringify(mockResponses.weatherTool),
            toolCallId: "call_123",
        },
        {
            role: "assistant",
            content:
                "The weather in San Francisco is sunny with a temperature of 72°F and 45% humidity.",
        },
    ],
} as const;
