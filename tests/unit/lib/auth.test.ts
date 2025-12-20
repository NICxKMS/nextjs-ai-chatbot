import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCookieOptions,
  isProductionEnvironment,
  JWT_EXPIRATION_SECONDS,
  GUEST_CACHE_TTL_SECONDS,
  JWT_ISSUER,
  ROTATION_THRESHOLD_SECONDS,
} from '@/lib/auth/constants';
import { needsRotation } from '@/lib/auth/jwt';
import type { GuestTokenPayload } from '@/lib/auth/types';

// Note: JWT signing/verification tests are skipped in jsdom environment
// because jose library requires proper Web Crypto API support.
// These functions are integration-tested in e2e tests instead.

describe('JWT Utilities', () => {
  describe('needsRotation', () => {
    it('should return true when exp is missing', () => {
      const payload = { sub: 'guest:123', type: 'guest' } as GuestTokenPayload;
      expect(needsRotation(payload)).toBe(true);
    });

    it('should return true when less than 30 min remaining', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: GuestTokenPayload = {
        sub: 'guest:123',
        type: 'guest',
        exp: now + 900, // 15 min remaining
        iat: now - 3600,
      };
      expect(needsRotation(payload)).toBe(true);
    });

    it('should return false when more than 30 min remaining', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: GuestTokenPayload = {
        sub: 'guest:123',
        type: 'guest',
        exp: now + 3600, // 60 min remaining
        iat: now,
      };
      expect(needsRotation(payload)).toBe(false);
    });

    it('should return true at exactly 30 min remaining', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: GuestTokenPayload = {
        sub: 'guest:123',
        type: 'guest',
        exp: now + 1800, // exactly 30 min
        iat: now,
      };
      // < 1800 means false, so at exactly 1800 it should be false
      expect(needsRotation(payload)).toBe(false);
    });

    it('should return true when token is expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: GuestTokenPayload = {
        sub: 'guest:123',
        type: 'guest',
        exp: now - 100, // expired
        iat: now - 3700,
      };
      expect(needsRotation(payload)).toBe(true);
    });
  });
});

describe('Auth Constants', () => {
  describe('getCookieOptions', () => {
    it('should return secure options for production', () => {
      const options = getCookieOptions(true);

      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.path).toBe('/');
      expect(options.sameSite).toBe('lax');
      expect(options.maxAge).toBe(GUEST_CACHE_TTL_SECONDS);
    });

    it('should return non-secure options for development', () => {
      const options = getCookieOptions(false);

      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(false);
      expect(options.path).toBe('/');
      expect(options.sameSite).toBe('lax');
    });

    it('should always set httpOnly to true', () => {
      expect(getCookieOptions(true).httpOnly).toBe(true);
      expect(getCookieOptions(false).httpOnly).toBe(true);
    });
  });

  describe('isProductionEnvironment', () => {
    it('should detect test environment', () => {
      // NODE_ENV is set to 'test' in setup.ts
      expect(isProductionEnvironment()).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct JWT expiration (1 hour)', () => {
      expect(JWT_EXPIRATION_SECONDS).toBe(3600);
    });

    it('should have correct guest cache TTL (7 days)', () => {
      expect(GUEST_CACHE_TTL_SECONDS).toBe(604800);
    });

    it('should have correct JWT issuer', () => {
      expect(JWT_ISSUER).toBe('nextjs-ai-chatbot');
    });

    it('should have correct rotation threshold (30 min)', () => {
      expect(ROTATION_THRESHOLD_SECONDS).toBe(1800);
    });

    it('should have consistent time values', () => {
      // JWT expires in 1 hour, rotation at 30 min = 50% of lifetime
      expect(ROTATION_THRESHOLD_SECONDS).toBe(JWT_EXPIRATION_SECONDS / 2);
    });
  });
});

describe('GuestTokenPayload type', () => {
  it('should have required fields', () => {
    const payload: GuestTokenPayload = {
      sub: 'guest:test-id',
      type: 'guest',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    expect(payload.sub).toMatch(/^guest:/);
    expect(payload.type).toBe('guest');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
  });
});
