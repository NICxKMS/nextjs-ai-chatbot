import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

test.describe("Reasoning chat", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
    await chatPage.selectReasoningModel();
  });

  test("Reasoning response contains think tags", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toContain("<think>");
    expect(assistantMessage?.content).toContain("</think>");
  });

  test("Reasoning response can be upvoted", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    await assistantMessage?.upvote();
    await chatPage.isVoteComplete();
  });

  test("Reasoning response can be downvoted", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    await assistantMessage?.downvote();
    await chatPage.isVoteComplete();
  });

  test("Reasoning response continues after edit", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toContain("<think>");

    const userMessage = await chatPage.getRecentUserMessage();
    await userMessage.edit("Why is the ocean blue?");

    await chatPage.isGenerationComplete();

    const updatedAssistantMessage = await chatPage.getRecentAssistantMessage();
    expect(updatedAssistantMessage).not.toBeNull();
    expect(updatedAssistantMessage?.content).toContain("</think>");
  });
});
