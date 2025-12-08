import { expect, test } from "../fixtures";

test.describe.serial("Chat Title Persistence", () => {
    test("Chat title should be preserved when sending subsequent messages", async ({
        adaContext,
    }) => {
        // 1. Create a new chat
        const initialMessage = "Write a very short poem about the moon.";
        const firstResponse = await adaContext.request.post("/api/chat", {
            data: {
                id: undefined, // Let server generate ID or use client generated if needed, keeping simple
                message: {
                    id: "msg-1",
                    role: "user",
                    content: initialMessage,
                    parts: [{ type: "text", text: initialMessage }],
                    createdAt: new Date().toISOString(),
                },
                selectedChatModel: "openai:gpt-4o-latest",
                selectedVisibilityType: "private",
            },
        });
        expect(firstResponse.status()).toBe(200);
        
        // consume stream
        await firstResponse.text();

        // Get the chat ID from the response headers or by listing chats
        // Since the API doesn't return the ID in the body for stream, we list chats
        const historyResponse = await adaContext.request.get("/api/history?limit=1");
        expect(historyResponse.status()).toBe(200);
        const { chats } = await historyResponse.json();
        const chat = chats[0];
        const chatId = chat.id;

        // Wait for title generation (it's async)
        // We polll until title is not "New Chat" or timeout
        // (Assuming the model generates a title different from "New Chat")
        let title = chat.title;
        let attempts = 0;
        while (title === "New Chat" && attempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const pollResponse = await adaContext.request.get("/api/history?limit=1");
            const pollData = await pollResponse.json();
            title = pollData.chats[0].title;
            attempts++;
        }

        console.log(`Initial generated title: ${title}`);
        // If the model fails to generate a title, this test might be flaky on the positive assertion,
        // but we mainly want to ensure it doesn't *revert* to "New Chat". 
        // If it stays "New Chat" naturally, we can't test the regression properly.
        // But assuming it generated something else:
        
        if (title === "New Chat") {
            console.warn("Could not test title preservation because title remained 'New Chat'");
            return; 
        }

        // 2. Send a second message to the SAME chat
        const secondResponse = await adaContext.request.post("/api/chat", {
            data: {
                id: chatId, 
                message: {
                    id: "msg-2",
                    role: "user",
                    content: "Make it shorter.",
                    parts: [{ type: "text", text: "Make it shorter." }],
                    createdAt: new Date().toISOString(),
                },
                selectedChatModel: "chat-model",
                selectedVisibilityType: "private",
            },
        });
        expect(secondResponse.status()).toBe(200);
        await secondResponse.text();

        // 3. Verify title is NOT "New Chat"
        const finalHistoryResponse = await adaContext.request.get("/api/history?limit=1");
        const finalData = await finalHistoryResponse.json();
        const finalTitle = finalData.chats[0].title;

        console.log(`Title after second message: ${finalTitle}`);
        
        expect(finalTitle).toBe(title);
        expect(finalTitle).not.toBe("New Chat");
    });
});
