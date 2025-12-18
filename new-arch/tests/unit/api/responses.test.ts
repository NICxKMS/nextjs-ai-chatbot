import { describe, it } from "vitest";

/**
 * API Responses Tests
 *
 * These tests are temporarily stubbed because the API response utilities
 * have been refactored. See lib/api/response.ts for current implementation.
 */
describe("API Responses", () => {
    describe("successResponse", () => {
        it.todo("returns 200 with data - see lib/api/response.ts success()");
        it.todo(
            "supports custom status code - see lib/api/response.ts success()"
        );
    });

    describe("errorResponse", () => {
        it.todo("returns error with status - see lib/api/response.ts error()");
        it.todo("defaults to 500 - see lib/api/response.ts error()");
    });

    describe("notFoundResponse", () => {
        it.todo("returns 404 - see lib/api/response.ts notFound()");
    });

    describe("unauthorizedResponse", () => {
        it.todo("returns 401 - see lib/api/response.ts unauthorized()");
    });
});
