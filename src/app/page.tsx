import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './api/auth/[...nextauth]/route';
import ChatLayout from '@/components/chat/ChatLayout';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <main className="flex-1 flex">
      <ChatLayout />
    </main>
  );
}
