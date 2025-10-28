import type { ProviderId } from "./provider-info";

export type ModelCapability =
  | "chat"
  | "reasoning"
  | "vision"
  | "audio"
  | "multimodal"
  | "code"
  | "tooling"
  | "memory";

export type ModelModality = "text" | "vision" | "audio";

export type ModelMetadata = {
  id: string;
  providerId: ProviderId;
  providerName: string;
  modelId: string;
  name: string;
  description: string;
  release?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  modalities: ModelModality[];
  capabilities: ModelCapability[];
  tags: string[];
  price?: string;
  source: "curated" | "discovered";
  isCurated: boolean;
};

export type ProviderCatalog = {
  providerId: ProviderId;
  displayName: string;
  models: ModelMetadata[];
  fetchedAt: string;
};

export type ModelCatalogResponse = {
  providers: ProviderCatalog[];
  fallback: ModelMetadata[];
  fetchedAt: string;
};
