'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface ChatAreaProps {
  selectedChat: {
    type: 'private' | 'group';
    id: string;
    name: string;
  } | null;
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

export default function ChatArea({ selectedChat }: ChatAreaProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { joinChat, leaveChat, sendMessage, onNewMessage, emitTyping, emitStopTyping, onUserTyping, onUserStopTyping } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      joinChat(selectedChat.id, selectedChat.type);
      return () => {
        leaveChat(selectedChat.id);
      };
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

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

  useEffect(() => {
    const handleNewMessage = (newMessage: Message) => {
      // Only add message if it belongs to current chat
      if (selectedChat) {
        if (
          (selectedChat.type === 'private' &&
            ((newMessage.senderId === selectedChat.id && newMessage.receiverId === session?.user?.id) ||
              (newMessage.senderId === session?.user?.id && newMessage.receiverId === selectedChat.id))) ||
          (selectedChat.type === 'group' && newMessage.groupId === selectedChat.id)
        ) {
          setMessages((prev) => [...prev, newMessage]);
        }
      }
    };

    const cleanup = onNewMessage(handleNewMessage);
    return () => {
      cleanup();
    };
  }, [onNewMessage, selectedChat, session?.user?.id]);

  useEffect(() => {
    const handleUserTyping = (user: string) => {
      setTypingUser(user);
      setIsTyping(true);
    };

    const handleUserStopTyping = () => {
      setTypingUser(null);
      setIsTyping(false);
    };

    const cleanupTyping = onUserTyping(handleUserTyping);
    const cleanupStopTyping = onUserStopTyping(handleUserStopTyping);

    return () => {
      cleanupTyping();
      cleanupStopTyping();
    };
  }, [onUserTyping, onUserStopTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = () => {
    if (!selectedChat || !session?.user?.name) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    emitTyping(selectedChat.id, selectedChat.type, session.user.name);

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(selectedChat.id, selectedChat.type);
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

      setMessage('');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitStopTyping(selectedChat.id, selectedChat.type);
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
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <UserAvatar user={{ name: selectedChat?.name || '?' }} />
          <h2 className="text-xl font-semibold">
            {selectedChat.name}
            {selectedChat.type === 'group' && (
              <span className="ml-2 text-sm text-gray-500">Group</span>
            )}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
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
            <div className="text-sm text-gray-500 italic">
              {typingUser} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
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