import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  identifier?: (request: NextRequest) => string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

// In-memory store for edge runtime
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return ip;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, identifier } = { ...DEFAULT_CONFIG, ...config };
  
  return (request: NextRequest, response: NextResponse): NextResponse | void => {
    const id = identifier ? identifier(request) : getIdentifier(request);
    const now = Date.now();
    
    const entry = requestCounts.get(id);
    
    if (!entry || now > entry.resetAt) {
      requestCounts.set(id, { count: 1, resetAt: now + windowMs });
      return;
    }
    
    entry.count++;
    
    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${id}`);
      
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          },
        }
      );
    }
  };
}
