import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok } from "@/lib/errors/action-result";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCodes } from "@/lib/errors/codes";

describe("Error Handling", () => {
    describe("AppError", () => {
        it("creates error with code and message", () => {
            const error = new AppError(ErrorCodes.AUTH_REQUIRED, {
                message: "Please log in",
            });
            expect(error.code).toBe(ErrorCodes.AUTH_REQUIRED);
            expect(error.message).toBe("Please log in");
        });
    });

    describe("ActionResult", () => {
        it("ok() creates success result", () => {
            const result = ok({ id: "123" });
            expect(result.success).toBe(true);
            expect(isOk(result)).toBe(true);
        });

        it("err() creates error result", () => {
            const result = err(
                new AppError(ErrorCodes.NOT_FOUND, {
                    message: "Not found",
                })
            );
            expect(result.success).toBe(false);
            expect(isErr(result)).toBe(true);
        });
    });
});
