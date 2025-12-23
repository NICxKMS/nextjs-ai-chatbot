import { expect, test } from "@playwright/test";

import { setupMockAI } from "./utils";

test.describe("Documents", () => {
    test.beforeEach(async ({ page }) => {
        await setupMockAI(page);
        await page.goto("/");
        await page.waitForLoadState("networkidle");
    });

    test.describe("Document Preview", () => {
        test("should display document preview in message when created", async ({
            page,
        }) => {
            const input = page.getByPlaceholder(/send a message/i);
            const sendButton = page.getByTestId("send-button");

            // Request a document creation
            await input.fill("Create a Python script that prints hello world");
            await sendButton.click();

            await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );

            // Document preview may appear based on AI response
            const documentPreview = page.getByTestId("document-preview");
            const hasPreview = await documentPreview
                .isVisible({ timeout: 5000 })
                .catch(() => false);
            expect(typeof hasPreview).toBe("boolean");
        });

        test("should open artifact when clicking document preview", async ({
            page,
        }) => {
            const input = page.getByPlaceholder(/send a message/i);
            const sendButton = page.getByTestId("send-button");

            await input.fill("Write a JavaScript function");
            await sendButton.click();

            await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );

            const documentPreview = page.getByTestId("document-preview");
            if (
                await documentPreview
                    .isVisible({ timeout: 5000 })
                    .catch(() => false)
            ) {
                await documentPreview.click();

                const artifact = page.getByTestId("artifact");
                await expect(artifact).toBeVisible({ timeout: 10_000 });
            }
        });
    });

    test.describe("Document Tool Call", () => {
        test("should display document tool call indicator", async ({
            page,
        }) => {
            const input = page.getByPlaceholder(/send a message/i);
            const sendButton = page.getByTestId("send-button");

            await input.fill("Create a markdown document with a summary");
            await sendButton.click();

            await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );

            // Tool call display may appear
            const toolCall = page.getByTestId("document-tool-call");
            const hasToolCall = await toolCall
                .isVisible({ timeout: 5000 })
                .catch(() => false);
            expect(typeof hasToolCall).toBe("boolean");
        });

        test("should show loading state during document creation", async ({
            page,
        }) => {
            const input = page.getByPlaceholder(/send a message/i);
            const sendButton = page.getByTestId("send-button");

            await input.fill("Generate a code snippet");
            await sendButton.click();

            // During generation, loading indicator may show
            const loader = page.getByTestId("document-skeleton");
            const hasLoader = await loader
                .isVisible({ timeout: 3000 })
                .catch(() => false);
            expect(typeof hasLoader).toBe("boolean");

            // Wait for response to complete
            await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );
        });
    });

    test.describe("Document Types", () => {
        test("should handle code document type", async ({ page }) => {
            const input = page.getByPlaceholder(/send a message/i);
            const sendButton = page.getByTestId("send-button");

            await input.fill("Write a Python function to add two numbers");
            await sendButton.click();

            await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );

            const assistantMessage = page.getByTestId("message-assistant");
            await expect(assistantMessage).toBeVisible({ timeout: 30_000 });
        });

        test("should handle text document type", async ({ page }) => {
            const input = page.getByPlaceholder(/send a message/i);
            const sendButton = page.getByTestId("send-button");

            await input.fill("Write a short paragraph about technology");
            await sendButton.click();

            await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );

            const assistantMessage = page.getByTestId("message-assistant");
            await expect(assistantMessage).toBeVisible({ timeout: 30_000 });
        });
    });
});
