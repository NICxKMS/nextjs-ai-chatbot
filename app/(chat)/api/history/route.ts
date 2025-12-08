import { getAppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { ChatSDKError } from "@/lib/errors";
import { trackUserAction } from "@/lib/monitoring/dashboard";
import { withPerformanceTracking } from "@/lib/monitoring/performance";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export const GET = withPerformanceTracking(
    "GET /api/history",
    async (request: Request) => {
        const { searchParams } = new URL(request.url);

        const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
        const startingAfter = searchParams.get("starting_after");
        const endingBefore = searchParams.get("ending_before");

        if (startingAfter && endingBefore) {
            return new ChatSDKError(
                "bad_request:api:conflicting_pagination_params",
                "Only one of starting_after or ending_before can be provided."
            ).toResponse();
        }

        const session = await getAppSession();

        if (!session?.user) {
            return new ChatSDKError(
                "unauthorized:chat:missing_session"
            ).toResponse();
        }

        const ctx = createContext(session);

        const result = await chatData.list(
            {
                limit,
                startingAfter,
                endingBefore,
            },
            ctx
        );

        return Response.json({
            chats: result.items,
            hasMore: result.hasMore,
        });
    },
    {
        extractMetadata: (request) => {
            const url = new URL(request.url);
            return {
                limit: url.searchParams.get("limit") ?? "10",
                startingAfter:
                    url.searchParams.get("starting_after") ?? undefined,
                endingBefore:
                    url.searchParams.get("ending_before") ?? undefined,
            };
        },
    }
);

export const DELETE = withPerformanceTracking(
    "DELETE /api/history",
    async () => {
        const session = await getAppSession();

        if (!session?.user) {
            return new ChatSDKError(
                "unauthorized:chat:missing_session"
            ).toResponse();
        }

        const ctx = createContext(session);

        const result = await chatData.deleteAll(ctx);

        // Track user action for analytics
        trackUserAction("delete_all_chats", {
            userId: session.user.id,
            count: result.deletedCount,
        });

        return Response.json(result, { status: 200 });
    }
);
