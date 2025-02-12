import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

interface User {
  userId: string;
  socketId: string;
}

export const initSocket = (res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    // Keep track of online users
    const onlineUsers = new Map<string, string>();

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      // User joins with their ID
      socket.on('user-connect', (userId: string) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} connected with socket ${socket.id}`);
      });

      // Join private chat room
      socket.on('join-private-chat', (chatId: string) => {
        socket.join(`private:${chatId}`);
        console.log(`Socket ${socket.id} joined private chat: ${chatId}`);
      });

      // Join group chat room
      socket.on('join-group', (groupId: string) => {
        socket.join(`group:${groupId}`);
        console.log(`Socket ${socket.id} joined group: ${groupId}`);
      });

      // Leave chat room
      socket.on('leave-chat', (chatId: string) => {
        socket.leave(`private:${chatId}`);
        socket.leave(`group:${chatId}`);
        console.log(`Socket ${socket.id} left chat: ${chatId}`);
      });

      // Handle private message
      socket.on('send-private-message', (message: any) => {
        const { receiverId, senderId } = message;
        // Create a unique room ID for the private chat
        const chatId = [senderId, receiverId].sort().join(':');
        io.to(`private:${chatId}`).emit('new-message', message);
      });

      // Handle group message
      socket.on('send-group-message', (message: any) => {
        const { groupId } = message;
        io.to(`group:${groupId}`).emit('new-message', message);
      });

      // Handle typing events
      socket.on('typing', ({ chatId, user }) => {
        socket.broadcast.emit('user_typing', { chatId, user });
      });

      socket.on('stop_typing', ({ chatId }) => {
        socket.broadcast.emit('user_stop_typing', { chatId });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        // Remove user from online users
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(userId);
            break;
          }
        }
        console.log('Socket disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  return res.socket.server.io;
}; 