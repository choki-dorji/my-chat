'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

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

  const onNewMessage = (callback: (message: any) => void) => {
    if (socket.current) {
      socket.current.on('new-message', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('new-message', callback);
      }
    };
  };

  const emitTyping = (chatId: string, type: 'private' | 'group', user: string) => {
    if (socket.current) {
      socket.current.emit('typing', { chatId, type, user });
    }
  };

  const emitStopTyping = (chatId: string, type: 'private' | 'group') => {
    if (socket.current) {
      socket.current.emit('stop-typing', { chatId, type });
    }
  };

  const onUserTyping = (callback: (user: string) => void) => {
    if (socket.current) {
      socket.current.on('user-typing', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('user-typing', callback);
      }
    };
  };

  const onUserStopTyping = (callback: () => void) => {
    if (socket.current) {
      socket.current.on('user-stop-typing', callback);
    }
    return () => {
      if (socket.current) {
        socket.current.off('user-stop-typing', callback);
      }
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