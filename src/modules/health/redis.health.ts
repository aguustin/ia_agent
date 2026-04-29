import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const client = new Redis({
      host: this.config.get<string>('redis.host', 'localhost'),
      port: this.config.get<number>('redis.port', 6379),
      password: this.config.get<string>('redis.password') || undefined,
      lazyConnect: true,
      connectTimeout: 3_000,
    });

    try {
      await client.connect();
      await client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    } finally {
      client.disconnect();
    }
  }
}
