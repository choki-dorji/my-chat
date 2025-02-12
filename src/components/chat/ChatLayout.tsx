'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

export default function ChatLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<{
    type: 'private' | 'group';
    id: string;
    name: string;
  } | null>(null);

  // Check for chat parameter in URL
  useEffect(() => {
    const chatId = searchParams.get('chat');
    const chatType = searchParams.get('type') as 'private' | 'group';
    const chatName = searchParams.get('name');

    if (chatId && chatType && chatName) {
      setSelectedChat({
        type: chatType,
        id: chatId,
        name: decodeURIComponent(chatName)
      });
    } else {
      setSelectedChat(null);
    }
  }, [searchParams]);

  const handleChatSelect = (chat: { type: 'private' | 'group'; id: string; name: string; } | null) => {
    setSelectedChat(chat);
    if (chat) {
      // Update URL with chat details
      router.push(`/?chat=${chat.id}&type=${chat.type}&name=${encodeURIComponent(chat.name)}`);
    } else {
      router.push('/');
    }
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    router.push('/');
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Sidebar - hidden on mobile when chat is selected */}
      <div className={`
        ${selectedChat ? 'hidden md:block' : 'block'}
        w-full md:w-80 
        border-r border-gray-200
      `}>
        <Sidebar
          selectedChat={selectedChat}
          onSelectChat={handleChatSelect}
        />
      </div>

      {/* Chat Area - full screen on mobile when chat is selected */}
      <div className={`
        ${!selectedChat ? 'hidden md:block' : 'block'}
        flex-1
      `}>
        <ChatArea
          selectedChat={selectedChat}
          onBackClick={handleBackToList}
        />
      </div>
    </div>
  );
} 