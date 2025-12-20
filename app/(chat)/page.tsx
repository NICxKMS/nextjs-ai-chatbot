import { getAppSession } from '@/lib/auth';
import { ChatContainer } from '@/features/chat';

export default async function NewChatPage() {
  const session = await getAppSession();
  
  // Generate new chat ID
  const chatId = crypto.randomUUID();
  
  return (
    <ChatContainer
      chatId={chatId}
      initialMessages={[]}
      modelId="gpt-4o"
      isGuest={!session?.user.id}
    />
  );
}
