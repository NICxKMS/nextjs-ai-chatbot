import type { NextRequest, NextResponse } from 'next/server';

export type MiddlewareHandler = (
  request: NextRequest,
  response: NextResponse
) => Promise<NextResponse | void> | NextResponse | void;

/**
 * Compose multiple middleware handlers into a single handler
 */
export function composeMiddleware(
  ...handlers: MiddlewareHandler[]
): MiddlewareHandler {
  return async (request, response) => {
    let currentResponse = response;
    
    for (const handler of handlers) {
      const result = await handler(request, currentResponse);
      if (result) {
        currentResponse = result;
      }
    }
    
    return currentResponse;
  };
}
