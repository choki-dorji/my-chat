import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ProfileView from '@/components/profile/ProfileView';
import prisma from '@/lib/prismadb';
import { ObjectId } from 'mongodb';

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  // Validate the ID format
  if (!params.id || !ObjectId.isValid(params.id)) {
    redirect('/');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { 
        id: params.id 
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      redirect('/');
    }

    return <ProfileView user={user} isOwnProfile={user.email === session.user.email} />;
  } catch (error) {
    console.error('Error fetching user:', error);
    redirect('/');
  }
} 