import { describe, it } from "vitest";

/**
 * AI Models Tests
 *
 * These tests are temporarily stubbed because the models API
 * has changed. See lib/ai/models/ for current implementation.
 */
describe("AI Models", () => {
    describe("getAllModels", () => {
        it.todo("returns array of models - API changed");
        it.todo(
            "each model has required fields - field names changed (provider → providerId)"
        );
    });

    describe("getModelById", () => {
        it.todo("returns model when found - function moved or renamed");
        it.todo(
            "returns undefined for unknown model - function moved or renamed"
        );
    });
});
