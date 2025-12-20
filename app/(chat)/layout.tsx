export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar will be added */}
      <aside className="w-64 border-r bg-gray-50 dark:bg-gray-900 hidden md:block">
        <div className="p-4">
          <h2 className="font-semibold">Chat History</h2>
          {/* Sidebar content placeholder */}
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
