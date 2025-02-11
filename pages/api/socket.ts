import { Server as NetServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface UserSocket {
  userId: string;
  socketId: string;
}

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as any;
    const io = new SocketServer(httpServer, {
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

      // User connects with their ID
      socket.on('user-connect', (userId: string) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} connected with socket ${socket.id}`);
      });

      // Join private chat
      socket.on('join-private-chat', (chatId: string) => {
        // Leave all other private chats first
        socket.rooms.forEach((room) => {
          if (room.startsWith('private:')) {
            socket.leave(room);
          }
        });
        // Join the new private chat
        socket.join(`private:${chatId}`);
        console.log(`Socket ${socket.id} joined private chat: ${chatId}`);
      });

      // Join group chat
      socket.on('join-group', (groupId: string) => {
        socket.join(`group:${groupId}`);
        console.log(`Socket ${socket.id} joined group: ${groupId}`);
      });

      // Handle private message
      socket.on('send-private-message', (message: any) => {
        const { receiverId, senderId } = message;
        // Create a unique room ID for the private chat
        const chatId = [senderId, receiverId].sort().join(':');
        const roomId = `private:${chatId}`;

        // Only emit to sockets in this private room
        socket.to(roomId).emit('new-message', message);
        // Also emit to sender's socket
        socket.emit('new-message', message);
      });

      // Handle group message
      socket.on('send-group-message', (message: any) => {
        const { groupId } = message;
        const roomId = `group:${groupId}`;

        // Only emit to sockets in this group room
        socket.to(roomId).emit('new-message', message);
        // Also emit to sender's socket
        socket.emit('new-message', message);
      });

      // Handle typing events
      socket.on('typing', ({ chatId, type, user }: { chatId: string; type: 'private' | 'group'; user: string }) => {
        const roomId = `${type}:${chatId}`;
        socket.to(roomId).emit('user-typing', user);
      });

      socket.on('stop-typing', ({ chatId, type }: { chatId: string; type: 'private' | 'group' }) => {
        const roomId = `${type}:${chatId}`;
        socket.to(roomId).emit('user-stop-typing');
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

  res.end();
};

export default ioHandler; 