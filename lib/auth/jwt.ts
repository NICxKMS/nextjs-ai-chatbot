import 'server-only';
import { jwtVerify, SignJWT } from 'jose';
import type { JwtPayload } from './types';

export interface JwtVerifyOptions {
  audience?: string | string[];
  issuer?: string | string[];
}

/**
 * Verify JWT token with optional claims validation
 * @param token - JWT token string
 * @param secret - Secret key as Uint8Array
 * @param options - Optional verification options (audience, issuer)
 * @returns Decoded payload or null if verification fails
 */
export async function verifyJwt(
  token: string,
  secret: Uint8Array,
  options?: JwtVerifyOptions
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: options?.audience,
      issuer: options?.issuer,
    });
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Sign a new JWT token
 * @param payload - Token payload data
 * @param secret - Secret key as Uint8Array
 * @param expiresInSeconds - Token expiration time in seconds
 * @returns Signed JWT string
 */
export async function signJwt(
  payload: Record<string, unknown>,
  secret: Uint8Array,
  expiresInSeconds: number
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret);
}
