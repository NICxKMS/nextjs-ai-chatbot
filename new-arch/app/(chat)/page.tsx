import { cookies } from "next/headers";
import { generateUUID } from "@/lib/utils";
import {
    ChatContainer,
    ChatHeader,
    ChatInput,
    ChatMessages,
    ChatProvider,
} from "@/components/chat";

export default async function Page() {
    // Access request data before using random values to satisfy Next.js
    // cache constraints for server components.
    const cookieStore = await cookies();
    const selectedModelId = cookieStore.get("chat-model")?.value;

    // Generate new chat ID
    const id = generateUUID();

    return (
        <ChatProvider
            chatId={id}
            initialMessages={[]}
            initialModelId={selectedModelId}
        >
            <ChatContainer>
                <ChatHeader />
                <ChatMessages />
                <ChatInput />
            </ChatContainer>
        </ChatProvider>
    );
}
