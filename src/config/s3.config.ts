import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  region: process.env.AWS_REGION ?? 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  bucketName: process.env.S3_BUCKET_NAME ?? '',
  presignedUrlExpiresIn: parseInt(process.env.S3_PRESIGNED_URL_EXPIRES_IN ?? '3600', 10),
}));
