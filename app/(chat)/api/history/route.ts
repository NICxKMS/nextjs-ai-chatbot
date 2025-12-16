import {
    requireAuthForRoute,
    requireRateLimitForRoute,
} from "@/lib/api/guards";

import { getSearchParams } from "@/lib/api/utils";
import {
    DEFAULT_PAGINATION_LIMIT,
    MAX_PAGINATION_LIMIT,
} from "@/lib/constants";
import { chatData } from "@/lib/data/chat";
import { ChatSDKError } from "@/lib/errors";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function GET(request: Request) {
    const searchParams = getSearchParams(request);

    const rawLimit = Number.parseInt(
        searchParams.get("limit") || String(DEFAULT_PAGINATION_LIMIT),
        10
    );
    // Task 3.8 Fix: Handle NaN and clamp limit to valid range
    const limit = Number.isNaN(rawLimit)
        ? DEFAULT_PAGINATION_LIMIT
        : Math.min(Math.max(1, rawLimit), MAX_PAGINATION_LIMIT);
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (startingAfter && endingBefore) {
        return new ChatSDKError(
            "bad_request:api:conflicting_pagination_params",
            "Only one of starting_after or ending_before can be provided."
        ).toResponse();
    }

    // Require authenticated session
    const authResult = await requireAuthForRoute("chat");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Apply rate limiting for history listing (100 requests per minute)
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "history"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    const result = await chatData.list(
        {
            limit,
            startingAfter,
            endingBefore,
        },
        ctx
    );

    return Response.json(
        {
            chats: result.items,
            hasMore: result.hasMore,
        },
        {
            headers: {
                "Cache-Control":
                    "private, max-age=0, s-maxage=10, stale-while-revalidate=30",
            },
        }
    );
}

export async function DELETE() {
    // Require authenticated session
    const authResult = await requireAuthForRoute("chat");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Task 3.9 Fix: Use "strict" limiter (10 req/min) for destructive operations
    // Previously used "upload" which is for file uploads (10/hour)
    const rateLimitResult = await requireRateLimitForRoute(
        "strict",
        session.user.id,
        "history"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    const result = await chatData.deleteAll(ctx);

    return Response.json(result, { status: 200 });
}
