/**
 * File Upload Route
 * @module new-arch/app/(chat)/api/files/upload/route
 *
 * API route for file uploads using Vercel Blob storage.
 */

import { put } from "@vercel/blob";
import {
    badRequest,
    created,
    createRouteHandler,
    serverError,
} from "@/lib/api";

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
];

// ============================================================================
// Types
// ============================================================================

type UploadResult = {
    url: string;
    pathname: string;
    contentType: string;
    size: number;
};

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 30;

/**
 * POST /api/files/upload
 *
 * Upload a file.
 */
export const POST = createRouteHandler(
    {
        surface: "upload",
        method: "POST",
        auth: "required",
        rateLimit: "upload",
        guestAllowed: false,
    },
    async ({ session, request }) => {
        // Check blob storage configuration
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return serverError("Storage not configured");
        }

        // Parse form data
        const formData = await request.formData().catch(() => null);
        if (!formData) {
            return badRequest("Invalid form data");
        }

        const file = formData.get("file");
        if (!(file instanceof Blob)) {
            return badRequest("No file uploaded");
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return badRequest(
                `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            );
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return badRequest(
                `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
            );
        }

        // Get filename
        const originalName = file instanceof File ? file.name : "upload";
        const sanitizedName = sanitizeFilename(originalName);
        const pathname = `uploads/${session?.user.id}/${crypto.randomUUID()}-${sanitizedName}`;

        // Upload file
        const result = await uploadFile({
            file,
            pathname,
            contentType: file.type,
        });

        return created(result);
    }
);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sanitize filename to prevent path traversal and special character issues.
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

    // Replace non-alphanumeric characters with underscore
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Limit total length to 100 characters
    const maxBaseLength = 100 - extension.length;
    const truncatedBase = cleanBaseName.slice(0, maxBaseLength);

    return truncatedBase + extension;
}

/**
 * Upload a file to Vercel Blob storage
 */
async function uploadFile(params: {
    file: Blob;
    pathname: string;
    contentType: string;
}): Promise<UploadResult> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const blob = await put(params.pathname, params.file, {
        access: "public",
        contentType: params.contentType,
        ...(token && { token }),
    });

    return {
        url: blob.url,
        pathname: blob.pathname,
        contentType: params.contentType,
        size: params.file.size,
    };
}
