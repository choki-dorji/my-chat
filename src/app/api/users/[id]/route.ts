import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from '../../auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate the ID format
    if (!params.id || !ObjectId.isValid(params.id)) {
      return new NextResponse('Invalid user ID', { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser || currentUser.id !== params.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name, image } = body;

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        image: image || undefined,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.log(error, 'USER_UPDATE_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
} 