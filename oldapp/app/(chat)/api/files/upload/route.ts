import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import {
    requireAuthForRoute,
    requireRateLimitForRoute,
} from "@/lib/api/guards";
import { parseFormDataForRoute } from "@/lib/api/validators";
import { ChatSDKError } from "@/lib/errors";
import { logError, logInfo } from "@/lib/log";
import { fileUploadSchema } from "./schema";

// Optimize for Vercel Fluid Compute
export const maxDuration = 30;

/**
 * Issue #16 Fix: Sanitize filename to prevent path traversal and special character issues
 * - Removes path separators (/, \)
 * - Replaces special characters with underscores
 * - Limits length to 100 characters
 * - Preserves file extension
 */
function sanitizeFilename(name: string): string {
    // Remove path separators and null bytes
    // biome-ignore lint/suspicious/noControlCharactersInRegex: null byte removal is intentional for security
    const sanitized = name.replace(/[/\\:\x00]/g, "");

    // Get the extension if present
    const lastDot = sanitized.lastIndexOf(".");
    const hasExtension = lastDot > 0 && lastDot < sanitized.length - 1;
    const extension = hasExtension ? sanitized.slice(lastDot) : "";
    const baseName = hasExtension ? sanitized.slice(0, lastDot) : sanitized;

    // Replace non-alphanumeric characters (except dash, underscore, dot) with underscore
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Limit total length to 100 characters (including extension)
    const maxBaseLength = 100 - extension.length;
    const truncatedBase = cleanBaseName.slice(0, maxBaseLength);

    return truncatedBase + extension;
}

export async function POST(request: Request) {
    // Require authenticated session
    const authResult = await requireAuthForRoute("api");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session } = authResult;

    // Apply strict rate limiting for uploads (5 requests per hour)
    const rateLimitResult = await requireRateLimitForRoute(
        "upload",
        session.user.id,
        "api"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return new ChatSDKError(
            "bad_request:api:storage_not_configured"
        ).toResponse();
    }

    if (request.body === null) {
        return new ChatSDKError("bad_request:api:empty_body").toResponse();
    }

    // Parse form data
    const formDataResult = await parseFormDataForRoute(request, "files/upload");
    if (formDataResult instanceof Response) {
        return formDataResult;
    }
    const formData = formDataResult;

    const upload = formData.get("file");

    if (!(upload instanceof Blob)) {
        return new ChatSDKError(
            "bad_request:api:no_file_uploaded"
        ).toResponse();
    }

    // Task 3.10 Fix (Issue #18): Validate file type/size early before any processing
    // This prevents unnecessary work on invalid files and provides fast feedback
    const validationResult = fileUploadSchema.safeParse({ file: upload });

    if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
            .map((error) => error.message)
            .join(", ");

        // Map schema errors to specific codes when possible
        if (errorMessage.includes("size")) {
            return new ChatSDKError(
                "bad_request:api:file_too_large",
                errorMessage
            ).toResponse();
        }
        if (errorMessage.includes("Unsupported file type")) {
            return new ChatSDKError(
                "bad_request:api:file_type_unsupported",
                errorMessage
            ).toResponse();
        }
        return new ChatSDKError(
            "bad_request:api:file_validation_failed",
            errorMessage
        ).toResponse();
    }

    const hasName = typeof (upload as File).name === "string";
    // Issue #16 & #17 Fix: Sanitize filename and use UUID for fallback
    const rawFilename =
        hasName && (upload as File).name
            ? (upload as File).name
            : `upload-${randomUUID()}`;
    const filename = sanitizeFilename(rawFilename);
    const contentType = upload.type || "application/octet-stream";

    try {
        const blob = await put(filename, upload, {
            access: "public",
            contentType,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        logInfo("File uploaded", {
            filename,
            contentType,
            size: upload.size,
            userId: session.user.id,
        });

        return NextResponse.json({
            url: blob.url,
            pathname: blob.pathname,
            contentType,
            filename,
        });
    } catch (error) {
        logError("File upload failed", error, {
            filename,
            contentType,
            size: upload.size,
            userId: session.user.id,
        });

        return new ChatSDKError(
            "bad_request:api:upload_failed",
            (error as Error)?.message
        ).toResponse();
    }
}
