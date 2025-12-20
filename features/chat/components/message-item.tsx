'use client';

import type { ChatMessage } from '../types';

interface MessageItemProps {
  message: ChatMessage;
  isLast: boolean;
}

export function MessageItem({ message, isLast }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-message-id={message.id}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <div className="space-y-2">
          {message.parts.map((part, index) => {
            if (part.type === 'text') {
              return (
                <p key={index} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              );
            }
            if (part.type === 'reasoning') {
              return (
                <details key={index} className="text-sm opacity-75">
                  <summary>Reasoning</summary>
                  <p className="mt-1 whitespace-pre-wrap">
                    {'text' in part ? part.text : ''}
                  </p>
                </details>
              );
            }
            return null;
          })}
        </div>
        
        {isLast && !isUser && (
          <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
            <button className="hover:text-foreground">Copy</button>
            <button className="hover:text-foreground">Regenerate</button>
          </div>
        )}
      </div>
    </div>
  );
}
