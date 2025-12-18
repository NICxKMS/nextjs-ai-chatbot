import { type LanguageModel, smoothStream, streamText } from "ai";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/config";
import { getProvider } from "@/lib/ai/providers/registry";
import type { AIProviderId } from "@/lib/ai/types";
import {
    createDocumentHandler,
    textPrompt,
    updateDocumentPrompt,
} from "../server";

/**
 * Gets a language model instance for artifact generation.
 * Uses the default chat model provider.
 */
function getArtifactModel(): LanguageModel {
    const [providerId, modelId] = DEFAULT_CHAT_MODEL_ID.split(":") as [
        string,
        string,
    ];
    const provider = getProvider(providerId as AIProviderId);

    if (!provider) {
        throw new Error(
            `Provider '${providerId}' is not available for artifact generation`
        );
    }

    const languageModelFn = (
        provider as unknown as {
            languageModel: (id: string) => LanguageModel;
        }
    ).languageModel;

    if (typeof languageModelFn !== "function") {
        throw new Error(
            `Provider '${providerId}' does not support language models`
        );
    }

    return languageModelFn(modelId);
}

/**
 * Text document handler for markdown content generation
 */
export const textDocumentHandler = createDocumentHandler<"text">({
    kind: "text",
    onCreateDocument: async ({ title, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamText({
            model: getArtifactModel(),
            system: textPrompt,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: "artifact-text-create",
                recordInputs: true,
                recordOutputs: true,
            },
            prompt: title,
        });

        for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "text-delta") {
                const { textDelta } = delta;

                draftContent += textDelta;

                dataStream.write({
                    type: "data-textDelta",
                    data: textDelta,
                    transient: true,
                });
            }
        }

        return draftContent;
    },
    onUpdateDocument: async ({ document, description, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamText({
            model: getArtifactModel(),
            system: updateDocumentPrompt(document.content, "text"),
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: "artifact-text-update",
                recordInputs: true,
                recordOutputs: true,
            },
            prompt: description,
            providerOptions: {
                openai: {
                    prediction: {
                        type: "content",
                        content: document.content,
                    },
                },
            },
        });

        for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "text-delta") {
                const { textDelta } = delta;

                draftContent += textDelta;

                dataStream.write({
                    type: "data-textDelta",
                    data: textDelta,
                    transient: true,
                });
            }
        }

        return draftContent;
    },
});
