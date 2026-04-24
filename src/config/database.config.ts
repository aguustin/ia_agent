import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  name: process.env.DB_NAME ?? 'obras_validator',
  ssl: process.env.DB_SSL === 'true',
}));

export const databaseConfigFactory = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('database.host'),
  port: config.get<number>('database.port'),
  username: config.get<string>('database.user'),
  password: config.get<string>('database.password'),
  database: config.get<string>('database.name'),
  ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: config.get<string>('app.nodeEnv') === 'development',
  logging: config.get<string>('app.nodeEnv') === 'development' ? ['query', 'error'] : ['error'],
  extra: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
});
