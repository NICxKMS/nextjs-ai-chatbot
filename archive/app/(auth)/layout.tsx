/**
 * Auth Layout
 * Ref: oldapp/app/(auth)/layout.tsx
 *
 * Simple centered layout for auth pages.
 * Dark background, centered content.
 * Note: Toaster is provided by root layout - no duplicate needed.
 */
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh w-full flex-col bg-background">
            {children}
        </div>
    );
}
