import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

function getPoolConfig() {
  const isVercelFluid = process.env.VERCEL_FLUID === '1';
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isVercelFluid) {
    return { max: 5, idle_timeout: 10, connect_timeout: 10 };
  }
  if (isProd) {
    return { max: 10, idle_timeout: 20, connect_timeout: 10 };
  }
  return { max: 3, idle_timeout: 30, connect_timeout: 30 };
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, {
  ...getPoolConfig(),
  prepare: false,
});

export const db = drizzle(client);
