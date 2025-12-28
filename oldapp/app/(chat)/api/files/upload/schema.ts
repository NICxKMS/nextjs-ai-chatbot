import { z } from "zod";
import {
    ATTACHMENT_MAX_FILE_SIZE,
    isAllowedAttachmentMimeType,
} from "@/lib/files";

/**
 * Zod schema for file upload validation
 */
export const fileUploadSchema = z.object({
    file: z
        .instanceof(Blob)
        .refine((file) => file.size <= ATTACHMENT_MAX_FILE_SIZE, {
            message: "File size should be less than 5MB",
        })
        .refine((file) => isAllowedAttachmentMimeType(file.type), {
            message: "Unsupported file type",
        }),
});

export type FileUploadBody = z.infer<typeof fileUploadSchema>;
