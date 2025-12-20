import { Toaster } from 'sonner';

/**
 * Auth Layout
 * Ref: oldapp/app/(auth)/layout.tsx
 *
 * Simple centered layout for auth pages with toast support.
 * Dark background, centered content.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      {children}
      <Toaster position="top-center" />
    </div>
  );
}
