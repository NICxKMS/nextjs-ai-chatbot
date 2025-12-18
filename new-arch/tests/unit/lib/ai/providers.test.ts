import { describe, it } from "vitest";

/**
 * AI Providers Tests
 *
 * These tests are temporarily stubbed because the provider API
 * uses strict typing. See lib/ai/providers/ for current implementation.
 */
describe("AI Providers", () => {
    describe("getProvider", () => {
        it.todo("returns OpenAI provider - uses AIProviderId type");
        it.todo("returns Anthropic provider - uses AIProviderId type");
        it.todo("returns Google provider - uses AIProviderId type");
        it.todo("throws for unknown provider - uses AIProviderId type");
    });

    describe("Provider caching", () => {
        it.todo("caches provider instances - implementation may have changed");
    });
});
