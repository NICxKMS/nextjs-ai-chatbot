/**
 * Network Utilities
 *
 * Provides secure network-related utilities including IP address extraction
 * with protection against header spoofing attacks.
 *
 * @module lib/utils/network
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Options for IP extraction.
 */
export interface GetClientIpOptions {
	/**
	 * Whether to trust proxy headers.
	 * Should only be true when behind a trusted proxy (Vercel, Cloudflare, etc.)
	 * @default true (assumes deployment behind reverse proxy)
	 */
	trustProxy?: boolean

	/**
	 * Number of trusted proxies in front of this server.
	 * Used to determine which IP in X-Forwarded-For chain to use.
	 * @default 1 (typical for Vercel/Cloudflare)
	 */
	trustedProxyCount?: number

	/**
	 * Known trusted proxy IP addresses.
	 * If set, X-Forwarded-For is only trusted from these IPs.
	 */
	trustedProxyIPs?: string[]
}

/**
 * Result of IP extraction with metadata.
 */
export interface IpExtractionResult {
	/** The extracted IP address */
	ip: string
	/** Whether the IP was extracted from a trusted source */
	isTrusted: boolean
	/** Source of the IP extraction */
	source:
		| "x-forwarded-for"
		| "x-real-ip"
		| "x-vercel-forwarded-for"
		| "cf-connecting-ip"
		| "fallback"
}

// =============================================================================
// Constants
// =============================================================================

/**
 * IPv4 loopback address
 */
const IPV4_LOOPBACK = "127.0.0.1"

/**
 * IPv6 loopback address
 */
const IPV6_LOOPBACK = "::1"

/**
 * IPv6 mapped IPv4 loopback
 */
const IPV6_MAPPED_LOOPBACK = "::ffff:127.0.0.1"

/**
 * Default IP when unable to determine client IP
 */
const UNKNOWN_IP = "unknown"

/**
 * Vercel-specific header for forwarded IPs
 */
const VERCEL_FORWARDED_FOR = "x-vercel-forwarded-for"

/**
 * Standard forwarded header
 */
const X_FORWARDED_FOR = "x-forwarded-for"

/**
 * Nginx/proxy real IP header
 */
const X_REAL_IP = "x-real-ip"

/**
 * Cloudflare connecting IP header
 */
const CF_CONNECTING_IP = "cf-connecting-ip"

// =============================================================================
// IP Validation Utilities
// =============================================================================

/**
 * Check if a string is a valid IPv4 address.
 *
 * @param ip - String to validate
 * @returns true if valid IPv4
 */
export function isValidIPv4(ip: string): boolean {
	const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
	if (!ipv4Regex.test(ip)) return false

	const parts = ip.split(".")
	return parts.every((part) => {
		const num = Number.parseInt(part, 10)
		return num >= 0 && num <= 255
	})
}

/**
 * Check if a string is a valid IPv6 address.
 * Supports full, compressed, and IPv4-mapped formats.
 *
 * @param ip - String to validate
 * @returns true if valid IPv6
 */
export function isValidIPv6(ip: string): boolean {
	// Full IPv6 regex (simplified)
	const ipv6FullRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

	// Compressed IPv6 (with ::)
	const ipv6CompressedRegex =
		/^(([0-9a-fA-F]{1,4}:)*|:){1,7}([0-9a-fA-F]{1,4}:)*([0-9a-fA-F]{1,4})?$/

	// IPv4-mapped IPv6
	const ipv6MappedRegex =
		/^::(ffff:(0:){0,1})?[0-9a-fA-F]{1,4}:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/i

	return (
		ipv6FullRegex.test(ip) ||
		ipv6CompressedRegex.test(ip) ||
		ipv6MappedRegex.test(ip)
	)
}

/**
 * Check if a string is a valid IP address (IPv4 or IPv6).
 *
 * @param ip - String to validate
 * @returns true if valid IP address
 */
export function isValidIP(ip: string): boolean {
	return isValidIPv4(ip) || isValidIPv6(ip)
}

/**
 * Normalize an IP address for consistent comparison.
 * Handles IPv6 mapped IPv4 addresses.
 *
 * @param ip - IP address to normalize
 * @returns Normalized IP address
 */
export function normalizeIP(ip: string): string {
	// Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
	const ipv4MappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
	if (ipv4MappedMatch?.[1]) {
		return ipv4MappedMatch[1]
	}

	// Convert IPv6 loopback to IPv4 for consistency
	if (ip === IPV6_LOOPBACK) {
		return IPV4_LOOPBACK
	}

	return ip.toLowerCase().trim()
}

/**
 * Check if an IP is a loopback address.
 *
 * @param ip - IP address to check
 * @returns true if loopback
 */
export function isLoopbackIP(ip: string): boolean {
	const normalized = normalizeIP(ip)
	return (
		normalized === IPV4_LOOPBACK ||
		normalized === IPV6_LOOPBACK ||
		normalized === IPV6_MAPPED_LOOPBACK ||
		normalized.startsWith("127.")
	)
}

/**
 * Check if an IP is a private/local address.
 *
 * @param ip - IP address to check
 * @returns true if private IP
 */
