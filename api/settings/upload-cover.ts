import type { VercelRequest, VercelResponse } from '@vercel/node';
import { r2Client } from '../../src/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { ApiError } from '../../src/types';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' } as ApiError);
  }

  try {
    const { image, filename }: { image: string; filename: string } = req.body;

    if (!image || !filename) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Both image (base64) and filename are required',
      } as ApiError);
    }

    // Validate file type
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).json({
        error: 'Invalid file type',
        details: 'Only JPG, PNG, and WebP images are allowed',
      } as ApiError);
    }

    // Extract base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File too large',
        details: 'Maximum file size is 5MB',
      } as ApiError);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `covers/cover-${timestamp}${fileExtension}`;

    // Determine content type
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[fileExtension] || 'image/jpeg';

    // Upload to R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Generate public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueFilename}`;

    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    return res.status(500).json({
      error: 'Failed to upload cover image',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError);
  }
}
