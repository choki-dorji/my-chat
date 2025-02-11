import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name, memberIds } = body;

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return new NextResponse('Invalid data', { status: 400 });
    }

    const owner = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    });

    if (!owner) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const group = await prisma.group.create({
      data: {
        name,
        ownerId: owner.id,
        members: {
          create: [
            { userId: owner.id, role: 'admin' },
            ...memberIds.map((id: string) => ({
              userId: id,
              role: 'member'
            }))
          ]
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.log(error, 'GROUP_CREATE_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    });

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.log(error, 'GROUPS_GET_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
} 