import {
  getDefaultChatModel,
  getModelById,
  getReasoningModel,
  listChatModels,
} from "./model-registry";

export const DEFAULT_CHAT_MODEL: string = getDefaultChatModel().id;
export const DEFAULT_TITLE_MODEL =
  getModelById("google:gemini-2.5-flash-lite")?.id ?? DEFAULT_CHAT_MODEL;
export const DEFAULT_ARTIFACT_MODEL =
  getModelById("google:gemini-2.5-flash-lite")?.id ?? DEFAULT_CHAT_MODEL;

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

const reasoning = getReasoningModel();

export const chatModels: ChatModel[] = listChatModels().map((model) => ({
  id: model.id,
  name: model.name,
  description: model.description,
}));

export const REASONING_MODEL_ID = reasoning.id;