export function isPrivateIP(ip: string): boolean {
	const normalized = normalizeIP(ip)

	// 10.0.0.0/8
	if (normalized.startsWith("10.")) return true

	// 172.16.0.0/12
	if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true

	// 192.168.0.0/16
	if (normalized.startsWith("192.168.")) return true

	// 169.254.0.0/16 (link-local)
	if (normalized.startsWith("169.254.")) return true

	return false
}

// =============================================================================
// Secure IP Extraction
// =============================================================================

/**
 * Extract IP from X-Forwarded-For chain considering trusted proxies.
 *
 * X-Forwarded-For format: client, proxy1, proxy2, ...
 * The rightmost IP is from the most recent proxy.
 *
 * @param headerValue - X-Forwarded-For header value
 * @param trustedProxyCount - Number of trusted proxies
 * @returns Client IP or null
 */
function extractIPFromForwardedChain(
	headerValue: string | null,
	trustedProxyCount: number,
): string | null {
	if (!headerValue) return null

	const ips = headerValue
		.split(",")
		.map((ip) => ip.trim())
		.filter((ip) => ip && isValidIP(ip))
		.map(normalizeIP)

	if (ips.length === 0) return null

	// If we have N trusted proxies, the client IP is at position:
	// length - 1 - trustedProxyCount (but not less than 0)
	const clientIndex = Math.max(0, ips.length - 1 - trustedProxyCount)

	return ips[clientIndex] ?? null
}

/**
 * Securely extract client IP address from request headers.
 *
 * This function implements secure IP extraction that prevents header spoofing
 * attacks by:
 * 1. Only trusting headers from known proxy configurations
 * 2. Validating IP address formats
 * 3. Properly handling the X-Forwarded-For chain
 *
 * @param request - Request object with headers
 * @param options - IP extraction options
 * @returns IP extraction result with metadata
 *
 * @example
 * ```typescript
 * // Basic usage (trusts first proxy)
 * const result = getSecureClientIp(request);
 * console.log(result.ip); // Client IP address
 *
 * // With custom trusted proxy count
 * const result = getSecureClientIp(request, { trustedProxyCount: 2 });
 * ```
 */
export function getSecureClientIp(
	request: Request,
	options: GetClientIpOptions = {},
): IpExtractionResult {
	const {
		trustProxy = true,
		trustedProxyCount = 1,
		trustedProxyIPs,
	} = options

	// If not trusting proxy headers, return unknown
	// (In Edge runtime, we can't access socket address)
	if (!trustProxy) {
		return {
			ip: UNKNOWN_IP,
			isTrusted: false,
			source: "fallback",
		}
	}

	// Check if request comes from a trusted proxy IP
	// This is an additional security layer
	if (trustedProxyIPs && trustedProxyIPs.length > 0) {
		// Get the immediate client IP (last in chain)
		const immediateIP = request.headers
			.get(X_FORWARDED_FOR)
			?.split(",")
			.pop()
			?.trim()
		if (
			immediateIP &&
			!trustedProxyIPs.includes(normalizeIP(immediateIP))
		) {
			// Request doesn't come from trusted proxy, don't trust headers
			return {
				ip: UNKNOWN_IP,
				isTrusted: false,
				source: "fallback",
			}
		}
	}

	// 1. Try Cloudflare header (most specific)
	const cfIP = request.headers.get(CF_CONNECTING_IP)
	if (cfIP && isValidIP(cfIP)) {
		return {
			ip: normalizeIP(cfIP),
			isTrusted: true,
			source: "cf-connecting-ip",
		}
	}

	// 2. Try Vercel-specific header
	const vercelIP = extractIPFromForwardedChain(
		request.headers.get(VERCEL_FORWARDED_FOR),
		trustedProxyCount,
	)
	if (vercelIP) {
		return {
			ip: vercelIP,
			isTrusted: true,
			source: "x-vercel-forwarded-for",
		}
	}

	// 3. Try standard X-Forwarded-For with chain handling
	const forwardedIP = extractIPFromForwardedChain(
		request.headers.get(X_FORWARDED_FOR),
		trustedProxyCount,
	)
	if (forwardedIP) {
		return {
			ip: forwardedIP,
			isTrusted: true,
			source: "x-forwarded-for",
		}
	}

	// 4. Try X-Real-IP (single IP, no chain)
	const realIP = request.headers.get(X_REAL_IP)
	if (realIP && isValidIP(realIP)) {
		return {
			ip: normalizeIP(realIP),
			isTrusted: true,
			source: "x-real-ip",
		}
	}

	// Fallback to unknown
	return {
		ip: UNKNOWN_IP,
		isTrusted: false,
		source: "fallback",
	}
}

/**
 * Extract client IP address for rate limiting purposes.
 *
 * This is a simplified version of getSecureClientIp that returns just the IP string.
 * Uses secure extraction by default.
 *
 * @param request - Request object with headers
 * @returns Client IP address string
 */
export function getClientIpForRateLimit(request: Request): string {
	const result = getSecureClientIp(request)
	return result.ip
}

/**
 * Check if a request appears to be from a local/development environment.
 *
 * @param request - Request object
 * @returns true if request is from local environment
 */
export function isLocalRequest(request: Request): boolean {
	const result = getSecureClientIp(request)
	return isLoopbackIP(result.ip) || isPrivateIP(result.ip)
}
