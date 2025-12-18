"use client";

import { MultimodalInput } from "@/components/multimodal-input";
import type { VisibilityType } from "@/components/visibility-selector";
import { useChatActions, useChatState, useInput, useModel } from "./context";

type ChatInputProps = {
    selectedVisibilityType?: VisibilityType;
};

/**
 * ChatInput - Input area component
 * Consumes input context - typing doesn't cause message list re-renders
 */
export function ChatInput({
    selectedVisibilityType = "private",
}: ChatInputProps) {
    const { chatId, messages, status, isReadonly, usage } = useChatState();
    const { sendMessage, setMessages, stop } = useChatActions();
    const { currentModelId, availableModels, setModelId } = useModel();
    const { input, setInput, attachments, setAttachments } = useInput();

    if (isReadonly) {
        return null;
    }

    return (
        <MultimodalInput
            attachments={attachments}
            availableModels={availableModels}
            chatId={chatId}
            input={input}
            messages={messages}
            onModelChange={setModelId}
            selectedModelId={currentModelId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
            setAttachments={setAttachments}
            setInput={setInput}
            setMessages={setMessages}
            status={status}
            stop={stop}
            usage={usage}
        />
    );
}
