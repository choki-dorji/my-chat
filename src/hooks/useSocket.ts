'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  groupId?: string;
  type: 'private' | 'group';
}

export const useSocket = () => {
  const socket = useRef<Socket | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!socket.current && session?.user?.email) {
      // Initialize socket connection
      fetch('/api/socket').finally(() => {
        socket.current = io({
          path: '/api/socket',
          addTrailingSlash: false,
        });

        socket.current.on('connect', () => {
          console.log('Socket connected');
          socket.current?.emit('user-connect', session.user.email);
        });

        socket.current.on('disconnect', () => {
          console.log('Socket disconnected');
        });
      });
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [session]);

  const joinChat = (chatId: string, type: 'private' | 'group') => {
    if (socket.current) {
      if (type === 'private') {
        socket.current.emit('join-private-chat', chatId);
      } else {
        socket.current.emit('join-group', chatId);
      }
    }
  };

  const leaveChat = (chatId: string) => {
    if (socket.current) {
      socket.current.emit('leave-chat', chatId);
    }
  };

  const sendMessage = (message: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    receiverId?: string;
    groupId?: string;
    type: 'private' | 'group';
  }) => {
    if (socket.current) {
      if (message.type === 'private' && message.receiverId) {
        socket.current.emit('send-private-message', message);
      } else if (message.type === 'group' && message.groupId) {
        socket.current.emit('send-group-message', message);
      }
    }
  };

  const onNewMessage = (callback: (message: Message) => void) => {
    if (socket.current) {
      socket.current.on('new-message', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('new-message', callback);
      }
    };
  };

  const emitTyping = (chatId: string, username: string) => {
    socket.current?.emit('typing', { chatId, user: username });
  };

  const emitStopTyping = (chatId: string) => {
    socket.current?.emit('stop_typing', { chatId });
  };

  const onUserTyping = (callback: (data: { user: string; chatId: string }) => void) => {
    socket.current?.on('user_typing', callback);
    return () => {
      socket.current?.off('user_typing', callback);
    };
  };

  const onUserStopTyping = (callback: (data: { chatId: string }) => void) => {
    socket.current?.on('user_stop_typing', callback);
    return () => {
      socket.current?.off('user_stop_typing', callback);
    };
  };

  return {
    socket: socket.current,
    joinChat,
    leaveChat,
    sendMessage,
    onNewMessage,
    emitTyping,
    emitStopTyping,
    onUserTyping,
    onUserStopTyping,
  };
}; 