import { NextRequest, NextResponse } from 'next/server';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

/**
 * Add security headers to response
 */
export function securityHeaders() {
  return (_request: NextRequest, response: NextResponse): NextResponse => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  };
}

/**
 * CORS middleware
 */
export function cors(allowedOrigins: string[] = []) {
  return (request: NextRequest, response: NextResponse): NextResponse | void => {
    const origin = request.headers.get('origin');
    
    if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  };
}
