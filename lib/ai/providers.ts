import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { isTestEnvironment } from "../constants";
import { getLanguageModel, getReasoningModel } from "./model-registry";
import { DEFAULT_ARTIFACT_MODEL } from "./models";

const reasoningModel = getReasoningModel();
const artifactModelId = DEFAULT_ARTIFACT_MODEL;

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel: mockReasoningModel,
        titleModel,
      } = require("./models.mock");
      return {
        languageModel(id: string) {
          switch (id) {
            case "chat-model":
              return chatModel;
            case "chat-model-reasoning":
              return mockReasoningModel;
            case "title-model":
              return titleModel;
            case "artifact-model":
              return artifactModel;
            default:
              throw new Error(`Unknown mock model id: ${id}`);
          }
        },
      };
    })()
  : {
      languageModel(id: string) {
        const resolvedId = id === "artifact-model" ? artifactModelId : id;
        const model = getLanguageModel(resolvedId);
        if (id === reasoningModel.id) {
          return wrapLanguageModel({
            model,
            middleware: extractReasoningMiddleware({ tagName: "think" }),
          });
        }
        return model;
      },
    };
