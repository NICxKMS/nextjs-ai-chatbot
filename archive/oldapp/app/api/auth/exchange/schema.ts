import { z } from "zod";

/**
 * Zod schema for auth token exchange request validation
 */
export const exchangeRequestSchema = z.object({
    accessToken: z
        .string()
        .min(1, "accessToken is required")
        .refine(
            (token) => {
                // Basic JWT format validation (header.payload.signature)
                const parts = token.split(".");
                return parts.length === 3;
            },
            { message: "accessToken must be a valid JWT format" }
        ),
});

export type ExchangeRequestBody = z.infer<typeof exchangeRequestSchema>;
