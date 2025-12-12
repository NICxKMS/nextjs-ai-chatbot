export type SamplingSettings = {
    temperature: number;
    topP: number;
    maxOutputTokens: number;
};

export type AppSettings = {
    sampling: SamplingSettings;
    systemPrompt: string;
    enableReasoning: boolean;
    streamArtifacts: boolean;
    autoScroll: boolean;
    /**
     * User's selected model ID (e.g., "openai:gpt-4o")
     * Persisted to localStorage for consistent preference across sessions.
     * If undefined, uses server-determined default.
     */
    selectedModelId?: string;
};
