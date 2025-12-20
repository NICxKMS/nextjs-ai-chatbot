import 'server-only';
import { db } from './client';
import { logger } from '@/lib/logging';
import { AppError } from '@/lib/errors';

type TransactionCallback<T> = Parameters<typeof db.transaction>[0];

export async function withTransaction<T>(
  fn: TransactionCallback<T>,
  operation = 'database_transaction'
): Promise<T> {
  const start = performance.now();

  try {
    const result = await db.transaction(fn);
    const duration = performance.now() - start;
    
    if (duration > 500) {
      logger.warn(`Slow transaction: ${operation}`, { 
        duration: Math.round(duration),
        operation 
      });
    }
    
    return result as T;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Transaction failed: ${operation}`, err);
    
    throw new AppError({
      code: 'internal:database',
      message: `Database transaction failed: ${operation}`,
      cause: err,
    });
  }
}
