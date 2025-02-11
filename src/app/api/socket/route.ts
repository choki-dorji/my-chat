import { NextResponse } from 'next/server';
import { initSocket, NextApiResponseServerIO } from '@/lib/socket';

export async function GET(req: Request, res: NextApiResponseServerIO) {
  try {
    initSocket(res);
    return new NextResponse('Socket server initialized');
  } catch (error) {
    console.log(error);
    return new NextResponse('Error initializing socket server', { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 
 