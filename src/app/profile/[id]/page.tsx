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
  try {
    // Prepare search conditions
    const searchConditions = [];

    // Check if params.id is a valid ObjectId
    if (ObjectId.isValid(params.id)) {
        searchConditions.push({ id: params.id });
    }

    // Decode email and add to search conditions
    searchConditions.push({ email: decodeURIComponent(params.id) });


    // Fetch user from database
    const user = await prisma.user.findFirst({
        where: { OR: searchConditions }
    });

    // If user is not found or lacks required fields, redirect
    if (!user || !user.name || !user.email) {
        console.error('User not found or incomplete data');
        redirect('/');
    }

    // Format user data
    const profileUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt
    };

    return (
        <ProfileView 
            user={profileUser} 
            isOwnProfile={session?.user?.email === profileUser.email} 
        />
    );
} catch (error) {
    console.error('Error fetching user:', error);
    redirect('/');
}
 
}