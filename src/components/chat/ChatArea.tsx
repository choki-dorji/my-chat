'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PaperAirplaneIcon, ArrowLeftIcon, PaperClipIcon, SwatchIcon } from '@heroicons/react/24/solid';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import Image from 'next/image';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';

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
  contentType: 'text' | 'voice' | 'image' | 'video' | 'file';
  fileName?: string;
  fileSize?: number;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
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

function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgColor, setBgColor] = useState('#f9fafb'); // default gray-50
  const colorInputRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

    // Create a temporary message object
    const tempMessage: Message = {
      id: Date.now().toString(), // Temporary ID
      content: message,
      contentType: 'text',
      senderId: session.user.email!,
      sender: {
        id: session.user.email!,
        name: session.user.name!,
        email: session.user.email!,
        image: session.user.image
      },
      ...(selectedChat.type === 'private'
        ? { receiverId: selectedChat.id }
        : { groupId: selectedChat.id }),
      createdAt: new Date()
    };

    // Immediately add message to UI
    setMessages(prev => [...prev, tempMessage]);
    setMessage('');
    scrollToBottom(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          ...(selectedChat.type === 'private'
            ? { receiverId: selectedChat.id }
            : { groupId: selectedChat.id }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const savedMessage = await response.json();
      
      // Replace temporary message with saved message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? savedMessage : msg
        )
      );

      // Emit the message through socket
      sendMessage({
        ...savedMessage,
        type: selectedChat.type,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    if (!selectedChat || !session?.user) return;

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload voice message');
      }

      const { url } = await uploadResponse.json();

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: url,
          contentType: 'voice',
          ...(selectedChat.type === 'private'
            ? { receiverId: selectedChat.id }
            : { groupId: selectedChat.id }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const savedMessage = await response.json();
      sendMessage({
        ...savedMessage,
        type: selectedChat.type,
      });

      scrollToBottom(true);
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast.error('Failed to send voice message');
    }
  };

  function getFileType(url: string) {
    const extension = url.split('.').pop()?.toLowerCase();
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'webm', 'aac', 'flac'];
    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];

    if (extension && imageExtensions.includes(extension)) return 'image';
    if (extension && audioExtensions.includes(extension)) return 'audio';
    if (extension && videoExtensions.includes(extension)) return 'video';
    if (extension && documentExtensions.includes(extension)) return 'file';

    return 'unknown';
}

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat || !session?.user) return;

    // Check file size (e.g., 50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is too large. Maximum size is 50MB');
      return;
    }

    // Create temporary message
    const tempMessage: Message = {
      id: Date.now().toString(),
      content: URL.createObjectURL(file),
      contentType: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('video/') ? 'video' : 'file',
      fileName: file.name,
      fileSize: file.size,
      senderId: session.user.email!,
      sender: {
        id: session.user.email!,
        name: session.user.name!,
        email: session.user.email!,
        image: session.user.image
      },
      ...(selectedChat.type === 'private'
        ? { receiverId: selectedChat.id }
        : { groupId: selectedChat.id }),
      createdAt: new Date()
    };

    // Immediately add message to UI
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Show upload progress toast
      const uploadToast = toast.loading(`Uploading ${file.name}...`);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(await uploadResponse.text() || 'Failed to upload file');
      }

      const { url } = await uploadResponse.json();
      toast.dismiss(uploadToast);
      
      // Determine content type
      let contentType: 'image' | 'video' | 'file';
      if (file.type.startsWith('image/')) {
        contentType = 'image';
      } else if (file.type.startsWith('video/')) {
        contentType = 'video';
      } else {
        contentType = 'file';
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: url,
          contentType,
          fileName: file.name,
          fileSize: file.size,
          ...(selectedChat.type === 'private'
            ? { receiverId: selectedChat.id }
            : { groupId: selectedChat.id }),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to send message');
      }

      const savedMessage = await response.json();
      sendMessage({
        ...savedMessage,
        type: selectedChat.type,
      });

      // Replace temp message with saved message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? savedMessage : msg
        )
      );
      
      toast.success('File sent successfully');
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send file');
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  useEffect(() => {
    const savedColor = localStorage.getItem('chatBgColor');
    if (savedColor) {
      setBgColor(savedColor);
    }
  }, []);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setBgColor(newColor);
    localStorage.setItem('chatBgColor', newColor);
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
      <div className="flex-none p-3 md:p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <UserAvatar user={{ name: selectedChat?.name || '?' }} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-semibold truncate">
              {selectedChat?.name}
            </h2>
            {selectedChat?.type === 'group' && (
              <p className="text-sm text-gray-500">Group</p>
            )}
          </div>
          <button
            onClick={() => colorInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Change chat background"
          >
            <SwatchIcon className="h-5 w-5" />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={bgColor}
            onChange={handleColorChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-[68px] md:pb-[76px]"
        style={{ backgroundColor: bgColor }}
      >
        <div className="space-y-2 md:space-y-4 p-3 md:p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-2 ${
                msg.sender.email === session?.user?.email
                  ? 'flex-row-reverse space-x-reverse'
                  : 'flex-row'
              }`}
            >
              {msg.sender.email !== session?.user?.email && (
                <div className="flex-shrink-0">
                  <UserAvatar user={msg.sender} />
                </div>
              )}
              <div
                className={`${
                  msg.contentType === 'voice' ? 'p-2' : 'p-2 md:p-3'
                } ${
                  msg.sender.email === session?.user?.email
                    ? 'bg-[#0084FF] text-white'
                    : isLightColor(bgColor)
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-gray-800 text-white'
                } rounded-lg shadow-sm max-w-[85%] md:max-w-[70%] break-words`}
              >
                {msg.sender.email !== session?.user?.email && msg.contentType !== 'voice' && (
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.sender.name}
                  </div>
                )}
                { 
                // msg.content.startsWith('http://') 
                getFileType(msg.content) === 'audio'
                ? (
                  <div className="min-w-[200px]">
                    <AudioPlayer 
                      url={msg.content} 
                      isOwnMessage={msg.sender.email === session?.user?.email}
                      sender={{
                        name: msg.sender.name,
                        image: msg.sender.image
                      }}
                    />
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ) : getFileType(msg.content) === 'image' ? (
                  <div className="max-w-[200px]">
                    <Image
                      src={msg.content}
                      alt="Shared image"
                      width={200}
                      height={150}
                      className="rounded-lg object-contain w-full"
                    />
                  </div>
                ) : getFileType(msg.content) === 'video' ? (
                  <div className="max-w-[300px] w-full">
                    <video 
                      src={msg.content} 
                      controls 
                      playsInline
                      preload="metadata"
                      className="rounded-lg w-full max-h-[400px] object-contain bg-black"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="text-xs text-gray-500 mt-1">
                      {msg.fileName && (
                        <span className="block truncate">{msg.fileName}</span>
                      )}
                    </div>
                  </div>
                ) : getFileType(msg.content) === 'file' ? (
                  <a 
                    href={msg.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                  >
                    <PaperClipIcon className="h-5 w-5 text-white" />
                    <span className="text-white">{msg.content.split('/').pop()}</span>
                  </a>
                )  : (
                  <div>{msg.content}</div>
                )}
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
        <form onSubmit={handleSendMessage} className="p-2 md:p-4 flex items-center space-x-2 md:space-x-4">
          <VoiceRecorder onRecordingComplete={handleVoiceRecordingComplete} />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <PaperClipIcon className="h-5 w-5" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,application/*"
            capture={isMobile ? 'environment' : undefined}
          />
          
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-3 md:px-4 py-2 focus:outline-none focus:border-blue-500 text-sm md:text-base"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white rounded-lg px-3 md:px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
} 