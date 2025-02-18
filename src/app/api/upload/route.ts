import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new NextResponse('No file uploaded', { status: 400 });
    }

    // Check file size (50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse('File is too large. Maximum size is 50MB', { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const fileExt = path.extname(file.name).toLowerCase();
    
    // Validate file type
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov', '.pdf', '.doc', '.docx'];
    if (!allowedExtensions.includes(fileExt)) {
      return new NextResponse('Invalid file type', { status: 400 });
    }
    
    // Create unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure upload directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.log('Upload directory already exists');
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/uploads/${filename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return new NextResponse('Error uploading file', { status: 500 });
  }
} 