/**
 * Edge-compatible cryptographic utilities using Web Crypto API
 * Works in both Node.js and Edge Runtime environments
 */

const ITERATIONS = 100000; // Industry standard for PBKDF2
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

/**
 * Generates a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Converts a Uint8Array to a hex string
 */
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a hex string to a Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives a key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    importedKey,
    KEY_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hashes a password using PBKDF2-SHA256
 * Returns a string in the format: salt:hash (both hex encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await deriveKey(password, salt);

  return `${bufferToHex(salt)}:${bufferToHex(hash)}`;
}

/**
 * Verifies a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = hexToBuffer(saltHex);
    const storedHashBuffer = hexToBuffer(hashHex);
    const derivedHash = await deriveKey(password, salt);

    // Constant-time comparison
    if (derivedHash.length !== storedHashBuffer.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash[i] ^ storedHashBuffer[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

