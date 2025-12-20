import '@testing-library/jest-dom/vitest';

// Mock environment variables for tests
process.env.AUTH_SECRET = 'test-secret-key-for-jwt-signing-32chars';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
