export const ATTACHMENT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ATTACHMENT_ALLOWED_MIME_TYPE_VALUES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"text/plain",
	"text/markdown",
	"text/csv",
	"application/json",
	"application/zip",
	"application/octet-stream",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const ATTACHMENT_ALLOWED_MIME_TYPES = new Set<string>(
	ATTACHMENT_ALLOWED_MIME_TYPE_VALUES
);

export const ATTACHMENT_ALLOWED_TYPE_PREFIXES = [
	"image/",
	"audio/",
	"video/",
] as const;

export const getAllowedAttachmentMimeTypes = () => [
	...ATTACHMENT_ALLOWED_MIME_TYPE_VALUES,
];

export const isAllowedAttachmentMimeType = (
	mimeType: string | undefined | null
): boolean => {
	// Security: Reject empty/undefined MIME types to prevent bypass attacks
	if (!mimeType) {
		return false;
	}

	if (ATTACHMENT_ALLOWED_MIME_TYPES.has(mimeType)) {
		return true;
	}

	return ATTACHMENT_ALLOWED_TYPE_PREFIXES.some((prefix) =>
		mimeType.startsWith(prefix)
	);
};
