import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
    getSupabaseAccessTokenCookieName,
    getSupabaseSessionFromToken,
} from "@/lib/auth/session";
import { isProductionEnvironment } from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import { trackUserAction } from "@/lib/monitoring/dashboard";
import { logger } from "@/lib/monitoring/logger";
import { recordEvent } from "@/lib/monitoring/newrelic-agent";
import { withPerformanceTracking } from "@/lib/monitoring/performance";

export const POST = withPerformanceTracking(
    "POST /api/auth/exchange",
    async (request: Request) => {
        const { accessToken } = (await request.json()) as {
            accessToken?: string;
        };

        if (!accessToken) {
            return new ChatSDKError(
                "bad_request:api:invalid_json",
                "Missing access token"
            ).toResponse();
        }

        const cookieStore = await cookies();

        cookieStore.set(getSupabaseAccessTokenCookieName(), accessToken, {
            httpOnly: true,
            secure: isProductionEnvironment,
            path: "/",
            sameSite: "lax",
        });

        const session = await getSupabaseSessionFromToken(accessToken);

        logger.info("Auth exchange completed", {
            hasUser: !!session?.user,
            userId: session?.user?.id,
        });

        // Return error if session creation failed
        if (!session?.user) {
            logger.warn("Auth exchange failed - no user in session", {
                hasSession: !!session,
            });
            return new ChatSDKError(
                "unauthorized:chat",
                "Session creation failed"
            ).toResponse();
        }

        // Track authenticated login for analytics
        trackUserAction("authenticated_login", {
            userId: session.user.id,
        });

        // Send Log event for dashboard "Guest vs Authenticated Sessions" widget
        recordEvent("Log", {
            message: "Authenticated session created",
            userId: session.user.id,
        });

        return NextResponse.json(
            {
                user: session.user,
            },
            { status: 200 }
        );
    }
);
