/**
 * Edge-compatible password hashing and verification
 * @module new-arch/lib/auth/password
 *
 * Uses Web Crypto API with PBKDF2 for secure, edge-compatible password operations.
 * This avoids dependencies on bcrypt/argon which require Node.js.
 */
import "server-only";

/** Configuration for PBKDF2 hashing */
const PBKDF2_CONFIG = {
    iterations: 100_000,
    hashAlgorithm: "SHA-256" as const,
    saltLength: 16,
    keyLength: 32,
};

/**
 * Hash a password using PBKDF2.
 *
 * @param password - The plain text password to hash
 * @returns The hashed password in format: salt$hash (both base64 encoded)
 *
 * @example
 * const hash = await hashPassword("mySecretPassword");
 * // Returns: "randomSalt$hashedValue"
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(
        new Uint8Array(PBKDF2_CONFIG.saltLength)
    );

    const passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const hash = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_CONFIG.iterations,
            hash: PBKDF2_CONFIG.hashAlgorithm,
        },
        passwordKey,
        PBKDF2_CONFIG.keyLength * 8
    );

    const saltBase64 = btoa(String.fromCharCode(...salt));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

    return `${saltBase64}$${hashBase64}`;
}

/**
 * Verify a password against a stored hash.
 *
 * @param password - The plain text password to verify
 * @param storedHash - The stored hash in format: salt$hash
 * @returns True if the password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword("mySecretPassword", storedHash);
 */
export async function verifyPassword(
    password: string,
    storedHash: string
): Promise<boolean> {
    try {
        const [saltBase64, hashBase64] = storedHash.split("$");
        if (!(saltBase64 && hashBase64)) {
            return false;
        }

        // Decode salt from base64
        const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

        const passwordKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );

        const hash = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt,
                iterations: PBKDF2_CONFIG.iterations,
                hash: PBKDF2_CONFIG.hashAlgorithm,
            },
            passwordKey,
            PBKDF2_CONFIG.keyLength * 8
        );

        const computedHashBase64 = btoa(
            String.fromCharCode(...new Uint8Array(hash))
        );

        // Constant-time comparison to prevent timing attacks
        return timingSafeEqual(hashBase64, computedHashBase64);
    } catch {
        return false;
    }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}
