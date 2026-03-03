import type { ErrorCode } from "@/lib/errors/codes"

// ── ActionResult for Server Actions and data access layer ──

export type ActionResult<T = void> =
	| { success: true; data: T }
	| { success: false; error: { code: ErrorCode; message: string } }
