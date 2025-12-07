import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseSessionFromCookies } from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/monitoring/logger";

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
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

        cookieStore.set("sb-access-token", accessToken, {
            httpOnly: true,
            secure: true,
            path: "/",
            sameSite: "lax",
        });

        const session = await getSupabaseSessionFromCookies();

        const duration = Date.now() - startTime;
        logger.info("Auth exchange completed", {
            hasUser: !!session?.user,
            userId: session?.user?.id,
            duration,
        });

        return NextResponse.json(
            {
                user: session?.user ?? null,
            },
            { status: 200 }
        );
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error("Auth exchange failed", error, { duration });

        return new ChatSDKError(
            "bad_request:api:invalid_json",
            "Failed to process auth exchange"
        ).toResponse();
    }
}
