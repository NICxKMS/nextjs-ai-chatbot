import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
    ChatContainer,
    ChatHeader,
    ChatInput,
    ChatMessages,
    ChatProvider,
} from "@/components/chat";
import { getAppSession } from "@/lib/auth";
import { getChatWithMessages } from "@/lib/data/chat/queries";

// UUID validation regex at module level for performance
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
    const { id } = await params;

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
        notFound();
    }

    // Get authenticated session
    const session = await getAppSession();
    if (!session?.user) {
        redirect("/login");
    }

    // Fetch chat with messages
    const chatWithMessages = await getChatWithMessages(id);
    if (!chatWithMessages) {
        notFound();
    }

    // Verify ownership or public visibility
    if (
        chatWithMessages.visibility === "private" &&
        chatWithMessages.userId !== session.user.id
    ) {
        notFound();
    }

    // Access cookies for model preference
    const cookieStore = await cookies();
    const selectedModelId = cookieStore.get("chat-model")?.value;

    // Convert messages to UI format
    const initialMessages = chatWithMessages.messages.map((msg) => {
        let content = "";
        if (typeof msg.parts === "string") {
            content = msg.parts;
        } else if (Array.isArray(msg.parts)) {
            content = msg.parts
                .map((p: { type?: string; text?: string }) =>
                    p.type === "text" ? p.text : ""
                )
                .join("");
        }
        return {
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content,
        };
    });

    return (
        <ChatProvider
            chatId={id}
            initialMessages={initialMessages}
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
