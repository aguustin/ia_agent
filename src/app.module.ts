import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import appConfig from '@config/app.config';
import databaseConfig, { databaseConfigFactory } from '@config/database.config';
import redisConfig, { redisConfigFactory } from '@config/redis.config';
import jwtConfig from '@config/jwt.config';
import r2Config from '@config/r2.config';
import localStorageConfig from '@config/local-storage.config';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { AnalysisModule } from '@modules/analysis/analysis.module';
import { ChatModule } from '@modules/chat/chat.module';
import { AiModule } from '@providers/ai/ai.module';
import { StorageModule } from '@providers/storage/storage.module';
import { HealthModule } from '@modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, r2Config, localStorageConfig],
      envFilePath: ['.env'],
      cache: false,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'analysis', ttl: 60_000, limit: 10 },
    ]),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfigFactory,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: redisConfigFactory,
    }),
    AiModule,
    StorageModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ProjectsModule,
    DocumentsModule,
    AnalysisModule,
    ChatModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
