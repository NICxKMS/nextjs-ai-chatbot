import { Suspense } from 'react';
import { connection } from 'next/server';
import { AppSidebar, SidebarProvider, OptimisticChatsProvider } from '@/features/sidebar';
import { getAppSession } from '@/lib/auth';

async function SidebarWithSession() {
  await connection();
  const session = await getAppSession();
  
  return (
    <AppSidebar 
      userId={session?.user.id} 
      userEmail={session?.user.email ?? undefined}
    />
  );
}

function SidebarFallback() {
  return (
    <aside className="w-64 border-r bg-muted/50 hidden md:block">
      <div className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-24 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    </aside>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <OptimisticChatsProvider>
        <div className="flex h-screen">
          <Suspense fallback={<SidebarFallback />}>
            <SidebarWithSession />
          </Suspense>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </OptimisticChatsProvider>
    </SidebarProvider>
  );
}
