import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        NOT: {
          email: session.user.email
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.log(error, 'USERS_GET_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
} 