import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
  tls: process.env.REDIS_TLS === 'true',
}));

export const redisConfigFactory = (
  config: ConfigService,
): ReturnType<SharedBullConfigurationFactory['createSharedConfiguration']> => ({
  connection: {
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    password: config.get<string>('redis.password') || undefined,
    tls: config.get<boolean>('redis.tls') ? {} : undefined,
    maxRetriesPerRequest: null,
  },
});
