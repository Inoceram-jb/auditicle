import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;
const r2PublicUrl = process.env.R2_PUBLIC_URL;

if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !r2PublicUrl) {
  throw new Error('Missing Cloudflare R2 environment variables');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

export async function uploadAudioToR2(
  fileName: string,
  audioBuffer: Buffer,
  contentType: string = 'audio/mpeg'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: fileName,
    Body: audioBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  return `${r2PublicUrl}/${fileName}`;
}

export async function deleteAudioFromR2(fileName: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: r2BucketName,
    Key: fileName,
  });

  await r2Client.send(command);
}

export function getFileNameFromUrl(url: string): string {
  return url.split('/').pop() || '';
}
