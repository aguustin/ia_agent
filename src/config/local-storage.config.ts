import { registerAs } from '@nestjs/config';

export default registerAs('localStorage', () => ({
  path: process.env.STORAGE_LOCAL_PATH ?? './uploads',
  baseUrl: (process.env.STORAGE_LOCAL_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
}));
