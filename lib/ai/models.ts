import {
  getDefaultChatModel,
  getReasoningModel,
  listChatModels,
} from "./model-registry";

export const DEFAULT_CHAT_MODEL: string = getDefaultChatModel().id;

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
