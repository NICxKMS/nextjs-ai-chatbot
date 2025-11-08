import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
	ATTACHMENT_MAX_FILE_SIZE,
	isAllowedAttachmentMimeType,
} from "@/lib/files";

// Optimize for Vercel Fluid Compute
export const maxDuration = 30;

const FileSchema = z.object({
	file: z
		.instanceof(Blob)
		.refine((file) => file.size <= ATTACHMENT_MAX_FILE_SIZE, {
			message: "File size should be less than 5MB",
		})
		.refine((file) => isAllowedAttachmentMimeType(file.type), {
			message: "Unsupported file type",
		}),
});

export async function POST(request: Request) {
	const session = await auth();

	if (!session) {
		return new ChatSDKError(
			"unauthorized:api:upload_unauthorized"
		).toResponse();
	}

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		return new ChatSDKError(
			"bad_request:api:storage_not_configured"
		).toResponse();
	}

	if (request.body === null) {
		return new ChatSDKError("bad_request:api:empty_body").toResponse();
	}

	let formData: FormData;

	try {
		formData = await request.formData();
	} catch (_error) {
		return new ChatSDKError(
			"bad_request:api:invalid_form_payload"
		).toResponse();
	}

	const upload = formData.get("file");

	if (!(upload instanceof Blob)) {
		return new ChatSDKError(
			"bad_request:api:no_file_uploaded"
		).toResponse();
	}

	const validationResult = FileSchema.safeParse({ file: upload });

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
	const filename =
		hasName && (upload as File).name
			? (upload as File).name
			: `upload-${Date.now()}`;
	const contentType = upload.type || "application/octet-stream";

	try {
		const blob = await put(filename, upload, {
			access: "public",
			contentType,
			token: process.env.BLOB_READ_WRITE_TOKEN,
		});

		return NextResponse.json({
			url: blob.url,
			pathname: blob.pathname,
			contentType,
			filename,
		});
	} catch (error) {
		return new ChatSDKError(
			"bad_request:api:upload_failed",
			(error as Error)?.message
		).toResponse();
	}
}
