'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface ChatAreaProps {
  selectedChat: {
    type: 'private' | 'group';
    id: string;
    name: string;
  } | null;
  onBackClick: () => void;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  receiverId?: string;
  groupId?: string;
  createdAt: Date;
}

function UserAvatar({ user }: { user: { name: string; image?: string | null } }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name}
        width={32}
        height={32}
        className="rounded-full"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// Add this new component for the typing indicator
function TypingIndicator({ user }: { user: string }) {
  return (
    <div className="flex items-start space-x-2">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
        {user.charAt(0).toUpperCase()}
      </div>
      <div className="bg-gray-100 rounded-2xl px-4 py-2">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-500">{user} is typing</span>
          <div className="flex space-x-1">
            <div className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full" />
            <div className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full" />
            <div className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatArea({ selectedChat, onBackClick }: ChatAreaProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { joinChat, leaveChat, sendMessage, onNewMessage, emitTyping, emitStopTyping, onUserTyping, onUserStopTyping } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // Define fetchMessages before using it in useEffect
  const fetchMessages = async () => {
    if (!selectedChat) return;
    
    try {
      const response = await fetch(
        `/api/messages?type=${selectedChat.type}&id=${selectedChat.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  // Function to scroll to bottom
  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current && (shouldAutoScroll || force)) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    }
  };

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      isInitialLoadRef.current = true;
      fetchMessages().then(() => {
        // Force scroll to bottom only on initial load
        if (isInitialLoadRef.current) {
          scrollToBottom(true);
          isInitialLoadRef.current = false;
        }
      });
      joinChat(selectedChat.id, selectedChat.type);
      return () => {
        leaveChat(selectedChat.id);
      };
    } else {
      setMessages([]);
    }
  }, [selectedChat?.id]);

  // Handle new messages
  useEffect(() => {
    const handleNewMessage = (newMessage: Message) => {
      if (selectedChat) {
        if (
          (selectedChat.type === 'private' &&
            ((newMessage.senderId === selectedChat.id && newMessage.receiverId === session?.user?.id) ||
              (newMessage.senderId === session?.user?.id && newMessage.receiverId === selectedChat.id))) ||
          (selectedChat.type === 'group' && newMessage.groupId === selectedChat.id)
        ) {
          setMessages((prev) => [...prev, newMessage]);
          // Only scroll if we're already near the bottom
          scrollToBottom();
        }
      }
    };

    const cleanup = onNewMessage(handleNewMessage);
    return () => cleanup();
  }, [onNewMessage, selectedChat, session?.user?.id]);

  useEffect(() => {
    const handleUserTyping = (data: { user: string; chatId: string }) => {
      if (selectedChat && data.chatId === selectedChat.id) {
        setTypingUser(data.user);
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data: { chatId: string }) => {
      if (selectedChat && data.chatId === selectedChat.id) {
        setTypingUser(null);
        setIsTyping(false);
      }
    };

    const cleanupTyping = onUserTyping(handleUserTyping);
    const cleanupStopTyping = onUserStopTyping(handleUserStopTyping);

    return () => {
      cleanupTyping();
      cleanupStopTyping();
    };
  }, [onUserTyping, onUserStopTyping, selectedChat]);

  const handleTyping = () => {
    if (!selectedChat || !session?.user?.name) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    emitTyping(selectedChat.id, session.user.name);

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(selectedChat.id);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat || !session?.user) return;

    try {
      // Save message to database
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.trim(),
          ...(selectedChat.type === 'private'
            ? { receiverId: selectedChat.id }
            : { groupId: selectedChat.id }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const savedMessage = await response.json();

      // Send through socket
      sendMessage({
        ...savedMessage,
        type: selectedChat.type,
      });

      // Force scroll to bottom when sending a message
      setShouldAutoScroll(true);
      scrollToBottom(true);

      setMessage('');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitStopTyping(selectedChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-900">
            Select a chat to start messaging
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose from your existing conversations or start a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[100dvh] md:h-full relative">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <UserAvatar user={{ name: selectedChat?.name || '?' }} />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {selectedChat?.name}
            </h2>
            {selectedChat?.type === 'group' && (
              <p className="text-sm text-gray-500">Group</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-gray-50 pb-[76px]"
      >
        <div className="space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-2 ${
                msg.sender.email === session?.user?.email
                  ? 'flex-row-reverse space-x-reverse'
                  : 'flex-row'
              }`}
            >
              <UserAvatar user={msg.sender} />
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender.email === session?.user?.email
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                {msg.sender.email !== session?.user?.email && (
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.sender.name}
                  </div>
                )}
                <div>{msg.content}</div>
                <div className="text-xs mt-1 opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isTyping && typingUser && (
            <div className="mt-2">
              <TypingIndicator user={typingUser} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 md:relative md:flex-none bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="p-4 flex space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
} 