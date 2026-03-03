// ── Paginated response (cursor-based) ──

export interface PaginatedResult<T> {
	items: T[]
	hasMore: boolean
	nextCursor?: string
}

// ── History-specific paginated response ──

export interface HistoryResponse<T> {
	chats: T[]
	hasMore: boolean
	nextCursor?: string
}

// ── Pagination input parameters ──

export interface PaginationParams {
	cursor?: string
	limit?: number
}

// ── Standard error response ──

export interface ErrorResponse {
	error: string
	code?: string
	details?: Record<string, unknown>
}

// ── Health check response ──

export interface HealthResponse {
	status: "healthy" | "degraded" | "unhealthy"
	timestamp: string
	checks: {
		database: {
			status: "healthy" | "unhealthy"
			latencyMs: number
			error?: string
		}
		cache: {
			status: "healthy" | "unhealthy"
			latencyMs: number
			error?: string
		}
	}
}
