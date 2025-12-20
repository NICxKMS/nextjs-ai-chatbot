interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <h1 className="text-lg font-semibold mb-4">Chat: {id}</h1>
        {/* Messages will be rendered here */}
      </div>
      <div className="border-t p-4">
        {/* Input will be added */}
        <p className="text-center text-gray-500">Chat input placeholder</p>
      </div>
    </div>
  );
}
