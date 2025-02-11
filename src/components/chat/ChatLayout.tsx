'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

export default function ChatLayout() {
  const [selectedChat, setSelectedChat] = useState<{
    type: 'user' | 'group';
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="flex h-full">
      <Sidebar
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
      />
      <ChatArea
        selectedChat={selectedChat}
      />
    </div>
  );
} 