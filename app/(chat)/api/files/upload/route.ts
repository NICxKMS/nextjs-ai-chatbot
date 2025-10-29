import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import {
  ATTACHMENT_MAX_FILE_SIZE,
  getAllowedAttachmentMimeTypes,
  isAllowedAttachmentMimeType,
} from "@/lib/files";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 500 }
    );
  }

  if (request.body === null) {
    return NextResponse.json({ error: "Request body is empty" }, { status: 400 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (_error) {
    return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
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
  const filename = hasName && (upload as File).name
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
    console.error("File upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
