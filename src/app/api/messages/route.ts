import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatType = searchParams.get('type');
    const chatId = searchParams.get('id');

    if (!chatType || !chatId) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    let messages;
    if (chatType === 'private') {
      messages = await prisma.message.findMany({
        where: {
          OR: [
            {
              AND: [
                { senderId: currentUser.id },
                { receiverId: chatId }
              ]
            },
            {
              AND: [
                { senderId: chatId },
                { receiverId: currentUser.id }
              ]
            }
          ]
        },
        include: {
          sender: true,
          receiver: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    } else {
      messages = await prisma.message.findMany({
        where: {
          groupId: chatId
        },
        include: {
          sender: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.log(error, 'MESSAGES_GET_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { content, receiverId, groupId } = body;

    const sender = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!sender) {
      return new NextResponse('User not found', { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: sender.id,
        ...(receiverId ? { receiverId } : {}),
        ...(groupId ? { groupId } : {})
      },
      include: {
        sender: true,
        receiver: true
      }
    });

    return NextResponse.json(message);
  } catch (error) {
    console.log(error, 'MESSAGE_CREATE_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
} 