import { cookies } from "next/headers";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { listChatModels } from "@/lib/ai/model-registry";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export default async function Page() {
    // Guest session creation is handled by the proxy, so a session
    // should always exist when this page renders.

    // Access request data before using random values to satisfy Next.js
    // cacheComponents constraints for server components.
    const cookieStore = await cookies();
    const availableModels = listChatModels();
    const selectedModelId = cookieStore.get("chat-model")?.value;
    const initialChatModel =
        selectedModelId &&
        availableModels.some((model) => model.id === selectedModelId)
            ? selectedModelId
            : DEFAULT_CHAT_MODEL;
    const id = generateUUID();

    return (
        <>
            <Chat
                availableModels={availableModels}
                id={id}
                initialChatModel={initialChatModel}
                initialMessages={[]}
                initialVisibilityType="private"
                initialVotes={[]}
                isReadonly={false}
                key={id}
            />
            <DataStreamHandler />
        </>
    );
}
