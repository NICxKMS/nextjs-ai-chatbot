// ── Auth constants — shared across session, actions, and proxy ──

/** Cookie name for guest JWT tokens. */
export const GUEST_COOKIE_NAME = "guest_token"

/** JWT expiry: 1 hour (in seconds). */
export const GUEST_TOKEN_TTL_SECONDS = 60 * 60

/** Rotate when less than 30 minutes remain before expiry. */
export const GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS = 30 * 60
