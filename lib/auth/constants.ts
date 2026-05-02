// ── Auth constants — shared across session, actions, and proxy ──

/** Cookie name for guest JWT tokens. */
export const GUEST_COOKIE_NAME = "guest_token"

/** JWT expiry: 1 hour (in seconds). */
export const GUEST_TOKEN_TTL_SECONDS = 60 * 60

/** Browser persistence for guest identity: 7 days. JWTs still rotate hourly. */
export const GUEST_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

/** Rotate when less than 30 minutes remain before expiry. */
export const GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS = 30 * 60
