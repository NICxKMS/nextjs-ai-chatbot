/**
 * File Upload API Route
 * Ref: POST file upload for chat attachments
 *
 * @module app/api/files/upload/route
 */

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { z } from "zod";
import { requireAuthForRoute, isAuthResponse } from "@/lib/auth";
import { AppError, validationError } from "@/lib/errors";

export const maxDuration = 30;

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed MIME types for upload
 */
const ALLOWED_MIME_TYPES = new Set([
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    // Documents
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    // Code
    "application/json",
    "application/javascript",
    "text/javascript",
    "text/typescript",
]);

/**
 * Check if MIME type is allowed
 */
function isAllowedMimeType(type: string): boolean {
    return ALLOWED_MIME_TYPES.has(type);
}

/**
 * File upload validation schema
 */
const fileUploadSchema = z.object({
    file: z
        .instanceof(Blob)
        .refine((file) => file.size <= MAX_FILE_SIZE, {
            message: "File size should be less than 5MB",
        })
        .refine((file) => isAllowedMimeType(file.type), {
            message: "Unsupported file type",
        }),
});

/**
 * Sanitize filename to prevent path traversal and special character issues
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

/**
 * POST /api/files/upload - Upload a file attachment
 */
export async function POST(request: Request): Promise<Response> {
    // 1. Authentication
    const authResult = await requireAuthForRoute("api");
    if (isAuthResponse(authResult)) {
        return authResult;
    }
    const { session } = authResult;

    // 2. Check blob storage configuration
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return new AppError({
            code: "internal:configuration",
            message: "File storage is not configured",
        }).toResponse();
    }

    // 3. Validate request body exists
    if (request.body === null) {
        return validationError("Request body is required").toResponse();
    }

    // 4. Parse form data
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return validationError("Invalid form data").toResponse();
    }

    // 5. Extract file from form data
    const upload = formData.get("file");
    if (!(upload instanceof Blob)) {
        return validationError("No file uploaded").toResponse();
    }

    // 6. Validate file type and size
    const validationResult = fileUploadSchema.safeParse({ file: upload });
    if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
            .map((error) => error.message)
            .join(", ");

        if (errorMessage.includes("size")) {
            return new AppError({
                code: "validation:file_too_large",
                message: errorMessage,
            }).toResponse();
        }
        if (errorMessage.includes("Unsupported file type")) {
            return new AppError({
                code: "validation:file_type_unsupported",
                message: errorMessage,
            }).toResponse();
        }
        return validationError(errorMessage).toResponse();
    }

    // 7. Prepare filename
    const hasName = typeof (upload as File).name === "string";
    const rawFilename =
        hasName && (upload as File).name
            ? (upload as File).name
            : `upload-${randomUUID()}`;
    const filename = sanitizeFilename(rawFilename);
    const contentType = upload.type || "application/octet-stream";

    // 8. Upload to blob storage
    try {
        const blob = await put(filename, upload, {
            access: "public",
            contentType,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        console.info("[File Upload] Success:", {
            filename,
            contentType,
            size: upload.size,
            userId: session.user.id,
        });

        return Response.json({
            url: blob.url,
            pathname: blob.pathname,
            contentType,
            filename,
        });
    } catch (error) {
        console.error("[File Upload] Failed:", {
            filename,
            contentType,
            size: upload.size,
            userId: session.user.id,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return new AppError({
            code: "external:service_unavailable",
            message: "File upload failed",
        }).toResponse();
    }
}
