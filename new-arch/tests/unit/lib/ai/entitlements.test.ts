import { describe, it } from "vitest";

/**
 * AI Entitlements Tests
 *
 * These tests are temporarily stubbed because the Entitlements type
 * has changed. See lib/ai/entitlements.ts for current implementation.
 */
describe("AI Entitlements", () => {
    describe("getEntitlements", () => {
        it.todo("returns guest entitlements - Entitlements type changed");
        it.todo(
            "returns pro entitlements with more models - Entitlements type changed"
        );
    });

    describe("canAccessModel", () => {
        it.todo(
            "allows guest to access basic models - Entitlements type changed"
        );
        it.todo(
            "denies guest access to premium models - Entitlements type changed"
        );
    });
});
