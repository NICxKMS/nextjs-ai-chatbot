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
};
