import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

// Streaming suggestion type - a partial Suggestion used during streaming
// before the full Suggestion is persisted to the database
export type StreamingSuggestion = Omit<
    Suggestion,
    "userId" | "createdAt" | "documentCreatedAt"
>;

// Type guards for custom stream data parts
export type DataChatTitlePart = { type: "data-chatTitle"; data: string };

// Message append data can be JSON string or already-parsed message object
export type AppendMessageData = string | Record<string, unknown>;

export type DataAppendMessagePart = {
    type: "data-appendMessage";
    data: AppendMessageData;
};
export type DataUsagePart = { type: "data-usage"; data: AppUsage };

export const isDataChatTitlePart = (part: unknown): part is DataChatTitlePart =>
    typeof part === "object" &&
    part !== null &&
    (part as DataChatTitlePart).type === "data-chatTitle" &&
    typeof (part as DataChatTitlePart).data === "string";

export const isDataAppendMessagePart = (
    part: unknown
): part is DataAppendMessagePart =>
    typeof part === "object" &&
    part !== null &&
    (part as DataAppendMessagePart).type === "data-appendMessage";

export const isDataUsagePart = (part: unknown): part is DataUsagePart =>
    typeof part === "object" &&
    part !== null &&
    (part as DataUsagePart).type === "data-usage";

export const messageMetadataSchema = z.object({
    createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
    ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
    getWeather: weatherTool;
    createDocument: createDocumentTool;
    updateDocument: updateDocumentTool;
    requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
    textDelta: string;
    imageDelta: string;
    sheetDelta: string;
    codeDelta: string;
    suggestion: StreamingSuggestion;
    appendMessage: AppendMessageData;
    id: string;
    title: string;
    chatTitle: string;
    kind: ArtifactKind;
    clear: null;
    finish: null;
    usage: AppUsage;
};

export type ChatMessage = UIMessage<
    MessageMetadata,
    CustomUIDataTypes,
    ChatTools
>;

export type Attachment = {
    name: string;
    url: string;
    contentType: string;
};

// UI-level vote type; only the current user's vote is ever fetched by the UI
export type UserVote = {
    userId?: string;
    chatId: string;
    messageId: string;
    isUpvoted: boolean;
};
