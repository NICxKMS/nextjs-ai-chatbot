import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import {
  ATTACHMENT_MAX_FILE_SIZE,
  getAllowedAttachmentMimeTypes,
  isAllowedAttachmentMimeType,
} from "@/lib/files";
import { logger } from "@/lib/logger";

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= ATTACHMENT_MAX_FILE_SIZE, {
      message: "File size should be less than 5MB",
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 500 }
    );
  }

  if (request.body === null) {
    return NextResponse.json(
      { error: "Request body is empty" },
      { status: 400 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (_error) {
    return NextResponse.json(
      { error: "Invalid form payload" },
      { status: 400 }
    );
  }

  const upload = formData.get("file");

  if (!(upload instanceof Blob)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const validationResult = FileSchema.safeParse({ file: upload });

  if (!validationResult.success) {
    const errorMessage = validationResult.error.errors
      .map((error) => error.message)
      .join(", ");

    return NextResponse.json(
      {
        error: errorMessage,
        allowedTypes: getAllowedAttachmentMimeTypes(),
      },
      { status: 400 }
    );
  }

  const hasName = typeof (upload as File).name === "string";
  const filename =
    hasName && (upload as File).name
      ? (upload as File).name
      : `upload-${Date.now()}`;
  const arrayBuffer = await upload.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const detectedType = await fileTypeFromBuffer(buffer);
  const declaredMime = upload.type;

  const mismatchDetected =
    detectedType?.mime && declaredMime && detectedType.mime !== declaredMime;

  if (mismatchDetected) {
    logger.warn("Upload MIME type mismatch", {
      filename,
      declaredMime,
      detectedMime: detectedType?.mime,
    });
    return NextResponse.json(
      {
        error: "File type does not match the detected content",
        allowedTypes: getAllowedAttachmentMimeTypes(),
      },
      { status: 400 }
    );
  }

  const effectiveMime = detectedType?.mime ?? declaredMime ?? "";

  if (!isAllowedAttachmentMimeType(effectiveMime)) {
    return NextResponse.json(
      {
        error: "Unsupported file type",
        allowedTypes: getAllowedAttachmentMimeTypes(),
      },
      { status: 400 }
    );
  }

  try {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: effectiveMime,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: effectiveMime,
      filename,
    });
  } catch (error) {
    logger.error("File upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
