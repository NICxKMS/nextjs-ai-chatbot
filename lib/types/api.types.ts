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
